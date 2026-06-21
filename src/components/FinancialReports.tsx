import React, { useMemo } from 'react';
import { Transaction, BusinessUnit } from '../types';
import { exportToPDF, exportToExcel, formatRp } from '../lib/export';
import { Download, ChevronRight, Sparkles } from 'lucide-react';
import { COA } from '../data/coa';

type CategoryMap = Record<string, Record<string, number>>;

export default function FinancialReports({ 
  transactions,
  coaList,
  currentProject,
  onProjectChange,
  onAnalyzeWithAI,
  allUnits
}: { 
  transactions: Transaction[];
  coaList: COA[];
  currentProject?: 'Pariwisata' | 'Properti' | 'Konsolidasi';
  onProjectChange?: (project: 'Pariwisata' | 'Properti' | 'Konsolidasi') => void;
  onAnalyzeWithAI?: (prompt: string) => void;
  allUnits: BusinessUnit[];
}) {
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');

  const filteredTxsForReports = useMemo(() => {
    return transactions.filter(t => {
      const dateOnly = t.date.split('T')[0];
      if (startDate && dateOnly < startDate) return false;
      if (endDate && dateOnly > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const units = useMemo(() => {
    const activeUnits = new Set(filteredTxsForReports.map(t => t.unit).filter(Boolean));
    const definedUnits = (allUnits || [])
      .filter(u => u.name !== 'Umum / Lainnya')
      .filter(u => {
        if (currentProject && currentProject !== 'Konsolidasi' && u.project !== currentProject) return false;
        return true;
      })
      .map(u => u.name);
    definedUnits.forEach(u => activeUnits.add(u));
    const hasEmptyUnit = filteredTxsForReports.some(t => !t.unit);
    if (hasEmptyUnit) {
      activeUnits.add('Umum / Lainnya');
    }
    return Array.from(activeUnits).sort();
  }, [filteredTxsForReports, currentProject, allUnits]);

  const coasList = coaList;

  const reportData = useMemo(() => {
    const data: Record<string, {
      income: CategoryMap,
      expense: CategoryMap,
      totalIncome: number,
      totalExpense: number,
      netProfit: number
    }> = {};

    ['Konsolidasi', ...units].forEach(u => {
      data[u] = { income: {}, expense: {}, totalIncome: 0, totalExpense: 0, netProfit: 0 };
    });

    filteredTxsForReports.forEach(t => {
      const u = t.unit || 'Umum / Lainnya';
      const coa = coasList.find(c => c.code === t.accountCode);
      
      let isIncomeAccount = false;
      let isExpenseAccount = false;
      
      if (coa) {
        if (['REVE', 'OINC'].includes(coa.type)) {
          isIncomeAccount = true;
        } else if (['EXPS', 'COGS', 'OEXP', 'DEPR'].includes(coa.type)) {
          isExpenseAccount = true;
        } else {
          return;
        }
      } else {
        const code = t.accountCode || '';
        if (code.startsWith('1') || code.startsWith('2') || code.startsWith('3')) {
          return;
        }
        if (t.type === 'Income') {
          isIncomeAccount = true;
        } else {
          isExpenseAccount = true;
        }
      }

      let mainCat = 'Lain-Lain';
      let subCat = t.accountName || (t as any).category || 'Tanpa Akun (Uncategorized)';

      if (coa) {
        if (coa.parentCode) {
          const parent = coasList.find(c => c.code === coa.parentCode);
          if (parent) {
            mainCat = parent.name;
          }
          subCat = coa.name;
        } else {
          mainCat = coa.name;
          subCat = coa.name;
        }
      } else {
        if (t.accountName) {
          mainCat = 'Lain-Lain';
          subCat = t.accountName;
        }
      }

      const val = t.amount;

      const addAmount = (map: CategoryMap, cat: string, sub: string, amount: number) => {
        if (!map[cat]) map[cat] = {};
        map[cat][sub] = (map[cat][sub] || 0) + amount;
      };

      if (isIncomeAccount) {
        const netAmt = t.type === 'Income' ? val : -val;
        
        addAmount(data[u].income, mainCat, subCat, netAmt);
        data[u].totalIncome += netAmt;
        data[u].netProfit += netAmt;

        addAmount(data['Konsolidasi'].income, mainCat, subCat, netAmt);
        data['Konsolidasi'].totalIncome += netAmt;
        data['Konsolidasi'].netProfit += netAmt;
      } else if (isExpenseAccount) {
        const netAmt = t.type === 'Expense' ? val : -val;

        addAmount(data[u].expense, mainCat, subCat, netAmt);
        data[u].totalExpense += netAmt;
        data[u].netProfit -= netAmt;

        addAmount(data['Konsolidasi'].expense, mainCat, subCat, netAmt);
        data['Konsolidasi'].totalExpense += netAmt;
        data['Konsolidasi'].netProfit -= netAmt;
      }
    });

    return data;
  }, [filteredTxsForReports, units, coasList]);

  const [selectedUnit, setSelectedUnit] = React.useState<string>('Konsolidasi');

  const currentReport = reportData[selectedUnit] || { income: {}, expense: {}, totalIncome: 0, totalExpense: 0, netProfit: 0 };

  const filteredIncome = currentReport.income;
  const filteredExpense = currentReport.expense;

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

  const highestProfitUnit = useMemo(() => {
    let maxProfit = -Infinity;
    let bestUnit = '';
    units.forEach(u => {
      const net = reportData[u]?.netProfit || 0;
      if (net > maxProfit && net > 0) {
        maxProfit = net;
        bestUnit = u;
      }
    });
    return bestUnit;
  }, [units, reportData]);

  const handleExportPDF = () => {
    const rows: string[][] = [];
    rows.push(['PENDAPATAN OPERASIONAL', '']);
    Object.entries(filteredIncome).sort().forEach(([mainCat, subCats]) => {
      rows.push([mainCat, '']);
      Object.entries(subCats).sort().forEach(([subCat, amount]) => {
        rows.push([`    ${subCat}`, formatRp(amount)]);
      });
    });
    rows.push(['Total Pendapatan', formatRp(currentReport.totalIncome)]);
    rows.push(['', '']);
    rows.push(['BIAYA / BEBAN', '']);
    Object.entries(filteredExpense).sort().forEach(([mainCat, subCats]) => {
      rows.push([mainCat, '']);
      Object.entries(subCats).sort().forEach(([subCat, amount]) => {
        rows.push([`    ${subCat}`, formatRp(amount)]);
      });
    });
    rows.push(['Total Beban', formatRp(currentReport.totalExpense)]);
    rows.push(['', '']);
    rows.push(['LABA (RUGI) BERSIH', formatRp(currentReport.netProfit)]);

    exportToPDF(`Laba Rugi - ${selectedUnit}`, ['Keterangan', 'Jumlah'], rows, periodInfo);
  };

  const handleExportExcel = () => {
    const data: any[] = [];
    data.push({ Keterangan: 'PENDAPATAN OPERASIONAL', Jumlah: '' });
    Object.entries(filteredIncome).sort().forEach(([mainCat, subCats]) => {
      data.push({ Keterangan: mainCat, Jumlah: '' });
      Object.entries(subCats).sort().forEach(([subCat, amount]) => {
        data.push({ Keterangan: `    ${subCat}`, Jumlah: amount });
      });
    });
    data.push({ Keterangan: 'Total Pendapatan', Jumlah: currentReport.totalIncome });
    data.push({ Keterangan: '', Jumlah: '' });
    data.push({ Keterangan: 'BIAYA / BEBAN', Jumlah: '' });
    Object.entries(filteredExpense).sort().forEach(([mainCat, subCats]) => {
      data.push({ Keterangan: mainCat, Jumlah: '' });
      Object.entries(subCats).sort().forEach(([subCat, amount]) => {
        data.push({ Keterangan: `    ${subCat}`, Jumlah: amount });
      });
    });
    data.push({ Keterangan: 'Total Beban', Jumlah: currentReport.totalExpense });
    data.push({ Keterangan: '', Jumlah: '' });
    data.push({ Keterangan: 'LABA (RUGI) BERSIH', Jumlah: currentReport.netProfit });

    exportToExcel(`Laba_Rugi_${selectedUnit}`, data, periodInfo);
  };

  return (
    <div className="space-y-4">
      {/* Project selector dropdown (reports-local) */}
      {currentProject && onProjectChange && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Proyek Laporan</h3>
            <p className="text-[10px] text-slate-400 font-medium">Saring data laporan keuangan berdasarkan proyek aktif</p>
          </div>
          <select
            value={currentProject}
            onChange={(e) => onProjectChange(e.target.value as any)}
            className="w-full sm:w-64 bg-slate-50 border border-slate-300 text-slate-800 py-1.5 px-3 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
          >
            <option value="Konsolidasi">📂 Laporan Konsolidasi (Semua)</option>
            <option value="Pariwisata">🌴 Laporan Pariwisata</option>
            <option value="Properti">🏡 Laporan Properti</option>
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

      <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {['Konsolidasi', ...units].map(unit => (
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

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden max-w-4xl flex flex-col">
        <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Laporan Laba Rugi</h2>
            <span className="text-[10px] bg-white border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-500 uppercase">{selectedUnit}</span>
          </div>
          <div className="flex items-center gap-2">
            {onAnalyzeWithAI && (
              <button 
                onClick={() => {
                  const promptText = `Beri analisis laporan Laba Rugi (P&L) untuk unit/proyek "${selectedUnit}" (${periodInfo}). 
Berikut adalah rangkuman keuangannya:
- Total Pendapatan: ${formatRp(currentReport.totalIncome)}
- Total Beban/Biaya: ${formatRp(currentReport.totalExpense)}
- Laba Bersih: ${formatRp(currentReport.netProfit)}

Berikan evaluasi kesehatan finansial perusahaan berdasarkan margin profit, rasio pengeluaran, dan berikan 3 poin rekomendasi tindakan nyata untuk meningkatkan performa bisnis ini.`;
                  onAnalyzeWithAI(promptText);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-[10px] uppercase font-bold rounded shadow-sm transition cursor-pointer border-0"
              >
                <Sparkles className="w-3 h-3" />
                Analisis AI
              </button>
            )}
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] uppercase font-bold rounded shadow-sm transition cursor-pointer border-0">
              <Download className="w-3 h-3" />
              Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase font-bold rounded shadow-sm transition cursor-pointer border-0">
              <Download className="w-3 h-3" />
              PDF
            </button>
          </div>
        </div>

        <div className="p-5 font-sans text-xs border-0">
          {/* Pendapatan */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Pendapatan Operasional</h3>
            <div className="space-y-3">
              {Object.entries(filteredIncome).sort().map(([mainCat, subCats]) => {
                const isSingleMatch = Object.keys(subCats).length === 1 && Object.keys(subCats)[0] === mainCat;
                const mainTotal = Object.values(subCats).reduce((acc, v) => acc + v, 0);

                if (isSingleMatch) {
                  return (
                    <div key={mainCat} className="flex justify-between items-start text-slate-800 py-1 font-bold">
                      <span className="truncate pr-4 flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        {mainCat}
                      </span>
                      <span className="whitespace-nowrap">{formatRp(mainTotal)}</span>
                    </div>
                  );
                }

                return (
                  <div key={mainCat} className="rounded border border-slate-100 overflow-hidden">
                    <div className="flex justify-between items-start bg-slate-50 text-slate-800 px-3 py-2 font-bold border-b border-slate-100">
                      <span className="truncate pr-4 flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                        {mainCat}
                      </span>
                      <span className="whitespace-nowrap text-xs">{formatRp(mainTotal)}</span>
                    </div>
                    <div className="bg-white divide-y divide-slate-50">
                      {Object.entries(subCats).sort().map(([subCat, amount]) => (
                        <div key={subCat} className="flex justify-between items-center text-slate-600 py-1.5 px-3 hover:bg-slate-50 pl-8">
                          <span className="truncate pr-4">— {subCat}</span>
                          <span className="whitespace-nowrap text-xs">{formatRp(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(filteredIncome).length === 0 && (
                <div className="text-[10px] text-slate-400 italic px-1">Tidak ada pendapatan tercatat</div>
              )}
            </div>
            <div className="flex justify-between text-slate-900 font-bold mt-4 pt-3 border-t border-slate-200 px-1">
              <span className="text-[10px] uppercase text-slate-500 font-sans">Total Pendapatan</span>
              <span className="text-blue-600">{formatRp(currentReport.totalIncome)}</span>
            </div>
          </div>

          {/* Pengeluaran */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Biaya / Beban</h3>
            <div className="space-y-3">
              {Object.entries(filteredExpense).sort().map(([mainCat, subCats]) => {
                const isSingleMatch = Object.keys(subCats).length === 1 && Object.keys(subCats)[0] === mainCat;
                const mainTotal = Object.values(subCats).reduce((acc, v) => acc + v, 0);

                if (isSingleMatch) {
                  return (
                    <div key={mainCat} className="flex justify-between items-start text-slate-800 py-1 font-bold">
                      <span className="truncate pr-4 flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        {mainCat}
                      </span>
                      <span className="whitespace-nowrap">{formatRp(mainTotal)}</span>
                    </div>
                  );
                }

                return (
                  <div key={mainCat} className="rounded border border-slate-100 overflow-hidden">
                    <div className="flex justify-between items-start bg-slate-50 text-slate-800 px-3 py-2 font-bold border-b border-slate-100">
                      <span className="truncate pr-4 flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                        {mainCat}
                      </span>
                      <span className="whitespace-nowrap text-xs">{formatRp(mainTotal)}</span>
                    </div>
                    <div className="bg-white divide-y divide-slate-50">
                      {Object.entries(subCats).sort().map(([subCat, amount]) => (
                        <div key={subCat} className="flex justify-between items-center text-slate-600 py-1.5 px-3 hover:bg-slate-50 pl-8">
                          <span className="truncate pr-4">— {subCat}</span>
                          <span className="whitespace-nowrap text-xs">{formatRp(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(filteredExpense).length === 0 && (
                <div className="text-[10px] text-slate-400 italic px-1">Tidak ada pengeluaran tercatat</div>
              )}
            </div>
            <div className="flex justify-between text-slate-900 font-bold mt-4 pt-3 border-t border-slate-200 px-1">
              <span className="text-[10px] uppercase text-slate-500 font-sans">Total Beban</span>
              <span className="text-red-500">{formatRp(currentReport.totalExpense)}</span>
            </div>
          </div>

          {/* Laba Bersih */}
          <div className={`p-4 rounded border flex justify-between items-center mt-6 ${currentReport.netProfit >= 0 ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-red-50/50 border-red-200 text-red-800'}`}>
            <span className="text-xs font-bold uppercase tracking-wider font-sans">Laba (Rugi) Bersih {selectedUnit !== 'Konsolidasi' ? selectedUnit : ''}</span>
            <span className="text-base font-black tracking-tight">{formatRp(currentReport.netProfit)}</span>
          </div>
        </div>
      </div>

      {/* Unit Profitability Comparison Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden max-w-4xl flex flex-col">
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-sans">Perbandingan Profitabilitas Antar Barang & Jasa</h2>
          </div>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="pb-2">Barang & Jasa</th>
                <th className="pb-2 text-right font-sans">Total Pendapatan</th>
                <th className="pb-2 text-right font-sans">Total Beban</th>
                <th className="pb-2 text-right font-sans">Laba (Rugi) Bersih</th>
                <th className="pb-2 text-right font-sans">Margin Laba</th>
                <th className="pb-2 text-center font-sans">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {units.map(u => {
                  const data = reportData[u];
                  if (!data) return null;
                  const margin = data.totalIncome > 0 ? (data.netProfit / data.totalIncome) * 100 : 0;
                  const isHighest = u === highestProfitUnit;

                  return (
                    <tr key={u} className={`hover:bg-slate-50/50 transition-colors ${isHighest ? 'bg-green-50/20' : ''}`}>
                      <td className="py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                        {isHighest && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 font-bold uppercase tracking-wide">
                            Terbaik
                          </span>
                        )}
                        {u}
                      </td>
                      <td className="py-2.5 text-right font-medium text-slate-600">{formatRp(data.totalIncome)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-600">{formatRp(data.totalExpense)}</td>
                      <td className={`py-2.5 text-right font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatRp(data.netProfit)}
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {margin.toFixed(1)}%
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => setSelectedUnit(u)}
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition ${
                            selectedUnit === u
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
