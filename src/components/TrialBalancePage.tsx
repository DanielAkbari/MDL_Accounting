import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { COA } from '../data/coa';
import { formatRp, exportToExcel, exportToPDF } from '../lib/export';
import { Download } from 'lucide-react';

export default function TrialBalancePage({ 
  transactions,
  coaList,
  currentProject,
  onProjectChange
}: { 
  transactions: Transaction[];
  coaList: COA[];
  currentProject?: 'Pariwisata' | 'Properti' | 'Konsolidasi';
  onProjectChange?: (project: 'Pariwisata' | 'Properti' | 'Konsolidasi') => void;
}) {
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');

  const coasList = coaList;

  const filteredTxs = useMemo(() => {
    return transactions.filter(t => {
      const dateOnly = t.date.split('T')[0];
      if (startDate && dateOnly < startDate) return false;
      if (endDate && dateOnly > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const periodInfo = useMemo(() => {
    if (startDate && endDate) {
      const startFmt = startDate.split('-').reverse().join('/');
      const endFmt = endDate.split('-').reverse().join('/');
      return `Periode: ${startFmt} s/d ${endFmt}`;
    }
    if (startDate) {
      const startFmt = startDate.split('-').reverse().join('/');
      return `Periode: Mulai ${startFmt}`;
    }
    if (endDate) {
      const endFmt = endDate.split('-').reverse().join('/');
      return `Periode: Hingga ${endFmt}`;
    }
    return "Periode: Semua Tanggal";
  }, [startDate, endDate]);

  const trialBalanceData = useMemo(() => {
    let balances: Record<string, {
       debit: number,
       credit: number,
       normalBalance: 'Debit' | 'Credit'
    }> = {};

    coasList.forEach(coa => {
      balances[coa.code] = {
        debit: 0,
        credit: 0,
        normalBalance: ['Asset', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS', 'DEPR'].includes(coa.type) ? 'Debit' : 'Credit'
      };
    });

    balances['11000'] = { debit: 0, credit: 0, normalBalance: 'Debit' };

    filteredTxs.forEach(t => {
      const isManualJournal = t.id.startsWith('JU-') || t.description.startsWith('[Jurnal Umum]');
      
      if (isManualJournal) {
        if (t.accountCode) {
          if (!balances[t.accountCode]) {
            const coa = coasList.find(c => c.code === t.accountCode);
            const isDebitNormal = coa ? ['Asset', 'Expense', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS'].includes(coa.type) : true;
            balances[t.accountCode] = { debit: 0, credit: 0, normalBalance: isDebitNormal ? 'Debit' : 'Credit' };
          }
          if (t.type === 'Expense') { // JU-D
            balances[t.accountCode].debit += t.amount;
          } else { // JU-K
            balances[t.accountCode].credit += t.amount;
          }
        }
        return;
      }

      // Regular transactions:
      const bankCode = t.accountId || '11000';
      if (!balances[bankCode]) {
        balances[bankCode] = { debit: 0, credit: 0, normalBalance: 'Debit' };
      }

      if (t.type === 'Income') {
        balances[bankCode].debit += t.amount;
        
        if (t.accountCode) {
           if (!balances[t.accountCode]) {
             const coa = coasList.find(c => c.code === t.accountCode);
             const isDebitNormal = coa ? ['Asset', 'Expense', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS'].includes(coa.type) : false;
             balances[t.accountCode] = { debit: 0, credit: 0, normalBalance: isDebitNormal ? 'Debit' : 'Credit' };
           }
           balances[t.accountCode].credit += t.amount;
        }
      } else {
        balances[bankCode].credit += t.amount;

        if (t.accountCode) {
           if (!balances[t.accountCode]) {
             const coa = coasList.find(c => c.code === t.accountCode);
             const isDebitNormal = coa ? ['Asset', 'Expense', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS'].includes(coa.type) : true;
             balances[t.accountCode] = { debit: 0, credit: 0, normalBalance: isDebitNormal ? 'Debit' : 'Credit' };
           }
           balances[t.accountCode].debit += t.amount;
        }
      }
    });

    const rows = Object.entries(balances).map(([code, b]) => {
      const isAssetOrExpense = b.normalBalance === 'Debit';
      let finalDebit = 0;
      let finalCredit = 0;

      if (isAssetOrExpense) {
        finalDebit = Math.max(0, b.debit - b.credit);
        finalCredit = Math.max(0, b.credit - b.debit);
      } else {
        finalCredit = Math.max(0, b.credit - b.debit);
        finalDebit = Math.max(0, b.debit - b.credit);
      }

      return {
        code,
        name: code === '11000' ? 'Kas & Bank' : (coasList.find(c => c.code === code)?.name || 'Tanpa Kategori'),
        debit: finalDebit,
        credit: finalCredit,
      };
    }).filter(r => r.debit > 0 || r.credit > 0)
      .sort((a, b) => a.code.localeCompare(b.code));

    const totalDebit = rows.reduce((acc, r) => acc + r.debit, 0);
    const totalCredit = rows.reduce((acc, r) => acc + r.credit, 0);

    return { rows, totalDebit, totalCredit };
  }, [filteredTxs, coasList]);

  const handleExportPDF = () => {
    const title = 'Neraca Saldo (Trial Balance)';
    const headers = ['Kode Akun', 'Nama Akun', 'Debet', 'Kredit'];
    const rows = trialBalanceData.rows.map(r => [
      r.code, 
      r.name, 
      r.debit > 0 ? formatRp(r.debit) : '-', 
      r.credit > 0 ? formatRp(r.credit) : '-'
    ]);
    
    // Add totals
    rows.push(['', 'TOTAL', formatRp(trialBalanceData.totalDebit), formatRp(trialBalanceData.totalCredit)]);
    
    exportToPDF(title, headers, rows, periodInfo);
  };

  const handleExportExcel = () => {
    const data = trialBalanceData.rows.map(r => ({
      'Kode Akun': r.code,
      'Nama Akun': r.name,
      'Debet': r.debit,
      'Kredit': r.credit
    }));
    
    // Total row
    data.push({
      'Kode Akun': '',
      'Nama Akun': 'TOTAL',
      'Debet': trialBalanceData.totalDebit,
      'Kredit': trialBalanceData.totalCredit
    });
    
    exportToExcel('Neraca_Saldo', data, periodInfo);
  };

  const isBalanced = trialBalanceData.totalDebit === trialBalanceData.totalCredit;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Project selector dropdown (trial-balance-local) */}
      {currentProject && onProjectChange && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Proyek Neraca Saldo</h3>
            <p className="text-[10px] text-slate-400 font-medium">Saring neraca saldo berdasarkan proyek aktif</p>
          </div>
          <select
            value={currentProject}
            onChange={(e) => onProjectChange(e.target.value as any)}
            className="w-full sm:w-64 bg-slate-50 border border-slate-300 text-slate-800 py-1.5 px-3 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
          >
            <option value="Konsolidasi">📂 Neraca Saldo Konsolidasi (Semua)</option>
            <option value="Pariwisata">🌴 Neraca Saldo Pariwisata</option>
            <option value="Properti">🏡 Neraca Saldo Properti</option>
          </select>
        </div>
      )}

      {/* Filter Card Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-left">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tanggal Mulai</label>
          <input 
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tanggal Akhir</label>
          <input 
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
        <div className="flex items-end">
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition border border-slate-300 shadow-sm cursor-pointer"
          >
            Bersihkan Filter
          </button>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Neraca Saldo (Trial Balance)</h2>
          <p className="text-sm text-slate-500 font-mono mt-1">Daftar saldo akhir seluruh akun</p>
        </div>
        <div className="flex gap-2">
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
              <th className="px-6 py-4 border-r border-slate-100">Kode</th>
              <th className="px-6 py-4 border-r border-slate-100">Nama Akun</th>
              <th className="px-6 py-4 text-right border-r border-slate-100">Debet</th>
              <th className="px-6 py-4 text-right">Kredit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trialBalanceData.rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 border-r border-slate-100 font-mono text-xs text-slate-500">{row.code}</td>
                <td className="px-6 py-3 border-r border-slate-100 text-slate-700">{row.name}</td>
                <td className="px-6 py-3 text-right border-r border-slate-100 font-mono text-xs text-slate-800">
                  {row.debit > 0 ? formatRp(row.debit) : '-'}
                </td>
                <td className="px-6 py-3 text-right font-mono text-xs text-slate-800">
                  {row.credit > 0 ? formatRp(row.credit) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-sm">
            <tr>
              <td colSpan={2} className="px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-widest border-r border-slate-100">
                Total Saldo Keseluruhan
              </td>
              <td className={`px-6 py-4 text-right font-mono font-bold ${isBalanced ? 'text-green-600' : 'text-red-500'} border-r border-slate-100`}>
                {formatRp(trialBalanceData.totalDebit)}
              </td>
              <td className={`px-6 py-4 text-right font-mono font-bold ${isBalanced ? 'text-green-600' : 'text-red-500'}`}>
                {formatRp(trialBalanceData.totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!isBalanced && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">
          <strong>Peringatan:</strong> Neraca saldo tidak balance. Terdapat selisih {formatRp(Math.abs(trialBalanceData.totalDebit - trialBalanceData.totalCredit))}.
        </div>
      )}
    </div>
  );
}
