import { IStorage } from "./storage";
import { NOTIFICATION_TYPES, NotificationType } from "@shared/schema";

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  relatedConversationId?: string;
  relatedMessageId?: string;
}

export class NotificationService {
  constructor(private storage: IStorage) {}

  async sendNotification(payload: NotificationPayload): Promise<void> {
    let prefs = await this.storage.getNotificationPreferences(payload.userId);
    
    // Create default preferences if none exist (defaults: all enabled)
    if (!prefs) {
      prefs = await this.storage.upsertNotificationPreferences(payload.userId, {
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
        emailEnabledTypes: null,
        inAppEnabledTypes: null,
      });
    }

    const shouldSendInApp = this.shouldSendInApp(prefs, payload.type);
    const shouldSendEmail = this.shouldSendEmail(prefs, payload.type);

    if (shouldSendInApp && shouldSendEmail) {
      // Both in-app and email enabled
      await this.storage.createNotification({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        metadata: payload.metadata,
        relatedConversationId: payload.relatedConversationId,
        relatedMessageId: payload.relatedMessageId,
      }, { sendEmail: true });
    } else if (shouldSendInApp) {
      // Only in-app enabled
      await this.storage.createNotification({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        metadata: payload.metadata,
        relatedConversationId: payload.relatedConversationId,
        relatedMessageId: payload.relatedMessageId,
      }, { sendEmail: false });
    } else if (shouldSendEmail) {
      // Only email enabled (skip in-app record)
      await this.storage.createNotification({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        metadata: payload.metadata,
        relatedConversationId: payload.relatedConversationId,
        relatedMessageId: payload.relatedMessageId,
      }, { sendEmail: true, skipInAppRecord: true });
    }
    // If both are false, do nothing
  }

  private shouldSendInApp(prefs: any, type: NotificationType): boolean {
    if (!prefs) return true; // Default to enabled if no preferences

    if (!prefs.inAppNotificationsEnabled) return false;

    if (!prefs.inAppEnabledTypes || prefs.inAppEnabledTypes === null) {
      return true; // null means all types enabled
    }

    return prefs.inAppEnabledTypes.includes(type);
  }

  private shouldSendEmail(prefs: any, type: NotificationType): boolean {
    if (!prefs) return true; // Default to enabled if no preferences

    if (!prefs.emailNotificationsEnabled) return false;

    if (!prefs.emailEnabledTypes || prefs.emailEnabledTypes === null) {
      return true; // null means all types enabled
    }

    return prefs.emailEnabledTypes.includes(type);
  }

  // === CRITICAL NOTIFICATION TRIGGERS ===

  async notifyBidReceived(clientId: string, bidDetails: { jobTitle: string; consultantName: string; bidId: string; jobId: string }): Promise<void> {
    await this.sendNotification({
      userId: clientId,
      type: NOTIFICATION_TYPES.BID_RECEIVED,
      title: "New Bid Received",
      message: `${bidDetails.consultantName} submitted a bid for "${bidDetails.jobTitle}"`,
      link: `/client/bids/${bidDetails.bidId}`,
      metadata: { bidId: bidDetails.bidId, jobId: bidDetails.jobId },
    });
  }

  async notifyBidStatusUpdate(consultantId: string, bidDetails: { jobTitle: string; status: string; bidId: string }): Promise<void> {
    await this.sendNotification({
      userId: consultantId,
      type: NOTIFICATION_TYPES.BID_STATUS_UPDATE,
      title: "Bid Status Updated",
      message: `Your bid for "${bidDetails.jobTitle}" is now ${bidDetails.status}`,
      link: `/consultant/bids/${bidDetails.bidId}`,
      metadata: { bidId: bidDetails.bidId, status: bidDetails.status },
    });
  }

  async notifyBidAwarded(consultantId: string, bidDetails: { jobTitle: string; bidId: string; projectId: string }): Promise<void> {
    await this.sendNotification({
      userId: consultantId,
      type: NOTIFICATION_TYPES.BID_AWARDED,
      title: "Congratulations! Bid Awarded",
      message: `Your bid for "${bidDetails.jobTitle}" has been awarded!`,
      link: `/consultant/projects/${bidDetails.projectId}`,
      metadata: { bidId: bidDetails.bidId, projectId: bidDetails.projectId },
    });
  }

  async notifyBidRejected(consultantId: string, bidDetails: { jobTitle: string; bidId: string }): Promise<void> {
    await this.sendNotification({
      userId: consultantId,
      type: NOTIFICATION_TYPES.BID_REJECTED,
      title: "Bid Not Selected",
      message: `Your bid for "${bidDetails.jobTitle}" was not selected`,
      link: `/consultant/bids/${bidDetails.bidId}`,
      metadata: { bidId: bidDetails.bidId },
    });
  }

  async notifyPaymentDeposited(userId: string, paymentDetails: { amount: string; projectTitle: string; transactionId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.PAYMENT_DEPOSITED,
      title: "Payment Deposited",
      message: `${paymentDetails.amount} SAR has been deposited for "${paymentDetails.projectTitle}"`,
      link: `/payments/${paymentDetails.transactionId}`,
      metadata: { transactionId: paymentDetails.transactionId, amount: paymentDetails.amount },
    });
  }

  async notifyPaymentReleased(userId: string, paymentDetails: { amount: string; projectTitle: string; transactionId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.PAYMENT_RELEASED,
      title: "Payment Released",
      message: `${paymentDetails.amount} SAR has been released for "${paymentDetails.projectTitle}"`,
      link: `/payments/${paymentDetails.transactionId}`,
      metadata: { transactionId: paymentDetails.transactionId, amount: paymentDetails.amount },
    });
  }

  async notifyProjectStatusChange(userId: string, projectDetails: { projectTitle: string; newStatus: string; projectId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.PROJECT_STATUS_CHANGE,
      title: "Project Status Updated",
      message: `"${projectDetails.projectTitle}" is now ${projectDetails.newStatus}`,
      link: `/projects/${projectDetails.projectId}`,
      metadata: { projectId: projectDetails.projectId, status: projectDetails.newStatus },
    });
  }

  async notifyMilestoneCompleted(userId: string, milestoneDetails: { projectTitle: string; milestoneTitle: string; projectId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.MILESTONE_COMPLETED,
      title: "Milestone Completed",
      message: `"${milestoneDetails.milestoneTitle}" completed for "${milestoneDetails.projectTitle}"`,
      link: `/projects/${milestoneDetails.projectId}`,
      metadata: { projectId: milestoneDetails.projectId, milestone: milestoneDetails.milestoneTitle },
    });
  }

  async notifyDeliverableSubmitted(userId: string, deliverableDetails: { projectTitle: string; deliverableTitle: string; projectId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.DELIVERABLE_SUBMITTED,
      title: "Deliverable Submitted",
      message: `"${deliverableDetails.deliverableTitle}" submitted for "${deliverableDetails.projectTitle}"`,
      link: `/projects/${deliverableDetails.projectId}`,
      metadata: { projectId: deliverableDetails.projectId, deliverable: deliverableDetails.deliverableTitle },
    });
  }

  async notifyInvoiceGenerated(userId: string, invoiceDetails: { amount: string; invoiceNumber: string; invoiceId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.INVOICE_GENERATED,
      title: "Invoice Generated",
      message: `Invoice #${invoiceDetails.invoiceNumber} for ${invoiceDetails.amount} SAR has been generated`,
      link: `/invoices/${invoiceDetails.invoiceId}`,
      metadata: { invoiceId: invoiceDetails.invoiceId, invoiceNumber: invoiceDetails.invoiceNumber },
    });
  }

  async notifyVendorInvited(consultantId: string, invitationDetails: { jobTitle: string; clientName: string; jobId: string }): Promise<void> {
    await this.sendNotification({
      userId: consultantId,
      type: NOTIFICATION_TYPES.VENDOR_INVITED,
      title: "You're Invited to Bid",
      message: `${invitationDetails.clientName} invited you to bid on "${invitationDetails.jobTitle}"`,
      link: `/consultant/jobs/${invitationDetails.jobId}`,
      metadata: { jobId: invitationDetails.jobId },
    });
  }

  async notifyVerificationStatus(userId: string, status: { verified: boolean }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.VERIFICATION_STATUS,
      title: status.verified ? "Account Verified" : "Verification Required",
      message: status.verified ? "Your account has been verified successfully" : "Please verify your account to continue",
      link: "/settings/account",
      metadata: { verified: status.verified },
    });
  }

  async notifyCategoryApproval(consultantId: string, categoryDetails: { categoryName: string; approved: boolean }): Promise<void> {
    await this.sendNotification({
      userId: consultantId,
      type: NOTIFICATION_TYPES.CATEGORY_APPROVAL,
      title: categoryDetails.approved ? "Category Approved" : "Category Request Update",
      message: categoryDetails.approved
        ? `Your request for "${categoryDetails.categoryName}" has been approved`
        : `Your request for "${categoryDetails.categoryName}" requires changes`,
      link: "/consultant/categories",
      metadata: { category: categoryDetails.categoryName, approved: categoryDetails.approved },
    });
  }

  // === IMPORTANT NOTIFICATION TRIGGERS ===

  async notifyNewMessage(userId: string, messageDetails: { senderName: string; preview: string; conversationId: string; messageId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
      title: "New Message",
      message: `${messageDetails.senderName}: ${messageDetails.preview}`,
      link: `/messages/${messageDetails.conversationId}`,
      metadata: { conversationId: messageDetails.conversationId },
      relatedConversationId: messageDetails.conversationId,
      relatedMessageId: messageDetails.messageId,
    });
  }

  async notifyReviewReceived(userId: string, reviewDetails: { reviewerName: string; rating: number; projectTitle: string; reviewId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.REVIEW_RECEIVED,
      title: "New Review Received",
      message: `${reviewDetails.reviewerName} left a ${reviewDetails.rating}-star review for "${reviewDetails.projectTitle}"`,
      link: `/reviews/${reviewDetails.reviewId}`,
      metadata: { reviewId: reviewDetails.reviewId, rating: reviewDetails.rating },
    });
  }

  async notifyReviewResponse(userId: string, responseDetails: { responderName: string; reviewId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.REVIEW_RESPONSE,
      title: "Review Response",
      message: `${responseDetails.responderName} responded to your review`,
      link: `/reviews/${responseDetails.reviewId}`,
      metadata: { reviewId: responseDetails.reviewId },
    });
  }

  async notifyDeadlineReminder(userId: string, deadlineDetails: { projectTitle: string; deadline: Date; projectId: string }): Promise<void> {
    const daysLeft = Math.ceil((deadlineDetails.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
      title: "Deadline Reminder",
      message: `"${deadlineDetails.projectTitle}" is due in ${daysLeft} day(s)`,
      link: `/projects/${deadlineDetails.projectId}`,
      metadata: { projectId: deadlineDetails.projectId, daysLeft },
    });
  }
  // TODO: DEADLINE_REMINDER requires scheduled task implementation
  // This notification method exists but needs a cron job/scheduler to call it periodically.
  // Implementation plan:
  // 1. Create server/scheduledTasks.ts with a daily cron job (e.g., using node-cron)
  // 2. Query projects/milestones with upcoming deadlines (1, 3, 7 days before due date)
  // 3. Call notifyDeadlineReminder() for each approaching deadline
  // 4. Track sent reminders to avoid duplicates (add reminderSentAt timestamps)
  // Example: cron.schedule('0 9 * * *', async () => { /* check deadlines and notify */ });

  async notifyRefundProcessed(userId: string, refundDetails: { amount: string; projectTitle: string; refundId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.REFUND_PROCESSED,
      title: "Refund Processed",
      message: `Refund of ${refundDetails.amount} SAR processed for "${refundDetails.projectTitle}"`,
      link: `/refunds/${refundDetails.refundId}`,
      metadata: { refundId: refundDetails.refundId, amount: refundDetails.amount },
    });
  }

  async notifyTeamMemberActivity(userId: string, activityDetails: { memberName: string; action: string; projectTitle: string; projectId: string }): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.TEAM_MEMBER_ACTIVITY,
      title: "Team Activity",
      message: `${activityDetails.memberName} ${activityDetails.action} on "${activityDetails.projectTitle}"`,
      link: `/projects/${activityDetails.projectId}`,
      metadata: { projectId: activityDetails.projectId, action: activityDetails.action },
    });
  }

  async notifyUserAccountApproved(userId: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.ACCOUNT_APPROVED,
      title: "Account Approved!",
      message: "Your EDGEIT24 account has been approved. You now have full access to the platform.",
      link: `/dashboard`,
      metadata: { approvedAt: new Date().toISOString() },
    });
  }

  async notifyUserAccountRejected(userId: string, reason: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.ACCOUNT_REJECTED,
      title: "Account Application Update",
      message: `Your account application was not approved. Reason: ${reason}`,
      link: `/settings`,
      metadata: { reason, rejectedAt: new Date().toISOString() },
    });
  }

  async notifyUserInfoRequested(userId: string, details: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: NOTIFICATION_TYPES.INFO_REQUESTED,
      title: "Additional Information Required",
      message: `Please provide the following information to complete your account approval: ${details}`,
      link: `/settings/profile`,
      metadata: { details, requestedAt: new Date().toISOString() },
    });
  }
}

// Singleton instance
import { storage } from './storage';
export const notificationService = new NotificationService(storage);
