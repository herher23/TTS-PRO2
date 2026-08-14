# NEO-YANGON 2026 — Transcribe + SRT Translator + Neural TTS Engine

Static, client-side only app (no backend, no build step, no FFmpeg/Redis/Celery —
everything below runs straight in the browser). Three tools in one page, designed as a
pipeline: **Transcribe → Translate → Speak**.

1. **Media Transcribe** *(new)* — upload an `.mp4` / `.mp3` (or `.wav` / `.m4a` / `.webm`)
   file and it's sent straight from the browser to a **Gladia + Groq (Whisper) key pool**
   with auto rotation: on any error/timeout it automatically rotates to the next Gladia or
   Groq key. Outputs three formats you can copy or download — a ready-made `.srt`, a plain
   `transcript.txt`, and the raw `result.json` from whichever provider handled the job.
   A "Send to Translator" button hands the generated SRT straight to tool #2.
2. **SRT Translator** — paste/open an original `.srt`, pick a target language, and it
   translates every subtitle line via the Gemini API while preserving index numbers and
   timestamps. Multi-key + multi-model rotation, multiple parallel workers, retry/timeout
   controls, and an optional glossary (find/replace) applied to the output.
3. **Text → Speech** — the original Neural TTS engine (unchanged): multi-key/model
   rotation, 8 voice presets, speed control, clarity boost, live spectrum/waveform
   visualizer, and WAV download. Reachable from the Translator tab via "Send to TTS".

All API keys are stored only in the browser's `localStorage`. Nothing is proxied through
a server: the Transcribe tab talks directly to `api.gladia.io` and `api.groq.com`, and the
Translator/TTS tabs talk directly to `generativelanguage.googleapis.com`.

> **Note on Gladia/Groq CORS:** both providers' REST APIs are designed to be called with a
> server-side key, and this app deliberately calls them straight from the browser (same
> philosophy as the Gemini calls above) so there's no backend to host. In practice this
> has worked in testing, but if your browser blocks a request as cross-origin, that's a
> provider-side CORS policy, not a bug in this page — the Transcribe tab will log the
> failure and auto-rotate to the next key/provider in the pool either way.

## Run locally

Just open `index.html` in a browser, or serve the folder with any static server, e.g.:

```bash
python3 -m http.server 8000
```

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

- The Translator and TTS tools share the same Gemini API key list (entered once, in the
  **Text to Speech** tab's "Key & Model Rotation" panel). The translator keeps its own
  separate model list/rotation pointer so it never interferes with the TTS engine's model
  rotation.
- The **Transcribe** tab uses its own, separate key pool (Gladia keys + Groq keys, entered
  in its own "Transcription Key Pool" panel) since those are different providers entirely.
- The Global Memory / Glossary list is one shared list. It's editable from either the
  **Text to Speech** tab or the **SRT Translator** tab (both show the same entries) and is
  applied as a find/replace pass on the Translator's output before it's sent anywhere.
- When translating into Myanmar, the translator prompt instructs the model to translate
  for meaning/context (not word-for-word) and to never output the Myanmar punctuation
  marks `။` / `၊` or the Western `!` / `?`. A post-processing pass strips any of those
  four characters from the Myanmar output as a safety net, in case the model outputs one
  anyway.
- "Send to Translator" on the Transcribe tab's output panel copies the generated `.srt`
  straight into the SRT Translator tab.
- "Send to TTS" on the translator's output panel copies the translated dialogue straight
  into the Text-to-Speech tab so you can narrate it immediately.
