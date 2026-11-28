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
  const S = { ratio: '16:9', size: '720', quality: (['small', 'balanced', 'high'].includes(safeLsGet('neoyangon_recap_quality')) ? safeLsGet('neoyangon_recap_quality') : 'balanced'), mx: 0, my: 0, zoom: 100, fill: 'blur', mirror: 'off', grain: 0, hue: 0, look: 'none', sub: '1', subSize: 100, subY: 92, subFont: 'def', subColor: '#ffffff', subStroke: '#000000', subStrokeW: 4,
              orig: 0, musicVol: 0.15, autoSrt: '1', items: [], sel: -1, color: '#ffffff', txtFont: 'def', imgShape: 'circle' };
  const tiles = (k, vals) => `<div class="rs-tiles" data-k="${k}">${vals.map(([v, t]) => `<div class="rs-tile" data-v="${v}" tabindex="0">${t}</div>`).join('')}</div>`;
  const rng = (k, label, min, max, step, val, u) => `<label>${label} <b data-o="${k}"></b><input type="range" data-k="${k}" data-u="${u || ''}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  const cdots = k => `<div class="rs-cd" data-k="${k}">${['#ffffff', '#ffd34d', '#ff9f1c', '#ff5b5b', '#59d46a', '#22d3ee', '#4da3ff', '#e879f9', '#000000'].map(c => `<span data-c="${c}" style="background:${c}" tabindex="0"></span>`).join('')}<input type="color" aria-label="Custom colour"></div>`;
  // ---- render quality presets: video bits per pixel per frame at 30 fps (the old fixed 720p value was ~4 Mbps = 182 MB for 6:14) ----
  const QUAL = { small: { bpp: 0.04, ab: 96e3 }, balanced: { bpp: 0.065, ab: 96e3 }, high: { bpp: 0.11, ab: 128e3 } };
  const qOf = () => QUAL[S.quality] || QUAL.balanced;
  const vBits = (W, H) => Math.round(clamp(W * H * 30 * qOf().bpp, 0.5e6, 14e6));
  function showQEst() {
    const n = $('#rsQEst'); if (!n) return;
    const [W, H] = dims({ 480: 854, 720: 1280, 1080: 1920 }[S.size] || 1280), bits = vBits(W, H) + qOf().ab, sec = ST.mixed ? ST.mixed.duration : 0;
    n.textContent = 'ခန့်မှန်း bitrate ≈ ' + (bits / 1e6).toFixed(1) + ' Mbps' + (sec ? ' · ဖိုင်ဆိုဒ် ≈ ' + Math.round(bits * sec / 8 / 1e6) + ' MB (' + fmtT(sec) + ')' : ' · Voice Over ပြီးရင် ဖိုင်ဆိုဒ် ခန့်မှန်းပြမယ်');
  }
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
      <label>Cue အရှည် (စာလုံးရေ — ကိုယ်လိုသလို ရိုက်ထည့်ပါ)<input id="rsTrLen" class="rs-in" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" placeholder="36" autocomplete="off"></label>
      <div class="rs-cuepre" id="rsTrPre">${[['14', 'တို'], ['24', 'အလယ်'], ['36', 'ရှည်'], ['50', 'အရှည်ဆုံး']].map(([v, t]) => `<div class="rs-tile" data-v="${v}" tabindex="0">${t} (${v})</div>`).join('')}</div>
      <p class="rs-note">5 – 200 ကြား ဂဏန်း ရိုက်နိုင်ပါတယ်။ ဂဏန်းသေးရင် cue တိုတိုလေးတွေ၊ ကြီးရင် ရှည်ရှည်တွေ ထွက်ပါမယ်။</p>
      <button id="rsTr" class="rs-btn">စာထုတ်မည်</button><div id="rsSegs2" class="rs-segs"></div></section>
    <section class="rs-card holo-glass" data-p="3"><div class="rs-grid" id="rsTlSet"></div>
      <div class="rs-mt" id="rsMode"><span role="button" tabindex="0" data-m="auto">Auto</span><span role="button" tabindex="0" data-m="manual">Manual</span></div>
      <div id="rsTlAuto"><p class="rs-note">Auto — Gemini key နဲ့ ဒီအပ်ဖ်ကပဲ ဘာသာပြန်ပေးပါတယ်။</p><button id="rsTl" class="rs-btn">ဘာသာပြန်မည်</button></div>
      <div id="rsTlManual" hidden><h4 class="rs-h4">Manual import</h4>
        <p class="rs-note">Prompt ကို copy → ChatGPT / Gemini / Claude စတာတွေမှာ paste လုပ်ပြီး ဘာသာပြန် → ထွက်လာတဲ့ JSON ကို အောက်မှာ paste လုပ်ပြီး Import နှိပ်ပါ။</p>
        <label id="rsPartBox" hidden>Part<select id="rsPart" class="rs-in"></select></label>
        <div class="rs-links"><button id="rsCpTr" class="rs-btn">Translate prompt</button><button id="rsCpRt" class="rs-btn">Retell prompt</button></div>
        <textarea id="rsPrompt" class="rs-in" rows="5" readonly hidden></textarea>
        <textarea id="rsPaste" class="rs-in" rows="6" placeholder="Paste JSON here"></textarea>
        <button id="rsImport" class="rs-btn" disabled>Import JSON</button></div>
      <div id="rsSegs3" class="rs-segs"></div></section>
    <section class="rs-card holo-glass" data-p="4"><div class="rs-grid" id="rsVoSet"></div>
      <div class="rs-nara"><select id="rsNara" hidden>${opt('', '')}${opt('shoon', 'Shoon')}${opt('thazin', 'Thazin')}${opt('ko-banyar', 'Ko Banyar')}${opt('htet-myat', 'Htet Myat')}</select>
        <div class="nv-seg" id="nvSeg"><span data-m="off" role="button" tabindex="0">Voice Over</span><span data-m="nara" role="button" tabindex="0">Nara <small>အခမဲ့</small></span></div>
        <div id="nvBox" hidden>
          <button id="nvCard" class="nv-card" type="button"><span class="nv-ic"><i class="fa-solid fa-microphone"></i></span><span class="nv-tx"><b id="nvName">Nara voice ရွေးပါ</b><small id="nvSub"></small></span><i class="fa-solid fa-chevron-down"></i></button>
          <p class="nv-warn"><i class="fa-solid fa-triangle-exclamation"></i> Nara က ဖုန်းထဲမှာ run တာမို့ ဖုန်း နွေးလာနိုင်ပါတယ်</p>
          <p class="rs-note" id="rsNaraSt"></p>
          <div class="rs-links"><button id="rsNaraEng" class="rs-btn" type="button">Engine စစ်မည်</button></div>
          <p class="rs-note">Voice တစ်ခုကို ~181 MB တစ်ခါပဲ ဒေါင်းရပြီး ဖုန်းထဲ သိမ်းထားမယ်။ အင်္ဂလိပ်စာလုံးတွေ အသံမထွက်ပါ။ ဖုန်းအလိုက် အသံထုတ်ရတာ နှေးနိုင်တယ်။ Voice by Nara Mini v1 © Nara Audio (Apache-2.0) · browser port: SagaPyaw</p></div></div>
      ${sel('pause', 'စာကြောင်းကြား နားချိန်', [['0.18', 'ပုံမှန် (0.18s)'], ['0.30', 'ရှည် (0.3s)'], ['0.08', 'တို (0.08s)'], ['0.02', 'မထည့်']])}
      ${sel('natural', 'ဆက်ဖတ်ပေး (စာကြောင်းတိုတွေကို ပေါင်းဖတ် → လူပြောသလို)', [['1', 'On (အကြံပြု)'], ['0', 'Off']])}
      ${sel('warm', 'အသံ နွေးအောင် (EQ + compressor)', [['1', 'On'], ['0', 'Off']])}
      ${rng('vpitch', 'Pitch (Thiha / Nilar)', -30, 30, 1, 0, 'Hz')}
      <div id="rsGen" class="vo-gen" hidden><div class="vo-gh"><b>Progress</b><span id="rsGenSt" class="vo-badge">Generating</span></div><div class="rs-bar"><i id="rsGenBar"></i></div><div class="vo-gl"><span id="rsGenLine"></span><span id="rsGenCnt"></span></div></div>
      <button id="rsVo" class="rs-btn">အသံထုတ်မည်</button><button id="rsStop" class="rs-btn rs-stop" type="button" hidden>■ Stop</button>
      <div id="rsPlayer" class="vo-player" hidden><button id="rsPl" class="vo-pl" type="button" aria-label="Play"><i class="fa-solid fa-play"></i></button><div class="vo-pi"><b id="rsPlName"></b><small id="rsPlSub"></small></div>
        <input id="rsPlSeek" type="range" min="0" max="1000" value="0"><div class="vo-pt"><span id="rsPlCur">0:00</span><span id="rsPlDur">0:00</span></div></div>
      <p class="rs-note" id="rsVoDone"></p>
      <button id="rsFinal" class="rs-btn" type="button" hidden>Choose Final Voice</button><div id="rsFinalBox" class="vo-final" hidden></div>
      <audio id="rsAudio" hidden></audio><div id="rsVoLinks" class="rs-links"></div></section>
    <section class="rs-card holo-glass" data-p="5">
      <div class="rs-prev"><canvas id="rsPrev" width="640" height="360"></canvas>
        <div class="rs-pc"><button id="rsPP" class="rs-ic" aria-label="Play"><i class="fa-solid fa-play"></i></button><input id="rsSeek" type="range" min="0" max="1000" value="0"><span id="rsT">0:00</span><button id="rsFS" class="rs-ic" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button></div></div>
      <div class="rs-panels">
        <div class="rs-panel" data-t="ratio"><h4 class="rs-h4">OUTPUT RATIO</h4>${tiles('ratio', [['16:9', '16:9'], ['9:16', '9:16'], ['1:1', '1:1'], ['orig', 'Original'], ['3:4', '3:4'], ['4:3', '4:3'], ['4:5', '4:5']])}</div>
        <div class="rs-panel" data-t="size" hidden><h4 class="rs-h4">SIZE</h4>${tiles('size', [['480', '480p'], ['720', '720p'], ['1080', '1080p']])}</div>
        <div class="rs-panel" data-t="quality" hidden><h4 class="rs-h4">QUALITY</h4>${tiles('quality', [['small', 'Small'], ['balanced', 'Balanced'], ['high', 'High']])}
          <p class="rs-note">Small = ဖိုင်အသေးဆုံး · ဖုန်းပေါ်မှာ ပေါ့ · မြန် &nbsp;|&nbsp; Balanced = အကြံပြု (ဖိုင်ဆိုဒ် သိသိသာသာ ကျ) &nbsp;|&nbsp; High = ပုံအကြည်ဆုံး · ဖိုင်ကြီး</p><p class="rs-note" id="rsQEst"></p></div>
        <div class="rs-panel" data-t="move" hidden><h4 class="rs-h4">MOVE</h4>${rng('mx', 'Left / right', -50, 50, 1, 0, '%')}${rng('my', 'Up / down', -50, 50, 1, 0, '%')}<button class="rs-btn" data-reset="mx,my">Reset</button></div>
        <div class="rs-panel" data-t="zoom" hidden><h4 class="rs-h4">ZOOM</h4>${rng('zoom', 'Zoom', 100, 200, 1, 100, '%')}<button class="rs-btn" data-reset="zoom">Reset</button></div>
        <div class="rs-panel" data-t="fill" hidden><h4 class="rs-h4">FILL</h4>${tiles('fill', [['blur', 'Blur'], ['black', 'Black'], ['crop', 'Crop']])}</div>
        <div class="rs-panel" data-t="mirror" hidden><h4 class="rs-h4">MIRROR</h4>${tiles('mirror', [['off', 'Off'], ['full', 'Full'], ['random', 'Random']])}</div>
        <div class="rs-panel" data-t="look" hidden><h4 class="rs-h4">LOOK</h4>${rng('grain', 'Grain', 0, 100, 1, 0, '')}${rng('hue', 'Hue', 0, 360, 1, 0, '°')}${sel('look', 'Filter', [['none', 'None'], ['warm', 'Warm'], ['cool', 'Cool'], ['bw', 'Black & white'], ['vivid', 'Vivid']])}</div>
        <div class="rs-panel" data-t="overlay" hidden><h4 class="rs-h4">OVERLAY</h4>
          <label>Text Font<select id="rsTxtFont" class="rs-in"></select></label>
          <div class="rs-row"><input id="rsTxt" class="rs-in" type="text" placeholder="Enter text..."><button id="rsAddTxt" class="rs-btn">+ Text</button></div>
          <div class="rs-dots">${['#ffffff', '#ffd34d', '#ff5b5b', '#59d46a', '#4da3ff', '#000000'].map(c => `<span class="rs-dot" data-c="${c}" style="background:${c}"></span>`).join('')}</div>
          <label>Photo ပုံစံ<select id="rsShape" class="rs-in">${opt('circle', 'လုံး (Circle)')}${opt('rounded', 'ထောင့်ဝိုင်း (Rounded)')}${opt('rect', 'မူရင်းအတိုင်း')}</select></label>
          <div class="rs-row"><label>Photo<input id="rsImg" class="rs-in" type="file" accept="image/*"></label><button id="rsAddBlur" class="rs-btn">+ Blur box</button></div>
          <div id="rsSelBox" hidden><b id="rsSelName"></b><div class="rs-row"><label>Size <input id="rsItSize" type="range" min="0.2" max="3" step="0.05" value="1"></label><label>Opacity <input id="rsItOp" type="range" min="0.1" max="1" step="0.05" value="1"></label></div><button id="rsItDel" class="rs-btn">Delete</button></div>
          <div class="rs-note">Preview ပေါ်မှာ စာ / ပုံ / Blur box ကို လက်နဲ့ ဆွဲရွှေ့ပါ။ Blur box က မူရင်းစာတန်းကို ဖုံးဖို့ပါ။</div></div>
        <div class="rs-panel" data-t="music" hidden><h4 class="rs-h4">MUSIC</h4><input id="rsMusic" class="rs-in" type="file" accept="audio/*">${rng('musicVol', 'Music volume', 0, 0.6, 0.05, 0.15, 'x')}</div>
        <div class="rs-panel" data-t="sub" hidden><h4 class="rs-h4">SUBTITLE</h4>${sel('sub', 'Subtitles (မီးရှို့)', [['1', 'On'], ['0', 'Off']])}
          <label>Font<select id="rsFont" class="rs-in"></select></label>
          <div class="rs-row"><label>Font ဖိုင်ထည့်ရန် (.ttf / .otf)<input id="rsFontFile" class="rs-in" type="file" accept=".ttf,.otf,.woff,.woff2"></label><button id="rsFontDel" class="rs-btn" hidden>ဒီ Font ဖျက်မည်</button></div>
          <h4 class="rs-h4">TEXT COLOR</h4>${cdots('subColor')}
          <h4 class="rs-h4">OUTLINE COLOR</h4>${cdots('subStroke')}
          ${rng('subStrokeW', 'Outline thickness', 0, 10, 1, 4, '')}${rng('subSize', 'Subtitle size', 60, 160, 5, 100, '%')}${rng('subY', 'Subtitle position', 60, 96, 1, 92, '%')}</div>
        <div class="rs-panel" data-t="extras" hidden><h4 class="rs-h4">EXTRAS</h4>${rng('orig', 'မူရင်းအသံ', 0, 1, 0.05, 0, 'x')}${sel('autoSrt', 'Auto-save SRT', [['1', 'On'], ['0', 'Off']])}</div>
      </div>
      <div class="rs-tabs rs-ibar">${[['ratio', 'RATIO'], ['size', 'SIZE'], ['quality', 'QUALITY'], ['move', 'MOVE'], ['zoom', 'ZOOM'], ['fill', 'FILL'], ['mirror', 'MIRROR'], ['look', 'LOOK'], ['overlay', 'OVERLAY'], ['music', 'MUSIC'], ['sub', 'SUBTITLE'], ['extras', 'EXTRAS']].map(([t, n]) => `<div class="rs-tab" data-t="${t}" tabindex="0"><i class="fa-solid ${({ ratio: 'fa-crop-simple', size: 'fa-image', quality: 'fa-gauge-high', move: 'fa-up-down-left-right', zoom: 'fa-magnifying-glass-plus', fill: 'fa-border-all', mirror: 'fa-table-columns', look: 'fa-wand-magic-sparkles', overlay: 'fa-layer-group', music: 'fa-music', sub: 'fa-closed-captioning', extras: 'fa-sliders' })[t]}"></i><span>${n}</span></div>`).join('')}</div>
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

  // <fixMp4>
  // MediaRecorder writes a *fragmented* MP4 (no duration / sample tables). Browsers scan it fine, but VN / CapCut / most
  // editors read the header and show a few seconds. This rewrites it as a normal MP4 (full moov up front) without re-encoding.
  async function fixMp4(blob) {
    const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer);
    const u32 = o => dv.getUint32(o), i32 = o => dv.getInt32(o), u64 = o => dv.getUint32(o) * 4294967296 + dv.getUint32(o + 4);
    const fourcc = o => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
    const kids = (s, e) => {
      const out = [];
      while (s + 8 <= e) {
        let size = u32(s), hdr = 8; const type = fourcc(s + 4);
        if (size === 1) { size = u64(s + 8); hdr = 16; } else if (size === 0) size = e - s;
        if (size < hdr || s + size > e) break;
        out.push({ type, s, e: s + size, b: s + hdr }); s += size;
      }
      return out;
    };
    const cat = parts => { let n = 0; parts.forEach(p => { n += p.length; }); const o = new Uint8Array(n); let k = 0; parts.forEach(p => { o.set(p, k); k += p.length; }); return o; };
    const mk = (type, ...parts) => { const body = cat(parts), o = new Uint8Array(8 + body.length); new DataView(o.buffer).setUint32(0, o.length); o.set([...type].map(c => c.charCodeAt(0)), 4); o.set(body, 8); return o; };
    const be = arr => { const o = new Uint8Array(arr.length * 4), d = new DataView(o.buffer); for (let i = 0; i < arr.length; i++) d.setUint32(i * 4, arr[i] >>> 0); return o; };
    const runs = vals => { const r = []; vals.forEach(v => { const l = r[r.length - 1]; if (l && l[1] === v) l[0]++; else r.push([1, v]); }); return r; };
    const patchDur = (box, o0, o1, val) => {
      const c = buf.slice(box.s, box.e), d = new DataView(c.buffer), v = c[box.b - box.s], o = box.b - box.s + (v ? o1 : o0);
      if (v) { d.setUint32(o, Math.floor(val / 4294967296)); d.setUint32(o + 4, val >>> 0); } else d.setUint32(o, val >>> 0);
      return c;
    };

    const top = kids(0, buf.length), ftyp = top.find(x => x.type === 'ftyp'), moov = top.find(x => x.type === 'moov');
    if (!moov) throw new Error('moov မတွေ့ပါ');
    if (!top.some(x => x.type === 'moof')) return blob; // already a normal MP4

    // 1) tracks + defaults from the original moov
    let mvTs = 1000; const trex = {}, order = [], tracks = {};
    kids(moov.b, moov.e).forEach(c => {
      if (c.type === 'mvhd') mvTs = u32(c.b + (buf[c.b] ? 20 : 12));
      if (c.type === 'mvex') kids(c.b, c.e).forEach(t => { if (t.type === 'trex') trex[u32(t.b + 4)] = { dur: u32(t.b + 12), size: u32(t.b + 16), flags: u32(t.b + 20) }; });
      if (c.type === 'trak') {
        const tr = { box: c, samples: [], chunks: [], start: null, sum: 0 };
        kids(c.b, c.e).forEach(m => {
          if (m.type === 'tkhd') tr.id = u32(m.b + (buf[m.b] ? 20 : 12));
          if (m.type === 'mdia') kids(m.b, m.e).forEach(x => {
            if (x.type === 'mdhd') tr.ts = u32(x.b + (buf[x.b] ? 20 : 12));
            if (x.type === 'hdlr') tr.hdlr = fourcc(x.b + 8);
          });
        });
        tracks[tr.id] = tr; order.push(tr);
      }
    });

    // 2) every sample of every fragment -> per-track tables; sample bytes are re-packed into one mdat
    const mdat = []; let mdatLen = 0;
    top.filter(f => f.type === 'moof').forEach(f => {
      kids(f.b, f.e).filter(x => x.type === 'traf').forEach(traf => {
        let tf = null, base = f.s, tfdt = null; const truns = [];
        kids(traf.b, traf.e).forEach(x => {
          if (x.type === 'tfhd') {
            const fl = u32(x.b) & 0xffffff; let o = x.b + 4; tf = { id: u32(o) }; o += 4;
            if (fl & 1) { base = u64(o); o += 8; }
            if (fl & 2) o += 4;
            if (fl & 8) { tf.dur = u32(o); o += 4; }
            if (fl & 0x10) { tf.size = u32(o); o += 4; }
            if (fl & 0x20) { tf.flags = u32(o); o += 4; }
          } else if (x.type === 'tfdt') tfdt = buf[x.b] ? u64(x.b + 4) : u32(x.b + 4);
          else if (x.type === 'trun') truns.push(x);
        });
        const tr = tf && tracks[tf.id]; if (!tr) return;
        const tx = trex[tf.id] || {};
        if (tr.start === null) tr.start = tfdt || 0;
        if (tfdt !== null && tr.samples.length) { // close gaps/overlaps so audio and video stay in sync
          const gap = (tfdt - tr.start) - tr.sum, last = tr.samples[tr.samples.length - 1], old = last.dur;
          if (gap) { last.dur = Math.max(1, old + gap); tr.sum += last.dur - old; }
        }
        let pos = null;
        truns.forEach(x => {
          const ver = buf[x.b], fl = u32(x.b) & 0xffffff, n = u32(x.b + 4); let o = x.b + 8, doff = null, ff = null;
          if (fl & 1) { doff = i32(o); o += 4; }
          if (fl & 4) { ff = u32(o); o += 4; }
          let p = doff !== null ? base + doff : (pos !== null ? pos : base); const first = p;
          for (let i = 0; i < n; i++) {
            let dur = tf.dur !== undefined ? tf.dur : (tx.dur || 0), size = tf.size !== undefined ? tf.size : (tx.size || 0),
                flags = tf.flags !== undefined ? tf.flags : (tx.flags || 0), cts = 0;
            if (fl & 0x100) { dur = u32(o); o += 4; }
            if (fl & 0x200) { size = u32(o); o += 4; }
            if (fl & 0x400) { flags = u32(o); o += 4; } else if (i === 0 && ff !== null) flags = ff;
            if (fl & 0x800) { cts = ver ? i32(o) : u32(o); o += 4; }
            tr.samples.push({ size, dur, flags, cts }); tr.sum += dur; p += size;
          }
          pos = p;
          if (n > 0 && p > first) { tr.chunks.push({ n, mo: mdatLen }); mdat.push(buf.subarray(first, p)); mdatLen += p - first; }
        });
      });
    });
    if (!mdatLen) throw new Error('sample မတွေ့ပါ');
    if (mdatLen > 4e9) throw new Error('ဖိုင်ကြီးလွန်းသည် (4GB+)');

    // 3) durations / edit lists
    let movieDur = 0;
    order.forEach(tr => {
      const off = Math.round((tr.start || 0) / tr.ts * mvTs), media = Math.round(tr.sum / tr.ts * mvTs);
      tr.tkDur = off + media; movieDur = Math.max(movieDur, tr.tkDur);
      tr.edts = off > 0 ? mk('edts', mk('elst', be([0, 2, off, 0xffffffff, 0x10000, media, 0, 0x10000]))) : null;
    });

    // 4) new moov (sample tables filled in, mvex removed)
    const stblNew = (tr, base) => {
      const s = tr.samples, parts = [];
      parts.push(mk('stts', be([0, runs(s.map(x => x.dur)).length, ...runs(s.map(x => x.dur)).flat()])));
      if (tr.hdlr === 'vide') { const sy = []; s.forEach((x, i) => { if (!(x.flags & 0x10000)) sy.push(i + 1); }); if (sy.length && sy.length < s.length) parts.push(mk('stss', be([0, sy.length]), be(sy))); }
      if (s.some(x => x.cts)) { const r = runs(s.map(x => x.cts)); parts.push(mk('ctts', be([(s.some(x => x.cts > 0x7fffffff) ? 0 : 1) * 0x1000000 * (s.some(x => x.cts < 0 || x.cts > 0x7fffffff) ? 1 : 0), r.length]), be(r.flat()))); }
      const sc = []; tr.chunks.forEach((c, i) => { if (!sc.length || sc[sc.length - 1][1] !== c.n) sc.push([i + 1, c.n, 1]); });
      parts.push(mk('stsc', be([0, sc.length]), be(sc.flat())));
      parts.push(mk('stsz', be([0, 0, s.length]), be(s.map(x => x.size))));
      parts.push(mk('stco', be([0, tr.chunks.length]), be(tr.chunks.map(c => base + c.mo))));
      return parts;
    };
    const build = base => mk('moov', ...kids(moov.b, moov.e).filter(c => c.type !== 'mvex').map(c => {
      if (c.type === 'mvhd') return patchDur(c, 16, 24, movieDur);
      if (c.type !== 'trak') return buf.subarray(c.s, c.e);
      const tr = order.find(t => t.box.s === c.s);
      return mk('trak', ...kids(c.b, c.e).filter(m => m.type !== 'edts').flatMap(m => {
        if (m.type === 'tkhd') return tr.edts ? [patchDur(m, 20, 28, tr.tkDur), tr.edts] : [patchDur(m, 20, 28, tr.tkDur)];
        if (m.type !== 'mdia') return [buf.subarray(m.s, m.e)];
        return [mk('mdia', ...kids(m.b, m.e).map(x => {
          if (x.type === 'mdhd') return patchDur(x, 16, 24, tr.sum);
          if (x.type !== 'minf') return buf.subarray(x.s, x.e);
          return mk('minf', ...kids(x.b, x.e).map(y => {
            if (y.type !== 'stbl') return buf.subarray(y.s, y.e);
            const stsd = kids(y.b, y.e).find(z => z.type === 'stsd');
            return mk('stbl', buf.subarray(stsd.s, stsd.e), ...stblNew(tr, base));
          }));
        }))];
      }));
    }));
    const ft = ftyp ? buf.subarray(ftyp.s, ftyp.e) : new Uint8Array(0);
    let mv = build(0); const base = ft.length + mv.length + 8; mv = build(base);
    return new Blob([ft, mv, be([mdatLen + 8]), new Uint8Array([0x6d, 0x64, 0x61, 0x74]), ...mdat], { type: 'video/mp4' });
  }
  // </fixMp4>

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
  const CUE_KEY = 'neoyangon_recap_cue_len', cueEl = $('#rsTrLen');
  const cueVal = () => clamp(parseInt(cueEl.value, 10) || 36, 5, 200);
  const cuePaint = () => $$('#rsTrPre .rs-tile').forEach(x => x.classList.toggle('on', x.dataset.v === String(parseInt(cueEl.value, 10))));
  cueEl.value = String(clamp(parseInt(safeLsGet(CUE_KEY), 10) || 36, 5, 200)); cuePaint();
  cueEl.addEventListener('input', () => { const d = cueEl.value.replace(/\D/g, '').slice(0, 3); if (d !== cueEl.value) cueEl.value = d; cuePaint(); });
  cueEl.addEventListener('change', () => { cueEl.value = String(cueVal()); cuePaint(); safeLsSet(CUE_KEY, cueEl.value); });
  $$('#rsTrPre .rs-tile').forEach(x => click(x, () => { cueEl.value = x.dataset.v; cuePaint(); safeLsSet(CUE_KEY, cueEl.value); }));

  // ---- step list / pages ----
  function refreshList(extra) {
    showQEst();
    const info = Object.assign({ 1: ST.file ? `${fmtT(ST.dur)} · ${ST.w}×${ST.h}` : 'ဗီဒီယို မရွေးရသေးပါ', 2: ST.subs.length ? ST.subs.length + ' segments' : '', 3: ST.subs.some(s => s.translatedText) ? targetLangSelect.value : '', 4: ST.mixed ? fmtT(ST.mixed.duration) : '', 5: '' }, extra);
    $$('.rs-step').forEach((d, i) => { const n = i + 1, ok = ST.done[n]; d.classList.toggle('ok', !!ok); d.querySelector('small').textContent = info[n] || ''; d.querySelector('.rs-badge').textContent = ok ? 'Completed' : 'Pending'; d.querySelector('.rs-ck').innerHTML = ok ? '<i class="fa-solid fa-check"></i>' : n; });
  }
  const mark = n => { ST.done[n] = true; refreshList(); if (window.History2) History2.recapDirty(); };
  function go(n) {
    $('#rsList').hidden = true; $('#rsPage').hidden = false; $('#rsPT').textContent = `Step ${n} · ${STEPS[n - 1]}`;
    $$('#rsPage section').forEach(s => { s.hidden = +s.dataset.p !== n; }); syncAll(); if (n === 3 && !$('#rsTlManual').hidden) refreshParts(); if (n === 5) drawPrev();
  }
  $$('.rs-step').forEach(d => click(d, () => go(+d.dataset.s)));
  // "Next" button at the bottom of every step page: 1→2, 2→3, 3→4, 4→5; the last page goes back to the step list
  $$('#rsPage section[data-p]').forEach(sec => {
    const n = +sec.dataset.p, b = document.createElement('button'); b.type = 'button'; b.className = 'rs-btn rs-next';
    b.innerHTML = n < STEPS.length ? `Next · ${STEPS[n]} <i class="fa-solid fa-arrow-right"></i>` : '<i class="fa-solid fa-check"></i> ပြီးပြီ — Step စာရင်းသို့';
    b.addEventListener('click', () => { if (n < STEPS.length) go(n + 1); else { pv.pause(); $('#rsPage').hidden = true; $('#rsList').hidden = false; refreshList(); } window.scrollTo({ top: 0, behavior: 'smooth' }); });
    sec.appendChild(b);
  });
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
    Object.assign(ST, { file: f, subs: [], mixed: null, plan: [], cues: [], done: {}, hid: null }); renderSegs();
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
    const n = cueVal(); cueEl.value = String(n); cuePaint(); safeLsSet(CUE_KEY, String(n));
    const dur = [Math.min(20, Math.round((2.5 + n * 0.15) * 10) / 10), Math.min(24, Math.round((4 + n * 0.16) * 10) / 10)]; // same values as the old 14/24/36/50 presets, interpolated for any number
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

  // ---- 3b Manual: copy the prompt, translate anywhere else, paste the JSON back ----
  const setMode = m => {
    safeLsSet('neoyangon_recap_tl_mode', m);
    $$('#rsMode span').forEach(x => x.classList.toggle('on', x.dataset.m === m));
    $('#rsTlAuto').hidden = m !== 'auto'; $('#rsTlManual').hidden = m !== 'manual';
    $$('#rsTlSet > *').forEach((n, i) => { n.hidden = m === 'manual' && i > 1; }); // Workers / Timeout / Retries / Proofread are Auto-only
    if (m === 'manual') refreshParts();
  };
  $$('#rsMode span').forEach(x => click(x, () => setMode(x.dataset.m)));
  const partSize = () => Math.max(parseInt(chunkSizeInput.value, 10) || 30, 1);
  const partRange = () => { const n = ST.subs.length, sz = partSize(), k = +$('#rsPart').value || 0; return [Math.min(k * sz, n), Math.min((k + 1) * sz, n)]; };
  function refreshParts() {
    const n = ST.subs.length, sz = partSize(), parts = Math.max(Math.ceil(n / sz), 1), sel = $('#rsPart'), keep = +sel.value || 0;
    sel.innerHTML = ''; for (let k = 0; k < parts; k++) { const o = document.createElement('option'); o.value = k; o.textContent = `Part ${k + 1}/${parts} · #${k * sz + 1}–${Math.min((k + 1) * sz, n)}`; sel.appendChild(o); }
    sel.value = Math.min(keep, parts - 1); $('#rsPartBox').hidden = parts < 2; $('#rsImport').disabled = !n;
  }
  chunkSizeInput.addEventListener('input', () => { if (!$('#rsTlManual').hidden) refreshParts(); });
  $('#rsPaste').addEventListener('input', () => { $('#rsImport').disabled = !ST.subs.length || !$('#rsPaste').value.trim(); });

  const copyText = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back below */ }
    try { const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;top:0;opacity:0'; document.body.appendChild(t); t.focus(); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok; } catch (e) { return false; }
  };
  function buildManualPrompt(retell) {
    if (!ST.subs.length) throw new Error('Transcription အရင်လုပ်ပါ (Step 2)');
    const [a, b] = partRange(), part = ST.subs.slice(a, b), lang = targetLangSelect.value, lines = part.map(s => (s.textLines || []).join('\n'));
    const ctx = { before: ST.subs.slice(Math.max(0, a - 3), a).map(s => (s.textLines || []).join('\n')), after: ST.subs.slice(b, b + 3).map(s => (s.textLines || []).join('\n')) };
    const cps = lang === 'Myanmar (Burmese)' ? getReadingBudgetCps() : 0; if (cps) ctx.budgets = computeReadingBudgets(part, cps);
    let prompt = buildTranslationPrompt(lines, lang, ctx);
    if (retell) prompt = `MODE: RETELL — this is a movie-recap narration, not a literal subtitle translation. Retell each numbered line in ${lang} as an engaging third-person recap narrator would say it: say who does what, keep the story flowing naturally from one line to the next, and use storyteller wording instead of word-for-word subtitles. Keep exactly one output string per input line, in the same order and count (never merge, split or skip lines), keep each line about as long to speak as its source line so it fits the timing, and do not invent plot facts. Everything else below (names, JSON-only output, formatting) still applies, and where it says "subtitle style" this retell style takes priority.\n\n` + prompt;
    return prompt;
  }
  [['#rsCpTr', false, 'Translate prompt'], ['#rsCpRt', true, 'Retell prompt']].forEach(([id, retell, label]) => run(id, async () => {
    const prompt = buildManualPrompt(retell), ok = await copyText(prompt), box = $('#rsPrompt'), btn = $(id);
    if (ok) { box.hidden = true; btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = label; }, 1600); log('✓ Prompt copy လုပ်ပြီး (' + (retell ? 'Retell' : 'Translate') + ', ' + prompt.length + ' စာလုံး) — ChatGPT/Gemini မှာ paste လုပ်ပါ'); }
    else { box.value = prompt; box.hidden = false; box.focus(); box.select(); log('⚠ Auto copy မရပါ — အောက်က box ထဲက စာကို ရွေးပြီး ကိုယ်တိုင် copy လုပ်ပါ'); }
  }));

  // Accepts a JSON array of strings (what the prompt asks for), an object holding such an array, an array of
  // {id,text}-style objects, or a plain numbered list — whatever the other AI happened to return.
  function parseImported(raw) {
    let t = String(raw).trim().replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim(); t = t.replace(/[\u201c\u201d]/g, '"');
    let arr = null;
    try { const j = JSON.parse(t); arr = Array.isArray(j) ? j : Object.values(j).find(Array.isArray) || null; } catch (e) { /* try the next way */ }
    if (!arr) { try { arr = extractJsonArray(t); } catch (e) { /* try numbered lines */ } }
    if (!arr) { const nl = t.split(/\r?\n/).map(x => x.match(/^\s*(\d+)\s*[.)\]:-]\s*(.+)$/)).filter(Boolean); if (nl.length) arr = nl.map(m => m[2].trim().replace(/^"|",?$/g, '')); }
    if (!arr) throw new Error('JSON ဖတ်မရပါ — [ ] ထဲက စာတန်းတွေပါတဲ့ JSON array ကို paste လုပ်ပါ');
    const pick = x => typeof x === 'string' ? x : x && typeof x === 'object' ? String(x.text ?? x.translation ?? x.translatedText ?? x.t ?? x.output ?? '') : String(x ?? '');
    if (arr.length && arr.every(x => x && typeof x === 'object')) { // objects carrying their own number -> order by it
      const idk = ['id', 'n', 'no', 'num', 'index'].find(k => arr.every(x => Number.isFinite(+x[k])));
      if (idk) arr = arr.slice().sort((x, y) => x[idk] - y[idk]);
    }
    return arr.map(pick);
  }
  run('#rsImport', async () => {
    if (!ST.subs.length) throw new Error('Transcription အရင်လုပ်ပါ (Step 2)');
    const items = parseImported($('#rsPaste').value), [a, b] = partRange(), need = b - a;
    let from = a, count = need;
    if (items.length === ST.subs.length && ST.subs.length !== need) { from = 0; count = ST.subs.length; } // whole file pasted while a part is selected
    else if (items.length !== need) throw new Error(`စာကြောင်းရေ မကိုက်ပါ — ပါလာတာ ${items.length} ကြောင်း၊ လိုတာ ${need} ကြောင်း (Part ရွေးထားတာ မှန်လား စစ်ပါ)`);
    items.slice(0, count).forEach((t, i) => { ST.subs[from + i].translatedText = applyGlossary(String(t).trim()); });
    const empty = items.filter(t => !String(t).trim()).length;
    renderSegs(); mark(3); $('#rsPaste').value = ''; $('#rsImport').disabled = true;
    log(`✓ Import ပြီး — ${count} ကြောင်း${empty ? ' (ဗလာ ' + empty + ' ကြောင်း ပါတယ်)' : ''}` + (ST.subs.some(x => !(x.translatedText || '').trim()) ? ' · ကျန်တဲ့ Part တွေကိုလည်း ဆက်လုပ်ပါ' : ' · စာကို ပြင်လို့ရပါတယ်'));
  });
  setMode(safeLsGet('neoyangon_recap_tl_mode') === 'manual' ? 'manual' : 'auto');

  // ---- Nara (free, runs in the phone's browser): voice picker sheet like the reference app ----
  // Tabs  [Voice Over | Nara]  ->  card "Thazin · Speed 1.2x · Offline"  ->  bottom sheet "Select Nara voice":
  // each voice has Download / (Play sample + Delete once downloaded), a Speed slider, Close / Select.
  const spEl = document.getElementById('speedSlider');
  const NARA_IDS = ['shoon', 'thazin', 'ko-banyar', 'htet-myat'], NT = () => window.NaraTTS;
  const naraSel = $('#rsNara'), setNaraSt = (m, p) => { $('#rsNaraSt').textContent = m || ''; if (typeof p === 'number') bar(p / 100); };
  const spTxt = () => (+spEl.value || 1).toFixed(1) + 'x';
  let naraOn = NARA_IDS.includes(safeLsGet('neoyangon_recap_nara'));
  let naraPick = NARA_IDS.includes(safeLsGet('neoyangon_recap_nara_pick')) ? safeLsGet('neoyangon_recap_nara_pick') : (naraOn ? safeLsGet('neoyangon_recap_nara') : '');
  async function naraStatus() {
    const v = naraSel.value; if (!v) return '';
    if (!NT()) return '⚠ nara.js မတွေ့ပါ';
    return (await NT().isCached(v)) ? '✓ ' + NT().nameOf(v) + ' ဖုန်းထဲမှာ ရှိပြီး (ပြန်မဒေါင်းရ)' : NT().nameOf(v) + ' — မဒေါင်းရသေးပါ (~' + NT().sizeMB + ' MB၊ တစ်ခါပဲ)';
  }
  async function paintNara() {
    $$('#nvSeg span').forEach(x => x.classList.toggle('on', (x.dataset.m === 'nara') === naraOn));
    $('#nvBox').hidden = !naraOn;
    $('#nvName').textContent = naraPick && NT() ? NT().nameOf(naraPick) : 'Nara voice ရွေးပါ';
    let sub = 'နှိပ်ပြီး ရွေးပါ';
    if (!NT()) sub = '⚠ nara.js မတွေ့ပါ';
    else if (naraPick) sub = 'Speed ' + spTxt() + ' · ' + ((await NT().isCached(naraPick)) ? 'Offline' : 'မဒေါင်းရသေးပါ');
    $('#nvSub').textContent = sub; setNaraSt(await naraStatus());
  }
  function applyNara() {
    naraSel.value = naraOn && naraPick ? naraPick : '';
    safeLsSet('neoyangon_recap_nara', naraSel.value); safeLsSet('neoyangon_recap_nara_pick', naraPick); paintNara();
  }
  const sheet = document.createElement('div'); sheet.id = 'nvSheet'; sheet.hidden = true;
  sheet.innerHTML = `<div class="nv-box"><h3>Select Nara voice</h3><div id="nvList" class="nv-list"></div>
    <label class="nv-speed"><span>Speed</span><b id="nvSpV"></b><input id="nvSp" type="range" min="0.5" max="2" step="0.1"></label>
    <p class="nv-msg" id="nvMsg"></p>
    <div class="nv-btns"><button type="button" id="nvClose">Close</button><button type="button" id="nvSelect" class="pri">Select</button></div></div>`;
  document.body.appendChild(sheet);
  const sq = s => sheet.querySelector(s), nvMsg = m => { sq('#nvMsg').textContent = m || ''; };
  let nvSel = naraPick || 'shoon', nvBusy = false, nvPlay = null; const dlState = {};
  async function nvRender() {
    if (!NT()) { sq('#nvList').innerHTML = '<p class="nv-msg">⚠ nara.js မတွေ့ပါ</p>'; return; }
    const rows = [];
    for (const id of NARA_IDS) {
      const ok = await NT().isCached(id), p = dlState[id], dl = p !== undefined;
      const act = dl ? `<span class="nv-pct">${p}%</span>`
        : ok ? '<button type="button" class="nv-b" data-a="pv" aria-label="Play sample"><i class="fa-solid fa-play"></i></button><button type="button" class="nv-b dng" data-a="rm" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>'
          : '<button type="button" class="nv-b" data-a="dl" aria-label="Download"><i class="fa-solid fa-download"></i></button>';
      rows.push(`<div class="nv-row${id === nvSel ? ' on' : ''}${ok ? ' ok' : ''}" data-v="${id}" tabindex="0"><span class="nv-chk">${ok ? '<i class="fa-solid fa-check"></i>' : ''}</span>
        <div class="nv-in"><b>${NT().nameOf(id)}</b><small>${dl ? 'ဒေါင်းနေသည်...' : ok ? 'Downloaded · ' + NT().sizeMB + ' MB' : NT().sizeMB + ' MB'}</small>${dl ? `<span class="nv-pb"><span style="width:${p}%"></span></span>` : ''}</div><span class="nv-act">${act}</span></div>`);
    }
    sq('#nvList').innerHTML = rows.join('');
  }
  function nvProgress(id, m, p) {
    dlState[id] = p; nvMsg(m); const row = sq('.nv-row[data-v="' + id + '"]'); if (!row) return;
    const a = row.querySelector('.nv-pct'), b = row.querySelector('.nv-pb span'); if (a) a.textContent = p + '%'; if (b) b.style.width = p + '%';
    bar(p / 100);
  }
  async function nvDownload(id) {
    if (nvBusy || dlState[id] !== undefined) return; dlState[id] = 0; nvRender();
    try { await NT().download(id, (m, p) => nvProgress(id, m, p)); nvMsg('✓ ' + NT().nameOf(id) + ' ဒေါင်းပြီး — Play နဲ့ နမူနာ နားထောင်နိုင်ပါပြီ'); log('✓ Nara ' + NT().nameOf(id) + ' ဒေါင်းပြီး'); }
    catch (e) { nvMsg('✗ ' + e.message); log('✗ ' + e.message); }
    finally { delete dlState[id]; bar(0); nvRender(); paintNara(); }
  }
  function nvStop() { if (nvPlay) { try { nvPlay.src.stop(); } catch (e) { /* already stopped */ } try { nvPlay.ctx.close(); } catch (e) { /* closed */ } nvPlay = null; } }
  async function nvPreview(id) {
    if (nvBusy) return; nvBusy = true; nvStop();
    try {
      const { pcmBuffer, sampleRate } = await NT().preview(id, m => nvMsg(m)), i16 = new Int16Array(pcmBuffer), f = new Float32Array(i16.length);
      for (let k = 0; k < i16.length; k++) f[k] = i16[k] / 32768;
      const ctx = new (window.AudioContext || window.webkitAudioContext)(), buf = ctx.createBuffer(1, f.length, sampleRate); buf.copyToChannel(f, 0);
      const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = +spEl.value || 1; src.connect(ctx.destination); src.onended = () => { nvMsg(''); }; src.start(); nvPlay = { src, ctx }; nvMsg('▶ ' + NT().nameOf(id) + ' နမူနာ');
    } catch (e) { nvMsg('✗ ' + e.message); log('✗ ' + e.message); } finally { nvBusy = false; }
  }
  function openSheet() { nvSel = naraPick || nvSel || 'shoon'; sq('#nvSp').value = spEl.value; sq('#nvSpV').textContent = spTxt(); nvMsg(''); sheet.hidden = false; nvRender(); }
  function closeSheet() { sheet.hidden = true; nvStop(); }
  sheet.addEventListener('click', async e => {
    if (e.target === sheet) return closeSheet();
    const row = e.target.closest('.nv-row'); if (!row) return; const id = row.dataset.v, b = e.target.closest('[data-a]');
    if (b) {
      if (b.dataset.a === 'dl') return nvDownload(id);
      if (b.dataset.a === 'pv') return nvPreview(id);
      if (b.dataset.a === 'rm') { if (!confirm(NT().nameOf(id) + ' ကို ဖုန်းထဲက ဖျက်မလား?')) return; nvStop(); await NT().remove(id); log('Nara ' + NT().nameOf(id) + ' ကို ဖုန်းထဲက ဖျက်ပြီး'); nvMsg(''); await nvRender(); return paintNara(); }
    }
    nvSel = id; nvRender();
  });
  sq('#nvSp').addEventListener('input', () => { spEl.value = sq('#nvSp').value; spEl.dispatchEvent(new Event('input', { bubbles: true })); spEl.dispatchEvent(new Event('change', { bubbles: true })); sq('#nvSpV').textContent = spTxt(); paintNara(); });
  sq('#nvClose').addEventListener('click', closeSheet);
  sq('#nvSelect').addEventListener('click', () => { naraPick = nvSel; naraOn = true; applyNara(); closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
  $$('#nvSeg span').forEach(x => click(x, () => { naraOn = x.dataset.m === 'nara'; applyNara(); if (naraOn && !naraPick) openSheet(); }));
  $('#nvCard').addEventListener('click', openSheet);
  spEl.addEventListener('input', () => { if (!sheet.hidden) { sq('#nvSp').value = spEl.value; sq('#nvSpV').textContent = spTxt(); } paintNara(); });
  run('#rsNaraEng', async () => { setNaraSt('Engine စစ်နေသည်...'); const s = await NT().checkEngine(setNaraSt); setNaraSt('✓ Engine အဆင်ပြေ (' + s + ')'); log('✓ Nara engine OK · ' + s); });
  $('#rsStop').addEventListener('click', () => { ttsAborted = true; log('ရပ်နေသည်...'); });
  new MutationObserver(() => { const dis = $('#rsVo').disabled; $('#rsStop').hidden = !dis; $('#rsGen').hidden = !dis; $('#rsVo').hidden = dis; }).observe($('#rsVo'), { attributes: true, attributeFilter: ['disabled'] });
  applyNara();

  // ---- Voice Over page extras (like the reference app): progress card, player card, Regenerate, Choose Final Voice ----
  const mm = n => String(n).replace(/\d/g, d => '၀၁၂၃၄၅၆၇၈၉'[d]);
  const genSet = (st, done, total, line) => { $('#rsGenSt').textContent = st; $('#rsGenBar').style.width = (total ? Math.round(done / total * 100) : 0) + '%'; $('#rsGenLine').textContent = line || ''; $('#rsGenCnt').textContent = done + ' / ' + total + ' segments'; };
  const plAu = $('#rsAudio'), voResults = []; let finalIdx = -1, finPlay = null;
  const tm = t => fmtT(isFinite(t) ? t : 0);
  const plPaint = () => {
    const d = isFinite(plAu.duration) ? plAu.duration : 0, c = plAu.currentTime || 0;
    $('#rsPlName').textContent = ST.voLabel || 'Voice over'; $('#rsPlSub').textContent = (ST.cues ? ST.cues.length : 0) + ' segments · ' + tm(c);
    $('#rsPlSeek').value = d ? Math.round(c / d * 1000) : 0; $('#rsPlCur').textContent = tm(c); $('#rsPlDur').textContent = tm(d);
    $('#rsPl i').className = 'fa-solid ' + (plAu.paused ? 'fa-play' : 'fa-pause');
  };
  ['timeupdate', 'durationchange', 'play', 'pause', 'ended'].forEach(ev => plAu.addEventListener(ev, plPaint));
  plAu.addEventListener('loadedmetadata', () => { $('#rsPlayer').hidden = false; plPaint(); });
  $('#rsPl').addEventListener('click', () => { if (!plAu.src) return; if (plAu.paused) plAu.play().catch(() => { /* needs a tap first */ }); else plAu.pause(); });
  $('#rsPlSeek').addEventListener('input', () => { const d = plAu.duration; if (isFinite(d) && d) plAu.currentTime = $('#rsPlSeek').value / 1000 * d; });
  const setVoLinks = (wav, srtBlob) => { const links = $('#rsVoLinks'); links.innerHTML = ''; dlBtn(links, 'WAV ဒေါင်းလုဒ်', () => wav, 'voiceover.wav'); dlBtn(links, 'SRT ဒေါင်းလုဒ်', () => srtBlob, 'translated.srt'); };
  const paintFinal = () => { const b = $('#rsFinal'); b.hidden = !voResults.length; b.textContent = finalIdx >= 0 && voResults[finalIdx] ? '✓ Final Voice: ' + voResults[finalIdx].label : 'Choose Final Voice'; };
  function stopFin() { if (finPlay) { try { finPlay.pause(); URL.revokeObjectURL(finPlay.src); } catch (e) { /* already gone */ } finPlay = null; } }
  function renderFinal() {
    const box = $('#rsFinalBox'); box.innerHTML = '';
    const h = document.createElement('div'); h.className = 'vo-fh'; h.innerHTML = '<b>Choose Final Voice</b><small></small>'; h.querySelector('small').textContent = voResults.length + ' voices available'; box.appendChild(h);
    voResults.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'vo-fr' + (i === finalIdx ? ' on' : '');
      row.innerHTML = '<span class="vo-rad"></span><div class="vo-fi"><b></b><small></small></div><button type="button" class="vo-fp" aria-label="Play"><i class="fa-solid fa-play"></i></button><button type="button" class="vo-fs">Select</button>';
      row.querySelector('b').textContent = r.label; row.querySelector('small').textContent = r.sub;
      row.querySelector('.vo-fp').addEventListener('click', () => { stopFin(); const a = new Audio(URL.createObjectURL(r.wav)); finPlay = a; a.play().catch(() => { /* needs a tap first */ }); });
      row.querySelector('.vo-fs').addEventListener('click', () => chooseFinal(i));
      box.appendChild(row);
    });
  }
  async function chooseFinal(i) {
    const r = voResults[i]; if (!r) return; stopFin();
    if (i !== finalIdx) {
      try { const ac = new (window.AudioContext || window.webkitAudioContext)(); ST.mixed = await ac.decodeAudioData(await r.wav.arrayBuffer()); ac.close(); } catch (e) { return log('⚠ အသံ ပြန်ဖွင့်မရပါ: ' + e.message); }
      ST.cues = r.cues; ST.plan = r.plan; ST.voLabel = r.label;
      if (ST.voUrl) URL.revokeObjectURL(ST.voUrl); ST.voUrl = URL.createObjectURL(r.wav); plAu.src = ST.voUrl;
      setVoLinks(r.wav, r.srt); finalIdx = i; refreshList(); log('✓ Final voice: ' + r.label);
    }
    paintFinal(); $('#rsFinalBox').hidden = true;
  }
  $('#rsFinal').addEventListener('click', () => { const box = $('#rsFinalBox'); if (box.hidden) renderFinal(); else stopFin(); box.hidden = !box.hidden; });
  // called when a voice-over finished: keep it in the "Choose Final Voice" list (last 3), show status + Regenerate
  function voDone(label, sub, wav, srtBlob) {
    ST.voLabel = label; voResults.push({ label, sub, wav, srt: srtBlob, cues: ST.cues, plan: ST.plan }); while (voResults.length > 3) voResults.shift();
    finalIdx = voResults.length - 1; paintFinal(); $('#rsFinalBox').hidden = true;
    const s = Math.round(ST.mixed.duration), m = Math.floor(s / 60);
    $('#rsVoDone').textContent = 'ပြီးပါပြီ · line ' + mm(ST.cues.length) + ' ကြောင်း · ' + (m ? mm(m) + ' မိနစ် ' : '') + mm(s % 60) + ' စက္ကန့်';
    $('#rsVo').innerHTML = '<i class="fa-solid fa-play"></i> Regenerate'; plPaint();
  }

  // ---- 4 Voice Over: Text→Speech tab's voice (Edge Thiha/Nilar or Gemini) and settings ----
  run('#rsVo', async () => {
    const subs = ST.subs, total = subs.length;
    if (!total || subs.every(s => !(s.translatedText || '').trim())) return log('⚠ ဘာသာပြန်အရင်လုပ်ပါ (Step 3)');
    readTtsSettings(); const nara = $('#rsNara').value, voice = voiceSelect.value, edge = !nara && String(voice).startsWith('edge:');
    if (nara) { if (!window.NaraTTS) return log('⚠ nara.js မတွေ့ပါ'); } // free in-browser voice: no key / worker needed
    else if (edge) { if (!/^https?:\/\//.test(safeLsGet(LS_EDGE_URL) || '')) return log('⚠ Edge Worker URL ထည့်ပါ (အပေါ်ကနေရာမှာ)'); } else if (!getKeys().length) return log('⚠ Gemini key မရှိပါ');
    ttsAborted = false; const speed = +speedSlider.value || 1, pause = +$('[data-k="pause"]').value;
    const natural = $('[data-k="natural"]').value === '1', warm = $('[data-k="warm"]').value === '1', pitch = +$('[data-k="vpitch"]').value || 0;
    // Edge voices: speed + pitch go to Microsoft's own prosody (keeps the voice natural, no chipmunk effect).
    // Gemini voices have no such setting, so they keep the old playbackRate speed-up.
    const edgeRate = edge ? clamp(Math.round((speed - 1) * 100), -50, 100) : 0, rate = edge ? 1 : speed;
    if (typeof setEdgeProsody === 'function') setEdgeProsody(edgeRate, edge ? pitch : 0);
    log(edge ? `Speed: ${speed.toFixed(1)}x (Edge rate ${edgeRate >= 0 ? '+' : ''}${edgeRate}%) · Pitch ${pitch >= 0 ? '+' : ''}${pitch}Hz` : 'Speed: ' + speed.toFixed(1) + 'x');
    // Natural mode: neighbouring short cues are read as ONE phrase, so the intonation flows like a person talking
    // instead of every 1-2 second cue starting and ending flat. Timing is shared back to the cues by length.
    const items = []; subs.forEach(s => { const t = (s.translatedText || '').trim(); if (t) items.push({ t, tm: srtCueTimes(s), n: Math.max(1, countReadableChars(t)) }); });
    const groups = [];
    items.forEach(it => {
      const g = groups[groups.length - 1];
      if (natural && g && it.tm && g.last.tm && it.tm.start - g.last.tm.end < 1.2 && g.chars + it.t.length + 1 <= 160 && g.items.length < 6) { g.items.push(it); g.chars += it.t.length + 1; g.last = it; }
      else groups.push({ items: [it], chars: it.t.length, last: it });
    });
    const gText = g => { const t = g.items.map(x => x.t).join(' '); return natural && !/[။၊.!?]$/.test(t) ? t + '။' : t; };
    // trims the silence Edge adds around each clip and fades the edges, so clips join without clicks
    const prepClip = (f, sr) => {
      let a = 0, b = f.length - 1; while (a < b && Math.abs(f[a]) < 0.012) a++; while (b > a && Math.abs(f[b]) < 0.012) b--;
      a = Math.max(0, a - Math.round(sr * 0.03)); b = Math.min(f.length - 1, b + Math.round(sr * 0.06));
      const o = f.slice(a, b + 1), fi = Math.round(sr * 0.012), fo = Math.round(sr * 0.04);
      for (let i = 0; i < fi && i < o.length; i++) o[i] *= i / fi;
      for (let i = 0; i < fo && i < o.length; i++) o[o.length - 1 - i] *= i / fo;
      return { f: o, sr };
    };
    const clips = new Array(groups.length).fill(null); let next = 0, done = 0, tNara = Date.now();
    async function worker() {
      for (;;) {
        const i = next++; if (i >= groups.length || ttsAborted) return;
        genSet('Generating', done, groups.length, 'Speaking line ' + (i + 1));
        try {
          const { pcmBuffer, sampleRate } = await (nara ? NaraTTS.synth(gText(groups[i])) : synthesizeChunk(gText(groups[i]), voice));
          const i16 = new Int16Array(pcmBuffer, 0, pcmBuffer.byteLength >> 1), f = new Float32Array(i16.length);
          for (let k = 0; k < i16.length; k++) f[k] = i16[k] / 32768; clips[i] = natural ? prepClip(f, sampleRate) : { f, sr: sampleRate };
        } catch (e) { log(`အပိုင်း ${i + 1} အသံ မထွက်: ${e.message}`); }
        done++; bar(done / groups.length * 0.8);
        genSet('Generating', done, groups.length, done < groups.length ? 'Speaking line ' + (done + 1) + (nara ? ' · ကျန်ခန့် ' + Math.max(1, Math.round((Date.now() - tNara) / done * (groups.length - done) / 60000)) + ' မိနစ်' : '') : 'Mixing...');
        if (nara && (done === 1 || done % 5 === 0) && done < groups.length) { const left = (Date.now() - tNara) / done * (groups.length - done) / 60000; log('Nara: ' + done + '/' + groups.length + ' · ကျန်ခန့် ' + (left < 1 ? '<1' : Math.round(left)) + ' မိနစ်'); }
      }
    }
    genSet('Preparing', 0, groups.length, nara ? 'Nara voice ပြင်ဆင်နေသည်...' : '');
    if (nara) { await NaraTTS.prepare(nara, setNaraSt); setNaraSt(await naraStatus()); tNara = Date.now(); }
    genSet('Generating', 0, groups.length, 'Speaking line 1');
    log('အသံထုတ်နေသည်... (' + (nara ? 'Nara · ' + $('#rsNara').selectedOptions[0].text : voiceSelect.selectedOptions[0].text) + ') · ' + groups.length + ' အပိုင်း' + (natural ? ' (ဆက်ဖတ်)' : ''));
    await Promise.all(Array.from({ length: Math.min(nara ? 1 : TTS_WORKERS, groups.length) }, worker));
    if (typeof setEdgeProsody === 'function') setEdgeProsody(0, 0);
    if (ttsAborted) return log('ရပ်လိုက်သည်');
    let cursor = 0; const place = []; ST.cues = []; ST.plan = [];
    groups.forEach((g, gi) => {
      const c = clips[gi]; if (!c) return;
      const gLen = c.f.length / c.sr / rate, tot = g.items.reduce((n, x) => n + x.n, 0); let off = 0;
      place.push({ c, start: cursor });
      g.items.forEach(it => {
        const len = gLen * it.n / tot, prev = ST.plan.length ? ST.plan[ST.plan.length - 1].vb : 0, va = it.tm ? it.tm.start : prev, vb = it.tm ? it.tm.end : va + len;
        ST.cues.push({ a: cursor + off, b: cursor + off + len, text: it.t }); ST.plan.push({ o: cursor + off, len, va, vb }); off += len;
      });
      cursor += gLen + pause;
    });
    const SR = 24000, secs = cursor + 1; if (secs > 3600) log('⚠ ၁ နာရီထက် ရှည်ရင် ဖုန်း memory မလောက်နိုင်ပါ');
    const oc = new OfflineAudioContext(1, Math.ceil(secs * SR), SR);
    let tail = oc.destination; // "warm" = a little low-end body, softer digital sibilance, gentle compression
    if (warm) {
      const lo = oc.createBiquadFilter(), hi = oc.createBiquadFilter(), cp = oc.createDynamicsCompressor(), mk = oc.createGain();
      lo.type = 'lowshelf'; lo.frequency.value = 180; lo.gain.value = 2.5; hi.type = 'highshelf'; hi.frequency.value = 6500; hi.gain.value = -3;
      cp.threshold.value = -24; cp.ratio.value = 3; cp.attack.value = 0.01; cp.release.value = 0.2; mk.gain.value = 1.25;
      lo.connect(hi); hi.connect(cp); cp.connect(mk); mk.connect(oc.destination); tail = lo;
    }
    place.forEach(({ c, start }) => { const b = oc.createBuffer(1, c.f.length, c.sr); b.copyToChannel(c.f, 0); const s = oc.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; s.connect(tail); s.start(start); });
    ST.mixed = await oc.startRendering(); bar(1);
    const ch = ST.mixed.getChannelData(0), out = new Int16Array(ch.length);
    for (let k = 0; k < ch.length; k++) { const v = clamp(ch[k], -1, 1); out[k] = v < 0 ? v * 32768 : v * 32767; }
    const wav = createWavBlob(out.buffer, SR), srtBlob = new Blob([rebuildSrt(subs, { preserveIndex: true })], { type: 'text/plain;charset=utf-8'});
    if (ST.voUrl) URL.revokeObjectURL(ST.voUrl); ST.voUrl = URL.createObjectURL(wav); const au = $('#rsAudio'); au.src = ST.voUrl; au.hidden = false;
    const links = $('#rsVoLinks'); links.innerHTML = '';
    dlBtn(links, 'WAV ဒေါင်းလုဒ်', () => wav, 'voiceover.wav'); dlBtn(links, 'SRT ဒေါင်းလုဒ်', () => srtBlob, 'translated.srt');
    mark(4); log(`✓ Voice over ပြီး (${place.length}/${groups.length} အပိုင်း) · ${Math.round(cursor)}s`);
    voDone(nara ? $('#rsNara').selectedOptions[0].text : (voiceSelect.selectedOptions[0] || {}).text || 'Voice', (nara ? 'Nara' : edge ? 'Edge' : 'Gemini') + ' · ' + speed.toFixed(1) + 'x', wav, srtBlob);
  });

  // ---- 5 Render settings + painter (shared by preview and final render) ----
  const noise = document.createElement('canvas'); noise.width = noise.height = 256;
  { const g = noise.getContext('2d'), d = g.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }
  const LOOKS = { none: '', warm: 'sepia(.35) saturate(1.2)', cool: 'hue-rotate(-15deg) saturate(1.1)', bw: 'grayscale(1)', vivid: 'saturate(1.6) contrast(1.1)' };
  const filterStr = () => [S.hue ? `hue-rotate(${S.hue}deg)` : '', LOOKS[S.look]].filter(Boolean).join(' ');
  const FONT = "Padauk,'Myanmar Text',Inter,sans-serif";
  // Subtitle fonts. Built-in ones are loaded from the fonts/ folder next to index.html, only when picked.
  // Fonts the user adds from the phone are kept in IndexedDB so they are there next time.
  const FONTS = [
    { id: 'def', name: 'Default (Padauk Bold)' },
    { id: 'padauk', name: 'Padauk', url: 'fonts/padauk.ttf', w: 400 },
    { id: 'padauk-book', name: 'Padauk Book', url: 'fonts/padauk-book.ttf', w: 400 },
    { id: 'padauk-book-bold', name: 'Padauk Book Bold', url: 'fonts/padauk-book-bold.ttf', w: 700 },
    { id: 'noto-ui-bold', name: 'Noto Sans Myanmar UI Bold', url: 'fonts/noto-sans-myanmar-ui-bold.ttf', w: 700 },
    { id: 'phantee', name: 'Phantee Hand Written', url: 'fonts/phantee-handwritten.ttf', w: 400 },
    { id: 'z08', name: 'Z08 Strong Medium', url: 'fonts/z08-strong-medium.ttf', w: 400 },
    { id: 'mymyanmar', name: 'MyMyanmar Universal', url: 'fonts/mymyanmar-universal.ttf', w: 400 },
    { id: 'akkhayar', name: 'Akkhayar Robo', url: 'fonts/akkhayar-robo.ttf', w: 400 }
  ];
  const fontLoads = {}, fontOk = {};
  const fontOf = id => FONTS.find(f => f.id === id);
  function loadFont(id) { // resolves true when the font can be drawn on the canvas
    const f = fontOf(id); if (!f || (!f.url && !f.buf)) return Promise.resolve(true);
    if (!fontLoads[id]) fontLoads[id] = (async () => {
      try { const ff = new FontFace('rsf-' + id, f.buf ? f.buf.slice(0) : `url(${f.url})`, { weight: String(f.w || 400) }); await ff.load(); document.fonts.add(ff); fontOk[id] = true; return true; }
      catch (err) { log('⚠ Font "' + f.name + '" မဖွင့်နိုင်ပါ' + (f.url ? ' — ' + f.url + ' ဖိုင်ကို index.html နားက fonts folder ထဲ တင်ထားပါ' : '')); return false; }
    })();
    return fontLoads[id];
  }
  // font string for the burned-in subtitles; falls back to the default look until the chosen font has loaded
  const fontFor = (id, fs) => { const f = fontOf(id); return f && (f.url || f.buf) && fontOk[f.id] ? `${f.w || 400} ${fs}px "rsf-${f.id}", ${FONT}` : `700 ${fs}px ${FONT}`; };
  const subFont = fs => fontFor(S.subFont, fs);
  const itemFont = (it, fs) => fontFor(it.font || 'def', fs);
  function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function wrap(g, text, maxW) {
    const lines = []; let cur = ''; const mk = /[\u102B-\u103E]/;
    for (const ch of text) { const t = cur + ch;
      if (g.measureText(t).width > maxW && cur && !mk.test(ch)) { const sp = cur.lastIndexOf(' '); if (sp > 0) { lines.push(cur.slice(0, sp)); cur = cur.slice(sp + 1) + ch; } else { lines.push(cur); cur = ch; } } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  function bounds(it, W, H, g) {
    let w, h;
    if (it.type === 'text') { const fs = H * 0.045 * it.size; g.font = itemFont(it, fs); w = g.measureText(it.text).width; h = fs * 1.3; }
    else if (it.type === 'img') { w = W * 0.25 * it.size; h = it.shape === 'circle' ? w : w * it.img.naturalHeight / (it.img.naturalWidth || 1); }
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
      if (it.type === 'img') {
        const iw = it.img.naturalWidth, ih = it.img.naturalHeight;
        g.save();
        if (it.shape === 'circle') { g.beginPath(); g.ellipse(b.x0 + b.w / 2, b.y0 + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2); g.clip(); const m = Math.min(iw, ih); g.drawImage(it.img, (iw - m) / 2, (ih - m) / 2, m, m, b.x0, b.y0, b.w, b.h); }
        else if (it.shape === 'rounded') { rrect(g, b.x0, b.y0, b.w, b.h, Math.min(b.w, b.h) * 0.18); g.clip(); g.drawImage(it.img, b.x0, b.y0, b.w, b.h); }
        else g.drawImage(it.img, b.x0, b.y0, b.w, b.h);
        g.restore();
      }
      else { const fs = H * 0.045 * it.size; g.font = itemFont(it, fs); g.lineWidth = fs / 5; g.strokeStyle = it.color === '#000000' ? '#fff' : '#000'; g.fillStyle = it.color; g.strokeText(it.text, it.x * W, b.y1 - fs * 0.3); g.fillText(it.text, it.x * W, b.y1 - fs * 0.3); }
      g.globalAlpha = 1;
    });
    if (o.sel && S.sel >= 0 && S.items[S.sel]) { const b = bounds(S.items[S.sel], W, H, g); g.save(); g.setLineDash([8, 6]); g.lineWidth = 2; g.strokeStyle = '#ff7a2f'; g.strokeRect(b.x0, b.y0, b.w, b.h); g.restore(); }
    if (o.text) {
      const fs = Math.round(H * (H > W ? 0.03 : 0.042) * S.subSize / 100), lh = fs * 1.35;
      g.font = subFont(fs); g.lineJoin = 'round'; g.lineWidth = fs * S.subStrokeW / 20; g.strokeStyle = S.subStroke; g.fillStyle = S.subColor;
      const lines = wrap(g, o.text, W * 0.9); let y = H * S.subY / 100 - (lines.length - 1) * lh;
      lines.forEach(l => { if (S.subStrokeW > 0) g.strokeText(l, W / 2, y); g.fillText(l, W / 2, y); y += lh; });
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
  const select = i => { S.sel = i; const it = S.items[i]; $('#rsSelBox').hidden = !it; if (it) { $('#rsSelName').textContent = it.type === 'text' ? '“' + it.text + '”' : it.type === 'img' ? 'Photo' : 'Blur box'; $('#rsItSize').value = it.size; $('#rsItOp').value = it.op; $('#rsItOp').disabled = it.type === 'blur'; if (it.type === 'text') txtFontSel.value = it.font || 'def'; if (it.type === 'img') $('#rsShape').value = it.shape || 'rect'; } drawPrev(); };
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
    box.querySelectorAll('.rs-tile').forEach(x => click(x, () => { S[k] = x.dataset.v; paintOn(); drawPrev(); if (k === 'quality') safeLsSet('neoyangon_recap_quality', S.quality); if (k === 'quality' || k === 'size' || k === 'ratio') showQEst(); })); paintOn(); });
  showQEst();
  $$('input[data-k]').forEach(i => { const k = i.dataset.k, lab = $('[data-o="' + k + '"]'), show = () => { if (lab) lab.textContent = i.value + i.dataset.u; };
    i.addEventListener('input', () => { S[k] = +i.value; show(); drawPrev(); }); show(); });
  $$('select[data-k]').forEach(s => s.addEventListener('change', () => { S[s.dataset.k] = s.value; drawPrev(); }));
  $$('[data-reset]').forEach(b => b.addEventListener('click', () => b.dataset.reset.split(',').forEach(k => { const i = $('input[data-k="' + k + '"]'); i.value = k === 'zoom' ? 100 : 0; i.dispatchEvent(new Event('input')); })));
  $$('.rs-dot').forEach(d => d.addEventListener('click', () => { S.color = d.dataset.c; const it = S.items[S.sel]; if (it && it.type === 'text') { it.color = S.color; drawPrev(); } }));
  // ---- subtitle style: font + colours (saved on this phone) ----
  const STYLE_KEY = 'neoyangon_recap_substyle', STYLE_KEYS = ['subFont', 'subColor', 'subStroke', 'subStrokeW', 'subSize', 'subY'];
  let booting = true; // do not overwrite the saved style while it is still being restored
  const saveStyle = () => { if (!booting) safeLsSet(STYLE_KEY, JSON.stringify(Object.fromEntries(STYLE_KEYS.map(k => [k, S[k]])))); };
  const fontSel = $('#rsFont'), txtFontSel = $('#rsTxtFont');
  const buildFontSel = () => {
    fontSel.innerHTML = ''; txtFontSel.innerHTML = '';
    FONTS.forEach(f => { const label = f.name + (f.user ? ' (ကိုယ်ပိုင်)' : ''); [fontSel, txtFontSel].forEach(s => { const o = document.createElement('option'); o.value = f.id; o.textContent = label; s.appendChild(o); }); });
    if (!fontOf(S.subFont)) S.subFont = 'def'; fontSel.value = S.subFont; $('#rsFontDel').hidden = !(fontOf(S.subFont) || {}).user;
    if (!fontOf(S.txtFont)) S.txtFont = 'def'; const cur = S.items[S.sel]; txtFontSel.value = cur && cur.type === 'text' && fontOf(cur.font) ? cur.font : S.txtFont;
  };
  txtFontSel.addEventListener('change', async () => {
    S.txtFont = txtFontSel.value; const it = S.items[S.sel]; if (it && it.type === 'text') it.font = S.txtFont;
    drawPrev(); await loadFont(S.txtFont); drawPrev();
  });
  $('#rsShape').addEventListener('change', e => { S.imgShape = e.target.value; const it = S.items[S.sel]; if (it && it.type === 'img') it.shape = S.imgShape; drawPrev(); });
  const pickFont = async id => { S.subFont = id; buildFontSel(); drawPrev(); await loadFont(id); drawPrev(); saveStyle(); };
  fontSel.addEventListener('change', () => pickFont(fontSel.value));

  const fdb = () => new Promise((res, rej) => { const r = indexedDB.open('neoyangon_recap', 1); r.onupgradeneeded = () => r.result.createObjectStore('fonts', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const fdo = async (mode, fn) => { const db = await fdb(); return new Promise((res, rej) => { const tx = db.transaction('fonts', mode), rq = fn(tx.objectStore('fonts')); tx.oncomplete = () => res(rq && rq.result); tx.onerror = () => rej(tx.error); }); };
  $('#rsFontFile').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    try {
      const buf = await file.arrayBuffer(), id = 'u' + Date.now().toString(36), name = file.name.replace(/\.[^.]+$/, '').slice(0, 40);
      await new FontFace('rsf-test', buf.slice(0)).load(); // throws when it is not a real font file
      FONTS.push({ id, name, buf, w: 400, user: true });
      try { await fdo('readwrite', st => st.put({ id, name, buf })); } catch (err) { log('⚠ Font ကို ဖုန်းထဲ မသိမ်းနိုင်ပါ (ဒီတစ်ခါပဲ သုံးလို့ရမယ်)'); }
      await pickFont(id); log('✓ Font ထည့်ပြီး: ' + name);
    } catch (err) { log('✗ Font ဖိုင် မမှန်ပါ — .ttf / .otf / .woff ဖိုင်ကို ရွေးပါ'); }
  });
  click($('#rsFontDel'), async () => {
    const f = fontOf(S.subFont); if (!f || !f.user) return;
    FONTS.splice(FONTS.indexOf(f), 1); try { await fdo('readwrite', st => st.delete(f.id)); } catch (err) { /* ignore */ }
    await pickFont('def'); log('Font ဖျက်ပြီး: ' + f.name);
  });

  $$('.rs-cd').forEach(box => {
    const k = box.dataset.k, inp = box.querySelector('input'), paint = () => { box.querySelectorAll('span').forEach(x => x.classList.toggle('on', x.dataset.c === S[k])); inp.value = S[k]; };
    const setC = c => { S[k] = c; paint(); drawPrev(); saveStyle(); };
    box.querySelectorAll('span').forEach(x => click(x, () => setC(x.dataset.c)));
    inp.addEventListener('input', () => setC(inp.value)); box._paint = paint; paint();
  });
  ['subStrokeW', 'subSize', 'subY'].forEach(k => $('input[data-k="' + k + '"]').addEventListener('input', saveStyle));
  (() => { // restore the saved style
    let saved = {}; try { saved = JSON.parse(safeLsGet(STYLE_KEY) || '{}') || {}; } catch (err) { /* ignore */ }
    ['subColor', 'subStroke'].forEach(k => { if (typeof saved[k] === 'string') S[k] = saved[k]; });
    const wantFont = typeof saved.subFont === 'string' ? saved.subFont : 'def';
    ['subStrokeW', 'subSize', 'subY'].forEach(k => { const i = $('input[data-k="' + k + '"]'); if (saved[k] !== undefined && Number.isFinite(+saved[k])) { i.value = saved[k]; i.dispatchEvent(new Event('input')); } });
    $$('.rs-cd').forEach(b => b._paint());
    const boot = list => {
      if (!booting) return; (list || []).forEach(r => { if (!fontOf(r.id)) FONTS.push({ id: r.id, name: r.name, buf: r.buf, w: 400, user: true }); });
      if (fontOf(wantFont)) S.subFont = wantFont; booting = false; buildFontSel(); if (S.subFont !== 'def') pickFont(S.subFont);
    };
    fdo('readonly', st => st.getAll()).then(boot).catch(() => boot([])); setTimeout(() => boot([]), 2500);
  })();
  buildFontSel();

  const add = it => { S.items.push(Object.assign({ x: 0.5, y: 0.5, size: 1, op: 1 }, it)); select(S.items.length - 1); };
  $('#rsAddTxt').addEventListener('click', async () => { const t = $('#rsTxt').value.trim(); if (t) { add({ type: 'text', text: t, color: S.color, y: 0.1, font: S.txtFont }); $('#rsTxt').value = ''; await loadFont(S.txtFont); drawPrev(); } });
  $('#rsAddBlur').addEventListener('click', () => add({ type: 'blur', y: 0.9 }));
  $('#rsImg').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => add({ type: 'img', img, size: 0.8, shape: S.imgShape }); img.src = URL.createObjectURL(f); });
  $('#rsItSize').addEventListener('input', e => { if (S.items[S.sel]) { S.items[S.sel].size = +e.target.value; drawPrev(); } });
  $('#rsItOp').addEventListener('input', e => { if (S.items[S.sel]) { S.items[S.sel].op = +e.target.value; drawPrev(); } });
  $('#rsItDel').addEventListener('click', () => { if (S.sel >= 0) { S.items.splice(S.sel, 1); select(-1); } });

  // ---- final render: real-time canvas + MediaRecorder; video follows the narration timeline ----
  run('#rsRender', async () => {
    if (!ST.file) return log('⚠ ဗီဒီယို မရှိပါ (Step 1)'); if (!ST.mixed) return log('⚠ Voice Over အရင်လုပ်ပါ (Step 4)');
    if (typeof MediaRecorder === 'undefined') throw new Error('ဒီ browser မှာ MediaRecorder မရှိပါ (Chrome သုံးပါ)');
    pv.pause(); await loadFont(S.subFont); for (const id of new Set(S.items.filter(x => x.type === 'text').map(x => x.font || 'def'))) await loadFont(id); await document.fonts.ready; const L = { 480: 854, 720: 1280, 1080: 1920 }[S.size], [W, H] = dims(L), BR = vBits(W, H), AB = qOf().ab;
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
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: BR, audioBitsPerSecond: AB } : { videoBitsPerSecond: BR, audioBitsPerSecond: AB });
    log('Quality: ' + S.quality + ' · ' + W + '×' + H + ' · ' + (BR / 1e6).toFixed(1) + ' Mbps'); safeLsSet('neoyangon_recap_quality', S.quality);
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
    const type = rec.mimeType || mime || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm'; let vblob = new Blob(parts, { type: type.split(';')[0] });
    if (!vblob.size) throw new Error('Render ထွက်လာတဲ့ဖိုင် ဗလာဖြစ်နေသည် — ပြန်ကြိုးစားပါ');
    if (ext === 'mp4') { // Chrome's recorder writes a fragmented MP4 -> VN / CapCut read a wrong (very short) duration; rewrite it as a normal MP4
      try { const fixed = await fixMp4(vblob); if (fixed && fixed.size) { vblob = fixed; log('✓ MP4 ကို VN / CapCut ဖတ်လို့ရအောင် ပြင်ပြီး'); } }
      catch (err) { log('⚠ MP4 ပြင်မရပါ (' + ((err && err.message) || err) + ') — မူရင်းဖိုင်ကို သုံးမည်'); }
    } else log('⚠ ဒီ browser က WebM ပဲ ထုတ်ပေးတယ် — VN / CapCut မှာ duration မှားနိုင်ပါတယ် (Chrome ကို update လုပ်ပါ)');
    if (ST.outUrl) URL.revokeObjectURL(ST.outUrl); ST.outUrl = URL.createObjectURL(vblob);
    const out = $('#rsOut'); out.innerHTML = ''; const pvid = document.createElement('video'); pvid.controls = true; pvid.playsInline = true; pvid.src = ST.outUrl; out.appendChild(pvid);
    const lk = document.createElement('div'); lk.className = 'rs-links'; out.appendChild(lk);
    dlBtn(lk, 'ဗီဒီယို ဒေါင်းလုဒ် (.' + ext + ')', () => vblob, 'recap.' + ext);
    dlBtn(lk, 'SRT ဒေါင်းလုဒ်', () => new Blob([rebuildSrt(ST.subs, { preserveIndex: true })], { type: 'text/plain;charset=utf-8' }), 'translated.srt');
    mark(5); log('✓ Render ပြီး');
  });

  // ---- History hooks: save / reopen a project (used by history.js) ----
  window.RecapStudio = {
    async snapshot() {
      if (!ST.file && !ST.subs.length) return null;
      if (!ST.hid) ST.hid = 'recap-' + Date.now();
      try { if (pv.videoWidth) { const c = document.createElement('canvas'); c.width = 320; c.height = Math.round(320 * pv.videoHeight / pv.videoWidth); c.getContext('2d').drawImage(pv, 0, 0, c.width, c.height); ST.thumb = c.toDataURL('image/jpeg', 0.7); } } catch (e) { /* no frame yet */ }
      const blobOf = async u => { try { return u ? await (await fetch(u)).blob() : null; } catch (e) { return null; } };
      const n = Object.keys(ST.done).length;
      return { id: ST.hid, tool: 'recap', title: ST.file ? ST.file.name.replace(/\.[^.]+$/, '') : 'Untitled Project', meta: n + '/5 steps', dur: ST.dur, w: ST.w, h: ST.h, done: { ...ST.done }, thumb: ST.thumb || '',
        subs: JSON.parse(JSON.stringify(ST.subs)), plan: ST.plan, cues: ST.cues, vo: await blobOf(ST.voUrl), out: await blobOf(ST.outUrl),
        src: ST.file && ST.file.size <= 120 * 1048576 ? ST.file : null, srcName: ST.file ? ST.file.name : '' };
    },
    async restore(rec) {
      Object.assign(ST, { subs: rec.subs || [], plan: rec.plan || [], cues: rec.cues || [], done: rec.done || {}, dur: rec.dur || 0, w: rec.w || 0, h: rec.h || 0, hid: rec.id, thumb: rec.thumb, mixed: null });
      if (rec.src) {
        ST.file = new File([rec.src], rec.srcName || 'video.mp4', { type: rec.src.type });
        if (ST.url) URL.revokeObjectURL(ST.url); ST.url = URL.createObjectURL(ST.file);
        const iv = $('#rsInV'); iv.src = ST.url; iv.hidden = false; pv.src = ST.url; pv.load();
        $('#rsChips').innerHTML = [fmtT(ST.dur), `${ST.w}×${ST.h}`, (ST.file.size / 1048576).toFixed(1) + ' MB', 'Audio'].map(x => `<span>${x}</span>`).join('');
      } else { ST.file = null; $('#rsChips').innerHTML = '<span>ဗီဒီယိုဖိုင်ကို မသိမ်းထားပါ — Step 1 မှာ ပြန်ရွေးပါ</span>'; }
      if (rec.vo) {
        if (ST.voUrl) URL.revokeObjectURL(ST.voUrl); ST.voUrl = URL.createObjectURL(rec.vo); const au = $('#rsAudio'); au.src = ST.voUrl; au.hidden = false;
        try { const ac = new (window.AudioContext || window.webkitAudioContext)(); ST.mixed = await ac.decodeAudioData(await rec.vo.arrayBuffer()); ac.close(); } catch (e) { log('⚠ အသံ ပြန်ဖွင့်မရပါ: ' + e.message); }
      }
      if (rec.out) { if (ST.outUrl) URL.revokeObjectURL(ST.outUrl); ST.outUrl = URL.createObjectURL(rec.out); const out = $('#rsOut'); out.innerHTML = ''; const v = document.createElement('video'); v.controls = true; v.playsInline = true; v.src = ST.outUrl; out.appendChild(v); }
      renderSegs(); refreshList(); log('✓ History ကနေ project ပြန်ဖွင့်ပြီး');
    }
  };
})();
