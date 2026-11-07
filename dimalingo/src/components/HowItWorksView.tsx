import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Cpu,
  Flame,
  Layers,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { UILang } from '../types';
import { sound } from '../utils/sound';

interface HowItWorksViewProps {
  uiLang: UILang;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({ uiLang }) => {
  const [simHoursElapsed, setSimHoursElapsed] = useState<number>(18);
  const [simHalfLife, setSimHalfLife] = useState<number>(24);

  const predictedRecallPct = Math.max(
    5,
    Math.min(100, Math.round(100 * Math.pow(0.5, simHoursElapsed / simHalfLife)))
  );

  const comparisonRows = [
    {
      feature: {
        ar: 'المستويات اللغوية (CEFR)',
        fr: 'Niveaux CECRL',
        en: 'CEFR Levels',
      },
      paidApp: {
        ar: 'أغلب المسارات كتوقف فـ B1 أو B2 فقط',
        fr: 'Beaucoup de cours s’arrêtent à B1/B2',
        en: 'Most courses cap out around B1 or B2',
      },
      dimalingo: {
        ar: 'مسار كامل من A1 المبتدئ حتى C2 الإتقان الكامل مع اختبار تخطي المستويات!',
        fr: 'Parcours complet de A1 à C2 avec tests de passage rapide !',
        en: 'Full A1 ➔ C2 Mastery ladder with free Jump-Ahead placement tests!',
      },
    },
    {
      feature: {
        ar: 'نظام القلوب (Hearts)',
        fr: 'Système de Vies',
        en: 'Hearts System',
      },
      paidApp: {
        ar: '5 قلوب فقط — كيتبلوكا التعلم إلا إلى خلصتي Super',
        fr: 'Limité à 5 vies sans abonnement',
        en: 'Capped at 5 — locks you out unless you pay',
      },
      dimalingo: {
        ar: 'قلوب لا محدودة (∞) مفتوحة مجاناً للجميع للأبد!',
        fr: 'Vies illimitées (∞) gratuites pour tous !',
        en: 'Unlimited Hearts (∞) unlocked 100% free forever!',
      },
    },
    {
      feature: {
        ar: 'مختبر النطق بالمايكروفون + شرح الإجابات',
        fr: 'Labo Prononciation Micro & Explications',
        en: 'Mic Speaking Lab & Explain My Answer',
      },
      paidApp: {
        ar: 'شرح الأخطاء مقفول فخطة Duolingo Max (~$30/شهر)',
        fr: 'Explications verrouillées derrière Duolingo Max',
        en: 'Locked behind expensive Duolingo Max (~$30/mo)',
      },
      dimalingo: {
        ar: 'مقارنة الكلمات اللي تعرّف عليها المايك 🎙️ + شرح القواعد مجاناً!',
        fr: 'Comparaison des mots reconnus au micro 🎙️ + explications gratuites !',
        en: 'Microphone practice with recognized-text matching and free grammar explanations!',
      },
    },
    {
      feature: {
        ar: 'الإعلانات وتكلفة السيرفرات',
        fr: 'Publicités & Coût serveur',
        en: 'Ads & Hosting Cost',
      },
      paidApp: {
        ar: 'إعلانات مزعجة مورا كل درس',
        fr: 'Publicités après chaque leçon',
        en: 'Interruptive ads after every single lesson',
      },
      dimalingo: {
        ar: '0 إعلانات + وضع ليلي 🌙 + استضافة PWA بـ 0 درهم!',
        fr: '0 pub + Mode Sombre 🌙 + Architecture PWA à 0 € !',
        en: 'Zero ads + Dark Mode 🌙 + $0 serverless PWA architecture!',
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white shadow-md">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black mb-2">
          <Cpu className="w-3.5 h-3.5" />
          {uiLang === 'ar'
            ? 'تشريح هندسي كامل لـ Duolingo وكيفاش بنينا DimaLingo بـ 0 درهم'
            : 'Inside the Duolingo Engine & Zero-Cost Architecture'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">
          {uiLang === 'ar'
            ? 'كيفاش خدام تطبيق Duolingo من الداخل؟ 🧠⚙️'
            : 'How Duolingo Works Under the Hood 🧠⚙️'}
        </h1>
        <p className="text-sm font-semibold text-slate-300 mt-2 leading-relaxed">
          {uiLang === 'ar'
            ? 'اكتشف المحركات الـ 4 اللي كتحرك التطبيق: شجرة المستويات (A1–C2)، مختبر الصوت والمايكروفون، خوارزمية الذاكرة Half-Life Regression، وحلقة التحفيز النفسي!'
            : 'Explore the 4 core engines: CEFR A1–C2 Skill Graph, Web Speech/Mic Analyzer, Half-Life Regression Memory Engine, and Gamification Habit Loop.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 space-y-2">
          <div className="flex items-center gap-2.5 text-duo-green font-black text-base">
            <Layers className="w-5 h-5" />
            {uiLang === 'ar'
              ? '1. شجرة المستويات (A1 ➔ C2 State Machine)'
              : '1. CEFR A1 ➔ C2 Skill Graph'}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
            {uiLang === 'ar'
              ? 'كل مسار مقسم لـ 6 وحدات معيارية (A1, A2, B1, B2, C1, C2) مع إمكانية التدرج أو اجتياز امتحان تخطي المستوى (Jump-Ahead Test) بحال Duolingo.'
              : 'Structured across all 6 CEFR tiers from A1 foundations to C2 native mastery, with instant Jump-Ahead placement exams.'}
          </p>
        </div>

        <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 space-y-2">
          <div className="flex items-center gap-2.5 text-duo-blue font-black text-base">
            <Volume2 className="w-5 h-5" />
            {uiLang === 'ar'
              ? '2. التعرف على الكلام والمايكروفون'
              : '2. Speech Recognition & Pronunciation Practice'}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
            {uiLang === 'ar'
              ? 'التطبيق كيستعمل خدمة المتصفح أو نموذج مجاني كيتحمّل ويخدم على الجهاز. النتيجة كتقارن النص المتعرّف عليه، ما كتقيسش جودة النطق مباشرة. الدقة والسرعة كتختلف حسب الجهاز واللغة.'
              : uiLang === 'fr' ? 'La reconnaissance utilise le navigateur ou un modèle gratuit téléchargé sur l’appareil. Le score compare le texte reconnu, pas la qualité de la prononciation. La précision et la vitesse varient selon l’appareil et la langue.' : 'Recognition uses the browser service or a free model downloaded to your device. The score compares recognized text, not pronunciation quality. Accuracy and speed vary by device and language.'}
          </p>
          <button
            type="button"
            onClick={() => sound.playVictory()}
            className="text-xs font-black text-duo-blue hover:underline"
          >
            🎵 {uiLang === 'ar' ? 'جرّب سماع نغمة النجاح المولدة برمجياً!' : 'Test live Web Audio chime!'}
          </button>
        </div>

        <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 space-y-2">
          <div className="flex items-center gap-2.5 text-orange-500 font-black text-base">
            <Flame className="w-5 h-5" />
            {uiLang === 'ar'
              ? '3. حلقة التحفيز النفسي (Habit Loop)'
              : '3. Gamification & Habit Loop'}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
            {uiLang === 'ar'
              ? 'السلسلة اليومية (Streak 🔥)، نقاط XP، المهام الصوتية اليومية، والدوريات الأسبوعية كتخليك تواظب بلا ملل.'
              : 'Streaks, XP bursts, daily speaking quests, and weekly leagues turn daily study into an effortless habit.'}
          </p>
        </div>

        <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 space-y-2">
          <div className="flex items-center gap-2.5 text-duo-purple font-black text-base">
            <Sparkles className="w-5 h-5" />
            {uiLang === 'ar'
              ? '4. طابور إعادة الأخطاء التكيفي (Adaptive Queue)'
              : '4. Adaptive Mistake Queue'}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
            {uiLang === 'ar'
              ? 'إيلا غلطتي فشي سؤال، المحرك كيشرح القاعدة وكيعاود يطرحو فآخر الدرس حتى تتقنو 100%!'
              : 'Missed items automatically re-enter the end of the lesson queue until mastered.'}
          </p>
        </div>
      </div>

      {/* Live Interactive Half-Life Regression Simulator */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-lg">
          <Brain className="w-6 h-6" />
          {uiLang === 'ar'
            ? 'محاكي خوارزمية الذاكرة: Half-Life Regression (جرّبها بيدك!)'
            : 'Live Simulator: Half-Life Regression Formula'}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50 dark:bg-duo-nightSubtle p-4 rounded-2xl border border-slate-200 dark:border-duo-nightBorder">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
              {uiLang === 'ar'
                ? `الوقت اللي داز بلا مراجعة (Δt = ${simHoursElapsed} ساعة)`
                : `Hours Elapsed (Δt = ${simHoursElapsed}h)`}
            </label>
            <input
              type="range"
              min={0}
              max={120}
              value={simHoursElapsed}
              onChange={(e) => setSimHoursElapsed(Number(e.target.value))}
              className="w-full accent-duo-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
              {uiLang === 'ar'
                ? `عمر نصف الذاكرة (h = ${simHalfLife} ساعة)`
                : `Memory Half-Life (h = ${simHalfLife}h)`}
            </label>
            <input
              type="range"
              min={6}
              max={168}
              step={6}
              value={simHalfLife}
              onChange={(e) => setSimHalfLife(Number(e.target.value))}
              className="w-full accent-duo-green"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-duo-nightCard border-2 border-slate-200 dark:border-duo-nightBorder text-center">
            <div className="text-xs font-black text-slate-500 dark:text-slate-400">
              {uiLang === 'ar' ? 'احتمال التذكر المتوقع (p)' : 'Predicted Recall Strength'}
            </div>
            <div
              className={`text-3xl font-black mt-1 ${
                predictedRecallPct >= 70
                  ? 'text-duo-green'
                  : predictedRecallPct >= 40
                  ? 'text-amber-500'
                  : 'text-duo-red'
              }`}
            >
              {predictedRecallPct}%
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-duo-nightBorder bg-emerald-50/70 dark:bg-emerald-950/40">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
            🆓{' '}
            {uiLang === 'ar'
              ? 'مقارنة: النسخ المدفوعة 🆚 نسختك DimaLingo المجانية 100%'
              : 'Paid Language Apps vs. 100% Free DimaLingo'}
          </h2>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-duo-nightBorder">
          {comparisonRows.map((row, idx) => (
            <div key={idx} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div className="font-black text-slate-800 dark:text-slate-100 text-sm">
                {row.feature[uiLang]}
              </div>
              <div className="flex items-start gap-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 p-2.5 rounded-xl">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{row.paidApp[uiLang]}</span>
              </div>
              <div className="flex items-start gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-duo-green" />
                <span>{row.dimalingo[uiLang]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
