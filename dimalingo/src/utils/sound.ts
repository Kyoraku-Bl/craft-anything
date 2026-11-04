// Web Audio Synthesizer + Web Speech TTS + Pronunciation Scoring Engine
// 100% Free, Zero external API keys!

class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTap() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  playCorrect() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [659.25, 987.77];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.095;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  playWrong() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [240, 185];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const start = now + i * 0.11;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.09, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  playMatch() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(784, now);
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playVictory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.11;
      const dur = i === fanfare.length - 1 ? 0.55 : 0.22;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  }

  speak(text: string, lang: string, slow = false) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = slow ? 0.62 : 0.95;
      utter.pitch = 1.02;

      const voices = window.speechSynthesis.getVoices();
      const prefix = lang.split('-')[0].toLowerCase();
      const exactMatch = voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase());
      const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (exactMatch) utter.voice = exactMatch;
      else if (prefixMatch) utter.voice = prefixMatch;

      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore browser TTS restrictions gracefully
    }
  }
}

export const sound = new SoundManager();

export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    // Strip Arabic tashkeel / diacritics for fair matching
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize alef variants
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[.,!?؟¡¿،؛"'«»()\-—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

function tokenSimilarity(wordA: string, wordB: string): number {
  const na = normalizeAnswer(wordA);
  const nb = normalizeAnswer(wordB);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return Math.max(0, 1 - dist / maxLen);
}

export interface PronunciationEvaluation {
  score: number; // 0..100
  passed: boolean;
  wordResults: Array<{
    word: string;
    matched: boolean;
  }>;
}

export function scorePronunciation(
  spokenRaw: string,
  displayTarget: string,
  candidates: string[]
): PronunciationEvaluation {
  const displayWords = displayTarget
    .replace(/[.,!?؟¡¿،]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const normSpoken = normalizeAnswer(spokenRaw);
  if (!normSpoken) {
    return {
      score: 0,
      passed: false,
      wordResults: displayWords.map((w) => ({ word: w, matched: false })),
    };
  }

  const spokenTokens = normSpoken.split(' ').filter(Boolean);
  const allRefs = [displayTarget, ...candidates].filter(Boolean);

  let bestScore = 0;
  let bestMatchedFlags: boolean[] = displayWords.map(() => false);

  for (const ref of allRefs) {
    const refTokens = normalizeAnswer(ref).split(' ').filter(Boolean);
    if (refTokens.length === 0) continue;

    let totalSim = 0;
    const flags: boolean[] = [];

    refTokens.forEach((rt) => {
      let maxTokenSim = 0;
      for (const st of spokenTokens) {
        const sim = tokenSimilarity(rt, st);
        if (sim > maxTokenSim) maxTokenSim = sim;
      }
      totalSim += maxTokenSim;
      flags.push(maxTokenSim >= 0.68);
    });

    const pct = Math.round((totalSim / refTokens.length) * 100);
    if (pct > bestScore) {
      bestScore = pct;
      // Map flags onto displayWords length proportionally
      bestMatchedFlags = displayWords.map((_, idx) => {
        const mappedIdx = Math.min(
          flags.length - 1,
          Math.floor((idx / Math.max(1, displayWords.length)) * flags.length)
        );
        return Boolean(flags[mappedIdx]);
      });
    }
  }

  return {
    score: Math.min(100, bestScore),
    passed: bestScore >= 62,
    wordResults: displayWords.map((word, idx) => ({
      word,
      matched: bestScore >= 90 ? true : Boolean(bestMatchedFlags[idx]),
    })),
  };
}

export function computeEffectiveStrength(
  strength: number,
  halfLifeHours: number,
  lastPracticedAt: number
): number {
  const hoursElapsed = Math.max(0, (Date.now() - lastPracticedAt) / (1000 * 60 * 60));
  const decayed = strength * Math.pow(0.5, hoursElapsed / Math.max(4, halfLifeHours));
  return Math.max(12, Math.min(100, Math.round(decayed)));
}
