# Attribution

Kyoraku Replay bundles third-party real market data under the MIT license.
The original license text is reproduced below and is also present in every
source repository.

## Real OHLCV datasets — GetData Finance (MIT)

Source organisation: <https://github.com/getdata-finance>  
License: MIT (`Copyright (c) 2026 GetData`)  
Each dataset below is a free evaluation sample; Kyoraku Replay keeps only the
most recent bars and converts the `datetime` column to UTC epoch seconds.

| Bundled symbol | Source repository | Source file | Bundled bars |
|---|---|---|---|
| `NQ` | [getdata-finance/nq-1m-ohlcv-stocks-historical-data](https://github.com/getdata-finance/nq-1m-ohlcv-stocks-historical-data) | `NQ_1m.csv` | 6000 |
| `NAS100USD` | [getdata-finance/nas100-5m-ohlcv-index-historical-data](https://github.com/getdata-finance/nas100-5m-ohlcv-index-historical-data) | `NAS100_5m.csv` | 6000 |
| `US30` | [getdata-finance/us30-5m-ohlcv-index-historical-data](https://github.com/getdata-finance/us30-5m-ohlcv-index-historical-data) | `US30_5m.csv` | 6000 |
| `SPX500` | [getdata-finance/spx500-15m-ohlcv-index-historical-data](https://github.com/getdata-finance/spx500-15m-ohlcv-index-historical-data) | `SPX500_15m.csv` | 6000 |
| `GER30` | [getdata-finance/ger30-5m-ohlcv-index-historical-data](https://github.com/getdata-finance/ger30-5m-ohlcv-index-historical-data) | `GER30_5m.csv` | 6000 |
| `JPN225` | [getdata-finance/jpn225-15m-ohlcv-index-historical-data](https://github.com/getdata-finance/jpn225-15m-ohlcv-index-historical-data) | `JPN225_15m.csv` | 6000 |
| `EURUSD` | [getdata-finance/eurusd-15m-ohlcv-forex-historical-data](https://github.com/getdata-finance/eurusd-15m-ohlcv-forex-historical-data) | `EURUSD_15m.csv` | 6000 |
| `USDJPY` | [getdata-finance/usdjpy-30m-ohlcv-forex-historical-data](https://github.com/getdata-finance/usdjpy-30m-ohlcv-forex-historical-data) | `USDJPY_30m.csv` | 6000 |
| `XAUUSD` | [getdata-finance/xauusd-15m-ohlcv-metals-historical-data](https://github.com/getdata-finance/xauusd-15m-ohlcv-metals-historical-data) | `XAUUSD_15m.csv` | 6000 |
| `USOIL` | [getdata-finance/usoil-30m-ohlcv-commodities-historical-data](https://github.com/getdata-finance/usoil-30m-ohlcv-commodities-historical-data) | `USOIL_30m.csv` | 5995 |

```text
MIT License

Copyright (c) 2026 GetData

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Live data (optional, not bundled)

`/api/ohlcv` queries the public Yahoo Finance chart endpoint server-side at
runtime. No Yahoo data is stored or redistributed by this project. Yahoo
Finance data is subject to Yahoo's terms; for a commercial product, replace
the proxy with your own licensed market-data feed. See `docs/DATA.md`.

## Project code

All application code in `js/`, `css/`, `index.html`, `api/`, `scripts/` and
`tests/` is original and licensed `MIT OR Apache-2.0` (matching the parent
repository). No code, branding or assets were copied from any other product.
