import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { compressImageDataUrl } from '../../utils/imageCompress';
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
  CheckCircle2
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    syncStatus,
    signInWithGoogle,
    signOutGoogle,
    pushLocalWorkspaceToCloud,
    profile,
    updateProfile,
    exportDataJSON,
    importDataJSON,
    resetAllData,
    showToast
  } = useApp();

  const [name, setName] = useState(profile.name);
  const [title, setTitle] = useState(profile.title);
  const [currencySymbol, setCurrencySymbol] = useState(profile.currencySymbol);
  const [monthlyBudget, setMonthlyBudget] = useState(profile.monthlyBudget.toString());
  const [bankAccountDetails, setBankAccountDetails] = useState(profile.bankAccountDetails || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [paymentQrDataUrl, setPaymentQrDataUrl] = useState(profile.paymentQrDataUrl || '');
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [isCompressingQr, setIsCompressingQr] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setTitle(profile.title);
      setCurrencySymbol(profile.currencySymbol);
      setMonthlyBudget(String(profile.monthlyBudget || 0));
      setBankAccountDetails(profile.bankAccountDetails || '');
      setAvatarUrl(profile.avatarUrl);
      setPaymentQrDataUrl(profile.paymentQrDataUrl || '');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const formatBudgetDisplay = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits ? parseInt(digits, 10).toLocaleString('id-ID') : '';
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const numericBudget = parseInt(monthlyBudget.replace(/\D/g, ''), 10) || 10000000;
    updateProfile({
      name: name.trim() || profile.name,
      title: title.trim() || profile.title,
      currencySymbol: currencySymbol.trim() || 'Rp',
      monthlyBudget: numericBudget,
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
          {/* Cloud Sync Card */}
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/30 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  user ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                }`}>
                  {user ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {user ? 'Cloud Sync Antar Device Aktif' : 'Sinkronisasi Antar Device (Cloud Sync)'}
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                    {user
                      ? `Masuk sebagai ${user.email}`
                      : 'Masuk dengan akun Google agar data Keuangan, Piutang, Logbook, Reimburse, dan QR tersinkronisasi otomatis di semua HP & Laptop.'}
                  </p>
                </div>
              </div>
              {user && (
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

            {!user ? (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>Masuk dengan Google untuk Aktifkan Sync</span>
              </button>
            ) : (
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
                  onClick={signOutGoogle}
                  className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-neutral-900 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Profil Pengguna
            </h3>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
              <img
                key={avatarUrl}
                src={avatarUrl || profile.avatarUrl}
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
                  if (window.confirm('Apakah Anda yakin ingin mengembalikan semua data lokal ke template awal?')) {
                    resetAllData();
                    onClose();
                  }
                }}
                className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Data Bawaan (Default Template)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
