import React, { useEffect, useState } from 'react';
import {
  Brain,
  ChevronDown,
  Cpu,
  Download,
  Flame,
  Gem,
  Heart,
  Home,
  Infinity as InfinityIcon,
  Mic,
  Moon,
  ShoppingBag,
  Sparkles,
  Sun,
  Target,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { COURSE_MAP, COURSES } from './data';
import { t, UI_STRINGS } from './i18n';
import { useUserStore } from './store/useUserStore';
import { Exercise, LessonNode, NavTab, Unit } from './types';
import { sound } from './utils/sound';
import { OnboardingView } from './components/OnboardingView';
import { LearningPathView } from './components/LearningPathView';
import { LessonPlayer } from './components/LessonPlayer';
import { SpeakingLabView } from './components/SpeakingLabView';
import { PracticeHubView } from './components/PracticeHubView';
import { QuestsView } from './components/QuestsView';
import { LeaderboardView } from './components/LeaderboardView';
import { FreeShopView } from './components/FreeShopView';
import { ProfileView } from './components/ProfileView';
import { HowItWorksView } from './components/HowItWorksView';
import { ZikoMascot } from './components/ZikoMascot';
import { AndroidApkModal } from './components/AndroidApkModal';
import { IosInstallModal } from './components/IosInstallModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

interface ActiveSession {
  title: string;
  nodeId?: string;
  jumpToUnitNumber?: number;
  isLegendary?: boolean;
  isPractice?: boolean;
  exercises: Exercise[];
  xpReward: number;
  gemReward: number;
}

export function App() {
  const {
    user,
    completeOnboarding,
    setUILang,
    toggleDarkMode,
    setActiveCourse,
    toggleSound,
    toggleUnlimitedHearts,
    refillHeartsFree,
    loseHeartIfLimited,
    recordExerciseResult,
    finishSession,
    claimChest,
    claimQuest,
    buyShopItem,
    equipOutfit,
    updateProfile,
    importBackup,
    resetProgress,
  } = useUserStore();

  const [activeTab, setActiveTab] = useState<NavTab>('learn');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [heartsModalOpen, setHeartsModalOpen] = useState(false);
  const [apkModalOpen, setApkModalOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('apk') === '1' || params.get('install') === 'android';
  });
  const [iosModalOpen, setIosModalOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('ios') === '1' ||
      params.get('iphone') === '1' ||
      params.get('install') === 'ios'
    );
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
  };

  if (!user.onboarded) {
    return (
      <>
        <OnboardingView
          initialLang={user.uiLang}
          darkMode={user.darkMode}
          onToggleDarkMode={toggleDarkMode}
          onChangeLang={setUILang}
          onOpenApkModal={() => setApkModalOpen(true)}
          onOpenIosModal={() => setIosModalOpen(true)}
          onComplete={completeOnboarding}
        />
        <AndroidApkModal
          open={apkModalOpen}
          uiLang={user.uiLang}
          canInstallPwa={Boolean(deferredPrompt)}
          onInstallPwa={handleInstallPwa}
          onClose={() => setApkModalOpen(false)}
          onSwitchToIos={() => setIosModalOpen(true)}
        />
        <IosInstallModal
          open={iosModalOpen}
          uiLang={user.uiLang}
          onClose={() => setIosModalOpen(false)}
          onSwitchToAndroid={() => setApkModalOpen(true)}
        />
      </>
    );
  }

  const activeCourse = COURSE_MAP[user.activeCourseId] || COURSES[0];
  const uiLang = user.uiLang;
  const xpBoostActive =
    user.xpBoostUntil !== null && user.xpBoostUntil > Date.now();
  const courseMistakesCount = user.mistakes.filter(
    (m) => m.courseId === activeCourse.id
  ).length;
  const unlockedUnitNum = user.unlockedUnitNumber[activeCourse.id] || 1;

  // Fullscreen Lesson / Jump Exam / Speaking Workout Mode
  if (activeSession) {
    return (
      <LessonPlayer
        courseId={activeCourse.id}
        sessionTitle={activeSession.title}
        exercises={activeSession.exercises}
        xpReward={activeSession.xpReward}
        gemReward={activeSession.gemReward}
        isLegendary={activeSession.isLegendary}
        isPractice={activeSession.isPractice}
        uiLang={uiLang}
        darkMode={user.darkMode}
        onToggleDarkMode={toggleDarkMode}
        unlimitedHearts={user.unlimitedHearts}
        hearts={user.hearts}
        xpBoostActive={xpBoostActive}
        outfit={user.equippedOutfit}
        onRecordExercise={recordExerciseResult}
        onLoseHeart={loseHeartIfLimited}
        onRefillHeartsFree={refillHeartsFree}
        onCompleteSession={({ accuracy, baseXp, gemsEarned }) => {
          finishSession({
            courseId: activeCourse.id,
            nodeId: activeSession.nodeId,
            jumpToUnitNumber: activeSession.jumpToUnitNumber,
            isLegendary: activeSession.isLegendary,
            isPractice: activeSession.isPractice,
            baseXp,
            gemsEarned,
            accuracy,
          });
        }}
        onExit={() => setActiveSession(null)}
      />
    );
  }

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'learn',
      label: t(UI_STRINGS.navLearn, uiLang),
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'speaking_lab',
      label: t(UI_STRINGS.navSpeakingLab, uiLang),
      icon: <Mic className="w-5 h-5" />,
    },
    {
      id: 'practice',
      label: t(UI_STRINGS.navPractice, uiLang),
      icon: <Brain className="w-5 h-5" />,
      badge: courseMistakesCount > 0 ? courseMistakesCount : undefined,
    },
    {
      id: 'quests',
      label: t(UI_STRINGS.navQuests, uiLang),
      icon: <Target className="w-5 h-5" />,
    },
    {
      id: 'leaderboard',
      label: t(UI_STRINGS.navLeaderboard, uiLang),
      icon: <Trophy className="w-5 h-5" />,
    },
    {
      id: 'shop',
      label: t(UI_STRINGS.navShop, uiLang),
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      id: 'profile',
      label: t(UI_STRINGS.navProfile, uiLang),
      icon: <User className="w-5 h-5" />,
    },
    {
      id: 'how_it_works',
      label: t(UI_STRINGS.navHowItWorks, uiLang),
      icon: <Cpu className="w-5 h-5" />,
    },
  ];

  const handleStartNodeLesson = (_unit: Unit, node: LessonNode) => {
    setActiveSession({
      title: t(node.title, uiLang),
      nodeId: node.id,
      isLegendary: node.type === 'legendary',
      isPractice: false,
      exercises: node.exercises,
      xpReward: node.xpReward,
      gemReward: node.gemReward,
    });
  };

  const handleStartJumpTest = (unit: Unit) => {
    const legendNode = unit.nodes.find((n) => n.type === 'legendary') || unit.nodes[0];
    setActiveSession({
      title:
        uiLang === 'ar'
          ? `🚀 اختبار التخطي للمستوى ${unit.cefr}`
          : `🚀 Jump-Ahead Exam (${unit.cefr})`,
      jumpToUnitNumber: unit.number,
      isLegendary: true,
      isPractice: false,
      exercises: legendNode.exercises,
      xpReward: 65,
      gemReward: 35,
    });
  };

  const dailyPct = Math.min(
    100,
    Math.round((user.todayXp / Math.max(10, user.dailyGoalXp)) * 100)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-duo-nightBg text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 bg-white dark:bg-duo-nightCard border-e-2 border-slate-200 dark:border-duo-nightBorder flex-col justify-between p-5 sticky top-0 h-screen">
        <div className="space-y-4 overflow-y-auto">
          <button
            type="button"
            onClick={() => setActiveTab('learn')}
            className="flex items-center gap-3 px-2 text-start"
          >
            <div className="w-11 h-11 rounded-2xl bg-duo-green border-b-4 border-duo-greenDark flex items-center justify-center text-white font-black text-2xl shadow-sm">
              D
            </div>
            <div>
              <div className="text-2xl font-black text-duo-green leading-none">
                DimaLingo
              </div>
              <div className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <InfinityIcon className="w-3.5 h-3.5" />
                {t(UI_STRINGS.freeBadge, uiLang)}
              </div>
            </div>
          </button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setActiveTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border-2 font-black text-sm transition-all ${
                    active
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-duo-blue text-duo-blueDark dark:text-sky-300'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-duo-nightSubtle'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-duo-red text-white text-xs font-black">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Direct iPhone (iOS) + Android (APK) Install Buttons in Sidebar */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setIosModalOpen(true);
              }}
              className="py-2.5 px-2 rounded-2xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-950 border-2 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-300 font-black text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>🍎</span>
              <span>iPhone</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setApkModalOpen(true);
              }}
              className="py-2.5 px-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950 border-2 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>APK</span>
            </button>
          </div>
        </div>

        {/* Bottom Light / Dark Switcher + UI Language Switcher */}
        <div className="pt-3 border-t border-slate-100 dark:border-duo-nightBorder space-y-2.5">
          {/* Explicit Light / Dark Segmented Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-duo-nightSubtle p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                if (user.darkMode) {
                  sound.playTap();
                  toggleDarkMode();
                }
              }}
              className={`py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                !user.darkMode
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              {uiLang === 'ar' ? 'نهاري' : 'Light'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!user.darkMode) {
                  sound.playTap();
                  toggleDarkMode();
                }
              }}
              className={`py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                user.darkMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              {uiLang === 'ar' ? 'ليلي' : 'Dark'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-duo-nightSubtle p-1 rounded-xl">
            {(
              [
                { id: 'ar', label: 'عربي' },
                { id: 'fr', label: 'FR' },
                { id: 'en', label: 'EN' },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setUILang(l.id);
                }}
                className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                  uiLang === l.id
                    ? 'bg-white dark:bg-duo-nightCard text-duo-blueDark dark:text-sky-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Sticky Top Stats Bar */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-duo-nightCard/95 backdrop-blur-sm border-b-2 border-slate-200 dark:border-duo-nightBorder">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
            {/* Course Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setCourseMenuOpen((o) => !o);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-duo-nightSubtle border-2 border-slate-200 dark:border-duo-nightBorder font-black text-sm text-slate-800 dark:text-slate-100"
              >
                <span className="text-xl">{activeCourse.flag}</span>
                <span className="hidden sm:inline">{t(activeCourse.name, uiLang)}</span>
                <span className="sm:hidden">{activeCourse.badgeCode}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {courseMenuOpen && (
                <div className="absolute top-full mt-2 start-0 w-72 bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder shadow-xl p-2 z-50 animate-pop">
                  <div className="px-3 py-1.5 text-xs font-black text-slate-400">
                    {uiLang === 'ar'
                      ? 'بدّل المسار اللغوي (A1 ➔ C2 مجاناً):'
                      : 'Switch Course (A1 ➔ C2 Free):'}
                  </div>
                  {COURSES.map((c) => {
                    const selected = c.id === activeCourse.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setActiveCourse(c.id);
                          setCourseMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-start font-extrabold text-sm transition-colors ${
                          selected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-duo-greenDark dark:text-duo-green'
                            : 'hover:bg-slate-50 dark:hover:bg-duo-nightSubtle text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-2xl">{c.flag}</span>
                          <span>{t(c.name, uiLang)}</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {c.learnersCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stats & Action Pills */}
            <div className="flex items-center gap-1 sm:gap-2.5">
              {/* Streak */}
              <button
                type="button"
                onClick={() => setActiveTab('quests')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/40 font-black text-sm text-orange-500"
                title="Streak"
              >
                <Flame
                  className={`w-5 h-5 ${
                    user.streak > 0
                      ? 'fill-orange-500 text-orange-500'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
                <span>{user.streak}</span>
              </button>

              {/* Gems */}
              <button
                type="button"
                onClick={() => setActiveTab('shop')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40 font-black text-sm text-duo-blue"
                title="Free Gems"
              >
                <Gem className="w-5 h-5 fill-sky-400 text-duo-blue" />
                <span>{user.gems}</span>
              </button>

              {/* Unlimited Hearts */}
              <button
                type="button"
                onClick={() => setHeartsModalOpen((v) => !v)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 font-black text-sm text-rose-500"
                title="Unlimited Hearts"
              >
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-rose-500 text-rose-500" />
                {user.unlimitedHearts ? (
                  <InfinityIcon className="w-4 h-4 stroke-[3] text-duo-green" />
                ) : (
                  <span>{user.hearts}</span>
                )}
              </button>

              {/* Explicit Dual-Icon Light / Dark Mode Pill */}
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  toggleDarkMode();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 font-black text-xs transition-all ${
                  user.darkMode
                    ? 'bg-indigo-950 border-indigo-700 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}
                title={user.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {user.darkMode ? (
                  <>
                    <Moon className="w-4 h-4 fill-indigo-400 text-indigo-300" />
                    <Sun className="w-3.5 h-3.5 opacity-60" />
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <Moon className="w-3.5 h-3.5 opacity-55" />
                  </>
                )}
              </button>

              {/* iPhone / iOS Quick Button */}
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setIosModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border-2 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-black text-xs"
                title="Install on iPhone / iPad (All iOS)"
              >
                <span>🍎</span>
                <span className="hidden md:inline">iOS</span>
              </button>

              {/* Android APK Quick Button */}
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setApkModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-xs"
                title="Download Android APK"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">APK</span>
              </button>

              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className="hidden sm:inline-flex p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-duo-nightSubtle text-slate-500"
                title="Sound"
              >
                {user.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-duo-blue" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Mobile Language Switcher */}
              <button
                type="button"
                onClick={() => {
                  const order = ['ar', 'fr', 'en'] as const;
                  const next = order[(order.indexOf(uiLang) + 1) % order.length];
                  setUILang(next);
                }}
                className="lg:hidden px-2 py-1 rounded-xl bg-slate-100 dark:bg-duo-nightSubtle text-xs font-black text-slate-700 dark:text-slate-200"
              >
                {uiLang.toUpperCase()}
              </button>
            </div>
          </div>
        </header>

        {/* Unlimited Hearts Info Modal */}
        {heartsModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setHeartsModalOpen(false)}
          >
            <div
              className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-pop"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-duo-green">
                <InfinityIcon className="w-9 h-9 stroke-[3]" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
                {t(UI_STRINGS.unlimitedHeartsTitle, uiLang)}
              </h3>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {t(UI_STRINGS.unlimitedHeartsDesc, uiLang)}
              </p>
              <button
                type="button"
                onClick={() => setHeartsModalOpen(false)}
                className="w-full py-3 rounded-2xl bg-duo-green border-b-4 border-duo-greenDark text-white font-black"
              >
                {t(UI_STRINGS.continueBtn, uiLang)}
              </button>
            </div>
          </div>
        )}

        {/* Android APK & iOS Installer Modals */}
        <AndroidApkModal
          open={apkModalOpen}
          uiLang={uiLang}
          canInstallPwa={Boolean(deferredPrompt)}
          onInstallPwa={handleInstallPwa}
          onClose={() => setApkModalOpen(false)}
          onSwitchToIos={() => setIosModalOpen(true)}
        />
        <IosInstallModal
          open={iosModalOpen}
          uiLang={uiLang}
          onClose={() => setIosModalOpen(false)}
          onSwitchToAndroid={() => setApkModalOpen(true)}
        />

        {/* Content + Right Widgets Grid */}
        <div className="max-w-5xl w-full mx-auto px-4 pt-6 flex-1 grid grid-cols-1 xl:grid-cols-12 gap-8">
          <main className="xl:col-span-8 min-w-0">
            {activeTab === 'learn' && (
              <LearningPathView
                course={activeCourse}
                uiLang={uiLang}
                completedNodes={user.completedNodes}
                unlockedUnitNum={unlockedUnitNum}
                claimedChests={user.claimedChests}
                outfit={user.equippedOutfit}
                onStartLesson={handleStartNodeLesson}
                onStartJumpTest={handleStartJumpTest}
                onClaimChest={(node) =>
                  claimChest(activeCourse.id, node.id, node.xpReward, node.gemReward)
                }
              />
            )}

            {activeTab === 'speaking_lab' && (
              <SpeakingLabView
                activeCourse={activeCourse}
                uiLang={uiLang}
                onSelectCourse={setActiveCourse}
                onStartSpeakingWorkout={(title, exercises, xp, gems) =>
                  setActiveSession({
                    title,
                    isPractice: true,
                    exercises,
                    xpReward: xp,
                    gemReward: gems,
                  })
                }
              />
            )}

            {activeTab === 'practice' && (
              <PracticeHubView
                course={activeCourse}
                uiLang={uiLang}
                wordMemories={user.wordMemories}
                mistakes={user.mistakes}
                onStartCustomPractice={(title, exercises, xp, gems) =>
                  setActiveSession({
                    title,
                    isPractice: true,
                    exercises,
                    xpReward: xp,
                    gemReward: gems,
                  })
                }
                onOpenSpeakingLab={() => setActiveTab('speaking_lab')}
              />
            )}

            {activeTab === 'quests' && (
              <QuestsView user={user} onClaimQuest={claimQuest} />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardView
                userName={user.name}
                userXp={user.xp}
                uiLang={uiLang}
              />
            )}

            {activeTab === 'shop' && (
              <FreeShopView
                user={user}
                onBuyItem={buyShopItem}
                onEquipOutfit={equipOutfit}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                user={user}
                canInstallPwa={true}
                onInstallPwa={() => setApkModalOpen(true)}
                onUpdateProfile={updateProfile}
                onToggleDarkMode={toggleDarkMode}
                onToggleUnlimitedHearts={toggleUnlimitedHearts}
                onImportBackup={importBackup}
                onResetProgress={resetProgress}
              />
            )}

            {activeTab === 'how_it_works' && <HowItWorksView uiLang={uiLang} />}
          </main>

          {/* Right Sidebar Widgets (Desktop XL) */}
          <aside className="hidden xl:block xl:col-span-4 space-y-5">
            {/* 100% Free A1->C2 Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-black">
                  <Sparkles className="w-3.5 h-3.5" /> A1 ➔ C2 FREE
                </span>
                {xpBoostActive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-300 text-amber-950 text-xs font-black">
                    <Zap className="w-3.5 h-3.5 fill-current" /> 2x XP
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <ZikoMascot mood="happy" outfit={user.equippedOutfit} size={68} />
                <div>
                  <h3 className="font-black text-base leading-snug">
                    {uiLang === 'ar'
                      ? '80+ جملة نطق لكل لغة + 8 أنماط مراجعة!'
                      : '80+ Speaking Phrases & 8 Revision Modes!'}
                  </h3>
                  <p className="text-xs font-semibold opacity-90 mt-0.5">
                    {uiLang === 'ar'
                      ? 'تقن النطق بالمايكروفون أو حمل نسخة الأندرويد APK مجاناً.'
                      : 'Master live microphone pronunciation or grab the Android APK.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('speaking_lab')}
                  className="py-2.5 px-2 rounded-xl bg-white/95 hover:bg-white text-emerald-900 font-black text-[11px] transition-all flex items-center justify-center gap-1"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-500" />
                  {uiLang === 'ar' ? 'النطق' : 'Speak'}
                </button>
                <button
                  type="button"
                  onClick={() => setIosModalOpen(true)}
                  className="py-2.5 px-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/60 text-white font-black text-[11px] transition-all flex items-center justify-center gap-1"
                >
                  <span>🍎</span> iOS
                </button>
                <button
                  type="button"
                  onClick={() => setApkModalOpen(true)}
                  className="py-2.5 px-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/60 text-white font-black text-[11px] transition-all flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> APK
                </button>
              </div>
            </div>

            {/* Daily Goal Widget */}
            <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                  ⚡ {t(UI_STRINGS.dailyGoalTitle, uiLang)}
                </h3>
                <span className="text-xs font-black text-duo-green">
                  {user.todayXp} / {user.dailyGoalXp} XP
                </span>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-duo-nightSubtle rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-duo-gold rounded-full transition-all duration-500"
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {user.todayXp >= user.dailyGoalXp
                  ? uiLang === 'ar'
                    ? '🎉 حققتي الهدف اليومي ديالك! برافو عليك!'
                    : '🎉 Daily goal achieved! Amazing consistency!'
                  : uiLang === 'ar'
                  ? `باقي ليك غير ${user.dailyGoalXp - user.todayXp} XP باش تكمل هدف اليوم!`
                  : `Only ${user.dailyGoalXp - user.todayXp} XP left to hit today’s goal!`}
              </p>
            </div>

            {/* Quick Smart Practice Widget */}
            <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 space-y-3">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                <Brain className="w-5 h-5 text-duo-blue" />
                {uiLang === 'ar' ? 'مركز المراجعة المكثفة' : 'Intensive Revision Hub'}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {courseMistakesCount > 0
                  ? uiLang === 'ar'
                    ? `عندك ${courseMistakesCount} أخطاء جاهزة للتصحيح والمراجعة المجانية!`
                    : `You have ${courseMistakesCount} mistakes ready for free review!`
                  : uiLang === 'ar'
                  ? '8 أنماط تدريب + بطاقات مراجعة قابلة للقلب لتثبيت A1–C2.'
                  : '8 drill modes + interactive flip flashcards across A1–C2.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('practice')}
                className="w-full py-2.5 rounded-xl bg-duo-blue border-b-4 border-duo-blueDark text-white font-black text-xs"
              >
                {uiLang === 'ar' ? 'افتح المراجعة المكثفة' : 'Open Revision Hub'}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-duo-nightCard border-t-2 border-slate-200 dark:border-duo-nightBorder px-1.5 py-1.5 flex items-center justify-around">
        {navItems.slice(0, 6).map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                sound.playTap();
                setActiveTab(item.id);
              }}
              className={`relative p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
                active
                  ? 'text-duo-blue bg-sky-50 dark:bg-sky-950/50'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {item.icon}
              <span className="text-[9px] font-extrabold truncate max-w-[54px]">
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className="absolute top-1 end-1 w-4 h-4 rounded-full bg-duo-red text-white text-[9px] font-black flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveTab('profile');
          }}
          className={`p-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${
            activeTab === 'profile'
              ? 'text-duo-blue bg-sky-50 dark:bg-sky-950/50'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-extrabold">
            {uiLang === 'ar' ? 'ملفي' : 'Profile'}
          </span>
        </button>
      </nav>
    </div>
  );
}

export default App;
