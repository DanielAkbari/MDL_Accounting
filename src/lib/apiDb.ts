import { Transaction, BusinessUnit, ReceiptConfig } from '../types';
import { COA, getMergedCOA, saveCOAList } from '../data/coa';
import * as supabaseDb from './supabaseDb';
import { generateTxNumber } from './utils';


export async function getTransactions(): Promise<Transaction[]> {
  return supabaseDb.getTransactions();
}

export async function addTransaction(transaction: Transaction, existingList?: Transaction[]): Promise<void> {
  // Auto-generate transaction number if not present
  if (!transaction.transactionNumber) {
    const list = existingList || await getTransactions();
    let prefix: 'BKM' | 'BKK' | 'JU' = 'BKM';
    const isManualJournal = transaction.id.startsWith('JU-') || (transaction.description || '').startsWith('[Jurnal Umum]');
    
    if (isManualJournal) {
      prefix = 'JU';
      const commonId = transaction.id.replace('JU-D-', '').replace('JU-K-', '');
      const otherLeg = list.find(ot => ot.id !== transaction.id && ot.id.includes(commonId) && ot.transactionNumber);
      if (otherLeg) {
        transaction.transactionNumber = otherLeg.transactionNumber;
      }
    } else {
      prefix = transaction.type === 'Income' ? 'BKM' : 'BKK';
    }

    if (!transaction.transactionNumber) {
      transaction.transactionNumber = generateTxNumber(list, prefix, transaction.date);
    }
  }

  return supabaseDb.addTransaction(transaction);
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  return supabaseDb.updateTransaction(transaction);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  return supabaseDb.deleteTransaction(transactionId);
}

export async function getCoas(): Promise<COA[]> {
  return supabaseDb.getCoas();
}

export async function addCoa(coa: COA): Promise<void> {
  return supabaseDb.addCoa(coa);
}

export async function updateCoa(coa: COA): Promise<void> {
  return supabaseDb.updateCoa(coa);
}

export async function deleteCoa(code: string): Promise<void> {
  return supabaseDb.deleteCoa(code);
}

export async function seedCoas(coas: COA[]): Promise<void> {
  return supabaseDb.seedCoas(coas);
}

export async function getUnits(): Promise<BusinessUnit[]> {
  return supabaseDb.getBusinessUnits();
}

export async function saveUnits(units: BusinessUnit[]): Promise<void> {
  return supabaseDb.saveBusinessUnits(units);
}

export async function getReceiptConfig(): Promise<ReceiptConfig> {
  return supabaseDb.getReceiptConfig();
}

export async function saveReceiptConfig(config: ReceiptConfig): Promise<void> {
  return supabaseDb.saveReceiptConfig(config);
}



