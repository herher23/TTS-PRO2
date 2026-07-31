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

function renderGlossary() {
    const list = getGlossary();
    glossaryList.innerHTML = '';
    if (list.length === 0) {
        glossaryList.innerHTML = '<p class="text-cyan-600/50 font-mono text-[10px]">စာရင်း ဗလာဖြစ်နေပါသည်။</p>';
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
        glossaryList.appendChild(row);
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
});

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

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

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
