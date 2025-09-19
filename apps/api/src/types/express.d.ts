// apps/api/src/types/express.d.ts
import "express-serve-static-core";

declare global {
  namespace Express {
    interface User {
      id: number;
      roles?: string[];
      email?: string;
      fullName?: string;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
