# NEO-YANGON 2026 — Transcribe + SRT Translator + Neural TTS Engine + AI Recap Studio

Static, client-side only app (no backend, no build step, no FFmpeg/Redis/Celery —
everything below runs straight in the browser). Four tools in one page, designed as a
pipeline: **Transcribe → Translate → Speak**, plus a standalone **Recap** tool that
runs the whole pipeline in one click.

1. **Media Transcribe** — upload an `.mp4` / `.mp3` (or `.wav` / `.m4a` / `.webm`) file.
   The audio track is decoded and chunked entirely in the browser via the Web Audio API
   (no ffmpeg): each **Chunk Size**-second slice is downsampled to a small 16kHz-mono WAV
   and sent in parallel across a configurable number of **Workers** to a **Gladia + Groq
   (Whisper) + AssemblyAI key pool**, with auto rotation — on any chunk's error/timeout it
   rotates to the next key across all three providers for that chunk. Each chunk's returned
   timestamps are then offset back onto the full timeline and merged, the same chunking
   approach AI Transcribe (Gemini) below already used — so Chunk Size / Workers now apply to
   every provider, not just Gemini. Outputs three formats you can copy or download — a
   ready-made `.srt`, a plain `transcript.txt`, and a `result.json` summary (provider mix,
   chunk/worker counts, cue count — since the result is now stitched from many provider
   responses rather than one). A "Send to Translator" button hands the generated SRT straight
   to tool #2. Three Gemini-powered follow-up tools live in this tab as well:
   - **AI Transcribe (Gemini)** — generates the *original* SRT directly from the raw media
     using only the Gemini key pool, with no Gladia/Groq/AssemblyAI key required. The audio
     track is decoded and chunked entirely in the browser via the Web Audio API (still no
     ffmpeg): each **Chunk Size**-second slice is downsampled to a small 16kHz-mono WAV and
     sent to Gemini in parallel across a configurable number of **Workers** (same worker-pool
     pattern as the SRT Translator tab below); each chunk's returned timestamps are then
     offset back onto the full timeline and merged. Because every request only carries one
     small time-slice (not the whole file), this scales to long media without hitting
     per-request size limits — the trade-off is that a sentence spoken right across a chunk
     boundary can occasionally be split oddly, the same trade-off the Translator/AI SRT
     Format tools already make with their own chunking.
   - **AI Timestamp Fix** — re-sends the original media file (audio/video) together with the
     generated SRT to Gemini so it can listen/watch and correct drift in the start/end
     timestamps without touching the subtitle text. For long files this is sent in
     multiple cue-batches (not one request) to stay within the model's output size.
   - **AI SRT Format** — asks Gemini to merge over-split, word-level fragments into
     natural subtitle lines, remove duplicate/overlapping timestamps, and renumber cues.
     Also chunked for long transcripts.
2. **SRT Translator** — paste/open an original `.srt`, pick a target language, and it
   translates every subtitle line via the Gemini API while preserving both the timestamps
   **and the original cue numbers** verbatim — cue `651` in the source stays cue `651` in
   the output, it is never renumbered. Multi-key + multi-model rotation, multiple parallel
   workers, retry/timeout controls, and an optional glossary (find/replace) applied to the
   output. The output panel's "ဘာသာမပြန်ရသေးတာ CHECK" button flags any cue still sitting on
   untranslated text; a "RETRY" button next to it re-sends just those flagged cues for
   translation (instead of re-running the whole file) and updates the output in place. A
   separate "MMSub SRT (Zawgyi)" button re-encodes the Myanmar dialogue text to the legacy
   Zawgyi-One font encoding used by older Myanmar subtitle players (MMSubLite/MMSubPlay-style
   apps) and downloads it as `<filename>.mmsub.srt` — cue numbers/timestamps are untouched,
   only the glyph encoding of the dialogue text changes. Zawgyi conversion is rule-based and
   best-effort (even the reference converter it's adapted from doesn't claim 100% accuracy on
   every edge case), so spot-check unusual text in your target player.
3. **Text → Speech** — the original Neural TTS engine: multi-key/model rotation, 8 voice
   presets, speed control, clarity boost, live spectrum/waveform visualizer, a STOP button
   to cancel an in-flight generation, and WAV download. Reachable from the Translator or
   Recap tabs via "Send to TTS".
4. **AI Recap Studio** — a "one click" pipeline that takes a raw media file, transcribes it
   (reusing tool #1's key pool), cleans + translates the transcript into Myanmar, and
   generates a short/long summary, key points, chapter breakdown, and platform-specific
   titles (YouTube/TikTok/Facebook) + SEO keywords via Gemini. Long transcripts are
   processed in chunks for the clean+translate pass to avoid exceeding the model's output
   limit; the summary/title pass runs once over the combined result. A "Send Narration to
   TTS" button hands the long summary straight to tool #3.

All API keys are stored only in the browser's `localStorage`. Gladia, Groq, and
AssemblyAI calls go straight from the browser to each provider's own API
(`api.gladia.io`, `api.groq.com`, `api.assemblyai.com`). **Gemini calls (TTS, Translator,
AI Transcribe, AI Timestamp Fix, AI SRT Format, and Recap) are routed through a third-party
Cloudflare Worker proxy (`vpn2-pro.herher650.workers.dev`) rather than going directly to
`generativelanguage.googleapis.com`.** This means your Gemini API key is sent to, and
passed through, that third-party worker on every request — only use this app with a
Gemini key you're comfortable exposing to an operator you don't control (e.g. a
free/throwaway key, not a production key with billing attached).

> **Note on Gladia/Groq/AssemblyAI CORS:** these providers' REST APIs are designed to be
> called with a server-side key, and this app deliberately calls them straight from the
> browser so there's no backend to host. In practice this has worked in testing, but if
> your browser blocks a request as cross-origin, that's a provider-side CORS policy, not a
> bug in this page — the Transcribe tab will log the failure and auto-rotate to the next
> key/provider in the pool either way.

## Run locally

Browsers (Safari in particular) restrict `localStorage` and some fetch/CORS behavior on
pages opened directly from disk (`file://` origin), which can make key-saving or API
calls silently fail. **Serve the folder over HTTP instead of double-clicking
`index.html`:**

```bash
python3 -m http.server 8000
```

then open `http://localhost:8000` in your browser. Opening `index.html` directly may
still work in some browsers (notably Chrome), but it isn't guaranteed and isn't how this
app is meant to be run.

## Deploy on GitHub Pages

1. Create a new GitHub repo and push these three files (`index.html`, `style.css`,
   `script.js`) to the root of the `main` branch.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Branch: `main`, folder: `/ (root)` → **Save**.
5. Wait a minute, then open the URL GitHub shows
   (`https://<username>.github.io/<repo-name>/`).

No build step, no secrets to configure — it's plain HTML/CSS/JS served as-is.

## Notes

- The Translator, AI Transcribe, AI Timestamp Fix / AI SRT Format, and Recap tools share the
  same Gemini API key list (entered once, in the **Text to Speech** tab's "Key & Model
  Rotation" panel). Each tool keeps its own separate model list/rotation pointer (editable
  from its own panel) so none of them interferes with another's model rotation. AI Transcribe
  shares its Gemini model list with AI Timestamp Fix / AI SRT Format (the "Gemini Model List"
  box in the Transcribe tab's key panel).
- **Chunk Size** (seconds per audio slice) and **Workers** (parallel requests) controls live
  in the Transcribe tab's Controls Panel, next to Language / Max Retries / Timeout, and now
  drive BOTH transcribe buttons — TRANSCRIBE (Gladia/Groq/AssemblyAI pool) and AI TRANSCRIBE
  (GEMINI) — since both chunk the media client-side and process it with the same worker-pool
  pattern. Larger chunks mean fewer requests but a higher chance of hitting a per-request
  size/output ceiling on very talkative audio; more workers finish faster but burn through
  key-pool quota faster too.
- The **Transcribe** tab uses its own, separate key pool (Gladia + Groq + AssemblyAI keys,
  entered in its own "Transcription Key Pool" panel) since those are different providers
  entirely. The **Recap** tab reuses this same pool for its transcription step.
- The Global Memory / Glossary list is one shared list. It's editable from either the
  **Text to Speech** tab or the **SRT Translator** tab (both show the same entries) and is
  applied as a find/replace pass on the Translator's and Recap's Myanmar output before
  it's sent anywhere.
- When translating into Myanmar, the translator prompt instructs the model to translate
  for meaning/context (not word-for-word) and to never output the Myanmar punctuation
  marks `။` / `၊` or the Western `!` / `?`. A post-processing pass strips any of those
  four characters from the Myanmar output as a safety net, in case the model outputs one
  anyway.
- "Send to Translator" on the Transcribe tab's output panel copies the generated `.srt`
  straight into the SRT Translator tab.
- "Send to TTS" on the translator's or Recap's output panel copies the translated
  dialogue / narration straight into the Text-to-Speech tab so you can narrate it
  immediately. Text over 10,000 characters is truncated for the TTS engine — you'll see a
  warning if that happens.
- FFmpeg / server-side video processing is **not** included anywhere in this app — every
  media operation (transcription, timestamp fixing) sends the file as-is to a third-party
  API and works with whatever the API returns.

