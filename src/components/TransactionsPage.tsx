import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, BusinessUnit, ReceiptConfig } from '../types';
import { addTransaction, deleteTransaction, updateTransaction, addCoa } from '../lib/apiDb';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Trash2, Pencil, Loader2, Search, Printer, CheckCircle, RefreshCw, KeyRound, User, Wallet, Sparkles } from 'lucide-react';
import { cn, getTransactionProject, formatSafeDate, parseSafeDate, generateTxNumber } from '../lib/utils';
import { COA } from '../data/coa';
import CreatableSelect from 'react-select/creatable';
import toast from 'react-hot-toast';
import KwitansiModal from './KwitansiModal';
import { SearchableSelect } from './SearchableSelect';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function TransactionsPage({ 
  transactions, 
  coaList,
  currentProject,
  onProjectChange,
  onRefresh,
  checkoutDpId,
  onClearCheckoutDpId,
  units,
  receiptConfig
}: { 
  transactions: Transaction[];
  coaList: COA[];
  currentProject: 'Pariwisata' | 'Properti' | 'Konsolidasi';
  onProjectChange?: (project: 'Pariwisata' | 'Properti' | 'Konsolidasi') => void;
  onRefresh: () => void;
  checkoutDpId?: string | null;
  onClearCheckoutDpId?: () => void;
  units: BusinessUnit[];
  receiptConfig: ReceiptConfig | null;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'jurnal' | 'down_payment' | 'checkout'>('jurnal');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [dpSearch, setDpSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Income' | 'Expense'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [localProjectFilter, setLocalProjectFilter] = useState<'Pariwisata' | 'Properti' | 'Konsolidasi'>('Konsolidasi');

  // Receipt Preview state
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);

  // Dynamic units are passed as a prop from DashboardApp

  const incomeAccounts = useMemo(() => coaList.filter(c => ['REVE', 'OINC'].includes(c.type)), [coaList]);
  const expenseAccounts = useMemo(() => coaList.filter(c => ['COGS', 'EXPS', 'OEXP', 'DEPR'].includes(c.type)), [coaList]);
  const bankAccounts = useMemo(() => {
    return coaList.filter(c => c.type === 'BANK');
  }, [coaList]);

  const [isDpModalOpen, setIsDpModalOpen] = useState(false);



  // Form states for down payment
  const [dpFormData, setDpFormData] = useState({
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    unit: '',
    accountId: '11000',
    paymentMethod: 'Transfer Bank' as 'Cash' | 'Transfer Bank' | 'Debit/Kredit' | 'Lainnya',
    notes: '',
    checkInDate: format(new Date(), 'yyyy-MM-dd'),
    checkOutDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    project: 'Pariwisata' as 'Pariwisata' | 'Properti'
  });

  // Form states for checkout
  const [selectedDpId, setSelectedDpId] = useState<string>('');
  const [revenueAccountCode, setRevenueAccountCode] = useState<string>('');
  const [totalBillAmount, setTotalBillAmount] = useState<string>('');
  const [settlementBankCode, setSettlementBankCode] = useState<string>('11000');
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState<'Cash' | 'Transfer Bank' | 'Debit/Kredit' | 'Lainnya'>('Transfer Bank');

  // Multi-unit items in DP form
  const [dpItems, setDpItems] = useState<Array<{ id: string; unit: string; amount: string }>>([]);
  const [dpAddons, setDpAddons] = useState<Array<{ id: string; name: string; amount: string }>>([]);
  const [dpSubmitMode, setDpSubmitMode] = useState<'save_only' | 'save_and_download'>('save_and_download');
  const [checkoutUnitBills, setCheckoutUnitBills] = useState<{ [itemId: string]: string }>({});
  const [checkoutUnitCoas, setCheckoutUnitCoas] = useState<{ [itemId: string]: string }>({});

  // Form states for regular transactions
  const [formData, setFormData] = useState({
    type: 'Income' as TransactionType,
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    unit: '',
    accountCode: '',
    accountName: '',
    description: '',
    accountId: '11000',
    project: 'Pariwisata' as 'Pariwisata' | 'Properti'
  });

  const [aiSuggestion, setAiSuggestion] = useState<{
    accountCode: string;
    accountName: string;
    bankCode: string;
    bankName: string;
    explanation: string;
  } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Synchronize form project with global project context if filtered
  useEffect(() => {
    if (currentProject !== 'Konsolidasi') {
      setFormData(prev => ({ ...prev, project: currentProject }));
      setDpFormData(prev => ({ ...prev, project: currentProject }));
    }
  }, [currentProject]);

  const defaultUnitForProject = (proj: 'Pariwisata' | 'Properti') => {
    return units.find(u => u.project === proj)?.name || '';
  };

  // Set default unit when units are loaded or currentProject changes
  useEffect(() => {
    const proj = currentProject === 'Konsolidasi' ? 'Pariwisata' : currentProject;
    setFormData(prev => ({ ...prev, unit: '', project: proj }));
    setDpFormData(prev => ({ ...prev, unit: '', project: proj }));
    setDpItems([{ id: generateUUID(), unit: '', amount: '' }]);
  }, [units, currentProject]);

  // Set default accounts when coaList loads
  useEffect(() => {
    if (incomeAccounts.length > 0) {
      setRevenueAccountCode(incomeAccounts[0].code);
    }
  }, [coaList, activeSubTab]);

  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState<{id: string, desc: string} | null>(null);

  const resetForm = () => {
    const proj = currentProject === 'Konsolidasi' ? 'Pariwisata' : currentProject;
    setFormData({
      type: 'Income',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      unit: '',
      accountCode: '',
      accountName: '',
      description: '',
      accountId: '11000',
      project: proj
    });
    setEditId(null);
    setAiSuggestion(null);
  };

  const resetDpForm = () => {
    const proj = currentProject === 'Konsolidasi' ? 'Pariwisata' : currentProject;
    setDpFormData({
      customerName: '',
      customerAddress: '',
      customerPhone: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      unit: '',
      accountId: '11000',
      paymentMethod: 'Transfer Bank',
      notes: '',
      checkInDate: format(new Date(), 'yyyy-MM-dd'),
      checkOutDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      project: proj
    });
    setDpItems([{ id: generateUUID(), unit: '', amount: '' }]);
    setDpAddons([]);
  };

  const resetCheckoutForm = () => {
    setSelectedDpId('');
    setTotalBillAmount('');
    setSettlementBankCode('11000');
    setSettlementPaymentMethod('Transfer Bank');
    setCheckoutUnitBills({});
    setCheckoutUnitCoas({});
  };

  useEffect(() => {
    if (checkoutDpId) {
      const dp = transactions.find(t => t.id === checkoutDpId);
      if (dp) {
        const customerKey = (dp.customerName || '').trim().toLowerCase();
        setSelectedDpId(customerKey);
        
        // Find sibling DPs sharing the same customer name that are still pending
        const siblingDps = transactions.filter(t => 
          t.status === 'down_payment' && (t.customerName || '').trim().toLowerCase() === customerKey
        );
        const initialBills: { [itemId: string]: string } = {};
        const initialCoas: { [itemId: string]: string } = {};
        siblingDps.forEach(item => {
          initialBills[item.id] = Number(item.amount).toLocaleString('id-ID');
          
          const dpProj = getTransactionProject(item);
          const projIncomeAccounts = incomeAccounts.filter(c => c.project === dpProj || c.project === 'Umum');
          initialCoas[item.id] = projIncomeAccounts[0]?.code || '';
        });
        setCheckoutUnitBills(initialBills);
        setCheckoutUnitCoas(initialCoas);
        setActiveSubTab('checkout');
        
        // Only clear the checkout DP ID once the form has been successfully populated
        if (onClearCheckoutDpId) {
          onClearCheckoutDpId();
        }
      }
    }
  }, [checkoutDpId, transactions, incomeAccounts]);

  // Filter transactions for project context
  const displayedTransactions = useMemo(() => {
    return transactions.filter(t => {
      const proj = getTransactionProject(t);
      if (localProjectFilter !== 'Konsolidasi' && proj !== localProjectFilter) return false;
      return true;
    });
  }, [transactions, localProjectFilter]);

  // Filter transactions for regular journal tab
  const filteredTransactions = useMemo(() => {
    return displayedTransactions.filter(t => {
      const matchesSearch = 
        (t.description || '').toLowerCase().includes(search.toLowerCase()) || 
        (t.accountName || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.accountCode || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.unit || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.customerName || '').toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      const dateOnly = (t.date || '').split('T')[0];
      if (filterStartDate && dateOnly < filterStartDate) return false;
      if (filterEndDate && dateOnly > filterEndDate) return false;

      if (filterUnit && t.unit !== filterUnit) return false;

      if (filterType !== 'all' && t.type !== filterType) return false;

      return true;
    }).sort((a, b) => parseSafeDate(b.date).getTime() - parseSafeDate(a.date).getTime());
  }, [displayedTransactions, search, filterStartDate, filterEndDate, filterUnit, filterType]);

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice((currentPage - 1) * 20, currentPage * 20);
  }, [filteredTransactions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStartDate, filterEndDate, filterUnit, filterType, activeSubTab]);

  // Pending Down Payments
  const pendingDps = useMemo(() => {
    return displayedTransactions.filter(t => t.status === 'down_payment');
  }, [displayedTransactions]);

  const filteredPendingDps = useMemo(() => {
    return pendingDps.filter(dp => {
      const query = dpSearch.toLowerCase().trim();
      if (!query) return true;
      return (
        (dp.customerName || '').toLowerCase().includes(query) ||
        (dp.unit || '').toLowerCase().includes(query) ||
        (dp.customerPhone || '').toLowerCase().includes(query) ||
        (dp.notes || '').toLowerCase().includes(query) ||
        (dp.description || '').toLowerCase().includes(query) ||
        (dp.paymentMethod || '').toLowerCase().includes(query) ||
        (dp.bankName || '').toLowerCase().includes(query)
      );
    });
  }, [pendingDps, dpSearch]);

  // Settled Down Payments / History
  const settledDps = useMemo(() => {
    return displayedTransactions.filter(t => t.status === 'recognized' && t.accountCode === '21100' && t.type === 'Expense');
  }, [displayedTransactions]);

  // Project-specific filtered units and CoA lists
  const formProject = activeSubTab === 'down_payment' ? dpFormData.project : formData.project;
  
  const filteredUnitsForForm = useMemo(() => {
    return units.filter(u => u.project === formProject);
  }, [units, formProject]);

  const filteredCoasForForm = useMemo(() => {
    return coaList.filter(c => c.project === formProject || c.project === 'Umum');
  }, [coaList, formProject]);

  // Group pending DPs by customerName (case-insensitive & trimmed)
  const groupedPendingDps = useMemo(() => {
    const groups: { [key: string]: {
      customerName: string;
      customerPhone?: string;
      customerAddress?: string;
      checkInDate?: string;
      checkOutDate?: string;
      notes?: string;
      paymentMethod?: string;
      accountId?: string;
      bankName?: string;
      project?: string;
      items: Transaction[];
      totalAmount: number;
      transactionNumber: string; // for compatibility
    }} = {};

    pendingDps.forEach(dp => {
      const key = (dp.customerName || '').trim().toLowerCase();
      if (!key) return;
      if (!groups[key]) {
        groups[key] = {
          customerName: dp.customerName || '',
          customerPhone: dp.customerPhone,
          customerAddress: dp.customerAddress,
          checkInDate: dp.checkInDate,
          checkOutDate: dp.checkOutDate,
          notes: dp.notes,
          paymentMethod: dp.paymentMethod,
          accountId: dp.accountId,
          bankName: dp.bankName,
          project: dp.project,
          items: [],
          totalAmount: 0,
          transactionNumber: dp.transactionNumber || dp.id
        };
      }
      groups[key].items.push(dp);
      groups[key].totalAmount += dp.amount;

      // Consolidate properties for the group
      if (dp.checkInDate && (!groups[key].checkInDate || dp.checkInDate < groups[key].checkInDate)) {
        groups[key].checkInDate = dp.checkInDate;
      }
      if (dp.checkOutDate && (!groups[key].checkOutDate || dp.checkOutDate > groups[key].checkOutDate)) {
        groups[key].checkOutDate = dp.checkOutDate;
      }
      if (dp.notes && groups[key].notes && !groups[key].notes.includes(dp.notes)) {
        groups[key].notes = `${groups[key].notes}; ${dp.notes}`;
      } else if (dp.notes && !groups[key].notes) {
        groups[key].notes = dp.notes;
      }
    });

    return Object.values(groups);
  }, [pendingDps]);

  const filteredGroupedPendingDps = useMemo(() => {
    return groupedPendingDps.filter(group => {
      const query = dpSearch.toLowerCase().trim();
      if (!query) return true;
      const unitNames = group.items.map(item => item.unit).join(' ');
      return (
        (group.customerName || '').toLowerCase().includes(query) ||
        unitNames.toLowerCase().includes(query) ||
        (group.customerPhone || '').toLowerCase().includes(query) ||
        (group.notes || '').toLowerCase().includes(query) ||
        (group.paymentMethod || '').toLowerCase().includes(query) ||
        (group.bankName || '').toLowerCase().includes(query)
      );
    });
  }, [groupedPendingDps, dpSearch]);

  const activeDpGroup = useMemo(() => {
    return groupedPendingDps.find(g => g.customerName.trim().toLowerCase() === selectedDpId.trim().toLowerCase());
  }, [groupedPendingDps, selectedDpId]);

  // Keep activeDp for backward compatibility
  const activeDp = useMemo(() => {
    if (!activeDpGroup || activeDpGroup.items.length === 0) return undefined;
    return activeDpGroup.items[0];
  }, [activeDpGroup]);

  const checkoutIncomeAccounts = useMemo(() => {
    if (!activeDpGroup) return incomeAccounts;
    const dpProj = activeDpGroup.project || 'Pariwisata';
    return incomeAccounts.filter(c => c.project === dpProj || c.project === 'Umum');
  }, [incomeAccounts, activeDpGroup]);

  const totalBillAmountSum = useMemo(() => {
    if (!activeDpGroup) return 0;
    return activeDpGroup.items.reduce((sum, item) => {
      const valStr = checkoutUnitBills[item.id] || '';
      const val = parseFloat(valStr.replace(/\./g, '')) || 0;
      return sum + val;
    }, 0);
  }, [activeDpGroup, checkoutUnitBills]);

  const handleGetAiSuggestion = async () => {
    if (!formData.description.trim()) return;
    setIsSuggesting(true);
    setAiSuggestion(null);
    try {
      const response = await fetch('/api/ai/suggest-coa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description,
          type: formData.type,
          project: formData.project,
          coaList: coaList
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mendapatkan rekomendasi akun');
      }
      setAiSuggestion(data);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Gagal memanggil asisten AI');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unit) {
      toast.error('Harap pilih unit usaha / barang & jasa');
      return;
    }
    if (!formData.accountCode) {
      toast.error('Harap pilih akun perkiraan (CoA)');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount.replace(/\./g, '')) <= 0) {
      toast.error('Harap isi nominal transaksi');
      return;
    }
    setIsSubmitting(true);
    try {
      const existingTx = editId ? transactions.find(t => t.id === editId) : null;
      const txData: Transaction = {
        ...(existingTx || {}),
        id: editId || generateUUID(),
        date: new Date(formData.date).toISOString(),
        type: formData.type,
        amount: parseFloat(formData.amount.replace(/\./g, '')) || 0,
        unit: formData.unit,
        accountCode: formData.accountCode,
        accountName: formData.accountName,
        description: formData.description,
        accountId: formData.accountId,
        status: existingTx ? (existingTx.status || 'regular') : 'regular',
        project: formData.project
      };
      
      if (editId) {
        await updateTransaction(txData);
        toast.success("Transaksi berhasil diubah");
      } else {
        await addTransaction(txData, transactions);
        toast.success("Transaksi berhasil ditambahkan");
      }
      
      // Save new custom COA if it doesn't exist
      if (formData.accountCode && !coaList.find(c => c.code === formData.accountCode)) {
        const newCoa: COA = {
          no: Date.now().toString(),
          type: formData.type === 'Income' ? 'REVE' : 'EXPS',
          code: formData.accountCode,
          name: formData.accountName || formData.accountCode,
          isCustom: true,
          project: formData.project
        };
        try {
          await addCoa(newCoa);
          onRefresh();
        } catch (coaErr) {
          console.warn("Failed to add custom CoA to Supabase:", coaErr);
        }
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

  // Submit Down Payment
  const handleDpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dpFormData.customerName) {
      toast.error('Harap isi nama pelanggan');
      return;
    }
    if (dpItems.length === 0) {
      toast.error('Harap tambahkan minimal satu unit');
      return;
    }

    // Validate each item (falling back to first valid option if unit state is empty/out of sync)
    const validatedItems = dpItems.map(item => {
      let unit = item.unit;
      if (!unit && filteredUnitsForForm.length > 0) {
        unit = filteredUnitsForForm[0].name;
      }
      return { ...item, unit };
    });

    for (const item of validatedItems) {
      if (!item.unit || !item.amount) {
        toast.error('Harap isi unit usaha dan nominal DP untuk setiap baris');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const prefix = 'BKM';
      const commonTxNumber = generateTxNumber(transactions, prefix, dpFormData.date);
      const bankName = bankAccounts.find(b => b.code === dpFormData.accountId)?.name || '';
      
      let currentList = [...transactions];
      const addedTxs: Transaction[] = [];

      for (const item of validatedItems) {
        const amountVal = parseFloat(item.amount.replace(/\./g, '')) || 0;
        const dpTx: Transaction = {
          id: `DP-${generateUUID()}`,
          date: new Date(dpFormData.date).toISOString(),
          type: 'Income',
          amount: amountVal,
          unit: item.unit,
          accountCode: '21100', // Uang Muka Penjualan
          accountName: 'Uang Muka Penjualan',
          accountId: dpFormData.accountId,
          customerName: dpFormData.customerName,
          customerAddress: dpFormData.customerAddress,
          customerPhone: dpFormData.customerPhone,
          paymentMethod: dpFormData.paymentMethod,
          bankName: bankName,
          checkInDate: dpFormData.project === 'Properti' ? undefined : new Date(dpFormData.checkInDate).toISOString(),
          checkOutDate: dpFormData.project === 'Properti' ? undefined : new Date(dpFormData.checkOutDate).toISOString(),
          notes: dpFormData.notes,
          description: `Uang Muka ${item.unit} a.n ${dpFormData.customerName}`,
          status: 'down_payment',
          project: dpFormData.project,
          transactionNumber: commonTxNumber
        };

        await addTransaction(dpTx, currentList);
        currentList.push(dpTx);
        addedTxs.push(dpTx);
      }

      // Save add-ons as separate transactions
      for (const addon of dpAddons) {
        if (!addon.name || !addon.amount) continue;
        const addonAmountVal = parseFloat(addon.amount.replace(/\./g, '')) || 0;
        if (addonAmountVal <= 0) continue;
        const addonTx: Transaction = {
          id: `DP-${generateUUID()}`,
          date: new Date(dpFormData.date).toISOString(),
          type: 'Income',
          amount: addonAmountVal,
          unit: validatedItems[0]?.unit || '',
          accountCode: '21100',
          accountName: 'Uang Muka Penjualan',
          accountId: dpFormData.accountId,
          customerName: dpFormData.customerName,
          customerAddress: dpFormData.customerAddress,
          customerPhone: dpFormData.customerPhone,
          paymentMethod: dpFormData.paymentMethod,
          bankName: bankName,
          checkInDate: dpFormData.project === 'Properti' ? undefined : new Date(dpFormData.checkInDate).toISOString(),
          checkOutDate: dpFormData.project === 'Properti' ? undefined : new Date(dpFormData.checkOutDate).toISOString(),
          notes: dpFormData.notes,
          description: `[Add-on] ${addon.name} a.n ${dpFormData.customerName}`,
          status: 'down_payment',
          project: dpFormData.project,
          transactionNumber: commonTxNumber
        };
        await addTransaction(addonTx, currentList);
        currentList.push(addonTx);
        addedTxs.push(addonTx);
      }

      toast.success('Uang Muka Penjualan berhasil dicatat!');
      onRefresh();
      
      // Auto trigger receipt view for the first added transaction (it will consolidate others automatically)
      if (dpSubmitMode === 'save_and_download' && addedTxs.length > 0) {
        setSelectedReceiptTx(addedTxs[0]);
      }
      resetDpForm();
      setIsDpModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal mencatat Uang Muka: ${error?.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Settle/Checkout
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDpGroup) {
      toast.error('Harap lengkapi semua kolom checkout');
      return;
    }

    // Validate that each unit bill is not less than its DP amount and has a CoA selected
    for (const item of activeDpGroup.items) {
      const valStr = checkoutUnitBills[item.id] || '';
      const unitBill = parseFloat(valStr.replace(/\./g, '')) || 0;
      if (unitBill < item.amount) {
        toast.error(`Tagihan akhir untuk unit ${item.unit} tidak boleh lebih kecil dari uang muka (Rp ${item.amount.toLocaleString('id-ID')})`);
        return;
      }
      if (!checkoutUnitCoas[item.id]) {
        toast.error(`Harap pilih akun pendapatan (CoA) untuk unit ${item.unit}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let currentList = [...transactions];
      let customCoasAdded = false;
      const newCustomCoas = [...coaList.filter(c => c.isCustom)];

      for (const item of activeDpGroup.items) {
        const valStr = checkoutUnitBills[item.id] || '';
        const unitBill = parseFloat(valStr.replace(/\./g, '')) || 0;
        const sisaTagihan = unitBill - item.amount;
        const settleId = generateUUID();
        const dpProj = getTransactionProject(item);
        
        const unitCoa = checkoutUnitCoas[item.id];
        const existingCoa = coaList.find(c => c.code === unitCoa);
        const unitCoaName = existingCoa ? existingCoa.name : unitCoa;

        if (unitCoa && !coaList.find(c => c.code === unitCoa)) {
          const newCoa: COA = {
            no: (Date.now() + Math.random()).toString(),
            type: 'REVE',
            code: unitCoa,
            name: unitCoa,
            isCustom: true,
            project: dpProj
          };
          newCustomCoas.push(newCoa);
          customCoasAdded = true;
        }

        // 1. Transaction to clear Down Payment (Debit 21100)
        const txDebitDp: Transaction = {
          id: `JU-D-${settleId}`,
          date: new Date().toISOString(),
          type: 'Expense', // Debit
          amount: item.amount,
          unit: item.unit,
          accountCode: '21100', // Uang Muka Penjualan
          accountName: 'Uang Muka Penjualan',
          description: `[Jurnal Umum] [Checkout] Pengakuan Uang Muka a.n ${item.customerName}`,
          status: 'recognized',
          project: dpProj,
          customerName: item.customerName,
          customerAddress: item.customerAddress,
          customerPhone: item.customerPhone
        };

        // 2. Transaction to recognize revenue from Down Payment (Credit Revenue)
        const txCreditRevenue: Transaction = {
          id: `JU-K-${settleId}`,
          date: new Date().toISOString(),
          type: 'Income', // Credit
          amount: item.amount,
          unit: item.unit,
          accountCode: unitCoa,
          accountName: unitCoaName,
          description: `[Jurnal Umum] [Checkout] Pengakuan Uang Muka a.n ${item.customerName}`,
          status: 'recognized',
          project: dpProj,
          customerName: item.customerName,
          customerAddress: item.customerAddress,
          customerPhone: item.customerPhone
        };

        // 3. Original Down Payment marked as recognized
        const updatedDp: Transaction = {
          ...item,
          status: 'recognized',
          settledTxId: sisaTagihan > 0 ? `SETTLE-SISA-${settleId}` : undefined
        };

        await updateTransaction(updatedDp);
        currentList = currentList.map(t => t.id === updatedDp.id ? updatedDp : t);

        await addTransaction(txDebitDp, currentList);
        currentList.push(txDebitDp);

        await addTransaction(txCreditRevenue, currentList);
        currentList.push(txCreditRevenue);

        // 4. Record outstanding payment if any
        if (sisaTagihan > 0) {
          const txSisa: Transaction = {
            id: `SETTLE-SISA-${settleId}`,
            date: new Date().toISOString(),
            type: 'Income',
            amount: sisaTagihan,
            unit: item.unit,
            accountCode: unitCoa,
            accountName: unitCoaName,
            accountId: settlementBankCode,
            description: `[Checkout] Pelunasan a.n ${item.customerName}`,
            customerName: item.customerName,
            customerAddress: item.customerAddress,
            customerPhone: item.customerPhone,
            paymentMethod: settlementPaymentMethod,
            bankName: bankAccounts.find(b => b.code === settlementBankCode)?.name || '',
            checkInDate: item.checkInDate,
            checkOutDate: item.checkOutDate,
            status: 'regular',
            project: dpProj
          };
          await addTransaction(txSisa, currentList);
          currentList.push(txSisa);
        }
      }

      if (customCoasAdded) {
        // Add new custom CoAs to Supabase
        for (const custom of newCustomCoas) {
          if (!coaList.some(c => c.code === custom.code)) {
            try {
              await addCoa(custom);
            } catch (coaErr) {
              console.warn("Failed to add custom checkout CoA to Supabase:", coaErr);
            }
          }
        }
        onRefresh();
      }

      toast.success('Checkout Berhasil! Pendapatan telah diakui.');
      onRefresh();
      resetCheckoutForm();
      setActiveSubTab('jurnal');
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal memproses checkout: ${error?.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditId(t.id);
    const proj = getTransactionProject(t);
    setFormData({
      type: t.type,
      amount: t.amount ? Number(t.amount).toLocaleString('id-ID') : '',
      date: t.date ? formatSafeDate(t.date, 'yyyy-MM-dd') : formatSafeDate(new Date(), 'yyyy-MM-dd'),
      unit: t.unit || defaultUnitForProject(proj),
      accountCode: t.accountCode || '',
      accountName: t.accountName || '',
      description: t.description || '',
      accountId: t.accountId || '11000',
      project: proj
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

  const activeAccounts = useMemo(() => {
    const list = formData.type === 'Income' ? incomeAccounts : expenseAccounts;
    return list.filter(c => c.project === formData.project || c.project === 'Umum');
  }, [formData.type, formData.project, incomeAccounts, expenseAccounts]);

  // Compute dynamic sequence number for receipt
  const getReceiptSequence = (tx: Transaction) => {
    const bankCode = tx.accountId || '11000';
    if (!tx.date) return 1;
    const txDate = parseSafeDate(tx.date);
    const txYear = txDate.getFullYear();
    const txMonth = txDate.getMonth();
    
    const matched = transactions
      .filter(t => {
        const isDpOri = t.status === 'down_payment' || t.status === 'recognized';
        const sameBank = (t.accountId || '11000') === bankCode;
        if (!t.date) return false;
        const d = parseSafeDate(t.date);
        return isDpOri && sameBank && d.getFullYear() === txYear && d.getMonth() === txMonth;
      })
      .sort((a, b) => parseSafeDate(a.date).getTime() - parseSafeDate(b.date).getTime());
      
    const idx = matched.findIndex(m => m.id === tx.id);
    return idx !== -1 ? idx + 1 : 1;
  };



  return (
    <div className="space-y-6">
      {/* Project Title Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>📰 Modul Transaksi Utama</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Kelola jurnal transaksi, uang muka penjualan (DP), dan checkout pelunasan untuk seluruh proyek pariwisata dan properti.
          </p>
        </div>
      </div>

      {/* Sub-menu Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-lg p-1 gap-1 shadow-sm max-w-2xl animate-in fade-in slide-in-from-top-1 duration-200">
        <button
          onClick={() => setActiveSubTab('jurnal')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeSubTab === 'jurnal' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          📰 Jurnal Transaksi
        </button>
        <button
          onClick={() => setActiveSubTab('down_payment')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeSubTab === 'down_payment' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          📥 Uang Muka Penjualan (DP)
        </button>
        <button
          onClick={() => {
            setActiveSubTab('checkout');
            resetCheckoutForm();
          }}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeSubTab === 'checkout' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          🔑 Checkout & Pelunasan
        </button>
      </div>

      {/* Tab 1: Regular Jurnal Transaksi */}
      {activeSubTab === 'jurnal' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari transaksi reguler..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm shadow-sm"
              />
            </div>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-4.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-150 font-semibold text-sm cursor-pointer border-0"
            >
              <Plus className="w-5 h-5" />
              Catat Transaksi Jurnal
            </button>
          </div>

          {/* Filter Card Panel */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tanggal Mulai</label>
              <input 
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tanggal Akhir</label>
              <input 
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Proyek</label>
              <select
                value={localProjectFilter}
                onChange={e => setLocalProjectFilter(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="Konsolidasi">Konsolidasi (Semua)</option>
                <option value="Pariwisata">Pariwisata</option>
                <option value="Properti">Properti</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Barang & Jasa</label>
              <select
                value={filterUnit}
                onChange={e => setFilterUnit(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="">Semua Barang & Jasa</option>
                {units.map(u => (
                  <option key={u.name} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tipe Transaksi</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="all">Semua Tipe</option>
                <option value="Income">Penerimaan (Income)</option>
                <option value="Expense">Pengeluaran (Expense)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => { 
                  setFilterStartDate(''); 
                  setFilterEndDate(''); 
                  setFilterUnit(''); 
                  setFilterType('all'); 
                  setSearch(''); 
                  if (onProjectChange) onProjectChange('Konsolidasi');
                }}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition border border-slate-300 shadow-sm cursor-pointer"
              >
                Bersihkan Filter
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Daftar Transaksi</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3 font-bold">Tanggal</th>
                    <th className="px-4 py-3 font-bold">No. Transaksi</th>
                    <th className="px-4 py-3 font-bold">Barang & Jasa</th>
                    <th className="px-4 py-3 font-bold">Akun Perkiraan (CoA)</th>
                    <th className="px-4 py-3 font-bold">Keterangan</th>
                    <th className="px-4 py-3 font-bold text-right">Jumlah</th>
                    <th className="px-4 py-3 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Tidak ada data transaksi.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map(t => {
                      const isDp = t.status === 'down_payment' || t.status === 'recognized';
                      return (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                            {formatSafeDate(t.date, 'dd MMM yyyy')}
                          </td>
                          <td className="px-4 py-2 font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {t.transactionNumber || '-'}
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
                              {t.accountId && (
                                <span className="text-[10px] text-blue-500 font-medium mt-0.5 whitespace-nowrap truncate max-w-[150px]">
                                  Bank/Kas: {coaList.find(c => c.code === t.accountId)?.name || 'Kas & Bank'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-slate-900 font-medium max-w-xs truncate">
                            {t.description}
                            {t.customerName && <span className="block text-[10px] text-slate-400">Customer: {t.customerName}</span>}
                          </td>
                          <td className={cn(
                            "px-4 py-2 text-right font-bold whitespace-nowrap",
                            t.type === 'Income' ? 'text-blue-600' : 'text-red-600'
                          )}>
                            {t.type === 'Income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isDp && (
                                <button 
                                  onClick={() => setSelectedReceiptTx(t)}
                                  className="text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="Cetak Kwitansi"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredTransactions.length > 20 && (
              <div className="flex justify-between items-center p-4 bg-slate-50 border-t border-slate-200 text-xs">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded font-bold hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="text-slate-500 font-medium">
                  Halaman {currentPage} dari {Math.ceil(filteredTransactions.length / 20)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTransactions.length / 20)))}
                  disabled={currentPage >= Math.ceil(filteredTransactions.length / 20)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded font-bold hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Penerimaan Uang Muka (DP) */}
      {activeSubTab === 'down_payment' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari uang muka..."
                value={dpSearch}
                onChange={(e) => setDpSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm shadow-sm"
              />
            </div>
            <button 
              onClick={() => { resetDpForm(); setIsDpModalOpen(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-4.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-150 font-semibold text-sm cursor-pointer border-0"
            >
              <Plus className="w-5 h-5" />
              Catat Uang Muka Baru
            </button>
          </div>

          {/* Pending Down Payments List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Daftar Uang Muka Aktif (Belum Checkout)</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2.5 font-bold">Tamu</th>
                    <th className="px-4 py-2.5 font-bold">Unit / Periode</th>
                    <th className="px-4 py-2.5 font-bold">Metode / Bank</th>
                    <th className="px-4 py-2.5 font-bold text-right">Uang Muka</th>
                    <th className="px-4 py-2.5 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {groupedPendingDps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                        Tidak ada uang muka aktif saat ini.
                      </td>
                    </tr>
                  ) : filteredGroupedPendingDps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                        Tidak ada uang muka yang cocok dengan pencarian "{dpSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredGroupedPendingDps.map(group => {
                      const firstItem = group.items[0];
                      const ci = formatSafeDate(group.checkInDate, 'dd/MM/yyyy');
                      const co = formatSafeDate(group.checkOutDate, 'dd/MM/yyyy');
                      
                      const mainUnits = Array.from(new Set(group.items.filter(item => !(item.description || '').startsWith('[Add-on]')).map(item => item.unit)));
                      const hasAddon = group.items.some(item => (item.description || '').startsWith('[Add-on]'));
                      const unitDisplay = (mainUnits.length > 0 ? mainUnits.join(', ') : 'Umum') + (hasAddon ? ' + Add-on' : '');
                      
                      // Get unique transaction numbers in this group for receipt selection
                      const uniqueTxNums = Array.from(new Set(group.items.map(item => item.transactionNumber || item.id)));

                      return (
                        <tr key={group.customerName.trim().toLowerCase()} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                          <td className="px-4 py-3 font-semibold text-slate-800 text-left">
                            {group.customerName}
                            <span className="block text-[10px] text-slate-400 font-normal">{group.customerPhone || 'Tanpa Kontak'}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-left">
                            <span className="inline-block px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-bold uppercase rounded mb-1">{unitDisplay}</span>
                            <span className="block text-[10px] font-mono text-slate-500">{ci} s.d {co}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-left">
                            <span className="font-medium text-slate-700">{group.paymentMethod}</span>
                            <span className="block text-[10px] text-slate-400">{group.bankName || 'Kas/Bank'}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            Rp {group.totalAmount.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2 flex-wrap max-w-[200px]">
                              {uniqueTxNums.map((txNum, idx) => {
                                const itemForTx = group.items.find(item => (item.transactionNumber || item.id) === txNum) || firstItem;
                                return (
                                  <div key={txNum} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 shadow-sm">
                                    <button
                                      onClick={() => setSelectedReceiptTx(itemForTx)}
                                      className="flex items-center gap-1 text-slate-600 hover:text-slate-800 hover:bg-slate-105 rounded px-1.5 py-0.5 font-bold text-[9px] uppercase transition-all duration-150 cursor-pointer border-0 bg-transparent"
                                      title={`Cetak Kwitansi ${txNum}`}
                                    >
                                      <Printer className="w-3 h-3 text-slate-500" />
                                      {uniqueTxNums.length > 1 ? `Struk ${idx + 1}` : 'Struk'}
                                    </button>
                                    
                                    <span className="w-[1px] h-3 bg-slate-200 self-center"></span>

                                    <button
                                      onClick={() => handleEdit(itemForTx)}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer border-0 bg-transparent"
                                      title={`Ubah Transaksi ${txNum}`}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteClick(itemForTx.id, itemForTx.description || `Uang Muka ${itemForTx.customerName}`)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer border-0 bg-transparent"
                                      title={`Hapus Transaksi ${txNum}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                              <button
                                onClick={() => {
                                  const customerKey = group.customerName.trim().toLowerCase();
                                  setSelectedDpId(customerKey);
                                  
                                  const initialBills: { [itemId: string]: string } = {};
                                  const initialCoas: { [itemId: string]: string } = {};
                                  group.items.forEach(item => {
                                    initialBills[item.id] = Number(item.amount).toLocaleString('id-ID');
                                    
                                    const dpProj = getTransactionProject(item);
                                    const projIncomeAccounts = incomeAccounts.filter(c => c.project === dpProj || c.project === 'Umum');
                                    initialCoas[item.id] = projIncomeAccounts[0]?.code || '';
                                  });
                                  setCheckoutUnitBills(initialBills);
                                  setCheckoutUnitCoas(initialCoas);
                                  setActiveSubTab('checkout');
                                }}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded font-bold text-[10px] uppercase transition-all duration-150 shadow-sm cursor-pointer"
                              >
                                Checkout
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Checkout & Pengakuan Pendapatan */}
      {activeSubTab === 'checkout' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 text-left">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              🔑 Form Checkout Tamu & Pengakuan Pendapatan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Akui uang muka penjualan (DP) sebagai pendapatan riil unit usaha dan catat pelunasan sisa tagihan jika ada.
            </p>
          </div>

          <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pilih Tamu / Uang Muka Aktif</label>
              <select
                required
                value={selectedDpId}
                onChange={e => {
                  const customerKey = e.target.value;
                  setSelectedDpId(customerKey);
                  const group = groupedPendingDps.find(g => g.customerName.trim().toLowerCase() === customerKey);
                  if (group) {
                    const initialBills: { [itemId: string]: string } = {};
                    const initialCoas: { [itemId: string]: string } = {};
                    group.items.forEach(item => {
                      initialBills[item.id] = Number(item.amount).toLocaleString('id-ID');
                      const dpProj = getTransactionProject(item);
                      const projIncomeAccounts = incomeAccounts.filter(c => c.project === dpProj || c.project === 'Umum');
                      initialCoas[item.id] = projIncomeAccounts[0]?.code || '';
                    });
                    setCheckoutUnitBills(initialBills);
                    setCheckoutUnitCoas(initialCoas);
                  } else {
                    setCheckoutUnitBills({});
                    setCheckoutUnitCoas({});
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium h-[40px] text-xs"
              >
                <option value="">-- Pilih Booking Tamu --</option>
                {groupedPendingDps.map(g => {
                  const unitNames = g.items.map(item => item.unit).join(', ');
                  const key = g.customerName.trim().toLowerCase();
                  return (
                    <option key={key} value={key}>
                      {g.customerName} - {unitNames} (Total DP: Rp {g.totalAmount.toLocaleString('id-ID')})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected DP summary card */}
            {activeDpGroup && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/60 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Customer</span>
                  <span className="text-xs font-bold text-slate-800">{activeDpGroup.customerName}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Unit Terdaftar</span>
                  <span className="text-xs font-bold text-slate-800">
                    {activeDpGroup.items.map(item => item.unit).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Total Uang Muka Diterima</span>
                  <span className="text-xs font-bold text-emerald-700">Rp {activeDpGroup.totalAmount.toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Periode Menginap</span>
                  <span className="text-xs font-mono text-slate-600">
                    {formatSafeDate(activeDpGroup.checkInDate, 'dd/MM/yyyy')} s.d {formatSafeDate(activeDpGroup.checkOutDate, 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
            )}

            {/* Rincian Tagihan Per Unit */}
            {activeDpGroup && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rincian Tagihan Akhir Per Unit & Akun Pendapatan</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeDpGroup.items.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg flex flex-col justify-between gap-2.5 shadow-sm">
                      <div className="flex justify-between items-start border-b border-slate-200/60 pb-1.5">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                          {(item.description || '').startsWith('[Add-on]') ? (
                            <><span className="text-amber-600">✨</span> Add-on: {(item.description || '').replace('[Add-on] ', '').replace(` a.n ${item.customerName}`, '')}</>
                          ) : (
                            <>🏢 {item.unit}</>
                          )}
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">DP: Rp {item.amount.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Tagihan Akhir (Rp)</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          required
                          placeholder="0"
                          value={checkoutUnitBills[item.id] || ''}
                          onChange={e => {
                            const rawVal = e.target.value.replace(/\D/g, '');
                            const formatted = rawVal ? Number(rawVal).toLocaleString('id-ID') : '';
                            setCheckoutUnitBills(prev => ({ ...prev, [item.id]: formatted }));
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 font-bold text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Akun Pendapatan (CoA)</label>
                        <CreatableSelect
                          isClearable
                          value={checkoutUnitCoas[item.id] ? { 
                            value: checkoutUnitCoas[item.id], 
                            label: checkoutIncomeAccounts.find(a => a.code === checkoutUnitCoas[item.id]) 
                              ? `[${checkoutUnitCoas[item.id]}] ${checkoutIncomeAccounts.find(a => a.code === checkoutUnitCoas[item.id])?.name}` 
                              : checkoutUnitCoas[item.id] 
                          } : null}
                          onChange={(newValue: any) => {
                            const val = newValue ? newValue.value : '';
                            setCheckoutUnitCoas(prev => ({ ...prev, [item.id]: val }));
                          }}
                          options={checkoutIncomeAccounts.map(a => ({ value: a.code, label: `[${a.code}] ${a.name}`, parentCode: a.parentCode }))}
                          className="text-slate-900 text-xs font-sans"
                          placeholder="Pilih CoA Pendapatan..."
                          formatCreateLabel={(inputValue) => `Buat CoA "${inputValue}"`}
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: '32px',
                              borderRadius: '0.25rem',
                              borderColor: '#cbd5e1',
                              fontSize: '11px'
                            }),
                            option: (base, { data, isSelected, isFocused }) => {
                              const isParent = !(data as any).parentCode;
                              return {
                                ...base,
                                fontWeight: isParent ? 'bold' : 'normal',
                                paddingLeft: isParent ? '8px' : '20px',
                                color: isParent ? '#0f172a' : '#475569',
                                backgroundColor: isSelected ? '#e0e7ff' : isFocused ? '#f1f5f9' : 'white',
                                fontSize: '11px'
                              };
                            },
                            valueContainer: (base) => ({ ...base, padding: '0 6px' }),
                            input: (base) => ({ ...base, margin: '0' }),
                            indicatorsContainer: (base) => ({ ...base, height: '30px' })
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Tagihan Gabungan (Rp)</label>
                <input 
                  type="text" 
                  readOnly
                  disabled
                  value={totalBillAmountSum.toLocaleString('id-ID')}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-slate-500 font-bold text-sm bg-slate-50 h-[38px]"
                />
              </div>
            </div>

            {/* Calculations for outstanding balance */}
            {activeDpGroup && (() => {
              const totalDp = activeDpGroup.totalAmount;
              const sisa = totalBillAmountSum - totalDp;
              if (sisa > 0) {
                return (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
                    <div className="flex justify-between items-center text-amber-800 font-bold">
                      <span>Total Sisa Pelunasan Gabungan :</span>
                      <span className="text-base font-extrabold">Rp {sisa.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Kas / Bank Pelunasan</label>
                        <select
                          required
                          value={settlementBankCode}
                          onChange={e => setSettlementBankCode(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium h-[38px]"
                        >
                          {bankAccounts.map(b => (
                            <option key={b.code} value={b.code} className={b.parentCode ? "text-slate-600 pl-4" : "font-bold text-slate-900"}>
                              {b.parentCode ? `\u00A0\u00A0\u00A0\u00A0└─ [${b.code}] ${b.name}` : `[${b.code}] ${b.name}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Metode Bayar Sisa</label>
                        <select
                          required
                          value={settlementPaymentMethod}
                          onChange={e => setSettlementPaymentMethod(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium h-[38px]"
                        >
                          <option value="Transfer Bank">Transfer Bank</option>
                          <option value="Cash">Tunai / Cash</option>
                          <option value="Debit/Kredit">Kartu Debit/Kredit</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              } else if (totalBillAmountSum > 0 && sisa === 0) {
                return (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-800 font-bold rounded-lg text-center flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-600" /> LUNAS (Tagihan diselesaikan penuh dengan uang muka).
                  </div>
                );
              }
              return null;
            })()}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !selectedDpId}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center transition-all duration-150 text-xs border-0 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Proses Checkout & Akui Pendapatan
              </button>
            </div>
          </form>
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

      {/* Modal Jurnal Edit/Add */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {editId ? 'Ubah Jurnal Transaksi' : 'Catat Transaksi Jurnal'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>
            
            {/* Banner Petunjuk AI */}
            <div className="px-5 py-2 bg-indigo-50/50 border-b border-slate-100 flex items-center gap-2.5 text-[10px] text-indigo-700 font-medium leading-relaxed shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 animate-pulse" />
              <span><strong>Tips AI:</strong> Tulis keterangan transaksi secara detail agar AI dapat membantu merekomendasikan Akun Perkiraan (CoA) dan Kas/Bank secara otomatis.</span>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs text-left overflow-y-auto flex-1">
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tanggal</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nominal (Rp)</label>
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
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Proyek</label>
                <SearchableSelect
                  isSearchable={false}
                  value={formData.project}
                  onChange={val => {
                    const newProj = val as 'Pariwisata' | 'Properti';
                    const defaultUnit = defaultUnitForProject(newProj);
                    
                    // Also reset CoA to the first account of the new project's category
                    const activeList = formData.type === 'Income' ? incomeAccounts : expenseAccounts;
                    const matchedCoas = activeList.filter(c => c.project === newProj || c.project === 'Umum');
                    
                    setFormData({
                      ...formData,
                      project: newProj,
                      unit: defaultUnit,
                      accountCode: matchedCoas[0]?.code || '',
                      accountName: matchedCoas[0]?.name || ''
                    });
                  }}
                  options={[
                    { value: 'Pariwisata', label: '🌴 Pariwisata' },
                    { value: 'Properti', label: '🏡 Properti' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.project !== 'Properti' ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Barang & Jasa</label>
                      <SearchableSelect
                        value={formData.unit}
                        onChange={val => setFormData({...formData, unit: val})}
                        placeholder="-- Pilih Barang & Jasa --"
                        options={filteredUnitsForForm.map(u => ({ value: u.name, label: u.name }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Akun Kas / Bank</label>
                      <SearchableSelect
                        value={formData.accountId}
                        onChange={val => setFormData({...formData, accountId: val})}
                        options={bankAccounts.map(b => ({
                          value: b.code,
                          label: b.parentCode ? `└─ [${b.code}] ${b.name}` : `[${b.code}] ${b.name}`,
                          isChild: !!b.parentCode
                        }))}
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Akun Kas / Bank</label>
                    <SearchableSelect
                      value={formData.accountId}
                      onChange={val => setFormData({...formData, accountId: val})}
                      options={bankAccounts.map(b => ({
                        value: b.code,
                        label: b.parentCode ? `└─ [${b.code}] ${b.name}` : `[${b.code}] ${b.name}`,
                        isChild: !!b.parentCode
                      }))}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Akun Perkiraan (CoA)</label>
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
                  options={activeAccounts.map(a => ({ value: a.code, label: `[${a.code}] ${a.name}`, parentCode: a.parentCode }))}
                  className="text-slate-900 text-sm"
                  placeholder="Pilih atau ketik akun baru..."
                  formatCreateLabel={(inputValue) => `Buat akun CoA "${inputValue}"`}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: '38px',
                      borderRadius: '0.5rem',
                      borderColor: state.isFocused ? '#6366f1' : '#cbd5e1',
                      backgroundColor: '#f8fafc',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.15)' : 'none',
                      '&:hover': {
                        borderColor: '#6366f1',
                      },
                      transition: 'all 0.15s ease',
                      fontSize: '11.5px',
                      fontWeight: '600'
                    }),
                    option: (base, { data, isSelected, isFocused }) => {
                      const isParent = !(data as any).parentCode;
                      return {
                        ...base,
                        fontSize: '11.5px',
                        fontWeight: isParent ? '800' : '500',
                        paddingLeft: isParent ? '12px' : '24px',
                        color: isParent ? '#0f172a' : '#475569',
                        backgroundColor: isSelected 
                          ? '#e0e7ff' 
                          : isFocused 
                            ? '#f1f5f9' 
                            : 'white',
                        cursor: 'pointer',
                      };
                    },
                    menu: (base) => ({
                      ...base,
                      borderRadius: '0.5rem',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #f1f5f9',
                      overflow: 'hidden',
                      padding: '4px',
                      zIndex: 60
                    })
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Keterangan / Memo</label>
                  <button
                    type="button"
                    disabled={isSuggesting || formData.description.trim().length < 4}
                    onClick={handleGetAiSuggestion}
                    className={cn(
                      "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition-all duration-150",
                      formData.description.trim().length < 4
                        ? "text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
                        : "text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 cursor-pointer shadow-sm active:scale-95"
                    )}
                    title={formData.description.trim().length < 4 ? "Ketik minimal 4 karakter keterangan terlebih dahulu" : "Dapatkan rekomendasi CoA & Kas/Bank dari AI"}
                  >
                    {isSuggesting ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-500" />
                        Mencari...
                      </>
                    ) : (
                      <>
                        <Sparkles className={cn("w-2.5 h-2.5", formData.description.trim().length >= 4 && "text-indigo-500 animate-pulse")} />
                        Saran CoA (AI)
                      </>
                    )}
                  </button>
                </div>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Bayar tagihan internet IndiHome pariwisata..."
                  value={formData.description}
                  onChange={e => {
                    setFormData({...formData, description: e.target.value});
                    if (aiSuggestion) setAiSuggestion(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
                <p className="text-[9.5px] text-slate-400 mt-1 leading-normal">
                  ✨ Ketik keterangan transaksi secara rinci agar AI dapat menyarankan CoA & Kas/Bank dengan tepat.
                </p>

              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2 shrink-0">
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

      {/* Sub-modal Rekomendasi AI */}
      {aiSuggestion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100/60 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <h3 className="text-xs font-black text-indigo-800 uppercase tracking-wider">Rekomendasi FintraxAI</h3>
              </div>
              <button type="button" onClick={() => setAiSuggestion(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer border-0 bg-transparent">&times;</button>
            </div>
            
            <div className="p-4 space-y-3.5 text-xs text-left overflow-y-auto flex-1">
              <p className="text-[10px] text-slate-500 leading-normal">
                Berdasarkan keterangan transaksi <em>"{formData.description}"</em>, tipe <strong>{formData.type === 'Income' ? 'Pemasukan' : 'Pengeluaran'}</strong>, dan proyek <strong>{formData.project}</strong>:
              </p>

              <div className="space-y-2">
                <div className="flex flex-col gap-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Akun Perkiraan (CoA)</span>
                  <span className="text-slate-800 font-bold text-[11px] flex items-center gap-1.5 mt-0.5">
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-extrabold font-mono">
                      {aiSuggestion.accountCode}
                    </span>
                    {aiSuggestion.accountName}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Akun Kas / Bank</span>
                  <span className="text-slate-800 font-bold text-[11px] flex items-center gap-1.5 mt-0.5">
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px] font-extrabold font-mono">
                      {aiSuggestion.bankCode}
                    </span>
                    {aiSuggestion.bankName}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100/60">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Analisis AI:</span>
                <p className="text-[10px] text-slate-600 italic leading-relaxed">
                  "{aiSuggestion.explanation}"
                </p>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setAiSuggestion(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-[10px] uppercase tracking-wider bg-transparent border-0 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const existingCoa = coaList.find(c => c.code === aiSuggestion.accountCode);
                  setFormData({
                    ...formData,
                    accountCode: aiSuggestion.accountCode,
                    accountName: existingCoa ? existingCoa.name : aiSuggestion.accountName,
                    accountId: aiSuggestion.bankCode
                  });
                  setAiSuggestion(null);
                  toast.success("Rekomendasi akun berhasil diterapkan!");
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Catat Uang Muka (DP) */}
      {isDpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                📥 Catat Uang Muka Baru
              </h2>
              <button type="button" onClick={() => setIsDpModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleDpSubmit} className="p-4 space-y-3 text-xs text-left overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Proyek</label>
                <SearchableSelect
                  isSearchable={false}
                  value={dpFormData.project}
                  onChange={val => {
                    const newProj = val as 'Pariwisata' | 'Properti';
                    const newDefaultUnit = defaultUnitForProject(newProj);
                    setDpFormData({...dpFormData, project: newProj, unit: newDefaultUnit});
                    setDpItems([{ id: generateUUID(), unit: newDefaultUnit, amount: '' }]);
                  }}
                  options={[
                    { value: 'Pariwisata', label: '🌴 Pariwisata' },
                    { value: 'Properti', label: '🏡 Properti' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nama Tamu / Pelanggan</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nama Lengkap..."
                  value={dpFormData.customerName}
                  onChange={e => setDpFormData({...dpFormData, customerName: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">No Telpon</label>
                  <input 
                    type="text" 
                    placeholder="0812..."
                    value={dpFormData.customerPhone}
                    onChange={e => setDpFormData({...dpFormData, customerPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Kota Asal / Alamat</label>
                  <input 
                    type="text" 
                    placeholder="Alamat..."
                    value={dpFormData.customerAddress}
                    onChange={e => setDpFormData({...dpFormData, customerAddress: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  />
                </div>
              </div>

              {dpFormData.project !== 'Properti' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Check In</label>
                    <input 
                      type="date" 
                      required
                      value={dpFormData.checkInDate}
                      onChange={e => setDpFormData({...dpFormData, checkInDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Check Out</label>
                    <input 
                      type="date" 
                      required
                      value={dpFormData.checkOutDate}
                      onChange={e => setDpFormData({...dpFormData, checkOutDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Kas / Bank</label>
                  <SearchableSelect
                    value={dpFormData.accountId}
                    onChange={val => setDpFormData({...dpFormData, accountId: val})}
                    options={bankAccounts.map(b => ({
                      value: b.code,
                      label: b.parentCode ? `└─ [${b.code}] ${b.name}` : `[${b.code}] ${b.name}`,
                      isChild: !!b.parentCode
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Metode Bayar</label>
                  <SearchableSelect
                    isSearchable={false}
                    value={dpFormData.paymentMethod}
                    onChange={val => setDpFormData({...dpFormData, paymentMethod: val as any})}
                    options={[
                      { value: 'Transfer Bank', label: 'Transfer Bank' },
                      { value: 'Cash', label: 'Tunai / Cash' },
                      { value: 'Debit/Kredit', label: 'Kartu Debit/Kredit' },
                      { value: 'Lainnya', label: 'Lainnya' }
                    ]}
                  />
                </div>
              </div>

              {/* Dynamic Unit List Section */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Pilihan Barang & Jasa & Nominal DP
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultUnit = defaultUnitForProject(dpFormData.project);
                      setDpItems(prev => [...prev, { id: generateUUID(), unit: defaultUnit, amount: '' }]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 hover:bg-blue-600 rounded-full transition-all duration-200 shadow-sm"
                  >
                    <Plus className="w-3 h-3" /> Tambah Barang & Jasa
                  </button>
                </div>

                <div className="space-y-2">
                  {dpItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-end">
                      <div className="flex-1 min-w-0">
                        {idx === 0 && <span className="block text-[9px] text-slate-400 mb-0.5 font-semibold">Barang & Jasa</span>}
                        <SearchableSelect
                          value={item.unit}
                          onChange={val => {
                            setDpItems(prev => prev.map(x => x.id === item.id ? { ...x, unit: val } : x));
                          }}
                          placeholder="-- Pilih Barang & Jasa --"
                          options={filteredUnitsForForm.map(u => ({ value: u.name, label: u.name }))}
                          className="min-h-[32px] h-[32px] py-1"
                        />
                      </div>
                      <div className="w-28">
                        {idx === 0 && <span className="block text-[9px] text-slate-400 mb-0.5 font-semibold">Nominal (Rp)</span>}
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="0"
                          value={item.amount}
                          onChange={e => {
                            const rawVal = e.target.value.replace(/\D/g, '');
                            const formatted = rawVal ? Number(rawVal).toLocaleString('id-ID') : '';
                            setDpItems(prev => prev.map(x => x.id === item.id ? { ...x, amount: formatted } : x));
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold text-xs h-[32px]"
                        />
                      </div>
                      {dpItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDpItems(prev => prev.filter(x => x.id !== item.id));
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded transition-all duration-200 h-[32px] flex items-center justify-center shadow-sm"
                          title="Hapus Unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add-ons / Layanan Tambahan */}
              <div className="space-y-2 border-t border-dashed border-slate-200 pt-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    ✨ Add-ons / Layanan Tambahan (Opsional)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setDpAddons(prev => [...prev, { id: generateUUID(), name: '', amount: '' }]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-amber-600 hover:text-white border border-amber-200 hover:border-amber-600 hover:bg-amber-600 rounded-full transition-all duration-200 shadow-sm"
                  >
                    <Plus className="w-3 h-3" /> Tambah Add-on
                  </button>
                </div>

                {dpAddons.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic">Belum ada add-on. Klik tombol di atas untuk menambahkan (misal: Extra Bed, Sarapan, Perlengkapan BBQ).</p>
                )}

                <div className="space-y-2">
                  {dpAddons.map((addon, idx) => (
                    <div key={addon.id} className="flex gap-2 items-end">
                      <div className="flex-1 min-w-0">
                        {idx === 0 && <span className="block text-[9px] text-slate-400 mb-0.5 font-semibold">Nama Add-on</span>}
                        <input
                          type="text"
                          required
                          placeholder="Extra Bed, Sarapan..."
                          value={addon.name}
                          onChange={e => {
                            const val = e.target.value;
                            setDpAddons(prev => prev.map(x => x.id === addon.id ? { ...x, name: val } : x));
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 text-xs font-medium h-[32px]"
                        />
                      </div>
                      <div className="w-28">
                        {idx === 0 && <span className="block text-[9px] text-slate-400 mb-0.5 font-semibold">Nominal (Rp)</span>}
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="0"
                          value={addon.amount}
                          onChange={e => {
                            const rawVal = e.target.value.replace(/\D/g, '');
                            const formatted = rawVal ? Number(rawVal).toLocaleString('id-ID') : '';
                            setDpAddons(prev => prev.map(x => x.id === addon.id ? { ...x, amount: formatted } : x));
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 font-bold text-xs h-[32px]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDpAddons(prev => prev.filter(x => x.id !== addon.id));
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded transition-all duration-200 h-[32px] flex items-center justify-center shadow-sm"
                        title="Hapus Add-on"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Catatan / Keterangan Tambahan</label>
                <textarea 
                  rows={2}
                  placeholder="Keterangan kamar, pesanan khusus..."
                  value={dpFormData.notes}
                  onChange={e => setDpFormData({...dpFormData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => { resetDpForm(); setIsDpModalOpen(false); }}
                  className="px-4 py-2 text-slate-600 font-bold text-xs uppercase hover:bg-slate-100 rounded transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  onClick={() => setDpSubmitMode('save_only')}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded transition-colors flex items-center disabled:opacity-50 shadow-sm cursor-pointer border-0"
                >
                  {isSubmitting && dpSubmitMode === 'save_only' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan
                </button>
                <button 
                  type="submit" 
                  onClick={() => setDpSubmitMode('save_and_download')}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded transition-colors flex items-center disabled:opacity-50 shadow-sm cursor-pointer border-0"
                >
                  {isSubmitting && dpSubmitMode === 'save_and_download' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan dan Download
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kwitansi Modal Integration */}
      {selectedReceiptTx && (
        <KwitansiModal 
          transaction={selectedReceiptTx} 
          sequenceNumber={getReceiptSequence(selectedReceiptTx)} 
          onClose={() => setSelectedReceiptTx(null)} 
          receiptConfig={receiptConfig}
        />
      )}
    </div>
  );
}
