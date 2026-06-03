import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { exportToPDF, exportToExcel, formatRp } from '../lib/export';
import { Download, ChevronRight } from 'lucide-react';
import { getMergedCOA } from '../data/coa';

type CategoryMap = Record<string, Record<string, number>>;

export default function FinancialReports({ transactions }: { transactions: Transaction[] }) {
  const units = useMemo(() => {
    const list = new Set(transactions.map(t => t.unit || 'Umum / Lainnya'));
    return Array.from(list).sort();
  }, [transactions]);

  const coasList = useMemo(() => getMergedCOA(), []);

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

    transactions.forEach(t => {
      const u = t.unit || 'Umum / Lainnya';
      const coa = coasList.find(c => c.code === t.accountCode);
      
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

      const addAmount = (map: CategoryMap) => {
        if (!map[mainCat]) map[mainCat] = {};
        map[mainCat][subCat] = (map[mainCat][subCat] || 0) + t.amount;
      };

      // Unit specific
      if (t.type === 'Income') {
        addAmount(data[u].income);
        data[u].totalIncome += t.amount;
        data[u].netProfit += t.amount;
      } else {
        addAmount(data[u].expense);
        data[u].totalExpense += t.amount;
        data[u].netProfit -= t.amount;
      }

      // Consolidation
      if (t.type === 'Income') {
        addAmount(data['Konsolidasi'].income);
        data['Konsolidasi'].totalIncome += t.amount;
        data['Konsolidasi'].netProfit += t.amount;
      } else {
        addAmount(data['Konsolidasi'].expense);
        data['Konsolidasi'].totalExpense += t.amount;
        data['Konsolidasi'].netProfit -= t.amount;
      }
    });

    return data;
  }, [transactions, units, coasList]);

  const [selectedUnit, setSelectedUnit] = React.useState<string>('Konsolidasi');

  const currentReport = reportData[selectedUnit];

  const handleExportPDF = () => {
    const rows: string[][] = [];
    rows.push(['PENDAPATAN OPERASIONAL', '']);
    Object.entries(currentReport.income).sort().forEach(([mainCat, subCats]) => {
      rows.push([mainCat, '']);
      Object.entries(subCats).sort().forEach(([subCat, amount]) => {
        rows.push([`    ${subCat}`, formatRp(amount)]);
      });
    });
    rows.push(['Total Pendapatan', formatRp(currentReport.totalIncome)]);
    rows.push(['', '']);
    rows.push(['BIAYA / BEBAN', '']);
    Object.entries(currentReport.expense).sort().forEach(([mainCat, subCats]) => {
      rows.push([mainCat, '']);
      Object.entries(subCats).sort().forEach(([subCat, amount]) => {
        rows.push([`    ${subCat}`, formatRp(amount)]);
      });
    });
    rows.push(['Total Beban', formatRp(currentReport.totalExpense)]);
    rows.push(['', '']);
    rows.push(['LABA (RUGI) BERSIH', formatRp(currentReport.netProfit)]);

    exportToPDF(`Laba Rugi - ${selectedUnit}`, ['Keterangan', 'Jumlah'], rows);
  };

  const handleExportExcel = () => {
    const data: any[] = [];
    data.push({ Keterangan: 'PENDAPATAN OPERASIONAL', Jumlah: '' });
    Object.entries(currentReport.income).sort().forEach(([mainCat, subCats]) => {
      data.push({ Keterangan: mainCat, Jumlah: '' });
      Object.entries(subCats).sort().forEach(([subCat, amount]) => {
        data.push({ Keterangan: `    ${subCat}`, Jumlah: amount });
      });
    });
    data.push({ Keterangan: 'Total Pendapatan', Jumlah: currentReport.totalIncome });
    data.push({ Keterangan: '', Jumlah: '' });
    data.push({ Keterangan: 'BIAYA / BEBAN', Jumlah: '' });
    Object.entries(currentReport.expense).sort().forEach(([mainCat, subCats]) => {
      data.push({ Keterangan: mainCat, Jumlah: '' });
      Object.entries(subCats).sort().forEach(([subCat, amount]) => {
        data.push({ Keterangan: `    ${subCat}`, Jumlah: amount });
      });
    });
    data.push({ Keterangan: 'Total Beban', Jumlah: currentReport.totalExpense });
    data.push({ Keterangan: '', Jumlah: '' });
    data.push({ Keterangan: 'LABA (RUGI) BERSIH', Jumlah: currentReport.netProfit });

    exportToExcel(`Laba_Rugi_${selectedUnit}`, data);
  };

  return (
    <div className="space-y-4">
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

        <div className="p-5 font-sans text-xs">
          {/* Pendapatan */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Pendapatan Operasional</h3>
            <div className="space-y-3">
              {Object.entries(currentReport.income).sort().map(([mainCat, subCats]) => {
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
              {Object.keys(currentReport.income).length === 0 && (
                <div className="text-[10px] text-slate-400 italic px-1">Tidak ada pendapatan tercatat</div>
              )}
            </div>
            <div className="flex justify-between text-slate-900 font-bold mt-4 pt-3 border-t border-slate-200 px-1">
              <span className="text-[10px] uppercase text-slate-500">Total Pendapatan</span>
              <span className="text-blue-600">{formatRp(currentReport.totalIncome)}</span>
            </div>
          </div>

          {/* Pengeluaran */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Biaya / Beban</h3>
            <div className="space-y-3">
              {Object.entries(currentReport.expense).sort().map(([mainCat, subCats]) => {
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
              {Object.keys(currentReport.expense).length === 0 && (
                <div className="text-[10px] text-slate-400 italic px-1">Tidak ada pengeluaran tercatat</div>
              )}
            </div>
            <div className="flex justify-between text-slate-900 font-bold mt-4 pt-3 border-t border-slate-200 px-1">
              <span className="text-[10px] uppercase text-slate-500">Total Beban</span>
              <span className="text-red-500">{formatRp(currentReport.totalExpense)}</span>
            </div>
          </div>

          {/* Laba Bersih */}
          <div className={`p-4 rounded border flex justify-between items-center mt-6 ${currentReport.netProfit >= 0 ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-red-50/50 border-red-200 text-red-800'}`}>
            <span className="text-xs font-bold uppercase tracking-wider">Laba (Rugi) Bersih {selectedUnit !== 'Konsolidasi' ? selectedUnit : ''}</span>
            <span className="text-base font-black tracking-tight">{formatRp(currentReport.netProfit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
