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
  audioText: string;
  audioLang: string;
  speechLang?: string;
  acceptedAnswers?: string[];
  uiLang: UILang;
  disabled?: boolean;
  onEvaluated: (transcript: string, evaluation: PronunciationEvaluation) => void;
  onSkipMic?: () => void;
}

function isIOSDevice(): boolean {
  return typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
}

function isIOSHomeScreen(): boolean {
  if (typeof window === 'undefined') return false;
  // The installed configuration profile explicitly supplies this flag. Some
  // WebClips do not report navigator.standalone or display-mode reliably.
  if (new URLSearchParams(window.location.search).get('standalone') === 'ios') return true;
  if (!isIOSDevice()) return false;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
}

export const PronunciationRecorder: React.FC<PronunciationRecorderProps> = ({
  targetSentence,
  audioText,
  audioLang,
  speechLang,
  acceptedAnswers = [],
  uiLang,
  disabled = false,
  onEvaluated,
  onSkipMic,
}) => {
  type Phase = 'idle' | 'starting' | 'listening' | 'stopping' | 'recording' | 'local-recording' | 'local-processing';
  const [phase, setPhase] = useState<Phase>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<PronunciationEvaluation | null>(null);
  const [micWarning, setMicWarning] = useState<string | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [dictationAvailable, setDictationAvailable] = useState(false);
  // A failed browser service should not send the next attempt back to it.
  const [preferLocal, setPreferLocal] = useState(() => {
    if (isIOSDevice() || isIOSHomeScreen()) return true;
    try { return window.sessionStorage.getItem('dimalingo-local-mic') === '1'; } catch { return false; }
  });
  const useLocalFromNowOn = () => {
    setPreferLocal(true);
    try { window.sessionStorage.setItem('dimalingo-local-mic', '1'); } catch { /* storage can be unavailable */ }
  };
  const [dictationText, setDictationText] = useState('');
  const [evaluationSource, setEvaluationSource] = useState<'speech' | 'dictation'>('speech');
  const dictationRef = useRef<HTMLTextAreaElement | null>(null);
  const iosHomeScreen = isIOSHomeScreen();
  const showDictation = iosHomeScreen || dictationAvailable;
  const showLocalOption = !preferLocal;
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const localWorkerRef = useRef<Worker | null>(null);
  const [localStatus, setLocalStatus] = useState('');
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
    setDictationAvailable(false);
    setDictationText('');
    setEvaluationSource('speech');
    latestTranscriptRef.current = '';
    return () => {
      clearWatchdog();
      localWorkerRef.current?.terminate(); localWorkerRef.current = null;
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
  }, [targetSentence, audioLang, speechLang]);

  const finalizeEvaluation = (finalText: string) => {
    const clean = finalText.trim();
    if (!clean) return;
    const evalResult = scorePronunciation(clean, targetSentence, [audioText, ...acceptedAnswers]);
    setEvaluation(evalResult);
    onEvaluated(clean, evalResult);
  };

  const errorMessage = (error?: string) => {
    switch (error) {
      case 'service-not-allowed':
        return message('خدمة المتصفح ما متوفراش. اضغط على زر المايك المحلي باش تسجل وتوافق على تحميل النموذج.', 'Le service vocal du navigateur est indisponible. Touchez le micro local pour enregistrer et accepter le téléchargement.', 'The browser speech service is unavailable. Tap the local microphone to record and allow the model download.');
      case 'not-allowed':
        if (iosHomeScreen) return message('التعرف المباشر ممكن ما يخدمش فتطبيق الآيفون حتى إلا كان المايك مسموح. استعمل إملاء لوحة المفاتيح أو جرّب Safari.', 'La reconnaissance directe peut être indisponible dans l’app iPhone même si le micro est autorisé. Utilisez la dictée du clavier ou essayez Safari.', 'Direct recognition may be unavailable in the iPhone app even with microphone permission. Use keyboard dictation or try Safari.');
        return message('خدمة التعرف المباشر ترفضات، وماشي بالضرورة إذن المايك. جرب زر المايك المحلي؛ إلا ترفض حتى هو، سمح بالمايك فإعدادات الجهاز والموقع.', 'La reconnaissance directe a été refusée, pas forcément le microphone. Essayez le bouton du micro local ; si son accès est refusé, autorisez le micro dans les réglages.', 'Direct speech recognition was denied, not necessarily microphone access. Try the local microphone button; if its access is denied, allow the microphone in your device and site settings.');
      case 'audio-capture':
        return message('ما لقيناش المايكروفون أو راه مستعمل من تطبيق آخر. تأكد من المايك وجرب مرة أخرى.', 'Microphone introuvable ou utilisé par une autre application. Vérifiez-le et réessayez.', 'No microphone is available, or another app is using it. Check your microphone and try again.');
      case 'network':
        return message('خدمة المتصفح ما قدرتش تتصل. اضغط على زر المايك المحلي باش تسجل وتوافق على تحميل النموذج.', 'Le service vocal du navigateur est inaccessible. Touchez le micro local pour enregistrer et accepter le téléchargement.', 'The browser speech service could not connect. Tap the local microphone to record and allow the model download.');
      case 'language-not-supported':
        return message('المتصفح ما كيدعمش التعرف على هاد اللغة. جرب Chrome أو Safari محدّث.', 'Cette langue n’est pas prise en charge par le navigateur. Essayez Chrome ou Safari à jour.', 'This browser does not support speech recognition for this language. Try an up-to-date Chrome or Safari.');
      case 'no-speech':
        return message('ما سمعنا حتى كلام. سمح بالمايكروفون، قرّب ليه وعاود هضر من بعد ما يظهر «كنسمع ليك».', 'Aucune parole détectée. Autorisez le micro et parlez après le message « Je vous écoute ».', 'No speech was detected. Allow microphone access and speak after the listening message appears.');
      default:
        return message('ما خدمش التعرف على الصوت. جرب مرة أخرى، وتأكد من الإذن والإنترنت أو افتح الموقع فـ Chrome أو Safari.', 'La reconnaissance vocale a échoué. Réessayez, vérifiez les autorisations et la connexion, ou ouvrez le site dans Chrome ou Safari.', 'Speech recognition failed. Retry, check permissions and internet, or open the site in Chrome or Safari.');
    }
  };

  // Home Screen WebClips may not expose Web Speech; record locally and use a
  // separate on-device model instead. A new worker per attempt permits cancellation.
  const startLocalMic = async () => {
    if (disabled || busyRef.current) return;
    useLocalFromNowOn();
    const session = ++sessionRef.current;
    busyRef.current = true;
    setPhase('starting'); setMicWarning(null); setLiveTranscript(''); setEvaluation(null);
    setEvaluationSource('speech'); clearRecording();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined' || typeof Worker === 'undefined') {
      busyRef.current = false; setPhase('idle'); setDictationAvailable(true);
      setMicWarning(message('هاد الجهاز ما كيدعمش التسجيل المحلي. استعمل إملاء لوحة المفاتيح.', 'Cet appareil ne prend pas en charge l’enregistrement local. Utilisez la dictée du clavier.', 'Local recording is not supported on this device. Use keyboard dictation.'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (session !== sessionRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        if (session !== sessionRef.current) return;
        clearWatchdog(); sessionRef.current++; releaseStream(); mediaRecorderRef.current = null;
        busyRef.current = false; setPhase('idle'); setMicWarning(errorMessage('audio-capture'));
      };
      recorder.onstop = async () => {
        if (session !== sessionRef.current) return;
        clearWatchdog(); releaseStream(); mediaRecorderRef.current = null;
        setPhase('local-processing');
        setLocalStatus(message('كنوجد الصوت…', 'Préparation de l’audio…', 'Preparing audio…'));
        try {
          if (!chunks.length) throw new Error('empty');
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const context = new AudioContext();
          let buffer: AudioBuffer;
          try { buffer = await context.decodeAudioData(await blob.arrayBuffer()); }
          finally { await context.close(); }
          if (session !== sessionRef.current) return;
          const source = buffer.getChannelData(0);
          // Whisper expects mono PCM at 16 kHz. Linear interpolation is sufficient
          // for the short speech exercises and avoids a second recording stream.
          const samples = new Float32Array(Math.floor(source.length * 16000 / buffer.sampleRate));
          let peak = 0;
          for (let i = 0; i < samples.length; i++) {
            const position = i * buffer.sampleRate / 16000;
            const left = Math.floor(position), mix = position - left;
            samples[i] = source[left] * (1 - mix) + (source[Math.min(left + 1, source.length - 1)] || 0) * mix;
            peak = Math.max(peak, Math.abs(samples[i]));
          }
          if (samples.length < 4000 || peak < 0.002) throw new Error('silent');
          const worker = new Worker(new URL('../workers/localSpeech.ts', import.meta.url), { type: 'module' });
          localWorkerRef.current = worker;
          const fail = () => {
            if (session !== sessionRef.current) return;
            clearWatchdog(); worker.terminate(); localWorkerRef.current = null;
            busyRef.current = false; setPhase('idle'); setDictationAvailable(true);
            setMicWarning(message('ما قدرناش نحمّلو أو نشغّلو التعرف المحلي. تأكد من الإنترنت والمساحة، وعاود المحاولة أو استعمل إملاء لوحة المفاتيح.', 'Impossible de télécharger ou lancer la reconnaissance locale. Vérifiez la connexion et l’espace, réessayez ou utilisez la dictée du clavier.', 'Could not download or run local recognition. Check your connection and storage, retry, or use keyboard dictation.'));
          };
          worker.onerror = fail;
          worker.onmessage = event => {
            if (session !== sessionRef.current) return;
            const data = event.data;
            if (data.status === 'loading' || data.status === 'progress') setLocalStatus(message('كنحمّلو نموذج الصوت لأول مرة…', 'Téléchargement du modèle vocal…', 'Downloading the speech model…'));
            else if (data.status === 'transcribing') setLocalStatus(message('كنحوّلو الصوت لنص على الجهاز…', 'Transcription sur l’appareil…', 'Transcribing on your device…'));
            else if (data.status === 'error') fail();
            else if (data.status === 'done') {
              clearWatchdog(); worker.terminate(); localWorkerRef.current = null;
              busyRef.current = false; setPhase('idle');
              const text = typeof data.text === 'string' ? data.text.trim() : '';
              if (!text) setMicWarning(errorMessage('no-speech'));
              else { setLiveTranscript(text); finalizeEvaluation(text); }
            }
          };
          timeoutRef.current = setTimeout(fail, 240000);
          const lang = (speechLang || audioLang).split('-')[0].toLowerCase();
          worker.postMessage({ audio: samples, language: ['ar', 'fr', 'en', 'es'].includes(lang) ? lang : 'ar' }, [samples.buffer]);
        } catch (error) {
          if (session !== sessionRef.current) return;
          busyRef.current = false; setPhase('idle'); setDictationAvailable(true);
          setMicWarning(error instanceof Error && error.message === 'silent' ? errorMessage('no-speech') : message('ما قدرناش نقراو التسجيل. عاود المحاولة أو استعمل إملاء لوحة المفاتيح.', 'Impossible de lire l’enregistrement. Réessayez ou utilisez la dictée du clavier.', 'Could not decode the recording. Retry or use keyboard dictation.'));
        }
      };
      recorder.start(); setPhase('local-recording');
      timeoutRef.current = setTimeout(() => { if (session === sessionRef.current && recorder.state !== 'inactive') recorder.stop(); }, 15000);
    } catch (error) {
      if (session !== sessionRef.current) return;
      releaseStream(); mediaRecorderRef.current = null; busyRef.current = false; setPhase('idle'); setDictationAvailable(true);
      setMicWarning(error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError') ? message('ما عندناش إذن المايكروفون. سمح ليه من إعدادات التطبيق أو الموقع فالجهاز وعاود المحاولة.', 'Accès au micro refusé. Autorisez-le dans les réglages de l’application ou du site sur votre appareil, puis réessayez.', 'Microphone access was denied. Allow it in your device’s app or site settings and try again.') : errorMessage('audio-capture'));
    }
  };

  const handleToggleMic = () => {
    if (disabled) return;
    if (busyRef.current) {
      if (phase === 'local-processing') {
        sessionRef.current++; clearWatchdog(); localWorkerRef.current?.terminate(); localWorkerRef.current = null;
        const recorder = mediaRecorderRef.current; mediaRecorderRef.current = null;
        if (recorder) { recorder.onstop = null; try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* already stopped */ } }
        releaseStream(); busyRef.current = false; setPhase('idle');
      } else if (phase === 'local-recording' && mediaRecorderRef.current) {
        setPhase('local-processing'); clearWatchdog();
        try { mediaRecorderRef.current.stop(); } catch { releaseStream(); busyRef.current = false; setPhase('idle'); setMicWarning(errorMessage('audio-capture')); }
      } else if (recRef.current && phase !== 'stopping') {
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

    if (preferLocal) { void startLocalMic(); return; }
    const session = ++sessionRef.current;
    busyRef.current = true;
    setPhase('starting');
    setMicWarning(null);
    setLiveTranscript('');
    setEvaluation(null);
    setEvaluationSource('speech');
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
      busyRef.current = false; setPhase('idle');
      useLocalFromNowOn();
      setMicWarning(message('خدمة المتصفح غير متوفرة. اضغط على زر المايك المحلي باش تسجل وتوافق على تحميل النموذج.', 'La reconnaissance du navigateur est indisponible. Touchez le micro local pour enregistrer et accepter le téléchargement.', 'Browser speech recognition is unavailable. Tap the local microphone to record and allow the model download.'));
      return;
    }

    // SpeechRecognition owns the microphone. A simultaneous getUserMedia capture
    // can compete for it (especially on mobile), so never start one in this mode.
    try {
      const rec = new SpeechRec();
      recRef.current = rec;
      const isIOS = isIOSDevice();
      const recognitionLang = speechLang || audioLang;
      rec.lang = isIOS && recognitionLang === 'ar-MA' ? 'ar-SA' : recognitionLang;
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
        useLocalFromNowOn();
        if (isIOSDevice()) setDictationAvailable(true);
        try { rec.abort?.(); } catch { /* already stopped */ }
      };
      rec.onend = () => {
        if (session !== sessionRef.current || recRef.current !== rec) return;
        clearWatchdog();
        recRef.current = null;
        busyRef.current = false;
        setPhase('idle');
        if (!failed && latestTranscriptRef.current) finalizeEvaluation(latestTranscriptRef.current);
        else if (!failed) { setMicWarning(errorMessage('no-speech')); if (isIOSDevice()) setDictationAvailable(true); }
      };
      // Keep start in the original user gesture, as required by mobile browsers.
      timeoutRef.current = setTimeout(() => {
        if (session !== sessionRef.current || recRef.current !== rec) return;
        sessionRef.current++; recRef.current = null; busyRef.current = false; setPhase('idle');
        try { rec.abort?.(); } catch { /* already stopped */ }
        setMicWarning(errorMessage());
        useLocalFromNowOn();
        if (isIOSDevice()) setDictationAvailable(true);
      }, 15000);
      rec.start();
    } catch {
      clearWatchdog(); recRef.current = null; busyRef.current = false; setPhase('idle'); setMicWarning(errorMessage()); useLocalFromNowOn(); if (isIOSDevice()) setDictationAvailable(true);
    }
  };

  const checkDictation = () => {
    const text = dictationText.trim();
    if (!text || disabled || isRecording) return;
    setEvaluationSource('dictation');
    setMicWarning(null);
    setLiveTranscript(text);
    finalizeEvaluation(text);
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
              ? 'اسمع الجملة وعاود انطق كل كلمة:'
              : uiLang === 'fr'
              ? 'Écoutez le modèle puis répétez chaque mot :'
              : 'Listen to the sentence and repeat each word:'}
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


      </div>

      {/* iOS Home Screen Web Apps may expose SpeechRecognition but reject it.
          Keyboard dictation is an explicit text-comparison alternative. */}
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{message('المايك المحلي كيستعمل نموذج مجاني على الجهاز. أول استعمال كيتحمّل تقريباً 70 ميغا أو أكثر بالإنترنت؛ ممكن ياخذ وقت، والتخزين المؤقت ماشي مضمون. الصوت ما كيتصيفطش للسيرفر، والنتيجة مقارنة النص فقط، ماشي تقييم دقة النطق. الدارجة ممكن ما تتعرفش مزيان.', 'Le micro local utilise un modèle gratuit sur l’appareil. Au premier usage, environ 70 Mo ou plus sont téléchargés ; cela peut prendre du temps et le cache n’est pas garanti. L’audio n’est pas envoyé au serveur. Le score compare le texte, pas la prononciation ; la darija peut être mal reconnue.', 'The local microphone uses a free on-device model. First use downloads around 70 MB or more and may take time; caching is not guaranteed. Audio is not sent to a server. The score compares text, not pronunciation; Darija may be inaccurate.')}</p>
      {showDictation && (
        <details className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-200 dark:border-sky-800 space-y-3">
          <summary className="font-black text-sky-900 dark:text-sky-100 cursor-pointer">🎙️ {message('الإملاء بلوحة مفاتيح الآيفون', 'Dictée avec le clavier iPhone', 'Dictation with the iPhone keyboard')}</summary>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{message('1. اضغط على الخانة. 2. اختار لغة الجملة من لوحة المفاتيح واضغط على المايك ديالها 🎙️. 3. قول الجملة، وقف الإملاء، ثم اضغط «تحقق من النص».', '1. Touchez le champ. 2. Choisissez la langue de la phrase sur le clavier et touchez son micro 🎙️. 3. Dictez, arrêtez la dictée, puis touchez « Vérifier le texte ».', '1. Tap the text box. 2. Select the sentence language on the keyboard and tap its microphone 🎙️. 3. Speak, stop dictation, then tap “Check text”.')}</p>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{message('إلا ما بانش المايك فاللوحة، فعّل الإملاء من إعدادات iPhone ← عام ← لوحة المفاتيح. هاد الطريقة كتقارن النص فقط، ما كتقيّمش النطق مباشرة.', 'Si le micro du clavier est absent, activez Dictée dans Réglages iPhone → Général → Clavier. Cette méthode compare uniquement le texte, pas la prononciation.', 'If the keyboard microphone is missing, enable Dictation in iPhone Settings → General → Keyboard. This compares text only; it does not measure pronunciation.')}</p>
          <label htmlFor="ios-dictation-text" className="block text-sm font-black text-slate-800 dark:text-slate-100">{message('النص من الإملاء أو الكتابة:', 'Texte dicté ou saisi :', 'Dictated or typed text:')}</label>
          <textarea id="ios-dictation-text" ref={dictationRef} value={dictationText} onChange={e => setDictationText(e.target.value)} disabled={disabled || isRecording} lang={speechLang || audioLang} dir="auto" rows={2} placeholder={message('اضغط هنا ثم استعمل مايك لوحة المفاتيح', 'Touchez ici puis utilisez le micro du clavier', 'Tap here, then use the keyboard microphone')} className="w-full p-3 rounded-xl bg-white dark:bg-duo-nightCard border-2 border-slate-300 dark:border-duo-nightBorder text-slate-900 dark:text-white text-base" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={disabled || isRecording} onClick={() => dictationRef.current?.focus()} className="px-4 py-2.5 rounded-xl bg-duo-blue border-b-4 border-duo-blueDark text-white font-black text-sm">{message('فتح لوحة المفاتيح', 'Ouvrir le clavier', 'Open keyboard')}</button>
            <button type="button" disabled={disabled || isRecording || !dictationText.trim()} onClick={checkDictation} className="px-4 py-2.5 rounded-xl bg-duo-green border-b-4 border-duo-greenDark text-white font-black text-sm disabled:opacity-50">{message('تحقق من النص', 'Vérifier le texte', 'Check text')}</button>
          </div>
        </details>
      )}

      {/* Direct recognition when supported. */}
      <div className="flex flex-col items-center gap-3">
        {isRecording && (
          <p role="status" aria-live="polite" className="text-sm font-bold text-rose-700 dark:text-rose-300 text-center">
            {phase === 'local-processing' ? localStatus : phase === 'local-recording' ? message('كنسجّل دابا، هضر بوضوح ثم وقف. الحد الأقصى 15 ثانية.', 'Enregistrement : parlez clairement puis arrêtez. Maximum 15 secondes.', 'Recording: speak clearly, then stop. Maximum 15 seconds.') : phase === 'starting' ? message('كنطلب إذن المايكروفون…', 'Demande d’accès au microphone…', 'Requesting microphone access…') : phase === 'stopping' ? message('كنحلّل الكلام…', 'Analyse en cours…', 'Processing speech…') : phase === 'recording' ? message('كنسجّل الصوت للاستماع فقط.', 'Enregistrement pour écoute uniquement.', 'Recording for playback only.') : message('كنسمع ليك، هضر دابا بوضوح.', 'Je vous écoute, parlez clairement.', 'Listening — speak clearly now.')}
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
                {phase === 'local-processing' ? message('إلغاء', 'Annuler', 'Cancel') : phase === 'local-recording' ? message('وقف وحلّل', 'Arrêter et transcrire', 'Stop and transcribe') : uiLang === 'ar'
                  ? (phase === 'recording' ? 'إيقاف التسجيل' : 'إيقاف وتحليل النطق')
                  : uiLang === 'fr'
                  ? (phase === 'recording' ? 'Arrêter l’enregistrement' : 'Arrêter & analyser')
                  : (phase === 'recording' ? 'Stop recording' : 'Stop & analyze')}
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                {preferLocal ? message('هضر بالمايك ووافق على تحميل النموذج', 'Parler au micro et accepter le téléchargement', 'Speak into mic and allow model download') : t(UI_STRINGS.tapToSpeak, uiLang)}
              </>
            )}
          </button>

          {showLocalOption && !isRecording && (
            <button type="button" disabled={disabled} onClick={() => void startLocalMic()}
              className="px-5 py-3 rounded-2xl border-2 border-duo-blue text-duo-blue font-black disabled:opacity-50">
              <Mic className="inline w-5 h-5 mr-2" />
              {message('جرّب المايك المحلي ووافق على تحميل النموذج', 'Essayer le micro local et accepter le téléchargement', 'Try local microphone and allow model download')}
            </button>
          )}

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
                {evaluationSource === 'dictation' ? '📝' : '🎙️'} &ldquo;{liveTranscript}&rdquo;
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
                    ? evaluationSource === 'dictation' ? `تطابق النص: ${evaluation.score}%` : `تطابق الكلام المتعرّف عليه: ${evaluation.score}%`
                    : uiLang === 'fr'
                    ? evaluationSource === 'dictation' ? `Correspondance du texte : ${evaluation.score}%` : `Correspondance du texte reconnu : ${evaluation.score}%`
                    : evaluationSource === 'dictation' ? `Text match: ${evaluation.score}%` : `Recognized text match: ${evaluation.score}%`}
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
