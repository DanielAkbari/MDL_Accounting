import React, { useState, useEffect, useMemo } from 'react';
import { COA } from '../data/coa';
import { getTransactions, updateTransaction, addCoa, updateCoa, deleteCoa, getCoas } from '../lib/apiDb';
import { Settings, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { SearchableSelect } from './SearchableSelect';

const generateNextCode = (coasList: COA[], type: string, isParent: boolean, parentCode?: string): string => {
  if (!isParent && parentCode) {
    const subs = coasList.filter(c => c.parentCode === parentCode);
    if (subs.length > 0) {
      const numericCodes = subs.map(s => parseInt(s.code, 10)).filter(num => !isNaN(num));
      if (numericCodes.length > 0) {
        return (Math.max(...numericCodes) + 1).toString();
      }
    }
    const pNum = parseInt(parentCode, 10);
    if (!isNaN(pNum)) {
      return (pNum + 1).toString();
    }
    return parentCode + "01";
  } else {
    let prefix = "1";
    if (['REVE', 'OINC'].includes(type)) {
      prefix = "4";
    } else if (['EXPS', 'COGS', 'OEXP', 'DEPR'].includes(type)) {
      prefix = "6";
    } else if (type === 'Liability') {
      prefix = "2";
    } else if (type === 'Equity') {
      prefix = "3";
    }
    
    const mains = coasList.filter(c => !c.parentCode && c.code.startsWith(prefix));
    const numericCodes = mains.map(m => parseInt(m.code, 10)).filter(num => !isNaN(num));
    if (numericCodes.length > 0) {
      const maxCode = Math.max(...numericCodes);
      const step = maxCode % 1000 === 0 ? 1000 : 100;
      let nextCode = maxCode + step;
      while (coasList.some(c => c.code === nextCode.toString())) {
        nextCode += step;
      }
      return nextCode.toString();
    }
    return prefix + "1000";
  }
};

export default function CoaManagement() {
  const [coasList, setCoasList] = useState<COA[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'semua' | 'pariwisata' | 'properti' | 'umum'>('semua');
  
  const [classification, setClassification] = useState<'parent' | 'child'>('parent');
  const [parentAccountCode, setParentAccountCode] = useState<string>('');

  const sortedCoas = useMemo(() => {
    return [...coasList].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [coasList]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'REVE',
    project: 'Umum' as 'Pariwisata' | 'Properti' | 'Umum'
  });

  const parentAccountsForSelectedType = useMemo(() => {
    let prefix = "1";
    if (['REVE', 'OINC'].includes(formData.type)) {
      prefix = "4";
    } else if (['EXPS', 'COGS', 'OEXP', 'DEPR'].includes(formData.type)) {
      prefix = "6";
    } else if (formData.type === 'Liability') {
      prefix = "2";
    } else if (formData.type === 'Equity') {
      prefix = "3";
    }
    return coasList.filter(c => !c.parentCode && c.code.startsWith(prefix));
  }, [coasList, formData.type]);

  useEffect(() => {
    if (classification === 'child' && parentAccountsForSelectedType.length > 0) {
      const exists = parentAccountsForSelectedType.some(p => p.code === parentAccountCode);
      if (!exists) {
        setParentAccountCode(parentAccountsForSelectedType[0].code);
      }
    } else {
      setParentAccountCode('');
    }
  }, [parentAccountsForSelectedType, classification]);

  useEffect(() => {
    if (editingCode) return;
    const generated = generateNextCode(coasList, formData.type, classification === 'parent', parentAccountCode);
    setFormData(prev => ({ ...prev, code: generated }));
  }, [formData.type, classification, parentAccountCode, editingCode, coasList]);

  const refreshList = async () => {
    try {
      const coas = await getCoas();
      setCoasList(coas);
    } catch (e) {
      console.error('Failed to load COA list:', e);
      toast.error('Gagal mengambil data CoA dari server');
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Kode dan Nama akun harus diisi');
      return;
    }

    // Check for duplicates (excluding the current account if editing)
    const isCodeDuplicate = coasList.some(
      c => c.code === formData.code && (!editingCode || c.code !== editingCode)
    );
    const isNameDuplicate = coasList.some(
      c => c.name.toLowerCase().trim() === formData.name.toLowerCase().trim() && (!editingCode || c.code !== editingCode)
    );

    if (isCodeDuplicate) {
      toast.error(`Kode perkiraan "${formData.code}" sudah digunakan oleh akun lain!`);
      return;
    }

    if (isNameDuplicate) {
      toast.error(`Nama perkiraan "${formData.name}" sudah digunakan oleh akun lain!`);
      return;
    }
    
    if (editingCode) {
      // Update the CoA
      const targetCoa = coasList.find(c => c.code === editingCode);
      if (targetCoa) {
        const updatedCoa = { 
          ...targetCoa, 
          code: formData.code, 
          name: formData.name, 
          type: formData.type, 
          project: formData.project,
          parentCode: classification === 'child' ? parentAccountCode : undefined
        };
        await updateCoa(updatedCoa);

        // If code has changed, update matching parentCode of child accounts
        if (formData.code !== editingCode) {
          for (const c of coasList) {
            if (c.parentCode === editingCode) {
              const updatedChild = { ...c, parentCode: formData.code };
              await updateCoa(updatedChild);
            }
          }
        }
      }
      
      // If code or name has changed, update matching transactions
      const oldCoa = coasList.find(c => c.code === editingCode);
      if (formData.code !== editingCode || (oldCoa && oldCoa.name !== formData.name)) {
        try {
          const txs = await getTransactions();
          const matches = txs.filter(t => t.accountCode === editingCode || t.accountId === editingCode);
          if (matches.length > 0) {
            toast.loading(`Memperbarui ${matches.length} referensi transaksi...`, { id: 'coa-update-toast' });
            for (const tx of matches) {
              const updatedTx = { ...tx };
              if (tx.accountCode === editingCode) {
                updatedTx.accountCode = formData.code;
                updatedTx.accountName = formData.name;
              }
              if (tx.accountId === editingCode) {
                updatedTx.accountId = formData.code;
              }
              await updateTransaction(updatedTx);
            }
            toast.success('Referensi transaksi berhasil diperbarui', { id: 'coa-update-toast' });
          }
        } catch (e) {
          console.error(e);
          toast.error('Gagal memperbarui referensi transaksi');
        }
      }
      toast.success('CoA berhasil diperbarui');
    } else {
      const newCoa: COA = {
        no: Date.now().toString(),
        type: formData.type,
        code: formData.code,
        name: formData.name,
        isCustom: true,
        project: formData.project,
        parentCode: classification === 'child' ? parentAccountCode : undefined
      };
      await addCoa(newCoa);
      toast.success('CoA berhasil ditambahkan');
    }
    
    setIsAdding(false);
    setEditingCode(null);
    setFormData({ code: '', name: '', type: 'REVE', project: 'Umum' });
    setClassification('parent');
    setParentAccountCode('');
    refreshList();
  };

  const handleEdit = (coa: COA) => {
    setFormData({ code: coa.code, name: coa.name, type: coa.type, project: coa.project || 'Umum' });
    setClassification(coa.parentCode ? 'child' : 'parent');
    setParentAccountCode(coa.parentCode || '');
    setEditingCode(coa.code);
    setIsAdding(true);
  };

  const handleDelete = async (code: string) => {
    try {
      const txs = await getTransactions();
      const count = txs.filter(t => t.accountCode === code).length;
      if (count > 0) {
        toast.error(`Tidak dapat menghapus CoA ini karena sudah digunakan dalam ${count} transaksi.`);
        return;
      }
      
      if (window.confirm('Yakin ingin menghapus CoA ini?')) {
        await deleteCoa(code);
        toast.success('CoA berhasil dihapus');
        refreshList();
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal memvalidasi riwayat transaksi CoA');
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingCode(null);
    setFormData({ code: '', name: '', type: 'REVE', project: 'Umum' });
    setClassification('parent');
    setParentAccountCode('');
  };

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-600" />
            Manajemen Chart of Accounts (CoA)
          </h2>
          <p className="text-sm text-slate-500">Kelola daftar akun atau bukat akun kustom baru</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Tambah Akun Kustom</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {editingCode ? 'Edit Akun Kustom' : 'Buat Akun Kustom Baru'}
              </h2>
              <button type="button" onClick={handleCancel} className="text-slate-400 hover:text-slate-600 text-xl font-bold bg-transparent border-0 cursor-pointer">
                &times;
              </button>
            </div>
            
            <div className="p-4 space-y-3 text-xs text-left overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipe Akun</label>
                  <SearchableSelect
                    isSearchable={false}
                    value={formData.type}
                    onChange={val => setFormData({ ...formData, type: val })}
                    options={[
                      { value: 'REVE', label: 'Pendapatan (Income/REVE)' },
                      { value: 'EXPS', label: 'Pengeluaran (Expense/EXPS)' },
                      { value: 'Asset', label: 'Aset (Asset)' },
                      { value: 'Liability', label: 'Kewajiban (Liability)' },
                      { value: 'Equity', label: 'Ekuitas (Equity)' }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proyek Konteks</label>
                  <SearchableSelect
                    isSearchable={false}
                    value={formData.project}
                    onChange={val => setFormData({ ...formData, project: val as any })}
                    options={[
                      { value: 'Umum', label: 'Umum / Semua Proyek (Umum)' },
                      { value: 'Pariwisata', label: 'Pariwisata (Wisata/Foodcourt/Wahana)' },
                      { value: 'Properti', label: 'Properti (Kavling/Penjualan Unit)' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Klasifikasi Akun</label>
                  <SearchableSelect
                    isSearchable={false}
                    value={classification}
                    onChange={val => setClassification(val as any)}
                    options={[
                      { value: 'parent', label: 'Akun Utama (Header)' },
                      { value: 'child', label: 'Akun Perkiraan (Sub-Akun/Detail)' }
                    ]}
                  />
                </div>
                <div>
                  {classification === 'child' && (
                    <>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Akun Induk Utama</label>
                      <SearchableSelect
                        value={parentAccountCode}
                        onChange={val => setParentAccountCode(val)}
                        options={parentAccountsForSelectedType.map(p => ({
                          value: p.code,
                          label: `[${p.code}] ${p.name}`
                        }))}
                        className="font-mono"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kode Akun</label>
                  <input 
                    type="text" 
                    placeholder="Masukkan kode akun..."
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500 font-mono h-[38px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Akun</label>
                  <input 
                    type="text" 
                    placeholder="Mis: Pendapatan Sewa"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500 h-[38px]"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                <button 
                  type="button"
                  onClick={handleCancel} 
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={handleSave} 
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer border-0"
                >
                  <Save className="w-4 h-4" />
                  Simpan Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex border-b border-slate-200 bg-white rounded-lg p-1 gap-1 shadow-sm max-w-md mb-4 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('semua')}
          className={`flex-1 py-1.5 rounded transition-all ${activeTab === 'semua' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Semua
        </button>
        <button
          onClick={() => setActiveTab('pariwisata')}
          className={`flex-1 py-1.5 rounded transition-all ${activeTab === 'pariwisata' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Pariwisata
        </button>
        <button
          onClick={() => setActiveTab('properti')}
          className={`flex-1 py-1.5 rounded transition-all ${activeTab === 'properti' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Properti
        </button>
        <button
          onClick={() => setActiveTab('umum')}
          className={`flex-1 py-1.5 rounded transition-all ${activeTab === 'umum' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Umum
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left bg-white">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
              <th className="px-5 py-3 font-bold w-32">Kategori</th>
              <th className="px-5 py-3 font-bold w-28">Proyek</th>
              <th className="px-5 py-3 font-bold w-24">Kode</th>
              <th className="px-5 py-3 font-bold">Nama Akun</th>
              <th className="px-5 py-3 font-bold text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            {sortedCoas
              .filter(coa => {
                if (activeTab === 'semua') return true;
                if (activeTab === 'pariwisata') return coa.project === 'Pariwisata';
                if (activeTab === 'properti') return coa.project === 'Properti';
                if (activeTab === 'umum') return coa.project === 'Umum';
                return true;
              })
              .map((coa, idx) => {
                const isSubAccount = !!coa.parentCode;
                return (
                  <tr key={`${coa.code}-${idx}`} className={`hover:bg-slate-50 transition-colors ${!isSubAccount ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded inline-block text-center min-w-[80px] ${
                         ['REVE', 'OINC'].includes(coa.type) ? 'bg-green-100 text-green-700' : 
                         ['EXPS', 'OEXP', 'COGS'].includes(coa.type) ? 'bg-red-100 text-red-700' :
                         ['Asset', 'FASS', 'OASS', 'BANK'].includes(coa.type) ? 'bg-blue-100 text-blue-700' :
                         ['Liability', 'Equity'].includes(coa.type) ? 'bg-purple-100 text-purple-700' :
                         'bg-gray-100 text-gray-700'
                      }`}>
                        {['REVE', 'OINC'].includes(coa.type) ? 'Pendapatan' : 
                         ['EXPS', 'OEXP', 'COGS'].includes(coa.type) ? 'Beban' : 
                         ['Asset', 'FASS', 'OASS', 'BANK'].includes(coa.type) ? 'Aset' : 
                         ['Liability'].includes(coa.type) ? 'Kewajiban' :
                         ['Equity'].includes(coa.type) ? 'Ekuitas' : coa.type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                        coa.project === 'Pariwisata' ? 'bg-amber-100 text-amber-700' :
                        coa.project === 'Properti' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {coa.project || 'Umum'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500 text-xs">
                      {coa.code}
                    </td>
                    <td className="px-5 py-3">
                      {isSubAccount ? (
                        <div className="pl-5 flex items-center gap-1.5 text-slate-600 font-normal">
                          <span className="text-slate-400 font-mono text-xs select-none">└─</span>
                          <span>{coa.name}</span>
                        </div>
                      ) : (
                        <div className="font-bold text-slate-900">
                          {coa.name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex justify-center gap-2.5">
                         <button 
                           onClick={() => handleEdit(coa)} 
                           className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" 
                           title="Edit CoA"
                         >
                           <Pencil className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => handleDelete(coa.code)} 
                           className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" 
                           title="Hapus CoA"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
