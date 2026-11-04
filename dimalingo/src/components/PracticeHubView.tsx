import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Ear,
  Flame,
  GraduationCap,
  Layers,
  Link2,
  Mic,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Volume2,
  Zap,
} from 'lucide-react';
import { t } from '../i18n';
import { predictRecallProbability } from '../store/useUserStore';
import {
  CEFRLevel,
  Course,
  Exercise,
  MistakeItem,
  UILang,
  WordMemory,
} from '../types';
import { sound } from '../utils/sound';

interface PracticeHubViewProps {
  course: Course;
  uiLang: UILang;
  wordMemories: Record<string, WordMemory>;
  mistakes: MistakeItem[];
  onStartCustomPractice: (
    title: string,
    exercises: Exercise[],
    xp: number,
    gems: number
  ) => void;
  onOpenSpeakingLab: () => void;
}

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

type SessionLengthOption = 8 | 15 | 25;

export const PracticeHubView: React.FC<PracticeHubViewProps> = ({
  course,
  uiLang,
  wordMemories,
  mistakes,
  onStartCustomPractice,
  onOpenSpeakingLab,
}) => {
  const [cefrFilter, setCefrFilter] = useState<CEFRLevel | 'ALL'>('ALL');
  const [sessionLength, setSessionLength] = useState<SessionLengthOption>(15);
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [knownFlashcards, setKnownFlashcards] = useState<Record<string, boolean>>({});

  const courseMistakes = useMemo(
    () => mistakes.filter((m) => m.courseId === course.id),
    [mistakes, course.id]
  );

  const allExercises = useMemo(() => {
    const list: Exercise[] = [];
    for (const u of course.units) {
      if (cefrFilter !== 'ALL' && u.cefr !== cefrFilter) continue;
      for (const n of u.nodes) {
        for (const ex of n.exercises) {
          list.push(ex);
        }
      }
    }
    return list.length > 0
      ? list
      : course.units.flatMap((u) => u.nodes.flatMap((n) => n.exercises));
  }, [course, cefrFilter]);

  const memoriesList = useMemo(() => {
    return Object.values(wordMemories)
      .filter((m) => m.courseId === course.id)
      .map((m) => ({
        ...m,
        recall: predictRecallProbability(m),
      }))
      .sort((a, b) => a.recall - b.recall);
  }, [wordMemories, course.id]);

  const weakWords = memoriesList.filter((m) => m.recall < 0.72);

  // Flashcards deck from course guide phrases
  const flashcardDeck = useMemo(() => {
    const units =
      cefrFilter === 'ALL'
        ? course.units
        : course.units.filter((u) => u.cefr === cefrFilter);
    return units.flatMap((u) =>
      u.guidePhrases.map((gp, idx) => ({
        id: `${course.id}_${u.cefr}_fc_${idx}`,
        cefr: u.cefr,
        target: gp.target,
        pronunciation: gp.pronunciation,
        meaning: gp.meaning,
      }))
    );
  }, [course, cefrFilter]);

  const activeFlashcard =
    flashcardDeck.length > 0
      ? flashcardDeck[flashcardIdx % flashcardDeck.length]
      : null;

  const sampleSession = (pool: Exercise[], count: number): Exercise[] => {
    if (pool.length === 0) return [];
    const result: Exercise[] = [];
    let round = 0;
    while (result.length < count) {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      for (const ex of shuffled) {
        if (result.length >= count) break;
        result.push({
          ...ex,
          id: `${ex.id}_rev_${round}_${result.length}`,
        });
      }
      round += 1;
    }
    return result;
  };

  const sessionRewards: Record<SessionLengthOption, { xp: number; gems: number }> = {
    8: { xp: 22, gems: 12 },
    15: { xp: 42, gems: 24 },
    25: { xp: 70, gems: 40 },
  };

  const reward = sessionRewards[sessionLength];

  const buildSrsSession = () => {
    if (weakWords.length > 0) {
      const keys = new Set(weakWords.slice(0, 12).map((w) => w.key));
      const matched = allExercises.filter((ex) => ex.vocabKey && keys.has(ex.vocabKey));
      if (matched.length >= 4) {
        return sampleSession(matched, sessionLength);
      }
    }
    return sampleSession(allExercises, sessionLength);
  };

  const levelBadgeText = cefrFilter === 'ALL' ? 'A1–C2' : cefrFilter;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-black mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              {uiLang === 'ar'
                ? 'مركز المراجعة المكثفة والإتقان • 8 أنماط تدريب + بطاقات تفاعلية!'
                : 'Intensive Revision Center • 8 Drill Modes + Flashcards — 100% Free'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              {uiLang === 'ar'
                ? 'المراجعة الذكية وتثبيت اللغة 🧠🔥'
                : uiLang === 'fr'
                ? 'Centre de Révision Intensive 🧠🔥'
                : 'Intensive Revision & Mastery Hub 🧠🔥'}
            </h1>
            <p className="text-sm font-semibold opacity-95 mt-1">
              {uiLang === 'ar'
                ? 'اختار المستوى وطول الحصة ونمط المراجعة باش ترسّخ المفردات، القواعد، الاستماع والنطق!'
                : 'Pick your CEFR level, session length, and drill style to cement long-term fluency!'}
            </p>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-sm text-center shrink-0">
            <div className="text-2xl font-black">{allExercises.length}+</div>
            <div className="text-[11px] font-bold opacity-90">
              {uiLang === 'ar'
                ? `تمرين متاح (${levelBadgeText})`
                : `Drills Ready (${levelBadgeText})`}
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: CEFR Scope + Session Length */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* CEFR Filter */}
          <div className="space-y-1.5">
            <div className="text-xs font-black text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? '1. اختار المستوى اللي بغيتي تراجعو:'
                : '1. Choose CEFR Revision Scope:'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setCefrFilter('ALL');
                  setFlashcardIdx(0);
                  setIsCardFlipped(false);
                }}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                  cefrFilter === 'ALL'
                    ? 'bg-duo-green text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-duo-nightSubtle text-slate-600 dark:text-slate-300'
                }`}
              >
                {uiLang === 'ar' ? 'شامل (A1–C2)' : 'All (A1–C2)'}
              </button>
              {CEFR_ORDER.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setCefrFilter(lvl);
                    setFlashcardIdx(0);
                    setIsCardFlipped(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                    cefrFilter === lvl
                      ? 'bg-duo-blue text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-duo-nightSubtle text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Session Length Selector */}
          <div className="space-y-1.5">
            <div className="text-xs font-black text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? '2. اختار طول حصة المراجعة:'
                : '2. Choose Session Intensity:'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  {
                    len: 8 as SessionLengthOption,
                    ar: '⚡ سريعة (8 تمارين)',
                    en: '⚡ Quick (8)',
                  },
                  {
                    len: 15 as SessionLengthOption,
                    ar: '🎯 مكثفة (15 تمرين)',
                    en: '🎯 Deep (15)',
                  },
                  {
                    len: 25 as SessionLengthOption,
                    ar: '🔥 ماراثون (25 تمرين • +70 XP)',
                    en: '🔥 Marathon (25 • +70 XP)',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.len}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setSessionLength(opt.len);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                    sessionLength === opt.len
                      ? 'bg-amber-400 text-amber-950 shadow-sm'
                      : 'bg-slate-100 dark:bg-duo-nightSubtle text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {uiLang === 'ar' ? opt.ar : opt.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 8 Specialized Revision Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Mistake Clinic */}
        <div className="p-5 rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder flex flex-col justify-between gap-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950 text-duo-red flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-black">
                {courseMistakes.length} {uiLang === 'ar' ? 'أخطاء مسجلة' : 'mistakes'}
              </span>
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
              {uiLang === 'ar'
                ? '🎯 عيادة تصحيح الأخطاء السابقة'
                : '🎯 Mistake Clinic'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {courseMistakes.length > 0
                ? uiLang === 'ar'
                  ? 'عاود الأسئلة اللي غلطتي فيهم من قبل وتخلص منهم نهائياً!'
                  : 'Clear your saved mistakes and turn weak spots into strengths!'
                : uiLang === 'ar'
                ? 'سجلك نقي دابا! تقدر دير حصة تثبيت وقائية.'
                : 'Zero pending mistakes! Launch a preventive refresher.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              const exs =
                courseMistakes.length > 0
                  ? courseMistakes.slice(0, sessionLength).map((m) => m.exercise)
                  : sampleSession(allExercises, sessionLength);
              onStartCustomPractice(
                uiLang === 'ar' ? '🎯 تصحيح الأخطاء' : '🎯 Mistake Clinic',
                exs,
                reward.xp,
                reward.gems
              );
            }}
            className="w-full py-2.5 rounded-2xl bg-duo-red border-b-4 border-duo-redDark text-white font-black text-xs sm:text-sm"
          >
            {uiLang === 'ar' ? 'ابدأ تصحيح الأخطاء' : 'Start Mistake Review'}
          </button>
        </div>

        {/* 2. Smart Spaced Repetition (SRS) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder flex flex-col justify-between gap-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-950 text-duo-blue flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-black">
                Half-Life SRS
              </span>
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
              {uiLang === 'ar'
                ? '🧠 التكرار المتباعد الذكي (حسب منحنى النسيان)'
                : '🧠 Smart Spaced Repetition (SRS)'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? `كيختار أوتوماتيكياً العبارات اللي قربتي تنساهم (${weakWords.length} عبارات محتاجة تنشيط).`
                : `Automatically targets fading vocabulary (${weakWords.length} due for review).`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onStartCustomPractice(
                uiLang === 'ar'
                  ? `🧠 مراجعة الذاكرة الذكية (${levelBadgeText})`
                  : `🧠 Smart SRS (${levelBadgeText})`,
                buildSrsSession(),
                reward.xp,
                reward.gems
              );
            }}
            className="w-full py-2.5 rounded-2xl bg-duo-blue border-b-4 border-duo-blueDark text-white font-black text-xs sm:text-sm"
          >
            {uiLang === 'ar'
              ? `ابدأ حصة SRS (${sessionLength} تمرين)`
              : `Start SRS (${sessionLength} drills)`}
          </button>
        </div>

        {/* 3. Listening Comprehension Bootcamp */}
        <div className="p-5 rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder flex flex-col justify-between gap-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-950 text-duo-purple flex items-center justify-center">
              <Ear className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
              {uiLang === 'ar'
                ? '🎧 معسكر الاستماع والفهم السمعي المكثف'
                : '🎧 Deep Listening Comprehension Bootcamp'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? 'درّب أذنك على التقاط الجمل السريعة والبطيئة من A1 حتى C2 بلا ما تشوف النص!'
                : 'Train your ear to catch natural & slow speech across A1–C2!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              const listenPool = allExercises.filter((e) => e.type === 'listening');
              onStartCustomPractice(
                uiLang === 'ar'
                  ? `🎧 معسكر الاستماع (${levelBadgeText})`
                  : `🎧 Listening Bootcamp (${levelBadgeText})`,
                sampleSession(listenPool.length > 0 ? listenPool : allExercises, sessionLength),
                reward.xp,
                reward.gems
              );
            }}
            className="w-full py-2.5 rounded-2xl bg-duo-purple border-b-4 border-duo-purpleDark text-white font-black text-xs sm:text-sm"
          >
            {uiLang === 'ar'
              ? `ابدأ تدريب الاستماع (${sessionLength} تمرين)`
              : `Start Listening (${sessionLength} drills)`}
          </button>
        </div>

        {/* 4. Sentence Builder & Grammar Cloze */}
        <div className="p-5 rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder flex flex-col justify-between gap-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-duo-green flex items-center justify-center">
              <Puzzle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
              {uiLang === 'ar'
                ? '🧩 مختبر تركيب الجمل والقواعد (Word Bank + Cloze)'
                : '🧩 Sentence Builder & Grammar Cloze'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? 'ركّب جمل كاملة كلمة بكلمة وعمّر الفراغات السياقية باش تضبط القواعد 100%.'
                : 'Construct full sentences and master contextual grammar blanks.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              const grammarPool = allExercises.filter(
                (e) => e.type === 'word_bank' || e.type === 'fill_blank'
              );
              onStartCustomPractice(
                uiLang === 'ar'
                  ? `🧩 تركيب الجمل والقواعد (${levelBadgeText})`
                  : `🧩 Grammar & Sentence Lab (${levelBadgeText})`,
                sampleSession(grammarPool.length > 0 ? grammarPool : allExercises, sessionLength),
                reward.xp,
                reward.gems
              );
            }}
            className="w-full py-2.5 rounded-2xl bg-duo-green border-b-4 border-duo-greenDark text-white font-black text-xs sm:text-sm"
          >
            {uiLang === 'ar'
              ? `ابدأ تدريب الجمل (${sessionLength} تمرين)`
              : `Start Sentence Lab (${sessionLength} drills)`}
          </button>
        </div>

        {/* 5. Active Reverse Recall */}
        <div className="p-5 rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder flex flex-col justify-between gap-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
              {uiLang === 'ar'
                ? '🔄 الاستحضار العكسي النشط (من المعنى للجملة)'
                : '🔄 Active Reverse Recall (Meaning ➔ Target)'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? 'أقوى طريقة باش ما تبقاش غير تفهم وتبدا تنتج الجمل براسك بسرعة!'
                : 'Move from passive recognition to active target-language production!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              const revPool = allExercises.filter(
                (e) => e.type === 'reverse_select' || e.type === 'word_bank'
              );
              onStartCustomPractice(
                uiLang === 'ar'
                  ? `🔄 الاستحضار العكسي (${levelBadgeText})`
                  : `🔄 Active Recall (${levelBadgeText})`,
                sampleSession(revPool.length > 0 ? revPool : allExercises, sessionLength),
                reward.xp,
                reward.gems
              );
            }}
            className="w-full py-2.5 rounded-2xl bg-teal-600 border-b-4 border-teal-800 text-white font-black text-xs sm:text-sm"
          >
            {uiLang === 'ar'
              ? `ابدأ الاستحضار العكسي (${sessionLength} تمرين)`
              : `Start Active Recall (${sessionLength} drills)`}
          </button>
        </div>

        {/* 6. Vocabulary Match-Pairs Blitz */}
        <div className="p-5 rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder flex flex-col justify-between gap-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Link2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
              {uiLang === 'ar'
                ? '🔗 سباق ربط العبارات والمترادفات (Match Blitz)'
                : '🔗 Rapid Vocabulary Match-Up'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? 'لوحات ربط متتالية كترفع سرعة البديهة واستحضار المعاني فـ الثانية!'
                : 'Back-to-back matching boards that build lightning-fast lexical recall!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              const matchPool = allExercises.filter((e) => e.type === 'match_pairs');
              onStartCustomPractice(
                uiLang === 'ar'
                  ? `🔗 سباق ربط المفردات (${levelBadgeText})`
                  : `🔗 Match-Pairs Blitz (${levelBadgeText})`,
                sampleSession(
                  matchPool.length > 0 ? matchPool : allExercises,
                  Math.min(sessionLength, 10)
                ),
                reward.xp,
                reward.gems
              );
            }}
            className="w-full py-2.5 rounded-2xl bg-duo-gold border-b-4 border-duo-goldDark text-amber-950 font-black text-xs sm:text-sm"
          >
            {uiLang === 'ar' ? 'ابدأ سباق الربط السريع' : 'Start Match Blitz'}
          </button>
        </div>

        {/* 7. CEFR Comprehensive Mock Exam */}
        <div className="p-5 rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder flex flex-col justify-between gap-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
              {uiLang === 'ar'
                ? `🎓 محاكي الامتحان الشامل (${levelBadgeText})`
                : `🎓 Comprehensive Mock Exam (${levelBadgeText})`}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? 'امتحان متكامل كيخلط القواعد، السمع، النطق، والتركيب باش تقيس مستواك الحقيقي!'
                : 'Full mixed exam testing listening, speaking, grammar, and comprehension!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onStartCustomPractice(
                uiLang === 'ar'
                  ? `🎓 الامتحان التجريبي الشامل (${levelBadgeText})`
                  : `🎓 Mock Exam (${levelBadgeText})`,
                sampleSession(allExercises, sessionLength),
                reward.xp + 15,
                reward.gems + 10
              );
            }}
            className="w-full py-2.5 rounded-2xl bg-indigo-600 border-b-4 border-indigo-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            {uiLang === 'ar'
              ? `ابدأ الامتحان الشامل (+${reward.xp + 15} XP)`
              : `Start Mock Exam (+${reward.xp + 15} XP)`}
          </button>
        </div>

        {/* 8. Speaking Pronunciation Lab Shortcut */}
        <div className="p-5 rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder flex flex-col justify-between gap-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="w-11 h-11 rounded-2xl bg-pink-100 dark:bg-pink-950 text-pink-600 flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
              {uiLang === 'ar'
                ? '🎙️ مراجعة النطق الصوتي بالمايكروفون'
                : '🎙️ Live Microphone Pronunciation Drill'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? 'أزيد من 80 جملة نطق لكل لغة مع دليل مخارج الحروف وتقييم فوري بالنقط!'
                : 'Practise sentences with audio and speech recognition when available!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onOpenSpeakingLab();
            }}
            className="w-full py-2.5 rounded-2xl bg-pink-600 border-b-4 border-pink-800 text-white font-black text-xs sm:text-sm"
          >
            {uiLang === 'ar' ? 'افتح مختبر النطق الكامل 🎙️' : 'Open Speaking Lab 🎙️'}
          </button>
        </div>
      </div>

      {/* Interactive Flip Flashcards Deck */}
      {activeFlashcard && (
        <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-duo-blue" />
                {uiLang === 'ar'
                  ? `🃏 بطاقات المراجعة التفاعلية القابلة للقلب (${flashcardDeck.length} بطاقة)`
                  : `🃏 Interactive Flip Flashcards (${flashcardDeck.length} cards)`}
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {uiLang === 'ar'
                  ? 'اكليكي على البطاقة باش تقلبها وتشوف الترجمة، واسمع النطق العادي أو البطيء بلا حدود!'
                  : 'Tap the card to flip between expression and translation, with unlimited audio!'}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black">
              ✅ {Object.keys(knownFlashcards).length} / {flashcardDeck.length}
            </span>
          </div>

          <div
            onClick={() => {
              sound.playTap();
              setIsCardFlipped((f) => !f);
            }}
            className="cursor-pointer select-none rounded-3xl border-2 border-b-4 border-duo-blue bg-gradient-to-br from-sky-50 to-indigo-50/70 dark:from-slate-800 dark:to-slate-900 p-6 sm:p-8 text-center space-y-4 transition-all hover:brightness-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-duo-blue text-white text-xs font-black">
                {activeFlashcard.cefr}
              </span>
              <span className="text-xs font-extrabold text-slate-400">
                {(flashcardIdx % flashcardDeck.length) + 1} / {flashcardDeck.length} •{' '}
                {uiLang === 'ar' ? 'اضغط للقلب 🔄' : 'Tap to flip 🔄'}
              </span>
            </div>

            {!isCardFlipped ? (
              <div className="py-4 space-y-2">
                <div
                  dir="auto"
                  className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100"
                >
                  {activeFlashcard.target}
                </div>

              </div>
            ) : (
              <div className="py-4 space-y-2 animate-pop">
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">
                  {uiLang === 'ar' ? 'المعنى والترجمة:' : 'Meaning:'}
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-200">
                  {t(activeFlashcard.meaning, uiLang)}
                </div>
                <div dir="auto" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {activeFlashcard.target}
                </div>
              </div>
            )}

            <div
              className="flex items-center justify-center gap-2 pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => sound.speak(activeFlashcard.target, course.ttsLang, false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-duo-blue text-white font-black text-xs shadow-sm"
              >
                <Volume2 className="w-4 h-4" />
                {uiLang === 'ar' ? 'استمع 🔊' : 'Listen 🔊'}
              </button>
              <button
                type="button"
                onClick={() => sound.speak(activeFlashcard.target, course.ttsLang, true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-duo-nightCard border border-slate-200 dark:border-duo-nightBorder text-slate-700 dark:text-slate-200 font-black text-xs"
              >
                🐢 {uiLang === 'ar' ? 'ببطء' : 'Slow'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setIsCardFlipped(false);
                setFlashcardIdx((i) => i + 1);
              }}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              {uiLang === 'ar' ? 'عاودها ليا من بعد' : 'Review Again Later'}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playCorrect();
                setKnownFlashcards((prev) => ({
                  ...prev,
                  [activeFlashcard.id]: true,
                }));
                setIsCardFlipped(false);
                setFlashcardIdx((i) => i + 1);
              }}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-duo-green border-b-4 border-duo-greenDark text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {uiLang === 'ar' ? 'حفظتها مزيان! للتالية ⬅️' : 'Got It! Next Card ➡️'}
            </button>
          </div>
        </div>
      )}

      {/* Memory Strength Table */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
              📊{' '}
              {uiLang === 'ar'
                ? 'مؤشر قوة الذاكرة لكل عبارة تعلمتيها (Half-Life Memory)'
                : 'Vocabulary Memory Strength (Half-Life Regression)'}
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? 'صيغة التذكر الحقيقية: p = 2^(-Δt / h) — كل مراجعة ناجحة كتضاعف عمر النصف فالذاكرة!'
                : 'Formula: p = 2^(-Δt / h) — each successful recall doubles memory half-life!'}
            </p>
          </div>
          <Flame className="w-6 h-6 text-orange-500 shrink-0" />
        </div>

        {memoriesList.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-duo-nightSubtle border-2 border-dashed border-slate-200 dark:border-duo-nightBorder text-center text-sm font-bold text-slate-500 dark:text-slate-400">
            {uiLang === 'ar'
              ? 'كمّل أول درس فالمسار باش يبدا المحرك الذكي يتتبع قوة تذكرك لكل كلمة وعبارة هنا!'
              : 'Complete your first lesson to see live Half-Life memory strength bars here!'}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pe-1">
            {memoriesList.map((item) => {
              const pct = Math.round(item.recall * 100);
              const barColor =
                pct >= 75
                  ? 'bg-duo-green'
                  : pct >= 45
                  ? 'bg-duo-gold'
                  : 'bg-duo-red';
              return (
                <div
                  key={item.key}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-duo-nightSubtle border border-slate-200 dark:border-duo-nightBorder flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => sound.speak(item.target, course.ttsLang)}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-duo-nightCard border border-slate-200 dark:border-duo-nightBorder text-duo-blue flex items-center justify-center shrink-0 hover:bg-sky-50"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div
                        dir="auto"
                        className="font-black text-slate-800 dark:text-slate-100 text-sm"
                      >
                        {item.target}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {t(item.meaning, uiLang)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:w-52 shrink-0">
                    <div className="flex-1 h-3 bg-slate-200 dark:bg-duo-nightCard rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 w-10 text-end">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
