import React, { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../types';
import { cn, formatSafeDate, parseSafeDate } from '../lib/utils';
import { FileSpreadsheet, Download, ShoppingBag } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../lib/export';
import { getMergedCOA } from '../data/coa';

export default function ScorecardPage({ transactions }: { transactions: Transaction[] }) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Only deal with Income (Sales) transactions, excluding Down Payments (Liability 21100) to prevent double entry
  const salesTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        if (t.type !== 'Income' || t.accountCode === '21100') return false;
        const dateOnly = t.date.split('T')[0];
        if (startDate && dateOnly < startDate) return false;
        if (endDate && dateOnly > endDate) return false;
        return true;
      })
      .map(t => {
        let name = t.customerName;
        if (!name && t.description) {
          const match = t.description.match(/a\.n\s+([^,\n]+)/i);
          if (match) {
            name = match[1].trim();
          }
        }
        return {
          ...t,
          customerName: name || '-'
        };
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

  const units = useMemo(() => {
    const list = new Set(salesTransactions.map(t => t.unit || 'Umum / Lainnya'));
    return Array.from(list).sort();
  }, [salesTransactions]);

  const [selectedUnit, setSelectedUnit] = useState<string>(units[0] || 'Umum / Lainnya');

  useEffect(() => {
    if (units.length > 0 && !units.includes(selectedUnit)) {
      setSelectedUnit(units[0]);
    }
  }, [units, selectedUnit]);

  const coasList = useMemo(() => getMergedCOA(), []);

  const unitSales = useMemo(() => {
    return salesTransactions
      .filter(t => (t.unit || 'Umum / Lainnya') === selectedUnit)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // chronological
  }, [salesTransactions, selectedUnit]);

  const stats = useMemo(() => {
    let totalSales = 0;
    const count = unitSales.length;

    unitSales.forEach(t => {
      totalSales += t.amount;
    });

    const average = count > 0 ? totalSales / count : 0;

    return { totalSales, count, average };
  }, [unitSales]);

  const formatRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

  const handleExportPDF = () => {
    let runningBalance = 0;
    const rows = unitSales.map(t => {
      runningBalance += t.amount;
      return [
        formatSafeDate(t.date, 'dd/MM/yyyy'),
        t.transactionNumber || '-',
        t.customerName || '-',
        t.description,
        `[${t.accountCode || '-'}] ${t.accountName || ''}`,
        formatRp(t.amount),
        formatRp(runningBalance)
      ];
    });

    exportToPDF(
      `Kartu Penjualan - ${selectedUnit}`,
      ['Tanggal', 'No. Transaksi', 'Pelanggan', 'Keterangan', 'Akun/CoA', 'Nominal', 'Akumulasi'],
      rows,
      periodInfo
    );
  };

  const handleExportExcel = () => {
    let runningBalance = 0;
    const data = unitSales.map(t => {
      runningBalance += t.amount;
      return {
        Tanggal: formatSafeDate(t.date, 'dd/MM/yyyy'),
        'No. Transaksi': t.transactionNumber || '',
        Pelanggan: t.customerName || '',
        Keterangan: t.description,
        'Akun/CoA': `[${t.accountCode || '-'}] ${t.accountName || ''}`,
        Nominal: t.amount,
        Akumulasi: runningBalance
      };
    });

    exportToExcel(`Kartu_Penjualan_${selectedUnit}`, data, periodInfo);
  };

  return (
    <div className="space-y-4 max-w-5xl text-left">
      {/* Title */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            Kartu Penjualan Barang & Jasa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lacak riwayat penjualan (penerimaan pendapatan) khusus untuk setiap item Barang & Jasa.
          </p>
        </div>
      </div>

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

      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {units.length === 0 ? (
          <span className="text-xs text-slate-400 italic bg-white px-3 py-1.5 rounded border border-slate-200">
            Belum ada Barang & Jasa yang tercatat penjualannya
          </span>
        ) : (
          units.map(unit => (
            <button
              key={unit}
              onClick={() => setSelectedUnit(unit)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded text-xs font-bold transition-all shadow-sm",
                selectedUnit === unit
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              )}
            >
              {unit}
            </button>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Penjualan</p>
          <p className="text-lg font-black text-slate-800 mt-1">{formatRp(stats.totalSales)}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-green-500">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Volume Transaksi</p>
          <p className="text-lg font-black text-slate-800 mt-1">{stats.count} Transaksi</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Rata-Rata Penjualan</p>
          <p className="text-lg font-black text-slate-800 mt-1">{formatRp(stats.average)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-600">
            <FileSpreadsheet className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Detail Buku Penjualan</h3>
            <span className="ml-2 text-[10px] bg-white border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-500 uppercase">{selectedUnit}</span>
          </div>
          {unitSales.length > 0 && (
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
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-3 font-bold w-28">Tanggal</th>
                <th className="px-4 py-3 font-bold w-36">No. Transaksi</th>
                <th className="px-4 py-3 font-bold w-40">Pelanggan</th>
                <th className="px-4 py-3 font-bold">Keterangan</th>
                <th className="px-4 py-3 font-bold w-48">Akun / CoA</th>
                <th className="px-4 py-3 font-bold text-right w-32">Nominal</th>
                <th className="px-4 py-3 font-bold text-right w-36">Akumulasi</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {unitSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                    Belum ada riwayat penjualan untuk Barang & Jasa ini.
                  </td>
                </tr>
              ) : (
                (() => {
                  let runningBalance = 0;
                  return unitSales.map(t => {
                    runningBalance += t.amount;
                    return (
                      <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                          {formatSafeDate(t.date, 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-2 text-slate-600 font-mono text-[10px]">
                          {t.transactionNumber || '-'}
                        </td>
                        <td className="px-4 py-2 text-slate-700 font-medium">
                          {t.customerName || '-'}
                        </td>
                        <td className="px-4 py-2 text-slate-900 font-medium">{t.description}</td>
                        <td className="px-4 py-2 text-slate-600">
                          <div className="flex flex-col">
                            <span className="font-bold text-[9px] text-slate-400">{t.accountCode || '-'}</span>
                            <span className="truncate max-w-[170px]">{t.accountName || 'Pendapatan'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-blue-600">
                          {formatRp(t.amount)}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-800 bg-slate-50/20">
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
