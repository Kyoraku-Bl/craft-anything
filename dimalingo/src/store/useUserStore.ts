import { useState, useEffect, useCallback } from 'react';
import {
  CourseId,
  Exercise,
  MascotOutfit,
  UILang,
  UserState,
  WordMemory,
} from '../types';
import { sound } from '../utils/sound';

const STORAGE_KEY = 'dimalingo_user_state_v2';

export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getYesterdayKey(): string {
  const d = new Date(Date.now() - 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function predictRecallProbability(memory: WordMemory): number {
  const elapsedHours = Math.max(0, (Date.now() - memory.lastPracticedAt) / 3600000);
  const halfLife = Math.max(2, memory.halfLifeHours || 24);
  return Math.max(0.05, Math.min(1, Math.pow(0.5, elapsedHours / halfLife)));
}

export function createDefaultState(): UserState {
  const today = getTodayKey();
  return {
    onboarded: false,
    name: 'بطل اللغات',
    uiLang: 'ar',
    darkMode: false,
    activeCourseId: 'en',
    dailyGoalXp: 20,
    soundEnabled: true,
    unlimitedHearts: true,
    hearts: 5,
    xp: 0,
    gems: 150,
    streak: 0,
    streakFreezes: 1,
    lastActiveDate: null,
    todayXp: 0,
    todayDate: today,
    todayLessonsCount: 0,
    todayPerfectCount: 0,
    todaySpeakingCount: 0,
    xpBoostUntil: null,
    equippedOutfit: 'classic',
    unlockedOutfits: ['classic'],
    completedNodes: {},
    unlockedUnitNumber: { en: 1, fr: 1, es: 1, darija: 1 },
    claimedChests: [],
    claimedDailyQuests: [],
    wordMemories: {},
    mistakes: [],
    weeklyXpHistory: { [today]: 0 },
  };
}

function loadState(): UserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('dimalingo_user_state_v1');
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<UserState>;
    const base = createDefaultState();
    const merged: UserState = {
      ...base,
      ...parsed,
      unlockedUnitNumber: {
        ...base.unlockedUnitNumber,
        ...(parsed.unlockedUnitNumber || {}),
      },
      claimedDailyQuests: Array.isArray(parsed.claimedDailyQuests)
        ? parsed.claimedDailyQuests
        : [],
    };

    const today = getTodayKey();
    if (merged.todayDate !== today) {
      const yesterday = getYesterdayKey();
      if (merged.lastActiveDate && merged.lastActiveDate !== today && merged.lastActiveDate !== yesterday) {
        if (merged.streakFreezes > 0 && merged.streak > 0) {
          merged.streakFreezes -= 1;
        } else {
          merged.streak = 0;
        }
      }
      merged.todayDate = today;
      merged.todayXp = 0;
      merged.todayLessonsCount = 0;
      merged.todayPerfectCount = 0;
      merged.todaySpeakingCount = 0;
      merged.claimedDailyQuests = [];
    }
    return merged;
  } catch {
    return createDefaultState();
  }
}

export function useUserStore() {
  const [user, setUser] = useState<UserState>(loadState);

  useEffect(() => {
    sound.enabled = user.soundEnabled;
    document.documentElement.lang = user.uiLang;
    document.documentElement.dir = user.uiLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('dark', Boolean(user.darkMode));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage quota issues
    }
  }, [user]);

  const completeOnboarding = useCallback(
    (params: { name: string; uiLang: UILang; courseId: CourseId; dailyGoalXp: number }) => {
      setUser((prev) => ({
        ...prev,
        onboarded: true,
        name: params.name.trim() || prev.name,
        uiLang: params.uiLang,
        activeCourseId: params.courseId,
        dailyGoalXp: params.dailyGoalXp,
      }));
    },
    []
  );

  const setUILang = useCallback((uiLang: UILang) => {
    setUser((prev) => ({ ...prev, uiLang }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setUser((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const setActiveCourse = useCallback((activeCourseId: CourseId) => {
    setUser((prev) => ({ ...prev, activeCourseId }));
  }, []);

  const toggleSound = useCallback(() => {
    setUser((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const toggleUnlimitedHearts = useCallback(() => {
    setUser((prev) => ({
      ...prev,
      unlimitedHearts: !prev.unlimitedHearts,
      hearts: 5,
    }));
  }, []);

  const refillHeartsFree = useCallback(() => {
    setUser((prev) => ({ ...prev, hearts: 5 }));
  }, []);

  const loseHeartIfLimited = useCallback(() => {
    setUser((prev) => {
      if (prev.unlimitedHearts) return prev;
      return { ...prev, hearts: Math.max(0, prev.hearts - 1) };
    });
  }, []);

  const recordExerciseResult = useCallback(
    (params: { courseId: CourseId; exercise: Exercise; correct: boolean }) => {
      const { courseId, exercise, correct } = params;
      setUser((prev) => {
        const now = Date.now();
        const updatedMemories: Record<string, WordMemory> = { ...prev.wordMemories };

        if (exercise.vocabKey && exercise.targetText && exercise.correctMeaning) {
          const mKey = `${courseId}:${exercise.vocabKey}`;
          const existing = updatedMemories[mKey];
          if (correct) {
            updatedMemories[mKey] = {
              key: mKey,
              courseId,
              target: exercise.targetText,
              meaning: exercise.correctMeaning,
              halfLifeHours: existing ? Math.min(720, existing.halfLifeHours * 2) : 24,
              lastPracticedAt: now,
              correctCount: (existing?.correctCount || 0) + 1,
              wrongCount: existing?.wrongCount || 0,
            };
          } else {
            updatedMemories[mKey] = {
              key: mKey,
              courseId,
              target: exercise.targetText,
              meaning: exercise.correctMeaning,
              halfLifeHours: existing
                ? Math.max(4, Math.round(existing.halfLifeHours * 0.5))
                : 6,
              lastPracticedAt: now,
              correctCount: existing?.correctCount || 0,
              wrongCount: (existing?.wrongCount || 0) + 1,
            };
          }
        }

        let updatedMistakes = prev.mistakes;
        if (!correct) {
          const filtered = prev.mistakes.filter((m) => m.exerciseId !== exercise.id);
          updatedMistakes = [
            {
              exerciseId: exercise.id,
              courseId,
              exercise,
              timestamp: now,
            },
            ...filtered,
          ].slice(0, 50);
        } else {
          updatedMistakes = prev.mistakes.filter((m) => m.exerciseId !== exercise.id);
        }

        return {
          ...prev,
          wordMemories: updatedMemories,
          mistakes: updatedMistakes,
          todaySpeakingCount:
            prev.todaySpeakingCount + (correct && exercise.type === 'speaking' ? 1 : 0),
        };
      });
    },
    []
  );

  const finishSession = useCallback(
    (params: {
      courseId: CourseId;
      nodeId?: string;
      jumpToUnitNumber?: number;
      isLegendary?: boolean;
      isPractice?: boolean;
      baseXp: number;
      gemsEarned: number;
      accuracy: number;
    }) => {
      setUser((prev) => {
        const today = getTodayKey();
        const yesterday = getYesterdayKey();
        const boostActive = prev.xpBoostUntil !== null && prev.xpBoostUntil > Date.now();
        const finalXp = boostActive ? params.baseXp * 2 : params.baseXp;

        let newStreak = prev.streak;
        if (prev.lastActiveDate !== today) {
          if (prev.lastActiveDate === yesterday || prev.streak === 0) {
            newStreak = prev.streak + 1;
          } else {
            newStreak = 1;
          }
        }

        const updatedNodes = { ...prev.completedNodes };
        if (params.nodeId) {
          const prevNode = updatedNodes[params.nodeId];
          updatedNodes[params.nodeId] = {
            completedCount: (prevNode?.completedCount || 0) + 1,
            legendary: Boolean(prevNode?.legendary || params.isLegendary),
            bestAccuracy: Math.max(prevNode?.bestAccuracy || 0, params.accuracy),
          };
        }

        const updatedUnlockedUnit = { ...prev.unlockedUnitNumber };
        if (params.jumpToUnitNumber) {
          const curr = updatedUnlockedUnit[params.courseId] || 1;
          updatedUnlockedUnit[params.courseId] = Math.max(curr, params.jumpToUnitNumber);
        }

        const todayXp = (prev.todayDate === today ? prev.todayXp : 0) + finalXp;

        return {
          ...prev,
          xp: prev.xp + finalXp,
          todayXp,
          todayDate: today,
          lastActiveDate: today,
          weeklyXpHistory: {
            ...prev.weeklyXpHistory,
            [today]: todayXp,
          },
          streak: newStreak,
          gems: prev.gems + params.gemsEarned,
          hearts: 5,
          completedNodes: updatedNodes,
          unlockedUnitNumber: updatedUnlockedUnit,
          todayLessonsCount:
            (prev.todayDate === today ? prev.todayLessonsCount : 0) + 1,
          todayPerfectCount:
            (prev.todayDate === today ? prev.todayPerfectCount : 0) +
            (params.accuracy >= 80 ? 1 : 0),
        };
      });
    },
    []
  );

  const claimChest = useCallback(
    (_courseId: CourseId, nodeId: string, xp: number, gems: number) => {
      setUser((prev) => {
        if (prev.claimedChests.includes(nodeId)) return prev;
        const today = getTodayKey();
        const newTodayXp = prev.todayXp + xp;
        return {
          ...prev,
          xp: prev.xp + xp,
          todayXp: newTodayXp,
          weeklyXpHistory: {
            ...prev.weeklyXpHistory,
            [today]: newTodayXp,
          },
          gems: prev.gems + gems,
          claimedChests: [...prev.claimedChests, nodeId],
        };
      });
    },
    []
  );

  const claimQuest = useCallback((questId: string, gemReward: number) => {
    setUser((prev) => {
      if (prev.claimedDailyQuests.includes(questId)) return prev;
      return {
        ...prev,
        gems: prev.gems + gemReward,
        claimedDailyQuests: [...prev.claimedDailyQuests, questId],
      };
    });
  }, []);

  const buyShopItem = useCallback(
    (
      itemType: 'freeze' | 'xp_boost' | 'outfit',
      cost: number,
      outfit?: MascotOutfit
    ): boolean => {
      let ok = false;
      setUser((prev) => {
        if (prev.gems < cost) return prev;
        if (itemType === 'freeze') {
          ok = true;
          return {
            ...prev,
            gems: prev.gems - cost,
            streakFreezes: prev.streakFreezes + 1,
          };
        }
        if (itemType === 'xp_boost') {
          ok = true;
          return {
            ...prev,
            gems: prev.gems - cost,
            xpBoostUntil: Date.now() + 15 * 60 * 1000,
          };
        }
        if (itemType === 'outfit' && outfit) {
          ok = true;
          return {
            ...prev,
            gems: prev.gems - cost,
            unlockedOutfits: prev.unlockedOutfits.includes(outfit)
              ? prev.unlockedOutfits
              : [...prev.unlockedOutfits, outfit],
            equippedOutfit: outfit,
          };
        }
        return prev;
      });
      return ok;
    },
    []
  );

  const equipOutfit = useCallback((outfit: MascotOutfit) => {
    setUser((prev) => ({
      ...prev,
      equippedOutfit: prev.unlockedOutfits.includes(outfit) ? outfit : prev.equippedOutfit,
    }));
  }, []);

  const updateProfile = useCallback((name: string, dailyGoalXp: number) => {
    setUser((prev) => ({
      ...prev,
      name: name.trim() || prev.name,
      dailyGoalXp,
    }));
  }, []);

  const importBackup = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr) as Partial<UserState>;
      if (typeof parsed !== 'object' || !parsed) return false;
      setUser({
        ...createDefaultState(),
        ...parsed,
        onboarded: true,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetProgress = useCallback(() => {
    const fresh = createDefaultState();
    setUser(fresh);
  }, []);

  return {
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
  };
}
