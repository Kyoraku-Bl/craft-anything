# `rebuilds/` — مشاريع معادة البناء (clean-room)

> هاد المجلد كيحتوي على نسخ **أصلية** مكتوبة من الصفر، ماشي نسخ لمنتجات ولا كود ولا أصول ديال شركة أخرى.

| المشروع | الحالة | الدخول |
|---|---|---|
| **[Kyoraku Replay](kyoraku-replay/README.md)** | ✅ جاهز (v2.0) | [`kyoraku-replay/index.html`](kyoraku-replay/index.html) |

## Kyoraku Replay

منصة إعادة تاريخية وتداول تجريبي **100% مجانية**: بيانات حقيقية مدمجة (NQ futures، NAS100USD، مؤشرات، فوركس، ذهب، نفط — MIT)، وقف متحرك، إغلاق جزئي، دفتر وتحليلات، عربي/إنجليزي، `localStorage`، صفر تبعيات، بلا حساب ولا خطة مدفوعة.

- 📖 [README / التشغيل](kyoraku-replay/README.md)
- 🧠 [كيفاش خدام (دارچة)](kyoraku-replay/docs/HOW-IT-WORKS.md)
- 🏗️ [المعمارية](kyoraku-replay/docs/ARCHITECTURE.md)
- 📊 [البيانات والتراخيص](kyoraku-replay/docs/DATA.md)
- 🚀 [النشر / Vercel](kyoraku-replay/docs/DEPLOY.md)
- ⚖️ [الشروط](kyoraku-replay/TERMS.md) · [الخصوصية](kyoraku-replay/PRIVACY.md) · [الإسناد](kyoraku-replay/ATTRIBUTION.md)

```bash
cd rebuilds/kyoraku-replay
npm run verify && npm run serve
```

> ملاحظة: هاد المشروع **مستقل** عن كود Rust ديال الـ workspace، وما داخلش فـ Cargo/xtask. الملفات كلها ستاتيكية.
