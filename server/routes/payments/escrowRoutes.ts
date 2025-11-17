import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../../storage";

// Validation schemas for request bodies
const depositSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places"),
  description: z.string().optional(),
});

const releaseSchema = z.object({
  description: z.string().optional(),
});

const partialReleaseSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places"),
  description: z.string().optional(),
});

const holdSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places"),
  reason: z.string().min(1, "Reason is required"),
});

const refundSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places"),
  reason: z.string().min(1, "Reason is required"),
});

const paymentRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places"),
  description: z.string().min(1, "Description is required"),
  milestoneIndex: z.number().int().positive().optional(),
});

interface RouteBuilderDeps {
  storage: IStorage;
  isAuthenticated: any;
  requireEmailVerified: any;
  getUserIdFromRequest: (req: any) => string | null;
  isAdmin: any;
}

// Project-scoped escrow routes
export function buildEscrowRouter(deps: RouteBuilderDeps) {
  const router = Router();
  const { storage, isAuthenticated, requireEmailVerified, getUserIdFromRequest } = deps;

  // POST /:projectId/escrow/deposit - Client deposits funds to escrow (mock)
  router.post('/:projectId/escrow/deposit', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;
      const parsed = depositSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { amount, description } = parsed.data;

      // Verify project exists and user is the client
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId) {
        return res.status(403).json({ message: "Only the project client can deposit funds" });
      }

      // Get or create escrow account
      let escrowAccount = await storage.getEscrowAccountByProject(projectId);
      if (!escrowAccount) {
        escrowAccount = await storage.createEscrowAccount({
          projectId,
          totalAmount: '0.00',
          availableBalance: '0.00',
          onHoldAmount: '0.00',
          releasedAmount: '0.00',
          refundedAmount: '0.00',
          currency: 'SAR',
          status: 'active',
        });
      }

      // Mock deposit (in production, this would integrate with payment gateway)
      await storage.depositToEscrow(escrowAccount.id, amount, userId, description);

      res.json({ 
        message: "Funds deposited to escrow successfully (mock)",
        escrowAccount: await storage.getEscrowAccountByProject(projectId)
      });
    } catch (error: any) {
      console.error("Error depositing to escrow:", error);
      res.status(500).json({ message: error.message || "Failed to deposit funds" });
    }
  });

  // POST /api/projects/:projectId/escrow/release - Client releases full payment to consultant
  router.post('/:projectId/escrow/release', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;
      const parsed = releaseSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { description } = parsed.data;

      // Get escrow account
      const escrowAccount = await storage.getEscrowAccountByProject(projectId);
      if (!escrowAccount) {
        return res.status(404).json({ message: "Escrow account not found" });
      }

      // Release funds (ownership verification happens in storage layer)
      await storage.releaseFromEscrow(escrowAccount.id, userId, description || 'Full payment release');

      res.json({ 
        message: "Payment released successfully",
        escrowAccount: await storage.getEscrowAccountByProject(projectId)
      });
    } catch (error: any) {
      console.error("Error releasing escrow:", error);
      res.status(500).json({ message: error.message || "Failed to release payment" });
    }
  });

  // POST /api/projects/:projectId/escrow/partial-release - Release partial payment (milestone)
  router.post('/:projectId/escrow/partial-release', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;
      const parsed = partialReleaseSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { amount, description } = parsed.data;

      // Get escrow account
      const escrowAccount = await storage.getEscrowAccountByProject(projectId);
      if (!escrowAccount) {
        return res.status(404).json({ message: "Escrow account not found" });
      }

      // Partial release (ownership verification happens in storage layer)
      await storage.partialReleaseFromEscrow(escrowAccount.id, amount, userId, description || 'Partial payment release');

      res.json({ 
        message: "Partial payment released successfully",
        escrowAccount: await storage.getEscrowAccountByProject(projectId)
      });
    } catch (error: any) {
      console.error("Error releasing partial escrow:", error);
      res.status(500).json({ message: error.message || "Failed to release partial payment" });
    }
  });

  // POST /api/projects/:projectId/escrow/hold - Put funds on hold
  router.post('/:projectId/escrow/hold', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;
      const parsed = holdSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { amount, reason } = parsed.data;

      // Get escrow account
      const escrowAccount = await storage.getEscrowAccountByProject(projectId);
      if (!escrowAccount) {
        return res.status(404).json({ message: "Escrow account not found" });
      }

      // Hold funds (ownership verification happens in storage layer)
      await storage.holdEscrowFunds(escrowAccount.id, amount, reason, userId);

      res.json({ 
        message: "Funds placed on hold successfully",
        escrowAccount: await storage.getEscrowAccountByProject(projectId)
      });
    } catch (error: any) {
      console.error("Error holding escrow funds:", error);
      res.status(500).json({ message: error.message || "Failed to hold funds" });
    }
  });

  // GET /api/projects/:projectId/escrow - Get escrow account status
  router.get('/:projectId/escrow', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;

      // Verify user has access to this project
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const escrowAccount = await storage.getEscrowAccountByProject(projectId);
      if (!escrowAccount) {
        return res.status(404).json({ message: "Escrow account not found" });
      }

      res.json(escrowAccount);
    } catch (error: any) {
      console.error("Error getting escrow account:", error);
      res.status(500).json({ message: error.message || "Failed to get escrow account" });
    }
  });

  // GET /api/projects/:projectId/escrow/transactions - Get escrow transaction history
  router.get('/:projectId/escrow/transactions', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;

      // Verify user has access to this project
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const escrowAccount = await storage.getEscrowAccountByProject(projectId);
      if (!escrowAccount) {
        return res.status(404).json({ message: "Escrow account not found" });
      }

      const transactions = await storage.getEscrowTransactions(escrowAccount.id);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error getting escrow transactions:", error);
      res.status(500).json({ message: error.message || "Failed to get transactions" });
    }
  });

  // POST /api/projects/:projectId/escrow/refund - Request refund from escrow
  router.post('/:projectId/escrow/refund', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;
      const parsed = refundSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { amount, reason } = parsed.data;

      // Get escrow account
      const escrowAccount = await storage.getEscrowAccountByProject(projectId);
      if (!escrowAccount) {
        return res.status(404).json({ message: "Escrow account not found" });
      }

      // Refund from escrow (ownership verification happens in storage layer)
      await storage.refundFromEscrow(escrowAccount.id, amount, reason, userId);

      res.json({ 
        message: "Refund processed successfully",
        escrowAccount: await storage.getEscrowAccountByProject(projectId)
      });
    } catch (error: any) {
      console.error("Error processing refund:", error);
      res.status(500).json({ message: error.message || "Failed to process refund" });
    }
  });

  // POST /:projectId/payment-request - Consultant requests payment
  router.post('/:projectId/payment-request', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;
      const parsed = paymentRequestSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { amount, description, milestoneIndex } = parsed.data;

      // Verify project exists and user is the consultant
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.consultantId !== userId) {
        return res.status(403).json({ message: "Only the project consultant can request payment" });
      }

      // Create payment milestone if milestoneIndex provided
      let paymentMilestone;
      if (milestoneIndex !== undefined && typeof milestoneIndex === 'number') {
        paymentMilestone = await storage.linkMilestoneToPayment(projectId, milestoneIndex, amount);
      }

      // In production, this would create a notification for the client
      res.json({ 
        message: "Payment request submitted successfully",
        paymentMilestone
      });
    } catch (error: any) {
      console.error("Error requesting payment:", error);
      res.status(500).json({ message: error.message || "Failed to request payment" });
    }
  });

  return router;
}

// Global escrow routes
export function buildGlobalEscrowRouter(deps: RouteBuilderDeps) {
  const router = Router();
  const { storage, isAuthenticated, getUserIdFromRequest, isAdmin } = deps;

  // GET /balance - Get user's total escrow balance
  router.get('/balance', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get all projects for this user (as client or consultant)
      // Get vendor or client data based on role
      const consultantProfile = await storage.getConsultantProfile(userId);
      const clientProfile = await storage.getClientProfile(userId);

      let totalInEscrow = 0;
      let totalReleased = 0;
      let totalHeld = 0;
      let projectCount = 0;

      if (consultantProfile) {
        const earnings = await storage.getVendorEarnings(userId);
        totalInEscrow = parseFloat(earnings.pendingPayments || '0');
        totalReleased = parseFloat(earnings.releasedAmount || '0');
        projectCount = earnings.projectCount || 0;
      }

      if (clientProfile) {
        const spending = await storage.getClientSpending(userId);
        totalInEscrow += parseFloat(spending.inEscrow || '0');
        totalReleased += parseFloat(spending.releasedAmount || '0');
        projectCount = Math.max(projectCount, spending.projectCount || 0);
      }

      res.json({
        totalInEscrow: totalInEscrow.toFixed(2),
        totalReleased: totalReleased.toFixed(2),
        totalHeld: totalHeld.toFixed(2),
        projectCount,
        currency: 'SAR'
      });
    } catch (error: any) {
      console.error("Error getting escrow balance:", error);
      res.status(500).json({ message: error.message || "Failed to get escrow balance" });
    }
  });

  // GET /admin/analytics - Platform-wide escrow analytics (admin only)
  router.get('/admin/analytics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const analytics = await storage.getEscrowAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error("Error getting escrow analytics:", error);
      res.status(500).json({ message: error.message || "Failed to get analytics" });
    }
  });

  return router;
}
