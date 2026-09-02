import { notifyToast } from '../services/storage';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      printThermal: (options: {
        html: string;
        silent?: boolean;
        printerName?: string;
        copies?: number;
        pageSize?: any;
      }) => Promise<{ success: boolean; error?: string }>;
      getPrinters: () => Promise<any[]>;
    };
  }
}

/**
 * Print thermal ticket/label either natively via Electron silent print or browser print dialog
 */
export async function printThermalDocument(
  htmlContent: string,
  title: string = 'Impression Thermique'
): Promise<boolean> {
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
            width: 76mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.25;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 6px 0;
          }
          .flex {
            display: flex;
            justify-content: space-between;
          }
          .barcode {
            font-family: 'Libre Barcode 39', monospace, sans-serif;
            font-size: 28px;
            text-align: center;
            letter-spacing: 4px;
            margin: 6px 0 2px 0;
          }
          .cut-margin {
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  // 1. If running inside Electron desktop app, use silent direct printing
  if (window.electronAPI?.printThermal) {
    try {
      const res = await window.electronAPI.printThermal({
        html: fullHtml,
        silent: true,
        pageSize: { width: 80000, height: 297000 }
      });
      if (res.success) {
        notifyToast({
          type: 'success',
          title: 'Impression Directe',
          message: 'Ticket thermique imprimé avec succès sur l\'imprimante POS.'
        });
        return true;
      } else {
        console.warn('Electron silent print returned error:', res.error);
      }
    } catch (err: any) {
      console.warn('Electron print call failed, falling back to browser print:', err);
    }
  }

  // 2. Web fallback: invisible iframe
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        throw new Error('Unable to access print iframe document');
      }

      doc.open();
      doc.write(fullHtml);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            notifyToast({
              type: 'info',
              title: 'Impression Thermique',
              message: 'Ordre d\'impression envoyé à l\'imprimante.'
            });
            setTimeout(() => {
              document.body.removeChild(iframe);
              resolve(true);
            }, 1000);
          } catch (e) {
            document.body.removeChild(iframe);
            resolve(false);
          }
        }, 300);
      };
    } catch (error: any) {
      console.error('Thermal printing error:', error);
      notifyToast({
        type: 'error',
        title: 'Erreur d\'impression',
        message: 'Impossible de lancer l\'impression thermique.'
      });
      resolve(false);
    }
  });
}

/**
 * Generate Thermal Label HTML for a Production Batch (Fiche de Production)
 */
export function generateProductionLabelHtml(batch: {
  batchNumber: string;
  recipeName: string;
  quantity: number;
  unit: string;
  productionDate: string;
  expiryDate?: string;
  supervisorName?: string;
  ingredientsSummary?: string;
}): string {
  const prodDate = new Date(batch.productionDate).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div class="text-center font-bold" style="font-size: 15px; margin-bottom: 2px;">
      DÉLICE PÂTISSERIE
    </div>
    <div class="text-center" style="font-size: 11px; margin-bottom: 4px;">
      LABORATOIRE CENTRAL DE PRODUCTION
    </div>
    <div class="double-divider"></div>

    <div class="text-center font-bold" style="font-size: 14px; margin: 4px 0;">
      ${batch.recipeName.toUpperCase()}
    </div>
    <div class="text-center font-bold" style="font-size: 13px; color: #111;">
      QUANTITÉ : ${batch.quantity} ${batch.unit || 'portions'}
    </div>

    <div class="divider"></div>

    <div class="flex">
      <span>N° DE LOT :</span>
      <span class="font-bold font-mono">${batch.batchNumber}</span>
    </div>
    <div class="flex">
      <span>FABRIQUÉ LE :</span>
      <span>${prodDate}</span>
    </div>
    ${batch.expiryDate ? `
    <div class="flex">
      <span class="font-bold">DLC / EXPIRATION :</span>
      <span class="font-bold">${new Date(batch.expiryDate).toLocaleDateString('fr-FR')}</span>
    </div>` : ''}
    ${batch.supervisorName ? `
    <div class="flex">
      <span>RESPONSABLE :</span>
      <span>${batch.supervisorName}</span>
    </div>` : ''}

    ${batch.ingredientsSummary ? `
    <div class="divider"></div>
    <div style="font-size: 10px; line-height: 1.2;">
      <span class="font-bold">Composants :</span> ${batch.ingredientsSummary}
    </div>` : ''}

    <div class="divider"></div>
    <div class="barcode">*${batch.batchNumber}*</div>
    <div class="text-center font-mono" style="font-size: 10px;">${batch.batchNumber}</div>
    <div class="cut-margin"></div>
  `;
}

/**
 * Generate Thermal POS Receipt HTML for Store Sales
 */
export function generatePosReceiptHtml(sale: {
  receiptNumber: string;
  storeName: string;
  date: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax?: number;
  total: number;
  cashierName?: string;
  paymentMethod?: string;
}): string {
  return `
    <div class="text-center font-bold" style="font-size: 16px;">
      PÂTISSERIE LE DÉLICE
    </div>
    <div class="text-center" style="font-size: 11px;">
      ${sale.storeName}
    </div>
    <div class="text-center" style="font-size: 10px;">
      Tél: 0550 12 34 56 • Alger, Algérie
    </div>
    <div class="double-divider"></div>

    <div class="flex" style="font-size: 11px;">
      <span>TICKET N°:</span>
      <span class="font-bold font-mono">${sale.receiptNumber}</span>
    </div>
    <div class="flex" style="font-size: 11px;">
      <span>DATE:</span>
      <span>${new Date(sale.date).toLocaleString('fr-FR')}</span>
    </div>
    ${sale.cashierName ? `
    <div class="flex" style="font-size: 11px;">
      <span>CAISSIER:</span>
      <span>${sale.cashierName}</span>
    </div>` : ''}

    <div class="divider"></div>

    <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 1px solid #000; text-align: left;">
          <th style="padding: 2px 0;">ART</th>
          <th style="text-align: center; padding: 2px 0;">QTÉ</th>
          <th style="text-align: right; padding: 2px 0;">P.U</th>
          <th style="text-align: right; padding: 2px 0;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${sale.items.map(item => `
          <tr>
            <td style="padding: 2px 0;">${item.name}</td>
            <td style="text-align: center; padding: 2px 0;">${item.quantity}</td>
            <td style="text-align: right; padding: 2px 0;">${item.unitPrice.toLocaleString('fr-DZ')}</td>
            <td style="text-align: right; padding: 2px 0; font-weight: bold;">${item.total.toLocaleString('fr-DZ')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="double-divider"></div>

    <div class="flex" style="font-size: 14px; font-weight: bold;">
      <span>TOTAL À PAYER:</span>
      <span>${sale.total.toLocaleString('fr-DZ')} DZD</span>
    </div>
    ${sale.paymentMethod ? `
    <div class="flex" style="font-size: 11px; margin-top: 2px;">
      <span>MODE DE RÈGLEMENT:</span>
      <span>${sale.paymentMethod}</span>
    </div>` : ''}

    <div class="divider"></div>
    <div class="text-center font-bold" style="font-size: 11px; margin-top: 4px;">
      MERCI DE VOTRE VISITE !
    </div>
    <div class="text-center" style="font-size: 10px;">
      Conservez ce ticket pour toute réclamation.
    </div>
    <div class="barcode">*${sale.receiptNumber}*</div>
    <div class="cut-margin"></div>
  `;
}
