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
}

export interface BusinessUnit {
  id: string;
  name: string;
}
