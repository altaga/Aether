require('dotenv').config();
const mqtt = require('mqtt');

// Load from environment
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;
const MQTT_BROKER_JWT = process.env.MQTT_BROKER_JWT;
const DEVICE_ID = process.env.DEVICE_ID;

if (!MQTT_BROKER_URL || !MQTT_BROKER_JWT) {
    console.error("❌ Error: Missing MQTT_BROKER_URL or MQTT_BROKER_JWT in .env file");
    process.exit(1);
}

// Decode the JWT to automatically extract the DEVICE_ID
try {
    const payloadBase64 = MQTT_BROKER_JWT.split('.')[1];
    const decodedPayload = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const parsedPayload = JSON.parse(decodedPayload);
    // DEVICE_ID is already set from env, but we can verify it parses correctly
    console.log(`🔍 Extracted Device ID from JWT: ${DEVICE_ID}`);
} catch (e) {
    console.error("❌ Error: Failed to parse JWT token to extract Device ID.", e.message);
    process.exit(1);
}

console.log(`Initializing connection to Aether Global Bus at ${MQTT_BROKER_URL}...`);
console.log(`Connecting as Device ID: ${DEVICE_ID}`);

// Connect using MQTT over WebSockets
const client = mqtt.connect(MQTT_BROKER_URL, {
    clientId: DEVICE_ID,
    username: '',          // Must be empty for the Unified JWT Authentication Tier
    password: MQTT_BROKER_JWT,   // The JWT token goes here
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    keepalive: 30,
    reconnectPeriod: 5000, // Reconnect every 5 seconds if disconnected
});

client.on('connect', () => {
    console.log('✅ Connected to Aether WebSocket Gateway securely.');
    
    const actionTopic = `aether/active/${DEVICE_ID}/intent`;
    client.subscribe(actionTopic, { qos: 0 }, (err) => {
        if (!err) {
            console.log(`📡 Subscribed to command topic: ${actionTopic}`);
        } else {
            console.error(`🚨 Failed to subscribe:`, err);
        }
    });

    // Send an initial telemetry/heartbeat
    const telemetryTopic = `aether/active/${DEVICE_ID}/telemetry`;
    const payload = JSON.stringify({
        status: 'online',
        device_type: 'jetson_nano',
        timestamp: new Date().toISOString()
    });
    
    client.publish(telemetryTopic, payload, { qos: 0 }, (err) => {
        if (err) console.error('⚠️ Failed to send heartbeat:', err);
        else console.log(`💓 Initial heartbeat sent to ${telemetryTopic}.`);
    });
    
    // Keep alive heartbeat loop
    setInterval(() => {
        const beatPayload = JSON.stringify({ uptime: process.uptime(), status: 'online' });
        client.publish(telemetryTopic, beatPayload);
    }, 30000);
});

client.on('message', async (topic, message) => {
    console.log(`📨 Received command on [${topic}]: ${message.toString()}`);
    
    // Send a receipt/acknowledgment for any received command
    if (topic.endsWith('/intent')) {
        let promptText = message.toString();
        let contextText = "";
        
        let txId = null;
        try {
            const parsed = JSON.parse(promptText);
            txId = parsed.tx_id || null;
            
            // Handle Gateway Deterministic Envelope
            if (parsed.action) {
                promptText = parsed.action;
            }
            
            // Handle Gateway Agentic Envelope (Agentic Skills)
            if (parsed.prompt) {
                promptText = parsed.prompt;
                if (parsed.intent) {
                    promptText = `Intent: ${parsed.intent}\nRequest: ${promptText}`;
                }
            }
            
            if (parsed.context) {
                contextText = parsed.context;
            }
        } catch(e) {
            // Not JSON, fallback to treating the whole message as the prompt
        }

        // Combine context and prompt if context was provided
        const finalPrompt = contextText 
            ? `System Context:\n${contextText}\n\nUser Prompt:\n${promptText}` 
            : promptText;

        console.log(`🧠 Sending prompt to local Ollama (qwen2.5-coder:7b)...`);
        
        try {
            // Using native fetch (Node.js 18+)
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2.5-coder:7b',
                    prompt: finalPrompt,
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`Ollama HTTP Error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`🤖 Ollama Response:\n${result.response}`);

            const receiptTopic = `aether/active/${DEVICE_ID}/receipt`;
            client.publish(receiptTopic, JSON.stringify({ 
                status: 'executed', 
                command: promptText,
                response: result.response,
                tx_id: txId
            }));
            console.log(`📤 Sent execution receipt with AI response to ${receiptTopic}`);
            
        } catch (error) {
            console.error(`❌ Failed to connect to Ollama or process response:`, error.message);
            // Optionally, still send a failure receipt back
            const receiptTopic = `aether/active/${DEVICE_ID}/receipt`;
            client.publish(receiptTopic, JSON.stringify({ 
                status: 'failed', 
                command: promptText,
                error: error.message,
                tx_id: txId
            }));
        }
    }
});

client.on('error', (err) => {
    console.error('⚠️ Connection error:', err.message);
});

client.on('close', () => {
    console.log('❌ Disconnected from the server.');
});

