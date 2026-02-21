export const playgroundHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>x402 DevEx Playground</title>
  <style>
    :root {
      --bg: #060913;
      --card: #0d1428cc;
      --line: #243255;
      --text: #e7eeff;
      --muted: #9eb1dc;
      --accent: #7aa2ff;
      --accent2: #66e2ff;
      --ok: #31d39b;
      --warn: #f5b25e;
      --err: #ff6f88;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background:
        radial-gradient(900px 400px at 10% -10%, rgba(97,131,255,.2), transparent 50%),
        radial-gradient(800px 420px at 100% 0%, rgba(84,215,255,.15), transparent 55%),
        var(--bg);
      padding: 14px;
    }

    .app {
      width: min(760px, 100%);
      margin: 0 auto;
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01));
      backdrop-filter: blur(10px);
      box-shadow: 0 20px 70px rgba(0, 0, 0, .45);
    }

    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border-bottom: 1px solid var(--line);
      background: #0b1225cc;
    }

    .chip {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      color: var(--muted);
      background: rgba(122,162,255,.1);
      white-space: nowrap;
    }

    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      margin-right: 6px;
      background: var(--ok);
      box-shadow: 0 0 12px rgba(49,211,155,.8);
      vertical-align: middle;
    }

    .body { padding: 14px; }

    h1 {
      margin: 0;
      font-size: clamp(1.25rem, 5vw, 1.8rem);
      letter-spacing: -.02em;
    }

    .sub {
      margin: 6px 0 12px;
      color: var(--muted);
      line-height: 1.4;
    }

    .seg {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .seg button {
      height: 40px;
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--muted);
      background: #111a34;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
    }

    .seg button.active {
      color: #071125;
      border-color: transparent;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
    }

    label {
      display: block;
      margin: 9px 0 6px;
      font-size: 13px;
      color: var(--muted);
    }

    input {
      width: 100%;
      height: 46px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #121b34;
      color: var(--text);
      font-size: 16px;
      padding: 0 12px;
      outline: none;
    }

    input:focus { border-color: var(--accent); }

    .actions {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      margin: 12px 0;
    }

    .run {
      height: 46px;
      border: 0;
      border-radius: 12px;
      color: #061127;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
    }

    .ghost {
      height: 46px;
      min-width: 92px;
      border: 1px solid var(--line);
      border-radius: 12px;
      color: var(--muted);
      background: transparent;
      font-weight: 600;
      cursor: pointer;
    }

    .out {
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      background: #0b1328;
    }

    .outhead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 11px;
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      background: #0e1732;
    }

    pre {
      margin: 0;
      min-height: 180px;
      max-height: 340px;
      overflow: auto;
      padding: 11px;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #d9e5ff;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (max-width: 520px) {
      .top, .body { padding: 11px; }
      .actions { grid-template-columns: 1fr; }
      .ghost { width: 100%; }
    }
  </style>
</head>
<body>
  <main class="app">
    <header class="top">
      <div class="chip">⚡ x402 DevEx Playground</div>
      <div class="chip"><span class="dot"></span>Local API</div>
    </header>

    <section class="body">
      <h1>Flow Runner</h1>
      <p class="sub">Pick a mode, hit run, inspect response. No clutter.</p>

      <div class="seg" role="tablist" aria-label="request mode">
        <button id="mode-unpaid" class="active" data-mode="unpaid">Unpaid</button>
        <button id="mode-paid" data-mode="paid">Paid</button>
        <button id="mode-replay" data-mode="replay">Replay</button>
      </div>

      <label>Task</label>
      <input id="task" value="summarize this repo" />

      <label>Idempotency key</label>
      <input id="key" value="demo-key-001" />

      <div class="actions">
        <button id="run" class="run">Run request</button>
        <button id="newKey" class="ghost">New key</button>
      </div>

      <div class="out">
        <div class="outhead"><span>Response log</span><span id="status">Ready</span></div>
        <pre id="out">Ready.</pre>
      </div>
    </section>
  </main>

  <script>
    const out = document.getElementById('out');
    const status = document.getElementById('status');
    const task = document.getElementById('task');
    const key = document.getElementById('key');
    const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));

    let mode = 'unpaid';

    const tone = { ok: '#31d39b', warn: '#f5b25e', err: '#ff6f88', idle: '#9eb1dc' };

    function setStatus(text, t='idle') {
      status.textContent = text;
      status.style.color = tone[t] || tone.idle;
    }

    function stamp() { return new Date().toLocaleTimeString(); }

    function log(payload) {
      out.textContent = '[' + stamp() + ']\n' + payload + '\n\n' + out.textContent;
    }

    function selectMode(next) {
      mode = next;
      modeButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === next));
      setStatus('Mode: ' + next, 'idle');
    }

    async function runRequest() {
      const headers = {
        'content-type': 'application/json',
        'Idempotency-Key': key.value.trim() || 'demo-key-001'
      };

      const shouldPay = mode === 'paid' || mode === 'replay';
      if (shouldPay) headers['X-Payment'] = 'v1:0.01:proof123';

      if (mode === 'paid') key.value = 'demo-key-' + Math.floor(Math.random() * 1e6);

      setStatus('Requesting…', 'warn');

      const res = await fetch('/agent/task', {
        method: 'POST',
        headers,
        body: JSON.stringify({ task: task.value, payment: { token: 'USDC' } })
      });

      const body = await res.json().catch(() => ({}));
      const replayed = res.headers.get('Idempotency-Replayed');
      const t = res.status >= 500 ? 'err' : res.status >= 400 ? 'warn' : 'ok';

      setStatus('HTTP ' + res.status, t);
      log(JSON.stringify({ mode, status: res.status, replayed, body }, null, 2));
    }

    modeButtons.forEach((b) => b.onclick = () => selectMode(b.dataset.mode));
    document.getElementById('run').onclick = () => runRequest().catch((e) => { setStatus('Error', 'err'); log(String(e)); });
    document.getElementById('newKey').onclick = () => { key.value = 'demo-key-' + Math.floor(Math.random() * 1e6); setStatus('New key', 'ok'); };
  </script>
</body>
</html>`;
