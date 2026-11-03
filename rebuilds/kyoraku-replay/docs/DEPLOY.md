# نشر Kyoraku Replay — خطوة بخطوة

> الهدف: رابط مباشر تبعثو للناس. التطبيق **ستاتيكي** (HTML/CSS/JS) + function اختيارية `api/ohlcv.js`.
> ما كاينش build، ما كاينش `npm install`، ما كاينش متغيّرات بيئة، ما كاينش قاعدة بيانات.

---

## ✅ الطريقة A — الرابط الجاهز (أسهل)

### 🔗 https://kyoraku-replay.vercel.app

| | |
|---|---|
| Production alias | `kyoraku-replay.vercel.app` |
| النسخة الاحتياطية | `kyoraku-replay-kyoraku-bl.vercel.app` |
| Deployment ID | `dpl_7qyvJ2yxTAViEnRzLfW81tyYn4z6` |
| Project ID | `prj_UouHRd1XlFwFfyBmf0c5fEgxgLbm` |
| الحالة | `READY · PROMOTED` |
| Git | `Kyoraku-Bl/craft-anything` @ `arena/d032cbca-craft-anything` |
| Root Directory | `rebuilds/kyoraku-replay` |
| الداشبورد | <https://vercel.com/kyoraku-bl/kyoraku-replay> |

افتحو فالمتصفح وابعثو للناس مباشرة: بيانات `NQ` حقيقية كتحمّل أوتوماتيكيا، بلا تسجيل، بلا درهم. إلى بغيتي تعاود تنشر من بعد تعديل، إمّا `git push` على نفس الفرع + Redeploy من الداشبورد، وإمّا الطريقة C.

---

## الطريقة B — Vercel من Dashboard (مستحسن للبيع، تحديث أوتوماتيكي)

1. دخل لـ <https://vercel.com/new> وسجّل الدخول بنفس الحساب (`kyoraku-bl`).
2. **Import Git Repository** → اختار `Kyoraku-Bl/craft-anything` → *Import*.
   - إلى ما بانش، اضغط *Adjust GitHub App Permissions* وخلّي الوصول للrepo.
3. فشاشة **Configure Project**:
   | الحقل | القيمة |
   |---|---|
   | Project Name | `kyoraku-replay` |
   | **Root Directory** | `rebuilds/kyoraku-replay` ← **أهم حقل** |
   | Framework Preset | `Other` |
   | Build Command | اتركوه فارغ (أو `echo 'static ready'`) |
   | Output Directory | `.` |
   | Install Command | اتركوه فارغ (صفر تبعيات) |
   | Node.js Version | 20.x أو 22.x |
   - `Source Files Outside Root Directory`: **خلّيه مفعّل** إلى طلبوه (بعض إعدادات الـ monorepo).
4. **Deploy** → استنّى ~30 ثانية → كيعطيك `https://kyoraku-replay.vercel.app` (أو `…-kyoraku-bl.vercel.app`).
5. باش تربط دومين ديالك: Project → **Settings → Domains** → أضف الدومين → اتبع تعليمات DNS (A / CNAME).
6. كل `git push` على الفرع كيعاود ينشر أوتوماتيكيا.

> `vercel.json` كيتكبّل بـ `api/ohlcv.js` كـ serverless function وبالـ headers. إلا نشرتي على **static host** آخر (Netlify / GitHub Pages / Cloudflare Pages)، الـ function ما كتكونش: التطبيق كيخدم بالكامل بالبيانات المدمجة، و «حمّل مباشر» كيجرب الـ CORS relay العام. شوف «استكشاف الأخطاء».

---

## الطريقة C — Vercel CLI (من الطرفية ديالك)

```bash
cd rebuilds/kyoraku-replay
npx vercel login                 # مرة واحدة
npx vercel                      # معاينة (preview)
npx vercel --prod                # إنتاج → كيعطيك الرابط
```
الـ CLI كيقرا `vercel.json` و`package.json` و`api/`. ما ديرش `npm install` (ما كاين حتى `dependencies`).
إلى بغيتي تبع ملفات معيّنة بلا Git: `npx vercel --prod ./` من داخل المجلد.

---

## الطريقة D — أي استضافة ستاتيكية (بلا Vercel)

| المنصة | الخطوة |
|---|---|
| Netlify | *Add new site → Deploy manually* → اسحب مجلد `rebuilds/kyoraku-replay` |
| Cloudflare Pages | *Create project → Direct Upload* → ارفع المجلد |
| GitHub Pages | Settings → Pages → Deploy from branch → `/rebuilds/kyoraku-replay` (أو انسخ المحتوى لـ `docs/`) |
| أي سيرفر | `python3 -m http.server 4173 --bind 0.0.0.0 --directory rebuilds/kyoraku-replay` |
| بلا سيرفر نهائياً | اضغط مرتين على `index.html` (`file://`) |

⚠️ في هاد الحالات `/api/ohlcv` ما كاينش ⇒ «حمّل مباشر» كيستعمل `api.allorigins.win`، وإلا فشل كيوري رسالة واضحة. **البيانات الحقيقية المدمجة و CSV كيبقاو يخدمو 100%.**

---

## الطريقة E — سيرفر محلي للفحص قبل النشر

```bash
cd rebuilds/kyoraku-replay
npm run check && npm test && npm run serve
# افتح http://0.0.0.0:4173
```

---

## Checklist بعد النشر (ديرو فالمتصفح، 2 دقائق)

- [ ] العنوان كيوري **KYORAKU REPLAY** و `100% مجاني`.
- [ ] الـ badge جنب الشارت كيوري `REAL · MIT · 1m` (بيانات `NQ` تحمّلات).
- [ ] بدّل لـ `NAS100USD` ثم `SPX500`: كيبدّل والـ badge كيبقى `REAL`.
- [ ] قائمة الأُطر الزمنية كتبدّل مع `baseTf` (مثلاً `SPX500` ما كيوريش `1m`).
- [ ] فعّل **Trailing Stop** و **إغلاق جزئي أوتوماتيكي** → افتح صفقة → ▶ تشغيل → شوف `↗ TRAIL ACTIVE` و سطر `جزئي` فالدفتر.
- [ ] زر **English** كيبدّل اللغة والـ RTL.
- [ ] `F5` → الجلسة والصفقات كيبقاو (`localStorage`).
- [ ] tab «البيانات» → «حمّل مباشر»: إمّا `LIVE · …` ✅ وإمّا رسالة خطأ واضحة بلا ما يطيح التطبيق.
- [ ] جرّب على التليفون (تصميم متجاوب).

---

## استكشاف الأخطاء

| العرض | السبب | الحل |
|---|---|---|
| صفقة بيضا / `RL is not defined` | ترتيب السكربتات، ولا نشر من غير `index.html` | تأكد أن **Root Directory** = `rebuilds/kyoraku-replay` وأن `js/` و `data/` اترفعو |
| `data/NQ.js` → 404 | Root Directory غالط | صحّحو فـ Vercel → Settings → General → Root Directory، ثم Redeploy |
| «حمّل مباشر» كيفشل | Yahoo رجّع 429/401، أو الـ function ما ت-buildاتش، أو المنطقة محجوبة | عادي: استعمل البيانات المدمجة أو CSV. راجع Runtime Logs فـ Vercel |
| `LIVE` ما كيظهرش فـ GitHub Pages | ما كاينش serverless | متوقّع؛ شوف الطريقة D |
| `QuotaExceededError` | CSV ضخم فـ `localStorage` | قسّم الأرشيف، أو صدّر JSON، أو استعمل «حمّل مباشر» |
| الرصيد/الصفقات ما كيبقاوش بعد `F5` | Private browsing ولا مسح بيانات الموقع | افتح فتبويب عادي، واستعمل «تصدير JSON» |

---

## قبل ما تبيعو لجمهور

1. [`../TERMS.md`](../TERMS.md) و [`../PRIVACY.md`](../PRIVACY.md): حطّهم كصفحات فموقعك وربطهم فالتذييل.
2. [`../ATTRIBUTION.md`](../ATTRIBUTION.md): خلّي إشعار MIT ديال بيانات GetData Finance فالتوزيع.
3. [`DATA.md`](DATA.md) §2: قرّر واش كتخلي الـ live relay (بيانات Yahoo فوقت التشغيل) ولا كتبدّلو بفيد مرخّص باسمك.
4. `npm run verify` خضر، والـ checklist فوق كلّو ✅.

> ملاحظة: `package.json` فيه `"private": true` و `MIT OR Apache-2.0`. `private` كيمنع نشر غلط على npm، ما كيمنعش بيع المنتج ولا نشر الموقع.
