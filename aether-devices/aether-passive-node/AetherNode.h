#ifndef AETHER_NODE_H
#define AETHER_NODE_H

#include <Arduino.h>
#include <ArduinoJson.h>

// Forward declare your global mqttPublish from MQTTManager.h
extern void mqttPublish(const char* topic, const JsonDocument& doc);

// RPC Callback: Receives the settlement ID and the array of variables [var1, var2...]
typedef void (*SkillCallback)(String tx_id, JsonArray args);

class AetherNode {
  private:
    String nodeId;
    String receiptTopic;
    SkillCallback onActionComplete;

  public:
    // Constructor initializes the node's cryptographic identity
    AetherNode(String id, String topic) {
        this->nodeId = id;
        this->receiptTopic = topic;
        this->onActionComplete = nullptr;
    }
    
    // Binds your personalized capability (e.g., ToggleLed)
    void setCallback(SkillCallback callback) {
        this->onActionComplete = callback;
    }
    
    // Parses the strict JSON intent from the Gateway
    void processIntent(String payload) {
        Serial.println("\n--- 🛠️ AETHER NODE DEBUG: PARSING INTENT ---");

        JsonDocument doc; 
        DeserializationError error = deserializeJson(doc, payload);

        if (error) {
            Serial.print("❌ JSON Parse Failed. Reason: ");
            Serial.println(error.c_str());
            return;
        }

        // Extract the specific fields from your new JSON layout
        String tx_id = doc["tx_id"] | "MISSING";
        String target = doc["target"] | "MISSING";
        JsonArray actionArgs = doc["action"]; // Extracts the array: ["ON"]
        
        // IDENTITY CHECK
        if (target != "MISSING" && target != nodeId) {
            Serial.println("⚠️ WARNING: Identity Mismatch!");
            Serial.println("   Device is ignoring this command because it belongs to someone else.");
            return; 
        }

        // Execute deterministically
        if (onActionComplete != nullptr) {
            Serial.println("⚙️ Target matches. Triggering personalized capability...");
            // Pass the transaction ID and the argument array to your custom function
            onActionComplete(tx_id, actionArgs);
        } else {
            Serial.println("❌ ERROR: Hardware capability callback is not set!");
        }
    }
    
    // Generates and fires the verifiable receipt back to the Gateway
    void publishReceipt(String tx_id, String task, String status) {
        Serial.println("🧾 Generating Verifiable Receipt...");
        JsonDocument receipt;
        receipt["tx_id"] = tx_id;     // Crucial so the Gateway knows which task finished
        receipt["node_id"] = nodeId;
        receipt["task"] = task;
        receipt["status"] = status;
        receipt["timestamp"] = millis(); 

        mqttPublish(receiptTopic.c_str(), receipt);
    }
};

#endif