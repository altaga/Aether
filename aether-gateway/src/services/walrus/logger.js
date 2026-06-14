// =============================================================================
//  Aether Gateway — Walrus Memory Logger
//  -----------------------------------------------------------------------------
//  Pushes a JSON telemetry payload to the Walrus publisher using the
//  *native* `fetch` API. Walrus returns a JSON envelope with the
//  cryptographic BlobId under either `newlyCreated.blobObject.blobId` or
//  `alreadyCertified.blobObject.blobId` — we extract whichever is present.
//
//  CRITICAL: an upload failure must NOT crash the gateway. The function
//  catches every error, logs it, and returns `null` so the coordinator
//  can keep routing physical commands.
// =============================================================================

import { settings } from '../settings/settings.js';

const TAG = '[WALRUS]';
const log  = (m) => console.log(`${TAG} ${m}`);
const warn = (m) => console.log(`${TAG} \x1b[33m⚠ ${m}\x1b[0m`);
const fail = (m) => console.log(`${TAG} \x1b[31m✖ ${m}\x1b[0m`);

// -----------------------------------------------------------------------------
//  pushToWalrus(payload)
//
//   payload: any JSON-serialisable object. The gateway adds `stored_at`
//   and `gateway` fields automatically.
//
//   Returns:  the BlobId string on success, or `null` on failure.
// =============================================================================
export async function pushToWalrus(payload) {
  const body = {
    ...payload,
    stored_at: new Date().toISOString(),
    gateway:   settings.sui.address || '(unset)',
  };

  const data = JSON.stringify(body);

  try {
    // Walrus requires ?epochs=X; auto-inject if the env was set without it.
    const url = new URL(settings.walrus.storeEndpoint);
    if (!url.searchParams.has('epochs')) {
      url.searchParams.set('epochs', '5');
    }

    log(`→ PUT ${url.toString()}  (${data.length} bytes)`);

    const res = await fetch(url.toString(), {
      method:  'PUT',
      headers: { 'content-type': 'application/json' },
      body:    data,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      fail(`HTTP ${res.status} from Walrus  ${text.slice(0, 200)}`);
      return null;
    }

    const json = await res.json().catch(() => null);
    if (!json) {
      fail(`Walrus returned non-JSON body`);
      return null;
    }

    const blobId =
      json?.newlyCreated?.blobObject?.blobId
      ?? json?.alreadyCertified?.blobObject?.blobId
      ?? json?.blobId
      ?? null;

    if (!blobId) {
      fail(`Walrus response had no blobId: ${JSON.stringify(json).slice(0, 200)}`);
      return null;
    }

    log(`✔ stored · blobId=${blobId}  (${data.length} bytes)`);
    return blobId;
  } catch (e) {
    fail(`upload failed: ${e.message}  (gateway continues)`);
    return null;
  }
}
