import React, { useEffect, useState, useMemo } from 'react';
import { Transaction, ReceiptConfig } from '../types';
import { getTransactions } from '../lib/apiDb';
import { X, Printer, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { getTransactionProject, formatSafeDate, parseSafeDate } from '../lib/utils';

interface KwitansiModalProps {
  transaction: Transaction;
  onClose: () => void;
  sequenceNumber?: number;
  receiptConfig: ReceiptConfig | null;
}

// Spelled out words generator helper (terbilangHelper)
function terbilangHelper(nilai: number): string {
  const bilangan = [
    '', 'satu', 'dua', 'tiga', 'empat', 'lima',
    'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'
  ];
  
  const nilaiAbs = Math.abs(Math.floor(nilai));
  let hasil = '';
  
  if (nilaiAbs < 12) {
    hasil = ' ' + bilangan[nilaiAbs];
  } else if (nilaiAbs < 20) {
    hasil = terbilangHelper(nilaiAbs - 10) + ' belas';
  } else if (nilaiAbs < 100) {
    hasil = terbilangHelper(Math.floor(nilaiAbs / 10)) + ' puluh' + terbilangHelper(nilaiAbs % 10);
  } else if (nilaiAbs < 200) {
    hasil = ' seratus' + terbilangHelper(nilaiAbs - 100);
  } else if (nilaiAbs < 1000) {
    hasil = terbilangHelper(Math.floor(nilaiAbs / 100)) + ' ratus' + terbilangHelper(nilaiAbs % 100);
  } else if (nilaiAbs < 2000) {
    hasil = ' seribu' + terbilangHelper(nilaiAbs - 1000);
  } else if (nilaiAbs < 1000000) {
    hasil = terbilangHelper(Math.floor(nilaiAbs / 1000)) + ' ribu' + terbilangHelper(nilaiAbs % 1000);
  } else if (nilaiAbs < 1000000000) {
    hasil = terbilangHelper(Math.floor(nilaiAbs / 1000000)) + ' juta' + terbilangHelper(nilaiAbs % 1000000);
  } else if (nilaiAbs < 1000000000000) {
    hasil = terbilangHelper(Math.floor(nilaiAbs / 1000000000)) + ' milyar' + terbilangHelper(nilaiAbs % 1000000000);
  }
  
  return hasil;
}

export function terbilang(nilai: number): string {
  return terbilangHelper(nilai).replace(/\s+/g, ' ').trim();
}

export function formatTerbilang(nilai: number): string {
  if (nilai === 0) return 'Nol rupiah';
  const hasil = terbilang(nilai);
  return hasil.charAt(0).toUpperCase() + hasil.slice(1) + ' rupiah';
}

export default function KwitansiModal({ transaction, onClose, sequenceNumber = 1, receiptConfig }: KwitansiModalProps) {
  const [config, setConfig] = useState<ReceiptConfig | null>(receiptConfig);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!receiptConfig) {
      import('../lib/apiDb').then(m => m.getReceiptConfig()).then(cfg => setConfig(cfg));
    } else {
      setConfig(receiptConfig);
    }
    getTransactions().then(data => {
      setAllTransactions(data);
    });
  }, [receiptConfig]);
  const bankCode = transaction.accountId || '11000';
  const txDate = parseSafeDate(transaction.date);
  const yearStr = formatSafeDate(txDate, 'yyyy');
  const monthStr = formatSafeDate(txDate, 'MM');
  const seqStr = String(sequenceNumber).padStart(5, '0');
  const receiptNumber = transaction.transactionNumber || `${bankCode}.${yearStr}.${monthStr}.${seqStr}`;

  const formattedDate = formatSafeDate(txDate, 'dd MMM yyyy');
  const proj = getTransactionProject(transaction);

  // Group transactions sharing the same transactionNumber and status
  const groupedTxs = useMemo(() => {
    if (!transaction.transactionNumber || allTransactions.length === 0) {
      return [transaction];
    }
    const matched = allTransactions.filter(t => 
      t.transactionNumber === transaction.transactionNumber && 
      t.status === transaction.status
    );
    return matched.length > 0 ? matched : [transaction];
  }, [allTransactions, transaction]);

  const totalAmount = useMemo(() => {
    return groupedTxs.reduce((sum, t) => sum + t.amount, 0);
  }, [groupedTxs]);

  const paymentDescription = useMemo(() => {
    return groupedTxs.map(t => {
      const uName = t.unit || '';
      const cName = t.customerName || '';
      const desc = t.description || '';
      
      // Detect add-on transactions
      if (desc.startsWith('[Add-on]')) {
        const addonName = desc.replace('[Add-on] ', '').replace(` a.n ${cName}`, '');
        return `Add-on: ${addonName} (${uName})`;
      }
      
      const ciFormatted = formatSafeDate(t.checkInDate, 'dd/MM/yyyy');
      const coFormatted = formatSafeDate(t.checkOutDate, 'dd/MM/yyyy');
      if (proj === 'Pariwisata' && ciFormatted && coFormatted) {
        return `${uName} a.n ${cName}, CI (${ciFormatted}), CO (${coFormatted})`;
      }
      return `${uName} a.n ${cName}`;
    }).join('\n');
  }, [groupedTxs, proj]);

  const openReceiptInNewTab = (autoAction: 'download' | 'print' | 'none') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Gagal membuka tab baru. Harap periksa apakah pop-up blocker aktif.');
      return;
    }

    const customerClean = (transaction.customerName || 'Tamu').replace(/[^a-zA-Z0-9]/g, '_');
    const docName = `Kwitansi-${customerClean}-${receiptNumber}.pdf`;
    const terbilangStr = formatTerbilang(totalAmount);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Kwitansi - ${transaction.customerName || 'Tamu'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print-header {
      width: 1000px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 15px;
      padding: 12px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      box-sizing: border-box;
    }
    .btn {
      padding: 8px 16px;
      font-size: 11px;
      font-weight: bold;
      border: 1px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-blue {
      background-color: #2563eb;
      color: #ffffff;
    }
    .btn-blue:hover {
      background-color: #1d4ed8;
    }
    .btn-green {
      background-color: #059669;
      color: #ffffff;
    }
    .btn-green:hover {
      background-color: #047857;
    }
    .btn-close {
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
    }
    .btn-close:hover {
      background-color: #f8fafc;
      color: #1e293b;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .receipt-container {
      width: 1000px;
      height: 480px;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      padding: 30px;
      box-sizing: border-box;
      position: relative;
      color: #022c22;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 8px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
    }
    .col-7 { grid-column: span 7; }
    .col-5 { grid-column: span 5; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .justify-between { justify-content: space-between; }
    .items-start { align-items: flex-start; }
    .items-end { align-items: flex-end; }
    .flex-1 { flex: 1; }
    .shrink-0 { flex-shrink: 0; }
    
    .border-b-2 { border-bottom: 2px solid #065f46; }
    .border-l-2 { border-left: 2px solid #065f46; }
    .border-l { border-left: 1px solid #d1fae5; }
    .border-t { border-top: 1px solid #065f46; }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .font-medium { font-weight: 500; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    
    .text-xs { font-size: 11px; }
    .text-sm { font-size: 13px; }
    .text-base { font-size: 15px; }
    .text-[9px] { font-size: 9px; }
    .text-[8px] { font-size: 8px; }
    .text-[7px] { font-size: 7px; }
    .text-[10px] { font-size: 10px; }
    .text-[16px] { font-size: 16px; }
    
    .text-emerald-950 { color: #022c22; }
    .text-emerald-900 { color: #064e3b; }
    .text-emerald-800 { color: #065f46; }
    .text-emerald-700 { color: #047857; }
    .text-emerald-600 { color: #059669; }
    .text-slate-800 { color: #1e293b; }
    .text-slate-700 { color: #334155; }
    .text-slate-500 { color: #64748b; }
    .text-slate-400 { color: #94a3b8; }
    
    .bg-emerald-700 { background-color: #047857; }
    .bg-emerald-50 { background-color: #ecfdf5; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-50-50 { background-color: rgba(248, 250, 252, 0.5); }
    .border { border: 1px solid #065f46; }
    .border-slate-300 { border-color: #cbd5e1; }
    .rounded { border-radius: 4px; }
    .rounded-xl { border-radius: 12px; }
    .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
    .relative { position: relative; }
    .absolute { position: absolute; }
    .bottom-1 { bottom: 4px; }
    .right-1 { right: 4px; }
    
    .logo-box {
      background-color: #f0fdf4;
      padding: 8px;
      border-radius: 12px;
      border: 1px solid #d1fae5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    
    .title-banner {
      background-color: #047857;
      color: #ffffff;
      font-weight: 900;
      text-align: center;
      padding: 6px 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.4em;
      margin: 10px 0;
    }
    
    .detail-row {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .detail-label {
      width: 144px;
      font-weight: bold;
      color: #065f46;
      font-size: 11px;
    }
    .detail-value {
      color: #022c22;
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 12px;
      font-weight: 500;
      border-bottom: 1px solid #e2e8f0;
      flex: 1;
      padding-bottom: 2px;
    }
    
    .notes-box {
      border: 1px solid #065f46;
      flex: 1;
      padding: 8px;
      border-radius: 4px;
      position: relative;
      min-height: 60px;
      background-color: rgba(248, 250, 252, 0.5);
    }
    
    .amount-display {
      font-size: 15px;
      font-weight: 900;
      color: #064e3b;
      background-color: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 6px 16px;
      border-radius: 4px;
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
    }
    
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
        margin: 0;
      }
      .no-print-header {
        display: none !important;
      }
      @page {
        size: A4 landscape;
        margin: 0;
      }
      .receipt-container {
        position: absolute !important;
        left: 50% !important;
        top: 20mm !important;
        transform: translateX(-50%) !important;
        box-shadow: none !important;
        border: 1px solid #a7f3d0 !important;
        width: 210mm !important;
        height: 101mm !important;
        padding: 8mm !important;
        border-radius: 0 !important;
      }
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
  <div class="no-print-header">
    <button id="btn-download" class="btn btn-blue" onclick="downloadPDF()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      Download PDF
    </button>
    <button class="btn btn-green" onclick="window.print()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Cetak Kwitansi
    </button>
    <button class="btn btn-close" onclick="window.close()">
      Tutup
    </button>
  </div>

  <!-- Printable Area -->
  <div id="kwitansi-print-area" class="receipt-container">
    <!-- Kop & Metadata Container -->
    <div class="grid border-b-2 pb-2" style="border-bottom: 2px solid #065f46;">
      <!-- Left Logo and Company details -->
      <div class="col-7 flex items-start" style="gap: 16px;">
        <div class="logo-box" style="width: 80px; height: 64px; display: flex; align-items: center; justify-content: center; background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 12px; overflow: hidden; padding: 4px; shrink-0;">
          ${config.logoBase64 ? `
            <img src="${config.logoBase64}" style="width: 72px; height: 56px; object-fit: contain;" alt="Logo" />
          ` : `
            <svg width="64" height="48" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 60 L65 15 L105 55" stroke="#059669" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="#059669" fill-opacity="0.15" />
              <path d="M70 60 L115 8 L155 52" stroke="#047857" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="#047857" fill-opacity="0.2" />
              <path d="M120 60 L145 35 L170 60" stroke="#10b981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="#10b981" fill-opacity="0.1" />
              <path d="M10 60 Q100 65 190 60" stroke="#047857" stroke-width="4" />
              <text x="100" y="76" text-anchor="middle" fill="#065f46" font-weight="bold" font-size="15" font-family="sans-serif" letter-spacing="2">MALANG</text>
              <text x="100" y="52" text-anchor="middle" fill="#d97706" font-weight="900" font-size="23" font-family="sans-serif" stroke="#065f46" stroke-width="1.5">Dreamland</text>
            </svg>
          `}
        </div>
        <div class="space-y-1">
          <h2 style="font-size: 15px; font-weight: 950; color: #065f46; margin: 0; padding: 0; letter-spacing: -0.02em;">${config.ptName}</h2>
          <p class="text-slate-700" style="font-size: 9px; line-height: 1.3; margin: 2px 0 0 0; font-weight: 500; max-width: 360px;">${config.address}</p>
          <p class="text-emerald-700" style="font-size: 9px; font-weight: 700; margin: 2px 0 0 0;">
            ${config.website} <span style="color: #a7f3d0; margin: 0 4px;">|</span> ${config.socialMedia}
          </p>
        </div>
      </div>

      <!-- Right Metadata Details Box -->
      <div class="col-5 border-l-2 pl-4 space-y-1 text-slate-800" style="font-size: 11px; font-weight: 500; border-left: 2px solid #065f46; padding-left: 16px;">
        <div class="grid">
          <span class="col-7 text-emerald-800 uppercase font-bold" style="font-size: 9px; letter-spacing: 0.05em; grid-column: span 6;">No. Transaksi</span>
          <span style="grid-column: span 1;">:</span>
          <span class="col-4 font-mono font-bold" style="white-space: nowrap; grid-column: span 5;">${receiptNumber}</span>
        </div>
        <div class="grid">
          <span class="col-7 text-emerald-800 uppercase font-bold" style="font-size: 9px; letter-spacing: 0.05em; grid-column: span 6;">Tanggal</span>
          <span style="grid-column: span 1;">:</span>
          <span class="col-4" style="grid-column: span 5;">${formattedDate}</span>
        </div>
        <div class="grid">
          <span class="col-7 text-emerald-800 uppercase font-bold" style="font-size: 9px; letter-spacing: 0.05em; grid-column: span 6;">Kepada</span>
          <span style="grid-column: span 1;">:</span>
          <span class="col-4 font-bold" style="white-space: nowrap; grid-column: span 5;">${transaction.customerName || '-'}</span>
        </div>
        <div class="grid">
          <span class="col-7 text-emerald-800 uppercase font-bold" style="font-size: 9px; letter-spacing: 0.05em; grid-column: span 6;">Alamat</span>
          <span style="grid-column: span 1;">:</span>
          <span class="col-4" style="grid-column: span 5;">${transaction.customerAddress || '-'}</span>
        </div>
        <div class="grid pt-1" style="border-top: 1px dashed #d1fae5; padding-top: 4px;">
          <span class="col-7 text-emerald-800 uppercase font-bold" style="font-size: 9px; letter-spacing: 0.05em; grid-column: span 6;">No. Telpon</span>
          <span style="grid-column: span 1;">:</span>
          <span class="col-4" style="grid-column: span 5;">${transaction.customerPhone || '-'}</span>
        </div>
      </div>
    </div>

    <!-- Title Bar Banner -->
    <div class="title-banner">
      Kwitansi
    </div>

    <!-- Receipt Main Content Block -->
    <div class="grid flex-1" style="margin: 8px 0; align-items: stretch;">
      <!-- Left Body Details -->
      <div class="col-7 space-y-4" style="grid-column: span 7;">
        <div class="detail-row">
          <span class="detail-label">Telah Terima Dari</span>
          <span class="detail-value" style="font-size: 13px;">${transaction.customerName || '-'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Banyaknya Uang</span>
          <span class="detail-value">${terbilangStr}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Untuk Pembayaran</span>
          <span class="detail-value" style="line-height: 1.4; white-space: pre-line;">${paymentDescription}</span>
        </div>
      </div>

      <!-- Right Side Method and Keterangan -->
      <div class="col-5 flex flex-col justify-between pl-4 border-l" style="grid-column: span 5; border-left: 1px solid #d1fae5; padding-left: 16px;">
        <div class="space-y-3">
          <div>
            <span class="text-emerald-800 uppercase font-bold" style="font-size: 9px; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Pembayaran dilakukan secara :</span>
            <span class="italic font-bold" style="font-family: Georgia, serif; font-size: 12px;">${transaction.paymentMethod || 'Transfer Bank'}</span>
          </div>
          
          <div class="space-y-1 pt-2" style="border-top: 1px solid #d1fae5; padding-top: 8px;">
            <span class="text-emerald-700 uppercase font-bold" style="font-size: 8px; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Keterangan :</span>
            <div class="grid" style="font-size: 10px;">
              <span class="col-5 text-emerald-800 font-medium" style="grid-column: span 5;">Bank</span>
              <span style="grid-column: span 1;">:</span>
              <span class="col-6 font-bold" style="color: #1e293b; grid-column: span 6;">${transaction.bankName || 'BCA Pariwisata'}</span>
            </div>
            <div class="grid" style="font-size: 10px;">
              <span class="col-5 text-emerald-800 font-medium" style="grid-column: span 5;">No. / Tanggal</span>
              <span style="grid-column: span 1;">:</span>
              <span class="col-6 font-bold" style="color: #1e293b; grid-column: span 6;">${formattedDate}</span>
            </div>
          </div>
        </div>

        <!-- Additional Notes Box -->
        <div class="mt-2 flex flex-col flex-1" style="margin-top: 8px;">
          <span class="text-emerald-800 uppercase font-bold" style="font-size: 8px; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Catatan Tambahan :</span>
          <div class="notes-box">
            <p style="font-size: 10px; color: #334155; margin: 0; padding: 0; line-height: 1.25;">${transaction.notes || ''}</p>
            <span class="absolute bottom-1 right-1 text-emerald-800 font-bold uppercase select-none" style="font-size: 6px; position: absolute; bottom: 4px; right: 4px;">*Diisi Oleh Admin</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Footer Section -->
    <div class="grid pt-3 mt-2 items-end" style="border-top: 1px solid #065f46; padding-top: 12px; margin-top: 8px;">
      <!-- Disclaimer -->
      <div class="col-7" style="grid-column: span 7;">
        <p class="text-emerald-700 italic font-mono uppercase" style="font-size: 8px; line-height: 1.3; margin: 0; max-width: 420px; font-weight: 500;">
          ${config.disclaimer}
        </p>
        <div class="amount-display mt-2" style="margin-top: 8px;">
          Rp. <span style="font-family: sans-serif; font-weight: 900;">${totalAmount.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <!-- Cashier Signee -->
      <div class="col-5 text-right font-medium text-slate-700" style="grid-column: span 5; text-align: right;">
        <p class="font-bold text-slate-900" style="font-size: 12px; margin: 0; padding-right: 8px;">${config.defaultCashier}</p>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      const action = "${autoAction}";
      if (action === "print") {
        window.print();
      } else if (action === "download") {
        downloadPDF();
      }
    };

    async function downloadPDF() {
      const { jsPDF } = window.jspdf;
      const element = document.getElementById('kwitansi-print-area');
      const btn = document.getElementById('btn-download');
      
      btn.disabled = true;
      btn.innerHTML = \`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Downloading...\`;
      
      try {
        const canvas = await html2canvas(element, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pdfWidth = 210;
        const pdfHeight = 101;
        
        const pdf = new jsPDF('l', 'mm', [pdfWidth, pdfHeight]);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save("${docName}");
      } catch (err) {
        alert("Gagal membuat PDF: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = \`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download PDF\`;
      }
    }
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };
  if (!config) return null;

  // Group calculations resolved at the top of the component

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      {/* Modal Card */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center no-print">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pratinjau Cetak Kwitansi</h3>
          <div className="flex gap-2 font-sans text-xs">
            <button
              onClick={() => openReceiptInNewTab('download')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={() => openReceiptInNewTab('print')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Kwitansi
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-white border border-slate-300 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container (Matches standard receipt print size) */}
        <div className="p-4 overflow-x-auto bg-slate-200/50 flex justify-center items-center">
          {/* Scale wrapper for compact screen view */}
          <div className="receipt-scale-wrapper flex shrink-0">
            {/* Printable Area */}
            <div id="kwitansi-print-area" className="print-receipt-container w-[1000px] min-h-[480px] bg-white border border-slate-300 shadow-lg p-8 relative font-sans text-xs text-emerald-950 flex flex-col justify-between shrink-0">
            {/* Kop & Metadata Container */}
            <div className="grid grid-cols-12 gap-4 pb-2 border-b-2 border-emerald-800">
              {/* Left Logo and Company details */}
              <div className="col-span-7 flex gap-4 items-start">
                {/* SVG Logo */}
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm w-20 h-16">
                  {config.logoBase64 ? (
                    <img className="w-16 h-12 object-contain" src={config.logoBase64} alt="Logo" />
                  ) : (
                    <svg className="w-16 h-12" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 60 L65 15 L105 55" stroke="#059669" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="#059669" fillOpacity="0.15" />
                      <path d="M70 60 L115 8 L155 52" stroke="#047857" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="#047857" fillOpacity="0.2" />
                      <path d="M120 60 L145 35 L170 60" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="#10b981" fillOpacity="0.1" />
                      <path d="M10 60 Q100 65 190 60" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
                      <text x="100" y="76" textAnchor="middle" fill="#065f46" fontWeight="bold" fontSize="15" fontFamily="sans-serif" letterSpacing="2">MALANG</text>
                      <text x="100" y="52" textAnchor="middle" fill="#d97706" fontWeight="900" fontSize="23" fontFamily="sans-serif" stroke="#065f46" strokeWidth="1.5" paintOrder="stroke">Dreamland</text>
                    </svg>
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-black text-emerald-800 tracking-tight leading-none">{config.ptName}</h2>
                  <p className="text-[9px] text-emerald-700 leading-relaxed font-medium max-w-[360px]">{config.address}</p>
                  <p className="text-[9px] text-emerald-600 font-bold">
                    {config.website} <span className="text-emerald-300 mx-1">|</span> {config.socialMedia}
                  </p>
                </div>
              </div>

              {/* Right Metadata Details Box */}
              <div className="col-span-5 border-l-2 border-emerald-800 pl-4 space-y-1.5 font-medium">
                <div className="grid grid-cols-12 gap-x-2">
                  <span className="col-span-4 text-emerald-700 font-bold uppercase tracking-wider text-[9px]">No. Transaksi</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-mono font-bold text-slate-800">{receiptNumber}</span>
                </div>
                <div className="grid grid-cols-12 gap-x-2">
                  <span className="col-span-4 text-emerald-700 font-bold uppercase tracking-wider text-[9px]">Tanggal</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 text-slate-800">{formattedDate}</span>
                </div>
                <div className="grid grid-cols-12 gap-x-2">
                  <span className="col-span-4 text-emerald-700 font-bold uppercase tracking-wider text-[9px]">Kepada</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 text-slate-800 font-bold">{transaction.customerName || '-'}</span>
                </div>
                <div className="grid grid-cols-12 gap-x-2">
                  <span className="col-span-4 text-emerald-700 font-bold uppercase tracking-wider text-[9px]">Alamat</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 text-slate-800">{transaction.customerAddress || '-'}</span>
                </div>
                <div className="grid grid-cols-12 gap-x-2 pt-1 border-t border-dashed border-emerald-100">
                  <span className="col-span-4 text-emerald-700 font-bold uppercase tracking-wider text-[9px]">No. Telpon</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 text-slate-800">{transaction.customerPhone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Title Bar Banner */}
            <div className="bg-emerald-700 text-white font-black text-center py-2 text-sm uppercase tracking-[0.4em] my-3 select-none">
              Kwitansi
            </div>

            {/* Receipt Main Content Block */}
            <div className="grid grid-cols-12 gap-6 items-stretch flex-1 my-2">
              {/* Left Body Details */}
              <div className="col-span-7 space-y-4">
                <div className="flex items-start">
                  <span className="w-36 text-emerald-800 font-bold text-xs">Telah Terima Dari</span>
                  <span className="text-emerald-950 font-serif italic text-sm font-semibold border-b border-slate-200 flex-1 pb-1">
                    {transaction.customerName || '-'}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="w-36 text-emerald-800 font-bold text-xs">Banyaknya Uang</span>
                  <span className="text-emerald-950 font-serif italic text-xs font-medium border-b border-slate-200 flex-1 pb-1">
                    {formatTerbilang(totalAmount)}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="w-36 text-emerald-800 font-bold text-xs">Untuk Pembayaran</span>
                  <span className="text-emerald-950 font-serif italic text-xs leading-relaxed border-b border-slate-200 flex-1 pb-1 whitespace-pre-line font-medium">
                    {paymentDescription}
                  </span>
                </div>
              </div>

              {/* Right Side Method and Keterangan */}
              <div className="col-span-5 flex flex-col justify-between pl-4 border-l border-emerald-100">
                <div className="space-y-3">
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Pembayaran dilakukan secara :</span>
                    <span className="text-emerald-950 font-serif italic text-sm font-semibold">{transaction.paymentMethod || 'Transfer Bank'}</span>
                  </div>
                  
                  <div className="space-y-1.5 border-t border-emerald-100 pt-2">
                    <span className="block text-[9px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Keterangan :</span>
                    <div className="grid grid-cols-3 text-[10px]">
                      <span className="text-emerald-700 font-medium">Bank</span>
                      <span>:</span>
                      <span className="text-slate-800 font-semibold">{transaction.bankName || 'BCA Pariwisata'}</span>
                    </div>
                    <div className="grid grid-cols-3 text-[10px]">
                      <span className="text-emerald-700 font-medium">No./ Tanggal</span>
                      <span>:</span>
                      <span className="text-slate-800 font-semibold">{formattedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Notes Box */}
                <div className="mt-4 flex-1 flex flex-col">
                  <span className="block text-[9px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Catatan Tambahan :</span>
                  <div className="border border-emerald-800 flex-1 p-2 rounded relative min-h-[60px] flex items-start bg-slate-50/50">
                    <p className="text-[10px] text-slate-700 leading-tight">{transaction.notes || ''}</p>
                    <span className="absolute bottom-1 right-1 text-[7px] text-emerald-800 font-bold uppercase select-none">*Diisi Oleh Admin</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Section */}
            <div className="grid grid-cols-12 gap-4 pt-3 border-t border-emerald-800 mt-3 items-end">
              {/* Disclaimer */}
              <div className="col-span-7 pr-4">
                <p className="text-[8px] text-emerald-700/80 italic leading-normal max-w-[420px] font-medium font-mono uppercase">
                  {config.disclaimer}
                </p>
                <div className="text-[16px] font-black text-emerald-900 mt-2 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded inline-block font-mono">
                  Rp. <span className="font-sans font-extrabold">{totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Cashier Signee */}
              <div className="col-span-5 text-right font-medium">
                <p className="text-slate-900 font-bold text-xs pr-2">{config.defaultCashier}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      
      {/* Global CSS for Print Media and Scaling */}
      <style>{`
        /* Override Tailwind v4 oklch colors with standard hex for html2canvas support */
        .print-receipt-container {
          color: #022c22 !important;
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
        }
        .print-receipt-container .text-emerald-950 { color: #022c22 !important; }
        .print-receipt-container .text-emerald-900 { color: #064e3b !important; }
        .print-receipt-container .text-emerald-800 { color: #065f46 !important; }
        .print-receipt-container .text-emerald-700 { color: #047857 !important; }
        .print-receipt-container .text-emerald-600 { color: #059669 !important; }
        .print-receipt-container .text-emerald-300 { color: #6ee7b7 !important; }
        
        .print-receipt-container .bg-emerald-700 { background-color: #047857 !important; }
        .print-receipt-container .bg-emerald-50 { background-color: #ecfdf5 !important; }
        
        .print-receipt-container .border-emerald-800 { border-color: #065f46 !important; }
        .print-receipt-container .border-emerald-200 { border-color: #a7f3d0 !important; }
        .print-receipt-container .border-emerald-100 { border-color: #d1fae5 !important; }
        
        .print-receipt-container .text-slate-800 { color: #1e293b !important; }
        .print-receipt-container .text-slate-700 { color: #334155 !important; }
        .print-receipt-container .text-slate-500 { color: #64748b !important; }
        .print-receipt-container .text-slate-900 { color: #0f172a !important; }
        
        .print-receipt-container .bg-slate-50 { background-color: #f8fafc !important; }
        .print-receipt-container .bg-slate-50\/50 { background-color: rgba(248, 250, 252, 0.5) !important; }
        .print-receipt-container .border-slate-200 { border-color: #e2e8f0 !important; }
        .print-receipt-container .border-slate-100 { border-color: #f1f5f9 !important; }
        .print-receipt-container .divide-slate-100 > :not([hidden]) ~ :not([hidden]) { border-color: #f1f5f9 !important; }

        @media screen {
          .receipt-scale-wrapper {
            transform: scale(0.7);
            transform-origin: center;
            margin: -70px 0;
          }
        }
        
        @media print {
          /* Remove scaling for physical printing */
          .receipt-scale-wrapper {
            transform: none !important;
            margin: 0 !important;
          }
          
          /* Hide the parent browser shell scrollbars and background */
          html, body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          
          /* Hide all elements on the page by default */
          body * {
            visibility: hidden;
          }
          
          /* Make ONLY the receipt print area container and its children visible */
          .print-receipt-container, .print-receipt-container * {
            visibility: visible !important;
          }
          
          /* Position the receipt at the top-left of the printed page */
          .print-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 101mm !important;
            border: none !important;
            padding: 8mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          
          /* Hide backdrop and modal styles during print */
          .fixed.inset-0.z-50 {
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          
          .bg-white.rounded-xl.shadow-2xl {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            display: block !important;
          }

          /* Hide elements with no-print class */
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
