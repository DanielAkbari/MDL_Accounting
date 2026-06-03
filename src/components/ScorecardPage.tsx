import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { FileSpreadsheet, Download } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../lib/export';

export default function ScorecardPage({ transactions }: { transactions: Transaction[] }) {
  const units = useMemo(() => {
    const list = new Set(transactions.map(t => t.unit || 'Umum / Lainnya'));
    return Array.from(list).sort();
  }, [transactions]);

  const [selectedUnit, setSelectedUnit] = useState<string>(units[0] || 'Umum / Lainnya');

  const unitTransactions = useMemo(() => {
    return transactions
      .filter(t => (t.unit || 'Umum / Lainnya') === selectedUnit)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // chronological
  }, [transactions, selectedUnit]);

  const stats = useMemo(() => {
    const income = unitTransactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const expense = unitTransactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [unitTransactions]);

  const formatRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

  const handleExportPDF = () => {
    let runningBalance = 0;
    const rows = unitTransactions.map(t => {
      const isIncome = t.type === 'Income';
      runningBalance += isIncome ? t.amount : -t.amount;
      return [
        t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '-',
        `[${t.accountCode || '-'}] ${t.accountName || ''}`,
        t.description,
        isIncome ? formatRp(t.amount) : '-',
        !isIncome ? formatRp(t.amount) : '-',
        formatRp(runningBalance)
      ];
    });

    exportToPDF(`Kartu Pencatatan - ${selectedUnit}`, ['Tanggal', 'Akun/CoA', 'Keterangan', 'Pemasukan', 'Pengeluaran', 'Saldo'], rows);
  };

  const handleExportExcel = () => {
    let runningBalance = 0;
    const data = unitTransactions.map(t => {
      const isIncome = t.type === 'Income';
      runningBalance += isIncome ? t.amount : -t.amount;
      return {
        Tanggal: t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '',
        'Akun/CoA': `[${t.accountCode || '-'}] ${t.accountName || ''}`,
        Keterangan: t.description,
        Pemasukan: isIncome ? t.amount : 0,
        Pengeluaran: !isIncome ? t.amount : 0,
        Saldo: runningBalance
      };
    });

    exportToExcel(`Kartu_Pencatatan_${selectedUnit}`, data);
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {units.map(unit => (
          <button
            key={unit}
            onClick={() => setSelectedUnit(unit)}
            className={`whitespace-nowrap px-4 py-1.5 rounded text-xs font-bold transition-colors ${
              selectedUnit === unit 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {unit}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Pemasukan Unit</p>
          <p className="text-xl font-black text-slate-800 mt-1">{formatRp(stats.income)}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-red-500">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Pengeluaran Unit</p>
          <p className="text-xl font-black text-slate-800 mt-1">{formatRp(stats.expense)}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-green-500">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Kontribusi / Kas Bersih</p>
          <p className={`text-xl font-black mt-1 ${stats.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatRp(stats.net)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-600">
            <FileSpreadsheet className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Kartu Pencatatan Detail</h3>
            <span className="ml-2 text-[10px] bg-white border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-500 uppercase">{selectedUnit}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] uppercase font-bold rounded shadow-sm transition">
              <Download className="w-3 h-3" />
              Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase font-bold rounded shadow-sm transition">
              <Download className="w-3 h-3" />
              PDF
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-2 font-bold w-32">Tanggal</th>
                <th className="px-4 py-2 font-bold w-48">Akun / CoA</th>
                <th className="px-4 py-2 font-bold">Keterangan</th>
                <th className="px-4 py-2 font-bold text-right w-40">Pemasukan</th>
                <th className="px-4 py-2 font-bold text-right w-40">Pengeluaran</th>
                <th className="px-4 py-2 font-bold text-right w-40">Saldo</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {unitTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    Belum ada pencatatan untuk unit ini.
                  </td>
                </tr>
              ) : (
                (() => {
                  let runningBalance = 0;
                  return unitTransactions.map(t => {
                    const isIncome = t.type === 'Income';
                    runningBalance += isIncome ? t.amount : -t.amount;
                    return (
                      <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                          {t.date ? format(parseISO(t.date), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                          <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-slate-400">{t.accountCode || '-'}</span>
                            <span className="truncate max-w-[150px]">{t.accountName || (t as any).category || 'Umum'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-900 font-medium">{t.description}</td>
                        <td className="px-4 py-2 text-right font-medium text-blue-600">
                          {isIncome ? formatRp(t.amount) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-red-500">
                          {!isIncome ? formatRp(t.amount) : '-'}
                        </td>
                        <td className={`px-4 py-2 text-right font-bold ${runningBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                          {formatRp(runningBalance)}
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
