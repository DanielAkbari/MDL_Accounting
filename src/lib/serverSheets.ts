import { Transaction } from '../types';

export const getSheetsConfig = () => {
  const serviceAccount = localStorage.getItem('mdl_service_account');
  const spreadsheetId = localStorage.getItem('mdl_spreadsheet_id');
  const accessToken = localStorage.getItem('mdl_google_access_token');
  return { serviceAccount, spreadsheetId, accessToken };
};

export async function testConnection(serviceAccount: string | null, spreadsheetId: string, accessToken?: string | null) {
  const res = await fetch('/api/sheets/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceAccount, spreadsheetId, accessToken })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function getTransactions(): Promise<Transaction[]> {
  const { serviceAccount, spreadsheetId, accessToken } = getSheetsConfig();
  if ((!serviceAccount && !accessToken) || !spreadsheetId) return [];

  const res = await fetch('/api/sheets/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceAccount, spreadsheetId, accessToken })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Fetch failed');
  }
  return res.json();
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  const { serviceAccount, spreadsheetId, accessToken } = getSheetsConfig();
  if ((!serviceAccount && !accessToken) || !spreadsheetId) throw new Error('Missing credentials');

  const res = await fetch('/api/sheets/transactions/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceAccount, spreadsheetId, accessToken, transaction })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error);
  }
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  const { serviceAccount, spreadsheetId, accessToken } = getSheetsConfig();
  if ((!serviceAccount && !accessToken) || !spreadsheetId) throw new Error('Missing credentials');

  const res = await fetch('/api/sheets/transactions/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceAccount, spreadsheetId, accessToken, transaction })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const { serviceAccount, spreadsheetId, accessToken } = getSheetsConfig();
  if ((!serviceAccount && !accessToken) || !spreadsheetId) throw new Error('Missing credentials');

  const res = await fetch('/api/sheets/transactions/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceAccount, spreadsheetId, accessToken, id })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error);
  }
}
