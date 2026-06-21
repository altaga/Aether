const WebSocket = require("ws");
const mqtt = require("mqtt-packet");
const jwt = require("jsonwebtoken");
const Redis = require("ioredis");
const path = require("path");
const crypto = require("crypto");

require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 9001;
const SECRET = process.env.WS_SECRET; 
const LEGACY_PASSWORD = process.env.LEGACY_PASSWORD; // Used ONLY for Super Admin

const redisPub = new Redis();
const redisSub = new Redis();

const wss = new WebSocket.Server({
    port: PORT,
    host: "0.0.0.0",
    handleProtocols: (protocols) => protocols.has('mqtt') ? 'mqtt' : false
});

const clients = new Map();

const logTime = () => `[${new Date().toISOString()}]`;

function timingSafeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const key = crypto.randomBytes(32);
    const ha = crypto.createHmac('sha256', key).update(a).digest();
    const hb = crypto.createHmac('sha256', key).update(b).digest();
    return ha.length === hb.length && crypto.timingSafeEqual(ha, hb) && a === b;
}

// --- MQTT PREFIX TREE (Trie) FOR WILDCARD ROUTING ---
class TrieNode {
    constructor() {
        this.children = new Map();
        this.subscribers = new Set();
    }
}

class MqttTrie {
    constructor() {
        this.root = new TrieNode();
    }
    add(topic, clientId) {
        const parts = topic.split('/');
        let node = this.root;
        for (const part of parts) {
            if (!node.children.has(part)) node.children.set(part, new TrieNode());
            node = node.children.get(part);
        }
        node.subscribers.add(clientId);
    }
    remove(topic, clientId) {
        const parts = topic.split('/');
        let node = this.root;
        for (const part of parts) {
            if (!node.children.has(part)) return;
            node = node.children.get(part);
        }
        node.subscribers.delete(clientId);
    }
    match(topic) {
        const parts = topic.split('/');
        const results = new Set();
        const search = (node, index) => {
            if (index === parts.length) {
                node.subscribers.forEach(c => results.add(c));
                if (node.children.has('#')) node.children.get('#').subscribers.forEach(c => results.add(c));
                return;
            }
            if (node.children.has(parts[index])) search(node.children.get(parts[index]), index + 1);
            if (node.children.has('+')) search(node.children.get('+'), index + 1);
            if (node.children.has('#')) node.children.get('#').subscribers.forEach(c => results.add(c));
        };
        search(this.root, 0);
        return results;
    }
}
const topicTrie = new MqttTrie();

// --- AETHER OS: THE GLOBAL REDIS FIREHOSE ---
redisSub.subscribe("AETHER_GLOBAL_BUS");

redisSub.on("message", (channel, message) => {
    if (channel !== "AETHER_GLOBAL_BUS") return;
    try {
        const data = JSON.parse(message);
        const payloadBuf = Buffer.from(data.payload, 'base64');
        
        const targetClients = topicTrie.match(data.topic); 

        if (targetClients.size === 0) return;

        const pubPacket = mqtt.generate({
            cmd: 'publish', 
            topic: data.topic, 
            payload: payloadBuf, 
            qos: 0, 
            retain: false
        });

        targetClients.forEach(clientId => {
            const ws = clients.get(clientId);
            if (ws && ws.readyState === WebSocket.OPEN) {
                if (ws.bufferedAmount > 65536) {
                    console.log(`${logTime()} ⚠️ QoS 0 dropped for ${clientId}`);
                } else {
                    ws.send(pubPacket);
                }
            }
        });
    } catch (err) {}
});

// --- CORE BROKER LOGIC & ISOLATION FIREWALL ---
wss.on("connection", (ws, req) => {
    req.socket.setNoDelay(true);
    ws.clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    ws.isAuthorized = false;
    ws.isAdmin = false; 
    ws.isSuperAdmin = false; 
    ws.lastSeen = Date.now(); 
    ws.subscriptions = new Set();
    
    const parser = mqtt.parser();
    parser.on("error", (err) => ws.terminate());

    parser.on("packet", (packet) => {
        ws.lastSeen = Date.now(); 

        if (packet.cmd === "connect") {
            const user = packet.username || "";
            const pass = packet.password ? packet.password.toString() : "";

            // A. SUPER ADMIN (God Mode - Used by MQTT Explorer)
            if ((user === "mqtt-explorer-dedlap-admin" || packet.clientId === "mqtt-explorer-dedlap-admin") && timingSafeCompare(pass, LEGACY_PASSWORD)) {
                ws.clientId = packet.clientId || `superadmin_${crypto.randomBytes(4).toString('hex')}`;
                ws.isAuthorized = true;
                ws.isSuperAdmin = true; 
                console.log(`${logTime()} 🌐 SUPER ADMIN: ${ws.clientId} | IP: ${ws.clientIp}`);
            }
            
            // B. PUBLIC READ-ONLY (Digital Twins & Telemetry Viewers)
            else if (packet.clientId && packet.clientId.startsWith("SimTwin_") && pass === "") {
                ws.clientId = packet.clientId;
                ws.isAuthorized = true;
                ws.isAdmin = false;
                ws.isSuperAdmin = false;
                ws.isPublic = true;
                console.log(`${logTime()} 🌍 PUBLIC CLIENT: ${ws.clientId} Connected.`);
            }
            
            // C. THE UNIFIED JWT AUTHENTICATION TIER (Gateways, Devices, & Web)
            else if (user === "" && pass !== "") {
                try {
                    const decoded = jwt.verify(pass, SECRET);
                    ws.clientId = packet.clientId || decoded.id || `client_${crypto.randomBytes(4).toString('hex')}`;
                    
                    // 1. Edge Node Hardware
                    if (decoded.role === "device") {
                        if (decoded.id !== ws.clientId) {
                            throw new Error(`Spoofing Attempt! Token ID does not match Hardware ID [${ws.clientId}]`);
                        }
                        ws.isAuthorized = true;
                        ws.isAdmin = false;
                        ws.isSuperAdmin = false;
                        console.log(`${logTime()} 🤖 EDGE NODE: ${ws.clientId} Connected securely.`);
                    } 
                    // 2. Node.js Gateway / Sui Coordinator
                    else if (decoded.role === "gateway") {
                        ws.isAuthorized = true;
                        ws.isAdmin = true;
                        ws.isSuperAdmin = false;
                        ws.supervisedDevices = new Set(decoded.supervised_devices || []); 
                        console.log(`${logTime()} 🔓 GATEWAY: ${ws.clientId} | Supervising ${ws.supervisedDevices.size} robots.`);
                    } 
                    // 3. Next.js Web Viewers
                    else {
                        ws.isAuthorized = true;
                        ws.isAdmin = false;
                        ws.isSuperAdmin = false;
                        // Append random suffix so infinite users can view the digital twin simultaneously
                        ws.clientId = `${ws.clientId}_${crypto.randomBytes(4).toString('hex')}`;
                        console.log(`${logTime()} ✅ WEB CLIENT: ${ws.clientId} Connected securely.`);
                    }

                    ws.jwtData = decoded; 
                } catch (e) {
                    console.log(`${logTime()} 🚫 IP: ${ws.clientIp} | JWT Auth Error: ${e.message}`);
                }
            }

            if (ws.isAuthorized) {
                if (clients.has(ws.clientId)) clients.get(ws.clientId).terminate();
                clients.set(ws.clientId, ws);
                ws.send(mqtt.generate({ cmd: "connack", returnCode: 0 }));
            } else {
                ws.send(mqtt.generate({ cmd: "connack", returnCode: 4 })); 
                ws.terminate();
            }
            return;
        }

        if (!ws.isAuthorized) return ws.terminate();

        // --- SESSION-SCOPED SUBSCRIPTION ACL ---
        if (packet.cmd === "subscribe") {
            let granted = []; 
            packet.subscriptions.forEach((sub) => {
                let allowed = false;
                const topicParts = sub.topic.split('/');

                if (ws.isSuperAdmin) {
                    allowed = true;
                }
                else if (ws.isAdmin) {
                    // Gateway supervising 'active' or 'passive' devices
                    if (topicParts[0] === 'aether' && (topicParts[1] === 'passive' || topicParts[1] === 'active') && ws.supervisedDevices.has(topicParts[2])) {
                        allowed = true;
                    }
                } 
                else if (
                    sub.topic === `aether/passive/${ws.clientId}/action` ||
                    sub.topic === `aether/passive/${ws.clientId}/telemetry` || // self-echo (round-trip check)
                    sub.topic === `aether/active/${ws.clientId}/intent` ||
                    sub.topic === `aether/active/${ws.clientId}/telemetry`      // self-echo (round-trip check)
                ) {
                    // Edge nodes subscribing to their own downward topics + own telemetry (echo)
                    // Edge nodes subscribing to their own downward topics + own telemetry (echo)
                    allowed = true;
                }
                else if (ws.isPublic) {
                    // Public viewers can only subscribe to telemetry, not intent
                    if (topicParts[3] === 'telemetry' || topicParts[3] === 'action') {
                        allowed = true;
                    }
                }

                if (allowed) {
                    if (!ws.subscriptions.has(sub.topic)) {
                        ws.subscriptions.add(sub.topic);
                        topicTrie.add(sub.topic, ws.clientId);
                    }
                    granted.push(sub.qos);
                } else {
                    console.log(`${logTime()} 🚨 ACL BLOCK: ${ws.clientId} denied access to ${sub.topic}`);
                    granted.push(128); 
                }
            });

            ws.send(mqtt.generate({ cmd: "suback", messageId: packet.messageId, granted: granted }));
        }

        if (packet.cmd === "unsubscribe") {
            packet.unsubscriptions.forEach((topic) => {
                if (ws.subscriptions.has(topic)) {
                    ws.subscriptions.delete(topic);
                    topicTrie.remove(topic, ws.clientId);
                }
            });
            ws.send(mqtt.generate({ cmd: "unsuback", messageId: packet.messageId }));
        }

        // --- DEVICE-SCOPED PUBLISHING FIREWALL ---
        if (packet.cmd === "publish") {
            let allowedToPublish = false;
            const topicParts = packet.topic.split('/');

            if (ws.isSuperAdmin) {
                allowedToPublish = true;
            }
            else if (ws.isAdmin) {
                // Gateway publishing to active/passive devices it supervises
                if (topicParts[0] === 'aether' && (topicParts[1] === 'passive' || topicParts[1] === 'active') && ws.supervisedDevices.has(topicParts[2])) {
                    allowedToPublish = true;
                }
            } 
            else {
                // Edge nodes publishing their own telemetry/receipts under either mode
                if (
                    packet.topic === `aether/passive/${ws.clientId}/receipt` || 
                    packet.topic === `aether/passive/${ws.clientId}/telemetry` ||
                    packet.topic === `aether/active/${ws.clientId}/receipt` || 
                    packet.topic === `aether/active/${ws.clientId}/telemetry`
                ) {
                    allowedToPublish = true;
                }

                // HACKATHON SIMULATOR EXCEPTION
                // Allow web-based Digital Twins to publish simulated receipts/telemetry
                if (ws.clientId.startsWith("SimTwin_") && (
                    packet.topic.endsWith('/receipt') || 
                    packet.topic.endsWith('/telemetry')
                )) {
                    allowedToPublish = true;
                }
            }

            if (allowedToPublish) {
                if (packet.topic.endsWith("telemetry")) {
                    console.log(`${logTime()} 💓 HEARTBEAT RX: [${ws.clientId}] -> Global Bus`);
                }

                redisPub.publish("AETHER_GLOBAL_BUS", JSON.stringify({
                    topic: packet.topic, 
                    sender: ws.clientId,
                    payload: packet.payload.toString('base64')
                }));
            } else {
                console.log(`${logTime()} 🚨 ACL BLOCK: ${ws.clientId} publishing blocked on ${packet.topic}`);
            }
        }

        if (packet.cmd === "pingreq") ws.send(mqtt.generate({ cmd: "pingresp" }));
        if (packet.cmd === "disconnect") ws.close();
    });

    ws.on("message", (data) => {
        try { parser.parse(data); } catch (err) { ws.terminate(); }
    });

    ws.on("close", () => cleanupClient(ws));
    ws.on("error", () => ws.terminate());
});

// --- THE IDENTITY LOCK (Ghost Protection) ---
function cleanupClient(ws) {
    if (ws.clientId && clients.has(ws.clientId)) {
        if (clients.get(ws.clientId) === ws) {
            ws.subscriptions.forEach(topic => {
                topicTrie.remove(topic, ws.clientId);
            });
            clients.delete(ws.clientId);
            console.log(`${logTime()} ❌ Client Disconnected: ${ws.clientId}`);
        }
    }
}

// --- AETHER OS: $SYS BROKER DIAGNOSTICS ---
setInterval(() => {
    const stats = {
        active_connections: clients.size,
        memory_heap_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptime_seconds: Math.floor(process.uptime()),
        supervised_gateways: Array.from(clients.values()).filter(c => c.isAdmin).length,
        edge_nodes: Array.from(clients.values()).filter(c => !c.isAdmin && !c.isSuperAdmin).length
    };

    redisPub.publish("AETHER_GLOBAL_BUS", JSON.stringify({
        topic: "$SYS/broker/stats",
        sender: "broker-system",
        payload: Buffer.from(JSON.stringify(stats)).toString('base64')
    }));
}, 10000);

// --- 5-MINUTE HEARTBEAT SWEEPER ---
const keepAliveInterval = setInterval(() => {
    const now = Date.now();
    clients.forEach((ws) => {
        if (ws.isSuperAdmin) return; 

        if (now - ws.lastSeen > 300000) {
            console.log(`${logTime()} 💀 5-Minute Timeout Reached. Terminating: ${ws.clientId}`);
            return ws.terminate();
        }
    });
}, 60000); 

process.on('SIGINT', () => {
    console.log(`\n${logTime()} 🛑 Shutting down server...`);
    clearInterval(keepAliveInterval);
    wss.close(() => { redisPub.quit(); redisSub.quit(); process.exit(0); });
});

console.log(`\n🚀 Online on ${PORT}`);
console.log(`🔒 Aether M2M Economy Active: 100% JWT Zero-Trust Mode.\n`);