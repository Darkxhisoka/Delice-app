import React, { useState, useEffect } from 'react';
import {
  RawMaterial,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  MaterialUnit
} from '../../types';
import {
  getRawMaterials,
  getSuppliers,
  getPurchaseOrders,
  savePurchaseOrder,
  deletePurchaseOrder,
  updatePurchaseOrderStatus,
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
  Package,
  DollarSign,
  Search,
  Sparkles,
  Trash2,
  Edit3,
  FilePlus,
  Calendar,
  X,
  FileText
} from 'lucide-react';

export const SupplierPO: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'LOW_STOCK_ALERTS' | 'PO_HISTORY'>('LOW_STOCK_ALERTS');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Generator / Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftPO, setDraftPO] = useState<Partial<PurchaseOrder> | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);

  // In-Modal Product Addition State
  const [isAddProductSectionOpen, setIsAddProductSectionOpen] = useState(true);
  const [addMode, setAddMode] = useState<'EXISTING' | 'CUSTOM'>('EXISTING');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(10);
  const [addUnitCost, setAddUnitCost] = useState<number>(0);
  const [customName, setCustomName] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<MaterialUnit>('kg');
  const [customCategory, setCustomCategory] = useState<string>('Matière Première');

  // Print Preview Modal State
  const [printPO, setPrintPO] = useState<PurchaseOrder | null>(null);

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
    const minThreshold = m.min_reorder_level ?? m.reorderLevel ?? 0;
    return m.currentStock <= minThreshold;
  });

  const filteredLowStock = lowStockMaterials.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered Purchase Orders
  const filteredPOs = purchaseOrders.filter((po) => {
    const matchStatus = statusFilter === 'ALL' || po.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      po.poNumber.toLowerCase().includes(q) ||
      po.supplierName.toLowerCase().includes(q) ||
      po.items.some((i) => i.rawMaterialName.toLowerCase().includes(q));
    return matchStatus && matchQuery;
  });

  // 1. GENERATE AUTOMATIC PO (PO EXPRESS)
  const handleGenerate1ClickPO = (supplierId?: string, singleMaterialId?: string) => {
    const targetSupplier = supplierId && supplierId !== 'ALL'
      ? suppliers.find((s) => s.id === supplierId)
      : suppliers[0];

    const targetSupplierName = targetSupplier ? targetSupplier.name : 'Fournisseur Général / Multi-sources';
    const targetSupplierId = targetSupplier ? targetSupplier.id : 'sup-general';

    // Which materials to include
    let sourceMats = lowStockMaterials;
    if (singleMaterialId) {
      const single = materials.find((m) => m.id === singleMaterialId);
      if (single) sourceMats = [single];
    }

    if (sourceMats.length === 0) {
      notifyToast({
        type: 'info',
        title: 'Aucun Stock en Alerte',
        message: 'Tous les stocks sont au-dessus des seuils. Vous pouvez créer un Bon de Commande Manuel.'
      });
      handleCreateManualPO(supplierId);
      return;
    }

    const itemsToOrder: PurchaseOrderItem[] = sourceMats.map((m) => {
      const minLevel = m.min_reorder_level ?? m.reorderLevel ?? 0;
      const targetStock = Math.ceil(minLevel * 2.5);
      const neededQty = Math.max(0, targetStock - m.currentStock);
      const unitCost = m.currentAvgCost || 5.0;
      const qty = neededQty > 0 ? neededQty : 10;

      return {
        id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        rawMaterialId: m.id,
        rawMaterialName: m.name,
        category: m.category,
        unit: m.unit,
        currentStock: m.currentStock,
        minReorderLevel: minLevel,
        quantityToOrder: qty,
        unitCost: unitCost,
        totalCost: qty * unitCost
      };
    });

    const totalAmount = itemsToOrder.reduce((acc, item) => acc + item.totalCost, 0);
    const dateStr = new Date().toISOString().split('T')[0];
    const poNumber = `BC-AUTO-${dateStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    setIsManualMode(false);
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
      notes: 'Bon de commande généré automatiquement selon le seuil minimum de réapprovisionnement.'
    });

    // Reset add item inputs
    setSelectedMaterialId('');
    setAddQuantity(10);
    setAddUnitCost(0);
    setIsModalOpen(true);
  };

  // 2. CREATE MANUAL PO (BON DE COMMANDE MANUEL)
  const handleCreateManualPO = (supplierId?: string) => {
    const targetSupplier = supplierId && supplierId !== 'ALL'
      ? suppliers.find((s) => s.id === supplierId)
      : suppliers[0];

    const targetSupplierName = targetSupplier ? targetSupplier.name : 'Fournisseur Général / Central';
    const targetSupplierId = targetSupplier ? targetSupplier.id : 'sup-general';

    const dateStr = new Date().toISOString().split('T')[0];
    const poNumber = `BC-MAN-${dateStr.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    setIsManualMode(true);
    setDraftPO({
      id: `po-${Date.now()}`,
      poNumber,
      supplierId: targetSupplierId,
      supplierName: targetSupplierName,
      date: dateStr,
      expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'DRAFT',
      items: [],
      totalAmount: 0,
      createdBy: 'Responsable Approvisionnement',
      notes: 'Bon de commande manuel rédigé pour réapprovisionnement ponctuel.'
    });

    // Reset add item inputs
    setSelectedMaterialId('');
    setAddQuantity(10);
    setAddUnitCost(0);
    setCustomName('');
    setIsModalOpen(true);
  };

  // 3. EDIT EXISTING PO
  const handleEditExistingPO = (po: PurchaseOrder) => {
    setIsManualMode(po.poNumber.includes('MAN'));
    setDraftPO({ ...po, items: [...po.items] });
    setSelectedMaterialId('');
    setAddQuantity(10);
    setAddUnitCost(0);
    setCustomName('');
    setIsModalOpen(true);
  };

  // Handle selecting material in add product bar
  const handleSelectMaterial = (matId: string) => {
    setSelectedMaterialId(matId);
    const mat = materials.find((m) => m.id === matId);
    if (mat) {
      setAddUnitCost(mat.currentAvgCost || 5.0);
      const minLevel = mat.min_reorder_level ?? mat.reorderLevel ?? 5;
      const suggested = Math.max(1, Math.ceil(minLevel * 2) - mat.currentStock);
      setAddQuantity(suggested > 0 ? suggested : 10);
    }
  };

  // 4. ADD PRODUCT TO DRAFT PO (WORKS FOR BOTH AUTOMATIC AND MANUAL PO)
  const handleAddProductToDraft = () => {
    if (!draftPO) return;

    let newItem: PurchaseOrderItem;

    if (addMode === 'EXISTING') {
      if (!selectedMaterialId) {
        notifyToast({
          type: 'warning',
          title: 'Sélection requise',
          message: 'Veuillez sélectionner un produit dans le menu déroulant.'
        });
        return;
      }
      const mat = materials.find((m) => m.id === selectedMaterialId);
      if (!mat) return;

      // Check if product is already in the PO items
      const existingIdx = draftPO.items?.findIndex((i) => i.rawMaterialId === mat.id);
      if (existingIdx !== undefined && existingIdx !== -1) {
        const currentItem = draftPO.items![existingIdx];
        const newQty = (currentItem.quantityToOrder || 0) + addQuantity;
        handleUpdateItemQty(existingIdx, newQty);
        notifyToast({
          type: 'info',
          title: 'Quantité Cumulée',
          message: `${mat.name} figurait déjà dans la commande. Quantité portée à ${newQty} ${mat.unit}.`
        });
        setSelectedMaterialId('');
        return;
      }

      const qty = Math.max(0.01, addQuantity);
      const cost = Math.max(0, addUnitCost);

      newItem = {
        id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        rawMaterialId: mat.id,
        rawMaterialName: mat.name,
        category: mat.category,
        unit: mat.unit,
        currentStock: mat.currentStock,
        minReorderLevel: mat.min_reorder_level ?? mat.reorderLevel ?? 0,
        quantityToOrder: qty,
        unitCost: cost,
        totalCost: qty * cost
      };
    } else {
      // Custom item
      if (!customName.trim()) {
        notifyToast({
          type: 'warning',
          title: 'Désignation requise',
          message: 'Veuillez renseigner le nom de l\'article personnalisé.'
        });
        return;
      }
      const qty = Math.max(0.01, addQuantity);
      const cost = Math.max(0, addUnitCost);

      newItem = {
        id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        rawMaterialId: `custom-${Date.now()}`,
        rawMaterialName: customName.trim(),
        category: customCategory,
        unit: customUnit,
        currentStock: 0,
        minReorderLevel: 0,
        quantityToOrder: qty,
        unitCost: cost,
        totalCost: qty * cost
      };
    }

    const updatedItems = [...(draftPO.items || []), newItem];
    const totalAmount = updatedItems.reduce((acc, item) => acc + item.totalCost, 0);

    setDraftPO({
      ...draftPO,
      items: updatedItems,
      totalAmount
    });

    setSelectedMaterialId('');
    setCustomName('');
    setAddQuantity(10);
    setAddUnitCost(0);

    notifyToast({
      type: 'success',
      title: 'Produit Ajouté au Bon de Commande',
      message: `${newItem.rawMaterialName} (${newItem.quantityToOrder} ${newItem.unit}) a été ajouté avec succès.`
    });
  };

  // Remove item from draft PO
  const handleRemoveItem = (index: number) => {
    if (!draftPO || !draftPO.items) return;
    const itemToRemove = draftPO.items[index];
    const updatedItems = draftPO.items.filter((_, i) => i !== index);
    const totalAmount = updatedItems.reduce((acc, item) => acc + item.totalCost, 0);

    setDraftPO({
      ...draftPO,
      items: updatedItems,
      totalAmount
    });

    notifyToast({
      type: 'info',
      title: 'Article retiré',
      message: `${itemToRemove.rawMaterialName} a été retiré de ce bon de commande.`
    });
  };

  // Update item quantity
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (!draftPO || !draftPO.items) return;
    const updatedItems = [...draftPO.items];
    const qty = Math.max(0.01, newQty);
    updatedItems[index].quantityToOrder = qty;
    updatedItems[index].totalCost = qty * updatedItems[index].unitCost;
    const totalAmount = updatedItems.reduce((acc, item) => acc + item.totalCost, 0);

    setDraftPO({
      ...draftPO,
      items: updatedItems,
      totalAmount
    });
  };

  // Update item unit cost
  const handleUpdateItemCost = (index: number, newCost: number) => {
    if (!draftPO || !draftPO.items) return;
    const updatedItems = [...draftPO.items];
    const cost = Math.max(0, newCost);
    updatedItems[index].unitCost = cost;
    updatedItems[index].totalCost = updatedItems[index].quantityToOrder * cost;
    const totalAmount = updatedItems.reduce((acc, item) => acc + item.totalCost, 0);

    setDraftPO({
      ...draftPO,
      items: updatedItems,
      totalAmount
    });
  };

  // Save and Send PO
  const handleSaveAndSendPO = (status: 'DRAFT' | 'SENT') => {
    if (!draftPO) return;

    if (!draftPO.items || draftPO.items.length === 0) {
      notifyToast({
        type: 'warning',
        title: 'Bon de Commande Vide',
        message: 'Veuillez ajouter au moins un produit avant d\'enregistrer le bon de commande.'
      });
      return;
    }

    const finalPO: PurchaseOrder = {
      id: draftPO.id || `po-${Date.now()}`,
      poNumber: draftPO.poNumber || `BC-${Date.now()}`,
      supplierId: draftPO.supplierId || 'sup-1',
      supplierName: draftPO.supplierName || 'Fournisseur Général',
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
      title: status === 'SENT' ? 'Bon de Commande Transmis' : 'Brouillon Enregistré',
      message: `Le bon ${finalPO.poNumber} (${finalPO.totalAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD) a été enregistré.`
    });
  };

  // Delete PO
  const handleDeletePO = (id: string, poNumber: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le bon de commande ${poNumber} ?`)) {
      deletePurchaseOrder(id);
      notifyToast({
        type: 'info',
        title: 'Bon de Commande Supprimé',
        message: `Le bon ${poNumber} a été retiré de l'historique.`
      });
    }
  };

  // Mark status received
  const handleMarkReceived = (id: string, poNumber: string) => {
    updatePurchaseOrderStatus(id, 'RECEIVED');
    notifyToast({
      type: 'success',
      title: 'Statut Mis à Jour',
      message: `Le bon ${poNumber} est désormais marqué comme Réceptionné.`
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-slate-700/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span>Gestion des Achats & Réapprovisionnement Fournisseurs</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Bons de Commande Fournisseurs</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Générez des commandes automatiques basées sur le stock minimum ou créez des bons de commande manuels avec ajout libre de produits.
          </p>
        </div>

        {/* Action Buttons: Automatic and Manual PO */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleCreateManualPO()}
            className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs shadow-md flex items-center gap-2 transform active:scale-95 transition-all"
            title="Créer un bon de commande manuel vierge avec sélection libre de produits"
          >
            <FilePlus className="w-4 h-4 text-indigo-600" />
            <span>+ Bon de Commande Manuel</span>
          </button>

          <button
            onClick={() => handleGenerate1ClickPO()}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 transform active:scale-95 transition-all"
            title="Générer automatiquement d'après les matières sous le seuil d'alerte"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>⚡ Générer Bon Automatique (PO Express)</span>
          </button>
        </div>
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
            <span className="text-xs text-indigo-800 font-bold uppercase tracking-wider block">Budget Réappro Requis</span>
            <span className="text-2xl font-black text-indigo-950">
              {lowStockMaterials
                .reduce((acc, m) => {
                  const minLvl = m.min_reorder_level ?? m.reorderLevel ?? 0;
                  const target = Math.ceil(minLvl * 2.5);
                  return acc + Math.max(0, target - m.currentStock) * (m.currentAvgCost || 5);
                }, 0)
                .toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
            </span>
            <span className="text-[10px] text-indigo-700 block mt-0.5">Pour retour au stock de sécurité</span>
          </div>
          <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-700">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 text-white border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Bons de Commande Actifs</span>
            <span className="text-2xl font-black">{purchaseOrders.length} Bons</span>
            <span className="text-[10px] text-amber-400 block mt-0.5">
              {purchaseOrders.filter((p) => p.status === 'SENT').length} en attente fournisseur
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
          <span>Alertes Stock Bas & Commande ({lowStockMaterials.length})</span>
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

              <button
                onClick={() => handleCreateManualPO(selectedSupplierId !== 'ALL' ? selectedSupplierId : undefined)}
                className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Bon Manuel</span>
              </button>
            </div>
          </div>

          {/* Low Stock Table */}
          {filteredLowStock.length === 0 ? (
            <div className="bg-emerald-50/50 border border-emerald-200 p-8 rounded-3xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-950">Aucun Article sous le Seuil Critique</h3>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                Toutes vos matières premières disposent d'un niveau de stock suffisant pour alimenter la production.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handleCreateManualPO()}
                  className="px-4 py-2 text-xs font-black text-emerald-900 bg-emerald-200/60 hover:bg-emerald-200 rounded-xl inline-flex items-center gap-2"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Créer un Bon de Commande Manuel Tout de Même</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <span className="text-xs font-bold">Matières Premières Requérant Réapprovisionnement</span>
                <span className="text-[11px] text-amber-400 font-medium">
                  {filteredLowStock.length} article(s) à commander
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Matière Première & SKU</th>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3 text-right">Stock Actuel</th>
                      <th className="p-3 text-right">Seuil Min</th>
                      <th className="p-3">Ratio Stock</th>
                      <th className="p-3 text-right">Qté Suggérée</th>
                      <th className="p-3 text-right">Coût Estimé</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredLowStock.map((m) => {
                      const minLvl = m.min_reorder_level ?? m.reorderLevel ?? 0;
                      const ratio = minLvl > 0 ? Math.min(100, Math.round((m.currentStock / minLvl) * 100)) : 100;
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
                            <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
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
                            {estimatedCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleGenerate1ClickPO(undefined, m.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-[11px] inline-flex items-center gap-1 shadow-xs transition-colors"
                              title="Générer un bon de commande pour cet article (avec possibilité d'en ajouter d'autres)"
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
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par N° PO, fournisseur, produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Statut :</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="SENT">Transmis / En Cours</option>
                <option value="DRAFT">Brouillons</option>
                <option value="RECEIVED">Livrés & Réceptionnés</option>
                <option value="CANCELLED">Annulés</option>
              </select>

              <button
                onClick={() => handleCreateManualPO()}
                className="px-3.5 py-1.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Bon Manuel</span>
              </button>
            </div>
          </div>

          {filteredPOs.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl text-center space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Aucun bon de commande trouvé</h3>
              <p className="text-xs text-slate-500">
                Créez votre premier bon de commande en utilisant l'assistant automatique ou la commande manuelle.
              </p>
              <button
                onClick={() => handleCreateManualPO()}
                className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl inline-flex items-center gap-1.5"
              >
                <FilePlus className="w-4 h-4" />
                <span>Créer un Bon Manuel</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPOs.map((po) => (
                <div key={po.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{po.poNumber}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {po.poNumber.includes('MAN') ? 'Manuel' : 'Automatique'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">{po.supplierName}</p>
                      </div>
                      
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${
                          po.status === 'SENT'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : po.status === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : po.status === 'DRAFT'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {po.status === 'SENT'
                          ? 'En Attente Livraison'
                          : po.status === 'RECEIVED'
                          ? 'Livré & Réceptionné'
                          : po.status === 'DRAFT'
                          ? 'Brouillon'
                          : 'Annulé'}
                      </span>
                    </div>

                    {/* Items List Snippet */}
                    <div className="mt-3 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                        Articles commandés ({po.items.length}) :
                      </span>
                      <div className="bg-slate-50/80 rounded-xl p-2.5 space-y-1 border border-slate-100 max-h-36 overflow-y-auto">
                        {po.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs py-0.5 text-slate-700">
                            <span className="truncate pr-2 font-medium">
                              • {item.rawMaterialName} <span className="text-slate-400 font-bold">({item.quantityToOrder} {item.unit})</span>
                            </span>
                            <span className="font-bold shrink-0">{item.totalCost.toFixed(2)} DZD</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Totals and Actions */}
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Date : {po.date}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Montant Total HT</span>
                        <span className="text-base font-black text-slate-950">
                          {po.totalAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPrintPO(po)}
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1 transition-colors"
                          title="Imprimer / Visualiser la fiche Bon de Commande"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimer</span>
                        </button>

                        <button
                          onClick={() => handleEditExistingPO(po)}
                          className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center gap-1 transition-colors"
                          title="Modifier ou ajouter d'autres produits à ce bon"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modifier / + Produits</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {po.status !== 'RECEIVED' && (
                          <button
                            onClick={() => handleMarkReceived(po.id, po.poNumber)}
                            className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center gap-1 transition-colors"
                            title="Marquer comme réceptionné par le laboratoire"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Marquer Réceptionné</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeletePO(po.id, po.poNumber)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Supprimer ce bon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BON DE COMMANDE BUILDER / EDITOR (AUTOMATIQUE OU MANUEL) */}
      {/* ========================================================================= */}
      {isModalOpen && draftPO && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${isManualMode ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-slate-950'}`}>
                  {isManualMode ? <FilePlus className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base">
                      {draftPO.poNumber} — {isManualMode ? 'Bon de Commande Manuel' : 'Bon de Commande Automatique'}
                    </h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isManualMode ? 'bg-indigo-500/30 text-indigo-300' : 'bg-amber-500/30 text-amber-300'}`}>
                      {isManualMode ? 'Saisie Libre' : 'Calcul Reorder'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {isManualMode
                      ? 'Composez librement les produits à commander auprès de vos fournisseurs.'
                      : 'Calculé automatiquement depuis les alertes de stock. Vous pouvez ajouter d\'autres produits ci-dessous.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Order Metadata Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="text-slate-500 font-bold uppercase block text-[10px] mb-1">Fournisseur :</label>
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
                    className="font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                    <option value="sup-other">Autre Fournisseur / Central</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 font-bold uppercase block text-[10px] mb-1">N° Bon de Commande :</label>
                  <input
                    type="text"
                    value={draftPO.poNumber || ''}
                    onChange={(e) => setDraftPO({ ...draftPO, poNumber: e.target.value })}
                    className="font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold uppercase block text-[10px] mb-1">Date Souhaitée de Livraison :</label>
                  <input
                    type="date"
                    value={draftPO.expectedDeliveryDate || ''}
                    onChange={(e) => setDraftPO({ ...draftPO, expectedDeliveryDate: e.target.value })}
                    className="font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* ================================================================= */}
              {/* SECTION: AJOUTER UN PRODUIT AU BON DE COMMANDE (FOR BOTH AUTO & MANUAL) */}
              {/* ================================================================= */}
              <div className="bg-indigo-50/50 border-2 border-indigo-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                        Ajouter des Produits au Bon de Commande
                      </h4>
                      <p className="text-[11px] text-indigo-700">
                        Ajoutez n'importe quel ingrédient du stock ou référence personnalisée à cette commande.
                      </p>
                    </div>
                  </div>

                  {/* Mode selector */}
                  <div className="flex rounded-xl bg-white border border-indigo-200 p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setAddMode('EXISTING')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        addMode === 'EXISTING'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Catalogue Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode('CUSTOM')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        addMode === 'CUSTOM'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Article Personnalisé
                    </button>
                  </div>
                </div>

                {/* Form fields for adding product */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  
                  {addMode === 'EXISTING' ? (
                    <div className="sm:col-span-6">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Sélectionnez la Matière Première / Ingrédient :
                      </label>
                      <select
                        value={selectedMaterialId}
                        onChange={(e) => handleSelectMaterial(e.target.value)}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Choisir un produit du stock --</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.sku}) — Stock: {m.currentStock} {m.unit} — {m.currentAvgCost ? `${m.currentAvgCost.toFixed(2)} DZD` : '5 DZD'}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          Nom / Référence Personnalisée :
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Boîtes d'emballage traiteur..."
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Unité :</label>
                        <select
                          value={customUnit}
                          onChange={(e) => setCustomUnit(e.target.value as MaterialUnit)}
                          className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="l">L</option>
                          <option value="ml">ml</option>
                          <option value="pcs">pcs</option>
                          <option value="pack">pack</option>
                          <option value="box">box</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Quantity to order */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Quantité :</label>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(parseFloat(e.target.value) || 1)}
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 text-right focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Unit price */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Prix Unit. (DZD) :</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={addUnitCost}
                      onChange={(e) => setAddUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 text-right focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Action button */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddProductToDraft}
                      className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>

                {selectedMaterialId && addMode === 'EXISTING' && (
                  <div className="text-[11px] text-indigo-900 bg-indigo-100/60 p-2 rounded-xl flex items-center justify-between">
                    <span>
                      Sous-total pour cet ajout : <strong>{(addQuantity * addUnitCost).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD</strong>
                    </span>
                    <span className="text-slate-500">
                      Stock actuel : {materials.find(m => m.id === selectedMaterialId)?.currentStock} {materials.find(m => m.id === selectedMaterialId)?.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Table of Order Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Lignes de Commande ({draftPO.items?.length || 0} articles) :
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Modifiez directement les quantités ou les prix unitaires
                  </span>
                </div>

                {(!draftPO.items || draftPO.items.length === 0) ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
                    <Package className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Aucun produit dans ce bon de commande</p>
                    <p className="text-[11px] text-slate-400">
                      Utilisez le formulaire ci-dessus pour ajouter vos matières premières ou produits personnalisés.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">N°</th>
                          <th className="p-3">Matière / Produit</th>
                          <th className="p-3">Catégorie</th>
                          <th className="p-3 text-right">Quantité</th>
                          <th className="p-3 text-right">Prix Unit. (DZD)</th>
                          <th className="p-3 text-right">Total Ligne</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {draftPO.items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-400 font-bold">{index + 1}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{item.rawMaterialName}</span>
                              <span className="text-[10px] text-slate-400">
                                Stock actuel : {item.currentStock} {item.unit}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0.01}
                                  step="any"
                                  value={item.quantityToOrder}
                                  onChange={(e) => handleUpdateItemQty(index, parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-indigo-500 text-xs"
                                />
                                <span className="font-bold text-slate-600 text-[11px] w-6 text-left">{item.unit}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.unitCost}
                                onChange={(e) => handleUpdateItemCost(index, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-right font-bold focus:ring-2 focus:ring-indigo-500 text-xs"
                              />
                            </td>
                            <td className="p-3 text-right font-black text-slate-950">
                              {item.totalCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Supprimer cet article du bon de commande"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Notes and Special Instructions */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Notes / Consignes de Livraison :
                </label>
                <textarea
                  rows={2}
                  value={draftPO.notes || ''}
                  onChange={(e) => setDraftPO({ ...draftPO, notes: e.target.value })}
                  placeholder="Consignes d'accès, respect de la chaîne du froid, contact réception..."
                  className="w-full text-xs text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Total Calculation Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block">Montant Total du Bon (HT)</span>
                  <span className="text-[11px] text-amber-400">
                    {draftPO.items?.length || 0} référence(s) sélectionnée(s)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-400">
                    {draftPO.totalAmount?.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveAndSendPO('DRAFT')}
                  className="px-4 py-2.5 rounded-xl border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold text-xs transition-colors"
                >
                  Sauvegarder Brouillon
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAndSendPO('SENT')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md flex items-center gap-2 transition-all transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Valider & Transmettre le Bon</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE A4 PREVIEW MODAL */}
      {/* ========================================================================= */}
      {printPO && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            
            {/* Modal Actions Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Aperçu Impression — {printPO.poNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer le Bon</span>
                </button>
                <button
                  onClick={() => setPrintPO(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* A4 Sheet Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-900 bg-white">
              
              {/* Company & Order Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-950">LABORATOIRE CENTRAL PÂTISSERIE</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Service Approvisionnement & Gestion des Stocks<br />
                    Plateforme Logistique & Production Centrale
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-indigo-700 uppercase tracking-widest block">BON DE COMMANDE</span>
                  <span className="text-lg font-black text-slate-950 font-mono">{printPO.poNumber}</span>
                  <p className="text-xs text-slate-500 mt-0.5">Date : {printPO.date}</p>
                  {printPO.expectedDeliveryDate && (
                    <p className="text-xs text-amber-700 font-bold">Livraison requise : {printPO.expectedDeliveryDate}</p>
                  )}
                </div>
              </div>

              {/* Parties Box */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Émis par :</span>
                  <p className="font-bold text-slate-900">Labo Central - Supply Chain</p>
                  <p className="text-slate-500">Contact : {printPO.createdBy}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Fournisseur Destinataire :</span>
                  <p className="font-bold text-slate-900">{printPO.supplierName}</p>
                  <p className="text-slate-500">Statut commande : {printPO.status}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">N°</th>
                      <th className="p-3">Désignation Produit / Matière</th>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3 text-right">Quantité</th>
                      <th className="p-3 text-right">P.U. HT (DZD)</th>
                      <th className="p-3 text-right">Total HT (DZD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {printPO.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-3 text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{item.rawMaterialName}</td>
                        <td className="p-3 text-slate-500">{item.category}</td>
                        <td className="p-3 text-right font-bold text-slate-950">
                          {item.quantityToOrder} {item.unit}
                        </td>
                        <td className="p-3 text-right text-slate-700">{item.unitCost.toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-slate-950">{item.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end pt-2">
                <div className="w-64 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Total HT :</span>
                    <span>{printPO.totalAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-950 text-sm">
                    <span>Net à Payer :</span>
                    <span className="text-amber-600">
                      {printPO.totalAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {printPO.notes && (
                <div className="text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-0.5">Instructions & Conditions :</span>
                  <p className="text-slate-600">{printPO.notes}</p>
                </div>
              )}

              {/* Signatures Blocks */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
                <div className="text-center p-4 border border-dashed border-slate-300 rounded-2xl h-28 flex flex-col justify-between">
                  <span className="font-bold text-slate-600">Visa Service Approvisionnement</span>
                  <span className="text-[10px] text-slate-400">Date et Signature</span>
                </div>
                <div className="text-center p-4 border border-dashed border-slate-300 rounded-2xl h-28 flex flex-col justify-between">
                  <span className="font-bold text-slate-600">Accusé Réception Fournisseur</span>
                  <span className="text-[10px] text-slate-400">Cachet & Date de livraison confirmée</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
