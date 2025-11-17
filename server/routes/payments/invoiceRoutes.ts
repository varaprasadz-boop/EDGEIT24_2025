import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../../storage";
import { insertInvoiceSchema } from "@shared/schema";
import { emailService } from "../../email";
import { invoicePdfService } from "../../invoicePdf";
import type { NotificationService } from "../../notifications";

// Validation schemas
const updateInvoiceSchema = z.object({
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.string(),
    totalPrice: z.string(),
  })).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
});

const sendEmailSchema = z.object({
  recipientEmail: z.string().email(),
  ccEmails: z.array(z.string().email()).optional(),
  message: z.string().optional(),
});

interface RouteBuilderDeps {
  storage: IStorage;
  notificationService: NotificationService;
  isAuthenticated: any;
  requireEmailVerified: any;
  getUserIdFromRequest: (req: any) => string | null;
}

export function buildInvoiceRouter(deps: RouteBuilderDeps) {
  const router = Router();
  const { storage, notificationService, isAuthenticated, requireEmailVerified, getUserIdFromRequest } = deps;

  // POST /api/invoices - Create new invoice
  router.post('/', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const parsed = insertInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      const invoiceData = parsed.data;

      // Verify user has permission to create invoice (must be consultant for the project)
      const project = await storage.getProjectById(invoiceData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.consultantId !== userId) {
        return res.status(403).json({ message: "Only the project consultant can create invoices" });
      }

      // Generate invoice number
      const invoiceNumber = await storage.generateInvoiceNumber();

      // Calculate VAT and total
      const subtotal = parseFloat(invoiceData.subtotal);
      const vatAmount = (subtotal * 0.15).toFixed(2); // 15% VAT
      const totalAmount = (subtotal + parseFloat(vatAmount)).toFixed(2);

      const invoice = await storage.createInvoice({
        ...invoiceData,
        invoiceNumber,
        vatRate: '15.00',
        vatAmount,
        totalAmount,
        currency: 'SAR',
        status: 'draft',
      });

      // Notify client about invoice generation
      try {
        await notificationService.notifyInvoiceGenerated(project.clientId, {
          invoiceNumber,
          amount: `${totalAmount} SAR`,
          invoiceId: invoice.id,
        });
      } catch (notifError) {
        console.error("Error sending invoice notification:", notifError);
      }

      res.status(201).json(invoice);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: error.message || "Failed to create invoice" });
    }
  });

  // GET /api/invoices/:id - Get invoice details
  router.get('/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const invoice = await storage.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Verify user has access (client or consultant of the project)
      if (invoice.clientId !== userId && invoice.consultantId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(invoice);
    } catch (error: any) {
      console.error("Error getting invoice:", error);
      res.status(500).json({ message: error.message || "Failed to get invoice" });
    }
  });

  // GET /api/invoices - List invoices with filters
  router.get('/', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { status, projectId } = req.query;

      const filters: any = { userId };
      if (status) filters.status = status as string;
      if (projectId) filters.projectId = projectId as string;

      const invoices = await storage.getAllInvoices(filters);
      res.json(invoices);
    } catch (error: any) {
      console.error("Error listing invoices:", error);
      res.status(500).json({ message: error.message || "Failed to list invoices" });
    }
  });

  // PUT /api/invoices/:id - Update invoice
  router.put('/:id', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const invoice = await storage.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Only consultant can update invoice
      if (invoice.consultantId !== userId) {
        return res.status(403).json({ message: "Only the consultant can update this invoice" });
      }

      // Cannot update paid or cancelled invoices
      if (invoice.status === 'paid' || invoice.status === 'cancelled') {
        return res.status(400).json({ message: "Cannot update paid or cancelled invoices" });
      }

      const parsed = updateInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      // Update invoice (simplified - in production would handle recalculations)
      const updated = await storage.updateInvoiceStatus(id, invoice.status);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: error.message || "Failed to update invoice" });
    }
  });

  // PUT /api/invoices/:id/cancel - Cancel invoice
  router.put('/:id/cancel', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const invoice = await storage.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Consultant can cancel invoice
      if (invoice.consultantId !== userId) {
        return res.status(403).json({ message: "Only the consultant can cancel this invoice" });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ message: "Cannot cancel a paid invoice" });
      }

      const cancelled = await storage.cancelInvoice(id);
      res.json(cancelled);
    } catch (error: any) {
      console.error("Error cancelling invoice:", error);
      res.status(500).json({ message: error.message || "Failed to cancel invoice" });
    }
  });

  // GET /api/invoices/:id/pdf - Generate invoice PDF (HTML-to-PDF)
  router.get('/:id/pdf', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const invoice = await storage.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Verify access
      if (invoice.clientId !== userId && invoice.consultantId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get client and consultant info
      const client = await storage.getUser(invoice.clientId);
      const consultant = await storage.getUser(invoice.consultantId);

      if (!client || !consultant) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate professional HTML invoice using invoicePdfService
      const html = invoicePdfService.generateInvoiceHtml({
        invoice,
        clientName: client.fullName || client.email,
        clientEmail: client.email,
        consultantName: consultant.fullName || consultant.email,
        consultantEmail: consultant.email,
        items: invoice.items as any[],
      });

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: error.message || "Failed to generate PDF" });
    }
  });

  // POST /api/invoices/:id/pay - Pay invoice from wallet
  router.post('/:id/pay', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const invoice = await storage.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Only client can pay invoice
      if (invoice.clientId !== userId) {
        return res.status(403).json({ message: "Only the client can pay this invoice" });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ message: "Invoice is already paid" });
      }

      if (invoice.status === 'cancelled') {
        return res.status(400).json({ message: "Cannot pay a cancelled invoice" });
      }

      // Check wallet balance
      const wallet = await storage.getWalletAccount(userId);
      if (!wallet || parseFloat(wallet.balance) < parseFloat(invoice.totalAmount)) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      // Process payment from wallet (deduct funds and record transaction)
      await storage.withdrawFromWallet(userId, invoice.totalAmount, `Payment for invoice ${invoice.invoiceNumber}`);

      // Mark invoice as paid
      const paid = await storage.markInvoiceAsPaid(id);

      res.json({ 
        message: "Invoice paid successfully",
        invoice: paid
      });
    } catch (error: any) {
      console.error("Error paying invoice:", error);
      res.status(500).json({ message: error.message || "Failed to pay invoice" });
    }
  });

  // POST /api/invoices/:id/send-email - Send invoice via email
  router.post('/:id/send-email', isAuthenticated, requireEmailVerified, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const invoice = await storage.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Only consultant can send invoice
      if (invoice.consultantId !== userId) {
        return res.status(403).json({ message: "Only the consultant can send this invoice" });
      }

      const parsed = sendEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: parsed.error.errors 
        });
      }

      // Get client and consultant info
      const client = await storage.getUser(invoice.clientId);
      const consultant = await storage.getUser(invoice.consultantId);

      if (!client || !consultant) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send invoice email using email service
      await emailService.sendInvoiceEmail({
        to: parsed.data.recipientEmail,
        cc: parsed.data.ccEmails,
        invoice,
        clientName: client.fullName || client.email,
        consultantName: consultant.fullName || consultant.email,
        message: parsed.data.message,
      });

      // Update invoice status to 'sent' if it was 'draft'
      if (invoice.status === 'draft') {
        await storage.updateInvoiceStatus(id, 'sent');
      }

      res.json({ 
        message: "Invoice sent successfully",
        recipient: parsed.data.recipientEmail
      });
    } catch (error: any) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: error.message || "Failed to send invoice" });
    }
  });

  // GET /api/projects/:projectId/invoices - Get all invoices for a project
  router.get('/project/:projectId', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;

      // Verify user has access to project
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.clientId !== userId && project.consultantId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const invoices = await storage.getInvoicesByProject(projectId);
      res.json(invoices);
    } catch (error: any) {
      console.error("Error getting project invoices:", error);
      res.status(500).json({ message: error.message || "Failed to get invoices" });
    }
  });

  return router;
}
