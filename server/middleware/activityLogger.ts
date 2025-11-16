import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import type { InsertUserActivityLog } from '@shared/schema';

// Helper function to get user ID from request
function getUserIdFromRequest(req: any): string | null {
  return req.user?.id || req.session?.passport?.user || null;
}

// Helper to extract IP address
function getIpAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '';
}

// List of endpoints to exclude from logging (health checks, static assets, etc.)
const EXCLUDED_PATHS = [
  '/health',
  '/favicon.ico',
  '/api/health',
  '/api/ping',
];

// List of sensitive endpoints to exclude
const SENSITIVE_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
];

// Map HTTP methods and paths to action types
function getActionType(method: string, path: string): string {
  if (method === 'GET') {
    if (path.includes('/api/')) {
      return 'api_call';
    }
    return 'page_view';
  }
  
  if (method === 'POST') {
    return 'create';
  }
  
  if (method === 'PUT' || method === 'PATCH') {
    return 'update';
  }
  
  if (method === 'DELETE') {
    return 'delete';
  }
  
  return 'api_call';
}

// Extract resource type from path
function getResourceType(path: string): string | null {
  const patterns = [
    { pattern: /\/api\/jobs/, resource: 'job' },
    { pattern: /\/api\/bids/, resource: 'bid' },
    { pattern: /\/api\/profiles/, resource: 'profile' },
    { pattern: /\/api\/messages/, resource: 'message' },
    { pattern: /\/api\/conversations/, resource: 'conversation' },
    { pattern: /\/api\/files/, resource: 'file' },
    { pattern: /\/api\/users/, resource: 'user' },
    { pattern: /\/api\/reviews/, resource: 'review' },
    { pattern: /\/api\/payments/, resource: 'payment' },
    { pattern: /\/api\/categories/, resource: 'category' },
  ];
  
  for (const { pattern, resource } of patterns) {
    if (pattern.test(path)) {
      return resource;
    }
  }
  
  return null;
}

// Extract resource ID from path (e.g., /api/jobs/123 -> 123)
function getResourceId(path: string): string | null {
  const match = path.match(/\/api\/[^/]+\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

// Activity logging middleware
export const activityLogger = async (req: Request, res: Response, next: NextFunction) => {
  const userId = getUserIdFromRequest(req);
  
  // Skip if no user is logged in or if path is excluded
  if (!userId || EXCLUDED_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }
  
  // Skip sensitive endpoints
  if (SENSITIVE_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Capture response to get status code
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    
    // Log the activity asynchronously (don't block response)
    const activityLog: InsertUserActivityLog = {
      userId,
      action: getActionType(req.method, req.path),
      resource: getResourceType(req.path) || undefined,
      resourceId: getResourceId(req.path) || undefined,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      ipAddress: getIpAddress(req),
      userAgent: req.headers['user-agent'] || '',
      metadata: {
        query: req.query,
        duration,
        timestamp: new Date().toISOString(),
      },
    };
    
    // Log asynchronously without blocking
    storage.createActivityLog(activityLog).catch(err => {
      console.error('Error logging activity:', err);
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware to log specific page views (use on specific routes)
export const logPageView = (pageName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = getUserIdFromRequest(req);
    
    if (userId) {
      const activityLog: InsertUserActivityLog = {
        userId,
        action: 'page_view',
        resource: 'page',
        endpoint: req.path,
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'] || '',
        metadata: {
          page: pageName,
          query: req.query,
          referrer: req.headers.referer || req.headers.referrer,
        },
      };
      
      storage.createActivityLog(activityLog).catch(err => {
        console.error('Error logging page view:', err);
      });
    }
    
    next();
  };
};

// Helper function to manually log specific actions (e.g., download, upload)
export async function logActivity(
  userId: string,
  action: string,
  resource?: string,
  resourceId?: string,
  metadata?: any
) {
  const activityLog: InsertUserActivityLog = {
    userId,
    action,
    resource,
    resourceId,
    metadata,
  };
  
  try {
    await storage.createActivityLog(activityLog);
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}
