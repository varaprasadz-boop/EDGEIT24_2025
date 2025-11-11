import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

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

  // Profile endpoints will be added later
  // Job endpoints will be added later
  // Bid endpoints will be added later

  const httpServer = createServer(app);

  return httpServer;
}
