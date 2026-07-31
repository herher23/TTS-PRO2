const { useState, useEffect } = React;

const VOICES = [
    // Female Voices (မိန်းကလေး)
    { id: 'PhwayPhway', apiId: 'Kore', name: 'Phway Phway', label: 'မဖွေးဖွေး (Female)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PhwayPhway' },
    { id: 'WuttHmone', apiId: 'Aoede', name: 'Wutt Hmone Shwe Yi', label: 'မဝတ်မှုံရွှေရည် (Female)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WuttHmone' },
    { id: 'ThetMon', apiId: 'Leda', name: 'Thet Mon Myint', label: 'မသက်မွန်မြင့် (Female)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ThetMon' },
    { id: 'Eaindra', apiId: 'Callirrhoe', name: 'Eaindra Kyaw Zin', label: 'မအိန္ဒြာကျော်ဇင် (Female)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eaindra' },
    { id: 'ShweHmone', apiId: 'Kore', name: 'Shwe Hmone Yati', label: 'မရွှေမှုံရတီ (Female)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ShweHmone' }, 
    { id: 'Thinzar', apiId: 'Aoede', name: 'Thinzar Wint Kyaw', label: 'မသင်ဇာဝင့်ကျော် (Female)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thinzar' },
    
    // Male Voices (ယောကျ်ားလေး)
    { id: 'SaiSai', apiId: 'Puck', name: 'Sai Sai', label: 'ကိုစိုင်းစိုင်း (Male)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SaiSai' },
    { id: 'NayToe', apiId: 'Charon', name: 'Nay Toe', label: 'ကိုနေတိုး (Male)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NayToe' },
    { id: 'MyintMyat', apiId: 'Fenrir', name: 'Myint Myat', label: 'ကိုမြင့်မြတ် (Male)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MyintMyat' },
    { id: 'Daung', apiId: 'Orus', name: 'Daung', label: 'ကိုဒေါင်း (Male)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daung' },
    { id: 'AungYeLin', apiId: 'Puck', name: 'Aung Ye Lin', label: 'ကိုအောင်ရဲလင်း (Male)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AungYeLin' },
    { id: 'PyayTiOo', apiId: 'Charon', name: 'Pyay Ti Oo', label: 'ကိုပြေတီဦး (Male)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PyayTiOo' },
    { id: 'LuMin', apiId: 'Fenrir', name: 'Lu Min', label: 'ကိုလူမင်း (Male)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LuMin' },
    { id: 'PaingTakhon', apiId: 'Orus', name: 'Paing Takhon', label: 'ကိုပိုင်တံခွန် (Male)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PaingTakhon' }
];

const EMOTIONS = [
    'Normal😊',
    'Happy/Excited😁',
    'Sad / Emotional😭',
    'Dynamic/Action🔥',
    'Funny / Comedy🤣',
    'Horror/Scary👻',
    'Whisper🤭'
];

function App() {
    const [theme, setTheme] = useState('dark');
    const [mode, setMode] = useState('solo');
    const [toast, setToast] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('mfm_api_key') || '');
    
    // Custom Proxy Features
    const [useProxy, setUseProxy] = useState(() => {
        const saved = localStorage.getItem('mfm_use_proxy');
        return saved !== null ? saved === 'true' : true; 
    });
    
    // Hardcoded User's Proxy URL
    const [customProxyUrl, setCustomProxyUrl] = useState(() => {
        const saved = localStorage.getItem('mfm_custom_proxy_url');
        if (!saved || saved === 'https://corsproxy.io/?' || saved === 'https://ttspro03.mocfy866.workers.dev/') {
            return 'https://ttspro03.mocfy866.workers.dev/?';
        }
        return saved;
    });

    const [isCheckingVersion, setIsCheckingVersion] = useState(true);
    const [versionStatus, setVersionStatus] = useState('Checking Update...');
    
    const [blocks, setBlocks] = useState([{ 
        id: Date.now(), 
        text: '', 
        voice: VOICES[0], 
        audio: null, 
        loading: false, 
        previewLoading: false,
        pitch: 0,
        emotion: 'Normal😊'
    }]);

    const [fullAudio, setFullAudio] = useState(null);
    const [fullLoading, setFullLoading] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('mfm_theme') || 'dark';
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('mfm_theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsCheckingVersion(false);
            setVersionStatus(apiKey ? 'Pro Version Active' : 'API Key Required');
        }, 1200);
        return () => clearTimeout(timer);
    }, [apiKey]);

    const showMsg = (msg, type = 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4500);
    };

    const saveApiKey = (key) => {
        setApiKey(key);
        localStorage.setItem('mfm_api_key', key);
    };

    const toggleProxy = (checked) => {
        setUseProxy(checked);
        localStorage.setItem('mfm_use_proxy', checked);
    };

    const updateCustomProxy = (url) => {
        setCustomProxyUrl(url);
        localStorage.setItem('mfm_custom_proxy_url', url);
    };

    const convertToWav = (pcmData) => {
        const buffer = new ArrayBuffer(44 + pcmData.length * 2);
        const view = new DataView(buffer);
        const writeString = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 32 + pcmData.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, 24000, true);
        view.setUint32(28, 48000, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, pcmData.length * 2, true);
        
        for (let i = 0; i < pcmData.length; i++) view.setInt16(44 + i * 2, pcmData[i], true);
        return new Blob([buffer], { type: 'audio/wav' });
    };

    const applyVoiceSettings = (text, emotion, pitch) => {
        let prefix = "";
        if (emotion && emotion !== 'Normal😊') {
            const tone = emotion.replace(/[^a-zA-Z\/ ]/g, "").trim();
            prefix += `[Speak in a ${tone} tone] `;
        }
        if (pitch !== 0) {
            const pitchDesc = pitch > 0 ? `high pitch level` : `low pitch level`;
            prefix += `[Use a ${pitchDesc}] `;
        }
        return prefix ? `${prefix}\n${text}` : text;
    };

    const fetchTTS = async (text, apiId) => {
        if (!apiKey) throw new Error("API_KEY_MISSING");

        const keysArray = apiKey.split(',').map(k => k.trim()).filter(k => k.length > 0);
        if (keysArray.length === 0) throw new Error("API_KEY_MISSING");
        
        const currentKey = keysArray[Math.floor(Math.random() * keysArray.length)];
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${currentKey}`;
        
        const fetchUrl = useProxy ? `${customProxyUrl}${targetUrl}` : targetUrl;

        try {
            const res = await fetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text }] }],
                    generationConfig: { 
                        responseModalities: ["AUDIO"], 
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: apiId } } }
                    }
                })
            });

            if (!res.ok) {
                let errorMsg = `HTTP Error ${res.status}`;
                try {
                    const errorData = await res.json();
                    errorMsg = errorData.error?.message || errorMsg;
                } catch(e) {}
                throw new Error(errorMsg);
            }

            const data = await res.json();
            
            const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!b64) throw new Error("API Returned Invalid Data Format");
            
            const bin = atob(b64);
            const pcm = new Int16Array(bin.length / 2);
            for (let i = 0; i < bin.length; i += 2) pcm[i / 2] = (bin.charCodeAt(i + 1) << 8) | bin.charCodeAt(i);
            return pcm;

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                if (useProxy) {
                    throw new Error("Proxy connection failed! Please check your Custom Proxy URL or turn Proxy OFF and use a VPN.");
                } else {
                    throw new Error("Network Error. Please turn ON VPN or enable Proxy in Settings.");
                }
            }
            throw error;
        }
    };

    const handleSingleGenerate = async (id, isPreview = false) => {
        if (!apiKey) {
            showMsg("Please configure your API Key in settings", "error");
            setShowSettings(true);
            return;
        }
        const block = blocks.find(b => b.id === id);
        let textToUse = isPreview ? `မင်္ဂလာပါ။ ${block.voice.name} မှ အသံစမ်းသပ်ပေးနေခြင်းဖြစ်ပါတယ်။` : block.text;
        
        if (!isPreview && !textToUse.trim()) {
            showMsg("Please enter text for this dialogue", "error");
            return;
        }

        setBlocks(prev => prev.map(b => b.id === id ? { ...b, previewLoading: isPreview, loading: !isPreview } : b));
        
        try {
            const finalPromptText = applyVoiceSettings(textToUse, block.emotion, block.pitch);
            const pcm = await fetchTTS(finalPromptText, block.voice.apiId);
            const wav = convertToWav(pcm);
            const url = URL.createObjectURL(wav);
            
            if (isPreview) {
                new Audio(url).play();
                setBlocks(prev => prev.map(b => b.id === id ? { ...b, previewLoading: false } : b));
            } else {
                setBlocks(prev => prev.map(b => b.id === id ? { ...b, audio: url, loading: false } : b));
                showMsg("Audio generated successfully!", "success");
            }
        } catch (e) {
            setBlocks(prev => prev.map(b => b.id === id ? { ...b, loading: false, previewLoading: false } : b));
            if (e.message === "API_KEY_MISSING") {
                showMsg("API Key is missing or invalid", "error");
            } else {
                showMsg(`Error: ${e.message}`, "error"); 
            }
        }
    };

    const handleCinematicGenerate = async () => {
        if (!apiKey) {
            showMsg("Please configure your API Key first", "error");
            setShowSettings(true);
            return;
        }
        
        const validBlocks = blocks.filter(b => b.text.trim());
        if (validBlocks.length === 0) {
            showMsg("Cannot generate: No valid text blocks found.", "error");
            return;
        }
        if (validBlocks.length < blocks.length) {
            showMsg(`Generating... Skipped ${blocks.length - validBlocks.length} empty block(s).`, "warning");
        } else {
            showMsg("Starting full cinematic synthesis...", "success");
        }

        setFullLoading(true);
        setFullAudio(null);
        
        try {
            const chunks = new Array(validBlocks.length).fill(null);
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            
            const BATCH_SIZE = 3; 
            const DELAY_BETWEEN_BATCHES = 6000; 

            for (let i = 0; i < validBlocks.length; i += BATCH_SIZE) {
                const batch = validBlocks.slice(i, i + BATCH_SIZE);
                showMsg(`Processing part ${Math.ceil((i+1)/BATCH_SIZE)} of ${Math.ceil(validBlocks.length/BATCH_SIZE)}...`, "warning");

                const batchPromises = batch.map(async (block, index) => {
                    const finalPromptText = applyVoiceSettings(block.text, block.emotion, block.pitch);
                    try {
                        const pcm = await fetchTTS(finalPromptText, block.voice.apiId);
                        return { pcm, originalIndex: i + index };
                    } catch (err) {
                        console.error(`Error generating audio for block ${i + index}:`, err);
                        throw err; 
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                
                for (const result of batchResults) {
                    if (result.pcm) {
                        chunks[result.originalIndex] = result.pcm;
                    }
                }

                if (i + BATCH_SIZE < validBlocks.length) {
                    await delay(DELAY_BETWEEN_BATCHES);
                }
            }

            const finalChunks = [];
            for (const pcm of chunks) {
                if (pcm) {
                    finalChunks.push(pcm);
                    finalChunks.push(new Int16Array(24000 * 0.5).fill(0)); 
                }
            }

            const totalSamples = finalChunks.reduce((a, c) => a + c.length, 0);
            const fullPcm = new Int16Array(totalSamples);
            let offset = 0;
            for (const chunk of finalChunks) {
                fullPcm.set(chunk, offset);
                offset += chunk.length;
            }

            const wav = convertToWav(fullPcm);
            setFullAudio(URL.createObjectURL(wav));
            showMsg("Cinematic audio generated successfully!", "success");
        } catch (e) {
            console.error(e);
            showMsg(`Error: ${e.message}`, "error");
        } finally {
            setFullLoading(false);
        }
    };

    const downloadAudio = (url, filename) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    return (
        <div className="max-w-xl mx-auto min-h-screen px-4 pb-48 pt-10">
            
            {toast && (
                <div className={`toast px-6 py-3 rounded-2xl flex items-center gap-3 font-bold text-xs shadow-2xl ${
                    toast.type === 'error' ? 'bg-red-500 text-white' : 
                    toast.type === 'warning' ? 'bg-amber-500 text-white' : 
                    'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                }`}>
                    <i className={`fa-solid ${toast.type === 'error' ? 'fa-triangle-exclamation' : toast.type === 'warning' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                    {toast.msg}
                </div>
            )}

            {showSettings && (
                <div className="modal-overlay">
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-6 rounded-3xl w-[90%] max-w-sm relative shadow-2xl">
                        <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                            <i className="fa-solid fa-times text-xl"></i>
                        </button>
                        <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                            <i className="fa-solid fa-shield-halved text-indigo-500"></i> Settings & Pro
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-3 mb-2">
                                <i className={`fa-solid ${apiKey ? 'fa-circle-check text-indigo-500' : 'fa-circle-xmark text-red-500'} text-xl`}></i>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-white">{apiKey ? 'License Active' : 'License Required'}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-zinc-500">Enter Gemini API key(s) to unlock</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Gemini API Keys (Comma Separated)</label>
                                <textarea 
                                    value={apiKey} 
                                    onChange={(e) => saveApiKey(e.target.value)}
                                    placeholder="AIzaSy123..., AIzaSy456..." 
                                    rows="3"
                                    className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white transition-colors resize-none"
                                />
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white">API Proxy Override</p>
                                        <p className="text-[10px] text-slate-500">Turn OFF if using your own VPN</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={useProxy} onChange={(e) => toggleProxy(e.target.checked)}/>
                                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>

                                {useProxy && (
                                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">Proxy Server URL</label>
                                        <input 
                                            type="text" 
                                            value={customProxyUrl} 
                                            onChange={(e) => updateCustomProxy(e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-2.5 text-[11px] outline-none focus:border-indigo-500 text-slate-800 dark:text-white transition-colors"
                                            placeholder="https://ttspro03.mocfy866.workers.dev/?"
                                        />
                                        <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                                            Default: <code className="bg-slate-200 dark:bg-zinc-800 px-1 rounded">https://ttspro03.mocfy866.workers.dev/?</code><br/>
                                            ကိုယ်ပိုင် <b>Cloudflare Worker Proxy</b> အသုံးပြုထားပါသည်။
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 text-white font-black uppercase text-xs rounded-xl transition-all shadow-md mt-2">
                                Save & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="text-center mb-10 relative">
                <button onClick={toggleTheme} className="absolute right-14 top-0 w-10 h-10 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all shadow-sm">
                    {theme === 'dark' ? <i className="fa-solid fa-sun"></i> : <i className="fa-solid fa-moon"></i>}
                </button>
                <button onClick={() => setShowSettings(true)} className="absolute right-0 top-0 w-10 h-10 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-500 transition-all shadow-sm">
                    <i className="fa-solid fa-gear"></i>
                </button>
                
                <div className="w-16 h-16 bg-white dark:bg-zinc-900 border-2 border-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 ai-glow">
                    <i className="fa-solid fa-microphone-lines text-2xl text-indigo-500"></i>
                </div>
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                    TTS <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">PRO</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-[0.3em] mt-1">Professional Dual Mode</p>
                
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/5 rounded-full text-[9px] font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-black/80 transition-colors shadow-sm" onClick={() => setShowSettings(true)}>
                    {isCheckingVersion ? (
                        <><i className="fa-solid fa-spinner animate-spin text-indigo-500"></i> <span className="text-slate-600 dark:text-slate-300">Checking System...</span></>
                    ) : (
                        <><i className={`fa-solid ${apiKey ? 'fa-circle-check text-indigo-500' : 'fa-triangle-exclamation text-red-500'}`}></i> <span className="text-slate-600 dark:text-slate-300">{versionStatus}</span></>
                    )}
                </div>
            </header>

            <div className="flex bg-slate-100 dark:bg-zinc-900/50 p-1.5 rounded-[1.8rem] mb-10 border border-slate-200 dark:border-white/5 shadow-inner">
                <button onClick={() => setMode('solo')} className={`flex-1 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase transition-all ${mode === 'solo' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/30' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}>Solo Mode</button>
                <button onClick={() => setMode('drama')} className={`flex-1 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase transition-all ${mode === 'drama' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/30' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}>Cinematic Mode</button>
            </div>

            <div className="space-y-6">
                {blocks.map((b, idx) => (
                    <div key={b.id} className="glass-card p-6 relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <img src={b.voice.avatar} className="character-img" />
                                <div>
                                    <h3 className="font-black text-sm">{b.voice.name}</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase">{b.voice.label}</p>
                                </div>
                            </div>
                            <button onClick={() => handleSingleGenerate(b.id, true)} className="preview-btn" disabled={b.previewLoading}>
                                {b.previewLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-ear-listen"></i>}
                                Test
                            </button>
                        </div>

                        <div className="space-y-4">
                            <select 
                                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-bold p-3.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors shadow-sm"
                                value={b.voice.id}
                                onChange={(e) => setBlocks(blocks.map(x => x.id === b.id ? {...x, voice: VOICES.find(v => v.id === e.target.value)} : x))}
                            >
                                {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                            </select>
                            
                            <div className="flex flex-col md:flex-row gap-4 mt-4 p-4 bg-slate-100/50 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">
                                        <i className="fa-solid fa-masks-theater mr-1"></i> Emotion
                                    </label>
                                    <select 
                                        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-bold p-3 rounded-xl text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all shadow-sm"
                                        value={b.emotion}
                                        onChange={(e) => setBlocks(blocks.map(x => x.id === b.id ? {...x, emotion: e.target.value} : x))}
                                    >
                                        {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2 flex justify-between">
                                        <span><i className="fa-solid fa-wave-square mr-1"></i> Pitch</span>
                                        <span className="text-indigo-500 font-black">{b.pitch > 0 ? `+${b.pitch}` : b.pitch}</span>
                                    </label>
                                    <input 
                                        type="range" 
                                        min="-10" max="10" step="1"
                                        value={b.pitch}
                                        onChange={(e) => setBlocks(blocks.map(x => x.id === b.id ? {...x, pitch: parseInt(e.target.value)} : x))}
                                        className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer mt-3 accent-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Character Count အပိုင်း ထည့်သွင်းထားသည် */}
                            <div className="relative">
                                <textarea 
                                    className="w-full bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 pb-8 text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-500 min-h-[120px] transition-all shadow-sm"
                                    placeholder="ဒီနေရာမှာ စာသားရိုက်ထည့်ပါ..."
                                    value={b.text}
                                    onChange={(e) => setBlocks(blocks.map(x => x.id === b.id ? {...x, text: e.target.value} : x))}
                                />
                                <div className="absolute bottom-3 right-4 text-[10px] font-bold text-slate-400 dark:text-zinc-500 bg-white/80 dark:bg-black/80 px-2 py-1 rounded-md pointer-events-none">
                                    {b.text.length} စာလုံး
                                </div>
                            </div>
                        </div>

                        {mode === 'solo' && (
                            <div className="mt-5 pt-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                                {b.audio && (
                                    <div className="flex items-center gap-3">
                                        <audio src={b.audio} controls className="flex-1" />
                                        <button 
                                            onClick={() => downloadAudio(b.audio, `Solo_${b.voice.name}_${Date.now()}.wav`)}
                                            className="download-btn-small"
                                            title="Download Audio"
                                        >
                                            <i className="fa-solid fa-download"></i>
                                        </button>
                                    </div>
                                )}
                                <button 
                                    onClick={() => handleSingleGenerate(b.id)}
                                    disabled={b.loading || !b.text.trim()}
                                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-black uppercase text-[11px] rounded-xl active:scale-95 transition-all disabled:opacity-30 shadow-md"
                                >
                                    {b.loading ? <i className="fa-solid fa-circle-notch animate-spin mr-2"></i> : <i className="fa-solid fa-play mr-2"></i>}
                                    {b.loading ? "Generating Voice..." : "Generate Audio"}
                                </button>
                            </div>
                        )}

                        {mode === 'drama' && blocks.length > 1 && (
                            <button onClick={() => setBlocks(blocks.filter(x => x.id !== b.id))} className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full text-white flex items-center justify-center border-4 border-white dark:border-black text-xs shadow-md">
                                <i className="fa-solid fa-times"></i>
                            </button>
                        )}
                    </div>
                ))}

                <button 
                    onClick={() => setBlocks([...blocks, { id: Date.now(), text: '', voice: VOICES[0], audio: null, loading: false, previewLoading: false, pitch: 0, emotion: 'Normal😊' }])}
                    className="w-full py-6 border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-[2rem] text-slate-500 dark:text-zinc-600 text-[11px] font-black uppercase tracking-[0.2em] hover:text-slate-700 dark:hover:text-zinc-400 hover:border-slate-400 dark:hover:border-zinc-600 transition-all bg-slate-50/50 dark:bg-transparent"
                >
                    + Add New Dialogue
                </button>
            </div>

            {mode === 'drama' && (
                <div className="sticky-footer">
                    <div className="max-w-xl mx-auto space-y-4">
                        {fullAudio && (
                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-3xl mb-4 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Full Narrative Ready</span>
                                    <button onClick={() => downloadAudio(fullAudio, `Story_${Date.now()}.wav`)} className="text-slate-700 dark:text-white text-xs hover:text-indigo-500 transition-colors">
                                        <i className="fa-solid fa-download text-lg"></i>
                                    </button>
                                </div>
                                <audio src={fullAudio} controls />
                            </div>
                        )}
                        <button 
                            onClick={handleCinematicGenerate}
                            disabled={fullLoading}
                            className="w-full py-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black uppercase text-xs rounded-[2rem] shadow-[0_10px_40px_rgba(99,102,241,0.3)] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {fullLoading ? <i className="fa-solid fa-circle-notch animate-spin mr-3"></i> : <i className="fa-solid fa-clapperboard mr-3"></i>}
                            {fullLoading ? "Synthesizing Story..." : "Generate Full Cinematic Audio"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
