import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
};

type DbProductRow = Omit<Product, 'available'> & { available: number };

export type OrderLineInput = { productId: string; quantity: number };

const dataDirectory = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(path.join(dataDirectory, 'cafeteria.sqlite'));
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    total REAL NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL
  );
`);

const seedProducts: Product[] = [
  { id: 'latte', name: 'Latte de vainilla', description: 'Espresso, leche vaporizada y vainilla.', price: 3.5, available: true },
  { id: 'muffin', name: 'Muffin de arándanos', description: 'Muffin horneado con arándanos frescos.', price: 2.75, available: true },
  { id: 'sandwich', name: 'Sándwich caprese', description: 'Pan artesanal, mozzarella, tomate y albahaca.', price: 6.25, available: true },
  { id: 'tea', name: 'Té de frutos rojos', description: 'Infusión de frutos rojos servida caliente.', price: 2.25, available: false }
];

export function resetData(): void {
  const reset = db.transaction(() => {
    db.prepare('DELETE FROM order_items').run();
    db.prepare('DELETE FROM orders').run();
    db.prepare('DELETE FROM products').run();
    const insert = db.prepare(
      'INSERT INTO products (id, name, description, price, available) VALUES (@id, @name, @description, @price, @available)'
    );
    seedProducts.forEach((product) => insert.run({ ...product, available: product.available ? 1 : 0 }));
  });
  reset();
}

const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
if (productCount.count === 0) resetData();

export function listProducts(): Product[] {
  const rows = db.prepare('SELECT id, name, description, price, available FROM products ORDER BY rowid').all() as DbProductRow[];
  return rows.map((row) => ({ ...row, available: Boolean(row.available) }));
}

export function createOrder(lines: OrderLineInput[]): { id: string; total: number; status: string; items: Array<Record<string, unknown>> };
export function createOrder(lines: OrderLineInput[]) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('El carrito está vacío.');

  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!line || typeof line.productId !== 'string' || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) {
      throw new Error('Cada cantidad debe ser un entero entre 1 y 20.');
    }
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity);
  }

  const items = [...merged.entries()].map(([productId, quantity]) => {
    const product = db.prepare('SELECT id, name, price, available FROM products WHERE id = ?').get(productId) as (Omit<Product, 'description' | 'available'> & { available: number }) | undefined;
    if (!product || !product.available) throw new Error(`El producto "${productId}" no está disponible.`);
    if (quantity > 20) throw new Error('La cantidad máxima por producto es 20.');
    const unitPrice = Number(product.price);
    return { productId, name: product.name, quantity, unitPrice, subtotal: roundMoney(unitPrice * quantity) };
  });

  const total = roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));
  const id = `CAF-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const save = db.transaction(() => {
    db.prepare('INSERT INTO orders (id, total, status, created_at) VALUES (?, ?, ?, ?)').run(id, total, 'confirmed', createdAt);
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)'
    );
    items.forEach((item) => insertItem.run(id, item.productId, item.name, item.quantity, item.unitPrice, item.subtotal));
  });
  save();
  return { id, total, status: 'confirmed', items };
}

export function findOrder(id: string): Record<string, unknown> | undefined {
  const order = db.prepare('SELECT id, total, status, created_at AS createdAt FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!order) return undefined;
  const items = db.prepare(
    'SELECT product_id AS productId, name, quantity, unit_price AS unitPrice, subtotal FROM order_items WHERE order_id = ? ORDER BY id'
  ).all(id);
  return { ...order, items };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

