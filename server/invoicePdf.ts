import type { Invoice } from "@shared/schema";

interface InvoiceData {
  invoice: Invoice;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  consultantName: string;
  consultantEmail: string;
  consultantAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: string | number;  // Accept both string and number
    total: string | number;      // Match schema field name: "total" not "totalPrice"
  }>;
}

// Helper function to format currency values
function formatCurrency(value: string | number, currency: string = 'SAR'): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(2)} ${currency}`;
}

/**
 * Invoice PDF/HTML Generation Service
 * Generates print-ready HTML invoices that can be converted to PDF using browser print
 */
export class InvoicePdfService {
  /**
   * Generate HTML invoice suitable for printing/PDF
   */
  generateInvoiceHtml(data: InvoiceData): string {
    const { invoice, clientName, clientEmail, clientAddress, consultantName, consultantEmail, consultantAddress, items } = data;

    const invoiceDate = new Date(invoice.issueDate).toLocaleDateString('en-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none;
      }
      .page-break {
        page-break-after: always;
      }
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0A0E27;
    }

    .company-info h1 {
      color: #0A0E27;
      font-size: 32px;
      margin-bottom: 5px;
    }

    .company-info p {
      color: #666;
      font-size: 14px;
    }

    .invoice-meta {
      text-align: right;
    }

    .invoice-meta h2 {
      color: #0A0E27;
      font-size: 28px;
      margin-bottom: 10px;
    }

    .invoice-meta .invoice-number {
      color: #10B981;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .invoice-meta .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 5px;
    }

    .status.draft { background: #e5e7eb; color: #374151; }
    .status.sent { background: #dbeafe; color: #1e40af; }
    .status.paid { background: #d1fae5; color: #065f46; }
    .status.overdue { background: #fee2e2; color: #991b1b; }
    .status.cancelled { background: #f3f4f6; color: #6b7280; }

    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }

    .party {
      flex: 1;
    }

    .party h3 {
      color: #0A0E27;
      font-size: 14px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .party-details {
      font-size: 14px;
      line-height: 1.8;
    }

    .party-details strong {
      display: block;
      color: #0A0E27;
      margin-bottom: 4px;
    }

    .party-details span {
      color: #666;
      display: block;
    }

    .invoice-dates {
      display: flex;
      gap: 40px;
      margin-bottom: 30px;
      padding: 15px 20px;
      background: #f9fafb;
      border-radius: 4px;
    }

    .date-item {
      flex: 1;
    }

    .date-item label {
      display: block;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .date-item strong {
      display: block;
      color: #0A0E27;
      font-size: 16px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .items-table thead {
      background: #f9fafb;
    }

    .items-table th {
      text-align: left;
      padding: 12px;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }

    .items-table th.right {
      text-align: right;
    }

    .items-table td {
      padding: 15px 12px;
      border-bottom: 1px solid #e5e7eb;
      color: #374151;
    }

    .items-table td.right {
      text-align: right;
    }

    .items-table td.description {
      font-weight: 500;
      color: #0A0E27;
    }

    .totals {
      margin-left: auto;
      width: 350px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      font-size: 14px;
    }

    .totals-row.subtotal {
      border-top: 1px solid #e5e7eb;
    }

    .totals-row.tax {
      color: #666;
    }

    .totals-row.total {
      border-top: 2px solid #0A0E27;
      margin-top: 10px;
      padding-top: 15px;
      font-size: 18px;
      font-weight: bold;
      color: #0A0E27;
    }

    .totals-row .amount {
      font-weight: 600;
    }

    .totals-row.total .amount {
      color: #10B981;
      font-size: 24px;
    }

    .notes-section {
      margin-top: 40px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 4px;
    }

    .notes-section h4 {
      color: #0A0E27;
      font-size: 14px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .notes-section p {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    .print-button {
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 12px 24px;
      background: #10B981;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .print-button:hover {
      background: #059669;
      box-shadow: 0 6px 8px rgba(0,0,0,0.15);
    }

    @media (max-width: 768px) {
      .invoice-container {
        padding: 20px;
      }

      .invoice-header,
      .parties {
        flex-direction: column;
      }

      .invoice-meta {
        text-align: left;
        margin-top: 20px;
      }

      .party {
        margin-bottom: 20px;
      }

      .totals {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <div class="company-info">
        <h1>EDGEIT24</h1>
        <p>B2B IT Marketplace</p>
        <p>Kingdom of Saudi Arabia</p>
      </div>
      <div class="invoice-meta">
        <h2>INVOICE</h2>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <span class="status ${invoice.status}">${invoice.status}</span>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>From (Consultant)</h3>
        <div class="party-details">
          <strong>${consultantName}</strong>
          <span>${consultantEmail}</span>
          ${consultantAddress ? `<span>${consultantAddress}</span>` : ''}
        </div>
      </div>
      <div class="party">
        <h3>To (Client)</h3>
        <div class="party-details">
          <strong>${clientName}</strong>
          <span>${clientEmail}</span>
          ${clientAddress ? `<span>${clientAddress}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="invoice-dates">
      <div class="date-item">
        <label>Invoice Date</label>
        <strong>${invoiceDate}</strong>
      </div>
      <div class="date-item">
        <label>Due Date</label>
        <strong>${dueDate}</strong>
      </div>
      ${invoice.paymentTerms ? `
      <div class="date-item">
        <label>Payment Terms</label>
        <strong>${invoice.paymentTerms}</strong>
      </div>
      ` : ''}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="right">Quantity</th>
          <th class="right">Unit Price</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => {
          const unitPrice = formatCurrency(item.unitPrice, invoice.currency);
          const total = formatCurrency(item.total, invoice.currency);
          return `
        <tr>
          <td class="description">${item.description}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">${unitPrice}</td>
          <td class="right">${total}</td>
        </tr>
        `;
        }).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row subtotal">
        <span>Subtotal</span>
        <span class="amount">${invoice.subtotal} ${invoice.currency}</span>
      </div>
      <div class="totals-row tax">
        <span>VAT (${invoice.vatRate}%)</span>
        <span class="amount">${invoice.vatAmount} ${invoice.currency}</span>
      </div>
      <div class="totals-row total">
        <span>Total Amount</span>
        <span class="amount">${invoice.totalAmount} ${invoice.currency}</span>
      </div>
    </div>

    ${invoice.notes ? `
    <div class="notes-section">
      <h4>Notes</h4>
      <p>${invoice.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>For questions about this invoice, please contact ${consultantName}</p>
    </div>
  </div>

  <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>
    `.trim();
  }

  /**
   * Generate simple text invoice for email/console
   */
  generateInvoiceText(data: InvoiceData): string {
    const { invoice, clientName, consultantName, items } = data;

    const invoiceDate = new Date(invoice.issueDate).toLocaleDateString('en-SA');
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-SA');

    let text = `
EDGEIT24 - INVOICE
═══════════════════════════════════════════════

Invoice Number: ${invoice.invoiceNumber}
Status: ${invoice.status.toUpperCase()}
Invoice Date: ${invoiceDate}
Due Date: ${dueDate}

From: ${consultantName}
To: ${clientName}

ITEMS
───────────────────────────────────────────────
`;

    items.forEach(item => {
      const unitPrice = formatCurrency(item.unitPrice, invoice.currency);
      const total = formatCurrency(item.total, invoice.currency);
      text += `
${item.description}
  Quantity: ${item.quantity}  |  Unit Price: ${unitPrice}  |  Total: ${total}
`;
    });

    text += `
───────────────────────────────────────────────

Subtotal:            ${invoice.subtotal} ${invoice.currency}
VAT (${invoice.vatRate}%):        ${invoice.vatAmount} ${invoice.currency}
═══════════════════════════════════════════════
TOTAL:               ${invoice.totalAmount} ${invoice.currency}
═══════════════════════════════════════════════
`;

    if (invoice.notes) {
      text += `
NOTES:
${invoice.notes}
`;
    }

    if (invoice.paymentTerms) {
      text += `
PAYMENT TERMS: ${invoice.paymentTerms}
`;
    }

    return text.trim();
  }
}

export const invoicePdfService = new InvoicePdfService();
