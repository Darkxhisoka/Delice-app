import React, { useState, useEffect } from 'react';
import {
  RetailProduct,
  RetailStoreStock,
  SaleItem,
  PaymentMethod,
  SaleTransaction,
  StoreLocation,
  RetailCategory
} from '../../types';
import {
  getRetailProducts,
  getRetailStoreStock,
  recordSaleTransaction,
  getActiveStore,
  subscribeToStoreChanges
} from '../../services/storage';
import { SaleReceiptModal } from './SaleReceiptModal';
import { useHapticsAndSound } from '../../hooks/useHapticsAndSound';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  Tag,
  Store,
  DollarSign,
  Receipt,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Zap,
  Coffee,
  Cake,
  Croissant,
  Utensils
} from 'lucide-react';

interface RetailSalesPOSProps {
  currentStore: StoreLocation;
}

const CATEGORIES: ('ALL' | RetailCategory)[] = [
  'ALL',
  'Croissants & Pastries',
  'Cakes & Tortes',
  'Tart Shells & Desserts',
  'Macarons & Sweets',
  'Beverages & Coffee',
  'Savory & Bread',
];

const CATEGORY_LABELS_FR: Record<string, string> = {
  'ALL': 'Tous les produits',
  'Croissants & Pastries': 'Viennoiseries & Croissants',
  'Cakes & Tortes': 'Gâteaux & Entremets',
  'Tart Shells & Desserts': 'Tartes & Tartelettes',
  'Macarons & Sweets': 'Macarons & Douceurs',
  'Beverages & Coffee': 'Boissons & Café',
  'Savory & Bread': 'Salés & Pains',
};

export const RetailSalesPOS: React.FC<RetailSalesPOSProps> = ({ currentStore }) => {
  const {
    triggerAddCart,
    triggerQuantityChange,
    triggerItemDelete,
    triggerClick,
    triggerCheckoutSuccess,
    triggerCoinPayment,
    triggerError,
  } = useHapticsAndSound();

  const [stockItems, setStockItems] = useState<RetailStoreStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | RetailCategory>('ALL');

  // Cart state
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [cashierName, setCashierName] = useState('Claire Vance');
  const [orderNotes, setOrderNotes] = useState('');

  // Receipt Modal
  const [lastCompletedSale, setLastCompletedSale] = useState<SaleTransaction | null>(null);

  const loadData = () => {
    const stock = getRetailStoreStock(currentStore.id);
    setStockItems(stock);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, [currentStore.id]);

  // Filtered products
  const filteredStock = stockItems.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const addToCart = (product: RetailStoreStock) => {
    if (product.currentStock <= 0) {
      triggerError();
      return;
    }

    triggerAddCart();

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === product.productId);
      if (existingIdx !== -1) {
        const updated = [...prev];
        const currentQty = updated[existingIdx].quantity;
        if (currentQty >= product.currentStock) return prev; // cap at available stock

        const newQty = currentQty + 1;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          totalPrice: newQty * updated[existingIdx].unitPrice,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.productId,
            productName: product.productName,
            category: product.category,
            quantity: 1,
            unitPrice: product.price,
            totalPrice: product.price,
            costPrice: product.costPrice,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    triggerQuantityChange();
    setCartItems((prev) => {
      const stock = stockItems.find((s) => s.productId === productId);
      const maxStock = stock ? stock.currentStock : 999;

      return prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > maxStock) return item;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as SaleItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    triggerItemDelete();
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => {
    triggerItemDelete();
    setCartItems([]);
    setDiscountPercent(0);
    setCashTendered('');
    setOrderNotes('');
  };

  // Financial calculations
  const rawSubtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = (rawSubtotal * discountPercent) / 100;
  const taxableSubtotal = rawSubtotal - discountAmount;
  const taxAmount = taxableSubtotal * 0.08; // 8% sales tax
  const totalAmount = taxableSubtotal + taxAmount;

  const numericCashTendered = parseFloat(cashTendered) || 0;
  const changeGiven = paymentMethod === 'CASH' ? Math.max(0, numericCashTendered - totalAmount) : 0;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (paymentMethod === 'CASH' && numericCashTendered < totalAmount) {
      triggerError();
      alert(`Montant reçu (${numericCashTendered.toFixed(2)} DZD) inférieur au total (${totalAmount.toFixed(2)} DZD)`);
      return;
    }

    const sale = recordSaleTransaction({
      storeId: currentStore.id,
      storeName: currentStore.name,
      cashierName: cashierName || 'Store Staff',
      paymentMethod,
      items: cartItems,
      subtotal: rawSubtotal,
      discount: discountAmount,
      tax: taxAmount,
      totalAmount,
      cashTendered: paymentMethod === 'CASH' ? numericCashTendered : undefined,
      changeGiven: paymentMethod === 'CASH' ? changeGiven : undefined,
      notes: orderNotes.trim() || undefined,
    });

    triggerCheckoutSuccess();
    setLastCompletedSale(sale);
    clearCart();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-indigo-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Caisse Enregistreuse Vente Détail</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Caisse Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Terminal de caisse pour <strong className="text-white font-semibold">{currentStore.name}</strong>. Déduction automatique du stock en temps réel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 text-xs">
            <Store className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-300 uppercase font-semibold">Point de Vente</div>
              <div className="font-bold text-white">{currentStore.name}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: POS Product Catalog (Left 7 cols) & Cart Register (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: PRODUCT CATALOG */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search Bar & Category Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, catégorie ou référence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Category Pill Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {CATEGORY_LABELS_FR[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredStock.map((prod) => {
              const inCart = cartItems.find((i) => i.productId === prod.productId);
              const isOutOfStock = prod.currentStock <= 0;
              const isLowStock = prod.currentStock > 0 && prod.currentStock <= 10;

              return (
                <div
                  key={prod.id}
                  onClick={() => !isOutOfStock && addToCart(prod)}
                  className={`group relative bg-white rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                    isOutOfStock
                      ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50'
                      : 'border-slate-200/80 hover:border-amber-400 hover:shadow-md cursor-pointer'
                  }`}
                >
                  {/* Top Header: Badge & Stock Pill */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                        {CATEGORY_LABELS_FR[prod.category] || prod.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-red-100 text-red-700'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOutOfStock
                          ? 'Rupture de Stock'
                          : isLowStock
                          ? `Stock Bas: ${prod.currentStock}`
                          : `${prod.currentStock} en stock`}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors line-clamp-2">
                      {prod.productName}
                    </h3>
                  </div>

                  {/* Price & Add Button */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-semibold">Prix Unitaire</span>
                      <span className="text-base font-black text-slate-900 font-mono">
                        {prod.price.toFixed(2)} DZD
                      </span>
                    </div>

                    <button
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(prod);
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                        isOutOfStock
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : inCart
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      }`}
                    >
                      {inCart ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Ajouté ({inCart.quantity})
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Ajouter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredStock.length === 0 && (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Aucun Produit Trouvé</h4>
                <p className="text-xs text-slate-500">
                  Aucun produit ne correspond à votre recherche "{searchQuery}". Essayez une autre catégorie.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: CART REGISTER & CHECKOUT */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden sticky top-6">
          {/* Cart Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm">Panier de Vente</h3>
                <p className="text-[11px] text-slate-400">
                  {cartItems.length} article(s) sélectionné(s)
                </p>
              </div>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-slate-400 hover:text-red-400 font-bold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Vider
              </button>
            )}
          </div>

          <form onSubmit={handleCheckout} className="p-4 space-y-4">
            {/* Cashier input */}
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold shrink-0">Caissier :</span>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="Nom du Caissier"
                className="w-full bg-transparent font-bold text-slate-800 outline-none text-xs"
              />
            </div>

            {/* Cart Items List */}
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-1">
              {cartItems.map((item) => (
                <div key={item.productId} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {item.productName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.unitPrice.toFixed(2)} DZD × {item.quantity} = {item.totalPrice.toFixed(2)} DZD
                    </div>
                  </div>

                  {/* Quantity Spinner */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs font-mono">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cartItems.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600">Le panier est vide</p>
                  <p className="text-[11px]">Cliquez sur les articles à gauche pour ajouter au panier.</p>
                </div>
              )}
            </div>

            {/* Discount Quick Options */}
            {cartItems.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Remise Promo
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        triggerClick();
                        setDiscountPercent(pct);
                      }}
                      className={`py-1 rounded-xl font-bold transition-all border ${
                        discountPercent === pct
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pct === 0 ? 'Aucune' : `-${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            {cartItems.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Mode de Paiement
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'CARD', label: 'Carte', icon: CreditCard },
                    { id: 'CASH', label: 'Espèces', icon: Banknote },
                    { id: 'CONTACTLESS', label: 'Sans Contact', icon: Smartphone },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => {
                          triggerClick();
                          setPaymentMethod(pm.id as PaymentMethod);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition-all border ${
                          paymentMethod === pm.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cash Tendered Input & Quick Shortcuts */}
            {cartItems.length > 0 && paymentMethod === 'CASH' && (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-emerald-900">Montant Reçu (DZD) :</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`Ex: ${(Math.ceil(totalAmount / 5) * 5).toFixed(2)}`}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-28 px-2.5 py-1 bg-white font-mono font-bold text-slate-900 rounded-lg border border-emerald-300 text-right text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Quick Tendered Amount Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerCoinPayment();
                      setCashTendered(totalAmount.toFixed(2));
                    }}
                    className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-[10px] font-bold border border-emerald-300 transition-colors shrink-0"
                  >
                    Exact ({totalAmount.toFixed(0)} DZD)
                  </button>
                  {[500, 1000, 2000].map((preset) => {
                    if (preset < totalAmount && totalAmount > 2000) return null;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          triggerCoinPayment();
                          setCashTendered(String(preset));
                        }}
                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-mono font-bold border border-emerald-200 transition-colors shrink-0"
                      >
                        {preset} DZD
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-xs font-mono pt-1 border-t border-emerald-200">
                  <span className="font-semibold text-emerald-800">Rendu Monnaie :</span>
                  <span className="text-emerald-900 font-black text-sm">
                    {changeGiven.toFixed(2)} DZD
                  </span>
                </div>
              </div>
            )}

            {/* Total Breakdown Summary */}
            {cartItems.length > 0 && (
              <div className="space-y-1.5 pt-3 border-t-2 border-dashed border-slate-200 text-xs font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>Sous-total :</span>
                  <span>{rawSubtotal.toFixed(2)} DZD</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Remise ({discountPercent}%) :</span>
                    <span>-{discountAmount.toFixed(2)} DZD</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>TVA (8%) :</span>
                  <span>{taxAmount.toFixed(2)} DZD</span>
                </div>
                <div className="flex justify-between items-center text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span className="font-sans">Total à Payer :</span>
                  <span className="text-emerald-600 text-xl font-bold">{totalAmount.toFixed(2)} DZD</span>
                </div>
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              type="submit"
              disabled={cartItems.length === 0}
              className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all ${
                cartItems.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-[0.98]'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              Valider la Vente & Imprimer Reçu
            </button>
          </form>
        </div>
      </div>

      {/* Completed Sale Receipt Popup Modal */}
      {lastCompletedSale && (
        <SaleReceiptModal
          sale={lastCompletedSale}
          store={currentStore}
          onClose={() => setLastCompletedSale(null)}
        />
      )}
    </div>
  );
};
