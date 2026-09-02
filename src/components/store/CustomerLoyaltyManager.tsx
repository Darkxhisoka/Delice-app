import React, { useState, useEffect } from 'react';
import { CustomerLoyaltyProfile } from '../../types';
import { 
  getLoyaltyProfiles, 
  addOrUpdateLoyaltyProfile, 
  addLoyaltyPoints, 
  getActiveStore, 
  notifyToast, 
  subscribeToStoreChanges 
} from '../../services/storage';
import { 
  Crown, 
  UserPlus, 
  Award, 
  Search, 
  Phone, 
  Gift, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  ShoppingBag 
} from 'lucide-react';

export const CustomerLoyaltyManager: React.FC = () => {
  const [profiles, setProfiles] = useState<CustomerLoyaltyProfile[]>([]);
  const [activeStore, setActiveStore] = useState(getActiveStore());
  const [searchPhone, setSearchPhone] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<CustomerLoyaltyProfile | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [favoritePastry, setFavoritePastry] = useState('Mille-Feuille Croustillant & Éclair Chocolat');
  const [birthday, setBirthday] = useState('');

  // Quick Points Modal
  const [pointsToAdd, setPointsToAdd] = useState<number>(25);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(2500);

  useEffect(() => {
    loadProfiles();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadProfiles();
      setActiveStore(getActiveStore());
    });
    return () => unsubscribe();
  }, []);

  const loadProfiles = () => {
    setProfiles(getLoyaltyProfiles());
  };

  const handleRegisterProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      notifyToast({ type: 'error', title: 'Erreur', message: 'Nom et téléphone requis.' });
      return;
    }

    addOrUpdateLoyaltyProfile({
      fullName,
      phone,
      email: email || undefined,
      points: 50, // 50 points bonus de bienvenue
      tier: 'SILVER',
      totalSpent: 0,
      visitsCount: 1,
      favoritePastry,
      registeredStoreId: activeStore.id,
      registeredStoreName: activeStore.name,
      birthday: birthday || undefined
    });

    notifyToast({
      type: 'success',
      title: 'Compte VIP Délice Créé',
      message: `${fullName} a reçu 50 points de bienvenue sur son compte fidélité !`
    });

    setIsModalOpen(false);
    setFullName('');
    setPhone('');
    setEmail('');
    setBirthday('');
  };

  const handleAddPoints = (profile: CustomerLoyaltyProfile) => {
    addLoyaltyPoints(profile.phone, pointsToAdd, purchaseAmount);
    notifyToast({
      type: 'success',
      title: 'Points Fidélité Crédités',
      message: `+${pointsToAdd} points ajoutés au compte de ${profile.fullName}.`
    });
    setSelectedProfile(null);
  };

  const filteredProfiles = profiles.filter(p => 
    p.fullName.toLowerCase().includes(searchPhone.toLowerCase()) ||
    p.phone.includes(searchPhone)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 border border-purple-900/40 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-purple-400" /> Club VIP & Programme Fidélité
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                10 DZD dépensés = 1 Point
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Fidélisation Clients & Profils VIP Pâtisserie Délice
            </h1>
            <p className="text-sm text-purple-200/80 mt-1 max-w-2xl">
              Identification instantanée par numéro de téléphone en caisse, cagnottage de points, pâtisseries offertes pour les anniversaires et historique des préférences.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 transition-all self-start md:self-auto"
          >
            <UserPlus className="w-4 h-4" /> Inscrire un Nouveau Client VIP
          </button>
        </div>

        {/* Loyalty Tiers Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-purple-900/40">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-500/20 text-slate-300 flex items-center justify-center font-black">
              🥈
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400">Palier Silver (0 - 15 000 DZD)</span>
              <span className="text-sm font-black text-white">5% Remise Anniversaire</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-2xl border border-amber-700/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black">
              🥇
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400">Palier Gold (15 000 - 40 000 DZD)</span>
              <span className="text-sm font-black text-white">1 Boîte Macarons Offerte</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-700/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-black">
              👑
            </div>
            <div>
              <span className="text-xs font-bold text-purple-400">VIP Platinum (&gt; 40 000 DZD)</span>
              <span className="text-sm font-black text-white">Coupe-file & Dégustations Privées</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            placeholder="Rechercher par téléphone ou nom du client..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>

        <span className="text-xs font-bold text-slate-500">
          {filteredProfiles.length} Client(s) Enregistré(s)
        </span>
      </div>

      {/* Profiles Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProfiles.map((profile) => {
          return (
            <div key={profile.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-purple-300 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{profile.fullName}</h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-purple-600" /> {profile.phone}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    profile.tier === 'VIP_PLATINUM' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                    profile.tier === 'GOLD' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {profile.tier === 'VIP_PLATINUM' && '👑 Platinum'}
                    {profile.tier === 'GOLD' && '🥇 Gold'}
                    {profile.tier === 'SILVER' && '🥈 Silver'}
                  </span>
                </div>

                {/* Points Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Solde Points</span>
                    <span className="text-2xl font-black text-purple-900">{profile.points} pts</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 block">Total Dépensé</span>
                    <span className="text-xs font-black text-slate-800">{profile.totalSpent.toLocaleString('fr-DZ')} DZD</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1 text-slate-700">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span><span className="font-bold">Favori :</span> {profile.favoritePastry}</span>
                  </div>
                  {profile.birthday && (
                    <div className="flex items-center gap-1 text-slate-500">
                      <Gift className="w-3.5 h-3.5 text-amber-500" />
                      <span>Anniversaire : {profile.birthday}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedProfile(profile)}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-purple-600/10 active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4" /> Créditer Points / Achat POS
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Points */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" /> Créditer le Compte de {selectedProfile.fullName}
            </h2>
            <p className="text-xs text-slate-500 mb-4">Solde actuel : <strong className="text-purple-700">{selectedProfile.points} points</strong></p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Montant Achat POS (DZD)</label>
                <input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => {
                    const amt = parseFloat(e.target.value) || 0;
                    setPurchaseAmount(amt);
                    setPointsToAdd(Math.floor(amt / 100)); // 1 point par 100 DZD
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-black focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Points à Attribuer (+1 pt / 100 DZD)</label>
                <input
                  type="number"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50 text-sm font-black text-purple-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleAddPoints(selectedProfile)}
                  className="px-5 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-md transition-all"
                >
                  Valider Points
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Register Profile */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" /> Inscrire un Nouveau Client VIP
            </h2>

            <form onSubmit={handleRegisterProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom & Prénom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. Karima Tlemçani"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Numéro de Téléphone *</label>
                <input
                  type="tel"
                  required
                  placeholder="0555 88 22 11"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pâtisserie / Produit Préféré</label>
                <input
                  type="text"
                  placeholder="Ex: Mille-Feuille Vanille & Croissant Amande"
                  value={favoritePastry}
                  onChange={(e) => setFavoritePastry(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date d'Anniversaire</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email (optionnel)</label>
                  <input
                    type="email"
                    placeholder="client@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-xs text-purple-900 font-medium">
                🎁 <strong>Bonus automatique :</strong> 50 points offerts à l'inscription.
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
                  className="px-5 py-2.5 text-xs font-black text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-md transition-all"
                >
                  Créer le Compte VIP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
