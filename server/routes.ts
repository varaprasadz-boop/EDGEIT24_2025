import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { notificationService } from "./notifications";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { isAdmin, hasPermission, hasAnyRole } from "./admin-middleware";
import { wsManager } from "./websocket";
import { z } from "zod";
import { registerPaymentRoutes } from "./routes/payments";
import { insertClientProfileSchema, insertConsultantProfileSchema, insertPricingTemplateSchema, insertReviewSchema, insertReviewResponseSchema, insertReviewReportSchema, insertQuoteRequestSchema, insertConversationSchema, insertConversationParticipantSchema, insertMessageSchema, insertMessageFileSchema, insertFileVersionSchema, insertMeetingLinkSchema, insertMeetingParticipantSchema, insertMeetingReminderSchema, insertMessageTemplateSchema, insertConversationLabelSchema, insertTeamMemberSchema, insertBidSchema } from "@shared/schema";
import { db } from "./db";
import { users, adminRoles, categories, consultantCategories, jobs, bids, payments, disputes, vendorCategoryRequests, projects, subscriptionPlans, userSubscriptions, platformSettings, emailTemplates, clientProfiles, consultantProfiles, teamMembers, contentPages, footerLinks, homePageSections, messageFiles, conversations, messages, meetingLinks, reviews, reviewResponses, reviewReports, insertSubscriptionPlanSchema, insertPlatformSettingSchema, insertEmailTemplateSchema, insertContentPageSchema, insertFooterLinkSchema, insertHomePageSectionSchema, insertCategorySchema } from "@shared/schema";
import { eq, and, or, count, sql, desc, ilike, gte, lte, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import passport from "passport";
import { randomBytes } from "crypto";
import { nanoid } from "nanoid";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { UploadPolicy } from './uploadPolicy';
import { FileScanService } from './fileScanService';
import { RateLimits, initializeRateLimiter } from './middleware/rateLimiter';
import { activityLogger } from './middleware/activityLogger';

// Initialize rate limiter with storage
initializeRateLimiter(storage);

// Periodic cleanup of expired rate limits (every 5 minutes)
setInterval(async () => {
  try {
    await storage.cleanupExpiredRateLimits();
    console.log('[RateLimiter] Expired rate limits cleaned up');
  } catch (error) {
    console.error('[RateLimiter] Error cleaning up expired rate limits:', error);
  }
}, 5 * 60 * 1000);

const queryLimitSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10)
    .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100"),
});

// Helper to get userId from authenticated request (for local auth)
function getUserIdFromRequest(req: any): string | null {
  return req.user?.id || null;
}

// Helper to parse and validate dates
function parseDate(value: any): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

// Middleware guards for profile requirements
const requireEmailVerified = async (req: any, res: any, next: any) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ 
        message: "Authentication required",
        requiresAuth: true
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ 
        message: "Email verification required. Please verify your email to continue.",
        requiresEmailVerification: true,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified
        }
      });
    }

    next();
  } catch (error) {
    console.error("Error in requireEmailVerified middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const requireProfileComplete = (role: 'client' | 'consultant') => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ 
          message: "Authentication required",
          requiresAuth: true
        });
      }

      const profile = role === 'client' 
        ? await storage.getClientProfile(userId)
        : await storage.getConsultantProfile(userId);

      if (!profile) {
        return res.status(404).json({ 
          message: `${role === 'client' ? 'Client' : 'Consultant'} profile not found. Please create your profile first.`,
          requiresProfileCreation: true,
          profileType: role
        });
      }

      if (profile.profileStatus === 'incomplete' || profile.profileStatus === 'draft') {
        return res.status(403).json({ 
          message: `${role === 'client' ? 'Client' : 'Consultant'} profile must be completed before posting jobs.`,
          requiresProfileCompletion: true,
          profileType: role,
          profileStatus: profile.profileStatus
        });
      }

      next();
    } catch (error) {
      console.error("Error in requireProfileComplete middleware:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

const requireProfileApproved = (role: 'client' | 'consultant') => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ 
          message: "Authentication required",
          requiresAuth: true
        });
      }

      const profile = role === 'client'
        ? await storage.getClientProfile(userId)
        : await storage.getConsultantProfile(userId);

      if (!profile) {
        return res.status(404).json({ 
          message: `${role === 'client' ? 'Client' : 'Consultant'} profile not found. Please create your profile first.`,
          requiresProfileCreation: true,
          profileType: role
        });
      }

      if (profile.approvalStatus !== 'approved') {
        return res.status(403).json({ 
          message: `${role === 'client' ? 'Client' : 'Consultant'} profile must be approved by admin before you can ${role === 'client' ? 'post jobs' : 'submit bids'}.`,
          requiresProfileApproval: true,
          profileType: role,
          approvalStatus: profile.approvalStatus,
          profileStatus: profile.profileStatus
        });
      }

      next();
    } catch (error) {
      console.error("Error in requireProfileApproved middleware:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);
  
  // Apply activity logging to all authenticated API routes (except sensitive auth routes)
  app.use('/api', (req: any, res: any, next: any) => {
    // Skip sensitive auth routes to avoid logging passwords
    if (req.path.startsWith('/auth/login') || req.path.startsWith('/auth/signup') || req.path.startsWith('/auth/reset-password')) {
      return next();
    }
    // Apply activity logger only to authenticated requests
    if (req.isAuthenticated && req.isAuthenticated()) {
      return activityLogger(req, res, next);
    }
    next();
  });

  // Auth routes
  
  // Signup route - Enhanced with full registration data
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { 
        email, 
        password, 
        role, 
        fullName, 
        country, 
        phoneCountryCode, 
        phone, 
        companyName,
        selectedCategories, // For consultant role only
        engagementPlan, // Engagement plan selection
        termsAccepted // Terms of Service acceptance
      } = req.body;
      
      // Validation
      if (!email || !password || !role) {
        return res.status(400).json({ message: "Email, password, and role are required" });
      }
      
      if (!fullName) {
        return res.status(400).json({ message: "Full name is required" });
      }
      
      if (!country) {
        return res.status(400).json({ message: "Country is required" });
      }
      
      if (!phone || !phoneCountryCode) {
        return res.status(400).json({ message: "Phone number with country code is required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      if (role !== 'client' && role !== 'consultant') {
        return res.status(400).json({ message: "Role must be either 'client' or 'consultant'" });
      }
      
      // Validate engagement plan
      if (!engagementPlan || !['basic', 'professional', 'enterprise'].includes(engagementPlan)) {
        return res.status(400).json({ message: "Valid engagement plan is required (basic, professional, or enterprise)" });
      }
      
      // Verify the plan exists in subscription_plans table
      const planRecord = await storage.getSubscriptionPlanByName(engagementPlan);
      if (!planRecord) {
        return res.status(400).json({ message: "Invalid engagement plan selected" });
      }
      
      // Verify payment status matches plan price with NaN guard
      const planPrice = parseFloat(planRecord.price);
      if (isNaN(planPrice) || planPrice < 0) {
        return res.status(400).json({ message: "Invalid plan pricing configuration" });
      }
      const isPaidPlan = planPrice > 0;
      const expectedPaymentStatus = isPaidPlan ? 'pending' : 'not_required';
      
      // For consultants, validate selectedCategories
      if (role === 'consultant' && (!selectedCategories || !Array.isArray(selectedCategories) || selectedCategories.length === 0)) {
        return res.status(400).json({ message: "At least one expertise category is required for consultants" });
      }
      
      // Validate Terms of Service acceptance
      if (!termsAccepted) {
        return res.status(400).json({ message: "You must accept the Terms of Service and Privacy Policy to continue" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user with extended fields
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        role,
        fullName,
        country,
        phoneCountryCode,
        phone,
        companyName: companyName || null,
        authProvider: 'local',
        emailVerified: false,
        engagementPlan,
        paymentStatus: expectedPaymentStatus,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      });
      
      // Auto-create profile based on role
      if (role === 'client') {
        await storage.createClientProfile({
          userId: user.id,
          companyName: companyName || '',
          profileStatus: 'incomplete',
          approvalStatus: 'pending',
        });
      } else if (role === 'consultant') {
        // Create consultant profile
        const consultantProfile = await storage.createConsultantProfile({
          userId: user.id,
          fullName: fullName,
          profileStatus: 'incomplete',
          approvalStatus: 'pending',
        });
        
        // Set selected categories with first one as primary
        if (selectedCategories && selectedCategories.length > 0) {
          await storage.setConsultantCategories(
            user.id, 
            selectedCategories, 
            selectedCategories[0] // First category as primary
          );
        }
      }
      
      // Return user data without auto-login (users will login after payment or immediately for free plans)
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          emailVerified: user.emailVerified,
        },
      });
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  // Login route
  app.post('/api/auth/login', (req, res, next) => {
    const { rememberMe } = req.body;
    
    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      
      const ipAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
      const userAgent = req.headers['user-agent'] || '';
      
      if (!user) {
        // Track failed login attempt
        if (req.body.email) {
          const failedUser = await storage.getUserByEmail(req.body.email);
          if (failedUser) {
            await storage.createLoginHistory({
              userId: failedUser.id,
              action: 'login',
              ipAddress,
              userAgent,
              deviceInfo: userAgent,
              success: false,
              failureReason: info?.message || "Invalid credentials",
            });
          }
        }
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
      }
      
      // Check if user has 2FA enabled
      if (user.twoFactorEnabled) {
        // Don't log in yet - require 2FA verification first
        return res.json({
          requires2FA: true,
          userId: user.id,
          message: "2FA verification required"
        });
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Set session cookie maxAge based on rememberMe
        // Remember Me: 30 days, Regular: 24 hours
        if (req.session) {
          req.session.cookie.maxAge = rememberMe 
            ? 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
            : 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          
          // Track successful login
          await storage.createLoginHistory({
            userId: user.id,
            action: 'login',
            ipAddress,
            userAgent,
            deviceInfo: userAgent,
            success: true,
          });
          
          // Create or update active session
          await storage.createActiveSession({
            id: req.session.id,
            userId: user.id,
            ipAddress,
            userAgent,
            deviceInfo: userAgent,
            lastActivity: new Date(),
          });
        }
        
        res.json({
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        });
      });
    })(req, res, next);
  });
  
  // Logout route
  app.post('/api/auth/logout', async (req: any, res) => {
    const userId = getUserIdFromRequest(req);
    const sessionId = req.session?.id;
    const ipAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';
    
    req.logout(async (err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      
      // Track logout
      if (userId) {
        await storage.createLoginHistory({
          userId,
          action: 'logout',
          ipAddress,
          userAgent,
          deviceInfo: userAgent,
          success: true,
        });
        
        // Remove active session
        if (sessionId) {
          await storage.terminateSession(sessionId);
        }
      }
      
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Two-Factor Authentication (2FA) routes
  
  // Setup 2FA - Generate secret and QR code
  app.post('/api/auth/2fa/setup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required to setup 2FA" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA is already enabled. Please disable it first to reset." });
      }

      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid password" });
      }

      const secret = speakeasy.generateSecret({
        name: `EDGEIT24 (${user.email})`,
        length: 32,
      });

      await storage.setup2FA(userId, secret.base32);

      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      res.json({
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntry: secret.base32,
      });
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });

  // Verify setup and enable 2FA
  app.post('/api/auth/2fa/verify-setup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA setup not initiated" });
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 1,
      });

      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      const backupCodes = await storage.generateBackupCodes(userId);
      await storage.enable2FA(userId, backupCodes);

      // Invalidate all existing sessions except the current one for security
      const activeSessions = await storage.getActiveSessions(userId);
      const currentSessionId = req.session?.id;
      for (const session of activeSessions) {
        if (session.id !== currentSessionId) {
          await storage.terminateSession(session.id);
        }
      }

      res.json({
        message: "2FA enabled successfully",
        backupCodes,
      });
    } catch (error) {
      console.error("Error verifying 2FA setup:", error);
      res.status(500).json({ message: "Failed to verify 2FA setup" });
    }
  });

  // Verify 2FA token (during login or sensitive operations)
  app.post('/api/auth/2fa/verify', async (req, res) => {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({ message: "User ID and token are required" });
      }

      const isValid = await storage.verify2FAToken(userId, token);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying 2FA token:", error);
      res.status(500).json({ message: "Failed to verify 2FA token" });
    }
  });

  // Verify backup code (during login)
  app.post('/api/auth/2fa/verify-backup-code', async (req, res) => {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        return res.status(400).json({ message: "User ID and backup code are required" });
      }

      const isValid = await storage.verifyBackupCode(userId, code);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid backup code" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying backup code:", error);
      res.status(500).json({ message: "Failed to verify backup code" });
    }
  });

  // Disable 2FA
  app.post('/api/auth/2fa/disable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required to disable 2FA" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "User not found" });
      }

      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid password" });
      }

      await storage.disable2FA(userId);

      res.json({ message: "2FA disabled successfully" });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });

  // Generate new backup codes
  app.post('/api/auth/2fa/generate-backup-codes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required to generate new backup codes" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA is not enabled" });
      }

      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid password" });
      }

      const backupCodes = await storage.generateBackupCodes(userId);

      res.json({ backupCodes });
    } catch (error) {
      console.error("Error generating backup codes:", error);
      res.status(500).json({ message: "Failed to generate backup codes" });
    }
  });

  // Complete login after 2FA verification
  app.post('/api/auth/2fa/complete-login', async (req, res) => {
    try {
      const { userId, token, backupCode, rememberMe } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!token && !backupCode) {
        return res.status(400).json({ message: "Verification token or backup code is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA is not enabled for this user" });
      }

      let isValid = false;

      if (token) {
        isValid = await storage.verify2FAToken(userId, token);
      } else if (backupCode) {
        isValid = await storage.verifyBackupCode(userId, backupCode);
      }

      if (!isValid) {
        const ipAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
        const userAgent = req.headers['user-agent'] || '';
        
        await storage.createLoginHistory({
          userId,
          action: 'login',
          ipAddress,
          userAgent,
          deviceInfo: userAgent,
          success: false,
          failureReason: "Invalid 2FA code",
        });
        
        return res.status(401).json({ message: "Invalid verification code" });
      }

      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed" });
        }

        const ipAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
        const userAgent = req.headers['user-agent'] || '';

        if (req.session) {
          req.session.cookie.maxAge = rememberMe 
            ? 30 * 24 * 60 * 60 * 1000 // 30 days
            : 24 * 60 * 60 * 1000; // 24 hours

          await storage.createLoginHistory({
            userId: user.id,
            action: 'login',
            ipAddress,
            userAgent,
            deviceInfo: userAgent,
            success: true,
          });

          await storage.createActiveSession({
            id: req.session.id,
            userId: user.id,
            ipAddress,
            userAgent,
            deviceInfo: userAgent,
            lastActivity: new Date(),
          });
        }

        res.json({
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        });
      });
    } catch (error) {
      console.error("Error completing 2FA login:", error);
      res.status(500).json({ message: "Failed to complete login" });
    }
  });
  
  // Development-only TOTP generation endpoint for testing
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/test/2fa/totp', isAuthenticated, async (req: any, res) => {
      try {
        const testAuthHeader = req.headers['x-test-auth'];
        if (testAuthHeader !== 'test-2fa-automation') {
          return res.status(403).json({ message: "Forbidden: Invalid test authorization" });
        }

        const userId = getUserIdFromRequest(req);
        if (!userId) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const user = await storage.getUser(userId);
        if (!user || !user.twoFactorSecret) {
          return res.status(400).json({ message: "2FA not setup for this user" });
        }

        const token = speakeasy.totp({
          secret: user.twoFactorSecret,
          encoding: 'base32',
        });

        console.log(`[TEST] Generated TOTP for user ${userId}: ${token}`);
        
        res.json({ token });
      } catch (error) {
        console.error("Error generating test TOTP:", error);
        res.status(500).json({ message: "Failed to generate test TOTP" });
      }
    });
  }
  
  // Change password route
  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      // Get user with password
      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await db.update(users)
        .set({ password: newPasswordHash })
        .where(eq(users.id, userId));

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Update profile route
  app.put('/api/auth/update-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { fullName, phone, phoneCountryCode, companyName } = req.body;

      // Build update object only with provided fields
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (phone !== undefined) updateData.phone = phone;
      if (phoneCountryCode !== undefined) updateData.phoneCountryCode = phoneCountryCode;
      if (companyName !== undefined) updateData.companyName = companyName;

      // Update user profile
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId));

      // Get updated user
      const updatedUser = await storage.getUser(userId);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // Password reset routes
  app.post('/api/auth/request-reset', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      // Don't reveal if user exists (security best practice)
      if (!user) {
        return res.json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      // Generate crypto-secure reset token
      const token = randomBytes(32).toString('hex');
      
      // Token expires in 1 hour
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1);

      await storage.setPasswordResetToken(user.id, token, expiry);

      // TODO: Send actual email with reset link
      // For testing: Log the link to console (never expose in response)
      const resetLink = `/reset-password?token=${token}`;
      console.log(`[TESTING ONLY] Password reset link for ${user.email}: ${resetLink}`);
      
      res.json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const user = await storage.getUserByPasswordResetToken(token);
      
      if (!user || !user.passwordResetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (user.passwordResetTokenExpiry && user.passwordResetTokenExpiry < new Date()) {
        await storage.invalidatePasswordResetToken(user.id);
        return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
      }

      // Hash new password and update
      const newPasswordHash = await hashPassword(newPassword);
      await storage.resetPassword(user.id, newPasswordHash);

      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  
  // Email verification routes
  app.post('/api/auth/send-verification', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      // Generate crypto-secure verification token
      const token = randomBytes(32).toString('hex');
      
      // Token expires in 24 hours
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);

      await storage.setEmailVerificationToken(userId, token, expiry);

      // TODO: Send actual email with verification link
      // For testing: Log the link to console (never expose in response)
      const verificationLink = `/verify-email?token=${token}`;
      console.log(`[TESTING ONLY] Email verification link for ${user.email}: ${verificationLink}`);
      
      res.json({ 
        message: "Verification email sent. Please check your email for the verification link."
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const user = await storage.getUserByEmailToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      // Check token expiry - invalidate if expired
      if (user.emailTokenExpiry && user.emailTokenExpiry < new Date()) {
        // Invalidate expired token to prevent replay attacks
        await storage.invalidateEmailVerificationToken(user.id);
        return res.status(400).json({ message: "Verification token has expired. Please request a new one." });
      }

      if (user.emailVerified) {
        // Already verified - invalidate token
        await storage.invalidateEmailVerificationToken(user.id);
        return res.status(400).json({ message: "Email already verified" });
      }

      // Verify email and clear the token (verifyUserEmail already clears token)
      await storage.verifyUserEmail(user.id);

      // Notify user about successful verification
      try {
        await notificationService.notifyVerificationStatus(user.id, {
          status: 'verified',
          email: user.email,
        });
      } catch (notifError) {
        console.error("Error sending verification notification:", notifError);
      }

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  app.post('/api/auth/resend-verification', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      // Generate crypto-secure verification token
      const token = randomBytes(32).toString('hex');
      
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);

      await storage.setEmailVerificationToken(userId, token, expiry);

      // TODO: Send actual email with verification link
      // For testing: Log the link to console (never expose in response)
      const verificationLink = `/verify-email?token=${token}`;
      console.log(`[TESTING ONLY] Email verification link for ${user.email}: ${verificationLink}`);
      
      res.json({ 
        message: "Verification email resent. Please check your email for the verification link."
      });
    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });
  
  // Get current user - returns null if not authenticated (frontend expects this)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Return null if not authenticated (don't throw 401)
      if (!req.isAuthenticated() || !req.user) {
        return res.json({ user: null });
      }

      const user = req.user;

      // Fetch associated profiles
      const clientProfile = await storage.getClientProfile(user.id).catch(() => null);
      const consultantProfile = await storage.getConsultantProfile(user.id).catch(() => null);

      // Don't send password to client
      const { password, ...userWithoutPassword } = user;

      res.json({
        ...userWithoutPassword,
        clientProfile,
        consultantProfile,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Activity Log routes
  // Get user's own activity logs
  app.get('/api/activity-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Normalize pagination params
      let limit = 50; // Default
      let offset = 0; // Default
      
      if (req.query.limit !== undefined) {
        const parsed = Number(req.query.limit);
        if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
          return res.status(400).json({ message: "Invalid limit parameter" });
        }
        limit = parsed;
      }
      
      if (req.query.offset !== undefined) {
        const parsed = Number(req.query.offset);
        if (isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
          return res.status(400).json({ message: "Invalid offset parameter" });
        }
        offset = parsed;
      }
      
      // Bound limit to 100 for users
      limit = Math.min(limit, 100);
      // Bound offset to prevent excessive scans (max 10,000 records)
      offset = Math.min(offset, 10000);
      
      // Validate action and resource against known values
      const validActions = ['page_view', 'api_call', 'create', 'update', 'delete', 'view', 'download', 'upload'];
      const validResources = ['job', 'bid', 'profile', 'message', 'conversation', 'file', 'user', 'review', 'payment', 'category', 'page'];
      
      const action = req.query.action as string | undefined;
      const resource = req.query.resource as string | undefined;
      
      if (action && !validActions.includes(action)) {
        return res.status(400).json({ message: "Invalid action parameter" });
      }
      if (resource && !validResources.includes(resource)) {
        return res.status(400).json({ message: "Invalid resource parameter" });
      }
      
      // Parse and validate dates using helper
      const startParam = parseDate(req.query.startDate);
      const endParam = parseDate(req.query.endDate);
      
      // Reject invalid date strings explicitly
      if (req.query.startDate && !startParam) {
        return res.status(400).json({ message: "Invalid startDate format" });
      }
      if (req.query.endDate && !endParam) {
        return res.status(400).json({ message: "Invalid endDate format" });
      }
      
      // Canonicalize date range (max 90 days for users)
      const now = new Date();
      const maxDaysBack = 90;
      const maxDaysBackMs = maxDaysBack * 24 * 60 * 60 * 1000;
      const minAllowedDate = new Date(now.getTime() - maxDaysBackMs);
      
      let startDate: Date;
      let endDate: Date;
      
      // Default empty ranges to [now - 90d, now]
      if (!startParam && !endParam) {
        startDate = minAllowedDate;
        endDate = now;
      } else {
        startDate = startParam || minAllowedDate;
        endDate = endParam || now;
      }
      
      // Swap if needed
      if (startDate > endDate) {
        [startDate, endDate] = [endDate, startDate];
      }
      
      // Clamp both ends to [now - 90d, now]
      startDate = new Date(Math.max(startDate.getTime(), minAllowedDate.getTime()));
      endDate = new Date(Math.min(endDate.getTime(), now.getTime()));
      
      // Enforce end-start ≤ 90 days
      const actualDiff = endDate.getTime() - startDate.getTime();
      if (actualDiff > maxDaysBackMs) {
        // Clamp endDate to startDate + 90 days
        endDate = new Date(startDate.getTime() + maxDaysBackMs);
      }

      const logs = await storage.getUserActivityLogs(userId, {
        limit,
        offset,
        action,
        resource,
        startDate,
        endDate,
      });

      res.json({ logs, count: logs.length });
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Get all activity logs (admin only)
  app.get('/api/admin/activity-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Normalize pagination params (admins get higher limits)
      let limit = 100; // Default
      let offset = 0; // Default
      
      if (req.query.limit !== undefined) {
        const parsed = Number(req.query.limit);
        if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
          return res.status(400).json({ message: "Invalid limit parameter" });
        }
        limit = parsed;
      }
      
      if (req.query.offset !== undefined) {
        const parsed = Number(req.query.offset);
        if (isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
          return res.status(400).json({ message: "Invalid offset parameter" });
        }
        offset = parsed;
      }
      
      // Bound limit to 500 for admins
      limit = Math.min(limit, 500);
      // Bound offset to prevent excessive scans (max 50,000 records for admins)
      offset = Math.min(offset, 50000);
      
      // Validate action and resource against known values
      const validActions = ['page_view', 'api_call', 'create', 'update', 'delete', 'view', 'download', 'upload'];
      const validResources = ['job', 'bid', 'profile', 'message', 'conversation', 'file', 'user', 'review', 'payment', 'category', 'page'];
      
      const action = req.query.action as string | undefined;
      const resource = req.query.resource as string | undefined;
      
      if (action && !validActions.includes(action)) {
        return res.status(400).json({ message: "Invalid action parameter" });
      }
      if (resource && !validResources.includes(resource)) {
        return res.status(400).json({ message: "Invalid resource parameter" });
      }
      
      // Parse and validate dates using helper
      const startParam = parseDate(req.query.startDate);
      const endParam = parseDate(req.query.endDate);
      
      // Reject invalid date strings explicitly
      if (req.query.startDate && !startParam) {
        return res.status(400).json({ message: "Invalid startDate format" });
      }
      if (req.query.endDate && !endParam) {
        return res.status(400).json({ message: "Invalid endDate format" });
      }
      
      // Canonicalize date range (max 365 days for admins)
      const now = new Date();
      const maxDaysBack = 365;
      const maxDaysBackMs = maxDaysBack * 24 * 60 * 60 * 1000;
      const minAllowedDate = new Date(now.getTime() - maxDaysBackMs);
      
      let startDate: Date;
      let endDate: Date;
      
      // Default empty ranges to [now - 365d, now]
      if (!startParam && !endParam) {
        startDate = minAllowedDate;
        endDate = now;
      } else {
        startDate = startParam || minAllowedDate;
        endDate = endParam || now;
      }
      
      // Swap if needed
      if (startDate > endDate) {
        [startDate, endDate] = [endDate, startDate];
      }
      
      // Clamp both ends to [now - 365d, now]
      startDate = new Date(Math.max(startDate.getTime(), minAllowedDate.getTime()));
      endDate = new Date(Math.min(endDate.getTime(), now.getTime()));
      
      // Enforce end-start ≤ 365 days
      const actualDiff = endDate.getTime() - startDate.getTime();
      if (actualDiff > maxDaysBackMs) {
        // Clamp endDate to startDate + 365 days
        endDate = new Date(startDate.getTime() + maxDaysBackMs);
      }

      const logs = await storage.getAllActivityLogs({
        limit,
        offset,
        action,
        resource,
        startDate,
        endDate,
      });

      res.json({ logs, count: logs.length });
    } catch (error) {
      console.error("Error fetching all activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });
  
  // Get login history for current user
  app.get('/api/auth/login-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const history = await storage.getLoginHistory(userId, { limit, offset });
      res.json({ history, count: history.length });
    } catch (error) {
      console.error("Error fetching login history:", error);
      res.status(500).json({ message: "Failed to fetch login history" });
    }
  });

  // Get active sessions for current user
  app.get('/api/auth/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const sessions = await storage.getActiveSessions(userId);
      res.json({ sessions });
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  // Terminate a specific session
  app.delete('/api/auth/sessions/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { sessionId } = req.params;
      const currentSessionId = req.session?.id;

      // Verify the session belongs to the user (prevent cross-user session termination)
      const sessions = await storage.getActiveSessions(userId);
      const targetSession = sessions.find(s => s.id === sessionId);

      if (!targetSession) {
        return res.status(404).json({ message: "Session not found or access denied" });
      }

      // Terminate the session in database
      await storage.terminateSession(sessionId);
      
      // If terminating current session, also destroy it and logout
      if (sessionId === currentSessionId) {
        req.logout((err: any) => {
          if (err) {
            console.error("Error logging out during session termination:", err);
          }
        });
        res.json({ message: "Current session terminated successfully", currentSession: true });
      } else {
        res.json({ message: "Session terminated successfully", currentSession: false });
      }
    } catch (error) {
      console.error("Error terminating session:", error);
      res.status(500).json({ message: "Failed to terminate session" });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Mock Payment Endpoints
  
  // Create checkout session
  app.post('/api/payments/checkout', async (req, res) => {
    try {
      const { userId, planId } = req.body;
      
      if (!userId || !planId) {
        return res.status(400).json({ message: "userId and planId are required" });
      }
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify plan exists and requires payment
      const plan = await storage.getSubscriptionPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      if (parseFloat(plan.price) === 0) {
        return res.status(400).json({ message: "This plan does not require payment" });
      }
      
      // Create session ID
      const sessionId = nanoid();
      
      // Store payment session with plan metadata for security
      await storage.createPaymentSession(userId, planId, sessionId, plan.price, plan.name);
      
      // Return mock checkout URL with session
      const checkoutUrl = `/mock-payment?session=${sessionId}`;
      
      res.json({ checkoutUrl, sessionId });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Complete payment
  app.post('/api/payments/complete', async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "sessionId is required" });
      }
      
      // Retrieve and validate session
      const session = await storage.getPaymentSessionBySessionId(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Invalid payment session" });
      }
      
      if (session.status === 'completed') {
        return res.status(400).json({ message: "Payment session already completed" });
      }
      
      if (session.status === 'expired') {
        return res.status(400).json({ message: "Payment session has expired" });
      }
      
      // Verify user exists
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Session data is the immutable source of truth for payment
      // The session locked in plan metadata (price, name) at checkout time
      // Do NOT re-fetch plan - that would allow price manipulation attacks
      // Even if plan changes in DB, this session records the original payment amount
      
      // Generate transaction reference
      const txnRef = `TXN-${nanoid(10)}`;
      
      // Update user payment status (idempotent)
      // Payment amount is implicitly session.planPrice (immutable from checkout)
      await storage.updateUser(session.userId, {
        paymentStatus: 'succeeded',
        paymentReference: txnRef,
        paymentCompletedAt: new Date(),
      });
      
      // Create subscription using plan ID from immutable session
      const subscription = await storage.createUserSubscription(session.userId, session.planId);
      
      // Mark session as completed
      await storage.updatePaymentSessionStatus(sessionId, 'completed');
      
      res.json({ 
        success: true, 
        message: "Payment completed successfully",
        subscription,
        paymentReference: txnRef
      });
    } catch (error) {
      console.error("Error completing payment:", error);
      res.status(500).json({ message: "Failed to complete payment" });
    }
  });

  // Public: Get subscription plans (for homepage)
  app.get('/api/subscription-plans', async (req, res) => {
    try {
      const { audience } = req.query;
      
      // Build conditions array
      const conditions = [eq(subscriptionPlans.status, 'active')];
      
      // Add audience filter if provided
      if (audience && (audience === 'client' || audience === 'consultant')) {
        conditions.push(eq(subscriptionPlans.audience, audience));
      }

      // Execute query with all conditions and ordering
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(and(...conditions))
        .orderBy(subscriptionPlans.displayOrder);

      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Public: Get root categories (level 0) for homepage
  app.get('/api/categories/root', async (req, res) => {
    try {
      const rootCategories = await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.level, 0),
          eq(categories.active, true),
          eq(categories.visible, true)
        ))
        .orderBy(categories.displayOrder, categories.name);
      
      res.json(rootCategories);
    } catch (error) {
      console.error("Error fetching root categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Public: Get category by slug (with children and breadcrumb path)
  app.get('/api/categories/slug/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      // Get category by slug
      const [category] = await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.slug, slug),
          eq(categories.active, true),
          eq(categories.visible, true)
        ))
        .limit(1);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Get children (if any)
      const children = await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.parentId, category.id),
          eq(categories.active, true),
          eq(categories.visible, true)
        ))
        .orderBy(categories.displayOrder, categories.name);
      
      // Build breadcrumb path (get all ancestors)
      const breadcrumbs = [];
      let currentCategory = category;
      breadcrumbs.unshift(currentCategory);
      
      while (currentCategory.parentId) {
        const [parent] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, currentCategory.parentId))
          .limit(1);
        
        if (parent) {
          breadcrumbs.unshift(parent);
          currentCategory = parent;
        } else {
          break;
        }
      }
      
      res.json({
        category,
        children,
        breadcrumbs,
      });
    } catch (error) {
      console.error("Error fetching category by slug:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  // Dashboard endpoints
  app.get('/api/dashboard/client/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Verify user has client profile
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile) {
        return res.status(403).json({ message: "Client profile required" });
      }
      
      const stats = await storage.getClientDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching client dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/consultant/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Verify user has consultant profile
      const consultantProfile = await storage.getConsultantProfile(userId);
      if (!consultantProfile) {
        return res.status(403).json({ message: "Consultant profile required" });
      }
      
      const stats = await storage.getConsultantDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching consultant dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const role = req.query.role as 'client' | 'consultant' || user.role;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const activities = await storage.getRecentActivities(userId, role, limit);
      res.json({ activities });
    } catch (error) {
      console.error("Error fetching dashboard activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get('/api/dashboard/financial-trends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const role = req.query.role as 'client' | 'consultant' || user.role;
      const months = req.query.months ? parseInt(req.query.months as string) : 6;
      
      const trends = await storage.getFinancialTrends(userId, role, months);
      res.json({ trends });
    } catch (error) {
      console.error("Error fetching financial trends:", error);
      res.status(500).json({ message: "Failed to fetch financial trends" });
    }
  });

  app.get('/api/dashboard/pending-actions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const role = req.query.role as 'client' | 'consultant' || user.role;
      const actions = await storage.getPendingActions(userId, role);
      res.json({ actions });
    } catch (error) {
      console.error("Error fetching pending actions:", error);
      res.status(500).json({ message: "Failed to fetch pending actions" });
    }
  });

  app.get('/api/dashboard/active-projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const role = req.query.role as 'client' | 'consultant' || user.role;
      const projects = await storage.getActiveProjectsSummary(userId, role);
      res.json({ projects });
    } catch (error) {
      console.error("Error fetching active projects:", error);
      res.status(500).json({ message: "Failed to fetch active projects" });
    }
  });

  // ============================================================================
  // ANALYTICS ENDPOINTS - Reports & Analytics System
  // ============================================================================

  // Vendor/Consultant Analytics
  app.get('/api/analytics/vendor/earnings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is consultant
      const consultantProfile = await storage.getConsultantProfile(userId);
      if (!consultantProfile) {
        return res.status(403).json({ message: "Consultant profile required" });
      }

      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const earnings = await storage.getVendorEarnings(userId, period, startDate, endDate);
      res.json(earnings);
    } catch (error) {
      console.error("Error fetching vendor earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings data" });
    }
  });

  app.get('/api/analytics/vendor/performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is consultant
      const consultantProfile = await storage.getConsultantProfile(userId);
      if (!consultantProfile) {
        return res.status(403).json({ message: "Consultant profile required" });
      }

      const performance = await storage.getVendorPerformance(userId);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching vendor performance:", error);
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  // Client Analytics
  app.get('/api/analytics/client/spending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is client
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile) {
        return res.status(403).json({ message: "Client profile required" });
      }

      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const spending = await storage.getClientSpending(userId, period, startDate, endDate);
      res.json(spending);
    } catch (error) {
      console.error("Error fetching client spending:", error);
      res.status(500).json({ message: "Failed to fetch spending data" });
    }
  });

  app.get('/api/analytics/client/hiring', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is client
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile) {
        return res.status(403).json({ message: "Client profile required" });
      }

      const hiring = await storage.getClientHiring(userId);
      res.json(hiring);
    } catch (error) {
      console.error("Error fetching client hiring stats:", error);
      res.status(500).json({ message: "Failed to fetch hiring data" });
    }
  });

  // Platform Analytics (Admin only)
  app.get('/api/admin/analytics/growth', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is admin
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const growth = await storage.getPlatformGrowth(period, startDate, endDate);
      res.json(growth);
    } catch (error) {
      console.error("Error fetching platform growth:", error);
      res.status(500).json({ message: "Failed to fetch growth data" });
    }
  });

  app.get('/api/admin/analytics/revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is admin
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const revenue = await storage.getPlatformRevenue(period, startDate, endDate);
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching platform revenue:", error);
      res.status(500).json({ message: "Failed to fetch revenue data" });
    }
  });

  app.get('/api/admin/analytics/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is admin
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const categories = await storage.getCategoryPerformance();
      res.json({ categories });
    } catch (error) {
      console.error("Error fetching category performance:", error);
      res.status(500).json({ message: "Failed to fetch category performance" });
    }
  });

  // CSV Export endpoints
  app.post('/api/analytics/vendor/export-csv', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is consultant
      const consultantProfile = await storage.getConsultantProfile(userId);
      if (!consultantProfile) {
        return res.status(403).json({ message: "Consultant profile required" });
      }

      const { reportType, period, startDate, endDate } = req.body;
      
      let csvData = '';
      if (reportType === 'earnings') {
        const earnings = await storage.getVendorEarnings(
          userId,
          period || 'monthly',
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        
        csvData = 'Period,Total Earnings (SAR),Category,Amount (SAR)\n';
        csvData += `${earnings.period},${earnings.totalEarnings},,\n\n`;
        csvData += 'Earnings by Period:\n';
        earnings.earningsByPeriod.forEach((e: any) => {
          csvData += `${e.date},${e.amount},,\n`;
        });
        csvData += '\nEarnings by Category:\n';
        earnings.earningsByCategory.forEach((c: any) => {
          csvData += `,,${c.categoryName},${c.amount}\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="vendor-${reportType}-${Date.now()}.csv"`);
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting vendor CSV:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  app.post('/api/analytics/client/export-csv', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is client
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile) {
        return res.status(403).json({ message: "Client profile required" });
      }

      const { reportType, period, startDate, endDate } = req.body;
      
      let csvData = '';
      if (reportType === 'spending') {
        const spending = await storage.getClientSpending(
          userId,
          period || 'monthly',
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        
        csvData = 'Period,Total Spending (SAR),Category,Amount (SAR)\n';
        csvData += `${spending.period},${spending.totalSpending},,\n\n`;
        csvData += 'Spending by Period:\n';
        spending.spendingByPeriod.forEach((s: any) => {
          csvData += `${s.date},${s.amount},,\n`;
        });
        csvData += '\nSpending by Category:\n';
        spending.spendingByCategory.forEach((c: any) => {
          csvData += `,,${c.categoryName},${c.amount}\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="client-${reportType}-${Date.now()}.csv"`);
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting client CSV:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  app.post('/api/admin/analytics/export-csv', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is admin
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { reportType, period, startDate, endDate } = req.body;
      
      let csvData = '';
      if (reportType === 'growth') {
        const growth = await storage.getPlatformGrowth(
          period || 'monthly',
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        
        csvData = 'Metric,Value\n';
        csvData += `Total Users,${growth.totalUsers}\n`;
        csvData += `Total Clients,${growth.totalClients}\n`;
        csvData += `Total Consultants,${growth.totalConsultants}\n`;
        csvData += `New Registrations (This Month),${growth.newRegistrationsThisMonth}\n`;
        csvData += `Active Projects,${growth.activeProjects}\n\n`;
        csvData += 'User Growth by Period:\n';
        csvData += 'Period,Clients,Consultants\n';
        growth.userGrowthByMonth.forEach((g: any) => {
          csvData += `${g.month},${g.clients},${g.consultants}\n`;
        });
      } else if (reportType === 'categories') {
        const categories = await storage.getCategoryPerformance();
        
        csvData = 'Category,Jobs Posted,Total Bids,Success Rate,Avg Budget (SAR)\n';
        categories.forEach((c: any) => {
          csvData += `${c.categoryName},${c.jobsPosted},${c.totalBids},${(c.successRate * 100).toFixed(1)}%,${c.avgBudget}\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="admin-${reportType}-${Date.now()}.csv"`);
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting admin CSV:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  // Bid endpoints
  app.get('/api/bids', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Validate query params
      const validation = queryLimitSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid query parameters", errors: validation.error });
      }
      
      const { limit } = validation.data;
      const bids = await storage.listClientBids(userId, limit);
      res.json({ bids, total: bids.length });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  // Enhanced Bid endpoints
  app.post('/api/bids', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user is consultant
      const consultantProfile = await storage.getConsultantProfile(userId);
      if (!consultantProfile) {
        return res.status(403).json({ message: "Consultant profile required" });
      }

      // Validate bid data
      const validation = insertBidSchema.safeParse({ ...req.body, consultantId: userId });
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid bid data", errors: validation.error });
      }

      const bid = await storage.createBid(validation.data);
      
      // Get job details to notify the client
      try {
        const job = await storage.getJobById(bid.jobId);
        if (job) {
          await notificationService.notifyBidReceived(job.clientId, {
            bidId: bid.id,
            consultantName: consultantProfile.businessName || consultantProfile.fullName || 'A consultant',
            jobTitle: job.title,
            jobId: job.id,
          });
        }
      } catch (notifError) {
        console.error("Error sending bid notification:", notifError);
        // Don't fail the request if notification fails
      }
      
      res.status(201).json(bid);
    } catch (error) {
      console.error("Error creating bid:", error);
      res.status(500).json({ message: "Failed to create bid" });
    }
  });

  app.get('/api/bids/:id', isAuthenticated, async (req: any, res) => {
    try {
      const bid = await storage.getBid(req.params.id);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }
      res.json(bid);
    } catch (error) {
      console.error("Error fetching bid:", error);
      res.status(500).json({ message: "Failed to fetch bid" });
    }
  });

  app.get('/api/jobs/:jobId/bids', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user owns the job
      const job = await storage.getJobById(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (job.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const options = {
        status: req.query.status as string | undefined,
        minBudget: req.query.minBudget ? Number(req.query.minBudget) : undefined,
        maxBudget: req.query.maxBudget ? Number(req.query.maxBudget) : undefined,
        sortBy: req.query.sortBy as 'budget' | 'rating' | 'date' | 'timeline' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };

      const result = await storage.getJobBids(req.params.jobId, options);
      res.json(result);
    } catch (error) {
      console.error("Error fetching job bids:", error);
      res.status(500).json({ message: "Failed to fetch job bids" });
    }
  });

  app.get('/api/consultant/bids', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const options = {
        status: req.query.status as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };

      const bids = await storage.getConsultantBids(userId, options);
      res.json({ bids, total: bids.length });
    } catch (error) {
      console.error("Error fetching consultant bids:", error);
      res.status(500).json({ message: "Failed to fetch consultant bids" });
    }
  });

  app.patch('/api/bids/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const updated = await storage.updateBid(req.params.id, userId, req.body);

      // Notify consultant about bid status update
      try {
        const job = await storage.getJobById(updated.jobId);
        if (job) {
          await notificationService.notifyBidStatusUpdate(updated.consultantId, {
            bidId: updated.id,
            jobTitle: job.title,
            status: updated.status,
          });
        }
      } catch (notifError) {
        console.error("Error sending bid status update notification:", notifError);
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating bid:", error);
      res.status(500).json({ message: "Failed to update bid" });
    }
  });

  app.post('/api/bids/:id/withdraw', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const bid = await storage.withdrawBid(req.params.id, userId);

      // Notify consultant about bid withdrawal
      try {
        const job = await storage.getJobById(bid.jobId);
        if (job) {
          await notificationService.notifyBidStatusUpdate(bid.consultantId, {
            bidId: bid.id,
            jobTitle: job.title,
            status: 'withdrawn',
          });
        }
      } catch (notifError) {
        console.error("Error sending bid withdrawal notification:", notifError);
      }

      res.json(bid);
    } catch (error) {
      console.error("Error withdrawing bid:", error);
      res.status(500).json({ message: "Failed to withdraw bid" });
    }
  });

  app.post('/api/bids/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Security: Verify user owns the job this bid is for
      const bid = await storage.getBid(req.params.id);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      const job = await storage.getJobById(bid.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only accept bids on your own jobs" });
      }

      const acceptedBid = await storage.acceptBid(req.params.id, userId);

      // Notify consultant that their bid was awarded (note: project created below)
      // We'll send notification after project creation to include projectId
      let awardedNotificationPending = true;

      // Auto-create project/contract after bid acceptance
      const startDate = new Date();
      const proposedDuration = bid.proposedDuration || '30 days';
      const durationDays = parseInt(proposedDuration) || 30;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);

      const project = await storage.createProject({
        jobId: job.id,
        clientId: job.clientId,
        consultantId: bid.consultantId,
        bidId: bid.id,
        title: job.title,
        description: job.description,
        budget: bid.proposedBudget,
        currency: 'SAR',
        status: 'not_started',
        startDate,
        endDate,
        milestones: bid.milestones || [],
        overallProgress: 0,
        scope: bid.proposalData ? (typeof bid.proposalData === 'object' && 'scope' in bid.proposalData ? (bid.proposalData as any).scope : null) : null,
        paymentTerms: bid.proposalData ? (typeof bid.proposalData === 'object' && 'paymentTerms' in bid.proposalData ? (bid.proposalData as any).paymentTerms : null) : null,
        warrantyTerms: bid.proposalData ? (typeof bid.proposalData === 'object' && 'warrantyPeriod' in bid.proposalData ? (bid.proposalData as any).warrantyPeriod : null) : null,
        supportTerms: bid.proposalData ? (typeof bid.proposalData === 'object' && 'supportTerms' in bid.proposalData ? (bid.proposalData as any).supportTerms : null) : null,
        ndaRequired: false,
        cancellationPolicy: null,
        contractVersion: 1,
        signedAt: null,
      });

      // Now send bid awarded notification with project ID
      if (awardedNotificationPending) {
        try {
          await notificationService.notifyBidAwarded(bid.consultantId, {
            bidId: bid.id,
            jobTitle: job.title,
            projectId: project.id,
          });
        } catch (notifError) {
          console.error("Error sending bid awarded notification:", notifError);
        }
      }

      res.json({ bid: acceptedBid, project });
    } catch (error) {
      console.error("Error accepting bid:", error);
      res.status(500).json({ message: "Failed to accept bid" });
    }
  });

  app.post('/api/bids/:id/decline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Security: Verify user owns the job this bid is for
      const bid = await storage.getBid(req.params.id);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      const job = await storage.getJobById(bid.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only decline bids on your own jobs" });
      }

      const declinedBid = await storage.declineBid(req.params.id, userId, req.body.message);
      
      // Notify consultant that their bid was rejected
      try {
        await notificationService.notifyBidRejected(bid.consultantId, {
          bidId: bid.id,
          jobTitle: job.title,
        });
      } catch (notifError) {
        console.error("Error sending bid rejected notification:", notifError);
      }
      
      res.json(declinedBid);
    } catch (error) {
      console.error("Error declining bid:", error);
      res.status(500).json({ message: "Failed to decline bid" });
    }
  });

  app.get('/api/bids/:id/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const analytics = await storage.getBidAnalytics(req.params.id);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching bid analytics:", error);
      res.status(500).json({ message: "Failed to fetch bid analytics" });
    }
  });

  // Project/Contract Management endpoints
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get user profile to determine role
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { status, limit, offset } = req.query;
      const filters = {
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      };

      let result;
      if (user.role === 'consultant') {
        result = await storage.getConsultantProjects(userId, filters);
      } else if (user.role === 'client') {
        result = await storage.getClientProjects(userId, filters);
      } else {
        return res.status(403).json({ message: "Invalid user role" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Security: Verify user exists and has valid role
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'client' && user.role !== 'consultant')) {
        return res.status(403).json({ message: "Unauthorized: Invalid user or role" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Security: Verify ownership - user must be client or consultant on this specific project
      const isClient = user.role === 'client' && project.clientId === userId;
      const isConsultant = user.role === 'consultant' && project.consultantId === userId;
      
      if (!isClient && !isConsultant) {
        return res.status(403).json({ message: "Unauthorized: You can only view projects you own" });
      }

      // Get additional project data
      const [teamMembers, deliverables, comments, activityLog] = await Promise.all([
        storage.getProjectTeamMembers(project.id),
        storage.getProjectDeliverables(project.id),
        storage.getProjectComments(project.id),
        storage.getProjectActivityLog(project.id, { limit: 50 }),
      ]);

      // Determine delivery type from project's category
      let deliveryType: 'service' | 'hardware' | 'software' | null = null;
      if (project.bidId) {
        const bid = await storage.getBid(project.bidId);
        if (bid) {
          const job = await storage.getJobById(bid.jobId);
          if (job && job.categoryId) {
            const [category] = await db
              .select()
              .from(categories)
              .where(eq(categories.id, job.categoryId));
            
            if (category && category.categoryType) {
              if (category.categoryType === 'hardware_supply') {
                deliveryType = 'hardware';
              } else if (category.categoryType === 'software_services') {
                deliveryType = 'software';
              } else {
                deliveryType = 'service'; // Default for other types
              }
            }
          }
        }
      }

      res.json({
        ...project,
        teamMembers,
        deliverables,
        comments,
        activityLog: activityLog.activities,
        deliveryType, // Add delivery type to response
        categoryType: deliveryType, // For backward compatibility
      });
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch('/api/projects/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Security: Verify user exists and has valid role
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'client' && user.role !== 'consultant')) {
        return res.status(403).json({ message: "Unauthorized: Invalid user or role" });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const validStatuses = ['not_started', 'in_progress', 'awaiting_review', 'revision_requested', 'completed', 'cancelled', 'on_hold', 'delayed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Security: Verify ownership - user must be client or consultant on this specific project
      const isClient = user.role === 'client' && project.clientId === userId;
      const isConsultant = user.role === 'consultant' && project.consultantId === userId;
      
      if (!isClient && !isConsultant) {
        return res.status(403).json({ message: "Unauthorized: You can only update projects you own" });
      }

      const updatedProject = await storage.updateProjectStatus(req.params.id, status, userId);
      
      // Notify the other party about project status change
      try {
        const notifyUserId = userId === project.clientId ? project.consultantId : project.clientId;
        await notificationService.notifyProjectStatusChange(notifyUserId, {
          projectId: project.id,
          projectTitle: project.title,
          newStatus: status,
        });
      } catch (notifError) {
        console.error("Error sending project status notification:", notifError);
      }
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project status:", error);
      res.status(500).json({ message: "Failed to update project status" });
    }
  });

  app.patch('/api/projects/:id/milestones/:index', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can update milestones" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only update your own project milestones" });
      }

      const milestoneIndex = parseInt(req.params.index);
      const { status, progress } = req.body;

      const updatedProject = await storage.updateMilestoneStatus(req.params.id, milestoneIndex, status, progress);
      
      // Notify client when milestone is completed
      if (status === 'completed') {
        try {
          const milestones = Array.isArray(project.milestones) ? project.milestones : [];
          const milestone = milestones[milestoneIndex];
          if (milestone) {
            await notificationService.notifyMilestoneCompleted(project.clientId, {
              projectId: project.id,
              projectTitle: project.title,
              milestoneTitle: typeof milestone === 'object' && 'title' in milestone ? (milestone as any).title : `Milestone ${milestoneIndex + 1}`,
            });
          }
        } catch (notifError) {
          console.error("Error sending milestone notification:", notifError);
        }
      }
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ message: "Failed to update milestone" });
    }
  });

  app.patch('/api/projects/:id/extend', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Unauthorized: Only clients can extend project deadlines" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only extend your own projects" });
      }

      const { newEndDate, reason } = req.body;
      if (!newEndDate || !reason) {
        return res.status(400).json({ message: "New end date and reason are required" });
      }

      const updatedProject = await storage.extendProjectDeadline(req.params.id, new Date(newEndDate), reason, userId);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error extending deadline:", error);
      res.status(500).json({ message: "Failed to extend deadline" });
    }
  });

  app.post('/api/projects/:id/milestones/:index/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only comment on your own projects" });
      }

      const milestoneIndex = parseInt(req.params.index);
      const { comment, attachments, mentions } = req.body;

      const newComment = await storage.addMilestoneComment({
        projectId: req.params.id,
        milestoneIndex,
        userId,
        comment,
        attachments: attachments || [],
        mentions: mentions || [],
        resolved: false,
      });

      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  app.get('/api/projects/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only view comments on your own projects" });
      }

      const milestoneIndex = req.query.milestoneIndex ? parseInt(req.query.milestoneIndex as string) : undefined;
      const comments = await storage.getProjectComments(req.params.id, milestoneIndex);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.patch('/api/projects/:id/comments/:commentId/resolve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { resolved } = req.body;
      const comment = resolved 
        ? await storage.resolveComment(req.params.commentId, userId)
        : await storage.unresolveComment(req.params.commentId);
      
      res.json(comment);
    } catch (error) {
      console.error("Error resolving comment:", error);
      res.status(500).json({ message: "Failed to resolve comment" });
    }
  });

  app.post('/api/projects/:id/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized: Only project owner can add team members" });
      }

      const { memberId, role, assignedMilestones } = req.body;
      const teamMember = await storage.addTeamMember({
        projectId: req.params.id,
        userId: memberId,
        role,
        assignedMilestones: assignedMilestones || [],
        permissions: [],
        addedBy: userId,
      });

      // Notify the new team member
      try {
        const adder = await storage.getUser(userId);
        await notificationService.notifyTeamMemberActivity(memberId, {
          memberName: adder?.email || 'A team member',
          action: 'added you to',
          projectTitle: project.title,
          projectId: project.id,
        });
      } catch (notifError) {
        console.error("Error sending team member notification:", notifError);
      }

      res.status(201).json(teamMember);
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  app.delete('/api/projects/:id/team-members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized: Only project owner can remove team members" });
      }

      await storage.removeTeamMember(req.params.id, req.params.memberId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  app.post('/api/projects/:id/deliverables', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can submit deliverables" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only submit deliverables to your own projects" });
      }

      const { title, description, fileUrl, milestoneIndex, version } = req.body;
      const deliverable = await storage.submitDeliverable({
        projectId: req.params.id,
        milestoneIndex: milestoneIndex || 0,
        title,
        description,
        fileUrl: fileUrl || 'mock://file.pdf',
        version: version || 1,
        uploadedBy: userId,
        status: 'pending',
      });

      // Notify client about deliverable submission
      try {
        await notificationService.notifyDeliverableSubmitted(project.clientId, {
          projectId: project.id,
          projectTitle: project.title,
          deliverableTitle: title,
        });
      } catch (notifError) {
        console.error("Error sending deliverable notification:", notifError);
      }

      res.status(201).json(deliverable);
    } catch (error) {
      console.error("Error submitting deliverable:", error);
      res.status(500).json({ message: "Failed to submit deliverable" });
    }
  });

  app.get('/api/projects/:id/deliverables', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const milestoneIndex = req.query.milestoneIndex ? parseInt(req.query.milestoneIndex as string) : undefined;
      const deliverables = await storage.getProjectDeliverables(req.params.id, milestoneIndex);
      res.json(deliverables);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      res.status(500).json({ message: "Failed to fetch deliverables" });
    }
  });

  app.patch('/api/projects/:id/deliverables/:deliverableId/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Unauthorized: Only clients can approve deliverables" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only approve deliverables on your own projects" });
      }

      const deliverable = await storage.approveDeliverable(req.params.deliverableId, userId);
      res.json(deliverable);
    } catch (error) {
      console.error("Error approving deliverable:", error);
      res.status(500).json({ message: "Failed to approve deliverable" });
    }
  });

  app.patch('/api/projects/:id/deliverables/:deliverableId/revision', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Unauthorized: Only clients can request revisions" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { reviewNotes } = req.body;
      if (!reviewNotes) {
        return res.status(400).json({ message: "Review notes are required" });
      }

      const deliverable = await storage.requestRevision(req.params.deliverableId, reviewNotes, userId);
      res.json(deliverable);
    } catch (error) {
      console.error("Error requesting revision:", error);
      res.status(500).json({ message: "Failed to request revision" });
    }
  });

  app.post('/api/projects/:id/payment-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can request payments" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { milestoneIndex, amount, description } = req.body;
      
      await storage.logProjectActivity({
        projectId: req.params.id,
        userId,
        action: 'payment_requested',
        details: { milestoneIndex, amount, description },
      });

      res.status(201).json({ 
        message: "Payment request submitted (mocked)", 
        milestoneIndex, 
        amount, 
        status: 'pending' 
      });
    } catch (error) {
      console.error("Error requesting payment:", error);
      res.status(500).json({ message: "Failed to request payment" });
    }
  });

  app.post('/api/projects/:id/milestones/:index/release-payment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Unauthorized: Only clients can release payments" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const milestoneIndex = parseInt(req.params.index);
      const { amount } = req.body;

      await storage.logProjectActivity({
        projectId: req.params.id,
        userId,
        action: 'payment_released',
        details: { milestoneIndex, amount },
      });

      res.json({ 
        message: "Payment released (mocked)", 
        milestoneIndex, 
        amount, 
        status: 'completed' 
      });
    } catch (error) {
      console.error("Error releasing payment:", error);
      res.status(500).json({ message: "Failed to release payment" });
    }
  });

  app.get('/api/projects/:id/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { action, limit, offset } = req.query;
      const activityLog = await storage.getProjectActivityLog(req.params.id, {
        action: action as string | undefined,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json(activityLog);
    } catch (error) {
      console.error("Error fetching activity log:", error);
      res.status(500).json({ message: "Failed to fetch activity log" });
    }
  });

  // ============================================================================
  // DELIVERY & FULFILLMENT SYSTEM ROUTES
  // ============================================================================

  // 1. SERVICE DELIVERY - FILE VERSIONING ROUTES

  app.post('/api/deliverables/:id/versions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can upload versions" });
      }

      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }

      const project = await storage.getProjectById(deliverable.projectId);
      if (!project || project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only upload versions to your own deliverables" });
      }

      const { fileUrl, changeNotes, fileSize, fileType } = req.body;
      const latestVersion = await storage.getLatestVersion(req.params.id);
      const versionNumber = (latestVersion?.versionNumber || 0) + 1;

      const version = await storage.uploadDeliverableVersion({
        deliverableId: req.params.id,
        versionNumber,
        fileUrl,
        changeNotes,
        fileSize: fileSize || '0',
        fileType: fileType || 'application/octet-stream',
        uploadedBy: userId,
      });

      await storage.logProjectActivity({
        projectId: deliverable.projectId,
        userId,
        action: 'deliverable_version_uploaded',
        details: { deliverableId: req.params.id, versionNumber, fileUrl },
      });

      res.status(201).json(version);
    } catch (error) {
      console.error("Error uploading version:", error);
      res.status(500).json({ message: "Failed to upload version" });
    }
  });

  app.get('/api/deliverables/:id/versions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }

      const project = await storage.getProjectById(deliverable.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const versions = await storage.getDeliverableVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching versions:", error);
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  app.get('/api/deliverables/:id/versions/:versionId/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }

      const project = await storage.getProjectById(deliverable.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const version = await storage.getDeliverableVersion(req.params.versionId);
      if (!version) {
        return res.status(404).json({ message: "Version not found" });
      }

      await storage.trackDownload({
        deliverableId: req.params.id,
        versionId: req.params.versionId,
        downloadedBy: userId,
        ipAddress: req.ip || 'unknown',
      });

      res.json({ fileUrl: version.fileUrl, version: version.versionNumber });
    } catch (error) {
      console.error("Error downloading version:", error);
      res.status(500).json({ message: "Failed to download version" });
    }
  });

  app.get('/api/deliverables/:id/versions/compare', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { v1, v2 } = req.query;
      if (!v1 || !v2) {
        return res.status(400).json({ message: "Both version IDs required" });
      }

      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }

      const project = await storage.getProjectById(deliverable.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const comparison = await storage.compareVersions(v1 as string, v2 as string);
      res.json(comparison);
    } catch (error) {
      console.error("Error comparing versions:", error);
      res.status(500).json({ message: "Failed to compare versions" });
    }
  });

  app.delete('/api/deliverables/:id/versions/:versionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can delete versions" });
      }

      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }

      const project = await storage.getProjectById(deliverable.projectId);
      if (!project || project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const version = await storage.getDeliverableVersion(req.params.versionId);
      if (!version || version.isLatest) {
        return res.status(400).json({ message: "Cannot delete the latest version" });
      }

      await storage.deleteDeliverableVersion(req.params.versionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting version:", error);
      res.status(500).json({ message: "Failed to delete version" });
    }
  });

  app.get('/api/deliverables/:id/downloads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }

      const project = await storage.getProjectById(deliverable.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { versionId, userId: filterUserId } = req.query;
      const downloads = await storage.getDownloadHistory(req.params.id, {
        versionId: versionId as string | undefined,
        userId: filterUserId as string | undefined,
      });

      res.json(downloads);
    } catch (error) {
      console.error("Error fetching download history:", error);
      res.status(500).json({ message: "Failed to fetch download history" });
    }
  });

  app.patch('/api/deliverables/:id/versions/:versionId/set-latest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can set latest version" });
      }

      const deliverable = await storage.getDeliverableById(req.params.id);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }

      const project = await storage.getProjectById(deliverable.projectId);
      if (!project || project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.setLatestVersion(req.params.id, req.params.versionId);
      res.json({ message: "Latest version updated successfully" });
    } catch (error) {
      console.error("Error setting latest version:", error);
      res.status(500).json({ message: "Failed to set latest version" });
    }
  });

  // 2. HARDWARE DELIVERY - SHIPPING & QUALITY ROUTES

  app.post('/api/projects/:id/shipments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can create shipments" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { deliverableId, items, shippingAddress, carrier, estimatedDelivery } = req.body;

      const shipment = await storage.createShipment({
        projectId: req.params.id,
        deliverableId,
        items: items || [],
        shippingAddress,
        carrier: carrier || 'Standard',
        status: 'order_confirmed',
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await storage.logProjectActivity({
        projectId: req.params.id,
        userId,
        action: 'shipment_created',
        details: { shipmentId: shipment.id, orderNumber: shipment.orderNumber },
      });

      res.status(201).json(shipment);
    } catch (error) {
      console.error("Error creating shipment:", error);
      res.status(500).json({ message: "Failed to create shipment" });
    }
  });

  app.get('/api/projects/:id/shipments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const shipments = await storage.getProjectShipments(req.params.id);
      res.json(shipments);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      res.status(500).json({ message: "Failed to fetch shipments" });
    }
  });

  app.get('/api/shipments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      res.json(shipment);
    } catch (error) {
      console.error("Error fetching shipment:", error);
      res.status(500).json({ message: "Failed to fetch shipment" });
    }
  });

  app.patch('/api/shipments/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can update shipment status" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { status, notes, location } = req.body;
      const updated = await storage.updateShipmentStatus(req.params.id, status, notes, location);

      await storage.logProjectActivity({
        projectId: shipment.projectId,
        userId,
        action: 'shipment_status_updated',
        details: { shipmentId: req.params.id, status, notes },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating shipment status:", error);
      res.status(500).json({ message: "Failed to update shipment status" });
    }
  });

  app.post('/api/shipments/:id/confirm-delivery', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Unauthorized: Only clients can confirm delivery" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || project.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { signatureUrl, notes } = req.body;
      const updated = await storage.confirmDelivery(req.params.id, userId, signatureUrl, notes);

      await storage.logProjectActivity({
        projectId: shipment.projectId,
        userId,
        action: 'delivery_confirmed',
        details: { shipmentId: req.params.id, notes },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error confirming delivery:", error);
      res.status(500).json({ message: "Failed to confirm delivery" });
    }
  });

  app.post('/api/shipments/:id/schedule-installation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { scheduledAt } = req.body;
      if (!scheduledAt) {
        return res.status(400).json({ message: "Installation date required" });
      }

      const updated = await storage.scheduleInstallation(req.params.id, new Date(scheduledAt));
      res.json(updated);
    } catch (error) {
      console.error("Error scheduling installation:", error);
      res.status(500).json({ message: "Failed to schedule installation" });
    }
  });

  app.post('/api/shipments/:id/complete-installation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can complete installation" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { notes } = req.body;
      const updated = await storage.completeInstallation(req.params.id, userId, notes);

      await storage.logProjectActivity({
        projectId: shipment.projectId,
        userId,
        action: 'installation_completed',
        details: { shipmentId: req.params.id, notes },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error completing installation:", error);
      res.status(500).json({ message: "Failed to complete installation" });
    }
  });

  app.post('/api/shipments/:id/quality-inspections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { checklistItems, overallStatus, photos, notes } = req.body;

      const inspection = await storage.createQualityInspection({
        shipmentId: req.params.id,
        inspectorId: userId,
        inspectionDate: new Date(),
        checklistItems: checklistItems || [],
        overallStatus: overallStatus || 'pending',
        photos: photos || [],
        notes,
      });

      res.status(201).json(inspection);
    } catch (error) {
      console.error("Error creating inspection:", error);
      res.status(500).json({ message: "Failed to create quality inspection" });
    }
  });

  app.get('/api/shipments/:id/quality-inspections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const inspections = await storage.getShipmentInspections(req.params.id);
      res.json(inspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      res.status(500).json({ message: "Failed to fetch quality inspections" });
    }
  });

  app.post('/api/shipments/:id/returns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Unauthorized: Only clients can request returns" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || project.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { reason, type, description, photos } = req.body;

      const returnRequest = await storage.createReturnRequest({
        shipmentId: req.params.id,
        requestedBy: userId,
        reason: reason || 'other',
        type: type || 'replacement',
        description,
        status: 'pending',
        photos: photos || [],
      });

      await storage.logProjectActivity({
        projectId: shipment.projectId,
        userId,
        action: 'return_requested',
        details: { shipmentId: req.params.id, returnId: returnRequest.id, type },
      });

      res.status(201).json(returnRequest);
    } catch (error) {
      console.error("Error creating return request:", error);
      res.status(500).json({ message: "Failed to create return request" });
    }
  });

  app.get('/api/shipments/:id/returns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const returns = await storage.getShipmentReturns(req.params.id);
      res.json(returns);
    } catch (error) {
      console.error("Error fetching returns:", error);
      res.status(500).json({ message: "Failed to fetch return requests" });
    }
  });

  app.post('/api/shipments/:id/warranty-claims', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Unauthorized: Only clients can file warranty claims" });
      }

      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const project = await storage.getProjectById(shipment.projectId);
      if (!project || project.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { issue, description, photos, warrantyPeriod } = req.body;

      const claim = await storage.createWarrantyClaim({
        shipmentId: req.params.id,
        claimantId: userId,
        issue,
        description,
        status: 'submitted',
        photos: photos || [],
        warrantyPeriod: warrantyPeriod || '1 year',
      });

      await storage.logProjectActivity({
        projectId: shipment.projectId,
        userId,
        action: 'warranty_claim_filed',
        details: { shipmentId: req.params.id, claimId: claim.id, issue },
      });

      res.status(201).json(claim);
    } catch (error) {
      console.error("Error creating warranty claim:", error);
      res.status(500).json({ message: "Failed to create warranty claim" });
    }
  });

  // 3. SOFTWARE DELIVERY - LICENSE & SUBSCRIPTION ROUTES

  app.post('/api/projects/:id/licenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can generate licenses" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { deliverableId, licenseType, maxActivations, expiresAt, productName } = req.body;

      const license = await storage.generateLicense({
        projectId: req.params.id,
        deliverableId,
        issuedTo: project.clientId,
        issuedBy: userId,
        licenseType: licenseType || 'full',
        productName: productName || 'Software Product',
        maxActivations: maxActivations || -1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      await storage.logProjectActivity({
        projectId: req.params.id,
        userId,
        action: 'license_generated',
        details: { licenseId: license.id, licenseKey: license.licenseKey },
      });

      res.status(201).json(license);
    } catch (error) {
      console.error("Error generating license:", error);
      res.status(500).json({ message: "Failed to generate license" });
    }
  });

  app.get('/api/projects/:id/licenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const licenses = await storage.getProjectLicenses(req.params.id);
      res.json(licenses);
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ message: "Failed to fetch licenses" });
    }
  });

  app.get('/api/licenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const license = await storage.getLicense(req.params.id);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }

      const project = await storage.getProjectById(license.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const activations = await storage.getLicenseActivations(req.params.id);
      const subscription = await storage.getLicenseSubscription(req.params.id);

      res.json({ ...license, activations, subscription });
    } catch (error) {
      console.error("Error fetching license:", error);
      res.status(500).json({ message: "Failed to fetch license" });
    }
  });

  app.post('/api/licenses/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const license = await storage.getLicense(req.params.id);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }

      if (license.issuedTo !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only activate your own licenses" });
      }

      if (!license.isActive) {
        return res.status(400).json({ message: "License is not active" });
      }

      const { deviceId, deviceName, os, hardware } = req.body;

      const activation = await storage.activateLicense({
        licenseId: req.params.id,
        deviceId: deviceId || 'unknown',
        deviceName: deviceName || 'Unknown Device',
        os,
        hardware,
        activatedBy: userId,
      });

      res.status(201).json(activation);
    } catch (error) {
      console.error("Error activating license:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to activate license" });
    }
  });

  app.post('/api/licenses/:id/deactivate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can deactivate licenses" });
      }

      const license = await storage.getLicense(req.params.id);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }

      const project = await storage.getProjectById(license.projectId);
      if (!project || project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { reason } = req.body;
      const updated = await storage.deactivateLicense(req.params.id, userId, reason);

      await storage.logProjectActivity({
        projectId: license.projectId,
        userId,
        action: 'license_deactivated',
        details: { licenseId: req.params.id, reason },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error deactivating license:", error);
      res.status(500).json({ message: "Failed to deactivate license" });
    }
  });

  app.post('/api/licenses/:id/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'consultant') {
        return res.status(403).json({ message: "Unauthorized: Only consultants can create subscriptions" });
      }

      const license = await storage.getLicense(req.params.id);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }

      const project = await storage.getProjectById(license.projectId);
      if (!project || project.consultantId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { subscriptionPlan, billingCycle, amount } = req.body;

      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
      else if (billingCycle === 'quarterly') periodEnd.setMonth(periodEnd.getMonth() + 3);
      else if (billingCycle === 'annual') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      const subscription = await storage.createSubscription({
        licenseId: req.params.id,
        subscriptionPlan: subscriptionPlan || 'Standard',
        billingCycle: billingCycle || 'monthly',
        amount: amount || '0',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
      });

      res.status(201).json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post('/api/subscriptions/:id/renew', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const subscription = await db
        .select()
        .from(softwareSubscriptions)
        .where(eq(softwareSubscriptions.id, req.params.id))
        .then(rows => rows[0]);

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      const license = await storage.getLicense(subscription.licenseId);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }

      if (license.issuedTo !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only renew your own subscriptions" });
      }

      const renewed = await storage.renewSubscription(req.params.id);
      res.json(renewed);
    } catch (error) {
      console.error("Error renewing subscription:", error);
      res.status(500).json({ message: "Failed to renew subscription" });
    }
  });

  app.post('/api/subscriptions/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const subscription = await db
        .select()
        .from(softwareSubscriptions)
        .where(eq(softwareSubscriptions.id, req.params.id))
        .then(rows => rows[0]);

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      const license = await storage.getLicense(subscription.licenseId);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }

      if (license.issuedTo !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only cancel your own subscriptions" });
      }

      const { reason } = req.body;
      const cancelled = await storage.cancelSubscription(req.params.id, reason);

      res.json(cancelled);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.post('/api/activations/:id/deactivate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const activation = await db
        .select()
        .from(softwareActivations)
        .where(eq(softwareActivations.id, req.params.id))
        .then(rows => rows[0]);

      if (!activation) {
        return res.status(404).json({ message: "Activation not found" });
      }

      const license = await storage.getLicense(activation.licenseId);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }

      if (license.issuedTo !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { reason } = req.body;
      const deactivated = await storage.deactivateDevice(req.params.id, userId, reason);

      res.json(deactivated);
    } catch (error) {
      console.error("Error deactivating device:", error);
      res.status(500).json({ message: "Failed to deactivate device" });
    }
  });

  app.get('/api/licenses/:id/activations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const license = await storage.getLicense(req.params.id);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }

      const project = await storage.getProjectById(license.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const activations = await storage.getLicenseActivations(req.params.id);
      res.json(activations);
    } catch (error) {
      console.error("Error fetching activations:", error);
      res.status(500).json({ message: "Failed to fetch activations" });
    }
  });

  // Bid Shortlist endpoints
  app.post('/api/bids/:id/shortlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const bid = await storage.getBid(req.params.id);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      // Security: Verify user owns the job this bid is for
      const job = await storage.getJobById(bid.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only shortlist bids on your own jobs" });
      }

      const shortlist = await storage.addToShortlist({
        jobId: bid.jobId,
        bidId: req.params.id,
        clientId: userId,
        notes: req.body.notes,
      });

      res.status(201).json(shortlist);
    } catch (error) {
      console.error("Error adding to shortlist:", error);
      res.status(500).json({ message: "Failed to add to shortlist" });
    }
  });

  app.delete('/api/bids/:id/shortlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const bid = await storage.getBid(req.params.id);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      // Security: Verify user owns the job this bid is for
      const job = await storage.getJobById(bid.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.clientId !== userId) {
        return res.status(403).json({ message: "Unauthorized: You can only manage shortlists on your own jobs" });
      }

      await storage.removeFromShortlist(bid.jobId, req.params.id, userId);
      res.json({ message: "Removed from shortlist" });
    } catch (error) {
      console.error("Error removing from shortlist:", error);
      res.status(500).json({ message: "Failed to remove from shortlist" });
    }
  });

  app.get('/api/jobs/:jobId/shortlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const shortlist = await storage.getShortlistedBids(req.params.jobId, userId);
      res.json(shortlist);
    } catch (error) {
      console.error("Error fetching shortlist:", error);
      res.status(500).json({ message: "Failed to fetch shortlist" });
    }
  });

  // Bid Clarification endpoints
  app.post('/api/bids/:id/clarifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const clarification = await storage.createClarification({
        bidId: req.params.id,
        askedBy: userId,
        question: req.body.question,
      });

      res.status(201).json(clarification);
    } catch (error) {
      console.error("Error creating clarification:", error);
      res.status(500).json({ message: "Failed to create clarification" });
    }
  });

  app.get('/api/bids/:id/clarifications', isAuthenticated, async (req: any, res) => {
    try {
      const clarifications = await storage.getBidClarifications(req.params.id);
      res.json(clarifications);
    } catch (error) {
      console.error("Error fetching clarifications:", error);
      res.status(500).json({ message: "Failed to fetch clarifications" });
    }
  });

  app.patch('/api/clarifications/:id/answer', isAuthenticated, async (req: any, res) => {
    try {
      const clarification = await storage.answerClarification(req.params.id, req.body.answer);
      res.json(clarification);
    } catch (error) {
      console.error("Error answering clarification:", error);
      res.status(500).json({ message: "Failed to answer clarification" });
    }
  });

  // Bid View Tracking
  app.post('/api/bids/:id/view', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      await storage.trackBidView({
        bidId: req.params.id,
        viewedBy: userId,
        viewDuration: req.body.viewDuration,
        source: req.body.source,
      });

      await storage.incrementBidViewCount(req.params.id);

      res.json({ message: "View tracked" });
    } catch (error) {
      console.error("Error tracking bid view:", error);
      res.status(500).json({ message: "Failed to track bid view" });
    }
  });

  app.post('/api/bids/compare', isAuthenticated, async (req: any, res) => {
    try {
      const { bidIds } = req.body;
      if (!bidIds || !Array.isArray(bidIds)) {
        return res.status(400).json({ message: "Invalid bidIds" });
      }

      await storage.incrementBidComparedCount(bidIds);
      res.json({ message: "Comparison tracked" });
    } catch (error) {
      console.error("Error tracking comparison:", error);
      res.status(500).json({ message: "Failed to track comparison" });
    }
  });

  // Analytics endpoints for consultant and admin
  app.get('/api/consultant/bid-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Mock analytics data - implement with real aggregations
      const analytics = {
        totalBids: 0,
        acceptedBids: 0,
        declinedBids: 0,
        pendingBids: 0,
        withdrawnBids: 0,
        totalViews: 0,
        totalShortlisted: 0,
        totalCompared: 0,
        winRate: 0,
        avgResponseTime: 0,
        avgProposedBudget: 0,
        competitivePosition: { avgRank: 0, totalCompetitors: 0 },
        monthlyTrends: [],
        categoryPerformance: [],
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching consultant analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/admin/bid-analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Mock analytics data - implement with real aggregations
      const analytics = {
        totalBids: 0,
        totalActiveJobs: 0,
        avgBidsPerJob: 0,
        avgAcceptanceTime: 0,
        platformWinRate: 0,
        totalBidValue: 0,
        bidsByType: { service: 0, hardware: 0, software: 0 },
        bidsByStatus: { pending: 0, accepted: 0, declined: 0, withdrawn: 0 },
        topConsultants: [],
        topCategories: [],
        monthlyStats: [],
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // RFQ endpoints
  app.post('/api/jobs/:jobId/rfq/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const rfq = await storage.createRFQInvitation({
        jobId: req.params.jobId,
        clientId: userId,
        consultantId: req.body.consultantId,
        message: req.body.message,
        deadline: req.body.deadline,
        templateData: req.body.templateData,
      });

      res.status(201).json(rfq);
    } catch (error) {
      console.error("Error creating RFQ invitation:", error);
      res.status(500).json({ message: "Failed to create RFQ invitation" });
    }
  });

  app.get('/api/rfq/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const invitations = await storage.getConsultantRFQInvitations(userId, req.query.status as string | undefined);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching RFQ invitations:", error);
      res.status(500).json({ message: "Failed to fetch RFQ invitations" });
    }
  });

  app.patch('/api/rfq/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const rfq = await storage.respondToRFQ(req.params.id, req.body.bidId, req.body.status);
      res.json(rfq);
    } catch (error) {
      console.error("Error responding to RFQ:", error);
      res.status(500).json({ message: "Failed to respond to RFQ" });
    }
  });

  // Client Profile endpoints
  app.get('/api/profile/client', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const profile = await storage.getClientProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Client profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ message: "Failed to fetch client profile" });
    }
  });

  app.put('/api/profile/client', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Validate request body - omit protected fields first, then make optional for partial updates
      const updateSchema = insertClientProfileSchema.omit({
        userId: true,
        profileStatus: true,
        approvalStatus: true,
        uniqueClientId: true,
        reviewedBy: true,
        reviewedAt: true,
      }).partial();
      const validation = updateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: validation.error });
      }
      
      // Check if profile exists - create if not, update if yes (upsert)
      const existingProfile = await storage.getClientProfile(userId);
      
      if (!existingProfile) {
        // Create new profile with required defaults - protected fields enforced
        const newProfile = await storage.createClientProfile({
          ...validation.data,
          userId,
          profileStatus: 'incomplete',      // Enforced default
          approvalStatus: 'pending',        // Enforced default
        });
        return res.status(201).json(newProfile);
      } else {
        // Update existing profile - protected fields cannot be modified (omitted from schema)
        const updatedProfile = await storage.updateClientProfile(userId, validation.data);
        return res.json(updatedProfile);
      }
    } catch (error) {
      console.error("Error updating client profile:", error);
      res.status(500).json({ message: "Failed to update client profile" });
    }
  });

  // Team Members API - Client organization team management
  // Get all team members for client organization
  app.get('/api/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get client profile
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile) {
        return res.status(404).json({ message: "Client profile not found" });
      }

      const members = await storage.getTeamMembers(clientProfile.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Invite team member
  app.post('/api/team-members/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get client profile
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile) {
        return res.status(404).json({ message: "Client profile not found" });
      }

      // Validate request
      const validation = insertTeamMemberSchema.safeParse({
        ...req.body,
        clientProfileId: clientProfile.id,
        invitedBy: userId,
      });

      if (!validation.success) {
        return res.status(400).json({ message: "Invalid invitation data", errors: validation.error });
      }

      // Generate invitation token and expiry (7 days)
      const invitationToken = nanoid(32);
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Create team member invitation
      const member = await storage.inviteTeamMember(validation.data, invitationToken, expiry);

      // TODO: Send invitation email with token link

      res.status(201).json(member);
    } catch (error) {
      console.error("Error inviting team member:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // Update team member (role, permissions)
  app.patch('/api/team-members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get team member
      const member = await storage.getTeamMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      // Verify requester is from same organization
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile || clientProfile.id !== member.clientProfileId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update team member
      const updated = await storage.updateTeamMember(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // Revoke team member
  app.delete('/api/team-members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get team member
      const member = await storage.getTeamMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      // Verify requester is from same organization
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile || clientProfile.id !== member.clientProfileId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Revoke team member
      const revoked = await storage.revokeTeamMember(req.params.id, userId);
      res.json(revoked);
    } catch (error) {
      console.error("Error revoking team member:", error);
      res.status(500).json({ message: "Failed to revoke team member" });
    }
  });

  // Accept invitation (public endpoint with token)
  app.post('/api/team-members/accept/:token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get invitation by token
      const member = await storage.getTeamMemberByToken(req.params.token);
      if (!member) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      // Check if invitation is expired
      if (member.invitationExpiry && new Date() > member.invitationExpiry) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Check if invitation is already accepted or declined
      if (member.status !== 'pending') {
        return res.status(400).json({ message: `Invitation already ${member.status}` });
      }

      // Verify email matches invited email
      const user = await storage.getUser(userId);
      if (user?.email !== member.email) {
        return res.status(403).json({ message: "Invitation email does not match your account" });
      }

      // Accept invitation
      const accepted = await storage.acceptInvitation(req.params.token, userId);
      res.json(accepted);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Decline invitation (public endpoint with token)
  app.post('/api/team-members/decline/:token', async (req, res) => {
    try {
      // Get invitation by token
      const member = await storage.getTeamMemberByToken(req.params.token);
      if (!member) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      // Check if invitation is already accepted or declined
      if (member.status !== 'pending') {
        return res.status(400).json({ message: `Invitation already ${member.status}` });
      }

      // Decline invitation
      const declined = await storage.declineInvitation(req.params.token);
      res.json(declined);
    } catch (error) {
      console.error("Error declining invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
    }
  });

  // Resend invitation
  app.post('/api/team-members/:id/resend', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get team member
      const member = await storage.getTeamMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      // Verify requester is from same organization
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile || clientProfile.id !== member.clientProfileId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only pending invitations can be resent
      if (member.status !== 'pending') {
        return res.status(400).json({ message: `Cannot resend invitation with status: ${member.status}` });
      }

      // Generate new token and expiry (7 days)
      const invitationToken = nanoid(32);
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Resend invitation
      const updated = await storage.resendInvitation(req.params.id, invitationToken, expiry);

      // TODO: Send invitation email with new token

      res.json(updated);
    } catch (error) {
      console.error("Error resending invitation:", error);
      res.status(500).json({ message: "Failed to resend invitation" });
    }
  });

  // Consultant Profile endpoints
  app.get('/api/profile/consultant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }
      
      // Get user data for phone verification status
      const user = await storage.getUser(userId);
      
      // Compute identity verification based on kycDocuments
      let identityVerified = false;
      if (profile.kycDocuments && typeof profile.kycDocuments === 'object') {
        const kycDocs = profile.kycDocuments as any;
        // Consider identity verified if KYC documents exist with required fields
        identityVerified = !!(kycDocs.idType && kycDocs.idNumber && kycDocs.documentUrl);
      }
      
      // Return profile with additional verification fields
      res.json({
        ...profile,
        phoneVerified: user?.phoneVerified || false,
        identityVerified,
      });
    } catch (error) {
      console.error("Error fetching consultant profile:", error);
      res.status(500).json({ message: "Failed to fetch consultant profile" });
    }
  });

  app.put('/api/profile/consultant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Validate request body - omit protected fields first, then make optional for partial updates
      const updateSchema = insertConsultantProfileSchema.omit({
        userId: true,
        verified: true,
        rating: true,
        totalReviews: true,
        completedProjects: true,
        profileStatus: true,
        approvalStatus: true,
        uniqueConsultantId: true,
        reviewedBy: true,
        reviewedAt: true,
        fullName: true, // fullName comes from user record
      }).partial();
      
      // Additional validation for languages JSON structure
      if (req.body.languages) {
        const languagesValidation = z.array(z.object({
          language: z.string().min(1),
          proficiency: z.enum(['basic', 'intermediate', 'advanced', 'native']),
        })).safeParse(req.body.languages);
        
        if (!languagesValidation.success) {
          return res.status(400).json({ 
            message: "Invalid languages format", 
            errors: languagesValidation.error 
          });
        }
      }
      
      const validation = updateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: validation.error });
      }
      
      // Check if profile exists - create if not, update if yes (upsert)
      const existingProfile = await storage.getConsultantProfile(userId);
      
      if (!existingProfile) {
        // Create new consultant profile with required defaults - protected fields enforced
        const user = await storage.getUser(userId);
        if (!user || !user.fullName) {
          return res.status(400).json({ message: "User full name is required to create consultant profile" });
        }
        const newProfile = await storage.createConsultantProfile({ 
          ...validation.data,
          userId, 
          fullName: user.fullName,
          profileStatus: 'incomplete',      // Enforced default
          approvalStatus: 'pending',        // Enforced default
          verified: false,                  // Enforced default
        });
        return res.status(201).json(newProfile);
      }
      
      // Update existing profile - protected fields cannot be modified (omitted from schema)
      const updatedProfile = await storage.updateConsultantProfile(userId, validation.data);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating consultant profile:", error);
      res.status(500).json({ message: "Failed to update consultant profile" });
    }
  });

  // Consultant Categories endpoints
  app.get('/api/profile/consultant/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const consultantCategories = await storage.getConsultantCategories(userId);
      res.json(consultantCategories);
    } catch (error) {
      console.error("Error fetching consultant categories:", error);
      res.status(500).json({ message: "Failed to fetch consultant categories" });
    }
  });

  app.put('/api/profile/consultant/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { categoryIds, primaryCategoryId } = req.body;
      
      // Validate input
      if (!Array.isArray(categoryIds)) {
        return res.status(400).json({ message: "categoryIds must be an array" });
      }
      
      if (categoryIds.length > 10) {
        return res.status(400).json({ message: "Maximum 10 categories allowed" });
      }
      
      if (categoryIds.length > 0 && !primaryCategoryId) {
        return res.status(400).json({ message: "Primary category is required when selecting categories" });
      }
      
      if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
        return res.status(400).json({ message: "Primary category must be in selected categories" });
      }
      
      const updatedCategories = await storage.setConsultantCategories(userId, categoryIds, primaryCategoryId);
      res.json(updatedCategories);
    } catch (error) {
      console.error("Error updating consultant categories:", error);
      const message = error instanceof Error ? error.message : "Failed to update consultant categories";
      res.status(500).json({ message });
    }
  });

  // Pricing Templates endpoints
  app.get('/api/profile/consultant/pricing-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Get consultant profile to get consultantProfileId
      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }
      
      const templates = await storage.getPricingTemplates(profile.id);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching pricing templates:", error);
      res.status(500).json({ message: "Failed to fetch pricing templates" });
    }
  });

  app.post('/api/profile/consultant/pricing-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Get consultant profile to get consultantProfileId
      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }
      
      // Validate request body
      const validation = insertPricingTemplateSchema.omit({ consultantProfileId: true }).safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid template data", errors: validation.error });
      }
      
      const newTemplate = await storage.createPricingTemplate({
        ...validation.data,
        consultantProfileId: profile.id,
      });
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating pricing template:", error);
      res.status(500).json({ message: "Failed to create pricing template" });
    }
  });

  app.put('/api/profile/consultant/pricing-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id } = req.params;
      
      // Validate request body
      const validation = insertPricingTemplateSchema.omit({ consultantProfileId: true }).partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid template data", errors: validation.error });
      }
      
      const updatedTemplate = await storage.updatePricingTemplate(id, validation.data);
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating pricing template:", error);
      res.status(500).json({ message: "Failed to update pricing template" });
    }
  });

  app.delete('/api/profile/consultant/pricing-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id } = req.params;
      await storage.deletePricingTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pricing template:", error);
      res.status(500).json({ message: "Failed to delete pricing template" });
    }
  });

  // Review endpoints
  app.get('/api/reviews/:consultantId', async (req: any, res) => {
    try {
      const { consultantId } = req.params;
      
      // Validate pagination params
      const paginationSchema = z.object({
        limit: z.string().optional().transform(val => {
          if (!val) return 20;
          const num = parseInt(val);
          return isNaN(num) || num < 1 || num > 100 ? 20 : num;
        }),
        offset: z.string().optional().transform(val => {
          if (!val) return 0;
          const num = parseInt(val);
          return isNaN(num) || num < 0 ? 0 : num;
        }),
      });
      
      const validation = paginationSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid pagination parameters" });
      }
      
      const { limit, offset } = validation.data;
      
      const reviews = await storage.getReviews(consultantId, { limit, offset });
      const stats = await storage.getReviewStats(consultantId);
      
      res.json({ 
        items: reviews,
        total: stats.totalReviews 
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get('/api/reviews/:consultantId/stats', async (req: any, res) => {
    try {
      const { consultantId } = req.params;
      const stats = await storage.getReviewStats(consultantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching review stats:", error);
      res.status(500).json({ message: "Failed to fetch review stats" });
    }
  });

  app.post('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Validate request body
      const validation = insertReviewSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid review data", errors: validation.error });
      }
      
      // Ensure reviewerId matches authenticated user
      if (validation.data.reviewerId !== userId) {
        return res.status(403).json({ message: "Cannot create review for another user" });
      }
      
      const review = await storage.createReview(validation.data);
      
      // Notify the reviewed consultant/client about the new review
      try {
        await notificationService.notifyReviewReceived(review.reviewedUserId, {
          reviewId: review.id,
          reviewerName: validation.data.reviewerRole === 'client' ? 'A client' : 'A consultant',
          rating: review.overallRating,
        });
      } catch (notifError) {
        console.error("Error sending review notification:", notifError);
      }
      
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.post('/api/reviews/:id/helpful', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id } = req.params;
      await storage.markReviewHelpful(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking review helpful:", error);
      res.status(500).json({ message: "Failed to mark review helpful" });
    }
  });

  app.delete('/api/reviews/:id/helpful', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id } = req.params;
      await storage.unmarkReviewHelpful(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error unmarking review helpful:", error);
      res.status(500).json({ message: "Failed to unmark review helpful" });
    }
  });

  // Get single review by ID
  app.get('/api/reviews/detail/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const review = await storage.getReviewById(id);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      res.json(review);
    } catch (error) {
      console.error("Error fetching review:", error);
      res.status(500).json({ message: "Failed to fetch review" });
    }
  });

  // Update review (within 48 hours)
  app.put('/api/reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id } = req.params;
      
      // Validate update data
      const validation = insertReviewSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid review data", errors: validation.error });
      }
      
      // updateReview now enforces the 48-hour window and reviewer check internally
      const updated = await storage.updateReview(id, userId, validation.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating review:", error);
      // Error message from storage layer will be descriptive
      res.status(403).json({ message: error instanceof Error ? error.message : "Failed to update review" });
    }
  });

  // Delete review
  app.delete('/api/reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id } = req.params;
      const review = await storage.getReviewById(id);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      // Only reviewer or admin can delete
      if (review.reviewerId !== userId && !req.user?.isAdmin) {
        return res.status(403).json({ message: "Cannot delete this review" });
      }
      
      await storage.deleteReview(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Get reviews by project
  app.get('/api/reviews/project/:projectId', async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const reviews = await storage.getReviewsByProject(projectId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching project reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Get client reviews (received and given)
  app.get('/api/reviews/client/:clientId', async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { type } = req.query;
      
      let reviews;
      if (type === 'received') {
        reviews = await storage.getClientReviewsReceived(clientId);
      } else if (type === 'given') {
        reviews = await storage.getClientReviewsGiven(clientId);
      } else {
        // Get both
        const [received, given] = await Promise.all([
          storage.getClientReviewsReceived(clientId),
          storage.getClientReviewsGiven(clientId)
        ]);
        reviews = { received, given };
      }
      
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching client reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Review Response endpoints
  app.post('/api/reviews/:id/response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id: reviewId } = req.params;
      const review = await storage.getReviewById(reviewId);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      // Only reviewee can respond
      if (review.revieweeId !== userId) {
        return res.status(403).json({ message: "Only the reviewee can respond to this review" });
      }
      
      // Check if response already exists
      const existingResponse = await storage.getReviewResponse(reviewId);
      if (existingResponse) {
        return res.status(400).json({ message: "Response already exists for this review" });
      }
      
      // Validate response data
      const validation = insertReviewResponseSchema.safeParse({
        reviewId,
        responderId: userId,
        responseText: req.body.responseText
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid response data", errors: validation.error });
      }
      
      const response = await storage.createReviewResponse(validation.data);
      
      // Notify the original reviewer about the response
      try {
        await notificationService.notifyReviewResponse(review.reviewerId, {
          reviewId: reviewId,
          responderName: 'The reviewee',
        });
      } catch (notifError) {
        console.error("Error sending review response notification:", notifError);
      }
      
      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating review response:", error);
      res.status(500).json({ message: "Failed to create response" });
    }
  });

  app.get('/api/reviews/:id/response', async (req: any, res) => {
    try {
      const { id: reviewId } = req.params;
      const response = await storage.getReviewResponse(reviewId);
      
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching review response:", error);
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  app.put('/api/reviews/:id/response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id: reviewId } = req.params;
      const response = await storage.getReviewResponse(reviewId);
      
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      // Only responder can update
      if (response.responderId !== userId) {
        return res.status(403).json({ message: "Cannot update this response" });
      }
      
      const updated = await storage.updateReviewResponse(response.id, req.body.responseText);
      res.json(updated);
    } catch (error) {
      console.error("Error updating review response:", error);
      res.status(500).json({ message: "Failed to update response" });
    }
  });

  // Review Report endpoints
  app.post('/api/reviews/:id/report', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id: reviewId } = req.params;
      const review = await storage.getReviewById(reviewId);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      // Cannot report your own review
      if (review.reviewerId === userId) {
        return res.status(400).json({ message: "Cannot report your own review" });
      }
      
      // Validate report data
      const validation = insertReviewReportSchema.safeParse({
        reviewId,
        reporterId: userId,
        reason: req.body.reason,
        description: req.body.description,
        status: 'pending'
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid report data", errors: validation.error });
      }
      
      const report = await storage.createReviewReport(validation.data);
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating review report:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Admin review report endpoints
  app.get('/api/admin/review-reports', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status, reviewId } = req.query;
      const reports = await storage.getReviewReports({
        status: status as string,
        reviewId: reviewId as string
      });
      
      res.json(reports);
    } catch (error) {
      console.error("Error fetching review reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get('/api/admin/review-reports/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const report = await storage.getReviewReportById(id);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching review report:", error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.put('/api/admin/review-reports/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      
      if (!['reviewed', 'dismissed', 'resolved'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updated = await storage.resolveReviewReport(id, status, userId, adminNotes);
      res.json(updated);
    } catch (error) {
      console.error("Error resolving review report:", error);
      res.status(500).json({ message: "Failed to resolve report" });
    }
  });

  // Project endpoints
  app.get('/api/projects/client', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limitSchema = z.string().optional().transform(val => {
        if (!val) return 10;
        const num = parseInt(val);
        return isNaN(num) || num < 1 || num > 50 ? 10 : num;
      });

      const validation = limitSchema.safeParse(req.query.limit);
      const limit = validation.success ? validation.data : 10;

      const projects = await storage.getClientProjects(userId, { limit });
      res.json(projects);
    } catch (error) {
      console.error("Error fetching client projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/consultant/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const metrics = await storage.getConsultantMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching consultant metrics:", error);
      res.status(500).json({ message: "Failed to fetch consultant metrics" });
    }
  });

  app.get('/api/consultant/performance-score', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify user has consultant role
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'consultant' && user.role !== 'both')) {
        return res.status(403).json({ message: "Forbidden: Only consultants can access performance scores" });
      }

      const performanceScore = await storage.getPerformanceScore(userId);
      res.json(performanceScore);
    } catch (error) {
      console.error("Error fetching performance score:", error);
      res.status(500).json({ message: "Failed to fetch performance score" });
    }
  });
  
  // Quote Request endpoints
  app.post('/api/quotes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Verify user has client role
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'client' && user.role !== 'both')) {
        return res.status(403).json({ message: "Forbidden: Only clients can request quotes" });
      }
      
      const validation = insertQuoteRequestSchema.safeParse({
        ...req.body,
        clientId: userId,
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid quote request data", errors: validation.error });
      }
      
      const quoteRequest = await storage.createQuoteRequest(validation.data);
      res.status(201).json(quoteRequest);
    } catch (error) {
      console.error("Error creating quote request:", error);
      res.status(500).json({ message: "Failed to create quote request" });
    }
  });
  
  app.get('/api/quotes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Determine role for filtering
      const role = user.role === 'consultant' || user.role === 'both' ? 'consultant' : 'client';
      const quoteRequests = await storage.getQuoteRequests(userId, role);
      res.json(quoteRequests);
    } catch (error) {
      console.error("Error fetching quote requests:", error);
      res.status(500).json({ message: "Failed to fetch quote requests" });
    }
  });
  
  app.patch('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Verify user has consultant role
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'consultant' && user.role !== 'both')) {
        return res.status(403).json({ message: "Forbidden: Only consultants can respond to quotes" });
      }
      
      const { id } = req.params;
      
      // Verify ownership: consultant must own this quote request
      const quoteRequests = await storage.getQuoteRequests(userId, 'consultant');
      const ownedQuote = quoteRequests.find(q => q.id === id);
      
      if (!ownedQuote) {
        return res.status(403).json({ message: "Forbidden: You can only respond to your own quote requests" });
      }
      
      const updateSchema = z.object({
        status: z.enum(['pending', 'responded', 'declined']).optional(),
        consultantResponse: z.string().optional(),
        quotedAmount: z.string().optional(),
      });
      
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid update data", errors: validation.error });
      }
      
      const updated = await storage.updateQuoteRequest(id, validation.data as any);
      res.json(updated);
    } catch (error) {
      console.error("Error updating quote request:", error);
      res.status(500).json({ message: "Failed to update quote request" });
    }
  });

  // Profile submission for review
  app.post('/api/profiles/client/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const profile = await storage.getClientProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Client profile not found. Please complete your profile first." });
      }

      if (profile.approvalStatus === 'approved') {
        return res.status(400).json({ message: "Profile is already approved" });
      }

      // Update profile status to submitted
      const updatedProfile = await storage.updateClientProfile(userId, {
        profileStatus: 'submitted',
      });

      // Create approval event
      await storage.createApprovalEvent({
        userId,
        profileType: 'client',
        action: 'submitted',
        performedBy: userId, // Self-submitted
      });

      res.json(updatedProfile);
    } catch (error) {
      console.error("Error submitting client profile:", error);
      res.status(500).json({ message: "Failed to submit profile for review" });
    }
  });

  app.post('/api/profiles/consultant/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found. Please complete your profile first." });
      }

      if (profile.approvalStatus === 'approved') {
        return res.status(400).json({ message: "Profile is already approved" });
      }

      // Update profile status to submitted
      const updatedProfile = await storage.updateConsultantProfile(userId, {
        profileStatus: 'submitted',
      });

      // Create approval event
      await storage.createApprovalEvent({
        userId,
        profileType: 'consultant',
        action: 'submitted',
        performedBy: userId,
      });

      res.json(updatedProfile);
    } catch (error) {
      console.error("Error submitting consultant profile:", error);
      res.status(500).json({ message: "Failed to submit profile for review" });
    }
  });

  // Profile Status endpoint - returns approval status and completion info
  app.get('/api/profile/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Support multi-role users - check active role from query param or headers
      const requestedRole = req.query.role || req.headers['x-active-role'];

      let profileData = null;
      
      // Security: Validate user has the requested role before returning data
      if (requestedRole === 'client') {
        const profile = await storage.getClientProfile(userId);
        if (!profile) {
          return res.status(403).json({ message: "User does not have a client profile" });
        }
        if (profile) {
          profileData = {
            role: 'client' as const,
            profileStatus: profile.profileStatus || 'draft',
            approvalStatus: profile.approvalStatus || 'pending',
            uniqueId: profile.uniqueClientId || null,
            adminNotes: profile.adminNotes || null,
            reviewedBy: profile.reviewedBy || null,
            reviewedAt: profile.reviewedAt || null,
            companyName: profile.companyName || null,
            industry: profile.industry || null,
            completionPercentage: calculateClientProfileCompletion(profile),
          };
        }
      } else if (requestedRole === 'consultant') {
        const profile = await storage.getConsultantProfile(userId);
        if (!profile) {
          return res.status(403).json({ message: "User does not have a consultant profile" });
        }
        if (profile) {
          profileData = {
            role: 'consultant' as const,
            profileStatus: profile.profileStatus || 'draft',
            approvalStatus: profile.approvalStatus || 'pending',
            uniqueId: profile.uniqueConsultantId || null,
            adminNotes: profile.adminNotes || null,
            reviewedBy: profile.reviewedBy || null,
            reviewedAt: profile.reviewedAt || null,
            fullName: profile.fullName || null,
            title: profile.title || null,
            completionPercentage: calculateConsultantProfileCompletion(profile),
          };
        }
      } else {
        // No role specified or invalid role - return error
        return res.status(400).json({ message: "Invalid or missing role parameter. Must be 'client' or 'consultant'" });
      }

      res.json(profileData);
    } catch (error) {
      console.error("Error fetching profile status:", error);
      res.status(500).json({ message: "Failed to fetch profile status" });
    }
  });

  // Helper functions for profile completion calculation
  function calculateClientProfileCompletion(profile: any): number {
    // Simple check: if profile_status is 'submitted' or 'complete', consider it 100%
    if (profile.profileStatus === 'submitted' || profile.profileStatus === 'complete') {
      return 100;
    }

    // Helper to check if a value is actually filled
    const isFilled = (value: any): boolean => {
      if (value == null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'number') return !isNaN(value);
      return Boolean(value);
    };

    // Count filled basic fields (aligned with Business Info section)
    const fields = [
      profile.companyName,
      profile.industry,
      profile.companySize,
      profile.description,
      profile.location,
    ];

    const filledCount = fields.filter(isFilled).length;
    // Consider profile ready to submit at 80% (4/5 core fields)
    return Math.round((filledCount / fields.length) * 100);
  }

  function calculateConsultantProfileCompletion(profile: any): number {
    // Simple check: if profile_status is 'submitted' or 'complete', consider it 100%
    if (profile.profileStatus === 'submitted' || profile.profileStatus === 'complete') {
      return 100;
    }

    // Helper to check if a value is actually filled
    const isFilled = (value: any): boolean => {
      if (value == null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'number') return !isNaN(value);
      return Boolean(value);
    };

    // Count filled basic fields (aligned with Business Info section)
    const fields = [
      profile.fullName,
      profile.title,
      profile.bio,
      profile.hourlyRate,
      profile.experience,
      profile.location,
    ];

    const filledCount = fields.filter(isFilled).length;
    // Consider profile ready to submit at ~83% (5/6 core fields)
    return Math.round((filledCount / fields.length) * 100);
  }

  // KYC Document endpoints
  app.get('/api/profiles/kyc', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const profileType = user.role === 'consultant' ? 'consultant' : 'client';
      const kycDoc = await storage.getKycDocument(userId, profileType);

      res.json(kycDoc || null);
    } catch (error) {
      console.error("Error fetching KYC document:", error);
      res.status(500).json({ message: "Failed to fetch KYC document" });
    }
  });

  app.post('/api/profiles/kyc', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { idType, idNumber, validityDate, documentUrl } = req.body;

      if (!idType || !idNumber) {
        return res.status(400).json({ message: "ID type and number are required" });
      }

      const profileType = user.role === 'consultant' ? 'consultant' : 'client';

      const kycDoc = await storage.saveKycDocument({
        userId,
        profileType,
        idType,
        idNumber,
        validityDate: validityDate ? new Date(validityDate) : null,
        documentUrl: documentUrl || null,
      });

      res.json(kycDoc);
    } catch (error) {
      console.error("Error saving KYC document:", error);
      res.status(500).json({ message: "Failed to save KYC document" });
    }
  });

  // Education Records endpoints (Consultant only)
  app.get('/api/profiles/education', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }

      const records = await storage.getEducationRecords(profile.id);
      res.json(records);
    } catch (error) {
      console.error("Error fetching education records:", error);
      res.status(500).json({ message: "Failed to fetch education records" });
    }
  });

  app.post('/api/profiles/education', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }

      const { degree, institution, fieldOfStudy, startDate, endDate, stillStudying } = req.body;

      if (!degree || !institution) {
        return res.status(400).json({ message: "Degree and institution are required" });
      }

      const record = await storage.createEducationRecord({
        consultantProfileId: profile.id,
        degree,
        institution,
        fieldOfStudy: fieldOfStudy || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        stillStudying: stillStudying || false,
      });

      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating education record:", error);
      res.status(500).json({ message: "Failed to create education record" });
    }
  });

  app.put('/api/profiles/education/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { id } = req.params;
      const { degree, institution, fieldOfStudy, startDate, endDate, stillStudying } = req.body;

      // Verify ownership by checking if record belongs to user's profile
      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }

      const updated = await storage.updateEducationRecord(id, {
        degree,
        institution,
        fieldOfStudy,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        stillStudying,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating education record:", error);
      res.status(500).json({ message: "Failed to update education record" });
    }
  });

  app.delete('/api/profiles/education/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { id } = req.params;

      // Verify ownership
      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }

      await storage.deleteEducationRecord(id);
      res.json({ message: "Education record deleted successfully" });
    } catch (error) {
      console.error("Error deleting education record:", error);
      res.status(500).json({ message: "Failed to delete education record" });
    }
  });

  // Bank Information endpoints (Consultant only)
  app.get('/api/profiles/bank', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }

      const bankInfo = await storage.getBankInformation(profile.id);
      res.json(bankInfo || null);
    } catch (error) {
      console.error("Error fetching bank information:", error);
      res.status(500).json({ message: "Failed to fetch bank information" });
    }
  });

  app.post('/api/profiles/bank', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }

      const { bankName, accountHolderName, accountNumber, swiftCode, bankCountry, currency } = req.body;

      if (!bankName || !accountHolderName || !accountNumber) {
        return res.status(400).json({ message: "Bank name, account holder name, and account number are required" });
      }

      const bankInfo = await storage.saveBankInformation({
        consultantProfileId: profile.id,
        bankName,
        accountHolderName,
        accountNumber,
        swiftCode: swiftCode || null,
        bankCountry: bankCountry || null,
        currency: currency || 'SAR',
      });

      res.json(bankInfo);
    } catch (error) {
      console.error("Error saving bank information:", error);
      res.status(500).json({ message: "Failed to save bank information" });
    }
  });

  app.put('/api/profiles/bank', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const profile = await storage.getConsultantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }

      const { bankName, accountHolderName, accountNumber, swiftCode, bankCountry, currency } = req.body;

      const bankInfo = await storage.updateBankInformation(profile.id, {
        bankName,
        accountHolderName,
        accountNumber,
        swiftCode,
        bankCountry,
        currency,
      });

      res.json(bankInfo);
    } catch (error) {
      console.error("Error updating bank information:", error);
      res.status(500).json({ message: "Failed to update bank information" });
    }
  });

  // Role switching endpoint
  app.post('/api/profiles/add-role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { newRole, fullName, selectedCategories } = req.body;

      if (!newRole || (newRole !== 'client' && newRole !== 'consultant')) {
        return res.status(400).json({ message: "Valid role (client or consultant) is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has the role
      if (user.role === newRole) {
        return res.status(400).json({ message: "You already have this role" });
      }

      // Update user role to 'both' if adding a second role
      if (user.role !== 'both') {
        await storage.updateUser(userId, { role: 'both' });
      }

      // Create the appropriate profile
      if (newRole === 'client') {
        const existingClientProfile = await storage.getClientProfile(userId);
        if (existingClientProfile) {
          return res.status(400).json({ message: "Client profile already exists" });
        }

        await storage.createClientProfile({
          userId,
          profileStatus: 'incomplete',
          approvalStatus: 'pending',
        });
      } else if (newRole === 'consultant') {
        const existingConsultantProfile = await storage.getConsultantProfile(userId);
        if (existingConsultantProfile) {
          return res.status(400).json({ message: "Consultant profile already exists" });
        }

        if (!fullName) {
          return res.status(400).json({ message: "Full name is required for consultant profile" });
        }

        await storage.createConsultantProfile({
          userId,
          fullName,
          profileStatus: 'incomplete',
          approvalStatus: 'pending',
        });

        // Set categories if provided
        if (selectedCategories && Array.isArray(selectedCategories) && selectedCategories.length > 0) {
          await storage.setConsultantCategories(userId, selectedCategories, selectedCategories[0]);
        }
      }

      res.json({ message: "Role added successfully", role: newRole });
    } catch (error) {
      console.error("Error adding role:", error);
      res.status(500).json({ message: "Failed to add role" });
    }
  });

  // Admin profile approval endpoints
  app.get('/api/admin/profiles/pending', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Fetch all users with pending approval status
      const pendingClients = await db
        .select({
          user: users,
          profile: clientProfiles,
        })
        .from(users)
        .innerJoin(clientProfiles, eq(clientProfiles.userId, users.id))
        .where(
          and(
            eq(clientProfiles.approvalStatus, 'pending'),
            eq(clientProfiles.profileStatus, 'submitted')
          )
        );

      const pendingConsultants = await db
        .select({
          user: users,
          profile: consultantProfiles,
        })
        .from(users)
        .innerJoin(consultantProfiles, eq(consultantProfiles.userId, users.id))
        .where(
          and(
            eq(consultantProfiles.approvalStatus, 'pending'),
            eq(consultantProfiles.profileStatus, 'submitted')
          )
        );

      res.json({
        clients: pendingClients,
        consultants: pendingConsultants,
      });
    } catch (error) {
      console.error("Error fetching pending profiles:", error);
      res.status(500).json({ message: "Failed to fetch pending profiles" });
    }
  });

  app.post('/api/admin/profiles/:userId/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminUserId = getUserIdFromRequest(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "Admin user not found" });
      }

      const { userId } = req.params;
      const { profileType, notes } = req.body;

      if (!profileType || (profileType !== 'client' && profileType !== 'consultant')) {
        return res.status(400).json({ message: "Valid profile type (client or consultant) is required" });
      }

      // Generate unique ID
      const uniqueId = await storage.generateUniqueId(profileType === 'client' ? 'CLT' : 'CNS');

      // Update profile
      if (profileType === 'client') {
        await storage.updateClientProfile(userId, {
          approvalStatus: 'approved',
          profileStatus: 'complete',
          uniqueClientId: uniqueId,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          adminNotes: notes || null,
        });
      } else {
        await storage.updateConsultantProfile(userId, {
          approvalStatus: 'approved',
          profileStatus: 'complete',
          uniqueConsultantId: uniqueId,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          adminNotes: notes || null,
        });
      }

      // Create approval event
      await storage.createApprovalEvent({
        userId,
        profileType,
        action: 'approved',
        performedBy: adminUserId,
        notes: notes || null,
      });

      res.json({ message: "Profile approved successfully", uniqueId });
    } catch (error) {
      console.error("Error approving profile:", error);
      res.status(500).json({ message: "Failed to approve profile" });
    }
  });

  app.post('/api/admin/profiles/:userId/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminUserId = getUserIdFromRequest(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "Admin user not found" });
      }

      const { userId } = req.params;
      const { profileType, notes } = req.body;

      if (!profileType || (profileType !== 'client' && profileType !== 'consultant')) {
        return res.status(400).json({ message: "Valid profile type (client or consultant) is required" });
      }

      // Update profile
      if (profileType === 'client') {
        await storage.updateClientProfile(userId, {
          approvalStatus: 'rejected',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          adminNotes: notes || null,
        });
      } else {
        await storage.updateConsultantProfile(userId, {
          approvalStatus: 'rejected',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          adminNotes: notes || null,
        });
      }

      // Create approval event
      await storage.createApprovalEvent({
        userId,
        profileType,
        action: 'rejected',
        performedBy: adminUserId,
        notes: notes || null,
      });

      res.json({ message: "Profile rejected successfully" });
    } catch (error) {
      console.error("Error rejecting profile:", error);
      res.status(500).json({ message: "Failed to reject profile" });
    }
  });

  app.post('/api/admin/profiles/:userId/request-changes', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminUserId = getUserIdFromRequest(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "Admin user not found" });
      }

      const { userId } = req.params;
      const { profileType, notes } = req.body;

      if (!profileType || (profileType !== 'client' && profileType !== 'consultant')) {
        return res.status(400).json({ message: "Valid profile type (client or consultant) is required" });
      }

      if (!notes) {
        return res.status(400).json({ message: "Notes explaining requested changes are required" });
      }

      // Update profile
      if (profileType === 'client') {
        await storage.updateClientProfile(userId, {
          approvalStatus: 'changes_requested',
          profileStatus: 'draft',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          adminNotes: notes,
        });
      } else {
        await storage.updateConsultantProfile(userId, {
          approvalStatus: 'changes_requested',
          profileStatus: 'draft',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          adminNotes: notes,
        });
      }

      // Create approval event
      await storage.createApprovalEvent({
        userId,
        profileType,
        action: 'changes_requested',
        performedBy: adminUserId,
        notes,
      });

      res.json({ message: "Changes requested successfully" });
    } catch (error) {
      console.error("Error requesting changes:", error);
      res.status(500).json({ message: "Failed to request changes" });
    }
  });

  // Public: Get category tree for consultants (no admin auth required)
  app.get('/api/categories/tree', async (req, res) => {
    try {
      // Build tree from active/visible categories only - project only safe public fields
      const allCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          nameAr: categories.nameAr,
          slug: categories.slug,
          description: categories.description,
          descriptionAr: categories.descriptionAr,
          icon: categories.icon,
          level: categories.level,
          parentId: categories.parentId,
          displayOrder: categories.displayOrder,
        })
        .from(categories)
        .where(and(
          eq(categories.active, true),
          eq(categories.visible, true)
        ))
        .orderBy(categories.displayOrder, categories.name);
      
      // Build tree structure
      const buildTree = (parentId: string | null): any[] => {
        return allCategories
          .filter(cat => cat.parentId === parentId)
          .map(cat => ({
            ...cat,
            children: buildTree(cat.id),
          }));
      };
      
      const tree = buildTree(null);
      res.json({ tree });
    } catch (error) {
      console.error("Error fetching category tree:", error);
      res.status(500).json({ message: "Failed to fetch category tree" });
    }
  });

  // Job routes
  // Guards applied in sequence: auth → email verified → profile complete → profile approved
  app.post('/api/jobs', isAuthenticated, requireEmailVerified, requireProfileComplete('client'), requireProfileApproved('client'), async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Inject clientId from authenticated user
      const jobData = {
        ...req.body,
        clientId: userId,
      };

      // Validate categoryId is required
      if (!jobData.categoryId) {
        return res.status(400).json({ message: "Category is required" });
      }

      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      const message = error instanceof Error ? error.message : "Failed to create job";
      res.status(500).json({ message });
    }
  });

  // Advanced job search (must come before /api/jobs to avoid route conflict)
  app.get('/api/jobs/search', isAuthenticated, async (req: any, res) => {
    try {
      // Strict string preprocessor - rejects non-strings with z.NEVER to prevent filter bypass
      const strictOptionalString = z.preprocess(
        val => {
          if (val === undefined) return undefined;
          if (typeof val !== "string") return z.NEVER;
          return val;
        },
        z.string()
      ).optional();

      // Validate and parse query parameters with strict preprocessing
      const jobSearchSchema = z.object({
        search: z.string().max(200).optional(),
        categoryId: strictOptionalString.pipe(z.string().uuid()).optional(),
        minBudget: z.coerce.number().min(0).optional(),
        maxBudget: z.coerce.number().min(0).optional(),
        skills: strictOptionalString.transform(val => val?.split(',').map(part => part.trim()).filter(Boolean) ?? []),
        experienceLevel: z.enum(['junior', 'mid', 'senior', 'expert']).optional(),
        status: z.string().optional(),
        budgetType: z.enum(['fixed', 'hourly']).optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      });

      const parsed = jobSearchSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid query parameters", errors: parsed.error.errors });
      }

      const { search, categoryId, minBudget, maxBudget, skills, experienceLevel, status, budgetType, limit, offset } = parsed.data;

      try {
        const { jobs, total } = await storage.searchJobs({
          search,
          categoryId,
          minBudget,
          maxBudget,
          skills,
          experienceLevel,
          status,
          budgetType,
          limit,
          offset,
        });

        res.json({ jobs, total });
      } catch (storageError) {
        console.error("Storage error searching jobs:", storageError);
        res.status(500).json({ message: "Failed to search jobs" });
      }
    } catch (error) {
      console.error("Validation error searching jobs:", error);
      res.status(400).json({ message: "Invalid request parameters" });
    }
  });

  // Advanced consultant search
  app.get('/api/consultants/search', isAuthenticated, async (req: any, res) => {
    try {
      // Strict string preprocessor - rejects non-strings with z.NEVER to prevent filter bypass
      const strictOptionalString = z.preprocess(
        val => {
          if (val === undefined) return undefined;
          if (typeof val !== "string") return z.NEVER;
          return val;
        },
        z.string()
      ).optional();

      // Validate and parse query parameters with strict preprocessing
      const consultantSearchSchema = z.object({
        search: z.string().max(200).optional(),
        categoryId: strictOptionalString.pipe(z.string().uuid()).optional(),
        minRate: z.coerce.number().min(0).optional(),
        maxRate: z.coerce.number().min(0).optional(),
        skills: strictOptionalString.transform(val => val?.split(',').map(part => part.trim()).filter(Boolean) ?? []),
        experience: z.enum(['junior', 'mid', 'senior', 'expert']).optional(),
        minRating: z.coerce.number().min(0).max(5).optional(),
        operatingRegions: strictOptionalString.transform(val => val?.split(',').map(part => part.trim()).filter(Boolean) ?? []),
        availability: z.enum(['available', 'busy', 'unavailable']).optional(),
        verified: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      });

      const parsed = consultantSearchSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid query parameters", errors: parsed.error.errors });
      }

      const { search, categoryId, minRate, maxRate, skills, experience, minRating, operatingRegions, availability, verified, limit, offset } = parsed.data;

      try {
        const { consultants, total } = await storage.searchConsultants({
          search,
          categoryId,
          minRate,
          maxRate,
          skills,
          experience,
          minRating,
          operatingRegions,
          availability,
          verified,
          limit,
          offset,
        });

        res.json({ consultants, total });
      } catch (storageError) {
        console.error("Storage error searching consultants:", storageError);
        res.status(500).json({ message: "Failed to search consultants" });
      }
    } catch (error) {
      console.error("Validation error searching consultants:", error);
      res.status(400).json({ message: "Invalid request parameters" });
    }
  });

  // Saved Searches API
  app.post('/api/saved-searches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const createSchema = z.object({
        name: z.string().min(1).max(100),
        searchType: z.enum(['job', 'consultant']),
        filters: z.record(z.any()),
      });

      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const savedSearch = await storage.createSavedSearch({
        userId,
        ...parsed.data,
      });

      res.status(201).json(savedSearch);
    } catch (error) {
      console.error("Error creating saved search:", error);
      res.status(500).json({ message: "Failed to create saved search" });
    }
  });

  app.get('/api/saved-searches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const savedSearches = await storage.getSavedSearches(userId);
      res.json({ savedSearches });
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(500).json({ message: "Failed to fetch saved searches" });
    }
  });

  app.get('/api/saved-searches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const savedSearch = await storage.getSavedSearchById(req.params.id, userId);
      if (!savedSearch) {
        return res.status(404).json({ message: "Saved search not found or access denied" });
      }

      res.json(savedSearch);
    } catch (error) {
      console.error("Error fetching saved search:", error);
      res.status(500).json({ message: "Failed to fetch saved search" });
    }
  });

  app.put('/api/saved-searches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const updateSchema = z.object({
        name: z.string().min(1).max(100).optional(),
        filters: z.record(z.any()).optional(),
        emailAlerts: z.boolean().optional(),
      });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const updated = await storage.updateSavedSearch(req.params.id, userId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating saved search:", error);
      const message = error instanceof Error ? error.message : "Failed to update saved search";
      res.status(500).json({ message });
    }
  });

  app.delete('/api/saved-searches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      await storage.deleteSavedSearch(req.params.id, userId);
      res.json({ message: "Saved search deleted successfully" });
    } catch (error) {
      console.error("Error deleting saved search:", error);
      res.status(500).json({ message: "Failed to delete saved search" });
    }
  });

  // ============================================================================
  // SEARCH HISTORY ROUTES
  // ============================================================================

  app.post('/api/search/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const createSchema = z.object({
        searchType: z.enum(['requirements', 'consultants']),
        query: z.string().max(500).optional(),
        filters: z.record(z.any()).optional(),
        resultsCount: z.number().int().min(0),
      });

      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const history = await storage.createSearchHistory({
        userId,
        ...parsed.data,
      });

      res.status(201).json(history);
    } catch (error) {
      console.error("Error creating search history:", error);
      res.status(500).json({ message: "Failed to create search history" });
    }
  });

  app.get('/api/search/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await storage.getSearchHistory(userId, limit);
      res.json({ history });
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  app.delete('/api/search/history/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      await storage.deleteSearchHistory(req.params.id, userId);
      res.json({ message: "Search history item deleted successfully" });
    } catch (error) {
      console.error("Error deleting search history:", error);
      res.status(500).json({ message: "Failed to delete search history" });
    }
  });

  app.delete('/api/search/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      await storage.clearOldSearchHistory(userId, 30);
      res.json({ message: "Search history cleared successfully" });
    } catch (error) {
      console.error("Error clearing search history:", error);
      res.status(500).json({ message: "Failed to clear search history" });
    }
  });

  // ============================================================================
  // SEARCH SUGGESTIONS / AUTOCOMPLETE ROUTES
  // ============================================================================

  app.get('/api/search/suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const query = req.query.q as string || '';
      const searchType = req.query.type as string || 'requirements';

      // Get recent searches
      const recentHistory = await storage.getSearchHistory(userId, 5);
      const recentSearches = recentHistory
        .filter(h => h.query)
        .map(h => h.query!)
        .filter(q => q.toLowerCase().includes(query.toLowerCase()));

      // For now, return basic suggestions
      // In production, this would query database for matching keywords
      res.json({
        recentSearches: recentSearches.slice(0, 5),
        suggestions: [],
        popular: []
      });
    } catch (error) {
      console.error("Error fetching search suggestions:", error);
      res.status(500).json({ message: "Failed to fetch search suggestions" });
    }
  });

  // ============================================================================
  // VENDOR LISTS ROUTES
  // ============================================================================

  app.post('/api/vendor-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const createSchema = z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
      });

      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const list = await storage.createVendorList({
        userId,
        ...parsed.data,
      });

      res.status(201).json(list);
    } catch (error) {
      console.error("Error creating vendor list:", error);
      res.status(500).json({ message: "Failed to create vendor list" });
    }
  });

  app.get('/api/vendor-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const lists = await storage.getVendorLists(userId);
      res.json({ lists });
    } catch (error) {
      console.error("Error fetching vendor lists:", error);
      res.status(500).json({ message: "Failed to fetch vendor lists" });
    }
  });

  app.get('/api/vendor-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const list = await storage.getVendorListById(req.params.id, userId);
      if (!list) {
        return res.status(404).json({ message: "Vendor list not found or access denied" });
      }

      res.json(list);
    } catch (error) {
      console.error("Error fetching vendor list:", error);
      res.status(500).json({ message: "Failed to fetch vendor list" });
    }
  });

  app.put('/api/vendor-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const updateSchema = z.object({
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional(),
      });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const updated = await storage.updateVendorList(req.params.id, userId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating vendor list:", error);
      const message = error instanceof Error ? error.message : "Failed to update vendor list";
      res.status(500).json({ message });
    }
  });

  app.delete('/api/vendor-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      await storage.deleteVendorList(req.params.id, userId);
      res.json({ message: "Vendor list deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor list:", error);
      res.status(500).json({ message: "Failed to delete vendor list" });
    }
  });

  app.post('/api/vendor-lists/:id/consultants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const addSchema = z.object({
        consultantId: z.string().uuid(),
        notes: z.string().max(2000).optional(),
      });

      const parsed = addSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const item = await storage.addConsultantToList(
        req.params.id,
        parsed.data.consultantId,
        userId,
        parsed.data.notes
      );

      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding consultant to list:", error);
      const message = error instanceof Error ? error.message : "Failed to add consultant to list";
      res.status(500).json({ message });
    }
  });

  app.delete('/api/vendor-lists/:listId/consultants/:consultantId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      await storage.removeConsultantFromList(
        req.params.listId,
        req.params.consultantId,
        userId
      );

      res.json({ message: "Consultant removed from list successfully" });
    } catch (error) {
      console.error("Error removing consultant from list:", error);
      const message = error instanceof Error ? error.message : "Failed to remove consultant from list";
      res.status(500).json({ message });
    }
  });

  app.get('/api/vendor-lists/:id/consultants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const consultants = await storage.getConsultantsInList(req.params.id, userId);
      res.json({ consultants });
    } catch (error) {
      console.error("Error fetching consultants in list:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch consultants";
      res.status(500).json({ message });
    }
  });

  // ============================================================================
  // SAVED REQUIREMENTS ROUTES (Consultants' bookmarked jobs)
  // ============================================================================

  app.post('/api/saved-requirements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const saveSchema = z.object({
        jobId: z.string().uuid(),
        notes: z.string().max(2000).optional(),
      });

      const parsed = saveSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const saved = await storage.saveSavedRequirement(
        userId,
        parsed.data.jobId,
        parsed.data.notes
      );

      res.status(201).json(saved);
    } catch (error) {
      console.error("Error saving requirement:", error);
      const message = error instanceof Error ? error.message : "Failed to save requirement";
      res.status(500).json({ message });
    }
  });

  app.get('/api/saved-requirements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const saved = await storage.getSavedRequirements(userId);
      res.json({ savedRequirements: saved });
    } catch (error) {
      console.error("Error fetching saved requirements:", error);
      res.status(500).json({ message: "Failed to fetch saved requirements" });
    }
  });

  app.delete('/api/saved-requirements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      await storage.unsaveSavedRequirement(req.params.id, userId);
      res.json({ message: "Requirement unsaved successfully" });
    } catch (error) {
      console.error("Error unsaving requirement:", error);
      const message = error instanceof Error ? error.message : "Failed to unsave requirement";
      res.status(500).json({ message });
    }
  });

  app.patch('/api/saved-requirements/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const notesSchema = z.object({
        notes: z.string().max(2000),
      });

      const parsed = notesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const updated = await storage.updateSavedRequirementNotes(
        req.params.id,
        userId,
        parsed.data.notes
      );

      res.json(updated);
    } catch (error) {
      console.error("Error updating saved requirement notes:", error);
      const message = error instanceof Error ? error.message : "Failed to update notes";
      res.status(500).json({ message });
    }
  });

  app.get('/api/saved-requirements/check/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const result = await storage.isSavedRequirement(userId, req.params.jobId);
      res.json(result);
    } catch (error) {
      console.error("Error checking saved requirement:", error);
      res.status(500).json({ message: "Failed to check saved requirement" });
    }
  });

  // ============================================================================
  // BLOCKED USERS ROUTES (User blocking for privacy)
  // ============================================================================

  app.post('/api/blocked-users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const blockSchema = z.object({
        blockedId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      });

      const parsed = blockSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      if (userId === parsed.data.blockedId) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }

      const blocked = await storage.blockUser(
        userId,
        parsed.data.blockedId,
        parsed.data.reason
      );

      res.status(201).json(blocked);
    } catch (error) {
      console.error("Error blocking user:", error);
      const message = error instanceof Error ? error.message : "Failed to block user";
      res.status(500).json({ message });
    }
  });

  app.get('/api/blocked-users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const blocked = await storage.getBlockedUsers(userId);
      res.json({ blockedUsers: blocked });
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      res.status(500).json({ message: "Failed to fetch blocked users" });
    }
  });

  app.delete('/api/blocked-users/:blockedId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      await storage.unblockUser(userId, req.params.blockedId);
      res.json({ message: "User unblocked successfully" });
    } catch (error) {
      console.error("Error unblocking user:", error);
      const message = error instanceof Error ? error.message : "Failed to unblock user";
      res.status(500).json({ message });
    }
  });

  app.get('/api/blocked-users/check/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserIdFromRequest(req);
      if (!currentUserId) {
        return res.status(401).json({ message: "User not found" });
      }

      const isBlocked = await storage.isUserBlocked(currentUserId, req.params.userId);
      res.json({ isBlocked });
    } catch (error) {
      console.error("Error checking blocked user:", error);
      res.status(500).json({ message: "Failed to check blocked user" });
    }
  });

  // ============================================================================
  // DISPUTE RESOLUTION ROUTES
  // ============================================================================

  // Create a new dispute
  app.post('/api/disputes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { insertDisputeSchema } = await import("@shared/schema");
      const parsed = insertDisputeSchema.safeParse({
        ...req.body,
        raisedBy: userId,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      // Verify user has access to the project
      const project = await storage.getProjectById(parsed.data.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "You can only raise disputes for projects you're involved in" });
      }

      const dispute = await storage.createDispute(parsed.data);
      res.status(201).json(dispute);
    } catch (error) {
      console.error("Error creating dispute:", error);
      const message = error instanceof Error ? error.message : "Failed to create dispute";
      res.status(500).json({ message });
    }
  });

  // Get user's disputes
  app.get('/api/disputes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const result = await storage.getUserDisputes(userId, { status, limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Get specific dispute
  app.get('/api/disputes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const dispute = await storage.getDispute(req.params.id);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Verify user has access to this dispute
      const project = await storage.getProjectById(dispute.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Allow access if user is part of the project or is admin
      const user = await storage.getUser(userId);
      const isAdmin = user?.role === 'admin';
      const hasAccess = isAdmin || project.clientId === userId || project.consultantId === userId;

      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this dispute" });
      }

      res.json(dispute);
    } catch (error) {
      console.error("Error fetching dispute:", error);
      res.status(500).json({ message: "Failed to fetch dispute" });
    }
  });

  // Add evidence to a dispute
  app.post('/api/disputes/:id/evidence', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const dispute = await storage.getDispute(req.params.id);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Verify user has access to this dispute
      const project = await storage.getProjectById(dispute.projectId);
      if (!project || (project.clientId !== userId && project.consultantId !== userId)) {
        return res.status(403).json({ message: "You don't have access to this dispute" });
      }

      const { insertDisputeEvidenceSchema } = await import("@shared/schema");
      const parsed = insertDisputeEvidenceSchema.safeParse({
        ...req.body,
        disputeId: req.params.id,
        uploadedBy: userId,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const evidence = await storage.addDisputeEvidence(parsed.data);
      res.status(201).json(evidence);
    } catch (error) {
      console.error("Error adding evidence:", error);
      const message = error instanceof Error ? error.message : "Failed to add evidence";
      res.status(500).json({ message });
    }
  });

  // Get dispute evidence
  app.get('/api/disputes/:id/evidence', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const dispute = await storage.getDispute(req.params.id);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Verify user has access to this dispute
      const project = await storage.getProjectById(dispute.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const user = await storage.getUser(userId);
      const isAdmin = user?.role === 'admin';
      const hasAccess = isAdmin || project.clientId === userId || project.consultantId === userId;

      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this dispute" });
      }

      const evidence = await storage.getDisputeEvidence(req.params.id);
      res.json({ evidence });
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  // Add message to a dispute
  app.post('/api/disputes/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const dispute = await storage.getDispute(req.params.id);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Verify user has access to this dispute
      const project = await storage.getProjectById(dispute.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const user = await storage.getUser(userId);
      const isAdmin = user?.role === 'admin';
      const hasAccess = isAdmin || project.clientId === userId || project.consultantId === userId;

      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this dispute" });
      }

      const { insertDisputeMessageSchema } = await import("@shared/schema");
      const parsed = insertDisputeMessageSchema.safeParse({
        ...req.body,
        disputeId: req.params.id,
        senderId: userId,
        isAdminMessage: isAdmin,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const message = await storage.addDisputeMessage(parsed.data);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error adding message:", error);
      const messageText = error instanceof Error ? error.message : "Failed to add message";
      res.status(500).json({ message: messageText });
    }
  });

  // Get dispute messages
  app.get('/api/disputes/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const dispute = await storage.getDispute(req.params.id);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Verify user has access to this dispute
      const project = await storage.getProjectById(dispute.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const user = await storage.getUser(userId);
      const isAdmin = user?.role === 'admin';
      const hasAccess = isAdmin || project.clientId === userId || project.consultantId === userId;

      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this dispute" });
      }

      const messages = await storage.getDisputeMessages(req.params.id);
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Admin: Get all disputes
  app.get('/api/admin/disputes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const status = req.query.status as string | undefined;
      const disputeType = req.query.disputeType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const result = await storage.getAllDisputes({ status, disputeType, limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching all disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Admin: Update dispute status
  app.put('/api/admin/disputes/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updateSchema = z.object({
        status: z.enum(['pending', 'under_review', 'resolved', 'closed']),
        resolution: z.string().max(5000).optional(),
      });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const dispute = await storage.getDispute(req.params.id);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      const updated = await storage.updateDisputeStatus(
        req.params.id,
        parsed.data.status,
        parsed.data.resolution,
        userId
      );

      res.json(updated);
    } catch (error) {
      console.error("Error updating dispute status:", error);
      const message = error instanceof Error ? error.message : "Failed to update dispute status";
      res.status(500).json({ message });
    }
  });

  // ============================================================================
  // PROJECT INVITATION & MATCHING ROUTES
  // ============================================================================

  app.post('/api/projects/:id/invite-consultant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const inviteSchema = z.object({
        consultantId: z.string().uuid(),
        message: z.string().max(1000).optional(),
      });

      const parsed = inviteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const project = await storage.getJobById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId) {
        return res.status(403).json({ message: "Only the project owner can invite consultants" });
      }

      const consultant = await storage.getConsultantProfileByUserId(parsed.data.consultantId);
      if (!consultant) {
        return res.status(404).json({ message: "Consultant not found" });
      }

      // Notify consultant about the invitation using notification service
      try {
        await notificationService.notifyVendorInvited(parsed.data.consultantId, {
          projectId: project.id,
          projectTitle: project.title,
          clientName: 'A client',
        });
      } catch (notifError) {
        console.error("Error sending vendor invitation notification:", notifError);
      }

      res.status(201).json({ 
        message: "Consultant invited successfully",
        projectId: project.id,
        consultantId: parsed.data.consultantId
      });
    } catch (error) {
      console.error("Error inviting consultant:", error);
      res.status(500).json({ message: "Failed to invite consultant" });
    }
  });

  app.get('/api/projects/:id/suggested-consultants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const project = await storage.getJobById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId) {
        return res.status(403).json({ message: "Only the project owner can view suggestions" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const filters: any = {};
      if (project.category) {
        filters.category = project.category;
      }
      if (project.subcategory) {
        filters.subcategory = project.subcategory;
      }
      if (project.requiredSkills && project.requiredSkills.length > 0) {
        filters.skills = project.requiredSkills;
      }
      if (project.location) {
        filters.location = project.location;
      }

      const searchResults = await storage.searchConsultants({
        ...filters,
        sort: 'rating',
        limit,
        offset: 0,
      });

      res.json({
        consultants: searchResults.consultants,
        total: searchResults.total,
        projectId: project.id,
        matchCriteria: {
          category: project.category,
          subcategory: project.subcategory,
          skills: project.requiredSkills,
          location: project.location,
        }
      });
    } catch (error) {
      console.error("Error fetching suggested consultants:", error);
      res.status(500).json({ message: "Failed to fetch suggested consultants" });
    }
  });

  // ============================================================================
  // CONSULTANT COMPARISON ROUTE
  // ============================================================================

  app.get('/api/consultants/compare', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const ids = req.query.ids ? (req.query.ids as string).split(',') : [];
      if (ids.length === 0) {
        return res.status(400).json({ message: "No consultant IDs provided" });
      }

      if (ids.length > 10) {
        return res.status(400).json({ message: "Cannot compare more than 10 consultants" });
      }

      const consultants = await Promise.all(
        ids.map(id => storage.getConsultantProfileByUserId(id))
      );

      const validConsultants = consultants.filter(c => c !== null);

      res.json({ consultants: validConsultants });
    } catch (error) {
      console.error("Error comparing consultants:", error);
      res.status(500).json({ message: "Failed to compare consultants" });
    }
  });

  // ===========================
  // NOTIFICATIONS ROUTES
  // ===========================

  // GET /api/notifications - Get user's notifications with pagination and filtering
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const read = req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined;

      const result = await storage.getNotifications(userId, { limit, offset, read });
      res.json(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // GET /api/notifications/unread-count - Get count of unread notifications
  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const count = await storage.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // PUT /api/notifications/:id/mark-read - Mark a notification as read
  app.put('/api/notifications/:id/mark-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Fetch notification first to verify ownership BEFORE updating
      const notification = await storage.getNotification(req.params.id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Verify ownership
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Now safe to update
      const updated = await storage.markNotificationAsRead(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // PUT /api/notifications/mark-all-read - Mark all notifications as read
  app.put('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // DELETE /api/notifications/:id - Delete a notification
  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Fetch notification first to verify ownership BEFORE deleting
      const notification = await storage.getNotification(req.params.id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Verify ownership
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Now safe to delete
      await storage.deleteNotification(req.params.id);
      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Test endpoint to create notifications (DEVELOPMENT ONLY)
  // This endpoint is disabled in production for security reasons
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/notifications/test-create', isAuthenticated, async (req: any, res) => {
      try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
          return res.status(401).json({ message: "User not found" });
        }

        const { type, title, message, link } = req.body;
        
        if (!type || !title || !message) {
          return res.status(400).json({ message: "Missing required fields: type, title, message" });
        }

        const notification = await storage.createNotification({
          userId,
          type,
          title,
          message,
          link: link || undefined,
        });

        res.status(201).json(notification);
      } catch (error) {
        console.error('Error creating test notification:', error);
        res.status(500).json({ message: "Failed to create notification" });
      }
    });
  }

  // GET /api/notification-preferences - Get user's notification preferences
  app.get('/api/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      let preferences = await storage.getNotificationPreferences(userId);
      
      // If no preferences exist, create defaults (null = all types enabled)
      if (!preferences) {
        preferences = await storage.upsertNotificationPreferences(userId, {
          emailNotificationsEnabled: true,
          inAppNotificationsEnabled: true,
          emailEnabledTypes: null, // null = all types enabled for email
          inAppEnabledTypes: null, // null = all types enabled for in-app
        });
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  // PUT /api/notification-preferences - Update user's notification preferences
  app.put('/api/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const updateSchema = z.object({
        emailNotificationsEnabled: z.boolean().optional(),
        inAppNotificationsEnabled: z.boolean().optional(),
        emailEnabledTypes: z.array(z.string()).nullable().optional(), // null = all enabled
        inAppEnabledTypes: z.array(z.string()).nullable().optional(), // null = all enabled
      });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
      }

      const updated = await storage.upsertNotificationPreferences(userId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  app.get('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Optional query params
      const clientId = req.query.clientId as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const forConsultant = req.query.forConsultant === 'true';
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;

      // Build filter options
      const options: { ownerClientId?: string; categoryId?: string; excludeClientId?: string; limit: number } = {
        limit
      };

      if (forConsultant) {
        // Consultant browsing jobs - exclude their own postings
        options.excludeClientId = userId;
        if (categoryId) {
          options.categoryId = categoryId;
        }
      } else {
        // Client viewing their own jobs
        options.ownerClientId = clientId || userId;
        if (categoryId) {
          options.categoryId = categoryId;
        }
      }

      const jobsWithPaths = await storage.listJobs(options);
      res.json({ jobs: jobsWithPaths, total: jobsWithPaths.length });
    } catch (error) {
      console.error("Error listing jobs:", error);
      res.status(500).json({ message: "Failed to list jobs" });
    }
  });

  // ==================== CATEGORY ACCESS REQUEST ROUTES ====================
  
  // Create category access request (consultant only)
  app.post('/api/category-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user has consultant profile and is approved/active
      const consultantProfile = await storage.getConsultantProfile(userId);
      if (!consultantProfile || consultantProfile.userId !== userId) {
        return res.status(403).json({ message: "Only consultants can request category access" });
      }

      if (consultantProfile.approvalStatus !== 'approved') {
        return res.status(403).json({ message: "Consultant profile must be approved before requesting category access" });
      }

      const schema = z.object({
        categoryId: z.string().uuid(),
        credentials: z.any().optional(),
        yearsOfExperience: z.number().int().min(0).optional(),
        reasonForRequest: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request data", errors: parsed.error.errors });
      }

      const requestData: InsertVendorCategoryRequest = {
        vendorId: userId,
        categoryId: parsed.data.categoryId,
        credentials: parsed.data.credentials,
        yearsOfExperience: parsed.data.yearsOfExperience,
        reasonForRequest: parsed.data.reasonForRequest,
        status: 'pending',
      };

      const created = await storage.createCategoryRequest(requestData);
      res.json(created);
    } catch (error) {
      console.error("Error creating category request:", error);
      res.status(500).json({ message: "Failed to create category request" });
    }
  });

  // Get category requests
  app.get('/api/category-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check if user is admin
      const adminCheck = await db.select()
        .from(adminRoles)
        .where(and(
          eq(adminRoles.userId, userId),
          eq(adminRoles.active, true)
        ))
        .limit(1);

      const isAdmin = adminCheck.length > 0;
      const status = req.query.status as string | undefined;

      let requests;
      if (isAdmin) {
        // Admins can query by status or get all pending
        if (status) {
          requests = await storage.getCategoryRequestsByStatus(status);
        } else {
          requests = await storage.getCategoryRequestsByStatus('pending');
        }
      } else {
        // Consultants can only see their own requests
        const consultantProfile = await storage.getConsultantProfile(userId);
        if (!consultantProfile || consultantProfile.userId !== userId) {
          return res.status(403).json({ message: "Only consultants can access category requests" });
        }
        requests = await storage.getVendorCategoryRequests(userId);
      }

      res.json({ requests });
    } catch (error) {
      console.error("Error fetching category requests:", error);
      res.status(500).json({ message: "Failed to fetch category requests" });
    }
  });

  // Approve category request (admin only)
  app.patch('/api/category-requests/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const schema = z.object({
        adminNotes: z.string().optional(),
        verificationBadge: z.enum(['verified', 'premium', 'expert']).optional(),
        maxConcurrentJobs: z.number().int().min(1).max(100).optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request data", errors: parsed.error.errors });
      }

      // Get the request to verify it exists and is pending
      const request = await storage.getCategoryRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Category request not found" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Only pending requests can be approved" });
      }

      // Verify vendor has consultant profile
      const consultantProfile = await storage.getConsultantProfile(request.vendorId);
      if (!consultantProfile) {
        return res.status(400).json({ message: "Vendor must have consultant profile to approve request" });
      }

      // Check if consultant is already approved for this category
      const existingCategories = await storage.getConsultantCategories(request.vendorId);
      const alreadyApproved = existingCategories.some(cc => cc.categoryId === request.categoryId);
      
      if (alreadyApproved) {
        return res.status(400).json({ message: "Consultant is already approved for this category" });
      }

      const approved = await storage.approveCategoryRequest(
        req.params.id,
        userId,
        parsed.data.adminNotes,
        parsed.data.verificationBadge,
        parsed.data.maxConcurrentJobs
      );

      // Notify vendor about category approval
      try {
        const category = await storage.getCategoryById(request.categoryId);
        await notificationService.notifyCategoryApproval(request.vendorId, {
          categoryId: request.categoryId,
          categoryName: category?.name || 'Category',
        });
      } catch (notifError) {
        console.error("Error sending category approval notification:", notifError);
      }

      res.json(approved);
    } catch (error) {
      console.error("Error approving category request:", error);
      res.status(500).json({ message: "Failed to approve category request" });
    }
  });

  // Reject category request (admin only)
  app.patch('/api/category-requests/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const schema = z.object({
        adminNotes: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request data", errors: parsed.error.errors });
      }

      // Get the request to verify it exists and is pending
      const request = await storage.getCategoryRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Category request not found" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Only pending requests can be rejected" });
      }

      const rejected = await storage.rejectCategoryRequest(
        req.params.id,
        userId,
        parsed.data.adminNotes
      );

      res.json(rejected);
    } catch (error) {
      console.error("Error rejecting category request:", error);
      res.status(500).json({ message: "Failed to reject category request" });
    }
  });

  // ==================== ADMIN ROUTES ====================
  
  // Admin login - same as regular login but requires admin role
  app.post('/api/admin/login', (req, res, next) => {
    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
      }
      
      // Check if user has admin role
      try {
        const [adminRole] = await db
          .select()
          .from(adminRoles)
          .where(
            and(
              eq(adminRoles.userId, user.id),
              eq(adminRoles.active, true)
            )
          )
          .limit(1);
        
        if (!adminRole) {
          return res.status(403).json({ message: "Admin access required" });
        }
        
        req.login(user, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ message: "Login failed" });
          }
          
          res.json({
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
            },
            adminRole: {
              role: adminRole.role,
              permissions: adminRole.permissions,
            },
          });
        });
      } catch (error) {
        console.error("Error checking admin role:", error);
        res.status(500).json({ message: "Failed to verify admin status" });
      }
    })(req, res, next);
  });
  
  // Get current admin user info
  app.get('/api/admin/user', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
        },
        adminRole: req.adminRole,
      });
    } catch (error) {
      console.error("Error fetching admin user:", error);
      res.status(500).json({ message: "Failed to fetch user info" });
    }
  });
  
  // Admin dashboard stats
  app.get('/api/admin/dashboard/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get platform overview stats
      const [
        totalUsersResult,
        clientsResult,
        consultantsResult,
        activeJobsResult,
        totalBidsResult,
        completedProjectsResult,
        totalGMVResult,
      ] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(users).where(eq(users.role, 'client')),
        db.select({ count: count() }).from(users).where(eq(users.role, 'consultant')),
        db.select({ count: count() }).from(jobs).where(eq(jobs.status, 'open')),
        db.select({ count: count() }).from(bids),
        db.select({ count: count() }).from(jobs).where(eq(jobs.status, 'completed')),
        db.select({ 
          total: sql<string>`COALESCE(SUM(amount), 0)`
        }).from(payments).where(eq(payments.status, 'completed')),
      ]);
      
      const stats = {
        totalUsers: totalUsersResult[0]?.count || 0,
        totalClients: clientsResult[0]?.count || 0,
        totalConsultants: consultantsResult[0]?.count || 0,
        activeRequirements: activeJobsResult[0]?.count || 0,
        totalBids: totalBidsResult[0]?.count || 0,
        completedProjects: completedProjectsResult[0]?.count || 0,
        totalGMV: totalGMVResult[0]?.total || '0',
        currency: 'SAR',
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Admin payment analytics
  app.get('/api/admin/payments/analytics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const analytics = await storage.getPaymentAnalytics();
      
      // Get refund statistics
      const allRefunds = await storage.getAllRefundRequests();
      const pendingRefunds = allRefunds.filter(r => r.status === 'pending').length;
      const approvedRefunds = allRefunds.filter(r => r.status === 'approved').length;
      const processedRefunds = allRefunds.filter(r => r.status === 'processed').length;

      // Get invoice statistics
      const allInvoices = await storage.getAllInvoices({});
      const paidInvoices = allInvoices.filter(i => i.status === 'paid').length;
      const overdueInvoices = await storage.getOverdueInvoices();

      res.json({
        ...analytics,
        refunds: {
          pending: pendingRefunds,
          approved: approvedRefunds,
          processed: processedRefunds,
          total: allRefunds.length,
        },
        invoices: {
          total: allInvoices.length,
          paid: paidInvoices,
          overdue: overdueInvoices.length,
        },
        currency: 'SAR'
      });
    } catch (error: any) {
      console.error("Error getting payment analytics:", error);
      res.status(500).json({ message: error.message || "Failed to get analytics" });
    }
  });
  
  // Get all users (with pagination and filters)
  app.get('/api/admin/users', isAuthenticated, isAdmin, hasPermission('users:view'), async (req, res) => {
    try {
      const { role, status, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      let query = db.select().from(users);
      
      // Add filters
      if (role && role !== 'all') {
        query = query.where(eq(users.role, role as string)) as any;
      }
      
      if (status && status !== 'all') {
        query = query.where(eq(users.status, status as string)) as any;
      }
      
      // Get paginated results
      const usersResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(users.createdAt));
      
      // Get total count
      const [totalResult] = await db.select({ count: count() }).from(users);
      
      // Fetch profile data for each user
      const enrichedUsers = await Promise.all(usersResult.map(async (user) => {
        const { password, ...safeUser } = user;
        
        // Fetch client profile if user is client or both
        let clientProfile = null;
        let consultantProfile = null;
        let approvalStatus = null;
        let profileStatus = null;
        let profileCompletion = 0;
        
        if (user.role === 'client' || user.role === 'both') {
          const [profile] = await db.select().from(clientProfiles).where(eq(clientProfiles.userId, user.id));
          if (profile) {
            clientProfile = profile;
            approvalStatus = profile.approvalStatus;
            profileStatus = profile.profileStatus;
            // Calculate profile completion for client
            const fields = [
              profile.companyName, profile.industry, profile.companySize,
              profile.website, profile.location, profile.description
            ];
            profileCompletion = Math.round((fields.filter(f => f).length / fields.length) * 100);
          }
        }
        
        if (user.role === 'consultant' || user.role === 'both') {
          const [profile] = await db.select().from(consultantProfiles).where(eq(consultantProfiles.userId, user.id));
          if (profile) {
            consultantProfile = profile;
            approvalStatus = profile.approvalStatus;
            profileStatus = profile.profileStatus;
            // Calculate profile completion for consultant
            const fields = [
              profile.fullName, profile.title, profile.bio, profile.hourlyRate,
              profile.experience, profile.location, profile.skills
            ];
            profileCompletion = Math.round((fields.filter(f => f).length / fields.length) * 100);
          }
        }
        
        return {
          ...safeUser,
          approvalStatus: approvalStatus || 'pending',
          profileStatus: profileStatus || 'incomplete',
          profileCompletion,
        };
      }));
      
      res.json({
        users: enrichedUsers,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all categories (with pagination and filters)
  app.get('/api/admin/categories', isAuthenticated, isAdmin, hasPermission('categories:view'), async (req, res) => {
    try {
      const { parent, featured, active, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Build filter conditions
      const conditions = [];
      
      if (parent && parent !== 'all') {
        if (parent === 'null') {
          conditions.push(sql`${categories.parentId} IS NULL`);
        } else {
          conditions.push(eq(categories.parentId, parent as string));
        }
      }
      
      if (featured && featured !== 'all') {
        conditions.push(eq(categories.featured, featured === 'true'));
      }
      
      if (active && active !== 'all') {
        conditions.push(eq(categories.active, active === 'true'));
      }
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(categories.name, searchTerm),
            ilike(categories.nameAr, searchTerm),
            ilike(categories.slug, searchTerm)
          )
        );
      }
      
      // Apply filters
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get paginated results
      let query = db.select().from(categories);
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const categoriesResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(categories.displayOrder, categories.name);
      
      // Get total count with same filters
      let countQuery = db.select({ count: count() }).from(categories);
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      const [totalResult] = await countQuery;
      
      res.json({
        categories: categoriesResult,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get category tree (full hierarchy)
  app.get('/api/admin/categories/tree', isAuthenticated, isAdmin, hasPermission('categories:view'), async (req, res) => {
    try {
      // Fetch all categories
      const allCategories = await db.select().from(categories).orderBy(categories.level, categories.displayOrder, categories.name);
      
      // Build tree structure
      const buildTree = (parentId: string | null = null): any[] => {
        return allCategories
          .filter(cat => cat.parentId === parentId)
          .map(cat => ({
            ...cat,
            children: buildTree(cat.id),
          }));
      };
      
      const tree = buildTree(null);
      res.json({ tree });
    } catch (error) {
      console.error("Error fetching category tree:", error);
      res.status(500).json({ message: "Failed to fetch category tree" });
    }
  });

  // Get category children
  app.get('/api/admin/categories/:id/children', isAuthenticated, isAdmin, hasPermission('categories:view'), async (req, res) => {
    try {
      const { id } = req.params;
      const children = await db.select().from(categories).where(eq(categories.parentId, id)).orderBy(categories.displayOrder, categories.name);
      res.json({ children });
    } catch (error) {
      console.error("Error fetching category children:", error);
      res.status(500).json({ message: "Failed to fetch category children" });
    }
  });

  // Create category
  app.post('/api/admin/categories', isAuthenticated, isAdmin, hasPermission('categories:create'), async (req, res) => {
    try {
      // Validate request body with Zod schema
      const validationResult = insertCategorySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }
      
      const { 
        parentId, level, name, nameAr, slug, description, descriptionAr, 
        heroTitle, heroTitleAr, heroDescription, heroDescriptionAr, 
        icon, displayOrder, featured, active, visible,
        // New dynamic category fields
        categoryType, requiresApproval, customFields, deliveryOptions, warrantyConfig, complianceRequirements
      } = validationResult.data;
      
      // Validate level (0-2 for 3-level hierarchy)
      if (level < 0 || level > 2) {
        return res.status(400).json({ message: "Level must be between 0 and 2 (3-level hierarchy)" });
      }
      
      // If parentId is provided, validate parent level
      if (parentId) {
        const parent = await db.select().from(categories).where(eq(categories.id, parentId)).limit(1);
        if (!parent || parent.length === 0) {
          return res.status(400).json({ message: "Parent category not found" });
        }
        
        // Ensure level is parent.level + 1
        if (level !== parent[0].level + 1) {
          return res.status(400).json({ message: `Level must be ${parent[0].level + 1} for this parent` });
        }
        
        // Prevent creating level 3+ (exceeding max depth)
        if (parent[0].level >= 2) {
          return res.status(400).json({ message: "Cannot create categories beyond level 2 (3-level maximum)" });
        }
      } else if (level !== 0) {
        return res.status(400).json({ message: "Root categories must have level 0" });
      }
      
      // Check slug uniqueness
      const existing = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
      if (existing && existing.length > 0) {
        return res.status(400).json({ message: "Category with this slug already exists" });
      }
      
      // Create category - use validated data with explicit defaults only for required fields
      const categoryData: any = {
        level,
        name,
        nameAr,
        slug,
        description,
        descriptionAr,
        heroTitle,
        heroTitleAr,
        heroDescription,
        heroDescriptionAr,
        icon,
        displayOrder: displayOrder ?? 0,
        featured: featured ?? false,
        active: active ?? true,
        visible: visible ?? true,
      };
      
      // Add optional fields only if present in validated data
      if (parentId !== undefined) categoryData.parentId = parentId;
      if (categoryType !== undefined) categoryData.categoryType = categoryType;
      if (requiresApproval !== undefined) categoryData.requiresApproval = requiresApproval;
      if (customFields !== undefined) categoryData.customFields = customFields;
      if (deliveryOptions !== undefined) categoryData.deliveryOptions = deliveryOptions;
      if (warrantyConfig !== undefined) categoryData.warrantyConfig = warrantyConfig;
      if (complianceRequirements !== undefined) categoryData.complianceRequirements = complianceRequirements;
      
      const [newCategory] = await db.insert(categories).values(categoryData).returning();
      
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Update category
  app.put('/api/admin/categories/:id', isAuthenticated, isAdmin, hasPermission('categories:edit'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body with Zod schema (partial for updates)
      const partialSchema = insertCategorySchema.partial();
      const validationResult = partialSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }
      
      const { 
        parentId, level, name, nameAr, slug, description, descriptionAr, 
        heroTitle, heroTitleAr, heroDescription, heroDescriptionAr, 
        icon, displayOrder, featured, active, visible,
        // New dynamic category fields
        categoryType, requiresApproval, customFields, deliveryOptions, warrantyConfig, complianceRequirements
      } = validationResult.data;
      
      // Get existing category
      const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Validate level if provided
      if (level !== undefined && (level < 0 || level > 2)) {
        return res.status(400).json({ message: "Level must be between 0 and 2" });
      }
      
      // If changing parentId, validate it
      if (parentId !== undefined && parentId !== existing[0].parentId) {
        if (parentId) {
          const parent = await db.select().from(categories).where(eq(categories.id, parentId)).limit(1);
          if (!parent || parent.length === 0) {
            return res.status(400).json({ message: "Parent category not found" });
          }
          
          // Check if setting parent to itself or a descendant (prevent cycles)
          if (parent[0].id === id) {
            return res.status(400).json({ message: "Cannot set category as its own parent" });
          }
          
          // Ensure new level matches parent level + 1
          const newLevel = level !== undefined ? level : parent[0].level + 1;
          if (newLevel !== parent[0].level + 1) {
            return res.status(400).json({ message: `Level must be ${parent[0].level + 1} for this parent` });
          }
        }
      }
      
      // Check slug uniqueness if changed
      if (slug && slug !== existing[0].slug) {
        const slugExists = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
        if (slugExists && slugExists.length > 0) {
          return res.status(400).json({ message: "Category with this slug already exists" });
        }
      }
      
      // Build update object with only present fields to avoid overwriting with defaults
      const updateData: any = { updatedAt: new Date() };
      
      // Only include fields that were actually provided in the request
      if (parentId !== undefined) updateData.parentId = parentId;
      if (level !== undefined) updateData.level = level;
      if (name !== undefined) updateData.name = name;
      if (nameAr !== undefined) updateData.nameAr = nameAr;
      if (slug !== undefined) updateData.slug = slug;
      if (description !== undefined) updateData.description = description;
      if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
      if (heroTitle !== undefined) updateData.heroTitle = heroTitle;
      if (heroTitleAr !== undefined) updateData.heroTitleAr = heroTitleAr;
      if (heroDescription !== undefined) updateData.heroDescription = heroDescription;
      if (heroDescriptionAr !== undefined) updateData.heroDescriptionAr = heroDescriptionAr;
      if (icon !== undefined) updateData.icon = icon;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      if (featured !== undefined) updateData.featured = featured;
      if (active !== undefined) updateData.active = active;
      if (visible !== undefined) updateData.visible = visible;
      // Dynamic category fields
      if (categoryType !== undefined) updateData.categoryType = categoryType;
      if (requiresApproval !== undefined) updateData.requiresApproval = requiresApproval;
      if (customFields !== undefined) updateData.customFields = customFields;
      if (deliveryOptions !== undefined) updateData.deliveryOptions = deliveryOptions;
      if (warrantyConfig !== undefined) updateData.warrantyConfig = warrantyConfig;
      if (complianceRequirements !== undefined) updateData.complianceRequirements = complianceRequirements;
      
      const [updated] = await db.update(categories).set(updateData).where(eq(categories.id, id)).returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete category
  app.delete('/api/admin/categories/:id', isAuthenticated, isAdmin, hasPermission('categories:delete'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if category has children
      const children = await db.select().from(categories).where(eq(categories.parentId, id)).limit(1);
      if (children && children.length > 0) {
        return res.status(400).json({ message: "Cannot delete category with children. Delete children first or disable this category." });
      }
      
      // Check if category is used in jobs
      const jobsUsingCategory = await db.select().from(jobs).where(eq(jobs.categoryId, id)).limit(1);
      if (jobsUsingCategory && jobsUsingCategory.length > 0) {
        return res.status(400).json({ message: "Cannot delete category used in active jobs. Disable this category instead." });
      }
      
      // Check if category is used by consultants
      const consultantsUsingCategory = await db.select().from(consultantCategories).where(eq(consultantCategories.categoryId, id)).limit(1);
      if (consultantsUsingCategory && consultantsUsingCategory.length > 0) {
        return res.status(400).json({ message: "Cannot delete category used by active consultants. Disable this category instead." });
      }
      
      // Delete category
      await db.delete(categories).where(eq(categories.id, id));
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Toggle category active status
  app.patch('/api/admin/categories/:id/toggle', isAuthenticated, isAdmin, hasPermission('categories:edit'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get current category
      const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const newActiveStatus = !existing[0].active;
      
      // If deactivating, check for active children and provide warnings
      if (!newActiveStatus) {
        const activeChildren = await db.select().from(categories).where(
          and(
            eq(categories.parentId, id),
            eq(categories.active, true)
          )
        );
        
        if (activeChildren && activeChildren.length > 0) {
          // Return warning with children count but allow the operation
          const [updated] = await db.update(categories).set({
            active: newActiveStatus,
            updatedAt: new Date(),
          }).where(eq(categories.id, id)).returning();
          
          return res.json({
            ...updated,
            warning: `This category has ${activeChildren.length} active child categories. Consider deactivating them as well.`
          });
        }
      }
      
      // Toggle active status
      const [updated] = await db.update(categories).set({
        active: newActiveStatus,
        updatedAt: new Date(),
      }).where(eq(categories.id, id)).returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error toggling category:", error);
      res.status(500).json({ message: "Failed to toggle category" });
    }
  });

  // Reorder categories
  app.put('/api/admin/categories/reorder', isAuthenticated, isAdmin, hasPermission('categories:edit'), async (req, res) => {
    try {
      const { updates } = req.body; // Array of { id, displayOrder }
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }
      
      // Update each category's display order
      for (const update of updates) {
        await db.update(categories).set({
          displayOrder: update.displayOrder,
          updatedAt: new Date(),
        }).where(eq(categories.id, update.id));
      }
      
      res.json({ message: "Categories reordered successfully" });
    } catch (error) {
      console.error("Error reordering categories:", error);
      res.status(500).json({ message: "Failed to reorder categories" });
    }
  });

  // Get jobs/requirements with pagination and filtering
  app.get('/api/admin/requirements', isAuthenticated, isAdmin, hasPermission('jobs:view'), async (req, res) => {
    try {
      const { status, category, budgetRange, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Build filter conditions
      const conditions = [];
      
      if (status && status !== 'all') {
        // Defensive mapping: match both legacy snake_case and canonical camelCase
        if (status === 'inProgress') {
          conditions.push(or(
            eq(jobs.status, 'inProgress'),
            eq(jobs.status, 'in_progress')
          ));
        } else {
          conditions.push(eq(jobs.status, status as string));
        }
      }
      
      if (category && category !== 'all') {
        conditions.push(eq(jobs.categoryId, category as string));
      }
      
      // TODO: Budget range filtering requires special handling due to Drizzle's
      // decimal comparison behavior. Will be implemented in a follow-up task.
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(jobs.title, searchTerm),
            ilike(jobs.description, searchTerm),
            ilike(users.email, searchTerm),
            ilike(sql`trim(concat(coalesce(${users.firstName}, ''), ' ', coalesce(${users.lastName}, '')))`, searchTerm),
            ilike(categories.name, searchTerm),
            ilike(categories.nameAr, searchTerm)
          )
        );
      }
      
      // Apply filters
      // Note: whereClause is shared by both the select query and count query below
      // This ensures pagination totals include all rows matched by defensive status normalization
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get paginated results with joins
      let query = db
        .select({
          id: jobs.id,
          clientId: jobs.clientId,
          clientEmail: users.email,
          clientName: sql<string>`trim(concat(coalesce(${users.firstName}, ''), ' ', coalesce(${users.lastName}, '')))`,
          categoryId: jobs.categoryId,
          categoryName: categories.name,
          categoryNameAr: categories.nameAr,
          title: jobs.title,
          description: jobs.description,
          budget: jobs.budget,
          budgetType: jobs.budgetType,
          duration: jobs.duration,
          experienceLevel: jobs.experienceLevel,
          status: sql<string>`CASE 
            WHEN ${jobs.status} = 'in_progress' THEN 'inProgress'
            ELSE ${jobs.status}
          END`,
          bidCount: jobs.bidCount,
          viewCount: jobs.viewCount,
          createdAt: jobs.createdAt,
          updatedAt: jobs.updatedAt,
        })
        .from(jobs)
        .leftJoin(users, eq(jobs.clientId, users.id))
        .leftJoin(categories, eq(jobs.categoryId, categories.id));
      
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const jobsResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(jobs.createdAt));
      
      // Get total count with same filters
      let countQuery = db
        .select({ count: count() })
        .from(jobs)
        .leftJoin(users, eq(jobs.clientId, users.id))
        .leftJoin(categories, eq(jobs.categoryId, categories.id));
      
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      
      const [totalResult] = await countQuery;
      
      res.json({
        jobs: jobsResult,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  // Get vendor category requests with pagination and filtering
  app.get('/api/admin/vendor-requests', isAuthenticated, isAdmin, hasPermission('vendors:view'), async (req, res) => {
    try {
      const { status, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Build filter conditions
      const conditions = [];
      
      if (status && status !== 'all') {
        conditions.push(eq(vendorCategoryRequests.status, status as string));
      }
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(users.email, searchTerm),
            ilike(sql`trim(concat(coalesce(${users.firstName}, ''), ' ', coalesce(${users.lastName}, '')))`, searchTerm),
            ilike(categories.name, searchTerm),
            ilike(categories.nameAr, searchTerm),
            ilike(vendorCategoryRequests.reasonForRequest, searchTerm)
          )
        );
      }
      
      // Apply filters
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get paginated results with joins
      let query = db
        .select({
          id: vendorCategoryRequests.id,
          vendorId: vendorCategoryRequests.vendorId,
          vendorEmail: users.email,
          vendorFirstName: users.firstName,
          vendorLastName: users.lastName,
          vendorName: sql<string>`trim(concat(coalesce(${users.firstName}, ''), ' ', coalesce(${users.lastName}, '')))`,
          categoryId: vendorCategoryRequests.categoryId,
          categoryName: categories.name,
          categoryNameAr: categories.nameAr,
          status: vendorCategoryRequests.status,
          yearsOfExperience: vendorCategoryRequests.yearsOfExperience,
          reasonForRequest: vendorCategoryRequests.reasonForRequest,
          adminNotes: vendorCategoryRequests.adminNotes,
          reviewedBy: vendorCategoryRequests.reviewedBy,
          reviewedAt: vendorCategoryRequests.reviewedAt,
          createdAt: vendorCategoryRequests.createdAt,
          updatedAt: vendorCategoryRequests.updatedAt,
        })
        .from(vendorCategoryRequests)
        .leftJoin(users, eq(vendorCategoryRequests.vendorId, users.id))
        .leftJoin(categories, eq(vendorCategoryRequests.categoryId, categories.id));
      
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const requestsResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(vendorCategoryRequests.createdAt));
      
      // Get total count with same filters
      let countQuery = db
        .select({ count: count() })
        .from(vendorCategoryRequests)
        .leftJoin(users, eq(vendorCategoryRequests.vendorId, users.id))
        .leftJoin(categories, eq(vendorCategoryRequests.categoryId, categories.id));
      
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      
      const [totalResult] = await countQuery;
      
      res.json({
        requests: requestsResult,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching vendor requests:", error);
      res.status(500).json({ message: "Failed to fetch vendor requests" });
    }
  });

  // Get bids with pagination and filtering
  app.get('/api/admin/bids', isAuthenticated, isAdmin, hasPermission('bids:view'), async (req, res) => {
    try {
      const { status, job, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Create aliases for users table (consultant and client)
      const consultantUser = alias(users, 'consultantUser');
      const clientUser = alias(users, 'clientUser');
      
      // Build filter conditions
      const conditions = [];
      
      if (status && status !== 'all') {
        conditions.push(eq(bids.status, status as string));
      }
      
      if (job && job !== 'all') {
        conditions.push(eq(bids.jobId, job as string));
      }
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(consultantUser.email, searchTerm),
            ilike(sql`trim(concat(coalesce(${consultantUser.firstName}, ''), ' ', coalesce(${consultantUser.lastName}, '')))`, searchTerm),
            ilike(jobs.title, searchTerm),
            ilike(bids.coverLetter, searchTerm)
          )
        );
      }
      
      // Apply filters
      // Note: whereClause is shared by both the select query and count query below
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get paginated results with joins
      let query = db
        .select({
          id: bids.id,
          jobId: bids.jobId,
          jobTitle: jobs.title,
          clientId: jobs.clientId,
          clientEmail: clientUser.email,
          clientName: sql<string>`trim(concat(coalesce(${clientUser.firstName}, ''), ' ', coalesce(${clientUser.lastName}, '')))`,
          consultantId: bids.consultantId,
          consultantEmail: consultantUser.email,
          consultantName: sql<string>`trim(concat(coalesce(${consultantUser.firstName}, ''), ' ', coalesce(${consultantUser.lastName}, '')))`,
          proposedBudget: bids.proposedBudget,
          proposedDuration: bids.proposedDuration,
          status: bids.status,
          clientViewed: bids.clientViewed,
          createdAt: bids.createdAt,
          updatedAt: bids.updatedAt,
        })
        .from(bids)
        .leftJoin(consultantUser, eq(bids.consultantId, consultantUser.id))
        .leftJoin(jobs, eq(bids.jobId, jobs.id))
        .leftJoin(clientUser, eq(jobs.clientId, clientUser.id));
      
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const bidsResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(bids.createdAt));
      
      // Get total count with same filters
      let countQuery = db
        .select({ count: count() })
        .from(bids)
        .leftJoin(consultantUser, eq(bids.consultantId, consultantUser.id))
        .leftJoin(jobs, eq(bids.jobId, jobs.id))
        .leftJoin(clientUser, eq(jobs.clientId, clientUser.id));
      
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      
      const [totalResult] = await countQuery;
      
      res.json({
        bids: bidsResult,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  // Get payments with pagination and filtering
  app.get('/api/admin/payments', isAuthenticated, isAdmin, hasPermission('finance:view'), async (req, res) => {
    try {
      const { status, type, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Create aliases for users table (payer and payee)
      const payerUser = alias(users, 'payerUser');
      const payeeUser = alias(users, 'payeeUser');
      
      // Build filter conditions
      const conditions = [];
      
      if (status && status !== 'all') {
        conditions.push(eq(payments.status, status as string));
      }
      
      if (type && type !== 'all') {
        conditions.push(eq(payments.type, type as string));
      }
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(payments.transactionId, searchTerm),
            ilike(payments.description, searchTerm),
            ilike(projects.title, searchTerm),
            ilike(payerUser.email, searchTerm),
            ilike(sql`trim(concat(coalesce(${payerUser.firstName}, ''), ' ', coalesce(${payerUser.lastName}, '')))`, searchTerm),
            ilike(payeeUser.email, searchTerm),
            ilike(sql`trim(concat(coalesce(${payeeUser.firstName}, ''), ' ', coalesce(${payeeUser.lastName}, '')))`, searchTerm)
          )
        );
      }
      
      // Apply filters
      // Note: whereClause is shared by both the select query and count query below
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get paginated results with joins
      let query = db
        .select({
          id: payments.id,
          projectId: payments.projectId,
          projectTitle: projects.title,
          fromUserId: payments.fromUserId,
          payerEmail: payerUser.email,
          payerName: sql<string>`trim(concat(coalesce(${payerUser.firstName}, ''), ' ', coalesce(${payerUser.lastName}, '')))`,
          toUserId: payments.toUserId,
          payeeEmail: payeeUser.email,
          payeeName: sql<string>`trim(concat(coalesce(${payeeUser.firstName}, ''), ' ', coalesce(${payeeUser.lastName}, '')))`,
          amount: payments.amount,
          currency: payments.currency,
          type: payments.type,
          status: payments.status,
          paymentMethod: payments.paymentMethod,
          transactionId: payments.transactionId,
          description: payments.description,
          createdAt: payments.createdAt,
          updatedAt: payments.updatedAt,
        })
        .from(payments)
        .leftJoin(payerUser, eq(payments.fromUserId, payerUser.id))
        .leftJoin(payeeUser, eq(payments.toUserId, payeeUser.id))
        .leftJoin(projects, eq(payments.projectId, projects.id));
      
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const paymentsResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(payments.createdAt));
      
      // Get total count with same filters
      let countQuery = db
        .select({ count: count() })
        .from(payments)
        .leftJoin(payerUser, eq(payments.fromUserId, payerUser.id))
        .leftJoin(payeeUser, eq(payments.toUserId, payeeUser.id))
        .leftJoin(projects, eq(payments.projectId, projects.id));
      
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      
      const [totalResult] = await countQuery;
      
      res.json({
        payments: paymentsResult,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Get contracts/projects with pagination and filtering
  app.get('/api/admin/contracts', isAuthenticated, isAdmin, hasPermission('finance:view'), async (req, res) => {
    try {
      const { status, clientId, consultantId, startDateFrom, startDateTo, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Create aliases for users table (client and consultant)
      const clientUser = alias(users, 'clientUser');
      const consultantUser = alias(users, 'consultantUser');
      
      // Build filter conditions
      const conditions = [];
      
      if (status && status !== 'all') {
        conditions.push(eq(projects.status, status as string));
      }
      
      if (clientId && typeof clientId === 'string') {
        conditions.push(eq(projects.clientId, clientId));
      }
      
      if (consultantId && typeof consultantId === 'string') {
        conditions.push(eq(projects.consultantId, consultantId));
      }
      
      if (startDateFrom && typeof startDateFrom === 'string') {
        conditions.push(gte(projects.startDate, new Date(startDateFrom)));
      }
      
      if (startDateTo && typeof startDateTo === 'string') {
        conditions.push(lte(projects.startDate, new Date(startDateTo)));
      }
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(projects.title, searchTerm),
            ilike(projects.description, searchTerm),
            ilike(jobs.title, searchTerm),
            ilike(clientUser.email, searchTerm),
            ilike(sql`trim(concat(coalesce(${clientUser.firstName}, ''), ' ', coalesce(${clientUser.lastName}, '')))`, searchTerm),
            ilike(consultantUser.email, searchTerm),
            ilike(sql`trim(concat(coalesce(${consultantUser.firstName}, ''), ' ', coalesce(${consultantUser.lastName}, '')))`, searchTerm)
          )
        );
      }
      
      // Apply filters
      // Note: whereClause is shared by both the select query and count query below
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get paginated results with joins
      let query = db
        .select({
          id: projects.id,
          jobId: projects.jobId,
          jobTitle: jobs.title,
          bidId: projects.bidId,
          bidAmount: bids.proposedBudget,
          bidDuration: bids.proposedDuration,
          clientId: projects.clientId,
          clientEmail: clientUser.email,
          clientName: sql<string>`trim(concat(coalesce(${clientUser.firstName}, ''), ' ', coalesce(${clientUser.lastName}, '')))`,
          consultantId: projects.consultantId,
          consultantEmail: consultantUser.email,
          consultantName: sql<string>`trim(concat(coalesce(${consultantUser.firstName}, ''), ' ', coalesce(${consultantUser.lastName}, '')))`,
          title: projects.title,
          description: projects.description,
          budget: projects.budget,
          status: projects.status,
          milestones: projects.milestones,
          startDate: projects.startDate,
          endDate: projects.endDate,
          completedAt: projects.completedAt,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .leftJoin(clientUser, eq(projects.clientId, clientUser.id))
        .leftJoin(consultantUser, eq(projects.consultantId, consultantUser.id))
        .leftJoin(jobs, eq(projects.jobId, jobs.id))
        .leftJoin(bids, eq(projects.bidId, bids.id));
      
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const contractsResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(projects.createdAt));
      
      // Fetch payment aggregates and dispute counts for each contract
      const contractsWithAggregates = await Promise.all(
        contractsResult.map(async (contract) => {
          // Get payment totals
          const [paymentStats] = await db
            .select({
              totalPaid: sql<string>`coalesce(sum(${payments.amount}), 0)`,
              paymentCount: count(),
            })
            .from(payments)
            .where(eq(payments.projectId, contract.id));
          
          // Get dispute count
          const [disputeStats] = await db
            .select({
              disputeCount: count(),
            })
            .from(disputes)
            .where(eq(disputes.projectId, contract.id));
          
          return {
            ...contract,
            milestones: contract.milestones || [],
            totalPaid: paymentStats?.totalPaid || '0',
            paymentCount: paymentStats?.paymentCount || 0,
            disputeCount: disputeStats?.disputeCount || 0,
          };
        })
      );
      
      // Get total count with same filters
      let countQuery = db
        .select({ count: count() })
        .from(projects)
        .leftJoin(clientUser, eq(projects.clientId, clientUser.id))
        .leftJoin(consultantUser, eq(projects.consultantId, consultantUser.id))
        .leftJoin(jobs, eq(projects.jobId, jobs.id))
        .leftJoin(bids, eq(projects.bidId, bids.id));
      
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      
      const [totalResult] = await countQuery;
      
      res.json({
        contracts: contractsWithAggregates,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // ============================================================================
  // VENDOR DIRECTORY MANAGEMENT
  // ============================================================================
  
  // Get consultant vendors with filtering
  app.get('/api/admin/vendors', isAuthenticated, isAdmin, hasPermission('vendors:view'), async (req, res) => {
    try {
      const { verified, experience, rating, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Build filter conditions
      const conditions = [
        // Only show users with consultant role
        or(
          eq(users.role, 'consultant'),
          eq(users.role, 'both')
        )
      ];
      
      if (verified && verified !== 'all') {
        conditions.push(eq(consultantProfiles.verified, verified === 'true'));
      }
      
      if (experience && experience !== 'all') {
        conditions.push(eq(consultantProfiles.experience, experience as string));
      }
      
      if (rating && rating !== 'all') {
        // Filter by rating >= selected value
        const ratingValue = parseInt(rating as string);
        if (!isNaN(ratingValue)) {
          conditions.push(gte(consultantProfiles.rating, ratingValue.toString()));
        }
      }
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(users.email, searchTerm),
            ilike(consultantProfiles.fullName, searchTerm),
            ilike(consultantProfiles.title, searchTerm),
            ilike(consultantProfiles.bio, searchTerm)
          )
        );
      }
      
      // Apply filters
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get paginated results with joins
      let query = db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          status: users.status,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          profileId: consultantProfiles.id,
          fullName: consultantProfiles.fullName,
          title: consultantProfiles.title,
          bio: consultantProfiles.bio,
          hourlyRate: consultantProfiles.hourlyRate,
          experience: consultantProfiles.experience,
          verified: consultantProfiles.verified,
          rating: consultantProfiles.rating,
          totalReviews: consultantProfiles.totalReviews,
          completedProjects: consultantProfiles.completedProjects,
          availability: consultantProfiles.availability,
          location: consultantProfiles.location,
        })
        .from(users)
        .leftJoin(consultantProfiles, eq(users.id, consultantProfiles.userId));
      
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const vendorsResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(consultantProfiles.rating), desc(consultantProfiles.completedProjects));
      
      // Get total count with same filters
      let countQuery = db
        .select({ count: count() })
        .from(users)
        .leftJoin(consultantProfiles, eq(users.id, consultantProfiles.userId));
      
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      
      const [totalResult] = await countQuery;
      
      res.json({
        vendors: vendorsResult,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Verify/unverify consultant
  app.patch('/api/admin/vendors/:id/verify', isAuthenticated, isAdmin, hasPermission('vendors:manage'), async (req, res) => {
    try {
      const { id } = req.params;
      const { verified } = req.body;
      
      if (typeof verified !== 'boolean') {
        return res.status(400).json({ message: "Verified must be a boolean value" });
      }
      
      const [updatedProfile] = await db.update(consultantProfiles)
        .set({ verified, updatedAt: new Date() })
        .where(eq(consultantProfiles.userId, id))
        .returning();
      
      if (!updatedProfile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating vendor verification:", error);
      res.status(500).json({ message: "Failed to update vendor verification" });
    }
  });

  // ============================================================================
  // SUBSCRIPTION PLANS MANAGEMENT
  // ============================================================================
  
  // Get all subscription plans with filtering
  app.get('/api/admin/subscription-plans', isAuthenticated, isAdmin, hasPermission('plans:view'), async (req, res) => {
    try {
      const { audience, status, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Build filter conditions
      const conditions = [];
      
      if (audience && audience !== 'all') {
        conditions.push(eq(subscriptionPlans.audience, audience as string));
      }
      
      if (status && status !== 'all') {
        conditions.push(eq(subscriptionPlans.status, status as string));
      }
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(subscriptionPlans.name, searchTerm),
            ilike(subscriptionPlans.nameAr, searchTerm),
            ilike(subscriptionPlans.description, searchTerm)
          )
        );
      }
      
      // Apply filters
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get paginated results
      let query = db.select().from(subscriptionPlans);
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const plansResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(subscriptionPlans.displayOrder, subscriptionPlans.name);
      
      // Get total count with same filters
      let countQuery = db.select({ count: count() }).from(subscriptionPlans);
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      const [totalResult] = await countQuery;
      
      res.json({
        plans: plansResult,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Create new subscription plan
  app.post('/api/admin/subscription-plans', isAuthenticated, isAdmin, hasPermission('plans:manage'), async (req, res) => {
    try {
      const validatedData = insertSubscriptionPlanSchema.parse(req.body);
      
      const [newPlan] = await db.insert(subscriptionPlans)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newPlan);
    } catch (error: any) {
      console.error("Error creating subscription plan:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  // Update subscription plan
  app.patch('/api/admin/subscription-plans/:id', isAuthenticated, isAdmin, hasPermission('plans:manage'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate data (partial updates allowed)
      const validatedData = insertSubscriptionPlanSchema.partial().parse(req.body);
      
      const [updatedPlan] = await db.update(subscriptionPlans)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(subscriptionPlans.id, id))
        .returning();
      
      if (!updatedPlan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      res.json(updatedPlan);
    } catch (error: any) {
      console.error("Error updating subscription plan:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // Delete subscription plan
  app.delete('/api/admin/subscription-plans/:id', isAuthenticated, isAdmin, hasPermission('plans:manage'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if any users are subscribed to this plan
      const [subscription] = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.planId, id))
        .limit(1);
      
      if (subscription) {
        return res.status(400).json({ 
          message: "Cannot delete plan with active subscriptions. Please archive it instead." 
        });
      }
      
      const [deletedPlan] = await db.delete(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id))
        .returning();
      
      if (!deletedPlan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      res.json({ message: "Subscription plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });

  // ============================================================================
  // PLATFORM SETTINGS MANAGEMENT
  // ============================================================================
  
  // Get all platform settings
  app.get('/api/admin/settings', isAuthenticated, isAdmin, hasPermission('settings:view'), async (req, res) => {
    try {
      const { category } = req.query;
      
      let query = db.select().from(platformSettings);
      
      if (category && category !== 'all') {
        query = query.where(eq(platformSettings.category, category as string)) as any;
      }
      
      const settingsResult = await query.orderBy(platformSettings.category, platformSettings.key);
      
      res.json({ settings: settingsResult });
    } catch (error) {
      console.error("Error fetching platform settings:", error);
      res.status(500).json({ message: "Failed to fetch platform settings" });
    }
  });

  // Update or create platform setting
  app.post('/api/admin/settings', isAuthenticated, isAdmin, hasPermission('settings:manage'), async (req, res) => {
    try {
      const validatedData = insertPlatformSettingSchema.parse(req.body);
      const adminId = getUserIdFromRequest(req);
      
      // Check if setting exists
      const [existing] = await db.select()
        .from(platformSettings)
        .where(eq(platformSettings.key, validatedData.key))
        .limit(1);
      
      let result;
      if (existing) {
        // Update existing
        [result] = await db.update(platformSettings)
          .set({ ...validatedData, updatedBy: adminId, updatedAt: new Date() })
          .where(eq(platformSettings.key, validatedData.key))
          .returning();
      } else {
        // Create new
        [result] = await db.insert(platformSettings)
          .values({ ...validatedData, updatedBy: adminId })
          .returning();
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Error saving platform setting:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save platform setting" });
    }
  });

  // ============================================================================
  // EMAIL TEMPLATES MANAGEMENT
  // ============================================================================
  
  // Get all email templates
  app.get('/api/admin/email-templates', isAuthenticated, isAdmin, hasPermission('emails:view'), async (req, res) => {
    try {
      const { audience, active } = req.query;
      
      const conditions = [];
      
      if (audience && audience !== 'all') {
        conditions.push(eq(emailTemplates.audience, audience as string));
      }
      
      if (active && active !== 'all') {
        conditions.push(eq(emailTemplates.active, active === 'true'));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      let query = db.select().from(emailTemplates);
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const templatesResult = await query.orderBy(emailTemplates.trigger);
      
      res.json({ templates: templatesResult });
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  // Create email template
  app.post('/api/admin/email-templates', isAuthenticated, isAdmin, hasPermission('emails:manage'), async (req, res) => {
    try {
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      
      const [newTemplate] = await db.insert(emailTemplates)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newTemplate);
    } catch (error: any) {
      console.error("Error creating email template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  // Update email template
  app.patch('/api/admin/email-templates/:id', isAuthenticated, isAdmin, hasPermission('emails:manage'), async (req, res) => {
    try {
      const { id } = req.params;
      
      const validatedData = insertEmailTemplateSchema.partial().parse(req.body);
      
      const [updatedTemplate] = await db.update(emailTemplates)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(emailTemplates.id, id))
        .returning();
      
      if (!updatedTemplate) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      res.json(updatedTemplate);
    } catch (error: any) {
      console.error("Error updating email template:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  // Delete email template
  app.delete('/api/admin/email-templates/:id', isAuthenticated, isAdmin, hasPermission('emails:manage'), async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deletedTemplate] = await db.delete(emailTemplates)
        .where(eq(emailTemplates.id, id))
        .returning();
      
      if (!deletedTemplate) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      res.json({ message: "Email template deleted successfully" });
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // ============================================================================
  // CMS - CONTENT PAGES MANAGEMENT
  // ============================================================================
  
  // Get all content pages (admin)
  app.get('/api/admin/content-pages', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { pageType, status, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      const conditions = [];
      
      if (pageType && pageType !== 'all') {
        conditions.push(eq(contentPages.pageType, pageType as string));
      }
      
      if (status && status !== 'all') {
        conditions.push(eq(contentPages.status, status as string));
      }
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(contentPages.title, searchTerm),
            ilike(contentPages.titleAr, searchTerm),
            ilike(contentPages.slug, searchTerm)
          )
        );
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      let query = db.select().from(contentPages);
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const pagesResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(contentPages.displayOrder, contentPages.title);
      
      let countQuery = db.select({ count: count() }).from(contentPages);
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      const [totalResult] = await countQuery;
      
      res.json({
        pages: pagesResult,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching content pages:", error);
      res.status(500).json({ message: "Failed to fetch content pages" });
    }
  });

  // Create content page
  app.post('/api/admin/content-pages', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const adminId = getUserIdFromRequest(req);
      const validatedData = insertContentPageSchema.parse(req.body);
      
      // Check if slug already exists
      const [existing] = await db.select()
        .from(contentPages)
        .where(eq(contentPages.slug, validatedData.slug))
        .limit(1);
      
      if (existing) {
        return res.status(400).json({ message: "A page with this slug already exists" });
      }
      
      const [newPage] = await db.insert(contentPages)
        .values({ 
          ...validatedData, 
          createdBy: adminId,
          updatedBy: adminId,
          publishedAt: validatedData.status === 'published' ? new Date() : null
        })
        .returning();
      
      res.status(201).json(newPage);
    } catch (error: any) {
      console.error("Error creating content page:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create content page" });
    }
  });

  // Update content page
  app.patch('/api/admin/content-pages/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = getUserIdFromRequest(req);
      const validatedData = insertContentPageSchema.partial().parse(req.body);
      
      // If slug is being changed, check if it already exists
      if (validatedData.slug) {
        const [existing] = await db.select()
          .from(contentPages)
          .where(and(
            eq(contentPages.slug, validatedData.slug),
            sql`${contentPages.id} != ${id}`
          ))
          .limit(1);
        
        if (existing) {
          return res.status(400).json({ message: "A page with this slug already exists" });
        }
      }
      
      // Update publishedAt if status changed to published
      const updateData: any = { ...validatedData, updatedBy: adminId, updatedAt: new Date() };
      if (validatedData.status === 'published') {
        const [current] = await db.select().from(contentPages).where(eq(contentPages.id, id)).limit(1);
        if (current && current.status !== 'published') {
          updateData.publishedAt = new Date();
        }
      }
      
      const [updatedPage] = await db.update(contentPages)
        .set(updateData)
        .where(eq(contentPages.id, id))
        .returning();
      
      if (!updatedPage) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      res.json(updatedPage);
    } catch (error: any) {
      console.error("Error updating content page:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update content page" });
    }
  });

  // Delete content page
  app.delete('/api/admin/content-pages/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deletedPage] = await db.delete(contentPages)
        .where(eq(contentPages.id, id))
        .returning();
      
      if (!deletedPage) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      res.json({ message: "Content page deleted successfully" });
    } catch (error) {
      console.error("Error deleting content page:", error);
      res.status(500).json({ message: "Failed to delete content page" });
    }
  });

  // ============================================================================
  // CMS - FOOTER LINKS MANAGEMENT
  // ============================================================================
  
  // Get all footer links (admin)
  app.get('/api/admin/footer-links', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { section, active } = req.query;
      
      const conditions = [];
      
      if (section && section !== 'all') {
        conditions.push(eq(footerLinks.section, section as string));
      }
      
      if (active && active !== 'all') {
        conditions.push(eq(footerLinks.active, active === 'true'));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      let query = db.select().from(footerLinks);
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const linksResult = await query.orderBy(footerLinks.section, footerLinks.displayOrder);
      
      res.json({ links: linksResult });
    } catch (error) {
      console.error("Error fetching footer links:", error);
      res.status(500).json({ message: "Failed to fetch footer links" });
    }
  });

  // Create footer link
  app.post('/api/admin/footer-links', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertFooterLinkSchema.parse(req.body);
      
      const [newLink] = await db.insert(footerLinks)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newLink);
    } catch (error: any) {
      console.error("Error creating footer link:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create footer link" });
    }
  });

  // Update footer link
  app.patch('/api/admin/footer-links/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertFooterLinkSchema.partial().parse(req.body);
      
      const [updatedLink] = await db.update(footerLinks)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(footerLinks.id, id))
        .returning();
      
      if (!updatedLink) {
        return res.status(404).json({ message: "Footer link not found" });
      }
      
      res.json(updatedLink);
    } catch (error: any) {
      console.error("Error updating footer link:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update footer link" });
    }
  });

  // Delete footer link
  app.delete('/api/admin/footer-links/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deletedLink] = await db.delete(footerLinks)
        .where(eq(footerLinks.id, id))
        .returning();
      
      if (!deletedLink) {
        return res.status(404).json({ message: "Footer link not found" });
      }
      
      res.json({ message: "Footer link deleted successfully" });
    } catch (error) {
      console.error("Error deleting footer link:", error);
      res.status(500).json({ message: "Failed to delete footer link" });
    }
  });

  // ============================================================================
  // CMS - HOME PAGE SECTIONS MANAGEMENT
  // ============================================================================
  
  // Get all home page sections (admin)
  app.get('/api/admin/home-sections', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { sectionType, active } = req.query;
      
      const conditions = [];
      
      if (sectionType && sectionType !== 'all') {
        conditions.push(eq(homePageSections.sectionType, sectionType as string));
      }
      
      if (active && active !== 'all') {
        conditions.push(eq(homePageSections.active, active === 'true'));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      let query = db.select().from(homePageSections);
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const sectionsResult = await query.orderBy(homePageSections.displayOrder);
      
      res.json({ sections: sectionsResult });
    } catch (error) {
      console.error("Error fetching home sections:", error);
      res.status(500).json({ message: "Failed to fetch home sections" });
    }
  });

  // Create home section
  app.post('/api/admin/home-sections', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertHomePageSectionSchema.parse(req.body);
      
      const [newSection] = await db.insert(homePageSections)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newSection);
    } catch (error: any) {
      console.error("Error creating home section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create home section" });
    }
  });

  // Update home section
  app.patch('/api/admin/home-sections/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertHomePageSectionSchema.partial().parse(req.body);
      
      const [updatedSection] = await db.update(homePageSections)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(homePageSections.id, id))
        .returning();
      
      if (!updatedSection) {
        return res.status(404).json({ message: "Home section not found" });
      }
      
      res.json(updatedSection);
    } catch (error: any) {
      console.error("Error updating home section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update home section" });
    }
  });

  // Delete home section
  app.delete('/api/admin/home-sections/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deletedSection] = await db.delete(homePageSections)
        .where(eq(homePageSections.id, id))
        .returning();
      
      if (!deletedSection) {
        return res.status(404).json({ message: "Home section not found" });
      }
      
      res.json({ message: "Home section deleted successfully" });
    } catch (error) {
      console.error("Error deleting home section:", error);
      res.status(500).json({ message: "Failed to delete home section" });
    }
  });

  // ============================================================================
  // PUBLIC CMS APIS
  // ============================================================================
  
  // Get published content page by slug (public)
  app.get('/api/content-pages/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      const [page] = await db.select()
        .from(contentPages)
        .where(and(
          eq(contentPages.slug, slug),
          eq(contentPages.status, 'published')
        ))
        .limit(1);
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      res.json(page);
    } catch (error) {
      console.error("Error fetching content page:", error);
      res.status(500).json({ message: "Failed to fetch content page" });
    }
  });

  // Get active footer links (public)
  app.get('/api/footer-links', async (req, res) => {
    try {
      const linksResult = await db.select()
        .from(footerLinks)
        .where(eq(footerLinks.active, true))
        .orderBy(footerLinks.section, footerLinks.displayOrder);
      
      // Group by section
      const grouped = linksResult.reduce((acc, link) => {
        if (!acc[link.section]) {
          acc[link.section] = [];
        }
        acc[link.section].push(link);
        return acc;
      }, {} as Record<string, typeof linksResult>);
      
      res.json(grouped);
    } catch (error) {
      console.error("Error fetching footer links:", error);
      res.status(500).json({ message: "Failed to fetch footer links" });
    }
  });

  // Get active home page sections (public)
  app.get('/api/home-sections', async (req, res) => {
    try {
      const sectionsResult = await db.select()
        .from(homePageSections)
        .where(eq(homePageSections.active, true))
        .orderBy(homePageSections.displayOrder);
      
      res.json({ sections: sectionsResult });
    } catch (error) {
      console.error("Error fetching home sections:", error);
      res.status(500).json({ message: "Failed to fetch home sections" });
    }
  });

  // ============================================================================
  // MESSAGING & COLLABORATION APIS
  // ============================================================================

  // Conversations
  app.post('/api/conversations', isAuthenticated, RateLimits.createConversation, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);

      // Add the creator as a participant
      await storage.addParticipant({
        conversationId: conversation.id,
        userId,
        role: 'admin',
        status: 'active'
      });

      res.status(201).json(conversation);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { archived, limit } = req.query;
      const conversations = await storage.getUserConversations(userId, {
        archived: archived === 'true',
        limit: limit ? parseInt(limit) : undefined
      });

      res.json({ conversations });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.id);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.patch('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.id);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const conversation = await storage.updateConversation(req.params.id, req.body);
      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.post('/api/conversations/:id/archive', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.id);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const conversation = await storage.archiveConversation(req.params.id, userId);
      res.json(conversation);
    } catch (error) {
      console.error("Error archiving conversation:", error);
      res.status(500).json({ message: "Failed to archive conversation" });
    }
  });

  // Conversation Participants
  app.post('/api/conversations/:conversationId/participants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant with admin role
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const userParticipant = participants.find(p => p.userId === userId);
      if (!userParticipant || userParticipant.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can add participants" });
      }

      const validatedData = insertConversationParticipantSchema.parse({
        ...req.body,
        conversationId: req.params.conversationId
      });

      const participant = await storage.addParticipant(validatedData);
      
      // Invalidate WebSocket participant cache for this conversation
      wsManager.invalidateParticipantCache(req.params.conversationId);
      
      res.status(201).json(participant);
    } catch (error: any) {
      console.error("Error adding participant:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add participant" });
    }
  });

  app.get('/api/conversations/:conversationId/participants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ participants });
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  app.patch('/api/conversations/:conversationId/participants/:participantId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant with admin role
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const userParticipant = participants.find(p => p.userId === userId);
      if (!userParticipant || userParticipant.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update participants" });
      }

      const participant = await storage.updateParticipant(req.params.participantId, req.body);
      res.json(participant);
    } catch (error) {
      console.error("Error updating participant:", error);
      res.status(500).json({ message: "Failed to update participant" });
    }
  });

  app.delete('/api/conversations/:conversationId/participants/:participantId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant with admin role OR is removing themselves
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const userParticipant = participants.find(p => p.userId === userId);
      const targetParticipant = participants.find(p => p.id === req.params.participantId);

      if (!userParticipant || !targetParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const isRemovingSelf = targetParticipant.userId === userId;
      const canRemoveOthers = userParticipant.role === 'admin';

      if (!isRemovingSelf && !canRemoveOthers) {
        return res.status(403).json({ message: "Only admins can remove other participants" });
      }

      await storage.removeParticipant(req.params.conversationId, targetParticipant.userId);
      
      // Invalidate WebSocket participant cache for this conversation
      wsManager.invalidateParticipantCache(req.params.conversationId);
      
      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  // Messages
  app.post('/api/conversations/:conversationId/messages', isAuthenticated, RateLimits.sendMessage, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertMessageSchema.parse({
        ...req.body,
        conversationId: req.params.conversationId,
        senderId: userId
      });

      const message = await storage.createMessage(validatedData);
      
      // Broadcast new message via WebSocket
      await wsManager.broadcastNewMessage(req.params.conversationId, message);

      // Notify conversation participants about new message (excluding sender)
      try {
        const otherParticipants = participants.filter(p => p.userId !== userId);
        for (const participant of otherParticipants) {
          await notificationService.notifyNewMessage(participant.userId, {
            senderId: userId,
            senderName: message.senderName || 'User',
            conversationId: req.params.conversationId,
            messagePreview: message.content.substring(0, 100),
          });
        }
      } catch (notifError) {
        console.error("Error sending new message notifications:", notifError);
      }
      
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { limit, beforeMessageId } = req.query;
      const messages = await storage.getConversationMessages(req.params.conversationId, {
        limit: limit ? parseInt(limit) : undefined,
        beforeMessageId: beforeMessageId as string
      });

      res.json({ messages });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.patch('/api/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const message = await storage.getMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.senderId !== userId) {
        return res.status(403).json({ message: "You can only edit your own messages" });
      }

      const updatedMessage = await storage.updateMessage(req.params.id, req.body);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  app.delete('/api/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const message = await storage.getMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.senderId !== userId) {
        return res.status(403).json({ message: "You can only delete your own messages" });
      }

      await storage.deleteMessage(req.params.id, userId);
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Message Receipts
  app.post('/api/messages/:messageId/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const message = await storage.getMessage(req.params.messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Verify user is a participant of the conversation
      const participants = await storage.getConversationParticipants(message.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const receipt = await storage.markMessageRead(req.params.messageId, userId);
      res.json(receipt);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.get('/api/messages/unread/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get all user's conversations and sum unread counts
      const conversations = await storage.getUserConversations(userId);
      let totalCount = 0;
      
      for (const conversation of conversations) {
        const conversationUnread = await storage.getUnreadCount(conversation.id, userId);
        totalCount += conversationUnread;
      }

      res.json({ count: totalCount });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // ========================================
  // MESSAGE FILE ENDPOINTS
  // ========================================

  // Initialize file scan service
  const fileScanService = new FileScanService(storage);

  // Create message file attachment
  app.post('/api/conversations/:conversationId/messages/:messageId/files', isAuthenticated, RateLimits.fileUpload, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify message exists in conversation
      const message = await storage.getMessage(req.params.messageId);
      if (!message || message.conversationId !== req.params.conversationId) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Server-side validation of file size and MIME type
      const validationResult = UploadPolicy.validate(req.body.fileSize, req.body.mimeType);
      if (!validationResult.valid) {
        return res.status(400).json({ message: validationResult.error });
      }

      const validatedData = insertMessageFileSchema.parse({
        ...req.body,
        messageId: req.params.messageId,
        uploadedById: userId,
        conversationId: req.params.conversationId,
      });

      const file = await storage.createMessageFile(validatedData);
      
      // Queue virus scan
      await fileScanService.queueScan(file.id);
      
      res.status(201).json(file);
    } catch (error: any) {
      console.error("Error creating message file:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid file data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message file" });
    }
  });

  // Get files for a message
  app.get('/api/messages/:messageId/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get message and verify user has access via conversation membership
      const message = await storage.getMessage(req.params.messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      const participants = await storage.getConversationParticipants(message.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const files = await storage.getMessageFiles(req.params.messageId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching message files:", error);
      res.status(500).json({ message: "Failed to fetch message files" });
    }
  });

  // Get all files in a conversation
  app.get('/api/conversations/:conversationId/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { limit } = queryLimitSchema.parse(req.query);
      const files = await storage.getConversationFiles(req.params.conversationId, { limit });
      res.json(files);
    } catch (error) {
      console.error("Error fetching conversation files:", error);
      res.status(500).json({ message: "Failed to fetch conversation files" });
    }
  });

  // Update file metadata
  app.patch('/api/files/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get the file to verify access
      const [existingFile] = await db.select().from(messageFiles).where(eq(messageFiles.id, req.params.fileId));
      if (!existingFile) {
        return res.status(404).json({ message: "File not found" });
      }

      // Verify user is the file owner OR a conversation admin
      const participants = await storage.getConversationParticipants(existingFile.conversationId);
      const userParticipant = participants.find(p => p.userId === userId);
      const isOwner = existingFile.uploadedById === userId;
      const isAdmin = userParticipant?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Only file owner or conversation admins can update files" });
      }

      const file = await storage.updateMessageFile(req.params.fileId, req.body);
      res.json(file);
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ message: "Failed to update file" });
    }
  });

  // Create new file version
  app.post('/api/files/:fileId/versions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get the original file to verify access
      const [originalFile] = await db.select().from(messageFiles).where(eq(messageFiles.id, req.params.fileId));
      if (!originalFile) {
        return res.status(404).json({ message: "Original file not found" });
      }

      // Verify user is the file owner OR a conversation admin
      const participants = await storage.getConversationParticipants(originalFile.conversationId);
      const userParticipant = participants.find(p => p.userId === userId);
      const isOwner = originalFile.uploadedById === userId;
      const isAdmin = userParticipant?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Only file owner or conversation admins can create new versions" });
      }

      const validatedData = insertFileVersionSchema.parse({
        ...req.body,
        originalFileId: req.params.fileId,
        uploadedById: userId
      });

      const version = await storage.createFileVersion(validatedData);
      res.status(201).json(version);
    } catch (error: any) {
      console.error("Error creating file version:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid version data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create file version" });
    }
  });

  // Get file versions
  app.get('/api/files/:fileId/versions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get the original file to verify access
      const [originalFile] = await db.select().from(messageFiles).where(eq(messageFiles.id, req.params.fileId));
      if (!originalFile) {
        return res.status(404).json({ message: "Original file not found" });
      }

      // Verify user is a participant in the conversation
      const participants = await storage.getConversationParticipants(originalFile.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const versions = await storage.getFileVersions(req.params.fileId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching file versions:", error);
      res.status(500).json({ message: "Failed to fetch file versions" });
    }
  });

  // ========================================
  // MEETING ENDPOINTS
  // ========================================

  // Create meeting
  app.post('/api/conversations/:conversationId/meetings', isAuthenticated, RateLimits.createMeeting, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertMeetingLinkSchema.parse({
        ...req.body,
        conversationId: req.params.conversationId,
        createdById: userId
      });

      const meeting = await storage.createMeeting(validatedData);
      
      // Broadcast new meeting to conversation participants
      await wsManager.broadcastNewMeeting(req.params.conversationId, meeting);
      
      res.status(201).json(meeting);
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid meeting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create meeting" });
    }
  });

  // Get conversation meetings
  app.get('/api/conversations/:conversationId/meetings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const upcomingParam = req.query.upcoming;
      const upcoming = upcomingParam === 'true';
      const meetings = await storage.getConversationMeetings(req.params.conversationId, { upcoming });
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  // Get single meeting
  app.get('/api/meetings/:meetingId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      // Verify user is a participant in the conversation
      const participants = await storage.getConversationParticipants(meeting.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(meeting);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      res.status(500).json({ message: "Failed to fetch meeting" });
    }
  });

  // Update meeting
  app.patch('/api/meetings/:meetingId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      // Verify user is the creator or a conversation admin
      const participants = await storage.getConversationParticipants(meeting.conversationId);
      const userParticipant = participants.find(p => p.userId === userId);
      const canUpdate = meeting.createdBy === userId || userParticipant?.role === 'admin';

      if (!canUpdate) {
        return res.status(403).json({ message: "Only the meeting creator or conversation admins can update meetings" });
      }

      const updatedMeeting = await storage.updateMeeting(req.params.meetingId, req.body);
      
      // Broadcast meeting update to conversation participants
      await wsManager.broadcastMeetingUpdate(meeting.conversationId, updatedMeeting);
      
      res.json(updatedMeeting);
    } catch (error) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ message: "Failed to update meeting" });
    }
  });

  // Add meeting participant
  app.post('/api/meetings/:meetingId/participants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      // Verify user is a conversation participant
      const conversationParticipants = await storage.getConversationParticipants(meeting.conversationId);
      const isConversationParticipant = conversationParticipants.some(p => p.userId === userId);
      if (!isConversationParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertMeetingParticipantSchema.parse({
        ...req.body,
        meetingId: req.params.meetingId
      });

      const participant = await storage.addMeetingParticipant(validatedData);
      res.status(201).json(participant);
    } catch (error: any) {
      console.error("Error adding meeting participant:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid participant data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add meeting participant" });
    }
  });

  // Get meeting participants
  app.get('/api/meetings/:meetingId/participants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      // Verify user is a conversation participant
      const conversationParticipants = await storage.getConversationParticipants(meeting.conversationId);
      const isConversationParticipant = conversationParticipants.some(p => p.userId === userId);
      if (!isConversationParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const participants = await storage.getMeetingParticipants(req.params.meetingId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching meeting participants:", error);
      res.status(500).json({ message: "Failed to fetch meeting participants" });
    }
  });

  // Update meeting participant RSVP
  app.patch('/api/meetings/:meetingId/participants/:participantId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      // Verify user is a conversation participant
      const conversationParticipants = await storage.getConversationParticipants(meeting.conversationId);
      const isConversationParticipant = conversationParticipants.some(p => p.userId === userId);
      if (!isConversationParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const participant = await storage.updateMeetingParticipant(req.params.participantId, req.body);
      
      // Broadcast RSVP update to conversation participants
      await wsManager.broadcastRsvpUpdate(meeting.conversationId, req.params.meetingId, participant);
      
      res.json(participant);
    } catch (error) {
      console.error("Error updating meeting participant:", error);
      res.status(500).json({ message: "Failed to update meeting participant" });
    }
  });

  // Create meeting reminder
  app.post('/api/meetings/:meetingId/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      // Verify user is a conversation participant
      const conversationParticipants = await storage.getConversationParticipants(meeting.conversationId);
      const isConversationParticipant = conversationParticipants.some(p => p.userId === userId);
      if (!isConversationParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertMeetingReminderSchema.parse({
        ...req.body,
        meetingId: req.params.meetingId
      });

      const reminder = await storage.createMeetingReminder(validatedData);
      res.status(201).json(reminder);
    } catch (error: any) {
      console.error("Error creating meeting reminder:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid reminder data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create meeting reminder" });
    }
  });

  // ========================================
  // MESSAGE SEARCH ENDPOINTS
  // ========================================

  // Search user's messages
  app.get('/api/messages/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const query = req.query.q as string;
      if (!query || query.trim() === '') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const conversationId = req.query.conversationId as string | undefined;
      const { limit } = queryLimitSchema.parse(req.query);

      const messages = await storage.searchMessages(userId, query, { conversationId, limit });
      res.json(messages);
    } catch (error) {
      console.error("Error searching messages:", error);
      res.status(500).json({ message: "Failed to search messages" });
    }
  });

  // ========================================
  // MESSAGE TEMPLATE ENDPOINTS
  // ========================================

  // Create message template
  app.post('/api/message-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertMessageTemplateSchema.parse({
        ...req.body,
        userId
      });

      const template = await storage.createMessageTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating template:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  // Get user's message templates
  app.get('/api/message-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const templates = await storage.getUserMessageTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Update message template
  app.patch('/api/message-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const template = await storage.updateMessageTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // Delete message template
  app.delete('/api/message-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.deleteMessageTemplate(req.params.id);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // ========================================
  // CONVERSATION LABEL ENDPOINTS
  // ========================================

  // Add label to conversation
  app.post('/api/conversations/:conversationId/labels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertConversationLabelSchema.parse({
        ...req.body,
        conversationId: req.params.conversationId,
        userId
      });

      const label = await storage.addConversationLabel(validatedData);
      res.status(201).json(label);
    } catch (error: any) {
      console.error("Error adding label:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid label data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add label" });
    }
  });

  // Get conversation labels
  app.get('/api/conversations/:conversationId/labels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const labels = await storage.getConversationLabels(req.params.conversationId, userId);
      res.json(labels);
    } catch (error) {
      console.error("Error fetching labels:", error);
      res.status(500).json({ message: "Failed to fetch labels" });
    }
  });

  // Remove label
  app.delete('/api/conversation-labels/:labelId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.removeConversationLabel(req.params.labelId);
      res.json({ message: "Label removed successfully" });
    } catch (error) {
      console.error("Error removing label:", error);
      res.status(500).json({ message: "Failed to remove label" });
    }
  });

  // ========================================
  // CONVERSATION PREFERENCE ENDPOINTS
  // ========================================

  // Get conversation preferences
  app.get('/api/conversation-preferences/:conversationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const preferences = await storage.getConversationPreferences(userId, req.params.conversationId);
      res.json(preferences || {});
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // Update conversation preferences
  app.put('/api/conversation-preferences/:conversationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const preferences = await storage.upsertConversationPreferences({
        userId,
        conversationId: req.params.conversationId,
        ...req.body
      });
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // ========================================
  // CONVERSATION PIN ENDPOINTS
  // ========================================

  // Pin conversation
  app.post('/api/conversations/:conversationId/pin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user is a participant
      const participants = await storage.getConversationParticipants(req.params.conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const pin = await storage.pinConversation(userId, req.params.conversationId, req.body.displayOrder);
      res.status(201).json(pin);
    } catch (error) {
      console.error("Error pinning conversation:", error);
      res.status(500).json({ message: "Failed to pin conversation" });
    }
  });

  // Unpin conversation
  app.delete('/api/conversations/:conversationId/pin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.unpinConversation(userId, req.params.conversationId);
      res.json({ message: "Conversation unpinned successfully" });
    } catch (error) {
      console.error("Error unpinning conversation:", error);
      res.status(500).json({ message: "Failed to unpin conversation" });
    }
  });

  // Get pinned conversations
  app.get('/api/conversations/pinned', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const pins = await storage.getUserPinnedConversations(userId);
      res.json(pins);
    } catch (error) {
      console.error("Error fetching pinned conversations:", error);
      res.status(500).json({ message: "Failed to fetch pinned conversations" });
    }
  });

  // ========================================
  // ADMIN MESSAGING ENDPOINTS
  // ========================================

  // List all conversations (admin only)
  app.get('/api/admin/messaging/conversations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { limit } = queryLimitSchema.parse(req.query);
      
      // Get all conversations from database
      const allConversations = await db.select().from(conversations).limit(limit);
      res.json(allConversations);
    } catch (error) {
      console.error("Error fetching all conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // View any conversation (admin only)
  app.get('/api/admin/messaging/conversations/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const participants = await storage.getConversationParticipants(req.params.id);
      const messages = await storage.getConversationMessages(req.params.id, { limit: 100 });

      res.json({
        conversation,
        participants,
        messages
      });
    } catch (error) {
      console.error("Error fetching conversation details:", error);
      res.status(500).json({ message: "Failed to fetch conversation details" });
    }
  });

  // Moderate message (admin only)
  app.post('/api/admin/messaging/messages/:messageId/moderate', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const message = await storage.getMessage(req.params.messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      const action = await storage.createModerationAction({
        messageId: req.params.messageId,
        moderatedBy: userId,
        action: req.body.action,
        reason: req.body.reason
      });

      res.status(201).json(action);
    } catch (error) {
      console.error("Error moderating message:", error);
      res.status(500).json({ message: "Failed to moderate message" });
    }
  });

  // Get moderation history (admin only)
  app.get('/api/admin/messaging/messages/:messageId/moderation-history', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const history = await storage.getMessageModerationHistory(req.params.messageId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching moderation history:", error);
      res.status(500).json({ message: "Failed to fetch moderation history" });
    }
  });

  // Get messaging statistics (admin only)
  app.get('/api/admin/messaging/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get basic stats from database
      const [conversationCount] = await db.select({ count: count() }).from(conversations);
      const [messageCount] = await db.select({ count: count() }).from(messages);
      const [fileCount] = await db.select({ count: count() }).from(messageFiles);
      const [meetingCount] = await db.select({ count: count() }).from(meetingLinks);

      res.json({
        totalConversations: conversationCount.count,
        totalMessages: messageCount.count,
        totalFiles: fileCount.count,
        totalMeetings: meetingCount.count
      });
    } catch (error) {
      console.error("Error fetching messaging stats:", error);
      res.status(500).json({ message: "Failed to fetch messaging statistics" });
    }
  });

  // Get security statistics (admin only)
  app.get('/api/admin/security/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { loginHistory, activeSessions } = await import("@shared/schema");
      
      // Get total users
      const [userCount] = await db.select({ count: count() }).from(users);
      
      // Get total logins in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [loginCount] = await db.select({ count: count() })
        .from(loginHistory)
        .where(
          and(
            eq(loginHistory.action, 'login'),
            eq(loginHistory.success, true),
            sql`${loginHistory.timestamp} >= ${thirtyDaysAgo}`
          )
        );
      
      // Get failed logins in last 30 days
      const [failedLoginCount] = await db.select({ count: count() })
        .from(loginHistory)
        .where(
          and(
            eq(loginHistory.action, 'login'),
            eq(loginHistory.success, false),
            sql`${loginHistory.timestamp} >= ${thirtyDaysAgo}`
          )
        );
      
      // Get active sessions
      const [sessionCount] = await db.select({ count: count() }).from(activeSessions);

      res.json({
        totalUsers: userCount.count,
        totalLogins: loginCount.count,
        failedLogins: failedLoginCount.count,
        activeSessions: sessionCount.count
      });
    } catch (error) {
      console.error("Error fetching security stats:", error);
      res.status(500).json({ message: "Failed to fetch security statistics" });
    }
  });

  // ===========================
  // PORTFOLIO ROUTES
  // ===========================

  // GET /api/portfolio - Get consultant's completed projects for portfolio
  app.get('/api/portfolio', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get completed projects with reviews
      const portfolioProjects = await db
        .select({
          id: projects.id,
          title: projects.title,
          description: projects.description,
          completedAt: projects.completedAt,
          budget: projects.budget,
          rating: reviews.rating,
          reviewText: reviews.comment,
          clientName: sql<string>`trim(concat(coalesce(${users.firstName}, ''), ' ', coalesce(${users.lastName}, '')))`,
          category: categories.name,
        })
        .from(projects)
        .leftJoin(reviews, eq(reviews.projectId, projects.id))
        .leftJoin(users, eq(projects.clientId, users.id))
        .leftJoin(jobs, eq(projects.jobId, jobs.id))
        .leftJoin(categories, eq(jobs.categoryId, categories.id))
        .where(and(
          eq(projects.consultantId, userId),
          eq(projects.status, 'completed')
        ))
        .orderBy(desc(projects.completedAt))
        .limit(20);

      res.json(portfolioProjects);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // ===========================
  // DOCUMENTS ROUTES
  // ===========================

  // GET /api/documents - Get all documents for current user
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get all conversations the user is part of
      const userConversations = await storage.getUserConversations(userId);
      const conversationIds = userConversations.map(c => c.id);

      if (conversationIds.length === 0) {
        return res.json([]);
      }

      // Get all files from those conversations
      const files = await db.select({
        id: messageFiles.id,
        fileName: messageFiles.fileName,
        fileSize: messageFiles.fileSize,
        mimeType: messageFiles.mimeType,
        fileUrl: messageFiles.fileUrl,
        uploadedBy: messageFiles.uploadedBy,
        conversationId: messageFiles.conversationId,
        versionNumber: messageFiles.versionNumber,
        createdAt: messageFiles.createdAt,
      })
        .from(messageFiles)
        .where(inArray(messageFiles.conversationId, conversationIds))
        .orderBy(desc(messageFiles.createdAt))
        .limit(100);

      res.json(files);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // ===========================
  // ANALYTICS ROUTES
  // ===========================

  // GET /api/analytics/consultant - Get consultant analytics
  app.get('/api/analytics/consultant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get consultant metrics and stats
      const metrics = await storage.getConsultantMetrics(userId);
      const reviewStats = await storage.getReviewStats(userId);
      const consultantProfile = await storage.getConsultantProfile(userId);

      // Calculate total earnings from completed payments
      const [earningsResult] = await db.select({
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`
      })
        .from(payments)
        .where(and(
          eq(payments.toUserId, userId),
          eq(payments.status, 'completed')
        ));

      // Count active projects (accepted bids)
      const [activeBidsResult] = await db.select({ count: count() })
        .from(bids)
        .where(and(
          eq(bids.consultantId, userId),
          eq(bids.status, 'accepted')
        ));

      // Calculate bid success rate
      const [totalBidsResult] = await db.select({ count: count() })
        .from(bids)
        .where(eq(bids.consultantId, userId));

      const [acceptedBidsResult] = await db.select({ count: count() })
        .from(bids)
        .where(and(
          eq(bids.consultantId, userId),
          eq(bids.status, 'accepted')
        ));

      const bidSuccessRate = totalBidsResult.count > 0 
        ? (acceptedBidsResult.count / totalBidsResult.count) * 100 
        : 0;

      const analytics = {
        totalEarnings: earningsResult?.total || "0",
        completedProjects: metrics.completedProjects || 0,
        activeProjects: activeBidsResult?.count || 0,
        averageRating: reviewStats.averageRating || 0,
        totalReviews: reviewStats.totalReviews || 0,
        bidSuccessRate: bidSuccessRate,
        responseTime: consultantProfile?.responseTime || null,
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching consultant analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // GET /api/analytics/client - Get client analytics
  app.get('/api/analytics/client', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Count active jobs
      const [activeJobsResult] = await db.select({ count: count() })
        .from(jobs)
        .where(and(
          eq(jobs.clientId, userId),
          eq(jobs.status, 'open')
        ));

      // Count completed jobs
      const [completedJobsResult] = await db.select({ count: count() })
        .from(jobs)
        .where(and(
          eq(jobs.clientId, userId),
          eq(jobs.status, 'completed')
        ));

      // Count total bids on client's jobs
      const [totalBidsResult] = await db.select({ count: count() })
        .from(bids)
        .innerJoin(jobs, eq(bids.jobId, jobs.id))
        .where(eq(jobs.clientId, userId));

      // Calculate total spending (sum of completed payments)
      const [spendingResult] = await db.select({ 
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`
      })
        .from(payments)
        .where(and(
          eq(payments.fromUserId, userId),
          eq(payments.status, 'completed')
        ));

      // Calculate average project value
      const [avgValueResult] = await db.select({
        avg: sql<string>`COALESCE(AVG(${jobs.budget}), 0)`
      })
        .from(jobs)
        .where(and(
          eq(jobs.clientId, userId),
          eq(jobs.status, 'completed')
        ));

      const analytics = {
        totalSpending: spendingResult?.total || "0",
        activeProjects: activeJobsResult?.count || 0,
        completedProjects: completedJobsResult?.count || 0,
        totalBids: totalBidsResult?.count || 0,
        averageProjectValue: avgValueResult?.avg || "0",
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching client analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ============================================================================
  // SUPPORT TICKETS ROUTES
  // ============================================================================

  // User endpoints for support tickets
  
  // POST /api/support-tickets - Create a new support ticket
  app.post('/api/support-tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const ticketData = {
        ...req.body,
        userId,
        status: 'open',
      };

      const ticket = await storage.createSupportTicket(ticketData);
      
      // Send notification to admins
      const admins = await storage.getAdmins();
      for (const admin of admins) {
        await notificationService.createNotification({
          userId: admin.id,
          type: 'new_support_ticket',
          title: 'New Support Ticket',
          message: `New support ticket #${ticket.id.substring(0, 8)} from user`,
          relatedEntityType: 'support_ticket',
          relatedEntityId: ticket.id,
        });
      }

      res.json(ticket);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ message: 'Failed to create support ticket' });
    }
  });

  // GET /api/support-tickets - Get user's support tickets
  app.get('/api/support-tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { status, category } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (category) filters.category = category as string;

      const tickets = await storage.getUserSupportTickets(userId, filters);
      res.json(tickets);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
  });

  // GET /api/support-tickets/:id - Get a specific support ticket
  app.get('/api/support-tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Check authorization
      const user = await storage.getUser(userId);
      if (ticket.userId !== userId && user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Unauthorized access' });
      }

      res.json(ticket);
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      res.status(500).json({ message: 'Failed to fetch support ticket' });
    }
  });

  // POST /api/support-tickets/:id/messages - Add a message to a ticket
  app.post('/api/support-tickets/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Check authorization
      const user = await storage.getUser(userId);
      const isStaff = user?.role === 'super_admin';
      
      if (ticket.userId !== userId && !isStaff) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }

      const message = await storage.addTicketMessage({
        ticketId: req.params.id,
        senderId: userId,
        message: req.body.message,
        isStaffReply: isStaff,
        isInternal: false,
      });

      // Send notification to the other party
      const recipientId = isStaff ? ticket.userId : (ticket.assignedTo || null);
      if (recipientId) {
        await notificationService.createNotification({
          userId: recipientId,
          type: 'ticket_update',
          title: 'Support Ticket Update',
          message: `New message on ticket #${ticket.id.substring(0, 8)}`,
          relatedEntityType: 'support_ticket',
          relatedEntityId: ticket.id,
        });
      }

      res.json(message);
    } catch (error) {
      console.error('Error adding ticket message:', error);
      res.status(500).json({ message: 'Failed to add message' });
    }
  });

  // GET /api/support-tickets/:id/messages - Get ticket messages
  app.get('/api/support-tickets/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Check authorization
      const user = await storage.getUser(userId);
      if (ticket.userId !== userId && user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Unauthorized access' });
      }

      const messages = await storage.getTicketMessages(req.params.id);
      
      // Filter out internal notes for non-staff users
      const filteredMessages = user?.role === 'super_admin' 
        ? messages 
        : messages.filter(m => !m.isInternal);

      res.json(filteredMessages);
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // POST /api/support-tickets/:id/rate - Rate a resolved/closed ticket
  app.post('/api/support-tickets/:id/rate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { rating, comment } = req.body;

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      const ticket = await storage.rateSupportTicket(req.params.id, userId, rating, comment);
      res.json(ticket);
    } catch (error: any) {
      console.error('Error rating ticket:', error);
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({ 
        message: error.message || 'Failed to rate ticket' 
      });
    }
  });

  // Admin endpoints for support tickets

  // GET /api/admin/support-tickets - Get all support tickets (admin only)
  app.get('/api/admin/support-tickets', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status, category, priority, assignedTo } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (category) filters.category = category as string;
      if (priority) filters.priority = priority as string;
      if (assignedTo) filters.assignedTo = assignedTo as string;

      const tickets = await storage.getAllSupportTickets(filters);
      res.json(tickets);
    } catch (error) {
      console.error('Error fetching all support tickets:', error);
      res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
  });

  // PATCH /api/admin/support-tickets/:id/status - Update ticket status (admin only)
  app.patch('/api/admin/support-tickets/:id/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const ticket = await storage.updateSupportTicketStatus(req.params.id, status);
      
      // Notify user of status change
      await notificationService.createNotification({
        userId: ticket.userId,
        type: 'ticket_status_update',
        title: 'Support Ticket Status Updated',
        message: `Your support ticket #${ticket.id.substring(0, 8)} is now ${status}`,
        relatedEntityType: 'support_ticket',
        relatedEntityId: ticket.id,
      });

      res.json(ticket);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({ message: 'Failed to update ticket status' });
    }
  });

  // POST /api/admin/support-tickets/:id/assign - Assign ticket to admin (admin only)
  app.post('/api/admin/support-tickets/:id/assign', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = getUserIdFromRequest(req);
      if (!adminId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const ticket = await storage.assignSupportTicket(req.params.id, adminId);
      
      // Notify user that ticket is being worked on
      await notificationService.createNotification({
        userId: ticket.userId,
        type: 'ticket_assigned',
        title: 'Support Ticket Assigned',
        message: `Your support ticket #${ticket.id.substring(0, 8)} has been assigned to our support team`,
        relatedEntityType: 'support_ticket',
        relatedEntityId: ticket.id,
      });

      res.json(ticket);
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({ message: 'Failed to assign ticket' });
    }
  });

  // POST /api/admin/support-tickets/:id/internal-note - Add internal note (admin only)
  app.post('/api/admin/support-tickets/:id/internal-note', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = getUserIdFromRequest(req);
      if (!adminId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { message } = req.body;

      const note = await storage.addInternalTicketNote(req.params.id, adminId, message);
      res.json(note);
    } catch (error) {
      console.error('Error adding internal note:', error);
      res.status(500).json({ message: 'Failed to add internal note' });
    }
  });

  // ============================================================================
  // PLATFORM FEEDBACK ROUTES
  // ============================================================================

  // POST /api/feedback - Submit platform feedback
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const feedbackData = {
        ...req.body,
        userId,
        status: 'pending',
      };

      const feedback = await storage.createPlatformFeedback(feedbackData);
      res.json(feedback);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ message: 'Failed to submit feedback' });
    }
  });

  // GET /api/feedback - Get user's feedback submissions
  app.get('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const feedback = await storage.getUserFeedback(userId);
      res.json(feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ message: 'Failed to fetch feedback' });
    }
  });

  // GET /api/admin/feedback - Get all feedback (admin only)
  app.get('/api/admin/feedback', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { feedbackType, status, category } = req.query;
      const filters: any = {};
      if (feedbackType) filters.feedbackType = feedbackType as string;
      if (status) filters.status = status as string;
      if (category) filters.category = category as string;

      const feedback = await storage.getAllFeedback(filters);
      res.json(feedback);
    } catch (error) {
      console.error('Error fetching all feedback:', error);
      res.status(500).json({ message: 'Failed to fetch feedback' });
    }
  });

  // PATCH /api/admin/feedback/:id - Update feedback status (admin only)
  app.patch('/api/admin/feedback/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = getUserIdFromRequest(req);
      if (!adminId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { status, adminNotes } = req.body;

      const feedback = await storage.updateFeedbackStatus(
        req.params.id,
        status,
        adminId,
        adminNotes
      );

      res.json(feedback);
    } catch (error) {
      console.error('Error updating feedback:', error);
      res.status(500).json({ message: 'Failed to update feedback' });
    }
  });

  // ============================================================================
  // FEATURE SUGGESTIONS ROUTES
  // ============================================================================

  // POST /api/feature-suggestions - Submit a feature suggestion
  app.post('/api/feature-suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const suggestionData = {
        ...req.body,
        userId,
        status: 'pending',
        voteCount: 0,
      };

      const suggestion = await storage.createFeatureSuggestion(suggestionData);
      
      // Auto-vote for own suggestion
      await storage.voteForFeature(suggestion.id, userId);

      res.json(suggestion);
    } catch (error) {
      console.error('Error creating feature suggestion:', error);
      res.status(500).json({ message: 'Failed to create feature suggestion' });
    }
  });

  // GET /api/feature-suggestions - Get all feature suggestions
  app.get('/api/feature-suggestions', async (req: any, res) => {
    try {
      const { status, category } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (category) filters.category = category as string;

      const suggestions = await storage.getAllFeatureSuggestions(filters);
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching feature suggestions:', error);
      res.status(500).json({ message: 'Failed to fetch feature suggestions' });
    }
  });

  // POST /api/feature-suggestions/:id/vote - Vote for a feature
  app.post('/api/feature-suggestions/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.voteForFeature(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error voting for feature:', error);
      res.status(500).json({ message: 'Failed to vote for feature' });
    }
  });

  // DELETE /api/feature-suggestions/:id/vote - Unvote for a feature
  app.delete('/api/feature-suggestions/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.unvoteForFeature(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unvoting for feature:', error);
      res.status(500).json({ message: 'Failed to unvote for feature' });
    }
  });

  // PATCH /api/admin/feature-suggestions/:id - Update feature suggestion status (admin only)
  app.patch('/api/admin/feature-suggestions/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = getUserIdFromRequest(req);
      if (!adminId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { status, adminResponse } = req.body;

      const suggestion = await storage.updateFeatureSuggestionStatus(
        req.params.id,
        status,
        adminId,
        adminResponse
      );

      res.json(suggestion);
    } catch (error) {
      console.error('Error updating feature suggestion:', error);
      res.status(500).json({ message: 'Failed to update feature suggestion' });
    }
  });

  // ============================================================================
  // SURVEYS ROUTES
  // ============================================================================

  // GET /api/surveys/active - Get active surveys for user
  app.get('/api/surveys/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      const targetAudience = user?.role === 'consultant' ? 'consultants' : 
                            user?.role === 'client' ? 'clients' : 'all';

      const surveys = await storage.getActiveSurveys(targetAudience);
      res.json(surveys);
    } catch (error) {
      console.error('Error fetching active surveys:', error);
      res.status(500).json({ message: 'Failed to fetch surveys' });
    }
  });

  // POST /api/surveys/:id/respond - Submit survey response
  app.post('/api/surveys/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { answers } = req.body;

      const response = await storage.submitSurveyResponse({
        surveyId: req.params.id,
        userId,
        answers,
      });

      res.json(response);
    } catch (error) {
      console.error('Error submitting survey response:', error);
      res.status(500).json({ message: 'Failed to submit survey response' });
    }
  });

  // Admin survey endpoints

  // POST /api/admin/surveys - Create a new survey (admin only)
  app.post('/api/admin/surveys', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = getUserIdFromRequest(req);
      if (!adminId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const surveyData = {
        ...req.body,
        createdBy: adminId,
        status: 'active',
        responseCount: 0,
      };

      const survey = await storage.createSurvey(surveyData);
      res.json(survey);
    } catch (error) {
      console.error('Error creating survey:', error);
      res.status(500).json({ message: 'Failed to create survey' });
    }
  });

  // GET /api/admin/surveys/:id/responses - Get survey responses (admin only)
  app.get('/api/admin/surveys/:id/responses', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const responses = await storage.getSurveyResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error('Error fetching survey responses:', error);
      res.status(500).json({ message: 'Failed to fetch survey responses' });
    }
  });

  // ============================================================================
  // BETA OPT-IN ROUTES
  // ============================================================================

  // POST /api/beta/opt-in - Opt in to beta features
  app.post('/api/beta/opt-in', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { featureName } = req.body;

      const optIn = await storage.optInToBeta(userId, featureName);
      res.json(optIn);
    } catch (error) {
      console.error('Error opting in to beta:', error);
      res.status(500).json({ message: 'Failed to opt in to beta' });
    }
  });

  // POST /api/beta/opt-out - Opt out of beta features
  app.post('/api/beta/opt-out', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { featureName } = req.body;

      await storage.optOutOfBeta(userId, featureName);
      res.json({ success: true });
    } catch (error) {
      console.error('Error opting out of beta:', error);
      res.status(500).json({ message: 'Failed to opt out of beta' });
    }
  });

  // GET /api/beta/my-opt-ins - Get user's beta opt-ins
  app.get('/api/beta/my-opt-ins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const optIns = await storage.getUserBetaOptIns(userId);
      res.json(optIns);
    } catch (error) {
      console.error('Error fetching beta opt-ins:', error);
      res.status(500).json({ message: 'Failed to fetch beta opt-ins' });
    }
  });

  // Register payment and escrow routes
  registerPaymentRoutes(app, {
    storage,
    notificationService,
    isAuthenticated,
    requireEmailVerified,
    getUserIdFromRequest,
    isAdmin,
  });

  const httpServer = createServer(app);

  // Initialize WebSocket server
  wsManager.initialize(httpServer);

  return httpServer;
}
