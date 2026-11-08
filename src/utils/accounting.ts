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

// =========================================================================
// STANDARD CHART OF ACCOUNTS (COA) / BAGAN AKUN STANDAR AKUNTANSI (PSAK)
// =========================================================================

export const BASE_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // 1-XXXX: ASET / AKTIVA (Normal: Debit)
  {
    code: '1-1100',
    name: 'Kas Tunai di Tangan (Cash on Hand)',
    category: 'asset',
    subCategory: 'Kas & Setara Kas',
    normalBalance: 'debit',
    description: 'Uang fisik tunai di dompet atau brankas'
  },
  {
    code: '1-1201',
    name: 'Bank BCA Utama',
    category: 'asset',
    subCategory: 'Kas di Bank',
    normalBalance: 'debit',
    description: 'Rekening tabungan operasional & giro BCA'
  },
  {
    code: '1-1202',
    name: 'Bank Mandiri Payroll',
    category: 'asset',
    subCategory: 'Kas di Bank',
    normalBalance: 'debit',
    description: 'Rekening bank penerimaan payroll Mandiri'
  },
  {
    code: '1-1299',
    name: 'Rekening Bank Lainnya',
    category: 'asset',
    subCategory: 'Kas di Bank',
    normalBalance: 'debit',
    description: 'Rekening bank tambahan lainnya'
  },
  {
    code: '1-1301',
    name: 'E-Wallet GoPay',
    category: 'asset',
    subCategory: 'Dompet Digital',
    normalBalance: 'debit',
    description: 'Saldo dompet elektronik GoPay'
  },
  {
    code: '1-1302',
    name: 'E-Wallet DANA',
    category: 'asset',
    subCategory: 'Dompet Digital',
    normalBalance: 'debit',
    description: 'Saldo dompet elektronik DANA'
  },
  {
    code: '1-1303',
    name: 'E-Wallet OVO',
    category: 'asset',
    subCategory: 'Dompet Digital',
    normalBalance: 'debit',
    description: 'Saldo dompet elektronik OVO'
  },
  {
    code: '1-1399',
    name: 'E-Wallet & Uang Elektronik Lainnya',
    category: 'asset',
    subCategory: 'Dompet Digital',
    normalBalance: 'debit',
    description: 'Saldo ShopeePay, LinkAja, dsb.'
  },
  {
    code: '1-1400',
    name: 'Piutang Pihak Ketiga (Accounts Receivable)',
    category: 'asset',
    subCategory: 'Piutang Lancar',
    normalBalance: 'debit',
    description: 'Tagihan pinjaman atau tagihan jasa kepada orang lain/klien'
  },
  {
    code: '1-1500',
    name: 'Uang Muka & Biaya Dibayar di Muka',
    category: 'asset',
    subCategory: 'Aset Lancar Lainnya',
    normalBalance: 'debit',
    description: 'Deposit, uang muka sewa atau langganan di muka'
  },

  // 2-XXXX: KEWAJIBAN / LIABILITAS (Normal: Kredit)
  {
    code: '2-1100',
    name: 'Hutang Usaha & Tagihan Pihak Ketiga (Accounts Payable)',
    category: 'liability',
    subCategory: 'Kewajiban Jangka Pendek',
    normalBalance: 'credit',
    description: 'Hutang pembelian tempo atau kewajiban supplier'
  },
  {
    code: '2-1200',
    name: 'Hutang PayLater & Kredit Konsumtif',
    category: 'liability',
    subCategory: 'Kewajiban Jangka Pendek',
    normalBalance: 'credit',
    description: 'Kewajiban cicilan GoPay Later, SpayLater, Indodana, dsb.'
  },
  {
    code: '2-1300',
    name: 'Hutang Kartu Kredit (Credit Card Payable)',
    category: 'liability',
    subCategory: 'Kewajiban Jangka Pendek',
    normalBalance: 'credit',
    description: 'Tagihan kartu kredit berjalan'
  },
  {
    code: '2-1400',
    name: 'Pinjaman Bank & Hutang Jangka Panjang',
    category: 'liability',
    subCategory: 'Kewajiban Jangka Panjang',
    normalBalance: 'credit',
    description: 'KPR, KKB, atau pinjaman modal usaha jangka panjang'
  },

  // 3-XXXX: EKUITAS / MODAL (Normal: Kredit)
  {
    code: '3-1100',
    name: 'Modal Awal Pemilik (Owner\'s Equity)',
    category: 'equity',
    subCategory: 'Modal Pemilik',
    normalBalance: 'credit',
    description: 'Saldo awal akumulatif kas & aset yang disetor pemilik'
  },
  {
    code: '3-1200',
    name: 'Laba Ditahan / Akumulasi Saldo Berjalan (Retained Earnings)',
    category: 'equity',
    subCategory: 'Laba Ditahan',
    normalBalance: 'credit',
    description: 'Akumulasi laba/rugi bersih dari periode berjalan'
  },
  {
    code: '3-1300',
    name: 'Prive / Penarikan Pribadi Pemilik (Owner\'s Drawings)',
    category: 'equity',
    subCategory: 'Penarikan Modal',
    normalBalance: 'debit',
    description: 'Penarikan dana untuk keperluan non-usaha'
  },

  // 4-XXXX: PENDAPATAN / REVENUE (Normal: Kredit)
  {
    code: '4-1100',
    name: 'Pendapatan Gaji & Upah (Salary Income)',
    category: 'revenue',
    subCategory: 'Pendapatan Utama',
    normalBalance: 'credit',
    description: 'Penghasilan tetap dari gaji bulanan atau komisi kerja'
  },
  {
    code: '4-1200',
    name: 'Pendapatan Jasa & Freelance',
    category: 'revenue',
    subCategory: 'Pendapatan Utama',
    normalBalance: 'credit',
    description: 'Penghasilan dari proyek kreatif, coding, konsultasi'
  },
  {
    code: '4-1300',
    name: 'Pendapatan Investasi, Dividen & Bunga',
    category: 'revenue',
    subCategory: 'Pendapatan Lain-lain',
    normalBalance: 'credit',
    description: 'Bunga tabungan, dividen saham, imbal hasil reksadana'
  },
  {
    code: '4-1400',
    name: 'Pendapatan Penjualan & Usaha',
    category: 'revenue',
    subCategory: 'Pendapatan Utama',
    normalBalance: 'credit',
    description: 'Hasil penjualan produk fisik atau digital'
  },
  {
    code: '4-1900',
    name: 'Pendapatan Operasional Lainnya',
    category: 'revenue',
    subCategory: 'Pendapatan Lain-lain',
    normalBalance: 'credit',
    description: 'Cashback, reward, hadiah atau pendapatan tak terduga'
  },

  // 5-XXXX: BEBAN & PENGELUARAN (Normal: Debit)
  {
    code: '5-1100',
    name: 'Beban Makanan & Konsumsi (Food & Dining)',
    category: 'expense',
    subCategory: 'Beban Konsumsi',
    normalBalance: 'debit',
    description: 'Makan sehari-hari, kafe, pesan antar makanan'
  },
  {
    code: '5-1200',
    name: 'Beban Operasional Kerja & Software',
    category: 'expense',
    subCategory: 'Beban Operasional',
    normalBalance: 'debit',
    description: 'Langganan AI tools, server, SaaS, domain, buku materi'
  },
  {
    code: '5-1300',
    name: 'Beban Belanja Pokok & Sembako (Groceries)',
    category: 'expense',
    subCategory: 'Beban Rumah Tangga',
    normalBalance: 'debit',
    description: 'Kebutuhan supermarket harian dan perlengkapan rumah'
  },
  {
    code: '5-1400',
    name: 'Beban Transportasi & Bahan Bakar',
    category: 'expense',
    subCategory: 'Beban Operasional',
    normalBalance: 'debit',
    description: 'Bensin, tol, parkir, ojek online, tiket transportasi'
  },
  {
    code: '5-1500',
    name: 'Beban Utilitas, Listrik, Air & Internet',
    category: 'expense',
    subCategory: 'Beban Utilitas',
    normalBalance: 'debit',
    description: 'Token listrik PLN, tagihan air PDAM, WiFi internet'
  },
  {
    code: '5-1600',
    name: 'Beban Gaya Hidup, Hiburan & Belanja Pribadi',
    category: 'expense',
    subCategory: 'Beban Pribadi',
    normalBalance: 'debit',
    description: 'Pakaian, gadget, nonton bioskop, hobi'
  },
  {
    code: '5-1700',
    name: 'Beban Bunga & Biaya Finansial',
    category: 'expense',
    subCategory: 'Beban Keuangan',
    normalBalance: 'debit',
    description: 'Biaya admin transfer antarbank, bunga PayLater/kredit'
  },
  {
    code: '5-1999',
    name: 'Beban Operasional Lain-lain (Miscellaneous)',
    category: 'expense',
    subCategory: 'Beban Umum',
    normalBalance: 'debit',
    description: 'Pengeluaran rupa-rupa yang tidak termasuk kategori khusus'
  }
];

// Helper: Get or dynamically map all COA accounts including all user FinancialAccounts
export const getAllChartOfAccounts = (accounts: FinancialAccount[]): ChartOfAccount[] => {
  const result = [...BASE_CHART_OF_ACCOUNTS];

  accounts.forEach((acc, index) => {
    // Check if an existing COA is already mapped to this account
    const existing = result.find(c => c.linkedAccountId === acc.id || c.name.toLowerCase() === acc.name.toLowerCase());
    if (existing) {
      existing.linkedAccountId = acc.id;
      return;
    }

    // Determine code prefix
    let code = '';
    let subCategory = '';
    if (acc.type === 'cash') {
      code = index === 0 ? '1-1100' : `1-110${index}`;
      subCategory = 'Kas & Setara Kas';
    } else if (acc.type === 'bank') {
      code = `1-12${String(index + 10).padStart(2, '0')}`;
      subCategory = 'Kas di Bank';
    } else {
      code = `1-13${String(index + 10).padStart(2, '0')}`;
      subCategory = 'Dompet Digital';
    }

    // Make sure code is unique
    let finalCode = code;
    let counter = 1;
    while (result.some(c => c.code === finalCode)) {
      finalCode = `${code.substring(0, 4)}${counter++}`;
    }

    result.push({
      code: finalCode,
      name: `${acc.name} (${acc.type.toUpperCase()})`,
      category: 'asset',
      subCategory,
      normalBalance: 'debit',
      description: `Rekening riil: ${acc.name} ${acc.accountNumber ? `[${acc.accountNumber}]` : ''}`,
      linkedAccountId: acc.id,
      isCustom: true
    });
  });

  return result.sort((a, b) => a.code.localeCompare(b.code));
};

// Helper: Get COA Account for a specific FinancialAccount
export const getCoaForFinancialAccount = (acc: FinancialAccount, allCoa: ChartOfAccount[]): ChartOfAccount => {
  const matched = allCoa.find(c => c.linkedAccountId === acc.id) ||
                  allCoa.find(c => c.name.toLowerCase().includes(acc.name.toLowerCase())) ||
                  allCoa.find(c => acc.type === 'cash' ? c.code === '1-1100' : acc.type === 'bank' ? c.code === '1-1201' : c.code === '1-1301');
  
  if (matched) return matched;

  return {
    code: acc.type === 'cash' ? '1-1100' : acc.type === 'bank' ? '1-1201' : '1-1301',
    name: acc.name,
    category: 'asset',
    subCategory: acc.type === 'cash' ? 'Kas & Setara Kas' : acc.type === 'bank' ? 'Kas di Bank' : 'Dompet Digital',
    normalBalance: 'debit',
    linkedAccountId: acc.id
  };
};

// Helper: Map Transaction Category to Standard COA
export const getCoaForCategory = (category: string, type: 'income' | 'expense', allCoa: ChartOfAccount[]): ChartOfAccount => {
  const cat = category.toLowerCase();

  if (type === 'income') {
    if (cat.includes('gaji') || cat.includes('salary')) {
      return allCoa.find(c => c.code === '4-1100') || allCoa[0];
    }
    if (cat.includes('freelance') || cat.includes('jasa') || cat.includes('proyek')) {
      return allCoa.find(c => c.code === '4-1200') || allCoa[0];
    }
    if (cat.includes('invest') || cat.includes('bunga') || cat.includes('dividen')) {
      return allCoa.find(c => c.code === '4-1300') || allCoa[0];
    }
    if (cat.includes('piutang') || cat.includes('pelunasan')) {
      return allCoa.find(c => c.code === '1-1400') || allCoa[0];
    }
    if (cat.includes('penyesuaian') || cat.includes('opname')) {
      return allCoa.find(c => c.code === '3-1200') || allCoa[0];
    }
    return allCoa.find(c => c.code === '4-1900') || allCoa[0];
  } else {
    // Expense
    if (cat.includes('makan') || cat.includes('food') || cat.includes('dining')) {
      return allCoa.find(c => c.code === '5-1100') || allCoa[0];
    }
    if (cat.includes('software') || cat.includes('work') || cat.includes('kerja')) {
      return allCoa.find(c => c.code === '5-1200') || allCoa[0];
    }
    if (cat.includes('groceries') || cat.includes('belanja') || cat.includes('sembako')) {
      return allCoa.find(c => c.code === '5-1300') || allCoa[0];
    }
    if (cat.includes('transport') || cat.includes('bensin') || cat.includes('ojek')) {
      return allCoa.find(c => c.code === '5-1400') || allCoa[0];
    }
    if (cat.includes('utilities') || cat.includes('listrik') || cat.includes('internet') || cat.includes('air')) {
      return allCoa.find(c => c.code === '5-1500') || allCoa[0];
    }
    if (cat.includes('shopping') || cat.includes('lifestyle') || cat.includes('gaya')) {
      return allCoa.find(c => c.code === '5-1600') || allCoa[0];
    }
    if (cat.includes('cicilan') || cat.includes('hutang') || cat.includes('debt') || cat.includes('paylater')) {
      return allCoa.find(c => c.code === '2-1200') || allCoa[0];
    }
    if (cat.includes('pinjaman') || cat.includes('piutang')) {
      return allCoa.find(c => c.code === '1-1400') || allCoa[0];
    }
    if (cat.includes('admin') || cat.includes('bunga') || cat.includes('biaya')) {
      return allCoa.find(c => c.code === '5-1700') || allCoa[0];
    }
    if (cat.includes('penyesuaian') || cat.includes('opname')) {
      return allCoa.find(c => c.code === '3-1200') || allCoa[0];
    }
    return allCoa.find(c => c.code === '5-1999') || allCoa[0];
  }
};

// =========================================================================
// DOUBLE-ENTRY GENERAL JOURNAL GENERATION (JURNAL UMUM BERPASANGAN)
// =========================================================================

export const generateStandardJournalEntries = (
  transactions: FinanceTransaction[],
  accounts: FinancialAccount[],
  myDebts: MyDebtLiability[],
  debts: DebtReceivable[]
): JournalEntry[] => {
  const allCoa = getAllChartOfAccounts(accounts);
  const entries: JournalEntry[] = [];

  // 1. Initial Balances Journal Entries (Debit: Asset Bank/Cash, Credit: 3-1100 Modal Awal Pemilik)
  accounts.forEach((acc, index) => {
    if (acc.initialBalance > 0) {
      const assetCoa = getCoaForFinancialAccount(acc, allCoa);
      const equityCoa = allCoa.find(c => c.code === '3-1100') || {
        code: '3-1100',
        name: 'Modal Awal Pemilik (Owner\'s Equity)',
        category: 'equity' as CoaClass,
        subCategory: 'Modal Pemilik',
        normalBalance: 'credit' as const
      };

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

  // 2. Regular Transactions & Transfers Journal Entries
  transactions.forEach((tx, index) => {
    // If it's a transfer inflow, skip it because the paired transfer outflow already creates the full double-entry
    if (tx.transferId && tx.type === 'income') {
      return;
    }

    const matchedAcc = accounts.find(a => a.id === tx.accountId) ||
                       accounts.find(a => a.name === tx.accountName) ||
                       accounts[0];
    const assetCoa = matchedAcc ? getCoaForFinancialAccount(matchedAcc, allCoa) : allCoa[0];
    const nominal = tx.amount;

    let debitCoa: ChartOfAccount;
    let creditCoa: ChartOfAccount;
    let entrySourceType: 'transaction' | 'transfer' = 'transaction';
    let refPrefix = 'TXN';

    if (tx.transferId && tx.category === 'Transfer & Tarik Tunai') {
      // Transfer / Tarik Tunai Antar Akun (Asset-to-Asset Swap)
      // Debit: Akun Tujuan (Asset bertambah)
      // Kredit: Akun Asal (Asset berkurang)
      entrySourceType = 'transfer';
      refPrefix = 'TRF';
      const targetAcc = accounts.find(a => a.id === tx.targetAccountId) ||
                         accounts.find(a => a.name === tx.targetAccountName) ||
                         accounts[0];
      debitCoa = targetAcc ? getCoaForFinancialAccount(targetAcc, allCoa) : allCoa[0];
      creditCoa = assetCoa;
    } else if (tx.type === 'income') {
      // Income: Debit Kas/Bank (Asset), Credit Pendapatan/Revenue
      debitCoa = assetCoa;
      creditCoa = getCoaForCategory(tx.category, 'income', allCoa);
    } else {
      // Expense:
      if (tx.relatedDebtId || tx.category.toLowerCase().includes('hutang') || tx.category.toLowerCase().includes('cicilan')) {
        debitCoa = allCoa.find(c => c.code === '2-1200') || allCoa.find(c => c.code === '2-1100') || allCoa[0];
      } else if (tx.category.toLowerCase().includes('piutang') || tx.category.toLowerCase().includes('pinjaman')) {
        debitCoa = allCoa.find(c => c.code === '1-1400') || allCoa[0];
      } else if (tx.category.toLowerCase().includes('admin') || tx.category.toLowerCase().includes('biaya')) {
        debitCoa = allCoa.find(c => c.code === '5-1700') || allCoa[0];
      } else {
        debitCoa = getCoaForCategory(tx.category, 'expense', allCoa);
      }
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
