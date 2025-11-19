import type { User } from "@shared/schema";
import { storage } from "./storage";

// ============================================================================
// PERMISSION CONSTANTS
// ============================================================================

export const PERMISSIONS = {
  // User Management
  USER_VIEW: 'user:view',
  USER_APPROVE: 'user:approve',
  USER_SUSPEND: 'user:suspend',
  USER_BAN: 'user:ban',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  USER_IMPERSONATE: 'user:impersonate',
  
  // Category Management
  CATEGORY_VIEW: 'category:view',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_EDIT: 'category:edit',
  CATEGORY_DELETE: 'category:delete',
  CATEGORY_REORDER: 'category:reorder',
  
  // Content Moderation
  CONTENT_VIEW_FLAGS: 'content:view_flags',
  CONTENT_MODERATE: 'content:moderate',
  CONTENT_DELETE: 'content:delete',
  CONTENT_EDIT_FILTER_RULES: 'content:edit_filter_rules',
  
  // Bid Management
  BID_VIEW_ALL: 'bid:view_all',
  BID_MODERATE: 'bid:moderate',
  BID_DELETE: 'bid:delete',
  BID_ANALYTICS: 'bid:analytics',
  
  // Payment & Finance
  PAYMENT_VIEW_ALL: 'payment:view_all',
  PAYMENT_RELEASE: 'payment:release',
  PAYMENT_HOLD: 'payment:hold',
  PAYMENT_REFUND: 'payment:refund',
  PAYMENT_MANUAL_ENTRY: 'payment:manual_entry',
  PAYMENT_ANALYTICS: 'payment:analytics',
  
  // Dispute Management
  DISPUTE_VIEW_ALL: 'dispute:view_all',
  DISPUTE_ASSIGN: 'dispute:assign',
  DISPUTE_RESOLVE: 'dispute:resolve',
  DISPUTE_ESCALATE: 'dispute:escalate',
  
  // Subscription Management
  SUBSCRIPTION_VIEW_ALL: 'subscription:view_all',
  SUBSCRIPTION_EDIT_PLANS: 'subscription:edit_plans',
  SUBSCRIPTION_OVERRIDE: 'subscription:override',
  SUBSCRIPTION_REFUND: 'subscription:refund',
  
  // Support & Tickets
  SUPPORT_VIEW_ALL: 'support:view_all',
  SUPPORT_ASSIGN: 'support:assign',
  SUPPORT_RESPOND: 'support:respond',
  SUPPORT_CLOSE: 'support:close',
  SUPPORT_DELETE: 'support:delete',
  
  // Analytics & Reports
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',
  ANALYTICS_ADVANCED: 'analytics:advanced',
  
  // Platform Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  SETTINGS_CMS: 'settings:cms',
  
  // Admin Management (Super Admin only)
  ADMIN_MANAGE_ROLES: 'admin:manage_roles',
  ADMIN_VIEW_LOGS: 'admin:view_logs',
  ADMIN_SYSTEM_CONFIG: 'admin:system_config',
} as const;

// ============================================================================
// ROLE DEFINITIONS WITH PERMISSION SETS
// ============================================================================

export const ROLE_PERMISSIONS = {
  super_admin: [
    // Full access to everything
    ...Object.values(PERMISSIONS),
  ],
  
  moderator: [
    // User management (limited)
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_SUSPEND,
    
    // Content moderation (full)
    PERMISSIONS.CONTENT_VIEW_FLAGS,
    PERMISSIONS.CONTENT_MODERATE,
    PERMISSIONS.CONTENT_DELETE,
    
    // Bid management
    PERMISSIONS.BID_VIEW_ALL,
    PERMISSIONS.BID_MODERATE,
    PERMISSIONS.BID_DELETE,
    
    // Dispute handling
    PERMISSIONS.DISPUTE_VIEW_ALL,
    PERMISSIONS.DISPUTE_ASSIGN,
    PERMISSIONS.DISPUTE_RESOLVE,
    
    // Support
    PERMISSIONS.SUPPORT_VIEW_ALL,
    PERMISSIONS.SUPPORT_RESPOND,
    PERMISSIONS.SUPPORT_CLOSE,
    
    // Analytics (view only)
    PERMISSIONS.ANALYTICS_VIEW,
    
    // Admin logs
    PERMISSIONS.ADMIN_VIEW_LOGS,
  ],
  
  support: [
    // User management (view only)
    PERMISSIONS.USER_VIEW,
    
    // Support tickets (full)
    PERMISSIONS.SUPPORT_VIEW_ALL,
    PERMISSIONS.SUPPORT_ASSIGN,
    PERMISSIONS.SUPPORT_RESPOND,
    PERMISSIONS.SUPPORT_CLOSE,
    
    // Disputes (limited)
    PERMISSIONS.DISPUTE_VIEW_ALL,
    PERMISSIONS.DISPUTE_ASSIGN,
    
    // Content (view flags only)
    PERMISSIONS.CONTENT_VIEW_FLAGS,
    
    // Analytics (view only)
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  
  finance: [
    // Payment management (full)
    PERMISSIONS.PAYMENT_VIEW_ALL,
    PERMISSIONS.PAYMENT_RELEASE,
    PERMISSIONS.PAYMENT_HOLD,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.PAYMENT_MANUAL_ENTRY,
    PERMISSIONS.PAYMENT_ANALYTICS,
    
    // Subscription management
    PERMISSIONS.SUBSCRIPTION_VIEW_ALL,
    PERMISSIONS.SUBSCRIPTION_OVERRIDE,
    PERMISSIONS.SUBSCRIPTION_REFUND,
    
    // Disputes (payment-related)
    PERMISSIONS.DISPUTE_VIEW_ALL,
    PERMISSIONS.DISPUTE_RESOLVE,
    
    // Analytics (finance only)
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_ADVANCED,
    PERMISSIONS.ANALYTICS_EXPORT,
    
    // User view (for payment verification)
    PERMISSIONS.USER_VIEW,
  ],
  
  analyst: [
    // Analytics (full)
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_ADVANCED,
    PERMISSIONS.ANALYTICS_EXPORT,
    
    // View-only access to data
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.BID_VIEW_ALL,
    PERMISSIONS.PAYMENT_VIEW_ALL,
    PERMISSIONS.SUBSCRIPTION_VIEW_ALL,
    PERMISSIONS.DISPUTE_VIEW_ALL,
    PERMISSIONS.SUPPORT_VIEW_ALL,
  ],
  
  category_manager: [
    // Category management (full)
    PERMISSIONS.CATEGORY_VIEW,
    PERMISSIONS.CATEGORY_CREATE,
    PERMISSIONS.CATEGORY_EDIT,
    PERMISSIONS.CATEGORY_DELETE,
    PERMISSIONS.CATEGORY_REORDER,
    
    // Content moderation (category-specific)
    PERMISSIONS.CONTENT_VIEW_FLAGS,
    PERMISSIONS.CONTENT_MODERATE,
    
    // User view
    PERMISSIONS.USER_VIEW,
    
    // Analytics
    PERMISSIONS.ANALYTICS_VIEW,
  ],
} as const;

export type RoleType = keyof typeof ROLE_PERMISSIONS;
export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ============================================================================
// PERMISSION CHECKER FUNCTIONS
// ============================================================================

/**
 * Get admin role for a user
 */
export async function getAdminRole(userId: string) {
  const adminRole = await storage.getAdminRoleByUserId(userId);
  return adminRole;
}

/**
 * Get all permissions for a user (combines role permissions + custom permissions)
 */
export async function getUserPermissions(userId: string): Promise<PermissionType[]> {
  const adminRole = await getAdminRole(userId);
  
  if (!adminRole || !adminRole.active) {
    return [];
  }
  
  // Get base role permissions
  const rolePermissions = ROLE_PERMISSIONS[adminRole.role as RoleType] || [];
  
  // Add custom permissions
  const customPermissions = adminRole.customPermissions || [];
  
  // Combine and deduplicate
  const allPermissions = Array.from(new Set([...rolePermissions, ...customPermissions]));
  
  return allPermissions as PermissionType[];
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(userId: string, permission: PermissionType): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}

/**
 * Check if user has ANY of the specified permissions
 */
export async function hasAnyPermission(userId: string, permissions: PermissionType[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.some(p => userPermissions.includes(p));
}

/**
 * Check if user has ALL of the specified permissions
 */
export async function hasAllPermissions(userId: string, permissions: PermissionType[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.every(p => userPermissions.includes(p));
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, role: RoleType): Promise<boolean> {
  const adminRole = await getAdminRole(userId);
  return adminRole?.active === true && adminRole?.role === role;
}

/**
 * Check if user has ANY of the specified roles
 */
export async function hasAnyRole(userId: string, roles: RoleType[]): Promise<boolean> {
  const adminRole = await getAdminRole(userId);
  return adminRole?.active === true && roles.includes(adminRole.role as RoleType);
}

/**
 * Check if user is admin (has any admin role)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const adminRole = await getAdminRole(userId);
  return adminRole?.active === true;
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, 'super_admin');
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const userId = (req.user as User).id;
  isAdmin(userId).then(isAdminUser => {
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  }).catch(err => {
    console.error('Error checking admin status:', err);
    return res.status(500).json({ error: 'Error verifying admin access' });
  });
}

/**
 * Middleware factory to require specific permission
 */
export function requirePermission(permission: PermissionType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = (req.user as User).id;
    
    try {
      const hasRequiredPermission = await hasPermission(userId, permission);
      if (!hasRequiredPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    } catch (err) {
      console.error('Error checking permission:', err);
      return res.status(500).json({ error: 'Error verifying permissions' });
    }
  };
}

/**
 * Middleware factory to require any of specified permissions
 */
export function requireAnyPermission(permissions: PermissionType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = (req.user as User).id;
    
    try {
      const hasRequiredPermission = await hasAnyPermission(userId, permissions);
      if (!hasRequiredPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    } catch (err) {
      console.error('Error checking permissions:', err);
      return res.status(500).json({ error: 'Error verifying permissions' });
    }
  };
}

/**
 * Middleware factory to require specific role
 */
export function requireRole(role: RoleType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = (req.user as User).id;
    
    try {
      const hasRequiredRole = await hasRole(userId, role);
      if (!hasRequiredRole) {
        return res.status(403).json({ error: 'Insufficient role' });
      }
      next();
    } catch (err) {
      console.error('Error checking role:', err);
      return res.status(500).json({ error: 'Error verifying role' });
    }
  };
}

/**
 * Middleware factory to require any of specified roles
 */
export function requireAnyRole(roles: RoleType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = (req.user as User).id;
    
    try {
      const hasRequiredRole = await hasAnyRole(userId, roles);
      if (!hasRequiredRole) {
        return res.status(403).json({ error: 'Insufficient role' });
      }
      next();
    } catch (err) {
      console.error('Error checking roles:', err);
      return res.status(500).json({ error: 'Error verifying roles' });
    }
  };
}
