import React, { useState, useEffect } from 'react';
import { CustomCakeOrder } from '../../types';
import { 
  getCustomCakeOrders, 
  createCustomCakeOrder, 
  updateCustomCakeOrderStatus, 
  getActiveStore, 
  notifyToast, 
  subscribeToStoreChanges 
} from '../../services/storage';
import { 
  Cake, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  Sparkles, 
  CreditCard, 
  Search, 
  Filter, 
  ChefHat 
} from 'lucide-react';

export const CustomCakePreOrders: React.FC = () => {
  const [orders, setOrders] = useState<CustomCakeOrder[]>([]);
  const [activeStore, setActiveStore] = useState(getActiveStore());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW_DEPOSIT_PAID' | 'IN_PASTRY_LAB' | 'READY_FOR_PICKUP' | 'COLLECTED'>('ALL');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('16:00');
  const [cakeType, setCakeType] = useState('Layer Cake Anniversaire & Thème');
  const [flavor, setFlavor] = useState('Vanille Bourbon & Fruits Rouges');
  const [servings, setServings] = useState<number>(20);
  const [customMessage, setCustomMessage] = useState('');
  const [specialDietaryNotes, setSpecialDietaryNotes] = useState('');
  const [totalPrice, setTotalPrice] = useState<number>(7500);
  const [depositAmount, setDepositAmount] = useState<number>(3500);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'EDAHABIA' | 'CIB'>('CASH');

  useEffect(() => {
    loadOrders();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadOrders();
      setActiveStore(getActiveStore());
    });
    return () => unsubscribe();
  }, []);

  const loadOrders = () => {
    setOrders(getCustomCakeOrders());
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !pickupDate || totalPrice <= 0) {
      notifyToast({ type: 'error', title: 'Erreur', message: 'Veuillez remplir toutes les informations requises.' });
      return;
    }

    createCustomCakeOrder({
      storeId: activeStore.id,
      storeName: activeStore.name,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      pickupDate,
      pickupTime,
      cakeType,
      flavor,
      servings,
      customMessage: customMessage || undefined,
      specialDietaryNotes: specialDietaryNotes || undefined,
      totalPrice,
      depositAmount,
      paymentMethod,
      status: 'NEW_DEPOSIT_PAID',
      assignedChef: 'Chef Hakim'
    });

    notifyToast({
      type: 'success',
      title: 'Commande Gâteau Enregistrée',
      message: `La commande pour ${customerName} (${servings} parts) a été transmise au laboratoire.`
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setPickupDate('');
    setCustomMessage('');
    setSpecialDietaryNotes('');
    setTotalPrice(7500);
    setDepositAmount(3500);
  };

  const handleStatusChange = (orderId: string, status: CustomCakeOrder['status']) => {
    updateCustomCakeOrderStatus(orderId, status);
    notifyToast({
      type: 'info',
      title: 'Statut Mis à Jour',
      message: `Statut de la commande modifié.`
    });
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.cakeType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-pink-950 via-slate-900 to-amber-950 border border-pink-900/40 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1.5">
                <Cake className="w-3.5 h-3.5 text-pink-400" /> Événements & Commandes Spéciales
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Liaison Boutique ⇄ Labo Pâtisserie
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Gâteaux Sur-Mesure & Pré-Commandes Clients
            </h1>
            <p className="text-sm text-pink-200/80 mt-1 max-w-2xl">
              Prise de commande en boutique pour mariages, anniversaires et réceptions, suivi des acomptes et ordonnancement direct au labo central.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-pink-500/20 active:scale-95 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Nouvelle Commande Gâteau
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-pink-900/40">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-pink-900/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Commandes</span>
            <span className="text-xl font-black text-white">{orders.length}</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-pink-900/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">En Fabrication Labo</span>
            <span className="text-xl font-black text-amber-400">
              {orders.filter(o => o.status === 'IN_PASTRY_LAB').length}
            </span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-pink-900/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Prêtes en Boutique</span>
            <span className="text-xl font-black text-emerald-400">
              {orders.filter(o => o.status === 'READY_FOR_PICKUP').length}
            </span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-pink-900/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Chiffre d'Affaires</span>
            <span className="text-xl font-black text-pink-300">
              {orders.reduce((sum, o) => sum + o.totalPrice, 0).toLocaleString('fr-DZ')} DZD
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher client, téléphone, n° commande..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('NEW_DEPOSIT_PAID')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'NEW_DEPOSIT_PAID' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Acompte Versé
          </button>
          <button
            onClick={() => setStatusFilter('IN_PASTRY_LAB')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'IN_PASTRY_LAB' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Au Labo
          </button>
          <button
            onClick={() => setStatusFilter('READY_FOR_PICKUP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'READY_FOR_PICKUP' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Prêt au Retrait
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map((order) => {
          return (
            <div key={order.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-pink-300 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="font-mono text-xs font-black text-slate-400 block">{order.orderNumber}</span>
                    <h3 className="font-black text-slate-900 text-base">{order.customerName}</h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" /> {order.customerPhone}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    order.status === 'READY_FOR_PICKUP' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    order.status === 'IN_PASTRY_LAB' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    order.status === 'COLLECTED' ? 'bg-slate-100 text-slate-600' :
                    'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}>
                    {order.status === 'NEW_DEPOSIT_PAID' && 'Acompte Validé'}
                    {order.status === 'IN_PASTRY_LAB' && 'En Préparation'}
                    {order.status === 'READY_FOR_PICKUP' && 'Prêt au Retrait'}
                    {order.status === 'COLLECTED' && 'Livré / Clôturé'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900">{order.cakeType} ({order.servings} parts)</div>
                  <div className="text-slate-600"><span className="font-semibold">Parfum :</span> {order.flavor}</div>
                  {order.customMessage && (
                    <div className="text-pink-700 italic">« {order.customMessage} »</div>
                  )}
                  {order.specialDietaryNotes && (
                    <div className="text-amber-700 font-medium">⚠️ {order.specialDietaryNotes}</div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1 text-slate-700 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-pink-600" /> {order.pickupDate} à {order.pickupTime}
                  </span>
                  <span>{order.storeName.split('-')[0]}</span>
                </div>
              </div>

              {/* Price & Balance */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500">Prix Total :</span>
                  <span className="font-black text-slate-900">{order.totalPrice.toLocaleString('fr-DZ')} DZD</span>
                </div>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-emerald-600 font-bold">Acompte ({order.paymentMethod}) :</span>
                  <span className="font-bold text-emerald-600">{order.depositAmount.toLocaleString('fr-DZ')} DZD</span>
                </div>
                {order.remainingBalance > 0 && (
                  <div className="flex items-center justify-between text-xs font-black text-rose-600 bg-rose-50 p-2 rounded-xl mb-3">
                    <span>Solde restant à régler :</span>
                    <span>{order.remainingBalance.toLocaleString('fr-DZ')} DZD</span>
                  </div>
                )}

                {/* Status Switcher */}
                <div className="flex items-center gap-2">
                  {order.status === 'NEW_DEPOSIT_PAID' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'IN_PASTRY_LAB')}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all"
                    >
                      Transmettre au Labo
                    </button>
                  )}
                  {order.status === 'IN_PASTRY_LAB' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'READY_FOR_PICKUP')}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all"
                    >
                      Marquer Prêt en Boutique
                    </button>
                  )}
                  {order.status === 'READY_FOR_PICKUP' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'COLLECTED')}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all"
                    >
                      Encaisser Solde & Remettre au Client
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-600" /> Nouvelle Commande de Gâteau Sur-Mesure
            </h2>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nom du Client *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amina Benali"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0550 12 34 56"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date Retrait *</label>
                  <input
                    type="date"
                    required
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Heure Retrait</label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Type de Gâteau & Thème</label>
                <select
                  value={cakeType}
                  onChange={(e) => setCakeType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-pink-500"
                >
                  <option value="Layer Cake Signature & Macarons">Layer Cake Signature & Macarons</option>
                  <option value="Pièce Montée Entremets Royal & Praliné">Pièce Montée Entremets Royal & Praliné</option>
                  <option value="Fraisier Traditionnel Crème Mousseline">Fraisier Traditionnel Crème Mousseline</option>
                  <option value="Tarte Géante Fruits Exotiques & Pistache">Tarte Géante Fruits Exotiques & Pistache</option>
                  <option value="Gâteau Numéro (Number Cake)">Gâteau Numéro (Number Cake)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Saveurs & Garnitures</label>
                  <input
                    type="text"
                    value={flavor}
                    onChange={(e) => setFlavor(e.target.value)}
                    placeholder="Ex: Chocolat Valrhona & Praliné"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre de Parts</label>
                  <input
                    type="number"
                    min="6"
                    max="150"
                    value={servings}
                    onChange={(e) => setServings(parseInt(e.target.value) || 6)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Message d'écriture / Plaque chocolat</label>
                <input
                  type="text"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Ex: Joyeux Anniversaire Rayan (10 ans)"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prix Total (DZD) *</label>
                  <input
                    type="number"
                    min="1000"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-black focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Acompte Perçu (DZD) *</label>
                  <input
                    type="number"
                    min="0"
                    max={totalPrice}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-black text-emerald-600 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mode de Paiement Acompte</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-pink-500"
                >
                  <option value="CASH">Espèces</option>
                  <option value="EDAHABIA">Carte Edahabia</option>
                  <option value="CIB">Carte CIB</option>
                  <option value="CARD">TPE Visa/Mastercard</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-pink-600 hover:bg-pink-500 rounded-xl shadow-md transition-all"
                >
                  Valider la Commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
