import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Flame,
  Heart,
  Infinity as InfinityIcon,
  Lightbulb,
  Moon,
  Sparkles,
  Sun,
  Trophy,
  Turtle,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { COURSE_MAP } from '../data';
import { t, UI_STRINGS } from '../i18n';
import { CourseId, Exercise, MascotOutfit, UILang } from '../types';
import { sound } from '../utils/sound';
import { ZikoMascot } from './ZikoMascot';
import { PronunciationRecorder } from './PronunciationRecorder';

interface LessonPlayerProps {
  courseId: CourseId;
  sessionTitle: string;
  exercises: Exercise[];
  xpReward: number;
  gemReward: number;
  isLegendary?: boolean;
  isPractice?: boolean;
  uiLang: UILang;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  unlimitedHearts: boolean;
  hearts: number;
  xpBoostActive: boolean;
  outfit: MascotOutfit;
  onRecordExercise: (params: {
    courseId: CourseId;
    exercise: Exercise;
    correct: boolean;
  }) => void;
  onLoseHeart: () => void;
  onRefillHeartsFree: () => void;
  onCompleteSession: (summary: {
    accuracy: number;
    baseXp: number;
    gemsEarned: number;
  }) => void;
  onExit: () => void;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({
  courseId,
  sessionTitle,
  exercises,
  xpReward,
  gemReward,
  isLegendary,
  uiLang,
  darkMode,
  onToggleDarkMode,
  unlimitedHearts,
  hearts,
  xpBoostActive,
  outfit,
  onRecordExercise,
  onLoseHeart,
  onRefillHeartsFree,
  onCompleteSession,
  onExit,
}) => {
  const course = COURSE_MAP[courseId];
  const [queue, setQueue] = useState<Exercise[]>(() =>
    exercises.length > 1 ? shuffleArray(exercises) : [...exercises]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedTokenIndices, setSelectedTokenIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [selectedLeftPair, setSelectedLeftPair] = useState<string | null>(null);
  const [selectedRightPair, setSelectedRightPair] = useState<string | null>(null);
  const [pairWrongFlash, setPairWrongFlash] = useState(false);

  const [status, setStatus] = useState<'answering' | 'correct' | 'wrong'>('answering');
  const [showExplain, setShowExplain] = useState(false);
  const [combo, setCombo] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [completedScreen, setCompletedScreen] = useState(false);

  const currentExercise = queue[currentIndex];
  const initialCount = exercises.length;

  useEffect(() => {
    setSelectedOption(null);
    setSelectedTokenIndices([]);
    setMatchedPairIds([]);
    setSelectedLeftPair(null);
    setSelectedRightPair(null);
    setStatus('answering');
    setShowExplain(false);

    if (
      currentExercise &&
      currentExercise.targetText &&
      (currentExercise.type === 'select_meaning' ||
        currentExercise.type === 'listening' ||
        currentExercise.type === 'speaking')
    ) {
      const timer = setTimeout(() => {
        sound.speak(
          currentExercise.targetText!,
          currentExercise.ttsLang || course.ttsLang
        );
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentExercise, course.ttsLang]);

  const shuffledOptions = useMemo(() => {
    if (!currentExercise?.options) return [];
    return shuffleArray(currentExercise.options);
  }, [currentExercise]);

  const resolvedBankTokens = useMemo(() => {
    if (!currentExercise?.wordBankTokens) return [];
    const raw = Array.isArray(currentExercise.wordBankTokens)
      ? currentExercise.wordBankTokens
      : (
          currentExercise.wordBankTokens[uiLang] ||
          currentExercise.wordBankTokens.en
        ).split('|');
    return shuffleArray(raw.map((tok, i) => ({ id: i, text: tok })));
  }, [currentExercise, uiLang]);

  const shuffledRightPairs = useMemo(() => {
    if (!currentExercise?.pairs) return [];
    return shuffleArray(currentExercise.pairs);
  }, [currentExercise]);

  if (!currentExercise) return null;

  const handlePairClick = (side: 'left' | 'right', pairId: string, ttsText?: string) => {
    if (status !== 'answering' || matchedPairIds.includes(pairId)) return;
    sound.playTap();
    if (ttsText) {
      sound.speak(ttsText, currentExercise.ttsLang || course.ttsLang);
    }

    const nextLeft = side === 'left' ? pairId : selectedLeftPair;
    const nextRight = side === 'right' ? pairId : selectedRightPair;

    if (side === 'left') setSelectedLeftPair(pairId);
    else setSelectedRightPair(pairId);

    if (nextLeft && nextRight) {
      if (nextLeft === nextRight) {
        sound.playCorrect();
        const updated = [...matchedPairIds, nextLeft];
        setMatchedPairIds(updated);
        setSelectedLeftPair(null);
        setSelectedRightPair(null);

        if (currentExercise.pairs && updated.length === currentExercise.pairs.length) {
          finalizeAnswer(true);
        }
      } else {
        sound.playWrong();
        setPairWrongFlash(true);
        setTimeout(() => {
          setSelectedLeftPair(null);
          setSelectedRightPair(null);
          setPairWrongFlash(false);
        }, 420);
      }
    }
  };

  const finalizeAnswer = (isCorrect: boolean) => {
    const isFirstAttempt = !seenIds.has(currentExercise.id);
    if (isFirstAttempt) {
      setSeenIds((prev) => new Set(prev).add(currentExercise.id));
      if (isCorrect) setFirstTryCorrect((c) => c + 1);
    }

    onRecordExercise({
      courseId,
      exercise: currentExercise,
      correct: isCorrect,
    });

    if (isCorrect) {
      sound.playCorrect();
      setStatus('correct');
      setCombo((c) => c + 1);
    } else {
      sound.playWrong();
      setStatus('wrong');
      setCombo(0);
      onLoseHeart();
      setQueue((prev) => [...prev, currentExercise]);
    }
  };

  const handleCheck = () => {
    if (status !== 'answering') return;

    if (
      currentExercise.type === 'select_meaning' ||
      currentExercise.type === 'reverse_select' ||
      currentExercise.type === 'listening' ||
      currentExercise.type === 'fill_blank'
    ) {
      if (!selectedOption) return;
      const isRight = selectedOption === currentExercise.correctAnswer;
      finalizeAnswer(isRight);
      return;
    }

    if (currentExercise.type === 'word_bank') {
      if (selectedTokenIndices.length === 0) return;
      const userBuilt = selectedTokenIndices
        .map((idx) => resolvedBankTokens.find((item) => item.id === idx)?.text || '')
        .join(' ')
        .trim();

      const expectedArr = Array.isArray(currentExercise.correctTokenSequence)
        ? currentExercise.correctTokenSequence
        : (
            currentExercise.correctTokenSequence?.[uiLang] ||
            currentExercise.correctTokenSequence?.en ||
            ''
          ).split('|');
      const expected = expectedArr.join(' ').trim();

      finalizeAnswer(userBuilt.toLowerCase() === expected.toLowerCase());
    }
  };

  const handleContinue = () => {
    if (currentIndex + 1 >= queue.length) {
      sound.playVictory();
      const accuracy = Math.round(
        (firstTryCorrect / Math.max(1, initialCount)) * 100
      );
      onCompleteSession({
        accuracy,
        baseXp: xpReward,
        gemsEarned: gemReward,
      });
      setCompletedScreen(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (completedScreen) {
    const accuracy = Math.round(
      (firstTryCorrect / Math.max(1, initialCount)) * 100
    );
    const earnedXp = xpBoostActive ? xpReward * 2 : xpReward;

    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-sky-50 dark:from-duo-nightBg dark:via-duo-nightCard dark:to-duo-nightBg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-7 text-center space-y-6 shadow-xl animate-pop">
          <div className="flex justify-center">
            <ZikoMascot mood="celebrating" outfit={outfit} size={135} />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-black">
              <Trophy className="w-3.5 h-3.5" />
              {isLegendary ? 'LEGENDARY CROWN UNLOCKED!' : 'SESSION COMPLETE!'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
              {uiLang === 'ar'
                ? 'تبارك الله عليك! كملتي الحصة بنجاح 🎉'
                : uiLang === 'fr'
                ? 'Félicitations ! Session terminée 🎉'
                : 'Awesome! Session Complete 🎉'}
            </h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {sessionTitle}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-duo-gold p-3">
              <div className="text-[11px] font-black text-amber-700 dark:text-amber-300">XP</div>
              <div className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5">
                +{earnedXp}
              </div>
            </div>
            <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/60 border-2 border-duo-blue p-3">
              <div className="text-[11px] font-black text-sky-700 dark:text-sky-300">GEMS</div>
              <div className="text-xl font-black text-sky-900 dark:text-sky-200 mt-0.5">
                +{gemReward} 💎
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-duo-green p-3">
              <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                {uiLang === 'ar' ? 'الدقة' : 'ACCURACY'}
              </div>
              <div className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
                {accuracy}%
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="w-full py-4 rounded-2xl bg-duo-green hover:bg-duo-greenLight border-b-4 border-duo-greenDark font-black text-white text-base tracking-wide"
          >
            {t(UI_STRINGS.continueBtn, uiLang)}
          </button>
        </div>
      </div>
    );
  }

  if (!unlimitedHearts && hearts <= 0) {
    return (
      <div className="min-h-screen bg-slate-900/75 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-duo-nightCard rounded-3xl p-6 text-center space-y-4 shadow-2xl border-2 border-slate-200 dark:border-duo-nightBorder animate-pop">
          <ZikoMascot mood="thinking" outfit={outfit} size={110} />
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
            {uiLang === 'ar'
              ? 'سالت ليك القلوب فوضع التحدي!'
              : 'Out of Challenge Hearts!'}
          </h3>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {uiLang === 'ar'
              ? 'فـ ديما لينغو ما كاين حتى خلاص! عمّر القلوب ديالك مجاناً وكمل قرايتك دابا.'
              : 'Zero paywalls on DimaLingo! Refill your hearts 100% free right now.'}
          </p>
          <button
            type="button"
            onClick={onRefillHeartsFree}
            className="w-full py-3.5 rounded-2xl bg-duo-green border-b-4 border-duo-greenDark text-white font-black"
          >
            ❤️ {uiLang === 'ar' ? 'تعبئة مجانية فورية (5/5)' : 'Instant Free Refill (5/5)'}
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.min(
    100,
    Math.round(((currentIndex + (status === 'correct' ? 1 : 0)) / queue.length) * 100)
  );

  const canCheck =
    ((currentExercise.type === 'select_meaning' ||
      currentExercise.type === 'reverse_select' ||
      currentExercise.type === 'listening' ||
      currentExercise.type === 'fill_blank') &&
      Boolean(selectedOption)) ||
    (currentExercise.type === 'word_bank' && selectedTokenIndices.length > 0);

  const expectedSolutionText = (() => {
    if (currentExercise.type === 'word_bank') {
      const arr = Array.isArray(currentExercise.correctTokenSequence)
        ? currentExercise.correctTokenSequence
        : (
            currentExercise.correctTokenSequence?.[uiLang] ||
            currentExercise.correctTokenSequence?.en ||
            ''
          ).split('|');
      return arr.join(' ');
    }
    if (currentExercise.options) {
      const found = currentExercise.options.find(
        (o) => o.id === currentExercise.correctAnswer
      );
      return found ? t(found.label, uiLang) : currentExercise.targetText || '';
    }
    return currentExercise.targetText || '';
  })();

  return (
    <div className="min-h-screen bg-white dark:bg-duo-nightBg flex flex-col justify-between transition-colors">
      {/* Top Progress Bar + Dark/Light Mode Switch */}
      <header className="max-w-3xl w-full mx-auto px-4 pt-5 pb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-duo-nightCard hover:text-slate-600"
          aria-label="Exit lesson"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex-1 h-4 bg-slate-200 dark:bg-duo-nightCard rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-duo-green rounded-full transition-all duration-500 relative"
            style={{ width: `${Math.max(6, progressPct)}%` }}
          >
            <div className="absolute inset-x-2 top-0.5 h-1 bg-white/35 rounded-full" />
          </div>
        </div>

        <span className="text-xs font-black text-slate-400 hidden sm:inline">
          {currentIndex + 1}/{queue.length}
        </span>

        {combo >= 2 && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-xs font-black animate-pop">
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
            {combo}x
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onToggleDarkMode();
          }}
          className="p-2 rounded-xl border border-slate-200 dark:border-duo-nightBorder bg-slate-50 dark:bg-duo-nightCard text-slate-600 dark:text-amber-300"
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 font-black text-sm">
          <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
          {unlimitedHearts ? (
            <InfinityIcon className="w-4 h-4 stroke-[2.75]" />
          ) : (
            <span>{hearts}</span>
          )}
        </div>
      </header>

      {/* Main Exercise Area */}
      <main className="max-w-2xl w-full mx-auto px-4 py-4 flex-1 flex flex-col justify-center space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
            {t(currentExercise.prompt, uiLang)}
          </h1>
          {currentExercise.cefr && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black">
              {currentExercise.cefr}
            </span>
          )}
        </div>

        {/* Mascot + Speech Bubble for select_meaning */}
        {currentExercise.type === 'select_meaning' && currentExercise.targetText && (
          <div className="flex items-center gap-4">
            <div className="shrink-0 hidden sm:block">
              <ZikoMascot
                mood={
                  status === 'correct'
                    ? 'celebrating'
                    : status === 'wrong'
                    ? 'encouraging'
                    : 'happy'
                }
                outfit={outfit}
                size={90}
              />
            </div>

            <div className="flex-1 p-4 rounded-3xl bg-slate-50 dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span
                  dir="auto"
                  className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100"
                >
                  {currentExercise.targetText}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      sound.speak(
                        currentExercise.targetText!,
                        currentExercise.ttsLang || course.ttsLang,
                        false
                      )
                    }
                    className="p-2.5 rounded-2xl bg-duo-blue text-white border-b-4 border-duo-blueDark active:translate-y-0.5"
                    title="Listen"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      sound.speak(
                        currentExercise.targetText!,
                        currentExercise.ttsLang || course.ttsLang,
                        true
                      )
                    }
                    className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950 text-duo-blueDark dark:text-sky-300 border-b-4 border-sky-300 dark:border-sky-800 active:translate-y-0.5"
                    title={t(UI_STRINGS.tapAudioSlow, uiLang)}
                  >
                    <Turtle className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {currentExercise.phoneticHint && (
                <div dir="ltr" className="text-xs font-bold text-indigo-500 dark:text-indigo-300">
                  [{currentExercise.phoneticHint}]
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reverse Select Prompt Card (Native Meaning -> Pick Target Expression) */}
        {currentExercise.type === 'reverse_select' && currentExercise.correctMeaning && (
          <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-900">
            <div className="text-xs font-black text-indigo-600 dark:text-indigo-300 uppercase mb-1">
              {uiLang === 'ar' ? 'المعنى المطلوب التعبير عنه:' : 'Meaning to express:'}
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100">
              “{t(currentExercise.correctMeaning, uiLang)}”
            </div>
          </div>
        )}

        {/* Word Bank Target Meaning Card */}
        {currentExercise.type === 'word_bank' && (
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-400 mb-0.5">
                {uiLang === 'ar' ? 'المعنى المطلوب:' : 'Target Meaning:'}
              </div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-100">
                {currentExercise.isTargetWordBank && currentExercise.correctMeaning
                  ? t(currentExercise.correctMeaning, uiLang)
                  : currentExercise.targetText}
              </div>
            </div>
            {currentExercise.targetText && !currentExercise.isTargetWordBank && (
              <button
                type="button"
                onClick={() =>
                  sound.speak(
                    currentExercise.targetText!,
                    currentExercise.ttsLang || course.ttsLang
                  )
                }
                className="p-2.5 rounded-2xl bg-duo-blue text-white border-b-4 border-duo-blueDark shrink-0"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Listening Big Speaker Controls */}
        {currentExercise.type === 'listening' && currentExercise.targetText && (
          <div className="flex items-center justify-center gap-4 py-4">
            <button
              type="button"
              onClick={() =>
                sound.speak(
                  currentExercise.targetText!,
                  currentExercise.ttsLang || course.ttsLang,
                  false
                )
              }
              className="w-24 h-24 rounded-3xl bg-duo-blue hover:brightness-105 border-b-[6px] border-duo-blueDark text-white flex items-center justify-center shadow-lg active:translate-y-1 transition-transform"
            >
              <Volume2 className="w-11 h-11" />
            </button>

            <button
              type="button"
              onClick={() =>
                sound.speak(
                  currentExercise.targetText!,
                  currentExercise.ttsLang || course.ttsLang,
                  true
                )
              }
              className="w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-950 hover:bg-sky-200 border-b-4 border-sky-300 dark:border-sky-800 text-duo-blueDark dark:text-sky-300 flex flex-col items-center justify-center font-black text-[10px] active:translate-y-0.5"
            >
              <Turtle className="w-6 h-6" />
              <span>{uiLang === 'ar' ? 'بطيء' : 'Slow'}</span>
            </button>
          </div>
        )}

        {/* Speaking Microphone Exercise */}
        {currentExercise.type === 'speaking' && currentExercise.targetText && (
          <div className="space-y-2.5">
            {currentExercise.correctMeaning && (
              <div className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-duo-nightCard border border-slate-200 dark:border-duo-nightBorder text-xs font-bold text-slate-600 dark:text-slate-300">
                {uiLang === 'ar' ? 'المعنى:' : 'Meaning:'}{' '}
                {t(currentExercise.correctMeaning, uiLang)}
              </div>
            )}
            <PronunciationRecorder
              key={currentExercise.id}
              targetSentence={currentExercise.targetText}
              phonetic={currentExercise.phoneticHint}
              audioText={currentExercise.targetText}
              audioLang={course.speechRecLang}
              acceptedAnswers={currentExercise.acceptedSpokenVariants}
              uiLang={uiLang}
              disabled={status !== 'answering'}
              onSkipMic={() => {
                if (status === 'answering') finalizeAnswer(true);
              }}
              onEvaluated={(_transcript, evaluation) => {
                if (status === 'answering' && evaluation.passed) {
                  finalizeAnswer(true);
                }
              }}
            />
          </div>
        )}

        {/* Fill in the Blank Sentence */}
        {currentExercise.type === 'fill_blank' && (
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder space-y-2 text-center">
            <p
              dir="auto"
              className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-wide"
            >
              {currentExercise.sentenceWithBlank?.replace(
                '____',
                selectedOption ? `[ ${selectedOption} ]` : '______'
              )}
            </p>
            {currentExercise.correctMeaning && (
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                ({t(currentExercise.correctMeaning, uiLang)})
              </p>
            )}
          </div>
        )}

        {/* Options Grid */}
        {(currentExercise.type === 'select_meaning' ||
          currentExercise.type === 'reverse_select' ||
          currentExercise.type === 'listening' ||
          currentExercise.type === 'fill_blank') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shuffledOptions.map((opt, idx) => {
              const label = t(opt.label, uiLang);
              const isSelected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={status !== 'answering'}
                  onClick={() => {
                    sound.playTap();
                    setSelectedOption(opt.id);
                    if (opt.tts) {
                      sound.speak(opt.tts, currentExercise.ttsLang || course.ttsLang);
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 border-b-4 text-start font-extrabold text-base flex items-center gap-3 transition-all ${
                    isSelected
                      ? 'border-duo-blue bg-sky-50 dark:bg-sky-950/70 text-duo-blueDark dark:text-sky-300'
                      : 'border-slate-200 dark:border-duo-nightBorder bg-white dark:bg-duo-nightCard hover:bg-slate-50 dark:hover:bg-duo-nightSubtle text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg border-2 text-xs font-black flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-duo-blue bg-duo-blue text-white'
                        : 'border-slate-200 dark:border-duo-nightBorder text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span dir="auto" className="flex-1">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Word Bank Tile Builder */}
        {currentExercise.type === 'word_bank' && (
          <div className="space-y-5">
            <div className="min-h-[72px] p-3.5 rounded-2xl bg-slate-50 dark:bg-duo-nightCard border-2 border-dashed border-slate-300 dark:border-duo-nightBorder flex flex-wrap gap-2 items-center">
              {selectedTokenIndices.length === 0 && (
                <span className="text-xs font-bold text-slate-400">
                  {uiLang === 'ar'
                    ? 'اكليكي على الكلمات لتحت بالترتيب باش تركب الجملة...'
                    : 'Tap the words below in order to build the sentence...'}
                </span>
              )}
              {selectedTokenIndices.map((id) => {
                const tok = resolvedBankTokens.find((tItem) => tItem.id === id);
                if (!tok) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={status !== 'answering'}
                    onClick={() => {
                      sound.playTap();
                      setSelectedTokenIndices((prev) =>
                        prev.filter((item) => item !== id)
                      );
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-duo-nightSubtle border-2 border-b-4 border-duo-blue text-duo-blueDark dark:text-sky-300 font-extrabold text-sm animate-pop"
                  >
                    {tok.text}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {resolvedBankTokens.map((tok) => {
                const used = selectedTokenIndices.includes(tok.id);
                return (
                  <button
                    key={tok.id}
                    type="button"
                    disabled={used || status !== 'answering'}
                    onClick={() => {
                      sound.playTap();
                      if (currentExercise.isTargetWordBank) {
                        sound.speak(tok.text, currentExercise.ttsLang || course.ttsLang);
                      }
                      setSelectedTokenIndices((prev) => [...prev, tok.id]);
                    }}
                    className={`px-4 py-2.5 rounded-xl border-2 border-b-4 font-extrabold text-sm transition-all ${
                      used
                        ? 'bg-slate-100 dark:bg-duo-nightCard border-slate-200 dark:border-duo-nightBorder text-transparent select-none'
                        : 'bg-white dark:bg-duo-nightCard border-slate-200 dark:border-duo-nightBorder hover:bg-slate-50 dark:hover:bg-duo-nightSubtle text-slate-700 dark:text-slate-200 active:translate-y-0.5'
                    }`}
                  >
                    {tok.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Match Pairs Board */}
        {currentExercise.type === 'match_pairs' && currentExercise.pairs && (
          <div
            className={`grid grid-cols-2 gap-3 ${
              pairWrongFlash ? 'animate-shake' : ''
            }`}
          >
            <div className="space-y-2.5">
              {currentExercise.pairs.map((p) => {
                const matched = matchedPairIds.includes(p.id);
                const selected = selectedLeftPair === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={matched}
                    onClick={() => handlePairClick('left', p.id, p.target)}
                    className={`w-full p-3.5 rounded-2xl border-2 border-b-4 font-extrabold text-sm text-center transition-all ${
                      matched
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-400 opacity-60'
                        : selected
                        ? 'bg-sky-50 dark:bg-sky-950 border-duo-blue text-duo-blueDark dark:text-sky-300'
                        : 'bg-white dark:bg-duo-nightCard border-slate-200 dark:border-duo-nightBorder text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-duo-nightSubtle'
                    }`}
                  >
                    {p.target}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {shuffledRightPairs.map((p) => {
                const matched = matchedPairIds.includes(p.id);
                const selected = selectedRightPair === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={matched}
                    onClick={() => handlePairClick('right', p.id)}
                    className={`w-full p-3.5 rounded-2xl border-2 border-b-4 font-extrabold text-sm text-center transition-all ${
                      matched
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-400 opacity-60'
                        : selected
                        ? 'bg-sky-50 dark:bg-sky-950 border-duo-blue text-duo-blueDark dark:text-sky-300'
                        : 'bg-white dark:bg-duo-nightCard border-slate-200 dark:border-duo-nightBorder text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-duo-nightSubtle'
                    }`}
                  >
                    {t(p.meaning, uiLang)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action & Free "Explain My Answer" Drawer */}
      <footer
        className={`border-t-2 transition-colors ${
          status === 'correct'
            ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800'
            : status === 'wrong'
            ? 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-800'
            : 'bg-white dark:bg-duo-nightCard border-slate-200 dark:border-duo-nightBorder'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          {status !== 'answering' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                {status === 'correct' ? (
                  <CheckCircle2 className="w-8 h-8 text-duo-green shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-8 h-8 text-duo-red shrink-0 mt-0.5" />
                )}
                <div>
                  <div
                    className={`font-black text-base ${
                      status === 'correct'
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    {status === 'correct'
                      ? t(UI_STRINGS.correctHeadline, uiLang)
                      : t(UI_STRINGS.wrongHeadline, uiLang)}
                  </div>
                  {status === 'wrong' && expectedSolutionText && (
                    <div className="text-sm font-extrabold text-rose-800 dark:text-rose-300 mt-0.5">
                      {expectedSolutionText}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowExplain((s) => !s)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-duo-nightCard hover:bg-white border border-slate-300 dark:border-duo-nightBorder text-xs font-black text-slate-800 dark:text-slate-100 self-start sm:self-center shadow-sm"
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                {t(UI_STRINGS.explainAnswerBtn, uiLang)}
              </button>
            </div>
          )}

          {showExplain && (
            <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-duo-nightCard border-2 border-indigo-200 dark:border-indigo-800 text-sm font-bold text-slate-700 dark:text-slate-200 flex items-start gap-2.5 animate-pop">
              <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mb-0.5">
                  {uiLang === 'ar'
                    ? 'الشرح الذكي المجاني (مفتوح 100% فـ DimaLingo):'
                    : 'Free Smart Grammar Explanation:'}
                </div>
                {t(currentExercise.grammarTip, uiLang)}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            {status === 'answering' ? (
              currentExercise.type === 'match_pairs' ||
              currentExercise.type === 'speaking' ? (
                <div className="text-xs font-bold text-slate-400 py-2">
                  {currentExercise.type === 'speaking'
                    ? uiLang === 'ar'
                      ? 'اضغط على زر المايكروفون الفوق باش تنطق الجملة وتكمل...'
                      : 'Tap the microphone button above to speak and continue...'
                    : uiLang === 'ar'
                    ? 'اربط جميع الأزواج باش تدوز للسؤال الموالي...'
                    : 'Match all pairs above to continue...'}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canCheck}
                  onClick={handleCheck}
                  className={`w-full sm:w-48 py-3.5 rounded-2xl font-black text-base border-b-4 transition-all ${
                    canCheck
                      ? 'bg-duo-green hover:bg-duo-greenLight border-duo-greenDark text-white'
                      : 'bg-slate-200 dark:bg-duo-nightSubtle border-slate-300 dark:border-duo-nightBorder text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {t(UI_STRINGS.checkBtn, uiLang)}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                className={`w-full sm:w-48 py-3.5 rounded-2xl font-black text-base border-b-4 text-white ${
                  status === 'correct'
                    ? 'bg-duo-green hover:bg-duo-greenLight border-duo-greenDark'
                    : 'bg-duo-red border-duo-redDark'
                }`}
              >
                {t(UI_STRINGS.continueBtn, uiLang)}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
