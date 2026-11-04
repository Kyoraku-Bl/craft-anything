# Kyoraku Replay

**Modern, 100%-free market replay & manual backtesting — real bundled OHLCV data, a full pro workspace, English by default, Arabic one click away.**

> No account · No paid plan · No paid API · No tracking · Works offline after load.

🌐 **Live link: https://kyoraku-replay.vercel.app**

Kyoraku Replay is an original, from-scratch browser app written in plain JavaScript with **zero dependencies**. Replay historical candles bar by bar with the future hidden, place simulated trades with SL/TP/risk sizing, review every trade, and analyse your edge. Everything stays in your browser and `localStorage`.

---

## What's new in 3.0 — design + pro workspace + English

| Request | Implementation |
|---|---|
| **Modern look, dark navy / indigo → cyan** | Original glass-card design system, gradient brand mark and primary controls, subtle glow, green/red candles, four accent colours, responsive layout. No external fonts, images or CSS frameworks. |
| **English language** | The whole UI opens in **English** (`lang="en"`, LTR). A prominent `EN / العربية` switch flips to full Arabic + RTL, and the choice is saved. Every label, help text, chart legend, toast, dialog and new pro string is translated. |
| **All the options / features** | Free, original equivalents of the publicly advertised pro workspace (see below) — no plan gates, no caps, no login. |
| Still free | No paywall, no subscription, no entitlement limits, no mandatory API key or paid data feed. |

### The pro workspace (every item unlocked, locally)

- **Layouts**: 1 / 2 / 3 synchronised charts, higher-timeframe chart, third timeframe selector, MACD · Stochastic · ATR pane.
- **Timeframes**: base-accurate aggregation + **custom timeframes in minutes** (1–1440), registered at runtime and persisted. Never fabricates candles finer than the source.
- **Chart tools**: session shading (Asia / London / New York by UTC hour), EMA 50, Supertrend, ATR bands, MACD, Stochastic; drawing tools — horizontal line, trend line, rectangle/zone, Fibonacci retracement and text notes — saved per symbol + timeframe.
- **Order types**: Market, **Limit** and **Stop** entries. Working orders appear in their own list and fill automatically when replayed price touches the trigger, with bracket SL/TP attached.
- **Journal review**: click any journal row for a review panel with strategy assignment, pre-trade checklist, **chart screenshot capture**, and **jump to this trade** on the chart.
- **Strategies & checklists**: create setups, group trades by strategy, compare net P&L / win rate / average R, filter the journal by strategy, editable checklist templates.
- **Rule-based insights**: deterministic checks on your own trades (best/worst UTC hour, losing streak, overtrading, revenge entries, risk outliers, best/worst tag, sample size). No AI, no network, no guesses.
- **R:R simulator**: replay your closed trades against the loaded bars with a different target R and stop multiplier; stop is checked before target inside each candle. Educational, not a forecast.
- **Local economic calendar**: add your own historical events (manual, JSON or CSV import/export), shown as impact-coloured markers on the chart. No bundled news feed, no external calendar.
- **Shortcuts**: `Space` play/pause, arrows step, `Shift+arrows` 10 bars, `B`/`S` entries, `R` rewind, `C` close all, `1`–`9` tabs, `[`/`]` speed, `L` layout, `?` cheat sheet, `Esc` cancel tool.
- **Backup**: separate pro-data JSON export/import, plus trades CSV, full state JSON and chart PNG.
- **Replay**: step-N bars, speeds 0.5x → **200x**, go-to date, rewind 20 bars, future always hidden.

All of the above is clean-room work. No other product's branding, code, schemas, assets, wording, licensed datasets or paid entitlements are reproduced.

---

## Bundled real market data (offline, MIT)

| Symbol | Market | Base TF | Bars | Source |
|---|---|---|---|---|
| `NQ` | Nasdaq-100 E-mini **futures** (CME) | 1m | 6,000 | GetData Finance · MIT |
| `NAS100USD` | Nasdaq-100 spot / CFD | 5m | 6,000 | GetData Finance · MIT |
| `US30` | Dow Jones | 5m | 6,000 | GetData Finance · MIT |
| `SPX500` | S&P 500 | 15m | 6,000 | GetData Finance · MIT |
| `GER30` | DAX | 5m | 6,000 | GetData Finance · MIT |
| `JPN225` | Nikkei 225 | 15m | 6,000 | GetData Finance · MIT |
| `EURUSD` | Euro / US Dollar | 15m | 6,000 | GetData Finance · MIT |
| `USDJPY` | US Dollar / Yen | 30m | 6,000 | GetData Finance · MIT |
| `XAUUSD` | Gold / US Dollar | 15m | 6,000 | GetData Finance · MIT |
| `USOIL` | WTI crude | 30m | 5,995 | GetData Finance · MIT |

Full attribution and licence text: [`ATTRIBUTION.md`](ATTRIBUTION.md), [`data/README.md`](data/README.md). More detail, optional live refresh and CSV formats: [`docs/DATA.md`](docs/DATA.md).

**Optional live refresh** (Data tab → choose asset / interval / range → Load live) goes through the same-origin `/api/ohlcv` Vercel function or a public CORS relay, with no API key. No Yahoo data is stored or redistributed in this repository — it is runtime-only. For wide commercial distribution use your own licensed feed or disable live refresh.

---

## Run it (three free ways)

### 1) No server
Double-click `index.html` (Chrome / Firefox / Edge). Real data is loaded from `data/*.js` as classic `<script>` files, so `file://` works.

### 2) Local server
```bash
cd rebuilds/kyoraku-replay
npm run serve                 # http://0.0.0.0:4173
# or: python3 -m http.server 4173 --bind 0.0.0.0
```

### 3) Vercel
Deployed at <https://kyoraku-replay.vercel.app> (project `kyoraku-replay`, root `rebuilds/kyoraku-replay`, branch `arena/d032cbca-craft-anything`). See [`docs/DEPLOY.md`](docs/DEPLOY.md) for redeploy steps, CLI, custom domains and `rootDirectory`.

---

## Core feature set (from 2.0, still intact)

- **Replay engine**: play/pause, bar-by-bar, rewind, go-to, hidden future, 100x/200x speeds.
- **Own Canvas renderer**: candles, volume, SMA/EMA/Bollinger/VWAP/RSI, HTF chart, wheel zoom, drag pan, SL/TP/trade markers, watermark.
- **Trade engine**: risk-based sizing, spread/commission, SL/TP, auto break-even, **trailing stop**, **partial close** (25/50/75% + automatic at N×R), editable open positions.
- **Journal & analytics**: P&L, win rate, R, profit factor, expectancy, max drawdown, equity curve, R distribution, hour/weekday performance, calendar, tags, notes, filters, CSV/JSON/PNG export, archived sessions.
- **Monte Carlo** + **prop-firm rule simulator** (profit target, daily loss, total drawdown, minimum days).
- **Your own data**: tolerant CSV import (headers or positional, dates or epochs), JSON backup.
- **Zero dependencies**: `dependencies: {}`. No chart library, no database, no auth, no payment gateway.

---

## Automated verification

```bash
npm run check    # syntax check for every JS file + serve.mjs + api/ohlcv.js
npm test         # 25 engine/data/pro logic tests + 5 mocked api/ohlcv tests
npm run smoke    # optional jsdom UI smoke over HTTP (needs npm i --no-save jsdom@26)
npm run verify   # check + test + smoke
```

The smoke exercises the real UI over HTTP: dynamic `data/NQ.js`, market switching, trailing/partial close, all tabs, **English default**, EN/AR switch, custom TF, triple layout, pro indicators, strategies, insights, R:R, events, working Limit orders, trade review, accent picker, persistence → 0 runtime errors.

---

## Known limits (by design, not defects)

- Bundled datasets are **evaluation samples** (last ~6,000 bars), not full archives; bring your own CSV for longer history.
- Base resolution is respected: a 15m source never invents 1m bars (shown in the UI).
- Execution is simulated with spread/commission; no order book, real slippage, swap, news feed or real trading.
- Live refresh depends on a public endpoint; bundled data and CSV keep working if it is unavailable.
- `localStorage` is per device/browser; there is no cross-device sync.
- No real-browser visual E2E, production load/security/quota audit, or Yahoo ToS / market-data licensing clearance has been performed.

---

## Rights, privacy & responsibility

| File | Contents |
|---|---|
| [`TERMS.md`](TERMS.md) | Terms of use / resale, licence, liability limits, no financial advice |
| [`PRIVACY.md`](PRIVACY.md) | What is stored (and what is not), optional network requests |
| [`ATTRIBUTION.md`](ATTRIBUTION.md) | MIT data attribution + licence text |
| [`LICENSE-MIT`](LICENSE-MIT) / [`LICENSE-APACHE`](LICENSE-APACHE) | Code licence `MIT OR Apache-2.0` |

> **Educational simulator**: not a broker, does not place real orders, holds no funds, and is not financial advice. Yahoo data is subject to its own terms; for wide commercial sale use a licensed feed. `TERMS.md` / `PRIVACY.md` are templates, not legal advice.

---

## File map

```
rebuilds/kyoraku-replay/
├── index.html · css/style.css
├── js/          util, data, indicators, analytics, engine, marketdata,
│                pro-core (pure pro logic), chart, i18n, app, pro (pro UI)
├── data/        10 real OHLCV datasets + catalog.js + manifest.json + README.md
├── api/ohlcv.js optional Vercel serverless relay
├── vercel.json  deployment config
├── scripts/build-real-data.py   regenerate MIT datasets
├── sample-data/EURUSD-sample.csv
├── tests/       run.mjs · api.mjs · browser-smoke.mjs
├── docs/        HOW-IT-WORKS · ARCHITECTURE · DATA · DEPLOY
└── README · ATTRIBUTION · TERMS · PRIVACY · LICENSE-MIT · LICENSE-APACHE
```

---

## ملخص بالدارجة

هاد النسخة 3.0 زادت **design عصري** (بحر غامق + تدرّج بنفسجي/سيان، كارطات زجاجية، شموع خضر/حمر، أربع ألوان accent)، **الإنجليزية كافتح ترحيبي** مع زر `EN / العربية` كيحفظ الاختيار، و**ڭاع الأدوات الاحترافية** بلا حدود ولا خطة مدفوعة: تخطيط 1/2/3 شارتات، أطر زمنية مخصصة، تظليل الجلسات، مؤشرات EMA50/Supertrend/MACD/Stochastic/ATR، أدوات رسم محفوظة، أوامر Limit/Stop، استراتيجيات وقوائم تحقق ولقطات شارت، محاكي R:R، رؤى أداء، تقويم أحداث محلي، اختصارات وتصدير/استيراد. البيانات الحقيقية MIT، الوقف المتحرك والإغلاق الجزئي باقيين، وكلشي كيخدم فالمتصفح بلا حساب ولا API مدفوع. الرابط: <https://kyoraku-replay.vercel.app>.
