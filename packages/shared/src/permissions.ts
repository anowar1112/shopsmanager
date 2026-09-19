import type { Role } from './constants.js';

/**
 * Single source of truth for authorization.
 * The API enforces these in middleware; the web app uses the same list
 * to hide/disable UI. Adding a capability = one entry here + one line per role.
 */
export const PERMISSIONS = [
  'product:read',
  'product:create',
  'product:update',
  'product:delete',
  'category:manage',

  'inventory:read',
  'inventory:stock-in',
  'inventory:stock-out',
  'inventory:adjust',

  'sale:read',
  'sale:create',
  'sale:discount',
  'sale:void',

  'purchase:read',
  'purchase:create',
  'purchase:update',

  'customer:read',
  'customer:create',
  'customer:update',
  'customer:delete',

  'supplier:read',
  'supplier:create',
  'supplier:update',
  'supplier:delete',

  'expense:read',
  'expense:create',
  'expense:update',
  'expense:delete',

  'report:operational',
  'report:financial',
  'report:export',

  'dashboard:operational',
  'dashboard:owner',

  'user:read',
  'user:manage',
  'settings:manage',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const EMPLOYEE_PERMISSIONS: Permission[] = [
  'product:read',
  'product:create',
  'inventory:read',
  'inventory:stock-in',
  'sale:read',
  'sale:create',
  'purchase:read',
  'purchase:create',
  'customer:read',
  'customer:create',
  'customer:update',
  'supplier:read',
  'expense:read',
  'expense:create',
  'report:operational',
  'dashboard:operational',
];

const MANAGER_PERMISSIONS: Permission[] = [
  ...EMPLOYEE_PERMISSIONS,
  'product:update',
  'product:delete',
  'category:manage',
  'inventory:stock-out',
  'inventory:adjust',
  'sale:discount',
  'purchase:update',
  'customer:delete',
  'supplier:create',
  'supplier:update',
  'expense:update',
  'report:financial',
  'report:export',
  'dashboard:owner',
  'user:read',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  EMPLOYEE: EMPLOYEE_PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAll(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}

export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}
