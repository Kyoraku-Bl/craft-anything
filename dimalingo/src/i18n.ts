import { CEFRLevel, LocalizedText, PhraseCategory, UILang } from './types';

export const t = (text: LocalizedText | string | undefined, lang: UILang): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[lang] || text.en || text.ar;
};

export const isRTL = (lang: UILang): boolean => lang === 'ar';

export const CEFR_LABELS: Record<CEFRLevel, LocalizedText> = {
  A1: {
    ar: 'A1 • مبتدئ أساسي',
    fr: 'A1 • Débutant',
    en: 'A1 • Beginner',
  },
  A2: {
    ar: 'A2 • ابتدائي متقدم',
    fr: 'A2 • Élémentaire',
    en: 'A2 • Elementary',
  },
  B1: {
    ar: 'B1 • متوسط مستقل',
    fr: 'B1 • Intermédiaire',
    en: 'B1 • Intermediate',
  },
  B2: {
    ar: 'B2 • فوق المتوسط (طلاقة)',
    fr: 'B2 • Intermédiaire Avancé',
    en: 'B2 • Upper-Intermediate',
  },
  C1: {
    ar: 'C1 • متقدم واحترافي',
    fr: 'C1 • Avancé Autonome',
    en: 'C1 • Effective Proficiency',
  },
  C2: {
    ar: 'C2 • إتقان كامل كأهل اللغة',
    fr: 'C2 • Maîtrise Native',
    en: 'C2 • Native-Level Mastery',
  },
};

export const PHRASE_CATEGORY_LABELS: Record<PhraseCategory, LocalizedText> = {
  daily: {
    ar: '💬 المحادثة اليومية',
    fr: '💬 Vie Quotidienne',
    en: '💬 Daily Conversation',
  },
  travel: {
    ar: '✈️ السفر والمطاعم',
    fr: '✈️ Voyage & Resto',
    en: '✈️ Travel & Dining',
  },
  work: {
    ar: '💼 العمل والمقابلات',
    fr: '💼 Travail & Pro',
    en: '💼 Work & Interviews',
  },
  debate: {
    ar: '🧠 النقاش والإقناع',
    fr: '🧠 Débat & Opinion',
    en: '🧠 Debate & Ideas',
  },
  idioms: {
    ar: '🎭 التعابير والأمثال',
    fr: '🎭 Idiomes & Proverbes',
    en: '🎭 Idioms & Proverbs',
  },
  twisters: {
    ar: '🔥 تحدي مخارج الحروف',
    fr: '🔥 Virelangues',
    en: '🔥 Accent Twisters',
  },
};

export const UI_STRINGS = {
  appName: {
    ar: 'ديما لينغو',
    fr: 'DimaLingo',
    en: 'DimaLingo',
  },
  freeBadge: {
    ar: 'مجاني 100% للأبد • A1 حتى C2',
    fr: '100% Gratuit • Niveau A1 à C2',
    en: '100% Free Forever • A1 to C2',
  },
  navLearn: {
    ar: 'المسار (A1–C2)',
    fr: 'Parcours (A1–C2)',
    en: 'Learn (A1–C2)',
  },
  navSpeakingLab: {
    ar: 'مختبر النطق 🎙️',
    fr: 'Labo Vocal 🎙️',
    en: 'Speaking Lab 🎙️',
  },
  navPractice: {
    ar: 'المراجعة المكثفة',
    fr: 'Révision Intensive',
    en: 'Revision Hub',
  },
  navQuests: {
    ar: 'المهام',
    fr: 'Quêtes',
    en: 'Quests',
  },
  navLeaderboard: {
    ar: 'الدوري',
    fr: 'Ligue',
    en: 'League',
  },
  navShop: {
    ar: 'المتجر المجاني',
    fr: 'Boutique 0€',
    en: 'Free Shop',
  },
  navProfile: {
    ar: 'ملفي',
    fr: 'Profil',
    en: 'Profile',
  },
  navHowItWorks: {
    ar: 'كيف يعمل؟',
    fr: 'Architecture',
    en: 'How It Works',
  },
  androidApkBtn: {
    ar: 'تحميل APK للأندرويد',
    fr: 'App Android (APK)',
    en: 'Android APK',
  },
  darkModeLabel: {
    ar: 'الوضع الليلي',
    fr: 'Mode Sombre',
    en: 'Dark Mode',
  },
  lightModeLabel: {
    ar: 'الوضع النهاري',
    fr: 'Mode Clair',
    en: 'Light Mode',
  },
  unlimitedHeartsTitle: {
    ar: 'قلوب لا محدودة مجاناً!',
    fr: 'Vies illimitées gratuites !',
    en: 'Free Unlimited Hearts!',
  },
  unlimitedHeartsDesc: {
    ar: 'فـ ديما لينغو ما كاين حتى حاجز مالي. غلط وتعلم براحتك من A1 حتى C2!',
    fr: 'Aucun paywall sur DimaLingo. Apprenez de A1 à C2 librement !',
    en: 'Zero paywalls on DimaLingo. Make mistakes and master A1 to C2 freely!',
  },
  checkBtn: {
    ar: 'تحقق',
    fr: 'Vérifier',
    en: 'Check',
  },
  continueBtn: {
    ar: 'متابعة',
    fr: 'Continuer',
    en: 'Continue',
  },
  explainAnswerBtn: {
    ar: '💡 علاش هادي هي الإجابة؟ (مجاني)',
    fr: '💡 Expliquer la réponse (Gratuit)',
    en: '💡 Explain My Answer (Free)',
  },
  correctHeadline: {
    ar: 'تبارك الله عليك! إجابة صحيحة 🎉',
    fr: 'Excellent travail ! 🎉',
    en: 'Awesome job! Spot on 🎉',
  },
  wrongHeadline: {
    ar: 'قريب بزاف! هاك التصحيح باش تعقل عليها:',
    fr: 'Presque ! Voici la bonne réponse :',
    en: 'Almost! Here is the right answer:',
  },
  unitGuideBtn: {
    ar: 'دليل القواعد',
    fr: 'Guide',
    en: 'Guidebook',
  },
  jumpHereBtn: {
    ar: '⚡ اختبر مستواك وانتقل لهنا',
    fr: '⚡ Passer le test de niveau',
    en: '⚡ Jump Here (Level Test)',
  },
  startLesson: {
    ar: 'ابدأ الدرس',
    fr: 'Commencer',
    en: 'Start Lesson',
  },
  practiceAgain: {
    ar: 'طوّر التاج / راجع (+XP)',
    fr: 'Améliorer Couronne (+XP)',
    en: 'Level Up Crown (+XP)',
  },
  legendaryChallenge: {
    ar: 'التحدي الأسطوري المجاني 👑',
    fr: 'Défi Légendaire Gratuit 👑',
    en: 'Free Legendary Challenge 👑',
  },
  dailyGoalTitle: {
    ar: 'الهدف اليومي',
    fr: 'Objectif du jour',
    en: 'Daily Goal',
  },
  tapAudioSlow: {
    ar: 'ببطء 🐢',
    fr: 'Lent 🐢',
    en: 'Slow 🐢',
  },
  listenNormal: {
    ar: 'استمع للنطق 🔊',
    fr: 'Écouter 🔊',
    en: 'Listen 🔊',
  },
  listenSlow: {
    ar: 'نطق بطيء 🐢',
    fr: 'Vitesse lente 🐢',
    en: 'Slow speed 🐢',
  },
  tapToSpeak: {
    ar: 'اضغط وتكلم فالمايكروفون 🎙️',
    fr: 'Appuyez et parlez au micro 🎙️',
    en: 'Tap and speak into mic 🎙️',
  },
  iSaidItCorrectly: {
    ar: 'نطقتها مزيان! (تأكيد سمعي ✅)',
    fr: 'Je l’ai bien prononcée ✅',
    en: 'I pronounced it clearly ✅',
  },
  cantSpeakNow: {
    ar: 'ما نقدرش نهضر دابا (تخطي المايكروفون لمدة 15 د)',
    fr: 'Je ne peux pas parler maintenant',
    en: 'Can’t speak right now (skip mic)',
  },
};
