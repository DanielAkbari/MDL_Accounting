import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { addTransaction, deleteTransaction, updateTransaction } from '../lib/apiDb';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Pencil, Loader2, Search, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { getMergedCOA, COA } from '../data/coa';
import CreatableSelect from 'react-select/creatable';
import toast from 'react-hot-toast';

export default function TransactionsPage({ transactions, onRefresh }: { transactions: Transaction[], onRefresh: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

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

  const [coaList, setCoaList] = useState<COA[]>([]);

  useEffect(() => {
    setCoaList(getMergedCOA());
  }, []);

  const incomeAccounts = useMemo(() => coaList.filter(c => ['REVE', 'OINC'].includes(c.type)), [coaList]);
  const expenseAccounts = useMemo(() => coaList.filter(c => ['COGS', 'EXPS', 'OEXP', 'DEPR'].includes(c.type)), [coaList]);

  const [formData, setFormData] = useState({
    type: 'Income' as TransactionType,
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    unit: units[0],
    accountCode: incomeAccounts[0]?.code || '',
    accountName: incomeAccounts[0]?.name || '',
    description: ''
  });

  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState<{id: string, desc: string} | null>(null);

  const resetForm = () => {
    setFormData({
      type: 'Income',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      unit: units[0],
      accountCode: incomeAccounts[0]?.code || '',
      accountName: incomeAccounts[0]?.name || '',
      description: ''
    });
    setEditId(null);
  };

  const filteredTransactions = transactions.filter(t => 
    (t.description || '').toLowerCase().includes(search.toLowerCase()) || 
    (t.accountName || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.accountCode || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.unit || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const txData: Transaction = {
        id: editId || crypto.randomUUID(),
        date: new Date(formData.date).toISOString(),
        type: formData.type,
        amount: parseFloat(formData.amount.replace(/\./g, '')) || 0,
        unit: formData.unit,
        accountCode: formData.accountCode,
        accountName: formData.accountName,
        description: formData.description
      };
      
      if (editId) {
        await updateTransaction(txData);
        toast.success("Transaksi berhasil diubah");
      } else {
        await addTransaction(txData);
        toast.success("Transaksi berhasil ditambahkan");
      }
      
      // Save new custom COA if it doesn't exist
      if (formData.accountCode && !coaList.find(c => c.code === formData.accountCode)) {
        const newCoa: COA = {
          no: Date.now().toString(),
          type: formData.type === 'Income' ? 'REVE' : 'EXPS',
          code: formData.accountCode,
          name: formData.accountName || formData.accountCode,
          isCustom: true
        };
        const updatedCoas = [...getMergedCOA(), newCoa];
        localStorage.setItem('custom_coa', JSON.stringify(updatedCoas.filter(c => c.isCustom)));
        setCoaList(updatedCoas);
      }
      
      setIsModalOpen(false);
      onRefresh();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditId(t.id);
    setFormData({
      type: t.type,
      amount: t.amount ? Number(t.amount).toLocaleString('id-ID') : '',
      date: t.date ? format(parseISO(t.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      unit: t.unit || units[0],
      accountCode: t.accountCode || '',
      accountName: t.accountName || '',
      description: t.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string, desc: string) => {
    setDeleteConfirmInfo({ id, desc });
  };

  const executeDelete = async () => {
    if (deleteConfirmInfo) {
      try {
        await deleteTransaction(deleteConfirmInfo.id);
        setDeleteConfirmInfo(null);
        toast.success("Transaksi berhasil dihapus");
        onRefresh();
      } catch (error) {
        console.error(error);
        toast.error('Gagal menghapus transaksi');
      }
    }
  };

  const handleTypeChange = (type: TransactionType) => {
    const list = type === 'Income' ? incomeAccounts : expenseAccounts;
    setFormData({
      ...formData,
      type,
      accountCode: list[0]?.code || '',
      accountName: list[0]?.name || ''
    });
  };

  const handleAccountChange = (code: string) => {
    const list = formData.type === 'Income' ? incomeAccounts : expenseAccounts;
    const account = list.find(a => a.code === code);
    if (account) {
      setFormData({ ...formData, accountCode: account.code, accountName: account.name });
    }
  };

  const activeAccounts = formData.type === 'Income' ? incomeAccounts : expenseAccounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm shadow-sm"
          />
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm"
        >
          <Plus className="w-5 h-5" />
          Catat Transaksi
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Daftar Transaksi</h3>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-2 font-bold">Tanggal</th>
                <th className="px-4 py-2 font-bold">Unit Usaha</th>
                <th className="px-4 py-2 font-bold">Akun Perkiraan</th>
                <th className="px-4 py-2 font-bold">Keterangan</th>
                <th className="px-4 py-2 font-bold text-right">Jumlah</th>
                <th className="px-4 py-2 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data transaksi.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 text-slate-900 whitespace-nowrap">
                      {format(parseISO(t.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {t.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      <div className="flex flex-col">
                        <span className="font-bold text-[10px] text-slate-400">{t.accountCode || '-'}</span>
                        <span className="truncate max-w-[150px]">{t.accountName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-900 font-medium">{t.description}</td>
                    <td className={cn(
                      "px-4 py-2 text-right font-bold whitespace-nowrap",
                      t.type === 'Income' ? 'text-blue-600' : 'text-red-600'
                    )}>
                      {t.type === 'Income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(t)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(t.id, t.description)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Catat Transaksi Jurnal</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleTypeChange('Income')}
                  className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider", formData.type === 'Income' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('Expense')}
                  className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider", formData.type === 'Expense' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                >
                  Pembayaran / Beban
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Tanggal</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nominal (Rp)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    required
                    placeholder="0"
                    value={formData.amount}
                    onChange={e => {
                      const rawVal = e.target.value.replace(/\D/g, '');
                      const formatted = rawVal ? Number(rawVal).toLocaleString('id-ID') : '';
                      setFormData({...formData, amount: formatted});
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Unit Usaha</label>
                  <CreatableSelect 
                    isClearable
                    value={{ value: formData.unit, label: formData.unit }}
                    onChange={(newValue: any) => setFormData({...formData, unit: newValue?.value || ''})}
                    options={units.map(u => ({ value: u, label: u }))}
                    className="text-slate-900 text-sm"
                    placeholder="Pilih atau ketik baru..."
                    formatCreateLabel={(inputValue) => `Tambahkan unit "${inputValue}"`}
                    styles={{ control: (base) => ({ ...base, minHeight: '42px', borderRadius: '0.375rem', borderColor: '#cbd5e1' }) }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Akun Perkiraan (CoA)</label>
                  <CreatableSelect 
                    isClearable
                    value={{ value: formData.accountCode, label: formData.accountName ? `[${formData.accountCode}] ${formData.accountName}` : formData.accountCode }}
                    onChange={(newValue: any) => {
                      if (newValue) {
                        const existingAccount = activeAccounts.find(a => a.code === newValue.value);
                        if (existingAccount) {
                          setFormData({...formData, accountCode: existingAccount.code, accountName: existingAccount.name});
                        } else {
                          setFormData({...formData, accountCode: newValue.value, accountName: newValue.value});
                        }
                      } else {
                        setFormData({...formData, accountCode: '', accountName: ''});
                      }
                    }}
                    options={activeAccounts.map(a => ({ value: a.code, label: `[${a.code}] ${a.name}` }))}
                    className="text-slate-900 text-sm"
                    placeholder="Pilih atau ketik akun baru..."
                    formatCreateLabel={(inputValue) => `Buat akun CoA "${inputValue}"`}
                    styles={{ control: (base) => ({ ...base, minHeight: '42px', borderRadius: '0.375rem', borderColor: '#cbd5e1' }) }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Keterangan / Memo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Memo transaksi..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { resetForm(); setIsModalOpen(false); }}
                  className="px-4 py-2 text-slate-600 font-bold text-xs uppercase hover:bg-slate-100 rounded transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs uppercase rounded hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Delete Confirmation */}
      {deleteConfirmInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Hapus</h3>
            <p className="text-sm text-slate-600 mb-6">
              Apakah anda yakin menghapus transaksi ini?<br/>
              <span className="font-medium text-slate-800 block mt-2">"{deleteConfirmInfo.desc}"</span>
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setDeleteConfirmInfo(null)}
                className="px-6 py-2 text-slate-600 font-bold text-xs uppercase bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={executeDelete}
                className="px-6 py-2 bg-red-600 text-white font-bold text-xs uppercase rounded hover:bg-red-700 transition-colors shadow-sm"
              >
                Iya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
