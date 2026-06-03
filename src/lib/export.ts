import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const formatRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

export const exportToPDF = (title: string, headers: string[], rows: any[][]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("PT MALANG DREAMLAND", 14, 15);
  doc.setFontSize(11);
  doc.text(title, 14, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 28);

  autoTable(doc, {
    startY: 34,
    head: [headers],
    body: rows,
    theme: 'plain',
    styles: { fontSize: 9, font: 'helvetica', cellPadding: 3 },
    headStyles: { fontStyle: 'bold', lineWidth: { top: 0.5, bottom: 0.5 }, lineColor: [0, 0, 0] },
    willDrawCell: (data) => {
      // Draw line above totals if the label starts with Total or LABA
      if (data.section === 'body') {
        const firstCell = String(data.row.raw[0] || '');
        if (firstCell.startsWith('Total') || firstCell.startsWith('LABA')) {
          doc.setLineWidth(0.5);
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
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
      if (firstCell.startsWith('Total') || firstCell.startsWith('LABA') || firstCell.toUpperCase() === firstCell) {
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  doc.save(`${title.replace(/ /g, '_')}_${new Date().getTime()}.pdf`);
};

export const exportToExcel = (title: string, data: any[]) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan");
  
  // Format column widths roughly
  const colWidths = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, 15) }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${title.replace(/ /g, '_')}_${new Date().getTime()}.xlsx`);
};
