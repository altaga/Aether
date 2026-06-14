import React, { useState, useRef, useEffect } from 'react';
import logoImage from '../assets/logoAE.png';

// #region debug-point A:index-import-graph
function __dbgIndex(hypothesisId: string, location: string, msg: string, data: Record<string, unknown> = {}) {
  fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'dapp-from-error',
      runId: 'pre',
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
}

function __dbgLiteralResult(moduleName: string, mod: unknown) {
  return {
    keys: mod && typeof mod === 'object' ? Object.keys(mod as Record<string, unknown>).slice(0, 12) : [typeof mod],
    moduleName,
  };
}

function __dbgRequireIndex<T>(hypothesisId: string, location: string, moduleName: string, loader: () => T): T {
  __dbgIndex(hypothesisId, location, `require:start:${moduleName}`);
  try {
    const mod = loader();
    __dbgIndex(hypothesisId, location, `require:ok:${moduleName}`, __dbgLiteralResult(moduleName, mod));
    return mod;
  } catch (error: any) {
    __dbgIndex(hypothesisId, location, `require:error:${moduleName}`, {
      message: String(error?.message || error),
      stack: String(error?.stack || ''),
    });
    throw error;
  }
}

const { ConnectButton, useCurrentAccount, useSuiClient, useSignTransaction, useWallets } = __dbgRequireIndex(
  'A',
  'src/app/index.tsx:dapp-kit',
  '@mysten/dapp-kit',
  () => require('@mysten/dapp-kit')
);
const { x402Client } = __dbgRequireIndex(
  'D',
  'src/app/index.tsx:x402-core-client',
  '@altaga/x402-sui/core/client',
  () => require('@altaga/x402-sui/core/client')
);
const { x402HTTPClient } = __dbgRequireIndex(
  'D',
  'src/app/index.tsx:x402-core-http',
  '@altaga/x402-sui/core/http',
  () => require('@altaga/x402-sui/core/http')
);
const { ExactSuiDappScheme } = __dbgRequireIndex(
  'D',
  'src/app/index.tsx:x402-sui-exact-client',
  '@altaga/x402-sui/sui/exact/client',
  () => require('@altaga/x402-sui/sui/exact/client')
);
const { toast } = __dbgRequireIndex(
  'E',
  'src/app/index.tsx:hot-toast',
  'react-hot-toast',
  () => require('react-hot-toast')
);
// #endregion

interface ChatPlanStep {
  id: string;
  target: string;
  command: string[];
  status: 'pending' | 'running' | 'success' | 'failed';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  plan?: {
    steps: ChatPlanStep[];
  };
}

const formatStepName = (target: string, command: string[]) => {
  const cmd = command[0] || '';
  const args = command.slice(1).join(', ');
  const deviceName = target === 'Sub_0096F8C40A24' ? 'Passive Node' : target === 'Sub_B8023212CFA4' ? 'Robotic Arm' : 'Active Node';
  
  let actionDesc = cmd;
  if (cmd === 'VIBRATE_ALERT') actionDesc = 'Haptic Vibration Alert';
  else if (cmd === 'FLASH_LEDS') actionDesc = 'Flash Status LEDs';
  else if (cmd === 'BEEP') actionDesc = `Buzzer Sound (${args || '1000'}Hz)`;
  else if (cmd === 'ARM_HOME') actionDesc = 'Return to Home Position';
  else if (cmd === 'ARM_REACH_CENTER') actionDesc = 'Reach Center Forward';
  else if (cmd === 'ARM_REACH_LEFT') actionDesc = 'Reach Left Workspace';
  else if (cmd === 'ARM_REACH_RIGHT') actionDesc = 'Reach Right Workspace';
  else if (cmd === 'ARM_MOVE') actionDesc = `Move trajectory (${args})`;
  else if (cmd === 'ARM_GRIPPER') actionDesc = `Set Gripper closure (${args}%)`;
  else if (cmd === 'READ_BATTERY') actionDesc = `Read Battery Status`;
  else if (cmd === 'READ_IMU') actionDesc = `Read IMU & Temp`;
  else if (cmd === 'READ_SOUND') actionDesc = `Read Mic dB`;
  else if (cmd === 'READ_ALL') actionDesc = `Read All Sensors`;
  else if (cmd === 'SEARCH_QUERY') actionDesc = `AI Web Query`;
  else if (cmd === 'INSPECT') actionDesc = `AI Visual Inspection`;

  return `${deviceName}: ${actionDesc}`;
};

const getStatusColor = (status: 'pending' | 'running' | 'success' | 'failed') => {
  if (status === 'pending') return '#666666';
  if (status === 'running') return '#00FFFF';
  if (status === 'success') return '#10B981';
  return '#EF4444';
};

const getStatusIcon = (status: 'pending' | 'running' | 'success' | 'failed') => {
  if (status === 'pending') {
    return <span style={{ color: '#666', fontSize: '14px', lineHeight: 1 }}>•</span>;
  }
  if (status === 'running') {
    return <span style={{ color: '#00FFFF', fontSize: '14px', lineHeight: 1, fontWeight: 'bold' }}>⚡</span>;
  }
  if (status === 'success') {
    return <span style={{ color: '#10B981', fontSize: '12px', lineHeight: 1, fontWeight: 'bold' }}>✓</span>;
  }
  return <span style={{ color: '#EF4444', fontSize: '12px', lineHeight: 1, fontWeight: 'bold' }}>✕</span>;
};

function showErrorToast(title: string, description?: string) {
  toast.error(description ? `${title}: ${description}` : title);
}

function showSuccessToast(message: string) {
  toast.success(message);
}

export default function Index() {
  // #region debug-point C:index-render
  __dbgIndex('C', 'src/app/index.tsx:render', 'index:render:start');
  // #endregion
  const account = useCurrentAccount();
  const wallets = useWallets();
  const suiClient = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const readyWallets = wallets.filter((wallet: any) => Array.isArray(wallet.accounts) && wallet.accounts.length > 0);
  const canConnectWallet = readyWallets.length > 0;

  const PASSIVE_DEVICE_ID = 'Sub_0096F8C40A24';

  const [tab, setTab] = useState<'control' | 'agent'>('control');
  const [prompt, setPrompt] = useState('');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [agentChatHistory, setAgentChatHistory] = useState<ChatMessage[]>([{
    id: 'init_greeting',
    sender: 'agent',
    text: "Hello! I am Aether, your Orchestration Agent. I can help you discover, monitor, and control connected devices across the network. How can I assist you today?"
  }]);
  const [sensorData, setSensorData] = useState<{ temp: number | null, sound: number | null }>({ temp: null, sound: null });
  const [armState, setArmState] = useState<{ lastCommand: string }>({ lastCommand: 'HOME' });
  const [activeState, setActiveState] = useState<{ lastCommand: string }>({ lastCommand: 'AWAIT' });
  const [beepFreq, setBeepFreq] = useState<number>(1000);
  const [lastPassiveAction, setLastPassiveAction] = useState<string>('AWAIT');
  const [passiveSensors, setPassiveSensors] = useState<any>({});
  const [gripperPos, setGripperPos] = useState<number>(50);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const agentChatScrollRef = useRef<HTMLDivElement>(null);
  const telemetryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  useEffect(() => {
    if (agentChatScrollRef.current) {
      agentChatScrollRef.current.scrollTop = agentChatScrollRef.current.scrollHeight;
    }
  }, [agentChatHistory, loading]);

  useEffect(() => {
    if (telemetryOpen && telemetryScrollRef.current) {
      telemetryScrollRef.current.scrollTop = telemetryScrollRef.current.scrollHeight;
    }
  }, [logs, telemetryOpen]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const formatToolResult = (targetHardwareId: string, command: string[], result: any) => {
    const cmd = command[0] || '';
    const receipt = result?.receipt || result;

    const armLabels: Record<string, string> = {
      ARM_READY: 'ready pose (servos energized)',
      ARM_RELAX: 'relaxed pose (servos relaxed)',
      ARM_HOME: 'home position',
      ARM_REACH_CENTER: 'center forward waypoint',
      ARM_REACH_LEFT: 'left waypoint',
      ARM_REACH_RIGHT: 'right waypoint',
      ARM_MOVE: 'coordinate trajectory',
      ARM_GRIPPER: 'gripper closure state',
    };

    if (targetHardwareId === PASSIVE_DEVICE_ID) {
      if (cmd === 'VIBRATE_ALERT') return 'Done. Triggered haptic vibration and red LED flash.';
      if (cmd === 'FLASH_LEDS') return 'Done. Flashed blue LEDs.';
      if (cmd === 'HARDWARE_DEMO') return 'Done. Executed full hardware showcase.';
      if (cmd === 'BEEP') return `Done. Played buzzer tone at ${command[1] || '1000'} Hz.`;

      if (cmd.startsWith('READ_')) {
        try {
          const raw = receipt?.response || receipt;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return `Done. Sensor data: ${JSON.stringify(parsed)}`;
        } catch {
          return `Done. Read raw data: ${receipt?.response || JSON.stringify(receipt)}`;
        }
      }

      return `Done. Passive device executed ${cmd || command.join(', ')}.`;
    }

    if (targetHardwareId === 'Sub_B8023212CFA4') {
      const label = armLabels[cmd] || cmd || command.join(', ');
      if (cmd) return `Done. Robotic arm moved to ${label}.`;
      return 'Done. Robotic arm command executed.';
    }

    if (targetHardwareId === 'Sub_5FE6EC984A4A') {
      const responseText = receipt?.response || result?.response;
      if (typeof responseText === 'string' && responseText.trim()) return responseText.trim();
      return 'Done. Active device completed the request.';
    }

    return `Done. Executed ${targetHardwareId} ${command.join(', ')}.`;
  };

  const executePetition = async (targetHardwareId: string, commandPayload: any) => {
    if (!account) {
      addLog('❌ Wallet not connected!');
      showErrorToast('Wallet Disconnected', 'Please connect your Sui wallet to continue.');
      return;
    }

    setActiveTarget(targetHardwareId);
    setLoading(true);
    addLog(`📡 Connecting to Gateway...`);
    
    try {
      // Setup x402 Client with the custom dApp Scheme
      const coreClient = new x402Client().register(
        'exact:sui:mainnet',
        new ExactSuiDappScheme(suiClient, account.address, signTransaction)
      );
      
      const client = new x402HTTPClient(coreClient);
      const targetUrl = 'http://localhost:8086/aether/hire';
      
      const petitionPayload = {
        tx_id: `tx_${Date.now()}`,
        requester: account.address,
        target_hardware_id: targetHardwareId,
        ...commandPayload,
      };

      addLog(`👉 Sending request to: ${targetHardwareId}`);
      const res = await client.fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petitionPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        const msg = errText.toLowerCase();
        if (msg.includes('reject') || msg.includes('decline') || msg.includes('cancel') || msg.includes('user rejected')) {
          addLog('🚫 User rejected the wallet signature.');
          showErrorToast('Transaction Declined', 'You cancelled the signature request.');
        } else if (msg.includes('timeout')) {
          addLog('⏳ Device response timeout.');
          showErrorToast('Device Timeout', 'The target device did not respond within 15 seconds.');
        } else {
          addLog(`❌ Request failed: ${errText}`);
          showErrorToast('Request Failed', errText);
        }
        return;
      }

      // Read JSON or text
      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
        addLog(`✅ Request Successful! Response:`);
        addLog(JSON.stringify(data.receipt || data, null, 2));
        
        if (data.transaction) {
          const txHash = data.transaction;
          const walrusBlobId =
            data?.receipt?.walrus_blob_id ||
            data?.walrus_blob_id ||
            data?.receipt?.blob_id ||
            data?.blob_id ||
            null;
          const walrusBlobUrl = walrusBlobId
            ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${walrusBlobId}`
            : null;
          toast.custom((t: any) => (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#050505',
              border: '1px solid #5A5A5A',
              borderRadius: '10px',
              overflow: 'hidden',
              width: '320px',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.68)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
              position: 'relative',
            }}>
              {/* Close button */}
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#A8A8A8',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
              {/* Top row: tick + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 12px 10px' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #3B3B3B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 4.5" stroke="#34C759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '24px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.1px' }}>Transaction Confirmed</span>
                  <span style={{ fontSize: '11px', color: '#A8A8A8' }}>Aether Gateway · SUI Mainnet</span>
                </div>
              </div>
              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#2A2A2A', margin: '0 12px' }} />
              {/* Explorer link */}
              <a
                href={`https://suiscan.xyz/mainnet/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px',
                  color: '#F3F3F3',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.1px',
                  transition: 'background 0.15s ease',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#121212')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span>View on SUI Explorer</span>
                <span style={{ fontSize: '14px', opacity: 0.9 }}>↗</span>
              </a>
              {walrusBlobUrl ? (
                <>
                  <div style={{ height: '1px', backgroundColor: '#1B3A22', margin: '0 12px' }} />
                  <a
                    href={walrusBlobUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px',
                      color: '#B8FFD0',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.1px',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0F1711')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span>Open Walrus Explorer</span>
                    <span style={{ fontSize: '14px', opacity: 0.9 }}>↗</span>
                  </a>
                </>
              ) : null}
            </div>
          ), { duration: 10000 });
        } else {
          showSuccessToast('Action executed successfully!');
        }
        return data;
      } catch {
        addLog(`✅ Request Successful! Response: ${text}`);
        showSuccessToast('Action executed successfully!');
        return { receipt: { response: text } };
      }
    } catch (e: any) {
      const errStr = typeof e === 'object' ? JSON.stringify(e).toLowerCase() : String(e).toLowerCase();
      const msg = e.message?.toLowerCase() || '';
      
      if (
        msg.includes('reject') || msg.includes('decline') || msg.includes('cancel') || msg.includes('user rejected') ||
        errStr.includes('reject') || errStr.includes('decline') || errStr.includes('cancel') || errStr.includes('user rejected')
      ) {
        showErrorToast('Transaction Declined', 'You cancelled the signature request.');
        addLog('🚫 User rejected the wallet signature.');
      } else {
        const displayErr = e.message || (typeof e === 'object' ? 'Unknown transaction error' : String(e));
        addLog(`❌ Error: ${displayErr}`);
        showErrorToast('Transaction Failed', displayErr);
      }
      return null;
    } finally {
      setLoading(false);
      setActiveTarget(null);
    }
  };

  const runVibrateAlert = async () => {
    const data = await executePetition(PASSIVE_DEVICE_ID, { command: ['VIBRATE_ALERT'] });
    if (data) setLastPassiveAction('VIBRATE_ALERT');
  };
  const runFlashLeds = async () => {
    const data = await executePetition(PASSIVE_DEVICE_ID, { command: ['FLASH_LEDS'] });
    if (data) setLastPassiveAction('FLASH_LEDS');
  };

  const runBeep = async (freq: number) => {
    const data = await executePetition(PASSIVE_DEVICE_ID, { command: ['BEEP', freq] });
    if (data) setLastPassiveAction(`BEEP (${freq}Hz)`);
  };

  const parsePassiveSensors = (data: any) => {
    try {
      if (!data) return;
      const raw = data?.receipt?.response || data?.receipt;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object') {
        setPassiveSensors((prev: any) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      // ignore
    }
  };

  const runReadBattery = async () => {
    const data = await executePetition(PASSIVE_DEVICE_ID, { command: ['READ_BATTERY'] });
    if (data) {
      setLastPassiveAction('READ_BATTERY');
      parsePassiveSensors(data);
    }
  };

  const runReadIMU = async () => {
    const data = await executePetition(PASSIVE_DEVICE_ID, { command: ['READ_IMU'] });
    if (data) {
      setLastPassiveAction('READ_IMU');
      parsePassiveSensors(data);
    }
  };

  const runReadSound = async () => {
    const data = await executePetition(PASSIVE_DEVICE_ID, { command: ['READ_SOUND'] });
    if (data) {
      setLastPassiveAction('READ_SOUND');
      parsePassiveSensors(data);
    }
  };

  const runReadAll = async () => {
    const data = await executePetition(PASSIVE_DEVICE_ID, { command: ['READ_ALL'] });
    if (data) {
      setLastPassiveAction('READ_ALL');
      parsePassiveSensors(data);
    }
  };

  const runArmCommand = async (command: string) => {
    const data = await executePetition('Sub_B8023212CFA4', { command: [command] });
    if (data) {
      setArmState({ lastCommand: command });
    }
  };

  const runGripper = async (pos: number) => {
    const data = await executePetition('Sub_B8023212CFA4', { command: ['ARM_GRIPPER', pos] });
    if (data) {
      setArmState({ lastCommand: `ARM_GRIPPER (${pos}%)` });
    }
  };
  
  const runActive = async () => {
    if (!prompt.trim()) return;
    const userMsg = prompt.trim();
    setPrompt('');
    setChatHistory(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userMsg }]);

    const data = await executePetition('Sub_5FE6EC984A4A', {
      command: ['SEARCH_QUERY'],
      context: "[SYSTEM PROMPT]\nYou are Aether, a friendly and helpful AI assistant. Your primary function is to help users by searching the internet for answers to their general queries.\n\n[SYSTEM CONTEXT]\nYou have access to the DuckDuckGo internet search tool. Use it whenever you need to find up-to-date information to answer the user's question.",
      user_prompt: userMsg,
    });

    if (data) {
      const responseText = data.receipt?.response || data.response || 'Action executed successfully.';
      setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'agent', text: responseText }]);
      setActiveState({ lastCommand: 'SEARCH_QUERY' });
    }
  };

  const runAgent = async () => {
    if (!agentPrompt.trim()) return;
    const userMsg = agentPrompt.trim();
    setAgentPrompt('');
    setAgentChatHistory(prev => [...prev, { id: `${Date.now()}_u`, sender: 'user', text: userMsg }]);

    if (!account) {
      addLog('❌ Wallet not connected!');
      showErrorToast('Wallet Disconnected', 'Please connect your Sui wallet to continue.');
      return;
    }

    setLoading(true);
    addLog('🧠 Calling Bedrock agent...');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }

      if (!res.ok || !data) {
        const err = data?.message || (raw ? raw.slice(0, 500) : `HTTP ${res.status}`);
        addLog(`❌ Agent error: ${err}`);
        setAgentChatHistory(prev => [...prev, { id: `${Date.now()}_a_err`, sender: 'agent', text: String(err) }]);
        return;
      }

      const assistantMessage = String(data.message || '');
      const toolCalls = Array.isArray(data.tool_calls) ? data.tool_calls : [];

      if (assistantMessage) {
        setAgentChatHistory(prev => [...prev, { id: `${Date.now()}_a`, sender: 'agent', text: assistantMessage }]);
      }

      if (toolCalls.length > 0) {
        const planId = `${Date.now()}_plan`;
        const initialPlanSteps = toolCalls.map((tc: any, idx: number) => ({
          id: `${planId}_step_${idx}`,
          target: String(tc?.target_hardware_id || ''),
          command: Array.isArray(tc?.command) ? tc.command.map(String) : [],
          status: 'pending' as const,
        }));
        
        setAgentChatHistory(prev => [...prev, {
          id: planId,
          sender: 'agent',
          text: `Executing sequence plan (${toolCalls.length} actions):`,
          plan: { steps: initialPlanSteps }
        }]);

        for (let idx = 0; idx < toolCalls.length; idx++) {
          const tc = toolCalls[idx];
          const target = String(tc?.target_hardware_id || '');
          const command = Array.isArray(tc?.command) ? tc.command.map(String) : [];
          if (!target || command.length === 0) continue;

          // Update step to running
          setAgentChatHistory(prev => prev.map(m => {
            if (m.id === planId && m.plan) {
              return {
                ...m,
                plan: {
                  steps: m.plan.steps.map((s, sIdx) => sIdx === idx ? { ...s, status: 'running' as const } : s)
                }
              };
            }
            return m;
          }));

          addLog(`🧰 Running step ${idx + 1}/${toolCalls.length} -> target=${target} command=${JSON.stringify(command)}`);

          const payload: any = { command };
          if (tc.user_prompt) payload.user_prompt = String(tc.user_prompt);
          if (tc.context) payload.context = String(tc.context);

          const result = await executePetition(target, payload);
          if (result) {
            // Update step to success
            setAgentChatHistory(prev => prev.map(m => {
              if (m.id === planId && m.plan) {
                return {
                  ...m,
                  plan: {
                    steps: m.plan.steps.map((s, sIdx) => sIdx === idx ? { ...s, status: 'success' as const } : s)
                  }
                };
              }
              return m;
            }));

            // Extract and display Active Node response
            if (target === 'Sub_5FE6EC984A4A') {
              setActiveState({ lastCommand: command.join(', ') });
              const activeResp = result.receipt?.response || result.response;
              if (activeResp && typeof activeResp === 'string') {
                setAgentChatHistory(prev => [...prev, {
                  id: `${Date.now()}_a_resp_${idx}`,
                  sender: 'agent',
                  text: `**Active Node:**\n${activeResp.trim()}`
                }]);
              }
            }
          } else {
            // Update current step to failed and all subsequent steps to failed (cancelled)
            setAgentChatHistory(prev => prev.map(m => {
              if (m.id === planId && m.plan) {
                return {
                  ...m,
                  plan: {
                    steps: m.plan.steps.map((s, sIdx) => sIdx >= idx ? { ...s, status: 'failed' as const } : s)
                  }
                };
              }
              return m;
            }));
            break; // Stop execution sequence
          }
        }
      }
    } catch (e: any) {
      addLog(`❌ Agent request failed: ${e.message}`);
      setAgentChatHistory(prev => [...prev, { id: `${Date.now()}_a_fail`, sender: 'agent', text: String(e.message || e) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <img src={logoImage} alt="Aether Logo" style={styles.headerLogoImage} />
          <div style={styles.headerTextGroup}>
            <h1 style={styles.logo}>Aether Interface</h1>
            <p style={styles.subtitle}>Agentic Execution Network for Machine-to-Machine Economy & Automation • Powered by Sui Network</p>
          </div>
        </div>
        <div style={styles.walletActions}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', flexWrap: 'nowrap' }}>
            <button
              style={{
                ...styles.telemetryMenuBtn,
                ...(telemetryOpen ? styles.telemetryMenuBtnOpen : {}),
                height: '42px',
                boxSizing: 'border-box'
              }}
              onClick={() => setTelemetryOpen((prev) => !prev)}
            >
              {telemetryOpen ? 'HIDE TELEMETRY' : 'OPEN TELEMETRY'}
            </button>
            <div style={{ height: '42px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <ConnectButton />
            </div>
          </div>
          {!account && wallets.length > 0 && !canConnectWallet ? (
            <p style={styles.walletSetupHint}>
              Unlock or finish setting up your Sui wallet, then try connecting again.
            </p>
          ) : null}
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tabButton, ...(tab === 'control' ? styles.tabButtonActive : {}) }}
            onClick={() => setTab('control')}
          >
            Direct Control
          </button>
          <button
            style={{ ...styles.tabButton, ...(tab === 'agent' ? styles.tabButtonActive : {}) }}
            onClick={() => setTab('agent')}
          >
            Agent
          </button>
        </div>

        {tab === 'control' && (
        <div style={styles.grid}>
          {/* Passive Node Control */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Passive Device</h2>
              <span style={styles.badge}>Sub_0096F8C40A24</span>
            </div>
            <p style={styles.cardDesc}>Deterministic M5Stack node. Runs high-precision firmware to execute local actions (vibration alerts, status LED blink, audio buzzer tone chimes) with gasless/paid x402 Sui settlement.</p>
            
            <div style={styles.sensorDashboard}>
              <div style={styles.sensorMetric}>
                <span style={styles.sensorLabel}>STATUS</span>
                <span style={{...styles.sensorValue, fontSize: '18px', color: '#10B981'}}>ONLINE</span>
              </div>
              <div style={styles.sensorDivider} />
              <div style={styles.sensorMetric}>
                <span style={styles.sensorLabel}>LAST ACTION</span>
                <span style={{...styles.sensorValue, fontSize: '18px'}}>{lastPassiveAction}</span>
              </div>
            </div>

            <div style={styles.sectionDivider} />

            <span style={styles.sectionLabel}>Live Telemetry</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Battery</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E5E7EB' }}>{passiveSensors.battery_pct !== undefined ? `${passiveSensors.battery_pct}%` : '--'}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{passiveSensors.battery_v !== undefined ? `${passiveSensors.battery_v}v` : '--'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>IMU & Temp</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E5E7EB' }}>{passiveSensors.temp_c !== undefined ? `${passiveSensors.temp_c}°C` : '--'}</div>
                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                  <span>X:{passiveSensors.ax !== undefined ? passiveSensors.ax.toFixed(2) : '-'}</span>
                  <span>Y:{passiveSensors.ay !== undefined ? passiveSensors.ay.toFixed(2) : '-'}</span>
                  <span>Z:{passiveSensors.az !== undefined ? passiveSensors.az.toFixed(2) : '-'}</span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Sound Level</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: passiveSensors.sound_db === null ? '#6B7280' : '#E5E7EB' }}>
                  {passiveSensors.sound_db === null ? 'NO MIC' : passiveSensors.sound_db !== undefined ? `${passiveSensors.sound_db} dB` : '--'}
                </div>
              </div>
            </div>

            <div style={styles.sectionDivider} />

            <span style={styles.sectionLabel}>Tactile & Visual Alerts</span>
            <div style={{...styles.buttonGroup, flexWrap: 'wrap'}}>
              <button 
                style={{...styles.button, flex: '1 1 auto', margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={runVibrateAlert} 
                disabled={loading || !account}
              >
                Vibrate Alert
              </button>
              <button 
                style={{...styles.button, flex: '1 1 auto', margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={runFlashLeds} 
                disabled={loading || !account}
              >
                Flash LEDs
              </button>
            </div>

            <div style={styles.sectionDivider} />

            <span style={styles.sectionLabel}>Sensor Telemetry</span>
            <div style={{...styles.buttonGroup, flexWrap: 'wrap'}}>
              <button 
                style={{...styles.button, flex: '1 1 45%', margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={runReadBattery} 
                disabled={loading || !account}
              >
                Read Battery
              </button>
              <button 
                style={{...styles.button, flex: '1 1 45%', margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={runReadIMU} 
                disabled={loading || !account}
              >
                Read IMU
              </button>
              <button 
                style={{...styles.button, flex: '1 1 45%', margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={runReadSound} 
                disabled={loading || !account}
              >
                Read Sound
              </button>
              <button 
                style={{...styles.button, flex: '1 1 45%', margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={runReadAll} 
                disabled={loading || !account}
              >
                Read All
              </button>
            </div>

            <div style={styles.sectionDivider} />

            <span style={styles.sectionLabel}>Buzzer Speaker Tone</span>
            <div style={styles.sliderContainer}>
              <div style={styles.sliderHeader}>
                <span style={styles.sliderText}>Frequency</span>
                <span style={styles.sliderVal}>{beepFreq} Hz</span>
              </div>
              <input 
                type="range" 
                min="200" 
                max="2000" 
                step="50" 
                value={beepFreq} 
                onChange={(e) => setBeepFreq(Number(e.target.value))}
                style={styles.slider}
              />
              <button 
                style={{...styles.buttonPrimary, width: '100%', margin: '8px 0 0 0', opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={() => runBeep(beepFreq)} 
                disabled={loading || !account}
              >
                Play Tone
              </button>
            </div>
          </div>

          {/* Robotic Arm Control */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Robotic Arm</h2>
              <span style={styles.badge}>Sub_B8023212CFA4</span>
            </div>
            <p style={styles.cardDesc}>4DOF high-precision servo arm. Drives inverse kinematics and trajectory interpolation for Cartesian coordinates over x402.</p>
            
            <div style={styles.sensorDashboard}>
              <div style={styles.sensorMetric}>
                <span style={styles.sensorLabel}>STATUS</span>
                <span style={{...styles.sensorValue, fontSize: '18px', color: '#10B981'}}>READY</span>
              </div>
              <div style={styles.sensorDivider} />
              <div style={styles.sensorMetric}>
                <span style={styles.sensorLabel}>LAST COMMAND</span>
                <span style={{...styles.sensorValue, fontSize: '18px'}}>{armState.lastCommand}</span>
              </div>
            </div>

            <div style={styles.sectionDivider} />

            <span style={styles.sectionLabel}>System Commands</span>
            <div style={styles.buttonGroup}>
              <button 
                style={{...styles.button, flex: 1, margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer', borderColor: '#FF8C00', color: '#FF8C00'}} 
                onClick={() => runArmCommand('ARM_HOME')} 
                disabled={loading || !account}
              >
                ⌂ Return Home
              </button>
            </div>

            <div style={styles.sectionDivider} />

            <span style={styles.sectionLabel}>Cartesian Waypoints</span>
            <div style={{...styles.buttonGroup, flexWrap: 'wrap'}}>
              <button 
                style={{...styles.button, flex: '1 1 auto', margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={() => runArmCommand('ARM_REACH_CENTER')} 
                disabled={loading || !account}
              >
                Center
              </button>
              <button 
                style={{...styles.button, flex: '1 1 auto', margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={() => runArmCommand('ARM_REACH_LEFT')} 
                disabled={loading || !account}
              >
                Left
              </button>
              <button 
                style={{...styles.button, flex: '1 1 auto', margin: 0, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={() => runArmCommand('ARM_REACH_RIGHT')} 
                disabled={loading || !account}
              >
                Right
              </button>
            </div>

            <div style={styles.sectionDivider} />

            <span style={styles.sectionLabel}>Gripper Claw Control</span>
            <div style={styles.sliderContainer}>
              <div style={styles.sliderHeader}>
                <span style={styles.sliderText}>Closure Percent</span>
                <span style={styles.sliderVal}>{gripperPos} %</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5" 
                value={gripperPos} 
                onChange={(e) => setGripperPos(Number(e.target.value))}
                style={styles.slider}
              />
              <button 
                style={{...styles.buttonPrimary, width: '100%', margin: '8px 0 0 0', opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'pointer'}} 
                onClick={() => runGripper(gripperPos)} 
                disabled={loading || !account}
              >
                Set Gripper
              </button>
            </div>
          </div>

          {/* Active Node Control */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Active Device</h2>
              <span style={styles.badge}>Sub_5FE6EC984A4A</span>
            </div>
            <p style={styles.cardDesc}>A hardware node powered by a local Large Language Model. It understands natural language, reasons autonomously, and crafts intelligent responses — no fixed script, just real-time AI thinking.</p>
            
            <div style={styles.sensorDashboard}>
              <div style={styles.sensorMetric}>
                <span style={styles.sensorLabel}>STATUS</span>
                <span style={{...styles.sensorValue, fontSize: '18px', color: (loading && activeTarget === 'Sub_5FE6EC984A4A') ? '#00FFFF' : '#10B981'}}>
                  {(loading && activeTarget === 'Sub_5FE6EC984A4A') ? 'INFERENCE' : 'ONLINE'}
                </span>
              </div>
              <div style={styles.sensorDivider} />
              <div style={styles.sensorMetric}>
                <span style={styles.sensorLabel}>LAST COMMAND</span>
                <span style={{...styles.sensorValue, fontSize: '18px'}}>{activeState.lastCommand}</span>
              </div>
            </div>

            <div style={styles.sectionDivider} />

            <div style={styles.chatWindow} ref={chatScrollRef}>
              {chatHistory.length === 0 ? (
                <div style={styles.chatEmpty}>Send a prompt to initialize the VLM Pipeline.</div>
              ) : (
                chatHistory.map(msg => (
                  <div key={msg.id} style={{ ...styles.chatBubbleRow, justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ ...styles.chatBubble, ...(msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleAgent) }}>
                      {msg.sender !== 'user' && <div style={styles.chatBubbleLabel}>AGENT</div>}
                      <div style={styles.chatBubbleText}>{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
              {loading && activeTarget === 'Sub_C0C1CE79B23D' && (
                <div style={{ ...styles.chatBubbleRow, justifyContent: 'flex-start' }}>
                  <div style={{ ...styles.chatBubble, ...styles.chatBubbleAgent, opacity: 0.7 }}>
                    <div style={styles.chatBubbleText}>Processing query via Jetson Nano...</div>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.chatInputRow}>
              <input 
                style={{ ...styles.chatInput, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'text' }} 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && runActive()}
                disabled={loading || !account}
                placeholder="Message the agent..."
              />
              <button 
                style={{ ...styles.chatSendButton, opacity: (loading || !account || !prompt.trim()) ? 0.5 : 1, cursor: (loading || !account || !prompt.trim()) ? 'not-allowed' : 'pointer' }} 
                onClick={runActive} 
                disabled={loading || !account || !prompt.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
        )}

        {tab === 'agent' && (
          <div style={styles.agentLayout}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Agentic Layer</h2>
                <span style={styles.badgeAgentic}>BEDROCK</span>
              </div>
              <p style={styles.cardDesc}>Chat with an orchestration agent. It proposes tool calls, and your wallet signs x402 transactions to execute them on real devices via the gateway.</p>

              <div style={styles.chatWindow} ref={agentChatScrollRef}>
                {agentChatHistory.length === 0 ? (
                  <div style={styles.chatEmpty}>Ask the agent to control the ESP32, Robotic Arm, or Active Device.</div>
                ) : (
                  agentChatHistory.map(msg => (
                    <div key={msg.id} style={{ ...styles.chatBubbleRow, justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ ...styles.chatBubble, ...(msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleAgent) }}>
                        {msg.sender !== 'user' && <div style={styles.chatBubbleLabel}>AGENT</div>}
                        <div style={styles.chatBubbleText}>{msg.text}</div>
                        {msg.plan && (
                          <div style={styles.planContainer}>
                            {msg.plan.steps.map((step) => {
                              const stepName = formatStepName(step.target, step.command);
                              const statusIcon = getStatusIcon(step.status);
                              const statusColor = getStatusColor(step.status);
                              return (
                                <div key={step.id} style={styles.planStepRow}>
                                  <div style={{ ...styles.planStepStatusCircle, borderColor: statusColor, color: statusColor }}>
                                    {statusIcon}
                                  </div>
                                  <div style={styles.planStepDetails}>
                                    <span style={styles.planStepName}>{stepName}</span>
                                    <span style={{ ...styles.planStepStatusText, color: statusColor }}>
                                      {step.status.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div style={{ ...styles.chatBubbleRow, justifyContent: 'flex-start' }}>
                    <div style={{ ...styles.chatBubble, ...styles.chatBubbleAgent, opacity: 0.7 }}>
                      <div style={styles.chatBubbleText}>Thinking...</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.chatInputRow}>
                <input
                  style={{ ...styles.chatInput, opacity: (loading || !account) ? 0.5 : 1, cursor: (loading || !account) ? 'not-allowed' : 'text' }}
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runAgent()}
                  disabled={loading || !account}
                  placeholder="Message the agent..."
                />
                <button
                  style={{ ...styles.chatSendButton, opacity: (loading || !account || !agentPrompt.trim()) ? 0.5 : 1, cursor: (loading || !account || !agentPrompt.trim()) ? 'not-allowed' : 'pointer' }}
                  onClick={runAgent}
                  disabled={loading || !account || !agentPrompt.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {telemetryOpen ? (
        <div style={styles.telemetryLayer}>
          <button
            aria-label="Close telemetry drawer"
            onClick={() => setTelemetryOpen(false)}
            style={styles.telemetryBackdrop}
          />
          <div style={styles.telemetryDrawer}>
            <div style={styles.telemetryHeaderRow}>
              <span style={styles.telemetryTitle}>GENERAL TELEMETRY & RPC LOG</span>
              <div style={styles.telemetryHeaderActions}>
                <button style={styles.telemetryActionBtn} onClick={() => setLogs([])}>
                  CLEAR
                </button>
                <button style={styles.telemetryActionBtn} onClick={() => setTelemetryOpen(false)}>
                  CLOSE
                </button>
              </div>
            </div>
            <div ref={telemetryScrollRef} style={styles.telemetryScrollView}>
              {logs.length === 0 ? (
                <div style={styles.telemetryEmptyText}>No telemetry or RPC logs generated yet.</div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} style={styles.telemetryLine}>
                    {l}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    padding: '64px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#FFF',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '64px',
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '16px',
  },
  headerLogoImage: {
    width: '48px',
    height: '48px',
    objectFit: 'contain',
  },
  headerTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  logo: {
    fontSize: '32px',
    fontWeight: 700,
    letterSpacing: '-1.2px',
    color: '#FFF',
    margin: 0,
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#888',
    letterSpacing: '-0.2px',
  },
  walletActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  buttonPanel: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '16px',
  },
  telemetryMenuBtn: {
    display: 'flex',
    boxSizing: 'border-box',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '170px',
    height: '42px',
    padding: '0 18px',
    borderRadius: '10px',
    backgroundColor: '#111111',
    border: '1px solid #333333',
    color: '#DDDDDD',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '1.2px',
    cursor: 'pointer',
  },
  telemetryMenuBtnOpen: {
    border: '1px solid #00FFFF',
  },
  walletSetupHint: {
    margin: 0,
    maxWidth: '280px',
    textAlign: 'right',
    fontSize: '12px',
    lineHeight: 1.4,
    color: '#8FA3C2',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: '48px',
  },
  tabs: {
    display: 'flex',
    gap: '12px',
  },
  tabButton: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #222222',
    backgroundColor: '#0F0F0F',
    color: '#AAAAAA',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  tabButtonActive: {
    backgroundColor: '#161616',
    border: '1px solid #333333',
    color: '#FFFFFF',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '32px',
  },
  agentLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr',
  },
  card: {
    backgroundColor: '#111111',
    border: '1px solid #222222',
    borderRadius: '16px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.5px',
    color: '#FFF',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    color: '#888',
    backgroundColor: '#1A1A1A',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  badgeAgentic: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    color: '#FFF',
    backgroundColor: '#222222',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  cardDesc: {
    margin: 0,
    fontSize: '15px',
    color: '#AAA',
    lineHeight: '1.5',
    letterSpacing: '-0.2px',
  },
  spacer: {
    flexGrow: 1,
  },
  input: {
    width: '100%',
    padding: '16px',
    border: '1px solid #222222',
    borderRadius: '12px',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit',
    color: '#FFF',
    backgroundColor: '#0A0A0A',
    marginTop: '8px',
    outline: 'none',
  },
  button: {
    backgroundColor: '#161616',
    color: '#FFF',
    border: '1px solid #222222',
    borderRadius: '10px',
    padding: '14px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '16px',
  },
  buttonPrimary: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    marginTop: '16px',
  },
  telemetryLayer: {
    position: 'fixed',
    inset: '0',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    zIndex: 40,
  },
  telemetryBackdrop: {
    position: 'absolute',
    inset: '0',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.45)',
    cursor: 'pointer',
  },
  telemetryDrawer: {
    position: 'relative',
    margin: '24px',
    width: '36%',
    minWidth: '320px',
    maxWidth: '460px',
    backgroundColor: '#0F0F0F',
    border: '1px solid #222222',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxSizing: 'border-box',
  },
  telemetryHeaderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  telemetryTitle: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#888888',
    letterSpacing: '1.2px',
  },
  telemetryHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  telemetryActionBtn: {
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #222222',
    color: '#AAAAAA',
    fontSize: '9px',
    letterSpacing: '0.8px',
    cursor: 'pointer',
  },
  telemetryScrollView: {
    flex: 1,
    minHeight: '340px',
    maxHeight: 'calc(100vh - 140px)',
    overflowY: 'auto',
    backgroundColor: '#0A0A0A',
    borderRadius: '8px',
    padding: '14px',
    fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
    fontSize: '12px',
    color: '#D4D4D4',
    whiteSpace: 'pre-wrap',
    boxSizing: 'border-box',
  },
  telemetryEmptyText: {
    color: '#666666',
    fontSize: '12px',
  },
  telemetryLine: {
    marginBottom: '10px',
    lineHeight: '1.5',
    color: '#A3A3A3',
  },
  chatWindow: {
    flex: 1,
    minHeight: '300px',
    maxHeight: '300px',
    overflowY: 'auto',
    backgroundColor: 'transparent',
    border: '1px solid #1A1A1A',
    borderRadius: '4px',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    marginTop: '8px',
  },
  chatEmpty: {
    margin: 'auto',
    color: '#666',
    fontSize: '14px',
    fontWeight: 400,
  },
  chatBubbleRow: {
    display: 'flex',
    width: '100%',
  },
  chatBubble: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  chatBubbleUser: {
    maxWidth: '75%',
    backgroundColor: '#262626',
    borderRadius: '24px',
    padding: '12px 20px',
  },
  chatBubbleAgent: {
    maxWidth: '90%',
    backgroundColor: 'transparent',
    padding: '4px 0',
  },
  chatBubbleLabel: {
    fontSize: '12px',
    color: '#888',
    fontWeight: 600,
    letterSpacing: '0.2px',
  },
  chatBubbleText: {
    fontSize: '15px',
    color: '#F3F3F3',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    letterSpacing: '-0.1px',
  },
  chatInputRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  chatInput: {
    flex: 1,
    padding: '16px 20px',
    border: '1px solid #2A2A2A',
    borderRadius: '24px',
    fontSize: '15px',
    fontFamily: 'inherit',
    color: '#FFF',
    backgroundColor: '#121212',
    outline: 'none',
  },
  chatSendButton: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    border: 'none',
    borderRadius: '24px',
    padding: '0 24px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  sensorDashboard: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    border: '1px solid #222222',
    borderRadius: '12px',
    padding: '16px 24px',
    marginTop: '8px',
  },
  sensorMetric: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sensorDivider: {
    width: '1px',
    height: '32px',
    backgroundColor: '#222',
    margin: '0 24px',
  },
  sensorLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#666',
    letterSpacing: '1px',
  },
  sensorValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#FFF',
    fontFamily: 'monospace',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#666',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    marginTop: '8px',
  },
  sectionDivider: {
    height: '1px',
    backgroundColor: '#222',
    margin: '16px 0',
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginTop: '8px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderText: {
    fontSize: '13px',
    color: '#888',
  },
  sliderVal: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#FFF',
    fontWeight: 600,
  },
  slider: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: '#333',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#FFF',
  },
  planContainer: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#050505',
    border: '1px solid #222222',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: '280px',
  },
  planStepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  planStepStatusCircle: {
    width: '18px',
    height: '18px',
    borderRadius: '9px',
    borderWidth: '1px',
    borderStyle: 'solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planStepDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    flexGrow: 1,
    alignItems: 'center',
    gap: '16px',
  },
  planStepName: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#DDDDDD',
  },
  planStepStatusText: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
};
