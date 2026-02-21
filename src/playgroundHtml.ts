export const playgroundHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>x402 DevEx Playground</title>
  <style>
    :root {
      --bg: #070b16;
      --card: #0e1428;
      --card-2: #121a32;
      --line: #223056;
      --text: #e8efff;
      --muted: #9eb0d8;
      --brand: #7aa2ff;
      --brand-2: #6fe0ff;
      --ok: #33d39a;
      --warn: #f3b35f;
      --err: #ff6f86;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        radial-gradient(900px 500px at 10% -15%, rgba(83,130,255,.22), transparent 50%),
        radial-gradient(900px 500px at 95% 0%, rgba(86,220,255,.16), transparent 52%),
        var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      min-height: 100vh;
      padding: 14px;
    }

    .app {
      max-width: 760px;
      margin: 0 auto;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01));
      overflow: hidden;
      box-shadow: 0 18px 60px rgba(0,0,0,.4);
    }

    .head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 12px;
      border-bottom: 1px solid var(--line);
      background: rgba(10,16,34,.75);
    }

    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      color: var(--muted);
      background: rgba(122,162,255,.08);
      white-space: nowrap;
    }

    .dot {
      width: 8px;
      height: 8px;
      display: inline-block;
      border-radius: 999px;
      margin-right: 6px;
      background: var(--ok);
      box-shadow: 0 0 12px rgba(51,211,154,.8);
      vertical-align: middle;
    }

    .body { padding: 14px; }

    h1 {
      margin: 2px 0 4px;
      font-size: clamp(1.25rem, 5vw, 1.7rem);
      line-height: 1.1;
      letter-spacing: -.02em;
    }

    .sub { margin: 0 0 12px; color: var(--muted); }

    label {
      display: block;
      font-size: 13px;
      color: var(--muted);
      margin: 8px 0 6px;
    }

    input {
      width: 100%;
      height: 46px;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 0 12px;
      background: var(--card-2);
      color: var(--text);
      font-size: 16px;
      outline: none;
    }

    input:focus { border-color: var(--brand); }

    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin: 12px 0;
    }

    button {
      height: 44px;
      border-radius: 11px;
      border: 1px solid transparent;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      color: var(--text);
      background: #1a2443;
    }

    .primary {
      color: #061127;
      background: linear-gradient(135deg, var(--brand), var(--brand-2));
    }

    .ghost {
      color: var(--muted);
      background: transparent;
      border-color: var(--line);
    }

    .wide { grid-column: span 2; }

    .out {
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      background: #0c1328;
    }

    .outbar {
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
      font-size: 12px;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      background: #0f1731;
    }

    pre {
      margin: 0;
      min-height: 190px;
      max-height: 320px;
      overflow: auto;
      padding: 12px;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #d9e6ff;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (max-width: 520px) {
      .head { padding: 10px; }
      .body { padding: 12px; }
      .actions { grid-template-columns: 1fr; }
      .wide { grid-column: span 1; }
    }
  </style>
</head>
<body>
  <main class="app">
    <header class="head">
      <div class="pill">⚡ x402 DevEx Playground</div>
      <div class="pill"><span class="dot"></span>Local API</div>
    </header>

    <section class="body">
      <h1>402 → pay → retry</h1>
      <p class="sub">Quickly verify payment flow + idempotency behavior.</p>

      <label>Task</label>
      <input id="task" value="summarize this repo" />

      <label>Idempotency key</label>
      <input id="key" value="demo-key-001" />

      <div class="actions">
        <button id="unpaid">Send unpaid</button>
        <button id="paid" class="primary">Send paid</button>
        <button id="replay">Retry paid</button>
        <button id="newKey" class="ghost">New key</button>
        <button id="clear" class="ghost wide">Clear log</button>
      </div>

      <div class="out">
        <div class="outbar"><span>Response log</span><span id="status">Ready</span></div>
        <pre id="out">Ready.</pre>
      </div>
    </section>
  </main>

  <script>
    const out = document.getElementById('out');
    const status = document.getElementById('status');
    const task = document.getElementById('task');
    const key = document.getElementById('key');

    const tone = { ok: '#33d39a', warn: '#f3b35f', err: '#ff6f86', idle: '#9eb0d8' };

    function setStatus(text, t='idle') {
      status.textContent = text;
      status.style.color = tone[t] || tone.idle;
    }

    function stamp() { return new Date().toLocaleTimeString(); }

    function log(payload) {
      out.textContent = '[' + stamp() + ']\n' + payload + '\n\n' + out.textContent;
    }

    async function send(paid) {
      const headers = {
        'content-type': 'application/json',
        'Idempotency-Key': key.value.trim() || 'demo-key-001'
      };
      if (paid) headers['X-Payment'] = 'v1:0.01:proof123';

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
      log(JSON.stringify({ status: res.status, replayed, body }, null, 2));
    }

    document.getElementById('unpaid').onclick = () => send(false).catch(e => { setStatus('Error', 'err'); log(String(e)); });
    document.getElementById('paid').onclick = () => send(true).catch(e => { setStatus('Error', 'err'); log(String(e)); });
    document.getElementById('replay').onclick = () => send(true).catch(e => { setStatus('Error', 'err'); log(String(e)); });
    document.getElementById('newKey').onclick = () => { key.value = 'demo-key-' + Math.floor(Math.random()*1e6); setStatus('New key', 'ok'); };
    document.getElementById('clear').onclick = () => { out.textContent = 'Cleared.'; setStatus('Ready'); };
  </script>
</body>
</html>`;
