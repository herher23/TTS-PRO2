// History — keeps the results of Media→SRT, SRT ဘာသာပြန်, စာသား→အသံ and AI Recap in THIS browser (IndexedDB).
(function () {
  const DBN = 'neoyangon_history_v1', STORE = 'items';
  const TOOLS = { transcribe: ['Media→SRT', 'fa-microphone-lines'], translate: ['SRT ဘာသာပြန်', 'fa-closed-captioning'], tts: ['စာသား→အသံ', 'fa-wave-square'], recap: ['AI Recap', 'fa-clapperboard'] };
  const KEEP = { transcribe: 40, translate: 40, tts: 25, recap: 8 };
  const dbp = () => new Promise((ok, no) => { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  async function tx(mode, fn) { const db = await dbp(); return new Promise((ok, no) => { const t = db.transaction(STORE, mode), rq = fn(t.objectStore(STORE)); t.oncomplete = () => { db.close(); ok(rq && rq.result); }; t.onerror = t.onabort = () => { db.close(); no(t.error); }; }); }
  const put = r => tx('readwrite', s => s.put(r)), all = () => tx('readonly', s => s.getAll()), get = id => tx('readonly', s => s.get(id)), del = id => tx('readwrite', s => s.delete(id));
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtD = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const cues = srt => (String(srt || '').match(/-->/g) || []).length;
  const plain = srt => String(srt || '').replace(/^\d+\s*$/gm, '').replace(/^.*-->.*$/gm, '').replace(/\n{2,}/g, '\n').trim();

  // ---------- saving ----------
  let asked = false, isOpen = false, tab = 'all', cur = null, urls = [], timer = 0;
  async function add(rec) {
    try {
      if (!asked && navigator.storage && navigator.storage.persist) { asked = true; navigator.storage.persist(); }
      rec.id = rec.id || rec.tool + '-' + Date.now(); rec.ts = Date.now(); await put(rec);
      const mine = (await all()).filter(x => x.tool === rec.tool).sort((a, b) => b.ts - a.ts);
      for (const o of mine.slice(KEEP[rec.tool])) await del(o.id);
      if (isOpen && $('#histList') && !$('#histList').hidden) render();
    } catch (e) { console.warn('History save failed', e); }
  }
  const H = window.History2 = {
    add,
    fromTranscribe(r) { if (r && r.srt) add({ tool: 'transcribe', title: r.sourceFileName || 'Media', text: r.srt, meta: `${cues(r.srt)} cues${r.provider ? ' · ' + r.provider : ''}` }); },
    fromTranslate() { const t = srtOutput.value; if (t) add({ tool: 'translate', title: srtOutputFilenameInput.value.trim() || 'translated', text: t, meta: `${targetLangSelect.value} · ${cues(t)} cues` }); },
    fromTts(blob, text, voice) { if (blob) add({ tool: 'tts', title: String(text).trim().slice(0, 40) || 'Speech', text: String(text), blob, meta: `${(voiceSelect.selectedOptions[0] || {}).text || voice} · ${(blob.size / 1048576).toFixed(1)} MB` }); },
    recapDirty() { clearTimeout(timer); timer = setTimeout(async () => { try { const r = window.RecapStudio && await RecapStudio.snapshot(); if (r) add(r); } catch (e) { console.warn(e); } }, 2500); },
    open() { show(); }
  };

  // ---------- page ----------
  const root = document.createElement('div'); root.id = 'histModal'; root.setAttribute('role', 'dialog');
  root.innerHTML = `<div class="hist-sheet"><div class="hist-head"><div id="histBack" class="rs-back" tabindex="0"><i class="fa-solid fa-arrow-left"></i></div><h2 id="histTitle">History</h2></div>
    <div id="histTabs" class="rs-tabs">${[['all', 'All']].concat(Object.entries(TOOLS).map(([k, v]) => [k, v[0]])).map(([k, n]) => `<div class="rs-tab${k === 'all' ? ' on' : ''}" data-f="${k}" tabindex="0">${n}</div>`).join('')}</div>
    <div id="histList"></div><div id="histDetail" hidden></div></div>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);
  const card = r => {
    const [, ic] = TOOLS[r.tool], dt = new Date(r.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const media = r.tool === 'recap'
      ? `<div class="hist-th" style="${r.thumb ? `background-image:url(${r.thumb})` : ''}"><span class="hist-play"><i class="fa-solid fa-play"></i></span>${r.dur ? `<b class="hist-dur">${fmtD(r.dur)}</b>` : ''}</div>`
      : `<div class="hist-tx"><i class="fa-solid ${ic}"></i><p>${esc(plain(r.text).slice(0, 120))}</p></div>`;
    return `<div class="hist-card" data-id="${r.id}">${media}<div class="hist-foot"><div><b>${esc(r.title || 'Untitled Project')}</b><small>${esc(r.meta || '')}${r.meta ? ' · ' : ''}${dt}</small></div><span class="hist-dots" data-menu="1"><i class="fa-solid fa-ellipsis-vertical"></i></span></div>
      <div class="hist-act" hidden><button data-a="open">Open</button><button data-a="dl">Download</button><button data-a="del" class="danger">Delete</button></div></div>`;
  };
  async function render() {
    let list = []; try { list = await all(); } catch (e) { $('#histList').innerHTML = '<div class="hist-empty">History ဖတ်မရပါ: ' + esc(e.message) + '</div>'; return; }
    list = list.filter(r => tab === 'all' || r.tool === tab).sort((a, b) => b.ts - a.ts);
    $('#histList').innerHTML = list.length ? list.map(card).join('') : '<div class="hist-empty">History မရှိသေးပါ — Transcribe / ဘာသာပြန် / အသံထုတ် / Recap လုပ်ပြီးတိုင်း ဒီမှာ အလိုအလျောက် သိမ်းပါတယ်။</div>';
  }
  function show() { isOpen = true; root.classList.add('open'); toList(); }
  function close() { isOpen = false; root.classList.remove('open'); clean(); }
  function toList() { clean(); $('#histDetail').hidden = true; $('#histList').hidden = false; $('#histTabs').hidden = false; $('#histTitle').textContent = 'History'; render(); }
  function clean() { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; cur = null; }
  const url = b => { const u = URL.createObjectURL(b); urls.push(u); return u; };
  function save(blob, name) {
    try { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 120000); }
    catch (e) { alert('Download မရပါ: ' + e.message); }
  }
  const slug = t => String(t || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60);
  const srtBlob = t => new Blob([t], { type: 'text/plain;charset=utf-8' });
  const jump = (tabId, el, text) => { if (el) { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); } close(); const b = document.getElementById(tabId); if (b) b.click(); };

  async function openDetail(id) {
    const r = await get(id); if (!r) return; cur = r;
    $('#histList').hidden = true; $('#histTabs').hidden = true; $('#histTitle').textContent = r.title || 'Untitled Project';
    const d = $('#histDetail'); d.hidden = false; let h = '';
    if (r.tool === 'recap') {
      const nm = ['Video Import', 'Transcription', 'Translation', 'Voice Over', 'Render'], dn = r.done || {};
      h = (r.out ? '<video id="histMedia" controls playsinline></video>' : `<div class="hist-th big" style="${r.thumb ? `background-image:url(${r.thumb})` : ''}"></div>`) +
        '<div class="hist-steps">' + nm.map((n, i) => `<div class="hist-step${dn[i + 1] ? ' ok' : ''}"><span>${dn[i + 1] ? '<i class="fa-solid fa-check"></i>' : i + 1}</span><b>${n}</b><em>${dn[i + 1] ? 'Completed' : 'Pending'}</em></div>`).join('') + '</div>' +
        '<div class="hist-btns"><button data-a="restore">AI Recap မှာ ဆက်လုပ်မည်</button>' + (r.out ? '<button data-a="dlout">ဗီဒီယို ဒေါင်းလုဒ်</button>' : '') + (r.vo ? '<button data-a="dlvo">WAV ဒေါင်းလုဒ်</button>' : '') + (r.subs && r.subs.length ? '<button data-a="dlsrt">SRT ဒေါင်းလုဒ်</button>' : '') + '</div>';
    } else if (r.tool === 'tts') {
      h = '<audio id="histMedia" controls></audio><textarea readonly class="rs-in"></textarea><div class="hist-btns"><button data-a="dlwav">WAV ဒေါင်းလုဒ်</button><button data-a="totts">စာသားကို TTS ထဲ ပြန်ထည့်မည်</button></div>';
    } else {
      h = '<textarea readonly class="rs-in"></textarea><div class="hist-btns"><button data-a="copy">Copy</button><button data-a="dlsrt">SRT ဒေါင်းလုဒ်</button>' +
        (r.tool === 'transcribe' ? '<button data-a="totrans">ဘာသာပြန်ဖို့ ပို့မည်</button>' : '<button data-a="totts">စာသားကို TTS ထဲ ပို့မည်</button>') + '</div>';
    }
    d.innerHTML = h;
    const ta = d.querySelector('textarea'); if (ta) ta.value = r.text || '';
    const m = d.querySelector('#histMedia'); if (m) m.src = url(r.tool === 'tts' ? r.blob : r.out);
  }
  async function act(a, id) {
    const r = cur && cur.id === id ? cur : await get(id); if (!r) return; const n = slug(r.title);
    if (a === 'del') { if (confirm('ဖျက်မလား?')) { await del(id); toList(); } return; }
    if (a === 'open') return openDetail(id);
    if (a === 'dl') { if (r.tool === 'tts') return save(r.blob, n + '.wav'); if (r.tool === 'recap') { if (r.out) return save(r.out, n + '.' + (r.out.type.includes('mp4') ? 'mp4' : 'webm')); if (r.vo) return save(r.vo, n + '.wav'); return openDetail(id); } return save(srtBlob(r.text), n + '.srt'); }
    if (a === 'dlwav') return save(r.blob, n + '.wav');
    if (a === 'dlsrt') return save(srtBlob(r.tool === 'recap' ? rebuildSrt(r.subs, { preserveIndex: true }) : r.text), n + '.srt');
    if (a === 'dlout') return save(r.out, n + '.' + (r.out.type.includes('mp4') ? 'mp4' : 'webm'));
    if (a === 'dlvo') return save(r.vo, n + '.wav');
    if (a === 'copy') { try { await navigator.clipboard.writeText(r.text); } catch (e) { const t = root.querySelector('textarea'); t.select(); document.execCommand('copy'); } return; }
    if (a === 'totrans') return jump('tabTranslatorBtn', srtInput, r.text);
    if (a === 'totts') return jump('tabTtsBtn', textInput, r.tool === 'tts' ? r.text : plain(r.text));
    if (a === 'restore') { if (!window.RecapStudio) return; await RecapStudio.restore(r); close(); const b = document.getElementById('tabRecapBtn'); if (b) b.click(); }
  }
  root.addEventListener('click', e => {
    const f = e.target.closest('[data-f]'); if (f) { tab = f.dataset.f; root.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === f)); return render(); }
    if (e.target.closest('#histBack')) return $('#histDetail').hidden ? close() : toList();
    const b = e.target.closest('[data-a]'), c = e.target.closest('.hist-card');
    if (b) { const id = c ? c.dataset.id : cur && cur.id; return act(b.dataset.a, id); }
    if (e.target.closest('[data-menu]') && c) { const m = c.querySelector('.hist-act'); root.querySelectorAll('.hist-act').forEach(x => { if (x !== m) x.hidden = true; }); m.hidden = !m.hidden; return; }
    if (c) openDetail(c.dataset.id);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) close(); });
  const btn = document.getElementById('openHistoryBtn'); if (btn) btn.addEventListener('click', show);
})();
