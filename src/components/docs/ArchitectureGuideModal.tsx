import React, { useState } from 'react';
import { 
  Layers, 
  FolderTree, 
  Database, 
  Sparkles,
  GitBranch,
  ArrowRight,
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Receipt,
  FileText,
  FileType,
  QrCode,
  Scissors,
  Clock,
  Settings,
  ChevronDown,
  ChevronRight,
  Workflow,
  ShieldCheck,
  Zap,
  Info,
  CheckCircle2,
  ArrowLeftRight,
  Sliders,
  Compass
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ArchitectureGuideModal: React.FC = () => {
  const { showToast } = useApp();
  const [activeMenuFlow, setActiveMenuFlow] = useState<string>('finance');

  // Flow details for each menu (Functional, User-Centric, Non-Code)
  const menuFlows: Record<string, {
    title: string;
    icon: any;
    tag: string;
    summary: string;
    steps: { step: string; desc: string; highlight: string }[];
  }> = {
    dashboard: {
      title: '1. Dashboard Utama (Executive Hub)',
      icon: LayoutDashboard,
      tag: 'Executive Overview & Aggregation',
      summary: 'Menampilkan greeting personal dinamis, kartu saldo terpisah (Cash vs Non-Cash), indikator piutang belum lunas, agenda prioritas hari ini, habit tracker mingguan, dan shortcut alat cepat.',
      steps: [
        {
          step: '1. Inisialisasi Ringkasan Eksekutif',
          desc: 'Sistem membaca seluruh data tersimpan (keuangan, tugas harian, catatan, dan kebiasaan) untuk disajikan dalam satu layar terpadu.',
          highlight: 'Agregasi Terpusat Real-Time'
        },
        {
          step: '2. Kalkulasi Metrik & Arus Kas',
          desc: 'Secara instan menghitung total saldo Tunai (Cash), saldo Rekening/E-Wallet (Non-Cash), status piutang, dan peringatan overbudget bulan berjalan.',
          highlight: 'Pemisahan Dompet Tunai vs Digital'
        },
        {
          step: '3. Tata Letak Bento Grid Responsif',
          desc: 'Menata kartu informasi dalam grid modern yang adaptif di layar laptop (desktop), tablet, hingga layar sentuh ponsel (mobile).',
          highlight: 'Desain Fleksibel Multi-Device'
        },
        {
          step: '4. Peluncur Aksi & Akses Cepat',
          desc: 'Tombol entri cepat dan jalan pintas alat langsung membuka modal pembuatan tugas, pencatatan transaksi, atau perpindahan menu tanpa jeda.',
          highlight: 'Interaksi Cepat Sekali Klik'
        }
      ]
    },
    todos: {
      title: '2. Todo List & Master Calendar',
      icon: CheckSquare,
      tag: 'Task Management & Integrated Calendar',
      summary: 'Manajemen tugas cerdas dengan prioritas, kategori fleksibel, subtask checklist bertahap, dan tampilan Master Kalender bulanan yang saling terhubung.',
      steps: [
        {
          step: '1. Pengelompokan & Skala Prioritas',
          desc: 'Setiap tugas memiliki label prioritas (Mendesak, Sedang, Rendah) serta kategori pekerjaan atau kehidupan pribadi.',
          highlight: 'Manajemen Fokus & Skala Kepentingan'
        },
        {
          step: '2. Kalender Terintegrasi',
          desc: 'Jadwal tenggat waktu tugas otomatis dipetakan pada kalender bulanan dengan indikator visual status pengerjaan.',
          highlight: 'Sinkronisasi Agenda & Deadline'
        },
        {
          step: '3. Pemecahan Subtask Bertingkat',
          desc: 'Tugas besar dapat dipecah menjadi beberapa subtugas dengan progres persentase penyelesaian yang bergerak dinamis.',
          highlight: 'Penyelesaian Bertahap Terukur'
        },
        {
          step: '4. Konfirmasi Penyelesaian',
          desc: 'Saat tugas selesai ditandai, sistem memberikan umpan balik visual animasi kepuasan untuk mempertahankan motivasi harian.',
          highlight: 'Reward Visual Pencapaian'
        }
      ]
    },
    finance: {
      title: '3. Keuangan (Multi-Akun, Tarik Tunai, Mutasi, COA Standar Akuntansi & P&L)',
      icon: Wallet,
      tag: 'PSAK Double-Entry & Multi-Account Engine',
      summary: 'Pengelolaan keuangan profesional: multi-rekening Bank, E-Wallet, dan Dompet Fisik, fitur Tarik Tunai & Transfer Antar Akun, mutasi akun berjalan, bagan akun standar (Chart of Accounts PSAK), jurnal umum berpasangan, hutang/piutang, serta audit rekonsiliasi harian.',
      steps: [
        {
          step: '1. Multi-Akun & Saldo Awal',
          desc: 'Mendaftarkan seluruh rekening bank (BCA, Mandiri), e-wallet (GoPay, DANA, OVO), dan dompet tunai fisik dengan saldo awal yang dapat diunggah via CSV.',
          highlight: 'Manajemen Kas & Bank Terpadu'
        },
        {
          step: '2. Transfer Antar Akun & Tarik Tunai Mandiri',
          desc: 'Memindahkan dana antar rekening, top up dompet elektronik, atau mencatat penarikan uang tunai di ATM secara mudah dengan penghitungan biaya admin fleksibel.',
          highlight: 'Pindah Dana & Tarik Tunai Sekali Klik'
        },
        {
          step: '3. Mutasi Rekening Individual (Account Statement)',
          desc: 'Saat kartu akun diklik, sistem membuka buku mutasi rekening individual lengkap dengan saldo berjalan kumulatif (running balance), filter mutasi, dan pencarian transaksi.',
          highlight: 'Buku Pembantu & Saldo Berjalan Presisi'
        },
        {
          step: '4. Bagan Akun Standar Akuntansi (COA & Jurnal Umum)',
          desc: 'Seluruh transaksi dan saldo awal otomatis bermuara pada Chart of Accounts standar PSAK (1-Aset, 2-Kewajiban, 3-Ekuitas, 4-Pendapatan, 5-Beban) dengan jurnal double-entry seimbang (Debit = Kredit).',
          highlight: 'Kepatuhan Standar Akuntansi Baku (PSAK)'
        },
        {
          step: '5. Hutang Saya (Kredit & PayLater)',
          desc: 'Saat mencatat pengeluaran yang belum dibayar tunai, sistem otomatis mencatat kewajiban tempo dan riwayat cicilan pelunasannya.',
          highlight: 'Pelacak Liabilitas & Jatuh Tempo'
        },
        {
          step: '6. Piutang (Potong Akun) & Tagihan WhatsApp',
          desc: 'Pencatatan pinjaman orang lain dengan opsi memotong saldo akun sumber, pembuatan nota tagihan otomatis, dan pesan penagihan langsung via WhatsApp.',
          highlight: 'Penagihan Ramah & Invoice Resmi'
        },
        {
          step: '7. Cek Harian (Opname Saldo Riil vs Sistem)',
          desc: 'Verifikasi kecocokan saldo m-banking/dompet riil dengan saldo sistem per tanggal, mendeteksi selisih, dan menyediakan penyesuaian otomatis.',
          highlight: 'Rekonsiliasi Harian Bebas Selisih'
        }
      ]
    },
    reimburse: {
      title: '4. Reimburse Proyek (Klaim WD/WE & Matrix Tarif Excel)',
      icon: Receipt,
      tag: 'Automated Rate Lookup & Multi-Account Payout',
      summary: 'Modul klaim reimbursement proyek onsite & online dengan perhitungan hari kerja (Weekday & Weekend) otomatis, matriks tarif Excel (Role M/TPM/PM), ekspor CSV & laporan PDF resmi, serta pencairan dana langsung ke rekening bank atau dompet pilihan.',
      steps: [
        {
          step: '1. Matriks Tarif Excel Fleksibel (Rate Matrix)',
          desc: 'Menyimpan tarif harian presisi sesuai tabel acuan Excel untuk 6 kombinasi Role (M, TPM, PM) dan Tipe Proyek (Onsite, Online) terpisah untuk WD dan WE, dengan opsi edit tarif dan reset bawaan.',
          highlight: 'Tarif Terstandarisasi Sesuai Master Excel'
        },
        {
          step: '2. Deteksi Hari & Sesi Kerja Otomatis (WD vs WE)',
          desc: 'Cukup masukkan tanggal mulai dan selesai proyek, sistem otomatis menghitung hari kerja. Khusus tipe Online, 1 hari kerja otomatis dihitung sebagai 2 sesi (#WD dan #WE) dengan tarif per sesi sesuai formula acuan lembar kerja Excel.',
          highlight: 'Khusus Online: 1 Hari = 2 Sesi'
        },
        {
          step: '3. Penghitungan Nilai Klaim Instan',
          desc: 'Mengalikan jumlah hari dengan tarif terkait secara otomatis (#WD × Tarif WD + #WE × Tarif WE = Total) tanpa formula error seperti #VALUE! pada lembar kerja spreadsheet.',
          highlight: 'Formula Otomatis Akurat 100%'
        },
        {
          step: '4. Pencairan Dana Terintegrasi ke Rekening',
          desc: 'Saat status reimburse diubah menjadi Done, sistem menawarkan opsi untuk menyetor dana klaim langsung ke rekening Bank, E-Wallet, atau Dompet Tunai pengguna.',
          highlight: 'Integrasi Saldo Kas Riil Sekali Klik'
        },
        {
          step: '5. Ekspor Format Excel (CSV) & Laporan PDF',
          desc: 'Dapat diekspor menjadi berkas CSV dengan nama kolom yang identik dengan template Excel serta dicetak ke laporan PDF resmi untuk kelengkapan administrasi.',
          highlight: 'Kompatibilitas Penuh Lembar Kerja Excel'
        }
      ]
    },
    notes: {
      title: '5. Catatan & Knowledge Base',
      icon: FileText,
      tag: 'Markdown Knowledge Hub & Media Exporter',
      summary: 'Editor catatan dokumen dengan format Markdown, pratinjau langsung berdampingan (split-view), penyisipan gambar, kategori kustom, dan ekspor resmi ke format PDF.',
      steps: [
        {
          step: '1. Pengorganisasian Kategori & Folder',
          desc: 'Mengelompokkan ide, materi rapat, atau riset ke dalam kategori yang dapat ditambah dan dikelola secara leluasa.',
          highlight: 'Struktur Informasi Rapi'
        },
        {
          step: '2. Penulisan Markdown & Penyisipan Gambar',
          desc: 'Menulis teks berstruktur rapi lengkap dengan judul, daftar poin, kutipan, dan gambar yang dapat diunggah dari galeri atau ditempel langsung (paste).',
          highlight: 'Format Teks Kaya & Media Tersemat'
        },
        {
          step: '3. Konfirmasi Keamanan Penghapusan',
          desc: 'Menyediakan dialog konfirmasi in-app yang nyaman dan aman saat menghapus dokumen penting tanpa resiko salah tekan.',
          highlight: 'Perlindungan Data Dokumen'
        },
        {
          step: '4. Ekspor Dokumen ke Format PDF',
          desc: 'Mengubah catatan menjadi dokumen PDF resmi standar A4 siap cetak atau dibagikan ke rekan kerja.',
          highlight: 'Konversi Dokumen Sekali Klik'
        }
      ]
    },
    pdftools: {
      title: '6. PDF Utilities (Konversi, Kompres & Tanda Tangan)',
      icon: FileType,
      tag: 'Client-Side Document Engine',
      summary: 'Alat pengolahan dokumen PDF lengkap di peramban: menggabungkan foto JPG/PNG menjadi PDF, kompresi ukuran berkas hemat memori, dan penandatanganan digital resmi.',
      steps: [
        {
          step: '1. Konversi Gambar ke PDF',
          desc: 'Memilih banyak foto sekaligus, mengatur urutan halaman dan margin kertas, lalu mengunduh hasil PDF berkualitas tinggi.',
          highlight: 'Penyusunan Berkas Foto Praktis'
        },
        {
          step: '2. Kompresi Berkas PDF',
          desc: 'Memperkecil ukuran berkas PDF dengan pilihan tingkat kompresi (Ringan, Seimbang, atau Ekstrem) agar mudah dikirim via email atau portal lamaran kerja.',
          highlight: 'Optimasi Ukuran Dokumen'
        },
        {
          step: '3. Pembubuhan Tanda Tangan Digital',
          desc: 'Membubuhkan tanda tangan dengan goresan tangan di layar sentuh, mengetik nama dengan gaya kaligrafi, atau mengunggah stempel/tanda tangan transparan.',
          highlight: 'Tanda Tangan Elektronik Sah'
        }
      ]
    },
    barcode: {
      title: '7. Barcode & QR Code Suite',
      icon: QrCode,
      tag: 'Vector Generator & Optical Scanner',
      summary: 'Pembuat kode batang 1D dan QR Code 2D resolusi tajam dengan kustomisasi warna, logo, serta pemindai optik melalui kamera perangkat.',
      steps: [
        {
          step: '1. Pembuatan Kode Kustom',
          desc: 'Menghasilkan QR Code untuk tautan web, nomor WhatsApp, teks rahasia, atau Barcode produk ritel standar internasional.',
          highlight: 'Generator Multi-Format'
        },
        {
          step: '2. Personalisasi Warna & Unduh Berkas',
          desc: 'Menyesuaikan warna latar dan warna kode sesuai kebutuhan identitas visual, lalu mengunduh format PNG beresolusi tinggi.',
          highlight: 'Hasil Cetak Tajam & Jernih'
        },
        {
          step: '3. Pemindai Kamera Cepat',
          desc: 'Memanfaatkan kamera bawaan laptop atau HP untuk membaca isi kode secara langsung dan membuka tautannya dalam sekejap.',
          highlight: 'Pemindaian Optik Instan'
        }
      ]
    },
    removebg: {
      title: '8. Remove Background AI',
      icon: Scissors,
      tag: 'On-Device AI Vision Studio',
      summary: 'Penghapus latar belakang gambar berbasis kecerdasan buatan on-device tanpa mengunggah foto ke server internet publik, dilengkapi kuas sentuhan manual.',
      steps: [
        {
          step: '1. Deteksi Subjek Otomatis',
          desc: 'Kecerdasan buatan mengenali objek utama (orang, produk, atau benda) dan memisahkannya dari latar belakang dengan tepian halus.',
          highlight: 'Segmentasi Cerdas On-Device'
        },
        {
          step: '2. Kuas Perbaikan Manual (Brush Refine)',
          desc: 'Pengguna dapat menyempurnakan area rambut, detail rumit, atau tepi tipis menggunakan kuas penghapus atau kuas pemulih.',
          highlight: 'Kendali Presisi Sempurna'
        },
        {
          step: '3. Unduh Berkas Transparan',
          desc: 'Menyimpan hasil foto dalam format PNG transparan siap pakai untuk foto profil, katalog e-commerce, atau desain grafis.',
          highlight: 'Kualitas Tinggi Tanpa Kompresi Buruk'
        }
      ]
    },
    focus: {
      title: '9. Focus Timer (Pomodoro Technique)',
      icon: Clock,
      tag: 'Deep Work & Productivity Rhythm',
      summary: 'Pengatur ritme kerja mendalam dengan siklus 25 menit fokus, 5 menit istirahat pendek, dan 15 menit istirahat panjang disertai efek audio lonceng sintetis menenangkan.',
      steps: [
        {
          step: '1. Pemilihan Mode Interval',
          desc: 'Memilih sesi Kerja Fokus atau periode relaksasi teratur untuk mencegah kelelahan mental.',
          highlight: 'Ritme Produktivitas Terbukti'
        },
        {
          step: '2. Penghitungan Waktu Akurat',
          desc: 'Timer visual dengan lingkaran progres yang memberikan rasa kendali terhadap alur pengerjaan tugas penting.',
          highlight: 'Fokus Visual Tanpa Distraksi'
        },
        {
          step: '3. Lonceng Pengingat Nyaman',
          desc: 'Bunyi lonceng meditasi lembut saat sesi berakhir untuk memberi sinyal istirahat yang ramah di telinga.',
          highlight: 'Sintesis Audio Lembut'
        }
      ]
    }
  };

  const activeFlowData = menuFlows[activeMenuFlow] || menuFlows.finance;
  const FlowIcon = activeFlowData.icon;

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Banner with App Version */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              Ω
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>OmniHub Super App Architecture & System Guide</span>
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold">
                  v2.7.0
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Dokumentasi arsitektur modular, alur kerja (execution flow) seluruh fitur, dan panduan pengembangan aplikasi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>100% Client-Side Private (Bebas Server Luar)</span>
            </span>
          </div>
        </div>

        {/* System Highlights Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Versi Terpasang</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono text-xs">v2.6.0 (Enterprise)</span>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Standar Keuangan</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono text-xs">PSAK Double-Entry</span>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Desain Visual</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono text-xs">Modern Glassmorphism</span>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Keamanan Data</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono text-xs">Lokal Browser Privat</span>
          </div>
        </div>
      </div>

      {/* ================= FLOW EXPLORER FOR EACH MENU ================= */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Peta Alur Kerja (Execution Flow) Setiap Menu
            </h3>
          </div>
          <span className="text-xs text-neutral-400">Pilih menu di bawah untuk melihat alur detail</span>
        </div>

        {/* Menu Tab Selector */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
          {Object.entries(menuFlows).map(([key, data]) => {
            const Icon = data.icon;
            const isActive = activeMenuFlow === key;
            return (
              <button
                key={key}
                onClick={() => setActiveMenuFlow(key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{data.title.split('(')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Active Flow Display */}
        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/80 dark:border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FlowIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {activeFlowData.title}
                </h4>
                <p className="text-[11px] text-neutral-400 font-medium">
                  Karakteristik: {activeFlowData.tag}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
            {activeFlowData.summary}
          </p>

          {/* Sequential Step Cards */}
          <div className="space-y-3 pt-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-500" />
              <span>Tahapan Alur Pengoperasian:</span>
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeFlowData.steps.map((st, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span>{st.step}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {st.desc}
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                    <span>{st.highlight}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3 CORE ARCHITECTURAL PILLARS ================= */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            3 Pilar Fondasi Arsitektur OmniHub Super App
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              1
            </div>
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
              Sistem Modular Decoupled
            </h4>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
              Setiap menu (Keuangan, PDF Tools, Catatan, QR Code, Focus Timer) dibangun secara independen. Modul-modul ini dapat diperbarui, ditambah, atau disesuaikan tanpa khawatir merusak fungsionalitas menu lainnya.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              2
            </div>
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
              Single Source of Truth Reaktif
            </h4>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
              Seluruh data mengalir dari satu pusat koordinasi terpadu. Perubahan saldo akibat transfer antar akun atau penarikan tunai seketika merefleksikan perubahan di kartu dashboard, mutasi akun, dan buku besar akuntansi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              3
            </div>
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
              Privasi Mutlak 100% Client-Side
            </h4>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
              Seluruh data transaksi, mutasi rekening, catatan pribadi, dan berkas PDF disimpan dan diolah langsung di peramban Anda. Tidak ada data yang dikirim atau disimpan di server eksternal, menjamin kerahasiaan penuh.
            </p>
          </div>
        </div>
      </div>

      {/* ================= 3-STEP FUTURE EXPANSION GUIDE ================= */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Panduan Menambahkan Fitur / Modul Baru di Masa Depan
          </h3>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Kapan pun Anda ingin menambahkan alat produktivitas baru (seperti Kalkulator Pajak, Portofolio Saham/Reksadana, atau Tracker Target Tabungan), struktur aplikasi dirancang untuk mendukung ekspansi secara mulus:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block">Tahap 1: Konsep & Kebutuhan Fitur</span>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
              Tentukan tujuan alat baru, data apa saja yang perlu diinput oleh pengguna, dan bagaimana hasil outputnya disajikan.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block">Tahap 2: Desain Tampilan UX yang Harmonis</span>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
              Gunakan bahasa desain visual yang seragam: gaya Glassmorphism yang bersih, tombol dengan sudut membulat, dan dukungan mode gelap/terang otomatis.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block">Tahap 3: Integrasi Data & Alur Navigasi</span>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
              Daftarkan modul ke menu navigasi bilah sisi (sidebar) dan hubungkan ke pusat penyimpanan data lokal agar dapat disinkronkan ke dashboard utama.
            </p>
          </div>
        </div>
      </div>

      {/* ================= CHANGELOG RIWAYAT VERSI ================= */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-purple-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Riwayat Pembaruan Aplikasi (App Changelog)
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span className="text-indigo-600 dark:text-indigo-400 text-sm">
                v2.6.0 — Transfer Antar Akun, Tarik Tunai & Bagan Akun Standar PSAK
              </span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Rilis Terbaru
              </span>
            </div>
            <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-300 space-y-1 text-[11px] leading-relaxed">
              <li><strong>Fitur Transfer Antar Akun & Tarik Tunai</strong>: Fitur khusus untuk memindahkan saldo antar rekening, top up e-wallet, dan mencatat penarikan uang fisik di ATM dengan penghitungan saldo instan dan opsi biaya admin fleksibel.</li>
              <li><strong>Buku Mutasi Rekening Individual</strong>: Klik setiap kartu akun untuk melihat rincian mutasi transaksi khusus akun tersebut lengkap dengan saldo berjalan kumulatif (running balance).</li>
              <li><strong>Chart of Accounts (COA) Standar Akuntansi PSAK</strong>: Seluruh transaksi dan saldo awal otomatis bermuara pada 5 kelas akun akuntansi dengan Jurnal Umum berpasangan seimbang (Debit = Kredit) dan Neraca Saldo (Trial Balance).</li>
              <li><strong>Penyederhanaan Dokumentasi Arsitektur</strong>: Dokumentasi sistem kini difokuskan pada alur kerja fungsional dan panduan pengembangan tanpa struktur coding mentah yang membingungkan.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-neutral-800 dark:text-neutral-200">v2.5.0 — Multi-Account Saldo Awal, Hutang Saya & Cek Harian</span>
              <span className="font-mono text-[11px] text-neutral-400">November 2026</span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Manajemen saldo awal bank, e-wallet, dan dompet fisik via CSV, pencatatan hutang dari transaksi kredit/PayLater, serta audit harian opname saldo nyata vs sistem.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-neutral-800 dark:text-neutral-200">v2.4.0 — PDF Optimizer, Digital Signature & Architecture Flow</span>
              <span className="font-mono text-[11px] text-neutral-400">Oktober 2026</span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Fitur kompresi PDF tiga tingkat, pembubuhan tanda tangan digital (pad goresan, kaligrafi, dan gambar stempel), serta visualisasi alur setiap menu aplikasi.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-neutral-800 dark:text-neutral-200">v2.2.0 — Dual-Wallet & Piutang WhatsApp Engine</span>
              <span className="font-mono text-[11px] text-neutral-400">Oktober 2026</span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Pemisahan dompet Cash vs Non-Cash, penagihan piutang via tautan WhatsApp dan berkas nota penagihan otomatis.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-neutral-800 dark:text-neutral-200">v2.0.0 — Super App Core Bootstrap</span>
              <span className="font-mono text-[11px] text-neutral-400">Oktober 2026</span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Arsitektur All-in-One Dashboard, Master Calendar & Todos, Knowledge Base, Barcode/QR generator, dan Focus Pomodoro Timer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
