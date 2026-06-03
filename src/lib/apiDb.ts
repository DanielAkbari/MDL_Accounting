import { Transaction } from '../types';
import * as localDb from './localDb';
import * as serverSheets from './serverSheets';

export async function getTransactions(): Promise<Transaction[]> {
  const { serviceAccount, accessToken } = serverSheets.getSheetsConfig();
  if (serviceAccount || accessToken) {
    return serverSheets.getTransactions();
  }
  return localDb.getTransactions();
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  const { serviceAccount, accessToken } = serverSheets.getSheetsConfig();
  if (serviceAccount || accessToken) {
    return serverSheets.addTransaction(transaction);
  }
  return localDb.addTransaction(transaction);
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  const { serviceAccount, accessToken } = serverSheets.getSheetsConfig();
  if (serviceAccount || accessToken) {
    return serverSheets.updateTransaction(transaction);
  }
  return localDb.updateTransaction(transaction);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const { serviceAccount, accessToken } = serverSheets.getSheetsConfig();
  if (serviceAccount || accessToken) {
    return serverSheets.deleteTransaction(transactionId);
  }
  return localDb.deleteTransaction(transactionId);
}
