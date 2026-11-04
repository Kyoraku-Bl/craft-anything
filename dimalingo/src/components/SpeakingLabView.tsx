import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Lightbulb,
  Mic,
  Search,
  Shuffle,
  Sparkles,
  Trophy,
  Volume2,
} from 'lucide-react';
import { COURSES } from '../data';
import { EXTRA_PRONUNCIATION_PHRASES } from '../data/pronunciationPhrases';
import { CEFR_LABELS, PHRASE_CATEGORY_LABELS, t } from '../i18n';
import {
  CEFRLevel,
  Course,
  CourseId,
  Exercise,
  PhraseCategory,
  PronunciationPhrase,
  UILang,
} from '../types';
import { PronunciationRecorder } from './PronunciationRecorder';
import { sound } from '../utils/sound';

interface SpeakingLabViewProps {
  activeCourse: Course;
  uiLang: UILang;
  onSelectCourse: (courseId: CourseId) => void;
  onStartSpeakingWorkout: (
    title: string,
    exercises: Exercise[],
    xp: number,
    gems: number
  ) => void;
}

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CATEGORY_ORDER: PhraseCategory[] = [
  'daily',
  'travel',
  'work',
  'debate',
  'idioms',
  'twisters',
];

function inferCategoryFromCefr(cefr: CEFRLevel, idx: number): PhraseCategory {
  if (cefr === 'A1') return idx % 3 === 1 ? 'travel' : 'daily';
  if (cefr === 'A2') return idx % 2 === 0 ? 'travel' : 'daily';
  if (cefr === 'B1') return idx % 2 === 0 ? 'work' : 'debate';
  if (cefr === 'B2') return idx % 2 === 0 ? 'debate' : 'work';
  if (cefr === 'C1') return idx % 3 === 0 ? 'idioms' : 'debate';
  return 'idioms';
}

export const SpeakingLabView: React.FC<SpeakingLabViewProps> = ({
  activeCourse,
  uiLang,
  onSelectCourse,
  onStartSpeakingWorkout,
}) => {
  const [selectedCefr, setSelectedCefr] = useState<CEFRLevel | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<PhraseCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [bestScores, setBestScores] = useState<Record<string, number>>({});

  // Merge rich extra pronunciation bank + all 72 A1-C2 curriculum expressions!
  const allCoursePhrases = useMemo<PronunciationPhrase[]>(() => {
    const dedicated = EXTRA_PRONUNCIATION_PHRASES.filter(
      (p) => p.courseId === activeCourse.id
    );
    const seenTargets = new Set(dedicated.map((p) => p.target.toLowerCase()));

    const fromUnits: PronunciationPhrase[] = [];
    for (const u of activeCourse.units) {
      // Collect accepted spoken variants from speaking exercises in unit
      const altMap = new Map<string, string[]>();
      const tipMap = new Map<string, PronunciationPhrase['tip']>();
      for (const n of u.nodes) {
        for (const ex of n.exercises) {
          if (ex.targetText) {
            if (ex.acceptedSpokenVariants) {
              altMap.set(ex.targetText, ex.acceptedSpokenVariants);
            }
            if (ex.grammarTip) {
              tipMap.set(ex.targetText, ex.grammarTip);
            }
          }
        }
      }

      u.guidePhrases.forEach((gp, idx) => {
        if (!seenTargets.has(gp.target.toLowerCase())) {
          seenTargets.add(gp.target.toLowerCase());
          fromUnits.push({
            id: `unit_${activeCourse.id}_${u.cefr}_${idx}`,
            courseId: activeCourse.id,
            cefr: u.cefr,
            category: inferCategoryFromCefr(u.cefr, idx),
            target: gp.target,
            altTargets: altMap.get(gp.target),
            phonetic: gp.pronunciation || '',
            meaning: gp.meaning,
            tip: tipMap.get(gp.target),
          });
        }
      });
    }

    return [...dedicated, ...fromUnits];
  }, [activeCourse]);

  const filteredPhrases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCoursePhrases.filter((p) => {
      if (selectedCefr !== 'ALL' && p.cefr !== selectedCefr) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (q) {
        const hay = `${p.target} ${p.meaning.ar} ${p.meaning.fr} ${p.meaning.en} ${p.phonetic}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allCoursePhrases, selectedCefr, selectedCategory, searchQuery]);

  const safeIndex =
    filteredPhrases.length > 0 ? activeIndex % filteredPhrases.length : 0;
  const activePhrase = filteredPhrases[safeIndex] || allCoursePhrases[0];

  const toSpeakingExercises = (list: PronunciationPhrase[], limit: number): Exercise[] => {
    const shuffled = [...list].sort(() => Math.random() - 0.5).slice(0, limit);
    return shuffled.map((p, idx) => ({
      id: `sp_workout_${p.id}_${Date.now()}_${idx}`,
      type: 'speaking',
      cefr: p.cefr,
      targetText: p.target,
      acceptedSpokenVariants: p.altTargets,
      phoneticHint: p.phonetic,
      ttsLang: activeCourse.ttsLang,
      correctMeaning: p.meaning,
      prompt: {
        ar: `🎙️ انطق هاد الجملة بصوت واضح فالمايكروفون (${p.cefr}):`,
        fr: `🎙️ Prononcez cette phrase au microphone (${p.cefr}) :`,
        en: `🎙️ Speak this sentence aloud into your microphone (${p.cefr}):`,
      },
      grammarTip:
        p.tip || {
          ar: 'استمع للنطق البطيء أولاً ثم انطق الجملة كاملة بنبرة طبيعية متصلة.',
          fr: 'Écoutez la vitesse lente puis prononcez la phrase d’une traite.',
          en: 'Listen at slow speed first, then speak smoothly in one breath.',
        },
    }));
  };

  const masteredCount = Object.values(bestScores).filter((s) => s >= 80).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black mb-2">
              <Mic className="w-3.5 h-3.5" />
              {uiLang === 'ar'
                ? `${allCoursePhrases.length} جملة نطق احترافية فهاد اللغة • مجاني 100%`
                : `${allCoursePhrases.length} Live Pronunciation Phrases • 100% Free`}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              {uiLang === 'ar'
                ? 'مختبر النطق والطلاقة الصوتية 🎙️'
                : uiLang === 'fr'
                ? 'Laboratoire de Prononciation (A1 ➔ C2) 🎙️'
                : 'Speaking & Pronunciation Lab (A1 ➔ C2) 🎙️'}
            </h1>
            <p className="text-sm font-bold opacity-95 mt-1">
              {uiLang === 'ar'
                ? 'مئات الجمل الواقعية، دليل النطق الصوتي، تحديات مخارج الحروف، وتقييم فوري بالمايكروفون!'
                : 'Hundreds of real-life sentences, phonetic guides, tongue-twisters & live mic scoring!'}
            </p>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-sm text-center shrink-0">
            <div className="text-2xl font-black">{masteredCount}</div>
            <div className="text-[11px] font-bold opacity-90">
              {uiLang === 'ar' ? 'جمل متقنة اليوم 🌟' : 'Mastered Today 🌟'}
            </div>
          </div>
        </div>

        {/* 3 Workout Launchers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              const pool = filteredPhrases.length >= 4 ? filteredPhrases : allCoursePhrases;
              onStartSpeakingWorkout(
                uiLang === 'ar'
                  ? `🎙️ حصة نطق سريعة (${activeCourse.badgeCode})`
                  : `🎙️ Quick Speaking Drill (${activeCourse.badgeCode})`,
                toSpeakingExercises(pool, 8),
                25,
                15
              );
            }}
            className="px-4 py-3 rounded-2xl bg-white text-rose-600 font-black text-xs sm:text-sm shadow-md border-b-4 border-rose-200 hover:brightness-95 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {uiLang === 'ar' ? 'حصة سريعة (8 جمل • +25 XP)' : 'Quick Drill (8 • +25 XP)'}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              const pool = filteredPhrases.length >= 6 ? filteredPhrases : allCoursePhrases;
              onStartSpeakingWorkout(
                uiLang === 'ar'
                  ? `🔥 ماراثون النطق المكثف (${activeCourse.badgeCode})`
                  : `🔥 Intensive Speaking Marathon (${activeCourse.badgeCode})`,
                toSpeakingExercises(pool, 15),
                50,
                30
              );
            }}
            className="px-4 py-3 rounded-2xl bg-amber-300 text-amber-950 font-black text-xs sm:text-sm shadow-md border-b-4 border-amber-500 hover:brightness-95 transition-all flex items-center justify-center gap-2"
          >
            <Flame className="w-4 h-4" />
            {uiLang === 'ar' ? 'ماراثون النطق (15 جملة • +50 XP)' : 'Marathon (15 • +50 XP)'}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              const twisters = allCoursePhrases.filter(
                (p) => p.category === 'twisters' || p.category === 'idioms'
              );
              onStartSpeakingWorkout(
                uiLang === 'ar'
                  ? `🏆 تحدي مخارج الحروف الصعبة (${activeCourse.badgeCode})`
                  : `🏆 Accent & Twisters Challenge (${activeCourse.badgeCode})`,
                toSpeakingExercises(twisters.length > 0 ? twisters : allCoursePhrases, 8),
                40,
                25
              );
            }}
            className="px-4 py-3 rounded-2xl bg-indigo-950/70 hover:bg-indigo-950 text-white font-black text-xs sm:text-sm shadow-md border-b-4 border-indigo-950 transition-all flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            {uiLang === 'ar' ? 'تحدي الفصاحة والـ Twisters (+40 XP)' : 'Accent Twisters (+40 XP)'}
          </button>
        </div>
      </div>

      {/* Language Switcher Pills */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {COURSES.map((c) => {
            const active = c.id === activeCourse.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  onSelectCourse(c.id);
                  setActiveIndex(0);
                }}
                className={`p-3 rounded-2xl border-2 border-b-4 flex items-center gap-2.5 font-black text-sm transition-all ${
                  active
                    ? 'border-duo-blue bg-sky-50 dark:bg-sky-950/60 text-duo-blueDark dark:text-sky-300'
                    : 'border-slate-200 dark:border-duo-nightBorder text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-duo-nightSubtle'
                }`}
              >
                <span className="text-2xl">{c.flag}</span>
                <span className="truncate">{t(c.name, uiLang)}</span>
              </button>
            );
          })}
        </div>

        {/* CEFR Filter Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-duo-nightBorder">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setSelectedCefr('ALL');
              setActiveIndex(0);
            }}
            className={`px-3 py-1.5 rounded-xl font-black text-xs border-2 transition-all ${
              selectedCefr === 'ALL'
                ? 'bg-duo-green border-duo-greenDark text-white'
                : 'bg-slate-100 dark:bg-duo-nightSubtle border-transparent text-slate-600 dark:text-slate-300'
            }`}
          >
            {uiLang === 'ar' ? 'كل المستويات (A1–C2)' : 'All Levels (A1–C2)'}
          </button>
          {CEFR_ORDER.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                sound.playTap();
                setSelectedCefr(lvl);
                setActiveIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl font-black text-xs border-2 transition-all ${
                selectedCefr === lvl
                  ? 'bg-duo-blue border-duo-blueDark text-white'
                  : 'bg-slate-100 dark:bg-duo-nightSubtle border-transparent text-slate-600 dark:text-slate-300'
              }`}
              title={t(CEFR_LABELS[lvl], uiLang)}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Category Filter Row + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-duo-nightBorder">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setSelectedCategory('ALL');
                setActiveIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-100 dark:bg-duo-nightSubtle text-slate-600 dark:text-slate-300'
              }`}
            >
              {uiLang === 'ar' ? 'جميع المواضيع' : 'All Topics'}
            </button>
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSelectedCategory(cat);
                  setActiveIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                  selectedCategory === cat
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 dark:bg-duo-nightSubtle text-slate-600 dark:text-slate-300'
                }`}
              >
                {t(PHRASE_CATEGORY_LABELS[cat], uiLang)}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder={
                uiLang === 'ar' ? 'قلّب على جملة أو معنى...' : 'Search phrase or meaning...'
              }
              className="w-full ps-9 pe-3 py-1.5 rounded-xl border-2 border-slate-200 dark:border-duo-nightBorder bg-slate-50 dark:bg-duo-nightSubtle text-xs font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Live Microphone Studio + Scrollable Phrase List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/*Phrase Selector Column */}
        <div className="lg:col-span-5 bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-4 space-y-2.5 max-h-[560px] overflow-y-auto">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? `قائمة الجمل (${filteredPhrases.length} جملة):`
                : `Phrase List (${filteredPhrases.length}):`}
            </span>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                if (filteredPhrases.length > 1) {
                  setActiveIndex(Math.floor(Math.random() * filteredPhrases.length));
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-black text-xs"
            >
              <Shuffle className="w-3.5 h-3.5" />
              {uiLang === 'ar' ? 'جملة عشوائية' : 'Random'}
            </button>
          </div>

          {filteredPhrases.length === 0 ? (
            <div className="p-6 text-center text-sm font-bold text-slate-400">
              {uiLang === 'ar'
                ? 'ما لقينا حتى جملة بهاد الفلتر — جرب تمسح البحث.'
                : 'No phrases match this filter.'}
            </div>
          ) : (
            filteredPhrases.map((p, idx) => {
              const selected = idx === safeIndex;
              const best = bestScores[p.id];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setActiveIndex(idx);
                  }}
                  className={`w-full text-start p-3 rounded-2xl border-2 transition-all space-y-1 ${
                    selected
                      ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40'
                      : 'border-slate-200 dark:border-duo-nightBorder hover:bg-slate-50 dark:hover:bg-duo-nightSubtle'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">
                        {p.cefr}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {t(PHRASE_CATEGORY_LABELS[p.category], uiLang)}
                      </span>
                    </div>
                    {best !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          best >= 80
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {best}%
                      </span>
                    )}
                  </div>
                  <div
                    dir="auto"
                    className="font-black text-slate-800 dark:text-slate-100 text-sm leading-snug"
                  >
                    {p.target}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t(p.meaning, uiLang)}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Active Microphone Studio Panel */}
        <div className="lg:col-span-7 bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-4">
          {activePhrase && (
            <>
              {/* Studio Header + Prev/Next Controls */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-duo-nightBorder pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black">
                    {t(CEFR_LABELS[activePhrase.cefr], uiLang)}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-black">
                    {t(PHRASE_CATEGORY_LABELS[activePhrase.category], uiLang)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      if (filteredPhrases.length > 0) {
                        setActiveIndex(
                          (safeIndex - 1 + filteredPhrases.length) %
                            filteredPhrases.length
                        );
                      }
                    }}
                    className="p-2 rounded-xl border-2 border-slate-200 dark:border-duo-nightBorder hover:bg-slate-50 dark:hover:bg-duo-nightSubtle text-slate-600 dark:text-slate-200"
                    title="Previous phrase"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-400 px-1">
                    {filteredPhrases.length > 0
                      ? `${safeIndex + 1} / ${filteredPhrases.length}`
                      : '1 / 1'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      if (filteredPhrases.length > 0) {
                        setActiveIndex((safeIndex + 1) % filteredPhrases.length);
                      }
                    }}
                    className="p-2 rounded-xl border-2 border-slate-200 dark:border-duo-nightBorder hover:bg-slate-50 dark:hover:bg-duo-nightSubtle text-slate-600 dark:text-slate-200"
                    title="Next phrase"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Phonetic Pronunciation Helper & Tip */}
              {(activePhrase.phonetic || activePhrase.tip) && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-1.5">
                  {activePhrase.phonetic && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4" />
                        {uiLang === 'ar' ? 'دليل النطق الصوتي:' : 'Phonetic Guide:'}
                      </span>
                      <code
                        dir="ltr"
                        className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-duo-nightCard text-indigo-900 dark:text-indigo-200 font-bold text-xs"
                      >
                        [{activePhrase.phonetic}]
                      </code>
                    </div>
                  )}
                  {activePhrase.tip && (
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-start gap-1.5 pt-1">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{t(activePhrase.tip, uiLang)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-duo-nightSubtle border border-slate-200 dark:border-duo-nightBorder text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="font-black text-slate-800 dark:text-slate-100">
                  {uiLang === 'ar' ? 'المعنى:' : 'Meaning:'}{' '}
                </span>
                {t(activePhrase.meaning, uiLang)}
              </div>

              <PronunciationRecorder
                key={`${activeCourse.id}_${activePhrase.id}`}
                targetSentence={activePhrase.target}
                phonetic={activePhrase.phonetic}
                audioText={activePhrase.target}
                audioLang={activeCourse.speechRecLang}
                acceptedAnswers={activePhrase.altTargets}
                uiLang={uiLang}
                onEvaluated={(_transcript, evaluation) => {
                  setBestScores((prev) => ({
                    ...prev,
                    [activePhrase.id]: Math.max(
                      prev[activePhrase.id] || 0,
                      evaluation.score
                    ),
                  }));
                }}
              />

              {/* Next Phrase Quick CTA */}
              {filteredPhrases.length > 1 && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setActiveIndex((safeIndex + 1) % filteredPhrases.length);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-duo-blue border-b-4 border-duo-blueDark text-white font-black text-xs"
                  >
                    {uiLang === 'ar' ? 'الجملة الموالية ⬅️' : 'Next Phrase ➡️'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
