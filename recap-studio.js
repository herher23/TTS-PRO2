// Movie Recap Studio v2 — steps like the app. Every setting is LINKED to the matching tab:
// Transcribe = Media→SRT tab, Translate = SRT Translator tab (same prompt/engine), Voice Over = Text→Speech tab (Gemini + Edge Thiha/Nilar).
(function () {
  const root = document.getElementById('recapView');
  if (!root || typeof synthesizeChunk !== 'function') return;
  const old = root.querySelector('main'); if (old) old.style.display = 'none';
  const el = document.createElement('main'); el.className = 'rs'; root.appendChild(el);
  const $ = s => el.querySelector(s), $$ = s => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const opt = (v, t) => `<option value="${v}">${t}</option>`;
  const fmtT = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const STEPS = ['Video Import', 'Transcription', 'Translation', 'Voice Over', 'Render'];
  const ST = { file: null, url: '', dur: 0, w: 0, h: 0, subs: [], mixed: null, cues: [], plan: [], done: {} };
  const S = { ratio: '16:9', size: '720', mx: 0, my: 0, zoom: 100, fill: 'blur', mirror: 'off', grain: 0, hue: 0, look: 'none', sub: '1', subSize: 100, subY: 92,
              orig: 0, musicVol: 0.15, autoSrt: '1', items: [], sel: -1, color: '#ffffff' };
  const tiles = (k, vals) => `<div class="rs-tiles" data-k="${k}">${vals.map(([v, t]) => `<div class="rs-tile" data-v="${v}" tabindex="0">${t}</div>`).join('')}</div>`;
  const rng = (k, label, min, max, step, val, u) => `<label>${label} <b data-o="${k}"></b><input type="range" data-k="${k}" data-u="${u || ''}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  const sel = (k, label, vals) => `<label>${label}<select class="rs-in" data-k="${k}">${vals.map(([v, t]) => opt(v, t)).join('')}</select></label>`;

  el.innerHTML = `
  <div id="rsList">
    <video id="rsInV" controls playsinline hidden></video>
    <div class="rs-steps2">${STEPS.map((n, i) => `<div class="rs-step" data-s="${i + 1}" tabindex="0"><span class="rs-ck">${i + 1}</span><div class="rs-st"><b>${n}</b><small></small></div><span class="rs-badge">Pending</span></div>`).join('')}</div>
  </div>
  <div id="rsPage" hidden>
    <div class="rs-ph"><div id="rsBack" class="rs-back" tabindex="0"><i class="fa-solid fa-arrow-left"></i></div><b id="rsPT"></b></div>
    <section class="rs-card holo-glass" data-p="1"><input id="rsFile" class="rs-in" type="file" accept="video/*,audio/*"><div id="rsChips" class="rs-chips"><span>ဗီဒီယို ရွေးပါ (MP4 / MOV / MKV)</span></div></section>
    <section class="rs-card holo-glass" data-p="2"><div class="rs-grid" id="rsTrSet"></div>
      <label>Cue အရှည်<select id="rsTrLen" class="rs-in">${opt('14', 'တို (14)')}${opt('24', 'အလယ် (24)')}${opt('36', 'ရှည် (36)')}${opt('50', 'အရှည်ဆုံး (50)')}</select></label>
      <button id="rsTr" class="rs-btn">စာထုတ်မည်</button><div id="rsSegs2" class="rs-segs"></div></section>
    <section class="rs-card holo-glass" data-p="3"><div class="rs-grid" id="rsTlSet"></div>
      <button id="rsTl" class="rs-btn">ဘာသာပြန်မည်</button><div id="rsSegs3" class="rs-segs"></div></section>
    <section class="rs-card holo-glass" data-p="4"><div class="rs-grid" id="rsVoSet"></div>
      ${sel('pause', 'စာကြောင်းကြား နားချိန်', [['0.18', 'ထည့်မည်'], ['0.02', 'မထည့်']])}
      <button id="rsVo" class="rs-btn">အသံထုတ်မည်</button><audio id="rsAudio" controls hidden></audio><div id="rsVoLinks" class="rs-links"></div></section>
    <section class="rs-card holo-glass" data-p="5">
      <div class="rs-prev"><canvas id="rsPrev" width="640" height="360"></canvas>
        <div class="rs-pc"><button id="rsPP" class="rs-ic" aria-label="Play"><i class="fa-solid fa-play"></i></button><input id="rsSeek" type="range" min="0" max="1000" value="0"><span id="rsT">0:00</span><button id="rsFS" class="rs-ic" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button></div></div>
      <div class="rs-panels">
        <div class="rs-panel" data-t="ratio"><h4 class="rs-h4">OUTPUT RATIO</h4>${tiles('ratio', [['16:9', '16:9'], ['9:16', '9:16'], ['1:1', '1:1'], ['orig', 'Original'], ['3:4', '3:4'], ['4:3', '4:3'], ['4:5', '4:5']])}</div>
        <div class="rs-panel" data-t="size" hidden><h4 class="rs-h4">SIZE</h4>${tiles('size', [['480', '480p'], ['720', '720p'], ['1080', '1080p']])}</div>
        <div class="rs-panel" data-t="move" hidden><h4 class="rs-h4">MOVE</h4>${rng('mx', 'Left / right', -50, 50, 1, 0, '%')}${rng('my', 'Up / down', -50, 50, 1, 0, '%')}<button class="rs-btn" data-reset="mx,my">Reset</button></div>
        <div class="rs-panel" data-t="zoom" hidden><h4 class="rs-h4">ZOOM</h4>${rng('zoom', 'Zoom', 100, 200, 1, 100, '%')}<button class="rs-btn" data-reset="zoom">Reset</button></div>
        <div class="rs-panel" data-t="fill" hidden><h4 class="rs-h4">FILL</h4>${tiles('fill', [['blur', 'Blur'], ['black', 'Black'], ['crop', 'Crop']])}</div>
        <div class="rs-panel" data-t="mirror" hidden><h4 class="rs-h4">MIRROR</h4>${tiles('mirror', [['off', 'Off'], ['full', 'Full'], ['random', 'Random']])}</div>
        <div class="rs-panel" data-t="look" hidden><h4 class="rs-h4">LOOK</h4>${rng('grain', 'Grain', 0, 100, 1, 0, '')}${rng('hue', 'Hue', 0, 360, 1, 0, '°')}${sel('look', 'Filter', [['none', 'None'], ['warm', 'Warm'], ['cool', 'Cool'], ['bw', 'Black & white'], ['vivid', 'Vivid']])}</div>
        <div class="rs-panel" data-t="overlay" hidden><h4 class="rs-h4">OVERLAY</h4>
          <div class="rs-row"><input id="rsTxt" class="rs-in" type="text" placeholder="Enter text..."><button id="rsAddTxt" class="rs-btn">+ Text</button></div>
          <div class="rs-dots">${['#ffffff', '#ffd34d', '#ff5b5b', '#59d46a', '#4da3ff', '#000000'].map(c => `<span class="rs-dot" data-c="${c}" style="background:${c}"></span>`).join('')}</div>
          <div class="rs-row"><label>Photo<input id="rsImg" class="rs-in" type="file" accept="image/*"></label><button id="rsAddBlur" class="rs-btn">+ Blur box</button></div>
          <div id="rsSelBox" hidden><b id="rsSelName"></b><div class="rs-row"><label>Size <input id="rsItSize" type="range" min="0.2" max="3" step="0.05" value="1"></label><label>Opacity <input id="rsItOp" type="range" min="0.1" max="1" step="0.05" value="1"></label></div><button id="rsItDel" class="rs-btn">Delete</button></div>
          <div class="rs-note">Preview ပေါ်မှာ စာ / ပုံ / Blur box ကို လက်နဲ့ ဆွဲရွှေ့ပါ။ Blur box က မူရင်းစာတန်းကို ဖုံးဖို့ပါ။</div></div>
        <div class="rs-panel" data-t="music" hidden><h4 class="rs-h4">MUSIC</h4><input id="rsMusic" class="rs-in" type="file" accept="audio/*">${rng('musicVol', 'Music volume', 0, 0.6, 0.05, 0.15, 'x')}</div>
        <div class="rs-panel" data-t="extras" hidden><h4 class="rs-h4">EXTRAS</h4>${sel('sub', 'Subtitles (မီးရှို့)', [['1', 'On'], ['0', 'Off']])}${rng('subSize', 'Subtitle size', 60, 160, 5, 100, '%')}${rng('subY', 'Subtitle position', 60, 96, 1, 92, '%')}${rng('orig', 'မူရင်းအသံ', 0, 1, 0.05, 0, 'x')}${sel('autoSrt', 'Auto-save SRT', [['1', 'On'], ['0', 'Off']])}</div>
      </div>
      <div class="rs-tabs">${[['ratio', 'RATIO'], ['size', 'SIZE'], ['move', 'MOVE'], ['zoom', 'ZOOM'], ['fill', 'FILL'], ['mirror', 'MIRROR'], ['look', 'LOOK'], ['overlay', 'OVERLAY'], ['music', 'MUSIC'], ['extras', 'EXTRAS']].map(([t, n]) => `<div class="rs-tab" data-t="${t}" tabindex="0">${n}</div>`).join('')}</div>
      <button id="rsRender" class="rs-btn">Start render</button><button id="rsStopR" class="rs-btn" hidden>Stop</button>
      <div class="rs-note">ဗီဒီယိုကို အသံအလိုက် အမြန်/အနှေး ညှိထုတ်မှာမို့ အရှည်က အသံအရှည်အတိုင်း ဖြစ်ပါမယ်။ Render ပြီးတဲ့အထိ ဒီစာမျက်နှာကို ဖွင့်ထားပါ။</div>
      <h4 class="rs-h4">Output</h4><div id="rsOut"><div class="rs-note">Render ပြီးရင် ရလဒ်ဗီဒီယို ဒီမှာ ပေါ်မယ်။</div></div></section>
  </div>
  <div class="rs-bar"><i id="rsBar"></i></div>
  <div id="rsLog" class="rs-log">ဗီဒီယိုထဲကလို အဆင့်တစ်ခုချင်း ဝင်လုပ်ပါ။ Setting တွေက Media→SRT / SRT ဘာသာပြန် / စာသား→အသံ tab တွေနဲ့ ချိတ်ထားပါတယ်။</div>`;

  const log = m => { const b = $('#rsLog'); b.textContent += '\n' + m; b.scrollTop = b.scrollHeight; };
  const bar = p => { $('#rsBar').style.width = Math.round(p * 100) + '%'; };
  const run = (id, fn) => $(id).addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true;
    try { await fn(); } catch (err) { log('✗ ' + ((err && err.message) || err)); } finally { b.disabled = false; }
  });
  const click = (node, fn) => { node.addEventListener('click', fn); node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } }); };

  // Download: fresh blob URL on every tap, link kept in the DOM, revoked late (revoking right away breaks
  // downloads on phones). Falls back to opening the file, and shows the real error in the log.
  const saveBlob = (blob, name) => {
    try {
      const u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = name; a.rel = 'noopener'; a.style.display = 'none'; document.body.appendChild(a); a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 60000);
      log('⬇ ' + name + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)');
    } catch (err) {
      log('✗ Download မရပါ: ' + ((err && err.message) || err));
      try { window.open(URL.createObjectURL(blob), '_blank'); } catch (e2) { /* nothing else to try */ }
    }
  };
  const dlBtn = (box, label, getBlob, name) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rs-dl'; b.textContent = label;
    b.addEventListener('click', () => { const blob = getBlob(); if (!blob || !blob.size) return log('✗ Download လုပ်စရာ ဖိုင် မရှိပါ'); saveBlob(blob, name); });
    box.appendChild(b);
  };

  // ---- settings LINKED to the other tabs (two-way) ----
  const mirrors = [];
  function mirror(id, label) {
    const o = document.getElementById(id); if (!o) return null;
    const w = document.createElement('label'); w.append(label);
    let c; if (o.tagName === 'SELECT') c = document.createElement('select'); else { c = document.createElement('input'); c.type = o.type; ['min', 'max', 'step', 'placeholder'].forEach(a => { if (o.getAttribute(a) !== null) c.setAttribute(a, o.getAttribute(a)); }); }
    c.className = o.type === 'range' ? '' : 'rs-in'; w.appendChild(c);
    const chk = o.type === 'checkbox';
    let shown = null; // live number next to a slider's label, e.g. "Speed 1.3x"
    if (o.type === 'range') { shown = document.createElement('b'); shown.className = 'rs-val'; w.firstChild.after(' ', shown); }
    const showVal = () => { if (shown) shown.textContent = (+c.value).toFixed(1) + 'x'; };
    const pull = () => { if (chk) { c.checked = o.checked; return; } if (o.tagName === 'SELECT' && c.innerHTML !== o.innerHTML) c.innerHTML = o.innerHTML; if (c.value !== o.value) c.value = o.value; showVal(); };
    const push = () => { if (chk) o.checked = c.checked; else o.value = c.value; showVal(); o.dispatchEvent(new Event('input', { bubbles: true })); o.dispatchEvent(new Event('change', { bubbles: true })); };
    c.addEventListener('input', push); c.addEventListener('change', push); o.addEventListener('input', pull); o.addEventListener('change', pull);
    pull(); mirrors.push(pull); return w;
  }
  const fillSet = (box, list) => list.forEach(([id, l]) => { const m = mirror(id, l); if (m) $(box).appendChild(m); });
  fillSet('#rsTrSet', [['transcribeLangSelect', 'Language'], ['transcribeProviderOrder', 'Provider'], ['transcribeChunkSize', 'Chunk Size'], ['transcribeWorkerCount', 'Workers'], ['transcribeTimeoutSec', 'Timeout (s)'], ['transcribeMaxRetries', 'Max Retries']]);
  fillSet('#rsTlSet', [['targetLang', 'Target language'], ['chunkSize', 'Chunk Size'], ['workerCount', 'Workers'], ['timeoutSec', 'Timeout (s)'], ['maxRetries', 'Max Retries'], ['proofreadPassChk', 'Proofread']]);
  fillSet('#rsVoSet', [['voiceSelect', 'Voice (Thiha / Nilar / Gemini)'], ['speedSlider', 'Speed'], ['ttsEdgeUrl', 'Edge Worker URL'], ['ttsWorkers', 'Workers'], ['ttsTimeout', 'Timeout (s)'], ['ttsRetries', 'Max Retries']]);
  const syncAll = () => mirrors.forEach(f => f());
  window.addEventListener('DOMContentLoaded', () => setTimeout(syncAll, 0));
  $('#rsTrLen').value = safeLsGet('neoyangon_recap_cue_len') || '36';
  $('#rsTrLen').addEventListener('change', e => safeLsSet('neoyangon_recap_cue_len', e.target.value));

  // ---- step list / pages ----
  function refreshList(extra) {
    const info = Object.assign({ 1: ST.file ? `${fmtT(ST.dur)} · ${ST.w}×${ST.h}` : 'ဗီဒီယို မရွေးရသေးပါ', 2: ST.subs.length ? ST.subs.length + ' segments' : '', 3: ST.subs.some(s => s.translatedText) ? targetLangSelect.value : '', 4: ST.mixed ? fmtT(ST.mixed.duration) : '', 5: '' }, extra);
    $$('.rs-step').forEach((d, i) => { const n = i + 1, ok = ST.done[n]; d.classList.toggle('ok', !!ok); d.querySelector('small').textContent = info[n] || ''; d.querySelector('.rs-badge').textContent = ok ? 'Completed' : 'Pending'; d.querySelector('.rs-ck').innerHTML = ok ? '<i class="fa-solid fa-check"></i>' : n; });
  }
  const mark = n => { ST.done[n] = true; refreshList(); };
  function go(n) {
    $('#rsList').hidden = true; $('#rsPage').hidden = false; $('#rsPT').textContent = `Step ${n} · ${STEPS[n - 1]}`;
    $$('#rsPage section').forEach(s => { s.hidden = +s.dataset.p !== n; }); syncAll(); if (n === 5) drawPrev();
  }
  $$('.rs-step').forEach(d => click(d, () => go(+d.dataset.s)));
  click($('#rsBack'), () => { pv.pause(); $('#rsPage').hidden = true; $('#rsList').hidden = false; refreshList(); });
  refreshList();

  function renderSegs() {
    ['#rsSegs2', '#rsSegs3'].forEach((id, k) => {
      const box = $(id); box.innerHTML = '';
      ST.subs.forEach((s, i) => {
        const d = document.createElement('div'); d.className = 'rs-seg'; const t = srtCueTimes(s);
        d.innerHTML = `<small>#${i + 1} · ${t ? formatSrtTimestamp(t.start) : ''}</small><div></div>`; d.lastChild.textContent = (s.textLines || []).join(' ');
        if (k === 1 && s.translatedText !== undefined) {
          const ta = document.createElement('textarea'); ta.className = 'rs-in'; ta.value = s.translatedText; ta.addEventListener('input', () => { s.translatedText = ta.value; }); d.appendChild(ta);
        }
        box.appendChild(d);
      });
    });
  }

  // ---- 1 Import ----
  $('#rsFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    Object.assign(ST, { file: f, subs: [], mixed: null, plan: [], cues: [], done: {} }); renderSegs();
    if (ST.url) URL.revokeObjectURL(ST.url); ST.url = URL.createObjectURL(f);
    const iv = $('#rsInV'); iv.src = ST.url; iv.hidden = false; pv.src = ST.url; pv.load();
    const v = document.createElement('video'); v.preload = 'metadata'; v.src = ST.url;
    v.onloadedmetadata = () => {
      Object.assign(ST, { dur: v.duration || 0, w: v.videoWidth, h: v.videoHeight });
      $('#rsChips').innerHTML = [fmtT(ST.dur), `${ST.w}×${ST.h}`, (f.size / 1048576).toFixed(1) + ' MB', 'Audio'].map(x => `<span>${x}</span>`).join('');
      mark(1); drawPrev();
    };
  });

  // ---- 2 Transcribe: uses the Media→SRT tab's own settings (they are linked above) ----
  run('#rsTr', async () => {
    if (!ST.file) return log('⚠ ဗီဒီယို အရင်ရွေးပါ (Step 1)');
    if (!getTranscribeCredentialPool().length) return log('⚠ Gladia / Groq / AssemblyAI key မရှိပါ — အပေါ်က API KEYS မှာ ထည့်ပါ');
    transcribeAborted = false;
    const num = (inp, d, min) => Math.max(parseInt(inp && inp.value, 10) || d, min);
    const maxRetries = num(transcribeMaxRetriesInput, 2, 1), timeoutSec = num(transcribeTimeoutSecInput, 120, 10), chunkSec = num(transcribeChunkSizeInput, 60, 15), workers = num(transcribeWorkerCountInput, 3, 1);
    log('Audio decode လုပ်နေသည်...');
    const buf = await decodeMediaToAudioBuffer(ST.file, m => log(m)); ST.dur = buf.duration;
    log('စာထုတ်နေသည်...');
    const n = +$('#rsTrLen').value, dur = { 14: [4.5, 6], 24: [6, 8], 36: [8, 10], 50: [10, 12] }[n] || [8, 10];
    const keep = { cjk: { ...PHRASE_OPTS.cjk }, latin: { ...PHRASE_OPTS.latin } }, keepFn = window.applyCueMaxChars;
    window.applyCueMaxChars = () => {
      Object.assign(PHRASE_OPTS.cjk, { maxChars: n, minChars: Math.min(6, Math.floor(n / 3)), maxDurSec: dur[0] });
      Object.assign(PHRASE_OPTS.latin, { maxChars: n * 3, minChars: Math.min(24, n), maxDurSec: dur[1] });
    };
    let res;
    try { res = await transcribeMediaWithWorkers(buf, chunkSec, workers, transcribeLangSelect.value, maxRetries, timeoutSec, m => log(m), true); }
    finally { window.applyCueMaxChars = keepFn; Object.assign(PHRASE_OPTS.cjk, keep.cjk); Object.assign(PHRASE_OPTS.latin, keep.latin); }
    ST.subs = res.srt ? parseSrt(res.srt) : []; if (!ST.subs.length) throw new Error('စာ မထွက်ပါ');
    const used = Object.entries(res.providerCounts || {}).map(([p, c]) => p.toUpperCase() + ':' + c).join(' ');
    renderSegs(); mark(2); log('✓ Segments ' + ST.subs.length + ' ခု' + (used ? ' · ' + used : ''));
  });

  // ---- 3 Translate: the SRT Translator tab's own engine + prompt + settings ----
  run('#rsTl', async () => {
    if (!ST.subs.length) return log('⚠ Transcription အရင်လုပ်ပါ (Step 2)');
    if (!getKeys().length) return log('⚠ Gemini key မရှိပါ — အပေါ်က API KEYS မှာ ထည့်ပါ');
    translationAborted = false;
    const g = (inp, d, min) => Math.max(parseInt(inp.value, 10) || d, min), lang = targetLangSelect.value, to = g(timeoutSecInput, 60, 5);
    log('ဘာသာပြန်နေသည်... (' + lang + ') — SRT ဘာသာပြန် tab ရဲ့ prompt အတိုင်း');
    ST.subs = await translateSrtWithWorkers(ST.subs, g(chunkSizeInput, 30, 1), lang, g(workerCountInput, 3, 1), g(maxRetriesInput, 3, 1), to);
    if (!translationAborted && isProofreadEnabled()) { log('Proofread လုပ်နေသည်...'); await proofreadTranslatedSubs(ST.subs, lang, to); }
    renderSegs(); mark(3); log('✓ ဘာသာပြန်ပြီး — စာကို ပြင်လို့ရပါတယ်');
  });

  // ---- 4 Voice Over: Text→Speech tab's voice (Edge Thiha/Nilar or Gemini) and settings ----
  run('#rsVo', async () => {
    const subs = ST.subs, total = subs.length;
    if (!total || subs.every(s => !(s.translatedText || '').trim())) return log('⚠ ဘာသာပြန်အရင်လုပ်ပါ (Step 3)');
    readTtsSettings(); const voice = voiceSelect.value, edge = String(voice).startsWith('edge:');
    if (edge) { if (!/^https?:\/\//.test(safeLsGet(LS_EDGE_URL) || '')) return log('⚠ Edge Worker URL ထည့်ပါ (အပေါ်ကနေရာမှာ)'); } else if (!getKeys().length) return log('⚠ Gemini key မရှိပါ');
    ttsAborted = false; const speed = +speedSlider.value || 1, pause = +$('[data-k="pause"]').value;
    log('Speed: ' + speed.toFixed(1) + 'x');
    const clips = new Array(total).fill(null); let next = 0, done = 0;
    async function worker() {
      for (;;) {
        const i = next++; if (i >= total || ttsAborted) return;
        const t = (subs[i].translatedText || '').trim();
        if (t) try {
          const { pcmBuffer, sampleRate } = await synthesizeChunk(t, voice);
          const i16 = new Int16Array(pcmBuffer, 0, pcmBuffer.byteLength >> 1), f = new Float32Array(i16.length);
          for (let k = 0; k < i16.length; k++) f[k] = i16[k] / 32768; clips[i] = { f, sr: sampleRate };
        } catch (e) { log(`#${i + 1} အသံ မထွက်: ${e.message}`); }
        done++; bar(done / total * 0.8);
      }
    }
    log('အသံထုတ်နေသည်... (' + voiceSelect.selectedOptions[0].text + ')');
    await Promise.all(Array.from({ length: TTS_WORKERS }, worker));
    if (ttsAborted) return log('ရပ်လိုက်သည်');
    let cursor = 0; const place = []; ST.cues = []; ST.plan = [];
    subs.forEach((sub, k) => {
      const c = clips[k]; if (!c) return;
      const t = srtCueTimes(sub), len = c.f.length / c.sr / speed, start = cursor, prev = ST.plan.length ? ST.plan[ST.plan.length - 1].vb : 0;
      const va = t ? t.start : prev, vb = t ? t.end : va + len;
      place.push({ c, start }); ST.cues.push({ a: start, b: start + len, text: sub.translatedText.trim() }); ST.plan.push({ o: start, len, va, vb }); cursor = start + len + pause;
    });
    const SR = 24000, secs = cursor + 1; if (secs > 3600) log('⚠ ၁ နာရီထက် ရှည်ရင် ဖုန်း memory မလောက်နိုင်ပါ');
    const oc = new OfflineAudioContext(1, Math.ceil(secs * SR), SR);
    place.forEach(({ c, start }) => { const b = oc.createBuffer(1, c.f.length, c.sr); b.copyToChannel(c.f, 0); const s = oc.createBufferSource(); s.buffer = b; s.playbackRate.value = speed; s.connect(oc.destination); s.start(start); });
    ST.mixed = await oc.startRendering(); bar(1);
    const ch = ST.mixed.getChannelData(0), out = new Int16Array(ch.length);
    for (let k = 0; k < ch.length; k++) { const v = clamp(ch[k], -1, 1); out[k] = v < 0 ? v * 32768 : v * 32767; }
    const wav = createWavBlob(out.buffer, SR), srtBlob = new Blob([rebuildSrt(subs, { preserveIndex: true })], { type: 'text/plain;charset=utf-8'});
    if (ST.voUrl) URL.revokeObjectURL(ST.voUrl); ST.voUrl = URL.createObjectURL(wav); const au = $('#rsAudio'); au.src = ST.voUrl; au.hidden = false;
    const links = $('#rsVoLinks'); links.innerHTML = '';
    dlBtn(links, 'WAV ဒေါင်းလုဒ်', () => wav, 'voiceover.wav'); dlBtn(links, 'SRT ဒေါင်းလုဒ်', () => srtBlob, 'translated.srt');
    mark(4); log(`✓ Voice over ပြီး (${place.length}/${total}) · ${Math.round(cursor)}s`);
  });

  // ---- 5 Render settings + painter (shared by preview and final render) ----
  const noise = document.createElement('canvas'); noise.width = noise.height = 256;
  { const g = noise.getContext('2d'), d = g.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }
  const LOOKS = { none: '', warm: 'sepia(.35) saturate(1.2)', cool: 'hue-rotate(-15deg) saturate(1.1)', bw: 'grayscale(1)', vivid: 'saturate(1.6) contrast(1.1)' };
  const filterStr = () => [S.hue ? `hue-rotate(${S.hue}deg)` : '', LOOKS[S.look]].filter(Boolean).join(' ');
  const FONT = "Padauk,'Myanmar Text',Inter,sans-serif";
  function wrap(g, text, maxW) {
    const lines = []; let cur = ''; const mk = /[\u102B-\u103E]/;
    for (const ch of text) { const t = cur + ch;
      if (g.measureText(t).width > maxW && cur && !mk.test(ch)) { const sp = cur.lastIndexOf(' '); if (sp > 0) { lines.push(cur.slice(0, sp)); cur = cur.slice(sp + 1) + ch; } else { lines.push(cur); cur = ch; } } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  function bounds(it, W, H, g) {
    let w, h;
    if (it.type === 'text') { const fs = H * 0.045 * it.size; g.font = `700 ${fs}px ${FONT}`; w = g.measureText(it.text).width; h = fs * 1.3; }
    else if (it.type === 'img') { w = W * 0.25 * it.size; h = w * it.img.naturalHeight / (it.img.naturalWidth || 1); }
    else { w = W * 0.6 * it.size; h = H * 0.12 * it.size; }
    return { x0: it.x * W - w / 2, y0: it.y * H - h / 2, x1: it.x * W + w / 2, y1: it.y * H + h / 2, w, h };
  }
  function paint(g, W, H, v, o) {
    const vw = v.videoWidth, vh = v.videoHeight; if (!vw) return;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const f = filterStr();
    if (S.fill === 'blur') { const s = Math.max(W / vw, H / vh); g.filter = (f ? f + ' ' : '') + `blur(${Math.round(W / 53)}px)`; g.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s); }
    g.filter = f || 'none';
    const s2 = (S.fill === 'crop' ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh)) * S.zoom / 100, dw = vw * s2, dh = vh * s2;
    g.save(); if (o.mirror) { g.translate(W, 0); g.scale(-1, 1); } g.drawImage(v, (W - dw) / 2 + S.mx / 100 * W, (H - dh) / 2 + S.my / 100 * H, dw, dh); g.restore(); g.filter = 'none';
    if (S.grain > 0) { g.globalAlpha = S.grain / 100 * 0.35; g.drawImage(noise, Math.random() * 128, Math.random() * 128, 128, 128, 0, 0, W, H); g.globalAlpha = 1; }
    S.items.forEach(it => { if (it.type !== 'blur') return; const b = bounds(it, W, H, g); g.save(); g.beginPath(); g.rect(b.x0, b.y0, b.w, b.h); g.clip(); g.filter = `blur(${Math.round(W / 40)}px)`; g.drawImage(g.canvas, 0, 0); g.restore(); });
    g.textAlign = 'center'; g.lineJoin = 'round';
    S.items.forEach(it => {
      if (it.type === 'blur') return; g.globalAlpha = it.op; const b = bounds(it, W, H, g);
      if (it.type === 'img') g.drawImage(it.img, b.x0, b.y0, b.w, b.h);
      else { const fs = H * 0.045 * it.size; g.font = `700 ${fs}px ${FONT}`; g.lineWidth = fs / 5; g.strokeStyle = it.color === '#000000' ? '#fff' : '#000'; g.fillStyle = it.color; g.strokeText(it.text, it.x * W, b.y1 - fs * 0.3); g.fillText(it.text, it.x * W, b.y1 - fs * 0.3); }
      g.globalAlpha = 1;
    });
    if (o.sel && S.sel >= 0 && S.items[S.sel]) { const b = bounds(S.items[S.sel], W, H, g); g.save(); g.setLineDash([8, 6]); g.lineWidth = 2; g.strokeStyle = '#ff7a2f'; g.strokeRect(b.x0, b.y0, b.w, b.h); g.restore(); }
    if (o.text) {
      const fs = Math.round(H * (H > W ? 0.03 : 0.042) * S.subSize / 100), lh = fs * 1.35;
      g.font = `700 ${fs}px ${FONT}`; g.lineWidth = fs / 5; g.strokeStyle = '#000'; g.fillStyle = '#fff';
      const lines = wrap(g, o.text, W * 0.9); let y = H * S.subY / 100 - (lines.length - 1) * lh;
      lines.forEach(l => { g.strokeText(l, W / 2, y); g.fillText(l, W / 2, y); y += lh; });
    }
  }
  const rnd = k => ((k * 2654435761) >>> 0) % 100 < 45;
  const mirrorAt = k => S.mirror === 'full' || (S.mirror === 'random' && rnd(k));
  function dims(L) {
    const [rw, rh] = S.ratio === 'orig' ? [ST.w || 16, ST.h || 9] : S.ratio.split(':').map(Number);
    return [(rw >= rh ? L : Math.round(L * rw / rh)) & ~1, (rw >= rh ? Math.round(L * rh / rw) : L) & ~1];
  }

  // ---- live preview (drag overlays with a finger / mouse) ----
  const pv = document.createElement('video'); pv.playsInline = true; pv.muted = true; pv.preload = 'auto';
  const pc = $('#rsPrev'), pg = pc.getContext('2d'); let praf = 0, seeking = false, drag = null;
  function drawPrev() {
    if (!pv.videoWidth || $('#rsPage').hidden) return;
    const [W, H] = dims(640); if (pc.width !== W || pc.height !== H) { pc.width = W; pc.height = H; }
    const t = pv.currentTime, k = S.sub === '1' ? ST.plan.findIndex(x => t >= x.va && t < x.vb) : -1;
    paint(pg, W, H, pv, { mirror: mirrorAt(Math.max(k, 0)), text: k >= 0 ? ST.cues[k].text : '', sel: true });
    const d = pv.duration || 1; if (!seeking) $('#rsSeek').value = Math.round(t / d * 1000); $('#rsT').textContent = fmtT(t) + ' / ' + fmtT(d);
  }
  const ploop = () => { drawPrev(); praf = pv.paused ? 0 : requestAnimationFrame(ploop); };
  const ico = n => { $('#rsPP').innerHTML = '<i class="fa-solid fa-' + n + '"></i>'; };
  pv.addEventListener('loadeddata', () => { pv.currentTime = Math.min(1, (pv.duration || 1) / 10); });
  pv.addEventListener('seeked', () => { seeking = false; drawPrev(); });
  pv.addEventListener('play', () => { ico('pause'); if (!praf) ploop(); }); pv.addEventListener('pause', () => ico('play'));
  $('#rsPP').addEventListener('click', () => { if (!pv.videoWidth) return log('⚠ ဗီဒီယို အရင်ရွေးပါ'); pv.paused ? pv.play() : pv.pause(); });
  $('#rsSeek').addEventListener('input', () => { seeking = true; pv.currentTime = $('#rsSeek').value / 1000 * (pv.duration || 0); });
  $('#rsFS').addEventListener('click', () => { if (pc.requestFullscreen) pc.requestFullscreen(); });
  const select = i => { S.sel = i; const it = S.items[i]; $('#rsSelBox').hidden = !it; if (it) { $('#rsSelName').textContent = it.type === 'text' ? '“' + it.text + '”' : it.type === 'img' ? 'Photo' : 'Blur box'; $('#rsItSize').value = it.size; $('#rsItOp').value = it.op; $('#rsItOp').disabled = it.type === 'blur'; } drawPrev(); };
  const pos = e => { const r = pc.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * pc.width, (e.clientY - r.top) / r.height * pc.height]; };
  pc.addEventListener('pointerdown', e => {
    const [px, py] = pos(e);
    for (let i = S.items.length - 1; i >= 0; i--) { const b = bounds(S.items[i], pc.width, pc.height, pg);
      if (px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1) { select(i); drag = { dx: px - S.items[i].x * pc.width, dy: py - S.items[i].y * pc.height }; pc.setPointerCapture(e.pointerId); return; } }
    select(-1);
  });
  pc.addEventListener('pointermove', e => { if (!drag || S.sel < 0) return; const [px, py] = pos(e), it = S.items[S.sel]; it.x = clamp((px - drag.dx) / pc.width, 0, 1); it.y = clamp((py - drag.dy) / pc.height, 0, 1); drawPrev(); });
  ['pointerup', 'pointercancel'].forEach(n => pc.addEventListener(n, () => { drag = null; }));

  // ---- settings tabs / tiles / sliders ----
  $$('.rs-tab').forEach(t => click(t, () => { $$('.rs-tab').forEach(x => x.classList.toggle('on', x === t)); $$('.rs-panel').forEach(p => { p.hidden = p.dataset.t !== t.dataset.t; }); }));
  $('.rs-tab').classList.add('on');
  $$('.rs-tiles').forEach(box => { const k = box.dataset.k, paintOn = () => box.querySelectorAll('.rs-tile').forEach(x => x.classList.toggle('on', x.dataset.v === S[k]));
    box.querySelectorAll('.rs-tile').forEach(x => click(x, () => { S[k] = x.dataset.v; paintOn(); drawPrev(); })); paintOn(); });
  $$('input[data-k]').forEach(i => { const k = i.dataset.k, lab = $('[data-o="' + k + '"]'), show = () => { if (lab) lab.textContent = i.value + i.dataset.u; };
    i.addEventListener('input', () => { S[k] = +i.value; show(); drawPrev(); }); show(); });
  $$('select[data-k]').forEach(s => s.addEventListener('change', () => { S[s.dataset.k] = s.value; drawPrev(); }));
  $$('[data-reset]').forEach(b => b.addEventListener('click', () => b.dataset.reset.split(',').forEach(k => { const i = $('input[data-k="' + k + '"]'); i.value = k === 'zoom' ? 100 : 0; i.dispatchEvent(new Event('input')); })));
  $$('.rs-dot').forEach(d => d.addEventListener('click', () => { S.color = d.dataset.c; const it = S.items[S.sel]; if (it && it.type === 'text') { it.color = S.color; drawPrev(); } }));
  const add = it => { S.items.push(Object.assign({ x: 0.5, y: 0.5, size: 1, op: 1 }, it)); select(S.items.length - 1); };
  $('#rsAddTxt').addEventListener('click', () => { const t = $('#rsTxt').value.trim(); if (t) { add({ type: 'text', text: t, color: S.color, y: 0.1 }); $('#rsTxt').value = ''; } });
  $('#rsAddBlur').addEventListener('click', () => add({ type: 'blur', y: 0.9 }));
  $('#rsImg').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => add({ type: 'img', img, size: 0.8 }); img.src = URL.createObjectURL(f); });
  $('#rsItSize').addEventListener('input', e => { if (S.items[S.sel]) { S.items[S.sel].size = +e.target.value; drawPrev(); } });
  $('#rsItOp').addEventListener('input', e => { if (S.items[S.sel]) { S.items[S.sel].op = +e.target.value; drawPrev(); } });
  $('#rsItDel').addEventListener('click', () => { if (S.sel >= 0) { S.items.splice(S.sel, 1); select(-1); } });

  // ---- final render: real-time canvas + MediaRecorder; video follows the narration timeline ----
  run('#rsRender', async () => {
    if (!ST.file) return log('⚠ ဗီဒီယို မရှိပါ (Step 1)'); if (!ST.mixed) return log('⚠ Voice Over အရင်လုပ်ပါ (Step 4)');
    if (typeof MediaRecorder === 'undefined') throw new Error('ဒီ browser မှာ MediaRecorder မရှိပါ (Chrome သုံးပါ)');
    pv.pause(); const L = { 480: 854, 720: 1280, 1080: 1920 }[S.size], BR = { 480: 2.5e6, 720: 4e6, 1080: 8e6 }[S.size], [W, H] = dims(L);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const v = document.createElement('video'); v.playsInline = true; v.preload = 'auto'; v.src = ST.url;
    await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = () => no(new Error('ဗီဒီယို ဖွင့်မရပါ')); });
    const ac = new (window.AudioContext || window.webkitAudioContext)(); await ac.resume(); const dest = ac.createMediaStreamDestination();
    const vs = ac.createBufferSource(); vs.buffer = ST.mixed; vs.connect(dest);
    if (S.orig > 0) { const gn = ac.createGain(); gn.gain.value = S.orig; ac.createMediaElementSource(v).connect(gn); gn.connect(dest); } else v.muted = true;
    let ms = null; const mf = $('#rsMusic').files[0];
    if (mf) { ms = ac.createBufferSource(); ms.buffer = await ac.decodeAudioData(await mf.arrayBuffer()); ms.loop = true; const gn = ac.createGain(); gn.gain.value = S.musicVol; ms.connect(gn); gn.connect(dest); }
    const stream = cv.captureStream(30); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: BR } : { videoBitsPerSecond: BR });
    const parts = []; rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    const plan = ST.plan, cues = ST.cues, last = plan[plan.length - 1], total = last ? last.o + last.len : 1; let pi = -1, t0 = 0, ended = false;
    let wake = null; try { wake = await navigator.wakeLock.request('screen'); } catch (e) { /* optional */ }
    const btn = $('#rsStopR'); btn.hidden = false;
    const finish = () => { if (ended) return; ended = true; v.pause(); try { vs.stop(); ms && ms.stop(); } catch (e) { /* stopped */ } rec.stop(); };
    btn.onclick = finish; v.onended = finish; const done = new Promise(ok => { rec.onstop = ok; });
    function frame() {
      if (ended) return; const ot = ac.currentTime - t0;
      while (pi + 1 < plan.length && ot >= plan[pi + 1].o) { const p = plan[++pi]; v.playbackRate = clamp((p.vb - p.va) / p.len, 0.5, 3); if (Math.abs(v.currentTime - p.va) > 0.6) v.currentTime = p.va; }
      if (ot > total + 0.3) return finish();
      const cu = S.sub === '1' ? cues.find(x => ot >= x.a && ot < x.b) : null;
      paint(g, W, H, v, { mirror: mirrorAt(Math.max(pi, 0)), text: cu ? cu.text : '', sel: false }); bar(clamp(ot / total, 0, 1)); requestAnimationFrame(frame);
    }
    log('Render စတင်ပြီ — စာမျက်နှာကို မပိတ်ပါနဲ့'); rec.start(1000);
    t0 = ac.currentTime + 0.15; vs.start(t0); ms && ms.start(t0); await v.play(); frame();
    await done; if (wake) wake.release(); ac.close(); btn.hidden = true;
    const type = rec.mimeType || mime || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm', vblob = new Blob(parts, { type: type.split(';')[0] });
    if (!vblob.size) throw new Error('Render ထွက်လာတဲ့ဖိုင် ဗလာဖြစ်နေသည် — ပြန်ကြိုးစားပါ');
    if (ST.outUrl) URL.revokeObjectURL(ST.outUrl); ST.outUrl = URL.createObjectURL(vblob);
    const out = $('#rsOut'); out.innerHTML = ''; const pvid = document.createElement('video'); pvid.controls = true; pvid.playsInline = true; pvid.src = ST.outUrl; out.appendChild(pvid);
    const lk = document.createElement('div'); lk.className = 'rs-links'; out.appendChild(lk);
    dlBtn(lk, 'ဗီဒီယို ဒေါင်းလုဒ် (.' + ext + ')', () => vblob, 'recap.' + ext);
    dlBtn(lk, 'SRT ဒေါင်းလုဒ်', () => new Blob([rebuildSrt(ST.subs, { preserveIndex: true })], { type: 'text/plain;charset=utf-8' }), 'translated.srt');
    mark(5); log('✓ Render ပြီး');
  });
})();
