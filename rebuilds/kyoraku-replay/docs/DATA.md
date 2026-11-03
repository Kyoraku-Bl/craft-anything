# البيانات فـ Kyoraku Replay

> ثلاث مصادر، واضحين وموسومين فالواجهة: **حقيقي مدمج (MIT)** · **حي اختياري** · **CSV ديالك**.
> كاين حتى **بياصطناعي** موسوم `DEMO` غير للتجريب.

---

## 1. البيانات الحقيقية المدمجة (الأهم)

| الرمز | الاسم | السوق | `baseTf` | pip | contract | decimals | شموع | الفترة (UTC) |
|---|---|---|---|---|---|---|---|---|
| `NQ` | NASDAQ-100 E-mini **Futures** | futures | 1m | 0.25 | 20 | 2 | 6,000 | 2026-08-26 → 2026-09-02 |
| `NAS100USD` | ناسداك 100 سبوت/CFD | index | 5m | 0.1 | 1 | 2 | 6,000 | 2026-08-26 → 2026-09-25 |
| `US30` | داو جونز | index | 5m | 1 | 1 | 2 | 6,000 | 2026-08-26 → 2026-09-25 |
| `SPX500` | S&P 500 | index | 15m | 0.1 | 1 | 2 | 6,000 | 2026-06-26 → 2026-09-25 |
| `GER30` | DAX | index | 5m | 0.1 | 1 | 2 | 6,000 | 2026-08-21 → 2026-09-25 |
| `JPN225` | نيكاي 225 | index | 15m | 1 | 1 | 2 | 6,000 | 2026-06-26 → 2026-09-25 |
| `EURUSD` | يورو/دولار | forex | 15m | 0.0001 | 100000 | 5 | 6,000 | 2026-07-01 → 2026-09-25 |
| `USDJPY` | دولار/ين | forex | 30m | 0.01 | 1000 | 3 | 6,000 | 2026-04-03 → 2026-09-25 |
| `XAUUSD` | ذهب/دولار | metal | 15m | 0.01 | 100 | 2 | 6,000 | 2026-06-26 → 2026-09-25 |
| `USOIL` | WTI | energy | 30m | 0.01 | 1000 | 2 | 5,995 | 2026-03-26 → 2026-09-25 |

الأرقام الدقيقة (عدد الشموع، التواريخ، الحجم) كاينين فـ [`../data/README.md`](../data/README.md) و `data/manifest.json` — مولّدين آلياً، ما مكتوبينش باليد.

### المصدر والترخيص
- المنظمة: [`getdata-finance`](https://github.com/getdata-finance) على GitHub.
- الرخصة: **MIT** — `Copyright (c) 2026 GetData`، كتسمح بالاستعمال والتعديل و**البيع** مع الاحتفاظ بالإشعار.
- كل ملف `data/<ID>.js` كيحتفظ بـ `source`, `repo`, `file`, `license` فـ `meta`.
- النص الكامل + جدول الإسناد: [`../ATTRIBUTION.md`](../ATTRIBUTION.md).
- **عيّنات تقييم** (`evaluation samples`): خرّجنا غير آخر 6,000 شمعة من كل ملف باش يبقى الحجم معقول (2.86 MB المجموع). الأرشيف الكامل ماشي مدمج.

### شنو بدّلنا فالبيانات (ولا ما بدّلناش)
✅ بدّلنا: `datetime` ISO → epoch ثواني UTC · تقليم الأرقام لـ `decimals` · `h = max(o,c,h)`, `l = min(o,c,l)` · تقليم لآخر N شمعة · تحويل لـ `<script>`.
❌ ما بدّلناش: قيم الأسعار، الحجم، الترتيب الزمني.
`npm test` كيتحقّق من `h ≥ max(o,c)` و `l ≤ min(o,c)` و `t` متصاعد وعدد الشموع = manifest لكل واحد من الـ 10.

### إعادة التوليد
```bash
cd rebuilds/kyoraku-replay
python3 scripts/build-real-data.py --max-bars 6000
# Python 3 stdlib فقط، كيحتاج codeload.github.com
# كيعاود يكتب data/*.js + catalog.js + manifest.json + data/README.md + ATTRIBUTION.md
```
إلى شي مصدر ما كانش متاح، السكربت كيتخطّاه وكيبقي الملف القديم (ما كيخسّرش البناء).

### `pip` / `contract`
`pip` = أصغر حركة سعر مستعملة فالإعدادات (الوقف بالبيب = `slPips × pip`). `contract` = قيمة العقد فحساب P&L: `P&L = (exit − entry) × dir × size × contract − commission`.
- `NQ`: pip 0.25 و contract 20 (E-mini، $20 لكل نقطة)، `MNQ` الحي contract 2.
- الفوركس: `EURUSD` pip 0.0001 و contract 100000.
- المؤشرات/السبوت: contract 1 ⇒ P&L بالنقاط × الحجم.
هاد قيم **تقريبية للتعليم**، ماشي مواصفات عقد وسيط بعينو. بدّلها من `data/catalog.js` إلى عندك عقود أدق.

---

## 2. التحديث المباشر (اختياري، بلا مفتاح API)

### كيفاش كيخدم
Tab **البيانات** → «بيانات حقيقية مباشرة» → اختار الأصل / الإطار / المدة → **حمّل مباشر**.

```
المتصفح ──► /api/ohlcv?symbol=NQ=F&interval=5m&range=1mo   (Vercel function)
                         │
                         └──► query1.finance.yahoo.com/v8/finance/chart/NQ=F
                                    │
             ◄── { symbol, interval, range, source, bars:[{t,o,h,l,c,v}] }
```
إلى ما كاينش الـ function (static hosting / `file://`):
```
المتصفح ──► api.allorigins.win/raw?url=<Yahoo URL>  (CORS relay عام)
```
إلى بجوج فشلو: رسالة واضحة + البيانات المدمجة و CSV كيبقاو يخدمو. **حتى طلب ما كيتمّ إلا ضغط المستخدم الزر.**

### الرموز المتاحة للحي
`NQ=F`, `MNQ=F`, `ES=F`, `MES=F`, `YM=F`, `^NDX`, `^GSPC`, `^DJI`, `^VIX`, `^GDAXI`, `^N225`, `EURUSD=X`, `GBPJPY=X`, `USDJPY=X`, `GC=F`, `CL=F`, `BTC-USD`, `ETH-USD` (+ whitelist فـ `api/ohlcv.js`). الأُطر: `1m…1d`، المدى: `5d…2y`.

### ⚠️ حقوق البيانات ديال الـ live — اقرا هادشي قبل البيع
- Yahoo Finance chart endpoint **عام غير موثّق**، بلا CORS، وخاضع لشروط استعمال Yahoo. ما كنخزّنوش ولا كنوزّعوش ولا كنبيعوش بيانات Yahoo: كتجي فذاكرة المتصفح فوقت التشغيل فقط.
- للمنتج التجاري الجاد: **بدّل `api/ohlcv.js` بمزوّد مرخّص باسمك** (وسيط، Polygon/Databento/Refinitiv… حسب العقد ديالك) أو خلّي غير البيانات المدمجة MIT + CSV ديال العميل.
- الـ relay عنده `s-maxage=60` و whitelist صارمة و timeout 9s؛ ما كيقبلش URL حر (ضد SSRF).
- حتى كلمة سر ولا API key ما مطلوبة. شوف [`../TERMS.md`](../TERMS.md).

---

## 3. CSV ديالك (أرشيف كامل، أنسب حل للبيع)

### الصيغ المقبولة
```csv
time,open,high,low,close,volume
2025-01-06 00:00,1.1042,1.1050,1.1038,1.1047,120
2025-01-06 00:01,1.1047,1.1055,1.1044,1.1051,98
```
- **Header** (`time,open,high,low,close,volume`) ولا **مواقع** بلا header.
- فاصل: `,` / `;` / TAB.
- الوقت: `YYYY-MM-DD HH:mm`, `YYYY.MM.DD HH:mm`, ISO مع timezone، epoch **ثواني** (10 أرقام) أو **مللي** (13).
- `volume` اختياري (كيفترض 0 إلى ما كاينش).
- صفوف خايبة/ناقصة كتخطّى، أقل من 3 صفوف صحيحة كيرفض.

Tab «البيانات» → رمز الأصل / حجم البيب / قيمة العقد / الأرقام العشرية → **حمّل ملف CSV**. من بعد كيظهر فـ مجموعة «بياناتك (CSV / مباشر)».

### منين تجيب CSV حقيقي
- MetaTrader 4/5: *Tools → History Center → Export*.
- مزوّدك / وسيطك (أرشيف مرخّص عندك).
- Stooq، Dukascopy Historical Data Feed، Binance للكريپتو... **راجع رخصة كل واحد قبل إعادة التوزيع**.
- عيّنة مولّدة (اصطناعية، للتجربة فقط): `sample-data/EURUSD-sample.csv`.

---

## 4. البيانات التجريبية (موسومة `DEMO`)

`EURUSD`, `GBPJPY`, `XAUUSD`, `BTCUSD`, `US30` مولّدة بذرة ثابتة: حتمية، بلا عطلة نهاية الأسبوع، 20,000 شمعة 1m. **ماشي أسعار سوق**؛ غير باش الواجهة تخدم حتى إلى ما حطّيتي حتى ملف بيانات. الشارت كيوري `DEMO` فـ `source-badge` باش ما يختلطش مع `REAL · MIT`.

---

## 5. التخزين والنسخ الاحتياطي

- كل حالة التطبيق فـ `localStorage`: `kyoraku-replay:state:v2` (مع ترحيل من `replay-lab:state:v1`).
- البيانات المستوردة (CSV) كتخزّن حتى هي فـ `state.customDatasets` — دير **تصدير JSON** قبل ما تمسح بيانات المتصفح.
- الحدّ المعتاد ~5 MB: أرشيف CSV ضخم ممكن يطلّع `QuotaExceededError`. الحل: قسّمو لفترات، ولا استعمل «حمّل مباشر»، ولا زيد `IndexedDB`.
- **تصدير**: CSV ديال الصفقات، JSON ديال كلشي، PNG ديال الشارت. **استيراد**: JSON.

---

## 6. Checklist قبل البيع

- [ ] راجعت [`../ATTRIBUTION.md`](../ATTRIBUTION.md) وخليتي إشعار MIT فالتوزيع.
- [ ] قرّرت: إمّا non-distribute البيانات الحية (كما هو) وإمّا بادلت `api/ohlcv.js` بفيد مرخّص.
- [ ] كتبت فصفحة المنتج أن البيانات المدمجة **عيّنات** والمحاكاة **تعليمية**.
- [ ] [`../TERMS.md`](../TERMS.md) و [`../PRIVACY.md`](../PRIVACY.md) منشورين مع الرابط.
- [ ] `npm run verify` + [`DEPLOY.md`](DEPLOY.md) تخطّاو.
