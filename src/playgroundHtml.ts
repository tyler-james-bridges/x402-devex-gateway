export const playgroundHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>x402 DevEx Playground</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui; }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at top, #1f1a3d 0%, #0a0a0f 55%);
      color: #eaf0ff;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(900px, 100%);
      background: linear-gradient(160deg, rgba(32,27,58,.88), rgba(16,17,34,.92));
      border: 1px solid rgba(163,142,255,.32);
      border-radius: 20px;
      box-shadow: 0 20px 70px rgba(108,77,255,.25);
      padding: 22px;
    }
    h1 { margin: 0 0 8px; font-size: 1.45rem; }
    .sub { color: #b9b4d8; margin: 0 0 16px; }
    .grid { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
    input {
      width: 100%; border: 1px solid #433c6f; border-radius: 10px;
      background: #13172a; color: #f3f6ff; padding: 10px 12px;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 14px 0 10px; }
    button {
      border: 0; border-radius: 11px; padding: 10px 14px;
      background: linear-gradient(135deg, #7a5cff, #57c5ff);
      color: #090911; font-weight: 700; cursor: pointer;
    }
    button.alt { background: linear-gradient(135deg, #2a2f4b, #374572); color: #eaf0ff; }
    pre {
      margin: 10px 0 0; padding: 12px;
      border: 1px solid #393060; border-radius: 12px;
      background: #0e1120; overflow: auto; max-height: 380px;
      white-space: pre-wrap; word-break: break-word;
    }
    .pill {
      display: inline-flex; gap: 6px; align-items: center;
      font-size: .85rem; margin-bottom: 10px;
      padding: 4px 10px; border-radius: 999px;
      border: 1px solid #48406d; color: #b8c4ff;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="pill">⚡ x402 • DevEx Playground</div>
    <h1>402 → pay → retry flow tester</h1>
    <p class="sub">Use this to test unpaid, paid, and idempotent replay behavior instantly.</p>

    <div class="grid">
      <label>Task<input id="task" value="summarize this repo" /></label>
      <label>Idempotency Key<input id="key" value="demo-key-001" /></label>
    </div>

    <div class="actions">
      <button id="unpaid">Send unpaid request</button>
      <button id="paid">Send paid request</button>
      <button id="replay">Retry same paid request</button>
      <button id="newKey" class="alt">New idempotency key</button>
      <button id="clear" class="alt">Clear output</button>
    </div>

    <pre id="out">Ready.</pre>
  </main>

  <script>
    const out = document.getElementById('out');
    const task = document.getElementById('task');
    const key = document.getElementById('key');

    function stamp() { return new Date().toLocaleTimeString(); }
    function print(v) { out.textContent = '[' + stamp() + ']\n' + v + '\n\n' + out.textContent; }

    async function hit(paid) {
      const headers = {
        'content-type': 'application/json',
        'Idempotency-Key': key.value.trim() || 'demo-key-001'
      };
      if (paid) headers['X-Payment'] = 'v1:0.01:proof123';

      const res = await fetch('/agent/task', {
        method: 'POST',
        headers,
        body: JSON.stringify({ task: task.value, payment: { token: 'USDC' } })
      });

      const body = await res.json().catch(() => ({}));
      const replayed = res.headers.get('Idempotency-Replayed');
      print(JSON.stringify({ status: res.status, replayed, body }, null, 2));
    }

    document.getElementById('unpaid').onclick = () => hit(false).catch(e => print(String(e)));
    document.getElementById('paid').onclick = () => hit(true).catch(e => print(String(e)));
    document.getElementById('replay').onclick = () => hit(true).catch(e => print(String(e)));
    document.getElementById('newKey').onclick = () => { key.value = 'demo-key-' + Math.floor(Math.random()*1e6); };
    document.getElementById('clear').onclick = () => { out.textContent = 'Cleared.'; };
  </script>
</body>
</html>`;
