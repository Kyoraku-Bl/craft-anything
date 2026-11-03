#!/usr/bin/env python3
"""Build Kyoraku Replay's bundled REAL market data files.

Downloads MIT-licensed OHLCV evaluation samples from GetData Finance's public
GitHub repositories, keeps the most recent N bars, and writes compact classic
JS files under data/ so they also load from file:// (no fetch, no CORS).

Usage:  python3 scripts/build-real-data.py [--max-bars 6000]
Requires: Python 3 stdlib only, network access to codeload.github.com.

Attribution for every source is written to ATTRIBUTION.md and data/README.md.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import tarfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
BASE = "https://codeload.github.com/getdata-finance/{repo}/tar.gz/refs/heads/main"

# id, label, Arabic name, market, repo, csv file, base timeframe, pip, contract, decimals
ASSETS = [
    dict(id="NQ", label="NQ · E-mini", name="ناسداك 100 فيوتشرز", market="futures",
         repo="nq-1m-ohlcv-stocks-historical-data", file="NQ_1m.csv",
         tf="1m", pip=0.25, contract=20, decimals=2),
    dict(id="NAS100USD", label="NAS100USD", name="ناسداك 100 · سبوت/CFD", market="index",
         repo="nas100-5m-ohlcv-index-historical-data", file="NAS100_5m.csv",
         tf="5m", pip=0.1, contract=1, decimals=2),
    dict(id="US30", label="US30", name="داو جونز · مؤشر", market="index",
         repo="us30-5m-ohlcv-index-historical-data", file="US30_5m.csv",
         tf="5m", pip=1, contract=1, decimals=2),
    dict(id="SPX500", label="SPX500", name="S&P 500 · مؤشر", market="index",
         repo="spx500-15m-ohlcv-index-historical-data", file="SPX500_15m.csv",
         tf="15m", pip=0.1, contract=1, decimals=2),
    dict(id="GER30", label="GER30 / DAX", name="داكس الألماني · مؤشر", market="index",
         repo="ger30-5m-ohlcv-index-historical-data", file="GER30_5m.csv",
         tf="5m", pip=0.1, contract=1, decimals=2),
    dict(id="JPN225", label="JPN225", name="نيكاي 225 · مؤشر", market="index",
         repo="jpn225-15m-ohlcv-index-historical-data", file="JPN225_15m.csv",
         tf="15m", pip=1, contract=1, decimals=2),
    dict(id="EURUSD", label="EUR/USD", name="يورو / دولار", market="forex",
         repo="eurusd-15m-ohlcv-forex-historical-data", file="EURUSD_15m.csv",
         tf="15m", pip=0.0001, contract=100000, decimals=5),
    dict(id="USDJPY", label="USD/JPY", name="دولار / ين", market="forex",
         repo="usdjpy-30m-ohlcv-forex-historical-data", file="USDJPY_30m.csv",
         tf="30m", pip=0.01, contract=1000, decimals=3),
    dict(id="XAUUSD", label="XAU/USD", name="الذهب / دولار", market="metal",
         repo="xauusd-15m-ohlcv-metals-historical-data", file="XAUUSD_15m.csv",
         tf="15m", pip=0.01, contract=100, decimals=2),
    dict(id="USOIL", label="USOIL / WTI", name="النفط الأمريكي", market="energy",
         repo="usoil-30m-ohlcv-commodities-historical-data", file="USOIL_30m.csv",
         tf="30m", pip=0.01, contract=1000, decimals=2),
]

UA = "KyorakuReplay-data-builder/1.0 (educational; MIT dataset samples)"


def download(repo: str) -> bytes:
    url = BASE.format(repo=repo)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.read()


def extract_csv(blob: bytes, filename: str) -> str:
    with tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz") as tar:
        for member in tar.getmembers():
            if member.name.endswith("/" + filename) and member.isfile():
                f = tar.extractfile(member)
                if f is None:
                    raise ValueError("empty tar member")
                return f.read().decode("utf-8-sig")
    raise ValueError(f"{filename} not found in archive")


def parse_time(value: str) -> int:
    v = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(v)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp())
    except ValueError:
        raise ValueError(f"bad datetime: {value!r}")


def build_one(asset: dict, max_bars: int) -> dict:
    blob = download(asset["repo"])
    text = extract_csv(blob, asset["file"])
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    dec = asset["decimals"]
    for row in reader:
        try:
            t = parse_time(row["datetime"])
            o = float(row["open"]); h = float(row["high"])
            lo = float(row["low"]); c = float(row["close"])
            v = int(float(row.get("volume") or 0))
            if not (o > 0 and h > 0 and lo > 0 and c > 0):
                continue
            hi = max(o, c, h)
            low = min(o, c, lo)
            rows.append((t, o, hi, low, c, v))
        except (ValueError, KeyError, TypeError):
            continue
    if len(rows) < 100:
        raise ValueError(f"too few valid rows for {asset['id']}: {len(rows)}")
    rows.sort(key=lambda r: r[0])
    total = len(rows)
    rows = rows[-max_bars:]
    lines = ["time,open,high,low,close,volume"]
    for t, o, h, lo, c, v in rows:
        lines.append(f"{t},{o:.{dec}f},{h:.{dec}f},{lo:.{dec}f},{c:.{dec}f},{v}")
    csv_text = "\n".join(lines) + "\n"
    meta = dict(
        id=asset["id"], label=asset["label"], name=asset["name"],
        market=asset["market"], tf=asset["tf"], pip=asset["pip"],
        contract=asset["contract"], decimals=asset["decimals"],
        source="GetData Finance (MIT)", repo=asset["repo"], file=asset["file"],
        bars=len(rows), totalRows=total,
        first=rows[0][0], last=rows[-1][0],
        license="MIT", bundled=True,
    )
    out = DATA_DIR / (asset["id"] + ".js")
    payload = {
        "id": asset["id"], "meta": meta, "csv": csv_text,
    }
    out.write_text(
        "/* REAL OHLCV · MIT · GetData Finance · " + asset["repo"] + " */\n"
        "(function (RL) { RL.dataFiles = RL.dataFiles || {}; RL.dataFiles['" + asset["id"] + "'] = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "; })(globalThis.RL = globalThis.RL || {});\n",
        encoding="utf-8",
    )
    return dict(meta=meta, size=out.stat().st_size)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-bars", type=int, default=6000)
    args = ap.parse_args()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    built = []
    for asset in ASSETS:
        try:
            info = build_one(asset, args.max_bars)
            built.append(info)
            print(f"OK  {asset['id']:<10} {info['meta']['bars']:>6} bars  "
                  f"{info['size'] / 1024:>7.1f} KB  {asset['repo']}")
        except Exception as exc:  # keep previously built files if a source is unavailable
            print(f"SKIP {asset['id']:<10} {type(exc).__name__}: {exc}")
    if not built:
        raise SystemExit("No datasets were built")

    manifest = {m["meta"]["id"]: m["meta"] for m in built}
    (DATA_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    # Tiny classic-script catalog: loaded eagerly so the UI can list real markets
    # without fetching anything (works from file://, offline, no CORS).
    catalog = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "assets": [m["meta"] for m in built],
    }
    (DATA_DIR / "catalog.js").write_text(
        "/* Real-data catalog (generated by scripts/build-real-data.py) */\n"
        "(function (RL) { RL.dataCatalog = "
        + json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "; })"
        "(globalThis.RL = globalThis.RL || {});\n",
        encoding="utf-8",
    )

    def ts(t: int) -> str:
        return datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%d")

    lines = [
        "# Bundled real market data", "",
        "Real OHLCV evaluation samples bundled with Kyoraku Replay so the app works",
        "**offline, with no API key and no network request**. Loaded on demand as",
        "classic scripts (`data/<ID>.js`), therefore compatible with `file://`.", "",
        "| Symbol | Market | Base TF | Bars (bundled / source) | Period (UTC) | Size |",
        "|---|---|---|---|---|---|",
    ]
    for b in built:
        m = b["meta"]
        lines.append(f"| {m['id']} | {m['market']} | {m['tf']} | {m['bars']} / {m['totalRows']} | "
                     f"{ts(m['first'])} → {ts(m['last'])} | {b['size']/1024:.1f} KB |")
    lines += [
        "", "## License and attribution", "",
        "All datasets are MIT-licensed evaluation samples published by **GetData Finance**.",
        "See [`../ATTRIBUTION.md`](../ATTRIBUTION.md) for the full license text, source URLs",
        "and per-file provenance. The MIT notice is retained in each source repository.", "",
        "These are **evaluation samples** (a truncated recent window), not full archives.",
        "For a commercial deployment that needs deeper history, import your own licensed",
        "broker/vendor CSV (`البيانات → تحميل CSV`) or use the optional `/api/ohlcv` live",
        "proxy. See [`../docs/DATA.md`](../docs/DATA.md).", "",
        "Regenerate with: `python3 scripts/build-real-data.py --max-bars 6000`", "",
    ]
    (DATA_DIR / "README.md").write_text("\n".join(lines), encoding="utf-8")

    att = [
        "# Attribution", "",
        "Kyoraku Replay bundles third-party real market data under the MIT license.",
        "The original license text is reproduced below and is also present in every",
        "source repository.", "",
        "## Real OHLCV datasets — GetData Finance (MIT)", "",
        "Source organisation: <https://github.com/getdata-finance>  ",
        "License: MIT (`Copyright (c) 2026 GetData`)  ",
        "Each dataset below is a free evaluation sample; Kyoraku Replay keeps only the",
        "most recent bars and converts the `datetime` column to UTC epoch seconds.", "",
        "| Bundled symbol | Source repository | Source file | Bundled bars |",
        "|---|---|---|---|",
    ]
    for b in built:
        m = b["meta"]
        att.append(f"| `{m['id']}` | [getdata-finance/{m['repo']}](https://github.com/getdata-finance/{m['repo']}) "
                   f"| `{m['file']}` | {m['bars']} |")
    att += [
        "", "```text", "MIT License", "", "Copyright (c) 2026 GetData", "",
        "Permission is hereby granted, free of charge, to any person obtaining a copy",
        "of this software and associated documentation files (the \"Software\"), to deal",
        "in the Software without restriction, including without limitation the rights",
        "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
        "copies of the Software, and to permit persons to whom the Software is",
        "furnished to do so, subject to the following conditions:", "",
        "The above copyright notice and this permission notice shall be included in all",
        "copies or substantial portions of the Software.", "",
        "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR",
        "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
        "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
        "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
        "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
        "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
        "SOFTWARE.", "```", "",
        "## Live data (optional, not bundled)", "",
        "`/api/ohlcv` queries the public Yahoo Finance chart endpoint server-side at",
        "runtime. No Yahoo data is stored or redistributed by this project. Yahoo",
        "Finance data is subject to Yahoo's terms; for a commercial product, replace",
        "the proxy with your own licensed market-data feed. See `docs/DATA.md`.", "",
        "## Project code", "",
        "All application code in `js/`, `css/`, `index.html`, `api/`, `scripts/` and",
        "`tests/` is original and licensed `MIT OR Apache-2.0` (matching the parent",
        "repository). No code, branding or assets were copied from any other product.", "",
    ]
    (ROOT / "ATTRIBUTION.md").write_text("\n".join(att), encoding="utf-8")
    print(f"\nBuilt {len(built)} datasets, total {sum(b['size'] for b in built)/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
