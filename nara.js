// Nara Mini v1 (Burmese text-to-speech) running INSIDE the visitor's browser: free for everyone, no server, no API key.
// Needs the SagaPyaw browser engine files on the site:   nara/sagapyaw.mjs   and   nara/vendor/*   (see README-NARA.txt)
// Model:  YeeNyunn / Nara Audio  "nara-mini-v1"  (Apache-2.0)      Browser port:  SagaPyaw  (Apache-2.0)
(function () {
  'use strict';
  const VOICES = [['shoon', 'Shoon'], ['thazin', 'Thazin'], ['ko-banyar', 'Ko Banyar'], ['htet-myat', 'Htet Myat']];
  const FILES = ['encoder.onnx', 'decoder.onnx', 'voice.json'];
  // The model files are downloaded straight from Hugging Face by each visitor (nothing is stored on your host).
  // To use your own mirror instead, run in the console:  localStorage.setItem('neoyangon_nara_base', 'https://your-host/models/')
  const DEFAULT_BASE = 'https://huggingface.co/YeeNyunn/nara-mini-v1/resolve/main/onnx/';
  const ENGINE_DIR = 'nara/', CACHE_NAME = 'nara-mini-v1-files', SR = 24000;

  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const base = () => { const b = lsGet('neoyangon_nara_base') || DEFAULT_BASE; return b.endsWith('/') ? b : b + '/'; };
  const urlOf = (id, f) => base() + id + '/' + f;
  const nameOf = id => (VOICES.find(v => v[0] === id) || [id, id])[1];
  const mb = n => (n / 1048576).toFixed(0);
  const openCache = () => (typeof caches !== 'undefined' ? caches.open(CACHE_NAME) : Promise.resolve(null));

  // ---- download one file (with progress) and keep it on the device (Cache API) so it is only ever downloaded once ----
  async function load(url, label, say) {
    const cache = await openCache();
    if (cache) { const hit = await cache.match(url); if (hit) return new Uint8Array(await hit.arrayBuffer()); }
    const show = (got, total) => say(label + ' ဒေါင်းနေသည် ' + mb(got) + (total ? ' / ' + mb(total) : '') + ' MB' + (total ? ' (' + Math.round(got / total * 100) + '%)' : ''));
    const open = async () => { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r; };
    if (cache) {
      try { // stream straight into the cache so a 100 MB file is not held in memory twice
        const r = await open(), total = +r.headers.get('content-length') || 0; let got = 0, last = 0;
        const counter = new TransformStream({ transform(chunk, ctl) { got += chunk.byteLength; const t = Date.now(); if (t - last > 250) { last = t; show(got, total); } ctl.enqueue(chunk); } });
        await cache.put(url, new Response(r.body.pipeThrough(counter), { headers: { 'Content-Type': 'application/octet-stream' } }));
        const hit = await cache.match(url); if (hit) return new Uint8Array(await hit.arrayBuffer());
      } catch (e) { /* streaming into the cache is not supported everywhere (some Safari versions) — fall back below */ }
    }
    const r = await open(), total = +r.headers.get('content-length') || 0, reader = r.body.getReader(), parts = []; let got = 0, last = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.byteLength; const t = Date.now(); if (t - last > 250) { last = t; show(got, total); } }
    const out = new Uint8Array(got); let o = 0; parts.forEach(p => { out.set(p, o); o += p.byteLength; });
    if (cache) { try { await cache.put(url, new Response(out.slice(), { headers: { 'Content-Type': 'application/octet-stream' } })); } catch (e) { /* storage full: still usable this session */ } }
    return out;
  }

  // ---- the SagaPyaw engine (onnxruntime-web + Burmese text frontend), loaded only when Nara is actually used ----
  let eng = null;
  async function engine() {
    if (eng) return eng;
    const root = new URL(ENGINE_DIR, document.baseURI);
    let ort, saga;
    try {
      ort = await import(new URL('vendor/ort.wasm.bundle.min.mjs', root).href);
      saga = await import(new URL('sagapyaw.mjs', root).href);
    } catch (e) { throw new Error('Nara engine ဖိုင်တွေ မတွေ့ပါ — nara/sagapyaw.mjs နဲ့ nara/vendor/ ကို website ထဲ ထည့်ပါ (' + ((e && e.message) || e) + ')'); }
    ort.env.wasm.wasmPaths = new URL('vendor/', root).href;
    ort.env.wasm.numThreads = self.crossOriginIsolated ? 4 : 1; // multi-thread only when the page is cross-origin isolated
    ort.env.wasm.proxy = true; // run in a worker so the page does not freeze
    eng = { ort, saga }; return eng;
  }

  let cur = null, chain = Promise.resolve();
  async function useVoice(id, say) {
    if (cur && cur.id === id) return cur.synth;
    const { ort, saga } = await engine();
    if (cur) { try { cur.synth.dispose(); } catch (e) { /* already released */ } cur = null; } // never two voices in memory
    say('Nara ' + nameOf(id) + ' ပြင်ဆင်နေသည်...');
    let encoder, decoder, metadata;
    try {
      encoder = await load(urlOf(id, FILES[0]), 'Encoder', say);
      decoder = await load(urlOf(id, FILES[1]), 'Decoder', say);
      metadata = JSON.parse(new TextDecoder().decode(await load(urlOf(id, FILES[2]), 'voice.json', say)));
    } catch (e) { throw new Error('Model ဖိုင် ဒေါင်းမရပါ: ' + ((e && e.message) || e) + ' — အင်တာနက်စစ်ပါ (သို့) နောက်မှ ပြန်ကြိုးစားပါ'); }
    say('Model load လုပ်နေသည်... (ခဏစောင့်ပါ)');
    const synth = await saga.SagaSynthesizer.create(ort, { encoder, decoder, metadata });
    cur = { id, synth };
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    return synth;
  }

  async function isCached(id) {
    try { const c = await openCache(); if (!c) return false; for (const f of FILES) if (!(await c.match(urlOf(id, f)))) return false; return true; }
    catch (e) { return false; }
  }

  // asks before a big download, then makes sure the voice is ready
  async function prepare(id, say) {
    if (!(await isCached(id)) && typeof confirm === 'function' &&
      !confirm('Nara ' + nameOf(id) + ' voice ဖိုင် ~181 MB ကို တစ်ခါ ဒေါင်းရပါမယ် (ဖုန်းထဲ သိမ်းထားပြီး နောက်ပိုင်း ပြန်မဒေါင်းရပါ)။\nMobile data သက်သာအောင် Wi-Fi သုံးပါ။ ဆက်လုပ်မလား?')) throw new Error('ဒေါင်းလုဒ် မလုပ်ပါ');
    await useVoice(id, say || (() => {}));
    return true;
  }

  // model output is quiet: bring every clip to the same loudness (without clipping) and return 16-bit PCM like the other voices do
  function toPcm(f) {
    let peak = 0, sum = 0, n = 0;
    for (let i = 0; i < f.length; i++) { const a = Math.abs(f[i]); if (a > peak) peak = a; if (a > 0.01) { sum += a * a; n++; } }
    const rms = n ? Math.sqrt(sum / n) : 0; let g = rms ? 0.17 / rms : 1;
    if (peak * g > 0.97) g = 0.97 / peak; g = Math.min(g, 8);
    const out = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) { const v = Math.max(-1, Math.min(1, f[i] * g)); out[i] = v < 0 ? v * 32768 : v * 32767; }
    return { pcmBuffer: out.buffer, sampleRate: SR };
  }

  // one clip at a time (the engine is CPU-bound, running several in parallel would only be slower)
  function synth(text) {
    const job = chain.then(async () => {
      if (!cur) throw new Error('Nara voice မပြင်ဆင်ရသေးပါ');
      const f = await cur.synth.synthesize(String(text));
      if (!f || !f.length) throw new Error('အသံ မထွက်ပါ');
      return toPcm(f);
    });
    chain = job.catch(() => {});
    return job;
  }

  async function remove(id) {
    if (cur && cur.id === id) { try { cur.synth.dispose(); } catch (e) { /* already released */ } cur = null; }
    const c = await openCache(); if (!c) return;
    for (const f of FILES) await c.delete(urlOf(id, f));
  }

  window.NaraTTS = { voices: VOICES, nameOf, isCached, prepare, synth, remove };
})();
