export type UILang = 'ar' | 'fr' | 'en';

export type CourseId = 'fusha' | 'en' | 'fr' | 'es' | 'darija';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface LocalizedText {
  ar: string;
  fr: string;
  en: string;
}

export type ExerciseType =
  | 'select_meaning'
  | 'reverse_select'
  | 'word_bank'
  | 'listening'
  | 'fill_blank'
  | 'match_pairs'
  | 'speaking';

export interface MatchPair {
  id: string;
  target: string;
  meaning: LocalizedText;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  cefr?: CEFRLevel;
  prompt: LocalizedText;
  targetText?: string;
  acceptedSpokenVariants?: string[];
  phoneticHint?: string;
  ttsLang?: string;
  sentenceWithBlank?: string;
  correctAnswer?: string;
  correctMeaning?: LocalizedText;
  options?: Array<{
    id: string;
    label: string | LocalizedText;
    subLabel?: string;
    tts?: string;
  }>;
  wordBankTokens?: LocalizedText | string[];
  correctTokenSequence?: LocalizedText | string[];
  isTargetWordBank?: boolean;
  pairs?: MatchPair[];
  grammarTip: LocalizedText;
  vocabKey?: string;
}

export type NodeType =
  | 'lesson'
  | 'speaking_focus'
  | 'chest'
  | 'unit_review'
  | 'legendary';

export interface LessonNode {
  id: string;
  type: NodeType;
  cefr: CEFRLevel;
  title: LocalizedText;
  subtitle: LocalizedText;
  icon: string;
  xpReward: number;
  gemReward: number;
  exercises: Exercise[];
}

export interface GuidePhrase {
  target: string;
  meaning: LocalizedText;
  pronunciation?: string;
}

export interface Unit {
  id: string;
  number: number;
  cefr: CEFRLevel;
  cefrTitle: LocalizedText;
  themeColor: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'teal';
  title: LocalizedText;
  description: LocalizedText;
  grammarNotes: LocalizedText[];
  guidePhrases: GuidePhrase[];
  nodes: LessonNode[];
}

export interface Course {
  id: CourseId;
  flag: string;
  badgeCode: string;
  ttsLang: string;
  speechRecLang: string;
  name: LocalizedText;
  tagline: LocalizedText;
  learnersCount: string;
  units: Unit[];
}

export type PhraseCategory =
  | 'daily'
  | 'travel'
  | 'work'
  | 'debate'
  | 'idioms'
  | 'twisters';

export interface PronunciationPhrase {
  id: string;
  courseId: CourseId;
  cefr: CEFRLevel;
  category: PhraseCategory;
  target: string;
  altTargets?: string[];
  phonetic: string;
  meaning: LocalizedText;
  tip?: LocalizedText;
}

export interface WordMemory {
  key: string;
  courseId: CourseId;
  target: string;
  meaning: LocalizedText;
  halfLifeHours: number;
  lastPracticedAt: number;
  correctCount: number;
  wrongCount: number;
}

export interface MistakeItem {
  exerciseId: string;
  courseId: CourseId;
  exercise: Exercise;
  timestamp: number;
}

export type MascotOutfit =
  | 'classic'
  | 'tarbouche'
  | 'cool_shades'
  | 'royal_crown'
  | 'astronaut';

export interface NodeProgress {
  completedCount: number;
  bestAccuracy: number;
  legendary: boolean;
}

export interface UserState {
  onboarded: boolean;
  name: string;
  uiLang: UILang;
  darkMode: boolean;
  activeCourseId: CourseId;
  dailyGoalXp: number;
  soundEnabled: boolean;
  unlimitedHearts: boolean;
  hearts: number;
  xp: number;
  gems: number;
  streak: number;
  streakFreezes: number;
  lastActiveDate: string | null;
  todayXp: number;
  todayDate: string;
  todayLessonsCount: number;
  todayPerfectCount: number;
  todaySpeakingCount: number;
  xpBoostUntil: number | null;
  equippedOutfit: MascotOutfit;
  unlockedOutfits: MascotOutfit[];
  completedNodes: Record<string, NodeProgress>;
  unlockedUnitNumber: Record<CourseId, number>;
  claimedChests: string[];
  claimedDailyQuests: string[];
  wordMemories: Record<string, WordMemory>;
  mistakes: MistakeItem[];
  weeklyXpHistory: Record<string, number>;
}

export type NavTab =
  | 'learn'
  | 'speaking_lab'
  | 'practice'
  | 'quests'
  | 'leaderboard'
  | 'shop'
  | 'profile'
  | 'how_it_works';
