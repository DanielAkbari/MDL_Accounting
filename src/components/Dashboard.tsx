import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function Dashboard({ transactions }: { transactions: Transaction[] }) {
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
      if (t.type === 'Income') totalIncome += t.amount;
      if (t.type === 'Expense') totalExpense += t.amount;
    });

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [transactions]);

  const chartData = useMemo(() => {
    const dataByDate: Record<string, { income: number; expense: number }> = {};
    
    transactions.forEach(t => {
      const dateStr = t.date.split('T')[0];
      if (!dataByDate[dateStr]) dataByDate[dateStr] = { income: 0, expense: 0 };
      if (t.type === 'Income') dataByDate[dateStr].income += t.amount;
      if (t.type === 'Expense') dataByDate[dateStr].expense += t.amount;
    });

    return Object.keys(dataByDate).sort().map(date => ({
      date: format(parseISO(date), 'dd MMM'),
      Pemasukan: dataByDate[date].income,
      Pengeluaran: dataByDate[date].expense,
    }));
  }, [transactions]);

  const unitData = useMemo(() => {
    const data: Record<string, { name: string; income: number; expense: number; profit: number }> = {};
    transactions.forEach(t => {
      const u = t.unit || 'Umum';
      if (!data[u]) data[u] = { name: u, income: 0, expense: 0, profit: 0 };
      if (t.type === 'Income') {
        data[u].income += t.amount;
        data[u].profit += t.amount;
      }
      if (t.type === 'Expense') {
        data[u].expense += t.amount;
        data[u].profit -= t.amount;
      }
    });
    return Object.values(data);
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Total Pemasukan</p>
          <p className="text-xl font-black text-slate-800 mt-1">Rp {stats.totalIncome.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Total Pengeluaran</p>
          <p className="text-xl font-black text-slate-800 mt-1">Rp {stats.totalExpense.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Arus Kas Bersih</p>
          <p className={`text-xl font-black mt-1 ${stats.balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            Rp {stats.balance.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-orange-400">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Status Data</p>
          <p className="text-xl font-black text-slate-800 mt-1">Real-time</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Sinkronisasi G-Sheet</p>
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
                  <Line type="monotone" dataKey="Pemasukan" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Belum ada data transaksi</div>
            )}
          </div>
        </div>

        {/* Unit Performance */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Laba Rugi per Unit Usaha</h3>
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
                  <Bar dataKey="profit" name="Laba Bersih" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Belum ada data unit</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
