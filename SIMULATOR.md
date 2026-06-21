# Aether Simulator — Complete Usage Guide

<div align="center">
  <img src="images/logoAE.png" alt="Aether Logo" width="40%"/>
</div>

---

>  **IMPORTANT: ALL PRODUCTION SYSTEMS ARE ON SUI MAINNET.** The physical Aether hardware, production DApp, and video demo all run live on Mainnet. However, to allow judges to test the system safely without spending real SUI, this guide walks you through using the **production-grade Aether simulator** deployed on **Sui Testnet**. No physical hardware is required, but it faithfully replicates the full Mainnet Agentic IoT economy loop: wallet connection → x402 payment → MQTT command dispatch → hardware receipt → Walrus archive.

---

## Quick Start (2 minutes)

| Step | What to do |
|---|---|
| 1 | Open the **[Aether Simulator](https://aether-dapp-simulator.expo.app/)** |
| 2 | Install a Sui wallet browser extension (**[Slush](https://slush.app/) recommended**) |
| 3 | Get free Testnet SUI + USDC (faucet links below) |
| 4 | Connect your wallet in the Simulator |
| 5 | Click any hardware button and sign the x402 transaction |

---

## Architecture Overview

When you use the simulator, this is what actually happens behind the scenes:

```mermaid
graph TD
    User([You]) --> DApp[Unified Simulator UI]
    DApp <--> Wallet[Sui Testnet Wallet]
    
    DApp -- "HTTP/x402" --> Gateway[Simulator Gateway<br>simgate.hackathon.dpdns.org]
    
    Gateway <--> Broker[MQTT Broker<br>wss://mqtt.hackathon.dpdns.org]
    
    Broker <--> Twin[Digital Twin Engine<br>Acts as hardware]
    
    Twin -. "Saves Receipts" .-> Walrus[Walrus Testnet Storage]
```

The **Digital Twin Engine** connects to the same MQTT broker as the real hardware. When the DApp triggers a command, the Twin receives it, animates its 3D visualization, processes it, and returns a receipt — exactly like a physical device would.

---

## Prerequisites

### 1. Install a Sui Wallet

You need a Sui-compatible browser extension wallet. The simulator is configured to only accept wallets with Sui features.

**Recommended wallets:**
- [Slush Wallet](https://slush.app/) — Chrome  **Recommended**
- [Suiet Wallet](https://suiet.app/) — Chrome/Firefox
- [Sui Wallet (official)](https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil) — Chrome

> After installing, create a new wallet and **write down your seed phrase safely**.

### 2. Switch to Testnet

In your wallet extension:
1. Open the wallet settings
2. Find **Network** or **RPC URL**
3. Select **Testnet** (or `https://fullnode.testnet.sui.io:443`)

### 3. Get Testnet SUI (Gas)

You need Testnet SUI to pay gas fees for transactions.

- **Sui Testnet Faucet**: Go to [faucet.testnet.sui.io](https://faucet.testnet.sui.io/) and request SUI
- **Alternative**: Join the [Sui Discord](https://discord.gg/sui) and use the `#devnet-faucet` channel with your address

### 4. Get Testnet USDC

Aether uses **USDC (Testnet)** as the payment token for x402 transactions. The token address is:
```
0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
```

**How to get Testnet USDC:**
1. Visit the [Sui Testnet Faucet](https://faucet.testnet.sui.io/)
2. Or use a testnet DEX swap to convert Testnet SUI → Testnet USDC

>  Each hardware command costs between **1,000–3,000 USDC base units** (0.001–0.003 USDC). A small balance goes a long way.

---

## The Simulator Interface

**URL:** [https://aether-dapp-simulator.expo.app/](https://aether-dapp-simulator.expo.app/)

The simulator combines the **DApp Control Center** (Left) and the **Hardware Digital Twin** (Right) into a single, cohesive view. It connects to the Aether MQTT broker and processes commands exactly as real physical devices would.

<div align="center">
  <img src="images/aether-dapp.png"width="80%"/>
</div>
<div align="center">
  <i>Fig 1. The Aether Simulator Dashboard showing both the DApp and the Hardware Twin side-by-side.</i>
</div>

### Header Bar

<div align="center">
  <img src="images/header.png" alt="Aether Devices Header" width="80%"/>
</div>
<div align="center">
  <i>Fig 2. The streamlined global header featuring the Walrus Archive panel and Telemetry controls.</i>
</div>

**Top-center — Walrus Testnet Archive panel:** Initially shows `AWAITING WALRUS TELEMETRY...`. After any successful command, it populates with:
- **`NODE`**: The device ID that executed the command (e.g. `Sub_B8023212CFA3`)
- **`BLOB`**: The full Walrus Blob ID — the immutable receipt hash (click to open in explorer)
- **`TIME`**: The timestamp of when the receipt was archived

> [!IMPORTANT]  
> **Why Walrus?** While general MQTT telemetry is ephemeral by design, Aether specifically captures **hardware execution receipts** and stores them on the Walrus network as immutable, decentralized blobs. This ensures permanent cryptographic proof of all physical actions without bloat.

**Top-right — `OPEN TELEMETRY` button:** Click to open a sliding drawer with all raw MQTT events in real time (subscriptions, publishes, receipts, Walrus uploads, errors).

---

### The Dual-Panel Dashboard

#### Left Panel — DApp Control Center
This is the command interface, identical to the production Aether web app. It bridges human intent with the decentralized network.

It features two operating modes:

**1. Control Tab**  
Manual dispatch mode. Trigger specific x402 transactions (`⌂ HOME`, `Front High`, `Right Reach`, `Right Low`) to manually drive the arm. Each button click prompts your Sui wallet for a transaction signature.
<div align="center">
  <img src="images/panel1.png" alt="Direct Control Panel" width="60%"/>
</div>
<div align="center">
  <i>Fig 3. The Direct Control interface for dispatching deterministic hardware macros.</i>
</div>

**2. Agent Tab**  
Autonomous AI orchestration. Describe your intent in natural language (e.g., *"Move the arm to a high position then return home"*) and the AWS Bedrock agent will autonomously formulate the tool calls, prompting your wallet to sign the entire multi-step sequence.
<div align="center">
  <img src="images/agent.png" alt="Agent Sequence Planner UI" width="60%"/>
</div>
<div align="center">
  <i>Fig 4. The Agentic Sequence Planner visually executing a multi-step robotic sequence.</i>
</div>

#### Right Panel — Hardware Digital Twin
**Node ID:** `Sub_6503CAF9C2C7`

<div align="center">
  <img src="images/arm.png" alt="Hardware Digital Twin" width="80%"/>
</div>
<div align="center">
  <i>Fig 5. The 3D Digital Twin visualization resolving physical trajectory.</i>
</div>

This panel acts as the physical hardware receiver. It connects directly to the Aether MQTT broker, independent of the DApp.

- **Live 3D Visualization:** A WebGL-rendered 4-DOF robotic arm that processes incoming kinematic intents from the broker and animates the physical trajectory in real time.
- **Hardware Telemetry:** Displays the last received command and its real-time readiness status (`READY`).
- **Cryptographic Receipts:** Once the 3D arm finishes its execution trajectory, the digital twin publishes a cryptographically signed receipt back to the broker, closing the decentralized loop.

---

### Telemetry Log

Click **`OPEN TELEMETRY`** in the top-right to open a full-width sliding drawer. It streams all raw MQTT events chronologically:
- Device subscriptions on boot
- Heartbeat publishes from each node
- Incoming action commands from the DApp
- Outgoing receipt publishes back to the gateway
- Walrus archive confirmations with `blobId`

<div align="center">
  <img src="images/telemetry1.png" alt="Telemetry RPC Log" width="30%"/>
</div>
<div align="center">
  <i>Fig 6. The real-time Telemetry & RPC log drawer sliding over the simulator dashboard, offering full visibility into the MQTT message lifecycle.</i>
</div>

---

## Step 1 — Connect Your Wallet

1. Click the **Connect** button in the top-right corner of the simulator.
2. Select your wallet from the list (only Sui-compatible wallets appear).
3. Approve the connection request in your wallet extension.
4. Your wallet address will appear in the button.

>  If you see "Unlock or finish setting up your Sui wallet", your wallet is installed but locked. Open the extension and unlock it first.

---

## Direct Control Tab

On the left side of the screen, you will find the DApp Control Center. It has two operating modes: **Direct Control** and **Agent**.

In Direct Control mode, you trigger a specific pre-defined command and sign an x402 payment manually.

| Button | Command | Description |
|---|---|---|
| **⌂ HOME** | `HOME` | Returns arm to the default neutral position |
| **Front High** | `MOVE1` | Moves arm forward and up |
| **Right Reach** | `MOVE2` | Extends arm to the right |
| **Right Low** | `MOVE3` | Lowers arm to the right side |

**How to use:**
1. Make sure your wallet is connected
2. Click **Front High** (or any other macro)
3. A Sui wallet popup will appear asking you to sign a transaction
4. Click **Approve** in your wallet
5. Watch the 3D digital twin on the right animate in real-time as the x402 pipeline resolves
6. A toast notification will appear with links to **SUI Scan (Testnet)** and the receipt on **Walrus Testnet Explorer**

---

## Agent Tab

Fully autonomous AI orchestration. Instead of manually picking commands, you describe what you want in natural language and the **AWS Bedrock (Meta Llama 4 Maverick)** agent decides which hardware to invoke and in what sequence.

### Agentic Sequential Planner

The Simulator features 1:1 visual parity with the production DApp's sequence execution planner. When the AI determines that a task requires multiple physical steps, it generates a sequential execution plan.

### How the Sequence Planner works

1. Your message is sent to the Aether Orchestrator API.
2. The LLM fetches the live hardware schema and emits a structured `tool_calls` array.
3. The DApp renders a dark, premium **Execution Plan Card** in the chat, listing all pending steps.
4. The DApp iterates through the tool calls sequentially. For each step:
   - You sign a specific x402 transaction for that step.
   - The UI status indicator shifts from grey `PENDING` to cyan ` RUNNING`.
   - The physical/simulated device executes the movement.
   - Upon completion, the status shifts to a green ` SUCCESS`.
5. Once all steps complete, the agent emits a final success summary.

### Example prompts to try

```
"Move the arm to the Right Reach position, and then return it to the Home position."
```
→ Agent sequences 2 tool calls (`MOVE2` then `HOME`). The execution planner renders both steps and drives the inverse kinematics twin in real-time.

```
"Turn on the LED and then read the sensor"
```
→ Agent sequences 2 tool calls: `ON` then `READ_SENSORS` (2 transactions to sign).

> **Note**: For each tool call the agent generates, you will need to sign a wallet transaction. Multi-step commands require multiple signatures, but the visual sequence planner tracks your progress through the entire macro operation!

---

## The Complete Transaction Lifecycle

When you trigger a manual action or the AI agent orchestrates a tool call, the following end-to-end lifecycle executes. Thanks to Sui's sub-second finality and the Aether Gateway's automated x402 negotiation, this entire process occurs autonomously within **2 to 4 seconds**, requiring zero human intervention:

```
1.  DApp builds the petition payload:
    { tx_id, requester, target_hardware_id, command, ... }

2.  DApp sends POST to:
    https://simgate.hackathon.dpdns.org/aether/hire

3.  Gateway responds: HTTP 402 Payment Required
    (includes x402-payment-requirement header with USDC price)

4.  ExactSuiDappScheme builds a Programmable Transaction Block (PTB)
    to transfer USDC from your wallet to the gateway's wallet

5.  Your Sui wallet extension shows a signing popup

6.  You click Approve → PTB is co-signed by the facilitator

7.  DApp resubmits with x402-payment-payload header

8.  Gateway verifies payment → Sui Testnet transaction confirmed

9.  Gateway publishes MQTT command to:
    aether/passive/{device_id}/action  (for passive)
    aether/active/{device_id}/intent   (for active)

10. Devices Simulator receives the MQTT message

11. Devices Simulator processes the command, updates UI

12. Devices Simulator publishes receipt to:
    aether/passive/{device_id}/receipt (for passive)
    aether/active/{device_id}/receipt  (for active)

13. Gateway receives receipt, uploads telemetry to Walrus Testnet

14. Gateway returns HTTP 200 to DApp with:
    { transaction: "0x...", receipt: {...}, walrus_blob_id: "..." }

15. DApp shows success toast with SUI Scan + Walrus links
```

---

## Verifying Your Transactions

Every successful hardware command instantly generates a toast notification containing direct links to two verifiable on-chain artifacts.

<div align="center">
  <img src="images/rec.png" alt="Transaction Confirmed Toast" width="40%"/>
</div>
<div align="center">
  <i>Fig 5. The success toast generated by the DApp Simulator upon a completed hardware actuation.</i>
</div>

### 1. SUI Scan (Testnet)
Click **"View on SUI Explorer"** in the toast to view the full on-chain record of the x402 USDC micro-transaction transferred from your wallet to the Aether Gateway. You can also manually navigate to:
```text
https://suiscan.xyz/testnet/tx/{your_transaction_hash}
```

### 2. Walrus Testnet Explorer
Click **"Open Walrus Explorer"** in the toast to view the raw JSON telemetry receipt generated by the hardware. This data is permanently anchored to the Walrus decentralized storage network.

<div align="center">
  <img src="images/walrus1.png" alt="Walrus Simulator Integration" width="50%"/>
</div>
<div align="center">
  <i>Fig 6. The hardware simulator receives the Blob ID confirmation from the Gateway in real-time.</i>
</div>

<div align="center">
  <img src="images/walrus2.png" alt="Walrus Explorer View" width="50%"/>
</div>
<div align="center">
  <i>Fig 7. The Walrus Explorer displays the immutable JSON receipt payload.</i>
</div>

---

## Troubleshooting

| Problem | Likely Cause | Solution |
|---|---|---|
| Devices Simulator dots stay red | MQTT broker unreachable | Refresh the page. Check your network/firewall. |
| "Wallet not connected" error | Wallet disconnected | Click Connect and reconnect your wallet |
| Transaction popup never appears | Wallet extension blocked by browser | Allow popups for the domain in browser settings |
| "User rejected" error | You declined the signature | Click the action button again and click Approve |
| "402 Payment Required" stuck | Insufficient USDC balance | Get more Testnet USDC from the faucet |
| Devices Simulator shows no receipt | MQTT round-trip timeout | Refresh both tabs and retry; the broker occasionally resets |
| Agent says "Gateway unavailable" | Simulator gateway is offline | Check `https://simgate.hackathon.dpdns.org/aether/health` |


---

## Live Infrastructure — Open in Your Browser

All services below are **deployed and live right now**. You can open each URL directly in your browser to verify the system is running.

### Simulator Gateway (`simgate.hackathon.dpdns.org`)

The Aether Gateway Simulator is the x402 enforcement layer for the Testnet environment. It is connected to **3 supervised simulated devices** via the MQTT broker.

| Endpoint | URL | What it returns |
|---|---|---|
| **Health** | [simgate.hackathon.dpdns.org/aether/health](https://simgate.hackathon.dpdns.org/aether/health) | `{ok, gateway_address, uptime}` — confirms the server is online |
| **Status** | [simgate.hackathon.dpdns.org/aether/status](https://simgate.hackathon.dpdns.org/aether/status) | Full subsystem snapshot: broker connection, supervised devices count, in-flight requests |
| **Agent Guide** | [simgate.hackathon.dpdns.org/aether/agent-guide.json](https://simgate.hackathon.dpdns.org/aether/agent-guide.json) | Live LLM-readable schema: all registered devices, capabilities, commands, and x402 pricing |

**Example `/aether/status` response:**
```json
{
  "ok": true,
  "gateway": "0x4fd0bb1b499dd9a00b757a26cf3a49ea0cf207e4732d9901e70f94a76cffe4de",
  "uptime": 26139,
  "broker": {
    "connected": true,
    "broker": "wss://mqtt.hackathon.dpdns.org:443",
    "gatewayId": "Gateway_Victor",
    "supervised": 3
  },
  "inflight": 0
}
```

**Example `/aether/agent-guide.json` response (abbreviated):**
```json
{
  "ok": true,
  "system_description": "Aether Gateway Simulator - Exposes simulated machine capabilities through x402 over HTTP.",
  "agent_routing_instructions": [
    "If the user refers to a 'passive node' or physical device, select a hardware target with type 'PASSIVE'.",
    "If the user refers to the 'active node', select a hardware target with type 'ACTIVE'."
  ],
  "hardware_targets": [
    { "id": "Sub_B8023212CFA3", "name": "M5Stack Passive Node", "type": "PASSIVE", "..." },
    { "id": "Sub_C0C1CE79B23D", "name": "Jetson Nano AI Node",  "type": "ACTIVE",  "..." },
    { "id": "Sub_6503CAF9C2C7", "name": "Robotic Arm",          "type": "PASSIVE", "..." }
  ]
}
```

---

### Sui Facilitator (`sui.hackathon.dpdns.org`)

The Facilitator is the **gas sponsorship service** — it co-signs every x402 Programmable Transaction Block so users pay zero SUI gas. It runs on Sui **Testnet**.

| Endpoint | URL | What it returns |
|---|---|---|
| **Health** | [sui.hackathon.dpdns.org/health](https://sui.hackathon.dpdns.org/health) | `{"status": "ok"}` — confirms the facilitator is live |
| **Sponsor** | `POST sui.hackathon.dpdns.org/sponsor` | Accepts an unsigned PTB and returns it co-signed with the facilitator keypair |
| **Verify** | `POST sui.hackathon.dpdns.org/verify` | Validates a submitted x402 payment payload |
| **Settle** | `POST sui.hackathon.dpdns.org/settle` | Executes final on-chain settlement on Sui Testnet |

> The `/sponsor`, `/verify`, and `/settle` endpoints are called automatically by the DApp Simulator during every x402 transaction. You do not need to call them manually.

---

## Full Service Reference

| Service | URL | Network |
|---|---|---|
| DApp Simulator | [aether-dapp-simulator.expo.app](https://aether-dapp-simulator.expo.app/) | Testnet |
| Devices Simulator | [aether-devices-simulator.expo.app](https://aether-devices-simulator.expo.app/) | Testnet |
| Gateway Health | [simgate.hackathon.dpdns.org/aether/health](https://simgate.hackathon.dpdns.org/aether/health) | Testnet |
| Gateway Status | [simgate.hackathon.dpdns.org/aether/status](https://simgate.hackathon.dpdns.org/aether/status) | Testnet |
| Agent Guide (Live Schema) | [simgate.hackathon.dpdns.org/aether/agent-guide.json](https://simgate.hackathon.dpdns.org/aether/agent-guide.json) | Testnet |
| Facilitator Health | [sui.hackathon.dpdns.org/health](https://sui.hackathon.dpdns.org/health) | Testnet |
| MQTT Broker | `wss://mqtt.hackathon.dpdns.org:443` | Testnet |
| SUI Scan (Testnet) | [suiscan.xyz/testnet](https://suiscan.xyz/testnet) | Testnet |
| Walrus Explorer | [aggregator.walrus-testnet.walrus.space](https://aggregator.walrus-testnet.walrus.space) | Testnet |

---

<div align="center">
  <i>The simulator is a production-grade Expo application deployed via EAS on Sui Testnet.</i><br/>
  <i>No physical hardware required. All transactions are real and on-chain.</i>
</div>

