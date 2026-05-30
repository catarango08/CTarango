import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Job, BusinessProfile } from '../types';
import { calcBidTotals, formatCurrency, formatDate } from '../utils';

function header(doc: jsPDF, biz: BusinessProfile, title: string) {
  doc.setFillColor(30, 64, 175); // blue-800
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(biz.companyName || 'ElectricPro', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const bizLines = [
    biz.address,
    [biz.phone, biz.email].filter(Boolean).join('  •  '),
    biz.licenseNumber ? `License: ${biz.licenseNumber}` : '',
  ].filter(Boolean);
  doc.text(bizLines, 14, 18);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 196, 18, { align: 'right' });

  doc.setTextColor(30, 41, 59);
}

function customerSection(doc: jsPDF, job: Job, startY: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER', 14, startY);
  doc.setFont('helvetica', 'normal');
  const lines = [
    job.customer.name,
    job.customer.address,
    job.customer.phone,
    job.customer.email,
  ].filter(Boolean);
  doc.text(lines, 14, startY + 5);
  return startY + 5 + lines.length * 5;
}

export function exportBidPDF(job: Job, biz: BusinessProfile): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { labor, materialsCost, materialsWithMarkup, total } = calcBidTotals(job);

  header(doc, biz, 'ESTIMATE');

  let y = 36;

  // Estimate meta
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, 196, y, { align: 'right' });
  doc.text(`Job: ${job.title || 'Untitled'}`, 196, y + 5, { align: 'right' });
  doc.text(`Status: ${job.bid.status.toUpperCase()}`, 196, y + 10, { align: 'right' });

  y = customerSection(doc, job, y);
  y += 8;

  // Scope
  if (job.scopeDescription || job.scopeItems.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SCOPE OF WORK', 14, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (job.scopeDescription) {
      const lines = doc.splitTextToSize(job.scopeDescription, 182);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 2;
    }
    if (job.scopeItems.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['#', 'Work Item', 'Notes']],
        body: job.scopeItems.map((item, i) => [i + 1, item.description, item.notes]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 85, 105] },
        columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 50 } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // Materials
  if (job.materials.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MATERIALS', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Material', 'Qty', 'Unit Cost', 'Subtotal']],
      body: job.materials.map(m => [
        m.name,
        m.quantity,
        formatCurrency(m.unitCost),
        formatCurrency(m.quantity * m.unitCost),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Totals
  autoTable(doc, {
    startY: y,
    body: [
      ['Labor', `${job.bid.laborHours} hrs × ${formatCurrency(job.bid.laborRate)}/hr`, formatCurrency(labor)],
      [
        `Materials (${job.bid.materialMarkup}% markup)`,
        `Cost: ${formatCurrency(materialsCost)}`,
        formatCurrency(materialsWithMarkup),
      ],
      ['TOTAL ESTIMATE', '', formatCurrency(total)],
    ],
    styles: { fontSize: 9 },
    bodyStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
    didParseCell(data) {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [30, 64, 175];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 11;
      }
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (job.bid.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES / TERMS', 14, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(job.bid.notes, 182), 14, y);
  }

  doc.save(`Estimate_${job.title || job.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportInvoicePDF(job: Job, biz: BusinessProfile): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { labor, materialsWithMarkup, total } = calcBidTotals(job);

  header(doc, biz, 'INVOICE');

  let y = 36;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text([
    `Invoice #: ${job.invoice.invoiceNumber}`,
    `Date: ${job.invoice.issueDate ? formatDate(job.invoice.issueDate) : formatDate(new Date().toISOString())}`,
    `Due: ${job.invoice.dueDate ? formatDate(job.invoice.dueDate) : 'Upon Receipt'}`,
    `Terms: ${job.invoice.paymentTerms || 'Due on Receipt'}`,
  ], 196, y, { align: 'right' });

  y = customerSection(doc, job, y);
  y += 8;

  // Line items
  const rows: (string | number)[][] = [];
  if (job.bid.laborHours > 0) {
    rows.push([
      'Electrical Labor',
      `${job.bid.laborHours} hrs @ ${formatCurrency(job.bid.laborRate)}/hr`,
      '1',
      formatCurrency(labor),
    ]);
  }
  job.materials.forEach(m => {
    rows.push([m.name || 'Material', m.supplier || '', m.quantity, formatCurrency(m.quantity * m.unitCost * (1 + job.bid.materialMarkup / 100))]);
  });

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Details', 'Qty', 'Amount']],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Totals
  autoTable(doc, {
    startY: y,
    body: [
      ['', 'Labor', formatCurrency(labor)],
      ['', `Materials + ${job.bid.materialMarkup}% markup`, formatCurrency(materialsWithMarkup)],
      ['', 'TOTAL DUE', formatCurrency(total)],
    ],
    styles: { fontSize: 9 },
    bodyStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 100 }, 2: { halign: 'right', fontStyle: 'bold' } },
    didParseCell(data) {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [30, 64, 175];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 11;
      }
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (job.invoice.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 14, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(job.invoice.notes, 182), 14, y);
  }

  doc.save(`Invoice_${job.invoice.invoiceNumber}_${job.customer.name || job.id}.pdf`);
}
