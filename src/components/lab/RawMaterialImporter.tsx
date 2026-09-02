import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { RawMaterial, MaterialUnit } from '../../types';
import { getRawMaterials, saveRawMaterials, addActivityLog, notifyToast } from '../../services/storage';
import { upsertRawMaterialToSupabase } from '../../services/supabaseService';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  Filter,
  Clipboard,
  Sparkles,
  Check,
  Zap,
  Info
} from 'lucide-react';

interface RawMaterialImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export interface ParsedRow {
  id: string;
  rawData: Record<string, string>;
  mappedName: string;
  mappedCategory: string;
  mappedUnit: string;
  mappedStock: number;
  mappedCost: number;
  mappedReorder: number;
  errors: string[];
  isValid: boolean;
  isDuplicate?: boolean;
}

type Step = 'UPLOAD' | 'MAP_AND_PREVIEW' | 'IMPORTING' | 'SUMMARY';
type ImportTab = 'PASTE' | 'FILE';
type DuplicateOption = 'UPDATE' | 'SKIP';

const FIELD_KEYS = [
  { key: 'name', label: 'Nom de la Matière (Nom)', required: true, aliases: ['name', 'nom', 'matiere', 'material', 'item', 'product', 'designation', 'libelle'] },
  { key: 'category', label: 'Catégorie', required: false, aliases: ['category', 'categorie', 'famille', 'type', 'group'] },
  { key: 'unit', label: 'Unité de Mesure', required: true, aliases: ['unit', 'unite', 'unit_type', 'measure', 'uom'] },
  { key: 'stock', label: 'Stock Initial (Central)', required: false, aliases: ['central_stock_qty', 'currentstock', 'stock', 'quantity', 'quantite', 'qty', 'initial_stock', 'qte'] },
  { key: 'cost', label: 'Coût Unitaire (Prix)', required: false, aliases: ['current_avg_cost', 'unit_cost', 'currentavgcost', 'cost', 'price', 'prix', 'cout', 'prix_unitaire', 'pu', 'pu_dzd'] },
  { key: 'reorder', label: 'Seuil d\'Alerte Réappro', required: false, aliases: ['min_reorder_level', 'reorderlevel', 'min_alert_qty', 'threshold', 'seuil', 'seuil_alerte', 'min_stock', 'alerte'] },
];

/**
 * Robust Auto-Sanitization Helpers
 */

// 1. Clean and capitalize material name
export function sanitizeName(str: string): string {
  if (!str) return '';
  const trimmed = str.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  // Capitalize first letter of each word properly
  return trimmed
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// 2. Clean numerical values (removes currency symbols, units, letters, converts comma to dot)
export function sanitizeNumeric(value: string | number | undefined | null, defaultValue = 0): number {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'number') return isNaN(value) ? defaultValue : Math.max(0, value);

  let str = String(value).trim();
  if (!str) return defaultValue;

  // Remove currency symbols, common units, space separators (e.g. "1 450,00 DA" -> "1450.00")
  str = str
    .replace(/[$\u20ACDAdzdDZD\s]/gi, '') // Remove $, €, DA, DZD, spaces
    .replace(/(kg|g|l|ml|pcs|piece|unit|sac|box|boite|pack|sachet|carton)/gi, '') // Remove unit words
    .replace(',', '.'); // Convert french decimal comma to dot

  // Extract valid floating point or integer number
  const match = str.match(/-?\d+(\.\d+)?/);
  if (!match) return defaultValue;

  const num = parseFloat(match[0]);
  return isNaN(num) ? defaultValue : Math.max(0, num);
}

// 3. Standardize Unit string
export function sanitizeUnit(str: string): MaterialUnit {
  if (!str) return 'kg';
  const clean = str.toLowerCase().trim();
  if (clean === 'g' || clean === 'gramme' || clean === 'grams' || clean === 'gr') return 'g';
  if (clean === 'l' || clean === 'litre' || clean === 'litres' || clean === 'liters') return 'L';
  if (clean === 'ml' || clean === 'millilitre' || clean === 'milli') return 'mL';
  if (clean.includes('unit') || clean.includes('piece') || clean === 'pc' || clean === 'pce') return 'units';
  if (clean.includes('bag') || clean.includes('sac')) return 'bags';
  if (clean.includes('box') || clean.includes('boite') || clean.includes('carton') || clean.includes('pack')) return 'boxes';
  return 'kg';
}

// 4. Standardize Category string
export function sanitizeCategory(str: string): RawMaterial['category'] {
  if (!str) return 'Other';
  const lower = str.toLowerCase().trim();
  if (lower.includes('dairy') || lower.includes('lait') || lower.includes('beurre') || lower.includes('oeuf') || lower.includes('egg')) return 'Dairy & Eggs';
  if (lower.includes('flour') || lower.includes('farine') || lower.includes('grain') || lower.includes('semoule')) return 'Flour & Grains';
  if (lower.includes('sugar') || lower.includes('sucre') || lower.includes('sweet') || lower.includes('sirop')) return 'Sugars & Sweeteners';
  if (lower.includes('fat') || lower.includes('huile') || lower.includes('margarine') || lower.includes('oil')) return 'Fats & Oils';
  if (lower.includes('choc') || lower.includes('cacao')) return 'Chocolate & Cocoa';
  if (lower.includes('nut') || lower.includes('fruit') || lower.includes('amande') || lower.includes('noix') || lower.includes('noisette')) return 'Fruits & Nuts';
  if (lower.includes('vanil') || lower.includes('arome') || lower.includes('flavor') || lower.includes('epice') || lower.includes('levure')) return 'Flavorings & Vanilla';
  if (lower.includes('pack') || lower.includes('emballage') || lower.includes('boite') || lower.includes('sac')) return 'Packaging';
  return 'Other';
}

export const RawMaterialImporter: React.FC<RawMaterialImporterProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importTab, setImportTab] = useState<ImportTab>('PASTE');
  const [step, setStep] = useState<Step>('UPLOAD');
  const [pastedText, setPastedText] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({}); // fieldKey -> csvHeader
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [duplicateOption, setDuplicateOption] = useState<DuplicateOption>('UPDATE');
  const [filterValidOnly, setFilterValidOnly] = useState<boolean>(false);

  // Import Progress & Summary State
  const [importProgress, setImportProgress] = useState<number>(0);
  const [summary, setSummary] = useState<{ total: number; created: number; updated: number; skipped: number }>({
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
  });

  if (!isOpen) return null;

  // Auto-detect column mappings
  const autoDetectMappings = (headers: string[]) => {
    const mapping: Record<string, string> = {};

    FIELD_KEYS.forEach((field) => {
      const match = headers.find((h) => {
        const cleanHeader = h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        return field.aliases.some((alias) => cleanHeader.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, '')));
      });
      if (match) {
        mapping[field.key] = match;
      } else {
        mapping[field.key] = '';
      }
    });

    setColumnMap(mapping);
    return mapping;
  };

  // Build rows with auto-sanitization
  const processRowsWithMap = (rows: Record<string, string>[], currentMap: Record<string, string>) => {
    const existingMaterials = getRawMaterials();
    const existingNames = new Set(existingMaterials.map((m) => m.name.toLowerCase().trim()));

    const processed: ParsedRow[] = rows.map((row, idx) => {
      const rawName = row[currentMap.name] || '';
      const rawCat = row[currentMap.category] || '';
      const rawUnit = row[currentMap.unit] || '';
      const rawStock = row[currentMap.stock] ?? '';
      const rawCost = row[currentMap.cost] ?? '';
      const rawReorder = row[currentMap.reorder] ?? '';

      // Auto Sanitization
      const cleanName = sanitizeName(rawName);
      const cleanCat = rawCat.trim() ? rawCat.trim() : 'Other';
      const cleanUnit = sanitizeUnit(rawUnit);
      const cleanStock = sanitizeNumeric(rawStock, 0);
      const cleanCost = sanitizeNumeric(rawCost, 0);
      const cleanReorder = sanitizeNumeric(rawReorder, 10);

      const errors: string[] = [];

      if (!cleanName) {
        errors.push('Nom de la matière manquant');
      }

      const isDuplicate = existingNames.has(cleanName.toLowerCase());

      return {
        id: `row-${idx}-${Date.now()}`,
        rawData: row,
        mappedName: cleanName,
        mappedCategory: cleanCat,
        mappedUnit: cleanUnit,
        mappedStock: cleanStock,
        mappedCost: cleanCost,
        mappedReorder: cleanReorder,
        errors,
        isValid: errors.length === 0,
        isDuplicate,
      };
    });

    setPreviewRows(processed);
  };

  // Process Direct Copy-Paste Tabular Text from Excel
  const handleProcessPastedText = (textToProcess?: string) => {
    const text = textToProcess !== undefined ? textToProcess : pastedText;
    if (!text.trim()) {
      notifyToast({
        type: 'warning',
        title: 'Texte Vide',
        message: 'Veuillez coller le contenu de votre feuille Excel dans le champ de texte.',
      });
      return;
    }

    // Use PapaParse with auto-delimiter detection (\t, comma, semicolon)
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (results) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          const headers = results.meta.fields;
          setParsedHeaders(headers);
          setRawRows(results.data);

          const autoMapping = autoDetectMappings(headers);
          processRowsWithMap(results.data, autoMapping);
          setStep('MAP_AND_PREVIEW');
        } else {
          // If no headers detected, parse as unheaded 2D array and generate default headers
          const unparsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
          if (unparsed.data && unparsed.data.length > 0) {
            const firstRowIsHeader = unparsed.data[0].some((val) => isNaN(Number(val)));
            let headers: string[] = [];
            let dataRows: string[][] = [];

            if (firstRowIsHeader) {
              headers = unparsed.data[0].map((h, i) => (h.trim() ? h.trim() : `Colonne ${i + 1}`));
              dataRows = unparsed.data.slice(1);
            } else {
              headers = unparsed.data[0].map((_, i) => `Colonne ${i + 1}`);
              dataRows = unparsed.data;
            }

            const formattedObjects: Record<string, string>[] = dataRows.map((row) => {
              const obj: Record<string, string> = {};
              headers.forEach((h, i) => {
                obj[h] = row[i] || '';
              });
              return obj;
            });

            setParsedHeaders(headers);
            setRawRows(formattedObjects);
            const autoMapping = autoDetectMappings(headers);
            processRowsWithMap(formattedObjects, autoMapping);
            setStep('MAP_AND_PREVIEW');
          } else {
            notifyToast({
              type: 'error',
              title: 'Erreur d\'analyse',
              message: 'Impossible de lire les données collées.',
            });
          }
        }
      },
      error: (err) => {
        notifyToast({
          type: 'error',
          title: 'Erreur de Copie',
          message: `Échec d'analyse du texte collé : ${err.message}`,
        });
      },
    });
  };

  // Handle File Upload Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      parseSelectedFile(uploadedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const parseSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (results) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          const headers = results.meta.fields;
          setParsedHeaders(headers);
          setRawRows(results.data);

          const autoMapping = autoDetectMappings(headers);
          processRowsWithMap(results.data, autoMapping);
          setStep('MAP_AND_PREVIEW');
        } else {
          notifyToast({
            type: 'error',
            title: 'Erreur de Lecture',
            message: 'Aucun en-tête trouvé dans le fichier sélectionné.',
          });
        }
      },
      error: (error) => {
        notifyToast({
          type: 'error',
          title: 'Erreur de Fichier',
          message: `Échec d'analyse du fichier : ${error.message}`,
        });
      },
    });
  };

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        name: 'Farine T55 Superieure',
        category: 'Flour & Grains',
        unit: 'kg',
        central_stock_qty: '500',
        current_avg_cost: '120.00',
        min_reorder_level: '50',
      },
      {
        name: 'Beurre 82% MG Extra',
        category: 'Dairy & Eggs',
        unit: 'kg',
        central_stock_qty: '150',
        current_avg_cost: '850.00',
        min_reorder_level: '20',
      },
      {
        name: 'Sucre Semoule Blanc',
        category: 'Sugars & Sweeteners',
        unit: 'kg',
        central_stock_qty: '300',
        current_avg_cost: '110.00',
        min_reorder_level: '30',
      },
      {
        name: 'Chocolat Noir 64%',
        category: 'Chocolate & Cocoa',
        unit: 'kg',
        central_stock_qty: '80',
        current_avg_cost: '1450.00',
        min_reorder_level: '15',
      },
      {
        name: 'Poudre d\'Amande Fine',
        category: 'Fruits & Nuts',
        unit: 'kg',
        central_stock_qty: '60',
        current_avg_cost: '1950.00',
        min_reorder_level: '10',
      },
    ];

    const csvString = Papa.unparse(templateData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'raw_materials_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Column Mapping Change
  const handleMappingChange = (fieldKey: string, newHeader: string) => {
    const updatedMap = { ...columnMap, [fieldKey]: newHeader };
    setColumnMap(updatedMap);
    processRowsWithMap(rawRows, updatedMap);
  };

  // Inline Cell Editing Handler
  const handleCellEdit = (
    rowId: string,
    field: 'mappedName' | 'mappedCategory' | 'mappedUnit' | 'mappedStock' | 'mappedCost' | 'mappedReorder',
    value: string
  ) => {
    setPreviewRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        const updated = { ...row };
        if (field === 'mappedName') updated.mappedName = sanitizeName(value);
        if (field === 'mappedCategory') updated.mappedCategory = value.trim() ? value.trim() : 'Other';
        if (field === 'mappedUnit') updated.mappedUnit = sanitizeUnit(value);
        if (field === 'mappedStock') updated.mappedStock = sanitizeNumeric(value, 0);
        if (field === 'mappedCost') updated.mappedCost = sanitizeNumeric(value, 0);
        if (field === 'mappedReorder') updated.mappedReorder = sanitizeNumeric(value, 10);

        // Revalidate row
        const errors: string[] = [];
        if (!updated.mappedName.trim()) errors.push('Nom de la matière manquant');

        updated.errors = errors;
        updated.isValid = errors.length === 0;

        return updated;
      })
    );
  };

  // Execute Import (UPSERT / Save to DB)
  const handleExecuteImport = (importValidOnly = false) => {
    const rowsToImport = importValidOnly
      ? previewRows.filter((r) => r.isValid)
      : previewRows.filter((r) => r.isValid);

    if (rowsToImport.length === 0) {
      notifyToast({
        type: 'error',
        title: 'Aucune ligne valide',
        message: 'Veuillez corriger les erreurs ou vous assurer d\'avoir au moins une ligne valide à importer.',
      });
      return;
    }

    setStep('IMPORTING');
    setImportProgress(25);

    setTimeout(async () => {
      setImportProgress(50);

      const existingMaterials = getRawMaterials();
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      const updatedMaterialsList = [...existingMaterials];

      try {
        for (let idx = 0; idx < rowsToImport.length; idx++) {
          const row = rowsToImport[idx];
          const normName = row.mappedName.trim();
          const existingIdx = updatedMaterialsList.findIndex(
            (m) => m.name.toLowerCase().trim() === normName.toLowerCase()
          );

          if (existingIdx !== -1) {
            if (duplicateOption === 'UPDATE') {
              const current = updatedMaterialsList[existingIdx];
              const updatedMat: RawMaterial = {
                ...current,
                currentStock: row.mappedStock,
                currentAvgCost: row.mappedCost > 0 ? row.mappedCost : current.currentAvgCost,
                reorderLevel: row.mappedReorder,
                min_reorder_level: row.mappedReorder,
                unit: sanitizeUnit(row.mappedUnit),
                category: sanitizeCategory(row.mappedCategory || current.category),
                lastUpdated: new Date().toISOString(),
              };

              await upsertRawMaterialToSupabase(updatedMat);
              updatedMaterialsList[existingIdx] = updatedMat;
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            // Create new Raw Material
            const cat = sanitizeCategory(row.mappedCategory);
            const unit = sanitizeUnit(row.mappedUnit);
            const skuCode = `RM-${cat.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

            const newMaterial: RawMaterial = {
              id: `rm-${Date.now()}-${idx}`,
              name: normName,
              sku: skuCode,
              category: cat,
              unit: unit,
              currentStock: row.mappedStock,
              currentAvgCost: row.mappedCost,
              reorderLevel: row.mappedReorder,
              min_reorder_level: row.mappedReorder,
              totalPurchasedQty: row.mappedStock,
              lastUpdated: new Date().toISOString(),
            };

            const savedMat = await upsertRawMaterialToSupabase(newMaterial);
            updatedMaterialsList.push(savedMat);
            createdCount++;
          }
        }

        saveRawMaterials(updatedMaterialsList);

        addActivityLog({
          type: 'STOCK_ADJUSTED',
          title: 'Importation Massique Supabase',
          description: `Importation Supabase réussie : ${createdCount} créée(s), ${updatedCount} mise(s) à jour, ${skippedCount} ignorée(s).`,
          actor: 'Laboratoire Central',
          badgeText: 'SUPABASE BULK',
          severity: 'success',
        });

        const totalImported = createdCount + updatedCount;
        const skippedMsg = skippedCount > 0 ? ` • ${skippedCount} doublon(s) ignoré(s)` : '';
        notifyToast({
          type: 'success',
          title: 'Importation Supabase Réussie',
          message: `${totalImported} matière(s) synchronisée(s) sur Supabase (${createdCount} créée(s), ${updatedCount} mise(s) à jour)${skippedMsg}.`,
        });

        setImportProgress(100);
        setSummary({
          total: rowsToImport.length,
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
        });

        setStep('SUMMARY');
        if (onImportSuccess) {
          onImportSuccess();
        }
      } catch (err: any) {
        console.error('Error importing raw materials to Supabase:', err);
        notifyToast({
          type: 'error',
          title: 'Erreur d\'importation Supabase',
          message: err.message || 'Échec de la synchronisation des données vers Supabase.'
        });
        setStep('MAP_AND_PREVIEW');
      }
    }, 300);
  };

  const validCount = previewRows.filter((r) => r.isValid).length;
  const errorCount = previewRows.filter((r) => !r.isValid).length;
  const displayedPreviewRows = filterValidOnly ? previewRows.filter((r) => r.isValid) : previewRows;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Importation Massique de Matières Premières
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Copiez-collez vos données depuis Excel ou téléchargez un fichier CSV.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div className="flex items-center justify-between bg-slate-50 px-6 py-3 rounded-2xl border border-slate-200 shrink-0 text-xs">
          <div className={`flex items-center gap-2 font-bold ${step === 'UPLOAD' ? 'text-amber-600' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'UPLOAD' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>1</span>
            <span>Méthode d'Import</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 font-bold ${step === 'MAP_AND_PREVIEW' ? 'text-amber-600' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'MAP_AND_PREVIEW' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>2</span>
            <span>Aperçu & Nettoyage</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 font-bold ${step === 'SUMMARY' || step === 'IMPORTING' ? 'text-amber-600' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'SUMMARY' || step === 'IMPORTING' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>3</span>
            <span>Validation & Bilan</span>
          </div>
        </div>

        {/* STEP 1: DUAL IMPORT METHODS (COPY-PASTE OR FILE UPLOAD) */}
        {step === 'UPLOAD' && (
          <div className="space-y-5 overflow-y-auto flex-1 pr-1">
            
            {/* Method Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setImportTab('PASTE')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  importTab === 'PASTE'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>Copier-Coller depuis Excel (Recommandé)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportTab('FILE')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  importTab === 'FILE'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Fichier (CSV / Excel)</span>
              </button>
            </div>

            {/* TAB A: DIRECT COPY-PASTE FROM EXCEL */}
            {importTab === 'PASTE' && (
              <div className="space-y-4">
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1 text-amber-900">
                    <p className="font-extrabold">Méthode la plus simple et rapide :</p>
                    <p className="text-amber-800">
                      Sélectionnez vos colonnes dans Excel ou Google Sheets, copiez-les (<kbd className="px-1 bg-white rounded border border-amber-300 font-mono text-[10px]">Ctrl+C</kbd>), puis collez-les dans la zone ci-dessous.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Collez vos lignes de tableau ici :
                  </label>
                  <textarea
                    rows={7}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Nom\tCatégorie\tUnité\tStock Initial\tPrix Unitaire\nFarine T55\tFlour & Grains\tkg\t500\t120.00 DA\nBeurre 82%\tDairy & Eggs\tkg\t150\t850.00 DA`}
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 rounded-2xl text-slate-800 resize-none transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleProcessPastedText()}
                  disabled={!pastedText.trim()}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Analyser les données collées</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TAB B: FILE UPLOAD (CSV / XLSX) */}
            {importTab === 'FILE' && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 bg-white text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-md group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-slate-900">
                      Glissez-déposez votre fichier CSV ici ou <span className="text-amber-600 underline">parcourez</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Détection automatique des séparateurs virgule (,), point-virgule (;) et tabulation.
                    </p>
                  </div>
                </div>

                {/* Template Download Option */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Télécharger le Modèle CSV</h4>
                      <p className="text-[11px] text-slate-500">
                        Modèle structuré avec colonnes standards.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors shrink-0"
                  >
                    <Download className="w-4 h-4" /> Modèle CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: INTERACTIVE COLUMN MAPPING & DATA PREVIEW */}
        {step === 'MAP_AND_PREVIEW' && (
          <div className="space-y-5 overflow-y-auto flex-1 pr-1">
            
            {/* Field Mapping Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-600" /> Correspondance des Colonnes
                </span>
                <span className="text-[11px] text-slate-500">
                  Total lignes détectées : <strong className="text-slate-800">{rawRows.length}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {FIELD_KEYS.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-rose-500 font-black">*</span>}
                    </label>
                    <select
                      value={columnMap[field.key] || ''}
                      onChange={(e) => handleMappingChange(field.key, e.target.value)}
                      className={`w-full text-xs bg-white border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 ${
                        field.required && !columnMap[field.key]
                          ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                          : 'border-slate-300 text-slate-800 focus:ring-amber-500'
                      }`}
                    >
                      <option value="">-- Non Assigné --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Duplicate Handling Options (UPSERT Strategy) */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-extrabold text-amber-900">Mise à jour en Base de Données (UPSERT)</h4>
                <p className="text-[11px] text-amber-800">
                  Si le nom de la matière existe déjà en stock :
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateOption"
                    checked={duplicateOption === 'UPDATE'}
                    onChange={() => setDuplicateOption('UPDATE')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>Mettre à jour stock & prix</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateOption"
                    checked={duplicateOption === 'SKIP'}
                    onChange={() => setDuplicateOption('SKIP')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>Ignorer les doublons</span>
                </label>
              </div>
            </div>

            {/* Preview Status Summary Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-extrabold text-slate-800">Aperçu & Validation :</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  🟢 {validCount} Valide(s)
                </span>
                {errorCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black flex items-center gap-1">
                    🔴 {errorCount} Invalide(s)
                  </span>
                )}
              </div>

              {errorCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterValidOnly(!filterValidOnly)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  {filterValidOnly ? 'Afficher toutes les lignes' : 'Masquer les lignes invalides'}
                </button>
              )}
            </div>

            {/* Interactive Preview Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                  <tr className="border-b border-slate-200">
                    <th className="p-2.5">Statut</th>
                    <th className="p-2.5 min-w-[170px]">Nom (Formaté) *</th>
                    <th className="p-2.5 min-w-[130px]">Catégorie</th>
                    <th className="p-2.5 w-24">Unité *</th>
                    <th className="p-2.5 w-28 text-right">Stock Initial</th>
                    <th className="p-2.5 w-28 text-right">Coût Unitaire (DZD)</th>
                    <th className="p-2.5 w-28 text-right">Seuil Alerte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedPreviewRows.map((row) => (
                    <tr
                      key={row.id}
                      className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/80 hover:bg-rose-100/80'}
                    >
                      <td className="p-2.5 whitespace-nowrap">
                        {row.isValid ? (
                          <div className="flex items-center gap-1 text-emerald-700 font-extrabold text-[10px]">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300">
                              🟢 Valide
                            </span>
                            {row.isDuplicate && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-semibold">
                                Doublon
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1 text-rose-700 font-bold text-[10px]"
                            title={row.errors.join(', ')}
                          >
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 flex items-center gap-1">
                              🔴 {row.errors[0]}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.mappedName}
                          onChange={(e) => handleCellEdit(row.id, 'mappedName', e.target.value)}
                          className="w-full px-2 py-1 bg-transparent border border-slate-200 focus:border-amber-500 focus:bg-white rounded font-bold text-slate-900 text-xs"
                          placeholder="Ex: Farine T55"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.mappedCategory}
                          onChange={(e) => handleCellEdit(row.id, 'mappedCategory', e.target.value)}
                          className="w-full px-2 py-1 bg-transparent border border-slate-200 focus:border-amber-500 focus:bg-white rounded text-slate-700 text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.mappedUnit}
                          onChange={(e) => handleCellEdit(row.id, 'mappedUnit', e.target.value)}
                          className="w-full px-2 py-1 bg-transparent border border-slate-200 focus:border-amber-500 focus:bg-white rounded text-slate-700 text-xs text-center font-semibold"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          value={row.mappedStock}
                          onChange={(e) => handleCellEdit(row.id, 'mappedStock', e.target.value)}
                          className="w-full px-2 py-1 bg-transparent border border-slate-200 focus:border-amber-500 focus:bg-white rounded text-slate-900 font-black text-xs text-right"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          value={row.mappedCost}
                          onChange={(e) => handleCellEdit(row.id, 'mappedCost', e.target.value)}
                          className="w-full px-2 py-1 bg-transparent border border-slate-200 focus:border-amber-500 focus:bg-white rounded text-slate-900 font-bold text-xs text-right"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          value={row.mappedReorder}
                          onChange={(e) => handleCellEdit(row.id, 'mappedReorder', e.target.value)}
                          className="w-full px-2 py-1 bg-transparent border border-slate-200 focus:border-amber-500 focus:bg-white rounded text-slate-700 font-semibold text-xs text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 3: IMPORTING PROGRESS STATE */}
        {step === 'IMPORTING' && (
          <div className="py-12 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
            <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-slate-900">Enregistrement dans la Base de Données...</h4>
              <p className="text-xs text-slate-500">Intégration des matières premières et mise à jour des coûts.</p>
            </div>
            <div className="w-full max-w-md bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
              <div
                className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP 3: SUMMARY */}
        {step === 'SUMMARY' && (
          <div className="py-6 space-y-6 flex-1 overflow-y-auto">
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg font-black text-emerald-950">Importation Massique Terminée !</h4>
                <p className="text-xs text-emerald-800">
                  Votre catalogue de matières premières est à jour dans l'inventaire du Laboratoire Central.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lignes Traitées</span>
                <span className="text-xl font-black text-slate-900">{summary.total}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Nouveaux Créés</span>
                <span className="text-xl font-black text-emerald-800">{summary.created}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Mis à Jour</span>
                <span className="text-xl font-black text-amber-800">{summary.updated}</span>
              </div>
              <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Ignorés</span>
                <span className="text-xl font-black text-slate-700">{summary.skipped}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 shrink-0">
          {step === 'UPLOAD' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Annuler
            </button>
          )}

          {step === 'MAP_AND_PREVIEW' && (
            <>
              <button
                type="button"
                onClick={() => setStep('UPLOAD')}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Retour
              </button>
              
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleExecuteImport(true)}
                    disabled={validCount === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Ignore les lignes en rouge et importe seulement les lignes valides"
                  >
                    <span>Importer les Lignes Valides Uniquement ({validCount})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleExecuteImport(false)}
                  disabled={validCount === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Importer Tout ({validCount} articles)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 'SUMMARY' && (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-colors"
            >
              Fermer & Voir l'Inventaire
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
