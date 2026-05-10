import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToPDF(title, columns, rows, filename = 'export', obfuscate = false) {
  const doc = new jsPDF();
  
  // Transform rows if obfuscate is true
  const processedRows = obfuscate 
    ? rows.map(row => 
        row.map(cell => {
          if (typeof cell === 'string') {
            // Mask Phone Numbers (e.g., 0712345678 -> 07*****678)
            if (cell.match(/^0\d{9}$/)) {
              return cell.slice(0, 2) + '*****' + cell.slice(-3);
            }
            // Mask Alphanumeric IDs (10 chars)
            if (cell.match(/^[A-Z0-9]{10}$/)) {
              return cell.slice(0, 3) + '*****' + cell.slice(-2);
            }
          }
          return cell;
        })
      ) 
    : rows;

  doc.setFontSize(16);
  doc.text(title, 14, 22);
  
  autoTable(doc, {
    head: [columns],
    body: processedRows, // Use the processed rows here
    startY: 30,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 240, 240] },
  });
  
  doc.save(`${filename}.pdf`);
}