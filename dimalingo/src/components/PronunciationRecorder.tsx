import React, { useEffect, useRef, useState } from 'react';
import {
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
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
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
  type Phase = 'idle' | 'starting' | 'listening' | 'stopping' | 'recording';
  const [phase, setPhase] = useState<Phase>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<PronunciationEvaluation | null>(null);
  const [micWarning, setMicWarning] = useState<string | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const latestTranscriptRef = useRef('');
  // Invalidates callbacks and pending getUserMedia requests on phrase change/unmount.
  const sessionRef = useRef(0);
  const busyRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearWatchdog = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); timeoutRef.current = null; };
  const isRecording = phase !== 'idle';

  const message = (ar: string, fr: string, en: string) => uiLang === 'ar' ? ar : uiLang === 'fr' ? fr : en;
  const releaseStream = () => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
  };
  const clearRecording = () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setRecordedAudioUrl(null);
  };
  useEffect(() => {
    setPhase('idle');
    setLiveTranscript('');
    setEvaluation(null);
    setMicWarning(null);
    setRecordedAudioUrl(null);
    latestTranscriptRef.current = '';
    return () => {
      clearWatchdog();
      sessionRef.current++;
      busyRef.current = false;
      const rec = recRef.current;
      recRef.current = null;
      if (rec) {
        rec.onstart = null; rec.onresult = null; rec.onerror = null; rec.onend = null;
        try { if (rec.abort) rec.abort(); else rec.stop(); } catch { /* already stopped */ }
      }
      const recorder = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        try { recorder.stop(); } catch { /* already stopped */ }
      }
      releaseStream();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    };
  }, [targetSentence, audioLang]);

  const finalizeEvaluation = (finalText: string) => {
    const clean = finalText.trim();
    if (!clean) return;
    const evalResult = scorePronunciation(clean, targetSentence, [audioText, ...acceptedAnswers]);
    setEvaluation(evalResult);
    onEvaluated(clean, evalResult);
  };

  const errorMessage = (error?: string) => {
    switch (error) {
      case 'not-allowed':
      case 'service-not-allowed':
        return message('المايكروفون أو خدمة التعرف على الكلام ما عندهاش الإذن. سمح بالمايكروفون فإعدادات الموقع والجهاز، وجرب تفتح الرابط مباشرة فـ Chrome أو Safari.', 'Autorisez le microphone et la reconnaissance vocale dans les réglages du site et de l’appareil. Essayez directement dans Chrome ou Safari.', 'Allow microphone and speech recognition access in your site and device settings. Try opening the site directly in Chrome or Safari.');
      case 'audio-capture':
        return message('ما لقيناش المايكروفون أو راه مستعمل من تطبيق آخر. تأكد من المايك وجرب مرة أخرى.', 'Microphone introuvable ou utilisé par une autre application. Vérifiez-le et réessayez.', 'No microphone is available, or another app is using it. Check your microphone and try again.');
      case 'network':
        return message('خدمة التعرف على الصوت ما قدرتش تتصل. تأكد من الإنترنت وجرب مرة أخرى.', 'Le service de reconnaissance vocale est inaccessible. Vérifiez votre connexion et réessayez.', 'The speech recognition service could not connect. Check your internet and try again.');
      case 'language-not-supported':
        return message('المتصفح ما كيدعمش التعرف على هاد اللغة. جرب Chrome أو Safari محدّث.', 'Cette langue n’est pas prise en charge par le navigateur. Essayez Chrome ou Safari à jour.', 'This browser does not support speech recognition for this language. Try an up-to-date Chrome or Safari.');
      case 'no-speech':
        return message('ما سمعنا حتى كلام. سمح بالمايكروفون، قرّب ليه وعاود هضر من بعد ما يظهر «كنسمع ليك».', 'Aucune parole détectée. Autorisez le micro et parlez après le message « Je vous écoute ».', 'No speech was detected. Allow microphone access and speak after the listening message appears.');
      default:
        return message('ما خدمش التعرف على الصوت. جرب مرة أخرى، وتأكد من الإذن والإنترنت أو افتح الموقع فـ Chrome أو Safari.', 'La reconnaissance vocale a échoué. Réessayez, vérifiez les autorisations et la connexion, ou ouvrez le site dans Chrome ou Safari.', 'Speech recognition failed. Retry, check permissions and internet, or open the site in Chrome or Safari.');
    }
  };

  const handleToggleMic = () => {
    if (disabled) return;
    if (busyRef.current) {
      if (recRef.current && phase !== 'stopping') {
        // Results can arrive after stop(); only onend may score them.
        setPhase('stopping');
        const rec = recRef.current;
        clearWatchdog();
        timeoutRef.current = setTimeout(() => {
          if (recRef.current === rec) {
            sessionRef.current++; recRef.current = null; busyRef.current = false; setPhase('idle');
            try { rec.abort?.(); } catch { /* already stopped */ }
            setMicWarning(errorMessage());
          }
        }, 5000);
        try { rec.stop(); } catch { /* watchdog recovers if onend never arrives */ }
      } else if (mediaRecorderRef.current && phase === 'recording') {
        setPhase('idle');
        busyRef.current = false;
        const recorder = mediaRecorderRef.current;
        mediaRecorderRef.current = null;
        try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* already stopped */ }
        releaseStream();
      }
      return;
    }

    const session = ++sessionRef.current;
    busyRef.current = true;
    setPhase('starting');
    setMicWarning(null);
    setLiveTranscript('');
    setEvaluation(null);
    latestTranscriptRef.current = '';
    clearRecording();
    // Prevent the prompt or its delayed speech from being transcribed as the answer.
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      // Recording is only a listen-back fallback, not speech recognition or a score.
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        busyRef.current = false; setPhase('idle');
        setMicWarning(message('هاد المتصفح ما كيدعمش التعرف على الصوت. فتح الموقع مباشرة فـ Chrome على Android أو Safari على iPhone، وسمح بالمايكروفون.', 'Ce navigateur ne prend pas en charge la reconnaissance vocale. Ouvrez le site dans Chrome sur Android ou Safari sur iPhone et autorisez le micro.', 'This browser does not support speech recognition. Open the site in Chrome on Android or Safari on iPhone and allow the microphone.'));
        return;
      }
      setMicWarning(message('هاد المتصفح ما كيدعمش التعرف التلقائي. إلا سمحتي بالمايك، التسجيل غادي يكون للاستماع فقط. للتقييم افتح الموقع فـ Chrome أو Safari.', 'La reconnaissance vocale est indisponible : si vous autorisez le micro, l’enregistrement servira uniquement à l’écoute. Pour l’évaluation, utilisez Chrome ou Safari.', 'Speech recognition is unavailable here. If you allow microphone access, recording is for playback only. For scoring, use Chrome or Safari.'));
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        if (session !== sessionRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
        mediaStreamRef.current = stream;
        try {
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          const chunks: BlobPart[] = [];
          recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
          recorder.onstop = () => {
            if (session !== sessionRef.current || !chunks.length) return;
            const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = url;
            setRecordedAudioUrl(url);
          };
          recorder.start();
          setPhase('recording');
          setMicWarning(message('المتصفح ما كيدعمش التعرف التلقائي على الكلام. يمكن لك تسجّل وتسمع صوتك فقط؛ للتقييم افتح الموقع فـ Chrome أو Safari.', 'La reconnaissance automatique est indisponible : vous pouvez seulement enregistrer et écouter. Pour l’évaluation, ouvrez le site dans Chrome ou Safari.', 'Automatic recognition is unavailable here: you can only record and listen back. For scoring, open the site in Chrome or Safari.'));
        } catch {
          releaseStream(); mediaRecorderRef.current = null; busyRef.current = false; setPhase('idle'); setMicWarning(errorMessage('audio-capture'));
        }
      }).catch((err: DOMException) => {
        if (session !== sessionRef.current) return;
        busyRef.current = false; setPhase('idle');
        setMicWarning(message('هاد المتصفح ما كيدعمش التعرف التلقائي، والتسجيل ما خدمش. افتح الموقع مباشرة فـ Chrome أو Safari وتأكد من إذن المايكروفون.', 'La reconnaissance vocale est indisponible et l’enregistrement a échoué. Ouvrez le site directement dans Chrome ou Safari et vérifiez l’autorisation du micro.', 'Speech recognition is unavailable and recording failed. Open the site directly in Chrome or Safari and check microphone permissions.') + ' ' + errorMessage(err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'not-allowed' : 'audio-capture'));
      });
      return;
    }

    // SpeechRecognition owns the microphone. A simultaneous getUserMedia capture
    // can compete for it (especially on mobile), so never start one in this mode.
    try {
      const rec = new SpeechRec();
      recRef.current = rec;
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      rec.lang = isIOS && audioLang === 'ar-MA' ? 'ar-SA' : audioLang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      let failed = false;
      rec.onstart = () => { if (session === sessionRef.current) { clearWatchdog(); setPhase('listening'); } };
      rec.onresult = event => {
        if (session !== sessionRef.current) return;
        const text = Array.from(event.results, result => result[0]?.transcript || '').join(' ').trim();
        latestTranscriptRef.current = text;
        setLiveTranscript(text);
      };
      rec.onerror = event => {
        if (session !== sessionRef.current) return;
        failed = true;
        clearWatchdog();
        sessionRef.current++;
        recRef.current = null;
        busyRef.current = false;
        setPhase('idle');
        setMicWarning(errorMessage(event.error));
        try { rec.abort?.(); } catch { /* already stopped */ }
      };
      rec.onend = () => {
        if (session !== sessionRef.current || recRef.current !== rec) return;
        clearWatchdog();
        recRef.current = null;
        busyRef.current = false;
        setPhase('idle');
        if (!failed && latestTranscriptRef.current) finalizeEvaluation(latestTranscriptRef.current);
        else if (!failed) setMicWarning(errorMessage('no-speech'));
      };
      // Keep start in the original user gesture, as required by mobile browsers.
      timeoutRef.current = setTimeout(() => {
        if (session !== sessionRef.current || recRef.current !== rec) return;
        sessionRef.current++; recRef.current = null; busyRef.current = false; setPhase('idle');
        try { rec.abort?.(); } catch { /* already stopped */ }
        setMicWarning(errorMessage());
      }, 15000);
      rec.start();
    } catch {
      clearWatchdog(); recRef.current = null; busyRef.current = false; setPhase('idle'); setMicWarning(errorMessage());
    }
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
              disabled={isRecording}
              onClick={() => sound.speak(audioText, audioLang, false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-duo-blue border-b-4 border-duo-blueDark text-white text-xs font-black active:translate-y-0.5"
            >
              <Volume2 className="w-4 h-4" />
              {t(UI_STRINGS.listenNormal, uiLang)}
            </button>
            <button
              type="button"
              disabled={isRecording}
              onClick={() => sound.speak(audioText, audioLang, true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-duo-nightCard border-2 border-b-4 border-slate-300 dark:border-duo-nightBorder text-slate-700 dark:text-slate-200 text-xs font-black active:translate-y-0.5"
            >
              <Turtle className="w-4 h-4 text-duo-green" />
              {t(UI_STRINGS.listenSlow, uiLang)}
            </button>
          </div>
        </div>

        {/* Interactive Word-by-Word Chips (Click any word to hear it individually!) */}
        <div dir={audioLang.startsWith('ar') ? 'rtl' : 'ltr'} className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {evaluation
            ? evaluation.wordResults.map((wr, idx) => (
                <button
                  key={`${wr.word}-${idx}`}
                  type="button"
                  disabled={isRecording}
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
                  disabled={isRecording}
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
          <p role="status" aria-live="polite" className="text-sm font-bold text-rose-700 dark:text-rose-300 text-center">
            {phase === 'starting' ? message('كنطلب إذن المايكروفون…', 'Demande d’accès au microphone…', 'Requesting microphone access…') : phase === 'stopping' ? message('كنحلّل الكلام…', 'Analyse en cours…', 'Processing speech…') : phase === 'recording' ? message('كنسجّل الصوت للاستماع فقط.', 'Enregistrement pour écoute uniquement.', 'Recording for playback only.') : message('كنسمع ليك، هضر دابا بوضوح.', 'Je vous écoute, parlez clairement.', 'Listening — speak clearly now.')}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={disabled || phase === 'stopping' || phase === 'starting'}
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
                  ? (phase === 'recording' ? 'إيقاف التسجيل' : 'إيقاف وتحليل النطق')
                  : uiLang === 'fr'
                  ? (phase === 'recording' ? 'Arrêter l’enregistrement' : 'Arrêter & analyser')
                  : (phase === 'recording' ? 'Stop recording' : 'Stop & analyze')}
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
                    ? `تطابق الكلام المتعرّف عليه: ${evaluation.score}%`
                    : uiLang === 'fr'
                    ? `Correspondance du texte reconnu : ${evaluation.score}%`
                    : `Recognized text match: ${evaluation.score}%`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Helpful Iframe / Browser Mic Permission Banner */}
        {micWarning && (
          <div role="alert" className="w-full max-w-lg p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold text-center space-y-2">
            <p>{micWarning}</p>
            <a
              href={window.location.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-200/80 dark:bg-amber-800 text-amber-950 dark:text-amber-100 font-black hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {uiLang === 'ar'
                ? 'فتح الموقع فصفحة مستقلة'
                : uiLang === 'fr' ? 'Ouvrir dans un nouvel onglet' : 'Open in a new tab'}
            </a>
            <p dir="ltr" className="break-all font-normal">{window.location.origin}</p>
          </div>
        )}

        {onSkipMic && !disabled && (
          <button
            type="button"
            onClick={onSkipMic}
            className="text-xs font-extrabold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
          >
            {message('تخطي التمرين بلا تقييم الصوت', 'Passer sans évaluation vocale', 'Skip without speech evaluation')}
          </button>
        )}
      </div>
    </div>
  );
};
