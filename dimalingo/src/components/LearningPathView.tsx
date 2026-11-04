import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Crown,
  FastForward,
  Gift,
  Lock,
  Mic,
  RefreshCw,
  Sparkles,
  Star,
  Volume2,
  X,
} from 'lucide-react';
import { CEFR_LABELS, t, UI_STRINGS } from '../i18n';
import {
  CEFRLevel,
  Course,
  LessonNode,
  MascotOutfit,
  NodeProgress,
  UILang,
  Unit,
} from '../types';
import { sound } from '../utils/sound';
import { ZikoMascot } from './ZikoMascot';
import { ArabicGrammarGuideModal } from './ArabicGrammarGuideModal';

interface LearningPathViewProps {
  course: Course;
  uiLang: UILang;
  completedNodes: Record<string, NodeProgress>;
  unlockedUnitNum: number;
  claimedChests: string[];
  outfit: MascotOutfit;
  onStartLesson: (unit: Unit, node: LessonNode) => void;
  onStartJumpTest: (unit: Unit) => void;
  onClaimChest: (node: LessonNode) => void;
}

const UNIT_THEMES = {
  emerald: {
    banner: 'from-emerald-500 to-green-600 border-emerald-700',
    activeBtn: 'bg-duo-green border-duo-greenDark text-white ring-emerald-200 dark:ring-emerald-900',
    doneBtn: 'bg-duo-gold border-duo-goldDark text-amber-950',
  },
  sky: {
    banner: 'from-sky-500 to-blue-600 border-blue-700',
    activeBtn: 'bg-duo-blue border-duo-blueDark text-white ring-sky-200 dark:ring-sky-900',
    doneBtn: 'bg-duo-gold border-duo-goldDark text-amber-950',
  },
  violet: {
    banner: 'from-violet-500 to-purple-600 border-purple-800',
    activeBtn: 'bg-duo-purple border-duo-purpleDark text-white ring-purple-200 dark:ring-purple-900',
    doneBtn: 'bg-duo-gold border-duo-goldDark text-amber-950',
  },
  amber: {
    banner: 'from-amber-500 to-orange-500 border-orange-700',
    activeBtn: 'bg-orange-500 border-orange-700 text-white ring-orange-200 dark:ring-orange-900',
    doneBtn: 'bg-duo-gold border-duo-goldDark text-amber-950',
  },
  rose: {
    banner: 'from-rose-500 to-pink-600 border-rose-800',
    activeBtn: 'bg-rose-500 border-rose-700 text-white ring-rose-200 dark:ring-rose-900',
    doneBtn: 'bg-duo-gold border-duo-goldDark text-amber-950',
  },
  teal: {
    banner: 'from-teal-500 to-cyan-600 border-teal-800',
    activeBtn: 'bg-teal-500 border-teal-700 text-white ring-teal-200 dark:ring-teal-900',
    doneBtn: 'bg-duo-gold border-duo-goldDark text-amber-950',
  },
};

const WINDING_OFFSETS = [
  'translate-x-0',
  '-translate-x-8 sm:-translate-x-12',
  '-translate-x-12 sm:-translate-x-16',
  '-translate-x-6 sm:-translate-x-8',
  'translate-x-4 sm:translate-x-8',
  'translate-x-10 sm:translate-x-14',
  'translate-x-6 sm:translate-x-10',
  '-translate-x-4 sm:-translate-x-6',
  'translate-x-0',
];

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const LearningPathView: React.FC<LearningPathViewProps> = ({
  course,
  uiLang,
  completedNodes,
  unlockedUnitNum,
  claimedChests,
  outfit,
  onStartLesson,
  onStartJumpTest,
  onClaimChest,
}) => {
  const [guideUnit, setGuideUnit] = useState<Unit | null>(null);
  const [showArabicGuide, setShowArabicGuide] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [cefrFilter, setCefrFilter] = useState<CEFRLevel | 'ALL'>('ALL');

  const isUnitReached = (unitNumber: number): boolean => {
    if (unitNumber <= unlockedUnitNum) return true;
    const prevUnit = course.units.find((u) => u.number === unitNumber - 1);
    if (!prevUnit) return true;
    return prevUnit.nodes.every((n) => {
      if (n.type === 'chest') return claimedChests.includes(n.id);
      return Boolean(completedNodes[n.id]);
    });
  };

  const nodeStates: Record<string, 'completed' | 'current' | 'locked'> = {};
  for (const u of course.units) {
    const unitOpen = isUnitReached(u.number);
    let foundCurrentInUnit = false;
    for (const n of u.nodes) {
      const isDone =
        n.type === 'chest'
          ? claimedChests.includes(n.id)
          : Boolean(completedNodes[n.id]);

      if (isDone) {
        nodeStates[n.id] = 'completed';
      } else if (unitOpen && !foundCurrentInUnit) {
        nodeStates[n.id] = 'current';
        foundCurrentInUnit = true;
      } else {
        nodeStates[n.id] = 'locked';
      }
    }
  }

  const visibleUnits =
    cefrFilter === 'ALL'
      ? course.units
      : course.units.filter((u) => u.cefr === cefrFilter);

  const totalExercisesInCourse = course.units.reduce(
    (sum, u) => sum + u.nodes.reduce((ns, n) => ns + n.exercises.length, 0),
    0
  );

  return (
    <div className="space-y-8 pb-16">
      {course.id === 'fusha' && <button type="button" onClick={() => setShowArabicGuide(true)} className="w-full flex items-center gap-3 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-4 text-start font-black text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"><BookOpen className="w-6 h-6 shrink-0" /><span>{uiLang === 'ar' ? '📚 مرجع النحو والصرف والإعراب والبلاغة' : uiLang === 'fr' ? 'Guide de grammaire et de rhétorique arabe' : 'Arabic grammar and rhetoric guide'}</span></button>}
      {showArabicGuide && course.id === 'fusha' && <ArabicGrammarGuideModal uiLang={uiLang} onClose={() => setShowArabicGuide(false)} />}
      {/* CEFR Level Progress Bar (A1 -> C2) */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <span>🎓</span>
            {uiLang === 'ar'
              ? `سلم الإتقان الأوروبي (A1 ➔ C2) • ${totalExercisesInCourse}+ تمرين فهاد المسار:`
              : `CEFR Mastery Ladder (A1 ➔ C2) • ${totalExercisesInCourse}+ Exercises:`}
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setCefrFilter('ALL');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
              cefrFilter === 'ALL'
                ? 'bg-duo-green text-white'
                : 'bg-slate-100 dark:bg-duo-nightSubtle text-slate-600 dark:text-slate-300'
            }`}
          >
            {uiLang === 'ar' ? 'عرض المسار كامل' : 'Show Full Path'}
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CEFR_ORDER.map((lvl, i) => {
            const unitNum = i + 1;
            const reached = isUnitReached(unitNum);
            const selected = cefrFilter === lvl;
            const unitObj = course.units.find((u) => u.cefr === lvl);
            const doneNodes = unitObj
              ? unitObj.nodes.filter((n) =>
                  n.type === 'chest'
                    ? claimedChests.includes(n.id)
                    : Boolean(completedNodes[n.id])
                ).length
              : 0;
            const totalNodes = unitObj ? unitObj.nodes.length : 9;

            return (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setCefrFilter(selected ? 'ALL' : lvl);
                }}
                className={`p-2.5 rounded-2xl border-2 border-b-4 text-center transition-all ${
                  selected
                    ? 'border-duo-blue bg-sky-50 dark:bg-sky-950 text-duo-blueDark dark:text-sky-300'
                    : reached
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-duo-nightBorder bg-slate-50 dark:bg-duo-nightSubtle text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className="font-black text-base flex items-center justify-center gap-1">
                  {lvl}
                  {!reached && <Lock className="w-3 h-3 opacity-60" />}
                </div>
                <div className="text-[10px] font-bold opacity-80">
                  {doneNodes}/{totalNodes}{' '}
                  {uiLang === 'ar' ? 'محطات' : 'nodes'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {visibleUnits.map((unit) => {
        const theme = UNIT_THEMES[unit.themeColor] || UNIT_THEMES.emerald;
        const unitOpen = isUnitReached(unit.number);

        return (
          <section key={unit.id} className="space-y-7">
            {/* Unit Banner */}
            <div
              className={`rounded-3xl bg-gradient-to-r ${theme.banner} border-b-4 p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-white text-xs font-black tracking-wide">
                    {t(CEFR_LABELS[unit.cefr], uiLang)}
                  </span>
                  <span className="text-xs font-extrabold opacity-85">
                    • {unit.nodes.length} {uiLang === 'ar' ? 'محطات متدرجة' : 'stages'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  {t(unit.title, uiLang)}
                </h2>
                <p className="text-sm text-white/90 font-semibold">
                  {t(unit.description, uiLang)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                {!unitOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      onStartJumpTest(unit);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-300 hover:bg-amber-200 text-amber-950 border-2 border-amber-500 font-black text-xs sm:text-sm shadow-sm transition-all"
                  >
                    <FastForward className="w-4 h-4" />
                    {t(UI_STRINGS.jumpHereBtn, uiLang)}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setGuideUnit(unit);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 border-2 border-white/40 font-extrabold text-xs sm:text-sm backdrop-blur-sm transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  {t(UI_STRINGS.unitGuideBtn, uiLang)}
                </button>
              </div>
            </div>

            {/* Winding Skill Nodes */}
            <div className="flex flex-col items-center space-y-5 py-2 relative">
              {unit.nodes.map((node, idx) => {
                const status = nodeStates[node.id];
                const progress = completedNodes[node.id];
                const crownsEarned = Math.min(3, progress?.completedCount || 0);
                const isSelected = selectedNodeId === node.id;
                const offsetClass =
                  WINDING_OFFSETS[idx % WINDING_OFFSETS.length];

                const isChest = node.type === 'chest';
                const isLegend = node.type === 'legendary';
                const isSpeakNode = node.type === 'speaking_focus';
                const isReviewNode = node.type === 'unit_review';

                let btnStyle =
                  'bg-slate-200 dark:bg-duo-nightSubtle border-slate-300 dark:border-duo-nightBorder text-slate-400 dark:text-slate-500';
                if (status === 'completed') {
                  btnStyle =
                    isLegend || crownsEarned >= 3
                      ? 'bg-gradient-to-b from-amber-300 to-duo-gold border-duo-goldDark text-amber-950 shadow-lg'
                      : theme.doneBtn;
                } else if (status === 'current') {
                  btnStyle = `${theme.activeBtn} ring-8 shadow-lg`;
                }

                return (
                  <div
                    key={node.id}
                    className={`relative flex flex-col items-center ${offsetClass}`}
                  >
                    {/* Floating Start Badge on Current Node */}
                    {status === 'current' && !isSelected && (
                      <div className="mb-2 px-3.5 py-1.5 rounded-2xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder shadow-md font-black text-xs text-duo-green animate-bounce flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {isChest
                          ? uiLang === 'ar'
                            ? 'افتح الهدية!'
                            : 'OPEN!'
                          : isSpeakNode
                          ? uiLang === 'ar'
                            ? 'نطق بالمايكروفون 🎙️'
                            : 'SPEAK 🎙️'
                          : isReviewNode
                          ? uiLang === 'ar'
                            ? 'مراجعة شاملة 🔄'
                            : 'REVIEW 🔄'
                          : t(UI_STRINGS.startLesson, uiLang)}
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      {status === 'current' && (
                        <div className="hidden sm:block animate-float">
                          <ZikoMascot mood="happy" outfit={outfit} size={68} />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setSelectedNodeId(isSelected ? null : node.id);
                        }}
                        className={`w-20 h-20 rounded-full border-b-[6px] flex flex-col items-center justify-center transition-transform active:translate-y-1 ${btnStyle}`}
                        aria-label={t(node.title, uiLang)}
                      >
                        {status === 'locked' ? (
                          <Lock className="w-7 h-7" />
                        ) : isChest ? (
                          <Gift className="w-8 h-8" />
                        ) : isLegend ? (
                          <Crown className="w-8 h-8" />
                        ) : isSpeakNode ? (
                          <Mic className="w-8 h-8" />
                        ) : isReviewNode ? (
                          <RefreshCw className="w-7 h-7" />
                        ) : status === 'completed' && crownsEarned >= 3 ? (
                          <Crown className="w-8 h-8" />
                        ) : status === 'completed' ? (
                          <Check className="w-8 h-8 stroke-[3]" />
                        ) : (
                          <Star className="w-8 h-8 fill-current" />
                        )}
                      </button>
                    </div>

                    {/* Crown Mastery Stars under lesson nodes */}
                    {!isChest && !isLegend && status !== 'locked' && (
                      <div className="mt-1 flex items-center gap-0.5">
                        {[1, 2, 3].map((starIdx) => (
                          <Star
                            key={starIdx}
                            className={`w-3.5 h-3.5 ${
                              crownsEarned >= starIdx
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    <span className="mt-1 text-xs font-extrabold text-slate-600 dark:text-slate-300 text-center max-w-[200px]">
                      {t(node.title, uiLang)}
                    </span>

                    {/* Popover Card */}
                    {isSelected && (
                      <div className="mt-3 z-20 w-72 sm:w-80 rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder shadow-xl p-4 text-center space-y-3 animate-pop">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {node.cefr} • +{node.xpReward} XP • +{node.gemReward} 💎
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedNodeId(null)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                            {node.icon} {t(node.title, uiLang)}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {t(node.subtitle, uiLang)}
                          </p>
                          {progress && !isChest && (
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                              {uiLang === 'ar'
                                ? `مستوى التاج: ${Math.min(3, progress.completedCount)}/3 ⭐ • أحسن دقة: ${progress.bestAccuracy}%`
                                : `Crown Level: ${Math.min(3, progress.completedCount)}/3 ⭐ • Best: ${progress.bestAccuracy}%`}
                            </p>
                          )}
                        </div>

                        {status === 'locked' ? (
                          <div className="space-y-2">
                            <div className="py-2 px-3 rounded-2xl bg-slate-100 dark:bg-duo-nightSubtle text-slate-500 dark:text-slate-400 text-xs font-bold">
                              {uiLang === 'ar'
                                ? 'كمّل المحطة اللي قبلها أو دوز امتحان تخطي المستوى!'
                                : 'Complete the previous step or take the Jump-Ahead Test!'}
                            </div>
                            {!unitOpen && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedNodeId(null);
                                  onStartJumpTest(unit);
                                }}
                                className="w-full py-2.5 rounded-2xl bg-duo-blue border-b-4 border-duo-blueDark text-white font-black text-xs"
                              >
                                {t(UI_STRINGS.jumpHereBtn, uiLang)}
                              </button>
                            )}
                          </div>
                        ) : isChest ? (
                          status === 'completed' ? (
                            <div className="py-2.5 px-3 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-black">
                              🎉{' '}
                              {uiLang === 'ar'
                                ? 'تم استلام مكافأة الصندوق بنجاح!'
                                : 'Chest reward already claimed!'}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                sound.playVictory();
                                onClaimChest(node);
                                setSelectedNodeId(null);
                              }}
                              className="w-full py-3 rounded-2xl bg-duo-gold border-b-4 border-duo-goldDark font-black text-amber-950 text-sm"
                            >
                              🎁{' '}
                              {uiLang === 'ar'
                                ? `افتح الصندوق (+${node.gemReward} 💎)`
                                : `Claim Chest (+${node.gemReward} 💎)`}
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNodeId(null);
                              onStartLesson(unit, node);
                            }}
                            className="w-full py-3 rounded-2xl bg-duo-green hover:bg-duo-greenLight border-b-4 border-duo-greenDark font-black text-white text-sm"
                          >
                            {status === 'completed'
                              ? t(UI_STRINGS.practiceAgain, uiLang)
                              : isLegend
                              ? t(UI_STRINGS.legendaryChallenge, uiLang)
                              : t(UI_STRINGS.startLesson, uiLang)}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Unit Guidebook Modal */}
      {guideUnit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-duo-nightCard rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl border-2 border-slate-200 dark:border-duo-nightBorder animate-pop">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-duo-nightBorder pb-4">
              <div>
                <span className="text-xs font-black uppercase text-duo-blue">
                  📖 {t(UI_STRINGS.unitGuideBtn, uiLang)} • {guideUnit.cefr} (100% Free)
                </span>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                  {t(guideUnit.title, uiLang)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGuideUnit(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-duo-nightSubtle hover:bg-slate-200 text-slate-600 dark:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-black text-sm text-slate-700 dark:text-slate-200">
                💡{' '}
                {uiLang === 'ar'
                  ? 'قواعد ومفاتيح المستوى:'
                  : uiLang === 'fr'
                  ? 'Points clés de grammaire :'
                  : 'Key Grammar Insights:'}
              </h4>
              {guideUnit.grammarNotes.map((note, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  {t(note, uiLang)}
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <h4 className="font-black text-sm text-slate-700 dark:text-slate-200">
                🗣️{' '}
                {uiLang === 'ar'
                  ? `جميع عبارات الوحدة (${guideUnit.guidePhrases.length} عبارة — اضغط للسماع):`
                  : `All Unit Expressions (${guideUnit.guidePhrases.length} — tap to listen):`}
              </h4>
              <div className="space-y-2">
                {guideUnit.guidePhrases.map((phrase, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sound.speak(phrase.target, course.ttsLang)}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-duo-nightSubtle hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-2 border-slate-200 dark:border-duo-nightBorder flex items-center justify-between gap-3 text-start transition-colors"
                  >
                    <div>
                      <div className="font-black text-slate-800 dark:text-slate-100 text-base">
                        {phrase.target}
                      </div>
                      {phrase.pronunciation && (
                        <div dir="ltr" className="text-[11px] font-bold text-indigo-500 dark:text-indigo-300">
                          [{phrase.pronunciation}]
                        </div>
                      )}
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {t(phrase.meaning, uiLang)}
                      </div>
                    </div>
                    <Volume2 className="w-5 h-5 text-duo-blue shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
