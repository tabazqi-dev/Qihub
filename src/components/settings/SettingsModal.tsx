import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { compressImageDataUrl } from '../../utils/imageCompress';
import { sanitizeSafeImageSrc } from '../../utils/debtItems';
import { normalizeCutoffDay } from '../../utils/billingPeriod';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  User,
  Shield,
  Cloud,
  CloudOff,
  LogOut,
  RefreshCw,
  QrCode,
  Trash2,
  CheckCircle2,
  Sparkles,
  KeyRound,
  Link2,
  Eye,
  EyeOff
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    authUser,
    syncStatus,
    signInWithGoogle,
    linkUsernamePassword,
    linkGoogleAccount,
    signOutUser,
    pushLocalWorkspaceToCloud,
    appBranding,
    updateAppBranding,
    profile,
    updateProfile,
    exportDataJSON,
    importDataJSON,
    resetAllData,
    showToast
  } = useApp();

  const [name, setName] = useState(profile.name);
  const [title, setTitle] = useState(profile.title);
  const [appName, setAppName] = useState(appBranding.appName || "Q'Hub");
  const [appLogoUrl, setAppLogoUrl] = useState(appBranding.appLogoUrl || '');
  const [currencySymbol, setCurrencySymbol] = useState(profile.currencySymbol);
  const [monthlyBudget, setMonthlyBudget] = useState(profile.monthlyBudget.toString());
  const [monthlyCutoffDay, setMonthlyCutoffDay] = useState<number>(() => normalizeCutoffDay(profile.monthlyCutoffDay));
  const [bankAccountDetails, setBankAccountDetails] = useState(profile.bankAccountDetails || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [paymentQrDataUrl, setPaymentQrDataUrl] = useState(profile.paymentQrDataUrl || '');
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [isCompressingLogo, setIsCompressingLogo] = useState(false);
  const [isCompressingQr, setIsCompressingQr] = useState(false);

  // Unified multi-method login linking state
  const [showCredForm, setShowCredForm] = useState(false);
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkCurrentPassword, setLinkCurrentPassword] = useState('');
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [isLinkingCreds, setIsLinkingCreds] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setTitle(profile.title);
      setAppName(appBranding.appName || "Q'Hub");
      setAppLogoUrl(appBranding.appLogoUrl || '');
      setCurrencySymbol(profile.currencySymbol);
      setMonthlyBudget(String(profile.monthlyBudget || 0));
      setMonthlyCutoffDay(normalizeCutoffDay(profile.monthlyCutoffDay));
      setBankAccountDetails(profile.bankAccountDetails || '');
      setAvatarUrl(profile.avatarUrl);
      setPaymentQrDataUrl(profile.paymentQrDataUrl || '');
      setShowCredForm(false);
      setLinkUsername(authUser?.username || '');
      setLinkPassword('');
      setLinkCurrentPassword('');
      setCredError(null);
    }
  }, [isOpen, profile, appBranding, authUser?.username]);

  if (!isOpen) return null;

  const formatBudgetDisplay = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits ? parseInt(digits, 10).toLocaleString('id-ID') : '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericBudget = parseInt(monthlyBudget.replace(/\D/g, ''), 10) || 0;
    const nextAppName = appName.trim() || "Q'Hub";
    const nextLogoUrl = appLogoUrl.trim() || undefined;

    if (nextAppName !== (appBranding.appName || "Q'Hub") || nextLogoUrl !== appBranding.appLogoUrl) {
      await updateAppBranding({
        appName: nextAppName,
        appLogoUrl: nextLogoUrl,
      });
    }

    updateProfile({
      name: name.trim() || profile.name,
      title: title.trim(),
      currencySymbol: currencySymbol.trim() || 'Rp',
      monthlyBudget: numericBudget,
      monthlyCutoffDay: normalizeCutoffDay(monthlyCutoffDay),
      bankAccountDetails: bankAccountDetails.trim(),
      avatarUrl: avatarUrl.trim() || profile.avatarUrl,
      paymentQrDataUrl: paymentQrDataUrl.trim() || undefined
    });
    onClose();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsCompressingAvatar(true);
    try {
      const compressed = await compressImageDataUrl(file, 360, 0.82);
      setAvatarUrl(compressed);
      updateProfile({ avatarUrl: compressed });
    } catch {
      showToast('Gagal memproses foto profil', 'error');
    } finally {
      setIsCompressingAvatar(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsCompressingLogo(true);
    try {
      const compressed = await compressImageDataUrl(file, 256, 0.9);
      setAppLogoUrl(compressed);
      await updateAppBranding({ appLogoUrl: compressed });
    } catch {
      showToast('Gagal memproses gambar logo aplikasi', 'error');
    } finally {
      setIsCompressingLogo(false);
    }
  };

  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsCompressingQr(true);
    try {
      const compressed = await compressImageDataUrl(file, 420, 0.9);
      setPaymentQrDataUrl(compressed);
      showToast('Gambar QR Pembayaran siap disimpan', 'success');
    } catch {
      showToast('Gagal memproses gambar QR Code', 'error');
    } finally {
      setIsCompressingQr(false);
    }
  };

  const handleGenerateQrFromBank = async () => {
    const text = (bankAccountDetails || `${profile.name} - Q'Hub Invoice Payment`).trim();
    try {
      const qrData = await QRCode.toDataURL(text, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      setPaymentQrDataUrl(qrData);
      showToast('QR Code pembayaran otomatis dibuat dari detail rekening!', 'success');
    } catch {
      showToast('Gagal membuat QR Code otomatis', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importDataJSON(content);
        if (ok) onClose();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Pengaturan & Sinkronisasi Cloud
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Account & Cloud Sync Card */}
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/30 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  authUser ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                }`}>
                  {authUser ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {authUser
                      ? authUser.authType === 'local'
                        ? 'Akun Username & Password Aktif'
                        : 'CloudSync Google Aktif'
                      : 'Belum Masuk Akun'}
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                    {authUser
                      ? authUser.authType === 'local'
                        ? `Masuk sebagai @${authUser.username} (${authUser.displayName})`
                        : `Masuk sebagai ${authUser.email}`
                      : 'Masuk untuk menyinkronkan data ke PostgreSQL.'}
                  </p>
                </div>
              </div>
              {authUser && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                  syncStatus === 'error'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    : syncStatus === 'local'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {syncStatus === 'syncing'
                    ? 'Sync...'
                    : syncStatus === 'local'
                      ? 'Mode Lokal'
                      : syncStatus === 'error'
                        ? 'Sync Gagal'
                        : 'PostgreSQL Aktif'}
                </span>
              )}
            </div>

            {!authUser ? (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>Masuk dengan Google untuk Aktifkan Sync</span>
              </button>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-indigo-200/70 dark:border-indigo-900/40 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Metode Login Akun Ini (1 Akun Bisa Keduanya)</span>
                    </span>
                  </div>

                  {/* Google Sync Status / Link */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 border-t border-neutral-200/70 dark:border-neutral-800">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        Google CloudSync
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {(authUser.hasGoogle || authUser.authType === 'google')
                          ? `Terhubung: ${authUser.googleEmail || authUser.email}`
                          : 'Belum terhubung ke akun Google'}
                      </p>
                    </div>
                    {!(authUser.hasGoogle || authUser.authType === 'google') ? (
                      <button
                        type="button"
                        disabled={isLinkingGoogle}
                        onClick={async () => {
                          setIsLinkingGoogle(true);
                          try {
                            await linkGoogleAccount();
                          } finally {
                            setIsLinkingGoogle(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-semibold hover:opacity-90 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isLinkingGoogle ? 'Menghubungkan...' : 'Hubungkan Google'}
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        ✓ Aktif
                      </span>
                    )}
                  </div>

                  {/* Username & Password Status / Link */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 border-t border-neutral-200/70 dark:border-neutral-800">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        Username & Password
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {(authUser.hasPassword || authUser.authType === 'local') && authUser.username
                          ? `Terhubung: @${authUser.username}`
                          : 'Belum diatur — tambahkan agar bisa login tanpa Google'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCredForm(prev => !prev);
                        setCredError(null);
                        setLinkUsername(authUser.username || '');
                        setLinkPassword('');
                        setLinkCurrentPassword('');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>
                        {(authUser.hasPassword || authUser.authType === 'local')
                          ? (showCredForm ? 'Tutup' : 'Ubah Password')
                          : (showCredForm ? 'Batal' : 'Tambah Username & Pass')}
                      </span>
                    </button>
                  </div>

                  {showCredForm && (
                    <div className="pt-2 border-t border-neutral-200/70 dark:border-neutral-800 space-y-2.5">
                      {credError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                          {credError}
                        </p>
                      )}
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={linkUsername}
                          onChange={(e) => setLinkUsername(e.target.value)}
                          placeholder="contoh: alif.pratama (3-32 karakter)"
                          className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                        />
                      </div>

                      {(authUser.hasPassword || authUser.authType === 'local') && (
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                            Password Saat Ini
                          </label>
                          <input
                            type="password"
                            value={linkCurrentPassword}
                            onChange={(e) => setLinkCurrentPassword(e.target.value)}
                            placeholder="Masukkan password lama"
                            className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                          {(authUser.hasPassword || authUser.authType === 'local') ? 'Password Baru (min. 6 karakter)' : 'Password (min. 6 karakter)'}
                        </label>
                        <div className="relative">
                          <input
                            type={showLinkPassword ? 'text' : 'password'}
                            value={linkPassword}
                            onChange={(e) => setLinkPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLinkPassword(prev => !prev)}
                            className="p-1 text-neutral-400 hover:text-neutral-600 absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
                          >
                            {showLinkPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCredForm(false)}
                          className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isLinkingCreds}
                          onClick={async () => {
                            setCredError(null);
                            const cleanU = linkUsername.trim().toLowerCase();
                            if (!/^[a-z0-9._-]{3,32}$/.test(cleanU)) {
                              setCredError('Username harus 3–32 karakter (huruf kecil, angka, ., _, -).');
                              return;
                            }
                            if (linkPassword.length < 6) {
                              setCredError('Password minimal 6 karakter.');
                              return;
                            }
                            if ((authUser.hasPassword || authUser.authType === 'local') && !linkCurrentPassword) {
                              setCredError('Masukkan password saat ini untuk mengganti password.');
                              return;
                            }
                            setIsLinkingCreds(true);
                            try {
                              const res = await linkUsernamePassword(
                                cleanU,
                                linkPassword,
                                (authUser.hasPassword || authUser.authType === 'local') ? linkCurrentPassword : undefined
                              );
                              if (res.ok) {
                                setShowCredForm(false);
                                setLinkPassword('');
                                setLinkCurrentPassword('');
                              } else if (res.error) {
                                setCredError(res.error);
                              }
                            } finally {
                              setIsLinkingCreds(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {isLinkingCreds ? 'Menyimpan...' : 'Simpan Login Username'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={pushLocalWorkspaceToCloud}
                    className="flex-1 py-2 px-3 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>Paksa Sinkronkan Ulang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      void signOutUser();
                    }}
                    className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-neutral-900 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar Akun</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Profile & Branding Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* App Logo & Name Branding (Global, decoupled from user account) */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Logo & Nama Aplikasi (Global)
                  </span>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Berlaku global untuk seluruh halaman aplikasi & layar login, terpisah dari akun user.
                  </p>
                </div>
                {appLogoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAppLogoUrl('');
                      void updateAppBranding({ appLogoUrl: undefined });
                    }}
                    className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3 h-3" /> Reset Default
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden shrink-0">
                  {sanitizeSafeImageSrc(appLogoUrl) ? (
                    <img
                      src={sanitizeSafeImageSrc(appLogoUrl)}
                      alt={appName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>Ω</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isCompressingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCompressingLogo ? 'Memproses...' : 'Unggah Logo Baru'}
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                  </div>
                  <input
                    type="text"
                    value={appLogoUrl}
                    onChange={(e) => setAppLogoUrl(e.target.value)}
                    placeholder="Atau tempel URL logo (https://...)"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Nama Aplikasi
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Contoh: Q'Hub"
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Profil Pengguna
            </h3>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
              <img
                key={avatarUrl}
                src={sanitizeSafeImageSrc(avatarUrl) || sanitizeSafeImageSrc(profile.avatarUrl) || '/src/assets/images/user_avatar_1793517278515.jpg'}
                alt={name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== window.location.origin + '/src/assets/images/user_avatar_1793517278515.jpg') {
                    img.src = '/src/assets/images/user_avatar_1793517278515.jpg';
                  }
                }}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500/30 bg-neutral-200 dark:bg-neutral-800"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Foto Profil / Avatar
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isCompressingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isCompressingAvatar ? 'Memproses...' : 'Unggah Foto Baru'}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Atau URL Foto Profil
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Profesi / Bio Singkat
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Mata Uang
                </label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Target Anggaran Bulanan
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatBudgetDisplay(monthlyBudget)}
                  onChange={(e) => setMonthlyBudget(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Tanggal Cut-off Bulanan (Gajian / Reset Anggaran)
              </label>
              <select
                value={monthlyCutoffDay}
                onChange={(e) => setMonthlyCutoffDay(normalizeCutoffDay(Number(e.target.value)))}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 font-semibold cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    Tanggal {day} {day === 26 ? '(Default Gajian)' : day === 1 ? '(Awal Bulan Kalender)' : 'tiap bulan'}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                Periode berjalan dihitung mulai tanggal {monthlyCutoffDay} pagi sampai sehari sebelum tanggal {monthlyCutoffDay} bulan berikutnya (riwayat transaksi lama tetap aman).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Rekening Pembayaran (Muncul pada Invoice & Pesan WA)
              </label>
              <textarea
                rows={2}
                value={bankAccountDetails}
                onChange={(e) => setBankAccountDetails(e.target.value)}
                placeholder="Contoh: BCA: 873-049-2189 a/n Alif Pratama&#10;GoPay/OVO: 0812-8899-7721"
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 font-mono resize-none"
              />
            </div>

            {/* Default Payment QR Image */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    QR Code Pembayaran Default (QRIS / Rekening)
                  </span>
                </div>
                {paymentQrDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPaymentQrDataUrl('')}
                    className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus QR
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {paymentQrDataUrl ? (
                  <img
                    src={paymentQrDataUrl}
                    alt="QR Pembayaran"
                    className="w-16 h-16 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white object-contain p-1 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-400 shrink-0">
                    <QrCode className="w-6 h-6" />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isCompressingQr}
                    onClick={() => qrInputRef.current?.click()}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors cursor-pointer"
                  >
                    {isCompressingQr ? 'Memproses...' : 'Upload Gambar QRIS'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateQrFromBank}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                  >
                    Buat QR dari Rekening
                  </button>
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleQrFileChange}
                  />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                QR ini akan otomatis disematkan ke kartu & PDF Invoice penagihan WhatsApp Anda.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>

          {/* Backup & Data Persistence Section */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Backup & Export Data JSON</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Data tersimpan otomatis di browser dan langsung disinkronkan ke Cloud jika Anda login Google. Anda juga bisa ekspor JSON sebagai cadangan.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={exportDataJSON}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-500" />
                <span>Export Backup JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>Import Backup File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset seluruh data akun Anda (rekening, transaksi, piutang, reimburse, logbook, catatan, QR) kembali ke 0? Logo aplikasi global tidak akan berubah.')) {
                    resetAllData();
                    onClose();
                  }
                }}
                className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Data Akun ke 0 (Kosongkan)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
