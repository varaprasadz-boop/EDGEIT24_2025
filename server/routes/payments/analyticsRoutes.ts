import { Router } from "express";
import type { IStorage } from "../../storage";

interface RouteBuilderDeps {
  storage: IStorage;
  isAuthenticated: any;
  getUserIdFromRequest: (req: any) => string | null;
  isAdmin?: any;
}

// Dashboard routes: /api/dashboard/*
export function buildDashboardRouter(deps: Omit<RouteBuilderDeps, 'isAdmin'>) {
  const router = Router();
  const { storage, isAuthenticated, getUserIdFromRequest } = deps;

  // GET /vendor/earnings - Vendor earnings dashboard
  router.get('/vendor/earnings', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user has consultant profile
      const consultantProfile = await storage.getConsultantProfile(userId);
      if (!consultantProfile) {
        return res.status(403).json({ message: "Consultant profile required" });
      }

      // Get earnings data
      const earnings = await storage.getVendorEarnings(userId);

      // Get chart data (simplified)
      const { period = 'month' } = req.query;
      const chartData = await storage.getEarningsChartData(
        userId, 
        period as 'week' | 'month' | 'year'
      );

      // Get pending milestones
      const pendingMilestones = await storage.getPendingMilestonePayments(userId);

      res.json({
        ...earnings,
        chartData,
        pendingMilestones,
        currency: 'SAR'
      });
    } catch (error: any) {
      console.error("Error getting vendor earnings:", error);
      res.status(500).json({ message: error.message || "Failed to get earnings data" });
    }
  });

  // GET /client/spending - Client spending dashboard
  router.get('/client/spending', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user has client profile
      const clientProfile = await storage.getClientProfile(userId);
      if (!clientProfile) {
        return res.status(403).json({ message: "Client profile required" });
      }

      // Get spending data
      const spending = await storage.getClientSpending(userId);

      // Get chart data (simplified)
      const { period = 'month' } = req.query;
      const chartData = await storage.getSpendingChartData(
        userId, 
        period as 'week' | 'month' | 'year'
      );

      // Get pending payments
      const pendingMilestones = await storage.getPendingMilestonePayments(userId);

      res.json({
        ...spending,
        chartData,
        pendingMilestones,
        currency: 'SAR'
      });
    } catch (error: any) {
      console.error("Error getting client spending:", error);
      res.status(500).json({ message: error.message || "Failed to get spending data" });
    }
  });

  return router;
}

// Note: Admin payment analytics route moved to server/routes.ts at /api/admin/payments/analytics
// This keeps all /api/admin/* routes under single ownership

// Transactions routes: /api/transactions/*
export function buildTransactionsRouter(deps: Omit<RouteBuilderDeps, 'isAdmin'>) {
  const router = Router();
  const { storage, isAuthenticated, getUserIdFromRequest } = deps;

  // GET /export - Export transactions to CSV
  router.get('/export', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { type, startDate, endDate } = req.query;

      const filters: any = { userId };
      if (type) filters.type = type as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const csv = await storage.exportTransactions(filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error: any) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ message: error.message || "Failed to export transactions" });
    }
  });

  return router;
}
