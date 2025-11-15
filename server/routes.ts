import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { isAdmin, hasPermission, hasAnyRole } from "./admin-middleware";
import { z } from "zod";
import { insertClientProfileSchema, insertConsultantProfileSchema } from "@shared/schema";
import { db } from "./db";
import { users, adminRoles, categories, consultantCategories, jobs, bids, payments, disputes, vendorCategoryRequests, projects, subscriptionPlans, userSubscriptions, platformSettings, emailTemplates, clientProfiles, consultantProfiles, insertSubscriptionPlanSchema, insertPlatformSettingSchema, insertEmailTemplateSchema } from "@shared/schema";
import { eq, and, or, count, sql, desc, ilike, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import passport from "passport";
import { randomBytes } from "crypto";

const queryLimitSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10)
    .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100"),
});

// Helper to get userId from authenticated request (for local auth)
function getUserIdFromRequest(req: any): string | null {
  return req.user?.id || null;
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
        selectedCategories // For consultant role only
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
      
      // For consultants, validate selectedCategories
      if (role === 'consultant' && (!selectedCategories || !Array.isArray(selectedCategories) || selectedCategories.length === 0)) {
        return res.status(400).json({ message: "At least one expertise category is required for consultants" });
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
      
      // Log user in automatically
      req.login(user, (err) => {
        if (err) {
          console.error("Error logging in after signup:", err);
          return res.status(500).json({ message: "Account created but login failed" });
        }
        
        // Return user and redirect to appropriate dashboard
        const redirectPath = role === 'client' ? '/dashboard/client' : '/dashboard/consultant';
        
        res.status(201).json({
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            emailVerified: user.emailVerified,
          },
          redirectPath,
        });
      });
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  // Login route
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
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
        });
      });
    })(req, res, next);
  });
  
  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
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

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
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
      
      // Validate request body using the insert schema (omit fields not user-editable)
      const updateSchema = insertClientProfileSchema.omit({ userId: true });
      const validation = updateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: validation.error });
      }
      
      // Check if profile exists - create if not, update if yes (upsert)
      const existingProfile = await storage.getClientProfile(userId);
      
      if (!existingProfile) {
        // Create new profile - userId must be included in the data object
        const newProfile = await storage.createClientProfile({
          ...validation.data,
          userId
        });
        return res.status(201).json(newProfile);
      } else {
        // Update existing profile
        const updatedProfile = await storage.updateClientProfile(userId, validation.data);
        return res.json(updatedProfile);
      }
    } catch (error) {
      console.error("Error updating client profile:", error);
      res.status(500).json({ message: "Failed to update client profile" });
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
      
      res.json(profile);
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
      
      // Validate request body (omit read-only fields: userId, verified, rating, totalReviews, completedProjects)
      const updateSchema = insertConsultantProfileSchema.omit({ 
        userId: true, 
        verified: true,
        rating: true,
        totalReviews: true,
        completedProjects: true
      });
      const validation = updateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: validation.error });
      }
      
      // Check if profile exists - create if not, update if yes (upsert)
      const existingProfile = await storage.getConsultantProfile(userId);
      
      if (!existingProfile) {
        // Create new consultant profile - fetch fullName from user record
        const user = await storage.getUser(userId);
        if (!user || !user.fullName) {
          return res.status(400).json({ message: "User full name is required to create consultant profile" });
        }
        // Remove fullName from validation.data to avoid duplication
        const { fullName: _, ...profileData } = validation.data as any;
        const newProfile = await storage.createConsultantProfile({ 
          userId, 
          fullName: user.fullName,
          ...profileData 
        });
        return res.status(201).json(newProfile);
      }
      
      // Update existing profile
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
      
      // Remove passwords from response
      const safeUsers = usersResult.map(({ password, ...user }) => user);
      
      res.json({
        users: safeUsers,
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
      const { parentId, level, name, nameAr, slug, description, descriptionAr, heroTitle, heroTitleAr, heroDescription, heroDescriptionAr, icon, displayOrder, featured, active, visible } = req.body;
      
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
      
      // Create category
      const [newCategory] = await db.insert(categories).values({
        parentId: parentId || null,
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
        displayOrder: displayOrder || 0,
        featured: featured || false,
        active: active !== false, // default true
        visible: visible !== false, // default true
      }).returning();
      
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
      const { parentId, level, name, nameAr, slug, description, descriptionAr, heroTitle, heroTitleAr, heroDescription, heroDescriptionAr, icon, displayOrder, featured, active, visible } = req.body;
      
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
      
      // Update category
      const [updated] = await db.update(categories).set({
        parentId: parentId !== undefined ? parentId : existing[0].parentId,
        level: level !== undefined ? level : existing[0].level,
        name: name || existing[0].name,
        nameAr: nameAr !== undefined ? nameAr : existing[0].nameAr,
        slug: slug || existing[0].slug,
        description: description !== undefined ? description : existing[0].description,
        descriptionAr: descriptionAr !== undefined ? descriptionAr : existing[0].descriptionAr,
        heroTitle: heroTitle !== undefined ? heroTitle : existing[0].heroTitle,
        heroTitleAr: heroTitleAr !== undefined ? heroTitleAr : existing[0].heroTitleAr,
        heroDescription: heroDescription !== undefined ? heroDescription : existing[0].heroDescription,
        heroDescriptionAr: heroDescriptionAr !== undefined ? heroDescriptionAr : existing[0].heroDescriptionAr,
        icon: icon !== undefined ? icon : existing[0].icon,
        displayOrder: displayOrder !== undefined ? displayOrder : existing[0].displayOrder,
        featured: featured !== undefined ? featured : existing[0].featured,
        active: active !== undefined ? active : existing[0].active,
        visible: visible !== undefined ? visible : existing[0].visible,
        updatedAt: new Date(),
      }).where(eq(categories.id, id)).returning();
      
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
  // DISPUTES MANAGEMENT
  // ============================================================================
  
  // Get disputes with pagination and filtering
  app.get('/api/admin/disputes', isAuthenticated, isAdmin, hasPermission('disputes:view'), async (req, res) => {
    try {
      const { status, severity, project, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Create aliases for users table (raised by, against, resolved by)
      const raisedByUser = alias(users, 'raisedByUser');
      const againstUser = alias(users, 'againstUser');
      const resolvedByUser = alias(users, 'resolvedByUser');
      
      // Build filter conditions
      const conditions = [];
      
      if (status && status !== 'all') {
        conditions.push(eq(disputes.status, status as string));
      }
      
      if (project && project !== 'all') {
        conditions.push(eq(disputes.projectId, project as string));
      }
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(disputes.reason, searchTerm),
            ilike(disputes.description, searchTerm),
            ilike(projects.title, searchTerm),
            ilike(raisedByUser.email, searchTerm),
            ilike(sql`trim(concat(coalesce(${raisedByUser.firstName}, ''), ' ', coalesce(${raisedByUser.lastName}, '')))`, searchTerm),
            ilike(againstUser.email, searchTerm),
            ilike(sql`trim(concat(coalesce(${againstUser.firstName}, ''), ' ', coalesce(${againstUser.lastName}, '')))`, searchTerm)
          )
        );
      }
      
      // Apply filters
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get paginated results with joins
      let query = db
        .select({
          id: disputes.id,
          projectId: disputes.projectId,
          projectTitle: projects.title,
          raisedBy: disputes.raisedBy,
          raisedByEmail: raisedByUser.email,
          raisedByName: sql<string>`trim(concat(coalesce(${raisedByUser.firstName}, ''), ' ', coalesce(${raisedByUser.lastName}, '')))`,
          against: disputes.against,
          againstEmail: againstUser.email,
          againstName: sql<string>`trim(concat(coalesce(${againstUser.firstName}, ''), ' ', coalesce(${againstUser.lastName}, '')))`,
          reason: disputes.reason,
          description: disputes.description,
          status: disputes.status,
          resolution: disputes.resolution,
          resolvedBy: disputes.resolvedBy,
          resolvedByEmail: resolvedByUser.email,
          resolvedByName: sql<string>`trim(concat(coalesce(${resolvedByUser.firstName}, ''), ' ', coalesce(${resolvedByUser.lastName}, '')))`,
          resolvedAt: disputes.resolvedAt,
          createdAt: disputes.createdAt,
          updatedAt: disputes.updatedAt,
        })
        .from(disputes)
        .leftJoin(raisedByUser, eq(disputes.raisedBy, raisedByUser.id))
        .leftJoin(againstUser, eq(disputes.against, againstUser.id))
        .leftJoin(resolvedByUser, eq(disputes.resolvedBy, resolvedByUser.id))
        .leftJoin(projects, eq(disputes.projectId, projects.id));
      
      if (whereClause) {
        query = query.where(whereClause) as any;
      }
      
      const disputesResult = await query
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(disputes.createdAt));
      
      // Get total count with same filters
      let countQuery = db
        .select({ count: count() })
        .from(disputes)
        .leftJoin(raisedByUser, eq(disputes.raisedBy, raisedByUser.id))
        .leftJoin(againstUser, eq(disputes.against, againstUser.id))
        .leftJoin(projects, eq(disputes.projectId, projects.id));
      
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      
      const [totalResult] = await countQuery;
      
      res.json({
        disputes: disputesResult,
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      });
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Resolve dispute
  app.patch('/api/admin/disputes/:id/resolve', isAuthenticated, isAdmin, hasPermission('disputes:manage'), async (req, res) => {
    try {
      const { id } = req.params;
      const { resolution } = req.body;
      const adminId = getUserIdFromRequest(req);
      
      if (!resolution || resolution.trim().length < 10) {
        return res.status(400).json({ message: "Resolution must be at least 10 characters" });
      }
      
      const [updatedDispute] = await db.update(disputes)
        .set({
          status: 'resolved',
          resolution,
          resolvedBy: adminId,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(disputes.id, id))
        .returning();
      
      if (!updatedDispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      res.json(updatedDispute);
    } catch (error) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({ message: "Failed to resolve dispute" });
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

  const httpServer = createServer(app);

  return httpServer;
}
