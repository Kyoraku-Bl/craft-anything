import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Globe2,
  Infinity as InfinityIcon,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
import { COURSES } from '../data';
import { t } from '../i18n';
import { CourseId, UILang } from '../types';
import { sound } from '../utils/sound';
import { ZikoMascot } from './ZikoMascot';

interface OnboardingViewProps {
  initialLang: UILang;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onChangeLang: (lang: UILang) => void;
  onOpenApkModal: () => void;
  onOpenIosModal: () => void;
  onComplete: (params: {
    name: string;
    uiLang: UILang;
    courseId: CourseId;
    dailyGoalXp: number;
  }) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  initialLang,
  darkMode,
  onToggleDarkMode,
  onChangeLang,
  onOpenApkModal,
  onOpenIosModal,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [uiLang, setUiLang] = useState<UILang>(initialLang);
  const [selectedCourse, setSelectedCourse] = useState<CourseId>('en');
  const [dailyGoalXp, setDailyGoalXp] = useState<number>(20);
  const [name, setName] = useState<string>('');

  const handleLangSwitch = (lang: UILang) => {
    sound.playTap();
    setUiLang(lang);
    onChangeLang(lang);
  };

  const goals = [
    {
      xp: 10,
      label: {
        ar: 'خفيف • 5 دقائق/يوم',
        fr: 'Tranquille • 5 min/jour',
        en: 'Casual • 5 min/day',
      },
    },
    {
      xp: 20,
      label: {
        ar: 'منتظم • 10 دقائق/يوم',
        fr: 'Régulier • 10 min/jour',
        en: 'Regular • 10 min/day',
      },
    },
    {
      xp: 30,
      label: {
        ar: 'جدي • 15 دقيقة/يوم',
        fr: 'Sérieux • 15 min/jour',
        en: 'Serious • 15 min/day',
      },
    },
    {
      xp: 50,
      label: {
        ar: 'مكثف (بطل C2!) • 25 دقيقة/يوم',
        fr: 'Intense (Objectif C2 !) • 25 min/jour',
        en: 'Intense (C2 Hero!) • 25 min/day',
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-sky-50 dark:from-duo-nightBg dark:via-duo-nightCard dark:to-duo-nightBg flex flex-col justify-between p-4 sm:p-8 transition-colors">
      {/* Top Bar */}
      <header className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-duo-green flex items-center justify-center text-white font-black text-xl shadow-sm">
            D
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-duo-green">
              DimaLingo
            </span>
            <span className="hidden sm:inline-block mx-2 px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              100% FREE • A1 ➔ C2
            </span>
          </div>
        </div>

        {/* Theme Switcher + iOS + APK + Interface Language */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* iPhone / iOS Install Button */}
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onOpenIosModal();
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-100 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-300 font-black text-xs hover:brightness-95"
          >
            <span>🍎</span>
            <span>iPhone</span>
          </button>

          {/* Android APK Download Button */}
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onOpenApkModal();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black text-xs hover:brightness-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>APK</span>
          </button>

          {/* Explicit Light / Dark Mode Dual Icon Switcher */}
          <div className="flex items-center bg-white dark:bg-duo-nightCard rounded-2xl p-1 border-2 border-slate-200 dark:border-duo-nightBorder shadow-sm">
            <button
              type="button"
              onClick={() => {
                if (darkMode) {
                  sound.playTap();
                  onToggleDarkMode();
                }
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                !darkMode
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {uiLang === 'ar' ? 'نهاري' : 'Light'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!darkMode) {
                  sound.playTap();
                  onToggleDarkMode();
                }
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                darkMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {uiLang === 'ar' ? 'ليلي' : 'Dark'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-duo-nightCard rounded-2xl p-1 border-2 border-slate-200 dark:border-duo-nightBorder shadow-sm">
            <Globe2 className="w-4 h-4 text-slate-400 mx-1.5" />
            {(
              [
                { id: 'ar', label: 'العربية' },
                { id: 'fr', label: 'FR' },
                { id: 'en', label: 'EN' },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => handleLangSwitch(l.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all ${
                  uiLang === l.id
                    ? 'bg-duo-blue text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-duo-nightSubtle'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Center Content */}
      <main className="max-w-4xl w-full mx-auto my-8">
        {step === 1 ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-center gap-6 bg-white dark:bg-duo-nightCard rounded-3xl p-6 sm:p-8 border-2 border-slate-200 dark:border-duo-nightBorder shadow-sm">
              <div className="animate-float shrink-0">
                <ZikoMascot mood="happy" outfit="tarbouche" size={135} />
              </div>
              <div className="space-y-3 text-center md:text-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                  <InfinityIcon className="w-4 h-4" />
                  {uiLang === 'ar'
                    ? 'أزيد من 1,500 تمرين + 330 جملة نطق بالمايكروفون مجاناً!'
                    : '1,500+ Exercises + 330+ Live Mic Phrases — 100% Free!'}
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                  {uiLang === 'ar'
                    ? 'مرحبا بيك فـ ديما لينغو! أشمن لغة بغيتي تتقن من A1 حتى C2؟'
                    : uiLang === 'fr'
                    ? 'Bienvenue sur DimaLingo ! Quelle langue voulez-vous maîtriser de A1 à C2 ?'
                    : 'Welcome to DimaLingo! Which language do you want to master from A1 to C2?'}
                </h1>
                <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base font-medium">
                  {uiLang === 'ar'
                    ? 'مسار شامل من الصفر حتى الإتقان الكامل (C2)، مراجعة ذكية مكثفة، ومختبر النطق بالمايكروفون فجميع اللغات!'
                    : 'Complete A1–C2 curriculum, 8 intensive revision modes, and live microphone pronunciation scoring!'}
                </p>
              </div>
            </div>

            {/* Course Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COURSES.map((course) => {
                const active = selectedCourse === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setSelectedCourse(course.id);
                    }}
                    className={`group text-start p-5 rounded-3xl border-2 border-b-4 transition-all flex items-center gap-4 ${
                      active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-duo-green shadow-md -translate-y-0.5'
                        : 'bg-white dark:bg-duo-nightCard border-slate-200 dark:border-duo-nightBorder hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-duo-nightSubtle'
                    }`}
                  >
                    <div className="text-5xl shrink-0">{course.flag}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                          {t(course.name, uiLang)}
                        </h3>
                        {active && (
                          <CheckCircle2 className="w-6 h-6 text-duo-green shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 line-clamp-2">
                        {t(course.tagline, uiLang)}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-duo-blue bg-sky-50 dark:bg-sky-950 px-2.5 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" />6 Units (A1–C2) • 54 Stages • 🎙️ Mic
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setStep(2);
                }}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-duo-green hover:bg-duo-greenLight active:translate-y-0.5 border-b-4 border-duo-greenDark text-white font-black text-base tracking-wide transition-all shadow-sm"
              >
                {uiLang === 'ar'
                  ? 'متابعة ⬅️'
                  : uiLang === 'fr'
                  ? 'Continuer ➔'
                  : 'Continue ➔'}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-white dark:bg-duo-nightCard rounded-3xl p-6 sm:p-8 border-2 border-slate-200 dark:border-duo-nightBorder shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <ZikoMascot mood="celebrating" outfit="classic" size={88} />
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {uiLang === 'ar'
                    ? 'حدد الهدف اليومي ديالك 🎯'
                    : uiLang === 'fr'
                    ? 'Fixez votre objectif quotidien 🎯'
                    : 'Set your daily learning goal 🎯'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                  {uiLang === 'ar'
                    ? 'المواظبة اليومية هي اللي كتوصلك لمستوى C2!'
                    : 'Daily consistency is the secret to reaching C2 mastery!'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-2">
                {uiLang === 'ar'
                  ? 'سميتك (اختياري):'
                  : uiLang === 'fr'
                  ? 'Votre prénom (optionnel) :'
                  : 'Your name (optional):'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  uiLang === 'ar'
                    ? 'مثلاً: أمين، سارة...'
                    : uiLang === 'fr'
                    ? 'Ex : Yassine, Sara...'
                    : 'e.g. Amine, Sara...'
                }
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-duo-nightBorder focus:border-duo-blue focus:outline-none font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-duo-nightSubtle"
              />
            </div>

            <div className="space-y-2.5">
              {goals.map((g) => {
                const active = dailyGoalXp === g.xp;
                return (
                  <button
                    key={g.xp}
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setDailyGoalXp(g.xp);
                    }}
                    className={`w-full p-4 rounded-2xl border-2 border-b-4 flex items-center justify-between font-extrabold transition-all ${
                      active
                        ? 'border-duo-blue bg-sky-50 dark:bg-sky-950/60 text-duo-blueDark dark:text-sky-300'
                        : 'border-slate-200 dark:border-duo-nightBorder hover:bg-slate-50 dark:hover:bg-duo-nightSubtle text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{t(g.label, uiLang)}</span>
                    <span className="text-sm font-black px-3 py-1 rounded-xl bg-white dark:bg-duo-nightCard border border-slate-200 dark:border-duo-nightBorder">
                      {g.xp} XP
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3.5 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-duo-nightBorder font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-duo-nightSubtle"
              >
                {uiLang === 'ar' ? 'رجوع' : uiLang === 'fr' ? 'Retour' : 'Back'}
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playVictory();
                  onComplete({
                    name:
                      name ||
                      (uiLang === 'ar'
                        ? 'متعلم طموح'
                        : uiLang === 'fr'
                        ? 'Apprenant'
                        : 'Learner'),
                    uiLang,
                    courseId: selectedCourse,
                    dailyGoalXp,
                  });
                }}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-duo-green hover:bg-duo-greenLight border-b-4 border-duo-greenDark text-white font-black text-base"
              >
                {uiLang === 'ar'
                  ? 'انطلق فرحلة التعلم المجانية! 🚀'
                  : uiLang === 'fr'
                  ? 'Commencer gratuitement ! 🚀'
                  : 'Start Free Learning! 🚀'}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs font-bold text-slate-400 py-2">
        DimaLingo • A1–C2 • Live Mic Speaking Lab • Dark Mode • Android APK Ready 💚
      </footer>
    </div>
  );
};
