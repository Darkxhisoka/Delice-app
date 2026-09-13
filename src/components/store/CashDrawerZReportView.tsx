import React, { useState, useEffect } from 'react';
import { CashDrawerZReport } from '../../types';
import { 
  getCashDrawerZReports, 
  submitCashDrawerZReport, 
  getActiveStore, 
  getAuthSession,
  getSaleTransactions,
  notifyToast, 
  subscribeToStoreChanges 
} from '../../services/storage';
import { 
  Calculator, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  FileText, 
  ShieldCheck, 
  CreditCard, 
  Coins, 
  DollarSign, 
  Clock, 
  User, 
  ArrowRight 
} from 'lucide-react';

export const CashDrawerZReportView: React.FC = () => {
  const [reports, setReports] = useState<CashDrawerZReport[]>([]);
  const [activeStore, setActiveStore] = useState(getActiveStore());
  const [session, setSession] = useState(getAuthSession());
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CashDrawerZReport | null>(null);

  // Form State for End-of-day Close
  const [openingFloat, setOpeningFloat] = useState<number>(15000); // 15 000 DZD
  const [countedCash, setCountedCash] = useState<number>(68450);
  const [terminalCardTotal, setTerminalCardTotal] = useState<number>(42300);
  const [edahabiaTotal, setEdahabiaTotal] = useState<number>(18900);
  const [cibTotal, setCibTotal] = useState<number>(12400);
  const [managerNotes, setManagerNotes] = useState('');

  // Computed from current store day's sales
  const sales = getSaleTransactions().filter(s => s.storeId === activeStore.id);
  const totalSalesExpected = sales.reduce((sum, s) => sum + s.totalAmount, 0) || 142050;
  const cashSalesExpected = totalSalesExpected - (terminalCardTotal + edahabiaTotal + cibTotal);

  useEffect(() => {
    loadReports();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadReports();
      setActiveStore(getActiveStore());
      setSession(getAuthSession());
    });
    return () => unsubscribe();
  }, []);

  const loadReports = () => {
    setReports(getCashDrawerZReports());
  };

  const handleCloseRegister = (e: React.FormEvent) => {
    e.preventDefault();

    const newReport = submitCashDrawerZReport({
      storeId: activeStore.id,
      storeName: activeStore.name,
      openedAt: '07:30',
      closedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      cashierName: session?.user?.name || 'Responsable Caisse',
      openingFloat,
      expectedCashSales: cashSalesExpected,
      actualCashCounted: countedCash,
      cardTotalTerminal: terminalCardTotal,
      edahabiaTotal,
      cibTotal,
      totalRevenue: totalSalesExpected,
      totalTransactions: sales.length || 148,
      discountsGiven: 1200,
      managerNotes: managerNotes || undefined,
      isSignedOff: true
    });

    notifyToast({
      type: newReport.status === 'BALANCED' ? 'success' : 'warning',
      title: `Clôture de Caisse ${newReport.reportNumber}`,
      message: `Rapport Z généré avec succès. Écart espèces : ${newReport.cashVariance >= 0 ? '+' : ''}${newReport.cashVariance} DZD.`
    });

    setIsClosingModalOpen(false);
    setSelectedReport(newReport);
  };

  const handlePrint = (report: CashDrawerZReport) => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-400" /> Clôture Journalière de Caisse
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Ticket Z Légal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Rapprochement & Clôture de Caisse (Rapport Z)
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Comptage physique des espèces, rapprochement des télécollectes TPE (CIB / Edahabia) et validation de la conformité comptable de fin de service.
            </p>
          </div>

          <button
            onClick={() => setIsClosingModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all self-start md:self-auto"
          >
            <Calculator className="w-4 h-4" /> Effectuer la Clôture de Caisse (Z)
          </button>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Boutique Active</span>
            <span className="text-sm font-black text-white">{activeStore.name.split('-')[0]}</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Fond de Caisse Initial</span>
            <span className="text-base font-black text-amber-400">15 000 DZD</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Z Enregistrés</span>
            <span className="text-base font-black text-white">{reports.length} rapports</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Dernier Statut</span>
            <span className="text-base font-black text-emerald-400">Conforme & Équilibré</span>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Historique des Rapports Z Clôturés
          </h2>
          <span className="text-xs font-bold text-slate-500">{reports.length} clôtures archivées</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">Rapport N°</th>
                <th className="p-4">Date & Horaires</th>
                <th className="p-4">Caissier / Responsable</th>
                <th className="p-4 text-right">CA Total</th>
                <th className="p-4 text-right">Espèces Comptées</th>
                <th className="p-4 text-center">Écart Monétaire</th>
                <th className="p-4 text-center">Statut</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {reports.map((rep) => {
                return (
                  <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-black text-indigo-700 block">{rep.reportNumber}</span>
                      <span className="text-xs text-slate-400">{rep.storeName.split('-')[0]}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">{rep.closingDate}</span>
                      <span className="text-xs text-slate-400">{rep.openedAt} ➔ {rep.closedAt}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {rep.cashierName}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-black text-slate-900">{rep.totalRevenue.toLocaleString('fr-DZ')} DZD</span>
                      <span className="block text-[11px] text-slate-400">{rep.totalTransactions} tickets</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-slate-800">{rep.actualCashCounted.toLocaleString('fr-DZ')} DZD</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        rep.cashVariance === 0 ? 'bg-emerald-50 text-emerald-700' :
                        Math.abs(rep.cashVariance) <= 500 ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {rep.cashVariance === 0 ? '0 DZD (Parfait)' : `${rep.cashVariance > 0 ? '+' : ''}${rep.cashVariance} DZD`}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                        {rep.status === 'BALANCED' ? 'Équilibré' : 'Écart Déclaré'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedReport(rep)}
                        className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 font-bold text-xs"
                      >
                        Voir Ticket Z
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Z Print Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 font-mono text-xs">
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <h3 className="text-base font-black text-slate-900 tracking-wider">PÂTISSERIE DÉLICE</h3>
              <p className="text-[11px] text-slate-500 font-sans">{selectedReport.storeName}</p>
              <p className="text-xs font-bold text-indigo-700 mt-1">*** TICKET DE CLÔTURE Z ***</p>
              <p className="text-[10px] text-slate-400">{selectedReport.reportNumber} • {selectedReport.closingDate}</p>
            </div>

            <div className="py-3 space-y-1.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between"><span>Ouverture :</span><span>{selectedReport.openedAt}</span></div>
              <div className="flex justify-between"><span>Clôture :</span><span>{selectedReport.closedAt}</span></div>
              <div className="flex justify-between"><span>Responsable :</span><span>{selectedReport.cashierName}</span></div>
              <div className="flex justify-between"><span>Transactions :</span><span>{selectedReport.totalTransactions} tickets</span></div>
            </div>

            <div className="py-3 space-y-1.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold"><span>Fond de Caisse :</span><span>{selectedReport.openingFloat.toLocaleString('fr-DZ')} DZD</span></div>
              <div className="flex justify-between"><span>Espèces Attendues :</span><span>{selectedReport.expectedCashSales.toLocaleString('fr-DZ')} DZD</span></div>
              <div className="flex justify-between font-bold"><span>Espèces Comptées :</span><span>{selectedReport.actualCashCounted.toLocaleString('fr-DZ')} DZD</span></div>
              <div className="flex justify-between font-black text-indigo-700"><span>Écart Caisse :</span><span>{selectedReport.cashVariance} DZD</span></div>
            </div>

            <div className="py-3 space-y-1.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between"><span>TPE Carte Bancaire :</span><span>{selectedReport.cardTotalTerminal.toLocaleString('fr-DZ')} DZD</span></div>
              <div className="flex justify-between"><span>Edahabia Poste :</span><span>{selectedReport.edahabiaTotal.toLocaleString('fr-DZ')} DZD</span></div>
              <div className="flex justify-between"><span>CIB Interbancaire :</span><span>{selectedReport.cibTotal.toLocaleString('fr-DZ')} DZD</span></div>
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL RECETTES :</span>
                <span>{selectedReport.totalRevenue.toLocaleString('fr-DZ')} DZD</span>
              </div>
            </div>

            {selectedReport.managerNotes && (
              <div className="py-2 text-[10px] text-slate-500 italic">
                Note : {selectedReport.managerNotes}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-4 font-sans">
              <button
                onClick={() => setSelectedReport(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Fermer
              </button>
              <button
                onClick={() => handlePrint(selectedReport)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Perform Close Modal */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" /> Saisie du Comptage de Fin de Journée
            </h2>

            <form onSubmit={handleCloseRegister} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Fond de Caisse Fixe (DZD)</label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Montant Espèces Compté dans le Tiroir (DZD) *</label>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-base font-black text-emerald-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Total TPE Edahabia</label>
                  <input
                    type="number"
                    value={edahabiaTotal}
                    onChange={(e) => setEdahabiaTotal(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Total TPE CIB</label>
                  <input
                    type="number"
                    value={cibTotal}
                    onChange={(e) => setCibTotal(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Observations / Justificatif d'Écart</label>
                <textarea
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="Ex: Clôture équilibrée sans anomalies."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-md transition-all"
                >
                  Valider et Signer le Rapport Z
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
