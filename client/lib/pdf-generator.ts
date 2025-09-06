import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface WorkHistoryItem {
  id: string;
  blockIndex: number;
  status: 'success' | 'failed' | 'pending';
  amount: string;
  timestamp: string;
  poolerId: string;
  poolerName: string;
  type: 'planting' | 'harvest';
  transactionHash?: string;
}

interface PDFReportOptions {
  title: string;
  subtitle?: string;
  data: WorkHistoryItem[];
  farmerEmail?: string;
  timeRange?: string;
  totalOperations?: number;
  successRate?: number;
}

export const generateWorkHistoryPDF = async (options: PDFReportOptions): Promise<void> => {
  const {
    title,
    subtitle,
    data,
    farmerEmail,
    timeRange,
    totalOperations,
    successRate
  } = options;

  // Create new PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPosition = 20;

  // Add title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, yPosition);
  yPosition += 15;

  // Add subtitle
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 20, yPosition);
    yPosition += 10;
  }

  // Add metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString();
  doc.text(`Generated on: ${currentDate}`, 20, yPosition);
  yPosition += 5;

  if (farmerEmail) {
    doc.text(`Farmer Email: ${farmerEmail}`, 20, yPosition);
    yPosition += 5;
  }

  if (timeRange) {
    doc.text(`Time Range: ${timeRange}`, 20, yPosition);
    yPosition += 5;
  }

  if (totalOperations !== undefined) {
    doc.text(`Total Operations: ${totalOperations}`, 20, yPosition);
    yPosition += 5;
  }

  if (successRate !== undefined) {
    doc.text(`Success Rate: ${successRate.toFixed(1)}%`, 20, yPosition);
    yPosition += 10;
  }

  // Add summary section
  if (data.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 20, yPosition);
    yPosition += 10;

    const successfulOps = data.filter(item => item.status === 'success').length;
    const failedOps = data.filter(item => item.status === 'failed').length;
    const plantings = data.filter(item => item.type === 'planting').length;
    const harvests = data.filter(item => item.type === 'harvest').length;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Total Operations: ${data.length}`, 25, yPosition);
    yPosition += 5;
    doc.text(`• Successful: ${successfulOps}`, 25, yPosition);
    yPosition += 5;
    doc.text(`• Failed: ${failedOps}`, 25, yPosition);
    yPosition += 5;
    doc.text(`• Plantings: ${plantings}`, 25, yPosition);
    yPosition += 5;
    doc.text(`• Harvests: ${harvests}`, 25, yPosition);
    yPosition += 15;
  }

  // Prepare data for table
  const tableData = data.map(item => [
    item.blockIndex.toString(),
    item.type === 'planting' ? 'Planting' : 'Harvest',
    item.status === 'success' ? 'Success' : 'Failed',
    item.amount,
    item.poolerName,
    item.transactionHash ? `${item.transactionHash.slice(0, 8)}...` : 'N/A',
    new Date(item.timestamp).toLocaleDateString()
  ]);

  // Add table
  if (tableData.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['Block Index', 'Type', 'Status', 'Amount', 'Pooler', 'Transaction', 'Date']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { halign: 'center' }, // Block Index
        1: { halign: 'center' }, // Type
        2: { halign: 'center' }, // Status
        3: { halign: 'right' },  // Amount
        4: { halign: 'left' },   // Pooler
        5: { halign: 'left' },   // Transaction
        6: { halign: 'center' }, // Date
      },
      margin: { left: 20, right: 20 },
      didDrawPage: (data) => {
        // Add footer
        const pageNumber = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${data.pageNumber} of ${pageNumber}`,
          pageWidth - 40,
          pageHeight - 10
        );
      }
    });
  } else {
    // No data message
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text('No work history data available for the selected time period.', 20, yPosition);
  }

  // Save the PDF
  const fileName = `work-history-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const downloadWorkHistoryPDF = async (
  workHistory: WorkHistoryItem[],
  farmerEmail?: string,
  timeRange?: string
): Promise<void> => {
  const totalOperations = workHistory.length;
  const successfulOperations = workHistory.filter(w => w.status === 'success').length;
  const successRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0;

  await generateWorkHistoryPDF({
    title: 'Work History Report',
    subtitle: 'Comprehensive report of farming activities and operations',
    data: workHistory,
    farmerEmail,
    timeRange,
    totalOperations,
    successRate
  });
};
