import { Router, type Router as ExpressRouter } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { requirePermission } from '../../middleware/permission.js';

const router: ExpressRouter = Router();

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

const money = (value: unknown) => Number(value ?? 0);

router.get('/summary', requireAuth, requirePermission('dashboard:operational'), asyncHandler(async (req, res) => {
  const shopId = req.user!.shopId;
  const today = startOfToday();
  const [sales, orders, expenses, products, recentSales, recentExpenses, recentInventory] = await Promise.all([
    prisma.sale.aggregate({
      where: { shopId, status: 'COMPLETED', createdAt: { gte: today } },
      _sum: { total: true, costTotal: true },
    }),
    prisma.sale.count({ where: { shopId, status: 'COMPLETED', createdAt: { gte: today } } }),
    prisma.expense.aggregate({ where: { shopId, expenseDate: { gte: today }, deletedAt: null }, _sum: { amount: true } }),
    prisma.product.findMany({
      where: { shopId, isActive: true, deletedAt: null },
      select: { id: true, name: true, sku: true, unit: true, stockQuantity: true, minStockLevel: true, costPrice: true },
    }),
    prisma.sale.findMany({
      where: { shopId },
      select: { id: true, invoiceNo: true, total: true, status: true, createdAt: true, customer: { select: { name: true } }, soldBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.expense.findMany({
      where: { shopId, deletedAt: null },
      select: { id: true, category: true, amount: true, description: true, expenseDate: true, createdBy: { select: { name: true } } },
      orderBy: { expenseDate: 'desc' },
      take: 4,
    }),
    prisma.inventoryTransaction.findMany({
      where: { shopId },
      select: { id: true, type: true, quantityChange: true, createdAt: true, product: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
  ]);

  const salesTotal = money(sales._sum.total);
  const costTotal = money(sales._sum.costTotal);
  const expenseTotal = money(expenses._sum.amount);
  const lowStockProducts = products.filter((product) => product.stockQuantity <= product.minStockLevel).sort((a, b) => a.stockQuantity - b.stockQuantity);
  const lowStock = lowStockProducts.slice(0, 5);

  return ok(res, {
    metrics: {
      sales: salesTotal,
      orders,
      products: products.length,
      lowStock: lowStockProducts.length,
      expenses: expenseTotal,
      profit: salesTotal - costTotal - expenseTotal,
      stockValue: products.reduce((total, product) => total + product.stockQuantity * money(product.costPrice), 0),
    },
    lowStock,
    recentSales: recentSales.map((sale) => ({ ...sale, total: money(sale.total), customer: sale.customer?.name ?? 'Walk-in customer', employee: sale.soldBy.name })),
    recentExpenses: recentExpenses.map((expense) => ({ ...expense, amount: money(expense.amount), addedBy: expense.createdBy.name })),
    recentActivity: [
      ...recentInventory.map((item) => ({ id: item.id, type: item.type === 'IN' ? 'Stock received' : 'Stock updated', detail: `${item.product.name} · ${item.quantityChange > 0 ? '+' : ''}${item.quantityChange}`, by: item.createdBy.name, createdAt: item.createdAt })),
      ...recentExpenses.map((expense) => ({ id: expense.id, type: 'Expense added', detail: `${expense.category} · ৳ ${money(expense.amount).toLocaleString('en-BD')}`, by: expense.createdBy.name, createdAt: expense.expenseDate })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 6),
  });
}));

export { router as dashboardRouter };
