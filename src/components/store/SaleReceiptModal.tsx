import React from 'react';
import { useTranslation } from 'react-i18next';
import { SaleTransaction, StoreLocation } from '../../types';
import { printThermalDocument, generatePosReceiptHtml } from '../../utils/thermalPrinter';
import {
  Printer,
  X,
  Store,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Receipt,
  Calendar,
  Clock,
  UserCheck
} from 'lucide-react';

interface SaleReceiptModalProps {
  sale: SaleTransaction;
  store?: StoreLocation;
  onClose: () => void;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  sale,
  store,
  onClose,
}) => {
  const { t, i18n } = useTranslation();

  const handlePrint = () => {
    const html = generatePosReceiptHtml({
      storeName: sale.storeName,
      receiptNumber: sale.transactionNumber,
      cashierName: sale.cashierName,
      date: sale.timestamp,
      items: sale.items.map(i => ({
        name: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.totalPrice
      })),
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.totalAmount,
      paymentMethod: sale.paymentMethod
    });
    printThermalDocument(html, `Ticket-${sale.transactionNumber}`);
  };

  const getPaymentIcon = () => {
    switch (sale.paymentMethod) {
      case 'CASH':
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      case 'CARD':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'CONTACTLESS':
      case 'MOBILE_PAY':
        return <Smartphone className="w-4 h-4 text-purple-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-slate-600" />;
    }
  };

  const getPaymentLabel = () => {
    switch (sale.paymentMethod) {
      case 'CASH':
        return t('saleReceipt.cash', 'Espèces');
      case 'CARD':
        return t('saleReceipt.card', 'Carte');
      default:
        return t('saleReceipt.contactless', 'Sans Contact');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Print CSS override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-sale-receipt, #printable-sale-receipt * {
            visibility: visible !important;
          }
          #printable-sale-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Modal Toolbar Header (No Print) */}
        <div className="no-print bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{t('saleReceipt.modalTitle', 'Ticket de Caisse Store')}</h3>
              <p className="text-xs text-slate-400">{t('saleReceipt.modalSubtitle', 'Document de Vente POS Client')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" /> {t('saleReceipt.print', 'Imprimer')}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thermal / Standard Receipt Body */}
        <div
          className="p-6 overflow-y-auto space-y-4 bg-white text-slate-900 font-sans"
          id="printable-sale-receipt"
        >
          {/* Header Branding */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              {t('saleReceipt.brandName', 'Pâtisserie le Délice')}
            </h2>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              {sale.storeName}
            </p>
            <p className="text-[11px] text-slate-500">
              {store?.address || t('saleReceipt.retailStore', 'Point de Vente Détail')} • {t('saleReceipt.tel', 'Tél')} : {store?.phone || '021 55 44 33'}
            </p>
          </div>

          {/* Transaction Metadata */}
          <div className="text-xs font-mono space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('saleReceipt.ticketNo', 'N° Ticket')} :</span>
              <strong className="text-slate-900">{sale.transactionNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('saleReceipt.dateTime', 'Date & Heure')} :</span>
              <span className="text-slate-800">{new Date(sale.timestamp).toLocaleString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('saleReceipt.cashier', 'Caissier')} :</span>
              <span className="text-slate-800 font-semibold">{sale.cashierName}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-500">{t('saleReceipt.payment', 'Paiement')} :</span>
              <span className="flex items-center gap-1 font-bold text-slate-900 uppercase text-[11px]">
                {getPaymentIcon()} {getPaymentLabel()}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1 text-start">
              {t('saleReceipt.itemDetails', 'Détail des Articles')}
            </div>
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="py-1 text-start">{t('saleReceipt.article', 'Article')}</th>
                  <th className="py-1 text-center">{t('saleReceipt.qty', 'Qté')}</th>
                  <th className="py-1 text-end">{t('saleReceipt.price', 'Prix')}</th>
                  <th className="py-1 text-end">{t('saleReceipt.total', 'Total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-1.5 font-medium pe-2">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-[10px] text-slate-400">{item.category}</div>
                    </td>
                    <td className="py-1.5 text-center font-mono">{item.quantity}</td>
                    <td className="py-1.5 text-end font-mono">{item.unitPrice.toFixed(2)} DZD</td>
                    <td className="py-1.5 text-end font-black font-mono">{item.totalPrice.toFixed(2)} DZD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="border-t-2 border-dashed border-slate-300 pt-3 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{t('saleReceipt.subtotal', 'Sous-total')} :</span>
              <span className="font-mono">{sale.subtotal.toFixed(2)} DZD</span>
            </div>

            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>{t('saleReceipt.discountApplied', 'Remise Appliquée')} :</span>
                <span className="font-mono">-{sale.discount.toFixed(2)} DZD</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>{t('saleReceipt.vat', 'TVA (8%)')} :</span>
              <span className="font-mono">{sale.tax.toFixed(2)} DZD</span>
            </div>

            <div className="flex justify-between items-center text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>{t('saleReceipt.totalPaid', 'Total Payé')} :</span>
              <span className="text-emerald-600 font-mono text-lg">{sale.totalAmount.toFixed(2)} DZD</span>
            </div>

            {sale.paymentMethod === 'CASH' && sale.cashTendered !== undefined && (
              <div className="pt-2 border-t border-slate-200 text-xs font-mono space-y-1 bg-slate-50 p-2 rounded-lg">
                <div className="flex justify-between text-slate-600">
                  <span>{t('saleReceipt.amountReceived', 'Montant Reçu')} :</span>
                  <span>{sale.cashTendered.toFixed(2)} DZD</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{t('saleReceipt.changeGiven', 'Rendu Monnaie')} :</span>
                  <span>{(sale.changeGiven ?? 0).toFixed(2)} DZD</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-400 space-y-1">
            <p className="font-bold text-slate-600">{t('saleReceipt.thankYou', 'Merci de votre visite à la Pâtisserie le Délice !')}</p>
            <p>{t('saleReceipt.freshDaily', 'Frais du jour préparé par notre Laboratoire Central de Production.')}</p>
            <p className="font-mono text-[9px] pt-1 text-slate-400">
              ID: {sale.id} • {t('saleReceipt.systemRegistered', 'Ticket Système Enregistré')}
            </p>
          </div>
        </div>

        {/* Modal Toolbar Footer (No Print) */}
        <div className="no-print bg-slate-100 p-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 cursor-pointer"
          >
            {t('saleReceipt.closeReceipt', 'Fermer le Ticket')}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" /> {t('saleReceipt.printReceipt', 'Imprimer le Ticket')}
          </button>
        </div>
      </div>
    </div>
  );
};
