// One API-keys page (like Settings > API keys in the app). Same element ids -> script.js keeps working.
(function () {
  const modal = document.getElementById('keyModal');
  if (!modal) return;
  [['keyPanelBody', 'keyModalGemini'], ['transcribeKeyPanelBody', 'keyModalTranscribe']].forEach(([from, to]) => {
    const body = document.getElementById(from), host = document.getElementById(to);
    if (!body || !host) return;
    const card = body.closest('.holo-glass');
    body.classList.remove('hidden');
    host.appendChild(body);
    if (card) card.classList.add('hidden');
  });
  ['transKeyPanelBody', 'recapKeyPanelBody'].forEach(id => {
    const p = document.querySelector('#' + id + ' > p');
    if (p) p.innerHTML = 'Gemini key ကို အပေါ်က <b>API KEYS</b> ခလုတ်မှာ တစ်ခါပဲ ထည့်ရပါတယ်။';
  });

  // Hide long explanatory notes (keep the yellow warning); drop cards left empty.
  document.querySelectorAll('p[class*="text-[10px]"]').forEach(p => {
    if (/text-yellow/.test(p.className)) return;
    p.style.display = 'none';
    const c = p.parentElement;
    if (c && c.classList.contains('holo-glass') && c.children.length === 1) c.style.display = 'none';
  });

  // One row per service: name, status, Add/Replace button that opens that service's key box.
  const services = [['apiKeysInput', 'Gemini', 'Speech · Translate · Recap'], ['gladiaKeysInput', 'Gladia', 'Transcribe'],
                    ['groqKeysInput', 'Groq', 'Transcribe (Whisper)'], ['assemblyaiKeysInput', 'AssemblyAI', 'Transcribe']];
  const rows = document.getElementById('keyRows');
  const count = v => v.split(/[\n,]+/).map(x => x.trim()).filter(Boolean).length;
  const refreshers = [];
  services.forEach(([id, name, sub]) => {
    const ta = document.getElementById(id);
    if (!ta) return;
    const row = document.createElement('div');
    row.className = 'krow';
    row.innerHTML = '<div class="krow-main"><span class="kico"><i class="fa-solid fa-key"></i></span><div class="ktxt"><b>' + name +
      '</b><small></small></div><button type="button" class="kbtn"></button></div><div class="kedit" hidden></div>';
    const edit = row.querySelector('.kedit'), small = row.querySelector('small'), btn = row.querySelector('.kbtn');
    edit.appendChild(ta.parentElement);
    const refresh = () => {
      const n = count(ta.value), open = !edit.hidden;
      small.className = n ? 'ok' : '';
      small.textContent = n ? n + ' key' + (n > 1 ? 's' : '') + ' · ' + sub : 'Not added · ' + sub;
      btn.textContent = open ? 'Close' : (n ? 'Replace' : 'Add');
      btn.className = 'kbtn ' + (n && !open ? 'rep' : open ? 'rep' : 'add');
    };
    btn.addEventListener('click', () => { edit.hidden = !edit.hidden; refresh(); if (!edit.hidden) ta.focus(); });
    ta.addEventListener('input', refresh);
    refreshers.push(refresh);
    rows.appendChild(row);
    refresh();
  });
  const refreshAll = () => refreshers.forEach(f => f());
  window.addEventListener('DOMContentLoaded', () => setTimeout(refreshAll, 0)); // after script.js fills the boxes
  modal.querySelectorAll('button[id^="save"]').forEach(b => b.addEventListener('click', () => setTimeout(refreshAll, 50)));

  const open = () => { refreshAll(); modal.classList.add('open'); document.getElementById('closeKeysBtn').focus(); };
  const close = () => modal.classList.remove('open');
  document.getElementById('openKeysBtn').addEventListener('click', open);
  document.getElementById('closeKeysBtn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.querySelectorAll('nav .tab-btn').forEach(b => b.setAttribute('aria-label', b.textContent.trim()));

  // Watchdog: script.js sets the theme label on start-up; if it never did, say so on screen.
  setTimeout(() => {
    const l = document.getElementById('themeLabel');
    if (l && l.textContent.trim() === 'DARK' && document.documentElement.getAttribute('data-theme') === 'light') {
      let b = document.getElementById('errBanner');
      if (!b) { b = document.createElement('div'); b.id = 'errBanner'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b00020;color:#fff;font:12px/1.4 monospace;padding:8px'; document.body.appendChild(b); }
      b.textContent += 'script.js မစတင်ခဲ့ပါ (start-up မပြီးခဲ့)\n';
    }
  }, 1500);
})();
