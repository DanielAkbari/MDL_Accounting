import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { getMergedCOA } from '../data/coa';
import { formatRp, exportToExcel, exportToPDF } from '../lib/export';
import { Download, BookOpen, Scale, FileEdit, Plus, Trash2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { addTransaction } from '../lib/apiDb';
import toast from 'react-hot-toast';

export default function LedgerPage({ transactions, onRefresh }: { transactions: Transaction[], onRefresh?: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'detail' | 'balances' | 'manual-journal'>('balances');
  const coasList = useMemo(() => getMergedCOA(), []);
  
  const availableAccounts = useMemo(() => {
    const list = [{ code: '1000', name: 'Kas & Bank', type: 'Asset' }];
    const usedCodes = new Set(transactions.map(t => t.accountCode).filter(Boolean));
    
    coasList.forEach(coa => {
      if (usedCodes.has(coa.code)) {
        list.push({ ...coa });
      }
    });

    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [coasList, transactions]);

  const [selectedAccount, setSelectedAccount] = useState<string>('1000');

  // Units list
  const units = [
    'Glamping',
    'Cabin',
    'Malang Dreamcamp',
    'Villa',
    'Foodcourt',
    'Wahana - ATV',
    'Wahana - Ayunan',
    'Wahana - Keranjang Sultan',
    'Wahana - Skuter',
    'Wahana - Seluncuran',
    'Wahana - spot foto / paralayang',
    'Wahana - Lainnya',
    'Umum / Lainnya'
  ];

  // Manual Journal Form State
  const [journalDate, setJournalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [journalMemo, setJournalMemo] = useState('');
  const [journalUnit, setJournalUnit] = useState(units[0]);
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [journalAmount, setJournalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab 1: Ledger calculation
  const ledgerData = useMemo(() => {
    let balance = 0;
    
    const isAssetOrExpense = (code: string) => {
      if (code === '1000') return true;
      const coa = coasList.find(c => c.code === code);
      if (!coa) return true;
      return ['Asset', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS', 'DEPR'].includes(coa.type);
    };

    const isDebitNormal = isAssetOrExpense(selectedAccount);

    const rows = transactions
      .filter(t => {
        if (selectedAccount === '1000') return true;
        return t.accountCode === selectedAccount;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => {
        let debit = 0;
        let credit = 0;

        if (selectedAccount === '1000') {
          if (t.type === 'Income') {
            debit = t.amount;
          } else {
            credit = t.amount;
          }
        } else {
          if (t.type === 'Income') {
            credit = t.amount;
          } else {
            debit = t.amount;
          }
        }

        if (isDebitNormal) {
          balance = balance + debit - credit;
        } else {
          balance = balance + credit - debit;
        }

        return {
          id: t.id,
          date: t.date,
          description: t.description || `Transaksi ${t.type === 'Income' ? 'Penerimaan' : 'Pengeluaran'}`,
          unit: t.unit,
          ref: t.accountCode === selectedAccount ? '1000' : t.accountCode,
          debit,
          credit,
          balance
        };
      });

    return rows;
  }, [transactions, selectedAccount, coasList]);

  // Tab 2: Account Balances Calculation
  const accountBalances = useMemo(() => {
    const balances: Record<string, { debit: number; credit: number; normalBalance: 'Debit' | 'Credit' }> = {};

    coasList.forEach(coa => {
      balances[coa.code] = {
        debit: 0,
        credit: 0,
        normalBalance: ['Asset', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS', 'DEPR'].includes(coa.type) ? 'Debit' : 'Credit'
      };
    });

    balances['1000'] = { debit: 0, credit: 0, normalBalance: 'Debit' };

    transactions.forEach(t => {
      if (t.type === 'Income') {
        balances['1000'].debit += t.amount;
        if (t.accountCode) {
          if (!balances[t.accountCode]) {
            balances[t.accountCode] = { debit: 0, credit: 0, normalBalance: 'Credit' };
          }
          balances[t.accountCode].credit += t.amount;
        }
      } else {
        balances['1000'].credit += t.amount;
        if (t.accountCode) {
          if (!balances[t.accountCode]) {
            balances[t.accountCode] = { debit: 0, credit: 0, normalBalance: 'Debit' };
          }
          balances[t.accountCode].debit += t.amount;
        }
      }
    });

    const list = Object.entries(balances).map(([code, b]) => {
      const isDebitNormal = b.normalBalance === 'Debit';
      let balanceValue = 0;
      if (isDebitNormal) {
        balanceValue = b.debit - b.credit;
      } else {
        balanceValue = b.credit - b.debit;
      }

      return {
        code,
        name: code === '1000' ? 'Kas & Bank' : (coasList.find(c => c.code === code)?.name || 'Akun Kustom'),
        type: code === '1000' ? 'Asset' : (coasList.find(c => c.code === code)?.type || 'Custom'),
        debit: b.debit,
        credit: b.credit,
        balance: balanceValue
      };
    });

    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [coasList, transactions]);

  // Tab 3: Manual Journal Entry List
  const manualJournalHistory = useMemo(() => {
    return transactions
      .filter(t => t.description.startsWith('[Jurnal Umum]'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(t => {
        const isDebit = t.type === 'Expense';
        return {
          id: t.id,
          date: t.date,
          description: t.description.replace('[Jurnal Umum] ', ''),
          unit: t.unit,
          code: t.accountCode,
          name: t.accountName,
          debit: isDebit ? t.amount : 0,
          credit: !isDebit ? t.amount : 0
        };
      });
  }, [transactions]);

  const handleSaveManualJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitAccount || !creditAccount || !journalAmount || !journalMemo) {
      toast.error('Harap isi semua kolom jurnal');
      return;
    }
    if (debitAccount === creditAccount) {
      toast.error('Akun Debet dan Kredit tidak boleh sama!');
      return;
    }

    setIsSubmitting(true);
    try {
      const debitAccName = coasList.find(c => c.code === debitAccount)?.name || '';
      const creditAccName = coasList.find(c => c.code === creditAccount)?.name || '';
      const amount = parseFloat(journalAmount);
      const commonId = crypto.randomUUID();

      const txDebit: Transaction = {
        id: `JU-D-${commonId}`,
        date: new Date(journalDate).toISOString(),
        type: 'Expense', // debits the selected account in ledger normal flow
        amount: amount,
        unit: journalUnit,
        accountCode: debitAccount,
        accountName: debitAccName,
        description: `[Jurnal Umum] ${journalMemo}`
      };

      const txCredit: Transaction = {
        id: `JU-K-${commonId}`,
        date: new Date(journalDate).toISOString(),
        type: 'Income', // credits the selected account in ledger normal flow
        amount: amount,
        unit: journalUnit,
        accountCode: creditAccount,
        accountName: creditAccName,
        description: `[Jurnal Umum] ${journalMemo}`
      };

      await addTransaction(txDebit);
      await addTransaction(txCredit);

      toast.success('Jurnal Umum Manual berhasil disimpan!');
      setJournalMemo('');
      setJournalAmount('');
      setDebitAccount('');
      setCreditAccount('');
      
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan Jurnal Umum');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    const accountName = availableAccounts.find(a => a.code === selectedAccount)?.name || '';
    const title = `Buku Besar - [${selectedAccount}] ${accountName}`;
    const headers = ['Tanggal', 'Ref', 'Keterangan', 'Unit', 'Debet', 'Kredit', 'Saldo'];
    const rows = ledgerData.map(r => [
      r.date ? format(parseISO(r.date), 'dd/MM/yyyy') : '-', 
      r.ref || '-', 
      r.description, 
      r.unit, 
      r.debit > 0 ? formatRp(r.debit) : '-', 
      r.credit > 0 ? formatRp(r.credit) : '-', 
      r.balance < 0 ? `(${formatRp(Math.abs(r.balance))})` : formatRp(r.balance)
    ]);
    exportToPDF(title, headers, rows);
  };

  const handleExportExcel = () => {
    const accountName = availableAccounts.find(a => a.code === selectedAccount)?.name || '';
    const title = `Buku Besar - ${selectedAccount}`;
    const data = ledgerData.map(r => ({
      Tanggal: r.date ? format(parseISO(r.date), 'dd/MM/yyyy') : '-',
      Ref: r.ref || '-',
      Keterangan: r.description,
      Unit: r.unit,
      Debet: r.debit,
      Kredit: r.credit,
      Saldo: r.balance < 0 ? `(${formatRp(Math.abs(r.balance))})` : formatRp(r.balance)
    }));
    exportToExcel(title, data);
  };

  const selectedAccountData = availableAccounts.find(a => a.code === selectedAccount);

  const formatSaldo = (val: number) => {
    if (val < 0) {
      return <span className="text-red-600 font-bold">({formatRp(Math.abs(val))})</span>;
    }
    return <span className="text-slate-900 font-medium">{formatRp(val)}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Buku Besar (General Ledger)</h2>
          <p className="text-sm text-slate-500 font-mono mt-1">Kelola pembukuan ledger, periksa saldo akun, dan catat jurnal manual</p>
        </div>
      </div>

      {/* Sub-menu Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-lg p-1 gap-1 shadow-sm max-w-xl">
        <button
          onClick={() => setActiveSubTab('balances')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeSubTab === 'balances' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <Scale className="w-3.5 h-3.5" />
          Saldo Akun Perkiraan
        </button>
        <button
          onClick={() => setActiveSubTab('detail')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeSubTab === 'detail' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Rincian Buku Besar
        </button>
        <button
          onClick={() => setActiveSubTab('manual-journal')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeSubTab === 'manual-journal' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <FileEdit className="w-3.5 h-3.5" />
          Jurnal Umum Manual
        </button>
      </div>

      {/* Tab 1: Ledger Detail */}
      {activeSubTab === 'detail' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Pilih Akun Buku Besar</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
              >
                {availableAccounts.map(a => (
                  <option key={a.code} value={a.code}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Golongan Akun</label>
               <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-mono text-sm text-slate-500">
                 {selectedAccountData?.type || '-'}
               </div>
            </div>
            <div className="flex gap-2 self-end">
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded font-medium shadow-sm hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Excel</span>
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded font-medium shadow-sm hover:bg-red-700 transition"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">PDF</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-r border-slate-100">Tanggal</th>
                  <th className="px-4 py-3 border-r border-slate-100">Ref</th>
                  <th className="px-4 py-3 border-r border-slate-100">Keterangan</th>
                  <th className="px-4 py-3 border-r border-slate-100">Unit</th>
                  <th className="px-4 py-3 text-right border-r border-slate-100">Debet</th>
                  <th className="px-4 py-3 text-right border-r border-slate-100">Kredit</th>
                  <th className="px-4 py-3 text-right font-black text-slate-800">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerData.length === 0 ? (
                  <tr>
                     <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm font-medium">Buku besar kosong untuk akun tersebut.</td>
                  </tr>
                ) : (
                  ledgerData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 border-r border-slate-100 whitespace-nowrap text-slate-700">
                        {row.date ? format(parseISO(row.date), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-100 font-mono text-xs text-slate-500">{row.ref || '-'}</td>
                      <td className="px-4 py-2 border-r border-slate-100 text-slate-700 max-w-xs truncate">{row.description}</td>
                      <td className="px-4 py-2 border-r border-slate-100 text-xs text-slate-500 font-mono">{row.unit}</td>
                      <td className="px-4 py-2 text-right border-r border-slate-100 font-mono text-xs text-slate-800">
                        {row.debit > 0 ? formatRp(row.debit) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right border-r border-slate-100 font-mono text-xs text-slate-800">
                        {row.credit > 0 ? formatRp(row.credit) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs bg-slate-50/50">
                        {formatSaldo(row.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Account Balances */}
      {activeSubTab === 'balances' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 border-r border-slate-100">Kode Akun</th>
                <th className="px-6 py-4 border-r border-slate-100">Nama Akun</th>
                <th className="px-6 py-4 border-r border-slate-100">Kategori</th>
                <th className="px-6 py-4 text-right border-r border-slate-100">Total Debet</th>
                <th className="px-6 py-4 text-right border-r border-slate-100">Total Kredit</th>
                <th className="px-6 py-4 text-right border-r border-slate-100">Saldo Akhir</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accountBalances.map((item, idx) => (
                <tr key={`${item.code}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 border-r border-slate-100 font-mono text-xs font-bold text-slate-700">{item.code}</td>
                  <td className="px-6 py-3 border-r border-slate-100 text-slate-800 font-medium">{item.name}</td>
                  <td className="px-6 py-3 border-r border-slate-100">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right border-r border-slate-100 font-mono text-xs text-slate-600">
                    {item.debit > 0 ? formatRp(item.debit) : '-'}
                  </td>
                  <td className="px-6 py-3 text-right border-r border-slate-100 font-mono text-xs text-slate-600">
                    {item.credit > 0 ? formatRp(item.credit) : '-'}
                  </td>
                  <td className="px-6 py-3 text-right border-r border-slate-100 font-mono text-xs">
                    {formatSaldo(item.balance)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedAccount(item.code);
                        setActiveSubTab('detail');
                      }}
                      className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold transition-colors"
                    >
                      Lihat Buku Besar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Manual General Journal Form and list */}
      {activeSubTab === 'manual-journal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-blue-600" />
              Catat Jurnal Manual
            </h3>
            
            <form onSubmit={handleSaveManualJournal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tanggal</label>
                <input 
                  type="date"
                  required
                  value={journalDate}
                  onChange={e => setJournalDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Unit Usaha</label>
                <select
                  value={journalUnit}
                  onChange={e => setJournalUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                >
                  {units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Akun Debet</label>
                <select
                  required
                  value={debitAccount}
                  onChange={e => setDebitAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-mono"
                >
                  <option value="">-- Pilih Akun Debet --</option>
                  {coasList.map(c => (
                    <option key={c.code} value={c.code}>[{c.code}] {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Akun Kredit</label>
                <select
                  required
                  value={creditAccount}
                  onChange={e => setCreditAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-mono"
                >
                  <option value="">-- Pilih Akun Kredit --</option>
                  {coasList.map(c => (
                    <option key={c.code} value={c.code}>[{c.code}] {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nominal (Rp)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  placeholder="0"
                  value={journalAmount}
                  onChange={e => setJournalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Keterangan / Memo</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Keterangan transaksi jurnal umum..."
                  value={journalMemo}
                  onChange={e => setJournalMemo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 text-white font-bold uppercase tracking-wider rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors text-xs"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Simpan Jurnal Umum
              </button>
            </form>
          </div>

          {/* History List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Riwayat Jurnal Umum Manual</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2 font-bold">Tanggal</th>
                    <th className="px-4 py-2 font-bold">Keterangan</th>
                    <th className="px-4 py-2 font-bold">Unit</th>
                    <th className="px-4 py-2 font-bold">Akun Perkiraan</th>
                    <th className="px-4 py-2 font-bold text-right">Debet</th>
                    <th className="px-4 py-2 font-bold text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {manualJournalHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">Belum ada riwayat pencatatan jurnal manual.</td>
                    </tr>
                  ) : (
                    manualJournalHistory.map((row, idx) => (
                      <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                          {row.date ? format(parseISO(row.date), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="px-4 py-2 text-slate-900 font-medium">{row.description}</td>
                        <td className="px-4 py-2 text-slate-600 font-mono text-[10px] uppercase">{row.unit}</td>
                        <td className="px-4 py-2 text-slate-700">
                          <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-slate-400">{row.code}</span>
                            <span className="truncate max-w-[120px]">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-800">
                          {row.debit > 0 ? formatRp(row.debit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-800">
                          {row.credit > 0 ? formatRp(row.credit) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
