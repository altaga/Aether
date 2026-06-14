import { Slot } from 'expo-router';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  '<< mutation', 
  'User rejected the request', 
  'TRPCClientError',
  'dApp.signTransactionBlock'
]);

// #region debug-point B:layout-import-graph
function __dbgLayout(hypothesisId: string, location: string, msg: string, data: Record<string, unknown> = {}) {
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

function __dbgRequireLayout<T>(hypothesisId: string, location: string, moduleName: string, loader: () => T): T {
  __dbgLayout(hypothesisId, location, `require:start:${moduleName}`);
  try {
    const mod = loader();
    __dbgLayout(hypothesisId, location, `require:ok:${moduleName}`, __dbgLiteralResult(moduleName, mod));
    return mod;
  } catch (error: any) {
    __dbgLayout(hypothesisId, location, `require:error:${moduleName}`, {
      message: String(error?.message || error),
      stack: String(error?.stack || ''),
    });
    throw error;
  }
}

const { SuiClientProvider, WalletProvider } = __dbgRequireLayout(
  'B',
  'src/app/_layout.tsx:dapp-kit',
  '@mysten/dapp-kit',
  () => require('@mysten/dapp-kit')
);
const { QueryClient, QueryClientProvider } = __dbgRequireLayout(
  'B',
  'src/app/_layout.tsx:react-query',
  '@tanstack/react-query',
  () => require('@tanstack/react-query')
);
const { getFullnodeUrl } = __dbgRequireLayout(
  'B',
  'src/app/_layout.tsx:sui-client',
  '@mysten/sui/client',
  () => require('@mysten/sui/client')
);
const { Toaster } = __dbgRequireLayout(
  'E',
  'src/app/_layout.tsx:hot-toast',
  'react-hot-toast',
  () => require('react-hot-toast')
);
__dbgRequireLayout(
  'B',
  'src/app/_layout.tsx:dapp-kit-css',
  '@mysten/dapp-kit/dist/index.css',
  () => require('@mysten/dapp-kit/dist/index.css')
);
// #endregion

const queryClient = new QueryClient();
const networks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
};

export default function Layout() {
  // #region debug-point B:layout-render
  __dbgLayout('B', 'src/app/_layout.tsx:render', 'layout:render:start');
  // #endregion
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="mainnet">
        <WalletProvider autoConnect={true} storageKey="aether-dapp:wallet-connection-info:v2">
          <div style={{ height: '100vh', overflowY: 'auto', backgroundColor: '#0A0A0A', color: '#FFF' }}>
            <Slot />
            <Toaster 
              position="top-right"
              gutter={10}
              containerStyle={{
                top: 18,
                right: 18,
              }}
              toastOptions={{
                duration: 10000,
                style: {
                  background: '#050505',
                  color: '#FFFFFF',
                  border: '1px solid #5A5A5A',
                  borderRadius: '10px',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.68)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
                  fontSize: '13px',
                  padding: '10px 12px',
                  maxWidth: '320px',
                },
              }}
            />
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
