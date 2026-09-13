import{n as o}from"./index-BRaT5fgv.js";async function f(e,i="Impression Thermique"){var a;const r=`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${i}</title>
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
        ${e}
      </body>
    </html>
  `;if((a=window.electronAPI)!=null&&a.printThermal)try{const n=await window.electronAPI.printThermal({html:r,silent:!0,pageSize:{width:8e4,height:297e3}});if(n.success)return o({type:"success",title:"Impression Directe",message:"Ticket thermique imprimé avec succès sur l'imprimante POS."}),!0;console.warn("Electron silent print returned error:",n.error)}catch(n){console.warn("Electron print call failed, falling back to browser print:",n)}return new Promise(n=>{var d;try{const t=document.createElement("iframe");t.style.position="fixed",t.style.right="0",t.style.bottom="0",t.style.width="0",t.style.height="0",t.style.border="0",document.body.appendChild(t);const s=(d=t.contentWindow)==null?void 0:d.document;if(!s)throw new Error("Unable to access print iframe document");s.open(),s.write(r),s.close(),t.onload=()=>{setTimeout(()=>{var l,p;try{(l=t.contentWindow)==null||l.focus(),(p=t.contentWindow)==null||p.print(),o({type:"info",title:"Impression Thermique",message:"Ordre d'impression envoyé à l'imprimante."}),setTimeout(()=>{document.body.removeChild(t),n(!0)},1e3)}catch{document.body.removeChild(t),n(!1)}},300)}}catch(t){console.error("Thermal printing error:",t),o({type:"error",title:"Erreur d'impression",message:"Impossible de lancer l'impression thermique."}),n(!1)}})}function x(e){const i=new Date(e.productionDate).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});return`
    <div class="text-center font-bold" style="font-size: 15px; margin-bottom: 2px;">
      DÉLICE PÂTISSERIE
    </div>
    <div class="text-center" style="font-size: 11px; margin-bottom: 4px;">
      LABORATOIRE CENTRAL DE PRODUCTION
    </div>
    <div class="double-divider"></div>

    <div class="text-center font-bold" style="font-size: 14px; margin: 4px 0;">
      ${e.recipeName.toUpperCase()}
    </div>
    <div class="text-center font-bold" style="font-size: 13px; color: #111;">
      QUANTITÉ : ${e.quantity} ${e.unit||"portions"}
    </div>

    <div class="divider"></div>

    <div class="flex">
      <span>N° DE LOT :</span>
      <span class="font-bold font-mono">${e.batchNumber}</span>
    </div>
    <div class="flex">
      <span>FABRIQUÉ LE :</span>
      <span>${i}</span>
    </div>
    ${e.expiryDate?`
    <div class="flex">
      <span class="font-bold">DLC / EXPIRATION :</span>
      <span class="font-bold">${new Date(e.expiryDate).toLocaleDateString("fr-FR")}</span>
    </div>`:""}
    ${e.supervisorName?`
    <div class="flex">
      <span>RESPONSABLE :</span>
      <span>${e.supervisorName}</span>
    </div>`:""}

    ${e.ingredientsSummary?`
    <div class="divider"></div>
    <div style="font-size: 10px; line-height: 1.2;">
      <span class="font-bold">Composants :</span> ${e.ingredientsSummary}
    </div>`:""}

    <div class="divider"></div>
    <div class="barcode">*${e.batchNumber}*</div>
    <div class="text-center font-mono" style="font-size: 10px;">${e.batchNumber}</div>
    <div class="cut-margin"></div>
  `}function v(e){return`
    <div class="text-center font-bold" style="font-size: 16px;">
      PÂTISSERIE LE DÉLICE
    </div>
    <div class="text-center" style="font-size: 11px;">
      ${e.storeName}
    </div>
    <div class="text-center" style="font-size: 10px;">
      Tél: 0550 12 34 56 • Alger, Algérie
    </div>
    <div class="double-divider"></div>

    <div class="flex" style="font-size: 11px;">
      <span>TICKET N°:</span>
      <span class="font-bold font-mono">${e.receiptNumber}</span>
    </div>
    <div class="flex" style="font-size: 11px;">
      <span>DATE:</span>
      <span>${new Date(e.date).toLocaleString("fr-FR")}</span>
    </div>
    ${e.cashierName?`
    <div class="flex" style="font-size: 11px;">
      <span>CAISSIER:</span>
      <span>${e.cashierName}</span>
    </div>`:""}

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
        ${e.items.map(i=>`
          <tr>
            <td style="padding: 2px 0;">${i.name}</td>
            <td style="text-align: center; padding: 2px 0;">${i.quantity}</td>
            <td style="text-align: right; padding: 2px 0;">${i.unitPrice.toLocaleString("fr-DZ")}</td>
            <td style="text-align: right; padding: 2px 0; font-weight: bold;">${i.total.toLocaleString("fr-DZ")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="double-divider"></div>

    <div class="flex" style="font-size: 14px; font-weight: bold;">
      <span>TOTAL À PAYER:</span>
      <span>${e.total.toLocaleString("fr-DZ")} DZD</span>
    </div>
    ${e.paymentMethod?`
    <div class="flex" style="font-size: 11px; margin-top: 2px;">
      <span>MODE DE RÈGLEMENT:</span>
      <span>${e.paymentMethod}</span>
    </div>`:""}

    <div class="divider"></div>
    <div class="text-center font-bold" style="font-size: 11px; margin-top: 4px;">
      MERCI DE VOTRE VISITE !
    </div>
    <div class="text-center" style="font-size: 10px;">
      Conservez ce ticket pour toute réclamation.
    </div>
    <div class="barcode">*${e.receiptNumber}*</div>
    <div class="cut-margin"></div>
  `}export{x as a,v as g,f as p};
