#ifndef AETHER_OS_H
#define AETHER_OS_H

#include <Arduino.h>
#include "creds.h"

// ==========================================
// MEMORY ALLOCATION (The Linker Fix)
// We allocate the Mailbox variables here BEFORE 
// including MQTTManager so the callbacks can see them.
// ==========================================
bool taskPending = false;
String pendingPayload = "";

void aetherMessageHandler(String topic, String payload) {
    pendingPayload = payload;
    taskPending = true;
}

#include "MQTTManager.h"
#include "AetherNode.h"

class AetherOS {
  private:
    String unique_client_id;
    String subscribeTopic;
    String publishTopic;
    String telemetryTopic;
    AetherNode* subcontractor;
    
    unsigned long lastHeartbeat = 0;
    const unsigned long HEARTBEAT_INTERVAL = 240000; 

  public:
    AetherOS() {}

    void bindCapability(SkillCallback callback) {
        // Generate Unique ID from MAC Address securely
        uint64_t chipid = ESP.getEfuseMac();
        uint32_t lower32 = (uint32_t)chipid;
        uint16_t upper16 = (uint16_t)(chipid >> 32);
        char idBuff[30];
        snprintf(idBuff, sizeof(idBuff), "%s%04X%08X", client_base_name, upper16, lower32);
        unique_client_id = String(idBuff);

        // Dynamically assign topics
        subscribeTopic = "aether/passive/" + unique_client_id + "/action";
        publishTopic   = "aether/passive/" + unique_client_id + "/receipt";
        telemetryTopic = "aether/passive/" + unique_client_id + "/telemetry";

        // Initialize the Core Node
        subcontractor = new AetherNode(unique_client_id, publishTopic);
        subcontractor->setCallback(callback);
    }

    void boot() {
        Serial.println("\n====================================");
        Serial.println(" AETHER OS: Physical Execution Layer");
        Serial.println("====================================");
        Serial.println("Node ID: " + unique_client_id);
        
        // Link Network Layer Mailbox
        setMqttCallback(aetherMessageHandler);
        
        // Connect to Network Layer
        wifiConnect(ssid, password);
        mqttConnect(host, mqtt_user, mqtt_pass, unique_client_id.c_str());
        
        // Auto-Subscribe to personal intent topic
        mqttSubscribe(subscribeTopic.c_str());
        Serial.println("✅ Subscribed to isolated topic: " + subscribeTopic);
    }

    void publishReceipt(String tx_id, String task, String status) {
        subcontractor->publishReceipt(tx_id, task, status);
    }

    // Handles the async execution and heartbeats safely outside of interrupts
    void loop() {
        delay(10); // Yield to ESP32 RTOS Watchdog

        // Process Mailbox (Avoids Core 0 crashes)
        if (taskPending) { 
            Serial.println("\n📥 [Aether Task Pulled from Mailbox]: " + pendingPayload);
            subcontractor->processIntent(pendingPayload);
            taskPending = false; 
        }

        // Process Isolated Heartbeat
        // mqtt_connected_flag is natively inherited from MQTTManager.h
        if (mqtt_connected_flag && (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL)) {
            lastHeartbeat = millis();
            
            JsonDocument hbDoc; 
            hbDoc["node_id"] = unique_client_id;
            hbDoc["status"] = "online";
            hbDoc["timestamp"] = millis();
            
            mqttPublish(telemetryTopic.c_str(), hbDoc);
        }
    }
};

#endif