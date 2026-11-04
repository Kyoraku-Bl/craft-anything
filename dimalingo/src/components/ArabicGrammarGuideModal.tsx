import React, { useEffect } from 'react';
import { Volume2, X } from 'lucide-react';
import { fushaGrammarUnits } from '../data/fushaCourse';
import { t } from '../i18n';
import { UILang } from '../types';
import { sound } from '../utils/sound';

export const ArabicGrammarGuideModal: React.FC<{ uiLang: UILang; onClose: () => void }> = ({ uiLang, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const title = uiLang === 'ar' ? 'مرجع النحو والصرف والإعراب والبلاغة' : uiLang === 'fr' ? 'Guide de grammaire et de rhétorique arabe' : 'Arabic grammar and rhetoric guide';
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="arabic-guide-title" onClick={e => e.stopPropagation()} className="bg-white dark:bg-duo-nightCard rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border-2 border-slate-200 dark:border-duo-nightBorder">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-black text-duo-blue">📖 A1 → C2 • 100% FREE</p><h2 id="arabic-guide-title" className="text-xl font-black text-slate-800 dark:text-white mt-1">{title}</h2></div>
          <button type="button" onClick={onClose} aria-label={uiLang === 'ar' ? 'إغلاق' : uiLang === 'fr' ? 'Fermer' : 'Close'} className="p-2 rounded-xl bg-slate-100 dark:bg-duo-nightSubtle text-slate-600 dark:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{uiLang === 'ar' ? 'اختار المستوى وفتح الأمثلة المشكولة مع شرح القاعدة. اضغط على السماعة للاستماع.' : uiLang === 'fr' ? 'Ouvrez un niveau pour découvrir les exemples vocalisés et leurs règles. Touchez le haut-parleur pour écouter.' : 'Open a level to explore vocalized examples and their rules. Tap the speaker to listen.'}</p>
        {fushaGrammarUnits.map((unit, index) => (
          <details key={unit.cefr} open={index === 0 ? true : undefined} className="rounded-2xl border-2 border-slate-200 dark:border-duo-nightBorder overflow-hidden">
            <summary className="cursor-pointer p-4 font-black bg-sky-50 dark:bg-sky-950/40 text-slate-800 dark:text-slate-100">{t(unit.title, uiLang)}</summary>
            <div className="p-3 space-y-2">
              {unit.items.map(item => <div key={item.key} className="rounded-xl p-3 bg-slate-50 dark:bg-duo-nightSubtle text-slate-700 dark:text-slate-200">
                <div className="flex items-center justify-between gap-3"><span lang="ar" dir="rtl" className="font-black text-lg">{item.target}</span><button type="button" onClick={() => sound.speak(item.target, 'ar-SA')} aria-label={uiLang === 'ar' ? 'استمع للجملة' : uiLang === 'fr' ? 'Écouter la phrase' : 'Listen to sentence'} className="p-2 text-duo-blue"><Volume2 className="w-5 h-5" /></button></div>
                <p className="text-sm mt-1">{t(item.meaning, uiLang)}</p><p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-2">💡 {t(item.tip, uiLang)}</p>
              </div>)}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
};
