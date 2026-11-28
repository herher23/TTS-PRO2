// Nara Mini v1 (Burmese text-to-speech) running INSIDE the visitor's browser: free for everyone, no server, no API key.
// Model:  YeeNyunn / Nara Audio  "nara-mini-v1"  (Apache-2.0)      Browser port:  SagaPyaw  (Apache-2.0)
//
// v2 changes
//  * Voice files (~181 MB) are downloaded FIRST and no longer need the engine, so "Voice ဒေါင်းလုဒ်" works even
//    when the engine files are missing from the site.
//  * The engine (sagapyaw.mjs + onnxruntime-web) is looked up in this order:
//      1. your own site:  nara/sagapyaw.mjs + nara/vendor/*     (fastest, recommended)
//      2. jsDelivr CDN mirror of the public SagaPyaw GitHub repo   (automatic fallback, nothing to upload)
//      3. jsDelivr npm onnxruntime-web (only if the repo's vendor/ files cannot be reached)
//    A custom location can be set in the console:  localStorage.setItem('neoyangon_nara_engine', 'https://your-host/nara/')
//  * Download retries 3 times, shows one overall progress (MB + %), and removes half-written files.
(function () {
  'use strict';
  const VOICES = [['shoon', 'Shoon'], ['thazin', 'Thazin'], ['ko-banyar', 'Ko Banyar'], ['htet-myat', 'Htet Myat']];
  const FILES = ['encoder.onnx', 'decoder.onnx', 'voice.json'];
  const VOICE_MB = 181;                                   // size of one voice (encoder + decoder + voice.json)
  // The model files are downloaded straight from Hugging Face by each visitor (nothing is stored on your host).
  // To use your own mirror instead, run in the console:  localStorage.setItem('neoyangon_nara_base', 'https://your-host/models/')
  const DEFAULT_BASE = 'https://huggingface.co/YeeNyunn/nara-mini-v1/resolve/main/onnx/';
  const CACHE_NAME = 'nara-mini-v1-files', SR = 24000;
  const GH = 'min8244m-cloud/SagaPyaw', ORT_NPM = 'onnxruntime-web@1.22.0';
  const SAMPLE = 'မင်္ဂလာပါ။ ဒီအသံလေးကို နားထောင်ကြည့်ပါ။';

  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const slash = b => (b.endsWith('/') ? b : b + '/');
  const base = () => slash(lsGet('neoyangon_nara_base') || DEFAULT_BASE);
  const urlOf = (id, f) => base() + id + '/' + f;
  const nameOf = id => (VOICES.find(v => v[0] === id) || [id, id])[1];
  const mb = n => (n / 1048576).toFixed(0);
  const msg = e => String((e && e.message) || e);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const openCache = () => (typeof caches !== 'undefined' ? caches.open(CACHE_NAME) : Promise.resolve(null));
  const noop = () => {};

  // ======================= 1. download (does NOT need the engine) =======================
  // Downloads one file into the Cache API (so it is only ever downloaded once).
  // tick(bytes) is called with the bytes received so far for this file.  Returns the bytes only when needData is true.
  async function loadOnce(url, tick, needData) {
    const cache = await openCache();
    if (cache) {
      const hit = await cache.match(url);
      if (hit) { if (!needData) return null; return new Uint8Array(await hit.arrayBuffer()); }
    }
    const open = async () => { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r; };
    if (cache) {
      try { // stream straight into the cache so a 100 MB file is not held in memory twice
        const r = await open(); let got = 0, last = 0;
        const counter = new TransformStream({ transform(chunk, ctl) { got += chunk.byteLength; const t = Date.now(); if (t - last > 250) { last = t; tick(got); } ctl.enqueue(chunk); } });
        await cache.put(url, new Response(r.body.pipeThrough(counter), { headers: { 'Content-Type': 'application/octet-stream' } }));
        tick(got);
        if (!needData) return null;
        const hit = await cache.match(url); if (hit) return new Uint8Array(await hit.arrayBuffer());
      } catch (e) { try { await cache.delete(url); } catch (x) { /* nothing half-written is kept */ } }
    }
    // fallback (some Safari versions cannot stream into the cache): read everything, then store
    const r = await open(), reader = r.body.getReader(), parts = []; let got = 0, last = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.byteLength; const t = Date.now(); if (t - last > 250) { last = t; tick(got); } }
    const out = new Uint8Array(got); let o = 0; parts.forEach(p => { out.set(p, o); o += p.byteLength; });
    if (cache) { try { await cache.put(url, new Response(out.slice(), { headers: { 'Content-Type': 'application/octet-stream' } })); } catch (e) { /* storage full: still usable this session */ } }
    tick(got);
    return needData ? out : null;
  }
  async function load(url, tick, needData) {
    let last;
    for (let a = 1; a <= 3; a++) {
      try { return await loadOnce(url, tick, needData); } catch (e) { last = e; if (a < 3) await wait(1200 * a); }
    }
    throw last;
  }

  const downloading = new Map(); // id -> promise, so two taps never download the same voice twice
  // say(message, percent)
  function download(id, say) {
    say = say || noop;
    if (downloading.has(id)) return downloading.get(id);
    const job = (async () => {
      let doneBytes = 0;
      try {
        for (let i = 0; i < FILES.length; i++) {
          const f = FILES[i], before = doneBytes; let cur = 0;
          await load(urlOf(id, f), got => {
            cur = got; const total = before + cur, pct = Math.min(99, Math.round(total / (VOICE_MB * 1048576) * 100));
            say(nameOf(id) + ' ဒေါင်းနေသည် · ' + mb(total) + ' / ~' + VOICE_MB + ' MB (' + pct + '%)', pct);
          }, false);
          doneBytes += cur;
        }
        say(nameOf(id) + ' ဒေါင်းပြီး ✓', 100);
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(noop);
        return true;
      } catch (e) {
        throw new Error('Model ဖိုင် ဒေါင်းမရပါ: ' + msg(e) + ' — အင်တာနက်စစ်ပါ (Wi-Fi သုံးပါ) ပြီး ပြန်ကြိုးစားပါ');
      }
    })().finally(() => downloading.delete(id));
    downloading.set(id, job);
    return job;
  }

  async function isCached(id) {
    try { const c = await openCache(); if (!c) return false; for (const f of FILES) if (!(await c.match(urlOf(id, f)))) return false; return true; }
    catch (e) { return false; }
  }

  // ======================= 2. the engine (onnxruntime-web + Burmese text frontend) =======================
  function sources() {
    const list = [], mk = (name, saga, ort, wasm) => ({ name, saga, ort, wasm });
    const custom = lsGet('neoyangon_nara_engine');
    if (custom) { const r = slash(custom); list.push(mk('custom', r + 'sagapyaw.mjs', r + 'vendor/ort.wasm.bundle.min.mjs', r + 'vendor/')); }
    const local = new URL('nara/', document.baseURI);
    list.push(mk('website nara/', new URL('sagapyaw.mjs', local).href, new URL('vendor/ort.wasm.bundle.min.mjs', local).href, new URL('vendor/', local).href));
    ['cdn', 'fastly', 'gcore'].forEach(h => {
      const r = 'https://' + h + '.jsdelivr.net/gh/' + GH + '@main/';
      list.push(mk('CDN ' + h, r + 'dist/sagapyaw.mjs', r + 'web/vendor/ort.wasm.bundle.min.mjs', r + 'web/vendor/'));
    });
    const npm = 'https://cdn.jsdelivr.net/npm/' + ORT_NPM + '/dist/';
    list.push(mk('CDN npm ort', 'https://cdn.jsdelivr.net/gh/' + GH + '@main/dist/sagapyaw.mjs', npm + 'ort.wasm.bundle.min.mjs', npm));
    return list;
  }
  const imp = (url, ms) => Promise.race([import(url), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms || 25000))]);

  let eng = null, engJob = null;
  function engine(say) {
    if (eng) return Promise.resolve(eng);
    if (engJob) return engJob;
    engJob = (async () => {
      const errs = [];
      for (const s of sources()) {
        try {
          (say || noop)('Nara engine ရှာနေသည်... (' + s.name + ')');
          const [ort, saga] = await Promise.all([imp(s.ort), imp(s.saga)]);
          if (!ort || !ort.env || !saga || !saga.SagaSynthesizer) throw new Error('engine ဖိုင်ပုံစံ မမှန်ပါ');
          ort.env.wasm.wasmPaths = s.wasm;
          ort.env.wasm.numThreads = self.crossOriginIsolated ? 4 : 1; // multi-thread only when the page is cross-origin isolated
          ort.env.wasm.proxy = true;                                  // run in a worker so the page does not freeze
          eng = { ort, saga, src: s.name };
          return eng;
        } catch (e) { errs.push(s.name + ' → ' + msg(e)); }
      }
      throw new Error('Nara engine ဖိုင် မရပါ။ (၁) အင်တာနက် စစ်ပါ၊ သို့မဟုတ် (၂) nara/sagapyaw.mjs နဲ့ nara/vendor/ ကို website ထဲ ထည့်ပါ။\n' + errs.join('\n'));
    })().finally(() => { engJob = null; });
    return engJob;
  }

  let cur = null, chain = Promise.resolve();
  async function useVoice(id, say) {
    say = say || noop;
    if (cur && cur.id === id) return cur.synth;
    // 1) the voice files first (downloads them when they are not on the phone yet)
    let encoder, decoder, metadata;
    try {
      say('Nara ' + nameOf(id) + ' ဖိုင်စစ်နေသည်...');
      if (!(await isCached(id))) await download(id, say);
      encoder = await load(urlOf(id, FILES[0]), noop, true);
      decoder = await load(urlOf(id, FILES[1]), noop, true);
      metadata = JSON.parse(new TextDecoder().decode(await load(urlOf(id, FILES[2]), noop, true)));
    } catch (e) { throw new Error(msg(e)); }
    // 2) then the engine
    const { ort, saga } = await engine(say);
    if (cur) { try { cur.synth.dispose(); } catch (e) { /* already released */ } cur = null; } // never two voices in memory
    say('Nara ' + nameOf(id) + ' ပြင်ဆင်နေသည်... (ခဏစောင့်ပါ)');
    let synth;
    try { synth = await saga.SagaSynthesizer.create(ort, { encoder, decoder, metadata }); }
    catch (e) {
      if (!ort.env.wasm.proxy) throw new Error('Model load မရပါ: ' + msg(e));
      ort.env.wasm.proxy = false; // some browsers refuse the worker for a CDN script: retry on the main thread
      try { synth = await saga.SagaSynthesizer.create(ort, { encoder, decoder, metadata }); }
      catch (e2) { throw new Error('Model load မရပါ: ' + msg(e2)); }
    }
    cur = { id, synth };
    return synth;
  }

  // asks before a big download, then makes sure the voice is ready (downloaded + loaded)
  async function prepare(id, say) {
    if (!(await isCached(id)) && typeof confirm === 'function' &&
      !confirm('Nara ' + nameOf(id) + ' voice ဖိုင် ~' + VOICE_MB + ' MB ကို တစ်ခါ ဒေါင်းရပါမယ် (ဖုန်းထဲ သိမ်းထားပြီး နောက်ပိုင်း ပြန်မဒေါင်းရ)။\nMobile data သက်သာအောင် Wi-Fi သုံးပါ။ ဆက်လုပ်မလား?')) throw new Error('ဒေါင်းလုဒ် မလုပ်ပါ');
    await useVoice(id, say);
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

  // short sample so the user can listen before choosing a voice (needs the voice downloaded)
  async function preview(id, say) {
    await useVoice(id, say);
    say && say('နမူနာ အသံထုတ်နေသည်...');
    return synth(SAMPLE);
  }

  async function remove(id) {
    if (cur && cur.id === id) { try { cur.synth.dispose(); } catch (e) { /* already released */ } cur = null; }
    const c = await openCache(); if (!c) return;
    for (const f of FILES) await c.delete(urlOf(id, f));
  }

  // diagnostic: tells which engine source works (used by the "Engine စစ်မည်" button)
  async function checkEngine(say) { const e = await engine(say); return e.src; }

  window.NaraTTS = { voices: VOICES, sizeMB: VOICE_MB, nameOf, isCached, download, prepare, synth, preview, remove, checkEngine };
})();
