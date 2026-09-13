import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RawMaterial, Supplier, MaterialUnit } from '../types';
import { notifyToast } from '../services/storage';

export interface ReorderItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: MaterialUnit;
  currentStock: number;
  reorderLevel: number;
  suggestedQty: number;
  unitCost: number;
  totalCost: number;
  supplierId?: string;
  supplierName?: string;
  selected: boolean;
  notes?: string;
}

export interface ReorderExportOptions {
  supplierName?: string;
  supplierContact?: {
    person?: string;
    phone?: string;
    email?: string;
  };
  urgencyLevel?: 'NORMALE' | 'URGENTE' | 'CRITIQUE';
  orderReference?: string;
  deliveryDate?: string;
  generalNotes?: string;
  requesterName?: string;
}

const BRAND_PRIMARY: [number, number, number] = [15, 23, 42]; // Slate 900
const BRAND_AMBER: [number, number, number] = [217, 119, 6]; // Amber 600
const BRAND_RED: [number, number, number] = [225, 29, 72]; // Rose 600
const TEXT_MUTED: [number, number, number] = [100, 116, 139]; // Slate 500

/**
 * Matches an ingredient's category to the best supplier from the supplier directory
 */
export function matchSupplierForCategory(category: string, suppliers: Supplier[]): Supplier | undefined {
  if (!suppliers || suppliers.length === 0) return undefined;
  
  // Exact category match
  const exact = suppliers.find((s) => s.categoriesProvided && s.categoriesProvided.includes(category));
  if (exact) return exact;

  // Keyword match
  const catLower = category.toLowerCase();
  const keywordMatch = suppliers.find((s) =>
    s.categoriesProvided && s.categoriesProvided.some((cp) => {
      const cpLower = cp.toLowerCase();
      return catLower.includes(cpLower) || cpLower.includes(catLower);
    })
  );
  if (keywordMatch) return keywordMatch;

  return suppliers[0];
}

/**
 * Compiles low stock ingredients into a structured ReorderItem list with intelligent default quantities
 */
export function buildReorderListFromMaterials(
  materials: RawMaterial[],
  suppliers: Supplier[] = [],
  factor: number = 2.0,
  includeApproachingThreshold: boolean = false
): ReorderItem[] {
  const targetMaterials = materials.filter((m) => {
    const minThreshold = m.min_reorder_level ?? m.reorderLevel;
    if (includeApproachingThreshold) {
      return m.currentStock <= minThreshold * 1.2;
    }
    return m.currentStock <= minThreshold;
  });

  return targetMaterials.map((m) => {
    const minThreshold = m.min_reorder_level ?? m.reorderLevel;
    // Quantity calculation: bring stock to target level (threshold * factor)
    const targetStock = Math.ceil(minThreshold * factor);
    const deficit = Math.max(1, targetStock - m.currentStock);
    const matchedSupplier = matchSupplierForCategory(m.category, suppliers);
    const unitCost = m.currentAvgCost > 0 ? m.currentAvgCost : 5.0;

    return {
      id: m.id,
      sku: m.sku || m.id,
      name: m.name,
      category: m.category,
      unit: m.unit,
      currentStock: m.currentStock,
      reorderLevel: minThreshold,
      suggestedQty: deficit,
      unitCost: unitCost,
      totalCost: deficit * unitCost,
      supplierId: matchedSupplier?.id,
      supplierName: matchedSupplier?.name || 'Fournisseur Général',
      selected: true,
    };
  });
}

/**
 * Generates an official, high-resolution PDF for the Reorder List / Supplier PO
 */
export function exportReorderListToPDF(
  items: ReorderItem[],
  options: ReorderExportOptions = {}
): boolean {
  const selectedItems = items.filter((i) => i.selected);

  if (selectedItems.length === 0) {
    notifyToast({
      type: 'warning',
      title: 'Aucun Article Sélectionné',
      message: 'Veuillez cocher au moins un ingrédient pour générer le bon de réapprovisionnement.'
    });
    return false;
  }

  try {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const orderRef = options.orderReference || `REAP-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const urgency = options.urgencyLevel || 'URGENTE';

    // Header Banner
    doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.rect(0, 0, 210, 32, 'F');

    // Accent line
    doc.setFillColor(BRAND_AMBER[0], BRAND_AMBER[1], BRAND_AMBER[2]);
    doc.rect(0, 32, 210, 2, 'F');

    // Brand Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('PÂTISSERIE LE DÉLICE', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text('Laboratoire Central • Direction des Approvisionnements & Matières', 14, 21);
    doc.text(`Réf. Bon de Commande : ${orderRef}`, 14, 27);

    // Right-aligned Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('BON DE RÉAPPROVISIONNEMENT', 196, 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240);
    doc.text(`Émis le : ${dateStr}`, 196, 21, { align: 'right' });
    
    // Urgency tag on top right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    if (urgency === 'CRITIQUE') {
      doc.setTextColor(244, 63, 94);
      doc.text('PRIORITÉ : CRITIQUE / RUPTURE IMMINENTE', 196, 27, { align: 'right' });
    } else {
      doc.setTextColor(251, 191, 36);
      doc.text('PRIORITÉ : RÉAPPROVISIONNEMENT URGENT', 196, 27, { align: 'right' });
    }

    let startY = 40;

    // Supplier & Order Info Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, startY, 182, 28, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, startY, 182, 28, 2, 2, 'S');

    // Supplier details (Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('DESTINATAIRE (FOURNISSEUR) :', 18, startY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const supplierName = options.supplierName || 'Tous Fournisseurs (Liste Consolidée)';
    doc.text(`Nom : ${supplierName}`, 18, startY + 14);
    if (options.supplierContact?.person || options.supplierContact?.phone) {
      const contactInfo = [options.supplierContact.person, options.supplierContact.phone].filter(Boolean).join(' • ');
      doc.text(`Contact : ${contactInfo}`, 18, startY + 20);
    } else {
      doc.text('Contact : Service Commandes / Commercial', 18, startY + 20);
    }
    doc.text(`Livraison souhaitée : ${options.deliveryDate || 'Sous 24h - 48h (Dès que possible)'}`, 18, startY + 25);

    // Summary details (Right)
    const totalCost = selectedItems.reduce((acc, i) => acc + i.totalCost, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('RÉSUMÉ DU BESOIN :', 125, startY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Nombre d'ingrédients : ${selectedItems.length}`, 125, startY + 14);
    doc.text(`Demandeur : ${options.requesterName || 'Chef de Laboratoire Central'}`, 125, startY + 20);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text(`Budget Estimatif : ${totalCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD`, 125, startY + 25);

    startY += 34;

    // Table of Ingredients
    const rows = selectedItems.map((item) => {
      return [
        item.sku || '-',
        item.name,
        item.category,
        `${item.currentStock} ${item.unit}`,
        `${item.reorderLevel} ${item.unit}`,
        `${item.suggestedQty} ${item.unit}`,
        `${item.unitCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD`,
        `${item.totalCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD`,
        item.supplierName || '-'
      ];
    });

    autoTable(doc, {
      startY,
      head: [[
        'Réf.',
        'Désignation Ingrédient',
        'Catégorie',
        'Stock Actuel',
        'Seuil Min.',
        'Qté à Commander',
        'P.U Estimé',
        'Montant Ligne',
        'Fournisseur'
      ]],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND_PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [15, 23, 42]
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 24 },
        3: { cellWidth: 18, halign: 'right', textColor: [225, 29, 72] }, // Red current stock
        4: { cellWidth: 16, halign: 'right' },
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }, // Bold quantity
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 20, halign: 'left' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // Instructions & Signatures Block
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    
    // Check if new page is needed for signatures
    let sigY = finalY;
    if (sigY > 230) {
      doc.addPage();
      sigY = 25;
    }

    // Delivery Instructions Box
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(14, sigY, 182, 18, 2, 2, 'F');
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(14, sigY, 182, 18, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text('CONSIGNES DE RÉCEPTION & CONTRÔLE QUALITÉ :', 18, sigY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 20, 20);
    doc.text(
      'Livraison au Quai de Réception - Laboratoire Central Délice. Tout lot doit être conforme aux normes sanitaires (DLUO > 6 mois, étiquetage traçable, emballage intact).',
      18,
      sigY + 11
    );
    if (options.generalNotes) {
      doc.text(`Note additionnelle : ${options.generalNotes}`, 18, sigY + 15);
    }

    // Signature boxes
    const boxY = sigY + 24;
    doc.setDrawColor(203, 213, 225);
    
    // Left Box (Chef Labo)
    doc.rect(14, boxY, 86, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('VISA & CACHET CHEF DE LABORATOIRE', 18, boxY + 6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Bon pour commande et réapprovisionnement', 18, boxY + 11);

    // Right Box (Fournisseur)
    doc.rect(110, boxY, 86, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('ACCUSÉ DE RÉCEPTION FOURNISSEUR', 114, boxY + 6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Date de réception et confirmation délai de livraison', 114, boxY + 11);

    // Add page footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 282, 196, 282);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      doc.text(`Généré le ${dateStr} • Délice ERP - Système Gestion Laboratoire • Réf: ${orderRef}`, 14, 287);
      doc.text(`Page ${i} sur ${pageCount}`, 196, 287, { align: 'right' });
    }

    const filename = `reappro_fournisseurs_${orderRef}_${new Date().toISOString().substring(0, 10)}.pdf`;
    doc.save(filename);

    notifyToast({
      type: 'success',
      title: 'Bon de Réapprovisionnement Téléchargé',
      message: `Le document PDF (${selectedItems.length} ingrédients) a été généré avec succès.`
    });

    return true;
  } catch (err: any) {
    console.error('Failed to generate Reorder List PDF:', err);
    notifyToast({
      type: 'error',
      title: 'Erreur Export PDF',
      message: err?.message || 'Impossible de générer le fichier PDF.'
    });
    return false;
  }
}

/**
 * Generates clean formatted text designed for messaging (WhatsApp, SMS, or Email)
 */
export function generateReorderTextList(
  items: ReorderItem[],
  options: ReorderExportOptions = {}
): string {
  const selectedItems = items.filter((i) => i.selected);
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const supplierName = options.supplierName || 'Fournisseur / Centrale d\'achats';
  const orderRef = options.orderReference || `REAP-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}`;

  if (selectedItems.length === 0) {
    return 'Aucun article sélectionné dans la liste de réapprovisionnement.';
  }

  const totalCost = selectedItems.reduce((acc, i) => acc + i.totalCost, 0);

  let text = `📋 *PÂTISSERIE LE DÉLICE — BON DE COMMANDE FOURNISSEUR*\n`;
  text += `🔖 Réf : ${orderRef}\n`;
  text += `📅 Date : ${dateStr}\n`;
  text += `🏢 Destinataire : ${supplierName}\n`;
  if (options.supplierContact?.phone) {
    text += `📞 Tél Fournisseur : ${options.supplierContact.phone}\n`;
  }
  text += `👤 Émis par : ${options.requesterName || 'Chef Pâtissier (Laboratoire Central)'}\n`;
  text += `⚡ Priorité : ${options.urgencyLevel || 'RÉAPPROVISIONNEMENT URGENT'}\n`;
  text += `\n──────────────────────────────\n`;
  text += `📦 *INGRÉDIENTS EN STOCK BAS À LIVRER :*\n`;
  text += `──────────────────────────────\n\n`;

  selectedItems.forEach((item, idx) => {
    text += `${idx + 1}. *${item.name}*\n`;
    text += `   • Qté à livrer : *${item.suggestedQty} ${item.unit}*\n`;
    text += `   • Stock actuel : ${item.currentStock} ${item.unit} (Seuil d'alerte : ${item.reorderLevel} ${item.unit})\n`;
    text += `   • P.U estimé : ${item.unitCost.toFixed(2)} DZD | Ligne : ${item.totalCost.toFixed(2)} DZD\n`;
    if (item.supplierName && item.supplierName !== supplierName) {
      text += `   • Fournisseur habituel : ${item.supplierName}\n`;
    }
    text += `\n`;
  });

  text += `──────────────────────────────\n`;
  text += `📊 *RÉCAPITULATIF DE LA COMMANDE :*\n`;
  text += `• Total articles : ${selectedItems.length} références\n`;
  text += `• Budget estimé : *${totalCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD*\n`;
  text += `• Délai de livraison souhaité : ${options.deliveryDate || 'Sous 24h - 48h'}\n`;
  text += `\n📍 *Adresse de livraison :*\nLaboratoire Central Pâtisserie Le Délice\n(Quai de réception matières premières)\n`;

  if (options.generalNotes) {
    text += `\n📝 *Note :* ${options.generalNotes}\n`;
  }

  text += `\nMerci de bien vouloir nous confirmer la disponibilité et le créneau de livraison.`;

  return text;
}
