import type { Permission } from '@shop/shared';
import { can } from '@shop/shared';
import { ApiError } from '../lib/api-error.js';
import type { RequestHandler } from 'express';

export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !can(req.user.role, permission)) return next(ApiError.forbidden('You do not have permission to do this'));
    return next();
  };
}
