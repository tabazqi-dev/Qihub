import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Download, Upload, RotateCcw, User, Shield, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile, exportDataJSON, importDataJSON, resetAllData } = useApp();
  
  const [name, setName] = useState(profile.name);
  const [title, setTitle] = useState(profile.title);
  const [currencySymbol, setCurrencySymbol] = useState(profile.currencySymbol);
  const [monthlyBudget, setMonthlyBudget] = useState(profile.monthlyBudget.toString());
  const [bankAccountDetails, setBankAccountDetails] = useState(profile.bankAccountDetails || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim() || profile.name,
      title: title.trim() || profile.title,
      currencySymbol: currencySymbol.trim() || 'Rp',
      monthlyBudget: parseFloat(monthlyBudget) || 10000000,
      bankAccountDetails: bankAccountDetails.trim() || profile.bankAccountDetails,
    });
    onClose();
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
              Pengaturan & Data Vault
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Profil Pengguna
            </h3>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Avatar Studio
                </p>
                <p className="text-xs text-neutral-800 dark:text-neutral-200 mt-0.5">
                  Foto profil resolusi tinggi tersimpan di aset sistem.
                </p>
              </div>
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
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
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

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>

          {/* Backup & Data Persistence Section */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Penyimpanan Lokal & Backup JSON</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Seluruh data tersimpan aman di browser Anda (LocalStorage / IndexedDB). Anda dapat mengekspor salinan backup atau memulihkannya kapan saja.
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
                  if (window.confirm('Apakah Anda yakin ingin mengembalikan semua data ke template awal?')) {
                    resetAllData();
                    onClose();
                  }
                }}
                className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1"
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
