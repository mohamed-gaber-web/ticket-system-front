import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Consultant } from '../types/consultant.types';

export const exportToCSV = (data: Consultant[], filename: string = 'consultants.csv') => {
  const csvData = data.map((item) => ({
    'Full Name': item.fullName,
    'Email': item.email,
    'Phone': item.phone || 'N/A',
    'Role': item.role.replace('_', ' '),
    'Status': item.status.replace('_', ' '),
    'Last Login': item.lastLogin
      ? new Date(item.lastLogin).toLocaleString()
      : 'Never',
    'Created At': new Date(item.createdAt).toLocaleString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(csvData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};

export const exportToExcel = (data: Consultant[], filename: string = 'consultants.xlsx') => {
  const excelData = data.map((item) => ({
    'Full Name': item.fullName,
    'Email': item.email,
    'Phone': item.phone || 'N/A',
    'Role': item.role.replace('_', ' '),
    'Status': item.status.replace('_', ' '),
    'Last Login': item.lastLogin
      ? new Date(item.lastLogin).toLocaleString()
      : 'Never',
    'Created At': new Date(item.createdAt).toLocaleString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Consultants');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
};

export const exportToPDF = (data: Consultant[], filename: string = 'consultants.pdf') => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Consultant Report', 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  const tableData = data.map((item) => [
    item.fullName,
    item.email,
    item.phone || 'N/A',
    item.role.replace('_', ' '),
    item.status.replace('_', ' '),
    item.lastLogin
      ? new Date(item.lastLogin).toLocaleDateString()
      : 'Never',
  ]);

  autoTable(doc, {
    head: [['Full Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(filename);
};
