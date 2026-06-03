import React, { useState, useEffect } from 'react';
import { COA, getMergedCOA, getCustomCOA, saveCustomCOA, COA_LIST } from '../data/coa';
import { Settings, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CoaManagement() {
  const [coasList, setCoasList] = useState<COA[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'REVE'
  });

  useEffect(() => {
    setCoasList(getMergedCOA());
  }, []);

  const refreshList = () => {
    setCoasList(getMergedCOA());
  };

  const handleSave = () => {
    if (!formData.code || !formData.name) {
      toast.error('Kode dan Nama akun harus diisi');
      return;
    }

    const customCoas = getCustomCOA();
    
    if (editingCode) {
      // Check for duplicate if code is changed
      if (formData.code !== editingCode && coasList.some(c => c.code === formData.code)) {
        toast.error('Kode akun sudah digunakan oleh akun lain!');
        return;
      }
      // Edit existing
      const updated = customCoas.map(c => 
        c.code === editingCode 
          ? { ...c, code: formData.code, name: formData.name, type: formData.type } 
          : c
      );
      saveCustomCOA(updated);
      toast.success('CoA berhasil diperbarui');
    } else {
      // Check for duplicate
      if (coasList.some(c => c.code === formData.code)) {
        toast.error('Kode akun sudah ada!');
        return;
      }
      
      const newCoa: COA = {
        no: Date.now().toString(),
        type: formData.type,
        code: formData.code,
        name: formData.name,
        isCustom: true
      };
      saveCustomCOA([...customCoas, newCoa]);
      toast.success('CoA berhasil ditambahkan');
    }
    
    setIsAdding(false);
    setEditingCode(null);
    setFormData({ code: '', name: '', type: 'REVE' });
    refreshList();
  };

  const handleEdit = (coa: COA) => {
    if (!coa.isCustom) {
      toast.error('CoA bawaan sistem tidak dapat diedit');
      return;
    }
    setFormData({ code: coa.code, name: coa.name, type: coa.type });
    setEditingCode(coa.code);
    setIsAdding(true);
  };

  const handleDelete = (code: string) => {
    if (window.confirm('Yakin ingin menghapus CoA ini?')) {
      const customCoas = getCustomCOA();
      saveCustomCOA(customCoas.filter(c => c.code !== code));
      toast.success('CoA berhasil dihapus');
      refreshList();
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingCode(null);
    setFormData({ code: '', name: '', type: 'REVE' });
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
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm mb-6 max-w-xl">
          <h3 className="font-bold text-slate-800 mb-4">{editingCode ? 'Edit Akun Kustom' : 'Buat Akun Kustom Baru'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipe Akun</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
              >
                <option value="REVE">Pendapatan (Income/REVE)</option>
                <option value="EXPS">Pengeluaran (Expense/EXPS)</option>
                <option value="Asset">Aset (Asset)</option>
                <option value="Liability">Kewajiban (Liability)</option>
                <option value="Equity">Ekuitas (Equity)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kode Akun</label>
                <input 
                  type="text" 
                  placeholder="Mis: 4001"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Akun</label>
                <input 
                  type="text" 
                  placeholder="Mis: Pendapatan Sewa"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded">
                Batal
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm">
                <Save className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left bg-white">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
              <th className="px-5 py-3 font-bold w-32">Kategori</th>
              <th className="px-5 py-3 font-bold w-32">Kode</th>
              <th className="px-5 py-3 font-bold">Nama Akun</th>
              <th className="px-5 py-3 font-bold text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {coasList.map((coa, idx) => (
              <tr key={`${coa.code}-${idx}`} className="hover:bg-slate-50 transition-colors">
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
                <td className="px-5 py-3 font-mono text-slate-500 text-xs">
                  {coa.code}
                </td>
                <td className="px-5 py-3 font-medium text-slate-800">
                  {coa.name}
                  {coa.isCustom && (
                    <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                      Custom
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {coa.isCustom ? (
                    <div className="flex justify-center gap-2">
                       <button onClick={() => handleEdit(coa)} className="text-slate-400 hover:text-blue-600 transition" title="Edit">
                         <Pencil className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDelete(coa.code)} className="text-slate-400 hover:text-red-600 transition" title="Hapus">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Bawaan</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
