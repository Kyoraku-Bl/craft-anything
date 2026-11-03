# Kyoraku Replay

**إعادة تاريخية للسوق + تداول تجريبي + دفتر وتحليلات — ببيانات حقيقية، مجانية 100%.**

> بلا حساب · بلا خطة مدفوعة · بلا API مدفوع · بلا تتبّع · كيخدم أوفلاين من بعد ما كيتحمّل.

🌐 **الرابط المباشر (جاهز دلوقتي): https://kyoraku-replay.vercel.app** — افتحو وبعثو للناس مباشرة.

Kyoraku Replay أداة أصلية مكتوبة من الصفر بـ JavaScript عادي (بدون أي مكتبة)، كتخليك تعاود شمعة بشمعة على **بيانات سوق حقيقية**، وتفتح صفقات تجريبية بوقف/هدف، وتشوف النتائج فالدفتر والتحليلات ومونت كارلو. كلشي كيتمّ فالمتصفح ديالك و `localStorage`.

---

## أشنو الجديد فالنسخة 2.0

| الطلب | الحل فـ Kyoraku Replay |
|---|---|
| **`Kyoraku Replay`** | الاسم كاين فالعنوان، الشارت، الواجهة، الملفات، الترخيص والدوكس |
| **بيانات حقيقية: NQ futures، NAS100USD، المؤشرات...** | 10 أسواق OHLCV حقيقية **مدمجة** بترخيص MIT + تحديث مباشر اختياري + استيراد CSV |
| **Trailing Stop** | وقف متحرك كيبدأ بعد `N × R` وكيتبع القمة/القاع بمسافة بالبيب، عمري ما كيرجع للور |
| **إغلاق جزئي** | أزرار 25% / 50% / 75% + إغلاق جزئي أوتوماتيكي عند `N × R`؛ كل حصة كتولّي سطر مستقل فالدفتر بـ R ديالها، والرجوع للور كيعيد الحجم |
| **نسخة جاهزة للبيع** | ترخيص، شروط، خصوصية، إسناد البيانات، دليل نشر، فحص آلي (20 test + smoke)، وconfig ديال Vercel |

---

## الأسواق الحقيقية المدمجة (أوفلاين، بلا حتى طلب على الإنترنت)

| الرمز | السوق | الدقة الأصلية | عدد الشموع | المصدر |
|---|---|---|---|---|
| `NQ` | ناسداك 100 E-mini **فيوتشرز** (CME) | 1m | 6,000 | GetData Finance · MIT |
| `NAS100USD` | ناسداك 100 سبوت / CFD | 5m | 6,000 | GetData Finance · MIT |
| `US30` | داو جونز | 5m | 6,000 | GetData Finance · MIT |
| `SPX500` | S&P 500 | 15m | 6,000 | GetData Finance · MIT |
| `GER30` | داكس الألماني | 5m | 6,000 | GetData Finance · MIT |
| `JPN225` | نيكاي 225 | 15m | 6,000 | GetData Finance · MIT |
| `EURUSD` | يورو / دولار | 15m | 6,000 | GetData Finance · MIT |
| `USDJPY` | دولار / ين | 30m | 6,000 | GetData Finance · MIT |
| `XAUUSD` | الذهب / دولار | 15m | 6,000 | GetData Finance · MIT |
| `USOIL` | نفط WTI | 30m | 5,995 | GetData Finance · MIT |

الإسناد الكامل ونص الترخيص: [`ATTRIBUTION.md`](ATTRIBUTION.md) و [`data/README.md`](data/README.md).
تفاصيل أكثر، التحديث المباشر وصيغ CSV: [`docs/DATA.md`](docs/DATA.md).

**تحديث مباشر اختياري**: tab «البيانات» → اختار الأصل/الإطار/المدة → «حمّل مباشر». كيمرّ من `/api/ohlcv` (Vercel serverless) ولا من CORS relay عام، بلا مفتاح API. حتى شي بيانات من Yahoo ما كتخزّنش ولا كتوزّع فالمشروع — كتجي فوقت التشغيل فقط. للاستعمال التجاري الواسع، ركّب فيد مرخّص ديالك (شوف [`docs/DATA.md`](docs/DATA.md)).

---

## التشغيل (3 طرق، حتى وحدة فيهم ما كاتكلّف درهم)

### 1) أسهل طريقة — بلا سيرفر
اضغط مرتين على `index.html` (افتحو بـ Chrome / Firefox / Edge). البيانات الحقيقية كتقرا من `data/*.js` كـ `<script>`، داكشي علاش كيخدم حتى مع `file://`.

### 2) سيرفر محلي
```bash
cd rebuilds/kyoraku-replay
npm run serve                 # http://0.0.0.0:4173
# ولا: python3 -m http.server 4173 --bind 0.0.0.0
```

### 3) Vercel (رابط مباشر للناس)
**منشور أصلاً**: <https://kyoraku-replay.vercel.app> (project `kyoraku-replay`، root `rebuilds/kyoraku-replay`، من الفرع `arena/d032cbca-craft-anything`).
شوف [`docs/DEPLOY.md`](docs/DEPLOY.md) — خطوات إعادة النشر، CLI، ربط دومين، والـ `rootDirectory`.

---

## الميزات

- **إعادة تاريخية**: تشغيل/توقيف، سرعة 0.5x → 50x، شمعة بشمعة، رجوع 20 شمعة، Go-To لتاريخ معيّن، **المستقبل مخفي** ديما.
- **الشارت**: Canvas أصلي (بدون مكتبة رسم)، شموع + حجم + SMA/EMA/Bollinger/VWAP/RSI، إطار أعلى (HTF)، تكبير بالعجلة وتنقل بالسحب، SL/TP/صفقات مرسومين على الشارت.
- **محرك الصفقات**: شراء/بيع، حجم محسوب من نسبة المخاطرة، سبريد وعمولة، SL/TP، Break-even أوتوماتيكي، **وقف متحرك**، **إغلاق جزئي**، تعديل SL/TP والصفقة مفتوحة.
- **الدفتر والتحليلات**: P&L، Win rate، R، Profit factor، Expectancy، أقصى سحب، منحنى رأس المال، توزيع R، ربح حسب الساعة/اليوم، تقويم، وسوم وملاحظات، تصفية، تصدير CSV/JSON/PNG، جلسات مؤرشفة.
- **مونت كارلو** + **محاكاة شروط شركة التمويل** (هدف، خسارة يومية، سحب كلي، أقل أيام).
- **بياناتك ديالك**: استيراد CSV متسامح (header ولا مواقع، تواريخ ولا epoch)، نسخ احتياطي JSON.
- **عربي / إنجليزي**، RTL/LTR، تصميم داكن متجاوب.
- **صفر تبعيات**: `dependencies: {}`. لا مكتبة رسم ولا واجهة خارجية، لا قاعدة بيانات، لا Auth، لا بوابة دفع.

---

## الفحص الآلي

```bash
npm run check    # syntax check لكل ملفات JS + serve.mjs + api/ohlcv.js
npm test         # 20 test: بيانات، OHLCV، محرك، trailing، partial، rewind، إحصاء، i18n، ترحيل state
npm run verify   # الاتنين
```

إضافة: jsdom smoke على الواجهة الحقيقية (تبويبات، فتح صفقات، إغلاق جزئي، CSV، تبديل اللغة، تخزين) → 0 runtime errors.

---

## حدود معروفة (ماشي عيوب، غير طبيعة المحاكاة)

- البيانات المدمجة **عيّنات تقييم** (آخر 6,000 شمعة)، ماشي أرشيف كامل؛ جيب أرشيفك بـ CSV.
- البيانات الحقيقية كتستعمل إطارها الأصلي: إلا كان الأصل 15m ما كنخترعوش 1m، كنبدّاو من 15m (مبيّن فالواجهة).
- التنفيذ فوري بالسبريد/العمولة؛ ما كاينش order book، نيوز، swap، slippage حقيقي ولا تداول حقيقي.
- التحديث المباشر كيعتمد علىendpoint عام؛ إلى كان محجوب، البيانات المدمجة والـ CSV كيبقاو يخدمو.
- `localStorage` محلي على الجهاز/المتصفح؛ ما كاينش مزامنة بين الأجهزة.

---

## حقوق، خصوصية ومسؤولية

| الملف | المحتوى |
|---|---|
| [`TERMS.md`](TERMS.md) | شروط الاستعمال/البيع، الترخيص، حدود المسؤولية، عدم نصيحة مالية |
| [`PRIVACY.md`](PRIVACY.md) | شنو كيتخزّن (ولّا ما كيتخزّنش)، الطلبات الشبكية الاختيارية |
| [`ATTRIBUTION.md`](ATTRIBUTION.md) | إسناد بيانات MIT + نص الترخيص |
| [`LICENSE-MIT`](LICENSE-MIT) / [`LICENSE-APACHE`](LICENSE-APACHE) | ترخيص الكود `MIT OR Apache-2.0` |

> **أداة تعليمية/محاكاة**: ماشي وسيط، ما كتنفّذش أوامر حقيقية، ما كتحتفظش بفلوس، وماشي نصيحة مالية. بيانات Yahoo خاضعة لشروطهم؛ للبيع التجاري الواسع استعمل فيد مرخّص.

---

## بنية الملفات

```
rebuilds/kyoraku-replay/
├── index.html · css/style.css
├── js/          util, data, indicators, analytics, engine, marketdata, chart, i18n, app
├── data/        10 ملفات OHLCV حقيقية + catalog.js + manifest.json + README.md
├── api/ohlcv.js Vercel serverless relay اختياري
├── vercel.json  إعداد النشر
├── scripts/build-real-data.py   إعادة توليد البيانات (MIT)
├── sample-data/EURUSD-sample.csv
├── tests/run.mjs
├── docs/        HOW-IT-WORKS · ARCHITECTURE · DATA · DEPLOY
└── README · ATTRIBUTION · TERMS · PRIVACY · LICENSE-MIT · LICENSE-APACHE
```

الشرح بالدارچة: [`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md) · التقني: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
