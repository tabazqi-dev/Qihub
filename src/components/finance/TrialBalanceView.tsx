import React, { useState, useEffect } from 'react';

export const TrialBalanceView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/trial-balance').then(res => res.json()).then(setData);
  }, []);

  return (
    <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border">
      <h2 className="text-lg font-bold mb-4">Neraca Saldo (Trial Balance)</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama Akun</th>
            <th>Debit</th>
            <th>Kredit</th>
          </tr>
        </thead>
        <tbody>
          {data.map((acc, i) => (
            <tr key={i}>
              <td>{acc.accountCode}</td>
              <td>{acc.accountName}</td>
              <td>{acc.totalDebit}</td>
              <td>{acc.totalCredit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
