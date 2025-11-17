import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../../storage";
import { insertInvoiceSchema } from "@shared/schema";

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
  isAuthenticated: any;
  requireEmailVerified: any;
  getUserIdFromRequest: (req: any) => string | null;
}

export function buildInvoiceRouter(deps: RouteBuilderDeps) {
  const router = Router();
  const { storage, isAuthenticated, requireEmailVerified, getUserIdFromRequest } = deps;

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

      // Generate simple HTML invoice (PDF generation would use Puppeteer in production)
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .invoice-details { margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; }
    .total-row { font-weight: bold; background-color: #f9f9f9; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVOICE</h1>
    <p>${invoice.invoiceNumber}</p>
  </div>
  
  <div class="invoice-details">
    <p><strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</p>
    <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
    <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit Price (SAR)</th>
        <th>Total (SAR)</th>
      </tr>
    </thead>
    <tbody>
      ${(invoice.items as any[]).map((item: any) => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${item.unitPrice}</td>
          <td>${item.totalPrice}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table>
    <tr>
      <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
      <td>${invoice.subtotal} SAR</td>
    </tr>
    <tr>
      <td colspan="3" style="text-align: right;"><strong>VAT (${invoice.vatRate}%):</strong></td>
      <td>${invoice.vatAmount} SAR</td>
    </tr>
    <tr class="total-row">
      <td colspan="3" style="text-align: right;"><strong>Total Amount:</strong></td>
      <td>${invoice.totalAmount} SAR</td>
    </tr>
  </table>

  ${invoice.notes ? `<p><strong>Notes:</strong><br>${invoice.notes}</p>` : ''}
  ${invoice.paymentTerms ? `<p><strong>Payment Terms:</strong><br>${invoice.paymentTerms}</p>` : ''}
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: error.message || "Failed to generate PDF" });
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

      // Mock email send (in production, use email service)
      // Update invoice status to 'sent' if it was 'draft'
      if (invoice.status === 'draft') {
        await storage.updateInvoiceStatus(id, 'sent');
      }

      res.json({ 
        message: "Invoice sent successfully (mock)",
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
