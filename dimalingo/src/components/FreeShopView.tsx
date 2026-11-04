import React, { useState } from 'react';
import { Check, Gem, ShieldAlert, Sparkles, Zap } from 'lucide-react';
import { MascotOutfit, UILang, UserState } from '../types';
import { sound } from '../utils/sound';
import { ZikoMascot } from './ZikoMascot';

interface FreeShopViewProps {
  user: UserState;
  onBuyItem: (
    itemType: 'freeze' | 'xp_boost' | 'outfit',
    cost: number,
    outfit?: MascotOutfit
  ) => boolean;
  onEquipOutfit: (outfit: MascotOutfit) => void;
}

export const FreeShopView: React.FC<FreeShopViewProps> = ({
  user,
  onBuyItem,
  onEquipOutfit,
}) => {
  const uiLang: UILang = user.uiLang;
  const [feedback, setFeedback] = useState<string>('');

  const boostRemainingMin =
    user.xpBoostUntil && user.xpBoostUntil > Date.now()
      ? Math.ceil((user.xpBoostUntil - Date.now()) / 60000)
      : 0;

  const outfits: Array<{
    id: MascotOutfit;
    cost: number;
    title: Record<UILang, string>;
    desc: Record<UILang, string>;
  }> = [
    {
      id: 'classic',
      cost: 0,
      title: { ar: 'زيكو الكلاسيكي', fr: 'Ziko Classique', en: 'Classic Ziko' },
      desc: { ar: 'الزي الأصلي المرح ديال ديما لينغو', fr: 'Le style original', en: 'Original joyful look' },
    },
    {
      id: 'tarbouche',
      cost: 50,
      title: { ar: 'الطربوش المغربي الأصيل 🇲🇦', fr: 'Tarbouche Marocain 🇲🇦', en: 'Moroccan Tarbouche 🇲🇦' },
      desc: { ar: 'لمسة مغربية تقليدية أنيقة لـ زيكو', fr: 'Touche marocaine authentique', en: 'Authentic Moroccan Fez style' },
    },
    {
      id: 'cool_shades',
      cost: 70,
      title: { ar: 'نظارات النخبة 😎', fr: 'Lunettes Cool 😎', en: 'Cool Shades 😎' },
      desc: { ar: 'ستايل عصري ملي كتكون فـ Streak عالية', fr: 'Style décontracté', en: 'Sharp look for high streaks' },
    },
    {
      id: 'royal_crown',
      cost: 100,
      title: { ar: 'تاج الأسطورة الذهبي 👑', fr: 'Couronne Royale 👑', en: 'Royal Legend Crown 👑' },
      desc: { ar: 'خاص بأبطال اللغات المتفوقين (C2)', fr: 'Pour les champions des langues', en: 'Fit for C2 language royalty' },
    },
    {
      id: 'astronaut',
      cost: 120,
      title: { ar: 'خوذة رائد الفضاء 🚀', fr: 'Astronaute 🚀', en: 'Space Explorer 🚀' },
      desc: { ar: 'حيت اللغات كتفتح ليك عوالم جديدة!', fr: 'Explorez de nouveaux mondes !', en: 'Languages unlock new worlds!' },
    },
  ];

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            {uiLang === 'ar' ? '0 درهم • ممنوع الفلوس الحقيقية!' : '$0 • Zero Microtransactions!'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            {uiLang === 'ar'
              ? 'المتجر التشجيعي المجاني 🛍️'
              : uiLang === 'fr'
              ? 'Boutique 100% Gratuite 🛍️'
              : '100% Free Gem Shop 🛍️'}
          </h1>
          <p className="text-sm font-bold opacity-95">
            {uiLang === 'ar'
              ? 'كل حاجة هنا كتشريها غير بالمجوهرات 💎 اللي كتربحها بدراستك ومواظبتك!'
              : 'Everything here is unlocked purely with Gems 💎 earned from studying!'}
          </p>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-white dark:bg-duo-nightCard text-duo-blueDark dark:text-sky-300 font-black text-xl flex items-center gap-2 shadow-sm shrink-0">
          <Gem className="w-6 h-6 fill-sky-400 text-duo-blue" />
          {user.gems}
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border-2 border-duo-green text-emerald-950 dark:text-emerald-200 font-black text-sm text-center animate-pop">
          {feedback}
        </div>
      )}

      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
          {uiLang === 'ar' ? '⚡ التعزيزات المجانية' : '⚡ Free Power-Ups'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border-2 border-sky-200 dark:border-sky-900 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                🧊 {uiLang === 'ar' ? 'تجميد السلسلة (Streak Freeze)' : 'Streak Freeze'}
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {uiLang === 'ar'
                  ? `كيحمي الـ Streak ديالك إلى نسيتي تقرا شي نهار. عندك دابا: ${user.streakFreezes}`
                  : `Protects your streak if you miss a day. Owned: ${user.streakFreezes}`}
              </p>
            </div>
            <button
              type="button"
              disabled={user.gems < 40}
              onClick={() => {
                if (onBuyItem('freeze', 40)) {
                  sound.playVictory();
                  notify(uiLang === 'ar' ? '🧊 زدتي تجميد السلسلة بنجاح!' : '🧊 Streak Freeze added!');
                }
              }}
              className={`px-4 py-2.5 rounded-xl font-black text-xs shrink-0 border-b-4 ${
                user.gems >= 40
                  ? 'bg-duo-blue border-duo-blueDark text-white'
                  : 'bg-slate-200 dark:bg-duo-nightSubtle border-slate-300 dark:border-duo-nightBorder text-slate-400 cursor-not-allowed'
              }`}
            >
              40 💎
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                {uiLang === 'ar' ? 'مضاعف النقاط (2x XP لمدة 15 د)' : '15-Min 2x XP Boost'}
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {boostRemainingMin > 0
                  ? uiLang === 'ar'
                    ? `🔥 مفعّل حالياً! باقي ${boostRemainingMin} دقيقة`
                    : `🔥 Active! ${boostRemainingMin} min remaining`
                  : uiLang === 'ar'
                  ? 'ضاعف كل نقاط XP اللي كتربحها لمدة 15 دقيقة!'
                  : 'Double all XP earned across lessons for 15 minutes!'}
              </p>
            </div>
            <button
              type="button"
              disabled={user.gems < 50 || boostRemainingMin > 0}
              onClick={() => {
                if (onBuyItem('xp_boost', 50)) {
                  sound.playVictory();
                  notify(uiLang === 'ar' ? '⚡ مضاعف 2x XP تفعّل لمدة 15 دقيقة!' : '⚡ 2x XP Boost activated!');
                }
              }}
              className={`px-4 py-2.5 rounded-xl font-black text-xs shrink-0 border-b-4 ${
                user.gems >= 50 && boostRemainingMin === 0
                  ? 'bg-duo-gold border-duo-goldDark text-amber-950'
                  : 'bg-slate-200 dark:bg-duo-nightSubtle border-slate-300 dark:border-duo-nightBorder text-slate-400 cursor-not-allowed'
              }`}
            >
              {boostRemainingMin > 0 ? 'Active ⚡' : '50 💎'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
            {uiLang === 'ar' ? '🦊 خزانة أزياء زيكو (Mascot Outfits)' : '🦊 Ziko Mascot Wardrobe'}
          </h2>
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> 100% Free Cosmetics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {outfits.map((item) => {
            const owned = user.unlockedOutfits.includes(item.id);
            const equipped = user.equippedOutfit === item.id;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center text-center justify-between gap-3 transition-all ${
                  equipped
                    ? 'border-duo-green bg-emerald-50/60 dark:bg-emerald-950/40'
                    : 'border-slate-200 dark:border-duo-nightBorder bg-slate-50/50 dark:bg-duo-nightSubtle'
                }`}
              >
                <ZikoMascot mood="happy" outfit={item.id} size={92} />
                <div>
                  <div className="font-black text-slate-800 dark:text-slate-100 text-sm">
                    {item.title[uiLang]}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.desc[uiLang]}
                  </p>
                </div>

                {equipped ? (
                  <span className="w-full py-2 rounded-xl bg-duo-green text-white font-black text-xs flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" />
                    {uiLang === 'ar' ? 'ملبوس حالياً' : 'Equipped'}
                  </span>
                ) : owned ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      onEquipOutfit(item.id);
                    }}
                    className="w-full py-2 rounded-xl bg-white dark:bg-duo-nightCard border-2 border-b-4 border-duo-blue text-duo-blueDark dark:text-sky-300 font-black text-xs"
                  >
                    {uiLang === 'ar' ? 'البس هاد الزي' : 'Equip'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={user.gems < item.cost}
                    onClick={() => {
                      if (onBuyItem('outfit', item.cost, item.id)) {
                        sound.playVictory();
                        notify(
                          uiLang === 'ar'
                            ? `🎉 فتحتي "${item.title.ar}" مجاناً!`
                            : `🎉 Unlocked ${item.title[uiLang]}!`
                        );
                      }
                    }}
                    className={`w-full py-2 rounded-xl font-black text-xs border-b-4 ${
                      user.gems >= item.cost
                        ? 'bg-duo-blue border-duo-blueDark text-white'
                        : 'bg-slate-200 dark:bg-duo-nightCard border-slate-300 dark:border-duo-nightBorder text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {item.cost} 💎
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
