/**
 * Intelligent Seed Script for E-commerce Demo Database
 *
 * Generates realistic data for the ecommerce_demo schema.
 * Uses mysql2/promise (already a project dependency).
 *
 * Usage:
 *   npx tsx docker/seed/seed.ts                       # default scale=1000
 *   npx tsx docker/seed/seed.ts --scale 5000
 *   npx tsx docker/seed/seed.ts --host 127.0.0.1 --port 3316
 *
 * The script is idempotent: it truncates all tables before inserting.
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  scale: number;
} {
  // Load .env from project root if it exists
  config({ path: resolve(process.cwd(), '.env') });

  const args = process.argv.slice(2);
  const get = (flag: string, fallback: string): string => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };

  return {
    host: get('--host', process.env.SQLSAGE_HOST || 'localhost'),
    port: parseInt(get('--port', process.env.SQLSAGE_PORT || '3316'), 10),
    user: get('--user', process.env.SQLSAGE_USER || 'root'),
    password: get('--password', process.env.SQLSAGE_PASSWORD || 'sqlsage_root_pass'),
    database: get('--database', process.env.SQLSAGE_DATABASE || 'ecommerce_demo'),
    scale: parseInt(get('--scale', '1000'), 10),
  };
}

// ---------------------------------------------------------------------------
// Deterministic-ish random (simple seeded LCG)
// ---------------------------------------------------------------------------

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  weighted<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Felipe', 'Gabriela', 'Hugo',
  'Isabela', 'Joao', 'Karen', 'Lucas', 'Marina', 'Nicolas', 'Olivia',
  'Paulo', 'Raquel', 'Samuel', 'Tatiana', 'Vinicius',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
  'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
  'Araujo', 'Melo', 'Barbosa', 'Rocha', 'Dias', 'Nascimento',
];

const CITIES: Array<[string, string]> = [
  ['Sao Paulo', 'SP'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'],
  ['Curitiba', 'PR'], ['Porto Alegre', 'RS'], ['Salvador', 'BA'],
  ['Brasilia', 'DF'], ['Fortaleza', 'CE'], ['Recife', 'PE'], ['Manaus', 'AM'],
  ['Goiania', 'GO'], ['Campinas', 'SP'], ['Florianopolis', 'SC'],
  ['Vitoria', 'ES'], ['Natal', 'RN'], ['Joinville', 'SC'],
  ['Londrina', 'PR'], ['Uberlandia', 'MG'], ['Aracaju', 'SE'], ['Maceio', 'AL'],
];

const CATEGORY_TREE: Array<{ name: string; slug: string; children: Array<{ name: string; slug: string }> }> = [
  {
    name: 'Eletronicos', slug: 'eletronicos', children: [
      { name: 'Smartphones', slug: 'smartphones' },
      { name: 'Notebooks', slug: 'notebooks' },
      { name: 'Acessorios', slug: 'acessorios-eletronicos' },
    ],
  },
  {
    name: 'Moda', slug: 'moda', children: [
      { name: 'Camisetas', slug: 'camisetas' },
      { name: 'Calcados', slug: 'calcados' },
      { name: 'Bolsas', slug: 'bolsas' },
    ],
  },
  {
    name: 'Casa e Jardim', slug: 'casa-jardim', children: [
      { name: 'Moveis', slug: 'moveis' },
      { name: 'Decoracao', slug: 'decoracao' },
      { name: 'Ferramentas', slug: 'ferramentas' },
    ],
  },
  {
    name: 'Esportes', slug: 'esportes', children: [
      { name: 'Fitness', slug: 'fitness' },
      { name: 'Corrida', slug: 'corrida' },
    ],
  },
  {
    name: 'Livros', slug: 'livros', children: [
      { name: 'Ficcao', slug: 'ficcao' },
      { name: 'Tecnico', slug: 'tecnico' },
    ],
  },
];

const PRODUCT_ADJECTIVES = [
  'Premium', 'Classic', 'Ultra', 'Pro', 'Slim', 'Max', 'Essential', 'Basic',
  'Elite', 'Sport', 'Eco', 'Smart', 'Turbo', 'Mini', 'Plus',
];

const REVIEW_TITLES = [
  'Otimo produto', 'Boa qualidade', 'Superou expectativas', 'Razoavel',
  'Poderia ser melhor', 'Excelente custo-beneficio', 'Nao recomendo',
  'Muito bom', 'Produto mediano', 'Entrega rapida', 'Pessimo acabamento',
  'Vale a pena', 'Surpreendente', 'Cumpre o que promete', 'Decepcionante',
];

const ORDER_STATUSES: Array<'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'> =
  ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
const ORDER_STATUS_WEIGHTS = [15, 5, 10, 65, 5];

const PAYMENT_METHODS: Array<'credit_card' | 'debit_card' | 'pix' | 'boleto'> =
  ['credit_card', 'debit_card', 'pix', 'boleto'];
const PAYMENT_METHOD_WEIGHTS = [50, 10, 25, 15];

const RATING_VALUES = [1, 2, 3, 4, 5];
const RATING_WEIGHTS = [5, 10, 20, 35, 30]; // bell curve centered at 4

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeStr(s: string): string {
  return s.replace(/'/g, "''");
}

function randomDate(rng: SeededRandom, startYear: number, endYear: number): string {
  const year = rng.int(startYear, endYear);
  const month = rng.int(1, 12);
  const day = rng.int(1, 28);
  const hour = rng.int(0, 23);
  const min = rng.int(0, 59);
  const sec = rng.int(0, 59);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function logProgress(label: string, current: number, total: number): void {
  const pct = Math.round((current / total) * 100);
  process.stdout.write(`\r  [${label}] ${current}/${total} (${pct}%)`);
  if (current === total) process.stdout.write('\n');
}

// ---------------------------------------------------------------------------
// Batch inserter
// ---------------------------------------------------------------------------

async function batchInsert(
  conn: mysql.Connection,
  table: string,
  columns: string[],
  rows: string[][],
  batchSize: number = 500,
  label?: string
): Promise<void> {
  const colList = columns.join(', ');
  const total = rows.length;
  for (let i = 0; i < total; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch.map(row => `(${row.join(', ')})`).join(',\n');
    await conn.execute(`INSERT INTO ${table} (${colList}) VALUES ${values}`);
    if (label) logProgress(label, Math.min(i + batchSize, total), total);
  }
}

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedCategories(conn: mysql.Connection): Promise<Map<string, number>> {
  const slugToId = new Map<string, number>();
  let id = 1;

  for (const parent of CATEGORY_TREE) {
    await conn.execute(
      `INSERT INTO categories (id, name, slug, parent_id) VALUES (${id}, '${escapeStr(parent.name)}', '${parent.slug}', NULL)`
    );
    const parentId = id;
    slugToId.set(parent.slug, parentId);
    id++;

    for (const child of parent.children) {
      await conn.execute(
        `INSERT INTO categories (id, name, slug, parent_id) VALUES (${id}, '${escapeStr(child.name)}', '${child.slug}', ${parentId})`
      );
      slugToId.set(child.slug, id);
      id++;
    }
  }

  console.log(`  [categories] ${id - 1} rows inserted`);
  return slugToId;
}

async function seedProducts(
  conn: mysql.Connection,
  rng: SeededRandom,
  categoryIds: number[],
  count: number
): Promise<number> {
  const rows: string[][] = [];

  for (let i = 1; i <= count; i++) {
    const adj = rng.pick(PRODUCT_ADJECTIVES);
    const catId = rng.pick(categoryIds);
    const name = `${adj} Product ${i}`;
    const slug = `${adj.toLowerCase()}-product-${i}`;
    // Log-normal-ish price distribution: $5 - $2000
    const price = Math.round((Math.exp(rng.next() * 5.3 + 1.6) * 0.5 + 5) * 100) / 100;
    const clampedPrice = Math.min(price, 2000);
    const stock = rng.int(0, 500);
    const isActive = rng.next() > 0.05 ? 1 : 0;
    const createdAt = randomDate(rng, 2023, 2025);

    rows.push([
      String(i),
      `'${escapeStr(name)}'`,
      `'${escapeStr(slug)}'`,
      `'${escapeStr(name)} - descricao do produto ${i}'`,
      String(catId),
      String(clampedPrice),
      String(stock),
      String(isActive),
      `'${createdAt}'`,
      `'${createdAt}'`,
    ]);
  }

  await batchInsert(conn, 'products',
    ['id', 'name', 'slug', 'description', 'category_id', 'price', 'stock_quantity', 'is_active', 'created_at', 'updated_at'],
    rows, 500, 'products');

  return count;
}

async function seedCustomers(
  conn: mysql.Connection,
  rng: SeededRandom,
  count: number
): Promise<number> {
  const rows: string[][] = [];

  for (let i = 1; i <= count; i++) {
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@email.com`;
    const phone = rng.next() > 0.3 ? `'(${rng.int(11, 99)}) 9${rng.int(1000, 9999)}-${rng.int(1000, 9999)}'` : 'NULL';
    const [city, state] = rng.pick(CITIES);
    const createdAt = randomDate(rng, 2022, 2025);

    rows.push([
      String(i),
      `'${escapeStr(name)}'`,
      `'${escapeStr(email)}'`,
      phone,
      `'${escapeStr(city)}'`,
      `'${state}'`,
      `'${createdAt}'`,
    ]);
  }

  await batchInsert(conn, 'customers',
    ['id', 'name', 'email', 'phone', 'city', 'state', 'created_at'],
    rows, 500, 'customers');

  return count;
}

async function seedOrders(
  conn: mysql.Connection,
  rng: SeededRandom,
  customerCount: number,
  productCount: number,
  orderCount: number
): Promise<{ orderItemRows: number; paymentRows: number }> {
  const orderRows: string[][] = [];
  const itemRows: string[][] = [];
  const paymentRows: string[][] = [];
  let itemId = 1;
  let paymentId = 1;

  for (let orderId = 1; orderId <= orderCount; orderId++) {
    const customerId = rng.int(1, customerCount);
    const status = rng.weighted(ORDER_STATUSES, ORDER_STATUS_WEIGHTS);
    const createdAt = randomDate(rng, 2023, 2026);
    const itemsInOrder = rng.weighted([1, 2, 3, 4, 5, 6, 7, 8], [30, 25, 20, 10, 7, 4, 2, 2]);

    let orderTotal = 0;

    // Generate order items
    for (let j = 0; j < itemsInOrder; j++) {
      const productId = rng.int(1, productCount);
      const quantity = rng.weighted([1, 2, 3, 4, 5], [50, 25, 15, 7, 3]);
      const unitPrice = Math.round((rng.next() * 500 + 10) * 100) / 100;
      const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
      orderTotal += totalPrice;

      itemRows.push([
        String(itemId++),
        String(orderId),
        String(productId),
        String(quantity),
        String(unitPrice),
        String(totalPrice),
      ]);
    }

    orderTotal = Math.round(orderTotal * 100) / 100;

    orderRows.push([
      String(orderId),
      String(customerId),
      `'${status}'`,
      String(orderTotal),
      String(itemsInOrder),
      `'${createdAt}'`,
      `'${createdAt}'`,
    ]);

    // Generate payment (for non-cancelled orders)
    if (status !== 'cancelled') {
      const method = rng.weighted(PAYMENT_METHODS, PAYMENT_METHOD_WEIGHTS);
      const paymentStatus = status === 'completed' || status === 'shipped' ? 'approved' : (status === 'pending' ? 'pending' : 'approved');
      const paidAt = paymentStatus === 'approved' ? `'${createdAt}'` : 'NULL';

      paymentRows.push([
        String(paymentId++),
        String(orderId),
        `'${method}'`,
        String(orderTotal),
        `'${paymentStatus}'`,
        paidAt,
        `'${createdAt}'`,
      ]);
    }
  }

  // Insert orders first, then items and payments
  await batchInsert(conn, 'orders',
    ['id', 'customer_id', 'status', 'total_amount', 'items_count', 'created_at', 'updated_at'],
    orderRows, 500, 'orders');

  await batchInsert(conn, 'order_items',
    ['id', 'order_id', 'product_id', 'quantity', 'unit_price', 'total_price'],
    itemRows, 500, 'order_items');

  await batchInsert(conn, 'payments',
    ['id', 'order_id', 'method', 'amount', 'status', 'paid_at', 'created_at'],
    paymentRows, 500, 'payments');

  return { orderItemRows: itemRows.length, paymentRows: paymentRows.length };
}

async function seedReviews(
  conn: mysql.Connection,
  rng: SeededRandom,
  customerCount: number,
  productCount: number,
  count: number
): Promise<number> {
  const rows: string[][] = [];

  for (let i = 1; i <= count; i++) {
    const productId = rng.int(1, productCount);
    const customerId = rng.int(1, customerCount);
    const rating = rng.weighted(RATING_VALUES, RATING_WEIGHTS);
    const title = rng.pick(REVIEW_TITLES);
    const hasComment = rng.next() > 0.2;
    const comment = hasComment ? `'${escapeStr(title)} - comentario detalhado do review ${i}'` : 'NULL';
    const createdAt = randomDate(rng, 2023, 2026);

    rows.push([
      String(i),
      String(productId),
      String(customerId),
      String(rating),
      `'${escapeStr(title)}'`,
      comment,
      `'${createdAt}'`,
    ]);
  }

  await batchInsert(conn, 'reviews',
    ['id', 'product_id', 'customer_id', 'rating', 'title', 'comment', 'created_at'],
    rows, 500, 'reviews');

  return count;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs();
  const scale = opts.scale;

  // Scale-based counts
  const customerCount = scale;
  const productCount = Math.max(50, Math.round(scale * 0.5));
  const orderCount = Math.round(scale * 5);
  const reviewCount = Math.round(scale * 2);

  console.log(`\n[sql-sage] E-commerce Demo Seed`);
  console.log(`  Scale:      ${scale}`);
  console.log(`  Customers:  ${customerCount}`);
  console.log(`  Products:   ${productCount}`);
  console.log(`  Orders:     ${orderCount}`);
  console.log(`  Reviews:    ${reviewCount}`);
  console.log(`  Connecting: ${opts.host}:${opts.port}/${opts.database}\n`);

  const conn = await mysql.createConnection({
    host: opts.host,
    port: opts.port,
    user: opts.user,
    password: opts.password,
    database: opts.database,
    multipleStatements: true,
  });

  try {
    // Disable FK checks for truncation
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    await conn.execute('TRUNCATE TABLE reviews');
    await conn.execute('TRUNCATE TABLE payments');
    await conn.execute('TRUNCATE TABLE order_items');
    await conn.execute('TRUNCATE TABLE orders');
    await conn.execute('TRUNCATE TABLE customers');
    await conn.execute('TRUNCATE TABLE products');
    await conn.execute('TRUNCATE TABLE categories');
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('  [truncate] All tables cleared\n');

    const rng = new SeededRandom(scale);

    // 1. Categories
    const categorySlugMap = await seedCategories(conn);
    const categoryIds = Array.from(categorySlugMap.values());

    // 2. Products
    await seedProducts(conn, rng, categoryIds, productCount);

    // 3. Customers
    await seedCustomers(conn, rng, customerCount);

    // 4. Orders + Items + Payments
    const { orderItemRows, paymentRows } = await seedOrders(conn, rng, customerCount, productCount, orderCount);
    console.log(`  [order_items] ${orderItemRows} rows inserted`);
    console.log(`  [payments] ${paymentRows} rows inserted`);

    // 5. Reviews
    await seedReviews(conn, rng, customerCount, productCount, reviewCount);

    // Summary
    console.log(`\n  Seed completed successfully!`);
    console.log(`  Total rows: ${categoryIds.length + productCount + customerCount + orderCount + orderItemRows + paymentRows + reviewCount}\n`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\n[seed] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
