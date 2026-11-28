NARA FREE VOICE (Burmese) — AI Recap ထဲမှာ ထည့်သုံးပုံ
=====================================================

ဒီ voice တွေက သုံးသူရဲ့ ကိုယ်ပိုင်ဖုန်း browser ထဲမှာပဲ အသံထုတ်တာမို့ server ကုန်ကျစရိတ် မရှိပါဘူး။
Model ဖိုင်တွေကို သုံးသူတွေက Hugging Face ကနေ တိုက်ရိုက် ဒေါင်းပါတယ် (သင့် Vercel မှာ မထားရ)။

၁။ SagaPyaw engine ဖိုင်တွေ ယူပါ (public, Apache-2.0)
   https://github.com/min8244m-cloud/SagaPyaw  →  Code → Download ZIP
   ZIP ထဲကနေ အောက်ပါအတိုင်း copy ကူးပါ:

     SagaPyaw/dist/sagapyaw.mjs      →  website/nara/sagapyaw.mjs
     SagaPyaw/web/vendor/  (folder တစ်ခုလုံး)  →  website/nara/vendor/
     SagaPyaw/LICENSE, NOTICE        →  website/nara/LICENSE, website/nara/NOTICE   (ထည့်ထားပေးပါ)

   (ort.wasm.bundle.min.mjs ဟာ nara/vendor/ ထဲမှာ ရှိရပါမယ်)

၂။ ဒီဖိုင် ၄ ခုကို website ထဲ အစားထိုးပါ (nara.js က အသစ်)
     index.html, nara.js, recap-studio.js, redesign.css

   Website folder ပုံစံ:
     index.html  nara.js  recap-studio.js  redesign.css  script.js ...
     nara/
       sagapyaw.mjs
       vendor/...
       LICENSE  NOTICE

၃။ Vercel ပေါ် ပြန်တင်ပါ။ ပြီးရင် ဖုန်း browser မှာ စာမျက်နှာကို hard refresh လုပ်ပါ။

၄။ AI Recap → Step 4 Voice Over → "Nara voice" ကို ရွေးပါ (Shoon / Thazin / Ko Banyar / Htet Myat)
   → "Voice ဒေါင်းလုဒ်" (~181 MB၊ Wi-Fi နဲ့ တစ်ခါပဲ) → "အသံထုတ်မည်"

စမ်းတဲ့အခါ Chrome ကို သုံးပါ။ ပြဿနာတက်ရင် Step 4 အောက်က log မှာ ✗ နဲ့ စာတန်းပေါ်မယ်၊ အဲဒါကို ကျွန်တော့်ဆီ ပို့ပါ။

အသိပေးချက်
 - အင်္ဂလိပ်စာလုံးတွေ အသံမထွက်ပါ (ဂဏန်းတွေ မြန်မာလို ဖတ်ပေးတယ်)။
 - ဖုန်းမှာ အသံထုတ်တာ နှေးနိုင်တယ် (အသံအရှည်ထက် ၂ ဆလောက်)။ Log မှာ "ကျန်ခန့် X မိနစ်" ပြပေးတယ်။
 - Speed ကို တိုးရင် အသံ အနည်းငယ် ပါးလာနိုင်တယ်။ Pitch slider က Nara မှာ အလုပ်မလုပ်ပါ။
 - Hugging Face ကနေ ဒေါင်းမရရင် (CORS error) ကျွန်တော့်ကို ပြောပါ၊ ကိုယ်ပိုင် mirror သုံးတဲ့ ပုံစံ ထပ်ရေးပေးမယ်။
 - Model credit: Nara Mini v1 © Nara Audio (Apache-2.0), browser port: SagaPyaw (Apache-2.0)
