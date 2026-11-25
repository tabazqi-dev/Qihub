import { 
  ChartOfAccount, 
  CoaClass, 
  FinancialAccount, 
  FinanceTransaction, 
  JournalEntry, 
  JournalLine,
  MyDebtLiability,
  DebtReceivable 
} from '../types';

export const isContraVoidTransaction = (tx: Pick<FinanceTransaction, 'id' | 'title'>): boolean => {
  return tx.id.startsWith('tx-void-') || tx.title.startsWith('[VOID] ');
};

export const isLegacyVoidWithoutContra = (tx: Pick<FinanceTransaction, 'isVoided' | 'voidReason'>): boolean => {
  return Boolean(tx.isVoided && !tx.voidReason?.includes('[CONTRA:'));
};

export const isTransactionIncludedInLedger = (tx: Pick<FinanceTransaction, 'isVoided' | 'voidReason'>): boolean => {
  return !isLegacyVoidWithoutContra(tx);
};

export const formatVoidReason = (reason?: string): string => {
  if (!reason) return '';
  return reason.replace(/\[CONTRA:[^\]]+\]\s*/g, '').trim();
};

// =========================================================================
// STANDARD CHART OF ACCOUNTS (COA) / BAGAN AKUN STANDAR KEUANGAN PRIBADI
// =========================================================================

export const BASE_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // 1000 - ASET (Normal: Debit)
  {
    code: '1101',
    name: 'Kas Tunai (Cash on Hand)',
    category: 'asset',
    subCategory: 'Aset Lancar',
    normalBalance: 'debit',
    description: 'Uang fisik di dompet atau brankas rumah'
  },
  {
    code: '1102',
    name: 'Bank - Rekening Operasional',
    category: 'asset',
    subCategory: 'Aset Lancar',
    normalBalance: 'debit',
    description: 'Rekening utama untuk transaksi harian & terima gaji'
  },
  {
    code: '1103',
    name: 'Bank - Rekening Tabungan',
    category: 'asset',
    subCategory: 'Aset Lancar',
    normalBalance: 'debit',
    description: 'Rekening terpisah khusus simpanan & dana darurat'
  },
  {
    code: '1104',
    name: 'Dompet Digital (E-Wallet)',
    category: 'asset',
    subCategory: 'Aset Lancar',
    normalBalance: 'debit',
    description: 'Saldo GoPay, OVO, Dana, ShopeePay, LinkAja'
  },
  {
    code: '1201',
    name: 'Piutang Pribadi / Talangan',
    category: 'asset',
    subCategory: 'Piutang',
    normalBalance: 'debit',
    description: 'Uang yang dipinjamkan ke teman/keluarga atau talangan'
  },
  {
    code: '1301',
    name: 'Deposito Berjangka',
    category: 'asset',
    subCategory: 'Aset Investasi',
    normalBalance: 'debit',
    description: 'Simpanan deposito di bank'
  },
  {
    code: '1302',
    name: 'Reksa Dana & Obligasi',
    category: 'asset',
    subCategory: 'Aset Investasi',
    normalBalance: 'debit',
    description: 'SBN (ORI, SBR, Sukuk), reksa dana pasar uang/saham'
  },
  {
    code: '1303',
    name: 'Saham & Aset Kripto',
    category: 'asset',
    subCategory: 'Aset Investasi',
    normalBalance: 'debit',
    description: 'Portofolio saham BEI/global atau aset digital'
  },
  {
    code: '1304',
    name: 'Logam Mulia / Emas',
    category: 'asset',
    subCategory: 'Aset Investasi',
    normalBalance: 'debit',
    description: 'Emas batangan atau tabungan emas'
  },
  {
    code: '1401',
    name: 'Properti (Tanah & Bangunan)',
    category: 'asset',
    subCategory: 'Aset Tetap',
    normalBalance: 'debit',
    description: 'Rumah tinggal, apartemen, atau tanah'
  },
  {
    code: '1402',
    name: 'Kendaraan',
    category: 'asset',
    subCategory: 'Aset Tetap',
    normalBalance: 'debit',
    description: 'Mobil atau sepeda motor pribadi'
  },
  {
    code: '1403',
    name: 'Elektronik & Peralatan Bernilai',
    category: 'asset',
    subCategory: 'Aset Tetap',
    normalBalance: 'debit',
    description: 'Laptop kerja, kamera, perangkat rumah tangga besar'
  },

  // 2000 - LIABILITAS (Normal: Kredit)
  {
    code: '2101',
    name: 'Utang Kartu Kredit',
    category: 'liability',
    subCategory: 'Liabilitas Jangka Pendek',
    normalBalance: 'credit',
    description: 'Tagihan kartu kredit yang belum dibayar'
  },
  {
    code: '2102',
    name: 'Utang PayLater',
    category: 'liability',
    subCategory: 'Liabilitas Jangka Pendek',
    normalBalance: 'credit',
    description: 'Tagihan Shopee PayLater, GoPay Later, Kredivo'
  },
  {
    code: '2103',
    name: 'Utang Pribadi Jangka Pendek',
    category: 'liability',
    subCategory: 'Liabilitas Jangka Pendek',
    normalBalance: 'credit',
    description: 'Pinjaman sementara dari keluarga, teman, kasbon'
  },
  {
    code: '2201',
    name: 'Utang KPR (Rumah)',
    category: 'liability',
    subCategory: 'Liabilitas Jangka Panjang',
    normalBalance: 'credit',
    description: 'Sisa pokok pinjaman rumah/properti'
  },
  {
    code: '2202',
    name: 'Utang Kredit Kendaraan',
    category: 'liability',
    subCategory: 'Liabilitas Jangka Panjang',
    normalBalance: 'credit',
    description: 'Sisa pokok cicilan mobil atau motor'
  },
  {
    code: '2203',
    name: 'KTA / Pinjaman Lainnya',
    category: 'liability',
    subCategory: 'Liabilitas Jangka Panjang',
    normalBalance: 'credit',
    description: 'Sisa pokok pinjaman multiguna'
  },

  // 3000 - EKUITAS (Normal: Kredit)
  {
    code: '3101',
    name: 'Saldo Awal Kekayaan Bersih',
    category: 'equity',
    subCategory: 'Modal & Saldo Awal',
    normalBalance: 'credit',
    description: 'Nilai awal aset dikurangi utang saat mulai pembukuan'
  },
  {
    code: '3201',
    name: 'Surplus / Defisit Ditahan',
    category: 'equity',
    subCategory: 'Akumulasi Surplus/Defisit',
    normalBalance: 'credit',
    description: 'Akumulasi tabungan bersih dari periode sebelumnya'
  },

  // 4000 - PENDAPATAN (Normal: Kredit)
  {
    code: '4101',
    name: 'Gaji & Tunjangan Tetap',
    category: 'revenue',
    subCategory: 'Pendapatan Aktif',
    normalBalance: 'credit',
    description: 'Gaji pokok, tunjangan transport, tunjangan makan'
  },
  {
    code: '4102',
    name: 'Bonus, THR & Insentif',
    category: 'revenue',
    subCategory: 'Pendapatan Aktif',
    normalBalance: 'credit',
    description: 'Tunjangan Hari Raya, bonus tahunan, komisi'
  },
  {
    code: '4103',
    name: 'Pendapatan Freelance / Sampingan',
    category: 'revenue',
    subCategory: 'Pendapatan Aktif',
    normalBalance: 'credit',
    description: 'Jasa konsultasi, proyek lepas, keuntungan dagang'
  },
  {
    code: '4201',
    name: 'Bunga Tabungan & Deposito',
    category: 'revenue',
    subCategory: 'Pendapatan Pasif',
    normalBalance: 'credit',
    description: 'Bagi hasil bank atau kupon SBN/obligasi'
  },
  {
    code: '4202',
    name: 'Dividen & Capital Gain',
    category: 'revenue',
    subCategory: 'Pendapatan Pasif',
    normalBalance: 'credit',
    description: 'Dividen saham atau keuntungan jual aset'
  },
  {
    code: '4203',
    name: 'Pendapatan Sewa',
    category: 'revenue',
    subCategory: 'Pendapatan Pasif',
    normalBalance: 'credit',
    description: 'Hasil menyewakan properti atau kendaraan'
  },
  {
    code: '4301',
    name: 'Hadiah, Hibah & Cashback',
    category: 'revenue',
    subCategory: 'Pendapatan Lain-lain',
    normalBalance: 'credit',
    description: 'Angpao, hadiah uang tunai, cashback transaksi'
  },

  // 5000 - BEBAN (Normal: Debit)
  {
    code: '5101',
    name: 'Makan & Minum Harian',
    category: 'expense',
    subCategory: 'Beban Kebutuhan Pokok',
    normalBalance: 'debit',
    description: 'Belanja bahan makanan, makan siang kerja, air galon'
  },
  {
    code: '5102',
    name: 'Tempat Tinggal & Utilitas',
    category: 'expense',
    subCategory: 'Beban Kebutuhan Pokok',
    normalBalance: 'debit',
    description: 'Sewa kos/kontrakan, listrik, air, internet, IPL'
  },
  {
    code: '5103',
    name: 'Transportasi & BBM',
    category: 'expense',
    subCategory: 'Beban Kebutuhan Pokok',
    normalBalance: 'debit',
    description: 'Bensin, parkir, tol, ojek online, tiket KRL/bus'
  },
  {
    code: '5104',
    name: 'Komunikasi & Langganan Dasar',
    category: 'expense',
    subCategory: 'Beban Kebutuhan Pokok',
    normalBalance: 'debit',
    description: 'Pulsa, paket data seluler, penyimpanan cloud'
  },
  {
    code: '5105',
    name: 'Kesehatan & Obat-obatan',
    category: 'expense',
    subCategory: 'Beban Kebutuhan Pokok',
    normalBalance: 'debit',
    description: 'Periksa dokter, obat, vitamin, perawatan gigi'
  },
  {
    code: '5201',
    name: 'Jajan, Kopi & Makan di Luar',
    category: 'expense',
    subCategory: 'Beban Gaya Hidup',
    normalBalance: 'debit',
    description: 'Nongkrong di kafe, restoran, pesan antar makanan'
  },
  {
    code: '5202',
    name: 'Belanja Pribadi & Penampilan',
    category: 'expense',
    subCategory: 'Beban Gaya Hidup',
    normalBalance: 'debit',
    description: 'Pakaian, sepatu, skincare, potong rambut'
  },
  {
    code: '5203',
    name: 'Hiburan, Hobi & Liburan',
    category: 'expense',
    subCategory: 'Beban Gaya Hidup',
    normalBalance: 'debit',
    description: 'Tiket bioskop, streaming, olahraga, traveling'
  },
  {
    code: '5301',
    name: 'Beban Bunga Pinjaman',
    category: 'expense',
    subCategory: 'Beban Keuangan & Pajak',
    normalBalance: 'debit',
    description: 'Porsi bunga pada cicilan KPR, kendaraan, kartu kredit'
  },
  {
    code: '5302',
    name: 'Biaya Admin Bank & Transfer',
    category: 'expense',
    subCategory: 'Beban Keuangan & Pajak',
    normalBalance: 'debit',
    description: 'Biaya admin bulanan rekening, biaya transfer, meterai'
  },
  {
    code: '5303',
    name: 'Pajak Pribadi',
    category: 'expense',
    subCategory: 'Beban Keuangan & Pajak',
    normalBalance: 'debit',
    description: 'PPh 21, PBB rumah, pajak kendaraan (PKB)'
  },
  {
    code: '5304',
    name: 'Premi Asuransi',
    category: 'expense',
    subCategory: 'Beban Keuangan & Pajak',
    normalBalance: 'debit',
    description: 'BPJS Kesehatan, asuransi jiwa, kesehatan swasta'
  },
  {
    code: '5401',
    name: 'Zakat, Infak, Sedekah & Donasi',
    category: 'expense',
    subCategory: 'Beban Sosial & Pendidikan',
    normalBalance: 'debit',
    description: 'Kewajiban amal, persepuluhan, sumbangan sosial'
  },
  {
    code: '5402',
    name: 'Hadiah & Acara Keluarga',
    category: 'expense',
    subCategory: 'Beban Sosial & Pendidikan',
    normalBalance: 'debit',
    description: 'Kado pernikahan, sumbangan hajatan, traktir keluarga'
  },
  {
    code: '5403',
    name: 'Pendidikan & Pengembangan Diri',
    category: 'expense',
    subCategory: 'Beban Sosial & Pendidikan',
    normalBalance: 'debit',
    description: 'Buku, kursus online, seminar, pelatihan'
  }
];

const LEGACY_COA_CODE_MAP: Record<string, string> = {
  '1-1100': '1101',
  '1-1201': '1102',
  '1-1202': '1103',
  '1-1299': '1102',
  '1-1301': '1104',
  '1-1302': '1104',
  '1-1303': '1104',
  '1-1399': '1104',
  '1-1400': '1201',
  '1-1500': '1201',
  '2-1100': '2103',
  '2-1200': '2102',
  '2-1300': '2101',
  '2-1400': '2203',
  '3-1100': '3101',
  '3-1200': '3201',
  '3-1300': '3201',
  '4-1100': '4101',
  '4-1200': '4103',
  '4-1300': '4201',
  '4-1400': '4103',
  '4-1900': '4301',
  '5-1100': '5101',
  '5-1200': '5104',
  '5-1300': '5101',
  '5-1400': '5103',
  '5-1500': '5102',
  '5-1600': '5202',
  '5-1700': '5302',
  '5-1999': '5202',
};

export const normalizeCoaCode = (code?: string): string | undefined => {
  if (!code) return undefined;
  const trimmed = code.trim();
  if (!trimmed) return undefined;
  if (LEGACY_COA_CODE_MAP[trimmed]) return LEGACY_COA_CODE_MAP[trimmed];
  if (trimmed.startsWith('1-11')) return '1101';
  if (trimmed.startsWith('1-12')) return '1102';
  if (trimmed.startsWith('1-13')) return '1104';
  return trimmed;
};

export const inferLiabilityCoaCode = (creditorOrDesc: string): string => {
  const s = creditorOrDesc.toLowerCase();
  if (s.includes('kartu kredit') || s.includes('credit card') || /\bcc\b/.test(s)) return '2101';
  if (s.includes('paylater') || s.includes('spaylater') || s.includes('gopay later') || s.includes('kredivo') || s.includes('indodana') || s.includes('akulaku')) return '2102';
  if (s.includes('kpr') || s.includes('rumah') || s.includes('properti')) return '2201';
  if (s.includes('kendaraan') || s.includes('mobil') || s.includes('motor') || s.includes('leasing')) return '2202';
  if (s.includes('kta') || s.includes('multiguna') || s.includes('bank')) return '2203';
  return '2103';
};

// Helper: Get all COA accounts including linked FinancialAccounts & user Custom/Edited COAs
export const getAllChartOfAccounts = (
  accounts: FinancialAccount[],
  customCoaAccounts: ChartOfAccount[] = []
): ChartOfAccount[] => {
  const result: ChartOfAccount[] = BASE_CHART_OF_ACCOUNTS.map(c => ({ ...c }));

  // Link real FinancialAccounts to standard asset COA codes (1101..1104 or acc.coaCode)
  accounts.forEach((acc) => {
    const normalizedAccCoa = normalizeCoaCode(acc.coaCode);
    const preferredCode = normalizedAccCoa
      || (acc.type === 'cash'
        ? '1101'
        : acc.type === 'ewallet'
        ? '1104'
        : (acc.name.toLowerCase().includes('tabung') || acc.name.toLowerCase().includes('saving') || acc.name.toLowerCase().includes('darurat'))
        ? '1103'
        : '1102');

    const target = result.find(c => c.code === preferredCode);
    if (target && !target.linkedAccountId) {
      target.linkedAccountId = acc.id;
    }
  });

  // Merge user-added or user-edited COA definitions
  customCoaAccounts.forEach(custom => {
    const cleanCode = custom.code.trim();
    if (!cleanCode || !custom.name.trim()) return;
    const idx = result.findIndex(c => c.code === cleanCode);
    if (idx >= 0) {
      result[idx] = {
        ...result[idx],
        name: custom.name.trim(),
        category: custom.category || result[idx].category,
        subCategory: custom.subCategory.trim() || result[idx].subCategory,
        normalBalance: custom.normalBalance || result[idx].normalBalance,
        description: custom.description !== undefined ? custom.description : result[idx].description,
        isCustom: true,
      };
    } else {
      result.push({
        code: cleanCode,
        name: custom.name.trim(),
        category: custom.category,
        subCategory: custom.subCategory.trim() || 'Kustom',
        normalBalance: custom.normalBalance,
        description: custom.description,
        isCustom: true,
      });
    }
  });

  return result.sort((a, b) => a.code.localeCompare(b.code));
};

// Helper: Resolve ChartOfAccount by code with legacy fallback
const findCoaByCodeOrFallback = (
  allCoa: ChartOfAccount[],
  code?: string,
  fallbackCode?: string
): ChartOfAccount => {
  if (code) {
    const exact = allCoa.find(c => c.code === code);
    if (exact) return exact;
    const mapped = normalizeCoaCode(code);
    if (mapped) {
      const normalizedMatch = allCoa.find(c => c.code === mapped);
      if (normalizedMatch) return normalizedMatch;
    }
  }
  if (fallbackCode) {
    const fb = allCoa.find(c => c.code === fallbackCode);
    if (fb) return fb;
  }
  return allCoa[0];
};

// Helper: Get COA Account for a specific FinancialAccount
export const getCoaForFinancialAccount = (acc: FinancialAccount, allCoa: ChartOfAccount[]): ChartOfAccount => {
  if (acc.coaCode) {
    const byExplicit = findCoaByCodeOrFallback(allCoa, acc.coaCode);
    if (byExplicit && (byExplicit.code === acc.coaCode || byExplicit.code === normalizeCoaCode(acc.coaCode))) {
      return byExplicit;
    }
  }

  const byLinked = allCoa.find(c => c.linkedAccountId === acc.id);
  if (byLinked && !acc.coaCode) {
    const expectedPrefix = acc.type === 'cash' ? '1101' : acc.type === 'ewallet' ? '1104' : '110';
    if (byLinked.code.startsWith(expectedPrefix)) return byLinked;
  }

  if (acc.type === 'cash') {
    return findCoaByCodeOrFallback(allCoa, '1101');
  }
  if (acc.type === 'ewallet') {
    return findCoaByCodeOrFallback(allCoa, '1104');
  }
  const lower = acc.name.toLowerCase();
  if (lower.includes('tabung') || lower.includes('saving') || lower.includes('darurat')) {
    return findCoaByCodeOrFallback(allCoa, '1103');
  }
  return findCoaByCodeOrFallback(allCoa, '1102');
};

// Helper: Map Transaction Category to Standard COA (Supports both new Indonesian & legacy categories)
export const getCoaForCategory = (category: string, type: 'income' | 'expense', allCoa: ChartOfAccount[]): ChartOfAccount => {
  const cat = category.toLowerCase();

  if (type === 'income') {
    if (cat.includes('gaji') || cat.includes('salary') || cat.includes('tunjangan')) {
      return findCoaByCodeOrFallback(allCoa, '4101');
    }
    if (cat.includes('bonus') || cat.includes('thr') || cat.includes('insentif') || cat.includes('komisi')) {
      return findCoaByCodeOrFallback(allCoa, '4102');
    }
    if (cat.includes('freelance') || cat.includes('sampingan') || cat.includes('jasa') || cat.includes('proyek') || cat.includes('reimburse') || cat.includes('penjualan') || cat.includes('usaha')) {
      return findCoaByCodeOrFallback(allCoa, '4103');
    }
    if (cat.includes('bunga') || cat.includes('deposito') || cat.includes('tabungan') || cat.includes('obligasi') || cat.includes('kupon')) {
      return findCoaByCodeOrFallback(allCoa, '4201');
    }
    if (cat.includes('dividen') || cat.includes('capital gain') || cat.includes('saham') || cat.includes('invest')) {
      return findCoaByCodeOrFallback(allCoa, '4202');
    }
    if (cat.includes('sewa')) {
      return findCoaByCodeOrFallback(allCoa, '4203');
    }
    if (cat.includes('piutang') || cat.includes('pelunasan')) {
      return findCoaByCodeOrFallback(allCoa, '1201');
    }
    if (cat.includes('saldo awal')) {
      return findCoaByCodeOrFallback(allCoa, '3101');
    }
    if (cat.includes('penyesuaian') || cat.includes('opname')) {
      return findCoaByCodeOrFallback(allCoa, '3201');
    }
    return findCoaByCodeOrFallback(allCoa, '4301');
  } else {
    // Expense
    if (cat.includes('jajan') || cat.includes('kopi') || cat.includes('kafe') || cat.includes('makan di luar') || cat.includes('nongkrong')) {
      return findCoaByCodeOrFallback(allCoa, '5201');
    }
    if (cat.includes('makan') || cat.includes('food') || cat.includes('dining') || cat.includes('groceries') || cat.includes('sembako') || cat.includes('minum')) {
      return findCoaByCodeOrFallback(allCoa, '5101');
    }
    if (cat.includes('tempat tinggal') || cat.includes('kos') || cat.includes('kontrakan') || cat.includes('utilities') || cat.includes('listrik') || cat.includes('internet') || cat.includes('air') || cat.includes('ipl')) {
      return findCoaByCodeOrFallback(allCoa, '5102');
    }
    if (cat.includes('transport') || cat.includes('bensin') || cat.includes('bbm') || cat.includes('ojek') || cat.includes('parkir') || cat.includes('tol')) {
      return findCoaByCodeOrFallback(allCoa, '5103');
    }
    if (cat.includes('komunikasi') || cat.includes('pulsa') || cat.includes('paket data') || cat.includes('langganan') || cat.includes('software') || cat.includes('work') || cat.includes('kerja')) {
      return findCoaByCodeOrFallback(allCoa, '5104');
    }
    if (cat.includes('kesehatan') || cat.includes('obat') || cat.includes('dokter') || cat.includes('vitamin')) {
      return findCoaByCodeOrFallback(allCoa, '5105');
    }
    if (cat.includes('shopping') || cat.includes('belanja') || cat.includes('pakaian') || cat.includes('penampilan') || cat.includes('skincare')) {
      return findCoaByCodeOrFallback(allCoa, '5202');
    }
    if (cat.includes('hiburan') || cat.includes('hobi') || cat.includes('liburan') || cat.includes('entertainment') || cat.includes('lifestyle') || cat.includes('gaya')) {
      return findCoaByCodeOrFallback(allCoa, '5203');
    }
    if (cat.includes('bunga pinjaman')) {
      return findCoaByCodeOrFallback(allCoa, '5301');
    }
    if (cat.includes('admin') || cat.includes('biaya') || cat.includes('bunga')) {
      return findCoaByCodeOrFallback(allCoa, '5302');
    }
    if (cat.includes('pajak') || cat.includes('pph') || cat.includes('pbb') || cat.includes('pkb')) {
      return findCoaByCodeOrFallback(allCoa, '5303');
    }
    if (cat.includes('asuransi') || cat.includes('bpjs') || cat.includes('premi')) {
      return findCoaByCodeOrFallback(allCoa, '5304');
    }
    if (cat.includes('zakat') || cat.includes('infak') || cat.includes('sedekah') || cat.includes('donasi')) {
      return findCoaByCodeOrFallback(allCoa, '5401');
    }
    if (cat.includes('hadiah') || cat.includes('acara keluarga') || cat.includes('kado')) {
      return findCoaByCodeOrFallback(allCoa, '5402');
    }
    if (cat.includes('pendidikan') || cat.includes('buku') || cat.includes('kursus') || cat.includes('seminar') || cat.includes('pelatihan')) {
      return findCoaByCodeOrFallback(allCoa, '5403');
    }
    if (cat.includes('kartu kredit')) {
      return findCoaByCodeOrFallback(allCoa, '2101');
    }
    if (cat.includes('paylater')) {
      return findCoaByCodeOrFallback(allCoa, '2102');
    }
    if (cat.includes('cicilan') || cat.includes('hutang') || cat.includes('utang') || cat.includes('debt')) {
      return findCoaByCodeOrFallback(allCoa, '2103');
    }
    if (cat.includes('pinjaman') || cat.includes('piutang') || cat.includes('talangan')) {
      return findCoaByCodeOrFallback(allCoa, '1201');
    }
    if (cat.includes('penyesuaian') || cat.includes('opname')) {
      return findCoaByCodeOrFallback(allCoa, '3201');
    }
    return findCoaByCodeOrFallback(allCoa, '5202');
  }
};

// Helper: Resolve effective contra COA for any transaction consistently across Journal, Ledger, and UI
export const getEffectiveContraCoaForTransaction = (
  tx: FinanceTransaction,
  allCoa: ChartOfAccount[],
  myDebts: MyDebtLiability[] = []
): ChartOfAccount => {
  if (tx.coaCode) {
    const exactOrMapped = findCoaByCodeOrFallback(allCoa, tx.coaCode);
    const normalized = normalizeCoaCode(tx.coaCode);
    if (exactOrMapped && (exactOrMapped.code === tx.coaCode || exactOrMapped.code === normalized)) {
      return exactOrMapped;
    }
    const inferredCategory: CoaClass = tx.coaCode.startsWith('1')
      ? 'asset'
      : tx.coaCode.startsWith('2')
      ? 'liability'
      : tx.coaCode.startsWith('3')
      ? 'equity'
      : tx.coaCode.startsWith('4')
      ? 'revenue'
      : 'expense';
    return {
      code: tx.coaCode,
      name: tx.coaName || 'Akun COA Kustom',
      category: inferredCategory,
      subCategory: 'Kustom',
      normalBalance: (inferredCategory === 'asset' || inferredCategory === 'expense') ? 'debit' : 'credit'
    };
  }

  if (tx.type === 'income') {
    return getCoaForCategory(tx.category, 'income', allCoa);
  }

  if (tx.relatedDebtId) {
    const linkedDebt = myDebts.find(d => d.id === tx.relatedDebtId);
    if (linkedDebt) {
      const code = inferLiabilityCoaCode(`${linkedDebt.creditorName} ${linkedDebt.description}`);
      return findCoaByCodeOrFallback(allCoa, code, '2103');
    }
  }

  return getCoaForCategory(tx.category, 'expense', allCoa);
};

// =========================================================================
// DOUBLE-ENTRY GENERAL JOURNAL GENERATION (JURNAL UMUM BERPASANGAN)
// =========================================================================

export const generateStandardJournalEntries = (
  transactions: FinanceTransaction[],
  accounts: FinancialAccount[],
  myDebts: MyDebtLiability[],
  debts: DebtReceivable[],
  customCoaAccounts: ChartOfAccount[] = []
): JournalEntry[] => {
  const allCoa = getAllChartOfAccounts(accounts, customCoaAccounts);
  const entries: JournalEntry[] = [];

  // 1. Initial Balances Journal Entries (Debit: Asset Kas/Bank/E-Wallet, Credit: 3101 Saldo Awal Kekayaan Bersih)
  accounts.forEach((acc, index) => {
    if (acc.initialBalance > 0) {
      const assetCoa = getCoaForFinancialAccount(acc, allCoa);
      const equityCoa = findCoaByCodeOrFallback(allCoa, '3101');

      entries.push({
        id: `jnl-init-${acc.id}`,
        date: acc.createdAt ? acc.createdAt.split('T')[0] : '2026-10-01',
        referenceNo: `INIT-${String(index + 1).padStart(3, '0')}`,
        description: `Setoran Saldo Awal Akun: ${acc.name}`,
        sourceType: 'initial_balance',
        lines: [
          {
            accountCode: assetCoa.code,
            accountName: assetCoa.name,
            category: 'asset',
            debit: acc.initialBalance,
            credit: 0
          },
          {
            accountCode: equityCoa.code,
            accountName: equityCoa.name,
            category: 'equity',
            debit: 0,
            credit: acc.initialBalance
          }
        ],
        totalDebit: acc.initialBalance,
        totalCredit: acc.initialBalance,
        isBalanced: true
      });
    }
  });

  // 2. Regular Transactions, Adjustments, Transfers & Void Contra Journal Entries
  transactions.forEach((tx, index) => {
    // Legacy voids (prior to contra-entry model) have no reversal entry so they are skipped
    if (isLegacyVoidWithoutContra(tx)) {
      return;
    }

    const isVoidContra = isContraVoidTransaction(tx);

    // If it's a transfer inflow, skip it because the paired transfer outflow creates the full double-entry
    if (tx.transferId && !tx.transferId.startsWith('void-') && tx.type === 'income') {
      return;
    }
    // For void contra of a transfer, skip the income leg and generate the full reversal from the expense leg
    if (tx.transferId?.startsWith('void-') && tx.type === 'income') {
      return;
    }

    const matchedAcc = accounts.find(a => a.id === tx.accountId) ||
                       accounts.find(a => a.name === tx.accountName) ||
                       accounts[0];
    const assetCoa = matchedAcc ? getCoaForFinancialAccount(matchedAcc, allCoa) : allCoa[0];
    const nominal = tx.amount;

    let debitCoa: ChartOfAccount;
    let creditCoa: ChartOfAccount;
    let entrySourceType: 'transaction' | 'transfer' | 'audit_adjustment' = 'transaction';
    let refPrefix = isVoidContra ? 'VOID' : 'TXN';

    if (isVoidContra && tx.debitAccountCode && tx.creditAccountCode) {
      entrySourceType = tx.isAdjustment ? 'audit_adjustment' : 'transaction';
      debitCoa = findCoaByCodeOrFallback(allCoa, tx.debitAccountCode);
      if (debitCoa.code !== tx.debitAccountCode && debitCoa.code !== normalizeCoaCode(tx.debitAccountCode)) {
        const inferredCat: CoaClass = tx.debitAccountCode.startsWith('1') ? 'asset' : tx.debitAccountCode.startsWith('2') ? 'liability' : tx.debitAccountCode.startsWith('3') ? 'equity' : tx.debitAccountCode.startsWith('4') ? 'revenue' : 'expense';
        debitCoa = {
          code: tx.debitAccountCode,
          name: tx.debitAccountName || tx.debitAccountCode,
          category: inferredCat,
          subCategory: 'Jurnal Lawan Void',
          normalBalance: 'debit'
        };
      }
      creditCoa = findCoaByCodeOrFallback(allCoa, tx.creditAccountCode);
      if (creditCoa.code !== tx.creditAccountCode && creditCoa.code !== normalizeCoaCode(tx.creditAccountCode)) {
        const inferredCat: CoaClass = tx.creditAccountCode.startsWith('1') ? 'asset' : tx.creditAccountCode.startsWith('2') ? 'liability' : tx.creditAccountCode.startsWith('3') ? 'equity' : tx.creditAccountCode.startsWith('4') ? 'revenue' : 'expense';
        creditCoa = {
          code: tx.creditAccountCode,
          name: tx.creditAccountName || tx.creditAccountCode,
          category: inferredCat,
          subCategory: 'Jurnal Lawan Void',
          normalBalance: 'credit'
        };
      }
    } else if (tx.coaCode) {
      // Explicit COA Adjustment or user-assigned COA on transaction
      const isAdj = Boolean(tx.isAdjustment || tx.category === 'Penyesuaian COA');
      entrySourceType = isAdj ? 'audit_adjustment' : 'transaction';
      refPrefix = isVoidContra ? 'VOID' : isAdj ? 'ADJ' : 'TXN';
      const contraCoa = getEffectiveContraCoaForTransaction(tx, allCoa, myDebts);

      if (tx.type === 'income') {
        debitCoa = assetCoa;
        creditCoa = contraCoa;
      } else {
        debitCoa = contraCoa;
        creditCoa = assetCoa;
      }
    } else if (tx.transferId && tx.category === 'Transfer & Tarik Tunai') {
      // Transfer / Tarik Tunai Antar Akun (or its Void Contra reversal)
      entrySourceType = 'transfer';
      refPrefix = isVoidContra ? 'VOID' : 'TRF';
      const targetAcc = accounts.find(a => a.id === tx.targetAccountId) ||
                         accounts.find(a => a.name === tx.targetAccountName) ||
                         accounts[0];
      debitCoa = targetAcc ? getCoaForFinancialAccount(targetAcc, allCoa) : allCoa[0];
      creditCoa = assetCoa;
    } else if (isVoidContra) {
      // Reversal of a regular income/expense/debt transaction: mirror exact original COA
      const origType: 'income' | 'expense' = tx.type === 'income' ? 'expense' : 'income';
      const origContraCoa = getEffectiveContraCoaForTransaction({ ...tx, type: origType }, allCoa, myDebts);
      if (origType === 'income') {
        debitCoa = origContraCoa;
        creditCoa = assetCoa;
      } else {
        debitCoa = assetCoa;
        creditCoa = origContraCoa;
      }
    } else if (tx.type === 'income') {
      // Income: Debit Kas/Bank (Asset), Credit Pendapatan/Revenue
      debitCoa = assetCoa;
      creditCoa = getEffectiveContraCoaForTransaction(tx, allCoa, myDebts);
    } else {
      // Expense / Liability Payment / Receivable Loan
      debitCoa = getEffectiveContraCoaForTransaction(tx, allCoa, myDebts);
      creditCoa = assetCoa;
    }

    entries.push({
      id: `jnl-${tx.id}`,
      transactionId: tx.id,
      date: tx.date,
      referenceNo: `${refPrefix}-${String(index + 1).padStart(4, '0')}`,
      description: tx.title,
      sourceType: entrySourceType,
      lines: [
        {
          accountCode: debitCoa.code,
          accountName: debitCoa.name,
          category: debitCoa.category,
          debit: nominal,
          credit: 0
        },
        {
          accountCode: creditCoa.code,
          accountName: creditCoa.name,
          category: creditCoa.category,
          debit: 0,
          credit: nominal
        }
      ],
      totalDebit: nominal,
      totalCredit: nominal,
      isBalanced: true
    });
  });

  return entries.sort((a, b) => b.date.localeCompare(a.date));
};

// =========================================================================
// COA GENERAL LEDGER & BALANCES CALCULATION (BUKU BESAR & NERACA SALDO)
// =========================================================================

export interface CoaLedgerSummary {
  account: ChartOfAccount;
  totalDebit: number;
  totalCredit: number;
  endingBalance: number;
  mutationCount: number;
  lines: {
    date: string;
    referenceNo: string;
    description: string;
    contraAccountName: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }[];
}

export const calculateCoaLedgers = (
  coaList: ChartOfAccount[],
  journalEntries: JournalEntry[]
): Record<string, CoaLedgerSummary> => {
  const result: Record<string, CoaLedgerSummary> = {};

  coaList.forEach(coa => {
    result[coa.code] = {
      account: coa,
      totalDebit: 0,
      totalCredit: 0,
      endingBalance: 0,
      mutationCount: 0,
      lines: []
    };
  });

  // Sort entries chronologically to compute running balance correctly
  const chronologicalEntries = [...journalEntries].sort((a, b) => a.date.localeCompare(b.date));

  chronologicalEntries.forEach(entry => {
    entry.lines.forEach(line => {
      let target = result[line.accountCode];
      if (!target) {
        // Fallback create if not registered
        const foundCoa = coaList.find(c => c.code === line.accountCode) || {
          code: line.accountCode,
          name: line.accountName,
          category: line.category,
          subCategory: 'Lainnya',
          normalBalance: line.category === 'asset' || line.category === 'expense' ? 'debit' as const : 'credit' as const
        };
        result[line.accountCode] = {
          account: foundCoa,
          totalDebit: 0,
          totalCredit: 0,
          endingBalance: 0,
          mutationCount: 0,
          lines: []
        };
        target = result[line.accountCode];
      }

      target.totalDebit += line.debit;
      target.totalCredit += line.credit;
      target.mutationCount += 1;

      // Find contra account (the other line in the journal entry)
      const contraLine = entry.lines.find(l => l.accountCode !== line.accountCode);
      const contraName = contraLine ? `${contraLine.accountCode} ${contraLine.accountName}` : 'Serbaneka';

      // Running balance
      const currentBalance = target.account.normalBalance === 'debit'
        ? target.totalDebit - target.totalCredit
        : target.totalCredit - target.totalDebit;

      target.endingBalance = currentBalance;

      target.lines.push({
        date: entry.date,
        referenceNo: entry.referenceNo,
        description: entry.description,
        contraAccountName: contraName,
        debit: line.debit,
        credit: line.credit,
        runningBalance: currentBalance
      });
    });
  });

  return result;
};

// =========================================================================
// ACCOUNTING EQUATION & TRIAL BALANCE (NERACA SALDO & PERSAMAAN DASAR)
// =========================================================================

export interface AccountingEquationSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  isEquationBalanced: boolean;
  equationDifference: number;
  totalDebitTrialBalance: number;
  totalCreditTrialBalance: number;
  isTrialBalanceBalanced: boolean;
}

export const getAccountingEquationSummary = (
  ledgerSummaries: Record<string, CoaLedgerSummary>
): AccountingEquationSummary => {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalRevenue = 0;
  let totalExpense = 0;

  let totalDebitTrialBalance = 0;
  let totalCreditTrialBalance = 0;

  Object.values(ledgerSummaries).forEach(item => {
    totalDebitTrialBalance += item.totalDebit;
    totalCreditTrialBalance += item.totalCredit;

    const balance = item.endingBalance;

    switch (item.account.category) {
      case 'asset':
        totalAssets += balance;
        break;
      case 'liability':
        totalLiabilities += balance;
        break;
      case 'equity':
        totalEquity += balance;
        break;
      case 'revenue':
        totalRevenue += balance;
        break;
      case 'expense':
        totalExpense += balance;
        break;
    }
  });

  const netIncome = totalRevenue - totalExpense;
  // Accounting Equation: Assets = Liabilities + Equity + Net Income
  const rightHandSide = totalLiabilities + totalEquity + netIncome;
  const equationDiff = Math.abs(totalAssets - rightHandSide);
  const isEquationBalanced = equationDiff < 1; // Tolerance for floating point

  const trialBalanceDiff = Math.abs(totalDebitTrialBalance - totalCreditTrialBalance);
  const isTrialBalanceBalanced = trialBalanceDiff < 1;

  return {
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalRevenue,
    totalExpense,
    netIncome,
    isEquationBalanced,
    equationDifference: equationDiff,
    totalDebitTrialBalance,
    totalCreditTrialBalance,
    isTrialBalanceBalanced
  };
};

// =========================================================================
// BALANCE SHEET STATEMENT (LAPORAN NERACA: AKTIVA vs KEWAJIBAN + EKUITAS)
// =========================================================================

export interface BalanceSheetLineItem {
  code: string;
  name: string;
  subCategory: string;
  balance: number;
}

export interface BalanceSheetSummary {
  assets: BalanceSheetLineItem[];
  liabilities: BalanceSheetLineItem[];
  equity: BalanceSheetLineItem[];
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalEquityPlusNetIncome: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export const generateBalanceSheetSummary = (
  coaList: ChartOfAccount[],
  ledgerSummaries: Record<string, CoaLedgerSummary>,
  accountingSummary: AccountingEquationSummary
): BalanceSheetSummary => {
  const assets: BalanceSheetLineItem[] = [];
  const liabilities: BalanceSheetLineItem[] = [];
  const equity: BalanceSheetLineItem[] = [];

  coaList.forEach(coa => {
    const ledger = ledgerSummaries[coa.code];
    const ending = ledger ? ledger.endingBalance : 0;
    const hasActivity = (ledger?.mutationCount || 0) > 0 || ending !== 0;

    if (!hasActivity && !coa.linkedAccountId) return;

    const item: BalanceSheetLineItem = {
      code: coa.code,
      name: coa.name,
      subCategory: coa.subCategory,
      balance: ending
    };

    if (coa.category === 'asset') assets.push(item);
    else if (coa.category === 'liability') liabilities.push(item);
    else if (coa.category === 'equity') equity.push(item);
  });

  const totalAssets = accountingSummary.totalAssets;
  const totalLiabilities = accountingSummary.totalLiabilities;
  const totalEquity = accountingSummary.totalEquity;
  const netIncome = accountingSummary.netIncome;
  const totalEquityPlusNetIncome = totalEquity + netIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquityPlusNetIncome;

  return {
    assets,
    liabilities,
    equity,
    netIncome,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalEquityPlusNetIncome,
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1
  };
};

