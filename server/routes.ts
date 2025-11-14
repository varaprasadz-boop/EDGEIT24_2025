import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { isAdmin, hasPermission, hasAnyRole } from "./admin-middleware";
import { z } from "zod";
import { insertClientProfileSchema, insertConsultantProfileSchema } from "@shared/schema";
import { db } from "./db";
import { users, adminRoles, categories, jobs, bids, payments, disputes } from "@shared/schema";
import { eq, and, count, sql, desc } from "drizzle-orm";
import passport from "passport";

const queryLimitSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10)
    .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100"),
});

// Helper to get userId from authenticated request (for local auth)
function getUserIdFromRequest(req: any): string | null {
  return req.user?.id || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Auth routes
  
  // Signup route
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, role } = req.body;
      
      // Validation
      if (!email || !password || !role) {
        return res.status(400).json({ message: "Email, password, and role are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      if (role !== 'client' && role !== 'consultant') {
        return res.status(400).json({ message: "Role must be either 'client' or 'consultant'" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const user = await storage.upsertUser({
        email,
        password: hashedPassword,
        role,
        authProvider: 'local',
        emailVerified: false,
      });
      
      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error("Error logging in after signup:", err);
          return res.status(500).json({ message: "Account created but login failed" });
        }
        
        // Return user and onboarding redirect path
        const redirectPath = role === 'client' ? '/profile/client?onboarding=true' : '/profile/consultant?onboarding=true';
        
        res.status(201).json({
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
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

  // Job endpoints
  app.get('/api/jobs', isAuthenticated, async (req: any, res) => {
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
      const jobs = await storage.listClientJobs(userId, limit);
      res.json({ jobs, total: jobs.length });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
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
      const updateSchema = insertClientProfileSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
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
      
      // Validate request body (omit read-only fields: id, userId, verified, rating, totalReviews, completedProjects, createdAt, updatedAt)
      const updateSchema = insertConsultantProfileSchema.omit({ 
        id: true, 
        userId: true, 
        verified: true,
        rating: true,
        totalReviews: true,
        completedProjects: true,
        createdAt: true, 
        updatedAt: true 
      });
      const validation = updateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: validation.error });
      }
      
      // Check if profile exists - create if not, update if yes (upsert)
      const existingProfile = await storage.getConsultantProfile(userId);
      
      if (!existingProfile) {
        // Create new consultant profile
        const newProfile = await storage.createConsultantProfile({ userId, ...validation.data });
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

  const httpServer = createServer(app);

  return httpServer;
}
