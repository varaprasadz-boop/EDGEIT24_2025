import { Request, Response, NextFunction } from "express";

/**
 * Admin Session Timeout Middleware
 * 
 * Enforces a 30-minute idle timeout for admin sessions.
 * Automatically logs out inactive admin users for security.
 */

const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function adminSessionTimeout(req: Request & { user?: any; session?: any }, res: Response, next: NextFunction) {
  // Only apply to authenticated admin users
  if (!req.user || !req.session) {
    return next();
  }

  const now = Date.now();
  const lastActivity = req.session.lastAdminActivity;

  // If no last activity timestamp, set it now
  if (!lastActivity) {
    req.session.lastAdminActivity = now;
    return next();
  }

  // Check if session has timed out
  const timeSinceLastActivity = now - lastActivity;
  if (timeSinceLastActivity > ADMIN_SESSION_TIMEOUT) {
    // Session has timed out - destroy session and send 401
    req.session.destroy((err: any) => {
      if (err) {
        console.error("[Admin Session Timeout] Error destroying session:", err);
      }
    });
    return res.status(401).json({ 
      message: "Session expired due to inactivity",
      code: "ADMIN_SESSION_TIMEOUT"
    });
  }

  // Session is still valid - update last activity timestamp
  req.session.lastAdminActivity = now;
  next();
}
