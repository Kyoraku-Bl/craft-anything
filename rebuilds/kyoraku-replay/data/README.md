# Bundled real market data

Real OHLCV evaluation samples bundled with Kyoraku Replay so the app works
**offline, with no API key and no network request**. Loaded on demand as
classic scripts (`data/<ID>.js`), therefore compatible with `file://`.

| Symbol | Market | Base TF | Bars (bundled / source) | Period (UTC) | Size |
|---|---|---|---|---|---|
| NQ | futures | 1m | 6000 / 55440 | 2026-08-26 → 2026-09-02 | 303.7 KB |
| NAS100USD | index | 5m | 6000 / 36133 | 2026-08-26 → 2026-09-25 | 312.0 KB |
| US30 | index | 5m | 6000 / 36126 | 2026-08-26 → 2026-09-25 | 307.6 KB |
| SPX500 | index | 15m | 6000 / 12045 | 2026-06-26 → 2026-09-25 | 286.9 KB |
| GER30 | index | 5m | 6000 / 30186 | 2026-08-21 → 2026-09-25 | 306.7 KB |
| JPN225 | index | 15m | 6000 / 12071 | 2026-06-26 → 2026-09-25 | 307.7 KB |
| EURUSD | forex | 15m | 6000 / 12650 | 2026-07-01 → 2026-09-25 | 285.8 KB |
| USDJPY | forex | 30m | 6000 / 6324 | 2026-04-03 → 2026-09-25 | 287.8 KB |
| XAUUSD | metal | 15m | 6000 / 11989 | 2026-06-26 → 2026-09-25 | 289.7 KB |
| USOIL | energy | 30m | 5995 / 5995 | 2026-03-26 → 2026-09-25 | 244.4 KB |

## License and attribution

All datasets are MIT-licensed evaluation samples published by **GetData Finance**.
See [`../ATTRIBUTION.md`](../ATTRIBUTION.md) for the full license text, source URLs
and per-file provenance. The MIT notice is retained in each source repository.

These are **evaluation samples** (a truncated recent window), not full archives.
For a commercial deployment that needs deeper history, import your own licensed
broker/vendor CSV (`البيانات → تحميل CSV`) or use the optional `/api/ohlcv` live
proxy. See [`../docs/DATA.md`](../docs/DATA.md).

Regenerate with: `python3 scripts/build-real-data.py --max-bars 6000`
