import { supabase } from './supabase';
import { Transaction, BusinessUnit, ReceiptConfig } from '../types';
import { COA } from '../data/coa';

export const DEFAULT_UNITS: BusinessUnit[] = [
  // Pariwisata
  { name: 'Glamping', project: 'Pariwisata' },
  { name: 'Cabin', project: 'Pariwisata' },
  { name: 'Malang Dreamcamp', project: 'Pariwisata' },
  { name: 'Villa', project: 'Pariwisata' },
  { name: 'Foodcourt', project: 'Pariwisata' },
  { name: 'Wahana - ATV', project: 'Pariwisata' },
  { name: 'Wahana - Ayunan', project: 'Pariwisata' },
  { name: 'Wahana - Keranjang Sultan', project: 'Pariwisata' },
  { name: 'Wahana - Skuter', project: 'Pariwisata' },
  { name: 'Wahana - Seluncuran', project: 'Pariwisata' },
  { name: 'Wahana - spot foto / paralayang', project: 'Pariwisata' },
  { name: 'Wahana - Lainnya', project: 'Pariwisata' },
  { name: 'Umum / Lainnya', project: 'Pariwisata' },
  
  // Properti
  { name: 'Kavling Cafe', project: 'Properti' },
  { name: 'Kavling Kebun', project: 'Properti' },
  { name: 'Kavling Villa', project: 'Properti' },
  { name: 'Kavling Glamping', project: 'Properti' },
  { name: 'Kavling Lainnya', project: 'Properti' },
  { name: 'Properti / Kavling', project: 'Properti' }
];

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  companyName: 'Malang Dreamland',
  ptName: 'PT. SEMBILAN WALI NUSANTARA',
  address: 'Jl. Raya Ampeldento, Boko, Asrikraton, Kec. Pakis, Kabupaten Malang, Jawa Timur 65154 (Kantor Malang Dreamland)',
  phone: '',
  website: 'malangdreamland.com',
  socialMedia: '@MalangDreamlandOfficial',
  disclaimer: 'Kwitansi ini dinyatakan sah meskipun tanpa tanda tangan karena dikeluarkan dan dicetak oleh sistem resmi PT Sembilan Wali Nusantara',
  defaultCashier: 'Admin',
  logoBase64: ''
};


// helper to check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return url && url !== 'YOUR_SUPABASE_URL';
};

function mapTransactionFromDb(row: any): Transaction {
  return {
    id: row.id || '',
    date: row.date || '',
    type: (row.type === 'Expense' || row.type === 'expense') ? 'Expense' : 'Income',
    amount: parseFloat(row.amount || 0),
    unit: row.unit || '',
    description: row.description || row.Description || '',
    accountCode: row.accountCode || row.accountcode || '',
    accountName: row.accountName || row.accountname || '',
    accountId: row.accountId || row.accountid || '',
    transactionNumber: row.transactionNumber || row.transactionnumber || '',
    project: row.project || '',
    customerName: row.customerName || row.customername || '',
    customerAddress: row.customerAddress || row.customeraddress || '',
    customerPhone: row.customerPhone || row.customerphone || '',
    paymentMethod: row.paymentMethod || row.paymentmethod || '',
    bankName: row.bankName || row.bankname || '',
    checkInDate: row.checkInDate || row.checkindate || '',
    checkOutDate: row.checkOutDate || row.checkoutdate || '',
    notes: row.notes || '',
    status: row.status || '',
    settledTxId: row.settledTxId || row.settledtxid || '',
  };
}

function mapCoaFromDb(row: any): COA {
  return {
    no: row.no || row.No || '',
    type: row.type || '',
    code: row.code || '',
    name: row.name || '',
    parentCode: row.parentCode || row.parentcode || undefined,
    isCustom: row.isCustom === true || row.iscustom === true || row.is_custom === true || row.isCustom === 'true' || row.iscustom === 'true' || row.is_custom === 'true',
    project: row.project || 'Umum',
  };
}

function mapTransactionToDb(tx: Transaction): any {
  return {
    id: tx.id,
    date: tx.date,
    type: tx.type,
    amount: tx.amount,
    unit: tx.unit,
    description: tx.description,
    accountcode: tx.accountCode,
    accountname: tx.accountName,
    accountid: tx.accountId || null,
    transactionnumber: tx.transactionNumber || null,
    project: tx.project || null,
    customername: tx.customerName || null,
    customeraddress: tx.customerAddress || null,
    customerphone: tx.customerPhone || null,
    paymentmethod: tx.paymentMethod || null,
    bankname: tx.bankName || null,
    checkindate: tx.checkInDate || null,
    checkoutdate: tx.checkOutDate || null,
    notes: tx.notes || null,
    status: tx.status || null,
    settledtxid: tx.settledTxId || null,
  };
}

function mapCoaToDb(coa: COA): any {
  return {
    no: coa.no,
    type: coa.type,
    code: coa.code,
    name: coa.name,
    parentcode: coa.parentCode || null,
    iscustom: coa.isCustom === true || (coa.isCustom as any) === 'true',
    project: coa.project || 'Umum',
  };
}

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

export async function getTransactions(): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*');
  
  if (error) {
    console.error('Error fetching transactions from Supabase:', error);
    throw error;
  }
  
  const mapped = (data || []).map(mapTransactionFromDb);
  return mapped.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  const dbRow = {
    ...mapTransactionToDb(transaction),
    user_id: userId
  };
  const { error } = await supabase
    .from('transactions')
    .insert([dbRow]);
  
  if (error) {
    console.error('Error adding transaction to Supabase:', error);
    throw error;
  }
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  const dbRow = {
    ...mapTransactionToDb(transaction),
    user_id: userId
  };
  const { error } = await supabase
    .from('transactions')
    .update(dbRow)
    .eq('id', transaction.id);
  
  if (error) {
    console.error('Error updating transaction in Supabase:', error);
    throw error;
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting transaction from Supabase:', error);
    throw error;
  }
}

export async function getCoas(): Promise<COA[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('CoA')
    .select('*');
  
  if (error) {
    console.error('Error fetching COA from Supabase:', error);
    throw error;
  }
  
  const mapped = (data || []).map(mapCoaFromDb);
  return mapped.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

export async function addCoa(coa: COA): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  const dbRow = {
    ...mapCoaToDb(coa),
    user_id: userId
  };
  const { error } = await supabase
    .from('CoA')
    .insert([dbRow]);
  
  if (error) {
    console.error('Error adding COA to Supabase:', error);
    throw error;
  }
}

export async function updateCoa(coa: COA): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  const dbRow = {
    ...mapCoaToDb(coa),
    user_id: userId
  };
  const { error } = await supabase
    .from('CoA')
    .update(dbRow)
    .eq('no', coa.no);
  
  if (error) {
    console.error('Error updating COA in Supabase:', error);
    throw error;
  }
}

export async function deleteCoa(code: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  const { error } = await supabase
    .from('CoA')
    .delete()
    .eq('code', code)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting COA from Supabase:', error);
    throw error;
  }
}

export async function migrateDataToSupabase(transactions: Transaction[], coas: COA[]): Promise<{ success: boolean; txCount: number; coaCount: number }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
  const userId = await getUserId();

  if (transactions.length > 0) {
    const dbRows = transactions.map(t => ({
      ...mapTransactionToDb(t),
      user_id: userId
    }));
    const { error: txErr } = await supabase
      .from('transactions')
      .upsert(dbRows);
    if (txErr) {
      console.error('Error migrating transactions to Supabase:', txErr);
      throw txErr;
    }
  }

  if (coas.length > 0) {
    const dbRows = coas.map(c => ({
      ...mapCoaToDb(c),
      user_id: userId
    }));
    const { error: coaErr } = await supabase
      .from('CoA')
      .upsert(dbRows);
    if (coaErr) {
      console.error('Error migrating COA to Supabase:', coaErr);
      throw coaErr;
    }
  }

  return {
    success: true,
    txCount: transactions.length,
    coaCount: coas.length
  };
}

export async function seedCoas(coas: COA[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  const dbRows = coas.map(c => ({
    ...mapCoaToDb(c),
    user_id: userId
  }));
  
  const { error } = await supabase
    .from('CoA')
    .insert(dbRows);
  
  if (error) {
    console.error('Error seeding COA list in Supabase:', error);
    throw error;
  }
}

export async function getBusinessUnits(): Promise<BusinessUnit[]> {
  if (!isSupabaseConfigured()) return DEFAULT_UNITS;
  try {
    const { data, error } = await supabase
      .from('business_units')
      .select('*');
    
    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.warn('Supabase: Table [business_units] not found. Falling back to default units.');
        return DEFAULT_UNITS;
      }
      throw error;
    }
    
    if (!data || data.length === 0) {
      // If table is empty on cloud, try to seed with default units
      await saveBusinessUnits(DEFAULT_UNITS);
      return DEFAULT_UNITS;
    }
    
    return data.map((row: any) => ({
      name: row.name,
      project: row.project
    }));
  } catch (err: any) {
    console.error('Error fetching business units from Supabase, falling back to defaults:', err.message);
    return DEFAULT_UNITS;
  }
}

export async function saveBusinessUnits(units: BusinessUnit[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  
  try {
    const userId = await getUserId();
    if (!userId) return;
    
    // First delete existing units for this user to overwrite
    const { error: delErr } = await supabase
      .from('business_units')
      .delete()
      .eq('user_id', userId);
      
    if (delErr) {
      if (delErr.message.includes('Could not find the table')) {
        return; // Silent bypass if table does not exist
      }
      throw delErr;
    }
    
    if (units.length > 0) {
      const dbRows = units.map(u => ({
        name: u.name,
        project: u.project,
        user_id: userId
      }));
      const { error: insErr } = await supabase
        .from('business_units')
        .insert(dbRows);
      if (insErr) throw insErr;
    }
  } catch (err: any) {
    console.error('Error saving business units to Supabase:', err.message);
  }
}

export async function getReceiptConfig(): Promise<ReceiptConfig> {
  if (!isSupabaseConfigured()) return DEFAULT_RECEIPT_CONFIG;
  try {
    const { data, error } = await supabase
      .from('receipt_configs')
      .select('*')
      .maybeSingle(); // maybeSingle returns null if 0 rows instead of error
    
    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.warn('Supabase: Table [receipt_configs] not found. Falling back to default config.');
        return DEFAULT_RECEIPT_CONFIG;
      }
      throw error;
    }
    
    if (!data) {
      // Empty config on cloud, seed with defaults
      await saveReceiptConfig(DEFAULT_RECEIPT_CONFIG);
      return DEFAULT_RECEIPT_CONFIG;
    }
    
    return {
      companyName: data.company_name,
      ptName: data.pt_name,
      address: data.address,
      phone: data.phone || '',
      website: data.website || '',
      socialMedia: data.social_media || '',
      disclaimer: data.disclaimer || '',
      defaultCashier: data.default_cashier || '',
      logoBase64: data.logo_base_64 || ''
    };
  } catch (err: any) {
    console.error('Error fetching receipt config from Supabase, falling back to defaults:', err.message);
    return DEFAULT_RECEIPT_CONFIG;
  }
}

export async function saveReceiptConfig(config: ReceiptConfig): Promise<void> {
  if (!isSupabaseConfigured()) return;
  
  try {
    const userId = await getUserId();
    if (!userId) return;
    
    const dbRow = {
      company_name: config.companyName,
      pt_name: config.ptName,
      address: config.address,
      phone: config.phone || null,
      website: config.website || null,
      social_media: config.socialMedia || null,
      disclaimer: config.disclaimer || null,
      default_cashier: config.defaultCashier || null,
      logo_base_64: config.logoBase64 || null,
      user_id: userId
    };
    
    // Upsert receipt config for the user
    const { error } = await supabase
      .from('receipt_configs')
      .upsert(dbRow, { onConflict: 'user_id' });
      
    if (error) {
      if (error.message.includes('Could not find the table')) {
        return; // Silent bypass if table does not exist
      }
      throw error;
    }
  } catch (err: any) {
    console.error('Error saving receipt config to Supabase:', err.message);
  }
}

