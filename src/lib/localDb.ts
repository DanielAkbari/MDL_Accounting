import { Transaction } from '../types';

const STORAGE_KEY = 'mdl_transactions';

export async function getTransactions(): Promise<Transaction[]> {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  const data = await getTransactions();
  data.push(transaction);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  const data = await getTransactions();
  const index = data.findIndex(t => t.id === transaction.id);
  if (index !== -1) {
    data[index] = transaction;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const data = await getTransactions();
  const newData = data.filter(t => t.id !== transactionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
}
