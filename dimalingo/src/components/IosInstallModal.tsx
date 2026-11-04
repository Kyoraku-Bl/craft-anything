import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  PlusSquare,
  Share,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { UILang } from '../types';
import { sound } from '../utils/sound';

interface IosInstallModalProps {
  open: boolean;
  uiLang: UILang;
  onClose: () => void;
  onSwitchToAndroid?: () => void;
}

function copyTextUniversal(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

function fallbackCopy(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      // Ignore
    }
    resolve();
  });
}

export const IosInstallModal: React.FC<IosInstallModalProps> = ({
  open,
  uiLang,
  onClose,
  onSwitchToAndroid,
}) => {
  const [copiedPage, setCopiedPage] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);

  const envInfo = useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        isIOS: false,
        iosVersion: null as string | null,
        isStandalone: false,
        isInAppBrowser: false,
      };
    }
    const ua = navigator.userAgent || '';
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const match = ua.match(/OS (\d+)[_.](\d+)/);
    const iosVersion = match ? `${match[1]}.${match[2]}` : null;
    const isStandalone =
      Boolean((navigator as unknown as { standalone?: boolean }).standalone) ||
      Boolean(
        window.matchMedia &&
          window.matchMedia('(display-mode: standalone)').matches
      );
    const isInAppBrowser =
      /FBAN|FBAV|Instagram|Line|TikTok|Snapchat|WhatsApp|Telegram/i.test(ua);

    return { isIOS, iosVersion, isStandalone, isInAppBrowser };
  }, []);

  if (!open) return null;

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://dimalingo.vercel.app';
  const iosInstallPageUrl = `${origin}/?ios=1`;
  const mobileConfigUrl = `${origin}/DimaLingo-iOS.mobileconfig`;

  const handleCopyPage = async () => {
    sound.playTap();
    await copyTextUniversal(iosInstallPageUrl);
    setCopiedPage(true);
    setTimeout(() => setCopiedPage(false), 2500);
  };

  const handleCopyProfile = async () => {
    sound.playTap();
    await copyTextUniversal(mobileConfigUrl);
    setCopiedProfile(true);
    setTimeout(() => setCopiedProfile(false), 2500);
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
        {/* Platform Switcher Tabs */}
        {onSwitchToAndroid && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-duo-nightSubtle">
            <button
              type="button"
              className="py-2 px-3 rounded-xl bg-white dark:bg-duo-nightCard text-slate-900 dark:text-white font-black text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>🍎</span>
              <span>
                {uiLang === 'ar' ? 'iPhone / iPad (كل iOS)' : 'iPhone / iPad (All iOS)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onClose();
                onSwitchToAndroid();
              }}
              className="py-2 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-black text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>🤖</span>
              <span>{uiLang === 'ar' ? 'Android (ملف APK)' : 'Android (APK)'}</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/apple-touch-icon.png"
              alt="DimaLingo iOS Icon"
              className="w-13 h-13 w-12 h-12 rounded-[14px] shadow-md shrink-0 border border-emerald-400/40"
            />
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[11px] font-black">
                <Sparkles className="w-3 h-3" />{' '}
                {envInfo.isIOS && envInfo.iosVersion
                  ? `iOS ${envInfo.iosVersion} ✓ مدعوم 100%`
                  : uiLang === 'ar'
                  ? 'يدعم جميع إصدارات iOS (iOS 9 ➔ iOS 18+)'
                  : 'Supports ALL iOS Versions (iOS 9 ➔ iOS 18+)'}
              </span>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                {uiLang === 'ar'
                  ? 'تثبيت DimaLingo على الآيفون والآيباد 🍎'
                  : uiLang === 'fr'
                  ? 'Installer DimaLingo sur iPhone & iPad 🍎'
                  : 'Install DimaLingo on iPhone & iPad 🍎'}
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

        {/* Already Installed Badge */}
        {envInfo.isStandalone && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800 flex items-center gap-2.5 text-xs font-black text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-duo-green shrink-0" />
            <span>
              {uiLang === 'ar'
                ? 'التطبيق مثبّت حالياً وخدّام فوضع الشاشة الكاملة على جهازك الآيفون! 🎉'
                : 'DimaLingo is already installed & running in Full-Screen mode on your iPhone! 🎉'}
            </span>
          </div>
        )}

        {/* In-App Browser Notice (WhatsApp / Instagram) */}
        {envInfo.isIOS && envInfo.isInAppBrowser && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs font-bold text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              {uiLang === 'ar'
                ? 'ملاحظة: راك فاتح الرابط داخل تطبيق محادثة. اضغط على أيقونة Safari 🧭 لتحت أو الفوق باش يتثبت التطبيق مباشرة فـ شاشة الآيفون!'
                : 'Tip: You opened this inside an in-app browser. Tap "Open in Safari" 🧭 so iOS lets you install directly to your Home Screen!'}
            </div>
          </div>
        )}

        {/* METHOD 1: Direct Apple iOS Configuration Profile (.mobileconfig) — Works on ALL iOS versions */}
        <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-black text-sm text-emerald-900 dark:text-emerald-200">
              {uiLang === 'ar'
                ? '1️⃣ التثبيت المباشر بملف تطبيق iOS الرسمي (يدعم كل إصدارات iOS)'
                : uiLang === 'fr'
                ? '1️⃣ Installation directe via Profil iOS (Toutes versions iOS)'
                : '1️⃣ Direct iOS App Profile Installer (All iOS Versions)'}
            </span>
            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> iOS 9 – 18+
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
            {uiLang === 'ar'
              ? 'ملف تثبيت رسمي بصيغة Apple WebClip كينزّل أيقونة DimaLingo بشاشة كاملة مباشرة فـ الآيفون أو الآيباد، وكيدعم جميع إصدارات iOS بدون استثناء!'
              : uiLang === 'fr'
              ? 'Profil Apple WebClip officiel qui installe DimaLingo en plein écran sur tout iPhone ou iPad (compatible toutes versions d’iOS).'
              : 'Official Apple WebClip installer profile that adds full-screen DimaLingo to any iPhone or iPad across all iOS versions.'}
          </p>

          <a
            href="/DimaLingo-iOS.mobileconfig"
            onClick={() => sound.playVictory()}
            className="w-full py-3.5 px-4 rounded-2xl bg-duo-green hover:bg-duo-greenLight border-b-4 border-duo-greenDark text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-5 h-5" />
            {uiLang === 'ar'
              ? 'تثبيت مباشر للآيفون (DimaLingo-iOS.mobileconfig)'
              : uiLang === 'fr'
              ? 'Installer sur iPhone (DimaLingo-iOS.mobileconfig)'
              : 'Direct Install on iPhone (.mobileconfig)'}
          </a>

          {/* 3 quick steps for .mobileconfig */}
          <ol className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside bg-white/80 dark:bg-duo-nightCard/70 rounded-xl p-3 border border-emerald-200 dark:border-emerald-900">
            <li>
              {uiLang === 'ar'
                ? 'افتح الرابط فـ Safari واضغط « السماح / Allow / Autoriser ».'
                : 'Open in Safari and tap "Allow" when prompted by iOS.'}
            </li>
            <li>
              {uiLang === 'ar'
                ? 'سير لـ « الإعدادات / Settings » ديال الآيفون غتلقى الفوق « تم تنزيل ملف التعريف / Profile Downloaded ».'
                : 'Open iPhone Settings → tap "Profile Downloaded" right at the top.'}
            </li>
            <li>
              {uiLang === 'ar'
                ? 'اضغط « تثبيت / Install » وغتلقى تطبيق DimaLingo واجد فـ الشاشة الرئيسية!'
                : 'Tap "Install" and DimaLingo appears right on your Home Screen!'}
            </li>
          </ol>

          {/* Copy Direct .mobileconfig URL */}
          <div className="flex items-center gap-2 bg-white dark:bg-duo-nightCard rounded-xl p-2 border border-slate-200 dark:border-duo-nightBorder">
            <input
              type="text"
              readOnly
              dir="ltr"
              value={mobileConfigUrl}
              className="flex-1 bg-transparent text-[11px] font-bold text-slate-600 dark:text-slate-300 px-2 outline-none"
            />
            <button
              type="button"
              onClick={handleCopyProfile}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-duo-nightSubtle hover:bg-slate-200 text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0"
            >
              {copiedProfile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-duo-green" />
                  {uiLang === 'ar' ? 'تم!' : 'Copied!'}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  {uiLang === 'ar' ? 'نسخ' : 'Copy'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* METHOD 2: Instant Safari / Chrome "Add to Home Screen" (Zero Settings, 10 Seconds!) */}
        <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border-2 border-sky-200 dark:border-sky-800 space-y-3">
          <div className="font-black text-sm text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-duo-blue shrink-0" />
            <span>
              {uiLang === 'ar'
                ? '2️⃣ أو التثبيت الفوري من المتصفح فـ 10 ثواني (بلا إعدادات!)'
                : uiLang === 'fr'
                ? '2️⃣ Ou installation rapide depuis Safari / Chrome en 10s'
                : '2️⃣ Or Instant 10-Second Safari / Chrome Install (No Settings)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-duo-nightCard border border-sky-200/80 dark:border-duo-nightBorder flex flex-col gap-1">
              <div className="inline-flex items-center gap-1.5 font-black text-duo-blue">
                <Share className="w-4 h-4" />
                <span>{uiLang === 'ar' ? 'الخطوة 1' : 'Step 1'}</span>
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
                {uiLang === 'ar'
                  ? 'اضغط على زر المشاركة (Share ⬆️) فـ أسفل أو أعلى متصفح Safari / Chrome.'
                  : uiLang === 'fr'
                  ? 'Appuyez sur le bouton Partager (⬆️) dans Safari ou Chrome.'
                  : 'Tap the Share button (⬆️) in Safari or Chrome on your iPhone.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-duo-nightCard border border-sky-200/80 dark:border-duo-nightBorder flex flex-col gap-1">
              <div className="inline-flex items-center gap-1.5 font-black text-duo-blue">
                <PlusSquare className="w-4 h-4" />
                <span>{uiLang === 'ar' ? 'الخطوة 2' : 'Step 2'}</span>
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
                {uiLang === 'ar'
                  ? 'اختار « إضافة إلى الشاشة الرئيسية / Sur l’écran d’accueil / Add to Home Screen ».'
                  : uiLang === 'fr'
                  ? 'Choisissez « Sur l’écran d’accueil » dans le menu.'
                  : 'Select "Add to Home Screen" from the share sheet.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-duo-nightCard border border-sky-200/80 dark:border-duo-nightBorder flex flex-col gap-1">
              <div className="inline-flex items-center gap-1.5 font-black text-duo-green">
                <CheckCircle2 className="w-4 h-4" />
                <span>{uiLang === 'ar' ? 'الخطوة 3' : 'Step 3'}</span>
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
                {uiLang === 'ar'
                  ? 'اضغط « إضافة / Add » الفوق، وغيتفتح بحال تطبيق آيفون أصلي حتى بلا أنترنت!'
                  : uiLang === 'fr'
                  ? 'Appuyez sur « Ajouter » — l’app s’ouvre en plein écran même hors-ligne !'
                  : 'Tap "Add" — launches full-screen with offline support & audio!'}
              </p>
            </div>
          </div>

          {/* Shareable iPhone Install Page Link */}
          <div className="flex items-center gap-2 bg-white dark:bg-duo-nightCard rounded-xl p-2 border border-slate-200 dark:border-duo-nightBorder">
            <input
              type="text"
              readOnly
              dir="ltr"
              value={iosInstallPageUrl}
              className="flex-1 bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 px-2 outline-none"
            />
            <button
              type="button"
              onClick={handleCopyPage}
              className="px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 hover:bg-sky-200 text-xs font-black text-sky-900 dark:text-sky-200 flex items-center gap-1 shrink-0"
            >
              {copiedPage ? (
                <>
                  <Check className="w-3.5 h-3.5 text-duo-green" />
                  {uiLang === 'ar' ? 'تم النسخ!' : 'Copied!'}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  {uiLang === 'ar' ? 'نسخ رابط الآيفون' : 'Copy iOS Link'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
