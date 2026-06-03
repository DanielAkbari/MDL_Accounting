import React, { useEffect, useState } from 'react';
import { getTransactions } from './lib/apiDb';
import { Transaction } from './types';
import Dashboard from './components/Dashboard';
import TransactionsPage from './components/TransactionsPage';
import FinancialReports from './components/FinancialReports';
import ScorecardPage from './components/ScorecardPage';
import CoaManagement from './components/CoaManagement';
import LedgerPage from './components/LedgerPage';
import TrialBalancePage from './components/TrialBalancePage';
import DatabaseManagement from './components/DatabaseManagement';
import { Wallet, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from './lib/utils';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

export default function App() {
  const [needsAppAuth, setNeedsAppAuth] = useState<boolean>(true);
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports' | 'scorecard' | 'coa' | 'ledger' | 'trial-balance' | 'database'>('dashboard');

  useEffect(() => {
    const authStatus = localStorage.getItem('is_authenticated');
    if (authStatus === 'true') {
      setNeedsAppAuth(false);
      loadTransactions();
      checkBackupStatus();
    }
  }, []);

  const checkBackupStatus = () => {
    const lastStr = localStorage.getItem('last_backup_date');
    if (!lastStr) {
      toast("Peringatan: Anda belum pernah me-backup database. Silahkan ke menu Manajemen Database.", { icon: '⚠️', duration: 6000 });
      return;
    }
    const lastDate = new Date(lastStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays > 1) {
      toast("Peringatan: Sudah lebih dari 1 hari sejak backup terakhir. Segera download backup terbaru!", { icon: '⚠️', duration: 6000 });
    }
  };

  const loadTransactions = async () => {
    setIsLoadingData(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengambil data transaksi");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleAppLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        localStorage.setItem('is_authenticated', 'true');
        setNeedsAppAuth(false);
        toast.success("Login Aplikasi Berhasil");
        loadTransactions();
        checkBackupStatus();
      } else {
        toast.error("Username atau password salah!");
      }
      setIsLoggingIn(false);
    }, 600);
  };

  const handleLogout = () => {
    localStorage.removeItem('is_authenticated');
    setNeedsAppAuth(true);
    setTransactions([]);
  };

  const triggerRefresh = () => {
    loadTransactions();
  };

  if (needsAppAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-900">Malang Dreamland</h1>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">Accounting System</p>
            
            <form onSubmit={handleAppLogin} className="pt-4 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Login ke Sistem</span>}
              </button>
            </form>
          </div>
        </div>
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-white font-bold text-lg tracking-tight">MALANG DREAMLAND</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Finance Ecosystem</p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 mb-2 text-[11px] font-semibold text-slate-500 uppercase">Main Dashboard</div>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center px-4 py-2 hover:bg-slate-800 transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white border-r-4 border-blue-400' : ''}`}
          >
            <span className="w-5 mr-2 text-center text-xs">📊</span> Ringkasan Eksekutif
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center px-4 py-2 hover:bg-slate-800 transition-colors ${activeTab === 'transactions' ? 'bg-blue-600 text-white border-r-4 border-blue-400' : ''}`}
          >
            <span className="w-5 mr-2 text-center text-xs">💰</span> Modul Transaksi
          </button>
          
          <div className="px-4 mt-6 mb-2 text-[11px] font-semibold text-slate-500 uppercase">Laporan Keuangan</div>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`w-full flex items-center px-4 py-2 hover:bg-slate-800 transition-colors ${activeTab === 'ledger' ? 'bg-blue-600 text-white border-r-4 border-blue-400' : ''}`}
          >
            <span className="w-5 mr-2 text-center text-xs">📙</span> Buku Besar
          </button>
          <button 
            onClick={() => setActiveTab('trial-balance')}
            className={`w-full flex items-center px-4 py-2 hover:bg-slate-800 transition-colors ${activeTab === 'trial-balance' ? 'bg-blue-600 text-white border-r-4 border-blue-400' : ''}`}
          >
            <span className="w-5 mr-2 text-center text-xs">⚖️</span> Neraca Saldo
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center px-4 py-2 hover:bg-slate-800 transition-colors ${activeTab === 'reports' ? 'bg-blue-600 text-white border-r-4 border-blue-400' : ''}`}
          >
            <span className="w-5 mr-2 text-center text-xs">📝</span> Laba Rugi (P&L)
          </button>
          <button 
            onClick={() => setActiveTab('scorecard')}
            className={`w-full flex items-center px-4 py-2 hover:bg-slate-800 transition-colors ${activeTab === 'scorecard' ? 'bg-blue-600 text-white border-r-4 border-blue-400' : ''}`}
          >
            <span className="w-5 mr-2 text-center text-xs">📋</span> Kartu Pencatatan
          </button>

          <div className="px-4 mt-6 mb-2 text-[11px] font-semibold text-slate-500 uppercase">Pengaturan</div>
          <button 
            onClick={() => setActiveTab('coa')}
            className={`w-full flex items-center px-4 py-2 hover:bg-slate-800 transition-colors ${activeTab === 'coa' ? 'bg-blue-600 text-white border-r-4 border-blue-400' : ''}`}
          >
            <span className="w-5 mr-2 text-center text-xs">⚙️</span> Manajemen CoA
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`w-full flex items-center px-4 py-2 hover:bg-slate-800 transition-colors ${activeTab === 'database' ? 'bg-blue-600 text-white border-r-4 border-blue-400' : ''}`}
          >
            <span className="w-5 mr-2 text-center text-xs">💾</span> Backup Database
          </button>
        </nav>
        <div className="p-4 bg-slate-950 flex justify-between items-center z-50 relative shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-[10px] text-slate-400">
              {(localStorage.getItem('mdl_service_account') || localStorage.getItem('mdl_google_access_token')) && localStorage.getItem('mdl_spreadsheet_id') 
                ? 'API Google Sheets' 
                : 'Offline DB (Local)'}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-[10px] text-red-500 hover:text-red-400 uppercase font-bold"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center space-x-4">
             <h2 className="font-semibold text-slate-800 flex items-center gap-2">
               {activeTab === 'dashboard' ? 'Dashboard Konsolidasi' : activeTab === 'transactions' ? 'Manajemen Transaksi' : activeTab === 'reports' ? 'Laporan Laba Rugi' : activeTab === 'ledger' ? 'Buku Besar' : activeTab === 'trial-balance' ? 'Neraca Saldo' : activeTab === 'coa' ? 'Manajemen CoA' : activeTab === 'database' ? 'Manajemen DB Lokal' : 'Kartu Pencatatan Unit'}
               {isLoadingData && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
             </h2>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="p-4">
              <Dashboard transactions={transactions} />
            </div>
          )}
          {activeTab === 'transactions' && (
            <div className="p-4">
              <TransactionsPage transactions={transactions} onRefresh={triggerRefresh} />
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <FinancialReports transactions={transactions} />
            </div>
          )}
          {activeTab === 'scorecard' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <ScorecardPage transactions={transactions} />
            </div>
          )}
          {activeTab === 'ledger' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <LedgerPage transactions={transactions} onRefresh={triggerRefresh} />
            </div>
          )}
          {activeTab === 'trial-balance' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <TrialBalancePage transactions={transactions} />
            </div>
          )}
          {activeTab === 'coa' && (
            <div className="p-4">
              <CoaManagement />
            </div>
          )}
          {activeTab === 'database' && (
            <div className="p-4">
              <DatabaseManagement onRefresh={triggerRefresh} />
            </div>
          )}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
