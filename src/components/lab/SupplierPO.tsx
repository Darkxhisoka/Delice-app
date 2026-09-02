import React, { useState, useEffect } from 'react';
import {
  RawMaterial,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem
} from '../../types';
import {
  getRawMaterials,
  getSuppliers,
  getPurchaseOrders,
  savePurchaseOrder,
  subscribeToStoreChanges,
  notifyToast
} from '../../services/storage';
import {
  ShoppingCart,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  Clock,
  Printer,
  Send,
  Building2,
  ChevronRight,
  Package,
  DollarSign,
  Search,
  Filter,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const SupplierPO: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'LOW_STOCK_ALERTS' | 'PO_HISTORY'>('LOW_STOCK_ALERTS');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');

  // Generator Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftPO, setDraftPO] = useState<Partial<PurchaseOrder> | null>(null);

  const loadData = () => {
    setMaterials(getRawMaterials());
    setSuppliers(getSuppliers());
    setPurchaseOrders(getPurchaseOrders());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  // Compute materials below threshold
  const lowStockMaterials = materials.filter((m) => {
    const minThreshold = m.min_reorder_level ?? m.reorderLevel;
    return m.currentStock <= minThreshold;
  });

  const filteredLowStock = lowStockMaterials.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate 1-Click PO for low stock items
  const handleGenerate1ClickPO = (supplierId?: string) => {
    const targetSupplier = supplierId && supplierId !== 'ALL'
      ? suppliers.find((s) => s.id === supplierId)
      : suppliers[0];

    const targetSupplierName = targetSupplier ? targetSupplier.name : 'Fournisseur Général / Central';
    const targetSupplierId = targetSupplier ? targetSupplier.id : 'sup-general';

    // Build line items for items needing reorder
    const itemsToOrder: PurchaseOrderItem[] = lowStockMaterials.map((m) => {
      const minLevel = m.min_reorder_level ?? m.reorderLevel;
      // Target safety stock level = minLevel * 2.5
      const targetStock = Math.ceil(minLevel * 2.5);
      const neededQty = Math.max(0, targetStock - m.currentStock);
      const unitCost = m.currentAvgCost || 5.0;

      return {
        id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        rawMaterialId: m.id,
        rawMaterialName: m.name,
        category: m.category,
        unit: m.unit,
        currentStock: m.currentStock,
        minReorderLevel: minLevel,
        quantityToOrder: neededQty > 0 ? neededQty : 10,
        unitCost: unitCost,
        totalCost: (neededQty > 0 ? neededQty : 10) * unitCost
      };
    });

    if (itemsToOrder.length === 0) {
      notifyToast({
        type: 'info',
        title: 'Aucun Réapprovisionnement Requis',
        message: 'Tous les stocks de matières premières sont au-dessus des seuils de réapprovisionnement.'
      });
      return;
    }

    const totalAmount = itemsToOrder.reduce((acc, item) => acc + item.totalCost, 0);

    const dateStr = new Date().toISOString().split('T')[0];
    const poNumber = `PO-${dateStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    setDraftPO({
      id: `po-${Date.now()}`,
      poNumber,
      supplierId: targetSupplierId,
      supplierName: targetSupplierName,
      date: dateStr,
      expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'DRAFT',
      items: itemsToOrder,
      totalAmount,
      createdBy: 'Labo Central - Supply System',
      notes: 'Bon de commande généré automatiquement d\'après les alertes de stock minimum.'
    });

    setIsModalOpen(true);
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (!draftPO || !draftPO.items) return;
    const updatedItems = [...draftPO.items];
    const qty = Math.max(1, newQty);
    updatedItems[index].quantityToOrder = qty;
    updatedItems[index].totalCost = qty * updatedItems[index].unitCost;

    const totalAmount = updatedItems.reduce((acc, item) => acc + item.totalCost, 0);

    setDraftPO({
      ...draftPO,
      items: updatedItems,
      totalAmount
    });
  };

  const handleSaveAndSendPO = (status: 'DRAFT' | 'SENT') => {
    if (!draftPO || !draftPO.items || draftPO.items.length === 0) return;

    const finalPO: PurchaseOrder = {
      id: draftPO.id || `po-${Date.now()}`,
      poNumber: draftPO.poNumber || 'PO-GEN',
      supplierId: draftPO.supplierId || 'sup-1',
      supplierName: draftPO.supplierName || 'Fournisseur',
      date: draftPO.date || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: draftPO.expectedDeliveryDate,
      status: status,
      items: draftPO.items,
      totalAmount: draftPO.totalAmount || 0,
      createdBy: draftPO.createdBy || 'Responsable Achats',
      notes: draftPO.notes
    };

    savePurchaseOrder(finalPO);
    setIsModalOpen(false);
    setDraftPO(null);

    notifyToast({
      type: 'success',
      title: status === 'SENT' ? 'Bon de Commande Transmis' : 'Brouillon de Commande Enregistré',
      message: `Le bon ${finalPO.poNumber} (${finalPO.totalAmount.toFixed(2)} DZD) a été ${status === 'SENT' ? 'transmis au fournisseur' : 'sauvegardé'}.`
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span>Gestion des Achats & Réapprovisionnement Fournisseurs</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Réapprovisionnement Automatisé & Bons de Commande</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Calcul automatique des quantités manquantes d'après le seuil <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">min_reorder_level</code> et génération en 1-click des Bons de Commande (PO) Fournisseurs.
          </p>
        </div>

        <button
          onClick={() => handleGenerate1ClickPO()}
          disabled={lowStockMaterials.length === 0}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 shrink-0 transform active:scale-95 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>⚡ Générer Bon de Commande (PO Express)</span>
        </button>
      </div>

      {/* Alert KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-800 font-bold uppercase tracking-wider block">Matières en Alerte Stock</span>
            <span className="text-2xl font-black text-amber-950">{lowStockMaterials.length} Articles</span>
            <span className="text-[10px] text-amber-700 block mt-0.5">Sous le seuil minimum configuré</span>
          </div>
          <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-indigo-800 font-bold uppercase tracking-wider block">Estimation Budget Requis</span>
            <span className="text-2xl font-black text-indigo-950">
              {lowStockMaterials
                .reduce((acc, m) => {
                  const minLvl = m.min_reorder_level ?? m.reorderLevel;
                  const target = Math.ceil(minLvl * 2.5);
                  return acc + Math.max(0, target - m.currentStock) * (m.currentAvgCost || 5);
                }, 0)
                .toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
            </span>
            <span className="text-[10px] text-indigo-700 block mt-0.5">Pour retour au niveau de sécurité</span>
          </div>
          <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-700">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 text-white border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Bons de Commande Actifs</span>
            <span className="text-2xl font-black">{purchaseOrders.length} POs</span>
            <span className="text-[10px] text-amber-400 block mt-0.5">
              {purchaseOrders.filter((p) => p.status === 'SENT').length} en attente de livraison supplier
            </span>
          </div>
          <div className="p-3 bg-slate-800 rounded-2xl text-amber-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-4">
        <button
          onClick={() => setActiveSubTab('LOW_STOCK_ALERTS')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'LOW_STOCK_ALERTS'
              ? 'border-amber-500 text-slate-900 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Alertes Stock Bas ({lowStockMaterials.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('PO_HISTORY')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'PO_HISTORY'
              ? 'border-indigo-600 text-slate-900 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Historique des Bons de Commande ({purchaseOrders.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: LOW STOCK ALERTS */}
      {activeSubTab === 'LOW_STOCK_ALERTS' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer matière première..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Fournisseur :</span>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
              >
                <option value="ALL">Tous les fournisseurs</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Low Stock Table */}
          {filteredLowStock.length === 0 ? (
            <div className="bg-emerald-50/50 border border-emerald-200 p-8 rounded-3xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-950">Aucun Article sous le Seuil Critique</h3>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                Toutes vos matières premières (farines, beurre AOP, chocolats, etc.) disposent d'un niveau de stock suffisant pour alimenter la production du Labo Central.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <span className="text-xs font-bold">Tableau d'Alerte Réapprovisionnement Materiel</span>
                <span className="text-[11px] text-amber-400 font-medium">
                  Seuil min_reorder_level configuré par article
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Matière Première & SKU</th>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3 text-right">Stock Actuel</th>
                      <th className="p-3 text-right">Seuil Min (min_reorder_level)</th>
                      <th className="p-3">Jauge Ratios</th>
                      <th className="p-3 text-right">Quantité Suggérée</th>
                      <th className="p-3 text-right">Cout Moyen / Unité</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredLowStock.map((m) => {
                      const minLvl = m.min_reorder_level ?? m.reorderLevel;
                      const ratio = Math.min(100, Math.round((m.currentStock / minLvl) * 100));
                      const suggestedQty = Math.max(10, Math.ceil(minLvl * 2.5) - m.currentStock);
                      const estimatedCost = suggestedQty * (m.currentAvgCost || 5);

                      return (
                        <tr key={m.id} className="hover:bg-amber-50/50 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{m.sku}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {m.category}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-amber-700">
                            {m.currentStock} {m.unit}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800">
                            {minLvl} {m.unit}
                          </td>
                          <td className="p-3">
                            <div className="w-28 bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  ratio < 30 ? 'bg-red-500' : ratio < 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 font-semibold">{ratio}% du seuil</span>
                          </td>
                          <td className="p-3 text-right font-black text-indigo-900">
                            +{suggestedQty} {m.unit}
                          </td>
                          <td className="p-3 text-right text-slate-700">
                            {m.currentAvgCost ? `${m.currentAvgCost.toFixed(2)} DZD` : '5.00 DZD'}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleGenerate1ClickPO()}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-[11px] inline-flex items-center gap-1 shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Commander</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: PO HISTORY */}
      {activeSubTab === 'PO_HISTORY' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-black text-slate-900 text-sm">{po.poNumber}</span>
                    <p className="text-xs text-slate-500">{po.supplierName}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      po.status === 'SENT'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : po.status === 'RECEIVED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {po.status === 'SENT' ? 'En Cours Expédition' : po.status === 'RECEIVED' ? 'Livré & Réceptionné' : 'Brouillon'}
                  </span>
                </div>

                <div className="space-y-1">
                  {po.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs py-1 text-slate-700">
                      <span>{item.rawMaterialName} ({item.quantityToOrder} {item.unit})</span>
                      <span className="font-bold">{item.totalCost.toFixed(2)} DZD</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Date: {po.date}</span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Montant Total</span>
                    <span className="text-base font-black text-slate-950">{po.totalAmount.toFixed(2)} DZD</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PO PREVIEW MODAL */}
      {isModalOpen && draftPO && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base">{draftPO.poNumber} — Bon de Commande Fournisseur</h3>
                  <p className="text-xs text-slate-300">Généré automatiquement par l'assistant Supply Chain</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Fournisseur Destinataire :</span>
                  <select
                    value={draftPO.supplierId}
                    onChange={(e) => {
                      const sup = suppliers.find((s) => s.id === e.target.value);
                      setDraftPO({
                        ...draftPO,
                        supplierId: e.target.value,
                        supplierName: sup ? sup.name : draftPO.supplierName
                      });
                    }}
                    className="mt-1 font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-2.5 py-1 w-full"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Date d'Émission :</span>
                  <div className="font-bold text-slate-900 mt-1">{draftPO.date}</div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">Détail des Articles à Commander :</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Matière Première</th>
                        <th className="p-3 text-right">Quantité à Commander</th>
                        <th className="p-3 text-right">Prix Unitaire</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {draftPO.items?.map((item, index) => (
                        <tr key={item.id}>
                          <td className="p-3 font-bold text-slate-900">
                            {item.rawMaterialName}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              Stock actuel : {item.currentStock} {item.unit}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min={1}
                              value={item.quantityToOrder}
                              onChange={(e) => handleUpdateItemQty(index, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-amber-500/20"
                            />
                            <span className="ml-1 font-bold text-slate-600">{item.unit}</span>
                          </td>
                          <td className="p-3 text-right text-slate-700">{item.unitCost.toFixed(2)} DZD</td>
                          <td className="p-3 text-right font-black text-slate-950">{item.totalCost.toFixed(2)} DZD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-bold uppercase block">Montant Total Hors Taxe</span>
                  <span className="text-2xl font-black text-amber-600">
                    {draftPO.totalAmount?.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => handleSaveAndSendPO('DRAFT')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Sauvegarder Brouillon
              </button>

              <button
                onClick={() => handleSaveAndSendPO('SENT')}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Transmettre Bon de Commande au Fournisseur</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
