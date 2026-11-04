import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Headphones,
  Mic,
  Square,
  Turtle,
  Volume2,
} from 'lucide-react';
import { UILang } from '../types';
import { t, UI_STRINGS } from '../i18n';
import {
  PronunciationEvaluation,
  scorePronunciation,
  sound,
} from '../utils/sound';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike {
  error?: string;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface PronunciationRecorderProps {
  targetSentence: string;
  phonetic?: string;
  audioText: string;
  audioLang: string;
  acceptedAnswers?: string[];
  uiLang: UILang;
  disabled?: boolean;
  onEvaluated: (transcript: string, evaluation: PronunciationEvaluation) => void;
  onSkipMic?: () => void;
}

export const PronunciationRecorder: React.FC<PronunciationRecorderProps> = ({
  targetSentence,
  phonetic,
  audioText,
  audioLang,
  acceptedAnswers = [],
  uiLang,
  disabled = false,
  onEvaluated,
  onSkipMic,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<PronunciationEvaluation | null>(null);
  const [micWarning, setMicWarning] = useState<string | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [bars, setBars] = useState<number[]>(Array(14).fill(14));

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const latestTranscriptRef = useRef<string>('');

  const cleanupAudioCapture = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((tr) => tr.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setBars(Array(14).fill(14));
  };

  useEffect(() => {
    setLiveTranscript('');
    setEvaluation(null);
    setMicWarning(null);
    latestTranscriptRef.current = '';
    setRecordedAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    return () => {
      cleanupAudioCapture();
      if (recRef.current) {
        try {
          recRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, [targetSentence]);

  const finalizeEvaluation = (finalText: string) => {
    const clean = finalText.trim();
    if (!clean) return;
    const evalResult = scorePronunciation(clean, targetSentence, [
      audioText,
      ...acceptedAnswers,
    ]);
    setEvaluation(evalResult);
    onEvaluated(clean, evalResult);
  };

  const startLiveWaveformAndRecorder = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Record user's own voice for playback comparison (supports audio/mp4 on iOS & audio/webm on Android/Desktop)!
      if (typeof MediaRecorder !== 'undefined') {
        const chunks: BlobPart[] = [];
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };
        mr.onstop = () => {
          if (chunks.length > 0) {
            const mime = mr.mimeType || 'audio/mp4';
            const blob = new Blob(chunks, { type: mime });
            const url = URL.createObjectURL(blob);
            setRecordedAudioUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          }
        };
        mr.start();
      }

      // Live Web Audio frequency bars
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const nextBars = Array.from({ length: 14 }, (_, idx) => {
            const val = dataArray[idx + 1] || 0;
            return Math.max(12, Math.min(100, Math.round((val / 255) * 100)));
          });
          setBars(nextBars);
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      }
    } catch {
      // Mic permission blocked (e.g., sandboxed iframe)
      setMicWarning(
        uiLang === 'ar'
          ? 'تنبيه: المتصفح أو نافذة المعاينة حابس صلاحية المايكروفون. تقدر تفتح التطبيق فصفحة مستقلة ↗ أو تدرب بالنطق الذاتي لتحت!'
          : uiLang === 'fr'
          ? 'Accès micro restreint dans cet aperçu. Ouvrez dans un nouvel onglet ↗ ou validez votre prononciation ci-dessous !'
          : 'Mic access is restricted in this frame. Open in a new tab ↗ for full mic capture, or use Shadow Self-Check below!'
      );
    }
  };

  const handleToggleMic = async () => {
    if (disabled) return;

    if (isRecording) {
      setIsRecording(false);
      cleanupAudioCapture();
      if (recRef.current) {
        try {
          recRef.current.stop();
        } catch {
          // Ignore
        }
      }
      if (latestTranscriptRef.current) {
        finalizeEvaluation(latestTranscriptRef.current);
      }
      return;
    }

    setMicWarning(null);
    setLiveTranscript('');
    latestTranscriptRef.current = '';

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (typeof navigator !== 'undefined' &&
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1);

    if (!SpeechRec) {
      await startLiveWaveformAndRecorder();
      setIsRecording(true);
      setMicWarning(
        uiLang === 'ar'
          ? 'متصفحك كيسجل صوتك مباشرة! انطق الجملة بوضوح ثم اضغط إيقاف لسماع صوتك وتأكيد النطق.'
          : 'Recording your voice! Speak clearly, then tap Stop to listen back and verify.'
      );
      return;
    }

    // On iOS WebKit, SpeechRecognition.start() must execute synchronously inside user tap
    // without competing with a simultaneous getUserMedia stream!
    if (!isIOSDevice) {
      startLiveWaveformAndRecorder().catch(() => {});
    } else {
      const pulse = () => {
        setBars(
          Array.from({ length: 14 }, () => Math.floor(22 + Math.random() * 68))
        );
        animFrameRef.current = requestAnimationFrame(pulse);
      };
      pulse();
    }

    try {
      const rec = new SpeechRec();
      recRef.current = rec;
      rec.lang = isIOSDevice && audioLang === 'ar-MA' ? 'ar-SA' : audioLang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 2;

      setIsRecording(true);

      rec.onresult = (event) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += (event.results[i]?.[0]?.transcript || '') + ' ';
        }
        const trimmed = combined.trim();
        latestTranscriptRef.current = trimmed;
        setLiveTranscript(trimmed);
      };

      rec.onerror = (err) => {
        setIsRecording(false);
        cleanupAudioCapture();
        if (err?.error === 'not-allowed' || err?.error === 'service-not-allowed') {
          setMicWarning(
            uiLang === 'ar'
              ? 'صلاحية المايكروفون محبوسة فهاد النافذة المدمجة. افتح التطبيق فصفحة جديدة ↗ أو استعمل زر «نطقتها بصوتي»!'
              : 'Microphone permission blocked in embedded frame. Open in a new tab ↗ or use Shadow Self-Check!'
          );
        }
      };

      rec.onend = () => {
        setIsRecording(false);
        cleanupAudioCapture();
        if (latestTranscriptRef.current) {
          finalizeEvaluation(latestTranscriptRef.current);
        }
      };

      rec.start();
    } catch {
      setIsRecording(false);
      cleanupAudioCapture();
    }
  };

  const handleSelfCheck = () => {
    sound.playTap();
    const evalResult = scorePronunciation(targetSentence, targetSentence, [
      targetSentence,
    ]);
    setLiveTranscript(targetSentence);
    setEvaluation(evalResult);
    onEvaluated(targetSentence, evalResult);
  };

  const playRecordedVoice = () => {
    if (!recordedAudioUrl) return;
    const audio = new Audio(recordedAudioUrl);
    audio.play().catch(() => {});
  };

  const targetWords = targetSentence.trim().split(/\s+/).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Target Sentence & Native Audio Card */}
      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-duo-nightSubtle border-2 border-slate-200 dark:border-duo-nightBorder space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-duo-blue">
            🎙️{' '}
            {uiLang === 'ar'
              ? 'اسمع النطق الأصلي ثم عاود انطق كل كلمة:'
              : uiLang === 'fr'
              ? 'Écoutez le modèle puis répétez chaque mot :'
              : 'Listen to native model & speak each word:'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => sound.speak(audioText, audioLang, false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-duo-blue border-b-4 border-duo-blueDark text-white text-xs font-black active:translate-y-0.5"
            >
              <Volume2 className="w-4 h-4" />
              {t(UI_STRINGS.listenNormal, uiLang)}
            </button>
            <button
              type="button"
              onClick={() => sound.speak(audioText, audioLang, true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-duo-nightCard border-2 border-b-4 border-slate-300 dark:border-duo-nightBorder text-slate-700 dark:text-slate-200 text-xs font-black active:translate-y-0.5"
            >
              <Turtle className="w-4 h-4 text-duo-green" />
              {t(UI_STRINGS.listenSlow, uiLang)}
            </button>
          </div>
        </div>

        {/* Interactive Word-by-Word Chips (Click any word to hear it individually!) */}
        <div dir="ltr" className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {evaluation
            ? evaluation.wordResults.map((wr, idx) => (
                <button
                  key={`${wr.word}-${idx}`}
                  type="button"
                  onClick={() => sound.speak(wr.word, audioLang, false)}
                  className={`px-3 py-1.5 rounded-xl border-2 font-black text-base sm:text-lg transition-all ${
                    wr.matched
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 border-duo-green text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-300'
                  }`}
                  title="Tap to hear word"
                >
                  {wr.word}
                </button>
              ))
            : targetWords.map((w, idx) => (
                <button
                  key={`${w}-${idx}`}
                  type="button"
                  onClick={() => sound.speak(w, audioLang, false)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder hover:border-duo-blue text-slate-800 dark:text-slate-100 font-black text-base sm:text-lg transition-all"
                  title="Tap to hear word"
                >
                  {w}
                </button>
              ))}
        </div>

        {phonetic && (
          <div className="text-center text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
            🗣️ {phonetic}
          </div>
        )}
      </div>

      {/* Live Microphone Waveform & Capture Controls */}
      <div className="flex flex-col items-center gap-3">
        {isRecording && (
          <div className="h-12 px-5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1.5">
            {bars.map((heightPct, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-duo-red transition-all duration-75"
                style={{ height: `${Math.max(16, Math.round(heightPct * 0.36))}px` }}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={handleToggleMic}
            className={`px-6 py-4 rounded-2xl border-b-4 font-black text-base flex items-center gap-2.5 shadow-md transition-all active:translate-y-0.5 ${
              isRecording
                ? 'bg-duo-red hover:bg-rose-500 border-duo-redDark text-white animate-pulse'
                : 'bg-duo-blue hover:bg-[#23b9ff] border-duo-blueDark text-white'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 fill-current" />
                {uiLang === 'ar'
                  ? 'إيقاف وتحليل النطق'
                  : uiLang === 'fr'
                  ? 'Arrêter & Analyser'
                  : 'Stop & Score Accent'}
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                {t(UI_STRINGS.tapToSpeak, uiLang)}
              </>
            )}
          </button>

          {recordedAudioUrl && !isRecording && (
            <button
              type="button"
              onClick={playRecordedVoice}
              className="px-4 py-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border-2 border-b-4 border-duo-purple text-duo-purpleDark dark:text-purple-300 font-extrabold text-xs sm:text-sm flex items-center gap-1.5"
            >
              <Headphones className="w-4 h-4" />
              {uiLang === 'ar'
                ? 'اسمع صوتك المسجل'
                : uiLang === 'fr'
                ? 'Écouter ma voix'
                : 'Hear My Voice'}
            </button>
          )}

          {!disabled && !isRecording && (
            <button
              type="button"
              onClick={handleSelfCheck}
              className="px-4 py-4 rounded-2xl border-2 border-b-4 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs sm:text-sm hover:bg-emerald-100 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t(UI_STRINGS.iSaidItCorrectly, uiLang)}
            </button>
          )}
        </div>

        {/* Live Transcript & Pronunciation Score */}
        {(liveTranscript || evaluation) && (
          <div className="w-full max-w-md p-3.5 rounded-2xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder text-center space-y-1.5 animate-pop">
            {liveTranscript && (
              <div
                dir="auto"
                className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100"
              >
                🎙️ &ldquo;{liveTranscript}&rdquo;
              </div>
            )}
            {evaluation && (
              <div className="flex items-center justify-center gap-2 text-xs font-black">
                <span
                  className={`px-3 py-1 rounded-full ${
                    evaluation.score >= 80
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : evaluation.score >= 62
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                  }`}
                >
                  {uiLang === 'ar'
                    ? `دقة النطق: ${evaluation.score}%`
                    : uiLang === 'fr'
                    ? `Score de prononciation : ${evaluation.score}%`
                    : `Pronunciation Match: ${evaluation.score}%`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Helpful Iframe / Browser Mic Permission Banner */}
        {micWarning && (
          <div className="w-full max-w-lg p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold text-center space-y-2">
            <p>{micWarning}</p>
            <a
              href={window.location.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-200/80 dark:bg-amber-800 text-amber-950 dark:text-amber-100 font-black hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {uiLang === 'ar'
                ? 'فتح فصفحة مستقلة لتفعيل المايكروفون الكامل'
                : 'Open in New Tab for Full Mic Access'}
            </a>
          </div>
        )}

        {onSkipMic && !disabled && (
          <button
            type="button"
            onClick={onSkipMic}
            className="text-xs font-extrabold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
          >
            {t(UI_STRINGS.cantSpeakNow, uiLang)}
          </button>
        )}
      </div>
    </div>
  );
};
