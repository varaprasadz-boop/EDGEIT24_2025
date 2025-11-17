import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../../storage";

// Validation schemas
const addFundsSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number"),
  description: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number"),
  description: z.string().optional(),
});

const payProjectSchema = z.object({
  projectId: z.string(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number"),
  description: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  preferredMethod: z.string().optional(),
  autoWithdrawal: z.boolean().optional(),
  minimumBalance: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
});

interface RouteBuilderDeps {
  storage: IStorage;
  isAuthenticated: any;
  requireEmailVerified: any;
  getUserIdFromRequest: (req: any) => string | null;
}

export function buildWalletRouter(deps: RouteBuilderDeps) {
  const router = Router();
  const { storage, isAuthenticated, requireEmailVerified, getUserIdFromRequest } = deps;

  // GET /api/wallet - Get user's wallet account
  router.get('/', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let wallet = await storage.getWalletAccount(userId);
      
      // Create wallet if doesn't exist
      if (!wallet) {
        wallet = await storage.createWalletAccount({
          userId,
          balance: '0.00',
          currency: 'SAR',
        });
      }

      res.json(wallet);
    } catch (error: any) {
      console.error("Error getting wallet:", error);
      res.status(500).json({ message: error.message || "Failed to get wallet" });
    }
  });

  // POST /api/wallet/add-funds - Add funds to wallet (mock)
  router.post('/add-funds', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const parsed = addFundsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { amount, description } = parsed.data;

      // Mock add funds (in production, integrate with payment gateway)
      const wallet = await storage.addFundsToWallet(userId, amount, description);

      res.json({ 
        message: "Funds added successfully (mock)",
        wallet
      });
    } catch (error: any) {
      console.error("Error adding funds:", error);
      res.status(500).json({ message: error.message || "Failed to add funds" });
    }
  });

  // POST /api/wallet/withdraw - Withdraw funds from wallet (mock)
  router.post('/withdraw', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const parsed = withdrawSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { amount, description } = parsed.data;

      // Mock withdraw (in production, process bank transfer)
      const wallet = await storage.withdrawFromWallet(userId, amount, description);

      res.json({ 
        message: "Withdrawal processed successfully (mock)",
        wallet
      });
    } catch (error: any) {
      console.error("Error withdrawing funds:", error);
      res.status(500).json({ message: error.message || "Failed to withdraw funds" });
    }
  });

  // GET /api/wallet/transactions - Get wallet transaction history
  router.get('/transactions', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : undefined;

      const transactions = await storage.getWalletHistory(userId, limitNum);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error getting wallet transactions:", error);
      res.status(500).json({ message: error.message || "Failed to get transactions" });
    }
  });

  // GET /api/wallet/balance - Get current wallet balance
  router.get('/balance', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const balance = await storage.getWalletBalance(userId);
      res.json({ 
        balance, 
        currency: 'SAR' 
      });
    } catch (error: any) {
      console.error("Error getting wallet balance:", error);
      res.status(500).json({ message: error.message || "Failed to get balance" });
    }
  });

  // PUT /api/wallet/preferences - Update wallet preferences
  router.put('/preferences', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const parsed = updatePreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const preferences = await storage.updateWalletPreferences(userId, parsed.data);
      res.json(preferences);
    } catch (error: any) {
      console.error("Error updating wallet preferences:", error);
      res.status(500).json({ message: error.message || "Failed to update preferences" });
    }
  });

  // POST /api/wallet/pay-project - Pay for project using wallet balance
  router.post('/pay-project', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const parsed = payProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { projectId, amount, description } = parsed.data;

      // Verify user is client of the project
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId) {
        return res.status(403).json({ message: "Only the project client can make payments" });
      }

      // Deduct from wallet
      const wallet = await storage.deductFromWallet(userId, amount, projectId, description);

      // Deposit to escrow
      const escrowAccount = await storage.getEscrowAccountByProject(projectId);
      if (escrowAccount) {
        await storage.depositToEscrow(escrowAccount.id, amount, userId, description);
      }

      res.json({ 
        message: "Payment processed successfully from wallet",
        wallet,
        remainingBalance: wallet.balance
      });
    } catch (error: any) {
      console.error("Error processing wallet payment:", error);
      res.status(500).json({ message: error.message || "Failed to process payment" });
    }
  });

  // GET /api/wallet/analytics - Get wallet analytics
  router.get('/analytics', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const wallet = await storage.getWalletAccount(userId);
      const transactions = await storage.getWalletHistory(userId, 100);

      let totalAdded = 0;
      let totalWithdrawn = 0;
      let totalSpent = 0;

      for (const tx of transactions) {
        const amount = parseFloat(tx.amount || '0');
        if (tx.type === 'add_funds') totalAdded += amount;
        if (tx.type === 'withdraw') totalWithdrawn += amount;
        if (tx.type === 'payment') totalSpent += amount;
      }

      res.json({
        currentBalance: wallet?.balance || '0.00',
        totalAdded: totalAdded.toFixed(2),
        totalWithdrawn: totalWithdrawn.toFixed(2),
        totalSpent: totalSpent.toFixed(2),
        transactionCount: transactions.length,
        currency: 'SAR'
      });
    } catch (error: any) {
      console.error("Error getting wallet analytics:", error);
      res.status(500).json({ message: error.message || "Failed to get analytics" });
    }
  });

  return router;
}
