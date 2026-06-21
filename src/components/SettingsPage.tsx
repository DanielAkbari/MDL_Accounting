import React, { useState, useEffect } from 'react';
import CoaManagement from './CoaManagement';
import { saveUnits, saveReceiptConfig } from '../lib/apiDb';
import { ReceiptConfig, BusinessUnit } from '../types';
import { Settings, Trash2, KeyRound, Save, ListTodo, FileText, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function SettingsPage({ 
  onRefresh, 
  units: propUnits, 
  receiptConfig: propReceiptConfig 
}: { 
  onRefresh: () => void; 
  units: BusinessUnit[]; 
  receiptConfig: ReceiptConfig | null; 
}) {
  const [activeSubTab, setActiveSubTab] = useState<'coa' | 'units' | 'profile' | 'receipt'>('coa');

  // Unit Usaha state
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitProject, setNewUnitProject] = useState<'Pariwisata' | 'Properti'>('Pariwisata');
  const [activeUnitTab, setActiveUnitTab] = useState<'semua' | 'pariwisata' | 'properti'>('semua');

  // User Profile state
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Profile details states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [avatarLogo, setAvatarLogo] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Receipt kop state
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>({
    companyName: '',
    ptName: '',
    address: '',
    phone: '',
    website: '',
    socialMedia: '',
    disclaimer: '',
    defaultCashier: ''
  });

  useEffect(() => {
    if (propUnits && propUnits.length > 0) {
      setUnits(propUnits);
    }
    if (propReceiptConfig) {
      setReceiptConfig(propReceiptConfig);
    }

    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setProfileEmail(session.user.email || '');
          setUserId(session.user.id || '');
          setUserRole('Administrator (Cloud)');
          
          const metadata = session.user.user_metadata || {};
          setFullName(metadata.full_name || '');
          setUsername(metadata.username || '');
          setBusinessNameInput(metadata.business_name || '');
          setAvatarLogo(metadata.avatar_logo || '');
        } else {
          setProfileEmail('Admin');
          setUserRole('Administrator');
        }
      } catch (err) {
        console.warn("Error checking Supabase session in SettingsPage:", err);
      }
    };
    fetchUser();
  }, [propUnits, propReceiptConfig]);

  // Handle Unit Management
  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUnitName.trim();
    if (!cleanName) return;
    if (units.some(u => u.name.toLowerCase() === cleanName.toLowerCase())) {
      toast.error('Barang & Jasa sudah ada!');
      return;
    }
    const newUnitObj: BusinessUnit = {
      name: cleanName,
      project: newUnitProject
    };
    const updated = [...units, newUnitObj];
    setUnits(updated);
    await saveUnits(updated);
    setNewUnitName('');
    toast.success('Barang & Jasa berhasil ditambahkan');
    onRefresh();
  };

  const handleDeleteUnit = async (unitToDelete: BusinessUnit) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus "${unitToDelete.name}" dari pilihan transaksi baru?\n(Data transaksi lama di database tidak akan terpengaruh)`)) {
      const updated = units.filter(u => u.name !== unitToDelete.name);
      setUnits(updated);
      await saveUnits(updated);
      toast.success('Barang & Jasa dihapus dari daftar aktif');
      onRefresh();
    }
  };

  // Handle Password Update via Supabase
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Password baru tidak boleh kosong!');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Password konfirmasi tidak cocok!');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password minimal harus 6 karakter!');
      return;
    }

    setIsUpdatingPassword(true);
    const passToast = toast.loading('Mengupdate password...');
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast.success('Password berhasil diperbarui!', { id: passToast });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal memperbarui password', { id: passToast });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Profile Update via Supabase
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    const updateToast = toast.loading('Mengupdate profil...');
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          username: username,
          business_name: businessNameInput
        }
      });
      if (error) throw error;
      toast.success('Profil berhasil diperbarui!', { id: updateToast });
      onRefresh(); // Trigger refresh in parent DashboardApp
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal memperbarui profil', { id: updateToast });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Receipt Config Management
  const handleSaveReceiptConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const saveToast = toast.loading('Menyimpan kop kwitansi...');
    try {
      await saveReceiptConfig(receiptConfig);
      toast.success('Kop Kwitansi berhasil disimpan', { id: saveToast });
      onRefresh();
    } catch (err: any) {
      toast.error('Gagal menyimpan kop kwitansi', { id: saveToast });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-600" />
          Pengaturan Sistem
        </h2>
        <p className="text-sm text-slate-500 mt-1">Konfigurasikan CoA, Barang & Jasa, Profil Pengguna, dan Layout Kwitansi</p>
      </div>

      {/* Sub tabs nav */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white p-1.5 rounded-lg shadow-sm">
        <button
          onClick={() => setActiveSubTab('coa')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeSubTab === 'coa' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          ⚙️ Manajemen CoA
        </button>
        <button
          onClick={() => setActiveSubTab('units')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeSubTab === 'units' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          📦 Barang & Jasa
        </button>
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeSubTab === 'profile' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          👤 Profil Pengguna
        </button>
        <button
          onClick={() => setActiveSubTab('receipt')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeSubTab === 'receipt' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          📄 Kop Kwitansi
        </button>
      </div>

      {/* Render sub component tabs */}
      <div className="bg-slate-50 min-h-[400px]">
        {activeSubTab === 'coa' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in-50 duration-150">
            <CoaManagement />
          </div>
        )}

        {/* Barang & Jasa Sub Tab */}
        {activeSubTab === 'units' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in-50 duration-150">
            {/* Add unit form */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-600" />
                Tambah Barang & Jasa Baru
              </h3>
              <form onSubmit={handleAddUnit} className="space-y-4 text-xs text-left">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Barang & Jasa</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Tiket Wahana, Jasa Kebersihan, Sewa Kamar..."
                    value={newUnitName}
                    onChange={e => setNewUnitName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Proyek Konteks</label>
                  <select
                    value={newUnitProject}
                    onChange={e => setNewUnitProject(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium h-[34px]"
                  >
                    <option value="Pariwisata">Pariwisata (Wisata/Foodcourt/Wahana)</option>
                    <option value="Properti">Properti (Kavling/Penjualan Unit)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 text-white font-bold uppercase rounded hover:bg-blue-700 transition tracking-wider text-xs"
                >
                  Tambahkan
                </button>
              </form>
            </div>

            {/* Units list */}
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Daftar Barang & Jasa Aktif</h3>
                
                {/* Unit project filter tabs */}
                <div className="flex border border-slate-200 bg-white rounded p-0.5 gap-0.5 text-[10px] font-bold uppercase tracking-wider">
                  <button
                    onClick={() => setActiveUnitTab('semua')}
                    className={`px-3 py-1 rounded-sm transition-all ${activeUnitTab === 'semua' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setActiveUnitTab('pariwisata')}
                    className={`px-3 py-1 rounded-sm transition-all ${activeUnitTab === 'pariwisata' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    Pariwisata
                  </button>
                  <button
                    onClick={() => setActiveUnitTab('properti')}
                    className={`px-3 py-1 rounded-sm transition-all ${activeUnitTab === 'properti' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    Properti
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[450px]">
                {units
                  .filter(u => {
                    if (activeUnitTab === 'semua') return true;
                    return u.project === (activeUnitTab === 'pariwisata' ? 'Pariwisata' : 'Properti');
                  })
                  .map((unit, idx) => (
                    <div key={idx} className="flex justify-between items-center px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{unit.name}</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                          unit.project === 'Pariwisata' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {unit.project}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteUnit(unit)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Hapus Barang & Jasa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Profil Pengguna Sub Tab */}
        {activeSubTab === 'profile' && (
          <div className="max-w-3xl space-y-6 animate-in fade-in-50 duration-150">
            {/* Profile Detail Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-center gap-6 text-left">
                {receiptConfig.logoBase64 ? (
                  <img src={receiptConfig.logoBase64} className="w-20 h-20 bg-white border border-slate-750 rounded-full object-contain p-1.5 shadow-lg" alt="Avatar Logo" />
                ) : (
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-black shadow-lg uppercase">
                    {fullName ? fullName.charAt(0) : (profileEmail ? profileEmail.charAt(0) : 'U')}
                  </div>
                )}
                <div className="text-center sm:text-left space-y-1">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                    {userRole || 'User'}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight">{fullName || businessNameInput || profileEmail || 'Memuat...'}</h3>
                  {username && <p className="text-xs text-slate-400">@{username}</p>}
                </div>
              </div>

              <div className="p-6 divide-y divide-slate-100 text-xs">
                <div className="py-3.5 flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Nama Perusahaan</span>
                  <span className="text-slate-800 font-medium">{businessNameInput || '-'}</span>
                </div>
                <div className="py-3.5 flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">ID Pengguna</span>
                  <span className="font-mono text-slate-800 bg-slate-50 px-2 py-1 border border-slate-100 rounded text-[11px] select-all">
                    {userId || '-'}
                  </span>
                </div>
                <div className="py-3.5 flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Email Terdaftar</span>
                  <span className="text-slate-800 font-medium">{profileEmail || '-'}</span>
                </div>
              </div>
            </div>

            {/* Edit Profile Details Form */}
            {userId && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Edit Profil Akun
                </h3>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Perusahaan (Judul Sidebar)</label>
                      <input
                          type="text"
                          required
                          placeholder="Nama bisnis Anda..."
                          value={businessNameInput}
                          onChange={e => setBusinessNameInput(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Username</label>
                      <input
                          type="text"
                          required
                          placeholder="Username unik..."
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                    <input
                        type="text"
                        required
                        placeholder="Nama lengkap Anda..."
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded shadow-sm transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Perubahan Profil
                  </button>
                </form>
              </div>
            )}

            {/* Change Password Card */}
            {userId && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  Perbarui Kata Sandi Akun
                </h3>
                
                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Password Baru</label>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan password baru..."
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Konfirmasi Password Baru</label>
                    <input
                      type="password"
                      required
                      placeholder="Ulangi password baru..."
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded shadow-sm transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Password Baru
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Receipt Kop configuration sub-tab */}
        {activeSubTab === 'receipt' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in-50 duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Pengaturan Kop & Identitas Kwitansi Resmi
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Konfigurasikan rincian kop surat yang akan dicetak pada berkas kwitansi tamu.</p>
            </div>

            <form onSubmit={handleSaveReceiptConfig} className="space-y-4 text-xs text-left max-w-3xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Logo Perusahaan</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {receiptConfig.logoBase64 ? (
                    <img src={receiptConfig.logoBase64} className="w-16 h-16 object-contain border border-slate-200 rounded p-1 bg-white" alt="Logo Perusahaan" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] font-bold text-slate-400">No Logo</div>
                  )}
                  <div className="space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      id="logo-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 800 * 1024) {
                            toast.error('Ukuran file terlalu besar! Silakan gunakan gambar logo di bawah 800 KB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setReceiptConfig({ ...receiptConfig, logoBase64: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] uppercase font-bold rounded cursor-pointer transition border border-slate-300"
                    >
                      Pilih Logo
                    </label>
                    {receiptConfig.logoBase64 && (
                      <button
                        type="button"
                        onClick={() => setReceiptConfig({ ...receiptConfig, logoBase64: '' })}
                        className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] uppercase font-bold rounded transition border border-red-200"
                      >
                        Hapus Logo
                      </button>
                    )}
                    <p className="text-[9px] text-slate-400">Rekomendasi: Format PNG transparan, rasio kotak/lanskap, ukuran file maks 800 KB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Perusahaan (Brand)</label>
                  <input
                    type="text"
                    required
                    value={receiptConfig.companyName}
                    onChange={e => setReceiptConfig({...receiptConfig, companyName: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama PT Resmi</label>
                  <input
                    type="text"
                    required
                    value={receiptConfig.ptName}
                    onChange={e => setReceiptConfig({...receiptConfig, ptName: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Alamat Kantor Lengkap</label>
                <textarea
                  required
                  rows={2}
                  value={receiptConfig.address}
                  onChange={e => setReceiptConfig({...receiptConfig, address: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Website</label>
                  <input
                    type="text"
                    value={receiptConfig.website}
                    onChange={e => setReceiptConfig({...receiptConfig, website: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Sosial Media Handle</label>
                  <input
                    type="text"
                    value={receiptConfig.socialMedia}
                    onChange={e => setReceiptConfig({...receiptConfig, socialMedia: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kasir / Penerima Default</label>
                  <input
                    type="text"
                    required
                    value={receiptConfig.defaultCashier}
                    onChange={e => setReceiptConfig({...receiptConfig, defaultCashier: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Disclaimer Kwitansi Resmi</label>
                <textarea
                  required
                  rows={2}
                  value={receiptConfig.disclaimer}
                  onChange={e => setReceiptConfig({...receiptConfig, disclaimer: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase rounded shadow-sm transition"
                >
                  <Save className="w-4 h-4" />
                  Simpan Kustomisasi Kwitansi
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

