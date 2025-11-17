import type { Notification } from "@shared/schema";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
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
}

export const emailService = new EmailService();
