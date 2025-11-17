import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../../storage";
import { insertRefundRequestSchema, insertTaxProfileSchema } from "@shared/schema";

// Validation schemas
const approveRefundSchema = z.object({
  adminNotes: z.string().optional(),
});

const rejectRefundSchema = z.object({
  adminNotes: z.string().min(1, "Admin notes are required for rejection"),
});

const updateTaxProfileSchema = insertTaxProfileSchema.partial();

const calculateVATSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number"),
});

interface RouteBuilderDeps {
  storage: IStorage;
  isAuthenticated: any;
  requireEmailVerified: any;
  getUserIdFromRequest: (req: any) => string | null;
  isAdmin: any;
}

export function buildRefundRouter(deps: RouteBuilderDeps) {
  const router = Router();
  const { storage, isAuthenticated, requireEmailVerified, getUserIdFromRequest, isAdmin } = deps;

  // POST /refunds - Create refund request
  router.post('/', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const parsed = insertRefundRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const refundData = parsed.data;

      // Verify user has access to the project
      const project = await storage.getProjectById(refundData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const refundRequest = await storage.createRefundRequest({
        ...refundData,
        requestedBy: userId,
        status: 'pending',
      });

      res.status(201).json(refundRequest);
    } catch (error: any) {
      console.error("Error creating refund request:", error);
      res.status(500).json({ message: error.message || "Failed to create refund request" });
    }
  });

  // GET /api/refunds/:id - Get refund request details
  router.get('/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const refund = await storage.getRefundRequest(id);

      if (!refund) {
        return res.status(404).json({ message: "Refund request not found" });
      }

      // Verify access
      const project = await storage.getProjectById(refund.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Admin, or project participants can view
      const user = await storage.getUser(userId);
      const isAdminUser = user?.role === 'admin';

      if (!isAdminUser && project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(refund);
    } catch (error: any) {
      console.error("Error getting refund request:", error);
      res.status(500).json({ message: error.message || "Failed to get refund request" });
    }
  });

  // GET /api/refunds - List refund requests
  router.get('/', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { status, projectId } = req.query;
      const user = await storage.getUser(userId);
      const isAdminUser = user?.role === 'admin';

      let refunds;

      if (isAdminUser) {
        // Admin can see all refunds with filters
        const filters: any = {};
        if (status) filters.status = status as string;
        if (projectId) filters.projectId = projectId as string;
        refunds = await storage.getAllRefundRequests(filters);
      } else {
        // Users can only see their own refunds
        const allRefunds = await storage.getAllRefundRequests();
        refunds = [];
        
        for (const refund of allRefunds) {
          if (refund.requestedBy === userId) {
            refunds.push(refund);
            continue;
          }

          // Also include if they're part of the project
          const project = await storage.getProjectById(refund.projectId);
          if (project && (project.clientId === userId || project.consultantId === userId)) {
            refunds.push(refund);
          }
        }

        // Apply filters
        if (status) {
          refunds = refunds.filter(r => r.status === status);
        }
        if (projectId) {
          refunds = refunds.filter(r => r.projectId === projectId);
        }
      }

      res.json(refunds);
    } catch (error: any) {
      console.error("Error listing refund requests:", error);
      res.status(500).json({ message: error.message || "Failed to list refunds" });
    }
  });

  // PUT /api/refunds/:id/approve - Approve refund (admin only)
  router.put('/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const parsed = approveRefundSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const refund = await storage.approveRefundRequest(id, userId, parsed.data.adminNotes);
      res.json(refund);
    } catch (error: any) {
      console.error("Error approving refund:", error);
      res.status(500).json({ message: error.message || "Failed to approve refund" });
    }
  });

  // PUT /api/refunds/:id/reject - Reject refund (admin only)
  router.put('/:id/reject', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const parsed = rejectRefundSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const refund = await storage.rejectRefundRequest(id, userId, parsed.data.adminNotes);
      res.json(refund);
    } catch (error: any) {
      console.error("Error rejecting refund:", error);
      res.status(500).json({ message: error.message || "Failed to reject refund" });
    }
  });

  // POST /api/refunds/:id/process - Process approved refund (admin only)
  router.post('/:id/process', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const refund = await storage.getRefundRequest(id);

      if (!refund) {
        return res.status(404).json({ message: "Refund request not found" });
      }

      if (refund.status !== 'approved') {
        return res.status(400).json({ message: "Only approved refunds can be processed" });
      }

      const processed = await storage.processRefund(id, userId);
      res.json(processed);
    } catch (error: any) {
      console.error("Error processing refund:", error);
      res.status(500).json({ message: error.message || "Failed to process refund" });
    }
  });

  return router;
}

export function buildTaxRouter(deps: Omit<RouteBuilderDeps, 'isAdmin'>) {
  const router = Router();
  const { storage, isAuthenticated, requireEmailVerified, getUserIdFromRequest } = deps;

  // GET /profile - Get user's tax profile
  router.get('/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const profile = await storage.getTaxProfile(userId);
      res.json(profile || null);
    } catch (error: any) {
      console.error("Error getting tax profile:", error);
      res.status(500).json({ message: error.message || "Failed to get tax profile" });
    }
  });

  // PUT /profile - Create or update tax profile
  router.put('/profile', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const parsed = updateTaxProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      // Check if profile exists, create if not
      const existingProfile = await storage.getTaxProfile(userId);
      let profile;
      if (existingProfile) {
        profile = await storage.updateTaxProfile(userId, parsed.data);
      } else {
        // Create new profile
        profile = await storage.createTaxProfile({
          userId,
          ...parsed.data
        });
      }
      res.json(profile);
    } catch (error: any) {
      console.error("Error updating tax profile:", error);
      res.status(500).json({ message: error.message || "Failed to update tax profile" });
    }
  });

  // POST /calculate - Calculate VAT (15% for Saudi Arabia)
  router.post('/calculate', isAuthenticated, async (req, res) => {
    try {
      const parsed = calculateVATSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const { amount } = parsed.data;
      const vat = await storage.calculateVAT(amount);

      const subtotal = parseFloat(amount);
      const vatAmount = parseFloat(vat);
      const total = (subtotal + vatAmount).toFixed(2);

      res.json({
        subtotal: amount,
        vatRate: '15.00',
        vatAmount: vat,
        total: total,
        currency: 'SAR'
      });
    } catch (error: any) {
      console.error("Error calculating VAT:", error);
      res.status(500).json({ message: error.message || "Failed to calculate VAT" });
    }
  });

  // GET /summary - Get tax summary for user
  router.get('/summary', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const consultantProfile = await storage.getConsultantProfile(userId);
      if (!consultantProfile) {
        return res.status(404).json({ message: "Consultant profile not found" });
      }

      const invoices = await storage.getInvoicesByUser(userId, 'consultant');
      
      let totalInvoiced = 0;
      let totalVAT = 0;
      let paidInvoices = 0;

      for (const invoice of invoices) {
        if (invoice.status === 'paid') {
          totalInvoiced += parseFloat(invoice.subtotal || '0');
          totalVAT += parseFloat(invoice.vatAmount || '0');
          paidInvoices++;
        }
      }

      const profile = await storage.getTaxProfile(userId);

      res.json({
        totalInvoiced: totalInvoiced.toFixed(2),
        totalVAT: totalVAT.toFixed(2),
        paidInvoiceCount: paidInvoices,
        totalInvoiceCount: invoices.length,
        taxProfile: profile,
        currency: 'SAR'
      });
    } catch (error: any) {
      console.error("Error getting tax summary:", error);
      res.status(500).json({ message: error.message || "Failed to get tax summary" });
    }
  });

  return router;
}
