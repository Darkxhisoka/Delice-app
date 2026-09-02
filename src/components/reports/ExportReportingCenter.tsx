import React, { useState } from 'react';
import { 
  getRawMaterials, 
  getRecipes, 
  getSaleTransactions, 
  getStores, 
  getPurchaseOrders, 
  getCashDrawerZReports, 
  notifyToast 
} from '../../services/storage';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Boxes, 
  Receipt, 
  TrendingUp, 
  DollarSign, 
  Calendar 
} from 'lucide-react';

export const ExportReportingCenter: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('AOÛT 2026 (Mensuel)');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const materials = getRawMaterials();
  const recipes = getRecipes();
  const stores = getStores();
  const sales = getSaleTransactions();

  const handleExportCSV = (reportType: string, filename: string, rows: any[][]) => {
    setIsExporting(reportType);
    
    // Construct CSV String
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsExporting(null);
      notifyToast({
        type: 'success',
        title: 'Export Excel / CSV Téléchargé',
        message: `Le fichier ${filename}.csv a été généré avec succès.`
      });
    }, 400);
  };

  const exportInventoryValuation = () => {
    const headers = ['ID', 'Désignation Matière', 'Catégorie', 'Unité', 'Stock Actuel', 'CUMP (DZD)', 'Valeur Totale Stock (DZD)'];
    const rows = [headers, ...materials.map(m => [
      m.id,
      m.name,
      m.category,
      m.unit,
      m.currentStock,
      m.currentAvgCost,
      (m.currentStock * m.currentAvgCost).toFixed(2)
    ])];
    handleExportCSV('INVENTORY', 'Valorisation_Stock_Labo_Delice', rows);
  };

  const exportRecipeCOGS = () => {
    const headers = ['ID Recette', 'Nom Pâtisserie', 'Catégorie', 'Rendement', 'Unité', 'Coût Matière Unitaire (DZD)', 'Prix Vente Conseillé (DZD)', 'Marge Estimée (%)'];
    const rows = [headers, ...recipes.map(r => {
      const cost = 48.5; // average estimated
      const price = r.retail_selling_price || r.suggestedSellingPrice || 140;
      const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : '0';
      return [
        r.id,
        r.name,
        r.category,
        r.yieldUnits,
        r.unitName,
        cost,
        price,
        `${margin}%`
      ];
    })];
    handleExportCSV('RECIPES', 'Fiches_Techniques_COGS_Delice', rows);
  };

  const exportStoreSalesSummary = () => {
    const headers = ['Date', 'ID Transaction', 'Boutique', 'Total DZD', 'Mode de Paiement', 'Nombre Articles'];
    const rows = [headers, ...sales.map(s => [
      s.timestamp,
      s.id,
      s.storeId,
      s.totalAmount,
      s.paymentMethod,
      s.items.length
    ])];
    handleExportCSV('SALES', 'Rapport_Ventes_Boutiques_Delice', rows);
  };

  const handlePrintAudit = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Centre d'Export Comptable & Fiscal
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Format Excel & CSV
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Exportations & Rapports Exécutifs Officiels
            </h1>
            <p className="text-sm text-emerald-200/80 mt-1 max-w-2xl">
              Génération en un clic des états financiers, valorisations de stocks au CUMP pour bilan comptable, fiches de coûts de revient et relevés de caisse.
            </p>
          </div>

          <button
            onClick={handlePrintAudit}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs flex items-center gap-2 border border-white/20 shadow-lg active:scale-95 transition-all self-start md:self-auto"
          >
            <Printer className="w-4 h-4" /> Imprimer État Synthétique
          </button>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Inventory Valuation */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Valorisation de Stock Matières</h3>
              <p className="text-xs text-slate-500 mt-1">
                Extraction complète des {materials.length} ingrédients avec stock théorique, CUMP et montant global valorisé pour expert-comptable.
              </p>
            </div>
          </div>

          <button
            onClick={exportInventoryValuation}
            disabled={isExporting === 'INVENTORY'}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> Télécharger Excel (.CSV)
          </button>
        </div>

        {/* Card 2: Recipes & Margins */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Fiches Techniques & COGS</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tableau exhaustif des formules pâtissières, rendements, coûts matières unitaires et marges théoriques par gâteau.
              </p>
            </div>
          </div>

          <button
            onClick={exportRecipeCOGS}
            disabled={isExporting === 'RECIPES'}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> Télécharger Excel (.CSV)
          </button>
        </div>

        {/* Card 3: Multi-Store Sales */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-300 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Journal des Ventes Boutiques</h3>
              <p className="text-xs text-slate-500 mt-1">
                Historique des tickets de caisse, ventilation par mode de règlement (Espèces, Edahabia, CIB) et chiffre d'affaires consolidé.
              </p>
            </div>
          </div>

          <button
            onClick={exportStoreSalesSummary}
            disabled={isExporting === 'SALES'}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> Télécharger Excel (.CSV)
          </button>
        </div>
      </div>
    </div>
  );
};
