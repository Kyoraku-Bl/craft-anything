import React from 'react';
import { ArrowUpCircle, Shield, Trophy } from 'lucide-react';
import { UILang } from '../types';

interface LeaderboardViewProps {
  userName: string;
  userXp: number;
  uiLang: UILang;
}

const PEERS = [
  { id: 'p1', name: 'Yassine El.', country: '🇲🇦', baseXp: 340, avatar: '🦁' },
  { id: 'p2', name: 'Salma B.', country: '🇲🇦', baseXp: 275, avatar: '🌸' },
  { id: 'p3', name: 'Lucas M.', country: '🇫🇷', baseXp: 210, avatar: '🦊' },
  { id: 'p4', name: 'Sofia R.', country: '🇪🇸', baseXp: 165, avatar: '🦋' },
  { id: 'p5', name: 'Amine K.', country: '🇲🇦', baseXp: 120, avatar: '🦅' },
  { id: 'p6', name: 'Noah T.', country: '🇬🇧', baseXp: 85, avatar: '🐼' },
  { id: 'p7', name: 'Meriem H.', country: '🇲🇦', baseXp: 55, avatar: '✨' },
  { id: 'p8', name: 'Kenji S.', country: '🇯🇵', baseXp: 30, avatar: '🐯' },
];

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  userName,
  userXp,
  uiLang,
}) => {
  const leagues = [
    { min: 0, icon: '🥉', ar: 'الدوري البرونزي', fr: 'Ligue Bronze', en: 'Bronze League' },
    { min: 100, icon: '🥈', ar: 'الدوري الفضي', fr: 'Ligue Argent', en: 'Silver League' },
    { min: 250, icon: '🥇', ar: 'الدوري الذهبي', fr: 'Ligue Or', en: 'Gold League' },
    { min: 500, icon: '💠', ar: 'دوري الياقوت', fr: 'Ligue Saphir', en: 'Sapphire League' },
    { min: 900, icon: '💎', ar: 'الدوري الألماسي', fr: 'Ligue Diamant', en: 'Diamond League' },
  ];

  const currentLeague =
    [...leagues].reverse().find((l) => userXp >= l.min) || leagues[0];

  const entries = [
    ...PEERS.map((p) => ({
      id: p.id,
      name: `${p.name} ${p.country}`,
      xp: p.baseXp,
      avatar: p.avatar,
      isUser: false,
    })),
    {
      id: 'me',
      name: `${userName} (${uiLang === 'ar' ? 'أنت' : uiLang === 'fr' ? 'Vous' : 'You'})`,
      xp: userXp,
      avatar: '🦊',
      isUser: true,
    },
  ].sort((a, b) => b.xp - a.xp);

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-3xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder p-6 text-center space-y-3 shadow-sm">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {leagues.map((l) => {
            const active = l.min === currentLeague.min;
            return (
              <div
                key={l.en}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border-2 transition-all ${
                  active
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-duo-gold scale-110 shadow-md'
                    : userXp >= l.min
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-duo-nightSubtle border-slate-200 dark:border-duo-nightBorder opacity-45 grayscale'
                }`}
              >
                {l.icon}
              </div>
            );
          })}
        </div>

        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-duo-gold" />
          {currentLeague[uiLang]}
        </h1>
        <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
          {uiLang === 'ar'
            ? 'أول 5 متصدرين كيتأهلو للدوري الأعلى! كل درس وتمرين نطق كيطلعك فالترتيب.'
            : 'Top 5 advance to the next league! Earn XP in lessons & speaking drills.'}
        </p>
      </div>

      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder overflow-hidden shadow-sm">
        {entries.map((entry, idx) => {
          const rank = idx + 1;
          const showPromoDivider = idx === 4;

          return (
            <React.Fragment key={entry.id}>
              <div
                className={`px-5 py-3.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-duo-nightBorder ${
                  entry.isUser
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40'
                    : 'bg-white dark:bg-duo-nightCard'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                      rank === 1
                        ? 'bg-duo-gold text-amber-950'
                        : rank === 2
                        ? 'bg-slate-200 text-slate-800'
                        : rank === 3
                        ? 'bg-amber-200 text-amber-900'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {rank}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-duo-nightSubtle border border-slate-200 dark:border-duo-nightBorder flex items-center justify-center text-xl">
                    {entry.avatar}
                  </div>
                  <span
                    className={`font-black text-sm sm:text-base ${
                      entry.isUser
                        ? 'text-duo-greenDark dark:text-duo-green'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {entry.name}
                  </span>
                </div>

                <span className="font-black text-sm text-slate-700 dark:text-slate-200 shrink-0">
                  {entry.xp} XP
                </span>
              </div>

              {showPromoDivider && (
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-y border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5">
                  <ArrowUpCircle className="w-4 h-4" />
                  {uiLang === 'ar'
                    ? 'منطقة التأهل للدوري الأعلى (Promotion Zone)'
                    : 'Promotion Zone'}
                  <Shield className="w-4 h-4" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
