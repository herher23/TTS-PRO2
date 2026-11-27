// Edge TTS proxy for Cloudflare Workers (free plan is enough).
// POST  { "text": "...", "voice": "my-MM-ThihaNeural", "rate": "+0%", "pitch": "+0Hz" }  ->  audio/mpeg
// Burmese voices: my-MM-ThihaNeural (male), my-MM-NilarNeural (female)
//
// Unofficial: this talks to the same endpoint Microsoft Edge's "Read Aloud" uses, so Microsoft can
// change it at any time. If every request starts failing with 403, update CHROMIUM_VERSION below.

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_VERSION = '143.0.3650.75';
const ENDPOINT = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const WIN_EPOCH = 11644473600;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

async function secMsGec() {
  let ticks = Math.floor(Date.now() / 1000) + WIN_EPOCH;
  ticks -= ticks % 300;                                   // round down to 5 minutes
  const str = (BigInt(ticks) * 10000000n).toString() + TRUSTED_CLIENT_TOKEN;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const esc = t => t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

async function synth(text, voice, rate, pitch) {
  const url = `${ENDPOINT}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${hex(16)}` +
    `&Sec-MS-GEC=${await secMsGec()}&Sec-MS-GEC-Version=1-${CHROMIUM_VERSION}`;
  const resp = await fetch(url, {
    headers: {
      Upgrade: 'websocket',
      Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION.split('.')[0]}.0.0.0 Safari/537.36 Edg/${CHROMIUM_VERSION.split('.')[0]}.0.0.0`,
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
      Cookie: `muid=${hex(16).toUpperCase()};`
    }
  });
  const ws = resp.webSocket;
  if (!ws) throw new Error('WebSocket connect failed: HTTP ' + resp.status);
  ws.accept();

  const stamp = new Date().toString().replace(/ GMT.*$/, '') + ' GMT+0000 (Coordinated Universal Time)';
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${esc(text)}</prosody></voice></speak>`;

  return new Promise((resolve, reject) => {
    const parts = [];
    const timer = setTimeout(() => { try { ws.close(); } catch (e) {} reject(new Error('timeout')); }, 25000);
    const done = (err) => {
      clearTimeout(timer); try { ws.close(); } catch (e) {}
      if (err) return reject(err);
      const total = parts.reduce((n, p) => n + p.length, 0);
      if (!total) return reject(new Error('no audio returned'));
      const out = new Uint8Array(total); let o = 0;
      parts.forEach(p => { out.set(p, o); o += p.length; });
      resolve(out);
    };
    ws.addEventListener('message', ev => {
      const d = ev.data;
      if (typeof d === 'string') { if (d.includes('Path:turn.end')) done(); return; }
      const u8 = new Uint8Array(d);
      if (u8.length < 2) return;
      const headLen = (u8[0] << 8) | u8[1];
      const head = new TextDecoder().decode(u8.subarray(2, 2 + headLen));
      if (head.includes('Path:audio')) parts.push(u8.subarray(2 + headLen));
    });
    ws.addEventListener('error', () => done(new Error('websocket error')));
    ws.addEventListener('close', () => done());
    ws.send(`X-Timestamp:${stamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
      `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`);
    ws.send(`X-RequestId:${hex(16)}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${stamp}Z\r\nPath:ssml\r\n\r\n${ssml}`);
  });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return new Response('Edge TTS worker OK — POST {text, voice}', { headers: CORS });
    try {
      const { text, voice = 'my-MM-ThihaNeural', rate = '+0%', pitch = '+0Hz' } = await request.json();
      if (!text || !String(text).trim()) return new Response('empty text', { status: 400, headers: CORS });
      if (!/^[A-Za-z]{2,3}-[A-Za-z]{2,4}-[A-Za-z]+Neural$/.test(voice)) return new Response('bad voice', { status: 400, headers: CORS });
      if (!/^[+-]\d{1,3}%$/.test(rate) || !/^[+-]\d{1,3}Hz$/.test(pitch)) return new Response('bad rate/pitch', { status: 400, headers: CORS });
      const audio = await synth(String(text).slice(0, 2000), voice, rate, pitch);
      return new Response(audio, { headers: { ...CORS, 'Content-Type': 'audio/mpeg' } });
    } catch (e) {
      return new Response('Edge TTS error: ' + e.message, { status: 502, headers: CORS });
    }
  }
};
