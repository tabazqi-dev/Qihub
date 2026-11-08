import React, { useState, useEffect } from 'react';

export const GeneralLedgerView: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/accounts').then(res => res.json()).then(setAccounts);
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetch(`/api/ledger/${selectedAccountId}`).then(res => res.json()).then(setLedger);
    }
  }, [selectedAccountId]);

  return (
    <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border">
      <h2 className="text-lg font-bold mb-4">Buku Besar (General Ledger)</h2>
      <select className="w-full p-2 mb-4 border rounded" onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}>
        <option value="">Pilih Akun</option>
        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
      </select>
      
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Deskripsi</th>
            <th>Debit</th>
            <th>Kredit</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((entry, i) => (
            <tr key={i}>
              <td>{new Date(entry.date).toLocaleDateString()}</td>
              <td>{entry.description}</td>
              <td>{entry.debit}</td>
              <td>{entry.credit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
