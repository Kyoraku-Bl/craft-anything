import React from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, Gift, Target } from 'lucide-react';
import { UILang, UserState } from '../types';
import { t } from '../i18n';
import { sound } from '../utils/sound';

interface QuestsViewProps {
  user: UserState;
  onClaimQuest: (questId: string, gems: number) => void;
}

export const QuestsView: React.FC<QuestsViewProps> = ({ user, onClaimQuest }) => {
  const uiLang: UILang = user.uiLang;
  const claimedToday = user.claimedDailyQuests || [];

  const dailyQuests = [
    {
      id: 'q_daily_xp',
      icon: '⚡',
      title: {
        ar: `حقق الهدف اليومي (${user.dailyGoalXp} XP)`,
        fr: `Atteindre l’objectif du jour (${user.dailyGoalXp} XP)`,
        en: `Reach your Daily Goal (${user.dailyGoalXp} XP)`,
      },
      current: user.todayXp,
      target: user.dailyGoalXp,
      gems: 25,
    },
    {
      id: 'q_speaking_mic',
      icon: '🎙️',
      title: {
        ar: 'انطق 3 جمل بنجاح فالمايكروفون',
        fr: 'Réussir 3 phrases au microphone',
        en: 'Complete 3 Microphone Speaking drills',
      },
      current: user.todaySpeakingCount,
      target: 3,
      gems: 35,
    },
    {
      id: 'q_two_lessons',
      icon: '🎯',
      title: {
        ar: 'كمّل جوج حصص بدقة 80% أو أكثر',
        fr: 'Terminer 2 sessions avec 80%+ de précision',
        en: 'Complete 2 sessions with 80%+ accuracy',
      },
      current: user.todayPerfectCount,
      target: 2,
      gems: 35,
    },
  ];

  const completedNodesCount = Object.values(user.completedNodes).filter(
    (n) => n.completedCount > 0
  ).length;
  const legendaryCount = Object.values(user.completedNodes).filter(
    (n) => n.legendary
  ).length;
  const learnedWordsCount = Object.keys(user.wordMemories).length;

  const achievements = [
    {
      id: 'ach_first',
      emoji: '🌱',
      title: { ar: 'الانطلاقة الأولى', fr: 'Premier Pas', en: 'First Step' },
      desc: { ar: 'كمّل أول درس ليك فـ DimaLingo', fr: 'Terminer votre 1re leçon', en: 'Complete your very first lesson' },
      unlocked: completedNodesCount >= 1,
    },
    {
      id: 'ach_voice',
      emoji: '🎙️',
      title: { ar: 'فصيح اللسان', fr: 'Voix Claire', en: 'Clear Speaker' },
      desc: { ar: 'أنجز تمارين النطق بالمايكروفون', fr: 'Pratiquer la prononciation au micro', en: 'Complete speaking pronunciation drills' },
      unlocked: user.todaySpeakingCount >= 1,
    },
    {
      id: 'ach_words',
      emoji: '📚',
      title: { ar: 'صيّاد العبارات', fr: 'Chasseur de Mots', en: 'Expression Hunter' },
      desc: { ar: 'تعلّم 5 عبارات جديدة', fr: 'Apprendre 5 expressions', en: 'Learn 5 vocabulary expressions' },
      unlocked: learnedWordsCount >= 5,
    },
    {
      id: 'ach_legend',
      emoji: '👑',
      title: { ar: 'البطل الأسطوري (A1–C2)', fr: 'Maître Légendaire', en: 'CEFR Master' },
      desc: { ar: 'ربح أول تاج أسطوري ذهبي مجاناً', fr: 'Obtenir une couronne Légendaire', en: 'Earn a Golden Legendary Crown' },
      unlocked: legendaryCount >= 1,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs font-black uppercase opacity-95 mb-1">
          <Target className="w-4 h-4" />
          {uiLang === 'ar' ? 'تحديات كل نهار' : 'Daily Quests'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">
          {uiLang === 'ar'
            ? 'المهام اليومية والأوسمة 🏅'
            : uiLang === 'fr'
            ? 'Quêtes Quotidiennes & Succès 🏅'
            : 'Daily Quests & Achievements 🏅'}
        </h1>
        <p className="text-sm font-bold opacity-95 mt-1">
          {uiLang === 'ar'
            ? 'كمّل المهام اليومية باش تربح مجوهرات مجانية تفتح بيها التعزيزات وأزياء زيكو!'
            : 'Complete daily challenges to earn free Gems for power-ups and mascot outfits!'}
        </p>
      </div>

      {/* Daily Quests */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
          🎯 {uiLang === 'ar' ? 'مهام اليوم' : 'Today’s Quests'}
        </h2>

        <div className="space-y-3.5">
          {dailyQuests.map((q) => {
            const pct = Math.min(100, Math.round((q.current / q.target) * 100));
            const done = q.current >= q.target;
            const claimed = claimedToday.includes(q.id);

            return (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-duo-nightSubtle border-2 border-slate-200 dark:border-duo-nightBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="text-3xl">{q.icon}</div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                        {t(q.title, uiLang)}
                      </span>
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                        {Math.min(q.current, q.target)} / {q.target}
                      </span>
                    </div>
                    <div className="h-3.5 bg-slate-200 dark:bg-duo-nightCard rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-duo-gold rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {claimed ? (
                    <span className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                      <CheckCircle2 className="w-4 h-4" />
                      {uiLang === 'ar' ? 'تم الاستلام' : 'Claimed'}
                    </span>
                  ) : done ? (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playVictory();
                        confetti({ particleCount: 55, spread: 60, origin: { y: 0.7 } });
                        onClaimQuest(q.id, q.gems);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-duo-green border-b-4 border-duo-greenDark text-white text-xs font-black animate-bounce"
                    >
                      <Gift className="w-4 h-4" />
                      +{q.gems} 💎
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white dark:bg-duo-nightCard border border-slate-200 dark:border-duo-nightBorder text-slate-400 text-xs font-black">
                      +{q.gems} 💎
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-duo-purple" />
          {uiLang === 'ar' ? 'أوسمة الإنجاز' : 'Badges & Achievements'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border-2 flex items-center gap-3.5 transition-all ${
                ach.unlocked
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-duo-nightSubtle border-slate-200 dark:border-duo-nightBorder opacity-60 grayscale'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-duo-nightCard border border-slate-200 dark:border-duo-nightBorder flex items-center justify-center text-2xl shrink-0">
                {ach.emoji}
              </div>
              <div>
                <div className="font-black text-slate-800 dark:text-slate-100 text-sm">
                  {t(ach.title, uiLang)}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t(ach.desc, uiLang)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
