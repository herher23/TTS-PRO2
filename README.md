# NEO-YANGON 2026 — Holographic Neural TTS Engine

Gemini TTS ကို Key/Model auto-rotation နဲ့ browser ထဲကနေတိုက်ရိုက် ခေါ်သုံးတဲ့ static site။

## ဖိုင်များ
- `index.html` — UI structure
- `style.css` — cyberpunk theme + light theme
- `script.js` — TTS logic, key/model rotation, glossary, player

## GitHub Pages မှာ run နည်း
1. GitHub repo အသစ်တစ်ခုဖန်တီးပြီး ဒီဖိုင် ၃ ခု (index.html, style.css, script.js) ကို push လုပ်ပါ။
2. Repo **Settings → Pages** ထဲမှာ Source ကို `main` branch / root ကို ရွေးပါ။
3. Save လုပ်ရင် `https://<username>.github.io/<repo>/` link ထွက်လာပါမည်။

## API Key & Model ထည့်နည်း
- Site ကိုဖွင့်ပြီး **"Key & Model Rotation"** panel ထဲမှာ Gemini API key(s) ကို တစ်ကြောင်းစီ (သို့) comma ခြားပြီး ထည့်ပါ။
- "SAVE KEYS & MODELS" ကိုနှိပ်ပါ — key တွေကို browser ရဲ့ localStorage ထဲမှာပဲ သိမ်းပါတယ်၊ ဘယ် server ကိုမှ မပို့ပါ (GitHub Pages က static hosting ဖြစ်လို့ backend မရှိပါ)။
- Request တိုင်းအတွက် key list ကို round-robin auto rotate လုပ်ပါမည်။ key တစ်ခု quota ကုန်/error တက်ရင် နောက် key ကို auto ပြောင်းသုံးပါမည်။

## Model List အကြောင်း
`gemini-2.5-flash-preview-tts` နှင့် `gemini-2.5-pro-preview-tts` က verified Gemini TTS model id များဖြစ်ပါတယ်။ "3.1" စီးရီးကဲ့သို့ အခြား model အသစ်များ key access ရှိပါက Google AI Studio (https://aistudio.google.com) ထဲက **Models** စာရင်းမှာ exact model id ကို စစ်ဆေးပြီး "TTS Model List" box ထဲသို့ တစ်ကြောင်းချင်း ထပ်ထည့်နိုင်ပါတယ် — list ထဲမှာ ဘယ်နှစ်ခုပဲရှိရှိ auto rotation က အလုပ်လုပ်ပါလိမ့်မယ်။

## Glossary (Global Memory)
"Global Memory / Glossary" panel ထဲမှာ စကားလုံး → အစားထိုးစာလုံး/အသံထွက် pair များ ထည့်ထားနိုင်ပြီး၊ Synthesize မလုပ်ခင် စာသားတစ်ခုလုံးအပေါ် global find-replace အဖြစ် auto apply လုပ်ပေးပါမည်။

## သတိပြုရန်
- Key များကို client-side JS ကနေတိုက်ရိုက် Google API ကို ခေါ်သုံးခြင်းဖြစ်လို့ browser DevTools ကနေ key ကိုမြင်နိုင်ပါတယ် — public repo/site မှာ share မလုပ်ပါနဲ့၊ ကိုယ်ပိုင်သုံးရုံအတွက်သာ အသုံးပြုပါ။
- Google Gemini API ရဲ့ pricing/rate limit/model availability က model အလိုက်၊ account tier အလိုက် ကွဲနိုင်လို့ https://ai.google.dev/pricing နဲ့ https://aistudio.google.com မှာ ကိုယ်ပိုင် key access ကို အမြဲစစ်ဆေးပါ။
