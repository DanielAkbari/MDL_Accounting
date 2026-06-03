import React, { useState, useEffect } from 'react';
import { Database, Upload, CheckCircle2, ShieldAlert, Loader2, Download, LogIn, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { testConnection, getSheetsConfig } from '../lib/serverSheets';

export default function DatabaseManagement({ onRefresh }: { onRefresh: () => void }) {
  const [serviceAccount, setServiceAccount] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Load GSI script dynamically if not loaded
    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = 'google-gsi-script';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const { serviceAccount: sa, spreadsheetId: sid, accessToken: at } = getSheetsConfig();
    const savedClientId = localStorage.getItem('mdl_google_client_id') || '';
    
    if (sa) setServiceAccount(sa);
    if (sid) setSpreadsheetId(sid);
    if (savedClientId) setGoogleClientId(savedClientId);
    if (at) setGoogleAccessToken(at);
    
    setLastBackup(localStorage.getItem('last_backup_date'));

    if (sa && sid) {
      handleTest(sa, sid, null);
    } else if (at && sid) {
      handleTestGoogleOAuth(at, sid);
    }
  }, []);

  // Initialize GSI client once script is loaded and client ID changes
  useEffect(() => {
    if (googleClientId && (window as any).google?.accounts?.oauth2) {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            toast.error('Gagal login dengan Google');
            return;
          }
          if (tokenResponse.access_token) {
            setGoogleAccessToken(tokenResponse.access_token);
            localStorage.setItem('mdl_google_access_token', tokenResponse.access_token);
            localStorage.setItem('mdl_google_client_id', googleClientId);
            
            if (spreadsheetId) {
              handleTestGoogleOAuth(tokenResponse.access_token, spreadsheetId);
            } else {
              toast.success('Akun Google terhubung! Masukkan Spreadsheet ID di bawah.');
            }
          }
        },
      });
      setTokenClient(client);
    }
  }, [googleClientId]);

  const handleTest = async (saStr: string, sidStr: string, atStr: string | null) => {
    setIsTestLoading(true);
    try {
      const result = await testConnection(saStr, sidStr, atStr);
      setIsConnected(true);
      setSheetTitle(result.title);
      localStorage.setItem('mdl_service_account', saStr);
      localStorage.setItem('mdl_spreadsheet_id', sidStr);
      toast.success('Koneksi berhasil!');
      onRefresh();
    } catch (e: any) {
      console.error(e);
      setIsConnected(false);
      setSheetTitle('');
      toast.error(e.message || 'Gagal koneksi ke Google Sheets');
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleTestGoogleOAuth = async (token: string, sid: string) => {
    setIsTestLoading(true);
    try {
      const result = await testConnection(null, sid, token);
      setIsConnected(true);
      setSheetTitle(result.title);
      localStorage.setItem('mdl_google_access_token', token);
      localStorage.setItem('mdl_spreadsheet_id', sid);
      toast.success('Koneksi Google Sheets berhasil!');
      onRefresh();
    } catch (e: any) {
      console.error(e);
      setIsConnected(false);
      setSheetTitle('');
      toast.error(e.message || 'Gagal koneksi ke Google Sheets. Coba Hubungkan kembali.');
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!googleClientId) {
      toast.error('Harap masukkan Google Client ID terlebih dahulu.');
      return;
    }
    
    // Save client ID to storage
    localStorage.setItem('mdl_google_client_id', googleClientId);

    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      if ((window as any).google?.accounts?.oauth2) {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.access_token) {
              setGoogleAccessToken(tokenResponse.access_token);
              localStorage.setItem('mdl_google_access_token', tokenResponse.access_token);
              localStorage.setItem('mdl_google_client_id', googleClientId);
              if (spreadsheetId) {
                handleTestGoogleOAuth(tokenResponse.access_token, spreadsheetId);
              } else {
                toast.success('Akun Google terhubung! Masukkan Spreadsheet ID di bawah.');
              }
            }
          },
        });
        setTokenClient(client);
        client.requestAccessToken();
      } else {
        toast.error('Google API Client belum siap. Mohon tunggu sesaat.');
      }
    }
  };

  const handleConnectSpreadsheetOnly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetId) {
      toast.error('Harap masukkan Spreadsheet ID');
      return;
    }
    if (googleAccessToken) {
      handleTestGoogleOAuth(googleAccessToken, spreadsheetId);
    } else if (serviceAccount) {
      handleTest(serviceAccount, spreadsheetId, null);
    } else {
      toast.error('Harap hubungkan akun Google atau masukkan Service Account terlebih dahulu');
    }
  };

  const handleSubmitServiceAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceAccount || !spreadsheetId) {
      toast.error('Harap isi semua kolom');
      return;
    }
    handleTest(serviceAccount, spreadsheetId, null);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('mdl_service_account');
    localStorage.removeItem('mdl_spreadsheet_id');
    localStorage.removeItem('mdl_google_access_token');
    setServiceAccount('');
    setSpreadsheetId('');
    setGoogleAccessToken('');
    setIsConnected(false);
    setSheetTitle('');
    toast.success('Koneksi diputus. Aplikasi kembali ke mode Local Database.');
    onRefresh();
  };

  const handleExportLocalDb = () => {
    try {
      const transactions = localStorage.getItem('mdl_transactions') || '[]';
      const customCoa = localStorage.getItem('custom_coa') || '[]';
      
      const backupData = {
        app: "accurateKW",
        timestamp: new Date().toISOString(),
        transactions: JSON.parse(transactions),
        customCoa: JSON.parse(customCoa)
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `accurateKW_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const nowStr = new Date().toISOString();
      localStorage.setItem('last_backup_date', nowStr);
      setLastBackup(nowStr);
      toast.success('Database berhasil di-backup!');
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal melakukan backup data');
    }
  };

  const handleImportLocalDb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Peringatan: Melakukan restore akan menimpa seluruh data transaksi offline Anda saat ini. Apakah Anda yakin ingin melanjutkan?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (!json || !Array.isArray(json.transactions)) {
          throw new Error('Format file backup tidak valid. Harus mengandung array transaksi.');
        }

        localStorage.setItem('mdl_transactions', JSON.stringify(json.transactions));
        if (json.customCoa && Array.isArray(json.customCoa)) {
          localStorage.setItem('custom_coa', JSON.stringify(json.customCoa));
        }

        toast.success('Database offline berhasil di-restore!');
        onRefresh();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Gagal memuat file backup');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Google OAuth2 Integration Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Koneksi Database Google Sheets (Rekomendasi)</h3>
            <p className="text-sm text-slate-500 mt-1">
              Hubungkan akun Google Anda secara langsung untuk sinkronisasi database offline ke dalam Google Sheets secara pribadi dan aman.
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="p-6 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div>
              <h4 className="text-lg font-bold text-green-900">Terhubung ke Google Sheets</h4>
              <p className="text-sm text-green-700">Workbook: <strong>{sheetTitle}</strong></p>
              <p className="text-xs text-green-600 mt-1">Spreadsheet ID: {spreadsheetId}</p>
              {googleAccessToken && <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">Mode: Akun Google User (OAuth2)</p>}
              {serviceAccount && <p className="text-[10px] text-amber-600 font-bold uppercase mt-1">Mode: Service Account Developer</p>}
            </div>
            <button 
              onClick={handleDisconnect}
              className="mt-4 px-6 py-2 bg-white text-slate-700 border border-slate-300 font-bold text-xs uppercase shadow-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              Putuskan Koneksi
            </button>
          </div>
        ) : (
          <div className="space-y-6 pt-4 border-t border-slate-100">
            {/* Step 1: Google Client ID Setup */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Google OAuth Client ID
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={googleClientId}
                  onChange={e => setGoogleClientId(e.target.value)}
                  placeholder="Masukkan 72-digit OAuth Client ID..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                  Hubungkan Google
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Memerlukan Google OAuth Client ID untuk domain asal (Authorized Origin: <code>http://localhost:3000</code>).
              </p>
            </div>

            {/* Step 2: Spreadsheet ID Link */}
            {googleAccessToken && (
              <form onSubmit={handleConnectSpreadsheetOnly} className="space-y-4 pt-4 border-t border-slate-100">
                <div className="p-3 bg-green-50 text-green-800 text-xs rounded-lg flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Akun Google Anda berhasil dihubungkan. Silakan pilih Spreadsheet Anda.
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    2. Google Spreadsheet ID
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={spreadsheetId}
                      onChange={e => setSpreadsheetId(e.target.value)}
                      placeholder="Masukkan ID Google Sheet (Contoh: 1BxiMvs0XRYFgPnmac2A7...)"
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                    />
                    <button
                      type="submit"
                      disabled={isTestLoading}
                      className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      {isTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                      Hubungkan Sheet
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pastikan file Google Sheet Anda berada di akun Google Drive yang barusan Anda hubungkan.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Advanced Connection (Service Account) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors"
        >
          <span>🛠️ Pengaturan Lanjutan (Service Account JSON)</span>
          <span>{showAdvanced ? 'Sembunyikan 🔼' : 'Tampilkan 🔽'}</span>
        </button>

        {showAdvanced && !isConnected && (
          <form onSubmit={handleSubmitServiceAccount} className="space-y-5 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Spreadsheet ID
              </label>
              <input 
                type="text" 
                value={spreadsheetId}
                onChange={e => setSpreadsheetId(e.target.value)}
                placeholder="Spreadsheet ID..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Service Account JSON
              </label>
              <textarea 
                value={serviceAccount}
                onChange={e => setServiceAccount(e.target.value)}
                rows={6}
                placeholder='{"type": "service_account", ...}'
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
              />
            </div>

            <button 
              type="submit"
              disabled={isTestLoading}
              className="w-full py-3 bg-slate-700 text-white font-bold uppercase tracking-wider text-xs rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center transition-colors"
            >
              {isTestLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Database className="w-5 h-5 mr-2" />}
              Hubungkan via Service Account
            </button>
          </form>
        )}
      </div>

      {/* Backup & Restore Database Lokal */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Backup & Restore Database Lokal</h3>
            <p className="text-sm text-slate-500 mt-1">
              Simpan seluruh data transaksi lokal dan akun kustom Anda sebagai berkas JSON, atau pulihkan dari backup sebelumnya.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          {/* Backup */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1. Backup Data Offline</h4>
            <p className="text-xs text-slate-500">
              Download salinan database offline saat ini ke komputer Anda.
            </p>
            <button
              onClick={handleExportLocalDb}
              className="w-full py-2.5 bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Backup JSON
            </button>
            {lastBackup && (
              <p className="text-[10px] text-slate-400">
                Backup terakhir: {new Date(lastBackup).toLocaleString('id-ID')}
              </p>
            )}
          </div>

          {/* Restore */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. Restore Data Offline</h4>
            <p className="text-xs text-slate-500">
              Unggah berkas `.json` untuk memulihkan transaksi. <span className="text-red-500 font-medium">Ini akan menghapus transaksi saat ini!</span>
            </p>
            <label className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer text-center">
              <Upload className="w-4 h-4" />
              Pilih Berkas Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImportLocalDb}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
