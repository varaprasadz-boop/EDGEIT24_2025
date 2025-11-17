import type { Notification, Invoice } from "@shared/schema";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  cc?: string[];
}

interface InvoiceEmailOptions {
  to: string;
  cc?: string[];
  invoice: Invoice;
  clientName: string;
  consultantName: string;
  message?: string;
}

/**
 * Email service for sending notification emails
 * Currently logs to console for development
 * In production, integrate with SendGrid, AWS SES, or similar
 */
class EmailService {
  private enabled: boolean;

  constructor() {
    // Enable email service in production, disable in dev unless explicitly enabled
    this.enabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_EMAILS === 'true';
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.enabled) {
      console.log('[EMAIL] Would send email:', {
        to: options.to,
        subject: options.subject,
        preview: options.text.substring(0, 100),
      });
      return;
    }

    // TODO: Integrate with real email service in production
    // Example: await sendgrid.send(options)
    console.log('[EMAIL] Sending email:', options);
  }

  async sendNotificationEmail(
    userEmail: string,
    notification: Notification
  ): Promise<void> {
    const subject = notification.title;
    const text = notification.message;
    const html = this.generateNotificationHtml(notification);

    await this.sendEmail({
      to: userEmail,
      subject,
      text,
      html,
    });
  }

  async sendInvoiceEmail(options: InvoiceEmailOptions): Promise<void> {
    const { to, cc, invoice, clientName, consultantName, message } = options;
    
    const appUrl = process.env.VITE_PUBLIC_URL || 'https://edgeit24.replit.app';
    const subject = `Invoice ${invoice.invoiceNumber} from ${consultantName}`;
    const text = `
Invoice Number: ${invoice.invoiceNumber}
Date: ${new Date(invoice.issueDate).toLocaleDateString('en-SA')}
Amount Due: ${invoice.totalAmount} ${invoice.currency}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-SA')}

${message || 'Please review the attached invoice and process payment by the due date.'}

View invoice: ${appUrl}/invoices/${invoice.id}
    `.trim();

    const html = this.generateInvoiceEmailHtml({
      invoice,
      clientName,
      consultantName,
      message,
    });

    await this.sendEmail({
      to,
      subject,
      text,
      html,
      cc,
    });
  }

  private generateNotificationHtml(notification: Notification): string {
    const appUrl = process.env.VITE_PUBLIC_URL || 'https://edgeit24.replit.app';
    const notificationUrl = notification.link 
      ? `${appUrl}${notification.link}`
      : `${appUrl}/settings?tab=notifications`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0A0E27; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>EDGEIT24</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <a href="${notificationUrl}" class="button">View Details</a>
          </div>
          <div class="footer">
            <p>You received this email because you have email notifications enabled.</p>
            <p><a href="${appUrl}/settings?tab=notifications">Manage notification preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateInvoiceEmailHtml(options: {
    invoice: Invoice;
    clientName: string;
    consultantName: string;
    message?: string;
  }): string {
    const { invoice, clientName, consultantName, message } = options;
    const appUrl = process.env.VITE_PUBLIC_URL || 'https://edgeit24.replit.app';
    const invoiceUrl = `${appUrl}/invoices/${invoice.id}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0A0E27; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .invoice-details { background: white; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #666; }
          .detail-value { color: #0A0E27; }
          .amount { font-size: 24px; color: #10B981; font-weight: bold; }
          .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>EDGEIT24</h1>
            <p>Invoice from ${consultantName}</p>
          </div>
          <div class="content">
            <h2>New Invoice Received</h2>
            <p>Dear ${clientName},</p>
            ${message ? `<p>${message}</p>` : '<p>You have received a new invoice. Please review the details below:</p>'}
            
            <div class="invoice-details">
              <div class="detail-row">
                <span class="detail-label">Invoice Number:</span>
                <span class="detail-value">${invoice.invoiceNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Invoice Date:</span>
                <span class="detail-value">${new Date(invoice.issueDate).toLocaleDateString('en-SA')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Due Date:</span>
                <span class="detail-value">${new Date(invoice.dueDate).toLocaleDateString('en-SA')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="text-transform: capitalize;">${invoice.status}</span>
              </div>
              <div class="detail-row" style="border-bottom: none; margin-top: 20px;">
                <span class="detail-label">Total Amount:</span>
                <span class="amount">${invoice.totalAmount} ${invoice.currency}</span>
              </div>
            </div>

            <a href="${invoiceUrl}" class="button">View Invoice</a>
          </div>
          <div class="footer">
            <p>This is an automated email from EDGEIT24.</p>
            <p>For questions about this invoice, please contact ${consultantName} directly.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
