export const playgroundHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>x402 DevEx Playground</title>
  <style>
    :root {
      --bg: #070912;
      --panel: #0f1322;
      --panel-2: #12192e;
      --line: #243054;
      --text: #eaf1ff;
      --muted: #a4b1d4;
      --brand: #7aa2ff;
      --brand-2: #6de2ff;
      --ok: #37d39a;
      --warn: #f0b35e;
      --err: #ff6b7a;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background:
        radial-gradient(1200px 600px at 20% -10%, rgba(64, 113, 255, 0.18), transparent 55%),
        radial-gradient(900px 500px at 100% 0%, rgba(96, 212, 255, 0.12), transparent 55%),
        var(--bg);
      color: var(--text);
      display: grid;
      place-items: center;
      padding: 28px 16px;
    }

    .shell {
      width: min(980px, 100%);
      border: 1px solid var(--line);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
      overflow: hidden;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid var(--line);
      background: rgba(9, 12, 22, 0.7);
      backdrop-filter: blur(6px);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 10px;
      background: rgba(122, 162, 255, 0.08);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ok);
      box-shadow: 0 0 14px rgba(55, 211, 154, 0.8);
    }

    .content {
      padding: 20px;
      display: grid;
      gap: 16px;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.3rem, 2.3vw, 1.8rem);
      letter-spacing: -0.02em;
    }

    p {
      margin: 6px 0 0;
      color: var(--muted);
      line-height: 1.45;
    }

    .inputs {
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 760px) {
      .inputs { grid-template-columns: 1fr; }
    }

    .field {
      display: grid;
      gap: 6px;
      font-size: 13px;
      color: var(--muted);
    }

    input {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 11px 12px;
      background: var(--panel-2);
      color: var(--text);
      outline: none;
      transition: border-color .15s ease;
    }

    input:focus { border-color: var(--brand); }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    button {
      appearance: none;
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 10px 14px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: transform .04s ease, border-color .15s ease, opacity .15s ease;
    }

    button:active { transform: translateY(1px); }

    .primary {
      color: #071022;
      background: linear-gradient(135deg, var(--brand), var(--brand-2));
    }

    .secondary {
      color: var(--text);
      background: #1a2340;
      border-color: #2e3d6a;
    }

    .ghost {
      color: var(--muted);
      background: transparent;
      border-color: var(--line);
    }

    .output {
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      background: #0b1020;
    }

    .output-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      background: #0e1428;
    }

    .status {
      font-weight: 600;
      color: var(--muted);
    }

    pre {
      margin: 0;
      padding: 12px;
      min-height: 220px;
      max-height: 360px;
      overflow: auto;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #d7e3ff;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div class="badge"><span>⚡</span><span>x402 DevEx Playground</span></div>
      <div class="badge"><span class="dot"></span><span>Local API</span></div>
    </header>

    <section class="content">
      <div>
        <h1>402 → pay → retry flow tester</h1>
        <p>Fast sanity checks for unpaid, paid, and idempotent replay behavior.</p>
      </div>

      <div class="inputs">
        <label class="field">Task<input id="task" value="summarize this repo" /></label>
        <label class="field">Idempotency Key<input id="key" value="demo-key-001" /></label>
      </div>

      <div class="actions">
        <button id="unpaid" class="secondary">Send unpaid request</button>
        <button id="paid" class="primary">Send paid request</button>
        <button id="replay" class="secondary">Retry same paid request</button>
        <button id="newKey" class="ghost">New key</button>
        <button id="clear" class="ghost">Clear</button>
      </div>

      <div class="output">
        <div class="output-head">
          <span>Response Log</span>
          <span id="status" class="status">Ready</span>
        </div>
        <pre id="out">Ready.</pre>
      </div>
    </section>
  </main>

  <script>
    const out = document.getElementById('out');
    const status = document.getElementById('status');
    const task = document.getElementById('task');
    const key = document.getElementById('key');

    function stamp() { return new Date().toLocaleTimeString(); }

    function setStatus(text, tone) {
      status.textContent = text;
      status.style.color = tone === 'ok' ? '#37d39a' : tone === 'warn' ? '#f0b35e' : tone === 'err' ? '#ff6b7a' : '#a4b1d4';
    }

    function print(v) {
      out.textContent = '[' + stamp() + ']\n' + v + '\n\n' + out.textContent;
    }

    async function hit(paid) {
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

      const tone = res.status >= 500 ? 'err' : res.status >= 400 ? 'warn' : 'ok';
      setStatus('HTTP ' + res.status, tone);

      print(JSON.stringify({ status: res.status, replayed, body }, null, 2));
    }

    document.getElementById('unpaid').onclick = () => hit(false).catch((e) => { setStatus('Error', 'err'); print(String(e)); });
    document.getElementById('paid').onclick = () => hit(true).catch((e) => { setStatus('Error', 'err'); print(String(e)); });
    document.getElementById('replay').onclick = () => hit(true).catch((e) => { setStatus('Error', 'err'); print(String(e)); });
    document.getElementById('newKey').onclick = () => {
      key.value = 'demo-key-' + Math.floor(Math.random() * 1e6);
      setStatus('New key generated', 'ok');
    };
    document.getElementById('clear').onclick = () => {
      out.textContent = 'Cleared.';
      setStatus('Ready', '');
    };
  </script>
</body>
</html>`;
