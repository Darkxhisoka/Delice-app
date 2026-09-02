import React from 'react';
import { Requisition, StoreLocation } from '../../types';
import {
  Printer,
  X,
  Building2,
  PackageCheck,
  ChefHat,
  Calendar,
  Clock,
  CheckSquare,
  Truck,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface PackingListModalProps {
  requisition: Requisition;
  store?: StoreLocation;
  onClose: () => void;
}

export const PackingListModal: React.FC<PackingListModalProps> = ({
  requisition,
  store,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedPrintDate = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Print-specific CSS injected dynamically */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-packing-slip, #printable-packing-slip * {
            visibility: visible !important;
          }
          #printable-packing-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 my-auto flex flex-col max-h-[90vh]">
        {/* Modal Toolbar Header (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Bon de Colisage Prêt à Imprimer</h3>
              <p className="text-xs text-slate-400">
                Document de préparation pour l'équipe du laboratoire central & de livraison
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" /> Imprimer le Bon de Colisage
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Packing Sheet Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 bg-white text-slate-900" id="printable-packing-slip">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-600 text-white rounded-xl print:bg-black print:text-white">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    Pâtisserie le Délice
                  </h1>
                  <p className="text-xs font-bold text-amber-800 tracking-wider uppercase print:text-slate-700">
                    Laboratoire Central de Production
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Centre Principal • 100 Rue des Artisans • Tél: (021) 12-34-56
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono text-sm font-black rounded-lg print:border print:border-black print:bg-white print:text-black">
                {requisition.requisitionNumber}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 block print:text-black">
                BON DE PRÉPARATION BOUTIQUE
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Imprimé le : {formattedPrintDate}
              </div>
            </div>
          </div>

          {/* Logistics Meta Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
            {/* Origin & Destination */}
            <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 pr-0 sm:pr-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                MAGASIN DESTINATAIRE
              </span>
              <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600 print:hidden" />
                {requisition.storeName}
              </div>
              <p className="text-slate-600 font-medium">
                {store?.address || 'Adresse Point de Vente'}
              </p>
              <div className="text-slate-500 pt-1">
                <span>Gérant : <strong>{store?.managerName || 'Responsable Magasin'}</strong></span>
                {store?.phone && <span> • Tél: {store.phone}</span>}
              </div>
              <div className="text-slate-500">
                <span>Demandé Par : <strong>{requisition.requestedBy}</strong></span>
              </div>
            </div>

            {/* Schedule & Status */}
            <div className="space-y-1.5 pl-0 sm:pl-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                SÉQUENCE ET STATUT
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 block">Date Commande :</span>
                  <strong className="font-bold text-slate-900">{requisition.dateRequested}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Livraison Requise :</span>
                  <strong className="font-bold text-indigo-700 print:text-black">{requisition.dateNeeded}</strong>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Statut Commande :</span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 print:border-black uppercase">
                  {requisition.status}
                </span>
              </div>

              {requisition.notes && (
                <div className="mt-2 text-[11px] bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-900 print:bg-slate-100 print:border-slate-300">
                  <strong>Note du Magasin :</strong> {requisition.notes}
                </div>
              )}
            </div>
          </div>

          {/* Packing Checklist Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-emerald-600 print:hidden" />
                Liste de Colisage du Laboratoire ({requisition.items.length} Articles)
              </h4>
              <span className="text-[10px] text-slate-500 italic">
                Personnel labo : Vérifiez la quantité et cochez chaque article lors de l'emballage
              </span>
            </div>

            <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider print:bg-slate-100 print:text-black print:border-b-2 print:border-black">
                    <th className="p-2.5 w-10 text-center">Coché</th>
                    <th className="p-2.5 min-w-[180px]">Désignation Article</th>
                    <th className="p-2.5 w-32">Catégorie</th>
                    <th className="p-2.5 w-24 text-center">Qté Demandée</th>
                    <th className="p-2.5 w-24 text-center">Qté Emballée</th>
                    <th className="p-2.5 w-32 text-center">Temp. Stockage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white">
                  {requisition.items.map((item, idx) => {
                    let tempRequirement = 'Temp. Ambiante (18-22°C)';
                    if (item.category.includes('Cakes') || item.category.includes('Gâteaux') || item.category.includes('Fillings') || item.category.includes('Desserts')) {
                      tempRequirement = 'Refrigéré (2-4°C)';
                    } else if (item.category.includes('Tart') || item.category.includes('Bases')) {
                      tempRequirement = 'Frais ou Sec';
                    }

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        {/* Checkbox for lab staff */}
                        <td className="p-2.5 text-center border-r border-slate-200">
                          <div className="w-5 h-5 border-2 border-slate-800 rounded-md mx-auto flex items-center justify-center font-bold text-slate-900">
                            {/* Empty checkbox box for pen marking */}
                          </div>
                        </td>

                        {/* Item Name */}
                        <td className="p-2.5 font-extrabold text-slate-900">
                          {item.productName}
                        </td>

                        {/* Category */}
                        <td className="p-2.5 text-slate-600 font-medium">
                          {item.category}
                        </td>

                        {/* Quantity Requested */}
                        <td className="p-2.5 text-center font-black text-sm text-slate-900 bg-slate-50 print:bg-white">
                          {item.quantityRequested} {item.unit}
                        </td>

                        {/* Packed Quantity blank column */}
                        <td className="p-2.5 text-center border-x border-slate-200 text-slate-400 font-mono">
                          [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                        </td>

                        {/* Storage Requirement */}
                        <td className="p-2.5 text-center text-[10px] font-semibold text-slate-700">
                          {tempRequirement}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quality Assurance & Dispatch Protocol */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-800 rounded-xs shrink-0" />
              <span className="font-semibold text-slate-800">Qualité Visuelle & Décoration Inspectées</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-800 rounded-xs shrink-0" />
              <span className="font-semibold text-slate-800">Chaîne du Froid Vérifiée</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-800 rounded-xs shrink-0" />
              <span className="font-semibold text-slate-800">Scellés de Livraison Intacts</span>
            </div>
          </div>

          {/* Official Signatures & Verification Section */}
          <div className="pt-4 border-t-2 border-slate-900 space-y-4">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              Chaîne de Traçabilité & Signatures de Réception
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              
              {/* Lab Kitchen Baker Sign */}
              <div className="space-y-6 bg-slate-50/80 p-3 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  1. Chef Pâtissier / Emballeur
                </span>
                <div className="border-b border-slate-800 h-8" />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Nom & Signature</span>
                  <span>Date / Heure</span>
                </div>
              </div>

              {/* Delivery Driver Sign */}
              <div className="space-y-6 bg-slate-50/80 p-3 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  2. Chauffeur / Livreure
                </span>
                <div className="border-b border-slate-800 h-8" />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Signature & Véhicule</span>
                  <span>Heure Départ</span>
                </div>
              </div>

              {/* Retail Store Receiving Sign */}
              <div className="space-y-6 bg-slate-50/80 p-3 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  3. Responsable Réception Magasin
                </span>
                <div className="border-b border-slate-800 h-8" />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Signature & Accord</span>
                  <span>Date Réception</span>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3 print:text-slate-600">
            Système d'Exploitation Pâtisserie le Délice • ID Commande: {requisition.id} • Copie Blanche: Archives Labo | Copie Jaune: Point de Vente
          </div>

        </div>

        {/* Modal Toolbar Footer (Hidden on Print) */}
        <div className="no-print bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Conseil: Cliquer sur "Imprimer le Bon de Colisage" ouvre l'imprimante ou la sauvegarde PDF.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-300"
            >
              Fermer La Fenêtre
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
            >
              <Printer className="w-4 h-4" /> Imprimer le Bon
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
