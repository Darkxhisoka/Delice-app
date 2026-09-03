import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { FinishedProductCategory, ProductionRoomId, RetailProduct } from '../../types';
import {
  getRetailProducts,
  saveRetailProducts,
  getActiveStore,
  addActivityLog,
  notifyToast,
} from '../../services/storage';
import { dbUpsertProduct, CATEGORY_TO_ROOM_MAP, dbGetAllProducts } from '../../db/database';
import {
  PackagePlus,
  Search,
  Edit3,
  X,
  AlertCircle,
  Tag,
  DollarSign,
  Barcode,
  FileText,
  Layers,
  Plus,
  Save,
  Cookie,
  Sparkles,
  CakeSlice,
  Croissant,
  Cake,
  PartyPopper,
  Eye,
} from 'lucide-react';

const FINISHED_CATEGORIES: FinishedProductCategory[] = [
  'G\u00e2teaux Secs',
  'G\u00e2teaux Orientaux',
  'Mille-Feuille & Feuilletage',
  'Viennoiserie & Briocherie',
  'P\u00e2tisseries Fines',
  'Pi\u00e8ces Mont\u00e9es',
  'Trompe-l\u2019\u0153il',
];

const CATEGORY_ICONS: Record<FinishedProductCategory, React.ComponentType<{ className?: string }>> = {
  'G\u00e2teaux Secs': Cookie,
  'G\u00e2teaux Orientaux': Sparkles,
  'Mille-Feuille & Feuilletage': Layers,
  'Viennoiserie & Briocherie': Croissant,
  'P\u00e2tisseries Fines': Cake,
  'Pi\u00e8ces Mont\u00e9es': PartyPopper,
  'Trompe-l\u2019\u0153il': Eye,
};

const CATEGORY_COLORS: Record<FinishedProductCategory, string> = {
  'G\u00e2teaux Secs': 'bg-amber-100 text-amber-800 border-amber-200',
  'G\u00e2teaux Orientaux': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Mille-Feuille & Feuilletage': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Viennoiserie & Briocherie': 'bg-orange-100 text-orange-800 border-orange-200',
  'P\u00e2tisseries Fines': 'bg-rose-100 text-rose-800 border-rose-200',
  'Pi\u00e8ces Mont\u00e9es': 'bg-purple-100 text-purple-800 border-purple-200',
  'Trompe-l\u2019\u0153il': 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

const UNIT_OPTIONS = [
  { label: 'Pi\u00e8ce', value: 'pcs' },
  { label: 'Bo\u00eete', value: 'box' },
  { label: 'Plateau', value: 'tray' },
  { label: 'Kg', value: 'kg' },
  { label: 'Lot (6)', value: 'lot6' },
  { label: 'Lot (12)', value: 'lot12' },
];

interface ProductFormData {
  name: string;
  category: FinishedProductCategory;
  unit: string;
  price: string;
  costPrice: string;
  barcode: string;
  description: string;
}

const EMPTY_FORM: ProductFormData = {
  name: '',
  category: 'P\u00e2tisseries Fines',
  unit: 'pcs',
  price: '',
  costPrice: '',
  barcode: '',
  description: '',
};

interface FinishedProductManagerProps {
  onProductCountChange?: (count: number) => void;
}

export const FinishedProductManager: React.FC<FinishedProductManagerProps> = ({ onProductCountChange }) => {
  const { t } = useTranslation();
  const activeStore = getActiveStore();

  const [products, setProducts] = useState<RetailProduct[]>(() => getRetailProducts());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FinishedProductCategory | 'ALL'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RetailProduct | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = setInterval(() => {
      setProducts(getRetailProducts());
    }, 5000);
    return () => clearInterval(unsubscribe);
  }, []);

  useEffect(() => {
    if (onProductCountChange) {
      onProductCountChange(products.length);
    }
  }, [products.length, onProductCountChange]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (filterCategory !== 'ALL') {
      result = result.filter((p) => p.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, filterCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: products.length };
    for (const p of products) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [products]);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product: RetailProduct) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category as FinishedProductCategory,
      unit: product.unit,
      price: product.price.toString(),
      costPrice: product.costPrice.toString(),
      barcode: '',
      description: product.description || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) {
      errs.name = t('productManager.nameRequired', 'Nom requis');
    }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) {
      errs.price = t('productManager.priceInvalid', 'Prix invalide');
    }
    const costNum = parseFloat(form.costPrice);
    if (isNaN(costNum) || costNum < 0) {
      errs.costPrice = t('productManager.costInvalid', 'Co\u00fbt invalide');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const roomId: ProductionRoomId = CATEGORY_TO_ROOM_MAP[form.category];
      const trimmedName = form.name.trim();
      const priceVal = Math.max(0, parseFloat(form.price) || 0);
      const costVal = Math.max(0, parseFloat(form.costPrice) || 0);
      const skuCode = editingProduct?.sku || `FP-${form.category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (editingProduct) {
        const updatedProducts = products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: trimmedName,
                category: form.category,
                unit: form.unit,
                price: priceVal,
                costPrice: costVal,
                sku: skuCode,
                description: form.description.trim() || undefined,
              }
            : p
        );
        saveRetailProducts(updatedProducts);

        await dbUpsertProduct({
          id: editingProduct.id,
          code: skuCode,
          name: trimmedName,
          category: form.category,
          roomId,
          unit: form.unit,
          price: priceVal,
          costPrice: costVal,
          currentStock: 0,
          minStockAlert: 0,
          storeId: activeStore.id,
          storeName: activeStore.name,
          barcode: form.barcode.trim() || undefined,
          isActive: true,
          updatedAt: new Date().toISOString(),
        });

        addActivityLog({
          type: 'STOCK_ADJUSTED',
          title: t('productManager.productEdited', 'Produit modifi\u00e9'),
          description: `"${trimmedName}" \u2192 ${form.category}`,
          actor: t('nav.labTitle'),
          badgeText: 'UPDATE',
          severity: 'info',
        });

        notifyToast({
          type: 'success',
          title: t('toast.savedSuccess', 'Enregistr\u00e9'),
          message: `"${trimmedName}"`,
        });
      } else {
        const newProduct: RetailProduct = {
          id: `fp-${Date.now()}`,
          name: trimmedName,
          category: form.category,
          price: priceVal,
          costPrice: costVal,
          unit: form.unit,
          sku: skuCode,
          description: form.description.trim() || undefined,
        };

        const updatedProducts = [newProduct, ...products];
        saveRetailProducts(updatedProducts);

        await dbUpsertProduct({
          id: newProduct.id,
          code: skuCode,
          name: trimmedName,
          category: form.category,
          roomId,
          unit: form.unit,
          price: priceVal,
          costPrice: costVal,
          currentStock: 0,
          minStockAlert: 0,
          storeId: activeStore.id,
          storeName: activeStore.name,
          barcode: form.barcode.trim() || undefined,
          isActive: true,
          updatedAt: new Date().toISOString(),
        });

        addActivityLog({
          type: 'STOCK_ADJUSTED',
          title: t('productManager.productCreated', 'Nouveau produit cr\u00e9\u00e9'),
          description: `"${trimmedName}" (${form.category})`,
          actor: t('nav.labTitle'),
          badgeText: 'CREATE',
          severity: 'info',
        });

        notifyToast({
          type: 'success',
          title: t('toast.savedSuccess', 'Enregistr\u00e9'),
          message: `"${trimmedName}" \u2192 ${form.category}`,
        });
      }

      setProducts(getRetailProducts());
      closeModal();
    } catch (err: any) {
      console.error('Error saving product:', err);
      notifyToast({
        type: 'error',
        title: t('common.error', 'Erreur'),
        message: err.message || t('toast.errorOccurred', "Une erreur s'est produite"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof ProductFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <PackagePlus className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {t('productManager.title', 'Gestion des Produits Finis')}
              </h2>
              <p className="text-xs text-indigo-200 font-medium">
                {products.length} {t('productManager.productCount', 'produit(s) enregistr\u00e9(s)')} \u2022 7 {t('productManager.categories', 'cat\u00e9gories')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {t('productManager.addProduct', 'Nouveau Produit')}
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterCategory('ALL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              filterCategory === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t('pos.categoryAll', 'Tous')}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              filterCategory === 'ALL' ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {categoryCounts.ALL || 0}
            </span>
          </button>
          {FINISHED_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  filterCategory === cat
                    ? CATEGORY_COLORS[cat]
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t(`productCategories.${getCategoryKey(cat)}`, cat)}</span>
                <span className="sm:hidden">{t(`productCategories.${getCategoryKey(cat)}`, cat).split(' ')[0]}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filterCategory === cat ? 'bg-black/10' : 'bg-slate-100'
                }`}>
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('productManager.searchPlaceholder', 'Rechercher un produit...')}
            className="w-full text-sm bg-slate-50 text-slate-900 rounded-xl ps-10 pe-4 py-2.5 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Product List */}
      <div className="p-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <PackagePlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">
              {t('productManager.noProducts', 'Aucun produit trouv\u00e9')}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t('productManager.noProductsDesc', 'Cr\u00e9ez votre premier produit fini en cliquant sur "Nouveau Produit".')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {filteredProducts.map((product) => {
                const cat = product.category as FinishedProductCategory;
                const Icon = CATEGORY_ICONS[cat] || PackagePlus;
                const colorClass = CATEGORY_COLORS[cat] || 'bg-slate-100 text-slate-800 border-slate-200';
                const roomId = CATEGORY_TO_ROOM_MAP[cat];

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={`p-2 rounded-lg border ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title={t('common.edit', 'Modifier')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 truncate mb-1">{product.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mb-3 truncate">
                      {t(`productCategories.${getCategoryKey(cat)}`, cat)}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-black text-slate-900">{product.price.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500 ms-1">{t('common.currencyDa', 'DZD')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{product.sku}</span>
                        {roomId && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                            {roomId.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-800 rounded-2xl">
                    {editingProduct ? <Edit3 className="w-6 h-6" /> : <PackagePlus className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {editingProduct
                        ? t('productManager.editProduct', 'Modifier le Produit')
                        : t('productManager.newProduct', 'Nouveau Produit Fini')}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {t('productManager.modalDesc', 'Cat\u00e9gorie \u2192 Salle de production automatique')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{t('productManager.fieldName', 'Nom du Produit')}</span>
                    <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder={t('productManager.namePlaceholder', 'Ex: Paris-Brest Noisette, Baklawa Traditionnel...')}
                    className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                      errors.name
                        ? 'border-rose-400 bg-rose-50 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-violet-600" />
                      <span>{t('productManager.fieldCategory', 'Cat\u00e9gorie / Salle')}</span>
                      <span className="text-rose-500 font-black">*</span>
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {FINISHED_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {t(`productCategories.${getCategoryKey(cat)}`, cat)} \u2192 {CATEGORY_TO_ROOM_MAP[cat]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <PackagePlus className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t('common.unit', 'Unit\u00e9')}</span>
                      <span className="text-rose-500 font-black">*</span>
                    </label>
                    <select
                      value={form.unit}
                      onChange={(e) => updateField('unit', e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price & Cost */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('productManager.fieldPrice', 'Prix de Vente')} ({t('common.currencyDa', 'DZD')})</span>
                      <span className="text-rose-500 font-black">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.price}
                      onChange={(e) => updateField('price', e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border rounded-xl font-black text-slate-900 focus:outline-none focus:ring-2 ${
                        errors.price
                          ? 'border-rose-400 bg-rose-50 focus:ring-rose-500'
                          : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20'
                      }`}
                    />
                    {errors.price && (
                      <p className="text-[11px] font-bold text-rose-600">{errors.price}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                      <span>{t('productManager.fieldCost', 'Co\u00fbt de Revient')} ({t('common.currencyDa', 'DZD')})</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.costPrice}
                      onChange={(e) => updateField('costPrice', e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border rounded-xl font-black text-slate-900 focus:outline-none focus:ring-2 ${
                        errors.costPrice
                          ? 'border-rose-400 bg-rose-50 focus:ring-rose-500'
                          : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20'
                      }`}
                    />
                    {errors.costPrice && (
                      <p className="text-[11px] font-bold text-rose-600">{errors.costPrice}</p>
                    )}
                  </div>
                </div>

                {/* Barcode & Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-slate-600" />
                    <span>{t('productManager.fieldBarcode', 'Code-barres')} ({t('common.optional', 'Optionnel')})</span>
                  </label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => updateField('barcode', e.target.value)}
                    placeholder="Ex: 6130001234567"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>{t('productManager.fieldDescription', 'Description')} ({t('common.optional', 'Optionnel')})</span>
                  </label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder={t('productManager.descPlaceholder', 'Ingr\u00e9dients, allerg\u00e8nes, notes...')}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Room Preview */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                    <CakeSlice className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-indigo-900">
                      {t('productManager.roomAssignment', 'Salle de production assign\u00e9e')}
                    </p>
                    <p className="text-xs font-black text-indigo-700">
                      {CATEGORY_TO_ROOM_MAP[form.category]} \u2014 {t(`rooms.${getCategoryKey(form.category)}`, form.category)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {t('common.cancel', 'Annuler')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>
                      {editingProduct
                        ? t('productManager.saveChanges', 'Enregistrer')
                        : t('productManager.createProduct', 'Cr\u00e9er le Produit')}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function getCategoryKey(category: string): string {
  const map: Record<string, string> = {
    'G\u00e2teaux Secs': 'gateauxSecs',
    'G\u00e2teaux Orientaux': 'gateauxOrientaux',
    'Mille-Feuille & Feuilletage': 'milleFeuille',
    'Viennoiserie & Briocherie': 'viennoiserie',
    'P\u00e2tisseries Fines': 'patisserieFine',
    'Pi\u00e8ces Mont\u00e9es': 'pieceMontee',
    'Trompe-l\u2019\u0153il': 'trompeOeil',
  };
  return map[category] || 'patisserieFine';
}
