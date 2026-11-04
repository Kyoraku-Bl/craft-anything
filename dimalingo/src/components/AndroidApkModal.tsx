import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { UILang } from '../types';
import { sound } from '../utils/sound';

interface AndroidApkModalProps {
  open: boolean;
  uiLang: UILang;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onClose: () => void;
}

export const AndroidApkModal: React.FC<AndroidApkModalProps> = ({
  open,
  uiLang,
  canInstallPwa,
  onInstallPwa,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://dimalingo.vercel.app';
  const apkUrl = `${origin}/DimaLingo-Android.apk`;

  const handleCopy = async () => {
    sound.playTap();
    try {
      await navigator.clipboard.writeText(apkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-duo-green border-b-4 border-duo-greenDark text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-black">
                <Sparkles className="w-3 h-3" /> Android APK v2.0 • 100% Free
              </span>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                {uiLang === 'ar'
                  ? 'تثبيت تطبيق DimaLingo على الأندرويد 📲'
                  : uiLang === 'fr'
                  ? 'Installer DimaLingo sur Android (APK) 📲'
                  : 'Install DimaLingo for Android (APK) 📲'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-duo-nightSubtle text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option 1: Direct APK File Download */}
        <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-black text-sm text-emerald-900 dark:text-emerald-200">
              {uiLang === 'ar'
                ? '1️⃣ تحميل ملف التطبيق المباشر (DimaLingo-Android.apk)'
                : '1️⃣ Direct Android APK Package Download'}
            </span>
            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Signed v1+v2
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
            {uiLang === 'ar'
              ? 'نسخة أندرويد كاملة موقعة رسمياً كتخدم أونلاين وأوفلاين، مع دعم المايكروفون، الصوت، والوضع الليلي!'
              : 'Signed Android package supporting online updates, offline mode, microphone exercises, and Dark Mode.'}
          </p>

          <a
            href="/DimaLingo-Android.apk"
            download="DimaLingo-Android.apk"
            onClick={() => sound.playVictory()}
            className="w-full py-3.5 px-4 rounded-2xl bg-duo-green hover:bg-duo-greenLight border-b-4 border-duo-greenDark text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-5 h-5" />
            {uiLang === 'ar'
              ? 'تحميل ملف DimaLingo-Android.apk دابا'
              : 'Download DimaLingo-Android.apk'}
          </a>

          {/* Direct Copyable Link */}
          <div className="flex items-center gap-2 bg-white dark:bg-duo-nightCard rounded-xl p-2 border border-slate-200 dark:border-duo-nightBorder">
            <input
              type="text"
              readOnly
              dir="ltr"
              value={apkUrl}
              className="flex-1 bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 px-2 outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-duo-nightSubtle hover:bg-slate-200 text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-duo-green" />
                  {uiLang === 'ar' ? 'تم النسخ!' : 'Copied!'}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  {uiLang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Option 2: Instant Chrome WebAPK Install */}
        {canInstallPwa && (
          <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border-2 border-sky-200 dark:border-sky-800 space-y-2.5">
            <div className="font-black text-sm text-sky-900 dark:text-sky-200">
              {uiLang === 'ar'
                ? '2️⃣ أو التثبيت الفوري بنقرة واحدة عبر Chrome (بدون إعدادات)'
                : '2️⃣ Or One-Tap Instant Install via Chrome'}
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onInstallPwa();
              }}
              className="w-full py-3 rounded-2xl bg-duo-blue border-b-4 border-duo-blueDark text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              {uiLang === 'ar'
                ? 'تثبيت فوري على شاشة الهاتف'
                : 'Instant Add to Android Home Screen'}
            </button>
          </div>
        )}

        {/* 3-Step Installation Guide */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-duo-nightSubtle border border-slate-200 dark:border-duo-nightBorder space-y-2">
          <div className="text-xs font-black text-slate-700 dark:text-slate-200">
            {uiLang === 'ar'
              ? '📌 طريقة تثبيت ملف الـ APK فـ تيليفونك الأندرويد فـ 30 ثانية:'
              : '📌 How to install the APK on Android in 30 seconds:'}
          </div>
          <ol className="text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside">
            <li>
              {uiLang === 'ar'
                ? 'اضغط على زر « تحميل ملف DimaLingo-Android.apk » الفوق وافتح الملف ملي يكمل التحميل.'
                : 'Tap Download DimaLingo-Android.apk above and open the downloaded file.'}
            </li>
            <li>
              {uiLang === 'ar'
                ? 'إيلا طلب منك الهاتف السماح بالتثبيت من المتصفح، فعّل « السماح من هذا المصدر / Allow from this source ».'
                : 'If prompted by Android, enable "Allow from this source" (standard for direct APKs outside Play Store).'}
            </li>
            <li>
              {uiLang === 'ar'
                ? 'اضغط « تثبيت / Install » واستمتع بـ DimaLingo كامل مجاناً من A1 حتى C2!'
                : 'Tap "Install" and enjoy full DimaLingo A1–C2 right from your app drawer!'}
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
