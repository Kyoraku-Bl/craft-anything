# معمارية Kyoraku Replay (تقني)

> كود أصلي، JavaScript عادي، صفر تبعيات. الهدف: محاكاة **أمينة** (ما كنخترعوش شموع، ما كنخبّيوش خسارة) وسهلة النشر.

---

## 1. خريطة الملفات

```
index.html                  هيكل DOM + تحميل تسلسلي للسكربتات (file://-safe)
css/style.css               واجهة داكنة، RTL/LTR
js/util.js                  clamp/round/escape/fmt/download/isNum + RNG مولّر 32-bit
js/data.js                  SYMBOLS، baseCache، aggregate، effectiveTf، parseCsv
js/indicators.js            SMA, EMA, Bollinger, VWAP, RSI
js/analytics.js             compute(), monteCarlo(), equity/drawdown/hour/weekday
js/engine.js                الحالة + ساعة الإعادة + محرك التنفيذ + التخزين
data/catalog.js             فهرس صغير بـ 10 أسواق حقيقية (مولّد)
data/<ID>.js                OHLCV حقيقي MIT، يُحمّل عند الطلب كـ <script>
js/marketdata.js            فهرس الأصول، loadBundled(), loadLive(), normalizeYahoo()
js/chart.js                 CandleChart + رسم الإحصاءات على Canvas
js/i18n.js                  قاموس ar/en + apply(document)
js/app.js                   ربط DOM، rendering، أحداث المستخدم
api/ohlcv.js                Vercel serverless relay اختياري (Yahoo chart API)
scripts/build-real-data.py  إعادة توليد data/ من مصادر MIT
tests/run.mjs               20 اختبار Node (vm)
tests/api.mjs               5 اختبارات لـ api/ohlcv.js (upstream موكّى)
tests/browser-smoke.mjs     smoke اختياري (jsdom) على الواجهة فوق HTTP
serve.mjs                   سيرفر ستاتيكي صفري التبعيات (0.0.0.0:4173)
vercel.json                 إعداد النشر + headers
```

كل سكربت كيعرّف `globalThis.RL.<module>`; الترتيب فـ `index.html` مهم لأننا ما كنستعملوش bundler ولا `import` (باش يخدم `file://`).

---

## 2. طبقة البيانات

### `baseCache`
خريطة `symbolId → bars[]`، كل bar = `{ t, o, h, l, c, v }` و `t` بـ milliseconds UTC.

- **تجريبي**: `generateSeries(symbol, n)` مولّد حتمي (mulberry32 + معامل ترند/موجة) بذرة ثابتة لكل رمز، مع تخطي نهاية الأسبوع.
- **حقيقي مدمج**: `data/<ID>.js` كيحط `RL.dataFiles[ID] = { meta, csv }`. `RL.marketdata.loadBundled(id)` كيحقن `<script src="data/ID.js">` (يخدم مع `file://` بلا CORS)، كيقرا الـ CSV بـ `parseCsv`، وكيسمّي `registerCustom(sym, bars)`.
- **حي اختياري**: `loadLive(id, interval, range)` → `/api/ohlcv?...` → CORS relay عام → خطأ واضح. كيسجّل الأصل بنفس الـ id، فالبيانات المدمجة كتتبدّل فالذاكرة للجلسة فقط.
- **CSV ديالك**: `engine.addCustomDataset(text, fields)` → `parseCsv` → `registerCustom`.

### `parseCsv`
متسامح: header ولا مواقع، فاصل `,` / `;` / TAB، تواريخ `YYYY-MM-DD HH:mm` / `YYYY.MM.DD` / ISO / epoch ثواني-مللي، أسعار بفاصلة عشرية، صفوف خايبة كتخطّى. كيرجّع `{ bars, skipped }` وكيرفض أقل من 3 صفوف صحيحة. كيتأكد `h ≥ max(o,c)` و `l ≤ min(o,c)`.

### الأُطر الزمنية
```
aggregate(bars, ms):  bucket = floor(t / ms) * ms
                      o = أول o، c = آخر c، h = max، l = min، v = sum
```
`effectiveTf(sym, tf)` = لو `TF_MS[tf] < TF_MS[sym.baseTf]` → `sym.baseTf`، وإلا `tf`.
`allowedTimeframes(sym)` = الأُطر اللي `≥ baseTf`.
**القاعدة**: عمرنا ما كنقسّمو شمعة 15m لثلاثة 1m. الواجهة كتخبي الأُطر المستحيلة، والمحرك كيعيد توجيه الطلب.

### `data/catalog.js` + `manifest.json`
مولّدين من `scripts/build-real-data.py`. فيه `id, label, name, market, tf, pip, contract, decimals, source, license, repo, bars, first, last`. الواجهة كتبني `<optgroup>` منّو بلا ما تحمّل 2.86 MB فالبداية.

---

## 3. طبقة الإعادة (`engine.js`)

### الحالة `state` (SCHEMA = 2)
```
{
  schema, ui: { lang, indicators, speed, htf, volume, sessionFilter },
  settings: { riskPct, spreadPips, commissionPerLot, slPips, rr,
              autoBE, beR, startIndex,
              trailEnabled, trailStartR, trailDistPips,
              autoPartial, partialAtR, partialPct },
  session: { id, symbol, tf, htf, initialBalance, replayTime,
             balance, trades[], maxDrawdownPct, violations[], propStatus, nextId },
  archive: [ { id, label, session, savedAt } ],
  customDatasets: [ { symbol, bars } ],
  prop: { enabled, targetPct, dailyPct, totalPct, minDays }
}
```
- `storage.load()` كيجرّب `kyoraku-replay:state:v2`، وإلا `replay-lab:state:v1` (ترحيل قديم ديالنا)، وإلا `defaultState()`.
- `sanitize()` كيعيد بناء **كل** حقل بـ `num/str/bool` وحدود دنيا/قصوى: state فاسد ولا حقنة JSON ما كيوقّعوش التطبيق.
- `persist()` عبر `engine.onChange` → `localStorage`.

### الساعة
`replayTime` → `indexAtOrBefore(bars, replayTime)` → `visibleBars()` = `bars.slice(0, idx+1)`، ديما آخر شمعة هي الحالية. `advanceTo(t)` كيمشي على كل شمعة بيناتهم وكيسمّي `processBar` (ماشي قفزة، باش ما يضيع حتى حدث). `rewindTo(t)` كيمسح الصفقات اللي دخلو/خرجو بعد `t`، كيعيد الحجم ديال الحصص الجزئية، وكيعيد بناء الـ BE/trailing من الشموع (`rebuildProtection`).

### `processBar(bar)` — الترتيب مهم
1. gap عبر الوقف → إغلاق على `open`
2. لمس الوقف داخل الشمعة → إغلاق على `sl` *(قبل الهدف = متحفّظ)*
3. إغلاق جزئي أوتوماتيكي عند `partialAtR × R`
4. لمس الهدف → إغلاق على `tp` (أو `open` عند فجوة)
5. `updateProtection(tr, bar)`: break-even ثم trailing

`updateProtection` كيحسب `favourable` من `bar.h/bar.l`، كيحدّث `extreme`، كيفعّل الـ trailing غير من بعد `trailStartR × riskDist`، وكيدير:
```
newSL = buy ? extreme − trailDistPips*pip : extreme + trailDistPips*pip
if (beApplied) newSL = buy ? max(newSL, entry) : min(newSL, entry)
if (buy ? newSL > sl : newSL < sl) sl = newSL
```
يعني **monotone فاتجاه الربح**.

### الإغلاق الجزئي
`partialCloseAt(tr, fraction, exit, time, reason, silent)`:
- `closedSize = size × fraction`، `remaining = size − closedSize` (كيرفض إلا بقى < 0.0001)،
- كيبني `child = { ...tr, id: tr.id+'-P'+n, parentId, isPartial: true, status:'closed', size: closedSize, pnl, r, ... }`,
- الأصل كيحدّث `size / commission / riskAmount` بـ `commissionRate` و `riskPerLot`،
- `riskPerLot = |entry−sl| × contract + commissionRate` ⇒ الـ R ديال كل حصة صحيح،
- `recompute()` كيجي من `analytics.closedTrades()` ⇒ الـ balance صحيح،
- `rewindTo` كيدمج الأطفال، `deleteTrade` كيعيد الحجم للأب ولا كيمسح الأطفال معاه.

`closeAt()` كيستعمل `riskAmount = riskPerLot × size` قبل حساب `r`.

### الرسم
`CandleChart` على Canvas، devicePixelRatio، pan/zoom، مؤشرات كـ overlays، SL/TP/صفقات، علامة `KYORAKU REPLAY · المستقبل مخفي`. رسم الإحصاءات فـ `analytics.js` helpers على نفس الـ canvas utils.

---

## 4. الشبكة (الاستثناء الوحيد)

| المسار | منين | وقتو |
|---|---|---|
| `data/<ID>.js` | نفس الموقع، `<script>` | عند اختيار سوق حقيقي (طلب ملف، ماشي API) |
| `/api/ohlcv?symbol=…&interval=…&range=…` | Vercel function → Yahoo chart API | **غير** إلى ضغط المستخدم «حمّل مباشر» |
| `https://api.allorigins.win/raw?url=…` | CORS relay عام | fallback إلى ما كاينش `/api/ohlcv` |

`api/ohlcv.js`:
- whitelist صارمة ديال الرموز + `INTERVALS` + `RANGES` (ضد SSRF/إساءة الاستعمال)،
- `AbortController` بـ 9s، `User-Agent`، لا مفاتيح، لا تخزين،
- كيرجّع `{ symbol, interval, range, source, bars[] }` بـ `Cache-Control: s-maxage=60`,
- `normalizeYahoo()` كيقبل الشكل المضغوط والشكل الخام ديال Yahoo.

**ما كاين حتى `fetch` فمسار الإقلاع.** `grep -R "fetch(" js/` كيوري غير `js/marketdata.js` داخل `loadLive`.

---

## 5. الأمان والصلابة

- كل نص داخل HTML كيدوز من `U.escapeHtml` (ملاحظات، وسوم، أسماء أصول).
- CSV/JSON مستورد كيتـ sanitize؛ `parseTime` ما كينفّذش كود؛ `parseFloat` بحدود.
- `serve.mjs` كيرفض أي مسار برّه الـ root (`path.resolve` + prefix check).
- `vercel.json`: `X-Content-Type-Options`, `Referrer-Policy`، cache لـ `data/`.
- لا كوكيز، لا تتبّع، لا `eval`، لا `innerHTML` بنص المستخدم بلا escape، لا مفاتيح/أسرار فالكود.

---

## 6. نقاط التوسيع النظيفة

| بغيتي | فين |
|---|---|
| مزوّد بيانات مرخّص ديالك | بدّل `api/ohlcv.js` فقط؛ خلّي شكل `{ bars: [...] }` |
| أصل جديد مدمج | زيدو فـ `ASSETS` فـ `scripts/build-real-data.py` و `npm run data` |
| مؤشر جديد | `js/indicators.js` + checkbox فـ `index.html` + `indMap` فـ `app.js` |
| قاعدة SL/TP جديدة | `processBar` / `updateProtection` فـ `engine.js` |
| لغة ثالثة | `js/i18n.js` (`AR`/`EN` + `T.set`) |
| مزامنة سحابية اختيارية | `storage.save/load` فـ `engine.js` (افتراضياً محلي) |

---

## 7. الفحص

```
npm run check    node --check لكل ملف + serve.mjs + api/ohlcv.js
npm test         25 اختبار (20 + 5 api): حتمية البيانات، OHLC، aggregation، CSV،
                 indicators، replay، sizing، SL/TP، rewind، stats، MC،
                 prop، sanitize، i18n، datasets MIT، effectiveTf،
                 normalizeYahoo، trailing، partial، auto-partial،
                 storage migration، brand strings
jsdom smoke     الواجهة كاملة: تبويبات، صفقات، إغلاق جزئي، CSV، لغة، تخزين
```
