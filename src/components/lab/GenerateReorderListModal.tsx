import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RawMaterial, Supplier, PurchaseOrder, PurchaseOrderItem, MaterialUnit } from '../../types';
import { getSuppliers, savePurchaseOrder, notifyToast } from '../../services/storage';
import {
  ReorderItem,
  buildReorderListFromMaterials,
  exportReorderListToPDF,
  generateReorderTextList,
  matchSupplierForCategory
} from '../../utils/reorderListUtils';
import {
  ShoppingCart,
  Printer,
  FileDown,
  Copy,
  Check,
  Share2,
  Mail,
  AlertTriangle,
  Boxes,
  Plus,
  Trash2,
  X,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Building2,
  Calendar,
  Save,
  MessageSquare,
  FileText,
  Clock,
  ShieldCheck,
  Layers
} from 'lucide-react';

interface GenerateReorderListModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: RawMaterial[];
  preselectedMaterialId?: string;
}

export const GenerateReorderListModal: React.FC<GenerateReorderListModalProps> = ({
  isOpen,
  onClose,
  materials,
  preselectedMaterialId
}) => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [safetyFactor, setSafetyFactor] = useState<number>(2.0);
  const [includeApproaching, setIncludeApproaching] = useState<boolean>(false);
  const [reorderItems, setReorderItems] = useState<ReorderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'A4_PREVIEW' | 'TEXT_MSG' | 'TABLE_VIEW'>('TABLE_VIEW');
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [orderRef, setOrderRef] = useState<string>(
    `BC-REAP-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [generalNotes, setGeneralNotes] = useState<string>(
    'Livraison souhaitée au quai de déchargement du Laboratoire Central. Respect de la chaîne du froid et conformité des DLUO.'
  );

  // Manual Add Ingredient selector
  const [isAddingCustomItem, setIsAddingCustomItem] = useState<boolean>(false);
  const [selectedAddMaterialId, setSelectedAddMaterialId] = useState<string>('');

  // Load suppliers and build initial items
  useEffect(() => {
    if (isOpen) {
      const loadedSuppliers = getSuppliers();
      setSuppliers(loadedSuppliers);

      const items = buildReorderListFromMaterials(materials, loadedSuppliers, safetyFactor, includeApproaching);
      
      // If a preselected material was passed, ensure it is in the list and selected
      if (preselectedMaterialId && !items.some((i) => i.id === preselectedMaterialId)) {
        const mat = materials.find((m) => m.id === preselectedMaterialId);
        if (mat) {
          const matchedSupplier = matchSupplierForCategory(mat.category, loadedSuppliers);
          const minThreshold = mat.min_reorder_level ?? mat.reorderLevel;
          const deficit = Math.max(1, Math.ceil(minThreshold * safetyFactor - mat.currentStock));
          items.push({
            id: mat.id,
            sku: mat.sku || mat.id,
            name: mat.name,
            category: mat.category,
            unit: mat.unit,
            currentStock: mat.currentStock,
            reorderLevel: minThreshold,
            suggestedQty: deficit,
            unitCost: mat.currentAvgCost || 5.0,
            totalCost: deficit * (mat.currentAvgCost || 5.0),
            supplierId: matchedSupplier?.id,
            supplierName: matchedSupplier?.name || 'Fournisseur Général',
            selected: true,
          });
        }
      }

      setReorderItems(items);
      setOrderRef(`BC-REAP-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`);
      setCopied(false);
    }
  }, [isOpen, materials, safetyFactor, includeApproaching, preselectedMaterialId]);

  // Recalculate quantities when safetyFactor changes
  const handleApplyFactor = (newFactor: number) => {
    setSafetyFactor(newFactor);
    setReorderItems((prev) =>
      prev.map((item) => {
        const targetStock = Math.ceil(item.reorderLevel * newFactor);
        const newQty = Math.max(1, targetStock - item.currentStock);
        return {
          ...item,
          suggestedQty: newQty,
          totalCost: newQty * item.unitCost,
        };
      })
    );
  };

  // Filtered items based on supplier and search
  const filteredItems = useMemo(() => {
    return reorderItems.filter((item) => {
      const matchesSupplier =
        selectedSupplierId === 'ALL' || item.supplierId === selectedSupplierId;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      return matchesSupplier && matchesSearch;
    });
  }, [reorderItems, selectedSupplierId, searchQuery]);

  // Active target supplier info
  const targetSupplier = useMemo(() => {
    if (selectedSupplierId === 'ALL') return null;
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Financial and volume metrics
  const selectedItems = useMemo(() => reorderItems.filter((i) => i.selected), [reorderItems]);
  const totalEstimatedCost = useMemo(
    () => selectedItems.reduce((acc, i) => acc + i.totalCost, 0),
    [selectedItems]
  );
  const totalUnitsToOrder = useMemo(
    () => selectedItems.reduce((acc, i) => acc + i.suggestedQty, 0),
    [selectedItems]
  );

  // Toggle selection for all filtered items
  const handleToggleSelectAll = () => {
    const allSelected = filteredItems.every((i) => i.selected);
    const targetIds = new Set(filteredItems.map((i) => i.id));
    setReorderItems((prev) =>
      prev.map((item) =>
        targetIds.has(item.id) ? { ...item, selected: !allSelected } : item
      )
    );
  };

  // Toggle individual item selection
  const handleToggleItem = (id: string) => {
    setReorderItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Update item quantity
  const handleUpdateItemQty = (id: string, newQty: number) => {
    const qty = Math.max(0.1, Number(newQty.toFixed(2)));
    setReorderItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              suggestedQty: qty,
              totalCost: qty * item.unitCost,
            }
          : item
      )
    );
  };

  // Update item supplier
  const handleUpdateItemSupplier = (id: string, supplierId: string) => {
    const supp = suppliers.find((s) => s.id === supplierId);
    setReorderItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              supplierId: supp?.id,
              supplierName: supp?.name || 'Fournisseur Général',
            }
          : item
      )
    );
  };

  // Remove item from reorder list
  const handleRemoveItem = (id: string) => {
    setReorderItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Manually add ingredient to reorder list
  const handleAddCustomMaterial = () => {
    if (!selectedAddMaterialId) return;
    const mat = materials.find((m) => m.id === selectedAddMaterialId);
    if (!mat) return;

    if (reorderItems.some((i) => i.id === mat.id)) {
      notifyToast({
        type: 'info',
        title: 'Déjà Présent',
        message: `${mat.name} est déjà inclus dans la liste de réapprovisionnement.`
      });
      setIsAddingCustomItem(false);
      setSelectedAddMaterialId('');
      return;
    }

    const matchedSupplier = matchSupplierForCategory(mat.category, suppliers);
    const minThreshold = mat.min_reorder_level ?? mat.reorderLevel;
    const deficit = Math.max(1, Math.ceil(minThreshold * safetyFactor - mat.currentStock));
    const unitCost = mat.currentAvgCost || 5.0;

    const newItem: ReorderItem = {
      id: mat.id,
      sku: mat.sku || mat.id,
      name: mat.name,
      category: mat.category,
      unit: mat.unit,
      currentStock: mat.currentStock,
      reorderLevel: minThreshold,
      suggestedQty: deficit > 0 ? deficit : 10,
      unitCost: unitCost,
      totalCost: (deficit > 0 ? deficit : 10) * unitCost,
      supplierId: matchedSupplier?.id,
      supplierName: matchedSupplier?.name || 'Fournisseur Général',
      selected: true,
    };

    setReorderItems((prev) => [newItem, ...prev]);
    setIsAddingCustomItem(false);
    setSelectedAddMaterialId('');
    notifyToast({
      type: 'success',
      title: 'Ingrédient Ajouté',
      message: `${mat.name} a été ajouté à la liste.`
    });
  };

  // Export options
  const exportOptions = useMemo(() => {
    return {
      supplierName: targetSupplier?.name || 'Tous Fournisseurs (Liste Consolidée)',
      supplierContact: targetSupplier
        ? {
            person: targetSupplier.contactPerson,
            phone: targetSupplier.phone,
            email: targetSupplier.email,
          }
        : undefined,
      urgencyLevel: 'URGENTE' as const,
      orderReference: orderRef,
      deliveryDate: deliveryDate,
      generalNotes: generalNotes,
      requesterName: 'Chef Pâtissier (Laboratoire Central)',
    };
  }, [targetSupplier, orderRef, deliveryDate, generalNotes]);

  // Generated Text Representation
  const formattedText = useMemo(() => {
    return generateReorderTextList(reorderItems, exportOptions);
  }, [reorderItems, exportOptions]);

  // Copy text to clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      notifyToast({
        type: 'success',
        title: 'Texte Copié !',
        message: 'La liste de réapprovisionnement a été copiée dans le presse-papier.'
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      notifyToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de copier le texte.'
      });
    }
  };

  // Send via WhatsApp
  const handleSendWhatsApp = () => {
    const encodedText = encodeURIComponent(formattedText);
    const phoneClean = targetSupplier?.phone ? targetSupplier.phone.replace(/[^0-9]/g, '') : '';
    const url = phoneClean 
      ? `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, '_blank');
  };

  // Send via Email
  const handleSendEmail = () => {
    const emailTo = targetSupplier?.email || '';
    const subject = encodeURIComponent(`[COMMANDE RÉAPPROVISIONNEMENT] Pâtisserie Le Délice - Réf: ${orderRef}`);
    const body = encodeURIComponent(formattedText);
    window.open(`mailto:${emailTo}?subject=${subject}&body=${body}`, '_blank');
  };

  // Save as official Purchase Order in local storage
  const handleSaveAsOfficialPO = () => {
    if (selectedItems.length === 0) {
      notifyToast({
        type: 'warning',
        title: 'Aucun Article',
        message: 'Veuillez sélectionner au moins un article.'
      });
      return;
    }

    const itemsToSave: PurchaseOrderItem[] = selectedItems.map((item) => ({
      id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rawMaterialId: item.id,
      rawMaterialName: item.name,
      category: item.category,
      unit: item.unit as MaterialUnit,
      currentStock: item.currentStock,
      minReorderLevel: item.reorderLevel,
      quantityToOrder: item.suggestedQty,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
    }));

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: orderRef,
      supplierId: targetSupplier?.id || 'sup-general',
      supplierName: targetSupplier?.name || 'Fournisseur Général / Multi-sources',
      date: new Date().toISOString().substring(0, 10),
      expectedDeliveryDate: deliveryDate,
      status: 'SENT',
      items: itemsToSave,
      totalAmount: totalEstimatedCost,
      createdBy: 'Chef Pâtissier - Labo Central',
      notes: generalNotes,
    };

    savePurchaseOrder(newPO);
    notifyToast({
      type: 'success',
      title: 'Bon de Commande Créé',
      message: `Le bon ${newPO.poNumber} (${newPO.totalAmount.toFixed(2)} DZD) a été enregistré dans le système.`
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="reorder-list-modal"
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Générateur de Liste de Réapprovisionnement
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {selectedItems.length} Ingrédients en alerte
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Compilation intelligente des matières premières sous le seuil d'alerte pour commande fournisseurs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Switcher Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('TABLE_VIEW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'TABLE_VIEW'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Boxes className="w-4 h-4 text-indigo-600" />
              <span>1. Sélection & Quantités ({selectedItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('A4_PREVIEW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'A4_PREVIEW'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>2. Document Officiel & Impression A4</span>
            </button>
            <button
              onClick={() => setActiveTab('TEXT_MSG')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'TEXT_MSG'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>3. Format Texte (WhatsApp / Email)</span>
            </button>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 hidden sm:inline">Total Estimé :</span>
            <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              {totalEstimatedCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
            </span>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: TABLE VIEW & QUANTITIES CONFIGURATION */}
          {activeTab === 'TABLE_VIEW' && (
            <div className="space-y-4">
              {/* Configuration Toolbar */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Target Supplier Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Filtrer par Fournisseur Cible
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="ALL">Tous les Fournisseurs (Liste Consolidée)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.categoriesProvided.join(', ')})
                      </option>
                    ))}
                  </select>
                  {targetSupplier && (
                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                      Contact : <span className="font-semibold text-slate-700">{targetSupplier.contactPerson}</span> ({targetSupplier.phone || targetSupplier.email})
                    </p>
                  )}
                </div>

                {/* Safety Factor Multiplier */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Niveau de Stock Visé (Facteur Sécurité)
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { factor: 1.0, label: '1.0x (Seuil)' },
                      { factor: 1.5, label: '1.5x' },
                      { factor: 2.0, label: '2.0x (Std)' },
                      { factor: 3.0, label: '3.0x' },
                    ].map((btn) => (
                      <button
                        key={btn.factor}
                        type="button"
                        onClick={() => handleApplyFactor(btn.factor)}
                        className={`py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          safetyFactor === btn.factor
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ajuste automatiquement la quantité suggérée pour chaque ingrédient.
                  </p>
                </div>

                {/* Search & Threshold Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Recherche & Sensibilité
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filtrer par nom, réf, catégorie..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeApproaching}
                        onChange={(e) => setIncludeApproaching(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                      />
                      <span>Inclure stock approchant le seuil (≤ 120%)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Add Custom Ingredient Bar */}
              <div className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Un ingrédient manque à cette commande ?</span>
                  {!isAddingCustomItem ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomItem(true)}
                      className="inline-flex items-center gap-1 text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter manuellement une matière première</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedAddMaterialId}
                        onChange={(e) => setSelectedAddMaterialId(e.target.value)}
                        className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 max-w-xs"
                      >
                        <option value="">Sélectionner une matière première...</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} (Stock: {m.currentStock} {m.unit} / Seuil: {m.reorderLevel})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddCustomMaterial}
                        disabled={!selectedAddMaterialId}
                        className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                      >
                        Ajouter
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomItem(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    {filteredItems.every((i) => i.selected) ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                        <span>Tout désélectionner</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                        <span>Tout sélectionner</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Main Reorder Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredItems.length > 0 && filteredItems.every((i) => i.selected)}
                            onChange={handleToggleSelectAll}
                            className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </th>
                        <th className="p-3 min-w-[200px]">Ingrédient / Référence</th>
                        <th className="p-3 w-28">Catégorie</th>
                        <th className="p-3 w-28 text-center">Stock Actuel</th>
                        <th className="p-3 w-24 text-center">Seuil Min.</th>
                        <th className="p-3 w-36 text-center">Qté à Commander</th>
                        <th className="p-3 w-28 text-right">P.U Estimé</th>
                        <th className="p-3 w-32 text-right">Total Ligne</th>
                        <th className="p-3 w-40">Fournisseur Attribué</th>
                        <th className="p-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-75" />
                            <p className="font-bold text-slate-700">Aucun ingrédient ne correspond aux critères de filtre.</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Tous les stocks sont optimaux ou aucun article ne correspond à votre recherche.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => {
                          const isOutOfStock = item.currentStock <= 0;
                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                item.selected ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/50 opacity-60'
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => handleToggleItem(item.id)}
                                  className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{item.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {item.category}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isOutOfStock
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                  >
                                    {isOutOfStock ? '0 (Rupture)' : `${item.currentStock} ${item.unit}`}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-center text-slate-500 font-medium">
                                {item.reorderLevel} {item.unit}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(item.id, item.suggestedQty - 1)}
                                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                                    title="Diminuer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0.1"
                                    value={item.suggestedQty}
                                    onChange={(e) => handleUpdateItemQty(item.id, parseFloat(e.target.value) || 0)}
                                    className="w-16 px-1.5 py-1 text-xs text-center font-bold bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(item.id, item.suggestedQty + 1)}
                                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                                    title="Augmenter"
                                  >
                                    +
                                  </button>
                                  <span className="text-[11px] text-slate-500 font-semibold ml-0.5">{item.unit}</span>
                                </div>
                              </td>
                              <td className="p-3 text-right font-medium text-slate-600">
                                {item.unitCost.toFixed(2)} DZD
                              </td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                {item.totalCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                              </td>
                              <td className="p-3">
                                <select
                                  value={item.supplierId || ''}
                                  onChange={(e) => handleUpdateItemSupplier(item.id, e.target.value)}
                                  className="w-full text-[11px] px-2 py-1 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 truncate"
                                >
                                  {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Retirer de la liste"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: A4 OFFICIAL DOCUMENT & PRINTABLE PREVIEW */}
          {activeTab === 'A4_PREVIEW' && (
            <div className="space-y-4">
              {/* Document Actions Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Aperçu du Bon de Réapprovisionnement A4
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Document officiel prêt à imprimer pour la cuisine ou à télécharger en PDF pour vos fournisseurs.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => exportReorderListToPDF(reorderItems, exportOptions)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Télécharger PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer A4</span>
                  </button>
                </div>
              </div>

              {/* Realistic A4 Document Sheet */}
              <div className="max-w-3xl mx-auto bg-white border border-slate-300 shadow-md p-6 sm:p-8 rounded-xl font-sans text-slate-900 print:border-none print:shadow-none print:p-0">
                {/* Header Band */}
                <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                      PÂTISSERIE LE DÉLICE
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Laboratoire Central • 6 Boutiques & Unité de Production
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      Réf: {orderRef}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-[10px] font-black uppercase">
                      Bon de Réapprovisionnement
                    </span>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      Date d'émission : {new Date().toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-slate-500">
                      Livraison demandée : {deliveryDate}
                    </p>
                  </div>
                </div>

                {/* Info Card */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 mb-5 text-xs">
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">FOURNISSEUR DESTINATAIRE :</span>
                    <div className="font-black text-slate-900">
                      {targetSupplier?.name || 'Tous Fournisseurs (Liste Consolidée)'}
                    </div>
                    {targetSupplier?.contactPerson && (
                      <div className="text-slate-600">Contact: {targetSupplier.contactPerson}</div>
                    )}
                    {targetSupplier?.phone && (
                      <div className="text-slate-600">Tél: {targetSupplier.phone}</div>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">POINT DE LIVRAISON :</span>
                    <div className="font-semibold text-slate-800">Laboratoire Central - Quai de Réception</div>
                    <div className="text-slate-600">Adresse : Zone Industrielle, Alger</div>
                    <div className="text-slate-600">Demandeur : Chef de Laboratoire Pâtissier</div>
                  </div>
                </div>

                {/* Printable Table */}
                <table className="w-full text-left text-xs border-collapse mb-5">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2 w-16">Réf.</th>
                      <th className="p-2">Désignation Ingrédient</th>
                      <th className="p-2 w-24">Catégorie</th>
                      <th className="p-2 w-20 text-center">Stock</th>
                      <th className="p-2 w-20 text-center">Seuil</th>
                      <th className="p-2 w-24 text-right">Qté Commande</th>
                      <th className="p-2 w-24 text-right">P.U Estimé</th>
                      <th className="p-2 w-24 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedItems.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="p-2 font-mono text-[10px] text-slate-500">{item.sku}</td>
                        <td className="p-2 font-bold text-slate-900">{item.name}</td>
                        <td className="p-2 text-slate-600">{item.category}</td>
                        <td className="p-2 text-center text-rose-700 font-semibold">{item.currentStock} {item.unit}</td>
                        <td className="p-2 text-center text-slate-500">{item.reorderLevel} {item.unit}</td>
                        <td className="p-2 text-right font-black text-slate-900 bg-amber-50">
                          {item.suggestedQty} {item.unit}
                        </td>
                        <td className="p-2 text-right text-slate-600">{item.unitCost.toFixed(2)} DZD</td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {item.totalCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={5} className="p-2 text-right uppercase">Total Estimatif :</td>
                      <td className="p-2 text-right font-black text-slate-900">{totalUnitsToOrder} u.</td>
                      <td></td>
                      <td className="p-2 text-right font-black text-rose-700">
                        {totalEstimatedCost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Quality & Instructions Note */}
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-900 mb-6">
                  <span className="font-bold block mb-0.5">Consignes Qualité & Réception :</span>
                  Contrôle obligatoire des dates limites (DLUO), intégrité des emballages étanches et respect des températures lors du déchargement.
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300 text-xs">
                  <div className="border border-slate-300 rounded p-3 h-24">
                    <span className="font-bold text-slate-700 block">Visa Responsable Laboratoire :</span>
                    <span className="text-[10px] text-slate-400 italic">Pour accord et commande</span>
                  </div>
                  <div className="border border-slate-300 rounded p-3 h-24">
                    <span className="font-bold text-slate-700 block">Accusé de Réception Fournisseur :</span>
                    <span className="text-[10px] text-slate-400 italic">Date & Signature</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEXT MESSAGE FORMAT FOR WHATSAPP / EMAIL / SMS */}
          {activeTab === 'TEXT_MSG' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Format Texte pour Messagerie & Fournisseurs
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Copiez ou transmettez directement ce récapitulatif par WhatsApp ou par Email en 1 clic.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copier le Texte</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>
                </div>
              </div>

              {/* Formatted Textarea Preview */}
              <div className="relative">
                <textarea
                  readOnly
                  rows={14}
                  value={formattedText}
                  className="w-full font-mono text-xs p-4 bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none shadow-inner leading-relaxed"
                />
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="absolute top-3 right-3 px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Boxes className="w-4 h-4 text-slate-400" />
              <strong>{selectedItems.length}</strong> articles sélectionnés
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <strong>{totalUnitsToOrder}</strong> unités au total
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => exportReorderListToPDF(reorderItems, exportOptions)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-rose-600" />
              <span>Exporter PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAsOfficialPO}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Créer Bon de Commande Interne</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
