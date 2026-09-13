import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Requisition, SaleTransaction, DailyStoreInventory } from '../types';

/**
 * PDF Export Utility for Accounting Archiving & Official Audits
 * Pâtisserie le Délice - Laboratoire Central & Boutiques
 */

// Colors for branding PDF documents
const BRAND_PRIMARY: [number, number, number] = [15, 23, 42]; // Slate 900
const BRAND_ACCENT: [number, number, number] = [79, 70, 229]; // Indigo 600
const TEXT_MUTED: [number, number, number] = [100, 116, 139]; // Slate 500

/**
 * Helper to add header banner with logo text and document metadata
 */
function addPDFHeader(doc: jsPDF, documentTitle: string, subtitle: string) {
  // Top Banner
  doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.rect(0, 0, 210, 28, 'F');

  // Gold accent bar
  doc.setFillColor(245, 158, 11); // Amber 500
  doc.rect(0, 28, 210, 2, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PÂTISSERIE LE DÉLICE', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('Laboratoire Central & Réseau de Boutiques • Document Officiel d\'Archivage', 14, 21);

  // Document Title Right Aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(documentTitle.toUpperCase(), 196, 15, { align: 'right' });

  // Subtitle / Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(subtitle, 196, 21, { align: 'right' });

  // Reset y cursor position
  return 36;
}

/**
 * Helper to add footer page numbers and signature stamp
 */
function addPDFFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 280, 196, 280);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Généré le ${dateStr} • Pâtisserie le Délice - Service Comptabilité`, 14, 286);
    doc.text(`Page ${i} sur ${pageCount}`, 196, 286, { align: 'right' });
  }
}

/**
 * Export a list of Lab Requisitions to PDF
 */
export function exportRequisitionsListPDF(
  requisitions: Requisition[],
  titleFilter = 'Toutes les Réquisitions'
) {
  const doc = new jsPDF();
  let startY = addPDFHeader(doc, 'Rapport des Réquisitions Lab', `Filtre: ${titleFilter}`);

  // Summary KPI Cards in PDF
  const totalCount = requisitions.length;
  const totalCost = requisitions.reduce((acc, r) => acc + (r.totalEstimatedCost || 0), 0);
  const pendingCount = requisitions.filter((r) => r.status === 'PENDING').length;
  const deliveredCount = requisitions.filter((r) => r.status === 'DELIVERED').length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.text(`SYNTHÈSE DU RAPPORT (${totalCount} RÉQUISITIONS)`, 14, startY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Valorisée Totale Estimée : ${totalCost.toLocaleString()} DZD`, 14, startY + 6);
  doc.text(`• Livrées / Honorées : ${deliveredCount}   • En Attente Validation : ${pendingCount}`, 14, startY + 11);

  startY += 18;

  // Requisitions Table
  const tableData = requisitions.map((req) => [
    req.requisitionNumber,
    req.storeName,
    req.dateRequested ? req.dateRequested.substring(0, 10) : '-',
    req.dateNeeded ? req.dateNeeded.substring(0, 10) : '-',
    req.items.length ? `${req.items.length} article(s)` : '0',
    `${(req.totalEstimatedCost || 0).toLocaleString()} DZD`,
    req.status
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['N° Bon', 'Boutique Demandeuse', 'Date Demande', 'Besoin Pour', 'Articles', 'Montant Est.', 'Statut']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: BRAND_ACCENT,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { cellWidth: 40 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { cellWidth: 20 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
      6: { fontStyle: 'bold', cellWidth: 22 }
    }
  });

  addPDFFooter(doc);
  doc.save(`rapport_requisitions_lab_${new Date().toISOString().substring(0, 10)}.pdf`);
}

/**
 * Export a Single Detailed Requisition (Bon de Réquisition Officiel)
 */
export function exportSingleRequisitionPDF(req: Requisition) {
  const doc = new jsPDF();
  let startY = addPDFHeader(doc, `Bon de Réquisition ${req.requisitionNumber}`, `Boutique: ${req.storeName}`);

  // Requisition Header Info Block
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 182, 32, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 182, 32, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.text(`Numéro de Bon : ${req.requisitionNumber}`, 18, startY + 7);
  doc.text(`Boutique Demandeuse : ${req.storeName}`, 18, startY + 14);
  doc.text(`Demandé par : ${req.requestedBy || 'Responsable Magasin'}`, 18, startY + 21);
  doc.text(`Statut Actuel : ${req.status}`, 18, startY + 27);

  doc.text(`Date de Demande : ${req.dateRequested ? req.dateRequested.substring(0, 10) : '-'}`, 115, startY + 7);
  doc.text(`Date Requise : ${req.dateNeeded ? req.dateNeeded.substring(0, 10) : '-'}`, 115, startY + 14);
  doc.text(`Montant Total Estimé : ${(req.totalEstimatedCost || 0).toLocaleString()} DZD`, 115, startY + 21);

  startY += 40;

  // Table Items
  const itemsData = req.items.map((item, idx) => [
    (idx + 1).toString(),
    item.productName,
    item.category || 'Général',
    `${item.quantityRequested} ${item.unit || 'unités'}`,
    item.fulfilledQuantity !== undefined ? `${item.fulfilledQuantity} ${item.unit || 'unités'}` : '-',
    `${(item.unitEstimatedCost || 0).toLocaleString()} DZD`,
    `${(item.quantityRequested * (item.unitEstimatedCost || 0)).toLocaleString()} DZD`
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['#', 'Désignation Produit', 'Catégorie', 'Qté Demandée', 'Qté Servie', 'P.U Est.', 'Total DZD']],
    body: itemsData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { fontStyle: 'bold', cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 22 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Signatures Section for Accounting
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  
  doc.text('Signature Responsable Boutique :', 20, finalY);
  doc.rect(20, finalY + 3, 60, 20, 'S');

  doc.text('Validation Chef de Laboratoire :', 120, finalY);
  doc.rect(120, finalY + 3, 60, 20, 'S');

  addPDFFooter(doc);
  doc.save(`bon_requisition_${req.requisitionNumber}_${req.storeName.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Export Store Sales Transactions & Financial Summary to PDF
 */
export function exportSalesTransactionsPDF(
  sales: SaleTransaction[],
  storeName = 'Toutes les Boutiques',
  dateRangeLabel = 'Période Récente'
) {
  const doc = new jsPDF();
  let startY = addPDFHeader(doc, 'Rapport des Ventes Boutiques', `Boutique: ${storeName} • ${dateRangeLabel}`);

  // Summary Metrics
  const totalVolume = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalCount = sales.length;
  const avgBasket = totalCount > 0 ? Math.round(totalVolume / totalCount) : 0;
  const cashSales = sales.filter((s) => s.paymentMethod === 'CASH').reduce((acc, s) => acc + s.totalAmount, 0);
  const cardSales = sales.filter((s) => s.paymentMethod === 'CARD' || s.paymentMethod === 'CONTACTLESS').reduce((acc, s) => acc + s.totalAmount, 0);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 182, 28, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 182, 28, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.text(`Chiffre d'Affaires Total : ${totalVolume.toLocaleString()} DZD`, 18, startY + 7);
  doc.text(`Nombre de Transactions : ${totalCount} tickets`, 18, startY + 14);
  doc.text(`Panier Moyen Client : ${avgBasket.toLocaleString()} DZD`, 18, startY + 21);

  doc.text(`• Ventes Espèces (Cash) : ${cashSales.toLocaleString()} DZD`, 115, startY + 7);
  doc.text(`• Ventes Carte Bancaire / CIB : ${cardSales.toLocaleString()} DZD`, 115, startY + 14);
  doc.text(`• Taux d'Encaissement : 100% Validé`, 115, startY + 21);

  startY += 35;

  // Sales Transactions Table
  const salesRows = sales.map((s) => [
    s.transactionNumber,
    s.storeName,
    s.timestamp ? s.timestamp.replace('T', ' ').substring(0, 16) : '-',
    s.cashierName || 'Caisse 1',
    s.paymentMethod,
    `${s.items ? s.items.length : 0} art.`,
    `${(s.totalAmount || 0).toLocaleString()} DZD`
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['N° Ticket', 'Boutique', 'Date & Heure', 'Caissier', 'Paiement', 'Articles', 'Total DZD']],
    body: salesRows,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129], // Emerald 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 38 },
      2: { cellWidth: 32 },
      3: { cellWidth: 24 },
      4: { cellWidth: 22 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }
    }
  });

  addPDFFooter(doc);
  doc.save(`rapport_ventes_${storeName.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.pdf`);
}

/**
 * Export Daily Reconciliation EOD Report to PDF
 */
export function exportReconciliationPDF(
  records: DailyStoreInventory[],
  storeName: string,
  dateStr: string,
  closedBy?: string
) {
  const doc = new jsPDF();

  addPDFHeader(
    doc,
    'RAPPORT DE RÉCONCILIATION & CLÔTURE DU STOCK (EOD)',
    `Boutique : ${storeName} | Date : ${dateStr} | Statut : ${records[0]?.status === 'CLOSED' ? 'CLÔTURÉ' : 'EN COURS'}`
  );

  let startY = 36;

  // Metadata Box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const totalOpening = records.reduce((acc, r) => acc + r.openingStock, 0);
  const totalReceived = records.reduce((acc, r) => acc + r.receivedRequisitions, 0);
  const totalSales = records.reduce((acc, r) => acc + r.totalSales, 0);
  const totalUnsold = records.reduce((acc, r) => acc + r.actualClosingStock, 0);
  const totalVariance = records.reduce((acc, r) => acc + r.unaccountedWasteVariance, 0);
  const totalLossVal = records.reduce((acc, r) => acc + (r.actualClosingStock + r.unaccountedWasteVariance) * r.unitCostPrice, 0);

  doc.text(`Responsable : ${closedBy || 'Gérant de Caisse'}`, 14, startY);
  doc.text(`Heure d'Édition : ${new Date().toLocaleTimeString('fr-FR')}`, 130, startY);
  startY += 5;

  // Summary Metrics Banner inside PDF
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.roundedRect(14, startY, 182, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Stock Initial: ${totalOpening} unit.`, 18, startY + 9);
  doc.text(`Reçu Lab: +${totalReceived} unit.`, 60, startY + 9);
  doc.text(`Ventes POS: -${totalSales} unit.`, 100, startY + 9);
  doc.text(`Invendus: ${totalUnsold} unit.`, 138, startY + 9);
  doc.setTextColor(220, 38, 38); // Red
  doc.text(`Pertes: ${totalLossVal.toFixed(2)} DZD`, 166, startY + 9);

  startY += 18;

  // Table rows
  const tableRows = records.map((r) => [
    r.pastryName,
    r.category,
    `${r.openingStock}`,
    `+${r.receivedRequisitions}`,
    `-${r.totalSales}`,
    `${r.expectedClosingStock}`,
    `${r.actualClosingStock}`,
    r.unaccountedWasteVariance > 0 ? `-${r.unaccountedWasteVariance}` : '0',
    `${((r.actualClosingStock + r.unaccountedWasteVariance) * r.unitCostPrice).toFixed(2)} DZD`
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['Produit / Pâtisserie', 'Catégorie', 'Initial', 'Reçu', 'Ventes', 'Calculé', 'Réel', 'Écart', 'Valeur Perte']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 32 },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'center', cellWidth: 15 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
      7: { halign: 'center', cellWidth: 13 },
      8: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }
    }
  });

  addPDFFooter(doc);
  doc.save(`reconciliation_${storeName.replace(/\s+/g, '_')}_${dateStr}.pdf`);
}
