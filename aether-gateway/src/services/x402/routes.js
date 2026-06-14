// =============================================================================
//  Aether Gateway — x402 HTTP Routes
//  -----------------------------------------------------------------------------
//   POST /aether/hire        — x402 paid petition
//   GET  /aether/health      — liveness probe
//
//   The hire route implements the full x402 challenge / response dance using
//   the @altaga/x402-sui SDK.
// =============================================================================

import express from 'express';
import { x402ResourceServer, HTTPFacilitatorClient } from "@altaga/x402-sui/core/server";
import { x402HTTPResourceServer } from "@altaga/x402-sui/core/server-http";
import { ExactSuiServerScheme } from "@altaga/x402-sui/sui/exact/server";
import { settings } from "../settings/settings.js";
const { skills, devices } = settings;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBaseUrl(req) {
  const host = req.get('host');
  return `${req.protocol}://${host}`;
}

function examplePetitionFor(skill) {
  const petition = {
    tx_id: "tx_demo_001",
    requester: "0xYOUR_SUI_ADDRESS",
    target_hardware_id: skill.target_hardware_id,
    command: skill.command,
  };

  if (skill.execution_model === 'AGENTIC') {
    petition.user_prompt = "Inspect the workspace and summarize any issues.";
    petition.context = skill.system_prompt || "[SYSTEM CONTEXT] Execute the requested reasoning task.";
  }

  return petition;
}

function renderSkillCards(skillsList) {
  return skillsList.map((skill) => `
    <article class="card">
      <div class="pill-row">
        <span class="pill">${escapeHtml(skill.execution_model)}</span>
        <span class="pill subtle">${escapeHtml(skill.type)}</span>
      </div>
      <h3>${escapeHtml(skill.name)}</h3>
      <p>${escapeHtml(skill.description || 'No description provided.')}</p>
      <dl class="meta">
        <div><dt>Target</dt><dd>${escapeHtml(skill.target_hardware_id)}</dd></div>
        <div><dt>Command</dt><dd>${escapeHtml(JSON.stringify(skill.command))}</dd></div>
        <div><dt>Price</dt><dd>${escapeHtml(skill.price)} USDC base units</dd></div>
      </dl>
    </article>
  `).join('');
}

function renderUserPage({ req, gatewayAddress }) {
  const baseUrl = getBaseUrl(req);
  const exampleSkill = skills[0];
  const exampleJson = JSON.stringify(examplePetitionFor(exampleSkill), null, 2);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aether Gateway</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07090d;
      --panel: rgba(17, 22, 31, 0.88);
      --panel-2: rgba(13, 18, 26, 0.88);
      --line: rgba(255,255,255,0.08);
      --text: #f5f7fb;
      --muted: #98a2b3;
      --accent: #7c9cff;
      --accent-2: #36d0a5;
      --shadow: 0 24px 80px rgba(0,0,0,0.45);
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(124,156,255,0.16), transparent 32%),
        radial-gradient(circle at top right, rgba(54,208,165,0.14), transparent 30%),
        var(--bg);
      color: var(--text);
    }
    a { color: inherit; text-decoration: none; }
    .shell { max-width: 1180px; margin: 0 auto; padding: 32px 24px 80px; }
    .nav, .hero, .section, .footer {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }
    .nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .brand { font-size: 14px; color: var(--muted); }
    .nav-links { display: flex; gap: 12px; flex-wrap: wrap; }
    .nav-links a, .cta {
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      font-size: 14px;
    }
    .cta.primary {
      background: linear-gradient(135deg, var(--accent), #95a9ff);
      color: #0d1220;
      font-weight: 700;
      border: none;
    }
    .hero {
      padding: 48px;
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 54px; line-height: 1.02; letter-spacing: -2px; max-width: 12ch; }
    .lead { margin-top: 18px; font-size: 18px; color: var(--muted); line-height: 1.6; max-width: 58ch; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
    .hero-panel, .section { padding: 28px; }
    .hero-panel {
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 20px;
    }
    .eyebrow { color: var(--accent-2); font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 18px; }
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 22px;
    }
    .card h3 { font-size: 20px; margin: 14px 0 10px; }
    .card p { color: var(--muted); line-height: 1.6; min-height: 72px; }
    .pill-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .pill {
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #09111f;
      background: var(--accent-2);
      font-weight: 700;
    }
    .pill.subtle { background: rgba(255,255,255,0.08); color: var(--text); }
    .meta { margin-top: 14px; display: grid; gap: 10px; }
    .meta div { display: grid; gap: 4px; }
    .meta dt { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .meta dd { margin: 0; font-size: 14px; word-break: break-word; }
    .section { margin-top: 24px; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 18px; }
    .section-header p { color: var(--muted); max-width: 60ch; line-height: 1.6; }
    .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .step {
      padding: 20px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--line);
      border-radius: 18px;
    }
    .step strong { display: inline-block; margin-bottom: 10px; font-size: 12px; color: var(--accent-2); }
    pre {
      margin: 0;
      overflow-x: auto;
      padding: 20px;
      border-radius: 18px;
      background: #05070b;
      border: 1px solid var(--line);
      color: #d7def0;
      font-size: 13px;
      line-height: 1.6;
    }
    .footer { margin-top: 24px; padding: 22px 28px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; color: var(--muted); }
    @media (max-width: 980px) {
      .hero, .grid, .steps { grid-template-columns: 1fr; }
      h1 { font-size: 42px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <nav class="nav">
      <div>
        <div class="eyebrow">Aether Gateway</div>
        <div class="brand">Public x402 access layer for device and agent capabilities</div>
      </div>
      <div class="nav-links">
        <a href="/user">User Page</a>
        <a href="/agentic">Agentic Page</a>
        <a href="/aether/skills">Skills JSON</a>
        <a href="/aether/status">Gateway Status</a>
      </div>
    </nav>

    <section class="hero">
      <div>
        <div class="eyebrow">Human-Friendly Overview</div>
        <h1>Hire real Aether capabilities over x402.</h1>
        <p class="lead">
          This gateway exposes paid machine actions and agentic services over HTTP.
          Clients discover available skills, request a paid action through x402, sign the payment,
          and receive an execution receipt from the gateway.
        </p>
        <div class="hero-actions">
          <a class="cta primary" href="/agentic">Open Agentic Integration Guide</a>
          <a class="cta" href="/aether/skills">See Live Skills JSON</a>
          <a class="cta" href="/aether/health">Health Check</a>
        </div>
      </div>
      <aside class="hero-panel">
        <div class="eyebrow">Live Endpoint</div>
        <h3>${escapeHtml(baseUrl)}</h3>
        <div class="meta">
          <div><dt>Gateway Address</dt><dd>${escapeHtml(gatewayAddress || 'Unavailable')}</dd></div>
          <div><dt>Primary x402 Route</dt><dd>POST ${escapeHtml(baseUrl)}/aether/hire</dd></div>
          <div><dt>Discovery Routes</dt><dd>GET /aether/skills, /aether/status, /aether/health</dd></div>
        </div>
      </aside>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Capabilities</div>
          <h2>What this gateway can do right now</h2>
        </div>
        <p>These entries are backed by the live gateway skill registry, so this page reflects what clients can actually request through the paid x402 surface.</p>
      </div>
      <div class="grid">${renderSkillCards(skills)}</div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">How It Works</div>
          <h2>Simple x402 request flow</h2>
        </div>
        <p>The payment challenge and device dispatch are handled by the gateway. Your app only needs to send a valid petition and complete the x402 signature flow.</p>
      </div>
      <div class="steps">
        <div class="step"><strong>1. Discover</strong><p>Read available skills from <code>/aether/skills</code> and choose a target plus command.</p></div>
        <div class="step"><strong>2. Request</strong><p>POST a petition to <code>/aether/hire</code> with the skill payload.</p></div>
        <div class="step"><strong>3. Pay</strong><p>Handle the x402 challenge and sign the payment with a compatible Sui client.</p></div>
        <div class="step"><strong>4. Receive</strong><p>Read the gateway receipt, execution response, and transaction digest.</p></div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Example Request</div>
          <h2>Minimal petition payload</h2>
        </div>
        <p>Use this as the starting body before the x402 challenge-response handshake. Agentic skills also require <code>user_prompt</code> and <code>context</code>.</p>
      </div>
      <pre>${escapeHtml(exampleJson)}</pre>
    </section>

    <footer class="footer">
      <span>Human page: <strong>/user</strong></span>
      <span>Agent page: <strong>/agentic</strong></span>
      <span>Machine routes: <strong>/aether/hire</strong>, <strong>/aether/skills</strong>, <strong>/aether/status</strong></span>
    </footer>
  </div>
</body>
</html>`;
}

function renderAgenticPage({ req, gatewayAddress }) {
  const baseUrl = getBaseUrl(req);
  const capabilities = skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    type: skill.type,
    execution_model: skill.execution_model,
    price: skill.price,
    asset: skill.asset,
    target_hardware_id: skill.target_hardware_id,
    command: skill.command,
    requires_user_prompt: skill.execution_model === 'AGENTIC',
    example_petition: examplePetitionFor(skill),
  }));

  const agentGuide = {
    product: "Aether Gateway",
    purpose: "Expose paid machine capabilities through x402 over HTTP.",
    base_url: baseUrl,
    gateway_address: gatewayAddress,
    discovery: {
      health: `${baseUrl}/aether/health`,
      status: `${baseUrl}/aether/status`,
      skills: `${baseUrl}/aether/skills`,
      user_page: `${baseUrl}/user`,
      agentic_page: `${baseUrl}/agentic`,
    },
    payment_flow: [
      "GET skills and choose a supported command.",
      "POST petition to /aether/hire.",
      "If HTTP 402 Payment Required is returned, complete the x402 flow using a compatible Sui exact scheme client.",
      "Replay the request with payment proof.",
      "Read receipt, tx_id, transaction digest, and response payload."
    ],
    route_contracts: {
      hire: {
        method: "POST",
        url: `${baseUrl}/aether/hire`,
        content_type: "application/json",
        required_fields: ["tx_id", "requester", "target_hardware_id", "command"],
        extra_fields_for_agentic: ["user_prompt", "context"],
      },
    },
    capabilities,
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aether Gateway Agentic Interface</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #05070a;
      --panel: #0d121a;
      --line: rgba(255,255,255,0.08);
      --text: #e8edf7;
      --muted: #96a0b5;
      --accent: #70e0b8;
      --accent-2: #89a8ff;
      font-family: "SFMono-Regular", Consolas, Menlo, Monaco, monospace;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    .wrap { max-width: 1160px; margin: 0 auto; padding: 28px 22px 64px; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 20px;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 34px; margin-bottom: 12px; }
    h2 { font-size: 20px; margin-bottom: 12px; }
    p, li { color: var(--muted); line-height: 1.65; }
    .topline { color: var(--accent); text-transform: uppercase; letter-spacing: 0.14em; font-size: 12px; margin-bottom: 10px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .route {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.02);
      margin-top: 10px;
    }
    code.inline { color: var(--accent-2); }
    pre {
      margin: 0;
      overflow-x: auto;
      padding: 18px;
      border-radius: 16px;
      background: #030507;
      border: 1px solid var(--line);
      color: #d6def7;
      font-size: 12.5px;
      line-height: 1.6;
    }
    .links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .links a {
      display: inline-block;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid var(--line);
      color: var(--text);
      text-decoration: none;
    }
    @media (max-width: 900px) { .row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="panel">
      <div class="topline">Agentic Page</div>
      <h1>Aether Gateway machine-usable interface</h1>
      <p>This page is written for external agents, SDK builders, and automation systems that need to understand the gateway surface quickly and invoke x402-protected capabilities correctly.</p>
      <div class="links">
        <a href="/user">Human Page</a>
        <a href="/aether/skills">Raw Skills JSON</a>
        <a href="/aether/status">Status</a>
        <a href="/aether/health">Health</a>
      </div>
    </section>

    <section class="panel row">
      <div>
        <h2>Integration Notes</h2>
        <div class="route">Base URL: <code class="inline">${escapeHtml(baseUrl)}</code></div>
        <div class="route">Primary route: <code class="inline">POST /aether/hire</code></div>
        <div class="route">Gateway address: <code class="inline">${escapeHtml(gatewayAddress || 'Unavailable')}</code></div>
        <div class="route">Required petition fields: <code class="inline">tx_id</code>, <code class="inline">requester</code>, <code class="inline">target_hardware_id</code>, <code class="inline">command</code></div>
        <div class="route">Agentic capabilities additionally require: <code class="inline">user_prompt</code>, <code class="inline">context</code></div>
      </div>
      <div>
        <h2>Execution Semantics</h2>
        <p>Deterministic skills map to fixed device commands. Agentic skills dispatch requests whose content depends on user intent plus system context.</p>
        <p style="margin-top:12px;">If the request is unpaid, the route returns an x402 challenge. Use a compatible exact Sui x402 client to satisfy the challenge, then resend the request with payment proof.</p>
      </div>
    </section>

    <section class="panel">
      <h2>Canonical Agent Guide</h2>
      <pre>${escapeHtml(JSON.stringify(agentGuide, null, 2))}</pre>
    </section>
  </div>
</body>
</html>`;
}

export function createX402Router({ gatewayAddress, dispatch, brokerState, inFlight }) {
  const router = express.Router();

  // Setup the x402 SDK Facilitator Client
  const facilitatorClient = new HTTPFacilitatorClient({
      url: settings.facilitator.url,
  });

  const resourceServer = new x402ResourceServer(facilitatorClient)
      .register('exact:sui:mainnet', new ExactSuiServerScheme());

  // Pre-middleware to ensure the petition is valid BEFORE checking for payment
  const validatePetition = (req, res, next) => {
    const petition = req.body;
    if (!isValidPetition(petition)) {
      return res.status(400).json({
        ok:       false,
        error:    'invalid-petition',
        expected: ['tx_id', 'requester', 'target_hardware_id', 'command'],
      });
    }

    const skill = skills.find(s => 
      s.target_hardware_id === petition.target_hardware_id && 
      s.command[0] === petition.command[0]
    );

    if (!skill) {
      return res.status(404).json({
        ok: false,
        error: 'unknown-skill',
        detail: `No active skill found for target ${petition.target_hardware_id} and command ${petition.command}`
      });
    }

    if (skill.execution_model === 'AGENTIC') {
      if (typeof petition.user_prompt !== 'string' || typeof petition.context !== 'string') {
        return res.status(400).json({
          ok: false,
          error: 'invalid-petition',
          expected: ['user_prompt', 'context', 'tx_id', 'requester', 'target_hardware_id', 'command'],
          detail: 'Agentic skills require both user_prompt and context fields.'
        });
      }
    }

    if (!skill.price || !skill.token) {
      return res.status(500).json({
        ok: false,
        error: 'invalid-skill-config',
        detail: `Skill ${skill.id || skill.name || 'unknown'} must define both price and token in config/skills.json`
      });
    }

    req.skill = skill;
    next();
  };

  const applySkillPricing = (req, res, next) => {
    const skill = req.skill;
    const routesConfig = {
      'POST /aether/hire': {
        accepts: {
          scheme: 'exact',
          network: 'sui:mainnet',
          asset: skill.token,
          payTo: gatewayAddress,
          amount: skill.price,
          feePayer: 'facilitator'
        },
        description: `Hire ${skill.name || skill.id || 'skill'} for task execution`,
        mimeType: 'application/json',
      }
    };

    const httpServer = new x402HTTPResourceServer(resourceServer, routesConfig);
    return httpServer.middleware()(req, res, next);
  };

  // The middleware automatically issues the 402 challenge, validates the X-PAYMENT header,
  // and settles the transaction on-chain via the Facilitator before calling the final handler.
  router.post('/aether/hire', validatePetition, applySkillPricing, async (req, res) => {
    const petition = req.body;
    const skill = req.skill;
    
    // (c) dispatch using Unified Taxonomy
    try {
      const receipt = await dispatch(petition, skill);
      
      if (receipt.response) {
        console.log(`[GATEWAY] 🧠 AI Response for ${petition.target_hardware_id}:\n\x1b[36m${receipt.response}\x1b[0m`);
      }

      return res.json({
        ok:          true,
        message:     'execution correct',
        tx_id:       petition.tx_id,
        target:      petition.target_hardware_id,
        receipt,
        gateway:     gatewayAddress,
        payer:       petition.requester,
        transaction: req.payment?.transactionDigest
      });
    } catch (e) {
      return res.status(504).json({
        ok:    false,
        error: 'esp32-no-receipt',
        detail: e.message,
      });
    }
  });

  router.get('/aether/health', (req, res) => {
    res.json({ ok: true, gateway: gatewayAddress, uptime: process.uptime() });
  });

  router.get('/', (req, res) => {
    res.redirect('/user');
  });

  router.get('/user', (req, res) => {
    res.type('html').send(renderUserPage({ req, gatewayAddress }));
  });

  router.get('/agentic', (req, res) => {
    res.type('html').send(renderAgenticPage({ req, gatewayAddress }));
  });

  router.get('/aether/skills', (req, res) => {
    res.json({
      ok: true,
      skills
    });
  });

  // ── GET /aether/agent-guide.json ─────────────────────────────────────────
  // Exposes an AI-optimized, grouped schema of all hardware targets and instructions.
  router.get('/aether/agent-guide.json', (req, res) => {
    const baseUrl = getBaseUrl(req);
    
    // We now have the natively hierarchical 'devices' schema imported from settings!
    res.json({
      ok: true,
      system_description: "Aether Gateway - Exposes paid machine capabilities through x402 over HTTP.",
      agent_routing_instructions: [
        "If the user refers to a 'passive node', robotic arm, or physical device, select a hardware target with type 'PASSIVE'.",
        "If the user refers to the 'active node' or wants to 'say hello', 'explain', or 'search', select a hardware target with type 'ACTIVE'."
      ],
      route_contracts: {
        hire: {
          method: "POST",
          url: `${baseUrl}/aether/hire`,
          required_fields: ["tx_id", "requester", "target_hardware_id", "command"],
          extra_fields_for_agentic: ["user_prompt", "context"],
        }
      },
      hardware_targets: devices
    });
  });

  // ── GET /aether/status ───────────────────────────────────────────────────
  // Subsystem snapshot — matches the simulator's surface.
  router.get('/aether/status', (req, res) => {
    res.json({
      ok:       true,
      gateway:  gatewayAddress,
      uptime:   process.uptime(),
      broker:   brokerState ? brokerState() : null,
      inflight: inFlight ? inFlight.size : 0,
    });
  });

  return router;
}

function isValidPetition(p) {
  return p
    && typeof p.tx_id              === 'string' && p.tx_id.length              > 0
    && typeof p.requester          === 'string' && p.requester.length          > 0
    && typeof p.target_hardware_id === 'string' && p.target_hardware_id.length > 0
    && Array.isArray(p.command)    && p.command.length            > 0;
}
