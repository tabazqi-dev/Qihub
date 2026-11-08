import React, { useState } from 'react';
import { JournalEntryForm } from './JournalEntryForm';
import { GeneralLedgerView } from './GeneralLedgerView';
import { TrialBalanceView } from './TrialBalanceView';
import { FileText, BookOpen, Scale } from 'lucide-react';

export const AccountingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'journal' | 'ledger' | 'trial'>('journal');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1 bg-white dark:bg-neutral-900 rounded-xl border w-fit">
        <button onClick={() => setActiveTab('journal')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${activeTab === 'journal' ? 'bg-indigo-600 text-white' : ''}`}>
          <FileText className="w-4 h-4" /> Jurnal
        </button>
        <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${activeTab === 'ledger' ? 'bg-indigo-600 text-white' : ''}`}>
          <BookOpen className="w-4 h-4" /> Ledger
        </button>
        <button onClick={() => setActiveTab('trial')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${activeTab === 'trial' ? 'bg-indigo-600 text-white' : ''}`}>
          <Scale className="w-4 h-4" /> Trial Balance
        </button>
      </div>
      
      {activeTab === 'journal' && <JournalEntryForm />}
      {activeTab === 'ledger' && <GeneralLedgerView />}
      {activeTab === 'trial' && <TrialBalanceView />}
    </div>
  );
};
