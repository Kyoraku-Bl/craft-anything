/* Kyoraku Replay - replay + execution engine. Pure state, no DOM, no network. */
(function (RL) {
  'use strict';
  const U = RL.util;
  const SCHEMA = 2;
  const STORAGE_KEY = 'kyoraku-replay:state:v2';
  // Reads the state key of our own pre-rename build so existing users keep their data.
  const LEGACY_KEY = 'replay-lab:state:v1';

  function num(value, fallback, lo, hi) {
    if (!U.isNum(value)) return fallback;
    return U.clamp(value, lo, hi);
  }
  function bool(value, fallback) { return typeof value === 'boolean' ? value : fallback; }
  function str(value, fallback, max) {
    return typeof value === 'string' ? value.slice(0, max || 200) : fallback;
  }

  function defaultState() {
    return {
      version: SCHEMA,
      session: {
        id: U.uid('s'), name: '', symbol: 'EURUSD', tf: '5m', htf: '1h',
        initialBalance: 10000, balance: 10000, replayTime: 0,
        nextId: 1, trades: [], createdAt: Date.now(),
        violations: [], propStatus: 'active', propProgress: {}
      },
      archive: [],
      customDatasets: [],
      settings: {
        riskPct: 1, spreadPips: 1, commissionPerLot: 0, slPips: 20, rr: 2,
        autoBE: true, beR: 1, startIndex: 600,
        trailEnabled: false, trailStartR: 1, trailDistPips: 20,
        autoPartial: false, partialAtR: 1, partialPct: 50
      },
      prop: { enabled: false, targetPct: 8, dailyPct: 5, totalPct: 10, minDays: 3 },
      ui: {
        lang: 'ar', speed: 1, htf: true, volume: true, sessionFilter: 'active',
        indicators: { sma20: true, sma50: false, ema20: false, bollinger: false, vwap: false, rsi: false }
      }
    };
  }

  function sanitizeTrade(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const side = raw.side === 'sell' ? 'sell' : 'buy';
    const entryPrice = num(raw.entryPrice, 0, 1e-9, 1e9);
    if (entryPrice <= 0) return null;
    const status = raw.status === 'closed' ? 'closed' : 'open';
    const size = num(raw.size, 0.01, 0.0001, 1e6);
    const riskAmount = num(raw.riskAmount, 0, 0, 1e12);
    return {
      id: str(raw.id, 'T' + (index + 1), 40),
      sessionId: str(raw.sessionId, '', 40),
      symbol: str(raw.symbol, 'EURUSD', 30),
      tf: str(raw.tf, '5m', 8),
      side,
      entryTime: num(raw.entryTime, 0, 0, 1e15),
      entryPrice,
      initialSL: num(raw.initialSL, raw.sl, 1e-9, 1e9),
      sl: num(raw.sl, entryPrice * 0.99, 1e-9, 1e9),
      tp: num(raw.tp, entryPrice * 1.01, 1e-9, 1e9),
      size,
      originalSize: num(raw.originalSize, size, 0.0001, 1e6),
      contract: num(raw.contract, 100000, 1e-6, 1e9),
      pip: num(raw.pip, 0.0001, 1e-9, 1e5),
      decimals: num(raw.decimals, 2, 0, 8),
      riskAmount,
      riskPerLot: num(raw.riskPerLot, riskAmount / Math.max(0.0001, size), 0, 1e12),
      commission: num(raw.commission, 0, 0, 1e9),
      commissionRate: num(raw.commissionRate, 0, 0, 1e6),
      status,
      exitTime: status === 'closed' ? num(raw.exitTime, raw.entryTime, 0, 1e15) : null,
      exitPrice: status === 'closed' ? num(raw.exitPrice, entryPrice, 1e-9, 1e9) : null,
      pnl: status === 'closed' ? num(raw.pnl, 0, -1e12, 1e12) : 0,
      r: status === 'closed' ? num(raw.r, 0, -1e6, 1e6) : 0,
      exitReason: status === 'closed' ? str(raw.exitReason, 'manual', 24) : null,
      beApplied: bool(raw.beApplied, false),
      trailActive: bool(raw.trailActive, false),
      extreme: U.isNum(raw.extreme) ? raw.extreme : null,
      partialApplied: bool(raw.partialApplied, false),
      partialCount: num(raw.partialCount, 0, 0, 1000),
      isPartial: bool(raw.isPartial, false),
      parentId: typeof raw.parentId === 'string' && raw.parentId ? str(raw.parentId, null, 40) : null,
      notes: str(raw.notes, '', 500),
      tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 8).map((t) => str(t, '', 30)) : []
    };
  }

  function sanitizeSession(raw, base) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const trades = Array.isArray(s.trades) ? s.trades.slice(0, 100000).map(sanitizeTrade).filter(Boolean) : [];
    return {
      id: str(s.id, U.uid('s'), 40),
      name: str(s.name, '', 80),
      symbol: str(s.symbol, 'EURUSD', 30),
      tf: str(s.tf, '5m', 8),
      htf: str(s.htf, '1h', 8),
      initialBalance: num(s.initialBalance, 10000, 1, 1e12),
      balance: num(s.balance, 10000, -1e12, 1e12),
      replayTime: num(s.replayTime, 0, 0, 1e15),
      nextId: num(s.nextId, trades.length + 1, 1, 1e9),
      trades,
      createdAt: num(s.createdAt, Date.now(), 0, 1e15),
      violations: [],
      propStatus: 'active',
      propProgress: {}
    };
  }

  function sanitizeDataset(raw) {
    if (!raw || !raw.symbol || !Array.isArray(raw.bars)) return null;
    const sym = RL.data.makeCustomSymbol(raw.symbol);
    const bars = [];
    for (const b of raw.bars.slice(0, 40000)) {
      if (!b || !U.isNum(b.t) || !U.isNum(b.o) || !U.isNum(b.h) || !U.isNum(b.l) || !U.isNum(b.c)) continue;
      if (!(b.o > 0 && b.h > 0 && b.l > 0 && b.c > 0)) continue;
      bars.push({ t: b.t, o: b.o, h: Math.max(b.h, b.o, b.c), l: Math.min(b.l, b.o, b.c), c: b.c, v: U.isNum(b.v) ? b.v : 0 });
    }
    if (bars.length < 10) return null;
    bars.sort((a, b) => a.t - b.t);
    sym.id = str(raw.symbol.id, 'CUSTOM', 30);
    sym.label = str(raw.symbol.label, sym.id, 24);
    sym.name = str(raw.symbol.name, sym.id, 60);
    return { symbol: sym, bars };
  }

  function sanitize(raw) {
    const d = defaultState();
    if (!raw || typeof raw !== 'object') return d;
    const st = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const pr = raw.prop && typeof raw.prop === 'object' ? raw.prop : {};
    const ui = raw.ui && typeof raw.ui === 'object' ? raw.ui : {};
    const ind = ui.indicators && typeof ui.indicators === 'object' ? ui.indicators : {};
    d.settings = {
      riskPct: num(st.riskPct, 1, 0.01, 100),
      spreadPips: num(st.spreadPips, 1, 0, 1000),
      commissionPerLot: num(st.commissionPerLot, 0, 0, 10000),
      slPips: num(st.slPips, 20, 0.1, 1e6),
      rr: num(st.rr, 2, 0.1, 100),
      autoBE: bool(st.autoBE, true),
      beR: num(st.beR, 1, 0.1, 20),
      startIndex: num(st.startIndex, 600, 0, 190000),
      trailEnabled: bool(st.trailEnabled, false),
      trailStartR: num(st.trailStartR, 1, 0.1, 20),
      trailDistPips: num(st.trailDistPips, 20, 0.1, 1e6),
      autoPartial: bool(st.autoPartial, false),
      partialAtR: num(st.partialAtR, 1, 0.1, 20),
      partialPct: num(st.partialPct, 50, 1, 99)
    };
    d.prop = {
      enabled: bool(pr.enabled, false),
      targetPct: num(pr.targetPct, 8, 0.1, 1000),
      dailyPct: num(pr.dailyPct, 5, 0.1, 100),
      totalPct: num(pr.totalPct, 10, 0.1, 100),
      minDays: num(pr.minDays, 3, 0, 365)
    };
    d.ui = {
      lang: ui.lang === 'en' ? 'en' : 'ar',
      speed: num(ui.speed, 1, 0.25, 50),
      htf: bool(ui.htf, true),
      volume: bool(ui.volume, true),
      sessionFilter: str(ui.sessionFilter, 'active', 40),
      indicators: {
        sma20: bool(ind.sma20, true), sma50: bool(ind.sma50, false),
        ema20: bool(ind.ema20, false), bollinger: bool(ind.bollinger, false),
        vwap: bool(ind.vwap, false), rsi: bool(ind.rsi, false)
      }
    };
    d.session = sanitizeSession(raw.session, d.session);
    d.archive = Array.isArray(raw.archive)
      ? raw.archive.slice(0, 50).map((x) => sanitizeSession(x)).filter((x) => x.trades.length)
      : [];
    d.customDatasets = Array.isArray(raw.customDatasets)
      ? raw.customDatasets.slice(0, 3).map(sanitizeDataset).filter(Boolean)
      : [];
    return d;
  }

  const storage = {
    load() {
      try {
        if (!globalThis.localStorage) return defaultState();
        let raw = globalThis.localStorage.getItem(STORAGE_KEY);
        if (!raw) raw = globalThis.localStorage.getItem(LEGACY_KEY); // v1 → v2 migration
        return raw ? sanitize(JSON.parse(raw)) : defaultState();
      } catch (err) { return defaultState(); }
    },
    save(state) {
      try {
        if (!globalThis.localStorage) return { ok: false, error: 'no-storage' };
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return { ok: true };
      } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
    },
    clear() {
      try {
        if (globalThis.localStorage) {
          globalThis.localStorage.removeItem(STORAGE_KEY);
          globalThis.localStorage.removeItem(LEGACY_KEY);
        }
        return true;
      } catch (err) { return false; }
    }
  };

  class ReplayEngine {
    constructor(saved) {
      this.state = sanitize(saved);
      this.onChange = null;
      this.bars = [];
      this.symbol = RL.data.symbolById('EURUSD');
      this.ready = false;
      this.restoreCustom();
    }

    get s() { return this.state.session; }
    get cfg() { return this.state.settings; }
    get prop() { return this.state.prop; }
    get ui() { return this.state.ui; }

    emit() { if (typeof this.onChange === 'function') { try { this.onChange(this); } catch (err) { /* UI never breaks the engine */ } } }
    save() { return storage.save(this.state); }

    restoreCustom() {
      for (const ds of this.state.customDatasets) {
        try { RL.data.registerCustom(ds.symbol, ds.bars); } catch (err) { /* skip broken dataset */ }
      }
    }

    addCustomDataset(text, fields) {
      const parsed = RL.data.parseCsv(text, { intervalMs: 60000 });
      const sym = RL.data.makeCustomSymbol(fields);
      RL.data.registerCustom(sym, parsed.bars);
      this.state.customDatasets = [{ symbol: sym, bars: parsed.bars }].concat(
        this.state.customDatasets.filter((d) => d.symbol.id !== sym.id)
      ).slice(0, 3);
      return { symbol: sym, count: parsed.bars.length, skipped: parsed.skipped };
    }

    loadMarket(symbolId, tf) {
      const sym = RL.data.symbolById(symbolId) || RL.data.symbolById('EURUSD');
      const useTf = RL.data.effectiveTf(sym, RL.data.TF_MS[tf] ? tf : '5m');
      const bars = RL.data.getBars(sym.id, useTf);
      if (!bars || !bars.length) return false;
      this.bars = bars;
      this.symbol = sym;
      this.s.symbol = sym.id;
      this.s.tf = useTf;
      const first = bars[0].t;
      const last = bars[bars.length - 1].t;
      if (!U.isNum(this.s.replayTime) || this.s.replayTime < first || this.s.replayTime > last ||
          this.s.replayTime === 0) {
        // Start ~22% into the data: enough history for indicators, plenty of hidden future.
        const idx = U.clamp(Math.round(bars.length * 0.22), 1, Math.max(1, bars.length - 2));
        this.s.replayTime = bars[idx].t;
      }
      this.ready = true;
      this.recompute();
      return true;
    }

    switchMarket(symbolId, tf) {
      this.closeAll('market-change');
      const ok = this.loadMarket(symbolId, tf);
      this.emit();
      return ok;
    }

    indexAtOrBefore(bars, t) {
      if (!bars.length) return -1;
      let lo = 0;
      let hi = bars.length - 1;
      let ans = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (bars[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
      }
      return ans;
    }

    visibleBars(bars) {
      const src = bars || this.bars;
      const idx = this.indexAtOrBefore(src, this.s.replayTime);
      return src.slice(0, idx + 1);
    }

    barsFor(tf) {
      const all = RL.data.getBars(this.symbol.id, RL.data.TF_MS[tf] ? tf : '1h');
      return this.visibleBars(all);
    }

    currentBar() {
      const idx = this.indexAtOrBefore(this.bars, this.s.replayTime);
      return idx >= 0 ? this.bars[idx] : null;
    }

    halfSpread() { return (this.cfg.spreadPips * this.symbol.pip) / 2; }

    pnlFor(tr, exit) {
      const dir = tr.side === 'buy' ? 1 : -1;
      return (exit - tr.entryPrice) * dir * tr.size * tr.contract - (tr.commission || 0);
    }

    equity() {
      let eq = this.s.balance;
      const bar = this.currentBar();
      if (!bar) return eq;
      const half = this.halfSpread();
      for (const tr of this.s.trades) {
        if (tr.status !== 'open') continue;
        const dir = tr.side === 'buy' ? 1 : -1;
        eq += this.pnlFor(tr, bar.c - dir * half);
      }
      return eq;
    }

    /* ---- replay control -------------------------------------------------- */

    step(dir) {
      if (!this.ready) return false;
      const idx = this.indexAtOrBefore(this.bars, this.s.replayTime);
      const ni = U.clamp(idx + dir, 0, this.bars.length - 1);
      if (ni === idx) return false;
      if (dir > 0) this.advanceTo(this.bars[ni].t);
      else this.rewindTo(this.bars[ni].t);
      this.emit();
      return true;
    }

    advanceTo(t) {
      if (!U.isNum(t)) return;
      const old = this.s.replayTime;
      if (t <= old) { this.rewindTo(t); return; }
      let i = this.indexAtOrBefore(this.bars, old) + 1;
      let last = old;
      while (i < this.bars.length && this.bars[i].t <= t) {
        this.processBar(this.bars[i]);
        last = this.bars[i].t;
        i += 1;
      }
      this.s.replayTime = last;
      this.recompute();
    }

    rewindTo(t) {
      if (!U.isNum(t)) return;
      const s = this.s;
      s.replayTime = t;
      const restored = {};
      const kept = [];
      for (const tr of s.trades) {
        if (!U.isNum(tr.entryTime) || tr.entryTime > t) continue;
        if (tr.status === 'closed' && U.isNum(tr.exitTime) && tr.exitTime > t) {
          if (tr.isPartial && tr.parentId) {
            if (!restored[tr.parentId]) restored[tr.parentId] = { size: 0, count: 0 };
            restored[tr.parentId].size += tr.size;
            restored[tr.parentId].count += 1;
            continue; // the slice returns to its parent
          }
          tr.status = 'open';
          tr.exitTime = null; tr.exitPrice = null; tr.exitReason = null;
          tr.pnl = 0; tr.r = 0;
        }
        tr.sl = tr.initialSL;
        tr.beApplied = false;
        tr.trailActive = false;
        tr.extreme = null;
        tr.partialApplied = false;
        kept.push(tr);
      }
      s.trades = kept;
      for (const id of Object.keys(restored)) {
        const parent = s.trades.find((x) => x.id === id);
        if (!parent) continue;
        parent.size = U.round(parent.size + restored[id].size, 6);
        parent.commission = U.round(parent.commissionRate * parent.size, 6);
        parent.riskAmount = parent.riskPerLot * parent.size;
        parent.partialCount = Math.max(0, (parent.partialCount || 0) - restored[id].count);
      }
      for (const tr of s.trades) {
        if (tr.status !== 'open' || tr.isPartial) continue;
        const children = s.trades.filter((c) => c.isPartial && c.parentId === tr.id);
        tr.partialCount = children.length;
        tr.partialApplied = children.some((c) => c.exitReason === 'auto-partial');
        this.rebuildProtection(tr, t);
      }
      this.recompute();
    }

    goTo(t) {
      if (!this.ready || !U.isNum(t)) return false;
      const clamped = U.clamp(t, this.bars[0].t, this.bars[this.bars.length - 1].t);
      if (clamped >= this.s.replayTime) this.advanceTo(clamped);
      else this.rewindTo(clamped);
      this.emit();
      return true;
    }

    jumpBars(count) {
      const idx = this.indexAtOrBefore(this.bars, this.s.replayTime);
      const ni = U.clamp(idx + Math.round(count), 0, this.bars.length - 1);
      return this.goTo(this.bars[ni].t);
    }

    riskDistance(tr) { return Math.abs(tr.entryPrice - tr.initialSL); }
    trailDistance() { return this.cfg.trailDistPips * this.symbol.pip; }

    /* Break-even + trailing stop. Shared by live bars and rewind reconstruction.
       It never closes a trade; SL only ever moves in the favourable direction. */
    updateProtection(tr, bar) {
      const dir = tr.side === 'buy' ? 1 : -1;
      const riskDist = this.riskDistance(tr);
      if (!(riskDist > 0)) return;
      const favourable = dir > 0 ? bar.h - tr.entryPrice : tr.entryPrice - bar.l;
      if (dir > 0) tr.extreme = Math.max(U.isNum(tr.extreme) ? tr.extreme : tr.entryPrice, bar.h);
      else tr.extreme = Math.min(U.isNum(tr.extreme) ? tr.extreme : tr.entryPrice, bar.l);
      if (this.cfg.autoBE && !tr.beApplied && favourable >= riskDist * this.cfg.beR) {
        tr.sl = U.round(tr.entryPrice, tr.decimals + 2);
        tr.beApplied = true;
      }
      if (!this.cfg.trailEnabled) return;
      if (!tr.trailActive && favourable >= riskDist * this.cfg.trailStartR) tr.trailActive = true;
      if (!tr.trailActive) return;
      const dist = this.trailDistance();
      let newSL = dir > 0 ? tr.extreme - dist : tr.extreme + dist;
      if (tr.beApplied) newSL = dir > 0 ? Math.max(newSL, tr.entryPrice) : Math.min(newSL, tr.entryPrice);
      newSL = U.round(newSL, tr.decimals + 2);
      if (newSL > 0 && ((dir > 0 && newSL > tr.sl) || (dir < 0 && newSL < tr.sl))) tr.sl = newSL;
    }

    rebuildProtection(tr, t) {
      if (!this.bars.length) return;
      const start = this.indexAtOrBefore(this.bars, tr.entryTime);
      const end = this.indexAtOrBefore(this.bars, t);
      for (let i = Math.max(0, start + 1); i <= end && i < this.bars.length; i += 1) {
        this.updateProtection(tr, this.bars[i]);
      }
    }

    processBar(bar) {
      if (!bar) return;
      const half = this.halfSpread();
      const snapshot = this.s.trades.slice(); // partial closes append children
      for (const tr of snapshot) {
        if (tr.status !== 'open') continue;
        const dir = tr.side === 'buy' ? 1 : -1;
        const riskDist = this.riskDistance(tr);
        let exit = null;
        let reason = null;
        // 1. gap straight through the stop (worst case first)
        if (dir > 0 && bar.o <= tr.sl) { exit = bar.o; reason = 'sl-gap'; }
        else if (dir < 0 && bar.o >= tr.sl) { exit = bar.o; reason = 'sl-gap'; }
        // 2. stop hit inside the bar — conservative: checked before target/partial
        if (exit === null) {
          const slHit = dir > 0 ? bar.l <= tr.sl : bar.h >= tr.sl;
          if (slHit) { exit = tr.sl; reason = 'sl'; }
        }
        if (exit !== null) {
          this.closeAt(tr, exit - dir * half, bar.t, reason);
          continue;
        }
        // 3. automatic partial exit at +N R
        if (this.cfg.autoPartial && !tr.partialApplied && riskDist > 0) {
          const level = tr.entryPrice + dir * riskDist * this.cfg.partialAtR;
          const reached = dir > 0 ? bar.h >= level : bar.l <= level;
          const gapped = dir > 0 ? bar.o >= level : bar.o <= level;
          if (reached) {
            this.partialCloseAt(tr, this.cfg.partialPct / 100,
              (gapped ? bar.o : level) - dir * half, bar.t, 'auto-partial', true);
            tr.partialApplied = true;
          }
        }
        // 4. target
        const tpHit = dir > 0 ? bar.h >= tr.tp : bar.l <= tr.tp;
        if (tpHit) {
          const tpGap = dir > 0 ? bar.o >= tr.tp : bar.o <= tr.tp;
          this.closeAt(tr, (tpGap ? bar.o : tr.tp) - dir * half, bar.t, tpGap ? 'tp-gap' : 'tp');
          continue;
        }
        // 5. break-even / trailing stop
        this.updateProtection(tr, bar);
      }
    }

    /* ---- trading --------------------------------------------------------- */

    openTrade(side, opts) {
      if (!this.ready || !this.currentBar()) return { ok: false, error: 'no-data' };
      const o = opts || {};
      const dir = side === 'sell' ? -1 : 1;
      const dec = this.symbol.decimals + 2;
      const bar = this.currentBar();
      const entry = U.round(bar.c + dir * this.halfSpread(), dec);
      let sl = U.isNum(o.slPrice) ? o.slPrice : entry - dir * this.cfg.slPips * this.symbol.pip;
      let tp = U.isNum(o.tpPrice) ? o.tpPrice : entry + dir * Math.abs(entry - sl) * this.cfg.rr;
      sl = U.round(sl, dec);
      tp = U.round(tp, dec);
      const validLevels = dir > 0 ? (sl < entry && tp > entry) : (sl > entry && tp < entry);
      if (!(sl > 0 && tp > 0 && validLevels)) return { ok: false, error: 'bad-levels' };
      const dist = Math.abs(entry - sl);
      const plannedRisk = Math.max(0.01, (this.s.balance * this.cfg.riskPct) / 100);
      const size = U.clamp(plannedRisk / (dist * this.symbol.contract), 0.01, 1000);
      const commissionRate = this.cfg.commissionPerLot;
      const commission = commissionRate * size;
      const riskPerLot = dist * this.symbol.contract + commissionRate;
      const tr = {
        id: 'T' + this.s.nextId,
        sessionId: this.s.id,
        symbol: this.symbol.id,
        tf: this.s.tf,
        side: dir > 0 ? 'buy' : 'sell',
        entryTime: this.s.replayTime,
        entryPrice: entry,
        initialSL: sl, sl, tp,
        size: U.round(size, 4),
        originalSize: U.round(size, 4),
        contract: this.symbol.contract,
        pip: this.symbol.pip,
        decimals: this.symbol.decimals,
        riskAmount: riskPerLot * size,
        riskPerLot,
        commission,
        commissionRate,
        status: 'open',
        exitTime: null, exitPrice: null, pnl: 0, r: 0, exitReason: null,
        beApplied: false,
        trailActive: false, extreme: null,
        partialApplied: false, partialCount: 0,
        isPartial: false, parentId: null,
        notes: typeof o.notes === 'string' ? o.notes.slice(0, 500) : '',
        tags: Array.isArray(o.tags) ? o.tags.slice(0, 8).map((x) => String(x).slice(0, 30)) : []
      };
      this.s.nextId += 1;
      this.s.trades.push(tr);
      this.recompute();
      this.emit();
      return { ok: true, trade: tr };
    }

    closeAt(tr, rawExit, time, reason) {
      const dir = tr.side === 'buy' ? 1 : -1;
      const exit = U.round(Math.max(1e-9, rawExit), tr.decimals + 2);
      const pnl = this.pnlFor(tr, exit);
      tr.exitPrice = exit;
      tr.exitTime = time;
      tr.status = 'closed';
      tr.pnl = U.round(pnl, 2);
      if (tr.riskPerLot > 0) tr.riskAmount = tr.riskPerLot * tr.size;
      tr.r = tr.riskAmount > 0 ? U.round(pnl / tr.riskAmount, 3) : 0;
      tr.exitReason = reason;
    }

    /* Close a fraction of an open position. The closed slice becomes its own
       journal row (isPartial) so every statistic stays exact; the parent keeps
       the remaining size, risk and commission. Rewind merges children back. */
    partialCloseAt(tr, fraction, rawExit, time, reason, silent) {
      if (!tr || tr.status !== 'open') return null;
      const portion = U.clamp(fraction, 0.01, 0.99);
      const closedSize = U.round(tr.size * portion, 6);
      const remaining = U.round(tr.size - closedSize, 6);
      if (closedSize <= 0 || remaining < 0.0001) return null;
      const dir = tr.side === 'buy' ? 1 : -1;
      const exit = U.round(Math.max(1e-9, rawExit), tr.decimals + 2);
      const commission = tr.commissionRate * closedSize;
      const pnl = U.round((exit - tr.entryPrice) * dir * closedSize * tr.contract - commission, 2);
      const risk = tr.riskPerLot * closedSize;
      const count = (tr.partialCount || 0) + 1;
      const child = Object.assign({}, tr, {
        id: tr.id + '-P' + count,
        parentId: tr.id,
        isPartial: true,
        status: 'closed',
        size: closedSize,
        originalSize: closedSize,
        commission,
        riskAmount: risk,
        exitPrice: exit,
        exitTime: time,
        exitReason: reason,
        pnl,
        r: risk > 0 ? U.round(pnl / risk, 3) : 0,
        notes: tr.notes,
        tags: Array.isArray(tr.tags) ? tr.tags.slice() : []
      });
      tr.size = remaining;
      tr.commission = U.round(tr.commissionRate * remaining, 6);
      tr.riskAmount = tr.riskPerLot * remaining;
      tr.partialCount = count;
      this.s.trades.push(child);
      if (!silent) { this.recompute(); this.emit(); }
      return child;
    }

    partialClose(id, fraction) {
      const tr = this.s.trades.find((t) => t.id === id && t.status === 'open');
      const bar = this.currentBar();
      if (!tr || !bar) return null;
      const dir = tr.side === 'buy' ? 1 : -1;
      return this.partialCloseAt(tr, U.clamp(fraction, 0.01, 0.99),
        bar.c - dir * this.halfSpread(), this.s.replayTime, 'partial', false);
    }

    closeTrade(id) {
      const tr = this.s.trades.find((t) => t.id === id && t.status === 'open');
      const bar = this.currentBar();
      if (!tr || !bar) return false;
      const dir = tr.side === 'buy' ? 1 : -1;
      this.closeAt(tr, bar.c - dir * this.halfSpread(), this.s.replayTime, 'manual');
      this.recompute();
      this.emit();
      return true;
    }

    closeAll(reason) {
      const bar = this.currentBar();
      if (!bar) return;
      let changed = false;
      for (const tr of this.s.trades) {
        if (tr.status !== 'open') continue;
        const dir = tr.side === 'buy' ? 1 : -1;
        this.closeAt(tr, bar.c - dir * this.halfSpread(), this.s.replayTime, reason || 'manual');
        changed = true;
      }
      if (changed) this.recompute();
    }

    editTrade(id, patch) {
      const tr = this.s.trades.find((t) => t.id === id);
      if (!tr || !patch) return false;
      if (typeof patch.notes === 'string') tr.notes = patch.notes.slice(0, 500);
      if (typeof patch.tags === 'string') tr.tags = patch.tags.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 8);
      this.emit();
      return true;
    }

    deleteTrade(id) {
      const tr = this.s.trades.find((t) => t.id === id);
      if (!tr) return false;
      if (tr.isPartial && tr.parentId) {
        const parent = this.s.trades.find((t) => t.id === tr.parentId);
        if (parent) {
          parent.size = U.round(parent.size + tr.size, 6);
          parent.commission = U.round(parent.commissionRate * parent.size, 6);
          parent.riskAmount = parent.riskPerLot * parent.size;
          parent.partialCount = Math.max(0, (parent.partialCount || 0) - 1);
          parent.partialApplied = this.s.trades.some((c) => c !== tr && c.isPartial &&
            c.parentId === parent.id && c.exitReason === 'auto-partial');
        }
      }
      this.s.trades = this.s.trades.filter((t) => t.id !== id && !(t.isPartial && t.parentId === id));
      this.recompute();
      this.emit();
      return true;
    }

    modifyTrade(id, patch) {
      const tr = this.s.trades.find((t) => t.id === id && t.status === 'open');
      if (!tr) return false;
      if (U.isNum(patch.slPrice) && patch.slPrice > 0) tr.sl = U.round(patch.slPrice, tr.decimals + 2);
      if (U.isNum(patch.tpPrice) && patch.tpPrice > 0) tr.tp = U.round(patch.tpPrice, tr.decimals + 2);
      this.emit();
      return true;
    }

    /* ---- bookkeeping ----------------------------------------------------- */

    recompute() {
      const s = this.s;
      const closed = RL.analytics.closedTrades(s.trades);
      s.balance = U.round(s.initialBalance + closed.reduce((a, t) => a + t.pnl, 0), 2);
      const curve = RL.analytics.equityCurve(s.trades, s.initialBalance);
      const live = this.equity();
      curve.push({ t: s.replayTime, eq: live });
      const dd = RL.analytics.maxDrawdown(curve);
      s.equityCurve = curve;
      s.maxDrawdown = dd.amount;
      s.maxDrawdownPct = dd.pct;
      s.violations = [];
      s.propStatus = 'active';
      if (this.prop.enabled) this.evaluateProp(curve, closed, s.initialBalance);
    }

    addViolation(type, day, message) {
      const key = type + '|' + day;
      if (this.s.violations.some((v) => v.key === key)) return;
      this.s.violations.push({ key, type, day, message, t: this.s.replayTime });
    }

    evaluateProp(curve, closed, start) {
      const p = this.prop;
      const s = this.s;
      let prevEq = start;
      let prevDay = curve.length ? U.fmtDate(curve[0].t) : '';
      let dayStart = start;
      let lastEq = start;
      for (let i = 1; i < curve.length; i += 1) {
        const point = curve[i];
        if (!U.isNum(point.eq)) continue;
        const day = U.fmtDate(point.t);
        if (day !== prevDay) { dayStart = prevEq; prevDay = day; }
        const dayPnl = point.eq - dayStart;
        if (dayStart > 0 && dayPnl <= -dayStart * (p.dailyPct / 100)) {
          this.addViolation('daily', day, 'تجاوز الخسارة اليومية / daily loss limit');
        }
        if (point.eq <= start * (1 - p.totalPct / 100)) {
          this.addViolation('total', day, 'تجاوز السحب الكلي / total drawdown limit');
        }
        prevEq = point.eq;
        lastEq = point.eq;
      }
      const days = {};
      for (const tr of closed) days[U.fmtDate(tr.entryTime)] = true;
      const tradingDays = Object.keys(days).length;
      const profitPct = ((lastEq - start) / start) * 100;
      const dailyUse = dayStart > 0 ? Math.max(0, ((dayStart - lastEq) / dayStart) * 100) : 0;
      s.propProgress = {
        profitPct, targetPct: p.targetPct, tradingDays, minDays: p.minDays,
        dailyUse, dailyPct: p.dailyPct,
        totalUse: Math.max(0, ((start - lastEq) / start) * 100), totalPct: p.totalPct,
        equity: lastEq
      };
      s.propStatus = s.violations.length ? 'failed'
        : (profitPct >= p.targetPct && tradingDays >= p.minDays ? 'passed' : 'active');
    }

    /* ---- sessions -------------------------------------------------------- */

    freshSession(name) {
      const s = this.s;
      return {
        id: U.uid('s'), name: name || '', symbol: s.symbol, tf: s.tf, htf: s.htf,
        initialBalance: s.initialBalance, balance: s.initialBalance, replayTime: 0,
        nextId: 1, trades: [], createdAt: Date.now(),
        violations: [], propStatus: 'active', propProgress: {}
      };
    }

    resetSession() {
      this.state.session = this.freshSession('');
      this.loadMarket(this.s.symbol, this.s.tf);
      this.emit();
    }

    saveSession(name) {
      const copy = U.deepCopy(this.s);
      copy.name = name || U.fmtTime(copy.createdAt) + ' · ' + copy.symbol;
      copy.violations = copy.violations || [];
      this.state.archive.unshift(copy);
      this.state.archive = this.state.archive.slice(0, 50);
      this.state.session = this.freshSession('');
      this.loadMarket(this.s.symbol, this.s.tf);
      this.emit();
      return copy;
    }

    openArchived(id) {
      const found = this.state.archive.find((x) => x.id === id);
      if (!found) return false;
      const copy = U.deepCopy(found);
      copy.id = U.uid('s');
      this.state.session = sanitizeSession(copy);
      this.state.archive = this.state.archive.filter((x) => x.id !== id);
      this.loadMarket(this.s.symbol, this.s.tf);
      this.emit();
      return true;
    }

    deleteArchived(id) {
      const before = this.state.archive.length;
      this.state.archive = this.state.archive.filter((x) => x.id !== id);
      this.emit();
      return this.state.archive.length !== before;
    }

    allSessions() {
      const list = [{ id: 'active', label: 'الجلسة الحالية', session: this.s }];
      for (const a of this.state.archive) list.push({ id: a.id, label: (a.name || a.symbol) + ' · ' + a.trades.length, session: a });
      return list;
    }

    selectedTrades() {
      const filter = this.ui.sessionFilter;
      if (filter === 'all') {
        let out = this.s.trades.slice();
        for (const a of this.state.archive) out = out.concat(a.trades);
        return out;
      }
      const found = this.state.archive.find((x) => x.id === filter);
      return found ? found.trades : this.s.trades;
    }

    toJSON() { return U.deepCopy(this.state); }
  }

  RL.engine = { ReplayEngine, defaultState, sanitize, storage, SCHEMA, STORAGE_KEY };
})(globalThis.RL = globalThis.RL || {});
