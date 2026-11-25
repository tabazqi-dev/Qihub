import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Cloud,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  ShieldCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const {
    appBranding,
    theme,
    toggleTheme,
    signInWithUsernamePassword,
    registerWithUsernamePassword,
    signInWithGoogle,
    syncStatus
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const appName = appBranding.appName?.trim() || "Q'Hub";
  const logoSrc = appBranding.appLogoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUsername)) {
      setErrorMessage('Username harus 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau tanda hubung).');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        mode === 'login'
          ? await signInWithUsernamePassword(cleanUsername, password)
          : await registerWithUsernamePassword(cleanUsername, password, displayName.trim() || undefined);

      if (!result.ok) {
        setErrorMessage(result.error || 'Autentikasi gagal. Periksa kembali data Anda.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between p-4 sm:p-6 transition-colors relative overflow-hidden">
      {/* Subtle Ambient Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 max-w-md w-full mx-auto flex items-center justify-end">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
          title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

      {/* Center Auth Card */}
      <div className="relative z-10 w-full max-w-md mx-auto my-6">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* App Brand Logo & Title */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg overflow-hidden border border-white/20">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={appName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>Ω</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                {appName}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Masuk dengan Username/Password atau Google CloudSync — keduanya bisa dihubungkan ke 1 akun yang sama di Pengaturan.
              </p>
            </div>
          </div>

          {/* Auth Mode Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Akun</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Baru</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Username + Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                  Nama Tampilan
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Alif Pratama"
                    autoComplete="name"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="contoh: alif.pratama"
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Minimal 6 karakter' : 'Masukkan password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  aria-label="Tampilkan password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk dengan Username</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Buat Akun & Masuk</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center py-1">
            <div className="flex-1 border-t border-neutral-200 dark:border-neutral-800" />
            <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              atau
            </span>
            <div className="flex-1 border-t border-neutral-200 dark:border-neutral-800" />
          </div>

          {/* Google CloudSync Option */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isSubmitting || syncStatus === 'syncing'}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Cloud className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
            <span>Masuk dengan Google (CloudSync)</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Seluruh data tersinkronisasi aman ke PostgreSQL Cloud per akun.</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 text-center text-[11px] text-neutral-400 font-mono">
        {appName} • Enterprise Personal Super App
      </div>
    </div>
  );
};
