import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { Calendar, CheckCircle, Phone, LogOut } from 'lucide-react';
import { getMergedCOA } from '../data/coa';
import { formatSafeDate, parseSafeDate } from '../lib/utils';

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export default function Dashboard({ 
  transactions,
  onCheckoutClick,
  currentProject,
  onProjectChange
}: { 
  transactions: Transaction[];
  onCheckoutClick?: (dpId: string) => void;
  currentProject?: 'Pariwisata' | 'Properti' | 'Konsolidasi';
  onProjectChange?: (project: 'Pariwisata' | 'Properti' | 'Konsolidasi') => void;
}) {
  const coasList = useMemo(() => getMergedCOA(), []);

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
      const coa = coasList.find(c => c.code === t.accountCode);
      let isIncome = false;
      let isExpense = false;
      
      if (coa) {
        if (['REVE', 'OINC'].includes(coa.type)) isIncome = true;
        else if (['EXPS', 'COGS', 'OEXP', 'DEPR'].includes(coa.type)) isExpense = true;
      } else {
        const code = t.accountCode || '';
        if (!code.startsWith('1') && !code.startsWith('2') && !code.startsWith('3')) {
          if (t.type === 'Income') isIncome = true;
          if (t.type === 'Expense') isExpense = true;
        }
      }

      if (isIncome) totalIncome += t.amount;
      if (isExpense) totalExpense += t.amount;
    });

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [transactions, coasList]);

  const chartData = useMemo(() => {
    const dataByDate: Record<string, { income: number; expense: number }> = {};
    
    transactions.forEach(t => {
      const dateStr = (t.date || '').split('T')[0] || 'Unknown';
      if (!dataByDate[dateStr]) dataByDate[dateStr] = { income: 0, expense: 0 };
      
      const coa = coasList.find(c => c.code === t.accountCode);
      let isIncome = false;
      let isExpense = false;
      
      if (coa) {
        if (['REVE', 'OINC'].includes(coa.type)) isIncome = true;
        else if (['EXPS', 'COGS', 'OEXP', 'DEPR'].includes(coa.type)) isExpense = true;
      } else {
        const code = t.accountCode || '';
        if (!code.startsWith('1') && !code.startsWith('2') && !code.startsWith('3')) {
          if (t.type === 'Income') isIncome = true;
          if (t.type === 'Expense') isExpense = true;
        }
      }

      if (isIncome) dataByDate[dateStr].income += t.amount;
      if (isExpense) dataByDate[dateStr].expense += t.amount;
    });

    return Object.keys(dataByDate).sort().map(date => ({
      date: date === 'Unknown' ? 'Unknown' : formatSafeDate(date, 'dd MMM'),
      Pemasukan: dataByDate[date].income,
      Pengeluaran: dataByDate[date].expense,
    }));
  }, [transactions, coasList]);

  const unitData = useMemo(() => {
    const data: Record<string, { name: string; income: number; expense: number; profit: number }> = {};
    transactions.forEach(t => {
      const u = t.unit || 'Umum';
      if (!data[u]) data[u] = { name: u, income: 0, expense: 0, profit: 0 };
      
      const coa = coasList.find(c => c.code === t.accountCode);
      let isIncome = false;
      let isExpense = false;
      
      if (coa) {
        if (['REVE', 'OINC'].includes(coa.type)) isIncome = true;
        else if (['EXPS', 'COGS', 'OEXP', 'DEPR'].includes(coa.type)) isExpense = true;
      } else {
        const code = t.accountCode || '';
        if (!code.startsWith('1') && !code.startsWith('2') && !code.startsWith('3')) {
          if (t.type === 'Income') isIncome = true;
          if (t.type === 'Expense') isExpense = true;
        }
      }

      if (isIncome) {
        data[u].income += t.amount;
        data[u].profit += t.amount;
      }
      if (isExpense) {
        data[u].expense += t.amount;
        data[u].profit -= t.amount;
      }
    });
    return Object.values(data);
  }, [transactions, coasList]);

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const todayStr = formatSafeDate(new Date(), 'yyyy-MM-dd');
      const coStr = formatSafeDate(dateStr, 'yyyy-MM-dd');
      return coStr < todayStr;
    } catch (e) {
      return false;
    }
  };

  const todayCheckouts = useMemo(() => {
    const todayStr = formatSafeDate(new Date(), 'yyyy-MM-dd');
    const matchTxs = transactions.filter(t => {
      if (t.status !== 'down_payment' || !t.checkOutDate) return false;
      try {
        const coStr = formatSafeDate(t.checkOutDate, 'yyyy-MM-dd');
        return coStr <= todayStr;
      } catch (e) {
        return false;
      }
    });

    const groups: Record<string, {
      id: string;
      customerName: string;
      customerPhone?: string;
      checkOutDate?: string;
      transactionNumber?: string;
      units: string[];
      hasAddon: boolean;
      amount: number;
      addonsList: string[];
    }> = {};

    matchTxs.forEach(t => {
      const key = (t.customerName || '').trim().toLowerCase();
      if (!key) return;

      const isAddon = (t.description || '').startsWith('[Add-on]');
      const addonName = isAddon 
        ? t.description.replace('[Add-on] ', '').split(' a.n ')[0]
        : '';

      if (!groups[key]) {
        groups[key] = {
          id: t.id,
          customerName: t.customerName || '',
          customerPhone: t.customerPhone,
          checkOutDate: t.checkOutDate,
          transactionNumber: t.transactionNumber || t.id,
          units: isAddon ? [] : (t.unit ? [t.unit] : []),
          hasAddon: isAddon,
          amount: 0,
          addonsList: isAddon && addonName ? [addonName] : []
        };
      } else {
        if (!isAddon && t.unit && !groups[key].units.includes(t.unit)) {
          groups[key].units.push(t.unit);
        }
        if (isAddon) {
          groups[key].hasAddon = true;
          if (addonName && !groups[key].addonsList.includes(addonName)) {
            groups[key].addonsList.push(addonName);
          }
        }
      }
      groups[key].amount += t.amount;

      if (t.checkOutDate && (!groups[key].checkOutDate || t.checkOutDate < groups[key].checkOutDate)) {
        groups[key].checkOutDate = t.checkOutDate;
      }
    });

    return Object.values(groups).sort((a, b) => {
      // Put overdue checkouts at the top
      return new Date(a.checkOutDate!).getTime() - new Date(b.checkOutDate!).getTime();
    });
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* Project selector dropdown (dashboard-local) */}
      {currentProject && onProjectChange && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center text-left select-none">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Pilih Proyek Aktif</h3>
              <p className="text-[10px] text-slate-400 font-medium">Saring statistik dashboard berdasarkan lingkup proyek</p>
            </div>
          </div>
          <select
            value={currentProject}
            onChange={(e) => onProjectChange(e.target.value as any)}
            className="w-full sm:w-64 bg-slate-50 border border-slate-300 text-slate-800 py-1.5 px-3 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
          >
            <option value="Konsolidasi">📂 Konsolidasi (Semua Proyek)</option>
            <option value="Pariwisata">🌴 Proyek Pariwisata</option>
            <option value="Properti">🏡 Proyek Properti</option>
          </select>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded-lg border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm hover:shadow transition-all duration-200">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Total Pemasukan</p>
          <p className="text-xl font-black text-emerald-600 mt-1">Rp {stats.totalIncome.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 border-l-4 border-l-rose-500 shadow-sm hover:shadow transition-all duration-200">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Total Pengeluaran</p>
          <p className="text-xl font-black text-rose-600 mt-1">Rp {stats.totalExpense.toLocaleString('id-ID')}</p>
        </div>
        <div className={`bg-white p-3 rounded-lg border border-slate-200 border-l-4 shadow-sm hover:shadow transition-all duration-200 ${stats.balance >= 0 ? 'border-l-blue-500' : 'border-l-rose-600'}`}>
          <p className="text-[10px] text-slate-500 uppercase font-bold">Arus Kas Bersih</p>
          <p className={`text-xl font-black mt-1 ${stats.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
            Rp {stats.balance.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 border-l-4 border-l-amber-500 shadow-sm hover:shadow transition-all duration-200">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Status Data</p>
          <p className="text-xl font-black text-amber-600 mt-1">Real-time</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Sinkronisasi data aktif</p>
        </div>
      </div>

      {/* Checkout Reminders Panel */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded bg-amber-50 text-amber-600">
              <Calendar className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Pengingat & Antrean Checkout</h3>
          </div>
          {todayCheckouts.length > 0 && (
            <span className={`text-[10px] font-bold rounded px-2 py-0.5 uppercase ${
              todayCheckouts.some(dp => isOverdue(dp.checkOutDate)) 
                ? 'bg-rose-100 text-rose-800 animate-pulse' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {todayCheckouts.length} Tamu / Layanan
            </span>
          )}
        </div>
        <div className="p-4">
          {todayCheckouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="pb-2 font-bold">Nama Tamu</th>
                    <th className="pb-2 font-bold">Barang & Jasa</th>
                    <th className="pb-2 font-bold">Keterangan Add-on</th>
                    <th className="pb-2 font-bold">Uang Muka (DP)</th>
                    <th className="pb-2 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {todayCheckouts.map((dp) => (
                    <tr key={dp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-[10px]">
                          {dp.customerName ? dp.customerName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{dp.customerName || 'Tidak ada nama'}</span>
                            {isOverdue(dp.checkOutDate) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                                ⚠️ Terlewat! Segera Selesaikan
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5">
                            {dp.transactionNumber && <span className="font-mono">{dp.transactionNumber}</span>}
                            {dp.customerPhone && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{dp.customerPhone}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>Checkout: {dp.checkOutDate ? formatSafeDate(dp.checkOutDate, 'dd MMM yyyy') : '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-600 font-medium">
                        {dp.units.length > 0 ? dp.units.join(', ') : 'Umum'}
                        {dp.hasAddon && ' + Add-on'}
                      </td>
                      <td className="py-2.5 text-slate-600 font-medium">
                        {dp.addonsList && dp.addonsList.length > 0 ? (
                          dp.addonsList.join(', ')
                        ) : (
                          <span className="text-slate-400 italic font-normal">-</span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-800 font-bold">Rp {dp.amount.toLocaleString('id-ID')}</td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => onCheckoutClick && onCheckoutClick(dp.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded font-bold text-[10px] uppercase transition-all duration-150 shadow-sm cursor-pointer"
                        >
                          <LogOut className="w-3 h-3 rotate-180" />
                          Proses Checkout
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-xs font-bold text-slate-700">Semua Tamu Selesai</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tidak ada tamu yang dijadwalkan checkout hari ini atau terlewat.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Trend Chart */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Tren Arus Kas Harian</h3>
          </div>
          <div className="h-64 w-full p-4 bg-slate-50/50">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value/1000000).toFixed(1)}M`} />
                  <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', fontSize: '10px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Belum ada data transaksi</div>
            )}
          </div>
        </div>

        {/* Barang & Jasa Performance */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Laba Rugi per Barang & Jasa</h3>
          </div>
          <div className="h-64 w-full p-4 bg-slate-50/50">
            {unitData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value/1000000).toFixed(1)}M`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', fontSize: '10px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="profit" name="Laba Bersih" radius={[4, 4, 0, 0]}>
                    {unitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Belum ada data barang & jasa</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
