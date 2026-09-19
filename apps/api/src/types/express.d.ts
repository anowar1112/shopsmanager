import type { Role } from '@shop/shared';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      shopId: string;
      role: Role;
      name: string;
      email: string;
    }
    interface Request {
      /** Populated by the auth middleware (module 2). */
      user?: AuthUser;
    }
  }
}

export {};
