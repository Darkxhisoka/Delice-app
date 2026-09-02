import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { RawMaterial, ProductionBatch } from '../types';
import { notifyToast } from '../services/storage';

const BRAND_PRIMARY: [number, number, number] = [15, 23, 42]; // Slate 900
const BRAND_ACCENT: [number, number, number] = [79, 70, 229]; // Indigo 600
const TEXT_MUTED: [number, number, number] = [100, 116, 139]; // Slate 500

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFillColor(245, 158, 11); // Amber 500
  doc.rect(0, 28, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PÂTISSERIE LE DÉLICE', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Laboratoire Central • Rapport & Audit d\'Inventaire', 14, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), 196, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(subtitle, 196, 21, { align: 'right' });

  return 36;
}

function addFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 280, 196, 280);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Généré le ${dateStr} • Délice Pâtisserie ERP`, 14, 286);
    doc.text(`Page ${i} sur ${pageCount}`, 196, 286, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------------
// 1. Stock Matières Premières Export (PDF & Excel)
// ---------------------------------------------------------------------------------

export function exportRawMaterialsToPDF(materials: RawMaterial[]) {
  try {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('fr-FR');
    let startY = addHeader(doc, 'Stock Matières Premières', `Date : ${dateStr}`);

    const totalValuation = materials.reduce((acc, m) => acc + m.currentStock * m.currentAvgCost, 0);
    const lowStockCount = materials.filter((m) => m.currentStock <= m.reorderLevel).length;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, startY, 182, 16, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, startY, 182, 16, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text(`Articles : ${materials.length}`, 18, startY + 10);
    doc.text(`Valeur Totale : ${totalValuation.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD`, 70, startY + 10);
    doc.setTextColor(lowStockCount > 0 ? 220 : 16, lowStockCount > 0 ? 38 : 185, lowStockCount > 0 ? 38 : 129);
    doc.text(`Alertes Rupture : ${lowStockCount}`, 150, startY + 10);

    startY += 22;

    const rows = materials.map((m) => {
      const isLow = m.currentStock <= m.reorderLevel;
      const val = m.currentStock * m.currentAvgCost;
      return [
        m.name,
        m.category,
        `${m.currentStock} ${m.unit}`,
        `${m.reorderLevel} ${m.unit}`,
        `${m.currentAvgCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD`,
        `${val.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD`,
        isLow ? 'CRITIQUE / BAS' : 'OPTIMAL',
      ];
    });

    autoTable(doc, {
      startY,
      head: [['Désignation Matière', 'Catégorie', 'Stock Actuel', 'Seuil Min.', 'P.U Moyen', 'Valeur Totale', 'État']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND_PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42 },
        1: { cellWidth: 26 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 20 },
        4: { halign: 'right', cellWidth: 24 },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
        6: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
      },
    });

    addFooter(doc);
    doc.save(`stock_matieres_premieres_${new Date().toISOString().substring(0, 10)}.pdf`);
    notifyToast({
      type: 'success',
      title: 'Export PDF Réussi',
      message: 'Le rapport d\'inventaire du stock a été téléchargé en PDF.',
    });
  } catch (err: any) {
    console.error('PDF export error:', err);
    notifyToast({ type: 'error', title: 'Erreur Export', message: err?.message || 'Échec de génération PDF.' });
  }
}

export function exportRawMaterialsToExcel(materials: RawMaterial[]) {
  try {
    const data = materials.map((m) => ({
      'Code / ID': m.id,
      'Désignation Matière': m.name,
      'Catégorie': m.category,
      'Stock Actuel': m.currentStock,
      'Unité': m.unit,
      'Seuil Réappro': m.reorderLevel,
      'Prix Unitaire Moyen (DZD)': m.currentAvgCost,
      'Valeur Totale du Stock (DZD)': m.currentStock * m.currentAvgCost,
      'Statut': m.currentStock <= m.reorderLevel ? 'ALERTE RUPTURE' : 'OPTIMAL',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock_Matieres');

    XLSX.writeFile(workbook, `stock_matieres_premieres_${new Date().toISOString().substring(0, 10)}.xlsx`);
    notifyToast({
      type: 'success',
      title: 'Export Excel Réussi',
      message: 'Le tableau d\'inventaire a été exporté en format .xlsx.',
    });
  } catch (err: any) {
    console.error('Excel export error:', err);
    notifyToast({ type: 'error', title: 'Erreur Export', message: err?.message || 'Échec de génération Excel.' });
  }
}

// ---------------------------------------------------------------------------------
// 2. Fiche de Production Batches Export (PDF & Excel)
// ---------------------------------------------------------------------------------

export function exportProductionBatchesToPDF(batches: ProductionBatch[]) {
  try {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('fr-FR');
    let startY = addHeader(doc, 'Fiches de Production', `Date : ${dateStr}`);

    const totalProduced = batches.reduce((acc, b) => acc + (b.plannedQuantity || 0), 0);
    const completedCount = batches.filter((b) => b.status === 'COMPLETED').length;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, startY, 182, 16, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, startY, 182, 16, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text(`Lots Planifiés : ${batches.length}`, 18, startY + 10);
    doc.text(`Unités Totales : ${totalProduced} portions`, 80, startY + 10);
    doc.text(`Lots Terminés : ${completedCount}/${batches.length}`, 145, startY + 10);

    startY += 22;

    const rows = batches.map((b) => [
      b.batchNumber,
      b.recipeName,
      `${b.plannedQuantity} portions`,
      b.actualQuantity !== undefined ? `${b.actualQuantity} portions` : '-',
      b.productionDate ? b.productionDate.substring(0, 10) : '-',
      b.supervisorName || 'Chef Pâtissier',
      b.status,
    ]);

    autoTable(doc, {
      startY,
      head: [['N° Lot', 'Recette / Produit', 'Qté Prévue', 'Qté Réalisée', 'Date', 'Responsable', 'Statut']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND_ACCENT,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 28 },
        1: { cellWidth: 44 },
        2: { halign: 'right', cellWidth: 24 },
        3: { halign: 'right', cellWidth: 24 },
        4: { cellWidth: 22 },
        5: { cellWidth: 24 },
        6: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      },
    });

    addFooter(doc);
    doc.save(`fiches_production_${new Date().toISOString().substring(0, 10)}.pdf`);
    notifyToast({
      type: 'success',
      title: 'Export PDF Réussi',
      message: 'Les fiches de production ont été téléchargées en PDF.',
    });
  } catch (err: any) {
    console.error('PDF export error:', err);
    notifyToast({ type: 'error', title: 'Erreur Export', message: err?.message || 'Échec de génération PDF.' });
  }
}

export function exportProductionBatchesToExcel(batches: ProductionBatch[]) {
  try {
    const data = batches.map((b) => ({
      'N° de Lot': b.batchNumber,
      'Recette / Fiche': b.recipeName,
      'Quantité Planifiée': b.plannedQuantity,
      'Quantité Réalisée': b.actualQuantity !== undefined ? b.actualQuantity : '',
      'Date de Production': b.productionDate,
      'DLC / Expiration': b.expiryDate || '',
      'Responsable / Chef': b.supervisorName || 'Chef Pâtissier',
      'Statut': b.status,
      'Notes': b.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Production_Batches');

    XLSX.writeFile(workbook, `fiches_production_${new Date().toISOString().substring(0, 10)}.xlsx`);
    notifyToast({
      type: 'success',
      title: 'Export Excel Réussi',
      message: 'Les fiches de production ont été exportées en format .xlsx.',
    });
  } catch (err: any) {
    console.error('Excel export error:', err);
    notifyToast({ type: 'error', title: 'Erreur Export', message: err?.message || 'Échec de génération Excel.' });
  }
}
