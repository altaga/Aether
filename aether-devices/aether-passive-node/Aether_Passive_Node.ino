#include "AetherOS.h"

// 1. Hardware Configuration
#define RELAY_PIN LED_BUILTIN
AetherOS aether;

// 2. The Personalized Capability (RPC Function)
void executeCommand(String tx_id, JsonArray args) {
    String action = args[0].as<String>();
    
    if (action == "ON") {
        digitalWrite(RELAY_PIN, HIGH);
        Serial.println("💡 Relay/LED turned ON");
        aether.publishReceipt(tx_id, "ON", "success");
    } 
    else if (action == "OFF") {
        digitalWrite(RELAY_PIN, LOW);
        Serial.println("🌑 Relay/LED turned OFF");
        aether.publishReceipt(tx_id, "OFF", "success");
    }
}

void setup() {
    Serial.begin(115200);
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);

    // 3. Bind Capability and Boot the OS
    aether.bindCapability(executeCommand);
    aether.boot(); 
}

void loop() {
    // Aether handles all network routing, heartbeats, and safe mailbox processing 
    aether.loop(); 
}