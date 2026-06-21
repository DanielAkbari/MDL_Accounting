import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style';

export const formatRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

export const exportToPDF = (title: string, headers: string[], rows: any[][], periodInfo?: string) => {
  const doc = new jsPDF();
  
  // Set premium slate colors and center all header texts at X=105 (for A4 width 210mm)
  doc.setTextColor(15, 23, 42); // Slate-900 (Dark Slate)
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text("PT SEMBILAN WALI NUSANTARA", 105, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text("Malang Dreamland", 105, 21, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(title, 105, 28, { align: 'center' });
  
  if (periodInfo) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(periodInfo, 105, 34, { align: 'center' });
  }

  // Draw a very subtle and thin horizontal line under the header section
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(14, periodInfo ? 38 : 32, 196, periodInfo ? 38 : 32);

  autoTable(doc, {
    startY: periodInfo ? 43 : 37,
    head: [headers],
    body: rows,
    theme: 'plain', // Minimalist clean design without boxed backgrounds
    styles: { 
      fontSize: 8.5, 
      font: 'helvetica', 
      cellPadding: 4,
      textColor: [71, 85, 105], // Slate-600 for high readability
      lineWidth: { bottom: 0.1 }, // Thin horizontal row dividers only
      lineColor: [226, 232, 240] // Slate-200 (light gray)
    },
    headStyles: { 
      textColor: [15, 23, 42], // Slate-900 for bold headers
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: { bottom: 0.8 }, // Slightly thicker underline for headers
      lineColor: [15, 23, 42] // Slate-900
    },
    didDrawPage: (data) => {
      // Draw footer with "Dicetak pada" at the bottom of every page
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 287);
    },
    willDrawCell: (data) => {
      // Draw standard double lines for financial report totals
      if (data.section === 'body') {
        const firstCell = String(data.row.raw[0] || '');
        if (firstCell.startsWith('Total') || firstCell.startsWith('LABA') || firstCell.toUpperCase() === 'TOTAL') {
          doc.setDrawColor(15, 23, 42); // Slate-900
          doc.setLineWidth(0.5);
          // Top line of total row
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
          // Standard double underline bottom
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          doc.line(data.cell.x, data.cell.y + data.cell.height - 0.5, data.cell.x + data.cell.width, data.cell.y + data.cell.height - 0.5);
        }
      }
    },
    didParseCell: (data) => {
      // Align currency columns to the right
      const raw = String(data.cell.raw || '');
      if (raw.startsWith('Rp') || raw === '-' || !isNaN(Number(raw.replace(/[^\d.-]/g, '')))) {
         if (data.column.index > 0) { // Usually money is not in the first column
           data.cell.styles.halign = 'right';
         }
      }
      
      // Make totals and headers bold
      const firstCell = String(data.row.raw[0] || '');
      if (firstCell.startsWith('Total') || firstCell.startsWith('LABA') || firstCell.toUpperCase() === 'TOTAL' || firstCell.toUpperCase() === firstCell) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42]; // Slate-900
      }
    }
  });

  doc.save(`${title.replace(/ /g, '_')}_${new Date().getTime()}.pdf`);
};

export const exportToExcel = (title: string, data: any[], periodInfo?: string) => {
  const wb = XLSX.utils.book_new();
  const headers = Object.keys(data[0] || {});
  
  const rows: any[][] = [
    ["PT SEMBILAN WALI NUSANTARA"],
    ["Malang Dreamland"],
    [title],
  ];
  
  if (periodInfo) {
    rows.push([periodInfo]);
  }
  rows.push([]); // empty line spacer
  
  const headerRowIdx = rows.length;
  rows.push(headers);
  
  const dataStartRowIdx = rows.length;
  data.forEach(item => {
    rows.push(headers.map(h => item[h]));
  });
  
  const dataEndRowIdx = rows.length;
  if (data.length > 0) {
    rows.push([]);
    rows.push([`Dicetak pada: ${new Date().toLocaleString('id-ID')}`]);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Merge metadata header columns
  const colCount = headers.length;
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
  ];
  if (periodInfo) {
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } });
  }
  ws['!merges'] = merges;

  // Set visual styles on sheet cells
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      let cell = ws[cellRef];
      if (!cell) {
        // Create an empty cell so it can hold the white background style
        ws[cellRef] = { t: 's', v: '' };
        cell = ws[cellRef];
      }
      
      // Base premium style for PDF-like gridline-free sheet
      const baseStyle = {
        font: { name: 'Arial', sz: 9, color: { rgb: '334155' } }, // Slate-700
        fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } } // White background to hide gridlines
      };
      
      // Company name (Row 0)
      if (r === 0) {
        cell.s = {
          ...baseStyle,
          font: { name: 'Arial', sz: 12, bold: true, color: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // Brand (Row 1)
      else if (r === 1) {
        cell.s = {
          ...baseStyle,
          font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '475569' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // Report Title (Row 2)
      else if (r === 2) {
        cell.s = {
          ...baseStyle,
          font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // Period (Row 3, if present)
      else if (periodInfo && r === 3) {
        cell.s = {
          ...baseStyle,
          font: { name: 'Arial', sz: 9, color: { rgb: '64748B' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // Headers Row
      else if (r === headerRowIdx) {
        cell.s = {
          ...baseStyle,
          font: { name: 'Arial', sz: 9.5, bold: true, color: { rgb: '0F172A' } },
          alignment: { horizontal: c > 0 && isNumericHeader(c) ? 'right' : 'left', vertical: 'center' },
          border: {
            bottom: { style: 'medium', color: { rgb: '0F172A' } }
          }
        };
      }
      // Data Rows
      else if (r >= dataStartRowIdx && r < dataEndRowIdx) {
        // Detect if it is a totals row
        let isTotalRow = false;
        for (let col = range.s.c; col <= range.e.c; col++) {
          const checkCell = ws[XLSX.utils.encode_cell({ r, c: col })];
          if (checkCell && (String(checkCell.v || '').startsWith('Total') || String(checkCell.v || '').startsWith('LABA') || String(checkCell.v || '').toUpperCase() === 'TOTAL')) {
            isTotalRow = true;
            break;
          }
        }

        if (isTotalRow) {
          cell.s = {
            ...baseStyle,
            font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '0F172A' } },
            alignment: { horizontal: typeof cell.v === 'number' || (typeof cell.v === 'string' && (cell.v.startsWith('Rp') || cell.v === '-')) ? 'right' : 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '0F172A' } },
              bottom: { style: 'double', color: { rgb: '0F172A' } } // Accounting double underline
            }
          };
        } else {
          const isNum = typeof cell.v === 'number' || (typeof cell.v === 'string' && (cell.v.startsWith('Rp') || cell.v === '-'));
          cell.s = {
            ...baseStyle,
            font: { name: 'Arial', sz: 8.5, color: { rgb: '475569' } },
            alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center' },
            border: {
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } } // Thin horizontal separator (matching Slate-200 in PDF)
            }
          };
        }
      }
      // Print date stamp row
      else if (r === dataEndRowIdx + 1) {
        cell.s = {
          ...baseStyle,
          font: { name: 'Arial', sz: 8, italic: true, color: { rgb: '94A3B8' } }
        };
      }
      // Spacer rows/unused rows
      else {
        cell.s = baseStyle;
      }
    }
  }

  // Determine if header column contains numeric currency data
  function isNumericHeader(colIdx: number) {
    const firstDataCell = ws[XLSX.utils.encode_cell({ r: dataStartRowIdx, c: colIdx })];
    if (!firstDataCell) return false;
    const v = firstDataCell.v;
    return typeof v === 'number' || (typeof v === 'string' && (v.startsWith('Rp') || v === '-'));
  }

  // Calculate auto column widths
  const colWidths = headers.map((k, colIdx) => {
    let maxLen = k.length;
    rows.forEach(r => {
      const val = String(r[colIdx] || '');
      if (rows.indexOf(r) > (periodInfo ? 4 : 3)) {
        if (val.length > maxLen) maxLen = val.length;
      }
    });
    return { wch: Math.max(maxLen + 2, 12) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  XLSX.writeFile(wb, `${title.replace(/ /g, '_')}_${new Date().getTime()}.xlsx`);
};
