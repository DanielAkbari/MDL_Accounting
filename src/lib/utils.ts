import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as dateFnsFormat, parseISO as dateFnsParseISO } from 'date-fns';
import { id } from 'date-fns/locale';

import { Transaction } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTransactionProject(t: Transaction): 'Pariwisata' | 'Properti' {
  if (t.project) return t.project;
  const u = (t.unit || '').toLowerCase();
  if (u.includes('kavling') || u.includes('properti') || u.includes('property') || u.includes('tanah')) {
    return 'Properti';
  }
  const c = (t.accountCode || '');
  if (c.startsWith('411') || c.startsWith('511') || c.startsWith('113') || c.includes('Properti') || c.includes('Kavling')) {
    return 'Properti';
  }
  return 'Pariwisata';
}

export function parseSafeDate(dateStr: any): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  // Try parseISO first
  let d = dateFnsParseISO(String(dateStr));
  if (!isNaN(d.getTime())) return d;
  
  // Try simple Date constructor
  d = new Date(String(dateStr));
  if (!isNaN(d.getTime())) return d;

  // Try parsing common formats like DD/MM/YYYY or DD-MM-YYYY
  try {
    const cleanStr = String(dateStr).trim();
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    } else if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }
  } catch (e) {}

  if (d && !isNaN(d.getTime())) return d;
  
  return new Date(); // fallback
}

export function generateTxNumber(
  existingTransactions: Transaction[],
  prefix: 'BKM' | 'BKK' | 'JU',
  dateStr: string
): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const datePrefix = `${prefix}.${year}.${month}.`;
  
  const matched = existingTransactions.filter(t => {
    if (!t.transactionNumber) return false;
    return t.transactionNumber.startsWith(datePrefix);
  });
  
  let maxSeq = 0;
  matched.forEach(t => {
    if (t.transactionNumber) {
      const parts = t.transactionNumber.split('.');
      const seq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });
  
  const nextSeq = String(maxSeq + 1).padStart(5, '0');
  return `${datePrefix}${nextSeq}`;
}


export function formatSafeDate(dateStr: any, pattern: string = 'dd MMM yyyy'): string {
  if (!dateStr) return '-';
  const parsed = parseSafeDate(dateStr);
  if (isNaN(parsed.getTime())) return '-';
  try {
    return dateFnsFormat(parsed, pattern, { locale: id });
  } catch (e) {
    return '-';
  }
}

