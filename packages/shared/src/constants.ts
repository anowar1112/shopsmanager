/** Shared, framework-free constants. Used by both API and web. */

export const CURRENCY_SYMBOL = '৳';
export const CURRENCY_CODE = 'BDT';
export const DEFAULT_LOCALE = 'en-BD';
export const DEFAULT_TIMEZONE = 'Asia/Dhaka';

export const ROLES = ['OWNER', 'MANAGER', 'EMPLOYEE'] as const;
export type Role = (typeof ROLES)[number];

export const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE', 'DUE', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MOBILE: 'Mobile Payment',
  DUE: 'Due (Credit)',
  OTHER: 'Other',
};

export const SALE_STATUSES = ['COMPLETED', 'VOID'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const INVENTORY_TX_TYPES = ['IN', 'OUT', 'ADJUST'] as const;
export type InventoryTxType = (typeof INVENTORY_TX_TYPES)[number];

export const INVENTORY_REF_TYPES = ['SALE', 'PURCHASE', 'MANUAL', 'VOID', 'OPENING'] as const;
export type InventoryRefType = (typeof INVENTORY_REF_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  'RENT',
  'UTILITY',
  'SALARY',
  'TRANSPORT',
  'MAINTENANCE',
  'MARKETING',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT: 'Rent',
  UTILITY: 'Electricity & Utility',
  SALARY: 'Salary',
  TRANSPORT: 'Transport',
  MAINTENANCE: 'Maintenance',
  MARKETING: 'Marketing',
  OTHER: 'Other',
};

export const PRODUCT_UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'packet', 'box', 'dozen'] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const NOTIFICATION_TYPES = [
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'LARGE_EXPENSE',
  'SALE_COMPLETED',
  'STOCK_ADJUSTED',
  'SYSTEM',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Pagination defaults shared by every list endpoint. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Business rule: an expense above this amount notifies the owner. */
export const LARGE_EXPENSE_THRESHOLD = 5000;
