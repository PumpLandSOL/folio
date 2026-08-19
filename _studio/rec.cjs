// FOLIO studio — shared headless-Chrome recorder / rasterizer (CDP over global WebSocket).
// Zero deps: Node 20+, headless Chrome, ffmpeg on PATH.
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs'), path = require('path');
const pexec = promisify(execFile);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let PORT = 9460;

async function launch(url, W, H, profile) {
  const port = PORT++;
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${W},${H}`, `--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', url], { stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) break; } catch {} await sleep(200); }
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method) listeners.forEach((fn) => fn(m)); });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const mid = ++id; pending.set(mid, { resolve, reject }); ws.send(JSON.stringify({ id: mid, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const ev = (expr, awaitPromise = false) => send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
  return { chrome, ws, send, on: (fn) => listeners.push(fn), ev, close: () => { try { ws.close(); } catch {} chrome.kill(); } };
}

// Rasterize an HTML file to PNG at exact size.
async function shot(htmlPath, out, W, H) {
  const c = await launch('file:///' + htmlPath.replace(/\\/g, '/'), W, H, path.join(__dirname, 'profile-shot'));
  try {
    await sleep(600);
    await c.ev("document.fonts && document.fonts.ready.then(()=>1)", true).catch(() => {});
    await sleep(500);
    const r = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    fs.writeFileSync(out, Buffer.from(r.data, 'base64'));
    console.log('✓', path.basename(out));
  } finally { c.close(); }
}

// Record a scripted session to MP4. run(ctx) drives the page; ctx = {ev, sleep, send}.
async function record({ url, out, W = 1280, H = 720, run, warm = 1500, profile }) {
  const FR = path.join(__dirname, 'frames-' + path.basename(out, '.mp4'));
  fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const c = await launch(url, W, H, profile || path.join(__dirname, 'profile-' + path.basename(out, '.mp4')));
  const frames = [];
  try {
    await sleep(warm);
    await c.ev("document.fonts && document.fonts.ready.then(()=>1)", true).catch(() => {});
    c.on((m) => { if (m.method === 'Page.screencastFrame') { frames.push({ buf: Buffer.from(m.params.data, 'base64'), t: Date.now() }); c.send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {}); } });
    await c.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    await run({ ev: c.ev, sleep, send: c.send });
    await c.send('Page.stopScreencast'); await sleep(300);
  } finally { c.close(); }
  if (frames.length < 5) throw new Error('too few frames: ' + frames.length);
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const name = `f_${String(i).padStart(5, '0')}.jpg`; fs.writeFileSync(path.join(FR, name), frames[i].buf);
    const dur = i < frames.length - 1 ? Math.max(0.016, (frames[i + 1].t - frames[i].t) / 1000) : 0.5;
    list.push(`file '${name}'`, `duration ${dur.toFixed(3)}`);
  }
  list.push(`file 'f_${String(frames.length - 1).padStart(5, '0')}.jpg'`);
  fs.writeFileSync(path.join(FR, 'list.txt'), list.join('\n'));
  console.log(`captured ${frames.length} frames over ${((frames[frames.length - 1].t - frames[0].t) / 1000).toFixed(1)}s — encoding…`);
  await pexec('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', path.join(FR, 'list.txt'), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '19', '-preset', 'slow', '-movflags', '+faststart', out], { maxBuffer: 1 << 27 });
  fs.rmSync(FR, { recursive: true, force: true });
  console.log('✓', out);
}
module.exports = { shot, record, sleep };
