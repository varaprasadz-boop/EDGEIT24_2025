import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { insertClientProfileSchema, insertConsultantProfileSchema } from "@shared/schema";

const queryLimitSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10)
    .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100"),
});

// Helper to get userId from authenticated request
async function getUserIdFromRequest(req: any): Promise<string | null> {
  const email = req.user?.claims?.email;
  const replitSub = req.user?.claims?.sub;
  
  // Look up user by replitSub first, then email
  let user = replitSub ? await storage.getUserByReplitSub(replitSub) : null;
  
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  
  if (!user && replitSub) {
    // Fallback for users created with sub as ID (legacy)
    user = await storage.getUser(replitSub);
  }
  
  return user?.id || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const email = req.user.claims.email;
      const replitSub = req.user.claims.sub;
      
      // Look up user by replitSub first, then email, then sub (for legacy)
      let user = replitSub ? await storage.getUserByReplitSub(replitSub) : null;
      
      if (!user && email) {
        user = await storage.getUserByEmail(email);
      }
      
      if (!user && replitSub) {
        // Fallback for users created with sub as ID (legacy)
        user = await storage.getUser(replitSub);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch associated profiles
      const clientProfile = await storage.getClientProfile(user.id);
      const consultantProfile = await storage.getConsultantProfile(user.id);

      res.json({
        ...user,
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
      const userId = await getUserIdFromRequest(req);
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
      const userId = await getUserIdFromRequest(req);
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
      const userId = await getUserIdFromRequest(req);
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
      const userId = await getUserIdFromRequest(req);
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
      const userId = await getUserIdFromRequest(req);
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
      const userId = await getUserIdFromRequest(req);
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
        // Create new profile
        const newProfile = await storage.createClientProfile(userId, validation.data);
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
      const userId = await getUserIdFromRequest(req);
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
      const userId = await getUserIdFromRequest(req);
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

  const httpServer = createServer(app);

  return httpServer;
}
