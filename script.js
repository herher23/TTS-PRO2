// =============================================================
// NEO-YANGON 2026 TTS ENGINE — script.js
// Multi API Key rotation + Multi TTS Model rotation + Glossary
// =============================================================

// ---- DOM Element Cache ----
const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');
const clearBtn = document.getElementById('clearBtn');
const generateBtn = document.getElementById('generateBtn');
const stopGenerateBtn = document.getElementById('stopGenerateBtn');
const promptBtns = document.querySelectorAll('.prompt-btn');
const voiceSelect = document.getElementById('voiceSelect');
const voiceInfo = document.getElementById('voiceInfo');
const speedSlider = document.getElementById('speedSlider');
const speedVal = document.getElementById('speedVal');
const clarityBoostBtn = document.getElementById('clarityBoostBtn');
const clarityStatus = document.getElementById('clarityStatus');
const spatial3dBtn = document.getElementById('spatial3dBtn');
const spatialStatus = document.getElementById('spatialStatus');

const visualizer = document.getElementById('visualizer');
const visSpectrumBtn = document.getElementById('visSpectrumBtn');
const visWaveBtn = document.getElementById('visWaveBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMainText = document.getElementById('loadingMainText');
const loadingSubText = document.getElementById('loadingSubText');
const chunkProgressBarContainer = document.getElementById('chunkProgressBarContainer');
const chunkProgressBar = document.getElementById('chunkProgressBar');

const audioPlayer = document.getElementById('audioPlayer');
const customControls = document.getElementById('customControls');
const playPauseBtn = document.getElementById('playPauseBtn');
const progressTrack = document.getElementById('progressTrack');
const progressBar = document.getElementById('progressBar');
const timeCurrent = document.getElementById('timeCurrent');
const timeTotal = document.getElementById('timeTotal');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('statusText');

// Key / Model manager DOM
const apiKeysInput = document.getElementById('apiKeysInput');
const modelsInput = document.getElementById('modelsInput');
const saveKeysModelsBtn = document.getElementById('saveKeysModelsBtn');
const saveStatusMsg = document.getElementById('saveStatusMsg');
const keyCountBadge = document.getElementById('keyCountBadge');
const modelBadge = document.getElementById('modelBadge');
const toggleKeyPanelBtn = document.getElementById('toggleKeyPanelBtn');
const keyPanelBody = document.getElementById('keyPanelBody');

// Theme
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeLabel = document.getElementById('themeLabel');

// Glossary
const glossaryEnabledChk = document.getElementById('glossaryEnabledChk');
const glossaryTermInput = document.getElementById('glossaryTermInput');
const glossaryReplInput = document.getElementById('glossaryReplInput');
const glossaryAddBtn = document.getElementById('glossaryAddBtn');
const glossaryList = document.getElementById('glossaryList');
// Translator tab's copy of the Global Memory / Glossary panel — same underlying list
const transGlossaryEnabledChk = document.getElementById('transGlossaryEnabledChk');
const transGlossaryTermInput = document.getElementById('transGlossaryTermInput');
const transGlossaryReplInput = document.getElementById('transGlossaryReplInput');
const transGlossaryAddBtn = document.getElementById('transGlossaryAddBtn');
const transGlossaryList = document.getElementById('transGlossaryList');

// ---- State & Web Audio API Variables ----
let audioCtx;
let analyser;
let audioSource;
let clarityFilterNode;
let reverbWetNode;
let animationFrameId;

let currentAudioBlob = null;
let currentAudioObjectUrl = null; // tracks the last blob: URL handed to audioPlayer.src so we can revoke it (see handleSynthesizeAudio)
let isGenerating = false;
let ttsAborted = false;
let activeTtsControllers = [];
const TTS_CHUNK_TIMEOUT_SEC = 60; // per-chunk network timeout for the TTS engine — previously unbounded (see synthesizeChunk)
let visualizerMode = 'spectrum';
let clarityBoostActive = true;
let cyberReverbActive = false;

// ---- Default TTS Voice Presets ----
const VOICES = [
    { id: "Puck", name: "Puck (Upbeat & Energetic)", detail: "တက်ကြွပြီး ကြည်လင်သော အသံ (Energetic, high clarity)" },
    { id: "Charon", name: "Charon (Informative News)", detail: "သတင်းထုတ်ပြန်ချက်နှင့် တည်ငြိမ်သောအသံ (Clear news tone)" },
    { id: "Kore", name: "Kore (Firm & Direct)", detail: "ပြတ်သားပြီး အာဏာရှိသောအသံ (Direct & authoritative)" },
    { id: "Fenrir", name: "Fenrir (Dynamic Sci-Fi)", detail: "ဆိုက်ဘာပန့်ခ် စတိုင်လ် အားကောင်းသောအသံ (High dynamic range)" },
    { id: "Zephyr", name: "Zephyr (Smooth & Bright)", detail: "ချောမွေ့ပြီး သာယာသော အသံ (Smooth, bright tone)" },
    { id: "Leda", name: "Leda (Youthful & Casual)", detail: "ငယ်ရွယ်ပြီး လွတ်လပ်သော အသံ (Youthful, casual style)" },
    { id: "Aoede", name: "Aoede (Breezy & Warm)", detail: "နွေးထွေးပြီး ငြိမ့်ညောင်းသောအသံ (Relaxed & smooth)" },
    { id: "Algieba", name: "Algieba (Deep Resonant)", detail: "နက်ရှိုင်းပြီး တည်ငြိမ်သော အသံ (Deep, resonant tone)" }
];

// Default model list. gemini-2.5-flash-preview-tts / gemini-2.5-pro-preview-tts are the
// long-standing stable Gemini TTS IDs; gemini-3.1-flash-tts-preview is a newer streaming-
// capable TTS preview model. Model availability/naming can change and depends on what your
// key has access to — add or remove IDs (one per line) in the "TTS Model List" box in the
// UI at any time; rotation works across however many you list. If a model 404s for your
// key, just delete it from the list rather than relying on this default.
const DEFAULT_MODELS = [
    "gemini-2.5-flash-preview-tts",
    "gemini-2.5-pro-preview-tts",
    "gemini-3.1-flash-tts-preview"
];

// =============================================================
// LocalStorage-backed Key / Model / Glossary / Theme managers
// =============================================================
const LS_KEYS = 'neoyangon_gemini_keys';
const LS_KEY_IDX = 'neoyangon_key_idx';
const LS_MODELS = 'neoyangon_tts_models';
const LS_MODEL_IDX = 'neoyangon_model_idx';
const LS_GLOSSARY = 'neoyangon_glossary';
const LS_GLOSSARY_ENABLED = 'neoyangon_glossary_enabled';
const LS_GLOSSARY_WHOLE = 'neoyangon_glossary_wholeword';
const LS_GLOSSARY_CASE = 'neoyangon_glossary_case';
const LS_CONTEXT_MEMORY = 'neoyangon_context_memory';
const LS_CONTEXT_MEMORY_ENABLED = 'neoyangon_context_memory_enabled';
const LS_THEME = 'neoyangon_theme';

function parseListInput(raw) {
    return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

// Safe localStorage helpers — in Safari private-mode / storage-disabled environments,
// every localStorage.getItem/setItem call throws, which previously took down the whole
// DOMContentLoaded init chain with no visible error and left the app completely unusable.
// These wrappers catch that: reads fall back to null (same as a missing key), writes
// silently no-op — the app keeps working for the current session, just without persistence.
function safeLsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeLsSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}

function getKeys() {
    return parseListInput(safeLsGet(LS_KEYS) || '');
}
function getModels() {
    const stored = safeLsGet(LS_MODELS);
    if (stored === null) return DEFAULT_MODELS.slice();
    const list = parseListInput(stored);
    return list.length ? list : DEFAULT_MODELS.slice();
}
function getIndex(key, len) {
    let idx = parseInt(safeLsGet(key) || '0', 10);
    if (isNaN(idx) || len === 0) idx = 0;
    return idx % Math.max(len, 1);
}
function setIndex(key, idx, len) {
    safeLsSet(key, String(len > 0 ? (idx % len) : 0));
}

function updateBadges() {
    const keys = getKeys();
    const models = getModels();
    keyCountBadge.textContent = keys.length;
    const mIdx = getIndex(LS_MODEL_IDX, models.length);
    modelBadge.textContent = models[mIdx] ? models[mIdx].replace('gemini-', '').replace('-preview-tts', '') : '-';
}

function loadKeysModelsIntoInputs() {
    apiKeysInput.value = (safeLsGet(LS_KEYS) || '').split(',').join('\n').trim();
    const storedModels = safeLsGet(LS_MODELS);
    modelsInput.value = storedModels ? parseListInput(storedModels).join('\n') : DEFAULT_MODELS.join('\n');
    updateBadges();
}

saveKeysModelsBtn.addEventListener('click', () => {
    safeLsSet(LS_KEYS, apiKeysInput.value.trim());
    safeLsSet(LS_MODELS, modelsInput.value.trim());
    setIndex(LS_KEY_IDX, 0, getKeys().length);
    setIndex(LS_MODEL_IDX, 0, getModels().length);
    updateBadges();
    saveStatusMsg.textContent = 'သိမ်းပြီးပါပြီ ✓';
    setTimeout(() => { saveStatusMsg.textContent = ''; }, 2500);
});

toggleKeyPanelBtn.addEventListener('click', () => {
    keyPanelBody.classList.toggle('hidden');
    const icon = toggleKeyPanelBtn.querySelector('i');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
});

// =============================================================
// B13: session-level key health, shared by every Gemini picker below.
//  - 401/403 or a "key not valid" 400  -> key is blacklisted for this page session
//  - 429                               -> key sits out for its Retry-After (default 60s)
// next()/advance() skip unhealthy keys. If EVERY key is unhealthy the filter is ignored so the
// app never deadlocks. Detected by watching responses to Gemini requests (no call-site changes).
const keyBlacklist = new Set();
const keyCooldownUntil = new Map();
function isKeyHealthy(key) {
    if (keyBlacklist.has(key)) return false;
    const until = keyCooldownUntil.get(key);
    return !(until && until > Date.now());
}
function pickHealthyKeyIdx(keys, startIdx) {
    for (let d = 0; d < keys.length; d++) {
        const idx = (startIdx + d) % keys.length;
        if (isKeyHealthy(keys[idx])) return idx;
    }
    return startIdx % keys.length;
}
(function installGeminiKeyHealthWatcher() {
    if (typeof window.fetch !== 'function' || window.__keyHealthWatcher) return;
    window.__keyHealthWatcher = true;
    const origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
        const res = await origFetch(input, init);
        try {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            if (url.includes('generativelanguage.googleapis.com')) {
                const m = url.match(/[?&]key=([^&]+)$/) || url.match(/[?&]key=([^&]+)/);
                const key = m ? decodeURIComponent(m[1]) : null;
                if (key) {
                    if (res.status === 401 || res.status === 403) {
                        keyBlacklist.add(key);
                        console.warn(`Gemini key …${key.slice(-4)} → HTTP ${res.status}: ဒီ session အတွက် ဖယ်ထားပါသည်`);
                    } else if (res.status === 429) {
                        const ra = parseFloat(res.headers.get('retry-after'));
                        keyCooldownUntil.set(key, Date.now() + (isFinite(ra) && ra > 0 ? ra * 1000 : 60000));
                    } else if (res.status === 400) {
                        const body = await res.clone().text();
                        if (/API_KEY_INVALID|API key not valid/i.test(body)) keyBlacklist.add(key);
                    }
                }
            }
        } catch (e) { /* health tracking must never break a request */ }
        return res;
    };
})();

// Shared round-robin "key + model" credential picker factory.
// Used by the TTS engine, Translator, AI Timestamp Fix / AI SRT Format, and Recap Studio —
// four tabs that each previously hand-copied an almost-identical next*/advance* pair (5
// copies total counting Transcribe's differently-shaped provider pool). Each tab keeps its
// own model list + model-index localStorage pointer, but all rotate across the same shared
// Gemini API key pool (LS_KEY_IDX). Consolidating here means a fix only has to happen once.
// advance() returns null when the key pool is empty (e.g. cleared mid-run) so callers can
// stop retrying instead of looping on undefined key/model.
function makeGeminiCredentialPicker(modelIdxKey, getModelsFn, noKeyMsg) {
    function next() {
        const keys = getKeys();
        const models = getModelsFn();
        if (keys.length === 0) throw new Error(noKeyMsg);

        const keyIdx = pickHealthyKeyIdx(keys, getIndex(LS_KEY_IDX, keys.length));
        const modelIdx = getIndex(modelIdxKey, models.length);

        // advance pointers for the NEXT call (round-robin across every request)
        setIndex(LS_KEY_IDX, keyIdx + 1, keys.length);
        if (keyIdx + 1 >= keys.length) {
            setIndex(modelIdxKey, modelIdx + 1, models.length);
        }
        updateBadges();

        return { key: keys[keyIdx], model: models[modelIdx], keyIdx, modelIdx, keys, models };
    }

    // Force-advance to a different credential (used after a failed attempt)
    function advance() {
        const keys = getKeys();
        const models = getModelsFn();
        if (keys.length === 0) return null;
        const keyIdx = getIndex(LS_KEY_IDX, keys.length);
        setIndex(LS_KEY_IDX, keyIdx + 1, keys.length);
        if (keyIdx + 1 >= keys.length) {
            const modelIdx = getIndex(modelIdxKey, models.length);
            setIndex(modelIdxKey, modelIdx + 1, models.length);
        }
        const healthyIdx = pickHealthyKeyIdx(keys, getIndex(LS_KEY_IDX, keys.length));
        setIndex(LS_KEY_IDX, healthyIdx, keys.length);
        updateBadges();
        return { key: keys[healthyIdx], model: models[getIndex(modelIdxKey, models.length)] };
    }

    return { next, advance };
}

const ttsCredentialPicker = makeGeminiCredentialPicker(
    LS_MODEL_IDX, getModels,
    'API key မထည့်ရသေးပါ — Key & Model Rotation panel တွင် Gemini API key အနည်းဆုံးတစ်ခု ထည့်ပါ။'
);
function nextCredential() { return ttsCredentialPicker.next(); }
function advanceCredential() { return ttsCredentialPicker.advance(); }

// =============================================================
// Glossary / Global Memory
// =============================================================
function getGlossary() {
    try {
        return JSON.parse(safeLsGet(LS_GLOSSARY) || '[]');
    } catch (e) { return []; }
}
function saveGlossary(list) {
    safeLsSet(LS_GLOSSARY, JSON.stringify(list));
}
function isGlossaryEnabled() {
    return safeLsGet(LS_GLOSSARY_ENABLED) !== 'false';
}

// Global Memory / Glossary is one shared list (LS_GLOSSARY) rendered into every
// glossary-list container present on the page — currently the TTS tab's #glossaryList
// and the Translator tab's #transGlossaryList. Editing from either tab updates both.
let glossaryEditIdx = -1; // row currently shown as two inline input boxes (-1 = none)

function renderGlossary() {
    const list = getGlossary();
    const containers = [glossaryList, transGlossaryList].filter(Boolean);

    containers.forEach(container => {
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = '<p class="text-cyan-600/50 font-mono text-[10px]">စာရင်း ဗလာဖြစ်နေပါသည်။</p>';
            return;
        }
        list.forEach((entry, i) => {
            const row = document.createElement('div');
            row.className = 'glossary-row';

            if (i === glossaryEditIdx) {
                row.style.flexWrap = 'wrap';
                const mkInput = (val, ph) => {
                    const inp = document.createElement('input');
                    inp.type = 'text';
                    inp.value = val || '';
                    inp.placeholder = ph;
                    inp.className = 'flex-1 min-w-0 p-1.5 rounded bg-black/60 border border-yellow-500/40 text-yellow-100 font-burmese text-xs focus:outline-none focus:border-cyan-500/80';
                    return inp;
                };
                const termInp = mkInput(entry.term, 'မူရင်း စကားလုံး');
                const replInp = mkInput(entry.replacement, 'အစားထိုး စကားလုံး');
                const saveBtn = document.createElement('button');
                saveBtn.className = 'glossary-save-btn';
                saveBtn.title = 'Save';
                saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'glossary-cancel-btn';
                cancelBtn.title = 'Cancel';
                cancelBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

                const commit = () => {
                    const t = termInp.value.trim();
                    if (!t) return;
                    const cur = getGlossary();
                    if (!cur[i]) return;
                    cur[i] = { term: t, replacement: replInp.value.trim() };
                    saveGlossary(cur);
                    glossaryEditIdx = -1;
                    renderGlossary();
                };
                const cancel = () => { glossaryEditIdx = -1; renderGlossary(); };
                saveBtn.addEventListener('click', commit);
                cancelBtn.addEventListener('click', cancel);
                [termInp, replInp].forEach(inp => inp.addEventListener('keydown', ev => {
                    if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
                    if (ev.key === 'Escape') cancel();
                }));

                row.append(termInp, replInp, saveBtn, cancelBtn);
                container.appendChild(row);
                return;
            }

            row.innerHTML = `
                <span class="text-yellow-200 truncate">${escapeHtml(entry.term)}</span>
                <i class="fa-solid fa-arrow-right text-cyan-500 text-[10px]"></i>
                <span class="text-cyan-200 truncate flex-1">${escapeHtml(entry.replacement)}</span>
                <button data-idx="${i}" class="glossary-edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button data-idx="${i}" class="glossary-del-btn" title="Delete"><i class="fa-solid fa-xmark"></i></button>
            `;
            container.appendChild(row);
        });
    });

    document.querySelectorAll('.glossary-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            glossaryEditIdx = parseInt(btn.dataset.idx, 10);
            renderGlossary();
        });
    });

    document.querySelectorAll('.glossary-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const list = getGlossary();
            list.splice(idx, 1);
            saveGlossary(list);
            glossaryEditIdx = -1;
            renderGlossary();
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Shared log-line factory — Translator, Transcribe, and Recap Studio each previously
// hand-copied the exact same 6-line function (only the target log-box element differed).
// Bound to a specific box at creation time so call sites (logTrans(msg), etc.) don't change.
function makeLogger(logBoxEl) {
    return function (msg, level) {
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        line.className = level === 'ok' ? 'log-entry-ok' : level === 'warn' ? 'log-entry-warn' : level === 'err' ? 'log-entry-err' : '';
        logBoxEl.appendChild(line);
        logBoxEl.scrollTop = logBoxEl.scrollHeight;
    };
}

glossaryAddBtn.addEventListener('click', () => {
    const term = glossaryTermInput.value.trim();
    const repl = glossaryReplInput.value.trim();
    if (!term || !repl) return;
    const list = getGlossary();
    list.push({ term, replacement: repl });
    saveGlossary(list);
    glossaryTermInput.value = '';
    glossaryReplInput.value = '';
    renderGlossary();
});

glossaryEnabledChk.addEventListener('change', () => {
    safeLsSet(LS_GLOSSARY_ENABLED, glossaryEnabledChk.checked ? 'true' : 'false');
    if (transGlossaryEnabledChk) transGlossaryEnabledChk.checked = glossaryEnabledChk.checked;
});

if (transGlossaryAddBtn) {
    transGlossaryAddBtn.addEventListener('click', () => {
        const term = transGlossaryTermInput.value.trim();
        const repl = transGlossaryReplInput.value.trim();
        if (!term || !repl) return;
        const list = getGlossary();
        list.push({ term, replacement: repl });
        saveGlossary(list);
        transGlossaryTermInput.value = '';
        transGlossaryReplInput.value = '';
        renderGlossary();
    });
}

if (transGlossaryEnabledChk) {
    transGlossaryEnabledChk.addEventListener('change', () => {
        safeLsSet(LS_GLOSSARY_ENABLED, transGlossaryEnabledChk.checked ? 'true' : 'false');
        glossaryEnabledChk.checked = transGlossaryEnabledChk.checked;
    });
}

// Applies every glossary entry as a global (whole-conversation) find/replace pass
function applyGlossary(text) {
    if (!isGlossaryEnabled()) return text;
    const wholeWord = safeLsGet(LS_GLOSSARY_WHOLE) !== 'false';      // default ON
    const caseSensitive = safeLsGet(LS_GLOSSARY_CASE) !== 'false';   // default ON (same as before)
    const flags = caseSensitive ? 'g' : 'gi';
    const isWordCh = ch => /[A-Za-z0-9_]/.test(ch);
    // Longest term first, so a short name ("John") can never break a longer one ("Johnny")
    const list = getGlossary().slice().sort((a, b) => (b.term || '').length - (a.term || '').length);
    let output = text;
    list.forEach(({ term, replacement }) => {
        if (!term) return;
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Whole-word only matters for Latin letters / digits at the edge of the term
        // (Myanmar text has no spaces between words, so Myanmar terms always match plainly).
        const needLeft = wholeWord && isWordCh(term[0]);
        const needRight = wholeWord && isWordCh(term[term.length - 1]);
        if (!needLeft && !needRight) {
            output = output.replace(new RegExp(escaped, flags), () => replacement);
            return;
        }
        const re = new RegExp(`${needLeft ? '(^|[^A-Za-z0-9_])' : '()'}${escaped}${needRight ? '(?![A-Za-z0-9_])' : ''}`, flags);
        output = output.replace(re, (m, pre) => pre + replacement);
    });
    return output;
}

// =============================================================
// Theme Toggle
// =============================================================
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeLabel.textContent = theme === 'dark' ? 'DARK' : 'LIGHT';
    safeLsSet(LS_THEME, theme);
}

themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

// =============================================================
// Init
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
    applyTheme(safeLsGet(LS_THEME) || 'dark');
    initVoices();
    loadKeysModelsIntoInputs();
    renderGlossary();
    glossaryEnabledChk.checked = isGlossaryEnabled();
    if (transGlossaryEnabledChk) transGlossaryEnabledChk.checked = isGlossaryEnabled();
    setupBackgroundCanvas();
    setupCanvasVisualizer();
    setupEventListeners();
    setStatus("SYSTEM READY // STANDBY", "text-emerald-400");
});

function initVoices() {
    voiceSelect.innerHTML = '';
    VOICES.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.name;
        voiceSelect.appendChild(opt);
    });
    updateVoiceInfo();
}

function updateVoiceInfo() {
    const selected = VOICES.find(v => v.id === voiceSelect.value);
    if (selected) {
        voiceInfo.innerHTML = `<i class="fa-solid fa-microchip text-pink-400"></i><span>${selected.detail}</span>`;
    }
}

function setStatus(msg, colorClass) {
    statusText.textContent = msg;
    statusText.className = `${colorClass} font-semibold`;
}

// Animated Background Hologram Grid Canvas
function setupBackgroundCanvas() {
    const bgCanvas = document.getElementById('bgGridCanvas');
    const ctx = bgCanvas.getContext('2d');

    function resizeBg() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    resizeBg();
    window.addEventListener('resize', resizeBg);

    const particles = Array.from({ length: 45 }, () => ({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? 'rgba(0, 243, 255, ' : 'rgba(255, 0, 85, '
    }));

    // Respect prefers-reduced-motion (draw one still frame) and stop animating while the tab is hidden.
    const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    let reduceMotion = motionQuery.matches;
    let rafId = null;

    function drawBg() {
        ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 130) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 243, 255, ${0.12 - dist / 1100})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > bgCanvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > bgCanvas.height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color + '0.6)';
            ctx.fill();
        });

        rafId = (reduceMotion || document.hidden) ? null : requestAnimationFrame(drawBg);
    }
    drawBg();
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && rafId === null && !reduceMotion) drawBg();
    });
    if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', (e) => {
            reduceMotion = e.matches;
            if (!reduceMotion && rafId === null) drawBg();
        });
    }
}

function setupEventListeners() {
    textInput.addEventListener('input', () => {
        charCount.textContent = textInput.value.length;
    });

    clearBtn.addEventListener('click', () => {
        textInput.value = '';
        charCount.textContent = '0';
        textInput.focus();
    });

    promptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            textInput.value = btn.dataset.text;
            charCount.textContent = textInput.value.length;
        });
    });

    voiceSelect.addEventListener('change', updateVoiceInfo);

    speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(1);
        speedVal.textContent = `${val}x`;
        audioPlayer.playbackRate = val;
    });

    clarityBoostBtn.addEventListener('click', () => {
        clarityBoostActive = !clarityBoostActive;
        clarityStatus.textContent = `Clarity Boost: ${clarityBoostActive ? 'ON' : 'OFF'}`;
        clarityBoostBtn.classList.toggle('border-yellow-400', clarityBoostActive);
        if (clarityFilterNode) {
            clarityFilterNode.gain.value = clarityBoostActive ? 3.5 : 0;
        }
    });

    spatial3dBtn.addEventListener('click', () => {
        cyberReverbActive = !cyberReverbActive;
        spatialStatus.textContent = `Cyber Reverb: ${cyberReverbActive ? 'ON' : 'OFF'}`;
        spatial3dBtn.classList.toggle('border-pink-400', cyberReverbActive);
        if (reverbWetNode) reverbWetNode.gain.value = cyberReverbActive ? 0.35 : 0;
    });

    visSpectrumBtn.addEventListener('click', () => {
        visualizerMode = 'spectrum';
        visSpectrumBtn.className = "px-2 py-1 rounded bg-cyan-500 text-black font-bold";
        visWaveBtn.className = "px-2 py-1 rounded bg-black/60 text-cyan-400 border border-cyan-500/30";
    });

    visWaveBtn.addEventListener('click', () => {
        visualizerMode = 'waveform';
        visWaveBtn.className = "px-2 py-1 rounded bg-cyan-500 text-black font-bold";
        visSpectrumBtn.className = "px-2 py-1 rounded bg-black/60 text-cyan-400 border border-cyan-500/30";
    });

    generateBtn.addEventListener('click', handleSynthesizeAudio);

    playPauseBtn.addEventListener('click', togglePlayPause);
    audioPlayer.addEventListener('timeupdate', updateAudioProgress);
    audioPlayer.addEventListener('loadedmetadata', () => {
        timeTotal.textContent = formatTime(audioPlayer.duration);
    });
    audioPlayer.addEventListener('ended', () => {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play ml-0.5 text-base"></i>';
        setStatus("PLAYBACK COMPLETED", "text-emerald-400");
    });

    progressTrack.addEventListener('click', seekAudio);
    downloadBtn.addEventListener('click', downloadWavAudio);

    window.addEventListener('resize', setupCanvasVisualizer);
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function createWavBlob(pcmBuffer, sampleRate = 24000) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.byteLength;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const pcmBytes = new Uint8Array(pcmBuffer);
    const targetBytes = new Uint8Array(buffer, 44);
    targetBytes.set(pcmBytes);

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Smart Text Chunking Algorithm for Long Texts (up to 10000 chars)
function splitTextIntoChunks(text, maxChunkLen = 1200) {
    if (text.length <= maxChunkLen) return [text];

    const chunks = [];
    const sentences = (text.match(/[^။.?!\n]*[။.?!\n]+|[^။.?!\n]+$/g) || [text]).filter(s => s && s.trim().length > 0);

    let currentChunk = "";

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkLen) {
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }
            if (sentence.length > maxChunkLen) {
                let subSentence = sentence;
                while (subSentence.length > maxChunkLen) {
                    let splitIdx = subSentence.lastIndexOf(' ', maxChunkLen);
                    if (splitIdx === -1) splitIdx = maxChunkLen;
                    chunks.push(subSentence.slice(0, splitIdx).trim());
                    subSentence = subSentence.slice(splitIdx).trim();
                }
                currentChunk = subSentence;
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += sentence;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

// Single Chunk TTS Fetching Helper — rotates key/model on failure automatically.
// Previously had no AbortController/timeout at all (unlike every other tab in the app),
// so a single hung request could freeze generation with no way to cancel except a full
// page reload. Now every attempt is time-boxed (TTS_CHUNK_TIMEOUT_SEC) and every in-flight
// controller is tracked in activeTtsControllers so the STOP button can abort them instantly.
async function synthesizeChunk(textChunk, voice) {
    const totalCombos = Math.max(getKeys().length * getModels().length, 1);
    const maxAttempts = Math.min(totalCombos, 12);

    let cred = nextCredential();
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (ttsAborted) throw new Error('Stopped by user');
        const { key, model } = cred;
        const payload = {
            contents: [{ parts: [{ text: textChunk }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice }
                    }
                }
            }
        };

        const apiUrl = `https://vpn2-pro.herher650.workers.dev/?https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        const controller = new AbortController();
        activeTtsControllers.push(controller);
        const timer = setTimeout(() => controller.abort(), TTS_CHUNK_TIMEOUT_SEC * 1000);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timer);

            if (!response.ok) {
                // Rotate away from rate-limited / invalid keys or unavailable models
                if ([400, 401, 403, 404, 429].includes(response.status)) {
                    lastError = new Error(`HTTP ${response.status} (key/model rotated)`);
                    setStatus(`KEY/MODEL FAILED (${response.status}) — ROTATING...`, "text-yellow-400");
                    const next = advanceCredential();
                    if (!next) break;
                    cred = next;
                    if (!ttsAborted) await sleep(retryBackoffMs(attempt));
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

            if (inlineData && inlineData.data) {
                const mime = inlineData.mimeType || '';
                const match = mime.match(/rate=(\d+)/);
                const sampleRate = match ? parseInt(match[1], 10) : 24000;
                const pcmBuffer = base64ToArrayBuffer(inlineData.data);
                return { pcmBuffer, sampleRate };
            } else {
                throw new Error("Invalid voice audio chunk response.");
            }
        } catch (e) {
            clearTimeout(timer);
            if (e.name === 'AbortError') {
                if (ttsAborted) throw new Error('Stopped by user');
                lastError = new Error(`Timeout (${TTS_CHUNK_TIMEOUT_SEC}s)`);
                setStatus(`TIMEOUT (${TTS_CHUNK_TIMEOUT_SEC}s) — ROTATING...`, "text-yellow-400");
            } else {
                lastError = e;
            }
            const next = advanceCredential();
            if (!next) break;
            cred = next;
        } finally {
            activeTtsControllers = activeTtsControllers.filter(c => c !== controller);
        }
        if (!ttsAborted) await sleep(retryBackoffMs(attempt));
    }

    throw lastError || new Error("All API keys/models failed.");
}

// Main Multi-Chunk High-Capacity TTS Synthesis Handler
async function handleSynthesizeAudio() {
    const rawText = textInput.value.trim();
    if (!rawText) {
        setStatus("ERROR: NO TEXT ENTERED // အချက်အလက်မရှိပါ", "text-red-400");
        textInput.focus();
        return;
    }
    if (getKeys().length === 0) {
        setStatus("ERROR: NO API KEY // Key & Model panel တွင် key ထည့်ပါ", "text-red-400");
        return;
    }

    if (isGenerating) return;
    isGenerating = true;
    ttsAborted = false;

    const text = applyGlossary(rawText);
    const voice = voiceSelect.value;
    loadingOverlay.classList.remove('hidden');
    customControls.classList.add('opacity-50', 'pointer-events-none');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>ထုတ်လုပ်နေသည်...';
    if (stopGenerateBtn) stopGenerateBtn.disabled = false;

    setStatus("CONNECTING TO NEURAL TTS CORE...", "text-yellow-400");

    audioPlayer.pause();

    try {
        const chunks = splitTextIntoChunks(text, 1200);
        const pcmBuffers = [];
        let sampleRate = 24000;

        if (chunks.length > 1) {
            chunkProgressBarContainer.classList.remove('hidden');
        } else {
            chunkProgressBarContainer.classList.add('hidden');
        }

        for (let i = 0; i < chunks.length; i++) {
            if (ttsAborted) throw new Error('Stopped by user');
            const currentChunkNum = i + 1;
            const progressPct = Math.round((currentChunkNum / chunks.length) * 100);

            loadingMainText.textContent = `SYNTHESIZING CHUNK ${currentChunkNum}/${chunks.length} (${progressPct}%)`;
            loadingSubText.textContent = `စာပိုဒ် (${currentChunkNum}/${chunks.length}) အား နီယွန် စနစ်ဖြင့် ထုတ်လုပ်နေပါသည်...`;
            chunkProgressBar.style.width = `${progressPct}%`;
            setStatus(`PROCESSING CHUNK ${currentChunkNum}/${chunks.length}...`, "text-cyan-300");

            const result = await synthesizeChunk(chunks[i], voice);
            pcmBuffers.push(result.pcmBuffer);
            if (result.sampleRate) sampleRate = result.sampleRate;
        }

        setStatus("STITCHING MULTI-CHUNK AUDIO STREAM...", "text-purple-300");

        let totalPcmBytes = 0;
        pcmBuffers.forEach(buf => totalPcmBytes += buf.byteLength);

        const mergedPcm = new Uint8Array(totalPcmBytes);
        let offset = 0;
        pcmBuffers.forEach(buf => {
            mergedPcm.set(new Uint8Array(buf), offset);
            offset += buf.byteLength;
        });

        currentAudioBlob = createWavBlob(mergedPcm.buffer, sampleRate);

        // Revoke the PREVIOUS blob: URL before handing out a new one — generating repeatedly
        // in one session used to leak a fresh object URL (and its backing memory) every time.
        if (currentAudioObjectUrl) {
            URL.revokeObjectURL(currentAudioObjectUrl);
        }
        const audioUrl = URL.createObjectURL(currentAudioBlob);
        currentAudioObjectUrl = audioUrl;
        audioPlayer.src = audioUrl;
        audioPlayer.playbackRate = parseFloat(speedSlider.value);

        customControls.classList.remove('opacity-50', 'pointer-events-none');
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play ml-0.5 text-base"></i>';
        progressBar.style.width = '0%';

        initWebAudioGraph();

        setStatus("SYNTHESIS COMPLETE // READY TO PLAY", "text-emerald-400");

        togglePlayPause();

    } catch (err) {
        console.error("TTS Synthesis Error:", err);
        setStatus(ttsAborted ? "SYNTHESIS STOPPED BY USER" : `SYNTHESIS FAILED: ${err.message}`, ttsAborted ? "text-yellow-400" : "text-red-400");
    } finally {
        isGenerating = false;
        loadingOverlay.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fa-solid fa-bolt text-yellow-300 text-base"></i><span>အသံထုတ်လုပ်မည် (SYNTHESIZE)</span>';
        if (stopGenerateBtn) stopGenerateBtn.disabled = true;
    }
}

function handleStopGenerate() {
    ttsAborted = true;
    activeTtsControllers.forEach(c => { try { c.abort(); } catch (e) {} });
    activeTtsControllers = [];
    setStatus("ရပ်တန့်ရန် တောင်းဆိုလိုက်ပါသည်...", "text-yellow-400");
    if (stopGenerateBtn) stopGenerateBtn.disabled = true;
}
if (stopGenerateBtn) stopGenerateBtn.addEventListener('click', handleStopGenerate);

function initWebAudioGraph() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        audioSource = audioCtx.createMediaElementSource(audioPlayer);

        clarityFilterNode = audioCtx.createBiquadFilter();
        clarityFilterNode.type = "peaking";
        clarityFilterNode.frequency.value = 3200;
        clarityFilterNode.Q.value = 1.0;
        clarityFilterNode.gain.value = clarityBoostActive ? 3.5 : 0;

        audioSource.connect(clarityFilterNode);
        clarityFilterNode.connect(analyser);

        // Cyber Reverb: parallel wet send (convolver with a generated decaying-noise impulse).
        // Dry path above stays untouched; the toggle only changes the wet gain.
        const irLen = Math.floor(audioCtx.sampleRate * 1.6);
        const ir = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = ir.getChannelData(ch);
            for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.5);
        }
        const convolver = audioCtx.createConvolver();
        convolver.buffer = ir;
        reverbWetNode = audioCtx.createGain();
        reverbWetNode.gain.value = cyberReverbActive ? 0.35 : 0;
        clarityFilterNode.connect(convolver);
        convolver.connect(reverbWetNode);
        reverbWetNode.connect(analyser);
        analyser.connect(audioCtx.destination);
    }
}

function togglePlayPause() {
    if (!audioPlayer.src) return;

    if (audioPlayer.paused) {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        audioPlayer.play();
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause text-base"></i>';
        setStatus("PLAYING HI-FI AUDIO...", "text-cyan-400");
        renderVisualizer();
    } else {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play ml-0.5 text-base"></i>';
        setStatus("PLAYBACK PAUSED", "text-yellow-400");
    }
}

function updateAudioProgress() {
    if (!audioPlayer.duration) return;
    const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBar.style.width = `${pct}%`;
    timeCurrent.textContent = formatTime(audioPlayer.currentTime);
}

function seekAudio(e) {
    if (!audioPlayer.duration) return;
    const rect = progressTrack.getBoundingClientRect();
    const clickPos = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = clickPos * audioPlayer.duration;
}

function formatTime(secs) {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function downloadWavAudio() {
    if (!currentAudioBlob) return;
    const url = URL.createObjectURL(currentAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cyberpunk_TTS_2026_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus("WAV AUDIO FILE EXPORTED", "text-emerald-400");
}

function setupCanvasVisualizer() {
    visualizer.width = visualizer.offsetWidth;
    visualizer.height = visualizer.offsetHeight;
    const ctx = visualizer.getContext('2d');
    ctx.clearRect(0, 0, visualizer.width, visualizer.height);

    ctx.beginPath();
    ctx.moveTo(0, visualizer.height / 2);
    ctx.lineTo(visualizer.width, visualizer.height / 2);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function renderVisualizer() {
    if (audioPlayer.paused) {
        cancelAnimationFrame(animationFrameId);
        return;
    }

    animationFrameId = requestAnimationFrame(renderVisualizer);

    const ctx = visualizer.getContext('2d');
    const width = visualizer.width;
    const height = visualizer.height;

    ctx.fillStyle = 'rgba(3, 5, 9, 0.35)';
    ctx.fillRect(0, 0, width, height);

    if (visualizerMode === 'spectrum') {
        const bufferLen = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLen);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLen) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLen; i++) {
            const barHeight = (dataArray[i] / 255) * height * 0.85;

            const grad = ctx.createLinearGradient(0, height, 0, 0);
            grad.addColorStop(0, '#00f3ff');
            grad.addColorStop(0.6, '#9d00ff');
            grad.addColorStop(1, '#ff0055');

            ctx.fillStyle = grad;
            ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

            x += barWidth;
        }
    } else {
        const bufferLen = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLen);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00f3ff';
        ctx.beginPath();

        const sliceWidth = width * 1.0 / bufferLen;
        let x = 0;

        for (let i = 0; i < bufferLen; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * height / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f3ff';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// =============================================================================================
// ═══════════════════════════════════════════════════════════════════════════════════════════
//  SRT SUBTITLE TRANSLATOR MODULE — appended module, does not modify any code above this line.
//  Shares the same Gemini API key pool (getKeys/getIndex/setIndex/updateBadges/applyGlossary)
//  already defined above, but keeps its own model list + rotation pointer so it never
//  interferes with the TTS engine's model rotation state.
// =============================================================================================

// ---- DOM Element Cache (Translator view) ----
const tabTranslatorBtn = document.getElementById('tabTranslatorBtn');
const tabTtsBtn = document.getElementById('tabTtsBtn');
const tabTranscribeBtn = document.getElementById('tabTranscribeBtn');
const tabRecapBtn = document.getElementById('tabRecapBtn');
const ttsViewEl = document.getElementById('ttsView');
const translatorViewEl = document.getElementById('translatorView');
const transcribeViewEl = document.getElementById('transcribeView');
const recapViewEl = document.getElementById('recapView');

const toggleTransKeyPanelBtn = document.getElementById('toggleTransKeyPanelBtn');
const transKeyPanelBody = document.getElementById('transKeyPanelBody');
const transModelsInput = document.getElementById('transModelsInput');
const saveTransModelsBtn = document.getElementById('saveTransModelsBtn');
const transSaveStatusMsg = document.getElementById('transSaveStatusMsg');

const srtFileInput = document.getElementById('srtFileInput');
const srtInput = document.getElementById('srtInput');
const srtInputMeta = document.getElementById('srtInputMeta');

const globalContextMemory = document.getElementById('globalContextMemory');
const contextMemoryEnabledChk = document.getElementById('contextMemoryEnabledChk');
const saveContextMemoryBtn = document.getElementById('saveContextMemoryBtn');
const contextMemorySavedMsg = document.getElementById('contextMemorySavedMsg');

const chunkSizeInput = document.getElementById('chunkSize');
const maxRetriesInput = document.getElementById('maxRetries');
const timeoutSecInput = document.getElementById('timeoutSec');
const workerCountInput = document.getElementById('workerCount');
const targetLangSelect = document.getElementById('targetLang');

const clearSrtBtn = document.getElementById('clearSrtBtn');
const translateBtn = document.getElementById('translateBtn');
const stopTranslateBtn = document.getElementById('stopTranslateBtn');

const transProgressPanel = document.getElementById('transProgressPanel');
const transPctBadge = document.getElementById('transPctBadge');
const transProgressFill = document.getElementById('transProgressFill');
const transWorkerGrid = document.getElementById('transWorkerGrid');
const transLogBox = document.getElementById('transLogBox');

const outputDoneBadge = document.getElementById('outputDoneBadge');
const copySrtBtn = document.getElementById('copySrtBtn');
const downloadSrtBtn = document.getElementById('downloadSrtBtn');
const srtOutputFilenameInput = document.getElementById('srtOutputFilename');
const srtOutput = document.getElementById('srtOutput');
const srtOutputMeta = document.getElementById('srtOutputMeta');
const checkTimestampsOutputBtn = document.getElementById('checkTimestampsOutputBtn');
const checkUntranslatedBtn = document.getElementById('checkUntranslatedBtn');
const retryUntranslatedBtn = document.getElementById('retryUntranslatedBtn');
const srtCheckResultsBox = document.getElementById('srtCheckResultsBox');
const downloadMmSubBtn = document.getElementById('downloadMmSubBtn');
const sendToTtsBtn = document.getElementById('sendToTtsBtn');

// ---- Translator-only state ----
const LS_TRANS_MODELS = 'neoyangon_trans_models';
const LS_TRANS_MODEL_IDX = 'neoyangon_trans_model_idx';
const LS_ACTIVE_TAB = 'neoyangon_active_tab';

// These are current, generally-available Gemini text model IDs — but Google ships new
// model generations regularly, so double-check availability for your key if one 404s, and
// edit the list in the "Translation Model List" box in the UI rather than relying on this
// default staying accurate forever.
const DEFAULT_TRANS_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite"
];

let translationAborted = false;
let activeTransControllers = [];
let lastTranslatedSubs = null;
let lastSrtSourceFileName = null;

// =============================================================
// Tool Tab Switching
// =============================================================
function switchToolView(view) {
    const isTranslator = view === 'translator';
    const isTranscribe = view === 'transcribe';
    const isRecap = view === 'recap';
    const isTts = !isTranslator && !isTranscribe && !isRecap;

    translatorViewEl.classList.toggle('hidden', !isTranslator);
    transcribeViewEl.classList.toggle('hidden', !isTranscribe);
    recapViewEl.classList.toggle('hidden', !isRecap);
    ttsViewEl.classList.toggle('hidden', !isTts);

    tabTranslatorBtn.classList.toggle('tab-active', isTranslator);
    tabTranscribeBtn.classList.toggle('tab-active', isTranscribe);
    tabRecapBtn.classList.toggle('tab-active', isRecap);
    tabTtsBtn.classList.toggle('tab-active', isTts);

    safeLsSet(LS_ACTIVE_TAB, view);
}

tabTranslatorBtn.addEventListener('click', () => switchToolView('translator'));
tabTtsBtn.addEventListener('click', () => switchToolView('tts'));
tabTranscribeBtn.addEventListener('click', () => switchToolView('transcribe'));
tabRecapBtn.addEventListener('click', () => switchToolView('recap'));

toggleTransKeyPanelBtn.addEventListener('click', () => {
    transKeyPanelBody.classList.toggle('hidden');
    const icon = toggleTransKeyPanelBtn.querySelector('i');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
});

// =============================================================
// Translation model list (separate rotation pointer, shared keys)
// =============================================================
function getTransModels() {
    const stored = safeLsGet(LS_TRANS_MODELS);
    if (stored === null) return DEFAULT_TRANS_MODELS.slice();
    const list = parseListInput(stored);
    return list.length ? list : DEFAULT_TRANS_MODELS.slice();
}

function loadTransModelsIntoInput() {
    const stored = safeLsGet(LS_TRANS_MODELS);
    transModelsInput.value = stored ? parseListInput(stored).join('\n') : DEFAULT_TRANS_MODELS.join('\n');
}

saveTransModelsBtn.addEventListener('click', () => {
    safeLsSet(LS_TRANS_MODELS, transModelsInput.value.trim());
    setIndex(LS_TRANS_MODEL_IDX, 0, getTransModels().length);
    transSaveStatusMsg.textContent = 'သိမ်းပြီးပါပြီ ✓';
    setTimeout(() => { transSaveStatusMsg.textContent = ''; }, 2500);
});

// Round-robin credential picker for text translation — shares the key pointer (LS_KEY_IDX)
// with the TTS engine (same underlying key pool) but rotates its OWN model list independently.
const transCredentialPicker = makeGeminiCredentialPicker(
    LS_TRANS_MODEL_IDX, getTransModels,
    'API key မထည့်ရသေးပါ — "Text to Speech" tab ထဲက Key & Model Rotation panel တွင် Gemini API key အနည်းဆုံးတစ်ခု ထည့်ပါ။'
);
function nextTransCredential() {
    if (getTransModels().length === 0) throw new Error('Translation model list ဗလာဖြစ်နေပါသည်။');
    return transCredentialPicker.next();
}
function advanceTransCredential() { return transCredentialPicker.advance(); }

// =============================================================
// SRT Parsing / Rebuilding
// =============================================================
// Returns an array of {timeLine, textLines} cues. Malformed cues are skipped rather than
// throwing, but the count of skipped cues is exposed via subs.droppedCount (a plain extra
// property on the array — doesn't affect .length/forEach/etc.) so callers can warn the user
// instead of silently losing subtitles.
function parseSrt(rawText) {
    const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!normalized) return [];
    const blocks = normalized.split(/\n\s*\n/);
    const subs = [];
    let droppedCount = 0;

    blocks.forEach(block => {
        if (!block.trim()) return; // pure whitespace between cues — not a dropped cue
        const lines = block.split('\n');
        if (lines.length < 2) { droppedCount++; return; }
        let li = 0;

        // Optional leading numeric index line — captured verbatim as originalIndex so
        // later stages (Translator output, MMSub export) can re-emit the SAME cue
        // number instead of silently renumbering from 1. Kept as a string (not parsed
        // to int) so we never reformat a source file's own numbering scheme.
        let originalIndex = null;
        if (/^\d+$/.test(lines[li].trim())) {
            originalIndex = lines[li].trim();
            li++;
        }
        if (!lines[li] || !lines[li].includes('-->')) { droppedCount++; return; } // malformed cue, skip
        const timeLine = lines[li].trim();
        li++;

        const textLines = lines.slice(li).filter((l, i, arr) => !(i === arr.length - 1 && l.trim() === ''));
        if (textLines.length === 0) { droppedCount++; return; }

        subs.push({ timeLine, textLines, originalIndex });
    });

    subs.droppedCount = droppedCount;

    return subs;
}

// preserveIndex=true re-emits each cue's ORIGINAL SRT number (captured by parseSrt
// above) instead of renumbering 1..N sequentially. Used by the Translator output and
// the MMSub export, which keep the exact same set/order of cues as the source SRT —
// so "cue 651" stays "651" instead of becoming "1", matching its original timestamp.
// Tools that merge or split cues (Transcribe merge, AI SRT Format) still renumber
// sequentially by omitting this flag, since the cue count itself changes there and an
// "original" number wouldn't line up with anything in the rebuilt output anyway.
function rebuildSrt(subs, { preserveIndex = false } = {}) {
    return subs.map((s, i) => {
        const text = (s.translatedText !== undefined && s.translatedText !== null)
            ? s.translatedText
            : s.textLines.join('\n');
        const num = (preserveIndex && s.originalIndex) ? s.originalIndex : (i + 1);
        return `${num}\n${s.timeLine}\n${text}`;
    }).join('\n\n') + '\n';
}

function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

// =============================================================
// Global Context Memory — free-text instructions box, injected into
// every translation prompt sent to Gemini (separate from the term/
// replacement Glossary above).
// =============================================================
function getContextMemory() {
    return safeLsGet(LS_CONTEXT_MEMORY) || '';
}
function saveContextMemory(text) {
    safeLsSet(LS_CONTEXT_MEMORY, text);
}
function isContextMemoryEnabled() {
    return safeLsGet(LS_CONTEXT_MEMORY_ENABLED) !== 'false';
}

if (saveContextMemoryBtn) {
    saveContextMemoryBtn.addEventListener('click', () => {
        saveContextMemory(globalContextMemory.value);
        contextMemorySavedMsg.textContent = 'SAVED ✓';
        setTimeout(() => { contextMemorySavedMsg.textContent = ''; }, 2000);
    });
}
// Auto-save as the user types, so hitting TRANSLATE without clicking SAVE first
// still uses the current text (SAVE stays as an explicit "yes, saved" confirmation).
if (globalContextMemory) {
    globalContextMemory.addEventListener('input', () => {
        saveContextMemory(globalContextMemory.value);
    });
}
if (contextMemoryEnabledChk) {
    contextMemoryEnabledChk.addEventListener('change', () => {
        safeLsSet(LS_CONTEXT_MEMORY_ENABLED, contextMemoryEnabledChk.checked ? 'true' : 'false');
    });
}

// =============================================================
// Gemini text-translation call (JSON-array structured output)
// =============================================================
// =============================================================
// Custom Prompt Box + Auto-extract (characters / gender / pronouns) + Proofread pass
// =============================================================
const LS_CUSTOM_PROMPT = 'neoyangon_custom_prompt';
const LS_CUSTOM_PROMPT_ENABLED = 'neoyangon_custom_prompt_enabled';
const LS_PROOFREAD_ENABLED = 'neoyangon_proofread_enabled';
const customPromptBox = document.getElementById('customPromptBox');
const customPromptEnabledChk = document.getElementById('customPromptEnabledChk');
const autoExtractBtn = document.getElementById('autoExtractBtn');
const proofreadPassChk = document.getElementById('proofreadPassChk');
const customPromptStatus = document.getElementById('customPromptStatus');
const autoExtractStopBtn = document.getElementById('autoExtractStopBtn');

function getCustomPrompt() { return safeLsGet(LS_CUSTOM_PROMPT) || ''; }
function isCustomPromptEnabled() { return safeLsGet(LS_CUSTOM_PROMPT_ENABLED) !== 'false'; }
function isProofreadEnabled() { return safeLsGet(LS_PROOFREAD_ENABLED) === 'true'; }
function setCustomPromptStatus(msg, ms = 4000) {
    if (!customPromptStatus) return;
    customPromptStatus.textContent = msg;
    if (ms) setTimeout(() => { customPromptStatus.textContent = ''; }, ms);
}

if (customPromptBox) customPromptBox.addEventListener('input', () => safeLsSet(LS_CUSTOM_PROMPT, customPromptBox.value));
if (customPromptEnabledChk) customPromptEnabledChk.addEventListener('change', () =>
    safeLsSet(LS_CUSTOM_PROMPT_ENABLED, customPromptEnabledChk.checked ? 'true' : 'false'));
if (proofreadPassChk) proofreadPassChk.addEventListener('change', () =>
    safeLsSet(LS_PROOFREAD_ENABLED, proofreadPassChk.checked ? 'true' : 'false'));
window.addEventListener('DOMContentLoaded', () => {
    if (customPromptBox) customPromptBox.value = getCustomPrompt();
    if (customPromptEnabledChk) customPromptEnabledChk.checked = isCustomPromptEnabled();
    if (proofreadPassChk) proofreadPassChk.checked = isProofreadEnabled();
});

// One JSON-returning Gemini call on the translator's key/model rotation.
async function callTransGeminiJson(promptText, responseSchema, timeoutSec, maxTries = 3) {
    let cred = nextTransCredential();
    let lastErr;
    for (let attempt = 0; attempt < maxTries; attempt++) {
        if (translationAborted) throw new Error('Stopped by user');
        const controller = new AbortController();
        activeTransControllers.push(controller);
        const timer = setTimeout(() => controller.abort(), Math.max(timeoutSec, 10) * 1000);
        try {
            const payload = {
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { responseMimeType: "application/json", responseSchema }
            };
            const apiUrl = `https://vpn2-pro.herher650.workers.dev/?https://generativelanguage.googleapis.com/v1beta/models/${cred.model}:generateContent?key=${cred.key}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timer);
            if (!response.ok) {
                lastErr = new Error(`HTTP ${response.status}`);
                if ([400, 401, 403, 404, 429].includes(response.status)) { cred = advanceTransCredential() || cred; continue; }
                throw lastErr;
            }
            const data = await response.json();
            const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!raw) throw new Error('Empty response from model');
            return JSON.parse(raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, ''));
        } catch (e) {
            clearTimeout(timer);
            lastErr = e.name === 'AbortError' ? new Error('Timeout') : e;
            cred = advanceTransCredential() || cred;
        } finally {
            activeTransControllers = activeTransControllers.filter(c => c !== controller);
        }
    }
    throw lastErr || new Error('Gemini call failed');
}

// AUTO-EXTRACT: names -> Glossary (term -> Burmese name); gender / pronoun notes -> Custom Prompt Box.
// Only the managed block between the markers is replaced, anything you typed yourself is untouched.
const AUTO_NOTES_START = '[AUTO CHARACTER NOTES]';
const AUTO_NOTES_END = '[/AUTO CHARACTER NOTES]';

async function autoExtractCharacters() {
    const subs = parseSrt(srtInput.value);
    if (!subs.length) { setCustomPromptStatus('SRT မရှိသေးပါ — မူရင်း SRT အရင်ထည့်ပါ'); return; }
    autoExtractBtn.disabled = true;
    if (autoExtractStopBtn) autoExtractStopBtn.disabled = false;
    translationAborted = false;
    try {
        // Split the WHOLE SRT (not a 12k sample) into ~7000-char pieces so every cue is read.
        const pieces = [];
        let cur = '';
        subs.forEach(x => {
            const line = x.textLines.join(' ');
            if (cur && cur.length + line.length + 1 > 7000) { pieces.push(cur); cur = ''; }
            cur += (cur ? '\n' : '') + line;
        });
        if (cur) pieces.push(cur);

        const schema = { type: "OBJECT", properties: { characters: { type: "ARRAY", items: { type: "OBJECT",
            properties: { name: { type: "STRING" }, burmese: { type: "STRING" }, gender: { type: "STRING" },
                          pronouns: { type: "STRING" }, note: { type: "STRING" } },
            required: ["name", "burmese", "gender"] } } }, required: ["characters"] };

        const found = new Map(); // lower-case name -> merged entry
        let failedPieces = 0;
        for (let i = 0; i < pieces.length; i++) {
            if (translationAborted) break;
            setCustomPromptStatus(`ဇာတ်ကောင် / နာမ်စား ထုတ်ယူနေသည်... ${i + 1}/${pieces.length}`, 0);
            const prompt = `Read these subtitle lines and list EVERY named person / character that appears or is mentioned — including ones that appear only once. Do not skip anyone and do not stop at a fixed number.
For each person give:
- "name": exactly as written in the source
- "burmese": a natural Myanmar-script rendering of the name (standard Unicode, no punctuation marks)
- "gender": male / female / unknown (only if the text clearly shows it, e.g. he/she, Mr/Mrs, brother/sister)
- "pronouns": how this person refers to themself and how others address / refer to them (I / you / he / she / they, honorifics, kinship terms), written in Myanmar, e.g. "ကိုယ်တိုင်: ကျွန်တော် / တခြားသူက: သူ၊ ကိုကို" — empty if the text does not show it
- "note": very short relationship / role note (Myanmar if possible)
Skip generic words that are not names. Output JSON only.

Subtitles:
${pieces[i]}`;
            try {
                const result = await callTransGeminiJson(prompt, schema, 90, 3);
                (result.characters || []).forEach(c => {
                    if (!c || !c.name || !c.name.trim()) return;
                    const key = c.name.trim().toLowerCase();
                    const prev = found.get(key);
                    if (!prev) { found.set(key, { name: c.name.trim(), burmese: (c.burmese || '').trim(), gender: (c.gender || 'unknown').trim(), pronouns: (c.pronouns || '').trim(), note: (c.note || '').trim() }); return; }
                    if (!prev.burmese && c.burmese) prev.burmese = c.burmese.trim();
                    if ((!prev.gender || prev.gender === 'unknown') && c.gender) prev.gender = c.gender.trim();
                    if (!prev.pronouns && c.pronouns) prev.pronouns = c.pronouns.trim();
                    if (!prev.note && c.note) prev.note = c.note.trim();
                });
            } catch (e) {
                if (translationAborted) break;
                failedPieces++;
                if (typeof logTrans === 'function') logTrans(`Auto-extract ${i + 1}/${pieces.length} မအောင်မြင်ပါ (${e.message})`, 'warn');
            }
        }

        const chars = Array.from(found.values());
        if (!chars.length) { setCustomPromptStatus(translationAborted ? 'ရပ်လိုက်ပါပြီ' : (failedPieces ? `FAILED: ${failedPieces} piece မအောင်မြင်ပါ` : 'ဇာတ်ကောင် မတွေ့ပါ'), 8000); return; }

        const gloss = getGlossary();
        let added = 0;
        chars.forEach(c => {
            const term = c.name, repl = c.burmese;
            if (repl && repl !== term && !gloss.some(g => (g.term || '').toLowerCase() === term.toLowerCase())) { gloss.push({ term, replacement: repl }); added++; }
        });
        saveGlossary(gloss);
        renderGlossary();

        const lines = chars.map(c => `- ${c.name} (${c.burmese}): ${c.gender || 'unknown'}${c.pronouns ? ' | နာမ်စား: ' + c.pronouns : ''}${c.note ? ' — ' + c.note : ''}`);
        const block = `${AUTO_NOTES_START}\nKeep each character's name spelling, gender, and the pronouns / address terms they use consistent in every line:\n${lines.join('\n')}\n${AUTO_NOTES_END}`;
        let text = customPromptBox.value;
        const a = text.indexOf(AUTO_NOTES_START), b = text.indexOf(AUTO_NOTES_END);
        text = (a !== -1 && b > a)
            ? text.slice(0, a) + block + text.slice(b + AUTO_NOTES_END.length)
            : (text.trim() ? text.replace(/\s+$/, '') + '\n\n' : '') + block;
        customPromptBox.value = text;
        saveCustomPromptFromBox();
        setCustomPromptStatus(`${translationAborted ? 'ရပ်လိုက်ပါပြီ (ရလာသလောက် သိမ်းထားသည်)' : 'ပြီးပါပြီ ✓'} ဇာတ်ကောင် ${chars.length} ယောက် / Glossary အသစ် ${added} ခု${failedPieces ? ` / မအောင်မြင် ${failedPieces} piece` : ''}`, 8000);
    } catch (e) {
        setCustomPromptStatus(`FAILED: ${e.message}`, 8000);
    } finally {
        autoExtractBtn.disabled = false;
        if (autoExtractStopBtn) autoExtractStopBtn.disabled = true;
    }
}
function saveCustomPromptFromBox() { safeLsSet(LS_CUSTOM_PROMPT, customPromptBox.value); }
if (autoExtractBtn) autoExtractBtn.addEventListener('click', autoExtractCharacters);

// PROOFREAD PASS: one more Gemini check over the finished translation, 40 cues at a time.
// Fixes mistranslation vs. source, inconsistent names/gender/pronouns and typos only.
// Cue count, numbers and timestamps are never touched — only translatedText is replaced,
// and a chunk whose reply has the wrong item count is skipped rather than applied.
async function proofreadTranslatedSubs(subs, targetLang, timeoutSec) {
    const isMyanmar = targetLang === 'Myanmar (Burmese)';
    const custom = (isCustomPromptEnabled() ? getCustomPrompt() : '').trim();
    const glossNames = getGlossary().filter(g => g.term).map(g => `${g.term} = ${g.replacement}`).join('; ');
    const schema = { type: "ARRAY", items: { type: "STRING" } };
    const targets = subs.filter(x => !x.translationFailed && x.translatedText && String(x.translatedText).trim());
    const chunks = chunkArray(targets, 40);
    let changed = 0;
    for (let ci = 0; ci < chunks.length; ci++) {
        if (translationAborted) { logTrans('Proofreading ကို ရပ်လိုက်ပါသည်။', 'warn'); return; }
        const chunk = chunks[ci];
        const items = chunk.map((x, i) => ({ n: i + 1, source: x.textLines.join(' / '), translation: x.translatedText }));
        const prompt = `You are a careful proofreader for ${targetLang} subtitles.
For each item, compare "translation" with "source" and return the corrected translation.
Fix ONLY: wrong meaning, inconsistent character names / gender / pronouns, spelling mistakes, unnatural or broken phrasing.
If an item is already good, return it EXACTLY unchanged. Keep the same length style (short subtitle lines) and keep any line break as is.
Return a JSON array of strings with exactly ${items.length} items in the same order. No notes.${isMyanmar ? '\nNever use the marks "။" "၊" "!" "?".' : ''}
${glossNames ? `Glossary (keep these forms): ${glossNames}\n` : ''}${custom ? `User instructions:\n${custom}\n` : ''}
Items:
${JSON.stringify(items)}`;
        try {
            const out = await callTransGeminiJson(prompt, schema, timeoutSec, 2);
            if (!Array.isArray(out) || out.length !== chunk.length) { logTrans(`Proofread chunk ${ci + 1}: item အရေအတွက် မကိုက်ပါ — ကျော်ခဲ့သည်`, 'warn'); continue; }
            out.forEach((t, i) => {
                let fixed = String(t).trim();
                if (isMyanmar) fixed = sanitizeMyanmarPunctuation(fixed);
                if (fixed && fixed !== chunk[i].translatedText) { chunk[i].translatedText = fixed; changed++; }
            });
            logTrans(`Proofread ${ci + 1}/${chunks.length} ✓`, 'ok');
        } catch (e) {
            logTrans(`Proofread chunk ${ci + 1} မအောင်မြင်ပါ (${e.message}) — မူလအတိုင်း ထားသည်`, 'warn');
        }
    }
    logTrans(`Proofreading ပြီးပါပြီ — cue ${changed} ခု ပြင်ခဲ့သည်`, 'ok');
}

// When the managed [AUTO CHARACTER NOTES] block is long (more than 12 characters), only send the
// characters whose name actually appears in this chunk — saves tokens on every request.
// Short lists are sent whole, so a character referred to only by pronoun keeps its gender note.
function filterAutoNotesForChunk(promptText, chunkLower) {
    const a = promptText.indexOf(AUTO_NOTES_START), b = promptText.indexOf(AUTO_NOTES_END);
    if (a === -1 || b <= a) return promptText;
    const innerStart = a + AUTO_NOTES_START.length;
    const rows = promptText.slice(innerStart, b).split('\n');
    const isCharRow = r => /^\s*- .+? \(/.test(r);
    if (rows.filter(isCharRow).length <= 12) return promptText;
    const keep = rows.filter(r => {
        if (!isCharRow(r)) return true;
        const name = r.match(/^\s*- (.+?) \(/)[1].trim().toLowerCase();
        return chunkLower.includes(name);
    });
    if (!keep.some(isCharRow)) {
        // no listed character appears in this chunk — drop the whole block
        return (promptText.slice(0, a) + promptText.slice(b + AUTO_NOTES_END.length)).trim();
    }
    return promptText.slice(0, innerStart) + keep.join('\n') + promptText.slice(b);
}

function buildTranslationPrompt(lines, targetLang) {
    const numbered = lines.map((l, i) => `${i + 1}. ${l.replace(/\n/g, ' / ')}`).join('\n');
    const isMyanmar = targetLang === 'Myanmar (Burmese)';

    const contextMemory = (isContextMemoryEnabled() ? getContextMemory() : '').trim();
    const contextBlock = contextMemory
        ? `\nAdditional context / instructions from the user (follow these while translating):\n${contextMemory}\n`
        : '';
    const chunkLower = lines.join('\n').toLowerCase();
    const customPrompt = filterAutoNotesForChunk((isCustomPromptEnabled() ? getCustomPrompt() : '').trim(), chunkLower);
    const customBlock = customPrompt
        ? `\nCustom prompt from the user (highest priority — follow strictly):\n${customPrompt}\n`
        : '';

    const myanmarRules = isMyanmar ? `
- Language precision: translate the meaning accurately for ${targetLang}, based on the actual context of the source line (not a literal word-for-word conversion).
- Strict punctuation restriction: NEVER use the Myanmar sentence-punctuation marks "။" or "၊" anywhere in the output.
- Also NEVER use the Western exclamation mark "!" or question mark "?" anywhere in the output.
- Write clean subtitle-style Burmese sentences without any of the punctuation marks listed above.` : '';

    const glossEntries = isGlossaryEnabled() ? getGlossary().filter(g => g.term && g.replacement && chunkLower.includes(g.term.toLowerCase())) : [];
    const glossBlock = glossEntries.length
        ? `\nGlossary (for these source names / terms, ALWAYS use exactly the given form in the translation):\n${glossEntries.map(g => `${g.term} => ${g.replacement}`).join('\n')}\n`
        : '';

    return `You are a professional subtitle translator localizing a video subtitle file into ${targetLang}.

Rules:
- Translate EACH numbered line into natural, concise, on-screen subtitle style ${targetLang}.
- Return exactly the same number of items, in the same order. Do not merge, split, skip, or renumber lines — each JSON string corresponds to exactly one existing subtitle cue, with its own unchanged number and timestamp; never create a new cue.
- Keep meaning and tone faithful to the source; keep proper nouns / names consistent across lines.
- Do not add explanations, notes, or the original text — only the translation.
- Line length: only break a translated line in two when it is genuinely too long to read comfortably at a glance (roughly beyond ~42 characters, adjusted naturally for the target script's visual width) — a short or already-readable line must stay on a single line, do not wrap it unnecessarily. When a break is needed, insert a single literal "\\n" at a natural phrase boundary inside that same JSON string — never more than 2 lines total, and never as a separate array item. This only reflows text within the cue's existing timestamp block; it must never change the timing or the cue number.
- Output ONLY a JSON array of strings (one translated string per input line) — plain subtitle text with no numbering, no timestamps, and no markdown, ready to be dropped straight into a professional .srt file.${myanmarRules}
${contextBlock}${customBlock}${glossBlock}
Subtitle lines to translate:
${numbered}`;
}

// Safety net: even with the prompt rule above, a model can occasionally slip in a
// punctuation mark. When translating into Myanmar, strip "။" "၊" "!" "?" from the
// result and tidy up any double-spacing left behind.
function sanitizeMyanmarPunctuation(text) {
    return text.replace(/[။၊!?]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
}

function extractJsonArray(raw) {
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) { /* fall through to regex extraction */ }

    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
        try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) { /* give up below */ }
    }
    throw new Error('JSON array parse failed');
}

async function translateChunkWithRetry(chunk, targetLang, maxRetries, timeoutSec) {
    const lines = chunk.map(s => s.textLines.join('\n'));
    let cred = nextTransCredential();
    let lastErr;

    for (let attempt = 0; attempt < Math.max(maxRetries, 1); attempt++) {
        if (translationAborted) throw new Error('Stopped by user');

        const controller = new AbortController();
        activeTransControllers.push(controller);
        const timer = setTimeout(() => controller.abort(), Math.max(timeoutSec, 1) * 1000);

        try {
            const prompt = buildTranslationPrompt(lines, targetLang);
            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: { type: "ARRAY", items: { type: "STRING" } }
                }
            };
            const apiUrl = `https://vpn2-pro.herher650.workers.dev/?https://generativelanguage.googleapis.com/v1beta/models/${cred.model}:generateContent?key=${cred.key}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timer);

            if (!response.ok) {
                if ([400, 401, 403, 404, 429].includes(response.status)) {
                    logTrans(`HTTP ${response.status} — key/model rotating...`, 'warn');
                    cred = advanceTransCredential();
                    lastErr = new Error(`HTTP ${response.status}`);
                    if (!translationAborted) await sleep(retryBackoffMs(attempt));
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!raw) throw new Error('Empty response from model');

            const arr = extractJsonArray(raw);
            if (!Array.isArray(arr) || arr.length !== lines.length) {
                throw new Error(`Line count mismatch (expected ${lines.length}, got ${arr ? arr.length : 0})`);
            }

            return arr.map(t => {
                let out = applyGlossary(String(t));
                if (targetLang === 'Myanmar (Burmese)') out = sanitizeMyanmarPunctuation(out);
                return out;
            });

        } catch (e) {
            clearTimeout(timer);
            if (e.name === 'AbortError') {
                lastErr = new Error('Timeout');
                logTrans(`Timeout (${timeoutSec}s) — retrying...`, 'warn');
            } else {
                lastErr = e;
            }
            cred = advanceTransCredential();
        } finally {
            activeTransControllers = activeTransControllers.filter(c => c !== controller);
        }
        if (!translationAborted) await sleep(retryBackoffMs(attempt));
    }

    throw lastErr || new Error('All retries failed');
}

// =============================================================
// Worker-pool driven multi-chunk translation
// =============================================================
async function translateSrtWithWorkers(subs, chunkSize, targetLang, workerCount, maxRetries, timeoutSec) {
    const chunks = chunkArray(subs, chunkSize);
    const results = new Array(chunks.length);
    const failedIdx = new Set(); // chunk indices currently sitting on untranslated fallback text

    renderWorkerGrid(workerCount);
    // Resume support: chunks whose every cue already has a saved translation are not sent again.
    const pendingIdx = [];
    chunks.forEach((c, i) => {
        if (c.every(s => s._pre !== undefined)) results[i] = c.map(s => s._pre);
        else pendingIdx.push(i);
    });
    const alreadyDone = chunks.length - pendingIdx.length;
    if (alreadyDone > 0) logTrans(`သိမ်းထားပြီးသား chunk ${alreadyDone}/${chunks.length} ကို ကျော်ပြီး ကျန်တာကိုသာ ဘာသာပြန်မည်`, 'ok');
    updateTransProgress(alreadyDone, chunks.length);

    // Runs a worker pool over a specific list of chunk indices. Used for the initial
    // full sweep, and again afterwards for recovery rounds over chunks that came back
    // untranslated (so a timestamp isn't left in the source language just because it
    // hit a timeout once).
    async function runPass(indices, trackProgress, baseDone = 0) {
        let cursor = 0;
        let doneInPass = baseDone;

        async function workerLoop(workerId) {
            while (true) {
                if (translationAborted) return;
                const myPos = cursor++;
                if (myPos >= indices.length) return;
                const myChunkIdx = indices[myPos];

                setWorkerStatus(workerId, 'busy', myChunkIdx + 1, chunks.length);
                logTrans(`Worker ${workerId + 1} → chunk ${myChunkIdx + 1}/${chunks.length} စတင်နေသည်...`);

                try {
                    results[myChunkIdx] = await translateChunkWithRetry(chunks[myChunkIdx], targetLang, maxRetries, timeoutSec);
                    setWorkerStatus(workerId, 'done', myChunkIdx + 1, chunks.length);
                    logTrans(`Chunk ${myChunkIdx + 1}/${chunks.length} ပြီးပါပြီ ✓`, 'ok');
                    failedIdx.delete(myChunkIdx);
                    if (transSession) { // autosave this chunk so a refresh / crash loses nothing
                        chunks[myChunkIdx].forEach((s, si) => { if (s._idx !== undefined) transSession.done[s._idx] = results[myChunkIdx][si]; });
                        transSession.updatedAt = Date.now();
                        persistTransSession();
                    }
                } catch (e) {
                    if (results[myChunkIdx] === undefined) {
                        results[myChunkIdx] = chunks[myChunkIdx].map(s => s.textLines.join('\n')); // fallback: keep original text until a later pass can recover it
                    }
                    failedIdx.add(myChunkIdx);
                    setWorkerStatus(workerId, 'error', myChunkIdx + 1, chunks.length);
                    logTrans(`Chunk ${myChunkIdx + 1} error: ${e.message} (မူရင်းစာသား ထားရစ်မည်)`, 'err');
                }

                doneInPass++;
                if (trackProgress) updateTransProgress(doneInPass, chunks.length);
            }
        }

        const effectiveWorkers = Math.max(1, Math.min(workerCount, indices.length || 1));
        const pool = [];
        for (let i = 0; i < effectiveWorkers; i++) pool.push(workerLoop(i));
        await Promise.all(pool);
    }

    await runPass(pendingIdx, true, alreadyDone);

    // Recovery sweeps: a chunk that exhausted translateChunkWithRetry's own internal
    // retries is still sitting on its original untranslated text at this point. Check
    // for any such chunks and give them a few more full attempts so a timestamp that
    // only failed because of a one-off timeout still ends up translated, instead of
    // being left in the source language for good.
    const MAX_RECOVERY_PASSES = 2;
    for (let pass = 1; pass <= MAX_RECOVERY_PASSES && failedIdx.size > 0 && !translationAborted; pass++) {
        const retryList = Array.from(failedIdx);
        logTrans(`ဘာသာမပြန်ဘဲ ကျန်နေသော chunk ${retryList.length} ခုကို ထပ်မံ ပြန်ကြိုးစားနေသည် (အကြိမ် ${pass})...`, 'warn');
        const beforeCount = failedIdx.size;
        await runPass(retryList, false);
        if (failedIdx.size === beforeCount) break; // this round recovered nothing — further rounds won't help, stop here
    }

    if (!translationAborted) {
        if (failedIdx.size > 0) {
            logTrans(`Chunk ${failedIdx.size} ခုသည် ထပ်ခါထပ်ခါ ကြိုးစားပြီးလည်း ဘာသာပြန်မရခဲ့ပါ — မူရင်းစာသားဖြင့်သာ ထားရစ်ပါမည်`, 'err');
        } else {
            logTrans('Chunk အားလုံး ဘာသာပြန်ပြီးပါပြီ ✓', 'ok');
        }
    }

    chunks.forEach((chunk, ci) => {
        const chunkStillFailed = failedIdx.has(ci);
        chunk.forEach((sub, si) => {
            sub.translatedText = (results[ci] && results[ci][si] !== undefined) ? results[ci][si] : sub.textLines.join('\n');
            delete sub._pre; // resume marker no longer needed once results are applied
            sub.translationFailed = chunkStillFailed; // used by the output panel's "untranslated check" button
        });
    });

    return subs;
}

// =============================================================
// Progress / Log / Worker-grid UI helpers
// =============================================================
function updateTransProgress(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    transPctBadge.textContent = `${pct}%`;
    transProgressFill.style.width = `${pct}%`;
}

const logTrans = makeLogger(transLogBox);

function renderWorkerGrid(count) {
    transWorkerGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const chip = document.createElement('span');
        chip.className = 'worker-chip';
        chip.id = `workerChip${i}`;
        chip.textContent = `W${i + 1}: idle`;
        transWorkerGrid.appendChild(chip);
    }
}

function setWorkerStatus(workerId, status, chunkNum, totalChunks) {
    const chip = document.getElementById(`workerChip${workerId}`);
    if (!chip) return;
    chip.classList.remove('worker-busy', 'worker-done', 'worker-error');
    if (status === 'busy') {
        chip.classList.add('worker-busy');
        chip.textContent = `W${workerId + 1}: #${chunkNum}/${totalChunks}`;
    } else if (status === 'done') {
        chip.classList.add('worker-done');
        chip.textContent = `W${workerId + 1}: ✓ #${chunkNum}`;
    } else if (status === 'error') {
        chip.classList.add('worker-error');
        chip.textContent = `W${workerId + 1}: ✗ #${chunkNum}`;
    }
}

// =============================================================
// SRT input meta / file loading
// =============================================================
function updateSrtInputMeta() {
    const subs = parseSrt(srtInput.value);
    const chunkSize = Math.max(parseInt(chunkSizeInput.value, 10) || 30, 1);
    const chunkCount = subs.length ? Math.ceil(subs.length / chunkSize) : 0;
    const droppedNote = subs.droppedCount ? ` | ⚠ Format မမှန်ကန်၍ ကျော်ထားသော cue: ${subs.droppedCount}` : '';
    srtInputMeta.textContent = `Subtitles: ${subs.length} | Chunks: ${chunkCount}${droppedNote}`;
}

srtInput.addEventListener('input', updateSrtInputMeta);
chunkSizeInput.addEventListener('input', updateSrtInputMeta);

srtFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    lastSrtSourceFileName = file.name.replace(/\.[^./]+$/, '');
    const reader = new FileReader();
    reader.onload = (evt) => {
        srtInput.value = evt.target.result;
        updateSrtInputMeta();
    };
    reader.readAsText(file, 'UTF-8');
});

clearSrtBtn.addEventListener('click', () => {
    srtInput.value = '';
    srtOutput.value = '';
    srtOutputMeta.textContent = '';
    outputDoneBadge.classList.add('hidden');
    lastTranslatedSubs = null;
    lastSrtSourceFileName = null;
    clearTransSession();
    srtOutputFilenameInput.value = '';
    srtCheckResultsBox.classList.add('hidden');
    srtCheckResultsBox.innerHTML = '';
    updateSrtInputMeta();
});

// =============================================================
// Output panel checks: timestamp errors + still-untranslated lines
// =============================================================
// Parses an SRT timestamp into milliseconds. Tries the strict standard format first
// (fast path, matches the overwhelming majority of cues). Falls back to a lenient parser
// for common non-standard variants that Gemini (and other providers) occasionally drift
// into — especially on short/odd-length tail chunks — such as a colon or period before the
// milliseconds instead of a comma, or a collapsed/missing hours field (MM:SS,mmm instead of
// HH:MM:SS,mmm). A stricter, exact-match-only version of this function used to return null
// on ANY such deviation, which caused offsetSrtTimestamps() to silently leave that cue's
// timestamp un-shifted (still relative to its own chunk, not the full media timeline) —
// producing SRTs where the last chunk's cues appear clustered near the START of the file
// instead of near the end, with no warning that anything had gone wrong.
function parseSrtTimestampToMs(ts) {
    const t = ts.trim();
    let m = t.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
    if (m) {
        const [, hh, mm, ss, ms] = m;
        return ((parseInt(hh, 10) * 3600 + parseInt(mm, 10) * 60 + parseInt(ss, 10)) * 1000) + parseInt(ms, 10);
    }
    // Lenient fallback: optional 1-2 digit hour group, required minute:second, then any of
    // , . : as the ms separator, with a 1-3 digit ms field (padded out to milliseconds).
    m = t.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})[.,:](\d{1,3})$/);
    if (!m) return null;
    const [, hh, mm, ss, msRaw] = m;
    const ms = parseInt(msRaw.padEnd(3, '0').slice(0, 3), 10);
    return ((parseInt(hh || '0', 10) * 3600 + parseInt(mm, 10) * 60 + parseInt(ss, 10)) * 1000) + ms;
}

// Scans cue timestamps for format errors, zero/negative duration, overlaps with the
// previous cue, and (when mediaDurationSec is supplied) cues that start/end past the
// actual media length — the common issues that break playback sync in a video player.
// mediaDurationSec is optional so existing callers (Translator tab, which has no media
// file, only the SRT text) keep working unchanged.
function checkSrtTimestamps(subs, mediaDurationSec = null) {
    const issues = [];
    let prevEndMs = -1;
    const durationMs = (typeof mediaDurationSec === 'number' && isFinite(mediaDurationSec))
        ? Math.round(mediaDurationSec * 1000)
        : null;
    subs.forEach((s, i) => {
        const parts = s.timeLine.split('-->').map(p => p.trim());
        if (parts.length !== 2) {
            issues.push(`#${s.originalIndex || (i + 1)}: timestamp line format မှားနေသည် — "${s.timeLine}"`);
            return;
        }
        const startMs = parseSrtTimestampToMs(parts[0]);
        const endMs = parseSrtTimestampToMs(parts[1]);
        const num = s.originalIndex || (i + 1);
        if (startMs === null || endMs === null) {
            issues.push(`#${num}: timestamp format မှန်ကန်မှုမရှိပါ (HH:MM:SS,mmm ဖြစ်ရပါမည်) — "${s.timeLine}"`);
            return;
        }
        if (endMs <= startMs) {
            issues.push(`#${num}: အဆုံးအချိန်သည် အစချိန်ထက် စောနေသည်/တူနေသည် — "${s.timeLine}"`);
        }
        if (prevEndMs !== -1 && startMs < prevEndMs) {
            issues.push(`#${num}: ရှေ့ subtitle နှင့် timestamp ထပ်နေသည် (overlap) — "${s.timeLine}"`);
        }
        if (durationMs !== null && startMs > durationMs) {
            issues.push(`#${num}: media အရှည် (${formatSrtTimestamp(durationMs / 1000)}) ထက်ကျော်ပြီးမှ subtitle စတင်နေသည် — "${s.timeLine}"`);
        } else if (durationMs !== null && endMs > durationMs) {
            issues.push(`#${num}: media အရှည် (${formatSrtTimestamp(durationMs / 1000)}) ကျော်၍ အဆုံးသတ်နေသည် — "${s.timeLine}"`);
        }
        prevEndMs = Math.max(prevEndMs, endMs);
    });
    return issues;
}

// Flags any line still sitting on its original (untranslated) text — either because
// translateSrtWithWorkers marked its chunk as still-failed after all recovery passes,
// or because the translated text happens to be identical to the source text.
function checkUntranslatedLines(subs) {
    const issues = [];
    subs.forEach((s, i) => {
        const original = s.textLines.join('\n').trim();
        const translated = (s.translatedText !== undefined && s.translatedText !== null) ? String(s.translatedText).trim() : '';
        if (s.translationFailed || (translated && translated === original)) {
            const preview = original.length > 60 ? original.slice(0, 60) + '…' : original;
            issues.push(`#${s.originalIndex || (i + 1)} [${s.timeLine.split('-->')[0].trim()}]: "${preview}"`);
        }
    });
    return issues;
}

// Same test checkUntranslatedLines uses, exposed separately so the RETRY button can
// pull out the actual sub objects (not just format a message about them).
function findUntranslatedSubs(subs) {
    return subs.filter(s => {
        const original = s.textLines.join('\n').trim();
        const translated = (s.translatedText !== undefined && s.translatedText !== null) ? String(s.translatedText).trim() : '';
        return s.translationFailed || (translated && translated === original);
    });
}

// targetBox defaults to the Translator tab's results box so this stays a drop-in
// replacement for the two call sites below; the Transcribe tab's check button passes
// transcribeCheckResultsBox explicitly instead.
function renderCheckResults(title, issues, emptyMsg, targetBox = srtCheckResultsBox) {
    targetBox.classList.remove('hidden');
    targetBox.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'font-mono text-[10px] text-purple-300 uppercase tracking-widest mb-1';
    header.textContent = title;
    targetBox.appendChild(header);

    if (issues.length === 0) {
        const line = document.createElement('div');
        line.className = 'log-entry-ok';
        line.textContent = `✓ ${emptyMsg}`;
        targetBox.appendChild(line);
        return;
    }
    issues.forEach(msg => {
        const line = document.createElement('div');
        line.className = 'log-entry-err';
        line.textContent = `✗ ${msg}`;
        targetBox.appendChild(line);
    });
}

function showCheckNotice(msg, targetBox = srtCheckResultsBox) {
    targetBox.classList.remove('hidden');
    targetBox.innerHTML = '';
    const line = document.createElement('div');
    line.className = 'log-entry-warn';
    line.textContent = msg;
    targetBox.appendChild(line);
}

checkTimestampsOutputBtn.addEventListener('click', () => {
    const subs = lastTranslatedSubs || parseSrt(srtOutput.value);
    if (!subs || subs.length === 0) {
        showCheckNotice('SRT output မရှိသေးပါ — အရင် Translate လုပ်ပါ');
        return;
    }
    const issues = checkSrtTimestamps(subs);
    renderCheckResults(`TIMESTAMP CHECK — ${subs.length} lines စစ်ဆေးပြီး`, issues, 'Timestamp error များ မတွေ့ပါ');
});

checkUntranslatedBtn.addEventListener('click', () => {
    if (!lastTranslatedSubs || lastTranslatedSubs.length === 0) {
        showCheckNotice('Translate လုပ်ပြီးမှသာ ဒီ check ကို လုပ်နိုင်ပါသည်');
        return;
    }
    const issues = checkUntranslatedLines(lastTranslatedSubs);
    renderCheckResults(`ဘာသာမပြန်ရသေးသော lines — ${lastTranslatedSubs.length} lines စစ်ဆေးပြီး`, issues, 'အားလုံး ဘာသာပြန်ပြီးပါပြီ');
});

// =============================================================
// RETRY: re-translate only the cues still sitting on untranslated text.
// Re-uses the SAME sub objects that live inside lastTranslatedSubs (not copies) —
// translateSrtWithWorkers mutates sub.translatedText/sub.translationFailed in place,
// so running it over just this filtered subset automatically updates them inside
// lastTranslatedSubs too, with everything else in the SRT left untouched.
// =============================================================
let isRetryingUntranslated = false;

retryUntranslatedBtn.addEventListener('click', async () => {
    if (isTranslating || isRetryingUntranslated) return;

    if (!lastTranslatedSubs || lastTranslatedSubs.length === 0) {
        showCheckNotice('Translate လုပ်ပြီးမှသာ ဒီ retry ကို လုပ်နိုင်ပါသည်');
        return;
    }
    const failedSubs = findUntranslatedSubs(lastTranslatedSubs);
    if (failedSubs.length === 0) {
        showCheckNotice('ပြန်ဘာသာပြန်ရန် ကျန်နေသော line မရှိပါ — အားလုံး ဘာသာပြန်ပြီးပါပြီ');
        return;
    }
    if (getKeys().length === 0) {
        logTrans('ERROR: API key မရှိပါ — "Text to Speech" tab ထဲက Key panel တွင် key ထည့်ပါ', 'err');
        return;
    }

    isRetryingUntranslated = true;
    translationAborted = false;
    retryUntranslatedBtn.disabled = true;
    retryUntranslatedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> RETRYING...';
    stopTranslateBtn.disabled = false;
    transProgressPanel.classList.remove('hidden');

    const chunkSize = Math.max(parseInt(chunkSizeInput.value, 10) || 30, 1);
    const maxRetries = Math.max(parseInt(maxRetriesInput.value, 10) || 3, 1);
    const timeoutSec = Math.max(parseInt(timeoutSecInput.value, 10) || 60, 5);
    const workerCount = Math.max(parseInt(workerCountInput.value, 10) || 3, 1);
    const targetLang = targetLangSelect.value;

    logTrans(`ဘာသာမပြန်ရသေးသော cue ${failedSubs.length} ခုကို ပြန်ကြိုးစားနေသည်...`, 'warn');

    try {
        await translateSrtWithWorkers(failedSubs, chunkSize, targetLang, workerCount, maxRetries, timeoutSec);

        const outputSrt = rebuildSrt(lastTranslatedSubs, { preserveIndex: true });
        srtOutput.value = outputSrt;
        srtOutputMeta.textContent = `Subtitles: ${lastTranslatedSubs.length} | Characters: ${outputSrt.length}`;

        const remaining = checkUntranslatedLines(lastTranslatedSubs);
        renderCheckResults(`ဘာသာမပြန်ရသေးသော lines — ${lastTranslatedSubs.length} lines စစ်ဆေးပြီး`, remaining, 'အားလုံး ဘာသာပြန်ပြီးပါပြီ');

        if (remaining.length === 0) {
            logTrans('ကျန်နေသော line များ အားလုံး ဘာသာပြန်ပြီးပါပြီ ✓', 'ok');
        } else {
            logTrans(`ပြန်ကြိုးစားပြီးနောက် line ${remaining.length} ခု ဆက်ကျန်နေပါသည် — ထပ် RETRY နှိပ်နိုင်ပါသည်`, 'warn');
        }
    } catch (err) {
        console.error('Retry Untranslated Error:', err);
        logTrans(`FAILED: ${err.message}`, 'err');
    } finally {
        isRetryingUntranslated = false;
        retryUntranslatedBtn.disabled = false;
        retryUntranslatedBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> ကျန်တာပြန်ဘာသာပြန်ရန် (RETRY)';
        stopTranslateBtn.disabled = true;
    }
});


// =============================================================
// Main translate handler
// =============================================================
let isTranslating = false;

async function handleTranslateSrt() {
    const rawSrt = srtInput.value.trim();
    if (!rawSrt) {
        logTrans('ERROR: SRT စာသား မထည့်ရသေးပါ', 'err');
        srtInput.focus();
        return;
    }
    if (getKeys().length === 0) {
        logTrans('ERROR: API key မရှိပါ — "Text to Speech" tab ထဲက Key panel တွင် key ထည့်ပါ', 'err');
        return;
    }

    const subs = parseSrt(rawSrt);
    if (subs.length === 0) {
        logTrans('ERROR: SRT format မှန်ကန်စွာ parse လုပ်၍မရပါ', 'err');
        return;
    }

    // ---- autosave / resume ----
    const sig = hashStr(rawSrt);
    subs.forEach((s, i) => { s._idx = i; });
    let resumed = 0;
    const prevSession = loadTransSession();
    if (resumeSessionChk && resumeSessionChk.checked && prevSession && prevSession.sig === sig
        && prevSession.targetLang === targetLangSelect.value && prevSession.done) {
        subs.forEach((s, i) => { if (prevSession.done[i] !== undefined) { s._pre = prevSession.done[i]; resumed++; } });
    }
    if (resumed > 0) {
        transSession = prevSession;
    } else {
        transSession = { v: 1, sig, targetLang: targetLangSelect.value, total: subs.length, fileName: lastSrtSourceFileName || '', done: {}, updatedAt: Date.now() };
        safeLsSet(LS_TRANS_SESSION_SRT, rawSrt);
    }
    persistTransSession();
    if (subs.droppedCount > 0) {
        logTrans(`သတိပေးချက်: format မမှန်ကန်သော cue ${subs.droppedCount} ခုကို parse လုပ်စဉ် ကျော်ခဲ့ပါသည် — output SRT တွင် ဒီ cue များ ပါဝင်မည် မဟုတ်ပါ`, 'warn');
    }

    if (isTranslating) return;
    isTranslating = true;
    translationAborted = false;

    // Guarantee the textarea's current text is what gets used this run, even if the
    // user never clicked SAVE (the 'input' auto-save above covers normal typing, this
    // is just a hard guarantee against any race).
    if (globalContextMemory) saveContextMemory(globalContextMemory.value);
    if (isContextMemoryEnabled() && getContextMemory().trim()) {
        logTrans('Global Context Memory ပါဝင်စေပြီး ဘာသာပြန်ပါမည်', 'ok');
    }

    const chunkSize = Math.max(parseInt(chunkSizeInput.value, 10) || 30, 1);
    const maxRetries = Math.max(parseInt(maxRetriesInput.value, 10) || 3, 1);
    const timeoutSec = Math.max(parseInt(timeoutSecInput.value, 10) || 60, 5);
    const workerCount = Math.max(parseInt(workerCountInput.value, 10) || 3, 1);
    const targetLang = targetLangSelect.value;

    translateBtn.disabled = true;
    translateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>TRANSLATING...</span>';
    stopTranslateBtn.disabled = false;
    outputDoneBadge.classList.add('hidden');
    transProgressPanel.classList.remove('hidden');
    transLogBox.innerHTML = '';
    srtOutput.value = '';
    srtCheckResultsBox.classList.add('hidden');
    srtCheckResultsBox.innerHTML = '';

    logTrans(`SRT ${subs.length} subtitles / ${Math.ceil(subs.length / chunkSize)} chunks / ${workerCount} workers ဖြင့် ဘာသာပြန်စတင်ပါပြီ → ${targetLang}`);
    if (resumed > 0) logTrans(`ယခင် သိမ်းထားသော cue ${resumed}/${subs.length} ကို ပြန်သုံးပါမည် (RESUME)`, 'ok');

    try {
        const translatedSubs = await translateSrtWithWorkers(subs, chunkSize, targetLang, workerCount, maxRetries, timeoutSec);

        if (translationAborted) {
            logTrans('User မှ ရပ်တန့်လိုက်ပါသည်။', 'warn');
        }

        lastTranslatedSubs = translatedSubs;
        const outputSrt = rebuildSrt(translatedSubs, { preserveIndex: true });
        srtOutput.value = outputSrt;
        srtOutputMeta.textContent = `Subtitles: ${translatedSubs.length} | Characters: ${outputSrt.length}`;
        if (!srtOutputFilenameInput.value.trim()) {
            srtOutputFilenameInput.value = lastSrtSourceFileName ? `${lastSrtSourceFileName}_${targetLang}` : `translated_${targetLang}_${Date.now()}`;
        }
        if (!translationAborted && isProofreadEnabled()) {
            logTrans('Proofreading pass စတင်ပါပြီ...');
            await proofreadTranslatedSubs(translatedSubs, targetLang, timeoutSec);
            const proofed = rebuildSrt(translatedSubs, { preserveIndex: true });
            srtOutput.value = proofed;
            srtOutputMeta.textContent = `Subtitles: ${translatedSubs.length} | Characters: ${proofed.length}`;
        }
        if (!translationAborted && !translatedSubs.some(s => s.translationFailed)) clearTransSession(); // fully done — nothing left to resume
        if (translationAborted) {
            logTrans('တစ်စိတ်တစ်ပိုင်းသာ ပြီးပါသည် (ရပ်တန့်ထားသည်) — မပြန်ရသေးသော cue များကို RETRY နှိပ်ပါ။', 'warn');
        } else {
            outputDoneBadge.classList.remove('hidden');
            logTrans('ဘာသာပြန်ခြင်း အားလုံးပြီးဆုံးပါပြီ ✓', 'ok');
        }

    } catch (err) {
        console.error('SRT Translation Error:', err);
        logTrans(`FAILED: ${err.message}`, 'err');
    } finally {
        isTranslating = false;
        translateBtn.disabled = false;
        translateBtn.innerHTML = '<i class="fa-solid fa-bolt text-yellow-300 text-base"></i><span>TRANSLATE</span>';
        stopTranslateBtn.disabled = true;
    }
}

function handleStopTranslate() {
    translationAborted = true;
    activeTransControllers.forEach(c => { try { c.abort(); } catch (e) {} });
    activeTransControllers = [];
    logTrans('ရပ်တန့်ရန် တောင်းဆိုလိုက်ပါသည်... လက်ရှိ chunk များ ပြီးဆုံးသည်နှင့် ရပ်ပါမည်။', 'warn');
    stopTranslateBtn.disabled = true;
}

// =============================================================
// Copy / Download / Send-to-TTS
// =============================================================
// =============================================================
// AUTOSAVE / RESUME + GLOSSARY BULK ADD + BACKUP / IMPORT + AUTO-EXTRACT STOP
// =============================================================
const LS_TRANS_SESSION = 'neoyangon_trans_session';
const LS_TRANS_SESSION_SRT = 'neoyangon_trans_session_srt';
const resumeSessionChk = document.getElementById('resumeSessionChk');
let transSession = null; // { v, sig, targetLang, total, fileName, done: {cueIndex: translatedText}, updatedAt }

function hashStr(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + ':' + s.length;
}
function loadTransSession() {
    try {
        const m = JSON.parse(safeLsGet(LS_TRANS_SESSION) || 'null');
        return (m && m.v === 1 && m.done) ? m : null;
    } catch (e) { return null; }
}
function persistTransSession() {
    if (transSession) safeLsSet(LS_TRANS_SESSION, JSON.stringify(transSession));
}
function clearTransSession() {
    transSession = null;
    try { localStorage.removeItem(LS_TRANS_SESSION); localStorage.removeItem(LS_TRANS_SESSION_SRT); } catch (e) { /* ignore */ }
}

// After a refresh / crash: put the original SRT and the partly translated output back,
// so TRANSLATE (RESUME ticked) or RETRY only has to do the missing cues.
function restoreTransSessionOnLoad() {
    const sess = loadTransSession();
    const srtText = safeLsGet(LS_TRANS_SESSION_SRT);
    if (!sess || !srtText || srtInput.value.trim()) return;
    const subs = parseSrt(srtText);
    const doneCount = Object.keys(sess.done).length;
    if (!subs.length || doneCount === 0 || doneCount >= subs.length) return;
    srtInput.value = srtText;
    updateSrtInputMeta();
    if (sess.fileName) lastSrtSourceFileName = sess.fileName;
    if (sess.targetLang && Array.from(targetLangSelect.options).some(o => o.value === sess.targetLang)) targetLangSelect.value = sess.targetLang;
    subs.forEach((s, i) => {
        s._idx = i;
        const has = sess.done[i] !== undefined;
        s.translatedText = has ? sess.done[i] : s.textLines.join('\n');
        s.translationFailed = !has;
    });
    lastTranslatedSubs = subs;
    transSession = sess;
    const out = rebuildSrt(subs, { preserveIndex: true });
    srtOutput.value = out;
    srtOutputMeta.textContent = `Subtitles: ${subs.length} | Characters: ${out.length} (ပြန်ယူထားသော session)`;
    if (!srtOutputFilenameInput.value.trim() && sess.fileName) srtOutputFilenameInput.value = `${sess.fileName}_${sess.targetLang || 'translated'}`;
    transProgressPanel.classList.remove('hidden');
    logTrans(`ယခင် ဘာသာပြန်မပြီးသေးသော session ကို ပြန်ယူထားသည် — ${doneCount}/${subs.length} cue ပြီးပြီ။ TRANSLATE (RESUME ✓) သို့မဟုတ် RETRY နှိပ်ရင် ကျန်တာကိုသာ ဆက်ပြန်ပါမည်။`, 'warn');
}
restoreTransSessionOnLoad();

// ---- Glossary matching options (apply to TTS tab too, since the list is shared) ----
const glossaryWholeWordChk = document.getElementById('glossaryWholeWordChk');
const glossaryCaseChk = document.getElementById('glossaryCaseChk');
if (glossaryWholeWordChk) {
    glossaryWholeWordChk.checked = safeLsGet(LS_GLOSSARY_WHOLE) !== 'false';
    glossaryWholeWordChk.addEventListener('change', () => safeLsSet(LS_GLOSSARY_WHOLE, glossaryWholeWordChk.checked ? 'true' : 'false'));
}
if (glossaryCaseChk) {
    glossaryCaseChk.checked = safeLsGet(LS_GLOSSARY_CASE) !== 'false';
    glossaryCaseChk.addEventListener('change', () => safeLsSet(LS_GLOSSARY_CASE, glossaryCaseChk.checked ? 'true' : 'false'));
}

// ---- Glossary BULK ADD: one "term = replacement" per line ----
const glossaryBulkInput = document.getElementById('glossaryBulkInput');
const glossaryBulkAddBtn = document.getElementById('glossaryBulkAddBtn');
const glossaryBulkMsg = document.getElementById('glossaryBulkMsg');

function parseGlossaryBulk(text) {
    const pairs = [];
    let skipped = 0;
    text.split(/\r?\n/).forEach(line => {
        const l = line.trim();
        if (!l) return;
        const m = l.match(/^(.+?)\s*(?:=>|->|→|=|\t)\s*(.+)$/);
        if (m && m[1].trim() && m[2].trim()) pairs.push({ term: m[1].trim(), replacement: m[2].trim() });
        else skipped++;
    });
    return { pairs, skipped };
}
if (glossaryBulkAddBtn) {
    glossaryBulkAddBtn.addEventListener('click', () => {
        const { pairs, skipped } = parseGlossaryBulk(glossaryBulkInput.value);
        if (!pairs.length) { glossaryBulkMsg.textContent = 'ထည့်စရာ မတွေ့ပါ (ပုံစံ: မူရင်း = အစားထိုး)'; return; }
        const gloss = getGlossary();
        let added = 0, updated = 0;
        pairs.forEach(p => {
            const hit = gloss.find(g => (g.term || '').toLowerCase() === p.term.toLowerCase());
            if (hit) { hit.replacement = p.replacement; updated++; }
            else { gloss.push(p); added++; }
        });
        saveGlossary(gloss);
        renderGlossary();
        glossaryBulkInput.value = '';
        glossaryBulkMsg.textContent = `ထည့်ပြီး ${added} / ပြင်ပြီး ${updated}${skipped ? ` / ကျော်ထား ${skipped} ကြောင်း` : ''} ✓`;
        setTimeout(() => { glossaryBulkMsg.textContent = ''; }, 6000);
    });
}

// ---- BACKUP / IMPORT (no API keys are included) ----
const exportBackupBtn = document.getElementById('exportBackupBtn');
const importBackupBtn = document.getElementById('importBackupBtn');
const importBackupFile = document.getElementById('importBackupFile');
const backupReplaceChk = document.getElementById('backupReplaceChk');
const backupStatusMsg = document.getElementById('backupStatusMsg');
function setBackupStatus(msg, ms = 6000) {
    if (!backupStatusMsg) return;
    backupStatusMsg.textContent = msg;
    if (ms) setTimeout(() => { backupStatusMsg.textContent = ''; }, ms);
}

if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', () => {
        const data = {
            app: 'neoyangon', version: 1, exportedAt: new Date().toISOString(),
            glossary: getGlossary(),
            glossaryEnabled: isGlossaryEnabled(),
            glossaryWholeWord: safeLsGet(LS_GLOSSARY_WHOLE) !== 'false',
            glossaryCaseSensitive: safeLsGet(LS_GLOSSARY_CASE) !== 'false',
            customPrompt: getCustomPrompt(),
            customPromptEnabled: isCustomPromptEnabled(),
            contextMemory: getContextMemory(),
            contextMemoryEnabled: isContextMemoryEnabled(),
            proofread: isProofreadEnabled()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neoyangon_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setBackupStatus(`Export ပြီးပါပြီ ✓ (Glossary ${data.glossary.length} ခု)`);
    });
}
if (importBackupBtn && importBackupFile) {
    importBackupBtn.addEventListener('click', () => importBackupFile.click());
    importBackupFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const d = JSON.parse(evt.target.result);
                if (!d || d.app !== 'neoyangon') throw new Error('ဒီ tool ရဲ့ backup ဖိုင် မဟုတ်ပါ');
                let msg = [];
                if (Array.isArray(d.glossary)) {
                    const clean = d.glossary
                        .filter(g => g && typeof g.term === 'string' && g.term.trim() && typeof g.replacement === 'string')
                        .map(g => ({ term: g.term.trim(), replacement: g.replacement.trim() }));
                    if (backupReplaceChk && backupReplaceChk.checked) {
                        saveGlossary(clean);
                    } else {
                        const gloss = getGlossary();
                        clean.forEach(p => {
                            const hit = gloss.find(g => (g.term || '').toLowerCase() === p.term.toLowerCase());
                            if (hit) hit.replacement = p.replacement; else gloss.push(p);
                        });
                        saveGlossary(gloss);
                    }
                    msg.push(`Glossary ${clean.length}`);
                }
                if (typeof d.glossaryEnabled === 'boolean') safeLsSet(LS_GLOSSARY_ENABLED, d.glossaryEnabled ? 'true' : 'false');
                if (typeof d.glossaryWholeWord === 'boolean') safeLsSet(LS_GLOSSARY_WHOLE, d.glossaryWholeWord ? 'true' : 'false');
                if (typeof d.glossaryCaseSensitive === 'boolean') safeLsSet(LS_GLOSSARY_CASE, d.glossaryCaseSensitive ? 'true' : 'false');
                if (typeof d.customPrompt === 'string') { safeLsSet(LS_CUSTOM_PROMPT, d.customPrompt); msg.push('Custom Prompt'); }
                if (typeof d.customPromptEnabled === 'boolean') safeLsSet(LS_CUSTOM_PROMPT_ENABLED, d.customPromptEnabled ? 'true' : 'false');
                if (typeof d.contextMemory === 'string') { saveContextMemory(d.contextMemory); msg.push('Context Memory'); }
                if (typeof d.contextMemoryEnabled === 'boolean') safeLsSet(LS_CONTEXT_MEMORY_ENABLED, d.contextMemoryEnabled ? 'true' : 'false');
                if (typeof d.proofread === 'boolean') safeLsSet(LS_PROOFREAD_ENABLED, d.proofread ? 'true' : 'false');

                // refresh every control on screen
                renderGlossary();
                const ge = isGlossaryEnabled();
                if (glossaryEnabledChk) glossaryEnabledChk.checked = ge;
                if (transGlossaryEnabledChk) transGlossaryEnabledChk.checked = ge;
                if (glossaryWholeWordChk) glossaryWholeWordChk.checked = safeLsGet(LS_GLOSSARY_WHOLE) !== 'false';
                if (glossaryCaseChk) glossaryCaseChk.checked = safeLsGet(LS_GLOSSARY_CASE) !== 'false';
                if (customPromptBox) customPromptBox.value = getCustomPrompt();
                if (customPromptEnabledChk) customPromptEnabledChk.checked = isCustomPromptEnabled();
                if (globalContextMemory) globalContextMemory.value = getContextMemory();
                if (contextMemoryEnabledChk) contextMemoryEnabledChk.checked = isContextMemoryEnabled();
                if (proofreadPassChk) proofreadPassChk.checked = isProofreadEnabled();
                setBackupStatus(`Import ပြီးပါပြီ ✓ — ${msg.join(' / ') || 'ဘာမှ မပါပါ'}`);
            } catch (err) {
                setBackupStatus(`Import မအောင်မြင်ပါ: ${err.message}`, 9000);
            }
        };
        reader.readAsText(file, 'UTF-8');
    });
}

// ---- Auto-extract STOP ----
if (autoExtractStopBtn) {
    autoExtractStopBtn.addEventListener('click', () => {
        translationAborted = true;
        activeTransControllers.forEach(c => { try { c.abort(); } catch (e) { /* ignore */ } });
        activeTransControllers = [];
        autoExtractStopBtn.disabled = true;
        setCustomPromptStatus('ရပ်နေသည်... ရလာသလောက် သိမ်းပါမည်', 0);
    });
}

// The translated SRT box is editable now. Keep the in-memory cues in sync with manual edits
// (same cue count only) so Copy / Download / Check / Retry / Send-to-TTS all use your changes.
if (srtOutput) {
    srtOutput.addEventListener('input', () => {
        const edited = parseSrt(srtOutput.value);
        srtOutputMeta.textContent = `Subtitles: ${edited.length} | Characters: ${srtOutput.value.length} (edited)`;
        if (lastTranslatedSubs && lastTranslatedSubs.length === edited.length) {
            edited.forEach((e, i) => {
                lastTranslatedSubs[i].translatedText = e.textLines.join('\n');
                lastTranslatedSubs[i].timeLine = e.timeLine;
                if (e.originalIndex) lastTranslatedSubs[i].originalIndex = e.originalIndex;
            });
        }
    });
}

copySrtBtn.addEventListener('click', async () => {
    if (!srtOutput.value) return;
    try {
        await navigator.clipboard.writeText(srtOutput.value);
        const original = copySrtBtn.innerHTML;
        copySrtBtn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Copied';
        setTimeout(() => { copySrtBtn.innerHTML = original; }, 1800);
    } catch (e) {
        srtOutput.select();
        document.execCommand('copy');
    }
});

function sanitizeSrtFileName(name) {
    return (name || '').trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\.srt$/i, '').slice(0, 150);
}

downloadSrtBtn.addEventListener('click', () => {
    if (!srtOutput.value) return;
    const typed = sanitizeSrtFileName(srtOutputFilenameInput.value);
    const filename = `${typed || `translated_${Date.now()}`}.srt`;
    const blob = new Blob([srtOutput.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// =============================================================
// SRT → MMSub SRT (Zawgyi) export
// -------------------------------------------------------------
// Older/lightweight Myanmar subtitle players — the "MMSub"-style apps common on
// Android (MMSubLite, MMSubPlay and similar) — were built before Myanmar Unicode
// was standard, and only display Myanmar glyphs correctly in the legacy Zawgyi-One
// encoding. Gemini always returns standard Unicode, so this pass re-encodes just the
// dialogue text to Zawgyi for those players. Cue numbers and timestamps are copied
// through byte-for-byte from the Unicode output (same preserveIndex numbering as the
// regular download) — only the Myanmar glyphs themselves change.
//
// Rule table adapted from the "Rabbit" Unicode<->Zawgyi converter (WTFPL license,
// rabbit-converter.github.io/Rabbit) — a long-standing, widely reused reference
// implementation. Zawgyi conversion is inherently a best-effort, rule-based process
// (its own author notes it "cannot promise 100%" on every edge case), so it's worth
// spot-checking unusual text in your target player.
// =============================================================
const UNICODE_TO_ZAWGYI_RULES = [
    { from: 'င်္', to: 'ၤ' }, { from: '္တွ', to: '႖' }, { from: 'ါ်', to: 'ၚ' },
    { from: 'ဋ္ဌ', to: '႒' }, { from: 'ိံ', to: 'ႎ' }, { from: '၎င်း', to: '၎' },
    { from: '[ဥဉ](?=[္ုူ])', to: 'ၪ' }, { from: '[ဥဉ](?=[့]?[်])', to: 'ဥ' },
    { from: 'ည(?=[္ွ])', to: 'ၫ' }, { from: '(္[က-အ])(ိ){0,1}ု', to: '$1$2ဳ' },
    { from: '(္[က-အ])ူ', to: '$1ဴ' }, { from: 'န(?=[ိီ]?[ူွှု္])', to: 'ႏ' },
    { from: 'နြ', to: 'ႏြ' }, { from: '္က', to: 'ၠ' }, { from: '္ခ', to: 'ၡ' },
    { from: '္ဂ', to: 'ၢ' }, { from: '္ဃ', to: 'ၣ' }, { from: '္စ', to: 'ၥ' },
    { from: '္ဆ', to: 'ၦ' }, { from: '္ဇ', to: 'ၨ' }, { from: '္ဈ', to: 'ၩ' },
    { from: '္ဋ', to: 'ၬ' }, { from: '္ဌ', to: 'ၭ' }, { from: 'ဍ္ဍ', to: 'ၮ' },
    { from: 'ဎ္ဍ', to: 'ၯ' }, { from: '္ဏ', to: 'ၰ' }, { from: '္တ', to: 'ၱ' },
    { from: '္ထ', to: 'ၳ' }, { from: '္ဒ', to: 'ၵ' }, { from: '္ဓ', to: 'ၶ' },
    { from: '္[နႏ]', to: 'ၷ' }, { from: '္ပ', to: 'ၸ' }, { from: '္ဖ', to: 'ၹ' },
    { from: '္ဗ', to: 'ၺ' }, { from: '္ဘ', to: 'ၻ' }, { from: '္မ', to: 'ၼ' },
    { from: '္လ', to: 'ႅ' }, { from: 'ဿ', to: 'ႆ' }, { from: 'ွှ', to: 'ႊ' },
    { from: '(ၤ)([က-အ])([ျြ]?)ိ', to: '$2$3ႋ' }, { from: '(ၤ)([က-အ])([ျြ]?)ီ', to: '$2$3ႌ' },
    { from: '(ၤ)([က-အ])([ျြ]?)ံ', to: '$2$3ႍ' }, { from: '(ၤ)([က-အ])([ျြ]?)([ေ]?)', to: '$2$3$4$1' },
    { from: 'ရ(?=([ိီ]?)[ုူွႊ])', to: '႐' }, { from: 'ဏ္ဍ', to: '႑' }, { from: 'ဋ္ဋ', to: '႗' },
    { from: '([က-အႏဩ႐])([ၠ-ၩၬၭၰ-ၼႅႊ])?([ျ-ှ]*)?ေ', to: 'ေ$1$2$3' }, { from: 'ြှ', to: 'ြႇ' },
    { from: '([က-အႏဩ])([ၠ-ၩၬၭၰ-ၼႅ])?(ြ)', to: '$3$1$2' }, { from: '်', to: '္' },
    { from: 'ျ', to: '်' }, { from: 'ြ', to: 'ျ' }, { from: 'ွ', to: 'ြ' }, { from: 'ှ', to: 'ွ' },
    { from: '([^်ည])ွ([ိီ]?)ု', to: '$1ႈ$2' },
    { from: '([ရ်ြႊႈ႐])([ူွ])?([ဲံ္ိီႋႌႍႎ]?)(ု)?့', to: '$1$2$3$4႕' },
    { from: '([ုနူွ])([ဲံ္ိီႋႌႍႎ]?)့', to: '$1$2႔' },
    { from: '([ျ])([က-အ])([ႇ]?)([ံိီႋႌႍႎ]?)ု', to: '$1$2$3$4ဳ' },
    { from: '([ျ])([က-အ])([ႇ]?)([ံိီႋႌႍႎ]?)ူ', to: '$1$2$3$4ဴ' },
    { from: '([်ြညဠဥ])([ွ]?)([ံိီႋႌႍႎ]?)ု', to: '$1$2$3ဳ' },
    { from: '([်ြညရ])(ွ?)([ံိီႋႌႍႎ]?)ူ', to: '$1$2$3ဴ' },
    { from: 'ညွ', to: 'ညႇ' }, { from: 'ွူ', to: 'ႉ' },
    { from: 'ျ([ကဃဆဏတထဘယလယသဟ])', to: 'ၾ$1' },
    { from: 'ၾ([ကဃဆဏတထဘယလယသဟ])([ြႊ])([ဲံိီႋႌႍႎ])', to: 'ႄ$1$2$3' },
    { from: 'ၾ([ကဃဆဏတထဘယလယသဟ])([ြႊ])', to: 'ႂ$1$2' },
    { from: 'ၾ([ကဃဆဏတထဘယလယသဟ])([ဳဴ]?)([ဲံိီႋႌႍႎ])', to: 'ႀ$1$2$3' },
    { from: 'ျ([က-အ])([ြႊ])([ဲံိီႋႌႍႎ])', to: 'ႃ$1$2$3' }, { from: 'ျ([က-အ])([ြႊ])', to: 'ႁ$1$2' },
    { from: 'ျ([က-အ])([ဳဴ]?)([ဲံိီႋႌႍႎ])', to: 'ၿ$1$2$3' }, { from: '်ွ', to: 'ွ်' },
    { from: '်([ြႊ])', to: '$1ၽ' }, { from: '([ဳဴ])႔', to: '$1႕' }, { from: 'ႏၱ', to: 'ႏၲ' },
    { from: '([က-အ])([ၻၦ])ာ', to: '$1ာ$2' }, { from: 'ာ([ၻၦ])့', to: 'ာ$1႔' },
];

function unicodeToZawgyi(text) {
    let out = text;
    for (const { from, to } of UNICODE_TO_ZAWGYI_RULES) {
        out = out.replace(new RegExp(from, 'g'), to);
    }
    return out;
}

// Rebuilds an already-Unicode SRT into an MMSub/Zawgyi one. Only the dialogue text
// (s.textLines) is re-encoded — the cue number and timeLine are copied through
// unchanged, exactly like rebuildSrt's own preserveIndex path.
function convertSrtToMmSub(unicodeSrtText) {
    const subs = parseSrt(unicodeSrtText);
    return subs.map((s, i) => {
        const num = s.originalIndex || (i + 1);
        const sourceText = (s.translatedText !== undefined && s.translatedText !== null)
            ? s.translatedText
            : s.textLines.join('\n');
        return `${num}\n${s.timeLine}\n${unicodeToZawgyi(sourceText)}`;
    }).join('\n\n') + '\n';
}

downloadMmSubBtn.addEventListener('click', () => {
    if (!srtOutput.value) return;
    const mmSubSrt = convertSrtToMmSub(srtOutput.value);
    const typed = sanitizeSrtFileName(srtOutputFilenameInput.value);
    const filename = `${typed || `translated_${Date.now()}`}.mmsub.srt`;
    const blob = new Blob([mmSubSrt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const original = downloadMmSubBtn.innerHTML;
    downloadMmSubBtn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Downloaded';
    setTimeout(() => { downloadMmSubBtn.innerHTML = original; }, 1800);
});

sendToTtsBtn.addEventListener('click', () => {
    if (!lastTranslatedSubs || lastTranslatedSubs.length === 0) {
        logTrans('ပထမဆုံး ဘာသာပြန်ပြီးမှ TTS ကို ပို့နိုင်ပါမည်', 'warn');
        return;
    }
    const fullDialogue = lastTranslatedSubs
        .map(s => (s.translatedText || '').replace(/\n/g, ' ').trim())
        .filter(Boolean)
        .map(t => (targetLangSelect.value === 'Myanmar (Burmese)' && !/[။.!?]$/.test(t)) ? t + '။' : t)
        .join('\n');
    const dialogueOnly = fullDialogue.slice(0, 10000);
    const wasTruncated = fullDialogue.length > dialogueOnly.length;

    textInput.value = dialogueOnly;
    charCount.textContent = dialogueOnly.length;
    switchToolView('tts');
    if (wasTruncated) {
        // Previously this silently cut the text with no indication anything was lost.
        setStatus(`⚠ TRANSLATOR မှ စာသား လက်ခံရရှိပါပြီ (10,000 လုံး ကျော်သဖြင့် ${fullDialogue.length - dialogueOnly.length} လုံး ဖြတ်ထားပါသည်)`, 'text-yellow-400');
        logTrans(`သတိပေးချက်: TTS သို့ ပို့သော စာသားသည် 10,000 လုံး ကျော်နေသဖြင့် ကျန်ရှိသော ${fullDialogue.length - dialogueOnly.length} လုံးကို ဖြတ်တောက်ထားပါသည်`, 'warn');
    } else {
        setStatus('TRANSLATOR မှ စာသား လက်ခံရရှိပါပြီ', 'text-emerald-400');
    }
});

translateBtn.addEventListener('click', handleTranslateSrt);
stopTranslateBtn.addEventListener('click', handleStopTranslate);

// =============================================================
// Translator module init (separate DOMContentLoaded listener —
// runs alongside the TTS engine's own init without altering it)
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
    loadTransModelsIntoInput();
    updateSrtInputMeta();
    if (globalContextMemory) globalContextMemory.value = getContextMemory();
    if (contextMemoryEnabledChk) contextMemoryEnabledChk.checked = isContextMemoryEnabled();
    const savedTab = safeLsGet(LS_ACTIVE_TAB) || 'transcribe';
    switchToolView(savedTab);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
//  MEDIA TRANSCRIPTION MODULE — appended module, does not modify any code above this line
//  (aside from the shared switchToolView()/tab wiring near the top of the file).
//  Upload MP4/MP3 → Gladia + Groq + AssemblyAI key pool with auto rotation → SRT / TXT / JSON output.
//  Fully client-side: files go straight from the browser to api.gladia.io / api.groq.com / api.assemblyai.com.
// =============================================================================================

// ---- DOM Element Cache (Transcribe view) ----
const toggleTranscribeKeyPanelBtn = document.getElementById('toggleTranscribeKeyPanelBtn');
const transcribeKeyPanelBody = document.getElementById('transcribeKeyPanelBody');
const gladiaKeysInput = document.getElementById('gladiaKeysInput');
const groqKeysInput = document.getElementById('groqKeysInput');
const groqModelSelect = document.getElementById('groqModelSelect');
const assemblyaiKeysInput = document.getElementById('assemblyaiKeysInput');
const saveTranscribeKeysBtn = document.getElementById('saveTranscribeKeysBtn');
const transcribeSaveStatusMsg = document.getElementById('transcribeSaveStatusMsg');
const gladiaKeyCountBadge = document.getElementById('gladiaKeyCountBadge');
const groqKeyCountBadge = document.getElementById('groqKeyCountBadge');
const assemblyaiKeyCountBadge = document.getElementById('assemblyaiKeyCountBadge');
const timefixModelsInput = document.getElementById('timefixModelsInput');
const saveTimefixModelsBtn = document.getElementById('saveTimefixModelsBtn');
const timefixSaveStatusMsg = document.getElementById('timefixSaveStatusMsg');

const mediaFileInput = document.getElementById('mediaFileInput');
const mediaFileDropzone = document.getElementById('mediaFileDropzone');
const mediaFileMeta = document.getElementById('mediaFileMeta');

const transcribeLangSelect = document.getElementById('transcribeLangSelect');
const transcribeMaxRetriesInput = document.getElementById('transcribeMaxRetries');
const transcribeTimeoutSecInput = document.getElementById('transcribeTimeoutSec');
const transcribeChunkSizeInput = document.getElementById('transcribeChunkSize');
const transcribeWorkerCountInput = document.getElementById('transcribeWorkerCount');
const transcribeWaveformSyncToggle = document.getElementById('transcribeWaveformSyncToggle');
const clearTranscribeBtn = document.getElementById('clearTranscribeBtn');
const transcribeBtn = document.getElementById('transcribeBtn');
const geminiTranscribeBtn = document.getElementById('geminiTranscribeBtn');
const stopTranscribeBtn = document.getElementById('stopTranscribeBtn');

const transcribeProgressPanel = document.getElementById('transcribeProgressPanel');
const transcribeStatusBadge = document.getElementById('transcribeStatusBadge');
const transcribeChunkProgressWrap = document.getElementById('transcribeChunkProgressWrap');
const transcribeChunkProgressFill = document.getElementById('transcribeChunkProgressFill');
const transcribeWorkerGrid = document.getElementById('transcribeWorkerGrid');
const transcribeLogBox = document.getElementById('transcribeLogBox');

const transcribeDoneBadge = document.getElementById('transcribeDoneBadge');
const outFormatSrtBtn = document.getElementById('outFormatSrtBtn');
const outFormatTxtBtn = document.getElementById('outFormatTxtBtn');
const outFormatJsonBtn = document.getElementById('outFormatJsonBtn');
const fixTimestampsBtn = document.getElementById('fixTimestampsBtn');
const formatSrtBtn = document.getElementById('formatSrtBtn');
const checkTranscribeTimestampsBtn = document.getElementById('checkTranscribeTimestampsBtn');
const transcribeCheckResultsBox = document.getElementById('transcribeCheckResultsBox');
const copyTranscribeBtn = document.getElementById('copyTranscribeBtn');
const downloadTranscribeBtn = document.getElementById('downloadTranscribeBtn');
const transcribeOutput = document.getElementById('transcribeOutput');
const transcribeOutputMeta = document.getElementById('transcribeOutputMeta');
const sendTranscribeToTranslatorBtn = document.getElementById('sendTranscribeToTranslatorBtn');

// ---- Transcribe-only state ----
const LS_GLADIA_KEYS = 'neoyangon_gladia_keys';
const LS_GROQ_KEYS = 'neoyangon_groq_keys';
const LS_GROQ_MODEL = 'neoyangon_groq_model';
const LS_ASSEMBLYAI_KEYS = 'neoyangon_assemblyai_keys';
const LS_TRANSCRIBE_IDX = 'neoyangon_transcribe_idx';

let selectedMediaFile = null;
let selectedMediaDurationSec = null; // set once probe.onloadedmetadata fires in setSelectedMediaFile()
let isTranscribing = false;
let transcribeAborted = false;
let activeTranscribeAbortControllers = [];
let currentTranscribeResult = null; // { srt, fullText, jsonStr, provider, sourceFileName }
let activeOutputFormat = 'srt';

// =============================================================
// Gladia / Groq key pool (own rotation pointer, own storage keys)
// =============================================================
function getGladiaKeys() { return parseListInput(safeLsGet(LS_GLADIA_KEYS) || ''); }
function getGroqKeys() { return parseListInput(safeLsGet(LS_GROQ_KEYS) || ''); }
function getGroqModel() { return safeLsGet(LS_GROQ_MODEL) || 'whisper-large-v3-turbo'; }
function getAssemblyAiKeys() { return parseListInput(safeLsGet(LS_ASSEMBLYAI_KEYS) || ''); }

function getTranscribeCredentialPool() {
    const pool = [];
    getGladiaKeys().forEach(key => pool.push({ provider: 'gladia', key }));
    getGroqKeys().forEach(key => pool.push({ provider: 'groq', key }));
    getAssemblyAiKeys().forEach(key => pool.push({ provider: 'assemblyai', key }));
    return pool;
}

function updateTranscribeBadges() {
    gladiaKeyCountBadge.textContent = getGladiaKeys().length;
    groqKeyCountBadge.textContent = getGroqKeys().length;
    assemblyaiKeyCountBadge.textContent = getAssemblyAiKeys().length;
}

function loadTranscribeKeysIntoInputs() {
    gladiaKeysInput.value = (safeLsGet(LS_GLADIA_KEYS) || '').split(',').join('\n').trim();
    groqKeysInput.value = (safeLsGet(LS_GROQ_KEYS) || '').split(',').join('\n').trim();
    groqModelSelect.value = getGroqModel();
    assemblyaiKeysInput.value = (safeLsGet(LS_ASSEMBLYAI_KEYS) || '').split(',').join('\n').trim();
    updateTranscribeBadges();
    loadTimefixModelsIntoInput();
}

saveTranscribeKeysBtn.addEventListener('click', () => {
    safeLsSet(LS_GLADIA_KEYS, gladiaKeysInput.value.trim());
    safeLsSet(LS_GROQ_KEYS, groqKeysInput.value.trim());
    safeLsSet(LS_GROQ_MODEL, groqModelSelect.value);
    safeLsSet(LS_ASSEMBLYAI_KEYS, assemblyaiKeysInput.value.trim());
    setIndex(LS_TRANSCRIBE_IDX, 0, getTranscribeCredentialPool().length);
    updateTranscribeBadges();
    transcribeSaveStatusMsg.textContent = 'သိမ်းပြီးပါပြီ ✓';
    setTimeout(() => { transcribeSaveStatusMsg.textContent = ''; }, 2500);
});

toggleTranscribeKeyPanelBtn.addEventListener('click', () => {
    transcribeKeyPanelBody.classList.toggle('hidden');
    const icon = toggleTranscribeKeyPanelBtn.querySelector('i');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
});

// Round-robin picker across the COMBINED Gladia+Groq pool
function nextTranscribeCredential() {
    const pool = getTranscribeCredentialPool();
    if (pool.length === 0) throw new Error('Gladia/Groq/AssemblyAI API key မရှိပါ — Key Pool panel တွင် အနည်းဆုံး key တစ်ခု ထည့်ပါ။');
    const idx = getIndex(LS_TRANSCRIBE_IDX, pool.length);
    setIndex(LS_TRANSCRIBE_IDX, idx + 1, pool.length);
    return pool[idx];
}
function advanceTranscribeCredential() {
    const pool = getTranscribeCredentialPool();
    if (pool.length === 0) return null;
    const idx = getIndex(LS_TRANSCRIBE_IDX, pool.length);
    setIndex(LS_TRANSCRIBE_IDX, idx + 1, pool.length);
    return pool[getIndex(LS_TRANSCRIBE_IDX, pool.length)];
}

// =============================================================
// File selection (click, browse, and drag & drop)
// =============================================================
function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Best-effort, client-side size heads-up for the Gladia/Groq/AssemblyAI transcription pool.
// Providers change their limits over time and this app has no way to know which plan/tier
// the user's key is on, so this is informational only — the app still attempts the upload,
// and transcribeMediaWithRotation() already rotates to the next provider on failure. Its
// purpose is just to surface a plausible reason up front instead of a confusing silent
// failure partway through (see review item on file-size guidance).
function getMediaSizeWarning(bytes) {
    // Both Transcribe and Recap now decode in the browser and send small 16kHz WAV chunks, so
    // provider upload limits no longer apply — only the browser's decode memory does.
    const mb = bytes / (1024 * 1024);
    if (mb > 1500) return ' ⚠ ဖိုင်ကြီးလွန်းသဖြင့် browser decode လုပ်ရာတွင် memory ပြည့်နိုင်သည်';
    if (mb > 500) return ' ⚠ ဖိုင်ကြီးသဖြင့် decode ကြာနိုင်သည် (phone/tab memory သတိ)';
    return '';
}

function setSelectedMediaFile(file) {
    if (!file) return;
    selectedMediaFile = file;
    selectedMediaDurationSec = null; // unknown again until this file's metadata probe resolves below
    const sizeWarning = getMediaSizeWarning(file.size);
    mediaFileMeta.textContent = `${file.name} • ${formatBytes(file.size)}${sizeWarning}`;
    mediaFileDropzone.classList.add('border-emerald-500/50');

    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
        selectedMediaDurationSec = probe.duration;
        mediaFileMeta.textContent = `${file.name} • ${formatBytes(file.size)} • ${formatTime(probe.duration)}${sizeWarning}`;
        URL.revokeObjectURL(objectUrl);
    };
    probe.onerror = () => URL.revokeObjectURL(objectUrl);
    probe.src = objectUrl;
}

mediaFileInput.addEventListener('change', () => setSelectedMediaFile(mediaFileInput.files[0]));
mediaFileDropzone.addEventListener('click', () => mediaFileInput.click());
['dragenter', 'dragover'].forEach(evt => {
    mediaFileDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        mediaFileDropzone.classList.add('border-cyan-300');
    });
});
['dragleave', 'drop'].forEach(evt => {
    mediaFileDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        mediaFileDropzone.classList.remove('border-cyan-300');
    });
});
mediaFileDropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) setSelectedMediaFile(file);
});

// =============================================================
// SRT timestamp helpers (for providers that don't return SRT directly)
// =============================================================
function formatSrtTimestamp(totalSeconds) {
    const ms = Math.max(0, Math.round(totalSeconds * 1000));
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const msRem = ms % 1000;
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msRem, 3)}`;
}

function segmentsToSrt(segments) {
    if (!segments || segments.length === 0) return '';
    return segments.map((seg, i) =>
        `${i + 1}\n${formatSrtTimestamp(seg.start)} --> ${formatSrtTimestamp(seg.end)}\n${seg.text}`
    ).join('\n\n') + '\n';
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Small exponential backoff before a retry after a failed attempt (HTTP error or timeout).
// Previously every retry loop in the app re-fired immediately after rotating key/model,
// which risked bursting straight into another rate limit on the next key too. Capped low
// (≤2s) so it doesn't meaningfully slow down normal multi-key rotation.
function retryBackoffMs(attempt) {
    return Math.min(300 * Math.pow(1.7, attempt), 2000);
}

// =============================================================
// Groq (Whisper) transcription call
// =============================================================
async function callGroqTranscribe(key, file, language, timeoutSec) {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('model', getGroqModel());
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    if (language && language !== 'auto') form.append('language', language);

    const controller = new AbortController();
    activeTranscribeAbortControllers.push(controller);
    const timer = setTimeout(() => controller.abort(), Math.max(timeoutSec, 10) * 1000);

    try {
        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}` },
            body: form,
            signal: controller.signal
        });

        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            throw new Error(`Groq HTTP ${response.status}${errBody ? ' — ' + errBody.slice(0, 140) : ''}`);
        }

        const data = await response.json();
        const segments = (data.segments || []).map(s => ({
            start: s.start, end: s.end, text: (s.text || '').trim()
        }));
        return {
            fullText: (data.text || segments.map(s => s.text).join(' ')).trim(),
            segments,
            srtDirect: null,
            raw: data
        };
    } catch (e) {
        if (e.name === 'AbortError') throw new Error(transcribeAborted ? 'Stopped by user' : `Timeout (${timeoutSec}s)`);
        throw e;
    } finally {
        clearTimeout(timer);
        activeTranscribeAbortControllers = activeTranscribeAbortControllers.filter(c => c !== controller);
    }
}

// =============================================================
// Gladia transcription call — upload → create job → poll for result
// =============================================================
async function callGladiaTranscribe(key, file, language, timeoutSec, onLog) {
    const controller = new AbortController();
    activeTranscribeAbortControllers.push(controller);
    const hardTimer = setTimeout(() => controller.abort(), Math.max(timeoutSec, 30) * 1000);

    try {
        // Step 1 — upload the raw file, get back an audio_url
        const uploadForm = new FormData();
        uploadForm.append('audio', file, file.name);
        const uploadRes = await fetch('https://api.gladia.io/v2/upload', {
            method: 'POST',
            headers: { 'x-gladia-key': key },
            body: uploadForm,
            signal: controller.signal
        });
        if (!uploadRes.ok) throw new Error(`Gladia upload HTTP ${uploadRes.status}`);
        const uploadData = await uploadRes.json();

        // Step 2 — create the transcription job (ask for ready-made SRT subtitles)
        const jobBody = {
            audio_url: uploadData.audio_url,
            subtitles: true,
            subtitles_config: { formats: ['srt'] }
        };
        if (language && language !== 'auto') jobBody.language = language;
        else jobBody.detect_language = true;

        const jobRes = await fetch('https://api.gladia.io/v2/transcription', {
            method: 'POST',
            headers: { 'x-gladia-key': key, 'Content-Type': 'application/json' },
            body: JSON.stringify(jobBody),
            signal: controller.signal
        });
        if (!jobRes.ok) throw new Error(`Gladia job HTTP ${jobRes.status}`);
        const jobData = await jobRes.json();
        const resultUrl = jobData.result_url || `https://api.gladia.io/v2/transcription/${jobData.id}`;

        // Step 3 — poll until done
        const maxPolls = Math.max(Math.floor(timeoutSec / 3), 8);
        for (let i = 0; i < maxPolls; i++) {
            await sleep(3000);
            const pollRes = await fetch(resultUrl, { headers: { 'x-gladia-key': key }, signal: controller.signal });
            if (!pollRes.ok) throw new Error(`Gladia poll HTTP ${pollRes.status}`);
            const pollData = await pollRes.json();

            if (pollData.status === 'done') {
                const t = pollData.result?.transcription || {};
                const utterances = (t.utterances || []).map(u => ({
                    start: u.start, end: u.end, text: (u.text || '').trim()
                }));
                const srtEntry = (t.subtitles || []).find(s => s.format === 'srt');
                return {
                    fullText: (t.full_transcript || utterances.map(u => u.text).join(' ')).trim(),
                    segments: utterances,
                    srtDirect: srtEntry ? srtEntry.subtitles : null,
                    raw: pollData
                };
            }
            if (pollData.status === 'error') {
                throw new Error(`Gladia error (${pollData.error_code || 'unknown'})`);
            }
            if (onLog) onLog(`[GLADIA] status: ${pollData.status}...`);
        }
        throw new Error('Gladia timeout — ရလဒ်စောင့်ချိန် ကျော်လွန်သွားပါသည်');
    } catch (e) {
        if (e.name === 'AbortError') throw new Error(transcribeAborted ? 'Stopped by user' : `Timeout (${timeoutSec}s)`);
        throw e;
    } finally {
        clearTimeout(hardTimer);
        activeTranscribeAbortControllers = activeTranscribeAbortControllers.filter(c => c !== controller);
    }
}

// =============================================================
// AssemblyAI transcription call — upload → create transcript → poll → sentences
// =============================================================
async function callAssemblyAiTranscribe(key, file, language, timeoutSec, onLog) {
    const controller = new AbortController();
    activeTranscribeAbortControllers.push(controller);
    const hardTimer = setTimeout(() => controller.abort(), Math.max(timeoutSec, 30) * 1000);

    try {
        // Step 1 — upload the raw audio/video bytes, get back a temporary upload_url
        const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: { 'Authorization': key },
            body: file,
            signal: controller.signal
        });
        if (!uploadRes.ok) throw new Error(`AssemblyAI upload HTTP ${uploadRes.status}`);
        const uploadData = await uploadRes.json();

        // Step 2 — create the transcript job
        const jobBody = { audio_url: uploadData.upload_url, punctuate: true, format_text: true };
        if (language && language !== 'auto') jobBody.language_code = language;
        else jobBody.language_detection = true;

        const jobRes = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: { 'Authorization': key, 'Content-Type': 'application/json' },
            body: JSON.stringify(jobBody),
            signal: controller.signal
        });
        if (!jobRes.ok) throw new Error(`AssemblyAI job HTTP ${jobRes.status}`);
        const jobData = await jobRes.json();
        const transcriptId = jobData.id;

        // Step 3 — poll until done
        const maxPolls = Math.max(Math.floor(timeoutSec / 3), 8);
        for (let i = 0; i < maxPolls; i++) {
            await sleep(3000);
            const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                headers: { 'Authorization': key },
                signal: controller.signal
            });
            if (!pollRes.ok) throw new Error(`AssemblyAI poll HTTP ${pollRes.status}`);
            const pollData = await pollRes.json();

            if (pollData.status === 'completed') {
                // Best-effort sentence-level timestamps for SRT — falls back to plain text if unavailable
                let segments = [];
                try {
                    const sentRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`, {
                        headers: { 'Authorization': key },
                        signal: controller.signal
                    });
                    if (sentRes.ok) {
                        const sentData = await sentRes.json();
                        segments = (sentData.sentences || []).map(s => ({
                            start: s.start / 1000, end: s.end / 1000, text: (s.text || '').trim()
                        }));
                    }
                } catch (e) { /* sentence breakdown is optional */ }
                return {
                    fullText: (pollData.text || '').trim(),
                    segments,
                    srtDirect: null,
                    raw: pollData
                };
            }
            if (pollData.status === 'error') {
                throw new Error(`AssemblyAI error: ${pollData.error || 'unknown'}`);
            }
            if (onLog) onLog(`[ASSEMBLYAI] status: ${pollData.status}...`);
        }
        throw new Error('AssemblyAI timeout — ရလဒ်စောင့်ချိန် ကျော်လွန်သွားပါသည်');
    } catch (e) {
        if (e.name === 'AbortError') throw new Error(transcribeAborted ? 'Stopped by user' : `Timeout (${timeoutSec}s)`);
        throw e;
    } finally {
        clearTimeout(hardTimer);
        activeTranscribeAbortControllers = activeTranscribeAbortControllers.filter(c => c !== controller);
    }
}

// =============================================================
// Combined retry/rotate driver across the Gladia+Groq+AssemblyAI pool
// =============================================================
// Single dispatch point for "call whichever provider this credential belongs to" — shared
// by both the whole-file path (transcribeMediaWithRotation, still used by AI Recap Studio)
// and the chunked/parallel path below (transcribeChunkWithRotation), so both stay in sync.
async function callProviderTranscribe(cred, file, language, timeoutSec, onLog) {
    return cred.provider === 'groq'
        ? await callGroqTranscribe(cred.key, file, language, timeoutSec)
        : cred.provider === 'assemblyai'
        ? await callAssemblyAiTranscribe(cred.key, file, language, timeoutSec, onLog)
        : await callGladiaTranscribe(cred.key, file, language, timeoutSec, onLog);
}

async function transcribeMediaWithRotation(file, language, maxRetries, timeoutSec, onLog) {
    const pool = getTranscribeCredentialPool();
    if (pool.length === 0) throw new Error('Gladia/Groq/AssemblyAI API key မရှိပါ။');

    const totalAttempts = Math.min(pool.length * Math.max(maxRetries, 1), 15);
    let cred = nextTranscribeCredential();
    let lastErr;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        if (transcribeAborted) throw new Error('Stopped by user');
        onLog(`[${cred.provider.toUpperCase()}] attempt ${attempt + 1}/${totalAttempts} စတင်နေသည်...`);
        try {
            const result = await callProviderTranscribe(cred, file, language, timeoutSec, onLog);
            return { ...result, provider: cred.provider };
        } catch (e) {
            lastErr = e;
            onLog(`[${cred.provider.toUpperCase()}] error: ${e.message} — rotating...`, 'err');
            if (transcribeAborted) throw new Error('Stopped by user');
            cred = advanceTranscribeCredential();
            if (!cred) break;
            await sleep(retryBackoffMs(attempt));
        }
    }
    throw lastErr || new Error('Gladia/Groq/AssemblyAI providers အားလုံး failed ဖြစ်သွားပါသည်');
}

// Same rotation logic as above, but scoped to ONE time-chunk — used by the chunked/parallel
// TRANSCRIBE flow (transcribeMediaWithWorkers) so Chunk Size / Workers now drive Gladia/Groq/
// AssemblyAI too, not just AI TRANSCRIBE (GEMINI). Shares the same round-robin pointer as the
// whole-file path, so a key/provider that fails on one chunk is rotated past on the next too.
async function transcribeChunkWithRotation(chunkFile, language, maxRetries, timeoutSec, onLog) {
    const pool = getTranscribeCredentialPool();
    if (pool.length === 0) throw new Error('Gladia/Groq/AssemblyAI API key မရှိပါ။');
    const order = getProviderOrder();
    if (order !== 'auto' && pool.some(c => c.provider === order)) {
        return transcribeChunkOrdered(chunkFile, language, maxRetries, timeoutSec, onLog, pool, order);
    }

    const totalAttempts = Math.min(pool.length * Math.max(maxRetries, 1), 15);
    let cred = nextTranscribeCredential();
    let lastErr;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        if (transcribeAborted) throw new Error('Stopped by user');
        onLog(`[${cred.provider.toUpperCase()}] chunk attempt ${attempt + 1}/${totalAttempts}...`);
        try {
            const result = await callProviderTranscribe(cred, chunkFile, language, timeoutSec, onLog);
            return { ...result, provider: cred.provider };
        } catch (e) {
            lastErr = e;
            onLog(`[${cred.provider.toUpperCase()}] chunk error: ${e.message} — rotating...`, 'err');
            if (transcribeAborted) throw new Error('Stopped by user');
            cred = advanceTranscribeCredential();
            if (!cred) break;
            await sleep(retryBackoffMs(attempt));
        }
    }
    throw lastErr || new Error('Gladia/Groq/AssemblyAI providers အားလုံး failed ဖြစ်သွားပါသည် (chunk)');
}

// Converts one chunk's transcription result (Gladia's ready-made srtDirect, or the
// segments[] array Groq/AssemblyAI return) into a subs array with timestamps shifted onto
// the FULL media timeline by that chunk's start offset — mirrors offsetSrtTimestamps() in
// the Gemini chunked path further down, so both merge the same way.
function offsetProviderChunkResult(result, offsetSec, onLog) {
    if (result.srtDirect) return offsetSrtTimestamps(result.srtDirect, offsetSec, onLog);
    return (result.segments || [])
        .filter(seg => (seg.text || '').trim())
        .map(seg => ({
            timeLine: `${formatSrtTimestamp((seg.start || 0) + offsetSec)} --> ${formatSrtTimestamp((seg.end || 0) + offsetSec)}`,
            textLines: [seg.text.trim()]
        }));
}

// ---- Worker-pool driven multi-chunk transcription across Gladia/Groq/AssemblyAI ----
// Same Web Audio decode/slice/resample pipeline and same worker-pool pattern as
// geminiTranscribeWithWorkers below — the only difference is each chunk is sent through
// transcribeChunkWithRotation (Gladia/Groq/AssemblyAI pool) instead of straight to Gemini.
async function transcribeMediaWithWorkers(audioBuffer, chunkSizeSec, workerCount, language, maxRetries, timeoutSec, onLog, useWaveformSync = true) {
    const timeChunks = buildSmartTimeChunks(audioBuffer, chunkSizeSec, onLog);
    const results = new Array(timeChunks.length);
    const providerCounts = {};

    renderTranscribeWorkerGrid(Math.max(1, Math.min(workerCount, timeChunks.length || 1)));
    updateTranscribeChunkProgress(0, timeChunks.length);
    onLog(`Media ကို ${timeChunks.length} chunk (${chunkSizeSec}s စီ) အဖြစ် ခွဲပြီးပါပြီ — ${Math.min(workerCount, timeChunks.length)} worker ဖြင့် Gladia/Groq/AssemblyAI pool ကို တစ်ပြိုင်နက် စတင်နေသည်...`);

    let cursor = 0;
    let done = 0;

    async function workerLoop(workerId) {
        while (true) {
            if (transcribeAborted) return;
            const myIdx = cursor++;
            if (myIdx >= timeChunks.length) return;
            const { start, end } = timeChunks[myIdx];
            if (timeChunks[myIdx].silent) {
                results[myIdx] = [];
                onLog(`Chunk ${myIdx + 1}/${timeChunks.length} (${formatTime(start)}–${formatTime(end)}) စကားမပါ — ကျော်လိုက်သည် (quota သက်သာ)`, 'ok');
                done++;
                updateTranscribeChunkProgress(done, timeChunks.length);
                continue;
            }

            setTranscribeWorkerStatus(workerId, 'busy', myIdx + 1, timeChunks.length);
            onLog(`Worker ${workerId + 1} → chunk ${myIdx + 1}/${timeChunks.length} (${formatTime(start)}–${formatTime(end)}) စတင်နေသည်...`);

            // Never give up on a chunk — a transient error (HTTP 503, timeout, etc.) just
            // means this round failed; loop back and try the whole chunk again (re-slice,
            // re-encode, re-send, rotating across the whole Gladia/Groq/AssemblyAI pool again)
            // until it succeeds or the user hits Stop, instead of skipping it after maxRetries.
            let chunkRound = 0;
            let chunkFile;
            try {
                const sliceBuf = sliceAudioBuffer(audioBuffer, start, end);
                const resampled = await resampleTo16kMono(sliceBuf);
                chunkFile = new File([audioBufferToWavBlob(resampled)], `chunk_${myIdx + 1}.wav`, { type: 'audio/wav' });
            } catch (e) {
                onLog(`Chunk ${myIdx + 1} audio encode မအောင်မြင်ပါ: ${e.message}`, 'err');
                chunkRound = MAX_CHUNK_ROUNDS;
            }
            while (chunkRound < MAX_CHUNK_ROUNDS) {
                if (transcribeAborted) return;
                try {
                    if (transcribeAborted) return;
                    const result = await transcribeChunkWithRotation(chunkFile, language, maxRetries, timeoutSec, onLog);
                    results[myIdx] = offsetProviderChunkResult(result, start, onLog);
                    providerCounts[result.provider] = (providerCounts[result.provider] || 0) + 1;
                    setTranscribeWorkerStatus(workerId, 'done', myIdx + 1, timeChunks.length);
                    onLog(`Chunk ${myIdx + 1}/${timeChunks.length} ပြီးပါပြီ ✓ (${result.provider.toUpperCase()}, cue ${results[myIdx].length} ခု)`, 'ok');
                    break;
                } catch (e) {
                    if (transcribeAborted) return;
                    chunkRound++;
                    setTranscribeWorkerStatus(workerId, 'error', myIdx + 1, timeChunks.length);
                    onLog(`Chunk ${myIdx + 1} error: ${e.message} — ပြန်ကြိုးစားနေသည် (round ${chunkRound}/${MAX_CHUNK_ROUNDS})...`, 'err');
                    await sleep(retryBackoffMs(chunkRound));
                }
            }
            if (!results[myIdx]) {
                results[myIdx] = [];
                setTranscribeWorkerStatus(workerId, 'error', myIdx + 1, timeChunks.length);
                onLog(`Chunk ${myIdx + 1} (${formatTime(start)}–${formatTime(end)}) FAILED — ${MAX_CHUNK_ROUNDS} round ပြီးသည်အထိ မရပါ၊ SRT တွင် ဤအပိုင်း ကွက်လပ်ဖြစ်မည် (key/network စစ်ပြီး ထပ်လုပ်ပါ)`, 'err');
            }

            done++;
            updateTranscribeChunkProgress(done, timeChunks.length);
        }
    }

    const effectiveWorkers = Math.max(1, Math.min(workerCount, timeChunks.length || 1));
    const workerPool = [];
    for (let i = 0; i < effectiveWorkers; i++) workerPool.push(workerLoop(i));
    await Promise.all(workerPool);

    const mergedSubs = [];
    results.forEach(r => { if (r) mergedSubs.push(...r); });
    validateMergedSubs(mergedSubs, audioBuffer.duration, onLog);

    let finalSubs = mergedSubs;
    if (useWaveformSync && mergedSubs.length > 0) {
        onLog('Waveform sync: audio envelope ကို တွက်ချက်နေသည်...');
        const envelope = computeSpeechEnvelope(audioBuffer, onLog);
        finalSubs = refineCueTimingsWithEnvelope(mergedSubs, envelope, onLog);
    }

    return { srt: finalSubs.length ? rebuildSrt(finalSubs) : '', providerCounts };
}

// =============================================================
// Main transcribe handler
// =============================================================
const logTranscribe = makeLogger(transcribeLogBox);

async function handleTranscribeMedia() {
    if (!selectedMediaFile) {
        logTranscribe('ERROR: မီဒီယာဖိုင် ရွေးရန်လိုအပ်ပါသည်', 'err');
        return;
    }
    if (getTranscribeCredentialPool().length === 0) {
        logTranscribe('ERROR: Gladia/Groq/AssemblyAI API key မရှိပါ — Key Pool panel တွင် key ထည့်ပါ', 'err');
        return;
    }
    if (isTranscribing) return;
    isTranscribing = true;
    transcribeAborted = false;

    const language = transcribeLangSelect.value;
    const maxRetries = Math.max(parseInt(transcribeMaxRetriesInput.value, 10) || 2, 1);
    const timeoutSec = Math.max(parseInt(transcribeTimeoutSecInput.value, 10) || 120, 10);
    const chunkSizeSec = Math.max(parseInt(transcribeChunkSizeInput.value, 10) || 60, 15);
    const workerCount = Math.max(parseInt(transcribeWorkerCountInput.value, 10) || 3, 1);
    const useWaveformSync = transcribeWaveformSyncToggle ? transcribeWaveformSyncToggle.checked : true;

    transcribeBtn.disabled = true;
    transcribeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>TRANSCRIBING...</span>';
    geminiTranscribeBtn.disabled = true;
    stopTranscribeBtn.disabled = false;
    transcribeDoneBadge.classList.add('hidden');
    transcribeProgressPanel.classList.remove('hidden');
    transcribeChunkProgressWrap.classList.add('hidden');
    transcribeWorkerGrid.innerHTML = '';
    transcribeLogBox.innerHTML = '';
    transcribeOutput.value = '';
    transcribeStatusBadge.textContent = 'RUNNING';

    logTranscribe(`ဖိုင် "${selectedMediaFile.name}" (${formatBytes(selectedMediaFile.size)}) ကို Chunk Size: ${chunkSizeSec}s / Workers: ${workerCount} ဖြင့် Gladia/Groq/AssemblyAI pool ကို transcribe စတင်နေသည်...`);

    try {
        logTranscribe('Audio track ကို browser ထဲမှာ decode လုပ်နေသည်...');
        const audioBuffer = await decodeMediaToAudioBuffer(selectedMediaFile);
        logTranscribe(`Decode ပြီးပါပြီ — Duration: ${formatTime(audioBuffer.duration)}`, 'ok');

        const { srt, providerCounts } = await transcribeMediaWithWorkers(audioBuffer, chunkSizeSec, workerCount, language, maxRetries, timeoutSec, (msg, lvl) => logTranscribe(msg, lvl), useWaveformSync);

        if (transcribeAborted) {
            logTranscribe('User မှ ရပ်တန့်လိုက်ပါသည်။', 'warn');
        }

        const subsForText = parseSrt(srt);
        const providerSummary = Object.entries(providerCounts).map(([p, c]) => `${p.toUpperCase()}:${c}`).join(' ') || 'N/A';
        currentTranscribeResult = {
            srt: srt || '(No timestamped segments returned — see TXT tab)',
            fullText: subsForText.map(s => s.textLines.join(' ')).join('\n'),
            jsonStr: JSON.stringify({ note: 'Generated via TRANSCRIBE — chunked across Gladia/Groq/AssemblyAI pool', chunkSizeSec, workerCount, waveformSync: useWaveformSync, providerCounts, cues: subsForText.length }, null, 2),
            provider: providerSummary,
            sourceFileName: selectedMediaFile.name
        };

        renderTranscribeOutput();
        transcribeOutputMeta.textContent = `Provider: ${providerSummary} (chunked) | Segments: ${subsForText.length} | Characters: ${currentTranscribeResult.fullText.length}`;
        transcribeDoneBadge.classList.remove('hidden');
        transcribeStatusBadge.textContent = 'DONE';
        logTranscribe(`Transcription ပြီးဆုံးပါပြီ ✓ (${providerSummary})`, 'ok');

    } catch (err) {
        console.error('Transcription Error:', err);
        transcribeStatusBadge.textContent = 'FAILED';
        logTranscribe(`FAILED: ${err.message}`, 'err');
    } finally {
        isTranscribing = false;
        transcribeBtn.disabled = false;
        transcribeBtn.innerHTML = '<i class="fa-solid fa-microphone-lines text-yellow-300 text-base"></i><span>TRANSCRIBE</span>';
        geminiTranscribeBtn.disabled = false;
        stopTranscribeBtn.disabled = true;
    }
}

function handleStopTranscribe() {
    transcribeAborted = true;
    activeTranscribeAbortControllers.forEach(c => { try { c.abort(); } catch (e) {} });
    activeTranscribeAbortControllers = [];
    logTranscribe('ရပ်တန့်ရန် တောင်းဆိုလိုက်ပါသည်...', 'warn');
    stopTranscribeBtn.disabled = true;
}

clearTranscribeBtn.addEventListener('click', () => {
    selectedMediaFile = null;
    selectedMediaDurationSec = null;
    mediaFileInput.value = '';
    mediaFileMeta.textContent = 'ဖိုင်ရွေးရန် (.mp4 / .mp3 / .wav / .m4a) — ဒီနေရာသို့ drag & drop လည်းရပါသည်';
    mediaFileDropzone.classList.remove('border-emerald-500/50');
    currentTranscribeResult = null;
    transcribeOutput.value = '';
    transcribeOutputMeta.textContent = '';
    transcribeCheckResultsBox.classList.add('hidden');
    transcribeCheckResultsBox.innerHTML = '';
    transcribeDoneBadge.classList.add('hidden');
    transcribeLogBox.innerHTML = '';
    transcribeWorkerGrid.innerHTML = '';
    transcribeChunkProgressWrap.classList.add('hidden');
    transcribeProgressPanel.classList.add('hidden');
    transcribeStatusBadge.textContent = 'IDLE';
});

transcribeBtn.addEventListener('click', handleTranscribeMedia);
stopTranscribeBtn.addEventListener('click', handleStopTranscribe);

// =============================================================
// Output format switcher (SRT / TXT / JSON) + Copy / Download
// =============================================================
function setActiveFormatBtn(fmt) {
    [outFormatSrtBtn, outFormatTxtBtn, outFormatJsonBtn].forEach(btn => {
        btn.className = "px-2 py-1 rounded bg-black/60 text-cyan-400 border border-cyan-500/30";
    });
    const activeBtn = fmt === 'srt' ? outFormatSrtBtn : fmt === 'txt' ? outFormatTxtBtn : outFormatJsonBtn;
    activeBtn.className = "px-2 py-1 rounded bg-cyan-500 text-black font-bold";
}

function renderTranscribeOutput() {
    if (!currentTranscribeResult) { transcribeOutput.value = ''; return; }
    if (activeOutputFormat === 'srt') transcribeOutput.value = currentTranscribeResult.srt;
    else if (activeOutputFormat === 'txt') transcribeOutput.value = currentTranscribeResult.fullText;
    else transcribeOutput.value = currentTranscribeResult.jsonStr;
}

outFormatSrtBtn.addEventListener('click', () => { activeOutputFormat = 'srt'; setActiveFormatBtn('srt'); renderTranscribeOutput(); });
outFormatTxtBtn.addEventListener('click', () => { activeOutputFormat = 'txt'; setActiveFormatBtn('txt'); renderTranscribeOutput(); });
outFormatJsonBtn.addEventListener('click', () => { activeOutputFormat = 'json'; setActiveFormatBtn('json'); renderTranscribeOutput(); });

copyTranscribeBtn.addEventListener('click', async () => {
    if (!transcribeOutput.value) return;
    try {
        await navigator.clipboard.writeText(transcribeOutput.value);
        const original = copyTranscribeBtn.innerHTML;
        copyTranscribeBtn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Copied';
        setTimeout(() => { copyTranscribeBtn.innerHTML = original; }, 1800);
    } catch (e) {
        transcribeOutput.select();
        document.execCommand('copy');
    }
});

downloadTranscribeBtn.addEventListener('click', () => {
    if (!transcribeOutput.value) return;
    const baseName = (currentTranscribeResult && currentTranscribeResult.sourceFileName)
        ? currentTranscribeResult.sourceFileName.replace(/\.[^./]+$/, '')
        : `transcript_${Date.now()}`;
    const ext = activeOutputFormat;
    const mime = ext === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8';
    const filename = ext === 'srt' ? `${baseName}.srt` : ext === 'txt' ? `${baseName}_transcript.txt` : `${baseName}_result.json`;

    const blob = new Blob([transcribeOutput.value], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// =============================================================
// Send transcribed SRT straight to the Translator tab
// =============================================================
sendTranscribeToTranslatorBtn.addEventListener('click', () => {
    if (!currentTranscribeResult || !currentTranscribeResult.srt) {
        logTranscribe('ပထမဆုံး transcribe ပြီးမှ Translator ကို ပို့နိုင်ပါမည်', 'warn');
        return;
    }
    srtInput.value = currentTranscribeResult.srt;
    lastSrtSourceFileName = currentTranscribeResult.sourceFileName
        ? currentTranscribeResult.sourceFileName.replace(/\.[^./]+$/, '')
        : null;
    updateSrtInputMeta();
    switchToolView('translator');
    transProgressPanel.classList.remove('hidden');
    logTrans('TRANSCRIBE tab မှ SRT လက်ခံရရှိပါပြီ ✓', 'ok');
});

// =============================================================
// AI TIMESTAMP FIX — Gemini multimodal re-timing pass
// Sends the original media file (audio or video, inline) + the current SRT
// to Gemini so it can listen/watch the actual media and correct drift —
// text content is left untouched, only start/end timing is refined.
// Reuses the same Gemini API keys as the TTS tab's Key & Model panel,
// with its own small model list + rotation pointer.
// =============================================================
const LS_TIMEFIX_MODELS = 'neoyangon_timefix_models';
const LS_TIMEFIX_MODEL_IDX = 'neoyangon_timefix_model_idx';
// Current, generally-available Gemini text model IDs as of this writing — same caveat as
// the other default lists: edit these from the UI (Transcription Key Pool panel) instead of
// depending on this default staying accurate as Google ships new model generations.
const DEFAULT_TIMEFIX_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash"
];
function getTimefixModels() {
    const stored = safeLsGet(LS_TIMEFIX_MODELS);
    if (stored === null) return DEFAULT_TIMEFIX_MODELS.slice();
    const list = parseListInput(stored);
    return list.length ? list : DEFAULT_TIMEFIX_MODELS.slice();
}
function loadTimefixModelsIntoInput() {
    const stored = safeLsGet(LS_TIMEFIX_MODELS);
    timefixModelsInput.value = stored ? parseListInput(stored).join('\n') : DEFAULT_TIMEFIX_MODELS.join('\n');
}
saveTimefixModelsBtn.addEventListener('click', () => {
    safeLsSet(LS_TIMEFIX_MODELS, timefixModelsInput.value.trim());
    setIndex(LS_TIMEFIX_MODEL_IDX, 0, getTimefixModels().length);
    timefixSaveStatusMsg.textContent = 'သိမ်းပြီးပါပြီ ✓';
    setTimeout(() => { timefixSaveStatusMsg.textContent = ''; }, 2500);
});

const timefixCredentialPicker = makeGeminiCredentialPicker(
    LS_TIMEFIX_MODEL_IDX, getTimefixModels,
    'API key မထည့်ရသေးပါ — "Text to Speech" tab ထဲက Key & Model Rotation panel တွင် Gemini API key အနည်းဆုံးတစ်ခု ထည့်ပါ။'
);
function nextTimefixCredential() { return timefixCredentialPicker.next(); }
function advanceTimefixCredential() { return timefixCredentialPicker.advance(); }

const TIMESTAMP_FIX_SYSTEM_PROMPT =
`သင်သည် ပရော်ဖက်ရှင်နယ် SRT subtitle AI ဖြစ်သည် — အသံနှင့်ရုပ်ပုံ ဘာသာပြန်ဆိုခြင်းနှင့် စာတန်းထိုးအချိန်ညှိခြင်းဆိုင်ရာ ကျွမ်းကျင်ပညာရှင်။

ရည်ရွယ်ချက်: ပေးပို့လာသော ဗီဒီယို သို့မဟုတ် အော်ဒီယိုဖိုင်ကို အခြေခံ၍ အလွန်တိကျသည့် SRT timestamp များကို ထုတ်ပေးရန်ဖြစ်ပြီး၊ စာသားများသည် ပြောဆိုသည့်စကားလုံးများနှင့် ရုပ်ပြင်လှုပ်ရှားမှုများအပေါ် အချိန်ကိုက် တိတိကျကျဖြစ်စေရန် ဆောင်ရွက်ပေးပါမည်။

လုပ်ငန်းဆိုင်ရာ လိုအပ်ချက်များ:
၁။ အသံနှင့်ရုပ်ပုံ အချိန်ညှိခြင်း —
• စကားပြောဆိုမှု၏ အစနှင့် အဆုံး အချိန်အတိအကျကို သိရှိနိုင်ရန် အသံ/ဗီဒီယိုလှိုင်းများကို ခွဲခြမ်းစိတ်ဖြာပါ။
• SRT timestamp များသည် နှုတ်ခမ်းလှုပ်ရှားမှု (ဗီဒီယိုတွင်) သို့မဟုတ် အသံထွက်လာသည့်အချိန် (အော်ဒီယိုတွင်) နှင့် တိကျစွာ ကိုက်ညီမှုရှိစေရန် ဆောင်ရွက်ပါ။
• စာတန်းများ နောက်ကျခြင်း သို့မဟုတ် အချိန်တိုအတွင်း ပျောက်ကွယ်သွားခြင်းမျိုး မဖြစ်စေဘဲ သဘာဝကျသော ဖတ်ရှုနှုန်းကို ထိန်းသိမ်းပါ။

ကန့်သတ်ချက်များ:
• အချိန်ကွာဟမှုမရှိစေရန် ညှိနှိုင်းခြင်း — စာသားနှင့် အသံ ထပ်တူမကျခြင်းမျိုး လုံးဝမရှိစေရန် "စကားပြောနှင့် အချိန်ကိုက်မှု" တိကျမှုကို ဦးစားပေးပါ။`;

// existingSrtChunk may be only a PART of the full SRT (see TIMEFIX_CHUNK_CUES below) —
// totalChunks > 1 tells the model to treat it as a self-contained slice rather than
// expecting the whole file, and to keep the same cue count instead of merging/splitting.
function buildTimestampFixPrompt(existingSrtChunk, chunkIndex, totalChunks) {
    const partNote = totalChunks > 1
        ? `\n\nသတိပြုရန် — ဤသည်မှာ SRT အပြည့်အစုံ၏ Part ${chunkIndex + 1}/${totalChunks} သာဖြစ်သည် (media file အပြည့်အစုံကိုသာ ကြည့်ပြီး ဤ part ရှိ cue များကို timing ချိန်ညှိပေးပါ)။ ဤ part ထဲရှိ cue အရေအတွက်အတိုင်းသာ ပြန်ပေးပါ — ပေါင်းစည်းခြင်း/ခွဲခြင်း မလုပ်ပါနှင့်၊ sequence number ကို 1 မှ ပြန်စပါ (အပိုင်းများအားလုံးကို နောက်တွင် ပေါင်းစပ်ပေးပါမည်)။`
        : '';
    return `${TIMESTAMP_FIX_SYSTEM_PROMPT}

အောက်ပါ SRT မူကြမ်းသည် speech-to-text engine (Gladia/Groq/AssemblyAI) မှ auto-generate လုပ်ထားသော ရလဒ်ဖြစ်ပြီး timestamp အချို့ လွဲနေနိုင်ပါသည်။ တွဲပါ media file ကို တိုက်ရိုက် နားထောင်/ကြည့်ပြီး အထက်ပါ standard များနှင့်အညီ timestamp တိုင်းကို ပြန်လည်တိကျအောင် ချိန်ညှိပါ။ စာသားအကြောင်းအရာ (subtitle text) ကို လုံးဝမပြောင်းလဲပါနှင့် — start/end timing ကိုသာ ပြင်ဆင်ပေးပါ။ ပုံစံအတိအကျ (sequence number → timestamp line → text) ပါဝင်သော ပြင်ဆင်ပြီးသား SRT အပြည့်အစုံကိုသာ ပြန်ပေးပါ။${partNote}

--- ORIGINAL SRT START ---
${existingSrtChunk}
--- ORIGINAL SRT END ---`;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('File ကို base64 ပြောင်းရာတွင် error တက်ပါသည်'));
        reader.readAsDataURL(file);
    });
}

// Shared low-level retry/timeout/rotation caller for AI TRANSCRIBE + AI TIMESTAMP FIX + AI
// SRT FORMAT — all three are single-turn Gemini requests expecting { srt: string } back;
// they only differ in what "parts" they send (media+text vs text-only) and the log tag shown
// to the user. This replaces what used to be near-identical ~70-line copies of the same
// retry loop. allowEmpty lets AI TRANSCRIBE treat a silent/music-only chunk (legitimately
// zero cues) as a valid result instead of an error — the other two callers never pass this,
// since an empty SRT from them really is a failed response.
async function callGeminiSrtJson(parts, tag, maxRetries, timeoutSec, onLog, allowEmpty = false) {
    let cred = nextTimefixCredential();
    let lastErr;
    const responseSchema = { type: "OBJECT", properties: { srt: { type: "STRING" } }, required: ["srt"] };

    for (let attempt = 0; attempt < Math.max(maxRetries, 1); attempt++) {
        if (transcribeAborted) throw new Error('Stopped by user');
        const controller = new AbortController();
        activeTranscribeAbortControllers.push(controller);
        const timer = setTimeout(() => controller.abort(), Math.max(timeoutSec, 30) * 1000);

        try {
            if (onLog) onLog(`[${tag}] ${cred.model} ဖြင့် ဆောင်ရွက်နေသည် (attempt ${attempt + 1}/${Math.max(maxRetries, 1)})...`);

            const payload = {
                contents: [{ parts }],
                generationConfig: { responseMimeType: "application/json", responseSchema }
            };
            const apiUrl = `https://vpn2-pro.herher650.workers.dev/?https://generativelanguage.googleapis.com/v1beta/models/${cred.model}:generateContent?key=${cred.key}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timer);

            if (!response.ok) {
                if ([400, 401, 403, 404, 413, 429].includes(response.status)) {
                    if (onLog) onLog(`HTTP ${response.status} — key/model rotating...`, 'warn');
                    const next = advanceTimefixCredential();
                    lastErr = new Error(`HTTP ${response.status}`);
                    if (!next) break;
                    cred = next;
                    if (!transcribeAborted) await sleep(retryBackoffMs(attempt));
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!raw) throw new Error('Empty response from model');

            const obj = extractJsonObject(raw);
            if (typeof obj.srt !== 'string') throw new Error('Incomplete response from model');
            if (!obj.srt.trim()) {
                if (allowEmpty) return '';
                throw new Error('Incomplete response from model');
            }
            return obj.srt.trim() + '\n';

        } catch (e) {
            clearTimeout(timer);
            if (e.name === 'AbortError') {
                lastErr = new Error('Timeout');
                if (onLog) onLog(`Timeout (${timeoutSec}s) — retrying...`, 'warn');
            } else {
                lastErr = e;
            }
            const next = advanceTimefixCredential();
            if (!next) break;
            cred = next;
        } finally {
            activeTranscribeAbortControllers = activeTranscribeAbortControllers.filter(c => c !== controller);
        }
        if (!transcribeAborted) await sleep(retryBackoffMs(attempt));
    }
    throw lastErr || new Error(`${tag} — retries အားလုံး failed ဖြစ်သွားပါသည်`);
}

// =============================================================
// AI TRANSCRIBE (GEMINI) — generate the ORIGINAL SRT directly from raw media
// using only the Gemini key pool (no Gladia/Groq/AssemblyAI needed).
//
// Unlike AI TIMESTAMP FIX (which re-sends the WHOLE original media file with every
// cue-batch request, because it needs an existing SRT to correlate against), this
// tool has no existing SRT to chunk on — so instead it chunks the MEDIA itself,
// by time, entirely in the browser via the Web Audio API (still no ffmpeg):
//   1. decode the file's audio track once,
//   2. slice it into Chunk-Size-second segments,
//   3. downsample each slice to 16kHz mono (small, speech-optimized WAV),
//   4. send Chunk-Size-second WAVs to Gemini in parallel across Worker-count
//      workers (same worker-pool pattern as the SRT Translator tab),
//   5. offset each chunk's returned timestamps by its start time and merge.
// This keeps every single request small regardless of total file length, unlike
// AI TIMESTAMP FIX's whole-file-per-request approach — the trade-off is that a
// sentence spoken right across a chunk boundary can occasionally be split oddly,
// the same trade-off the Translator/SRT-Format chunking already makes.
// =============================================================
const GEMINI_TRANSCRIBE_LANGUAGE_NAMES = {
    my: 'Myanmar (Burmese)',
    en: 'English',
    th: 'Thai',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean'
};

const GEMINI_TRANSCRIBE_SYSTEM_PROMPT =
`သင်သည် ပရော်ဖက်ရှင်နယ် Speech-to-Text Subtitle AI ဖြစ်သည်။
ရည်ရွယ်ချက်: တွဲပါ audio clip ကို တိတိကျကျ နားထောင်ပြီး ပြောဆိုထားသည့်အတိုင်း Original SRT subtitle ကို အစအဆုံး ထုတ်ပေးရန်ဖြစ်သည်။

လုပ်ဆောင်ရန်:
- ကြားရသည့်စကားလုံးများကိုသာ တိကျစွာ transcribe လုပ်ပါ — ဘာသာမပြန်ပါနှင့်၊ အနှစ်ချုပ်မလုပ်ပါနှင့်၊ ဖြည့်စွက်မပြောပါနှင့်။
- Timestamp တစ်ခုစီကို အသံစတင်သည့်အချိန်မှ အသံဆုံးသည့်အချိန်အထိ တိကျစွာ ချိန်ညှိပါ (00:00:00,000 မှ ဤ clip ၏ စတင်ချိန်ဟု သတ်မှတ်ပါ)။
- Timestamp format ကို "HH:MM:SS,mmm" အတိအကျ လိုက်နာပါ — hour 2 လုံး : minute 2 လုံး : second 2 လုံး ကော်မာ millisecond 3 လုံး (ဥပမာ − 00:00:08,200)။ hour digit ကို ဘယ်တော့မှ မချန်ထားပါနှင့် (clip တိုလျှင်တောင် "00" ဟု ထည့်ပါ)၊ millisecond ရှေ့တွင် ကော်မာ "," ကိုသာ သုံးပါ — colon ":" (ဥပမာ 00:08:200 လို ပုံစံ) ဒါမှမဟုတ် dot "." ကို လုံးဝမသုံးပါနှင့်။ clip တိုတိုတို့ (ဥပမာ - နောက်ဆုံး chunk) အတွက်လည်း ဒီ format တိကျမှုကို အတူတူပင် လိုက်နာရပါမည်။
- စကားမပြောသည့် (silence/music-only) အချိန်များကို cue အဖြစ် မထည့်ပါနှင့်။
- စကားတစ်ခွန်းတည်းကို subtitle အများကြီး မခွဲပါနှင့် — သဘာဝကျသော စာကြောင်းတစ်ကြောင်း သို့မဟုတ် နှစ်ကြောင်းအဖြစ်သာ ခွဲပါ။
- Subtitle နံပါတ်များကို 1 မှ အစဉ်လိုက် စီပါ။
- ဤ clip ထဲတွင် စကားလုံးလုံးဝ မပါဝင်ပါက (သီချင်း/တိတ်ဆိတ်မှုသာ ရှိပါက) srt field ကို ဗလာစာလုံးကြိုး ("") အဖြစ် ပြန်ပေးပါ — cue လုပ်၍ ဖန်တီးမပြောပါနှင့်။
- Output သည် UTF-8 SRT text သာ ဖြစ်ရမည်။`;

// chunkIndex/totalChunks let the model know this is a self-contained slice — it does not
// need (and should not try) to know what came before/after; timestamps always restart near
// 00:00:00,000 for every chunk since each chunk is offset back onto the full timeline
// afterwards by offsetSrtTimestamps().
function buildGeminiTranscribePrompt(languageHint, chunkIndex, totalChunks) {
    const langNote = languageHint
        ? `\n\nဤ clip ရှိ စကားပြောဘာသာစကားမှာ ${languageHint} ဖြစ်သည် — ထိုဘာသာစကားဖြင့်သာ transcribe လုပ်ပါ။`
        : '\n\nဤ clip ရှိ စကားပြောဘာသာစကားကို auto-detect လုပ်ပြီး ကြားရသည့်ဘာသာစကားအတိုင်းသာ transcribe လုပ်ပါ။';
    const partNote = totalChunks > 1
        ? `\n\nသတိပြုရန် — ဤ audio clip သည် ပိုရှည်သော media file တစ်ခု၏ Part ${chunkIndex + 1}/${totalChunks} အပိုင်းသာဖြစ်သည် (time-slice လုပ်ထားခြင်းဖြစ်ပြီး full context မလိုအပ်ပါ)။ ဤ clip အတွင်းမှ ကြားရသမျှကိုသာ transcribe လုပ်ပါ။`
        : '';
    return `${GEMINI_TRANSCRIBE_SYSTEM_PROMPT}${langNote}${partNote}`;
}

// ---- Web Audio decode / slice / resample / WAV-encode helpers (no ffmpeg) ----

function decodeMediaToAudioBuffer(file) {
    return file.arrayBuffer().then(arrayBuffer => {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) throw new Error('ဤ browser တွင် Web Audio API မရှိပါ — AI TRANSCRIBE (GEMINI) ကို သုံး၍မရပါ');
        let ctx;
        try { ctx = new AudioCtx({ sampleRate: 16000 }); } catch (e) { ctx = new AudioCtx(); }
        return ctx.decodeAudioData(arrayBuffer)
            .then(audioBuffer => { ctx.close().catch(() => {}); return audioBuffer; })
            .catch(err => { ctx.close().catch(() => {}); throw new Error(`Media ဖိုင်ကို decode လုပ်ရာတွင် error တက်ပါသည် — codec မထောက်ပံ့ခြင်း ဖြစ်နိုင်ပါသည် (${err.message || err})`); });
    });
}

// Copies out just [startSec, endSec) from the full decoded buffer into a standalone
// AudioBuffer at the ORIGINAL sample rate (resampling happens separately below).
function sliceAudioBuffer(audioBuffer, startSec, endSec) {
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const endSample = Math.min(audioBuffer.length, Math.floor(endSec * sampleRate));
    const frameCount = Math.max(1, endSample - startSample);
    const numChannels = audioBuffer.numberOfChannels;
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const sliceCtx = new OfflineCtx(numChannels, frameCount, sampleRate);
    const sliceBuffer = sliceCtx.createBuffer(numChannels, frameCount, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch).subarray(startSample, endSample);
        sliceBuffer.copyToChannel(channelData, ch, 0);
    }
    return sliceBuffer;
}

// Downmixes to mono + resamples to 16kHz — small enough that even a multi-minute chunk
// stays a few MB as WAV, and 16kHz mono is plenty for speech recognition quality.
async function resampleTo16kMono(audioBuffer) {
    const targetRate = 16000;
    const frameCount = Math.max(1, Math.ceil(audioBuffer.duration * targetRate));
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtx(1, frameCount, targetRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    return offlineCtx.startRendering();
}

function audioBufferToWavBlob(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numFrames = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = numFrames * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) channels.push(audioBuffer.getChannelData(ch));
    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            let sample = Math.max(-1, Math.min(1, channels[ch][i]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(offset, sample, true);
            offset += 2;
        }
    }
    return new Blob([view], { type: 'audio/wav' });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('WAV chunk ကို base64 ပြောင်းရာတွင် error တက်ပါသည်'));
        reader.readAsDataURL(blob);
    });
}

// =============================================================
// Waveform-based cue timing refinement (Voice Activity Detection)
// =============================================================
// Provider/Gemini timestamps are decent but not frame-accurate — a cue can start a beat
// late, end a beat early, or (right at a chunk boundary) drift a few hundred ms. Instead
// of trusting those numbers blindly, we run a lightweight energy-based VAD pass over the
// SAME decoded audioBuffer already sitting in memory (no extra download, no extra API
// call) and snap each cue's start/end to the nearest real speech onset/offset.
//
// Scope note: this corrects cues against the ACTUAL AUDIO (voice onset/offset), which is
// what a viewer's ear checks subtitles against for both audio-only files and video files.
// True per-frame lip-movement analysis on the video track would need real-time face/mouth
// detection — a much heavier computer-vision problem that doesn't fit a client-only static
// page. Audio-onset alignment gets the same practical result (captions matching the voice)
// without it.

// Grapheme-aware character count for reading-speed estimates. Plain `.length` badly
// overcounts Burmese text (each visible glyph can be 2-4 UTF-16 code units — base
// consonant + medial + vowel sign + tone marks), which would make Burmese cues look
// "readable" far faster than a human actually reads them. Intl.Segmenter counts visible
// glyph clusters instead; falls back to code-point count on engines without it.
let _graphemeSegmenter = null;
function countReadableChars(text) {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return 0;
    try {
        if (!_graphemeSegmenter && typeof Intl !== 'undefined' && Intl.Segmenter) {
            _graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        }
        if (_graphemeSegmenter) return Array.from(_graphemeSegmenter.segment(clean)).length;
    } catch (e) { /* fall through */ }
    return Array.from(clean).length;
}

// Downmixes the full decoded buffer to mono and computes a per-frame RMS energy
// envelope, then applies hysteresis thresholding — a HIGHER bar to start counting as
// speech than to keep counting as speech, plus a short "hangover" after level drops — so
// a single loud consonant isn't mistaken for a whole word, and a brief natural pause
// mid-sentence isn't mistaken for the end of the line. Runs once per file (not per
// chunk): a single pass over the raw samples, same cost class as the resampling work the
// app already does per chunk.
function computeSpeechEnvelope(audioBuffer, onLog) {
    const numChannels = audioBuffer.numberOfChannels;
    const totalFrames = audioBuffer.length;
    const hopSec = 0.02; // 20ms per analysis frame — fine enough to catch word boundaries
    const hopSamples = Math.max(1, Math.round(hopSec * audioBuffer.sampleRate));
    const frameCount = Math.max(1, Math.ceil(totalFrames / hopSamples));

    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) channels.push(audioBuffer.getChannelData(ch));

    const rms = new Float32Array(frameCount);
    for (let f = 0; f < frameCount; f++) {
        const s0 = f * hopSamples;
        const s1 = Math.min(totalFrames, s0 + hopSamples);
        let sumSq = 0, n = 0;
        for (let i = s0; i < s1; i++) {
            let mixed = 0;
            for (let ch = 0; ch < numChannels; ch++) mixed += channels[ch][i];
            mixed /= numChannels;
            sumSq += mixed * mixed;
            n++;
        }
        rms[f] = n > 0 ? Math.sqrt(sumSq / n) : 0;
    }

    // Noise floor ≈ a low percentile of the energy distribution (robust to a few loud
    // frames skewing a plain average). Speech threshold sits a fixed margin above it,
    // with an absolute floor so a near-silent recording doesn't classify hiss as speech.
    const sorted = Float32Array.from(rms).sort();
    const noiseFloor = sorted[Math.floor(sorted.length * 0.1)] || 0;
    const onThreshold = Math.max(noiseFloor * 3.0, 0.006);
    const offThreshold = Math.max(noiseFloor * 1.8, 0.004);

    const onHangFrames = Math.round(0.03 / hopSec);   // ~30ms above threshold to count as onset
    const offHangFrames = Math.round(0.30 / hopSec);  // ~300ms below threshold to count as offset

    const speech = new Uint8Array(frameCount);
    let state = 0, onRun = 0, offRun = 0;
    for (let f = 0; f < frameCount; f++) {
        if (state === 0) {
            onRun = rms[f] >= onThreshold ? onRun + 1 : 0;
            if (onRun >= onHangFrames) { state = 1; offRun = 0; }
        } else {
            offRun = rms[f] < offThreshold ? offRun + 1 : 0;
            if (offRun >= offHangFrames) { state = 0; onRun = 0; }
        }
        speech[f] = state;
    }

    if (onLog) onLog(`Waveform sync: energy envelope — ${frameCount} frame (${Math.round(hopSec * 1000)}ms စီ) တွက်ချက်ပြီးပါပြီ။`, 'ok');

    const isSpeechAtFrame = (f) => (f >= 0 && f < frameCount) ? !!speech[f] : false;
    const frameAtTime = (t) => Math.min(frameCount - 1, Math.max(0, Math.round(t / hopSec)));

    return {
        hopSec, frameCount, duration: audioBuffer.duration, isSpeechAtFrame, frameAtTime,
        // Nearest transition INTO speech (silence→speech) within ±windowSec of tSec.
        // Searches outward from tSec frame-by-frame so the CLOSEST transition wins.
        nearestOnset(tSec, windowSec) {
            const centerF = frameAtTime(tSec);
            const spanF = Math.round(windowSec / hopSec);
            for (let d = 0; d <= spanF; d++) {
                const candidates = d === 0 ? [centerF] : [centerF - d, centerF + d];
                for (const f of candidates) {
                    if (f <= 0 || f >= frameCount) continue;
                    if (!isSpeechAtFrame(f - 1) && isSpeechAtFrame(f)) return f * hopSec;
                }
            }
            return null;
        },
        // Nearest transition OUT OF speech (speech→silence) within ±windowSec of tSec.
        nearestOffset(tSec, windowSec) {
            const centerF = frameAtTime(tSec);
            const spanF = Math.round(windowSec / hopSec);
            for (let d = 0; d <= spanF; d++) {
                const candidates = d === 0 ? [centerF] : [centerF - d, centerF + d];
                for (const f of candidates) {
                    if (f <= 0 || f >= frameCount) continue;
                    if (isSpeechAtFrame(f - 1) && !isSpeechAtFrame(f)) return f * hopSec;
                }
            }
            return null;
        }
    };
}

// Snaps each cue's start/end onto the real speech onset/offset from the envelope above,
// then enforces a minimum on-screen duration based on how much text there is to read (so
// a short provider-reported duration doesn't flash a long line off-screen before it can
// be read), all while keeping cues in chronological order and never overlapping a
// neighbour. `subs` is the shared {timeLine, textLines} shape used everywhere else in
// this file, so the result can go straight into rebuildSrt() unchanged. Cues whose
// timestamp can't be parsed are left untouched (TIMESTAMP CHECK / AI TIMESTAMP FIX are
// the safety net for those, same as the rest of the app) rather than dropped.
function refineCueTimingsWithEnvelope(subs, envelope, onLog) {
    const SNAP_WINDOW_SEC = 0.6;   // how far to look for a real onset/offset nearby
    const MIN_GAP_SEC = 0.08;      // minimum gap kept between two consecutive cues
    const CHARS_PER_SEC = 14;      // conservative reading speed (mixed EN/MY subtitle norms)
    const MIN_DUR_SEC = 1.0;
    const MAX_EXTEND_SEC = 6.0;    // cap on how far we'll stretch reading time out

    const parsed = subs.map(s => {
        const parts = s.timeLine.split('-->').map(p => p.trim());
        const startMs = parts.length === 2 ? parseSrtTimestampToMs(parts[0]) : null;
        const endMs = parts.length === 2 ? parseSrtTimestampToMs(parts[1]) : null;
        return { sub: s, start: startMs === null ? null : startMs / 1000, end: endMs === null ? null : endMs / 1000 };
    });

    // Process in chronological order (not necessarily array order) so prev/next-cue gap
    // logic lines up with the actual timeline rather than the merge order of chunks.
    const order = parsed
        .map((_, i) => i)
        .filter(i => parsed[i].start !== null && parsed[i].end !== null)
        .sort((a, b) => parsed[a].start - parsed[b].start);

    let adjustedCount = 0;

    for (let k = 0; k < order.length; k++) {
        const idx = order[k];
        const cur = parsed[idx];
        const origStart = cur.start, origEnd = cur.end;
        const prevEnd = k > 0 ? parsed[order[k - 1]].end : null;
        const nextStart = k < order.length - 1 ? parsed[order[k + 1]].start : null;

        // 1) Snap start to the nearest real speech onset near the provider's start time.
        const onset = envelope.nearestOnset(cur.start, SNAP_WINDOW_SEC);
        let newStart = onset !== null ? onset : cur.start;

        // 2) Snap end to the nearest real speech offset near the provider's end time.
        const offset = envelope.nearestOffset(cur.end, SNAP_WINDOW_SEC);
        let newEnd = offset !== null ? offset : cur.end;

        // Never let a snap invert or collapse the cue — fall back to the provider's own
        // numbers for this cue if that happens.
        if (newEnd <= newStart) { newStart = origStart; newEnd = origEnd; }

        // 3) Keep a minimum gap from the previous (already-refined) cue.
        if (prevEnd !== null && newStart < prevEnd + MIN_GAP_SEC) {
            newStart = Math.max(newStart, Math.min(prevEnd + MIN_GAP_SEC, newEnd - 0.1));
        }

        // 4) Enforce a natural reading pace — extend (never shorten below what the voice
        // actually took) so the line doesn't disappear before it can be read, capped so
        // it never runs into the next cue's start.
        const rawText = (cur.sub.translatedText !== undefined && cur.sub.translatedText !== null)
            ? cur.sub.translatedText
            : cur.sub.textLines.join(' ');
        const idealDur = Math.min(MAX_EXTEND_SEC, Math.max(MIN_DUR_SEC, countReadableChars(rawText) / CHARS_PER_SEC));
        if (newEnd - newStart < idealDur) {
            const hardCap = nextStart !== null ? nextStart - MIN_GAP_SEC : Infinity;
            newEnd = Math.min(newStart + idealDur, Math.max(hardCap, newStart + 0.3));
        }
        if (nextStart !== null && newEnd > nextStart - MIN_GAP_SEC) {
            newEnd = Math.max(newStart + 0.3, nextStart - MIN_GAP_SEC);
        }

        if (Math.abs(newStart - origStart) > 0.02 || Math.abs(newEnd - origEnd) > 0.02) adjustedCount++;

        cur.start = newStart;
        cur.end = newEnd;
        cur.sub.timeLine = `${formatSrtTimestamp(newStart)} --> ${formatSrtTimestamp(newEnd)}`;
    }

    if (onLog) onLog(`Waveform sync: cue ${adjustedCount}/${subs.length} ခု ရဲ့ timestamp ကို actual speech + ဖတ်ရှုနှုန်းအလိုက် ချိန်ညှိပြီးပါပြီ။`, 'ok');

    return subs;
}

function buildTimeChunks(totalDurationSec, chunkSizeSec) {
    const chunks = [];
    let start = 0;
    while (start < totalDurationSec) {
        const end = Math.min(start + chunkSizeSec, totalDurationSec);
        chunks.push({ start, end });
        start = end;
    }
    if (chunks.length === 0) chunks.push({ start: 0, end: Math.max(totalDurationSec, 0.1) });
    return chunks;
}

// Parses a chunk's SRT (timestamps relative to that chunk's own 00:00:00,000) and shifts
// every cue's start/end by the chunk's real start offset in the full media timeline.
// Returns a subs array (not yet renumbered — merging + rebuildSrt() renumbers at the end).
// onLog is optional — when given, any cue whose timestamp still can't be parsed (even by
// parseSrtTimestampToMs's lenient fallback) is logged and DROPPED rather than kept: leaving
// it in un-offset would silently place it at the wrong absolute time, which is worse than a
// visible gap the user can catch with TIMESTAMP CHECK or re-run with AI TIMESTAMP FIX.
function offsetSrtTimestamps(srtText, offsetSec, onLog) {
    const subs = parseSrt(srtText);
    const offsetMs = Math.round(offsetSec * 1000);
    const kept = [];
    subs.forEach(s => {
        const parts = s.timeLine.split('-->').map(p => p.trim());
        const startMs = parts.length === 2 ? parseSrtTimestampToMs(parts[0]) : null;
        const endMs = parts.length === 2 ? parseSrtTimestampToMs(parts[1]) : null;
        if (startMs === null || endMs === null) {
            if (onLog) onLog(`Chunk timestamp parse မရပါ — cue "${(s.textLines || []).join(' ').slice(0, 40)}" ကို skip လိုက်ပါသည် ("${s.timeLine}")`, 'err');
            return;
        }
        s.timeLine = `${formatSrtTimestamp((startMs + offsetMs) / 1000)} --> ${formatSrtTimestamp((endMs + offsetMs) / 1000)}`;
        kept.push(s);
    });
    return kept;
}

async function callGeminiTranscribeChunk(wavBase64, chunkIndex, totalChunks, languageHint, maxRetries, timeoutSec, onLog) {
    const parts = [
        { inline_data: { mime_type: 'audio/wav', data: wavBase64 } },
        { text: buildGeminiTranscribePrompt(languageHint, chunkIndex, totalChunks) }
    ];
    // allowEmpty=true — a silent/music-only chunk legitimately has zero cues.
    return callGeminiSrtJson(parts, 'AI-TRANSCRIBE', maxRetries, timeoutSec, onLog, true);
}

// ---- Progress / worker-grid UI (separate chips from the Translator tab's #transWorkerGrid) ----

function updateTranscribeChunkProgress(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    transcribeChunkProgressWrap.classList.remove('hidden');
    transcribeChunkProgressFill.style.width = `${pct}%`;
}

function renderTranscribeWorkerGrid(count) {
    transcribeWorkerGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const chip = document.createElement('span');
        chip.className = 'worker-chip';
        chip.id = `transcribeWorkerChip${i}`;
        chip.textContent = `W${i + 1}: idle`;
        transcribeWorkerGrid.appendChild(chip);
    }
}

function setTranscribeWorkerStatus(workerId, status, chunkNum, totalChunks) {
    const chip = document.getElementById(`transcribeWorkerChip${workerId}`);
    if (!chip) return;
    chip.classList.remove('worker-busy', 'worker-done', 'worker-error');
    if (status === 'busy') {
        chip.classList.add('worker-busy');
        chip.textContent = `W${workerId + 1}: #${chunkNum}/${totalChunks}`;
    } else if (status === 'done') {
        chip.classList.add('worker-done');
        chip.textContent = `W${workerId + 1}: ✓ #${chunkNum}`;
    } else if (status === 'error') {
        chip.classList.add('worker-error');
        chip.textContent = `W${workerId + 1}: ✗ #${chunkNum}`;
    }
}

// ---- Worker-pool driven multi-chunk direct transcription (mirrors translateSrtWithWorkers) ----
async function geminiTranscribeWithWorkers(audioBuffer, chunkSizeSec, workerCount, languageHint, maxRetries, timeoutSec, onLog, useWaveformSync = true) {
    const timeChunks = buildSmartTimeChunks(audioBuffer, chunkSizeSec, onLog);
    const results = new Array(timeChunks.length);

    renderTranscribeWorkerGrid(Math.max(1, Math.min(workerCount, timeChunks.length || 1)));
    updateTranscribeChunkProgress(0, timeChunks.length);
    onLog(`Media ကို ${timeChunks.length} chunk (${chunkSizeSec}s စီ) အဖြစ် ခွဲပြီးပါပြီ — ${Math.min(workerCount, timeChunks.length)} worker ဖြင့် တစ်ပြိုင်နက် စတင်နေသည်...`);

    let cursor = 0;
    let done = 0;

    async function workerLoop(workerId) {
        while (true) {
            if (transcribeAborted) return;
            const myIdx = cursor++;
            if (myIdx >= timeChunks.length) return;
            const { start, end } = timeChunks[myIdx];
            if (timeChunks[myIdx].silent) {
                results[myIdx] = [];
                onLog(`Chunk ${myIdx + 1}/${timeChunks.length} (${formatTime(start)}–${formatTime(end)}) စကားမပါ — ကျော်လိုက်သည် (quota သက်သာ)`, 'ok');
                done++;
                updateTranscribeChunkProgress(done, timeChunks.length);
                continue;
            }

            setTranscribeWorkerStatus(workerId, 'busy', myIdx + 1, timeChunks.length);
            onLog(`Worker ${workerId + 1} → chunk ${myIdx + 1}/${timeChunks.length} (${formatTime(start)}–${formatTime(end)}) စတင်နေသည်...`);

            // Never give up on a chunk — a transient error (HTTP 503, timeout, etc.) just
            // means this round failed; loop back and try the whole chunk again (re-slice,
            // re-encode, re-send) until it succeeds or the user hits Stop. This replaces the
            // old behaviour of skipping the chunk (leaving a gap in the SRT) after maxRetries.
            let chunkRound = 0;
            let wavBase64;
            try {
                const sliceBuf = sliceAudioBuffer(audioBuffer, start, end);
                const resampled = await resampleTo16kMono(sliceBuf);
                wavBase64 = await blobToBase64(audioBufferToWavBlob(resampled));
            } catch (e) {
                onLog(`Chunk ${myIdx + 1} audio encode မအောင်မြင်ပါ: ${e.message}`, 'err');
                chunkRound = MAX_CHUNK_ROUNDS;
            }
            while (chunkRound < MAX_CHUNK_ROUNDS) {
                if (transcribeAborted) return;
                try {
                    if (transcribeAborted) return;
                    const rawSrt = await callGeminiTranscribeChunk(wavBase64, myIdx, timeChunks.length, languageHint, maxRetries, timeoutSec, onLog);
                    results[myIdx] = rawSrt ? offsetSrtTimestamps(rawSrt, start, onLog) : [];
                    setTranscribeWorkerStatus(workerId, 'done', myIdx + 1, timeChunks.length);
                    onLog(`Chunk ${myIdx + 1}/${timeChunks.length} ပြီးပါပြီ ✓ (cue ${results[myIdx].length} ခု)`, 'ok');
                    break;
                } catch (e) {
                    if (transcribeAborted) return;
                    chunkRound++;
                    setTranscribeWorkerStatus(workerId, 'error', myIdx + 1, timeChunks.length);
                    onLog(`Chunk ${myIdx + 1} error: ${e.message} — ပြန်ကြိုးစားနေသည် (round ${chunkRound}/${MAX_CHUNK_ROUNDS})...`, 'err');
                    await sleep(retryBackoffMs(chunkRound));
                }
            }
            if (!results[myIdx]) {
                results[myIdx] = [];
                setTranscribeWorkerStatus(workerId, 'error', myIdx + 1, timeChunks.length);
                onLog(`Chunk ${myIdx + 1} (${formatTime(start)}–${formatTime(end)}) FAILED — ${MAX_CHUNK_ROUNDS} round ပြီးသည်အထိ မရပါ၊ SRT တွင် ဤအပိုင်း ကွက်လပ်ဖြစ်မည် (key/network စစ်ပြီး ထပ်လုပ်ပါ)`, 'err');
            }

            done++;
            updateTranscribeChunkProgress(done, timeChunks.length);
        }
    }

    const effectiveWorkers = Math.max(1, Math.min(workerCount, timeChunks.length || 1));
    const pool = [];
    for (let i = 0; i < effectiveWorkers; i++) pool.push(workerLoop(i));
    await Promise.all(pool);

    const mergedSubs = [];
    results.forEach(r => { if (r) mergedSubs.push(...r); });
    validateMergedSubs(mergedSubs, audioBuffer.duration, onLog);

    let finalSubs = mergedSubs;
    if (useWaveformSync && mergedSubs.length > 0) {
        onLog('Waveform sync: audio envelope ကို တွက်ချက်နေသည်...');
        const envelope = computeSpeechEnvelope(audioBuffer, onLog);
        finalSubs = refineCueTimingsWithEnvelope(mergedSubs, envelope, onLog);
    }

    return finalSubs.length ? rebuildSrt(finalSubs) : '';
}

async function handleGeminiTranscribe() {
    if (!selectedMediaFile) {
        logTranscribe('ERROR: မီဒီယာဖိုင် ရွေးရန်လိုအပ်ပါသည်', 'err');
        return;
    }
    if (getKeys().length === 0) {
        logTranscribe('ERROR: Gemini API key မရှိပါ — "Text to Speech" tab ရဲ့ Key & Model Rotation panel တွင် key ထည့်ပါ', 'err');
        return;
    }
    if (isTranscribing) return;
    isTranscribing = true;
    transcribeAborted = false;

    const chunkSizeSec = Math.max(parseInt(transcribeChunkSizeInput.value, 10) || 60, 15);
    const workerCount = Math.max(parseInt(transcribeWorkerCountInput.value, 10) || 3, 1);
    const maxRetries = Math.max(parseInt(transcribeMaxRetriesInput.value, 10) || 2, 1);
    const timeoutSec = Math.max(parseInt(transcribeTimeoutSecInput.value, 10) || 120, 30);
    const langVal = transcribeLangSelect.value;
    const languageHint = GEMINI_TRANSCRIBE_LANGUAGE_NAMES[langVal] || null;
    const useWaveformSync = transcribeWaveformSyncToggle ? transcribeWaveformSyncToggle.checked : true;

    transcribeBtn.disabled = true;
    geminiTranscribeBtn.disabled = true;
    geminiTranscribeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>GEMINI TRANSCRIBING...</span>';
    stopTranscribeBtn.disabled = false;
    transcribeDoneBadge.classList.add('hidden');
    transcribeProgressPanel.classList.remove('hidden');
    transcribeChunkProgressWrap.classList.add('hidden');
    transcribeWorkerGrid.innerHTML = '';
    transcribeLogBox.innerHTML = '';
    transcribeOutput.value = '';
    transcribeStatusBadge.textContent = 'RUNNING';

    logTranscribe(`ဖိုင် "${selectedMediaFile.name}" (${formatBytes(selectedMediaFile.size)}) ကို Gemini တိုက်ရိုက် transcribe စတင်နေသည် (Chunk Size: ${chunkSizeSec}s, Workers: ${workerCount})...`);

    try {
        logTranscribe('Audio track ကို browser ထဲမှာ decode လုပ်နေသည်...');
        const audioBuffer = await decodeMediaToAudioBuffer(selectedMediaFile);
        logTranscribe(`Decode ပြီးပါပြီ — Duration: ${formatTime(audioBuffer.duration)}`, 'ok');

        const srt = await geminiTranscribeWithWorkers(audioBuffer, chunkSizeSec, workerCount, languageHint, maxRetries, timeoutSec, (msg, lvl) => logTranscribe(msg, lvl), useWaveformSync);

        if (transcribeAborted) {
            logTranscribe('User မှ ရပ်တန့်လိုက်ပါသည်။', 'warn');
        }

        const subsForText = parseSrt(srt);
        currentTranscribeResult = {
            srt: srt || '(No speech detected in this media — empty SRT)',
            fullText: subsForText.map(s => s.textLines.join(' ')).join('\n'),
            jsonStr: JSON.stringify({ note: 'Generated via AI TRANSCRIBE (GEMINI) — chunked, no Gladia/Groq/AssemblyAI', chunkSizeSec, workerCount, waveformSync: useWaveformSync, cues: subsForText.length }, null, 2),
            provider: 'gemini',
            sourceFileName: selectedMediaFile.name
        };

        renderTranscribeOutput();
        transcribeOutputMeta.textContent = `Provider: GEMINI (direct) | Segments: ${subsForText.length} | Characters: ${currentTranscribeResult.fullText.length}`;
        transcribeDoneBadge.classList.remove('hidden');
        transcribeStatusBadge.textContent = 'DONE';
        logTranscribe('AI TRANSCRIBE (GEMINI) ပြီးဆုံးပါပြီ ✓', 'ok');

    } catch (err) {
        console.error('Gemini Transcribe Error:', err);
        transcribeStatusBadge.textContent = 'FAILED';
        logTranscribe(`FAILED: ${err.message}`, 'err');
    } finally {
        isTranscribing = false;
        transcribeBtn.disabled = false;
        geminiTranscribeBtn.disabled = false;
        geminiTranscribeBtn.innerHTML = '<i class="fa-solid fa-brain text-yellow-300 text-base"></i><span>AI TRANSCRIBE (GEMINI)</span>';
        stopTranscribeBtn.disabled = true;
    }
}

geminiTranscribeBtn.addEventListener('click', handleGeminiTranscribe);

// Cues per Gemini request for AI TIMESTAMP FIX. Previously the ENTIRE SRT was requested
// back in one JSON response alongside the full media file — on a 20-30 min video that could
// exceed the model's output-token limit and fail/truncate. Splitting into cue-chunks keeps
// each response small regardless of video length; the full media file is still sent with
// every chunk (needed for audio/video correlation — there's no client-side ffmpeg here to
// trim the media to match), so this trades some extra upload bandwidth for reliability.
const TIMEFIX_CHUNK_CUES = 40;

async function callGeminiFixTimestampsChunk(base64Data, mimeType, srtChunkText, chunkIndex, totalChunks, maxRetries, timeoutSec, onLog) {
    const parts = [
        { inline_data: { mime_type: mimeType, data: base64Data } },
        { text: buildTimestampFixPrompt(srtChunkText, chunkIndex, totalChunks) }
    ];
    return callGeminiSrtJson(parts, 'TIMESTAMP-FIX', maxRetries, timeoutSec, onLog);
}

async function callGeminiFixTimestamps(mediaFile, existingSrt, maxRetries, timeoutSec, onLog) {
    const subs = parseSrt(existingSrt);
    // If the SRT doesn't parse cleanly, fall back to sending it as one unchunked block
    // rather than silently dropping it — the model still sees the whole thing.
    const cueChunks = subs.length > 0 ? chunkArray(subs, TIMEFIX_CHUNK_CUES) : [null];
    const totalChunks = cueChunks.length;

    const base64Data = await fileToBase64(mediaFile);
    const mimeType = mediaFile.type || 'application/octet-stream';

    const fixedTexts = [];
    for (let i = 0; i < totalChunks; i++) {
        if (transcribeAborted) throw new Error('Stopped by user');
        const chunkSrtText = cueChunks[i] ? rebuildSrt(cueChunks[i]) : existingSrt;
        if (onLog && totalChunks > 1) onLog(`[TIMESTAMP-FIX] Chunk ${i + 1}/${totalChunks} (cue ${cueChunks[i] ? cueChunks[i].length : subs.length} ခု) ပို့နေသည်...`);
        const fixedText = await callGeminiFixTimestampsChunk(base64Data, mimeType, chunkSrtText, i, totalChunks, maxRetries, timeoutSec, onLog);
        fixedTexts.push(fixedText);
        if (onLog && totalChunks > 1) onLog(`[TIMESTAMP-FIX] Chunk ${i + 1}/${totalChunks} ပြီးဆုံးပါပြီ ✓`, 'ok');
    }

    // Merge every chunk's cues back together and renumber sequentially across the whole SRT.
    const mergedSubs = [];
    fixedTexts.forEach(text => { mergedSubs.push(...parseSrt(text)); });
    return mergedSubs.length ? rebuildSrt(mergedSubs) : fixedTexts.join('\n');
}

async function handleFixTimestamps() {
    if (!currentTranscribeResult || !currentTranscribeResult.srt) {
        logTranscribe('ERROR: ပထမဆုံး TRANSCRIBE လုပ်ပြီးမှ AI TIMESTAMP FIX ကို သုံးနိုင်ပါမည်', 'err');
        return;
    }
    if (!selectedMediaFile) {
        logTranscribe('ERROR: မူရင်း media ဖိုင် ရှာမတွေ့ပါ — ဖိုင်ကို ထပ်မံ upload လုပ်ပါ', 'err');
        return;
    }
    if (getKeys().length === 0) {
        logTranscribe('ERROR: Gemini API key မရှိပါ — "Text to Speech" tab ရဲ့ Key & Model Rotation panel တွင် key ထည့်ပါ', 'err');
        return;
    }
    // Gemini's inline-request payload limit (media sent as base64 alongside the prompt, no
    // Files API here) has moved around — historically 20MB, raised to ~100MB (encoded) more
    // recently — and can vary by account/region, so this is a conservative client-side guard
    // rather than an authoritative limit. Base64 inflates the raw file by ~1.37x, so a ~70MB
    // raw file is already close to a 100MB encoded payload once the prompt text is added.
    const GEMINI_INLINE_HARD_LIMIT_MB = 70;
    const GEMINI_INLINE_SOFT_LIMIT_MB = 15;
    const mediaMb = selectedMediaFile.size / (1024 * 1024);
    if (mediaMb > GEMINI_INLINE_HARD_LIMIT_MB) {
        logTranscribe(`ERROR: Media ဖိုင် (${formatBytes(selectedMediaFile.size)}) သည် ကြီးလွန်းပါသည် — AI TIMESTAMP FIX သည် ဖိုင်တစ်ခုလုံးကို Gemini request တစ်ခုထဲ inline ထည့်ပို့ရသဖြင့် ~${GEMINI_INLINE_HARD_LIMIT_MB}MB ကျော် video/audio များတွင် fail ဖြစ်တတ်ပါသည်။ ဖိုင်ကို compress လုပ်ပါ သို့မဟုတ် ပိုတိုသော clip ဖြင့် ထပ်စမ်းကြည့်ပါ`, 'err');
        return;
    }
    if (mediaMb > GEMINI_INLINE_SOFT_LIMIT_MB) {
        logTranscribe(`သတိပေးချက်: Media ဖိုင် (${formatBytes(selectedMediaFile.size)}) သည် အနည်းငယ်ကြီးပါသည် — key/account အချို့တွင် ~${GEMINI_INLINE_SOFT_LIMIT_MB}MB ကျော်ရင် fail နိုင်ပါသည်။ fail ဖြစ်ပါက ဖိုင်ကို compress လုပ်ကြည့်ပါ`, 'warn');
    }
    if (isTranscribing) return;
    isTranscribing = true;
    transcribeAborted = false;

    const maxRetries = Math.max(parseInt(transcribeMaxRetriesInput.value, 10) || 2, 1);
    const timeoutSec = Math.max(parseInt(transcribeTimeoutSecInput.value, 10) || 120, 30);

    fixTimestampsBtn.disabled = true;
    fixTimestampsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> FIXING...';
    transcribeStatusBadge.textContent = 'FIXING TIMESTAMPS';
    stopTranscribeBtn.disabled = false;
    logTranscribe('AI TIMESTAMP FIX (Gemini) စတင်နေသည် — media ကို တိုက်ရိုက် ခွဲခြမ်းစိတ်ဖြာနေသည်...');

    try {
        const fixedSrt = await callGeminiFixTimestamps(selectedMediaFile, currentTranscribeResult.srt, maxRetries, timeoutSec, (msg, lvl) => logTranscribe(msg, lvl));
        const prevCues = parseSrt(currentTranscribeResult.srt).length;
        currentTranscribeResult.srt = fixedSrt;
        refreshTranscribeDerived(prevCues);
        renderTranscribeOutput();
        transcribeStatusBadge.textContent = 'DONE';
        logTranscribe('Timestamp ပြင်ဆင်မှု ပြီးဆုံးပါပြီ ✓', 'ok');
        stopTranscribeBtn.disabled = true;
    } catch (err) {
        console.error('Timestamp Fix Error:', err);
        stopTranscribeBtn.disabled = true;
        transcribeStatusBadge.textContent = 'FAILED';
        logTranscribe(`FAILED: ${err.message}`, 'err');
    } finally {
        isTranscribing = false;
        fixTimestampsBtn.disabled = false;
        fixTimestampsBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI TIMESTAMP FIX';
    }
}

fixTimestampsBtn.addEventListener('click', handleFixTimestamps);

// Transcribe tab's own Timestamp Check — runs against the ORIGINAL SRT (from TRANSCRIBE /
// AI TRANSCRIBE / AI TIMESTAMP FIX / AI SRT FORMAT), before it ever reaches the Translator
// tab. Also flags cues that start/end past the actual media duration when that's known
// (set in setSelectedMediaFile's metadata probe) — the clearest sign of real timestamp
// drift, which checkSrtTimestamps alone (format/overlap only) can't catch on its own.
checkTranscribeTimestampsBtn.addEventListener('click', () => {
    if (!currentTranscribeResult || !currentTranscribeResult.srt) {
        showCheckNotice('SRT output မရှိသေးပါ — အရင် TRANSCRIBE / AI TRANSCRIBE လုပ်ပါ', transcribeCheckResultsBox);
        return;
    }
    const subs = parseSrt(currentTranscribeResult.srt);
    if (subs.length === 0) {
        showCheckNotice('SRT ကို parse မရပါ — format ချို့ယွင်းနေနိုင်ပါသည်', transcribeCheckResultsBox);
        return;
    }
    const issues = checkSrtTimestamps(subs, selectedMediaDurationSec);
    const title = selectedMediaDurationSec
        ? `TIMESTAMP CHECK — ${subs.length} lines (media ${formatTime(selectedMediaDurationSec)}) စစ်ဆေးပြီး`
        : `TIMESTAMP CHECK — ${subs.length} lines စစ်ဆေးပြီး`;
    renderCheckResults(title, issues, 'Timestamp error များ မတွေ့ပါ', transcribeCheckResultsBox);
});

// =============================================================
// AI SRT FORMAT — Gemini text-only cleanup pass
// Takes the current (often fragment/word-level) SRT and re-organizes it into
// natural, CapCut/YouTube-style subtitles: merges over-split fragments,
// drops silence padding, removes duplicate/overlapping lines, renumbers
// sequentially. Text-only — no media file needed, reuses the same Gemini
// key pool + model list as AI TIMESTAMP FIX.
// =============================================================
const SRT_FORMAT_SYSTEM_PROMPT =
`သင်သည် Professional Subtitle Editor ဖြစ်သည်။
Input: Transcript သို့မဟုတ် SRT

လုပ်ဆောင်ရန်:
- CapCut နှင့် YouTube Original SRT ထုတ်သည့်ပုံစံအတိုင်း Subtitle ပြန်စီပါ။
- Timestamp များကို အသံစတင်သည့်အချိန်မှ စ၍ အသံဆုံးသည့်အချိန်တွင် အဆုံးသတ်ပါ။
- စကားမပြောသည့် (Silence) အချိန်များကို မထည့်ပါနှင့်။
- စာသားထပ်ခြင်း၊ Timestamp ထပ်ခြင်းနှင့် Overlap များကို ဖယ်ရှားပါ။
- စကားတစ်ခွန်းတည်းကို Subtitle အများကြီး မခွဲပါနှင့်။
- လိုအပ်လျှင် သဘာဝကျသော စာကြောင်းတစ်ကြောင်း သို့မဟုတ် နှစ်ကြောင်းအဖြစ်သာ ခွဲပါ။
- Subtitle နံပါတ်များကို အစဉ်လိုက် ပြန်စီပါ။
- ဖတ်ရလွယ်ပြီး အသံနှင့် 100% ကိုက်ညီသော Original SRT ကိုသာ ထုတ်ပေးပါ။
- Output သည် UTF-8 SRT သာ ဖြစ်ရမည်။`;

// inputChunkText may be only a PART of the full input (see SRT_FORMAT_CHUNK_CUES below).
function buildSrtFormatPrompt(inputChunkText, chunkIndex, totalChunks) {
    const partNote = totalChunks > 1
        ? `\n\nသတိပြုရန် — ဤသည်မှာ Input အပြည့်အစုံ၏ Part ${chunkIndex + 1}/${totalChunks} သာဖြစ်သည်။ ဤ part အတွင်းရှိ fragment များကိုသာ ပေါင်းစည်း/ပြန်စီပါ (အခြား part များနှင့် ပေါင်းစပ်ရန် မလိုအပ်ပါ — အားလုံးကို နောက်တွင် ပေါင်းစပ်ပေးပါမည်)။ Subtitle နံပါတ်ကို 1 မှ ပြန်စပါ။`
        : '';
    return `${SRT_FORMAT_SYSTEM_PROMPT}

အောက်ပါ Input (fragment/word-level SRT ဖြစ်နိုင်သည်) ကို အထက်ပါစည်းမျဉ်းများနှင့်အညီ ပြန်လည်စီစဉ်ပြင်ဆင်ပါ။ ပါရှိပြီးသား start/end timestamp များကို အခြေခံ၍ ဆက်စပ်နေသော fragment များကို တစ်ကြောင်းတည်းအဖြစ် ပေါင်းစည်းပါ (ပေါင်းစည်းထားသော segment ရဲ့ start ကို အုပ်စုအတွင်းရှိ အစောဆုံး start၊ end ကို အနောက်ဆုံး end အဖြစ်သုံးပါ)။ စာသားကို ဘာသာမပြန်ပါနှင့်၊ မူရင်းစာသားကိုသာ သုံးပါ။${partNote}

--- INPUT START ---
${inputChunkText}
--- INPUT END ---`;
}

// Cues per Gemini request for AI SRT FORMAT. Same output-token-overflow problem as AI
// TIMESTAMP FIX above, but this pass is text-only, so chunking is simpler — no media file
// to resend per chunk. Chunk boundaries may occasionally interrupt a sentence that would
// otherwise have been merged across the cut; this is the same trade-off the Translator
// module already makes with its worker-pool chunking.
const SRT_FORMAT_CHUNK_CUES = 60;

async function callGeminiFormatSrtChunk(chunkText, chunkIndex, totalChunks, maxRetries, timeoutSec, onLog) {
    const parts = [{ text: buildSrtFormatPrompt(chunkText, chunkIndex, totalChunks) }];
    return callGeminiSrtJson(parts, 'SRT-FORMAT', maxRetries, timeoutSec, onLog);
}

async function callGeminiFormatSrt(inputText, maxRetries, timeoutSec, onLog) {
    const subs = parseSrt(inputText);
    const cueChunks = subs.length > 0 ? chunkArray(subs, SRT_FORMAT_CHUNK_CUES) : [null];
    const totalChunks = cueChunks.length;

    const fixedTexts = [];
    for (let i = 0; i < totalChunks; i++) {
        if (transcribeAborted) throw new Error('Stopped by user');
        const chunkText = cueChunks[i] ? rebuildSrt(cueChunks[i]) : inputText;
        if (onLog && totalChunks > 1) onLog(`[SRT-FORMAT] Chunk ${i + 1}/${totalChunks} (cue ${cueChunks[i] ? cueChunks[i].length : subs.length} ခု) ပို့နေသည်...`);
        const fixedText = await callGeminiFormatSrtChunk(chunkText, i, totalChunks, maxRetries, timeoutSec, onLog);
        fixedTexts.push(fixedText);
        if (onLog && totalChunks > 1) onLog(`[SRT-FORMAT] Chunk ${i + 1}/${totalChunks} ပြီးဆုံးပါပြီ ✓`, 'ok');
    }

    const mergedSubs = [];
    fixedTexts.forEach(text => { mergedSubs.push(...parseSrt(text)); });
    return mergedSubs.length ? rebuildSrt(mergedSubs) : fixedTexts.join('\n');
}

async function handleFormatSrt() {
    if (!currentTranscribeResult || !currentTranscribeResult.srt) {
        logTranscribe('ERROR: ပထမဆုံး TRANSCRIBE လုပ်ပြီးမှ AI SRT FORMAT ကို သုံးနိုင်ပါမည်', 'err');
        return;
    }
    if (getKeys().length === 0) {
        logTranscribe('ERROR: Gemini API key မရှိပါ — "Text to Speech" tab ရဲ့ Key & Model Rotation panel တွင် key ထည့်ပါ', 'err');
        return;
    }
    if (isTranscribing) return;
    isTranscribing = true;
    transcribeAborted = false;

    const maxRetries = Math.max(parseInt(transcribeMaxRetriesInput.value, 10) || 2, 1);
    const timeoutSec = Math.max(parseInt(transcribeTimeoutSecInput.value, 10) || 120, 30);

    formatSrtBtn.disabled = true;
    formatSrtBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> FORMATTING...';
    transcribeStatusBadge.textContent = 'FORMATTING SRT';
    stopTranscribeBtn.disabled = false;
    logTranscribe('AI SRT FORMAT (Gemini) စတင်နေသည် — fragment/duplicate/overlap များ ရှာဖွေနေသည်...');

    try {
        const formattedSrt = await callGeminiFormatSrt(currentTranscribeResult.srt, maxRetries, timeoutSec, (msg, lvl) => logTranscribe(msg, lvl));
        currentTranscribeResult.srt = formattedSrt;
        refreshTranscribeDerived(0);
        renderTranscribeOutput();
        transcribeStatusBadge.textContent = 'DONE';
        logTranscribe('SRT ပြန်စီခြင်း ပြီးဆုံးပါပြီ ✓', 'ok');
        stopTranscribeBtn.disabled = true;
    } catch (err) {
        console.error('SRT Format Error:', err);
        stopTranscribeBtn.disabled = true;
        transcribeStatusBadge.textContent = 'FAILED';
        logTranscribe(`FAILED: ${err.message}`, 'err');
    } finally {
        isTranscribing = false;
        formatSrtBtn.disabled = false;
        formatSrtBtn.innerHTML = '<i class="fa-solid fa-list-check"></i> AI SRT FORMAT';
    }
}

formatSrtBtn.addEventListener('click', handleFormatSrt);

// =============================================================
// Transcribe module init
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
    loadTranscribeKeysIntoInputs();
    setActiveFormatBtn('srt');
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
//  AI RECAP STUDIO MODULE — appended module, does not modify any code above this line
//  (aside from the shared switchToolView()/tab wiring near the top of the file).
//  One Click: Upload → Transcribe (reuses Transcribe tab's Gladia/Groq/AssemblyAI key pool) → Gemini
//  (reuses TTS tab's Gemini key pool, own model list) → Clean Transcript + Myanmar
//  Translation + Recap (Summary/Key Points/Chapters) + Titles, in a single structured call.
//  Fully client-side — no backend, no FFmpeg, no video merge (see scope note in the UI).
// =============================================================================================

// ---- DOM Element Cache (Recap Studio view) ----
const toggleRecapKeyPanelBtn = document.getElementById('toggleRecapKeyPanelBtn');
const recapKeyPanelBody = document.getElementById('recapKeyPanelBody');
const recapModelsInput = document.getElementById('recapModelsInput');
const saveRecapModelsBtn = document.getElementById('saveRecapModelsBtn');
const recapSaveStatusMsg = document.getElementById('recapSaveStatusMsg');

const recapFileInput = document.getElementById('recapFileInput');
const recapFileDropzone = document.getElementById('recapFileDropzone');
const recapFileMeta = document.getElementById('recapFileMeta');

const recapLangSelect = document.getElementById('recapLangSelect');
const recapMaxRetriesInput = document.getElementById('recapMaxRetries');
const recapTimeoutSecInput = document.getElementById('recapTimeoutSec');
const recapRewriteLevelSelect = document.getElementById('recapRewriteLevel');
const clearRecapBtn = document.getElementById('clearRecapBtn');
const generateRecapBtn = document.getElementById('generateRecapBtn');
const stopRecapBtn = document.getElementById('stopRecapBtn');

const recapProgressPanel = document.getElementById('recapProgressPanel');
const recapStatusBadge = document.getElementById('recapStatusBadge');
const recapLogBox = document.getElementById('recapLogBox');

const recapDoneBadge = document.getElementById('recapDoneBadge');
const recapFormatRecapBtn = document.getElementById('recapFormatRecapBtn');
const recapFormatTitlesBtn = document.getElementById('recapFormatTitlesBtn');
const recapFormatCleanBtn = document.getElementById('recapFormatCleanBtn');
const recapFormatMmBtn = document.getElementById('recapFormatMmBtn');
const copyRecapBtn = document.getElementById('copyRecapBtn');
const downloadRecapBtn = document.getElementById('downloadRecapBtn');
const recapOutput = document.getElementById('recapOutput');
const recapOutputMeta = document.getElementById('recapOutputMeta');
const sendRecapToTtsBtn = document.getElementById('sendRecapToTtsBtn');

// ---- Recap-only state ----
const LS_RECAP_MODELS = 'neoyangon_recap_models';
const LS_RECAP_MODEL_IDX = 'neoyangon_recap_model_idx';

// Same caveat as the other default lists — current, GA Gemini model IDs as of this
// writing; edit via the "Recap Model List" box in the UI if one 404s for your key.
const DEFAULT_RECAP_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash"
];

let selectedRecapFile = null;
let isRecapProcessing = false;
let recapAborted = false;
let activeRecapControllers = [];
let currentRecapResult = null; // parsed Gemini object + sourceFileName
let activeRecapFormat = 'recap';

// =============================================================
// Recap model list (own rotation pointer, shares Gemini keys)
// =============================================================
function getRecapModels() {
    const stored = safeLsGet(LS_RECAP_MODELS);
    if (stored === null) return DEFAULT_RECAP_MODELS.slice();
    const list = parseListInput(stored);
    return list.length ? list : DEFAULT_RECAP_MODELS.slice();
}

function loadRecapModelsIntoInput() {
    const stored = safeLsGet(LS_RECAP_MODELS);
    recapModelsInput.value = stored ? parseListInput(stored).join('\n') : DEFAULT_RECAP_MODELS.join('\n');
}

saveRecapModelsBtn.addEventListener('click', () => {
    safeLsSet(LS_RECAP_MODELS, recapModelsInput.value.trim());
    setIndex(LS_RECAP_MODEL_IDX, 0, getRecapModels().length);
    recapSaveStatusMsg.textContent = 'သိမ်းပြီးပါပြီ ✓';
    setTimeout(() => { recapSaveStatusMsg.textContent = ''; }, 2500);
});

toggleRecapKeyPanelBtn.addEventListener('click', () => {
    recapKeyPanelBody.classList.toggle('hidden');
    const icon = toggleRecapKeyPanelBtn.querySelector('i');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
});

const recapCredentialPicker = makeGeminiCredentialPicker(
    LS_RECAP_MODEL_IDX, getRecapModels,
    'API key မထည့်ရသေးပါ — "Text to Speech" tab ထဲက Key & Model Rotation panel တွင် Gemini API key အနည်းဆုံးတစ်ခု ထည့်ပါ။'
);
function nextRecapCredential() {
    if (getRecapModels().length === 0) throw new Error('Recap processing model list ဗလာဖြစ်နေပါသည်။');
    return recapCredentialPicker.next();
}
function advanceRecapCredential() { return recapCredentialPicker.advance(); }

// =============================================================
// File selection (click, browse, and drag & drop)
// =============================================================
function setSelectedRecapFile(file) {
    if (!file) return;
    selectedRecapFile = file;
    const sizeWarning = getMediaSizeWarning(file.size);
    recapFileMeta.textContent = `${file.name} • ${formatBytes(file.size)}${sizeWarning}`;
    recapFileDropzone.classList.add('border-emerald-500/50');

    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
        recapFileMeta.textContent = `${file.name} • ${formatBytes(file.size)} • ${formatTime(probe.duration)}${sizeWarning}`;
        URL.revokeObjectURL(objectUrl);
    };
    probe.onerror = () => URL.revokeObjectURL(objectUrl);
    probe.src = objectUrl;
}

recapFileInput.addEventListener('change', () => setSelectedRecapFile(recapFileInput.files[0]));
recapFileDropzone.addEventListener('click', () => recapFileInput.click());
['dragenter', 'dragover'].forEach(evt => {
    recapFileDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        recapFileDropzone.classList.add('border-cyan-300');
    });
});
['dragleave', 'drop'].forEach(evt => {
    recapFileDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        recapFileDropzone.classList.remove('border-cyan-300');
    });
});
recapFileDropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) setSelectedRecapFile(file);
});

// =============================================================
// Gemini structured JSON-object call: clean + translate + recap + titles
// =============================================================
function extractJsonObject(raw) {
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    try {
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (e) { /* fall through to regex extraction */ }

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            const parsed = JSON.parse(match[0]);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) { /* give up below */ }
    }
    throw new Error('JSON object parse failed');
}

// Shared low-level retry/timeout/rotation caller for Recap Studio's two Gemini passes
// below (chunk clean+translate, and the final summary/title pass) — both are single-turn
// JSON-schema requests that only differ in prompt/schema/required-fields/log tag.
async function callRecapGeminiJson(promptText, responseSchema, requiredFields, tag, maxRetries, timeoutSec, onLog) {
    let cred = nextRecapCredential();
    let lastErr;

    for (let attempt = 0; attempt < Math.max(maxRetries, 1); attempt++) {
        if (recapAborted) throw new Error('Stopped by user');

        const controller = new AbortController();
        activeRecapControllers.push(controller);
        const timer = setTimeout(() => controller.abort(), Math.max(timeoutSec, 1) * 1000);

        try {
            if (onLog) onLog(`[${tag}] ${cred.model} ဖြင့် ဆောင်ရွက်နေသည် (attempt ${attempt + 1}/${Math.max(maxRetries, 1)})...`);
            const payload = {
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { responseMimeType: "application/json", responseSchema }
            };
            const apiUrl = `https://vpn2-pro.herher650.workers.dev/?https://generativelanguage.googleapis.com/v1beta/models/${cred.model}:generateContent?key=${cred.key}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timer);

            if (!response.ok) {
                if ([400, 401, 403, 404, 429].includes(response.status)) {
                    if (onLog) onLog(`HTTP ${response.status} — key/model rotating...`, 'warn');
                    const next = advanceRecapCredential();
                    lastErr = new Error(`HTTP ${response.status}`);
                    if (!next) break;
                    cred = next;
                    if (!recapAborted) await sleep(retryBackoffMs(attempt));
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!raw) throw new Error('Empty response from model');

            const obj = extractJsonObject(raw);
            if (requiredFields.some(f => !obj[f])) throw new Error('Incomplete response from model');
            return obj;

        } catch (e) {
            clearTimeout(timer);
            if (e.name === 'AbortError') {
                lastErr = new Error('Timeout');
                if (onLog) onLog(`Timeout (${timeoutSec}s) — retrying...`, 'warn');
            } else {
                lastErr = e;
            }
            const next = advanceRecapCredential();
            if (!next) break;
            cred = next;
        } finally {
            activeRecapControllers = activeRecapControllers.filter(c => c !== controller);
        }
        if (!recapAborted) await sleep(retryBackoffMs(attempt));
    }

    throw lastErr || new Error(`${tag} — retries အားလုံး failed ဖြစ်သွားပါသည်`);
}

// Splits a raw transcript into character-bounded chunks for the clean+translate pass below,
// trying to break on paragraph/sentence boundaries rather than mid-word.
function splitTranscriptIntoChunks(text, maxChars) {
    maxChars = maxChars || 8000;
    const paragraphs = text.split(/\n+/).filter(p => p.trim());
    const chunks = [];
    let current = '';
    paragraphs.forEach(p => {
        const pieces = p.length > maxChars ? (p.match(/[^.!?။\n]+[.!?။]*\s*/g) || [p]) : [p];
        pieces.forEach(piece => {
            if (current && (current.length + piece.length + 1) > maxChars) {
                chunks.push(current.trim());
                current = piece;
            } else {
                current = current ? current + '\n' + piece : piece;
            }
        });
    });
    if (current.trim()) chunks.push(current.trim());
    return chunks.length ? chunks : [text];
}

// Per-request transcript slice for the clean+translate pass. Previously the WHOLE transcript
// was cleaned, translated, summarized, and titled in a single JSON response that had to
// reproduce the full clean+translated transcript verbatim — on a 20-30 min video that could
// exceed the model's output-token limit and fail/truncate. Splitting clean+translate into
// character-bounded chunks keeps each response small regardless of video length; the
// summary/title pass (below) only ever needs to PRODUCE a short summary, not reproduce the
// transcript, so it stays a single call over the (already chunk-cleaned) full text.
const RECAP_CHUNK_CHARS = 8000;

function buildRecapChunkPrompt(chunkText, chunkIndex, totalChunks) {
    const partNote = totalChunks > 1
        ? ` This is PART ${chunkIndex + 1} of ${totalChunks} of one continuous transcript — clean and translate ONLY this part, do not summarize it, and do not add a heading, part label, or any content belonging to another part.`
        : '';
    return `You are a senior Myanmar-language video content editor. You are given a raw speech-to-text transcript segment.${partNote} Perform these two tasks and return ONLY one JSON object (no markdown, no backticks, no explanation) matching exactly this shape:

{
  "cleanTranscript": string,
  "myanmarTranslation": string
}

Task 1 — cleanTranscript: Fix punctuation and casing, remove filler/noise words (um, uh, repeated words), improve readability, but keep the original language and the original meaning exactly — do not summarize or shorten it.

Task 2 — myanmarTranslation: Translate the cleaned transcript into natural, professional, narration-quality Myanmar (Burmese). Translate for meaning and context, never word-for-word. Preserve names, numbers, and facts exactly. Use normal Myanmar sentence punctuation (this is narration prose, not subtitle lines).

Return ONLY the JSON object described above — valid JSON, no trailing commas, no comments.

--- TRANSCRIPT PART START ---
${chunkText}
--- TRANSCRIPT PART END ---`;
}

async function callRecapCleanTranslateChunk(chunkText, chunkIndex, totalChunks, maxRetries, timeoutSec, onLog) {
    const responseSchema = {
        type: "OBJECT",
        properties: { cleanTranscript: { type: "STRING" }, myanmarTranslation: { type: "STRING" } },
        required: ["cleanTranscript", "myanmarTranslation"]
    };
    const tag = totalChunks > 1 ? `CLEAN+TRANSLATE ${chunkIndex + 1}/${totalChunks}` : 'CLEAN+TRANSLATE';
    return callRecapGeminiJson(buildRecapChunkPrompt(chunkText, chunkIndex, totalChunks), responseSchema, ['cleanTranscript', 'myanmarTranslation'], tag, maxRetries, timeoutSec, onLog);
}

function buildRecapSummaryPrompt(cleanTranscriptText, rewriteLevel) {
    const rewriteInstructions = {
        low: 'Keep close to the original meaning and structure; only lightly vary sentence phrasing and word choice where it still reads naturally.',
        medium: 'Restructure sentences, vary vocabulary, and reorder points where it still reads naturally; aim for roughly 30%-40% wording similarity to a literal transcript-based summary while preserving every fact.',
        high: 'Keep only the underlying facts and story beats; rewrite sentence structure, vocabulary, and ordering substantially in a natural human storytelling style; aim for the lowest wording similarity to the original transcript while preserving every fact.'
    };
    const rewriteNote = rewriteInstructions[rewriteLevel] || rewriteInstructions.medium;

    return `You are a senior Myanmar-language video content editor and AI recap producer. You are given the ALREADY-CLEANED full transcript of an uploaded video/audio — do not reproduce it in your output, only summarize/derive from it. Perform ALL of the following tasks and return ONLY one JSON object (no markdown, no backticks, no explanation) matching exactly this shape:

{
  "shortSummary": string,
  "longSummary": string,
  "keyPoints": string[],
  "importantMoments": string[],
  "chapters": [{"title": string, "description": string}],
  "youtubeTitle": string,
  "tiktokTitle": string,
  "facebookTitle": string,
  "seoKeywords": string[]
}

Task 1 — AI Recap (write these in natural Myanmar, since they will be used for a Myanmar-narrated recap video):
- shortSummary: a tight 2-3 sentence hook summary.
- longSummary: a flowing, well-structured narration-ready paragraph (or a few short paragraphs) covering the full story/content, suitable to be read aloud as recap narration.
- keyPoints: 5-8 concise bullet-style key points.
- importantMoments: 3-6 standout highlights/moments worth emphasizing.
- chapters: an ordered story-flow / chapter breakdown, each item a short {title, description} pair covering one stage of the content.

Task 2 — Title Generator (write in natural, catchy Myanmar unless the source content is clearly in English, in which case you may mix in English where it helps SEO):
- youtubeTitle, tiktokTitle, facebookTitle: platform-appropriate catchy titles for this recap video.
- seoKeywords: 6-10 relevant search keywords/hashtags (Myanmar and/or English, whichever fits the topic best).

Task 3 — Copyright-safe rewriting: Apply this to all fields above. Rewrite level = ${rewriteLevel.toUpperCase()}. ${rewriteNote} Never invent facts that are not in the transcript.

Return ONLY the JSON object described above — valid JSON, no trailing commas, no comments.

--- CLEANED TRANSCRIPT START ---
${cleanTranscriptText}
--- CLEANED TRANSCRIPT END ---`;
}

async function callRecapSummary(cleanTranscriptText, rewriteLevel, maxRetries, timeoutSec, onLog) {
    const responseSchema = {
        type: "OBJECT",
        properties: {
            shortSummary: { type: "STRING" },
            longSummary: { type: "STRING" },
            keyPoints: { type: "ARRAY", items: { type: "STRING" } },
            importantMoments: { type: "ARRAY", items: { type: "STRING" } },
            chapters: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: { title: { type: "STRING" }, description: { type: "STRING" } },
                    required: ["title", "description"]
                }
            },
            youtubeTitle: { type: "STRING" },
            tiktokTitle: { type: "STRING" },
            facebookTitle: { type: "STRING" },
            seoKeywords: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["shortSummary", "longSummary", "keyPoints", "importantMoments", "chapters", "youtubeTitle", "tiktokTitle", "facebookTitle", "seoKeywords"]
    };
    return callRecapGeminiJson(buildRecapSummaryPrompt(cleanTranscriptText, rewriteLevel), responseSchema, ['shortSummary', 'longSummary'], 'RECAP-SUMMARY', maxRetries, timeoutSec, onLog);
}

// Applies the Global Memory / Glossary find/replace pass to every Myanmar-language field
function applyGlossaryToRecapResult(obj) {
    const g = (s) => applyGlossary(String(s || ''));
    return {
        ...obj,
        myanmarTranslation: g(obj.myanmarTranslation),
        shortSummary: g(obj.shortSummary),
        longSummary: g(obj.longSummary),
        keyPoints: (obj.keyPoints || []).map(g),
        importantMoments: (obj.importantMoments || []).map(g),
        chapters: (obj.chapters || []).map(c => ({ title: g(c.title), description: g(c.description) })),
        youtubeTitle: g(obj.youtubeTitle),
        tiktokTitle: g(obj.tiktokTitle),
        facebookTitle: g(obj.facebookTitle),
        seoKeywords: (obj.seoKeywords || []).map(g)
    };
}

// =============================================================
// Progress / Log helpers
// =============================================================
const logRecap = makeLogger(recapLogBox);

// =============================================================
// Main "ONE CLICK GENERATE" handler
// =============================================================
async function handleGenerateRecap() {
    if (isRecapProcessing) return;

    // Show the progress panel / log box FIRST, before any validation check below — it used
    // to stay hidden (class="hidden" in the HTML) until after these checks passed, so a
    // missing file or missing key just logged an invisible line into a hidden box and the
    // button looked like it did nothing at all. Now every outcome (including validation
    // errors) is visible on screen.
    recapProgressPanel.classList.remove('hidden');
    recapLogBox.innerHTML = '';
    recapDoneBadge.classList.add('hidden');
    recapOutput.value = '';
    recapStatusBadge.textContent = 'CHECKING';

    if (!selectedRecapFile) {
        recapStatusBadge.textContent = 'FAILED';
        logRecap('ERROR: မီဒီယာဖိုင် ရွေးရန်လိုအပ်ပါသည် — ဒီ "AI RECAP STUDIO" tab ပေါ်ရှိ dropzone တွင် ဖိုင်ကို ထပ်မံရွေးပါ (Transcribe tab ကို upload ထားခြင်းက Recap tab ကို ကူးမပေးပါ — tab နှစ်ခုစလုံး ဖိုင်သီးခြားစီ upload ပါလုပ်ရပါမည်)', 'err');
        return;
    }
    if (getTranscribeCredentialPool().length === 0) {
        recapStatusBadge.textContent = 'FAILED';
        logRecap('ERROR: Gladia/Groq/AssemblyAI API key မရှိပါ — "မီဒီယာ → SRT" tab ရဲ့ Key Pool panel တွင် key ထည့်ပြီး SAVE KEYS နှိပ်ထားရန် လိုအပ်ပါသည်', 'err');
        return;
    }
    if (getKeys().length === 0) {
        recapStatusBadge.textContent = 'FAILED';
        logRecap('ERROR: Gemini API key မရှိပါ — "Text to Speech" tab ရဲ့ Key & Model Rotation panel တွင် key ထည့်ပြီး သိမ်းထားရန် လိုအပ်ပါသည်', 'err');
        return;
    }

    isRecapProcessing = true;
    recapAborted = false;
    transcribeAborted = false; // shared flag used by the reused transcription pipeline below

    const language = recapLangSelect.value;
    const maxRetries = Math.max(parseInt(recapMaxRetriesInput.value, 10) || 2, 1);
    const timeoutSec = Math.max(parseInt(recapTimeoutSecInput.value, 10) || 120, 10);
    const rewriteLevel = recapRewriteLevelSelect.value;

    generateRecapBtn.disabled = true;
    generateRecapBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>PROCESSING...</span>';
    stopRecapBtn.disabled = false;
    recapStatusBadge.textContent = 'TRANSCRIBING';

    logRecap(`ဖိုင် "${selectedRecapFile.name}" (${formatBytes(selectedRecapFile.size)}) — ONE CLICK စတင်နေသည်...`);

    try {
        // Step 1 — Transcribe (reuses the Transcribe tab's Gladia/Groq/AssemblyAI key pool + rotation)
        const transcript = await transcribeRecapChunked(selectedRecapFile, language, maxRetries, timeoutSec, (msg, lvl) => logRecap(msg, lvl));
        if (recapAborted || transcribeAborted) throw new Error('Stopped by user');
        if (!transcript.fullText || !transcript.fullText.trim()) throw new Error('Transcript ဗလာဖြစ်နေပါသည် — ဖိုင်ကို ပြန်စစ်ပါ');
        logRecap(`Transcription ပြီးဆုံးပါပြီ ✓ (${transcript.provider.toUpperCase()}, ${transcript.fullText.length} characters)`, 'ok');

        // Step 2 — Gemini: clean + translate, chunked (avoids output-token overflow on long
        // videos — see splitTranscriptIntoChunks / callRecapCleanTranslateChunk above)
        recapStatusBadge.textContent = 'AI PROCESSING';
        const chunks = splitTranscriptIntoChunks(transcript.fullText, RECAP_CHUNK_CHARS);
        logRecap(`Gemini ဖြင့် Clean / မြန်မာဘာသာပြန် စတင်နေသည် (${chunks.length} chunk(s))...`);
        const cleanParts = [];
        const mmParts = [];
        for (let i = 0; i < chunks.length; i++) {
            if (recapAborted) throw new Error('Stopped by user');
            const part = await callRecapCleanTranslateChunk(chunks[i], i, chunks.length, maxRetries, timeoutSec, (msg, lvl) => logRecap(msg, lvl));
            cleanParts.push(part.cleanTranscript.trim());
            mmParts.push(part.myanmarTranslation.trim());
            if (chunks.length > 1) logRecap(`Chunk ${i + 1}/${chunks.length} ပြီးဆုံးပါပြီ ✓`, 'ok');
        }
        const cleanTranscript = cleanParts.join('\n\n');
        const myanmarTranslation = mmParts.join('\n\n');

        // Step 3 — Gemini: summary / key points / chapters / titles (single call — output is
        // always short regardless of source length, so no chunking needed here)
        recapStatusBadge.textContent = 'AI SUMMARIZING';
        logRecap('Gemini ဖြင့် Recap Summary / Title Generation စတင်နေသည်...');
        const summaryObj = await callRecapSummary(cleanTranscript, rewriteLevel, maxRetries, timeoutSec, (msg, lvl) => logRecap(msg, lvl));

        let result = { cleanTranscript, myanmarTranslation, ...summaryObj };
        result = applyGlossaryToRecapResult(result);

        currentRecapResult = { ...result, sourceFileName: selectedRecapFile.name };
        renderRecapOutput();
        recapOutputMeta.textContent = `Source: ${transcript.provider.toUpperCase()} | Chapters: ${(result.chapters || []).length} | Key Points: ${(result.keyPoints || []).length}`;
        recapDoneBadge.classList.remove('hidden');
        recapStatusBadge.textContent = 'DONE';
        logRecap('AI Recap Studio — ONE CLICK ပြီးဆုံးပါပြီ ✓', 'ok');

    } catch (err) {
        console.error('Recap Studio Error:', err);
        recapStatusBadge.textContent = 'FAILED';
        logRecap(`FAILED: ${err.message}`, 'err');
    } finally {
        isRecapProcessing = false;
        generateRecapBtn.disabled = false;
        generateRecapBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-yellow-300 text-base"></i><span>ONE CLICK GENERATE</span>';
        stopRecapBtn.disabled = true;
    }
}

function handleStopRecap() {
    recapAborted = true;
    transcribeAborted = true; // also stop the shared transcription pipeline if mid-flight
    activeTranscribeAbortControllers.forEach(c => { try { c.abort(); } catch (e) {} });
    activeTranscribeAbortControllers = [];
    activeRecapControllers.forEach(c => { try { c.abort(); } catch (e) {} });
    activeRecapControllers = [];
    logRecap('ရပ်တန့်ရန် တောင်းဆိုလိုက်ပါသည်...', 'warn');
    stopRecapBtn.disabled = true;
}

clearRecapBtn.addEventListener('click', () => {
    selectedRecapFile = null;
    recapFileInput.value = '';
    recapFileMeta.textContent = 'ဖိုင်ရွေးရန် (.mp4 / .mp3 / .wav / .m4a) — ဒီနေရာသို့ drag & drop လည်းရပါသည်';
    recapFileDropzone.classList.remove('border-emerald-500/50');
    currentRecapResult = null;
    recapOutput.value = '';
    recapOutputMeta.textContent = '';
    recapDoneBadge.classList.add('hidden');
    recapLogBox.innerHTML = '';
    recapProgressPanel.classList.add('hidden');
    recapStatusBadge.textContent = 'IDLE';
});

generateRecapBtn.addEventListener('click', handleGenerateRecap);
stopRecapBtn.addEventListener('click', handleStopRecap);

// =============================================================
// Output format switcher (RECAP / TITLES / CLEAN TXT / MM) + Copy / Download
// =============================================================
function setActiveRecapFormatBtn(fmt) {
    [recapFormatRecapBtn, recapFormatTitlesBtn, recapFormatCleanBtn, recapFormatMmBtn].forEach(btn => {
        btn.className = "px-2 py-1 rounded bg-black/60 text-cyan-400 border border-cyan-500/30";
    });
    const map = { recap: recapFormatRecapBtn, titles: recapFormatTitlesBtn, clean: recapFormatCleanBtn, mm: recapFormatMmBtn };
    map[fmt].className = "px-2 py-1 rounded bg-cyan-500 text-black font-bold";
}

function renderRecapOutput() {
    if (!currentRecapResult) { recapOutput.value = ''; return; }
    const r = currentRecapResult;

    if (activeRecapFormat === 'recap') {
        const keyPoints = (r.keyPoints || []).map(p => `- ${p}`).join('\n');
        const moments = (r.importantMoments || []).map(p => `- ${p}`).join('\n');
        const chapters = (r.chapters || []).map((c, i) => `${i + 1}. ${c.title} — ${c.description}`).join('\n');
        recapOutput.value = `◆ SHORT SUMMARY\n${r.shortSummary || ''}\n\n◆ LONG SUMMARY (Narration Ready)\n${r.longSummary || ''}\n\n◆ KEY POINTS\n${keyPoints}\n\n◆ IMPORTANT MOMENTS\n${moments}\n\n◆ CHAPTER / STORY FLOW BREAKDOWN\n${chapters}`;
    } else if (activeRecapFormat === 'titles') {
        const keywords = (r.seoKeywords || []).join(', ');
        recapOutput.value = `YOUTUBE TITLE:\n${r.youtubeTitle || ''}\n\nTIKTOK TITLE:\n${r.tiktokTitle || ''}\n\nFACEBOOK TITLE:\n${r.facebookTitle || ''}\n\nSEO KEYWORDS:\n${keywords}`;
    } else if (activeRecapFormat === 'clean') {
        recapOutput.value = r.cleanTranscript || '';
    } else {
        recapOutput.value = r.myanmarTranslation || '';
    }
}

recapFormatRecapBtn.addEventListener('click', () => { activeRecapFormat = 'recap'; setActiveRecapFormatBtn('recap'); renderRecapOutput(); });
recapFormatTitlesBtn.addEventListener('click', () => { activeRecapFormat = 'titles'; setActiveRecapFormatBtn('titles'); renderRecapOutput(); });
recapFormatCleanBtn.addEventListener('click', () => { activeRecapFormat = 'clean'; setActiveRecapFormatBtn('clean'); renderRecapOutput(); });
recapFormatMmBtn.addEventListener('click', () => { activeRecapFormat = 'mm'; setActiveRecapFormatBtn('mm'); renderRecapOutput(); });

copyRecapBtn.addEventListener('click', async () => {
    if (!recapOutput.value) return;
    try {
        await navigator.clipboard.writeText(recapOutput.value);
        const original = copyRecapBtn.innerHTML;
        copyRecapBtn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Copied';
        setTimeout(() => { copyRecapBtn.innerHTML = original; }, 1800);
    } catch (e) {
        recapOutput.select();
        document.execCommand('copy');
    }
});

downloadRecapBtn.addEventListener('click', () => {
    if (!recapOutput.value) return;
    const baseName = (currentRecapResult && currentRecapResult.sourceFileName)
        ? currentRecapResult.sourceFileName.replace(/\.[^./]+$/, '')
        : `recap_${Date.now()}`;
    const suffix = activeRecapFormat === 'recap' ? '_recap' : activeRecapFormat === 'titles' ? '_titles' : activeRecapFormat === 'clean' ? '_clean' : '_myanmar';
    const filename = `${baseName}${suffix}.txt`;

    const blob = new Blob([recapOutput.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// =============================================================
// Send the Myanmar recap narration (long summary) straight to the TTS tab
// =============================================================
sendRecapToTtsBtn.addEventListener('click', () => {
    if (!currentRecapResult || !currentRecapResult.longSummary) {
        logRecap('ပထမဆုံး ONE CLICK GENERATE လုပ်ပြီးမှ TTS ကို ပို့နိုင်ပါမည်', 'warn');
        return;
    }
    const fullNarration = currentRecapResult.longSummary;
    const narration = fullNarration.slice(0, 10000);
    const wasTruncated = fullNarration.length > narration.length;
    textInput.value = narration;
    charCount.textContent = narration.length;
    switchToolView('tts');
    if (wasTruncated) {
        setStatus(`⚠ AI RECAP STUDIO မှ Narration စာသား လက်ခံရရှိပါပြီ (10,000 လုံး ကျော်သဖြင့် ${fullNarration.length - narration.length} လုံး ဖြတ်ထားပါသည်)`, 'text-yellow-400');
        logRecap(`သတိပေးချက်: TTS သို့ ပို့သော Narration သည် 10,000 လုံး ကျော်နေသဖြင့် ကျန်ရှိသော ${fullNarration.length - narration.length} လုံးကို ဖြတ်တောက်ထားပါသည်`, 'warn');
    } else {
        setStatus('AI RECAP STUDIO မှ Narration စာသား လက်ခံရရှိပါပြီ', 'text-emerald-400');
    }
});

// =============================================================
// Recap Studio module init
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
    loadRecapModelsIntoInput();
    setActiveRecapFormatBtn('recap');
});


// Max whole-chunk retry rounds before a chunk is marked FAILED (instead of retrying forever and burning quota).
const MAX_CHUNK_ROUNDS = 5;

// After AI TIMESTAMP FIX / AI SRT FORMAT the SRT changes — keep TXT/JSON tabs in sync with it.
function refreshTranscribeDerived(previousCueCount) {
    if (!currentTranscribeResult) return;
    const subs = parseSrt(currentTranscribeResult.srt);
    currentTranscribeResult.fullText = subs.map(x => x.textLines.join(' ')).join('\n');
    try {
        const j = JSON.parse(currentTranscribeResult.jsonStr);
        j.cues = subs.length;
        j.note = String(j.note || '').replace(/ \(\+ AI post-process\)$/, '') + ' (+ AI post-process)';
        currentTranscribeResult.jsonStr = JSON.stringify(j, null, 2);
    } catch (e) { /* jsonStr wasn't JSON — leave it */ }
    if (previousCueCount && subs.length !== previousCueCount) {
        logTranscribe(`သတိပေးချက်: cue အရေအတွက် ${previousCueCount} → ${subs.length} ပြောင်းသွားသည်`, 'warn');
    }
}


// B8 + B9: cut chunks at the quietest point near each target boundary (±5s, never mid-speech
// if a pause exists), merge a too-short last chunk into the previous one, and flag chunks
// containing no speech at all so workers skip them. Falls back to fixed-length chunks on error.
function buildSmartTimeChunks(audioBuffer, chunkSizeSec, onLog) {
    const total = audioBuffer.duration;
    const fixed = buildTimeChunks(total, chunkSizeSec);
    if (fixed.length <= 1) return fixed;
    try {
        const env = computeSpeechEnvelope(audioBuffer, null);
        const hop = env.hopSec;
        const win = Math.min(5, chunkSizeSec * 0.2);
        const cuts = [0];
        for (let t = chunkSizeSec; t < total - 5; t += chunkSizeSec) {
            const target = Math.max(t, cuts[cuts.length - 1] + chunkSizeSec * 0.5);
            let best = target, bestDist = Infinity;
            for (let c = target - win; c <= target + win; c += hop) {
                if (c <= cuts[cuts.length - 1] + 1 || c >= total - 1) continue;
                if (!env.isSpeechAtFrame(env.frameAtTime(c)) && Math.abs(c - target) < bestDist) { best = c; bestDist = Math.abs(c - target); }
            }
            cuts.push(best);
            t = best; // next target = best + chunkSizeSec (the loop adds chunkSizeSec)
        }
        cuts.push(total);
        const chunks = [];
        for (let i = 0; i < cuts.length - 1; i++) chunks.push({ start: cuts[i], end: cuts[i + 1] });
        if (chunks.length > 1 && chunks[chunks.length - 1].end - chunks[chunks.length - 1].start < 5) {
            const last = chunks.pop();
            chunks[chunks.length - 1].end = last.end;
        }
        let anySpeech = false;
        chunks.forEach(c => {
            const f0 = env.frameAtTime(c.start), f1 = env.frameAtTime(c.end);
            c.hasSpeech = false;
            for (let f = f0; f <= f1; f++) if (env.isSpeechAtFrame(f)) { c.hasSpeech = true; break; }
            if (c.hasSpeech) anySpeech = true;
        });
        // If the detector found no speech anywhere (very quiet file), don't skip anything.
        if (anySpeech) chunks.forEach(c => { c.silent = !c.hasSpeech; });
        return chunks;
    } catch (e) {
        if (onLog) onLog(`Smart chunking မရပါ (${e.message}) — အချိန်အတိုင်း ဖြတ်မည်`, 'warn');
        return fixed;
    }
}


// B10: sanity-check merged chunk output — sort by start time, drop cues that start past the
// end of the media or have no positive length, clamp ends to the media duration, and drop
// loop-hallucination runs (same text 3+ times in a row — only the first is kept).
// Mutates the array in place.
function validateMergedSubs(subs, durationSec, onLog) {
    const toMs = (s) => {
        const p = String(s.timeLine).split('-->').map(x => x.trim());
        return p.length === 2 ? [parseSrtTimestampToMs(p[0]), parseSrtTimestampToMs(p[1])] : [null, null];
    };
    const maxMs = Math.round((durationSec + 1) * 1000);
    let outOfRange = 0, invalid = 0, repeats = 0;
    const rows = [];
    subs.forEach(s => {
        const [a, b] = toMs(s);
        if (a === null || b === null || b <= a) { invalid++; return; }
        if (a > maxMs) { outOfRange++; return; }
        rows.push({ s, a, b: Math.min(b, maxMs) });
    });
    rows.sort((x, y) => x.a - y.a);
    const kept = [];
    let run = 0, lastText = null;
    rows.forEach(r => {
        const text = r.s.textLines.join(' ').trim().toLowerCase();
        run = (text && text === lastText) ? run + 1 : 1;
        lastText = text;
        if (run >= 3) { repeats++; return; }
        r.s.timeLine = `${formatSrtTimestamp(r.a / 1000)} --> ${formatSrtTimestamp(r.b / 1000)}`;
        kept.push(r.s);
    });
    const dropped = invalid + outOfRange + repeats;
    if (dropped > 0 && onLog) {
        onLog(`Output စစ်ဆေးမှု: cue ${dropped} ခု ဖယ်လိုက်သည် (timestamp မမှန် ${invalid}, media အရှည်ကျော် ${outOfRange}, ထပ်ခါထပ်ခါ ${repeats})`, 'warn');
    }
    subs.splice(0, subs.length, ...kept);
}

// B11: WAVEFORM FIX — no API call. Decodes the selected media locally and snaps every cue of the
// current SRT onto real speech onset/offset (same pass WAVEFORM SYNC runs after transcribing).
async function handleWaveformFix() {
    if (!currentTranscribeResult || !currentTranscribeResult.srt) {
        logTranscribe('WAVEFORM FIX: SRT မရှိသေးပါ — အရင် transcribe လုပ်ပါ (သို့) SRT ထည့်ပါ', 'warn');
        return;
    }
    if (!selectedMediaFile) {
        logTranscribe('WAVEFORM FIX: media ဖိုင် ရွေးထားရန် လိုပါသည်', 'warn');
        return;
    }
    if (isTranscribing) { logTranscribe('အခြား transcribe/AI အလုပ်တစ်ခု လုပ်နေဆဲ ဖြစ်ပါသည် — ပြီးမှ ထပ်နှိပ်ပါ', 'warn'); return; }
    isTranscribing = true;
    waveformFixBtn.disabled = true;
    waveformFixBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SYNCING...';
    try {
        logTranscribe('WAVEFORM FIX: media ကို decode လုပ်နေသည်...');
        const audioBuffer = await decodeMediaToAudioBuffer(selectedMediaFile);
        const envelope = computeSpeechEnvelope(audioBuffer, (m, l) => logTranscribe(m, l));
        const subs = parseSrt(currentTranscribeResult.srt);
        const refined = refineCueTimingsWithEnvelope(subs, envelope, (m, l) => logTranscribe(m, l));
        currentTranscribeResult.srt = rebuildSrt(refined);
        refreshTranscribeDerived(subs.length);
        renderTranscribeOutput();
        logTranscribe('WAVEFORM FIX ပြီးဆုံးပါပြီ ✓ (API မသုံးပါ)', 'ok');
    } catch (err) {
        logTranscribe(`WAVEFORM FIX FAILED: ${err.message}`, 'err');
    } finally {
        isTranscribing = false;
        waveformFixBtn.disabled = false;
        waveformFixBtn.innerHTML = '<i class="fa-solid fa-wave-square"></i> WAVEFORM FIX';
    }
}
const waveformFixBtn = document.getElementById('waveformFixBtn');
if (waveformFixBtn) waveformFixBtn.addEventListener('click', handleWaveformFix);


// B15: Recap's transcription step now uses the same chunked pipeline as the Transcribe tab
// (browser decode -> small 16kHz WAV chunks -> worker pool across the Gladia/Groq/AssemblyAI
// keys), so a big file no longer hits per-provider upload limits (e.g. Groq 25MB).
// Chunk Size / Workers are read from the Transcribe tab's controls. If the browser can't
// decode the file (unsupported codec), it falls back to the old whole-file path.
async function transcribeRecapChunked(file, language, maxRetries, timeoutSec, onLog) {
    let audioBuffer;
    try {
        onLog('Media ကို browser ထဲမှာ decode လုပ်နေသည် (chunked transcription)...');
        audioBuffer = await decodeMediaToAudioBuffer(file);
    } catch (e) {
        onLog(`Decode မရပါ (${e.message}) — ဖိုင်တစ်ခုလုံးကို provider ဆီ တိုက်ရိုက်ပို့ပါမည်`, 'warn');
        return transcribeMediaWithRotation(file, language, maxRetries, timeoutSec, onLog);
    }
    const chunkSizeSec = Math.max(parseInt(transcribeChunkSizeInput.value, 10) || 60, 15);
    const workerCount = Math.max(parseInt(transcribeWorkerCountInput.value, 10) || 3, 1);
    const { srt, providerCounts } = await transcribeMediaWithWorkers(audioBuffer, chunkSizeSec, workerCount, language, maxRetries, timeoutSec, onLog, false);
    const subs = srt ? parseSrt(srt) : [];
    const provider = Object.entries(providerCounts).map(([p, c]) => `${p}:${c}`).join(' ') || 'n/a';
    return { fullText: subs.map(x => x.textLines.join(' ')).join('\n'), provider };
}


// B12: Provider Order. 'auto' keeps the round-robin pool above. Choosing a provider makes it the
// PRIMARY for every chunk (its keys still rotate between chunks) and only falls back to the other
// providers' keys when every primary key has failed for that chunk — so a transcript is
// segmented by one engine instead of a Gladia/Groq/AssemblyAI mix.
const LS_TRANSCRIBE_PROVIDER_ORDER = 'neoyangon_transcribe_provider_order';
let primaryKeyCounter = 0;
function getProviderOrder() { return safeLsGet(LS_TRANSCRIBE_PROVIDER_ORDER) || 'auto'; }

async function transcribeChunkOrdered(chunkFile, language, maxRetries, timeoutSec, onLog, pool, order) {
    const primary = pool.filter(c => c.provider === order);
    const fallback = pool.filter(c => c.provider !== order);
    const start = primaryKeyCounter++ % primary.length;
    const sequence = primary.slice(start).concat(primary.slice(0, start), fallback);
    const rounds = Math.max(maxRetries, 1);
    const totalAttempts = Math.min(sequence.length * rounds, 15);
    let lastErr;
    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        if (transcribeAborted) throw new Error('Stopped by user');
        const cred = sequence[attempt % sequence.length];
        const tag = cred.provider === order ? 'PRIMARY' : 'FALLBACK';
        onLog(`[${cred.provider.toUpperCase()} ${tag}] chunk attempt ${attempt + 1}/${totalAttempts}...`);
        try {
            const result = await callProviderTranscribe(cred, chunkFile, language, timeoutSec, onLog);
            return { ...result, provider: cred.provider };
        } catch (e) {
            lastErr = e;
            onLog(`[${cred.provider.toUpperCase()}] chunk error: ${e.message}`, 'err');
            if (transcribeAborted) throw new Error('Stopped by user');
            await sleep(retryBackoffMs(attempt));
        }
    }
    throw lastErr || new Error('Providers အားလုံး failed ဖြစ်သွားပါသည် (chunk)');
}

const transcribeProviderOrderSelect = document.getElementById('transcribeProviderOrder');
if (transcribeProviderOrderSelect) {
    transcribeProviderOrderSelect.addEventListener('change', () => safeLsSet(LS_TRANSCRIBE_PROVIDER_ORDER, transcribeProviderOrderSelect.value));
    window.addEventListener('DOMContentLoaded', () => { transcribeProviderOrderSelect.value = getProviderOrder(); });
}
