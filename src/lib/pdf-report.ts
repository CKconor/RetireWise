import jsPDF from 'jspdf';
import { Account, UserProfile, ACCOUNT_TYPE_LABELS } from '@/types';
import {
  calculateTotalBalance,
  calculateTotalContributions,
  calculateProjectedTotalReal,
  calculateConfidenceScore,
  formatCurrency,
  generateProjection,
  calculateTotalRetirementIncome,
} from './calculations';

// RetireWise brand colors
const COLORS = {
  navy: '#0c1929',
  navyLight: '#1e3a5f',
  gold: '#d69e2e',
  teal: '#2c7a7b',
  text: '#1a1a1a',
  muted: '#64748b',
  background: '#faf9f7',
  white: '#ffffff',
};

// Helper to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

export async function generatePdfReport(
  accounts: Account[],
  profile: UserProfile
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // Calculate all values needed for the report
  const totalBalance = calculateTotalBalance(accounts);
  const totalContributions = calculateTotalContributions(accounts);
  const projectedTotal = calculateProjectedTotalReal(accounts, profile);
  const confidenceScore = calculateConfidenceScore(accounts, profile);
  const projection = generateProjection(accounts, profile);
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  const progress = Math.min(100, (projectedTotal / profile.targetAmount) * 100);
  const retirementIncome = calculateTotalRetirementIncome(projectedTotal, profile);

  // ==================== HEADER ====================
  // Navy header background
  doc.setFillColor(...hexToRgb(COLORS.navy));
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Logo placeholder (gold accent)
  doc.setFillColor(...hexToRgb(COLORS.gold));
  doc.roundedRect(margin, 12, 12, 12, 2, 2, 'F');

  // Chart icon (white)
  doc.setDrawColor(...hexToRgb(COLORS.white));
  doc.setLineWidth(0.5);
  doc.line(margin + 3, 20, margin + 5, 18);
  doc.line(margin + 5, 18, margin + 7, 19);
  doc.line(margin + 7, 19, margin + 9, 15);

  // Title
  doc.setTextColor(...hexToRgb(COLORS.white));
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RetireWise', margin + 17, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Your path to financial freedom', margin + 17, 26);

  // Generation date
  const generationDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(9);
  doc.text(`Report generated: ${generationDate}`, pageWidth - margin, 20, { align: 'right' });

  y = 55;

  // ==================== EXECUTIVE SUMMARY ====================
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 8;

  // Summary box
  doc.setFillColor(...hexToRgb(COLORS.background));
  doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'F');

  // Summary content
  const summaryY = y + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.muted));

  // Left column
  doc.text('Current Portfolio', margin + 5, summaryY);
  doc.setTextColor(...hexToRgb(COLORS.text));
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalBalance), margin + 5, summaryY + 7);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.muted));
  doc.text('Monthly Contributions', margin + 5, summaryY + 18);
  doc.setTextColor(...hexToRgb(COLORS.text));
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(totalContributions)}/mo`, margin + 5, summaryY + 25);

  // Center column
  const centerX = margin + contentWidth / 3;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.muted));
  doc.text('Projected at Retirement', centerX, summaryY);
  doc.setTextColor(...hexToRgb(COLORS.teal));
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(projectedTotal), centerX, summaryY + 7);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.muted));
  doc.text('Target Amount', centerX, summaryY + 18);
  doc.setTextColor(...hexToRgb(COLORS.text));
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(profile.targetAmount), centerX, summaryY + 25);

  // Right column
  const rightX = margin + (contentWidth * 2) / 3;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.muted));
  doc.text('Progress to Target', rightX, summaryY);
  const progressColor = hexToRgb(progress >= 100 ? COLORS.teal : COLORS.gold);
  doc.setTextColor(...progressColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${Math.round(progress)}%`, rightX, summaryY + 7);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.muted));
  doc.text('Confidence Score', rightX, summaryY + 18);
  doc.setTextColor(...hexToRgb(COLORS.text));
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${confidenceScore}/10`, rightX, summaryY + 25);

  y += 58; // 45 (box height) + 13 (section spacing)

  // ==================== PROFILE DETAILS ====================
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Profile Details', margin, y);
  y += 8;

  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
  doc.setDrawColor(...hexToRgb('#e2e8f0'));
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'S');

  const profileY = y + 8;
  const colWidth = contentWidth / 4;

  // Profile columns
  const profileData = [
    { label: 'Current Age', value: `${profile.currentAge} years` },
    { label: 'Retirement Age', value: `${profile.retirementAge} years` },
    { label: 'Years to Retire', value: `${yearsToRetirement} years` },
    { label: 'Expected Inflation', value: `${profile.expectedInflation}%` },
  ];

  profileData.forEach((item, index) => {
    const x = margin + 5 + index * colWidth;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(COLORS.muted));
    doc.text(item.label, x, profileY);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(COLORS.text));
    doc.text(item.value, x, profileY + 7);
  });

  y += 42; // 28 (box height) + 14 (section spacing)

  // ==================== ACCOUNTS ====================
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Investment Accounts', margin, y);
  y += 8;

  if (accounts.length === 0) {
    doc.setFillColor(...hexToRgb(COLORS.background));
    doc.roundedRect(margin, y, contentWidth, 15, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...hexToRgb(COLORS.muted));
    doc.text('No accounts added yet', margin + 5, y + 9);
    y += 29; // 15 (box height) + 14 (section spacing)
  } else {
    // Table header
    doc.setFillColor(...hexToRgb(COLORS.navy));
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(COLORS.white));
    doc.text('Account Name', margin + 5, y + 5.5);
    doc.text('Type', margin + 60, y + 5.5);
    doc.text('Balance', margin + 95, y + 5.5);
    doc.text('Monthly', margin + 130, y + 5.5);
    doc.text('Return', margin + 160, y + 5.5);
    y += 10;

    // Table rows
    accounts.forEach((account, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.setFillColor(...hexToRgb(COLORS.background));
        doc.rect(margin, y, contentWidth, 8, 'F');
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...hexToRgb(COLORS.text));
      doc.text(account.name.substring(0, 25), margin + 5, y + 5.5);
      doc.text(ACCOUNT_TYPE_LABELS[account.type], margin + 60, y + 5.5);
      doc.text(formatCurrency(account.currentBalance), margin + 95, y + 5.5);
      doc.text(`${formatCurrency(account.monthlyContribution)}/mo`, margin + 130, y + 5.5);
      doc.text(`${account.annualReturnRate}%`, margin + 160, y + 5.5);
      y += 8;
    });
    y += 14; // section spacing
  }

  // ==================== STATE PENSION (if enabled) ====================
  if (profile.includeStatePension && profile.statePensionAmount > 0) {
    doc.setTextColor(...hexToRgb(COLORS.navy));
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Retirement Income Breakdown', margin, y);
    y += 8;

    doc.setFillColor(...hexToRgb(COLORS.background));
    doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

    const incomeY = y + 8;
    const incomeColWidth = contentWidth / 3;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(COLORS.muted));
    doc.text('Portfolio Income (4%)', margin + 5, incomeY);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(COLORS.text));
    doc.text(`${formatCurrency(retirementIncome.portfolioIncome)}/yr`, margin + 5, incomeY + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(COLORS.muted));
    doc.text(`State Pension (from age ${profile.statePensionAge})`, margin + 5 + incomeColWidth, incomeY);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(COLORS.text));
    doc.text(`${formatCurrency(retirementIncome.statePensionIncome)}/yr`, margin + 5 + incomeColWidth, incomeY + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(COLORS.muted));
    doc.text('Total Retirement Income', margin + 5 + incomeColWidth * 2, incomeY);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(COLORS.teal));
    doc.text(`${formatCurrency(retirementIncome.totalIncome)}/yr`, margin + 5 + incomeColWidth * 2, incomeY + 7);

    y += 42; // 28 (box height) + 14 (section spacing)
  }

  // ==================== PROJECTION TABLE ====================
  // Check if we need a new page for the projection table
  if (y > pageHeight - 100) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Portfolio Projection', margin, y);
  y += 3;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.muted));
  doc.text('All values shown in today\'s money (inflation-adjusted)', margin, y + 5);
  y += 12;

  if (projection.length > 0) {
    // Table header
    doc.setFillColor(...hexToRgb(COLORS.navy));
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(COLORS.white));
    doc.text('Age', margin + 5, y + 5.5);
    doc.text('Year', margin + 25, y + 5.5);
    doc.text('Conservative (-2%)', margin + 55, y + 5.5);
    doc.text('Expected', margin + 105, y + 5.5);
    doc.text('Optimistic (+2%)', margin + 140, y + 5.5);
    y += 10;

    // Determine which years to show (every 5 years + first and last)
    const yearsToShow: number[] = [];
    for (let i = 0; i < projection.length; i++) {
      if (i === 0 || i === projection.length - 1 || i % 5 === 0) {
        yearsToShow.push(i);
      }
    }

    // Table rows
    yearsToShow.forEach((index, rowNum) => {
      // Check if we need a new page
      if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;

        // Repeat header on new page
        doc.setFillColor(...hexToRgb(COLORS.navy));
        doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...hexToRgb(COLORS.white));
        doc.text('Age', margin + 5, y + 5.5);
        doc.text('Year', margin + 25, y + 5.5);
        doc.text('Conservative (-2%)', margin + 55, y + 5.5);
        doc.text('Expected', margin + 105, y + 5.5);
        doc.text('Optimistic (+2%)', margin + 140, y + 5.5);
        y += 10;
      }

      const point = projection[index];
      const isEven = rowNum % 2 === 0;
      const isLast = index === projection.length - 1;

      if (isEven) {
        doc.setFillColor(...hexToRgb(COLORS.background));
        doc.rect(margin, y, contentWidth, 8, 'F');
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...hexToRgb(COLORS.text));

      // Highlight retirement year
      if (isLast) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...hexToRgb(COLORS.teal));
      }

      doc.text(`${point.age}`, margin + 5, y + 5.5);
      doc.text(`${point.year}`, margin + 25, y + 5.5);
      doc.text(formatCurrency(point.underperformanceReal), margin + 55, y + 5.5);
      doc.text(formatCurrency(point.totalReal), margin + 105, y + 5.5);
      doc.text(formatCurrency(point.overperformanceReal), margin + 140, y + 5.5);
      y += 8;
    });

    y += 14; // section spacing
  } else {
    doc.setFillColor(...hexToRgb(COLORS.background));
    doc.roundedRect(margin, y, contentWidth, 15, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...hexToRgb(COLORS.muted));
    doc.text('Add accounts to see projections', margin + 5, y + 9);
    y += 29;
  }

  // ==================== DISCLAIMER ====================
  // Check if we need a new page
  if (y > pageHeight - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(...hexToRgb(COLORS.background));
  doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.text('Important Disclaimer', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.muted));
  const disclaimer =
    'This report is for informational purposes only and does not constitute financial advice. All projections are estimates based on the data provided and assumptions about future returns. Actual results may vary significantly. Past performance is not indicative of future results. Please consult a qualified financial advisor before making investment decisions.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 10);
  doc.text(disclaimerLines, margin + 5, y + 12);

  // ==================== FOOTER ====================
  const footerY = pageHeight - 10;
  doc.setDrawColor(...hexToRgb('#e2e8f0'));
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(COLORS.muted));
  doc.text('Generated by RetireWise', margin, footerY);
  doc.text(`Page 1 of ${doc.getNumberOfPages()}`, pageWidth - margin, footerY, { align: 'right' });

  // Save the PDF
  doc.save(`RetireWise-Report-${new Date().toISOString().split('T')[0]}.pdf`);
}
