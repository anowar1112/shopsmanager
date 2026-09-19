/**
 * Seeds a complete, believable shop: users, catalogue, 90 days of purchases,
 * sales and expenses — all through the same ledger rules the API uses, so the
 * dashboard, reports and stock figures are internally consistent.
 *
 * Run: pnpm db:seed   (or pnpm db:reset to wipe and reseed)
 */
import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  SEED_CATEGORIES,
  SEED_CUSTOMERS,
  SEED_SUPPLIERS,
  SEED_EXPENSES,
  type SeedProduct,
} from './seed-data.js';

const prisma = new PrismaClient();

const DAYS_OF_HISTORY = 5;
const PASSWORD = process.env.SEED_PASSWORD ?? 'Password123';

// Deterministic PRNG so every reseed produces the same demo numbers.
let seed = 20260919;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));

function dayAt(daysAgo: number, hour: number, minute: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, randInt(0, 59), 0);
  return d;
}

/** Fewer sales on Friday (weekly holiday), busier at month start. */
function salesCountFor(date: Date) {
  const isFriday = date.getDay() === 5;
  const monthStart = date.getDate() <= 7;
  let base = randInt(14, 26);
  if (isFriday) base = Math.round(base * 0.55);
  if (monthStart) base = Math.round(base * 1.25);
  return base;
}

async function main() {
  console.log('Clearing existing data...');
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.inventoryTransaction.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.shop.deleteMany(),
  ]);

  const shop = await prisma.shop.create({
    data: {
      name: 'Rahman Store',
      phone: '01711223344',
      address: 'Shop 12, Mirpur 10 Circle, Dhaka 1216',
      invoicePrefix: 'INV',
    },
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [owner, manager, employee] = await Promise.all([
    prisma.user.create({
      data: { shopId: shop.id, name: 'Mahbubur Rahman', email: process.env.SEED_OWNER_EMAIL ?? 'owner@shop.test', phone: '01711223344', passwordHash, role: 'OWNER' },
    }),
    prisma.user.create({
      data: { shopId: shop.id, name: 'Tanvir Ahmed', email: process.env.SEED_MANAGER_EMAIL ?? 'manager@shop.test', phone: '01711223355', passwordHash, role: 'MANAGER' },
    }),
    prisma.user.create({
      data: { shopId: shop.id, name: 'Sumon Sheikh', email: process.env.SEED_EMPLOYEE_EMAIL ?? 'employee@shop.test', phone: '01711223366', passwordHash, role: 'EMPLOYEE' },
    }),
  ]);
  console.log('Users created.');

  // --- catalogue ---------------------------------------------------------
  type Row = SeedProduct & { id: string; categoryId: string };
  const products: Row[] = [];

  for (const [categoryName, items] of Object.entries(SEED_CATEGORIES)) {
    const category = await prisma.category.create({ data: { shopId: shop.id, name: categoryName } });
    for (const item of items) {
      // Start every product at zero; opening stock enters via the ledger below.
      const product = await prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId: category.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          costPrice: dec(item.cost),
          sellingPrice: dec(item.price),
          stockQuantity: 0,
          minStockLevel: item.min,
        },
      });
      products.push({ ...item, id: product.id, categoryId: category.id });
    }
  }
  console.log(`Catalogue created: ${products.length} products.`);

  const stock = new Map<string, number>(products.map((p) => [p.id, 0]));

  async function moveStock(opts: {
    productId: string;
    change: number;
    type: 'IN' | 'OUT' | 'ADJUST';
    refType: 'SALE' | 'PURCHASE' | 'MANUAL' | 'OPENING';
    refId?: string;
    unitCost?: number;
    note?: string;
    userId: string;
    at: Date;
  }) {
    const before = stock.get(opts.productId) ?? 0;
    const after = before + opts.change;
    stock.set(opts.productId, after);
    // Queued and flushed in batches (createMany) — awaiting one insert per
    // line item over a cloud connection is what made this slow.
    pendingInvTx.push({
      shopId: shop.id,
      productId: opts.productId,
      type: opts.type,
      quantityChange: opts.change,
      stockBefore: before,
      stockAfter: after,
      unitCost: opts.unitCost !== undefined ? dec(opts.unitCost) : null,
      referenceType: opts.refType,
      referenceId: opts.refId ?? null,
      note: opts.note ?? null,
      createdById: opts.userId,
      createdAt: opts.at,
    });
    if (pendingInvTx.length >= 300) await flushInvTx();
  }

  const pendingInvTx: Prisma.InventoryTransactionCreateManyInput[] = [];
  async function flushInvTx() {
    if (pendingInvTx.length === 0) return;
    await prisma.inventoryTransaction.createMany({ data: pendingInvTx });
    pendingInvTx.length = 0;
  }

  // --- opening stock (90 days ago) ---------------------------------------
  const openingAt = dayAt(DAYS_OF_HISTORY, 9, 0);
  for (const p of products) {
    // Enough opening stock to cover ~90 days of selling, topped up by purchases.
    const opening = Math.max(p.min * 2, p.stock + p.popularity * 18);
    await moveStock({
      productId: p.id,
      change: opening,
      type: 'IN',
      refType: 'OPENING',
      unitCost: p.cost,
      note: 'Opening stock',
      userId: owner.id,
      at: openingAt,
    });
  }
  await flushInvTx();
  console.log('Opening stock recorded.');

  // --- parties -----------------------------------------------------------
  const customers = await Promise.all(
    SEED_CUSTOMERS.map((c) => prisma.customer.create({ data: { shopId: shop.id, ...c } })),
  );
  const suppliers = await Promise.all(
    SEED_SUPPLIERS.map((s) => prisma.supplier.create({ data: { shopId: shop.id, ...s } })),
  );

  // --- purchases: a restock run roughly every 6 days ----------------------
  let purchaseNo = 1;
  for (let daysAgo = DAYS_OF_HISTORY - 4; daysAgo >= 0; daysAgo -= randInt(5, 8)) {
    const supplier = pick(suppliers);
    const at = dayAt(daysAgo, randInt(9, 12), randInt(0, 59));
    const lineProducts = [...products].sort(() => rand() - 0.5).slice(0, randInt(4, 8));

    let subtotal = 0;
    const items = lineProducts.map((p) => {
      const qty = randInt(10, 40);
      const lineTotal = qty * p.cost;
      subtotal += lineTotal;
      return { product: p, qty, lineTotal };
    });
    const paid = rand() > 0.25 ? subtotal : Math.round(subtotal * 0.6);

    const purchase = await prisma.purchase.create({
      data: {
        shopId: shop.id,
        supplierId: supplier.id,
        referenceNo: `PO-${String(purchaseNo++).padStart(4, '0')}`,
        subtotal: dec(subtotal),
        total: dec(subtotal),
        paidAmount: dec(paid),
        dueAmount: dec(subtotal - paid),
        createdById: rand() > 0.5 ? manager.id : employee.id,
        purchasedAt: at,
        createdAt: at,
        items: {
          create: items.map(({ product, qty, lineTotal }) => ({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: qty,
            unitCost: dec(product.cost),
            lineTotal: dec(lineTotal),
          })),
        },
      },
    });

    for (const { product, qty } of items) {
      await moveStock({
        productId: product.id,
        change: qty,
        type: 'IN',
        refType: 'PURCHASE',
        refId: purchase.id,
        unitCost: product.cost,
        note: `Purchase ${purchase.referenceNo}`,
        userId: employee.id,
        at,
      });
    }

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        totalPurchases: { increment: dec(subtotal) },
        outstandingAmount: { increment: dec(subtotal - paid) },
        lastPurchaseAt: at,
      },
    });
  }
  await flushInvTx();
  console.log(`Purchases recorded: ${purchaseNo - 1}.`);

  // --- sales -------------------------------------------------------------
  const weighted: Row[] = [];
  for (const p of products) for (let i = 0; i < p.popularity; i++) weighted.push(p);

  let invoiceSeq = 1;
  let salesCount = 0;

  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo--) {
    const dayDate = dayAt(daysAgo, 12, 0);
    const count = daysAgo === 0 ? randInt(8, 14) : salesCountFor(dayDate);

    for (let i = 0; i < count; i++) {
      const at = dayAt(daysAgo, randInt(9, 20), randInt(0, 59));
      const lineCount = randInt(1, 5);
      const chosen = new Map<string, Row>();
      while (chosen.size < lineCount) {
        const p = pick(weighted);
        chosen.set(p.id, p);
      }

      let subtotal = 0;
      let costTotal = 0;
      const items: Prisma.SaleItemCreateWithoutSaleInput[] = [];
      let skip = false;

      for (const p of chosen.values()) {
        const qty = randInt(1, p.popularity > 7 ? 4 : 2);
        if ((stock.get(p.id) ?? 0) < qty) { skip = true; continue; }
        const lineTotal = qty * p.price;
        subtotal += lineTotal;
        costTotal += qty * p.cost;
        items.push({
          product: { connect: { id: p.id } },
          productName: p.name,
          sku: p.sku,
          quantity: qty,
          unitPrice: dec(p.price),
          costPrice: dec(p.cost),
          lineTotal: dec(lineTotal),
        });
      }
      if (items.length === 0) { if (skip) continue; else continue; }

      // Occasional small round-off discount, the way a shopkeeper actually does it.
      const discount = rand() > 0.82 ? Math.min(randInt(5, 40), Math.floor(subtotal * 0.05)) : 0;
      const total = subtotal - discount;

      const walkIn = rand() > 0.45;
      const customer = walkIn ? null : pick(customers);
      const onDue = !!customer && rand() > 0.88;
      const paymentMethod = onDue ? 'DUE' : rand() > 0.82 ? (rand() > 0.5 ? 'MOBILE' : 'CARD') : 'CASH';
      const paid = onDue ? Math.round(total * 0.5) : total;

      const sale = await prisma.sale.create({
        data: {
          shopId: shop.id,
          invoiceNo: `INV-${String(invoiceSeq++).padStart(6, '0')}`,
          customerId: customer?.id ?? null,
          subtotal: dec(subtotal),
          discountAmount: dec(discount),
          total: dec(total),
          paidAmount: dec(paid),
          dueAmount: dec(total - paid),
          costTotal: dec(costTotal),
          paymentMethod: paymentMethod as Prisma.SaleCreateInput['paymentMethod'],
          status: 'COMPLETED',
          soldById: rand() > 0.3 ? employee.id : manager.id,
          createdAt: at,
          updatedAt: at,
          items: { create: items },
        },
        include: { items: true },
      });

      for (const item of sale.items) {
        await moveStock({
          productId: item.productId,
          change: -item.quantity,
          type: 'OUT',
          refType: 'SALE',
          refId: sale.id,
          note: `Sale ${sale.invoiceNo}`,
          userId: sale.soldById,
          at,
        });
      }

      if (customer) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalPurchases: { increment: dec(total) },
            outstandingAmount: { increment: dec(total - paid) },
            lastPurchaseAt: at,
          },
        });
      }
      salesCount++;
    }
    if (daysAgo % 1 === 0) console.log(`  ...sales progress: day -${daysAgo}, ${salesCount} so far`);
  }
  await flushInvTx();
  await prisma.shop.update({ where: { id: shop.id }, data: { invoiceSeq } });
  console.log(`Sales recorded: ${salesCount}.`);

  // --- expenses ----------------------------------------------------------
  let expenseCount = 0;
  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo--) {
    const at = dayAt(daysAgo, randInt(10, 19), randInt(0, 59));
    for (const e of SEED_EXPENSES) {
      const isMonthly = e.dayOfMonth !== undefined;
      const hit = isMonthly ? at.getDate() === e.dayOfMonth : rand() > 0.9;
      if (!hit) continue;
      await prisma.expense.create({
        data: {
          shopId: shop.id,
          category: e.category as Prisma.ExpenseCreateInput['category'],
          amount: dec(isMonthly ? e.amount : e.amount + randInt(-100, 200)),
          expenseDate: at,
          description: e.description,
          createdById: rand() > 0.5 ? manager.id : employee.id,
          createdAt: at,
        },
      });
      expenseCount++;
    }
  }
  console.log(`Expenses recorded: ${expenseCount}.`);

  // --- sync cached stock + low-stock notifications ------------------------
  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: { stockQuantity: stock.get(p.id) ?? 0 },
    });
  }

  const lowStockRows = products.filter((p) => (stock.get(p.id) ?? 0) <= p.min).slice(0, 20);
  const lowStock = await prisma.product.findMany({
    where: { id: { in: lowStockRows.map((p) => p.id) } },
  });
  for (const p of lowStock) {
    await prisma.notification.create({
      data: {
        shopId: shop.id,
        type: p.stockQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        title: p.stockQuantity === 0 ? 'Product out of stock' : 'Product running low',
        body: `${p.name} — ${p.stockQuantity} ${p.unit} left (minimum ${p.minStockLevel})`,
        referenceId: p.id,
      },
    });
  }

  const totals = await prisma.sale.aggregate({
    where: { shopId: shop.id, status: 'COMPLETED' },
    _sum: { total: true, costTotal: true },
  });

  console.log('\n--- Seed complete ---');
  console.log(`Shop:      ${shop.name}`);
  console.log(`Products:  ${products.length}   Low stock: ${lowStock.length}`);
  console.log(`Sales:     ${salesCount}  (${totals._sum.total?.toFixed(2)} BDT)`);
  console.log(`Gross profit: ${(Number(totals._sum.total ?? 0) - Number(totals._sum.costTotal ?? 0)).toFixed(2)} BDT`);
  console.log('\nLogin accounts (password: ' + PASSWORD + ')');
  console.log(`  Owner:    ${owner.email}`);
  console.log(`  Manager:  ${manager.email}`);
  console.log(`  Employee: ${employee.email}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());