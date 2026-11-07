import React, { useRef, useState } from 'react';
import {
  Download,
  Flame,
  Heart,
  Infinity as InfinityIcon,
  Moon,
  RotateCcw,
  Save,
  Smartphone,
  Sun,
  Upload,
  Zap,
} from 'lucide-react';
import { UILang, UserState } from '../types';
import { ZikoMascot } from './ZikoMascot';
import { sound } from '../utils/sound';

interface ProfileViewProps {
  user: UserState;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onUpdateProfile: (name: string, dailyGoalXp: number) => void;
  onToggleDarkMode: () => void;
  onToggleUnlimitedHearts: () => void;
  onImportBackup: (json: string) => boolean;
  onResetProgress: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  canInstallPwa,
  onInstallPwa,
  onUpdateProfile,
  onToggleDarkMode,
  onToggleUnlimitedHearts,
  onImportBackup,
  onResetProgress,
}) => {
  const uiLang: UILang = user.uiLang;
  const [editName, setEditName] = useState(user.name);
  const [editGoal, setEditGoal] = useState(user.dailyGoalXp);
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    const label = d.toLocaleDateString(
      uiLang === 'ar' ? 'ar-MA' : uiLang === 'fr' ? 'fr-FR' : 'en-US',
      { weekday: 'short' }
    );
    return {
      key,
      label,
      xp: user.weeklyXpHistory[key] || 0,
    };
  });

  const maxBarXp = Math.max(user.dailyGoalXp, ...last7Days.map((d) => d.xp), 20);

  const handleExport = () => {
    sound.playTap();
    const blob = new Blob([JSON.stringify(user, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dimalingo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg(
      uiLang === 'ar'
        ? '✅ تم تحميل نسخة احتياطية من حسابك وتقدمك بنجاح!'
        : '✅ Backup file downloaded successfully!'
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = onImportBackup(String(reader.result || ''));
      setStatusMsg(
        ok
          ? uiLang === 'ar'
            ? '🎉 تم استرجاع التقدم ديالك بنجاح!'
            : '🎉 Progress restored successfully!'
          : uiLang === 'ar'
          ? '⚠️ الملف غير صالح'
          : '⚠️ Invalid backup file'
      );
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Profile Hero */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
        <ZikoMascot mood="happy" outfit={user.equippedOutfit} size={112} />
        <div className="flex-1 text-center sm:text-start space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
            {user.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black">
              ∞ {uiLang === 'ar' ? 'عضوية مجانية كاملة (A1 ➔ C2)' : '100% Free Member (A1 ➔ C2)'}
            </span>
            {canInstallPwa && (
              <button
                type="button"
                onClick={onInstallPwa}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-duo-blue text-white text-xs font-black shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5" />
                {uiLang === 'ar' ? 'تثبيت التطبيق فالهاتف (PWA)' : 'Install App (PWA)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border-2 border-duo-green text-emerald-900 dark:text-emerald-200 font-black text-sm text-center animate-pop">
          {statusMsg}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-duo-nightCard rounded-2xl border-2 border-slate-200 dark:border-duo-nightBorder p-4">
          <div className="flex items-center gap-2 text-orange-500 font-black text-xl">
            <Flame className="w-6 h-6 fill-orange-500" />
            {user.streak}
          </div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            {uiLang === 'ar' ? 'السلسلة الحالية (أيام)' : 'Day Streak'}
          </div>
        </div>

        <div className="bg-white dark:bg-duo-nightCard rounded-2xl border-2 border-slate-200 dark:border-duo-nightBorder p-4">
          <div className="flex items-center gap-2 text-amber-500 font-black text-xl">
            <Zap className="w-6 h-6 fill-amber-400" />
            {user.xp}
          </div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            {uiLang === 'ar' ? 'مجموع نقاط XP' : 'Total XP'}
          </div>
        </div>

        <div className="bg-white dark:bg-duo-nightCard rounded-2xl border-2 border-slate-200 dark:border-duo-nightBorder p-4">
          <div className="font-black text-xl text-duo-blue">
            📚 {Object.keys(user.wordMemories).length}
          </div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            {uiLang === 'ar' ? 'عبارات متقنة' : 'Expressions Practiced'}
          </div>
        </div>

        <div className="bg-white dark:bg-duo-nightCard rounded-2xl border-2 border-slate-200 dark:border-duo-nightBorder p-4">
          <div className="font-black text-xl text-duo-green">
            👑 {Object.values(user.completedNodes).filter((n) => n.legendary).length}
          </div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            {uiLang === 'ar' ? 'تيجان أسطورية' : 'Legendary Crowns'}
          </div>
        </div>
      </div>

      {/* 7-Day XP Activity Chart */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
            {uiLang === 'ar' ? '📊 نشاط آخر 7 أيام' : '📊 7-Day XP Activity'}
          </h2>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {uiLang === 'ar' ? `الهدف: ${user.dailyGoalXp} XP/يوم` : `Goal: ${user.dailyGoalXp} XP/day`}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4">
          {last7Days.map((day) => {
            const hPct = Math.max(8, Math.round((day.xp / maxBarXp) * 100));
            const hitGoal = day.xp >= user.dailyGoalXp;
            return (
              <div key={day.key} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                  {day.xp}
                </span>
                <div className="w-full max-w-[36px] bg-slate-100 dark:bg-duo-nightSubtle rounded-xl h-24 flex items-end overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${
                      hitGoal
                        ? 'bg-duo-green'
                        : day.xp > 0
                        ? 'bg-duo-blue'
                        : 'bg-slate-200 dark:bg-duo-nightBorder'
                    }`}
                    style={{ height: `${hPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings & Preferences */}
      <div className="bg-white dark:bg-duo-nightCard rounded-3xl border-2 border-slate-200 dark:border-duo-nightBorder p-5 sm:p-6 space-y-5">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
          {uiLang === 'ar' ? '⚙️ إعدادات التعلم، المظهر والحساب' : '⚙️ Appearance & Learning Settings'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
              {uiLang === 'ar' ? 'الاسم المعروض:' : 'Display Name:'}
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-duo-nightBorder font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-duo-nightSubtle"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
              {uiLang === 'ar' ? 'الهدف اليومي (XP):' : 'Daily Goal (XP):'}
            </label>
            <select
              value={editGoal}
              onChange={(e) => setEditGoal(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-duo-nightBorder font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-duo-nightSubtle"
            >
              <option value={10}>10 XP</option>
              <option value={20}>20 XP</option>
              <option value={30}>30 XP</option>
              <option value={50}>50 XP</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onUpdateProfile(editName, editGoal);
            setStatusMsg(uiLang === 'ar' ? '✅ تم حفظ الإعدادات!' : '✅ Settings saved!');
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-duo-green border-b-4 border-duo-greenDark text-white font-black text-sm"
        >
          <Save className="w-4 h-4" />
          {uiLang === 'ar' ? 'حفظ التعديلات' : 'Save Profile'}
        </button>

        {/* Dark Mode Switch */}
        <div className="pt-4 border-t border-slate-100 dark:border-duo-nightBorder flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-sm">
              {user.darkMode ? (
                <Moon className="w-4 h-4 text-sky-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              {uiLang === 'ar'
                ? 'الوضع الليلي المريح للعين (Dark Mode)'
                : uiLang === 'fr'
                ? 'Mode Sombre (Dark Mode)'
                : 'Dark Mode Appearance'}
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? 'ألوان ليلية مريحة للدراسة بالليل مستوحاة من واجهة Duolingo الليلية.'
                : 'Eye-friendly midnight slate palette for comfortable evening study.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onToggleDarkMode();
            }}
            className={`px-4 py-2 rounded-xl font-black text-xs border-b-4 flex items-center gap-1.5 shrink-0 ${
              user.darkMode
                ? 'bg-duo-blue border-duo-blueDark text-white'
                : 'bg-slate-200 border-slate-300 text-slate-700'
            }`}
          >
            {user.darkMode ? (
              <>
                <Sun className="w-4 h-4" />
                {uiLang === 'ar' ? 'الوضع النهاري' : 'Light Mode'}
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                {uiLang === 'ar' ? 'تفعيل الوضع الليلي' : 'Enable Dark Mode'}
              </>
            )}
          </button>
        </div>

        {/* Optional Hearts Challenge Mode Switch */}
        <div className="pt-4 border-t border-slate-100 dark:border-duo-nightBorder flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-sm">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              {uiLang === 'ar'
                ? 'وضع القلوب اللامحدودة المجاني (∞ Unlimited Hearts)'
                : 'Free Unlimited Hearts Mode (∞)'}
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {uiLang === 'ar'
                ? 'مفعّل افتراضياً باش تتعلم بلا قيود حتى لمستوى C2!'
                : 'On by default for stress-free learning all the way to C2!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onToggleUnlimitedHearts();
            }}
            className={`px-4 py-2 rounded-xl font-black text-xs border-b-4 flex items-center gap-1.5 shrink-0 ${
              user.unlimitedHearts
                ? 'bg-duo-green border-duo-greenDark text-white'
                : 'bg-slate-200 dark:bg-duo-nightSubtle border-slate-300 dark:border-duo-nightBorder text-slate-700 dark:text-slate-200'
            }`}
          >
            <InfinityIcon className="w-4 h-4" />
            {user.unlimitedHearts
              ? uiLang === 'ar'
                ? 'مفعّل (∞)'
                : 'Unlimited ON'
              : uiLang === 'ar'
              ? 'وضع التحدي (5 ❤️)'
              : 'Challenge (5 ❤️)'}
          </button>
        </div>

        {/* Zero-Server Backup Export / Import */}
        <div className="pt-4 border-t border-slate-100 dark:border-duo-nightBorder space-y-3">
          <div className="font-black text-slate-800 dark:text-slate-100 text-sm">
            💾{' '}
            {uiLang === 'ar'
              ? 'حفظ ونقل الحساب بين الأجهزة (بلا سيرفر مدفوع — 0 درهم!)'
              : 'Zero-Cost Device Sync (Export / Import JSON)'}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-duo-blue border-b-4 border-duo-blueDark text-white font-black text-xs"
            >
              <Download className="w-4 h-4" />
              {uiLang === 'ar' ? 'تصدير التقدم (JSON)' : 'Export Backup'}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-duo-nightSubtle border-2 border-b-4 border-slate-300 dark:border-duo-nightBorder text-slate-700 dark:text-slate-200 font-black text-xs"
            >
              <Upload className="w-4 h-4" />
              {uiLang === 'ar' ? 'استرجاع نسخة محفوظة' : 'Import Backup'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    uiLang === 'ar'
                      ? 'واش متأكد بغيتي تعاود التقدم من الصفر؟'
                      : 'Reset all progress to fresh state?'
                  )
                ) {
                  onResetProgress();
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-black text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              {uiLang === 'ar' ? 'إعادة الضبط' : 'Reset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
