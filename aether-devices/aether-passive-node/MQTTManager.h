#ifndef MQTTMANAGER_H
#define MQTTMANAGER_H

#include <WiFi.h>
#include "mqtt_client.h"
#include "esp_crt_bundle.h"
#include <ArduinoJson.h>

esp_mqtt_client_handle_t client;
volatile bool mqtt_connected_flag = false;
bool system_ready = false;

const int MAX_SUBSCRIPTIONS = 20;
String active_subscriptions[MAX_SUBSCRIPTIONS];
int active_subscription_count = 0;

enum DeviceState { 
  STATE_CONNECTING_WIFI,
  STATE_CONNECTING_MQTT,
  STATE_CONNECTED,
  STATE_OFF 
};
volatile DeviceState current_state = STATE_OFF;

typedef void (*MessageHandler)(String topic, String payload);
typedef void (*ConnectHandler)();
MessageHandler globalMessageHandler = NULL;
ConnectHandler globalConnectHandler = NULL;

void setMqttCallback(MessageHandler handler) {
  globalMessageHandler = handler;
}
void setMqttConnectCallback(ConnectHandler handler) {
  globalConnectHandler = handler;
}

void trackSubscription(String topic) {
  for (int i = 0; i < active_subscription_count; i++) {
    if (active_subscriptions[i] == topic) return;
  }
  if (active_subscription_count < MAX_SUBSCRIPTIONS) { 
    active_subscriptions[active_subscription_count++] = topic; 
  }
}

bool isTopicTracked(String incomingTopic) {
  if (active_subscription_count == 0) return false;
  for (int i = 0; i < active_subscription_count; i++) {
    String sub = active_subscriptions[i];
    if (sub == incomingTopic) return true;
  }
  return false;
}

void wifi_event_handler(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      current_state = STATE_CONNECTING_WIFI;
      if (system_ready) {
        Serial.println("\n⚠️ WiFi Lost! Reconnecting...");
        mqtt_connected_flag = false;
        esp_mqtt_client_stop(client);
        WiFi.reconnect(); 
      }
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      current_state = STATE_CONNECTING_MQTT;
      if (system_ready) {
        Serial.println("\n✅ IP Acquired! Restarting MQTT...");
        delay(500);
        esp_mqtt_client_start(client);
      }
      break;
    default: break;
  }
}

static void mqtt_event_handler(void* handler_args, esp_event_base_t base, int32_t event_id, void* event_data) {
  esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;
  switch ((esp_mqtt_event_id_t)event_id) {
    case MQTT_EVENT_CONNECTED:
      mqtt_connected_flag = true;
      current_state = STATE_CONNECTED;
      Serial.println("\n✅ Broker Connected!");
      if (globalConnectHandler != NULL) globalConnectHandler();
      break;
    case MQTT_EVENT_DISCONNECTED:
      mqtt_connected_flag = false;
      if (WiFi.status() == WL_CONNECTED) current_state = STATE_CONNECTING_MQTT;
      break;
      
    case MQTT_EVENT_DATA:
      {
        // Direct memory block allocation. Zero fragmentation.
        String topicStr((char*)event->topic, event->topic_len);
        
        Serial.println("\n🔍 [DEBUG] RAW MQTT EVENT CAUGHT!");
        Serial.println("Topic Length: " + String(event->topic_len));
        Serial.println("Topic String: [" + topicStr + "]");

        if (!isTopicTracked(topicStr)) {
            Serial.println("❌ [DEBUG] Topic dropped! It did not perfectly match active_subscriptions.");
            break;
        }

        // One-shot payload memory allocation
        String payloadStr((char*)event->data, event->data_len);
        Serial.println("Payload String: " + payloadStr);

        // Pass to Mailbox
        if (globalMessageHandler != NULL) globalMessageHandler(topicStr, payloadStr);
        break;
      }
    default: break;
  }
}

void wifiConnect(const char* ssid, const char* pass) {
  current_state = STATE_CONNECTING_WIFI;
  WiFi.mode(WIFI_STA);
  WiFi.onEvent(wifi_event_handler);
  WiFi.begin(ssid, pass);
  Serial.print("🔗 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
}

void mqttConnect(const char* host, const char* user, const char* pass, const char* id) {
  current_state = STATE_CONNECTING_MQTT;
  String mqtt_uri = String("wss://") + host;
  esp_mqtt_client_config_t mqtt_cfg = {};
  
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
  mqtt_cfg.broker.address.uri = mqtt_uri.c_str();
  mqtt_cfg.broker.verification.crt_bundle_attach = esp_crt_bundle_attach;
  mqtt_cfg.credentials.username = user;
  mqtt_cfg.credentials.authentication.password = pass;
  mqtt_cfg.credentials.client_id = id;
  mqtt_cfg.session.keepalive = 15; 
#else
  mqtt_cfg.uri = mqtt_uri.c_str();
  mqtt_cfg.crt_bundle_attach = esp_crt_bundle_attach;
  mqtt_cfg.username = user;
  mqtt_cfg.password = pass;
  mqtt_cfg.client_id = id;
  mqtt_cfg.keepalive = 15; 
#endif

  client = esp_mqtt_client_init(&mqtt_cfg);
  esp_mqtt_client_register_event(client, MQTT_EVENT_ANY, mqtt_event_handler, NULL);
  Serial.print("🔗 Connecting to Broker");
  esp_mqtt_client_start(client);
  while (!mqtt_connected_flag) {
    delay(500);
    Serial.print(".");
  }
  system_ready = true;
}

void mqttSubscribe(const char* topic) {
  if (client != NULL) {
    esp_mqtt_client_subscribe(client, topic, 0);
    trackSubscription(String(topic));
  }
}

void mqttPublish(const char* topic, const JsonDocument& doc) {
  if (client != NULL && mqtt_connected_flag) {
    String output;
    serializeJson(doc, output);
    esp_mqtt_client_publish(client, topic, output.c_str(), 0, 0, 0);
    Serial.println("📤 Published [" + String(topic) + "]: " + output);
  }
}

#endif