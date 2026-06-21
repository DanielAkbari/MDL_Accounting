export type TransactionType = 'Income' | 'Expense';

export interface Transaction {
  id: string;
  date: string; // ISO 8601
  type: TransactionType;
  amount: number;
  unit: string;
  accountCode: string;
  accountName: string;
  description: string;
  accountId?: string;
  transactionNumber?: string;
  project?: 'Pariwisata' | 'Properti';
  
  // Custom Receipt & Down Payment Fields
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  paymentMethod?: 'Cash' | 'Transfer Bank' | 'Debit/Kredit' | 'Lainnya';
  bankName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string;
  status?: 'down_payment' | 'recognized' | 'regular';
  settledTxId?: string;
}

export interface BusinessUnit {
  name: string;
  project: 'Pariwisata' | 'Properti';
}

export interface ReceiptConfig {
  companyName: string;
  ptName: string;
  address: string;
  phone: string;
  website: string;
  socialMedia: string;
  disclaimer: string;
  defaultCashier: string;
  logoBase64?: string;
}

export interface AppUser {
  username: string;
  password?: string;
  role: 'admin' | 'staff';
}
