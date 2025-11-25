import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, adminRoles } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Extend Express Request to include admin info
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
    }
    
    interface Request {
      adminRole?: {
        id: string;
        role: string;
        permissions: any;
        active: boolean | null;
      };
    }
  }
}

/**
 * Middleware to check if the authenticated user is an admin
 */
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // Check if user has admin role
    const [adminRole] = await db
      .select()
      .from(adminRoles)
      .where(
        and(
          eq(adminRoles.userId, req.user.id),
          eq(adminRoles.active, true)
        )
      )
      .limit(1);

    if (!adminRole) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Attach admin role info to request
    req.adminRole = adminRole;
    
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Failed to verify admin status" });
  }
}

/**
 * Middleware to check if admin has specific permission
 */
export function hasPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.adminRole) {
      return res.status(403).json({ message: "Admin role not verified" });
    }

    // Super admin has all permissions
    if (req.adminRole.role === 'super_admin') {
      return next();
    }

    // Check permission in permissions object
    const permissions = req.adminRole.permissions || {};
    const [category, action] = permission.split(':');
    
    if (permissions[category]?.[action]) {
      return next();
    }

    res.status(403).json({ message: `Permission '${permission}' required` });
  };
}

/**
 * Middleware to check if admin has one of multiple roles
 */
export function hasAnyRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.adminRole) {
      return res.status(403).json({ message: "Admin role not verified" });
    }

    if (allowedRoles.includes(req.adminRole.role)) {
      return next();
    }

    res.status(403).json({ 
      message: `One of the following roles required: ${allowedRoles.join(', ')}` 
    });
  };
}
