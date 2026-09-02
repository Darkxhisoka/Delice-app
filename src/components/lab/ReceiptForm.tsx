import React, { useState, useEffect } from 'react';
import {
  getRawMaterials,
  getSuppliers,
  addReceipt,
  addSupplier,
  notifyToast,
  subscribeToStoreChanges
} from '../../services/storage';
import { RawMaterial, Supplier, ReceiptItem } from '../../types';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import {
  Plus,
  Trash2,
  FileCheck2,
  DollarSign,
  Building,
  Calendar,
  Receipt,
  TrendingUp,
  PackageCheck,
  Sparkles,
  AlertCircle,
  Scan,
  Barcode
} from 'lucide-react';

interface ReceiptFormProps {
  onSuccess?: () => void;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({ onSuccess }) => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Form Fields
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [customSupplierName, setCustomSupplierName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `INV-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [notes, setNotes] = useState<string>('');
  const [recordedBy, setRecordedBy] = useState<string>('Inventory Manager');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Dynamic Line Items State
  const [lineItems, setLineItems] = useState<
    {
      rawMaterialId: string;
      quantity: number;
      unitPrice: number;
    }[]
  >([]);

  const handleBarcodeDetected = (material: RawMaterial, _barcode: string) => {
    setLineItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.rawMaterialId === material.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: Number((updated[existingIdx].quantity + 1).toFixed(2)),
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            rawMaterialId: material.id,
            quantity: 1,
            unitPrice: material.currentAvgCost || 5.0,
          },
        ];
      }
    });

    notifyToast({
      type: 'success',
      title: 'Matière Scannée avec Succès !',
      message: `${material.name} (${material.sku}) scanné et ajouté à la facture.`
    });
  };

  useEffect(() => {
    const load = () => {
      const mats = getRawMaterials();
      const sups = getSuppliers();
      setRawMaterials(mats);
      setSuppliers(sups);

      if (sups.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(sups[0].id);
      }

      // Initialize with 1 line item if empty
      if (mats.length > 0 && lineItems.length === 0) {
        setLineItems([
          {
            rawMaterialId: mats[0].id,
            quantity: 50,
            unitPrice: mats[0].currentAvgCost || 5.0,
          },
        ]);
      }
    };
    load();
    return subscribeToStoreChanges(load);
  }, []);

  const handleAddLineItem = () => {
    if (rawMaterials.length === 0) return;
    const defaultMat = rawMaterials[0];
    setLineItems((prev) => [
      ...prev,
      {
        rawMaterialId: defaultMat.id,
        quantity: 10,
        unitPrice: defaultMat.currentAvgCost || 2.5,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      alert('Receipt must contain at least one raw material line item.');
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, matId: string) => {
    const mat = rawMaterials.find((m) => m.id === matId);
    if (!mat) return;

    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        rawMaterialId: matId,
        unitPrice: mat.currentAvgCost || 1.0,
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const validQty = Math.max(0.01, qty);
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: validQty };
      return updated;
    });
  };

  const handleUnitPriceChange = (index: number, price: number) => {
    const validPrice = Math.max(0, price);
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unitPrice: validPrice };
      return updated;
    });
  };

  // Dynamic Total Calculation
  const totalInvoiceAmount = lineItems.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (lineItems.length === 0) {
      notifyToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please add at least one raw material line item.',
      });
      return;
    }

    if (!invoiceNumber.trim()) {
      notifyToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide an Invoice/Receipt Number.',
      });
      return;
    }

    // Determine supplier name
    let supplierName = '';
    let supplierId = selectedSupplierId;

    if (selectedSupplierId === 'NEW_SUPPLIER') {
      if (!customSupplierName.trim()) {
        notifyToast({
          type: 'error',
          title: 'Validation Error',
          message: 'Please enter the new supplier name.',
        });
        return;
      }
      const createdSup = addSupplier({
        name: customSupplierName.trim(),
        contactPerson: 'Accounts Payable',
        email: 'billing@supplier.com',
        phone: 'N/A',
        categoriesProvided: ['General Raw Materials'],
        paymentTerms: 'Net 30',
      });
      supplierId = createdSup.id;
      supplierName = createdSup.name;
    } else {
      const matchedSup = suppliers.find((s) => s.id === selectedSupplierId);
      supplierName = matchedSup ? matchedSup.name : 'Direct Purchasing';
    }

    // Format receipt items with full details
    const receiptItems: ReceiptItem[] = lineItems.map((item, idx) => {
      const mat = rawMaterials.find((m) => m.id === item.rawMaterialId)!;
      return {
        id: `ri-${Date.now()}-${idx}`,
        rawMaterialId: mat.id,
        rawMaterialName: mat.name,
        unit: mat.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalCost: item.quantity * item.unitPrice,
      };
    });

    // Submit Receipt -> auto updates central lab stock & recalculates weighted moving avg unit cost
    const { receipt, updatedMaterialsSummary } = addReceipt({
      supplierId,
      supplierName,
      invoiceNumber: invoiceNumber.trim(),
      purchaseDate,
      items: receiptItems,
      totalAmount: totalInvoiceAmount,
      notes,
      recordedBy,
    });

    // Build notification message summary
    const summaryLines = updatedMaterialsSummary
      .map(
        (m) =>
          `• ${m.name}: Stock +${m.newStock - m.oldStock} (New Total: ${m.newStock}). Avg Cost: ${m.oldAvgCost.toFixed(2)} DZD → ${m.newAvgCost.toFixed(2)} DZD`
      )
      .join('\n');

    notifyToast({
      type: 'success',
      title: `Receipt ${receipt.receiptNumber} Logged Successfully!`,
      message: `Total Invoice: ${totalInvoiceAmount.toFixed(2)} DZD\nUpdated ${updatedMaterialsSummary.length} Raw Materials:\n${summaryLines}`,
    });

    // Reset form
    setInvoiceNumber(`INV-${Math.floor(10000 + Math.random() * 90000)}`);
    setNotes('');
    if (rawMaterials.length > 0) {
      setLineItems([
        {
          rawMaterialId: rawMaterials[0].id,
          quantity: 50,
          unitPrice: rawMaterials[0].currentAvgCost || 5.0,
        },
      ]);
    }

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Central Lab Procurement
              </span>
              <span className="text-xs text-indigo-200 font-medium">Receipts & Purchasing Module</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Record Incoming Raw Material Receipt</h2>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Receiving inventory automatically updates stock levels and recalculates weighted average unit costs.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-right shrink-0">
            <span className="text-[11px] text-indigo-200 block uppercase font-bold tracking-wider">Total Invoice Cost</span>
            <span className="text-2xl font-black text-amber-300">{totalInvoiceAmount.toFixed(2)} DZD</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Receipt Header Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'Achat</label>
            <div className="relative">
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full text-xs font-medium bg-white text-slate-900 rounded-xl px-3 py-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500 pr-8 min-h-[44px]"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fournisseur / Vendeur</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full text-xs font-medium bg-white text-slate-900 rounded-xl px-3 py-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            >
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} ({sup.paymentTerms})
                </option>
              ))}
              <option value="NEW_SUPPLIER">+ Ajouter un Fournisseur Personnalisé</option>
            </select>

            {selectedSupplierId === 'NEW_SUPPLIER' && (
              <input
                type="text"
                required
                placeholder="Entrer le nom du fournisseur"
                value={customSupplierName}
                onChange={(e) => setCustomSupplierName(e.target.value)}
                className="w-full mt-2 text-xs font-medium bg-white text-slate-900 rounded-xl px-3 py-2 border border-amber-300 focus:ring-2 focus:ring-amber-500 min-h-[44px]"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">N° Facture / Bon de Réception</label>
            <div className="relative">
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="ex: INV-98401"
                className="w-full text-xs font-mono font-bold bg-white text-slate-900 rounded-xl px-3 py-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              />
              <Receipt className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Enregistré par (Responsable)</label>
            <input
              type="text"
              required
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              className="w-full text-xs font-medium bg-white text-slate-900 rounded-xl px-3 py-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Dynamic Line Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-indigo-600" />
                Raw Material Line Items ({lineItems.length})
              </h3>
              <p className="text-xs text-slate-500">
                Select raw materials received, quantity, and unit price paid.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all touch-manipulation min-h-[40px]"
              >
                <Scan className="w-4 h-4 text-emerald-300" />
                Scanner Code-Barres
              </button>

              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors min-h-[40px]"
              >
                <Plus className="w-4 h-4 text-indigo-600" /> Ajouter Ligne
              </button>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3 w-8">#</th>
                    <th className="p-3 min-w-[240px]">Raw Material Item</th>
                    <th className="p-3 w-28">Category</th>
                    <th className="p-3 w-32">Quantity Received</th>
                    <th className="p-3 w-20">Unit</th>
                    <th className="p-3 w-36 text-right">Unit Price Paid (DZD)</th>
                    <th className="p-3 w-36 text-right">Current Avg Cost (DZD)</th>
                    <th className="p-3 w-36 text-right">Line Total (DZD)</th>
                    <th className="p-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {lineItems.map((item, index) => {
                    const mat = rawMaterials.find((m) => m.id === item.rawMaterialId);
                    const lineTotal = item.quantity * item.unitPrice;

                    // Preview of moving average recalculation
                    let previewAvgCost = item.unitPrice;
                    if (mat && mat.currentStock > 0) {
                      previewAvgCost =
                        (mat.currentStock * mat.currentAvgCost + item.quantity * item.unitPrice) /
                        (mat.currentStock + item.quantity);
                    }

                    return (
                      <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-400">{index + 1}</td>
                        <td className="p-3">
                          <select
                            value={item.rawMaterialId}
                            onChange={(e) => handleMaterialChange(index, e.target.value)}
                            className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                          >
                            {rawMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {mat?.category || 'General'}
                          </span>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            inputMode="decimal"
                            pattern="[0-9.]*"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                            className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 text-center focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                          />
                        </td>
                        <td className="p-3 font-medium text-slate-600">{mat?.unit || 'unit'}</td>
                        <td className="p-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-3 text-slate-400 text-[10px] font-bold">DZD</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              pattern="[0-9.]*"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleUnitPriceChange(index, parseFloat(e.target.value) || 0)}
                              className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl py-2.5 pl-9 pr-2 text-right focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-slate-400 text-[10px]">
                              Was: {mat?.currentAvgCost.toFixed(2)} DZD
                            </span>
                            <span className="font-semibold text-emerald-700 text-xs flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" />
                              {previewAvgCost.toFixed(2)} DZD
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {lineTotal.toFixed(2)} DZD
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove Line Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Additional Receipt Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Delivery Notes & Quality Inspection Remarks (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Temperature verified at 4°C, pallets sealed, exp date verified..."
            className="w-full text-xs font-medium bg-white text-slate-900 rounded-lg p-3 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Submission Action Footer */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Recalculates weighted average unit cost dynamically across inventory.</span>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <FileCheck2 className="w-4 h-4" />
            Process Receipt & Update Stock ({totalInvoiceAmount.toFixed(2)} DZD)
          </button>
        </div>

      </form>

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        rawMaterials={rawMaterials}
        onDetected={handleBarcodeDetected}
      />
    </div>
  );
};
