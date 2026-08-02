// =============================================================
// NEO-YANGON 2026 TTS ENGINE — script.js
// Multi API Key rotation + Multi TTS Model rotation + Glossary
// =============================================================

// ---- DOM Element Cache ----
const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');
const clearBtn = document.getElementById('clearBtn');
const generateBtn = document.getElementById('generateBtn');
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
let animationFrameId;

let currentAudioBlob = null;
let isGenerating = false;
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

// Default model list — only the two below are confirmed Gemini TTS model IDs.
// Add any additional model IDs your key(s) actually have access to (one per line)
// in the "TTS Model List" box in the UI; rotation works across however many you list.
const DEFAULT_MODELS = [
  "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-preview-tts",
    "gemini-2.5-pro-preview-tts"
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
const LS_CONTEXT_MEMORY = 'neoyangon_context_memory';
const LS_CONTEXT_MEMORY_ENABLED = 'neoyangon_context_memory_enabled';
const LS_THEME = 'neoyangon_theme';

function parseListInput(raw) {
    return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

function getKeys() {
    return parseListInput(localStorage.getItem(LS_KEYS) || '');
}
function getModels() {
    const stored = localStorage.getItem(LS_MODELS);
    if (stored === null) return DEFAULT_MODELS.slice();
    const list = parseListInput(stored);
    return list.length ? list : DEFAULT_MODELS.slice();
}
function getIndex(key, len) {
    let idx = parseInt(localStorage.getItem(key) || '0', 10);
    if (isNaN(idx) || len === 0) idx = 0;
    return idx % Math.max(len, 1);
}
function setIndex(key, idx, len) {
    localStorage.setItem(key, String(len > 0 ? (idx % len) : 0));
}

function updateBadges() {
    const keys = getKeys();
    const models = getModels();
    keyCountBadge.textContent = keys.length;
    const mIdx = getIndex(LS_MODEL_IDX, models.length);
    modelBadge.textContent = models[mIdx] ? models[mIdx].replace('gemini-', '').replace('-preview-tts', '') : '-';
}

function loadKeysModelsIntoInputs() {
    apiKeysInput.value = (localStorage.getItem(LS_KEYS) || '').split(',').join('\n').trim();
    const storedModels = localStorage.getItem(LS_MODELS);
    modelsInput.value = storedModels ? parseListInput(storedModels).join('\n') : DEFAULT_MODELS.join('\n');
    updateBadges();
}

saveKeysModelsBtn.addEventListener('click', () => {
    localStorage.setItem(LS_KEYS, apiKeysInput.value.trim());
    localStorage.setItem(LS_MODELS, modelsInput.value.trim());
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

// Round-robin credential picker: returns {key, model, keyIdx, modelIdx}
function nextCredential() {
    const keys = getKeys();
    const models = getModels();
    if (keys.length === 0) throw new Error('API key မထည့်ရသေးပါ — Key & Model Rotation panel တွင် Gemini API key အနည်းဆုံးတစ်ခု ထည့်ပါ။');
    if (models.length === 0) throw new Error('TTS model list ဗလာဖြစ်နေပါသည်။');

    const keyIdx = getIndex(LS_KEY_IDX, keys.length);
    const modelIdx = getIndex(LS_MODEL_IDX, models.length);

    // advance pointers for the NEXT call (round-robin across every request)
    setIndex(LS_KEY_IDX, keyIdx + 1, keys.length);
    if (keyIdx + 1 >= keys.length) {
        setIndex(LS_MODEL_IDX, modelIdx + 1, models.length);
    }
    updateBadges();

    return { key: keys[keyIdx], model: models[modelIdx], keyIdx, modelIdx, keys, models };
}

// Force-advance to a different credential (used after a failed attempt)
function advanceCredential() {
    const keys = getKeys();
    const models = getModels();
    const keyIdx = getIndex(LS_KEY_IDX, keys.length);
    setIndex(LS_KEY_IDX, keyIdx + 1, keys.length);
    if (keyIdx + 1 >= keys.length) {
        const modelIdx = getIndex(LS_MODEL_IDX, models.length);
        setIndex(LS_MODEL_IDX, modelIdx + 1, models.length);
    }
    updateBadges();
    return { key: keys[getIndex(LS_KEY_IDX, keys.length)], model: models[getIndex(LS_MODEL_IDX, models.length)] };
}

// =============================================================
// Glossary / Global Memory
// =============================================================
function getGlossary() {
    try {
        return JSON.parse(localStorage.getItem(LS_GLOSSARY) || '[]');
    } catch (e) { return []; }
}
function saveGlossary(list) {
    localStorage.setItem(LS_GLOSSARY, JSON.stringify(list));
}
function isGlossaryEnabled() {
    return localStorage.getItem(LS_GLOSSARY_ENABLED) !== 'false';
}

// Global Memory / Glossary is one shared list (LS_GLOSSARY) rendered into every
// glossary-list container present on the page — currently the TTS tab's #glossaryList
// and the Translator tab's #transGlossaryList. Editing from either tab updates both.
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
            row.innerHTML = `
                <span class="text-yellow-200 truncate">${escapeHtml(entry.term)}</span>
                <i class="fa-solid fa-arrow-right text-cyan-500 text-[10px]"></i>
                <span class="text-cyan-200 truncate flex-1">${escapeHtml(entry.replacement)}</span>
                <button data-idx="${i}" class="glossary-del-btn"><i class="fa-solid fa-xmark"></i></button>
            `;
            container.appendChild(row);
        });
    });

    document.querySelectorAll('.glossary-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const list = getGlossary();
            list.splice(idx, 1);
            saveGlossary(list);
            renderGlossary();
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
    localStorage.setItem(LS_GLOSSARY_ENABLED, glossaryEnabledChk.checked ? 'true' : 'false');
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
        localStorage.setItem(LS_GLOSSARY_ENABLED, transGlossaryEnabledChk.checked ? 'true' : 'false');
        glossaryEnabledChk.checked = transGlossaryEnabledChk.checked;
    });
}

// Applies every glossary entry as a global (whole-conversation) find/replace pass
function applyGlossary(text) {
    if (!isGlossaryEnabled()) return text;
    const list = getGlossary();
    let output = text;
    list.forEach(({ term, replacement }) => {
        if (!term) return;
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped, 'g');
        output = output.replace(re, replacement);
    });
    return output;
}

// =============================================================
// Theme Toggle
// =============================================================
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeLabel.textContent = theme === 'dark' ? 'DARK' : 'LIGHT';
    localStorage.setItem(LS_THEME, theme);
}

themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

// =============================================================
// Init
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem(LS_THEME) || 'dark');
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

        requestAnimationFrame(drawBg);
    }
    drawBg();
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
    const sentenceDelimiters = /(?<=[။\.\?\!\n])/g;
    const sentences = text.split(sentenceDelimiters).filter(s => s && s.trim().length > 0);

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

// Single Chunk TTS Fetching Helper — rotates key/model on failure automatically
async function synthesizeChunk(textChunk, voice) {
    const totalCombos = Math.max(getKeys().length * getModels().length, 1);
    const maxAttempts = Math.min(totalCombos, 12);

    let cred = nextCredential();
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

        const apiUrl = `https://vpn-my-proxy.speedify730.workers.dev/?https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Rotate away from rate-limited / invalid keys or unavailable models
                if ([400, 401, 403, 404, 429].includes(response.status)) {
                    lastError = new Error(`HTTP ${response.status} (key/model rotated)`);
                    setStatus(`KEY/MODEL FAILED (${response.status}) — ROTATING...`, "text-yellow-400");
                    cred = advanceCredential();
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
            lastError = e;
            cred = advanceCredential();
        }
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

    const text = applyGlossary(rawText);
    const voice = voiceSelect.value;
    loadingOverlay.classList.remove('hidden');
    customControls.classList.add('opacity-50', 'pointer-events-none');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>ထုတ်လုပ်နေသည်...';

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

        const audioUrl = URL.createObjectURL(currentAudioBlob);
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
        setStatus(`SYNTHESIS FAILED: ${err.message}`, "text-red-400");
    } finally {
        isGenerating = false;
        loadingOverlay.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fa-solid fa-bolt text-yellow-300 text-base"></i><span>အသံထုတ်လုပ်မည် (SYNTHESIZE)</span>';
    }
}

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
const ttsViewEl = document.getElementById('ttsView');
const translatorViewEl = document.getElementById('translatorView');
const transcribeViewEl = document.getElementById('transcribeView');

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
const srtOutput = document.getElementById('srtOutput');
const srtOutputMeta = document.getElementById('srtOutputMeta');
const sendToTtsBtn = document.getElementById('sendToTtsBtn');

// ---- Translator-only state ----
const LS_TRANS_MODELS = 'neoyangon_trans_models';
const LS_TRANS_MODEL_IDX = 'neoyangon_trans_model_idx';
const LS_ACTIVE_TAB = 'neoyangon_active_tab';

const DEFAULT_TRANS_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
];

let translationAborted = false;
let activeTransControllers = [];
let lastTranslatedSubs = null;

// =============================================================
// Tool Tab Switching
// =============================================================
function switchToolView(view) {
    const isTranslator = view === 'translator';
    const isTranscribe = view === 'transcribe';
    const isTts = !isTranslator && !isTranscribe;

    translatorViewEl.classList.toggle('hidden', !isTranslator);
    transcribeViewEl.classList.toggle('hidden', !isTranscribe);
    ttsViewEl.classList.toggle('hidden', !isTts);

    tabTranslatorBtn.classList.toggle('tab-active', isTranslator);
    tabTranscribeBtn.classList.toggle('tab-active', isTranscribe);
    tabTtsBtn.classList.toggle('tab-active', isTts);

    localStorage.setItem(LS_ACTIVE_TAB, view);
}

tabTranslatorBtn.addEventListener('click', () => switchToolView('translator'));
tabTtsBtn.addEventListener('click', () => switchToolView('tts'));
tabTranscribeBtn.addEventListener('click', () => switchToolView('transcribe'));

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
    const stored = localStorage.getItem(LS_TRANS_MODELS);
    if (stored === null) return DEFAULT_TRANS_MODELS.slice();
    const list = parseListInput(stored);
    return list.length ? list : DEFAULT_TRANS_MODELS.slice();
}

function loadTransModelsIntoInput() {
    const stored = localStorage.getItem(LS_TRANS_MODELS);
    transModelsInput.value = stored ? parseListInput(stored).join('\n') : DEFAULT_TRANS_MODELS.join('\n');
}

saveTransModelsBtn.addEventListener('click', () => {
    localStorage.setItem(LS_TRANS_MODELS, transModelsInput.value.trim());
    setIndex(LS_TRANS_MODEL_IDX, 0, getTransModels().length);
    transSaveStatusMsg.textContent = 'သိမ်းပြီးပါပြီ ✓';
    setTimeout(() => { transSaveStatusMsg.textContent = ''; }, 2500);
});

// Round-robin credential picker for text translation — shares the key pointer (LS_KEY_IDX)
// with the TTS engine (same underlying key pool) but rotates its OWN model list independently.
function nextTransCredential() {
    const keys = getKeys();
    const models = getTransModels();
    if (keys.length === 0) throw new Error('API key မထည့်ရသေးပါ — "Text to Speech" tab ထဲက Key & Model Rotation panel တွင် Gemini API key အနည်းဆုံးတစ်ခု ထည့်ပါ။');
    if (models.length === 0) throw new Error('Translation model list ဗလာဖြစ်နေပါသည်။');

    const keyIdx = getIndex(LS_KEY_IDX, keys.length);
    const modelIdx = getIndex(LS_TRANS_MODEL_IDX, models.length);

    setIndex(LS_KEY_IDX, keyIdx + 1, keys.length);
    if (keyIdx + 1 >= keys.length) {
        setIndex(LS_TRANS_MODEL_IDX, modelIdx + 1, models.length);
    }
    updateBadges();

    return { key: keys[keyIdx], model: models[modelIdx] };
}

function advanceTransCredential() {
    const keys = getKeys();
    const models = getTransModels();
    if (keys.length === 0 || models.length === 0) return { key: keys[0], model: models[0] };
    const keyIdx = getIndex(LS_KEY_IDX, keys.length);
    setIndex(LS_KEY_IDX, keyIdx + 1, keys.length);
    if (keyIdx + 1 >= keys.length) {
        const modelIdx = getIndex(LS_TRANS_MODEL_IDX, models.length);
        setIndex(LS_TRANS_MODEL_IDX, modelIdx + 1, models.length);
    }
    updateBadges();
    return { key: keys[getIndex(LS_KEY_IDX, keys.length)], model: models[getIndex(LS_TRANS_MODEL_IDX, models.length)] };
}

// =============================================================
// SRT Parsing / Rebuilding
// =============================================================
function parseSrt(rawText) {
    const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!normalized) return [];
    const blocks = normalized.split(/\n\s*\n/);
    const subs = [];

    blocks.forEach(block => {
        const lines = block.split('\n');
        if (lines.length < 2) return;
        let li = 0;

        // Optional leading numeric index line
        if (/^\d+$/.test(lines[li].trim())) {
            li++;
        }
        if (!lines[li] || !lines[li].includes('-->')) return; // malformed cue, skip
        const timeLine = lines[li].trim();
        li++;

        const textLines = lines.slice(li).filter((l, i, arr) => !(i === arr.length - 1 && l.trim() === ''));
        if (textLines.length === 0) return;

        subs.push({ timeLine, textLines });
    });

    return subs;
}

function rebuildSrt(subs) {
    return subs.map((s, i) => {
        const text = (s.translatedText !== undefined && s.translatedText !== null)
            ? s.translatedText
            : s.textLines.join('\n');
        return `${i + 1}\n${s.timeLine}\n${text}`;
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
    return localStorage.getItem(LS_CONTEXT_MEMORY) || '';
}
function saveContextMemory(text) {
    localStorage.setItem(LS_CONTEXT_MEMORY, text);
}
function isContextMemoryEnabled() {
    return localStorage.getItem(LS_CONTEXT_MEMORY_ENABLED) !== 'false';
}

if (saveContextMemoryBtn) {
    saveContextMemoryBtn.addEventListener('click', () => {
        saveContextMemory(globalContextMemory.value);
        contextMemorySavedMsg.textContent = 'SAVED ✓';
        setTimeout(() => { contextMemorySavedMsg.textContent = ''; }, 2000);
    });
}
if (contextMemoryEnabledChk) {
    contextMemoryEnabledChk.addEventListener('change', () => {
        localStorage.setItem(LS_CONTEXT_MEMORY_ENABLED, contextMemoryEnabledChk.checked ? 'true' : 'false');
    });
}

// =============================================================
// Gemini text-translation call (JSON-array structured output)
// =============================================================
function buildTranslationPrompt(lines, targetLang) {
    const numbered = lines.map((l, i) => `${i + 1}. ${l.replace(/\n/g, ' / ')}`).join('\n');
    const isMyanmar = targetLang === 'Myanmar (Burmese)';

    const contextMemory = (isContextMemoryEnabled() ? getContextMemory() : '').trim();
    const contextBlock = contextMemory
        ? `\nAdditional context / instructions from the user (follow these while translating):\n${contextMemory}\n`
        : '';

    const myanmarRules = isMyanmar ? `
- Language precision: translate the meaning accurately for ${targetLang}, based on the actual context of the source line (not a literal word-for-word conversion).
- Strict punctuation restriction: NEVER use the Myanmar sentence-punctuation marks "။" or "၊" anywhere in the output.
- Also NEVER use the Western exclamation mark "!" or question mark "?" anywhere in the output.
- Write clean subtitle-style Burmese sentences without any of the punctuation marks listed above.` : '';

    return `You are a professional subtitle translator localizing a video subtitle file into ${targetLang}.

Rules:
- Translate EACH numbered line into natural, concise, on-screen subtitle style ${targetLang}.
- Return exactly the same number of items, in the same order. Do not merge, split, skip, or renumber lines.
- Keep meaning and tone faithful to the source; keep proper nouns / names consistent across lines.
- Do not add explanations, notes, or the original text — only the translation.
- Output ONLY a JSON array of strings (one translated string per input line) — plain subtitle text with no numbering, no timestamps, and no markdown, ready to be dropped straight into a professional .srt file.${myanmarRules}
${contextBlock}
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
            const apiUrl = `https://vpn-my-proxy.speedify730.workers.dev/?https://generativelanguage.googleapis.com/v1beta/models/${cred.model}:generateContent?key=${cred.key}`;

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
    }

    throw lastErr || new Error('All retries failed');
}

// =============================================================
// Worker-pool driven multi-chunk translation
// =============================================================
async function translateSrtWithWorkers(subs, chunkSize, targetLang, workerCount, maxRetries, timeoutSec) {
    const chunks = chunkArray(subs, chunkSize);
    const results = new Array(chunks.length);
    let nextChunkIdx = 0;
    let completedCount = 0;

    renderWorkerGrid(workerCount);
    updateTransProgress(0, chunks.length);

    async function workerLoop(workerId) {
        while (true) {
            if (translationAborted) return;
            const myChunkIdx = nextChunkIdx++;
            if (myChunkIdx >= chunks.length) return;

            setWorkerStatus(workerId, 'busy', myChunkIdx + 1, chunks.length);
            logTrans(`Worker ${workerId + 1} → chunk ${myChunkIdx + 1}/${chunks.length} စတင်နေသည်...`);

            try {
                results[myChunkIdx] = await translateChunkWithRetry(chunks[myChunkIdx], targetLang, maxRetries, timeoutSec);
                setWorkerStatus(workerId, 'done', myChunkIdx + 1, chunks.length);
                logTrans(`Chunk ${myChunkIdx + 1}/${chunks.length} ပြီးပါပြီ ✓`, 'ok');
            } catch (e) {
                results[myChunkIdx] = chunks[myChunkIdx].map(s => s.textLines.join('\n')); // fallback: keep original text
                setWorkerStatus(workerId, 'error', myChunkIdx + 1, chunks.length);
                logTrans(`Chunk ${myChunkIdx + 1} error: ${e.message} (မူရင်းစာသား ထားရစ်မည်)`, 'err');
            }

            completedCount++;
            updateTransProgress(completedCount, chunks.length);
        }
    }

    const effectiveWorkers = Math.max(1, Math.min(workerCount, chunks.length || 1));
    const pool = [];
    for (let i = 0; i < effectiveWorkers; i++) pool.push(workerLoop(i));
    await Promise.all(pool);

    chunks.forEach((chunk, ci) => {
        chunk.forEach((sub, si) => {
            sub.translatedText = (results[ci] && results[ci][si] !== undefined) ? results[ci][si] : sub.textLines.join('\n');
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

function logTrans(msg, level) {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    line.className = level === 'ok' ? 'log-entry-ok' : level === 'warn' ? 'log-entry-warn' : level === 'err' ? 'log-entry-err' : '';
    transLogBox.appendChild(line);
    transLogBox.scrollTop = transLogBox.scrollHeight;
}

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
    srtInputMeta.textContent = `Subtitles: ${subs.length} | Chunks: ${chunkCount}`;
}

srtInput.addEventListener('input', updateSrtInputMeta);
chunkSizeInput.addEventListener('input', updateSrtInputMeta);

srtFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
    updateSrtInputMeta();
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

    if (isTranslating) return;
    isTranslating = true;
    translationAborted = false;

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

    logTrans(`SRT ${subs.length} subtitles / ${Math.ceil(subs.length / chunkSize)} chunks / ${workerCount} workers ဖြင့် ဘာသာပြန်စတင်ပါပြီ → ${targetLang}`);

    try {
        const translatedSubs = await translateSrtWithWorkers(subs, chunkSize, targetLang, workerCount, maxRetries, timeoutSec);

        if (translationAborted) {
            logTrans('User မှ ရပ်တန့်လိုက်ပါသည်။', 'warn');
        }

        lastTranslatedSubs = translatedSubs;
        const outputSrt = rebuildSrt(translatedSubs);
        srtOutput.value = outputSrt;
        srtOutputMeta.textContent = `Subtitles: ${translatedSubs.length} | Characters: ${outputSrt.length}`;
        outputDoneBadge.classList.remove('hidden');
        logTrans('ဘာသာပြန်ခြင်း အားလုံးပြီးဆုံးပါပြီ ✓', 'ok');

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

downloadSrtBtn.addEventListener('click', () => {
    if (!srtOutput.value) return;
    const blob = new Blob([srtOutput.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

sendToTtsBtn.addEventListener('click', () => {
    if (!lastTranslatedSubs || lastTranslatedSubs.length === 0) {
        logTrans('ပထမဆုံး ဘာသာပြန်ပြီးမှ TTS ကို ပို့နိုင်ပါမည်', 'warn');
        return;
    }
    const dialogueOnly = lastTranslatedSubs
        .map(s => (s.translatedText || '').replace(/\n/g, ' '))
        .join('\n')
        .slice(0, 10000);

    textInput.value = dialogueOnly;
    charCount.textContent = dialogueOnly.length;
    switchToolView('tts');
    setStatus('TRANSLATOR မှ စာသား လက်ခံရရှိပါပြီ', 'text-emerald-400');
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
    const savedTab = localStorage.getItem(LS_ACTIVE_TAB) || 'transcribe';
    switchToolView(savedTab);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
//  MEDIA TRANSCRIPTION MODULE — appended module, does not modify any code above this line
//  (aside from the shared switchToolView()/tab wiring near the top of the file).
//  Upload MP4/MP3 → Gladia + Groq key pool with auto rotation → SRT / TXT / JSON output.
//  Fully client-side: files go straight from the browser to api.gladia.io / api.groq.com.
// =============================================================================================

// ---- DOM Element Cache (Transcribe view) ----
const toggleTranscribeKeyPanelBtn = document.getElementById('toggleTranscribeKeyPanelBtn');
const transcribeKeyPanelBody = document.getElementById('transcribeKeyPanelBody');
const gladiaKeysInput = document.getElementById('gladiaKeysInput');
const groqKeysInput = document.getElementById('groqKeysInput');
const groqModelSelect = document.getElementById('groqModelSelect');
const saveTranscribeKeysBtn = document.getElementById('saveTranscribeKeysBtn');
const transcribeSaveStatusMsg = document.getElementById('transcribeSaveStatusMsg');
const gladiaKeyCountBadge = document.getElementById('gladiaKeyCountBadge');
const groqKeyCountBadge = document.getElementById('groqKeyCountBadge');

const mediaFileInput = document.getElementById('mediaFileInput');
const mediaFileDropzone = document.getElementById('mediaFileDropzone');
const mediaFileMeta = document.getElementById('mediaFileMeta');

const transcribeLangSelect = document.getElementById('transcribeLangSelect');
const transcribeMaxRetriesInput = document.getElementById('transcribeMaxRetries');
const transcribeTimeoutSecInput = document.getElementById('transcribeTimeoutSec');
const clearTranscribeBtn = document.getElementById('clearTranscribeBtn');
const transcribeBtn = document.getElementById('transcribeBtn');
const stopTranscribeBtn = document.getElementById('stopTranscribeBtn');

const transcribeProgressPanel = document.getElementById('transcribeProgressPanel');
const transcribeStatusBadge = document.getElementById('transcribeStatusBadge');
const transcribeLogBox = document.getElementById('transcribeLogBox');

const transcribeDoneBadge = document.getElementById('transcribeDoneBadge');
const outFormatSrtBtn = document.getElementById('outFormatSrtBtn');
const outFormatTxtBtn = document.getElementById('outFormatTxtBtn');
const outFormatJsonBtn = document.getElementById('outFormatJsonBtn');
const copyTranscribeBtn = document.getElementById('copyTranscribeBtn');
const downloadTranscribeBtn = document.getElementById('downloadTranscribeBtn');
const transcribeOutput = document.getElementById('transcribeOutput');
const transcribeOutputMeta = document.getElementById('transcribeOutputMeta');
const sendTranscribeToTranslatorBtn = document.getElementById('sendTranscribeToTranslatorBtn');

// ---- Transcribe-only state ----
const LS_GLADIA_KEYS = 'neoyangon_gladia_keys';
const LS_GROQ_KEYS = 'neoyangon_groq_keys';
const LS_GROQ_MODEL = 'neoyangon_groq_model';
const LS_TRANSCRIBE_IDX = 'neoyangon_transcribe_idx';

let selectedMediaFile = null;
let isTranscribing = false;
let transcribeAborted = false;
let activeTranscribeAbortControllers = [];
let currentTranscribeResult = null; // { srt, fullText, jsonStr, provider, sourceFileName }
let activeOutputFormat = 'srt';

// =============================================================
// Gladia / Groq key pool (own rotation pointer, own storage keys)
// =============================================================
function getGladiaKeys() { return parseListInput(localStorage.getItem(LS_GLADIA_KEYS) || ''); }
function getGroqKeys() { return parseListInput(localStorage.getItem(LS_GROQ_KEYS) || ''); }
function getGroqModel() { return localStorage.getItem(LS_GROQ_MODEL) || 'whisper-large-v3-turbo'; }

function getTranscribeCredentialPool() {
    const pool = [];
    getGladiaKeys().forEach(key => pool.push({ provider: 'gladia', key }));
    getGroqKeys().forEach(key => pool.push({ provider: 'groq', key }));
    return pool;
}

function updateTranscribeBadges() {
    gladiaKeyCountBadge.textContent = getGladiaKeys().length;
    groqKeyCountBadge.textContent = getGroqKeys().length;
}

function loadTranscribeKeysIntoInputs() {
    gladiaKeysInput.value = (localStorage.getItem(LS_GLADIA_KEYS) || '').split(',').join('\n').trim();
    groqKeysInput.value = (localStorage.getItem(LS_GROQ_KEYS) || '').split(',').join('\n').trim();
    groqModelSelect.value = getGroqModel();
    updateTranscribeBadges();
}

saveTranscribeKeysBtn.addEventListener('click', () => {
    localStorage.setItem(LS_GLADIA_KEYS, gladiaKeysInput.value.trim());
    localStorage.setItem(LS_GROQ_KEYS, groqKeysInput.value.trim());
    localStorage.setItem(LS_GROQ_MODEL, groqModelSelect.value);
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
    if (pool.length === 0) throw new Error('Gladia/Groq API key မရှိပါ — Key Pool panel တွင် အနည်းဆုံး key တစ်ခု ထည့်ပါ။');
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

function setSelectedMediaFile(file) {
    if (!file) return;
    selectedMediaFile = file;
    mediaFileMeta.textContent = `${file.name} • ${formatBytes(file.size)}`;
    mediaFileDropzone.classList.add('border-emerald-500/50');

    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
        mediaFileMeta.textContent = `${file.name} • ${formatBytes(file.size)} • ${formatTime(probe.duration)}`;
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
// Combined retry/rotate driver across the Gladia+Groq pool
// =============================================================
async function transcribeMediaWithRotation(file, language, maxRetries, timeoutSec, onLog) {
    const pool = getTranscribeCredentialPool();
    if (pool.length === 0) throw new Error('Gladia/Groq API key မရှိပါ။');

    const totalAttempts = Math.min(pool.length * Math.max(maxRetries, 1), 15);
    let cred = nextTranscribeCredential();
    let lastErr;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        if (transcribeAborted) throw new Error('Stopped by user');
        onLog(`[${cred.provider.toUpperCase()}] attempt ${attempt + 1}/${totalAttempts} စတင်နေသည်...`);
        try {
            const result = cred.provider === 'groq'
                ? await callGroqTranscribe(cred.key, file, language, timeoutSec)
                : await callGladiaTranscribe(cred.key, file, language, timeoutSec, onLog);
            return { ...result, provider: cred.provider };
        } catch (e) {
            lastErr = e;
            onLog(`[${cred.provider.toUpperCase()}] error: ${e.message} — rotating...`, 'err');
            if (transcribeAborted) throw new Error('Stopped by user');
            cred = advanceTranscribeCredential();
            if (!cred) break;
        }
    }
    throw lastErr || new Error('Gladia/Groq providers အားလုံး failed ဖြစ်သွားပါသည်');
}

// =============================================================
// Main transcribe handler
// =============================================================
function logTranscribe(msg, level) {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    line.className = level === 'ok' ? 'log-entry-ok' : level === 'warn' ? 'log-entry-warn' : level === 'err' ? 'log-entry-err' : '';
    transcribeLogBox.appendChild(line);
    transcribeLogBox.scrollTop = transcribeLogBox.scrollHeight;
}

async function handleTranscribeMedia() {
    if (!selectedMediaFile) {
        logTranscribe('ERROR: မီဒီယာဖိုင် ရွေးရန်လိုအပ်ပါသည်', 'err');
        return;
    }
    if (getTranscribeCredentialPool().length === 0) {
        logTranscribe('ERROR: Gladia/Groq API key မရှိပါ — Key Pool panel တွင် key ထည့်ပါ', 'err');
        return;
    }
    if (isTranscribing) return;
    isTranscribing = true;
    transcribeAborted = false;

    const language = transcribeLangSelect.value;
    const maxRetries = Math.max(parseInt(transcribeMaxRetriesInput.value, 10) || 2, 1);
    const timeoutSec = Math.max(parseInt(transcribeTimeoutSecInput.value, 10) || 120, 10);

    transcribeBtn.disabled = true;
    transcribeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>TRANSCRIBING...</span>';
    stopTranscribeBtn.disabled = false;
    transcribeDoneBadge.classList.add('hidden');
    transcribeProgressPanel.classList.remove('hidden');
    transcribeLogBox.innerHTML = '';
    transcribeOutput.value = '';
    transcribeStatusBadge.textContent = 'RUNNING';

    logTranscribe(`ဖိုင် "${selectedMediaFile.name}" (${formatBytes(selectedMediaFile.size)}) ကို transcribe စတင်နေသည်...`);

    try {
        const result = await transcribeMediaWithRotation(selectedMediaFile, language, maxRetries, timeoutSec, (msg, lvl) => logTranscribe(msg, lvl));

        if (transcribeAborted) {
            logTranscribe('User မှ ရပ်တန့်လိုက်ပါသည်။', 'warn');
        }

        const srt = result.srtDirect || segmentsToSrt(result.segments);
        currentTranscribeResult = {
            srt: srt || '(No timestamped segments returned — see TXT tab)',
            fullText: result.fullText || '',
            jsonStr: JSON.stringify(result.raw, null, 2),
            provider: result.provider,
            sourceFileName: selectedMediaFile.name
        };

        renderTranscribeOutput();
        transcribeOutputMeta.textContent = `Provider: ${result.provider.toUpperCase()} | Segments: ${result.segments.length} | Characters: ${currentTranscribeResult.fullText.length}`;
        transcribeDoneBadge.classList.remove('hidden');
        transcribeStatusBadge.textContent = 'DONE';
        logTranscribe(`Transcription ပြီးဆုံးပါပြီ ✓ (${result.provider.toUpperCase()})`, 'ok');

    } catch (err) {
        console.error('Transcription Error:', err);
        transcribeStatusBadge.textContent = 'FAILED';
        logTranscribe(`FAILED: ${err.message}`, 'err');
    } finally {
        isTranscribing = false;
        transcribeBtn.disabled = false;
        transcribeBtn.innerHTML = '<i class="fa-solid fa-microphone-lines text-yellow-300 text-base"></i><span>TRANSCRIBE</span>';
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
    mediaFileInput.value = '';
    mediaFileMeta.textContent = 'ဖိုင်ရွေးရန် (.mp4 / .mp3 / .wav / .m4a) — ဒီနေရာသို့ drag & drop လည်းရပါသည်';
    mediaFileDropzone.classList.remove('border-emerald-500/50');
    currentTranscribeResult = null;
    transcribeOutput.value = '';
    transcribeOutputMeta.textContent = '';
    transcribeDoneBadge.classList.add('hidden');
    transcribeLogBox.innerHTML = '';
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
    updateSrtInputMeta();
    switchToolView('translator');
    transProgressPanel.classList.remove('hidden');
    logTrans('TRANSCRIBE tab မှ SRT လက်ခံရရှိပါပြီ ✓', 'ok');
});

// =============================================================
// Transcribe module init
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
    loadTranscribeKeysIntoInputs();
    setActiveFormatBtn('srt');
});
