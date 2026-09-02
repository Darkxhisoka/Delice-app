import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  Package,
  Wheat,
  ChefHat,
  History,
  FileText,
  ChevronRight,
  Command,
  Tag,
  ArrowRight
} from 'lucide-react';
import {
  getRetailProducts,
  getRawMaterials,
  getRecipes,
  getActivityLogs,
  getRequisitions,
  getReceipts,
  getStores,
  notifyToast
} from '../../services/storage';
import {
  RetailProduct,
  RawMaterial,
  Recipe,
  ActivityLogItem,
  Requisition,
  Receipt
} from '../../types';

export type SearchCategory = 'ALL' | 'PRODUCTS' | 'MATERIALS' | 'RECIPES' | 'HISTORY';

interface SearchResultItem {
  id: string;
  type: 'PRODUCT' | 'MATERIAL' | 'RECIPE' | 'ACTIVITY' | 'REQUISITION' | 'RECEIPT';
  typeLabel: string;
  title: string;
  code: string;
  subtitle: string;
  badgeText?: string;
  badgeColor?: string;
  category: string;
  detailUrl?: string;
  rawObject: any;
}

interface GlobalSearchBarProps {
  onNavigateToModule?: (moduleName: string, payload?: any) => void;
  className?: string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ onNavigateToModule, className = '' }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('ALL');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener for Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Perform search whenever query or category changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const searchResults: SearchResultItem[] = [];

    // 1. Search Retail Products (Produits Finis)
    if (activeCategory === 'ALL' || activeCategory === 'PRODUCTS') {
      const products = getRetailProducts();
      products.forEach((p) => {
        if (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) {
          searchResults.push({
            id: `prod-${p.id}`,
            type: 'PRODUCT',
            typeLabel: t('search.productFini', 'Produit Fini'),
            title: p.name,
            code: p.sku,
            subtitle: `${t('search.price', 'Prix')}: ${p.price.toFixed(2)} DZD • ${t('search.cost', 'Coût')}: ${p.costPrice.toFixed(2)} DZD`,
            badgeText: p.category,
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            category: 'PRODUCTS',
            rawObject: p
          });
        }
      });
    }

    // 2. Search Raw Materials (Matières Premières)
    if (activeCategory === 'ALL' || activeCategory === 'MATERIALS') {
      const materials = getRawMaterials();
      materials.forEach((m) => {
        if (m.name.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
          searchResults.push({
            id: `mat-${m.id}`,
            type: 'MATERIAL',
            typeLabel: t('search.matierePremiere', 'Matière Première'),
            title: m.name,
            code: m.sku,
            subtitle: `${t('search.stock', 'Stock')}: ${m.currentStock} ${m.unit} • ${t('search.avgCost', 'Coût Moyen')}: ${m.currentAvgCost.toFixed(2)} DZD/${m.unit}`,
            badgeText: m.category,
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
            category: 'MATERIALS',
            rawObject: m
          });
        }
      });
    }

    // 3. Search Recipes & Technical Sheets (Fiches Techniques)
    if (activeCategory === 'ALL' || activeCategory === 'RECIPES') {
      const recipes = getRecipes();
      recipes.forEach((r) => {
        if (r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) {
          searchResults.push({
            id: `recipe-${r.id}`,
            type: 'RECIPE',
            typeLabel: t('search.ficheTechnique', 'Fiche Technique'),
            title: r.name,
            code: `REC-${r.id.slice(-4).toUpperCase()}`,
            subtitle: `${t('search.yield', 'Rendement')}: ${r.yieldUnits} ${r.unitName} • ${t('search.prepTime', 'Temps Prep')}: ${r.prepTimeMinutes} min`,
            badgeText: r.recipeType === 'SEMI_FINISHED' ? t('search.semiFini', 'Semi-Fini') : t('search.productFini', 'Produit Fini'),
            badgeColor: r.recipeType === 'SEMI_FINISHED' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200',
            category: 'RECIPES',
            rawObject: r
          });
        }
      });
    }

    // 4. Search Requisitions & Receipts & Production Activity
    if (activeCategory === 'ALL' || activeCategory === 'HISTORY') {
      const requisitions = getRequisitions();
      requisitions.forEach((req) => {
        if (
          req.requisitionNumber.toLowerCase().includes(q) ||
          req.storeName.toLowerCase().includes(q) ||
          req.requestedBy.toLowerCase().includes(q) ||
          req.items.some((i) => i.productName.toLowerCase().includes(q))
        ) {
          searchResults.push({
            id: `req-${req.id}`,
            type: 'REQUISITION',
            typeLabel: t('search.requisition', 'Réquisition'),
            title: `${t('requisition.title', 'Demande')} #${req.requisitionNumber} - ${req.storeName}`,
            code: req.requisitionNumber,
            subtitle: `${t('common.status', 'Statut')}: ${req.status} • ${req.items.length} ${t('cart.item', 'article(s)')} • Est. ${req.totalEstimatedCost.toFixed(2)} DZD`,
            badgeText: req.status,
            badgeColor: req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800',
            category: 'HISTORY',
            rawObject: req
          });
        }
      });

      const receipts = getReceipts();
      receipts.forEach((rec) => {
        if (
          rec.receiptNumber.toLowerCase().includes(q) ||
          rec.supplierName.toLowerCase().includes(q) ||
          rec.invoiceNumber.toLowerCase().includes(q) ||
          rec.items.some((i) => i.rawMaterialName.toLowerCase().includes(q))
        ) {
          searchResults.push({
            id: `rec-${rec.id}`,
            type: 'RECEIPT',
            typeLabel: t('search.reception', 'Réception Fournisseur'),
            title: `${t('receipt.purchase', 'Achat')} #${rec.receiptNumber} - ${rec.supplierName}`,
            code: rec.receiptNumber,
            subtitle: `${t('receipt.invoice', 'Facture')} #${rec.invoiceNumber} • ${t('common.total', 'Total')}: ${rec.totalAmount.toFixed(2)} DZD`,
            badgeText: t('search.reception', 'Réception'),
            badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            category: 'HISTORY',
            rawObject: rec
          });
        }
      });

      const logs = getActivityLogs();
      logs.forEach((log) => {
        if (log.title.toLowerCase().includes(q) || log.description.toLowerCase().includes(q)) {
          searchResults.push({
            id: `log-${log.id}`,
            type: 'ACTIVITY',
            typeLabel: t('search.activity', 'Activité'),
            title: log.title,
            code: log.badgeText || 'LOG',
            subtitle: `${log.description.slice(0, 70)}... • ${log.actor}`,
            badgeText: log.badgeText || t('search.activity', 'Journal'),
            badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
            category: 'HISTORY',
            rawObject: log
          });
        }
      });
    }

    setResults(searchResults.slice(0, 15)); // Limit to top 15 results
    setSelectedIndex(-1);
  }, [query, activeCategory, t]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');

    notifyToast({
      type: 'info',
      title: t('search.itemFoundTitle', { title: item.title, defaultValue: `Élément trouvé : ${item.title}` }),
      message: t('search.itemFoundMsg', { code: item.code, category: item.typeLabel, defaultValue: `Code: ${item.code} | Catégorie: ${item.typeLabel}` })
    });

    if (onNavigateToModule) {
      if (item.type === 'PRODUCT') {
        onNavigateToModule('POS_SALES', { productId: item.rawObject.id });
      } else if (item.type === 'MATERIAL') {
        onNavigateToModule('INVENTORY', { materialId: item.rawObject.id });
      } else if (item.type === 'RECIPE') {
        onNavigateToModule('RECIPES', { recipeId: item.rawObject.id });
      } else if (item.type === 'REQUISITION') {
        onNavigateToModule('REQUISITIONS', { requisitionId: item.rawObject.id });
      } else if (item.type === 'RECEIPT') {
        onNavigateToModule('RECEIPT_HISTORY', { receiptId: item.rawObject.id });
      } else if (item.type === 'ACTIVITY') {
        onNavigateToModule('ACTIVITY_LOG');
      }
    }
  };

  const getResultIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'PRODUCT':
        return <Package className="w-4 h-4 text-emerald-500" />;
      case 'MATERIAL':
        return <Wheat className="w-4 h-4 text-amber-500" />;
      case 'RECIPE':
        return <ChefHat className="w-4 h-4 text-indigo-500" />;
      case 'REQUISITION':
      case 'RECEIPT':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  const categories = [
    { id: 'ALL', label: t('search.all', 'Tous') },
    { id: 'PRODUCTS', label: t('search.products', 'Produits') },
    { id: 'MATERIALS', label: t('search.materials', 'Matières') },
    { id: 'RECIPES', label: t('search.recipes', 'Recettes') },
    { id: 'HISTORY', label: t('search.history', 'Historique') },
  ];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Bar Input Trigger */}
      <div className="relative flex items-center w-full">
        <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={t('search.placeholder', 'Recherche globale (produits, codes, matières, recettes)...')}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full pl-9 rtl:pl-12 rtl:pr-9 pr-12 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all shadow-inner text-start"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 rtl:right-auto rtl:left-3 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 absolute right-2.5 rtl:right-auto rtl:left-2.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-700 rounded-md shadow-xs pointer-events-none">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        )}
      </div>

      {/* Instant Floating Results Dropdown Modal */}
      {isOpen && (
        <div className="absolute left-0 rtl:left-auto rtl:right-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[320px] max-w-2xl sm:w-[540px] md:w-[600px] animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Category Filter Chips Header */}
          <div className="p-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as SearchCategory)}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 font-semibold cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Results List Area */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 p-1">
            {!query.trim() && (
              <div className="py-8 px-4 text-center space-y-2">
                <Search className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  {t('search.emptyHint', 'Saisissez un nom, un code SKU (ex: FAR-001, CRO-001) ou un numéro de commande.')}
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 text-[10px] text-slate-500 pt-1">
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Croissant</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Farine T45</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Beurre AOP</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">REQ-101</span>
                </div>
              </div>
            )}

            {query.trim() && results.length === 0 && (
              <div className="py-8 px-4 text-center text-slate-400 space-y-1">
                <p className="text-xs font-bold text-slate-300">
                  {t('search.noResultsTitle', { query, defaultValue: `Aucun résultat trouvé pour "${query}"` })}
                </p>
                <p className="text-[11px] text-slate-500">
                  {t('search.noResultsDesc', "Essayez de vérifier l'orthographe ou d'utiliser d'autres mots-clés.")}
                </p>
              </div>
            )}

            {results.map((res, index) => (
              <div
                key={res.id}
                onClick={() => handleSelectResult(res)}
                className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-slate-800/90 group ${
                  selectedIndex === index ? 'bg-slate-800 border-amber-500/40' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-amber-500/40 transition-colors">
                    {getResultIcon(res.type)}
                  </div>
                  <div className="min-w-0 text-start">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-white truncate group-hover:text-amber-400 transition-colors">
                        {res.title}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 shrink-0">
                        {res.code}
                      </span>
                      {res.badgeText && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${res.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          {res.badgeText}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate font-sans">
                      {res.subtitle}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center text-slate-500 group-hover:text-amber-400 transition-colors">
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
                </div>
              </div>
            ))}
          </div>

          {/* Modal Footer hint */}
          <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
            <span>{t('search.resultsCount', { count: results.length, defaultValue: `${results.length} résultat(s) correspondant(s)` })}</span>
            <span className="flex items-center gap-2">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Esc</kbd> {t('search.escClose', 'Fermer')}
            </span>
          </div>

        </div>
      )}
    </div>
  );
};
