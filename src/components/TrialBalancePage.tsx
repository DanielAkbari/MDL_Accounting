import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { getMergedCOA } from '../data/coa';
import { formatRp, exportToExcel, exportToPDF } from '../lib/export';
import { Download } from 'lucide-react';

export default function TrialBalancePage({ transactions }: { transactions: Transaction[] }) {
  const coasList = useMemo(() => getMergedCOA(), []);

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
        normalBalance: ['Asset', 'Expense'].includes(coa.type) ? 'Debit' : 'Credit'
      };
    });

    balances['1000'] = { debit: 0, credit: 0, normalBalance: 'Debit' };

    transactions.forEach(t => {
      if (t.type === 'Income') {
        balances['1000'].debit += t.amount;
        
        if (t.accountCode) {
           if (!balances[t.accountCode]) balances[t.accountCode] = { debit: 0, credit: 0, normalBalance: 'Credit' };
           balances[t.accountCode].credit += t.amount;
        }
      } else {
        balances['1000'].credit += t.amount;

        if (t.accountCode) {
           if (!balances[t.accountCode]) balances[t.accountCode] = { debit: 0, credit: 0, normalBalance: 'Debit' };
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
        name: code === '1000' ? 'Kas & Bank' : (coasList.find(c => c.code === code)?.name || 'Tanpa Kategori'),
        debit: finalDebit,
        credit: finalCredit,
      };
    }).filter(r => r.debit > 0 || r.credit > 0)
      .sort((a, b) => a.code.localeCompare(b.code));

    const totalDebit = rows.reduce((acc, r) => acc + r.debit, 0);
    const totalCredit = rows.reduce((acc, r) => acc + r.credit, 0);

    return { rows, totalDebit, totalCredit };
  }, [transactions, coasList]);

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
    
    exportToPDF(title, headers, rows);
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
    
    exportToExcel('Neraca_Saldo', data);
  };

  const isBalanced = trialBalanceData.totalDebit === trialBalanceData.totalCredit;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
