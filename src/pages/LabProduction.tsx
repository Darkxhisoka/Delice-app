import React, { useEffect, useState } from 'react';
import { db } from '../db/db';
import { getRequisitions, getRawMaterials } from '../services/storage';
import { MASTER_PRODUCT_CATALOG } from '../utils/orderAggregator';
import { INITIAL_RAW_MATERIALS } from '../data/mockData';

export function LabProduction() {
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [rawReqs, setRawReqs] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>({});

  const log = (msg: string) => {
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const forceLoadDispatcher = async () => {
    setDebugLog([]);
    log("Starting dispatcher scan...");

    try {
      // 1. Load Requisitions
      let allReqs: any[] = [];
      try {
        if (db.requisitions) {
          allReqs = await db.requisitions.toArray();
        }
      } catch (err: any) {
        log(`Notice reading db.requisitions: ${err.message}`);
      }

      // Safe fallback if Dexie table is initially empty
      if (!allReqs || allReqs.length === 0) {
        const stored = getRequisitions();
        if (stored && stored.length > 0) {
          allReqs = stored;
          try {
            if (db.requisitions) {
              await db.requisitions.bulkPut(stored);
            }
          } catch {
            // ignore seed notice
          }
        }
      }

      log(`Total requisitions in IndexedDB: ${allReqs.length}`);
      setRawReqs(allReqs);

      // 2. Filter Approved Requisitions (Accepts any variation)
      const approved = allReqs.filter(r => {
        const st = (r.status || '').toLowerCase().trim();
        return st === 'approved' || st === 'approuvé' || st === 'approuve' || st === 'validated' || st === 'valide' || st === 'validé';
      });
      log(`Approved requisitions found: ${approved.length}`);

      if (approved.length === 0) {
        log("❌ STOPPED: No approved requisitions found. Check your approval button status string!");
        return;
      }

      // 3. Load Products & Raw Materials
      let products: any[] = [];
      let rawMaterials: any[] = [];
      try {
        products = await db.products.toArray();
      } catch (err: any) {
        log(`Notice loading db.products: ${err.message}`);
      }
      try {
        rawMaterials = await db.raw_materials.toArray();
      } catch (err: any) {
        log(`Notice loading db.raw_materials: ${err.message}`);
      }

      if (products.length === 0) {
        products = MASTER_PRODUCT_CATALOG.map((p, idx) => ({
          id: p.id || `prod-${idx + 1}`,
          name: p.name,
          roomId: p.roomId || 'patisserie_fine',
          category: p.category,
        }));
      }
      if (rawMaterials.length === 0) {
        const storageMats = getRawMaterials();
        rawMaterials = (storageMats && storageMats.length > 0 ? storageMats : INITIAL_RAW_MATERIALS).map((rm) => ({
          id: rm.id,
          name: rm.name,
          roomId: (rm as any).roomId || 'gateaux_secs',
          category: rm.category,
        }));
      }

      log(`Loaded ${products.length} products and ${rawMaterials.length} raw materials.`);

      const catalogMap = new Map();
      products.forEach(p => catalogMap.set(p.id, { name: p.name, roomId: p.roomId || 'patisserie_fine' }));
      rawMaterials.forEach(rm => catalogMap.set(rm.id, { name: rm.name, roomId: rm.roomId || 'gateaux_secs' }));

      // Also map by lowercase name for resilience
      products.forEach(p => catalogMap.set(p.name.toLowerCase().trim(), { name: p.name, roomId: p.roomId || 'patisserie_fine' }));
      rawMaterials.forEach(rm => catalogMap.set(rm.name.toLowerCase().trim(), { name: rm.name, roomId: rm.roomId || 'gateaux_secs' }));

      // 4. Aggregate
      const rooms: any = {};

      approved.forEach((req, idx) => {
        // Inspect ALL possible item array keys
        const orderLines = req.lines || req.items || req.cart || req.orderLines || [];
        log(`Req #${idx + 1} (ID: ${req.id}) has ${orderLines.length} line items.`);

        orderLines.forEach((line: any) => {
          const itemId = line.itemId || line.productId || line.id;
          const match = catalogMap.get(itemId) ||
            (line.productName ? catalogMap.get(line.productName.toLowerCase().trim()) : null) ||
            (line.itemTitle ? catalogMap.get(line.itemTitle.toLowerCase().trim()) : null);

          const roomId = match?.roomId || line.roomId || 'patisserie_fine';
          const itemName = match?.name || line.itemTitle || line.productName || line.name || 'Unknown Item';
          const qty = Number(line.requestedQty || line.quantityRequested || line.quantity || line.qty || 0);

          if (!rooms[roomId]) rooms[roomId] = {};
          if (!rooms[roomId][itemName]) rooms[roomId][itemName] = 0;
          rooms[roomId][itemName] += qty;
        });
      });

      setRoomData(rooms);
      log("✅ Success! Dispatcher aggregated room data successfully.");

    } catch (err: any) {
      log(`🔥 CRITICAL ERROR: ${err.message}`);
    }
  };

  useEffect(() => {
    forceLoadDispatcher();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 RTL-support">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow border">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lab Production Dispatcher</h1>
          <p className="text-sm text-gray-500">Ordres de Fabrication par laboratoire</p>
        </div>
        <button
          onClick={forceLoadDispatcher}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          🔄 Force Refresh
        </button>
      </div>

      {/* DEBUG PANEL */}
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono space-y-1">
        <div className="font-bold text-white mb-2">LIVE DIAGNOSTIC LOG:</div>
        {debugLog.map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>

      {/* DISPATCHER ROOM CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.keys(roomData).length === 0 ? (
          <div className="col-span-full bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-lg text-center font-medium">
            No orders rendered. Look at the LIVE DIAGNOSTIC LOG above to see where the data stopped.
          </div>
        ) : (
          Object.entries(roomData).map(([roomId, items]: [string, any]) => (
            <div key={roomId} className="bg-white border-2 border-blue-100 rounded-xl p-5 shadow-sm">
              <h2 className="text-lg font-bold text-blue-900 uppercase border-b pb-2 mb-4 flex justify-between">
                <span>📍 Room: {roomId.replace('_', ' ')}</span>
              </h2>
              <div className="space-y-2">
                {Object.entries(items).map(([title, qty]: [string, any]) => (
                  <div key={title} className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                    <span className="font-medium text-gray-700">{title}</span>
                    <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-xs">
                      Qty: {qty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
