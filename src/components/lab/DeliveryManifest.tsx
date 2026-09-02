import React, { useState, useEffect } from 'react';
import { DeliveryManifest, Requisition } from '../../types';
import {
  getDeliveryManifests,
  createDeliveryManifest,
  getRequisitions,
  getStores,
  subscribeToStoreChanges,
  getTransitWasteLogs
} from '../../services/storage';
import {
  Truck,
  FileText,
  Plus,
  Check,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  Printer,
  Download,
  AlertTriangle,
  X,
  Search,
  ChevronRight,
  PackageCheck,
  CheckCircle2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const DeliveryManifestView: React.FC = () => {
  const [manifests, setManifests] = useState<DeliveryManifest[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [stores, setStores] = useState(getStores());
  const [transitWasteLogs, setTransitWasteLogs] = useState(getTransitWasteLogs());

  // Modal State for new manifest creation
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [driverName, setDriverName] = useState('Karim Bouzid');
  const [driverPhone, setDriverPhone] = useState('(555) 987-6543');
  const [vehiclePlate, setVehiclePlate] = useState('16-342-99');
  const [routeArea, setRouteArea] = useState('North Metro - Express Route');
  const [manifestNotes, setManifestNotes] = useState('Transport sous température contrôlée (4°C). Livrer avant ouverture du magasin.');

  // Transfer Slip Printable Modal
  const [viewingManifest, setViewingManifest] = useState<DeliveryManifest | null>(null);

  const loadData = () => {
    setManifests(getDeliveryManifests());
    setRequisitions(getRequisitions());
    setStores(getStores());
    setTransitWasteLogs(getTransitWasteLogs());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  // Filter ready requisitions that can be grouped into a delivery manifest
  const readyForDispatchReqs = requisitions.filter(
    (r) => r.status === 'READY_FOR_DISPATCH' || r.status === 'APPROVED' || r.status === 'IN_PRODUCTION' || r.status === 'PROCESSING'
  );

  const handleToggleReqSelection = (reqId: string) => {
    setSelectedReqIds((prev) =>
      prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId]
    );
  };

  const handleCreateManifestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReqIds.length === 0) return;

    const selectedReqs = requisitions.filter((r) => selectedReqIds.includes(r.id));
    const storeIds = Array.from(new Set(selectedReqs.map((r) => r.storeId))) as string[];
    const storeNames = Array.from(new Set(selectedReqs.map((r) => r.storeName))) as string[];

    // Flatten items from all selected requisitions
    const items = selectedReqs.flatMap((req) =>
      req.items.map((item, idx) => ({
        id: `mitem-${req.id}-${idx}`,
        requisitionId: req.id,
        requisitionNumber: req.requisitionNumber,
        storeId: req.storeId,
        storeName: req.storeName,
        productId: item.id,
        productName: item.productName,
        category: item.category,
        quantityRequested: item.quantityRequested,
        quantityDispatched: item.fulfilledQuantity ?? item.quantityRequested,
        unit: item.unit,
        unitCost: item.unitEstimatedCost || 1.5,
        sellingPrice: (item.unitEstimatedCost || 1.5) * 2.5
      }))
    );

    const newManifest = createDeliveryManifest({
      date: new Date().toISOString().slice(0, 10),
      driverName,
      driverPhone,
      vehiclePlate,
      routeArea,
      status: 'IN_TRANSIT',
      requisitionIds: selectedReqIds,
      storeIds,
      storeNames,
      items,
      notes: manifestNotes,
      createdBy: 'Pierre (Chef de Lab)',
      dispatchedAt: new Date().toISOString()
    });

    setIsCreatingModalOpen(false);
    setSelectedReqIds([]);
    setViewingManifest(newManifest);
  };

  // Generate PDF Transfer Slip using jsPDF
  const handleExportPDF = (manifest: DeliveryManifest) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CENTRAL LAB PASTRY - BORDEREAU DE LIVRAISON', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° Manifeste : ${manifest.manifestNumber} | Date : ${manifest.date}`, 14, 27);

    // Metadata section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS LOGISTIQUE & LIVRAISON', 14, 45);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Chauffeur-Livreur : ${manifest.driverName} (${manifest.driverPhone || 'N/A'})`, 14, 52);
    doc.text(`Immatriculation Véhicule : ${manifest.vehiclePlate || 'N/A'}`, 14, 58);
    doc.text(`Secteur / Tournée : ${manifest.routeArea || 'Standard'}`, 14, 64);
    doc.text(`Boutiques Destinataires : ${manifest.storeNames.join(', ')}`, 14, 70);

    // Items Table
    const tableData = manifest.items.map((item, idx) => [
      idx + 1,
      item.storeName,
      item.requisitionNumber,
      item.productName,
      `${item.quantityDispatched} ${item.unit}`,
      '________',
      '________'
    ]);

    autoTable(doc, {
      startY: 76,
      head: [['#', 'Magasin Destination', 'Requisition N°', 'Pâtisserie / Produit', 'Qté Expédiée', 'Qté Reçue', 'Écart/Casse']],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      theme: 'grid'
    });

    // Notes & Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Notes d'Expédition : ${manifest.notes || 'Aucune note particulière'}`, 14, finalY);

    // Signatures box
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, finalY + 8, 88, 30);
    doc.rect(108, finalY + 8, 88, 30);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Signature Chauffeur-Livreur:', 18, finalY + 16);
    doc.text('Signature & Tampon Magasin Récepteur:', 112, finalY + 16);

    if (manifest.driverSignature) {
      doc.setFont('helvetica', 'italic');
      doc.text(manifest.driverSignature, 18, finalY + 28);
    }
    if (manifest.verifiedByStoreWorker) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Vérifié par: ${manifest.verifiedByStoreWorker}`, 112, finalY + 28);
    }

    doc.save(`TransferSlip_${manifest.manifestNumber}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Module 2 : Expédition Central Lab & Manifestes de Livraison</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestion du pipeline logistique requisitions (En Attente → En Production → Prêt à l'Expédition → En Transit → Livré) & génération des bordereaux de transfert.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Créer Manifeste de Livraison</span>
        </button>
      </div>

      {/* Logistics Pipeline Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <div className="flex items-center justify-between text-slate-500 font-semibold">
            <span>1. En Attente</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {requisitions.filter((r) => r.status === 'PENDING').length} requisition(s)
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs">
          <div className="flex items-center justify-between text-amber-800 font-semibold">
            <span>2. En Production</span>
            <PackageCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1 text-lg font-black text-amber-950">
            {requisitions.filter((r) => r.status === 'IN_PRODUCTION' || r.status === 'PROCESSING').length} commande(s)
          </div>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 text-xs">
          <div className="flex items-center justify-between text-indigo-800 font-semibold">
            <span>3. Prêt Expédition</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-1 text-lg font-black text-indigo-950">
            {readyForDispatchReqs.length} prête(s)
          </div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-xs">
          <div className="flex items-center justify-between text-purple-800 font-semibold">
            <span>4. En Transit (Camion)</span>
            <Truck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1 text-lg font-black text-purple-950">
            {manifests.filter((m) => m.status === 'IN_TRANSIT').length} camion(s)
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs">
          <div className="flex items-center justify-between text-emerald-800 font-semibold">
            <span>5. Livré & Vérifié</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-lg font-black text-emerald-950">
            {requisitions.filter((r) => r.status === 'DELIVERED').length} livrée(s)
          </div>
        </div>

      </div>

      {/* Manifests List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Bordereaux de Livraison & Run Sheets Actifs</span>
        </h3>

        {manifests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="mt-2 font-bold text-slate-700">Aucun manifeste de livraison créé pour le moment.</p>
            <p className="text-xs text-slate-400 mt-1">Cliquez sur "+ Créer Manifeste de Livraison" pour grouper les commandes prêtes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {manifests.map((manifest) => (
              <div key={manifest.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-900 text-white">
                        {manifest.manifestNumber}
                      </span>
                      {manifest.status === 'IN_TRANSIT' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> EN TRANSIT
                        </span>
                      )}
                      {manifest.status === 'DELIVERED' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> LIVRÉ & RÉCEPTIONNÉ
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">{manifest.date}</span>
                    </div>

                    <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Chauffeur : <strong>{manifest.driverName}</strong> ({manifest.vehiclePlate || 'N/A'})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> Secteur : <strong>{manifest.routeArea || 'Standard'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingManifest(manifest)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Aperçu Bordereau</span>
                    </button>
                    <button
                      onClick={() => handleExportPDF(manifest)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-xs font-bold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger PDF</span>
                    </button>
                  </div>

                </div>

                {/* Stores & Items Summary */}
                <div className="mt-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500">Boutiques Destination ({manifest.storeNames.length}) :</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {manifest.storeNames.map((stName) => (
                        <span key={stName} className="px-2 py-1 rounded-md bg-slate-100 font-medium text-slate-700">
                          {stName}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-500">Contenu ({manifest.items.length} articles) :</span>
                    <div className="text-slate-600 mt-1 line-clamp-2 font-medium">
                      {manifest.items.map((it) => `${it.productName} (${it.quantityDispatched} ${it.unit})`).join(' • ')}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MANIFEST MODAL */}
      {isCreatingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  <span>Grouper Requisitions dans un Manifeste d'Expédition</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sélectionnez les commandes boutiques prêtes à être chargées dans le camion du livreur.
                </p>
              </div>
              <button
                onClick={() => setIsCreatingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManifestSubmit} className="mt-4 space-y-4">
              
              {/* Select Ready Requisitions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  1. Sélectionner les Commandes à Livrer ({selectedReqIds.length} sélectionnée(s)) :
                </label>

                {readyForDispatchReqs.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    <p className="font-bold">Aucune requisition n'est actuellement en statut "Prêt à l'Expédition".</p>
                    <p className="mt-1 text-slate-600">Vous pouvez tout de même sélectionner n'importe quelle requisition active ci-dessous pour tester l'expédition :</p>
                    <div className="mt-2 space-y-1.5">
                      {requisitions.slice(0, 4).map((req) => (
                        <label key={req.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={selectedReqIds.includes(req.id)}
                            onChange={() => handleToggleReqSelection(req.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold font-mono text-slate-900">{req.requisitionNumber}</span>
                          <span className="text-slate-600 font-medium">• {req.storeName}</span>
                          <span className="ml-auto text-slate-400 font-mono">({req.items.length} articles)</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {readyForDispatchReqs.map((req) => (
                      <label
                        key={req.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                          selectedReqIds.includes(req.id)
                            ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedReqIds.includes(req.id)}
                            onChange={() => handleToggleReqSelection(req.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-bold">{req.requisitionNumber} — {req.storeName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {req.items.map((i) => `${i.productName} (${i.quantityRequested})`).join(', ')}
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          {req.items.length} articles
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Driver & Logistics Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nom Chauffeur-Livreur</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone Chauffeur</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plaque Immatriculation Camion</label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secteur / Tournée</label>
                  <input
                    type="text"
                    value={routeArea}
                    onChange={(e) => setRouteArea(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instructions Logistique / Remarques</label>
                <textarea
                  value={manifestNotes}
                  onChange={(e) => setManifestNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={selectedReqIds.length === 0}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold shadow-sm flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  <span>Valider & Passer en TRANSIT</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* VIEW TRANSFER SLIP MODAL */}
      {viewingManifest && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Bordereau de Transfert & Bon de Livraison (Transfer Slip)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportPDF(viewingManifest)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger PDF</span>
                </button>
                <button
                  onClick={() => setViewingManifest(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Transfer Slip Document */}
            <div className="mt-6 p-6 border-2 border-slate-300 rounded-xl bg-white text-slate-900 space-y-6 text-xs font-sans">
              
              {/* Slip Header */}
              <div className="flex items-start justify-between border-b border-slate-900 pb-4">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">CENTRAL LAB PASTRY</h1>
                  <p className="text-[11px] text-slate-600">Unité Centrale de Production & Transferts Inter-Magasins</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-black text-indigo-900 bg-indigo-50 px-3 py-1 rounded border border-indigo-200">
                    {viewingManifest.manifestNumber}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">Date : {viewingManifest.date}</p>
                </div>
              </div>

              {/* Logistics Metadata */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 uppercase text-[10px]">Chauffeur & Logistique :</span>
                  <p className="mt-1 font-semibold text-slate-900">{viewingManifest.driverName} ({viewingManifest.driverPhone || 'N/A'})</p>
                  <p className="text-slate-600">Immatriculation : {viewingManifest.vehiclePlate}</p>
                  <p className="text-slate-600">Secteur : {viewingManifest.routeArea}</p>
                </div>

                <div>
                  <span className="font-bold text-slate-800 uppercase text-[10px]">Magasins Destinataires :</span>
                  <p className="mt-1 font-semibold text-slate-900">{viewingManifest.storeNames.join(', ')}</p>
                  <p className="text-slate-600">Statut : <strong className="uppercase">{viewingManifest.status}</strong></p>
                </div>
              </div>

              {/* Itemized Table */}
              <div>
                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-300">
                      <th className="p-2 border border-slate-300">#</th>
                      <th className="p-2 border border-slate-300">Magasin</th>
                      <th className="p-2 border border-slate-300">Requisition</th>
                      <th className="p-2 border border-slate-300">Article Pâtisserie</th>
                      <th className="p-2 border border-slate-300 text-center">Qté Expédiée</th>
                      <th className="p-2 border border-slate-300 text-center">Qté Reçue</th>
                      <th className="p-2 border border-slate-300 text-center">Avis / Casse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingManifest.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300 font-mono">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-bold">{item.storeName}</td>
                        <td className="p-2 border border-slate-300 font-mono text-[11px]">{item.requisitionNumber}</td>
                        <td className="p-2 border border-slate-300 font-semibold">{item.productName}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold">{item.quantityDispatched} {item.unit}</td>
                        <td className="p-2 border border-slate-300 text-center text-slate-400">______</td>
                        <td className="p-2 border border-slate-300 text-center text-slate-400">______</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-4 grid grid-cols-2 gap-6 border-t border-slate-300">
                <div className="border border-slate-300 p-3 rounded-lg h-24 flex flex-col justify-between">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Signature Chauffeur-Livreur :</span>
                  <div className="text-slate-400 italic text-[11px]">{viewingManifest.driverName}</div>
                </div>

                <div className="border border-slate-300 p-3 rounded-lg h-24 flex flex-col justify-between">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Signature & Cachet Magasin Récepteur :</span>
                  <div className="text-slate-400 italic text-[11px]">
                    {viewingManifest.verifiedByStoreWorker ? `Vérifié par : ${viewingManifest.verifiedByStoreWorker}` : 'En attente de réception...'}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
