import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

// Users table (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('STORE_MANAGER'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Raw Materials table
export const rawMaterials = pgTable('raw_materials', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  unit: text('unit').notNull(),
  currentStock: integer('current_stock').default(0),
  currentAvgCost: integer('current_avg_cost').default(0),
  minReorderLevel: integer('min_reorder_level').default(10),
  barcode: text('barcode'),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// Packaging Materials (Emballages) table
export const packagingMaterials = pgTable('packaging_materials', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  unitType: text('unit_type').notNull(),
  centralStockQty: integer('central_stock_qty').default(0),
  minAlertQty: integer('min_alert_qty').default(100),
  unitCost: integer('unit_cost').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Inventory Adjustments / Destocking
export const inventoryAdjustments = pgTable('inventory_adjustments', {
  id: text('id').primaryKey(),
  rawMaterialId: text('raw_material_id'),
  rawMaterialName: text('raw_material_name'),
  unit: text('unit'),
  quantityRemoved: integer('quantity_removed').default(0),
  unitCostAtTime: integer('unit_cost_at_time').default(0),
  totalLossValue: integer('total_loss_value').default(0),
  reasonCategory: text('reason_category').notNull(),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Activity logs
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  actor: text('actor'),
  severity: text('severity').default('info'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});
