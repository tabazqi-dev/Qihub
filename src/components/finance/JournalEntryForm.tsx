import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export const JournalEntryForm: React.FC = () => {
  const { showToast } = useApp();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([{ accountId: '', debit: '0', credit: '0' }]);

  useEffect(() => {
    fetch('/api/accounts').then(res => res.json()).then(setAccounts);
  }, []);

  const handleAddItem = () => setItems([...items, { accountId: '', debit: '0', credit: '0' }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const debitTotal = items.reduce((sum, item) => sum + parseFloat(item.debit), 0);
    const creditTotal = items.reduce((sum, item) => sum + parseFloat(item.credit), 0);

    if (debitTotal !== creditTotal) {
      showToast('Jurnal tidak seimbang (debit harus sama dengan kredit)', 'error');
      return;
    }

    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entry: { description }, 
          items: items.map(item => ({
            accountId: parseInt(item.accountId),
            debit: item.debit,
            credit: item.credit,
          })) 
        })
      });
      showToast('Jurnal berhasil dicatat', 'success');
      setDescription('');
      setItems([{ accountId: '', debit: '0', credit: '0' }]);
    } catch (err) {
      showToast('Gagal mencatat jurnal', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border">
      <h2 className="text-lg font-bold mb-4">Buat Jurnal Manual</h2>
      <input 
        className="w-full p-2 mb-4 border rounded"
        value={description} 
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Deskripsi transaksi"
        required
      />
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <select className="flex-1 p-2 border rounded" value={item.accountId} onChange={(e) => {
            const newItems = [...items];
            newItems[index].accountId = e.target.value;
            setItems(newItems);
          }}>
            <option value="">Pilih Akun</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
          </select>
          <input className="w-24 p-2 border rounded" type="number" value={item.debit} onChange={(e) => {
            const newItems = [...items];
            newItems[index].debit = e.target.value;
            setItems(newItems);
          }} />
          <input className="w-24 p-2 border rounded" type="number" value={item.credit} onChange={(e) => {
            const newItems = [...items];
            newItems[index].credit = e.target.value;
            setItems(newItems);
          }} />
        </div>
      ))}
      <button type="button" onClick={handleAddItem} className="mb-4 text-sm text-indigo-600">+ Tambah Baris</button>
      <button type="submit" className="w-full p-2 bg-indigo-600 text-white rounded">Simpan Jurnal</button>
    </form>
  );
};
