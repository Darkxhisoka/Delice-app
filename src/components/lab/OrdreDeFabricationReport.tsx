import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Printer,
  Download,
  CheckCircle2,
  Clock,
  ClipboardList,
  ChefHat,
  FileText,
  AlertCircle,
  Calendar,
  Building2,
  Sparkles,
  ShieldCheck,
  Layers,
  Store,
  X,
  ArrowLeft,
  Check,
  Package,
  RotateCcw,
  UserCheck
} from 'lucide-react';
import { AggregatedItem, ProductionRoomMeta, ROOMS_META } from '../../pages/LabProduction';
import { RoomProductionTimeD3Chart } from './RoomProductionTimeD3Chart';
import { RoomDailyStatsHeader } from './RoomDailyStatsHeader';
import { calculateRoom24hStats, recordCompletedProductionRun } from '../../services/productionRunsService';

export interface OrdreDeFabricationProps {
  roomMeta: ProductionRoomMeta;
  items: AggregatedItem[];
  originatingRequisitions?: string[];
  totalRoomUnits: number;
  onClose?: () => void;
  isModal?: boolean;
}

export type ItemOFStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';

export function getRoomOFPrefix(roomId: string): string {
  switch (roomId) {
    case 'patisseries_fines':
      return 'OF-PAT';
    case 'viennoiserie':
      return 'OF-VIE';
    case 'gateaux_secs':
      return 'OF-SEC';
    case 'gateaux_orientaux':
      return 'OF-ORI';
    case 'feuilletage':
      return 'OF-FEU';
    case 'piece_montee':
      return 'OF-PM';
    case 'trompe_oeil':
      return 'OF-TRO';
    default:
      return 'OF-LAB';
  }
}

export function OrdreDeFabricationReport({
  roomMeta,
  items,
  originatingRequisitions = [],
  totalRoomUnits,
  onClose,
  isModal = false,
}: OrdreDeFabricationProps) {
  // Current date & generated OF code
  const todayStr = useMemo(() => {
    return new Date().toISOString().substring(0, 10);
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // OF Reference: e.g. OF-PAT-2026-09-001
  const ofReference = useMemo(() => {
    const prefix = getRoomOFPrefix(roomMeta.id);
    const datePart = todayStr.replace(/-/g, '');
    return `${prefix}-${datePart}-001`;
  }, [roomMeta.id, todayStr]);

  // Shift & Supervisor states
  const [selectedShift, setSelectedShift] = useState<string>('Équipe Matin (05:00 - 13:00)');
  const [chefName, setChefName] = useState<string>('Chef Pâtissier Responsable');
  const [labSupervisor, setLabSupervisor] = useState<string>('M. Akram Meziane (Directeur Labo)');
  const [ofNotes, setOfNotes] = useState<string>(
    'Respect scrupuleux des fiches techniques, des pesées et de la chaîne de froid (4°C).'
  );
  const [ofStatus, setOfStatus] = useState<'EN_COURS' | 'TERMINE'>('EN_COURS');

  // Item status tracking ("TODO" | "IN_PROGRESS" | "COMPLETED")
  const storageKey = `delice_of_status_${ofReference}`;
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemOFStatus>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Actual produced quantities tracking
  const actualQtyStorageKey = `delice_of_actual_qty_${ofReference}`;
  const [actualQuantities, setActualQuantities] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(actualQtyStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Sync item status changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(itemStatuses));
    } catch {
      // ignore
    }
  }, [itemStatuses, storageKey]);

  // Sync actual quantities changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(actualQtyStorageKey, JSON.stringify(actualQuantities));
    } catch {
      // ignore
    }
  }, [actualQuantities, actualQtyStorageKey]);

  // Helper to retrieve actual quantity produced for an item
  const getItemActualQuantity = (item: AggregatedItem): number => {
    if (actualQuantities[item.id] !== undefined) {
      return actualQuantities[item.id];
    }
    const status = itemStatuses[item.id] || 'TODO';
    if (status === 'COMPLETED') return item.totalQuantity;
    if (status === 'IN_PROGRESS') return Math.max(1, Math.round(item.totalQuantity * 0.5));
    return 0;
  };

  // Direct actual quantity adjustment
  const handleUpdateActualQuantity = (itemId: string, qty: number, expectedQty: number) => {
    const safeQty = Math.max(0, qty);
    setActualQuantities((prev) => ({ ...prev, [itemId]: safeQty }));
    if (safeQty >= expectedQty && expectedQty > 0) {
      setItemStatuses((prev) => ({ ...prev, [itemId]: 'COMPLETED' }));
    } else if (safeQty > 0) {
      setItemStatuses((prev) => ({ ...prev, [itemId]: 'IN_PROGRESS' }));
    } else {
      setItemStatuses((prev) => ({ ...prev, [itemId]: 'TODO' }));
    }
  };

  // Calculate completion metrics
  const completedCount = useMemo(() => {
    return items.filter((item) => itemStatuses[item.id] === 'COMPLETED').length;
  }, [items, itemStatuses]);

  const inProgressCount = useMemo(() => {
    return items.filter((item) => (itemStatuses[item.id] || 'TODO') === 'IN_PROGRESS').length;
  }, [items, itemStatuses]);

  const totalActualUnits = useMemo(() => {
    return items.reduce((sum, item) => sum + getItemActualQuantity(item), 0);
  }, [items, actualQuantities, itemStatuses]);

  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  // Toggle item status
  const handleToggleItemStatus = (itemId: string, expectedQty?: number) => {
    const targetItem = items.find((i) => i.id === itemId);
    const totalExpected = expectedQty ?? (targetItem ? targetItem.totalQuantity : 0);

    setItemStatuses((prev) => {
      const current = prev[itemId] || 'TODO';
      let next: ItemOFStatus = 'IN_PROGRESS';
      if (current === 'TODO') {
        next = 'IN_PROGRESS';
        setActualQuantities((prevQty) => ({
          ...prevQty,
          [itemId]:
            prevQty[itemId] !== undefined && prevQty[itemId] > 0
              ? prevQty[itemId]
              : Math.max(1, Math.round(totalExpected * 0.5)),
        }));
      } else if (current === 'IN_PROGRESS') {
        next = 'COMPLETED';
        setActualQuantities((prevQty) => ({
          ...prevQty,
          [itemId]: totalExpected,
        }));
      } else {
        next = 'TODO';
        setActualQuantities((prevQty) => ({
          ...prevQty,
          [itemId]: 0,
        }));
      }
      return { ...prev, [itemId]: next };
    });
  };

  // Mark all items and OF as Completed
  const handleMarkOfCompleted = () => {
    const updated: Record<string, ItemOFStatus> = {};
    const updatedActual: Record<string, number> = {};
    items.forEach((item) => {
      updated[item.id] = 'COMPLETED';
      updatedActual[item.id] = item.totalQuantity;
    });
    setItemStatuses(updated);
    setActualQuantities(updatedActual);
    setOfStatus('TERMINE');

    // Automatically record this completed OF run into the last 24h production runs log
    recordCompletedProductionRun({
      batchCode: ofReference,
      roomId: roomMeta.id,
      roomName: roomMeta.nameFr,
      productName: `OF Global • ${roomMeta.nameFr} (${items.length} réf.)`,
      category: roomMeta.categoryFr,
      plannedTarget: totalRoomUnits,
      actualCompleted: totalRoomUnits,
      unit: 'unités',
      leadChef: chefName,
      shift: selectedShift,
      notes: ofNotes || 'OF validé et complété à 100% par le chef d’atelier.',
    });
  };

  // Reset all item statuses
  const handleResetItemStatuses = () => {
    setItemStatuses({});
    setActualQuantities({});
    setOfStatus('EN_COURS');
  };

  // =========================================================================
  // PRINT ACTION: triggers window.print()
  // =========================================================================
  const handlePrint = () => {
    window.print();
  };

  // =========================================================================
  // PDF EXPORT ACTION: builds official A4 PDF with jsPDF & autoTable
  // =========================================================================
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    let startY = 14;

    // Header Banner
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Accent Line
    doc.setFillColor(217, 119, 6); // Amber 600
    doc.rect(0, 28, pageWidth, 2, 'F');

    // Branding Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('DÉLICE PÂTISSERIE - LABORATOIRE CENTRAL', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.text('Unité Centrale de Production & Dispatching Réseau de Boutiques', 14, 20);

    // Document Title Right Aligned
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('ORDRE DE FABRICATION', pageWidth - 14, 13, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(245, 158, 11); // Amber 500
    doc.text(ofReference, pageWidth - 14, 20, { align: 'right' });

    startY = 36;

    // Workshop & Shift Box
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(14, startY, pageWidth - 28, 30, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.roundedRect(14, startY, pageWidth - 28, 30, 2, 2, 'S');

    // Column 1: Workshop info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Atelier / Poste : ${roomMeta.nameFr.toUpperCase()}`, 18, startY + 7);

    // Calculate 24h stats for inclusion in the PDF
    const pdfStats24h = calculateRoom24hStats(roomMeta.id, roomMeta.nameFr, totalRoomUnits);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Catégorie : ${roomMeta.categoryFr}`, 18, startY + 13);
    doc.text(`Chef Pâtissier : ${chefName}`, 18, startY + 19);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bilan 24h : Cible ${pdfStats24h.totalTargetOutput} pcs | Réalisé ${pdfStats24h.totalActualCompleted} pcs (${pdfStats24h.achievementRate}%) • ${pdfStats24h.completedRunsCount} séries`, 18, startY + 25);

    // Column 2: Date & Shift info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date : ${formattedDate}`, 120, startY + 7);
    doc.text(`Horaire : ${selectedShift}`, 120, startY + 13);

    const reqsText =
      originatingRequisitions.length > 0
        ? originatingRequisitions.map((r) => `#${r}`).join(', ')
        : 'Toutes réquisitions approuvées';
    doc.text(`Bons sources : ${reqsText}`, 120, startY + 19);

    startY += 36;

    // Items Table for Production
    const tableData = items.map((item, index) => {
      const storesSummary = Object.values(item.storesBreakdown)
        .map((s) => `${s.storeName}: ${s.quantity}`)
        .join(' | ');

      const status = itemStatuses[item.id] || 'TODO';
      const statusText =
        status === 'COMPLETED' ? '[X] Terminé' : status === 'IN_PROGRESS' ? '[~] En cours' : '[ ] À faire';
      const actualQty = getItemActualQuantity(item);

      return [
        String(index + 1).padStart(2, '0'),
        item.id.replace(/^id_|^name_/, '').substring(0, 16),
        item.name,
        item.itemType === 'raw_material' ? 'Matière Première' : 'Produit Fini',
        `${actualQty} / ${item.totalQuantity} ${item.unit}`,
        storesSummary || 'Central Lab',
        statusText,
      ];
    });

    autoTable(doc, {
      startY: startY,
      head: [
        [
          'N°',
          'Code / Réf',
          'Désignation Article',
          'Type',
          'Réalisé vs Prévu',
          'Répartition Magasins',
          'Statut',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold', cellWidth: 26 },
        2: { fontStyle: 'bold', cellWidth: 44 },
        3: { cellWidth: 24 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
        5: { fontSize: 7, cellWidth: 38 },
        6: { halign: 'center', cellWidth: 20 },
      },
      foot: [
        [
          '',
          '',
          'TOTAL UNITÉS FABRICATION',
          '',
          `${totalActualUnits} / ${totalRoomUnits} pcs/kg`,
          `${items.length} articles différents`,
          `${completedCount}/${items.length} terminés`,
        ],
      ],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Instructions Box
    if (finalY + 45 <= 280) {
      doc.setFillColor(254, 243, 199); // Amber 100
      doc.roundedRect(14, finalY, pageWidth - 28, 12, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.text('CONSIGNE HYGIÈNE & TRAÇABILITÉ :', 18, finalY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Contrôler la conformité organoleptique avant conditionnement et départ vers les boutiques.',
        18,
        finalY + 9
      );

      // Signatures
      const sigY = finalY + 16;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      // Left signature: Lab supervisor
      doc.rect(14, sigY, 86, 26, 'S');
      doc.text('VISA RESPONSABLE LABORATOIRE', 18, sigY + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(labSupervisor, 18, sigY + 12);
      doc.text('Date & Signature :', 18, sigY + 22);

      // Right signature: Pastry Chef
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.rect(110, sigY, 86, 26, 'S');
      doc.text('VISA CHEF PÂTISSIER ATELIER', 114, sigY + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(chefName, 114, sigY + 12);
      doc.text('Émargement fin de fournée :', 114, sigY + 22);
    }

    // Page numbers footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Document ERP Délice • Généré le ${new Date().toLocaleString('fr-FR')} • Page ${i} / ${pageCount}`,
        pageWidth / 2,
        290,
        { align: 'center' }
      );
    }

    doc.save(`${ofReference}_${roomMeta.id}.pdf`);
  };

  const Icon = roomMeta.icon || Sparkles;

  return (
    <div className={`space-y-6 ${isModal ? 'max-w-5xl mx-auto' : 'w-full'}`}>
      {/* =================================================================== */}
      {/* 1. TOP ACTION & NAVIGATION BAR (Hidden during @media print)         */}
      {/* =================================================================== */}
      <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Retour à la grille"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white tracking-wide">
                {ofReference}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                  ofStatus === 'TERMINE'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}
              >
                {ofStatus === 'TERMINE' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> OF TERMINÉ
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> OF EN COURS
                  </>
                )}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Progression : {completedCount}/{items.length} ({progressPercent}%)
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Ordre de Fabrication : {roomMeta.nameFr}
            </h2>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer"
            title="Imprimer l'ordre au format A4"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer l'Ordre de Fabrication</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
            title="Exporter en fichier PDF officiel"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger PDF</span>
          </button>

          {ofStatus === 'EN_COURS' ? (
            <button
              onClick={handleMarkOfCompleted}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Marquer OF comme Terminé</span>
            </button>
          ) : (
            <button
              onClick={handleResetItemStatuses}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rouvrir l'OF</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer ml-auto md:ml-0"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. SUMMARY STATS HEADER: 24-HOUR TARGET OUTPUT VS ACTUAL COMPLETED  */}
      {/* =================================================================== */}
      <RoomDailyStatsHeader
        roomId={roomMeta.id}
        roomName={roomMeta.nameFr}
        categoryFr={roomMeta.categoryFr}
        colorTheme={roomMeta.colorTheme}
        currentOfTargetUnits={totalRoomUnits}
        currentOfCompletedUnits={completedCount}
        chefName={chefName}
        selectedShift={selectedShift}
      />

      {/* =================================================================== */}
      {/* 3. CLASSIC OF WORKSHOP HEADER & METADATA CARD                      */}
      {/* =================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Color bar indicator */}
        <div className={`h-2.5 w-full ${roomMeta.colorTheme.bar}`} />

        <div className="p-5 sm:p-6 space-y-6">
          {/* OF Official Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${roomMeta.colorTheme.bar} text-white shadow-sm shrink-0`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                    ORDRE DE FABRICATION - {roomMeta.nameFr.toUpperCase()}
                  </h1>
                  <span className="font-arabic text-sm font-bold text-slate-400">
                    {roomMeta.nameAr}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Laboratoire Central Délice • Section {roomMeta.categoryFr}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Référence Document
              </span>
              <span className="font-mono text-base font-black text-slate-900 block">
                {ofReference}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Operational Shift & Supervisor Sign-off Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Poste / Équipe de Travail
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:p-0"
              >
                <option value="Équipe Matin (05:00 - 13:00)">Équipe Matin (05:00 - 13:00)</option>
                <option value="Équipe Après-midi (13:00 - 21:00)">
                  Équipe Après-midi (13:00 - 21:00)
                </option>
                <option value="Équipe Nuit / Fournée (21:00 - 05:00)">
                  Équipe Nuit / Fournée (21:00 - 05:00)
                </option>
              </select>
            </div>

            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Chef Pâtissier Référent
              </label>
              <input
                type="text"
                value={chefName}
                onChange={(e) => setChefName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:p-0"
              />
            </div>

            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Responsable Validation Labo
              </label>
              <input
                type="text"
                value={labSupervisor}
                onChange={(e) => setLabSupervisor(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:p-0"
              />
            </div>

            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                  Volume Global Atelier
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-slate-900">{totalRoomUnits}</span>
                  <span className="text-xs font-bold text-slate-500">unités / {items.length} réf.</span>
                </div>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Originating Requisitions Traceability Tags */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-950 uppercase text-[10px] tracking-wider">
                Bons de Réquisition Originaux :
              </span>
              {originatingRequisitions && originatingRequisitions.length > 0 ? (
                originatingRequisitions.map((reqNumber) => (
                  <span
                    key={reqNumber}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white text-amber-900 border border-amber-300 shadow-2xs"
                  >
                    #{reqNumber}
                  </span>
                ))
              ) : (
                <span className="text-amber-800 italic">
                  Agrégation automatique des réquisitions validées en attente
                </span>
              )}
            </div>
            <div className="text-[11px] text-amber-800 font-medium">
              Horodatage : {new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>

          {/* =============================================================== */}
          {/* D3.JS MINI-CHART: 30-DAY AVERAGE PRODUCTION TIME & SCHEDULING   */}
          {/* =============================================================== */}
          <RoomProductionTimeD3Chart
            roomId={roomMeta.id}
            roomName={roomMeta.nameFr}
            categoryFr={roomMeta.categoryFr}
            totalUnitsToday={totalRoomUnits}
          />

          {/* =============================================================== */}
          {/* 4. STRUCTURED ITEMS TABLE (Kitchen Staff Tracking)             */}
          {/* =============================================================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-600" />
                <span>Nomenclature & Quantités à Fabriquer ({items.length})</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium print:hidden">
                Cochez les articles au fur et à mesure de l'avancement en cuisine
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3 w-12 text-center">N°</th>
                    <th className="p-3 w-28">Code / Réf</th>
                    <th className="p-3">Désignation de l'Article</th>
                    <th className="p-3 w-28">Atelier</th>
                    <th className="p-3 w-48 text-right">Réalisé vs. Prévu</th>
                    <th className="p-3">Répartition Magasins</th>
                    <th className="p-3 w-44 text-center print:w-28">Statut & Avancement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        Aucun article n'est actuellement assigné à cet atelier.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const status = itemStatuses[item.id] || 'TODO';
                      const isDone = status === 'COMPLETED';
                      const isInProg = status === 'IN_PROGRESS';
                      const actualQty = getItemActualQuantity(item);
                      const actualRatio =
                        item.totalQuantity > 0 ? Math.round((actualQty / item.totalQuantity) * 100) : 0;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isDone ? 'bg-emerald-50/50' : isInProg ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {/* Row Index */}
                          <td className="p-3 text-center font-mono text-slate-400 font-semibold">
                            {String(index + 1).padStart(2, '0')}
                          </td>

                          {/* Item Code */}
                          <td className="p-3 font-mono font-bold text-slate-700">
                            {item.id.replace(/^id_|^name_/, '').substring(0, 14)}
                          </td>

                          {/* Item Designation & Badges */}
                          <td className="p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-bold ${
                                  isDone ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                              >
                                {item.name}
                              </span>

                              {item.itemType === 'raw_material' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Matière Première
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                  Produit Fini
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {item.category}
                            </span>
                          </td>

                          {/* Target Workshop */}
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {roomMeta.nameFr}
                            </span>
                          </td>

                          {/* Actual vs Expected Quantity Display */}
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              {/* Numbers: Actual / Expected */}
                              <div className="flex items-baseline gap-1 font-mono">
                                <span
                                  className={`text-base font-black ${
                                    isDone
                                      ? 'text-emerald-700'
                                      : isInProg
                                      ? 'text-amber-700'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {actualQty}
                                </span>
                                <span className="text-xs text-slate-400 font-semibold">/</span>
                                <span className="text-xs font-bold text-slate-600">
                                  {item.totalQuantity}
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase ml-0.5">
                                  {item.unit}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isDone
                                      ? 'bg-emerald-500'
                                      : isInProg
                                      ? 'bg-amber-500'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${Math.min(100, actualRatio)}%` }}
                                />
                              </div>

                              {/* Quick Adjustment & Percentage (screen only) */}
                              <div className="flex items-center gap-2 mt-0.5 print:hidden">
                                <span className="text-[10px] font-semibold text-slate-500">
                                  {actualRatio}%
                                </span>
                                <div className="inline-flex items-center rounded border border-slate-200 bg-white shadow-2xs overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateActualQuantity(item.id, actualQty - 1, item.totalQuantity);
                                    }}
                                    className="px-1.5 py-0.2 hover:bg-slate-100 text-slate-600 font-bold transition text-xs"
                                    title="Décrémenter (-1)"
                                  >
                                    -
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateActualQuantity(item.id, actualQty + 1, item.totalQuantity);
                                    }}
                                    className="px-1.5 py-0.2 hover:bg-slate-100 text-slate-600 font-bold transition text-xs border-l border-slate-200"
                                    title="Incrémenter (+1)"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Stores Breakdown */}
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {Object.entries(item.storesBreakdown).map(([stId, detail]) => (
                                <span
                                  key={stId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  <span className="text-slate-500">{detail.storeName}:</span>
                                  <strong className="text-slate-900">
                                    {detail.quantity} {item.unit}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Status & Visual Indicator Badges for Kitchen Staff */}
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              {/* Color-coded Badge distinguishing fully completed vs in-progress */}
                              {isDone ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Terminé</span>
                                </span>
                              ) : isInProg ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                                  <span>En cours</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                                  <span>À faire</span>
                                </span>
                              )}

                              {/* Screen interactive button */}
                              <button
                                type="button"
                                onClick={() => handleToggleItemStatus(item.id, item.totalQuantity)}
                                className={`print:hidden px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border ${
                                  isDone
                                    ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                                    : isInProg
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-2xs'
                                }`}
                                title="Cliquer pour changer le statut"
                              >
                                {isDone ? (
                                  <>Réouvrir</>
                                ) : isInProg ? (
                                  <>
                                    <Check className="w-3 h-3" /> Terminer
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" /> Démarrer
                                  </>
                                )}
                              </button>

                              {/* Print view only indicator */}
                              <span className="hidden print:inline-block text-[11px] font-bold font-mono">
                                {isDone ? '[X] CONFORME' : isInProg ? '[~] EN COURS' : '[ ] EN ATTENTE'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="p-3 text-right uppercase text-xs">
                      Total Unités Ordre de Fabrication :
                    </td>
                    <td className="p-3 text-right text-sm">
                      <div className="font-mono">
                        <span className="text-emerald-700">{totalActualUnits}</span>
                        <span className="text-slate-400 font-normal"> / </span>
                        <span>{totalRoomUnits}</span>{' '}
                        <span className="text-xs font-bold text-slate-500">pcs/kg</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {totalRoomUnits > 0 ? Math.round((totalActualUnits / totalRoomUnits) * 100) : 0}% de la cible
                      </div>
                    </td>
                    <td colSpan={2} className="p-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span>{items.length} articles distincts</span>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {completedCount} terminés
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {inProgressCount} en cours
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes & Quality Guidelines */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Instructions Spécifiques de l'Atelier / Remarques :
            </span>
            <textarea
              value={ofNotes}
              onChange={(e) => setOfNotes(e.target.value)}
              rows={2}
              className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:p-0"
              placeholder="Ajouter des consignes de fabrication spécifiques..."
            />
          </div>

          {/* =============================================================== */}
          {/* 4. SIGNATURE & STAMP BLOCKS (Dual sign-off)                    */}
          {/* =============================================================== */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between h-32">
              <div>
                <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">
                  Visa & Accord Responsable Laboratoire
                </span>
                <span className="text-xs text-slate-600 font-medium mt-0.5 block">
                  {labSupervisor}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 italic border-t border-dashed border-slate-300 pt-2 flex justify-between">
                <span>Date & Heure : ________________</span>
                <span>Signature & Cachet</span>
              </div>
            </div>

            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between h-32">
              <div>
                <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">
                  Visa & Émargement Chef Pâtissier Atelier
                </span>
                <span className="text-xs text-slate-600 font-medium mt-0.5 block">{chefName}</span>
              </div>
              <div className="text-[11px] text-slate-400 italic border-t border-dashed border-slate-300 pt-2 flex justify-between">
                <span>Heure Fin Fabrication : ________</span>
                <span>Signature Opérateur</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. A4 PRINT SPECIFIC STYLESHEET (@media print)                      */}
      {/* =================================================================== */}
      <style>{`
        @media print {
          /* Hide all application chrome, navigation, headers, sidebars */
          nav, header, aside, .print\\:hidden, #app-navigation, #sidebar {
            display: none !important;
          }

          /* Ensure body background is pure white */
          body, html {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* A4 page size and margins */
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }

          /* Prevent table rows from breaking awkwardly across pages */
          tr {
            page-break-inside: avoid !important;
          }

          /* Ensure high-contrast borders and text */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }

          th, td {
            border: 1px solid #cbd5e1 !important;
          }

          /* Remove shadows and rounded borders for clean ink printing */
          * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
