import React, { useState, useMemo } from 'react';
import { Transaction, BusinessUnit } from '../types';
import { COA, getCoaProject } from '../data/coa';
import { formatRp, exportToExcel, exportToPDF } from '../lib/export';
import { Download, BookOpen, Scale, FileEdit, Plus, Trash2, Loader2 } from 'lucide-react';
import { addTransaction } from '../lib/apiDb';
import toast from 'react-hot-toast';
import { formatSafeDate, parseSafeDate } from '../lib/utils';

export default function LedgerPage({ 
  transactions, 
  coaList,
  onRefresh,
  currentProject,
  onProjectChange,
  allUnits
}: { 
  transactions: Transaction[]; 
  coaList: COA[];
  onRefresh?: () => void;
  currentProject?: 'Pariwisata' | 'Properti' | 'Konsolidasi';
  onProjectChange?: (project: 'Pariwisata' | 'Properti' | 'Konsolidasi') => void;
  allUnits: BusinessUnit[];
}) {
  const [activeSubTab, setActiveSubTab] = useState<'detail' | 'balances' | 'manual-journal'>('balances');
  const [detailPage, setDetailPage] = useState(1);
  const [journalPage, setJournalPage] = useState(1);
  const coasList = coaList;

  const isDescendantOf = (childCode: string, parentCode: string): boolean => {
    if (parentCode === '11000') {
      if (childCode === '11000') return false;
      const coa = coasList.find(c => c.code === childCode);
      return coa?.type === 'BANK' || coa?.parentCode === '11000';
    }
    
    let currentCode = childCode;
    while (currentCode) {
      const coa = coasList.find(c => c.code === currentCode);
      if (coa && coa.parentCode === parentCode) {
        return true;
      }
      currentCode = coa?.parentCode || '';
    }
    return false;
  };
  
  const availableAccounts = useMemo(() => {
    const list: any[] = [];
    
    const usedCodes = new Set<string>();
    transactions.forEach(t => {
      if (t.accountCode) usedCodes.add(t.accountCode);
      if (t.accountId) usedCodes.add(t.accountId);
    });

    const allActiveCodes = new Set(usedCodes);
    usedCodes.forEach(code => {
      let currentCode = code;
      while (currentCode) {
        const coa = coasList.find(c => c.code === currentCode);
        if (coa && coa.parentCode) {
          allActiveCodes.add(coa.parentCode);
          currentCode = coa.parentCode;
        } else {
          break;
        }
      }
    });
    
    coasList.forEach(coa => {
      if (coa.type === 'BANK' || allActiveCodes.has(coa.code)) {
        if (!list.find(item => item.code === coa.code)) {
          list.push({ ...coa });
        }
      }
    });

    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [coasList, transactions]);

  const [selectedAccount, setSelectedAccount] = useState<string>('11000');

  // Dynamic Units list matching project context
  const units = useMemo(() => {
    return (allUnits || [])
      .filter(u => {
        if (currentProject && currentProject !== 'Konsolidasi' && u.project !== currentProject) return false;
        return true;
      })
      .map(u => u.name);
  }, [currentProject, allUnits]);

  // Project-specific custom CoA filtering
  const filteredCoasList = useMemo(() => {
    return coasList.filter(c => {
      if (currentProject && currentProject !== 'Konsolidasi' && c.project && c.project !== currentProject && c.project !== 'Umum') return false;
      return true;
    });
  }, [coasList, currentProject]);

  // Manual Journal Form State
  const [journalDate, setJournalDate] = useState(formatSafeDate(new Date(), 'yyyy-MM-dd'));
  const [journalMemo, setJournalMemo] = useState('');
  const [journalUnit, setJournalUnit] = useState('');
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [journalAmount, setJournalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync active unit selection on project context switch
  React.useEffect(() => {
    if (units.length > 0 && !units.includes(journalUnit)) {
      setJournalUnit(units[0]);
    }
  }, [units, journalUnit]);

  // Tab 1: Ledger calculation
  const ledgerData = useMemo(() => {
    let balance = 0;
    
    const isAssetOrExpense = (code: string) => {
      if (code === '11000') return true;
      const coa = coasList.find(c => c.code === code);
      if (!coa) return true;
      return ['Asset', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS'].includes(coa.type);
    };

    const isBankAccount = (code: string) => {
      if (code === '11000') return true;
      const coa = coasList.find(c => c.code === code);
      return coa?.type === 'BANK';
    };

    const isDebitNormal = isAssetOrExpense(selectedAccount);

    const rows = transactions
      .filter(t => {
        const isManualJournal = t.id.startsWith('JU-') || t.description.startsWith('[Jurnal Umum]');
        
        if (isManualJournal) {
          // Jurnal Umum: matches if t.accountCode is selectedAccount or a descendant
          return t.accountCode === selectedAccount || isDescendantOf(t.accountCode, selectedAccount);
        }
        
        // Regular transaction: matches if t.accountId matches selectedAccount OR t.accountCode matches selectedAccount
        const bankCode = t.accountId || '11000';
        
        const matchesSelected = (code: string) => {
          if (code === selectedAccount) return true;
          return isDescendantOf(code, selectedAccount);
        };

        if (isBankAccount(selectedAccount)) {
          return matchesSelected(bankCode);
        }
        return matchesSelected(t.accountCode);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => {
        const isManualJournal = t.id.startsWith('JU-') || t.description.startsWith('[Jurnal Umum]');
        
        let debit = 0;
        let credit = 0;
        let ref = '';

        if (isManualJournal) {
          if (t.type === 'Expense') { // JU-D (Debit)
            debit = t.amount;
          } else { // JU-K (Credit)
            credit = t.amount;
          }
          
          // Opposing ref account: find the other leg of the same journal entry
          const isDebit = t.type === 'Expense';
          const matchPrefix = isDebit ? t.id.replace('JU-D-', 'JU-K-') : t.id.replace('JU-K-', 'JU-D-');
          const otherLine = transactions.find(ot => ot.id === matchPrefix);
          ref = otherLine ? otherLine.accountCode : '';
        } else {
          // Regular transactions:
          const bankCode = t.accountId || '11000';
          if (isBankAccount(selectedAccount)) {
            const isAffected = selectedAccount === bankCode || isDescendantOf(bankCode, selectedAccount);
            if (isAffected) {
              if (t.type === 'Income') {
                debit = t.amount;
              } else {
                credit = t.amount;
              }
            }
          } else {
            const isAffected = selectedAccount === t.accountCode || isDescendantOf(t.accountCode, selectedAccount);
            if (isAffected) {
              if (t.type === 'Income') {
                credit = t.amount;
              } else {
                debit = t.amount;
              }
            }
          }
          ref = t.accountCode === selectedAccount ? bankCode : t.accountCode;
        }

        if (isDebitNormal) {
          balance = balance + debit - credit;
        } else {
          balance = balance + credit - debit;
        }

        return {
          id: t.id,
          date: t.date,
          description: isManualJournal ? t.description.replace('[Jurnal Umum] ', '') : (t.description || `Transaksi ${t.type === 'Income' ? 'Penerimaan' : 'Pengeluaran'}`),
          unit: t.unit,
          ref,
          debit,
          credit,
          balance
        };
      });

    return rows;
  }, [transactions, selectedAccount, coasList]);

  // Tab 2: Account Balances Calculation
  const accountBalances = useMemo(() => {
    const directBalances: Record<string, { debit: number; credit: number; normalBalance: 'Debit' | 'Credit' }> = {};

    coasList.forEach(coa => {
      directBalances[coa.code] = {
        debit: 0,
        credit: 0,
        normalBalance: ['Asset', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS'].includes(coa.type) ? 'Debit' : 'Credit'
      };
    });

    directBalances['11000'] = { debit: 0, credit: 0, normalBalance: 'Debit' };

    transactions.forEach(t => {
      const isManualJournal = t.id.startsWith('JU-') || t.description.startsWith('[Jurnal Umum]');

      if (isManualJournal) {
        if (t.accountCode) {
          if (!directBalances[t.accountCode]) {
            const coa = coasList.find(c => c.code === t.accountCode);
            const isDebitNormal = coa ? ['Asset', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS'].includes(coa.type) : true;
            directBalances[t.accountCode] = { debit: 0, credit: 0, normalBalance: isDebitNormal ? 'Debit' : 'Credit' };
          }
          if (t.type === 'Expense') { // JU-D (Debit)
            directBalances[t.accountCode].debit += t.amount;
          } else { // JU-K (Credit)
            directBalances[t.accountCode].credit += t.amount;
          }
        }
        return;
      }

      // Regular transactions:
      const bankCode = t.accountId || '11000';
      if (!directBalances[bankCode]) {
        directBalances[bankCode] = { debit: 0, credit: 0, normalBalance: 'Debit' };
      }

      if (t.type === 'Income') {
        directBalances[bankCode].debit += t.amount;
        if (t.accountCode) {
          if (!directBalances[t.accountCode]) {
            const coa = coasList.find(c => c.code === t.accountCode);
            const isDebitNormal = coa ? ['Asset', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS'].includes(coa.type) : false;
            directBalances[t.accountCode] = { debit: 0, credit: 0, normalBalance: isDebitNormal ? 'Debit' : 'Credit' };
          }
          directBalances[t.accountCode].credit += t.amount;
        }
      } else {
        directBalances[bankCode].credit += t.amount;
        if (t.accountCode) {
          if (!directBalances[t.accountCode]) {
            const coa = coasList.find(c => c.code === t.accountCode);
            const isDebitNormal = coa ? ['Asset', 'FASS', 'OASS', 'BANK', 'EXPS', 'OEXP', 'COGS'].includes(coa.type) : true;
            directBalances[t.accountCode] = { debit: 0, credit: 0, normalBalance: isDebitNormal ? 'Debit' : 'Credit' };
          }
          directBalances[t.accountCode].debit += t.amount;
        }
      }
    });

    // Rollup child accounts' direct balances to their parent accounts
    const aggregatedBalances: Record<string, { debit: number; credit: number; normalBalance: 'Debit' | 'Credit' }> = {};
    
    Object.keys(directBalances).forEach(code => {
      aggregatedBalances[code] = { ...directBalances[code] };
    });

    Object.keys(aggregatedBalances).forEach(parentCode => {
      Object.keys(directBalances).forEach(childCode => {
        if (childCode !== parentCode && isDescendantOf(childCode, parentCode)) {
          aggregatedBalances[parentCode].debit += directBalances[childCode].debit;
          aggregatedBalances[parentCode].credit += directBalances[childCode].credit;
        }
      });
    });

    const list = Object.entries(aggregatedBalances).map(([code, b]) => {
      const isDebitNormal = b.normalBalance === 'Debit';
      let balanceValue = 0;
      if (isDebitNormal) {
        balanceValue = b.debit - b.credit;
      } else {
        balanceValue = b.credit - b.debit;
      }

      const coaInfo = coasList.find(c => c.code === code);
      return {
        code,
        name: coaInfo?.name || (code === '11000' ? 'Kas & Bank' : 'Akun Kustom'),
        type: coaInfo?.type || (code === '11000' ? 'Asset' : 'Custom'),
        parentCode: coaInfo?.parentCode,
        debit: b.debit,
        credit: b.credit,
        balance: balanceValue
      };
    });

    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [coasList, transactions]);

  // Tab 3: Manual Journal Entry List
  const manualJournalHistory = useMemo(() => {
    return transactions
      .filter(t => t.description.startsWith('[Jurnal Umum]'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(t => {
        const isDebit = t.type === 'Expense';
        return {
          id: t.id,
          date: t.date,
          description: t.description.replace('[Jurnal Umum] ', ''),
          unit: t.unit,
          code: t.accountCode,
          name: t.accountName,
          debit: isDebit ? t.amount : 0,
          credit: !isDebit ? t.amount : 0
        };
      });
  }, [transactions]);

  const paginatedLedgerData = useMemo(() => {
    return ledgerData.slice((detailPage - 1) * 20, detailPage * 20);
  }, [ledgerData, detailPage]);

  const paginatedJournalHistory = useMemo(() => {
    return manualJournalHistory.slice((journalPage - 1) * 20, journalPage * 20);
  }, [manualJournalHistory, journalPage]);

  React.useEffect(() => {
    setDetailPage(1);
  }, [selectedAccount]);

  React.useEffect(() => {
    setJournalPage(1);
  }, [activeSubTab]);

  const handleSaveManualJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitAccount || !creditAccount || !journalAmount || !journalMemo) {
      toast.error('Harap isi semua kolom jurnal');
      return;
    }
    if (debitAccount === creditAccount) {
      toast.error('Akun Debet dan Kredit tidak boleh sama!');
      return;
    }

    setIsSubmitting(true);
    try {
      const debitAccName = coasList.find(c => c.code === debitAccount)?.name || '';
      const creditAccName = coasList.find(c => c.code === creditAccount)?.name || '';
      const amount = parseFloat(journalAmount.replace(/\./g, '')) || 0;
      const commonId = crypto.randomUUID();

      const projDebit = getCoaProject(debitAccount, debitAccName);
      const txDebit: Transaction = {
        id: `JU-D-${commonId}`,
        date: new Date(journalDate).toISOString(),
        type: 'Expense', // debits the selected account in ledger normal flow
        amount: amount,
        unit: journalUnit,
        accountCode: debitAccount,
        accountName: debitAccName,
        description: `[Jurnal Umum] ${journalMemo}`,
        project: projDebit === 'Umum' ? undefined : (projDebit as 'Pariwisata' | 'Properti')
      };

      const projCredit = getCoaProject(creditAccount, creditAccName);
      const txCredit: Transaction = {
        id: `JU-K-${commonId}`,
        date: new Date(journalDate).toISOString(),
        type: 'Income', // credits the selected account in ledger normal flow
        amount: amount,
        unit: journalUnit,
        accountCode: creditAccount,
        accountName: creditAccName,
        description: `[Jurnal Umum] ${journalMemo}`,
        project: projCredit === 'Umum' ? undefined : (projCredit as 'Pariwisata' | 'Properti')
      };

      await addTransaction(txDebit);
      await addTransaction(txCredit);

      toast.success('Jurnal Umum Manual berhasil disimpan!');
      setJournalMemo('');
      setJournalAmount('');
      setDebitAccount('');
      setCreditAccount('');
      
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menyimpan Jurnal Umum');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    const accountName = availableAccounts.find(a => a.code === selectedAccount)?.name || '';
    const title = `Buku Besar - [${selectedAccount}] ${accountName}`;
    const headers = ['Tanggal', 'Ref', 'Keterangan', 'Barang & Jasa', 'Debet', 'Kredit', 'Saldo'];
    const rows = ledgerData.map(r => [
      formatSafeDate(r.date, 'dd/MM/yyyy'), 
      r.ref || '-', 
      r.description, 
      r.unit, 
      r.debit > 0 ? formatRp(r.debit) : '-', 
      r.credit > 0 ? formatRp(r.credit) : '-', 
      r.balance < 0 ? `(${formatRp(Math.abs(r.balance))})` : formatRp(r.balance)
    ]);
    exportToPDF(title, headers, rows);
  };

  const handleExportExcel = () => {
    const accountName = availableAccounts.find(a => a.code === selectedAccount)?.name || '';
    const title = `Buku Besar - ${selectedAccount}`;
    const data = ledgerData.map(r => ({
      Tanggal: formatSafeDate(r.date, 'dd/MM/yyyy'),
      Ref: r.ref || '-',
      Keterangan: r.description,
      Unit: r.unit,
      Debet: r.debit,
      Kredit: r.credit,
      Saldo: r.balance < 0 ? `(${formatRp(Math.abs(r.balance))})` : formatRp(r.balance)
    }));
    exportToExcel(title, data);
  };

  const selectedAccountData = availableAccounts.find(a => a.code === selectedAccount);

  const formatSaldo = (val: number) => {
    if (val < 0) {
      return <span className="text-red-600 font-bold">({formatRp(Math.abs(val))})</span>;
    }
    return <span className="text-slate-900 font-medium">{formatRp(val)}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Project selector dropdown (ledger-local) */}
      {currentProject && onProjectChange && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Proyek Buku Besar</h3>
            <p className="text-[10px] text-slate-400 font-medium">Saring data buku besar berdasarkan proyek aktif</p>
          </div>
          <select
            value={currentProject}
            onChange={(e) => onProjectChange(e.target.value as any)}
            className="w-full sm:w-64 bg-slate-50 border border-slate-300 text-slate-800 py-1.5 px-3 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
          >
            <option value="Konsolidasi">📂 Buku Besar Konsolidasi (Semua)</option>
            <option value="Pariwisata">🌴 Buku Besar Pariwisata</option>
            <option value="Properti">🏡 Buku Besar Properti</option>
          </select>
        </div>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Buku Besar (General Ledger)</h2>
          <p className="text-sm text-slate-500 font-mono mt-1">Kelola pembukuan ledger, periksa saldo akun, dan catat jurnal manual</p>
        </div>
      </div>

      {/* Sub-menu Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-lg p-1 gap-1 shadow-sm max-w-xl">
        <button
          onClick={() => setActiveSubTab('balances')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeSubTab === 'balances' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <Scale className="w-3.5 h-3.5" />
          Saldo Akun Perkiraan
        </button>
        <button
          onClick={() => setActiveSubTab('detail')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeSubTab === 'detail' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Rincian Buku Besar
        </button>
        <button
          onClick={() => setActiveSubTab('manual-journal')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeSubTab === 'manual-journal' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <FileEdit className="w-3.5 h-3.5" />
          Jurnal Umum Manual
        </button>
      </div>

      {/* Tab 1: Ledger Detail */}
      {activeSubTab === 'detail' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Pilih Akun Buku Besar</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
              >
                {availableAccounts.map(a => (
                  <option 
                    key={a.code} 
                    value={a.code}
                    className={a.parentCode ? "text-slate-600 pl-4 font-normal" : "font-bold text-slate-900 bg-slate-100"}
                  >
                    {a.parentCode ? `\u00A0\u00A0\u00A0\u00A0└─ [${a.code}] ${a.name}` : `[${a.code}] ${a.name}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Golongan Akun</label>
               <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-mono text-sm text-slate-500">
                 {selectedAccountData?.type || '-'}
               </div>
            </div>
            <div className="flex gap-2 self-end">
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded font-medium shadow-sm hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Excel</span>
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded font-medium shadow-sm hover:bg-red-700 transition"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">PDF</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-r border-slate-100">Tanggal</th>
                  <th className="px-4 py-3 border-r border-slate-100">Ref</th>
                  <th className="px-4 py-3 border-r border-slate-100">Keterangan</th>
                  <th className="px-4 py-3 border-r border-slate-100">Barang & Jasa</th>
                  <th className="px-4 py-3 text-right border-r border-slate-100">Debet</th>
                  <th className="px-4 py-3 text-right border-r border-slate-100">Kredit</th>
                  <th className="px-4 py-3 text-right font-black text-slate-800">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLedgerData.length === 0 ? (
                  <tr>
                     <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm font-medium">Buku besar kosong untuk akun tersebut.</td>
                  </tr>
                ) : (
                  paginatedLedgerData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 border-r border-slate-100 whitespace-nowrap text-slate-700">
                        {formatSafeDate(row.date, 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-100 font-mono text-xs text-slate-500">{row.ref || '-'}</td>
                      <td className="px-4 py-2 border-r border-slate-100 text-slate-700 max-w-xs truncate">{row.description}</td>
                      <td className="px-4 py-2 border-r border-slate-100 text-xs text-slate-500 font-mono">{row.unit}</td>
                      <td className="px-4 py-2 text-right border-r border-slate-100 font-mono text-xs text-slate-800">
                        {row.debit > 0 ? formatRp(row.debit) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right border-r border-slate-100 font-mono text-xs text-slate-800">
                        {row.credit > 0 ? formatRp(row.credit) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs bg-slate-50/50">
                        {formatSaldo(row.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {ledgerData.length > 20 && (
              <div className="flex justify-between items-center p-4 bg-slate-50 border-t border-slate-200 text-xs">
                <button
                  onClick={() => setDetailPage(prev => Math.max(prev - 1, 1))}
                  disabled={detailPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded font-bold hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="text-slate-500 font-medium">
                  Halaman {detailPage} dari {Math.ceil(ledgerData.length / 20)}
                </span>
                <button
                  onClick={() => setDetailPage(prev => Math.min(prev + 1, Math.ceil(ledgerData.length / 20)))}
                  disabled={detailPage >= Math.ceil(ledgerData.length / 20)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded font-bold hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Account Balances */}
      {activeSubTab === 'balances' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 border-r border-slate-100">Kode Akun</th>
                <th className="px-6 py-4 border-r border-slate-100">Nama Akun</th>
                <th className="px-6 py-4 border-r border-slate-100">Kategori</th>
                <th className="px-6 py-4 text-right border-r border-slate-100">Total Debet</th>
                <th className="px-6 py-4 text-right border-r border-slate-100">Total Kredit</th>
                <th className="px-6 py-4 text-right border-r border-slate-100">Saldo Akhir</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accountBalances.map((item, idx) => (
                <tr key={`${item.code}-${idx}`} className={`hover:bg-slate-50 transition-colors ${!item.parentCode ? 'bg-slate-50/70 font-semibold' : ''}`}>
                  <td className={`px-6 py-3 border-r border-slate-100 font-mono text-xs text-slate-700 ${!item.parentCode ? 'font-bold' : ''}`}>{item.code}</td>
                  <td className={`px-6 py-3 border-r border-slate-100 text-slate-800 ${!item.parentCode ? 'font-bold text-slate-900' : 'text-slate-600 pl-10 font-normal'}`}>
                    {!item.parentCode ? item.name : `└─ ${item.name}`}
                  </td>
                  <td className="px-6 py-3 border-r border-slate-100">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${!item.parentCode ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'} uppercase`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right border-r border-slate-100 font-mono text-xs text-slate-600">
                    {item.debit > 0 ? formatRp(item.debit) : '-'}
                  </td>
                  <td className="px-6 py-3 text-right border-r border-slate-100 font-mono text-xs text-slate-600">
                    {item.credit > 0 ? formatRp(item.credit) : '-'}
                  </td>
                  <td className="px-6 py-3 text-right border-r border-slate-100 font-mono text-xs">
                    {formatSaldo(item.balance)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedAccount(item.code);
                        setActiveSubTab('detail');
                      }}
                      className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold transition-colors"
                    >
                      Lihat Buku Besar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Manual General Journal Form and list */}
      {activeSubTab === 'manual-journal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-blue-600" />
              Catat Jurnal Manual
            </h3>
            
            <form onSubmit={handleSaveManualJournal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tanggal</label>
                <input 
                  type="date"
                  required
                  value={journalDate}
                  onChange={e => setJournalDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
                />
              </div>

              {currentProject !== 'Properti' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Barang & Jasa</label>
                  <select
                    value={journalUnit}
                    onChange={e => setJournalUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Akun Debet</label>
                <select
                  required
                  value={debitAccount}
                  onChange={e => setDebitAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-mono"
                >
                  <option value="">-- Pilih Akun Debet --</option>
                  {filteredCoasList.map(c => (
                    <option key={c.code} value={c.code} className={c.parentCode ? "text-slate-600 pl-4" : "font-bold text-slate-900"}>
                      {c.parentCode ? `\u00A0\u00A0\u00A0\u00A0└─ [${c.code}] ${c.name}` : `[${c.code}] ${c.name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Akun Kredit</label>
                <select
                  required
                  value={creditAccount}
                  onChange={e => setCreditAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-mono"
                >
                  <option value="">-- Pilih Akun Kredit --</option>
                  {filteredCoasList.map(c => (
                    <option key={c.code} value={c.code} className={c.parentCode ? "text-slate-600 pl-4" : "font-bold text-slate-900"}>
                      {c.parentCode ? `\u00A0\u00A0\u00A0\u00A0└─ [${c.code}] ${c.name}` : `[${c.code}] ${c.name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nominal (Rp)</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0"
                  value={journalAmount}
                  onChange={e => {
                    const rawVal = e.target.value.replace(/\D/g, '');
                    const formatted = rawVal ? Number(rawVal).toLocaleString('id-ID') : '';
                    setJournalAmount(formatted);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Keterangan / Memo</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Keterangan transaksi jurnal umum..."
                  value={journalMemo}
                  onChange={e => setJournalMemo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 text-white font-bold uppercase tracking-wider rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors text-xs"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Simpan Jurnal Umum
              </button>
            </form>
          </div>

          {/* History List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Riwayat Jurnal Umum Manual</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2 font-bold">Tanggal</th>
                    <th className="px-4 py-2 font-bold">Keterangan</th>
                    <th className="px-4 py-2 font-bold">Barang & Jasa</th>
                    <th className="px-4 py-2 font-bold">Akun Perkiraan</th>
                    <th className="px-4 py-2 font-bold text-right">Debet</th>
                    <th className="px-4 py-2 font-bold text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedJournalHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">Belum ada riwayat pencatatan jurnal manual.</td>
                    </tr>
                  ) : (
                    paginatedJournalHistory.map((row, idx) => (
                      <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                          {formatSafeDate(row.date, 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-2 text-slate-900 font-medium">{row.description}</td>
                        <td className="px-4 py-2 text-slate-600 font-mono text-[10px] uppercase">{row.unit}</td>
                        <td className="px-4 py-2 text-slate-700">
                          <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-slate-400">{row.code}</span>
                            <span className="truncate max-w-[120px]">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-800">
                          {row.debit > 0 ? formatRp(row.debit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-800">
                          {row.credit > 0 ? formatRp(row.credit) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {manualJournalHistory.length > 20 && (
              <div className="flex justify-between items-center p-4 bg-slate-50 border-t border-slate-200 text-xs">
                <button
                  onClick={() => setJournalPage(prev => Math.max(prev - 1, 1))}
                  disabled={journalPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded font-bold hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="text-slate-500 font-medium">
                  Halaman {journalPage} dari {Math.ceil(manualJournalHistory.length / 20)}
                </span>
                <button
                  onClick={() => setJournalPage(prev => Math.min(prev + 1, Math.ceil(manualJournalHistory.length / 20)))}
                  disabled={journalPage >= Math.ceil(manualJournalHistory.length / 20)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded font-bold hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
