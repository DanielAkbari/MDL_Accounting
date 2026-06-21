import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, updateTransaction, getCoas, seedCoas, getUnits, getReceiptConfig, saveUnits, saveReceiptConfig } from './lib/apiDb';
import { Transaction, BusinessUnit, ReceiptConfig } from './types';
import Dashboard from './components/Dashboard';
import TransactionsPage from './components/TransactionsPage';
import FinancialReports from './components/FinancialReports';
import ScorecardPage from './components/ScorecardPage';
import LedgerPage from './components/LedgerPage';
import TrialBalancePage from './components/TrialBalancePage';
import SettingsPage from './components/SettingsPage';
import FintraxAI from './components/FintraxAI';
import { getTransactionProject } from './lib/utils';
import { 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  LogOut, 
  LayoutDashboard, 
  ArrowLeftRight, 
  BookOpenCheck, 
  Scale, 
  TrendingUp, 
  Receipt, 
  Sparkles, 
  Settings2 
} from 'lucide-react';
import { cn } from './lib/utils';
import { Toaster, ToastBar } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { getMergedCOA, saveCOAList, COA } from './data/coa';
import { supabase } from './lib/supabase';
import Loader from './components/ui/loader-4';

export default function DashboardApp() {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [businessName, setBusinessName] = useState('Fintrax');
  const [businessLogo, setBusinessLogo] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('fintrax_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('fintrax_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const loadLogo = (config: ReceiptConfig | null) => {
    try {
      if (config && config.logoBase64) {
        setLogoBase64(config.logoBase64);
        setBusinessLogo(config.logoBase64);
      } else {
        setLogoBase64('');
        setBusinessLogo('');
      }
    } catch (e) {
      console.warn("Failed to load logo from receipt config:", e);
    }
  };

  useEffect(() => {
    // Bersihkan seluruh data offline lokal hari ini agar 100% menggunakan data Supabase cloud
    localStorage.removeItem('mdl_transactions');
    localStorage.removeItem('coa_list');
    localStorage.removeItem('custom_coa');
  }, []);
  
  const todayDate = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coaList, setCoaList] = useState<COA[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports' | 'scorecard' | 'settings' | 'ledger' | 'trial-balance' | 'ai-help'>('dashboard');
  const [checkoutDpId, setCheckoutDpId] = useState<string | null>(null);
  const [isTransactionsMenuOpen, setIsTransactionsMenuOpen] = useState<boolean>(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);

  // Global Project Filter state
  const [currentProject, setCurrentProject] = useState<'Pariwisata' | 'Properti' | 'Konsolidasi'>(() => {
    const saved = localStorage.getItem('mdl_current_project');
    return (saved as any) || 'Konsolidasi';
  });

  useEffect(() => {
    localStorage.setItem('mdl_current_project', currentProject);
  }, [currentProject]);

  useEffect(() => {
    if (activeTab !== 'transactions') {
      setIsTransactionsMenuOpen(false);
    } else {
      setIsTransactionsMenuOpen(true);
    }
    if (activeTab === 'reports') {
      setCurrentProject('Konsolidasi');
    }
  }, [activeTab]);

  const filteredTransactions = useMemo(() => {
    if (currentProject === 'Konsolidasi') return transactions;
    return transactions.filter(t => getTransactionProject(t) === currentProject);
  }, [transactions, currentProject]);

  const loadSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const name = session.user.user_metadata?.business_name 
          || session.user.email?.split('@')[0] 
          || 'Fintrax';
        setBusinessName(name);
        setUserEmail(session.user.email || '');
        sessionStorage.setItem('is_authenticated', 'true');
        sessionStorage.setItem('current_user', JSON.stringify({ 
          username: name, 
          role: 'admin' 
        }));
      }
    } catch (err) {
      console.warn("Error loading Supabase session in DashboardApp:", err);
    }
  };

  // Auth check — redirect to /login if no session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const name = session.user.user_metadata?.business_name 
            || session.user.email?.split('@')[0] 
            || 'Fintrax';
          setBusinessName(name);
          setUserEmail(session.user.email || '');
          sessionStorage.setItem('is_authenticated', 'true');
          sessionStorage.setItem('current_user', JSON.stringify({ 
            username: name, 
            role: 'admin' 
          }));
          setIsCheckingAuth(false);
          loadTransactions();
          return;
        }
      } catch (err) {
        console.warn("Error checking Supabase session:", err);
      }

      // No session — redirect to login
      sessionStorage.removeItem('is_authenticated');
      sessionStorage.removeItem('current_user');
      navigate('/login', { replace: true });
    };
    checkSession();
  }, [navigate]);

  const loadTransactions = async () => {
    setIsLoadingData(true);
    try {
      // Muat bagan akun (CoA) default secara lokal terlebih dahulu
      let mergedCoas = getMergedCOA();

      // Ambil seluruh data dari cloud secara paralel untuk mempercepat loading
      const [dbCoas, dbUnits, dbConfig, txData] = await Promise.all([
        getCoas().catch(err => {
          console.warn("Failed to load custom CoAs from Supabase:", err);
          return [] as COA[];
        }),
        getUnits().catch(err => {
          console.error("Failed to load units from Supabase:", err);
          return [] as BusinessUnit[];
        }),
        getReceiptConfig().catch(err => {
          console.error("Failed to load receipt config from Supabase:", err);
          return null;
        }),
        getTransactions().catch(err => {
          console.error("Failed to load transactions from Supabase:", err);
          toast.error(`Gagal mengambil data transaksi: ${err.message || err}`);
          return [] as Transaction[];
        })
      ]);

      // Gabungkan CoA lokal dengan kustom
      if (dbCoas && dbCoas.length > 0) {
        const uniqueDbCoas = dbCoas.filter(db => !mergedCoas.some(local => local.code === db.code));
        mergedCoas = [...mergedCoas, ...uniqueDbCoas];
      }
      setCoaList(mergedCoas);

      // Simpan units
      setUnits(dbUnits);

      // Simpan & muat receipt config
      setReceiptConfig(dbConfig);
      loadLogo(dbConfig);

      // Simpan transaksi
      setTransactions(txData);

    } catch (e: any) {
      console.error(e);
      toast.error(`Gagal memuat data dashboard: ${e.message || e}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogout = () => {
    // Jalankan signout secara asinkron tanpa memblokir navigasi agar logout terasa instan
    supabase.auth.signOut().catch(e => {
      console.warn("Supabase signout warning:", e);
    });
    sessionStorage.removeItem('is_authenticated');
    sessionStorage.removeItem('current_user');
    navigate('/login', { replace: true });
  };

  const triggerRefresh = () => {
    loadSession();
    loadTransactions();
    loadLogo(receiptConfig);
  };

  // Loading state while checking auth
  if (isCheckingAuth) {
    return (
      <Loader fullScreen={true} />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900/95 backdrop-blur-md text-slate-300 flex flex-col shrink-0 border-r border-slate-800/60 font-sans tracking-wide transition-all duration-300 relative",
        isSidebarCollapsed ? "w-16" : "w-60"
      )}>
        {/* Collapse toggle button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-4 -right-3 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 shadow-md cursor-pointer transition-colors"
          title={isSidebarCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <div className={cn(
          "p-4 border-b border-slate-800/60 transition-all duration-300 flex flex-col justify-center",
          isSidebarCollapsed ? "items-center" : ""
        )}>
          <div className="flex items-center gap-2 w-full justify-center">
            {businessLogo ? (
              <img 
                src={businessLogo} 
                alt="Business Logo" 
                className="w-7 h-7 object-contain rounded border border-slate-700 shrink-0" 
              />
            ) : (
              <span
                className={cn(
                  "rounded-full bg-emerald-400 inline-block shrink-0 transition-all duration-300",
                  isSidebarCollapsed ? "w-3 h-3" : "w-1.5 h-1.5"
                )}
                style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)' }}
              />
            )}
            {!isSidebarCollapsed && (
              <h1 className="text-white font-bold text-md tracking-tight font-['Space_Grotesk'] truncate flex-1">{businessName}</h1>
            )}
          </div>
          {!isSidebarCollapsed && (
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1.5 font-bold">ACCOUNTING SYSTEM</p>
          )}
        </div>
        <nav className="flex-1 py-4 overflow-y-auto space-y-1">
          {isSidebarCollapsed ? (
            <div className="border-t border-slate-800/40 my-3 mx-4" />
          ) : (
            <div className="px-4 mb-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Main Dashboard</div>
          )}
          
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "group w-full flex items-center py-2.5 transition-all duration-200 text-[11px] tracking-wider uppercase font-medium border-l-2",
              isSidebarCollapsed ? "justify-center px-0" : "px-4",
              activeTab === 'dashboard' 
                ? 'bg-slate-800/40 text-slate-100 border-l-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.02)]' 
                : 'bg-transparent text-slate-400 border-l-transparent hover:bg-slate-800/20 hover:text-slate-100'
            )}
            title={isSidebarCollapsed ? "Ringkasan Eksekutif" : undefined}
          >
            <div className={cn(
              "relative flex items-center justify-center w-5 h-5 shrink-0",
              isSidebarCollapsed ? "mr-0" : "mr-3"
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full bg-emerald-500/20 blur-[6px] transition-all duration-300 opacity-0 scale-75",
                activeTab === 'dashboard' ? "opacity-100 scale-110" : "group-hover:opacity-75 group-hover:scale-100"
              )} />
              <LayoutDashboard className={cn(
                "w-5 h-5 relative z-10 transition-all duration-300",
                activeTab === 'dashboard' 
                  ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" 
                  : "text-slate-400 group-hover:text-emerald-400 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]"
              )} strokeWidth={1.75} fill="currentColor" fillOpacity={0.4} />
            </div>
            {!isSidebarCollapsed && <span>Ringkasan Eksekutif</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('transactions')}
            className={cn(
              "group w-full flex items-center py-2.5 transition-all duration-200 text-[11px] tracking-wider uppercase font-medium border-l-2",
              isSidebarCollapsed ? "justify-center px-0" : "px-4",
              activeTab === 'transactions' 
                ? 'bg-slate-800/40 text-slate-100 border-l-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.02)]' 
                : 'bg-transparent text-slate-400 border-l-transparent hover:bg-slate-800/20 hover:text-slate-100'
            )}
            title={isSidebarCollapsed ? "Modul Transaksi" : undefined}
          >
            <div className={cn(
              "relative flex items-center justify-center w-5 h-5 shrink-0",
              isSidebarCollapsed ? "mr-0" : "mr-3"
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full bg-emerald-500/20 blur-[6px] transition-all duration-300 opacity-0 scale-75",
                activeTab === 'transactions' ? "opacity-100 scale-110" : "group-hover:opacity-75 group-hover:scale-100"
              )} />
              <ArrowLeftRight className={cn(
                "w-5 h-5 relative z-10 transition-all duration-300",
                activeTab === 'transactions' 
                  ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" 
                  : "text-slate-400 group-hover:text-emerald-400 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]"
              )} strokeWidth={1.75} fill="currentColor" fillOpacity={0.4} />
            </div>
            {!isSidebarCollapsed && <span>Modul Transaksi</span>}
          </button>
          
          {isSidebarCollapsed ? (
            <div className="border-t border-slate-800/40 my-3 mx-4" />
          ) : (
            <div className="px-4 mt-6 mb-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Laporan Keuangan</div>
          )}
          
          <button 
            onClick={() => setActiveTab('ledger')}
            className={cn(
              "group w-full flex items-center py-2.5 transition-all duration-200 text-[11px] tracking-wider uppercase font-medium border-l-2",
              isSidebarCollapsed ? "justify-center px-0" : "px-4",
              activeTab === 'ledger' 
                ? 'bg-slate-800/40 text-slate-100 border-l-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.02)]' 
                : 'bg-transparent text-slate-400 border-l-transparent hover:bg-slate-800/20 hover:text-slate-100'
            )}
            title={isSidebarCollapsed ? "Buku Besar" : undefined}
          >
            <div className={cn(
              "relative flex items-center justify-center w-5 h-5 shrink-0",
              isSidebarCollapsed ? "mr-0" : "mr-3"
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full bg-emerald-500/20 blur-[6px] transition-all duration-300 opacity-0 scale-75",
                activeTab === 'ledger' ? "opacity-100 scale-110" : "group-hover:opacity-75 group-hover:scale-100"
              )} />
              <BookOpenCheck className={cn(
                "w-5 h-5 relative z-10 transition-all duration-300",
                activeTab === 'ledger' 
                  ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" 
                  : "text-slate-400 group-hover:text-emerald-400 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]"
              )} strokeWidth={1.75} fill="currentColor" fillOpacity={0.4} />
            </div>
            {!isSidebarCollapsed && <span>Buku Besar</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('trial-balance')}
            className={cn(
              "group w-full flex items-center py-2.5 transition-all duration-200 text-[11px] tracking-wider uppercase font-medium border-l-2",
              isSidebarCollapsed ? "justify-center px-0" : "px-4",
              activeTab === 'trial-balance' 
                ? 'bg-slate-800/40 text-slate-100 border-l-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.02)]' 
                : 'bg-transparent text-slate-400 border-l-transparent hover:bg-slate-800/20 hover:text-slate-100'
            )}
            title={isSidebarCollapsed ? "Neraca Saldo" : undefined}
          >
            <div className={cn(
              "relative flex items-center justify-center w-5 h-5 shrink-0",
              isSidebarCollapsed ? "mr-0" : "mr-3"
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full bg-emerald-500/20 blur-[6px] transition-all duration-300 opacity-0 scale-75",
                activeTab === 'trial-balance' ? "opacity-100 scale-110" : "group-hover:opacity-75 group-hover:scale-100"
              )} />
              <Scale className={cn(
                "w-5 h-5 relative z-10 transition-all duration-300",
                activeTab === 'trial-balance' 
                  ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" 
                  : "text-slate-400 group-hover:text-emerald-400 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]"
              )} strokeWidth={1.75} fill="currentColor" fillOpacity={0.4} />
            </div>
            {!isSidebarCollapsed && <span>Neraca Saldo</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
              "group w-full flex items-center py-2.5 transition-all duration-200 text-[11px] tracking-wider uppercase font-medium border-l-2",
              isSidebarCollapsed ? "justify-center px-0" : "px-4",
              activeTab === 'reports' 
                ? 'bg-slate-800/40 text-slate-100 border-l-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.02)]' 
                : 'bg-transparent text-slate-400 border-l-transparent hover:bg-slate-800/20 hover:text-slate-100'
            )}
            title={isSidebarCollapsed ? "Laba Rugi (P&L)" : undefined}
          >
            <div className={cn(
              "relative flex items-center justify-center w-5 h-5 shrink-0",
              isSidebarCollapsed ? "mr-0" : "mr-3"
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full bg-emerald-500/20 blur-[6px] transition-all duration-300 opacity-0 scale-75",
                activeTab === 'reports' ? "opacity-100 scale-110" : "group-hover:opacity-75 group-hover:scale-100"
              )} />
              <TrendingUp className={cn(
                "w-5 h-5 relative z-10 transition-all duration-300",
                activeTab === 'reports' 
                  ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" 
                  : "text-slate-400 group-hover:text-emerald-400 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]"
              )} strokeWidth={1.75} fill="currentColor" fillOpacity={0.4} />
            </div>
            {!isSidebarCollapsed && <span>Laba Rugi (P&L)</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('scorecard')}
            className={cn(
              "group w-full flex items-center py-2.5 transition-all duration-200 text-[11px] tracking-wider uppercase font-medium border-l-2",
              isSidebarCollapsed ? "justify-center px-0" : "px-4",
              activeTab === 'scorecard' 
                ? 'bg-slate-800/40 text-slate-100 border-l-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.02)]' 
                : 'bg-transparent text-slate-400 border-l-transparent hover:bg-slate-800/20 hover:text-slate-100'
            )}
            title={isSidebarCollapsed ? "Kartu Penjualan" : undefined}
          >
            <div className={cn(
              "relative flex items-center justify-center w-5 h-5 shrink-0",
              isSidebarCollapsed ? "mr-0" : "mr-3"
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full bg-emerald-500/20 blur-[6px] transition-all duration-300 opacity-0 scale-75",
                activeTab === 'scorecard' ? "opacity-100 scale-110" : "group-hover:opacity-75 group-hover:scale-100"
              )} />
              <Receipt className={cn(
                "w-5 h-5 relative z-10 transition-all duration-300",
                activeTab === 'scorecard' 
                  ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" 
                  : "text-slate-400 group-hover:text-emerald-400 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]"
              )} strokeWidth={1.75} fill="currentColor" fillOpacity={0.4} />
            </div>
            {!isSidebarCollapsed && <span>Kartu Penjualan</span>}
          </button>
 
          {isSidebarCollapsed ? (
            <div className="border-t border-slate-800/40 my-3 mx-4" />
          ) : (
            <div className="px-4 mt-6 mb-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Bantuan AI</div>
          )}
          
          <button 
            onClick={() => setActiveTab('ai-help')}
            className={cn(
              "group w-full flex items-center py-2.5 transition-all duration-200 text-[11px] tracking-wider uppercase font-bold border-l-2",
              isSidebarCollapsed ? "justify-center px-0" : "px-4",
              activeTab === 'ai-help' 
                ? 'bg-slate-800/40 text-emerald-400 border-l-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.05)]' 
                : 'bg-transparent text-emerald-400/90 border-l-transparent hover:bg-slate-800/20 hover:text-emerald-400'
            )}
            title={isSidebarCollapsed ? "FintraxAI" : undefined}
          >
            <div className={cn(
              "relative flex items-center justify-center w-5 h-5 shrink-0",
              isSidebarCollapsed ? "mr-0" : "mr-3"
            )}>
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-[6px] animate-pulse" />
              <Sparkles className="w-5 h-5 relative z-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-[pulse_2s_infinite]" strokeWidth={1.75} fill="currentColor" fillOpacity={0.4} />
            </div>
            {!isSidebarCollapsed && <span>FintraxAI</span>}
          </button>
 
          {isSidebarCollapsed ? (
            <div className="border-t border-slate-800/40 my-3 mx-4" />
          ) : (
            <div className="px-4 mt-6 mb-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pengaturan</div>
          )}
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "group w-full flex items-center py-2.5 transition-all duration-200 text-[11px] tracking-wider uppercase font-medium border-l-2",
              isSidebarCollapsed ? "justify-center px-0" : "px-4",
              activeTab === 'settings' 
                ? 'bg-slate-800/40 text-slate-100 border-l-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.02)]' 
                : 'bg-transparent text-slate-400 border-l-transparent hover:bg-slate-800/20 hover:text-slate-100'
            )}
            title={isSidebarCollapsed ? "Pengaturan Sistem" : undefined}
          >
            <div className={cn(
              "relative flex items-center justify-center w-5 h-5 shrink-0",
              isSidebarCollapsed ? "mr-0" : "mr-3"
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full bg-emerald-500/20 blur-[6px] transition-all duration-300 opacity-0 scale-75",
                activeTab === 'settings' ? "opacity-100 scale-110" : "group-hover:opacity-75 group-hover:scale-100"
              )} />
              <Settings2 className={cn(
                "w-5 h-5 relative z-10 transition-all duration-300",
                activeTab === 'settings' 
                  ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" 
                  : "text-slate-400 group-hover:text-emerald-400 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]"
              )} strokeWidth={1.75} fill="currentColor" fillOpacity={0.4} />
            </div>
            {!isSidebarCollapsed && <span>Pengaturan Sistem</span>}
          </button>
        </nav>

        {/* User info & logout */}
        <div className={cn(
          "bg-slate-950/40 shrink-0 border-t border-slate-800/40 flex flex-col gap-3 transition-all duration-300",
          isSidebarCollapsed ? "p-3 items-center justify-center" : "p-4"
        )}>
          <div className={cn(
            "flex items-center justify-between w-full",
            isSidebarCollapsed ? "flex-col gap-2 justify-center" : ""
          )}>
            {!isSidebarCollapsed ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white font-semibold truncate">{businessName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{userEmail}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="ml-2 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer w-9 h-9 flex items-center justify-center"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-10 bg-white border-b border-slate-200 flex items-center justify-between px-5 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <span>📅</span> {todayDate}
            </span>
            {isLoadingData && <Loader2 className="w-3 h-3 text-slate-400 animate-spin ml-1" />}
          </div>
          <div className="flex items-center gap-3">
            {logoBase64 && (
              <img 
                src={logoBase64} 
                alt="Business Logo" 
                className="h-6 w-auto object-contain rounded border border-slate-200"
              />
            )}
            <span className="text-xs font-black text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/80 max-w-xs">{businessName}</span>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="p-4">
              <Dashboard 
                transactions={filteredTransactions} 
                onCheckoutClick={(dpId) => {
                  setCheckoutDpId(dpId);
                  setCurrentProject('Pariwisata');
                  setActiveTab('transactions');
                }}
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
              />
            </div>
          )}
          {activeTab === 'transactions' && (
            <div className="p-4">
              <TransactionsPage 
                transactions={transactions} 
                coaList={coaList}
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
                onRefresh={triggerRefresh} 
                checkoutDpId={checkoutDpId}
                onClearCheckoutDpId={() => setCheckoutDpId(null)}
                units={units}
                receiptConfig={receiptConfig}
              />
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <FinancialReports 
                transactions={filteredTransactions} 
                coaList={coaList}
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
                onAnalyzeWithAI={(promptText) => {
                  setAiInitialPrompt(promptText);
                  setActiveTab('ai-help');
                }}
                allUnits={units}
              />
            </div>
          )}
          {activeTab === 'scorecard' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <ScorecardPage transactions={filteredTransactions} />
            </div>
          )}
          {activeTab === 'ledger' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <LedgerPage 
                transactions={filteredTransactions} 
                coaList={coaList}
                onRefresh={triggerRefresh} 
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
                allUnits={units}
              />
            </div>
          )}
          {activeTab === 'trial-balance' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <TrialBalancePage 
                transactions={filteredTransactions} 
                coaList={coaList}
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
              />
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <SettingsPage 
                onRefresh={triggerRefresh} 
                units={units}
                receiptConfig={receiptConfig}
              />
            </div>
          )}
          {activeTab === 'ai-help' && (
            <div className="p-4 bg-slate-50 min-h-full">
              <FintraxAI 
                transactions={transactions} 
                initialPrompt={aiInitialPrompt}
                onClearInitialPrompt={() => setAiInitialPrompt(null)}
              />
            </div>
          )}
        </div>
      </main>
      <Toaster position="top-right">
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button 
                    onClick={() => toast.dismiss(t.id)}
                    className="ml-1 text-slate-400 hover:text-slate-600 rounded transition-colors text-[14px] font-bold outline-none border-none bg-transparent cursor-pointer flex items-center justify-center w-4 h-4"
                  >
                    &times;
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
    </div>
  );
}
