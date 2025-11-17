import {
  sessions,
  users,
  clientProfiles,
  consultantProfiles,
  consultantCategories,
  teamMembers,
  categories,
  vendorCategoryRequests,
  jobs,
  bids,
  rfqInvitations,
  bidShortlists,
  bidClarifications,
  bidViews,
  projects,
  milestoneComments,
  projectDeliverables,
  projectTeamMembers,
  projectActivityLog,
  deliverableVersions,
  deliverableDownloads,
  hardwareShipments,
  qualityInspections,
  returnsReplacements,
  warrantyClaims,
  softwareLicenses,
  softwareSubscriptions,
  softwareActivations,
  escrowAccounts,
  escrowTransactions,
  paymentMilestones,
  invoices,
  walletAccounts,
  walletTransactions,
  refundRequests,
  taxProfiles,
  paymentPreferences,
  payments,
  reviews,
  reviewResponses,
  reviewReports,
  kycDocuments,
  educationRecords,
  bankInformation,
  pricingTemplates,
  profileApprovalEvents,
  uniqueIdCounters,
  quoteRequests,
  userSubscriptions,
  paymentSessions,
  subscriptionPlans,
  conversations,
  conversationParticipants,
  messages,
  messageReceipts,
  messageTemplates,
  messageFiles,
  meetingLinks,
  meetingParticipants,
  meetingReminders,
  conversationLabels,
  messageModeration,
  conversationPreferences,
  conversationPins,
  fileVersions,
  rateLimits,
  type User,
  type InsertUser,
  type UpsertUser,
  type ClientProfile,
  type InsertClientProfile,
  type ConsultantProfile,
  type InsertConsultantProfile,
  type TeamMember,
  type InsertTeamMember,
  type UpdateTeamMember,
  type Job,
  type InsertJob,
  type Bid,
  type InsertBid,
  type RFQInvitation,
  type InsertRFQInvitation,
  type BidShortlist,
  type InsertBidShortlist,
  type BidClarification,
  type InsertBidClarification,
  type BidView,
  type InsertBidView,
  type Project,
  type InsertProject,
  type MilestoneComment,
  type InsertMilestoneComment,
  type ProjectDeliverable,
  type InsertProjectDeliverable,
  type ProjectTeamMember,
  type InsertProjectTeamMember,
  type ProjectActivityLog,
  type InsertProjectActivityLog,
  type DeliverableVersion,
  type InsertDeliverableVersion,
  type DeliverableDownload,
  type InsertDeliverableDownload,
  type HardwareShipment,
  type InsertHardwareShipment,
  type ShipmentStatus,
  type QualityInspection,
  type InsertQualityInspection,
  type ReturnReplacement,
  type InsertReturnReplacement,
  type WarrantyClaim,
  type InsertWarrantyClaim,
  type SoftwareLicense,
  type InsertSoftwareLicense,
  type SoftwareSubscription,
  type InsertSoftwareSubscription,
  type SoftwareActivation,
  type InsertSoftwareActivation,
  type EscrowAccount,
  type InsertEscrowAccount,
  type EscrowTransaction,
  type InsertEscrowTransaction,
  type PaymentMilestone,
  type InsertPaymentMilestone,
  type Invoice,
  type InsertInvoice,
  type WalletAccount,
  type InsertWalletAccount,
  type WalletTransaction,
  type InsertWalletTransaction,
  type RefundRequest,
  type InsertRefundRequest,
  type TaxProfile,
  type InsertTaxProfile,
  type PaymentPreferences,
  type InsertPaymentPreferences,
  type Category,
  type VendorCategoryRequest,
  type InsertVendorCategoryRequest,
  type Review,
  type InsertReview,
  type ReviewResponse,
  type InsertReviewResponse,
  type ReviewReport,
  type InsertReviewReport,
  type KycDocument,
  type InsertKycDocument,
  type EducationRecord,
  type InsertEducationRecord,
  type BankInformation,
  type InsertBankInformation,
  type PricingTemplate,
  type InsertPricingTemplate,
  type ProfileApprovalEvent,
  type InsertProfileApprovalEvent,
  type UniqueIdCounter,
  type QuoteRequest,
  type InsertQuoteRequest,
  type UserSubscription,
  type PaymentSession,
  type SubscriptionPlan,
  type Conversation,
  type InsertConversation,
  type ConversationParticipant,
  type InsertConversationParticipant,
  type Message,
  type InsertMessage,
  type MessageReceipt,
  type InsertMessageReceipt,
  type MessageTemplate,
  type InsertMessageTemplate,
  type MessageFile,
  type InsertMessageFile,
  type MeetingLink,
  type InsertMeetingLink,
  type MeetingParticipant,
  type InsertMeetingParticipant,
  type MeetingReminder,
  type InsertMeetingReminder,
  type ConversationLabel,
  type InsertConversationLabel,
  type MessageModeration,
  type InsertMessageModeration,
  type ConversationPreference,
  type InsertConversationPreference,
  type ConversationPin,
  type InsertConversationPin,
  type FileVersion,
  type InsertFileVersion,
  type RateLimit,
  type InsertRateLimit,
  type LoginHistory,
  type InsertLoginHistory,
  type ActiveSession,
  type InsertActiveSession,
  type UserActivityLog,
  type InsertUserActivityLog,
  type SavedSearch,
  type InsertSavedSearch,
  savedSearches,
  type Notification,
  type InsertNotification,
  notifications,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  notificationPreferences,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, sql, desc, inArray } from "drizzle-orm";
import { nanoid } from 'nanoid';
import { emailService } from './email';

export interface DashboardStats {
  activeJobs: number;
  totalBids: number;
  totalSpending: string;
  messagesCount: number;
}

export interface ConsultantDashboardStats {
  availableJobs: number;
  activeBids: number;
  totalEarnings: string;
  rating: string;
}

export interface ConsultantCategoryWithDetails {
  id: string;
  categoryId: string;
  isPrimary: boolean | null;
  category: Category;
}

export interface IStorage {
  // User operations - Required for Replit Auth and local auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByReplitSub(replitSub: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, data: Partial<InsertUser>): Promise<User>;
  getSession(sessionId: string): Promise<any>;
  
  // Email verification operations
  setEmailVerificationToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByEmailToken(token: string): Promise<User | undefined>;
  verifyUserEmail(userId: string): Promise<User>;
  invalidateEmailVerificationToken(userId: string): Promise<void>;
  
  // Password reset operations
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  resetPassword(userId: string, newPasswordHash: string): Promise<void>;
  invalidatePasswordResetToken(userId: string): Promise<void>;
  
  // Two-Factor Authentication operations
  setup2FA(userId: string, secret: string): Promise<User>;
  enable2FA(userId: string, backupCodes: string[]): Promise<User>;
  disable2FA(userId: string): Promise<User>;
  verify2FAToken(userId: string, token: string): Promise<boolean>;
  verifyBackupCode(userId: string, code: string): Promise<boolean>;
  generateBackupCodes(userId: string): Promise<string[]>;
  
  // Client Profile operations
  getClientProfile(userId: string): Promise<ClientProfile | undefined>;
  createClientProfile(profile: InsertClientProfile): Promise<ClientProfile>;
  updateClientProfile(userId: string, profile: Partial<InsertClientProfile>): Promise<ClientProfile>;
  
  // Team Members operations
  getTeamMembers(clientProfileId: string): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  inviteTeamMember(member: InsertTeamMember, invitationToken: string, expiry: Date): Promise<TeamMember>;
  updateTeamMember(id: string, data: Partial<UpdateTeamMember>): Promise<TeamMember>;
  revokeTeamMember(id: string, revokedBy: string): Promise<TeamMember>;
  acceptInvitation(token: string, userId: string): Promise<TeamMember>;
  declineInvitation(token: string): Promise<TeamMember>;
  getTeamMemberByToken(token: string): Promise<TeamMember | undefined>;
  resendInvitation(id: string, invitationToken: string, expiry: Date): Promise<TeamMember>;
  
  // Consultant Profile operations
  getConsultantProfile(userId: string): Promise<ConsultantProfile | undefined>;
  createConsultantProfile(profile: InsertConsultantProfile): Promise<ConsultantProfile>;
  updateConsultantProfile(userId: string, profile: Partial<InsertConsultantProfile>): Promise<ConsultantProfile>;
  
  // Consultant Category operations
  getConsultantCategories(userId: string): Promise<ConsultantCategoryWithDetails[]>;
  setConsultantCategories(userId: string, categoryIds: string[], primaryCategoryId: string | null): Promise<ConsultantCategoryWithDetails[]>;
  
  // Vendor Category Request operations
  createCategoryRequest(request: InsertVendorCategoryRequest): Promise<VendorCategoryRequest>;
  getCategoryRequest(id: string): Promise<VendorCategoryRequest | undefined>;
  getVendorCategoryRequests(vendorId: string): Promise<VendorCategoryRequest[]>;
  getCategoryRequestsByStatus(status: string): Promise<VendorCategoryRequest[]>;
  updateCategoryRequest(id: string, data: Partial<InsertVendorCategoryRequest>): Promise<VendorCategoryRequest>;
  approveCategoryRequest(id: string, reviewedBy: string, adminNotes?: string, verificationBadge?: string, maxConcurrentJobs?: number): Promise<VendorCategoryRequest>;
  rejectCategoryRequest(id: string, reviewedBy: string, adminNotes?: string): Promise<VendorCategoryRequest>;
  
  // KYC Document operations
  getKycDocument(userId: string, profileType: 'client' | 'consultant'): Promise<KycDocument | undefined>;
  saveKycDocument(document: InsertKycDocument): Promise<KycDocument>;
  updateKycDocument(userId: string, profileType: string, data: Partial<InsertKycDocument>): Promise<KycDocument>;
  
  // Education Record operations
  getEducationRecords(consultantProfileId: string): Promise<EducationRecord[]>;
  createEducationRecord(record: InsertEducationRecord): Promise<EducationRecord>;
  updateEducationRecord(id: string, data: Partial<InsertEducationRecord>): Promise<EducationRecord>;
  deleteEducationRecord(id: string): Promise<void>;
  
  // Bank Information operations
  getBankInformation(consultantProfileId: string): Promise<BankInformation | undefined>;
  saveBankInformation(info: InsertBankInformation): Promise<BankInformation>;
  updateBankInformation(consultantProfileId: string, data: Partial<InsertBankInformation>): Promise<BankInformation>;
  
  // Pricing Template operations
  getPricingTemplates(consultantProfileId: string): Promise<PricingTemplate[]>;
  createPricingTemplate(template: InsertPricingTemplate): Promise<PricingTemplate>;
  updatePricingTemplate(id: string, data: Partial<InsertPricingTemplate>): Promise<PricingTemplate>;
  deletePricingTemplate(id: string): Promise<void>;
  
  // Review operations
  getReviews(consultantId: string, options?: { limit?: number; offset?: number; rating?: number; isPublic?: boolean }): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, userId: string, data: Partial<InsertReview>): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  getReviewById(id: string): Promise<Review | undefined>;
  getReviewsByProject(projectId: string): Promise<Review[]>;
  getClientReviewsReceived(clientId: string): Promise<Review[]>;
  getClientReviewsGiven(clientId: string): Promise<Review[]>;
  canEditReview(reviewId: string, userId: string): Promise<boolean>;
  markReviewHelpful(reviewId: string, userId: string): Promise<void>;
  unmarkReviewHelpful(reviewId: string, userId: string): Promise<void>;
  getReviewStats(consultantId: string): Promise<{ averageRating: number; totalReviews: number; ratingBreakdown: Record<number, number> }>;
  
  // Review Response operations
  createReviewResponse(response: InsertReviewResponse): Promise<ReviewResponse>;
  getReviewResponse(reviewId: string): Promise<ReviewResponse | undefined>;
  updateReviewResponse(id: string, responseText: string): Promise<ReviewResponse>;
  deleteReviewResponse(id: string): Promise<void>;
  
  // Review Report operations
  createReviewReport(report: InsertReviewReport): Promise<ReviewReport>;
  getReviewReports(filters?: { status?: string; reviewId?: string }): Promise<ReviewReport[]>;
  getReviewReportById(id: string): Promise<ReviewReport | undefined>;
  resolveReviewReport(id: string, status: string, reviewedBy: string, adminNotes?: string): Promise<ReviewReport>;
  
  // Project operations
  getClientProjects(clientId: string, options?: { limit?: number }): Promise<any[]>;
  getConsultantMetrics(consultantId: string): Promise<{ completionRate: number; totalProjects: number; completedProjects: number }>;
  
  // Performance Score operations
  getPerformanceScore(consultantId: string): Promise<{ score: number; breakdown: { ratingScore: number; completionScore: number; responseScore: number } }>;
  
  // Profile Approval operations
  createApprovalEvent(event: InsertProfileApprovalEvent): Promise<ProfileApprovalEvent>;
  getApprovalEvents(userId: string, profileType?: string): Promise<ProfileApprovalEvent[]>;
  
  // Unique ID generation
  generateUniqueId(prefix: 'CLT' | 'CNS'): Promise<string>;
  
  // Dashboard operations
  getClientDashboardStats(userId: string): Promise<DashboardStats>;
  getConsultantDashboardStats(userId: string): Promise<ConsultantDashboardStats>;
  listClientJobs(userId: string, limit?: number): Promise<Job[]>;
  listClientBids(userId: string, limit?: number): Promise<Bid[]>;
  
  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  listJobs(options?: { ownerClientId?: string; categoryId?: string; excludeClientId?: string; limit?: number }): Promise<(Job & { categoryPathLabel: string })[]>;
  searchJobs(options?: {
    search?: string;
    categoryId?: string;
    minBudget?: number;
    maxBudget?: number;
    skills?: string[];
    experienceLevel?: string;
    status?: string;
    budgetType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: (Job & { categoryPathLabel: string })[]; total: number }>;
  
  // Bid operations
  createBid(bid: InsertBid): Promise<Bid>;
  getBid(id: string): Promise<Bid | undefined>;
  getJobBids(jobId: string, options?: {
    status?: string;
    minBudget?: number;
    maxBudget?: number;
    sortBy?: 'budget' | 'rating' | 'date' | 'timeline';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ bids: any[]; total: number }>;
  getConsultantBids(consultantId: string, options?: { status?: string; limit?: number; offset?: number }): Promise<Bid[]>;
  updateBid(id: string, consultantId: string, data: Partial<InsertBid>): Promise<Bid>;
  withdrawBid(id: string, consultantId: string): Promise<Bid>;
  acceptBid(id: string, clientId: string): Promise<Bid>;
  declineBid(id: string, clientId: string, message?: string): Promise<Bid>;
  getBidAnalytics(bidId: string): Promise<{
    viewCount: number;
    comparedCount: number;
    isShortlisted: boolean;
    clarificationCount: number;
  }>;
  markBidExpired(bidId: string): Promise<Bid>;
  
  // Bid Shortlist operations
  addToShortlist(data: InsertBidShortlist): Promise<BidShortlist>;
  removeFromShortlist(jobId: string, bidId: string, clientId: string): Promise<void>;
  getShortlistedBids(jobId: string, clientId: string): Promise<BidShortlist[]>;
  isShortlisted(jobId: string, bidId: string): Promise<boolean>;
  
  // Bid Clarification operations
  createClarification(data: InsertBidClarification): Promise<BidClarification>;
  getBidClarifications(bidId: string): Promise<BidClarification[]>;
  answerClarification(id: string, answer: string): Promise<BidClarification>;
  
  // Bid View operations
  trackBidView(data: InsertBidView): Promise<BidView>;
  getBidViews(bidId: string): Promise<BidView[]>;
  incrementBidViewCount(bidId: string): Promise<void>;
  incrementBidComparedCount(bidIds: string[]): Promise<void>;
  
  // RFQ operations
  createRFQInvitation(data: InsertRFQInvitation): Promise<RFQInvitation>;
  getRFQInvitation(id: string): Promise<RFQInvitation | undefined>;
  getConsultantRFQInvitations(consultantId: string, status?: string): Promise<RFQInvitation[]>;
  getJobRFQInvitations(jobId: string): Promise<RFQInvitation[]>;
  respondToRFQ(id: string, bidId: string, status: 'responded' | 'declined'): Promise<RFQInvitation>;
  markRFQExpired(id: string): Promise<RFQInvitation>;
  
  searchConsultants(options?: {
    search?: string;
    categoryId?: string;
    minRate?: number;
    maxRate?: number;
    skills?: string[];
    experience?: string;
    minRating?: number;
    operatingRegions?: string[];
    availability?: string;
    verified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ consultants: (ConsultantProfile & { categoryPathLabel: string; primaryCategoryId: string | null })[]; total: number }>;
  
  // Quote Request operations
  createQuoteRequest(quoteRequest: InsertQuoteRequest): Promise<QuoteRequest>;
  getQuoteRequests(userId: string, role: 'client' | 'consultant'): Promise<QuoteRequest[]>;
  updateQuoteRequest(id: string, data: Partial<InsertQuoteRequest>): Promise<QuoteRequest>;
  
  // User Subscription operations
  createUserSubscription(userId: string, planId: string): Promise<UserSubscription>;
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  updateSubscriptionStatus(subscriptionId: string, status: string): Promise<UserSubscription>;
  
  // Payment Session operations
  createPaymentSession(userId: string, planId: string, sessionId: string, planPrice: string, planName: string): Promise<PaymentSession>;
  getPaymentSessionBySessionId(sessionId: string): Promise<PaymentSession | undefined>;
  updatePaymentSessionStatus(sessionId: string, status: string): Promise<void>;
  
  // Subscription Plan operations
  getSubscriptionPlanById(planId: string): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined>;
  
  // =============================================================================
  // MESSAGING & COLLABORATION OPERATIONS
  // =============================================================================
  
  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getUserConversations(userId: string, options?: { archived?: boolean; limit?: number }): Promise<Conversation[]>;
  updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation>;
  archiveConversation(id: string, userId: string): Promise<Conversation>;
  
  // Conversation Participant operations
  addParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]>;
  isConversationParticipant(conversationId: string, userId: string): Promise<boolean>;
  updateParticipant(id: string, data: Partial<InsertConversationParticipant>): Promise<ConversationParticipant>;
  removeParticipant(conversationId: string, userId: string): Promise<void>;
  updateLastReadAt(conversationId: string, userId: string): Promise<void>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: string): Promise<Message | undefined>;
  getConversationMessages(conversationId: string, options?: { limit?: number; offset?: number; beforeMessageId?: string }): Promise<Message[]>;
  updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message>;
  deleteMessage(id: string, userId: string): Promise<void>; // Soft delete
  searchMessages(userId: string, query: string, options?: { conversationId?: string; limit?: number }): Promise<Message[]>;
  
  // Message Receipt operations
  createMessageReceipt(receipt: InsertMessageReceipt): Promise<MessageReceipt>;
  markMessageDelivered(messageId: string, userId: string): Promise<void>;
  markMessageRead(messageId: string, userId: string): Promise<void>;
  getUnreadCount(conversationId: string, userId: string): Promise<number>;
  
  // Message Template operations
  createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  getUserMessageTemplates(userId: string): Promise<MessageTemplate[]>;
  updateMessageTemplate(id: string, data: Partial<InsertMessageTemplate>): Promise<MessageTemplate>;
  deleteMessageTemplate(id: string): Promise<void>;
  incrementTemplateUsage(id: string): Promise<void>;
  
  // Message File operations
  createMessageFile(file: InsertMessageFile): Promise<MessageFile>;
  getMessageFiles(messageId: string): Promise<MessageFile[]>;
  getConversationFiles(conversationId: string, options?: { limit?: number }): Promise<MessageFile[]>;
  updateMessageFile(id: string, data: Partial<InsertMessageFile>): Promise<MessageFile>;
  
  // File Version operations
  createFileVersion(version: InsertFileVersion): Promise<FileVersion>;
  getFileVersions(originalFileId: string): Promise<FileVersion[]>;
  
  // Meeting operations
  createMeeting(meeting: InsertMeetingLink): Promise<MeetingLink>;
  getMeeting(id: string): Promise<MeetingLink | undefined>;
  getConversationMeetings(conversationId: string, options?: { upcoming?: boolean }): Promise<MeetingLink[]>;
  updateMeeting(id: string, data: Partial<InsertMeetingLink>): Promise<MeetingLink>;
  
  // Meeting Participant operations
  addMeetingParticipant(participant: InsertMeetingParticipant): Promise<MeetingParticipant>;
  getMeetingParticipants(meetingId: string): Promise<MeetingParticipant[]>;
  updateMeetingParticipant(id: string, data: Partial<InsertMeetingParticipant>): Promise<MeetingParticipant>;
  
  // Meeting Reminder operations
  createMeetingReminder(reminder: InsertMeetingReminder): Promise<MeetingReminder>;
  getPendingReminders(): Promise<MeetingReminder[]>;
  markReminderSent(id: string): Promise<void>;
  
  // Conversation Label operations
  addConversationLabel(label: InsertConversationLabel): Promise<ConversationLabel>;
  getConversationLabels(conversationId: string, userId: string): Promise<ConversationLabel[]>;
  removeConversationLabel(id: string): Promise<void>;
  
  // Message Moderation operations
  createModerationAction(action: InsertMessageModeration): Promise<MessageModeration>;
  getMessageModerationHistory(messageId: string): Promise<MessageModeration[]>;
  
  // Conversation Preferences operations
  getConversationPreferences(userId: string, conversationId: string): Promise<ConversationPreference | undefined>;
  upsertConversationPreferences(preferences: InsertConversationPreference): Promise<ConversationPreference>;
  
  // Conversation Pin operations
  pinConversation(userId: string, conversationId: string, displayOrder?: number): Promise<ConversationPin>;
  unpinConversation(userId: string, conversationId: string): Promise<void>;
  getUserPinnedConversations(userId: string): Promise<ConversationPin[]>;
  
  // Rate Limit operations
  getRateLimit(userId: string, endpoint: string): Promise<RateLimit | undefined>;
  createRateLimit(limit: InsertRateLimit): Promise<RateLimit>;
  incrementRateLimit(userId: string, endpoint: string): Promise<void>;
  cleanupExpiredRateLimits(): Promise<void>;
  
  // Login History operations
  createLoginHistory(loginHistory: InsertLoginHistory): Promise<LoginHistory>;
  getLoginHistory(userId: string, options?: { limit?: number; offset?: number }): Promise<LoginHistory[]>;
  
  // Active Session operations
  createActiveSession(session: InsertActiveSession): Promise<ActiveSession>;
  getActiveSessions(userId: string): Promise<ActiveSession[]>;
  updateSessionActivity(sessionId: string): Promise<void>;
  terminateSession(sessionId: string): Promise<void>;
  cleanupInactiveSessions(maxInactiveMinutes?: number): Promise<void>;
  
  // User Activity Log operations
  createActivityLog(activityLog: InsertUserActivityLog): Promise<UserActivityLog>;
  getUserActivityLogs(userId: string, options?: { 
    limit?: number; 
    offset?: number; 
    action?: string; 
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserActivityLog[]>;
  getAllActivityLogs(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserActivityLog[]>;
  
  // Saved Searches operations
  createSavedSearch(savedSearch: InsertSavedSearch): Promise<SavedSearch>;
  getSavedSearches(userId: string): Promise<SavedSearch[]>;
  getSavedSearch(id: string): Promise<SavedSearch | undefined>;
  updateSavedSearch(id: string, data: {
    name?: string;
    filters?: any;
    notificationsEnabled?: boolean;
    lastNotifiedAt?: Date | null;
  }): Promise<SavedSearch>;
  deleteSavedSearch(id: string): Promise<void>;

  // Notifications operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(notificationId: string): Promise<Notification | undefined>;
  getNotifications(userId: string, options?: { 
    limit?: number; 
    offset?: number; 
    read?: boolean;
  }): Promise<{ notifications: Notification[]; total: number }>;
  getUnreadCount(userId: string): Promise<number>;
  markNotificationAsRead(notificationId: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;

  // Notification Preferences operations
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(userId: string, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences>;

  // Project/Contract operations
  createProject(project: InsertProject): Promise<Project>;
  getProjectById(projectId: string): Promise<Project | undefined>;
  getConsultantProjects(consultantId: string, filters?: { status?: string; categoryId?: string; limit?: number; offset?: number }): Promise<{ projects: Project[]; total: number }>;
  getClientProjects(clientId: string, filters?: { status?: string; categoryId?: string; limit?: number; offset?: number }): Promise<{ projects: Project[]; total: number }>;
  updateProject(projectId: string, data: Partial<InsertProject>): Promise<Project>;
  updateProjectStatus(projectId: string, status: string, userId: string): Promise<Project>;
  updateMilestoneStatus(projectId: string, milestoneIndex: number, status: string, progress?: number): Promise<Project>;
  extendProjectDeadline(projectId: string, newEndDate: Date, reason: string, userId: string): Promise<Project>;
  
  // Milestone Comment operations
  addMilestoneComment(comment: InsertMilestoneComment): Promise<MilestoneComment>;
  getProjectComments(projectId: string, milestoneIndex?: number): Promise<MilestoneComment[]>;
  resolveComment(commentId: string, userId: string): Promise<MilestoneComment>;
  unresolveComment(commentId: string): Promise<MilestoneComment>;
  
  // Project Deliverable operations
  submitDeliverable(deliverable: InsertProjectDeliverable): Promise<ProjectDeliverable>;
  getProjectDeliverables(projectId: string, milestoneIndex?: number): Promise<ProjectDeliverable[]>;
  approveDeliverable(deliverableId: string, reviewedBy: string): Promise<ProjectDeliverable>;
  requestRevision(deliverableId: string, reviewNotes: string, reviewedBy: string): Promise<ProjectDeliverable>;
  
  // Project Team Member operations
  addTeamMember(member: InsertProjectTeamMember): Promise<ProjectTeamMember>;
  getProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]>;
  removeTeamMember(projectId: string, userId: string): Promise<void>;
  updateTeamMemberRole(projectId: string, userId: string, role: string, assignedMilestones?: number[]): Promise<ProjectTeamMember>;
  
  // Project Activity Log operations
  logProjectActivity(activity: InsertProjectActivityLog): Promise<ProjectActivityLog>;
  getProjectActivityLog(projectId: string, filters?: { action?: string; limit?: number; offset?: number }): Promise<{ activities: ProjectActivityLog[]; total: number }>;
  
  // ============================================================================
  // DELIVERY & FULFILLMENT SYSTEM OPERATIONS
  // ============================================================================
  
  // 7.1 FOR SERVICES - FILE VERSIONING
  // Deliverable Version operations
  uploadDeliverableVersion(version: InsertDeliverableVersion): Promise<DeliverableVersion>;
  getDeliverableVersions(deliverableId: string): Promise<DeliverableVersion[]>;
  getDeliverableVersion(versionId: string): Promise<DeliverableVersion | undefined>;
  getLatestVersion(deliverableId: string): Promise<DeliverableVersion | undefined>;
  deleteDeliverableVersion(versionId: string): Promise<void>;
  compareVersions(versionId1: string, versionId2: string): Promise<{ version1: DeliverableVersion; version2: DeliverableVersion }>;
  setLatestVersion(deliverableId: string, versionId: string): Promise<void>;
  
  // Deliverable Download operations
  trackDownload(download: InsertDeliverableDownload): Promise<DeliverableDownload>;
  getDownloadHistory(deliverableId: string, filters?: { versionId?: string; userId?: string }): Promise<DeliverableDownload[]>;
  
  // 7.2 FOR HARDWARE - SHIPPING & QUALITY
  // Hardware Shipment operations
  createShipment(shipment: InsertHardwareShipment): Promise<HardwareShipment>;
  getShipment(shipmentId: string): Promise<HardwareShipment | undefined>;
  getProjectShipments(projectId: string): Promise<HardwareShipment[]>;
  updateShipmentStatus(shipmentId: string, status: ShipmentStatus, notes?: string, location?: string): Promise<HardwareShipment>;
  getShipmentTimeline(shipmentId: string): Promise<any[]>; // Returns status history
  confirmDelivery(shipmentId: string, receivedBy: string, signatureUrl?: string, notes?: string): Promise<HardwareShipment>;
  scheduleInstallation(shipmentId: string, scheduledAt: Date): Promise<HardwareShipment>;
  completeInstallation(shipmentId: string, installedBy: string, notes?: string): Promise<HardwareShipment>;
  
  // Quality Inspection operations
  createQualityInspection(inspection: InsertQualityInspection): Promise<QualityInspection>;
  getShipmentInspections(shipmentId: string): Promise<QualityInspection[]>;
  updateInspectionStatus(inspectionId: string, status: string, approvedBy?: string): Promise<QualityInspection>;
  getQualityInspection(inspectionId: string): Promise<QualityInspection | undefined>;
  
  // Return/Replacement operations
  createReturnRequest(returnRequest: InsertReturnReplacement): Promise<ReturnReplacement>;
  getShipmentReturns(shipmentId: string): Promise<ReturnReplacement[]>;
  updateReturnStatus(returnId: string, status: string, resolution?: string, notes?: string): Promise<ReturnReplacement>;
  approveReturn(returnId: string, approvedBy: string): Promise<ReturnReplacement>;
  processRefund(returnId: string, amount: number, processedBy: string): Promise<ReturnReplacement>;
  
  // Warranty Claim operations
  createWarrantyClaim(claim: InsertWarrantyClaim): Promise<WarrantyClaim>;
  getShipmentWarrantyClaims(shipmentId: string): Promise<WarrantyClaim[]>;
  getUserWarrantyClaims(userId: string): Promise<WarrantyClaim[]>;
  updateWarrantyClaimStatus(claimId: string, status: string, reviewedBy?: string, notes?: string): Promise<WarrantyClaim>;
  resolveWarrantyClaim(claimId: string, resolutionType: string, details: string): Promise<WarrantyClaim>;
  
  // 7.3 FOR SOFTWARE - LICENSE & SUBSCRIPTION
  // Software License operations
  generateLicense(license: InsertSoftwareLicense): Promise<SoftwareLicense>;
  getLicense(licenseId: string): Promise<SoftwareLicense | undefined>;
  getProjectLicenses(projectId: string): Promise<SoftwareLicense[]>;
  getUserLicenses(userId: string): Promise<SoftwareLicense[]>;
  deactivateLicense(licenseId: string, deactivatedBy: string, reason?: string): Promise<SoftwareLicense>;
  extendLicense(licenseId: string, newExpiryDate: Date): Promise<SoftwareLicense>;
  
  // Software Subscription operations
  createSubscription(subscription: InsertSoftwareSubscription): Promise<SoftwareSubscription>;
  getLicenseSubscription(licenseId: string): Promise<SoftwareSubscription | undefined>;
  updateSubscriptionStatus(subscriptionId: string, status: string): Promise<SoftwareSubscription>;
  renewSubscription(subscriptionId: string): Promise<SoftwareSubscription>;
  cancelSubscription(subscriptionId: string, reason?: string): Promise<SoftwareSubscription>;
  
  // Software Activation operations
  activateLicense(activation: InsertSoftwareActivation): Promise<SoftwareActivation>;
  getLicenseActivations(licenseId: string): Promise<SoftwareActivation[]>;
  deactivateDevice(activationId: string, deactivatedBy: string, reason?: string): Promise<SoftwareActivation>;
  updateActivationUsage(activationId: string): Promise<SoftwareActivation>;
  getActiveDevices(licenseId: string): Promise<SoftwareActivation[]>;

  // ============================================================================
  // 8. PAYMENT & ESCROW SYSTEM
  // ============================================================================

  // 8.1 Escrow Management operations (12 methods)
  createEscrowAccount(account: InsertEscrowAccount): Promise<EscrowAccount>;
  getEscrowAccount(id: string): Promise<EscrowAccount | undefined>;
  getEscrowAccountByProject(projectId: string): Promise<EscrowAccount | undefined>;
  depositToEscrow(accountId: string, amount: string, createdBy: string, description?: string): Promise<EscrowAccount>;
  releaseFromEscrow(accountId: string, amount: string, createdBy: string, description?: string): Promise<EscrowAccount>;
  partialReleaseFromEscrow(accountId: string, amount: string, milestoneIndex: number | null, createdBy: string, description?: string): Promise<EscrowAccount>;
  holdEscrowFunds(accountId: string, amount: string, createdBy: string, description?: string): Promise<EscrowAccount>;
  refundFromEscrow(accountId: string, amount: string, createdBy: string, description?: string): Promise<EscrowAccount>;
  getEscrowTransactions(accountId: string): Promise<EscrowTransaction[]>;
  getEscrowBalance(accountId: string): Promise<{ totalAmount: string; availableBalance: string; onHoldAmount: string; releasedAmount: string; refundedAmount: string }>;
  updateEscrowStatus(accountId: string, status: string): Promise<EscrowAccount>;
  getEscrowAnalytics(): Promise<{ totalEscrow: string; activeProjects: number; pendingReleases: number }>;

  // 8.2 Payment Milestone operations (8 methods)
  createPaymentMilestone(milestone: InsertPaymentMilestone): Promise<PaymentMilestone>;
  getPaymentMilestones(projectId: string): Promise<PaymentMilestone[]>;
  updateMilestonePaymentStatus(milestoneId: string, status: string, releasedBy?: string): Promise<PaymentMilestone>;
  releaseMilestonePayment(milestoneId: string, releasedBy: string): Promise<PaymentMilestone>;
  linkMilestoneToPayment(projectId: string, milestoneIndex: number, amount: string): Promise<PaymentMilestone>;
  getPendingMilestonePayments(projectId: string): Promise<PaymentMilestone[]>;
  getCompletedMilestonePayments(projectId: string): Promise<PaymentMilestone[]>;
  getMilestonePaymentHistory(projectId: string): Promise<PaymentMilestone[]>;

  // 8.3 Invoice Management operations (10 methods)
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoiceById(id: string): Promise<Invoice | undefined>;
  getAllInvoices(filters?: { status?: string; projectId?: string; userId?: string }): Promise<Invoice[]>;
  updateInvoiceStatus(id: string, status: string): Promise<Invoice>;
  generateInvoiceNumber(): Promise<string>;
  getInvoicesByProject(projectId: string): Promise<Invoice[]>;
  getInvoicesByUser(userId: string, role: 'client' | 'consultant'): Promise<Invoice[]>;
  markInvoiceAsPaid(id: string): Promise<Invoice>;
  cancelInvoice(id: string): Promise<Invoice>;
  getOverdueInvoices(): Promise<Invoice[]>;

  // 8.4 Wallet System operations (9 methods)
  createWalletAccount(account: InsertWalletAccount): Promise<WalletAccount>;
  getWalletAccount(userId: string): Promise<WalletAccount | undefined>;
  addFundsToWallet(userId: string, amount: string, description?: string): Promise<WalletAccount>;
  deductFromWallet(userId: string, amount: string, projectId?: string, description?: string): Promise<WalletAccount>;
  getWalletBalance(userId: string): Promise<string>;
  getWalletTransactions(userId: string): Promise<WalletTransaction[]>;
  withdrawFromWallet(userId: string, amount: string, description?: string): Promise<WalletAccount>;
  getWalletHistory(userId: string, limit?: number): Promise<WalletTransaction[]>;
  updateWalletPreferences(userId: string, preferences: Partial<InsertPaymentPreferences>): Promise<PaymentPreferences>;

  // 8.5 Refund & Tax operations (11 methods)
  createRefundRequest(request: InsertRefundRequest): Promise<RefundRequest>;
  getRefundRequest(id: string): Promise<RefundRequest | undefined>;
  getAllRefundRequests(filters?: { status?: string; userId?: string }): Promise<RefundRequest[]>;
  updateRefundStatus(id: string, status: string, adminId?: string, adminNotes?: string): Promise<RefundRequest>;
  approveRefundRequest(id: string, adminId: string, notes?: string): Promise<RefundRequest>;
  rejectRefundRequest(id: string, adminId: string, notes: string): Promise<RefundRequest>;
  processRefund(id: string): Promise<RefundRequest>;
  createTaxProfile(profile: InsertTaxProfile): Promise<TaxProfile>;
  getTaxProfile(userId: string): Promise<TaxProfile | undefined>;
  updateTaxProfile(userId: string, updates: Partial<InsertTaxProfile>): Promise<TaxProfile>;
  calculateVAT(amount: number): Promise<{ vatAmount: number; total: number }>;

  // 8.6 Analytics & Transaction History operations (9 methods)
  getAllTransactions(userId?: string): Promise<any[]>; // Combined escrow + wallet + refund transactions
  getTransactionsByUser(userId: string, role: 'client' | 'consultant'): Promise<any[]>;
  getTransactionsByProject(projectId: string): Promise<any[]>;
  exportTransactions(filters?: any): Promise<string>; // Returns CSV string
  getVendorEarnings(consultantId: string, period?: { start: Date; end: Date }): Promise<any>;
  getClientSpending(clientId: string, period?: { start: Date; end: Date }): Promise<any>;
  getPaymentAnalytics(): Promise<any>; // Platform-wide analytics
  getEarningsChartData(consultantId: string, period: 'week' | 'month' | 'year'): Promise<any[]>;
  getSpendingChartData(clientId: string, period: 'week' | 'month' | 'year'): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // ============================================================================
  // PAYMENT SYSTEM UTILITIES: Transaction Safety & Ownership Verification
  // ============================================================================

  /**
   * Executes payment operations within a database transaction for atomicity.
   * Auto-rollback on error ensures consistency.
   */
  private async withPaymentTransaction<T>(
    operation: (tx: any) => Promise<T>
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      return await operation(tx);
    });
  }

  /**
   * Verifies that a user owns or participates in a project.
   * Throws error if unauthorized.
   */
  private async assertProjectOwnership(
    userId: string,
    projectId: string,
    allowedRole: 'client' | 'consultant' | 'both',
    tx?: any
  ): Promise<void> {
    const dbInstance = tx || db;
    const [project] = await dbInstance
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      throw new Error('Project not found');
    }

    const isClient = project.clientId === userId;
    const isConsultant = project.consultantId === userId;

    if (allowedRole === 'client' && !isClient) {
      throw new Error('Unauthorized: Only project client can perform this action');
    }

    if (allowedRole === 'consultant' && !isConsultant) {
      throw new Error('Unauthorized: Only project consultant can perform this action');
    }

    if (allowedRole === 'both' && !isClient && !isConsultant) {
      throw new Error('Unauthorized: Only project participants can perform this action');
    }
  }

  /**
   * Verifies that a wallet belongs to the user.
   * Throws error if unauthorized.
   */
  private async assertWalletOwnership(
    userId: string,
    walletId: string,
    tx?: any
  ): Promise<void> {
    const dbInstance = tx || db;
    const [wallet] = await dbInstance
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.id, walletId));

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.userId !== userId) {
      throw new Error('Unauthorized: Wallet does not belong to this user');
    }
  }

  /**
   * Verifies that an escrow account is accessible to the user via project ownership.
   * Throws error if unauthorized.
   */
  private async assertEscrowOwnership(
    userId: string,
    escrowAccountId: string,
    allowedRole: 'client' | 'consultant' | 'both',
    tx?: any
  ): Promise<void> {
    const dbInstance = tx || db;
    const [escrowAccount] = await dbInstance
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.id, escrowAccountId));

    if (!escrowAccount) {
      throw new Error('Escrow account not found');
    }

    // Verify via project ownership
    await this.assertProjectOwnership(userId, escrowAccount.projectId, allowedRole, tx);
  }

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByReplitSub(replitSub: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.replitSub, replitSub));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Build the update object, excluding undefined values
    const updateData: any = { updatedAt: new Date() };
    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.firstName !== undefined) updateData.firstName = userData.firstName;
    if (userData.lastName !== undefined) updateData.lastName = userData.lastName;
    if (userData.profileImageUrl !== undefined) updateData.profileImageUrl = userData.profileImageUrl;
    if (userData.authProvider !== undefined) updateData.authProvider = userData.authProvider;
    if (userData.replitSub !== undefined) updateData.replitSub = userData.replitSub;
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.status !== undefined) updateData.status = userData.status;
    if (userData.emailVerified !== undefined) updateData.emailVerified = userData.emailVerified;
    
    const [user] = await db
      .insert(users)
      .values(userData as any)
      .onConflictDoUpdate({
        target: users.id,
        set: updateData,
      })
      .returning();
    return user;
  }

  async getSession(sessionId: string): Promise<any> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sid, sessionId));
    return session?.sess;
  }

  // Client Profile operations
  async getClientProfile(userId: string): Promise<ClientProfile | undefined> {
    const [profile] = await db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.userId, userId));
    return profile;
  }

  async createClientProfile(profile: InsertClientProfile): Promise<ClientProfile> {
    const [created] = await db
      .insert(clientProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async updateClientProfile(
    userId: string,
    profileData: Partial<InsertClientProfile>
  ): Promise<ClientProfile> {
    const [updated] = await db
      .update(clientProfiles)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(clientProfiles.userId, userId))
      .returning();
    return updated;
  }

  // Team Members operations
  async getTeamMembers(clientProfileId: string): Promise<TeamMember[]> {
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.clientProfileId, clientProfileId))
      .orderBy(desc(teamMembers.createdAt));
    return members;
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id));
    return member;
  }

  async inviteTeamMember(
    member: InsertTeamMember,
    invitationToken: string,
    expiry: Date
  ): Promise<TeamMember> {
    const [created] = await db
      .insert(teamMembers)
      .values({
        ...member,
        invitationToken,
        invitationSentAt: new Date(),
        invitationExpiry: expiry,
      })
      .returning();
    return created;
  }

  async updateTeamMember(id: string, data: Partial<UpdateTeamMember>): Promise<TeamMember> {
    const [updated] = await db
      .update(teamMembers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return updated;
  }

  async revokeTeamMember(id: string, revokedBy: string): Promise<TeamMember> {
    const [updated] = await db
      .update(teamMembers)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy,
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.id, id))
      .returning();
    return updated;
  }

  async acceptInvitation(token: string, userId: string): Promise<TeamMember> {
    const [updated] = await db
      .update(teamMembers)
      .set({
        status: 'accepted',
        userId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.invitationToken, token))
      .returning();
    return updated;
  }

  async declineInvitation(token: string): Promise<TeamMember> {
    const [updated] = await db
      .update(teamMembers)
      .set({
        status: 'declined',
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.invitationToken, token))
      .returning();
    return updated;
  }

  async getTeamMemberByToken(token: string): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.invitationToken, token));
    return member;
  }

  async resendInvitation(id: string, invitationToken: string, expiry: Date): Promise<TeamMember> {
    const [updated] = await db
      .update(teamMembers)
      .set({
        invitationToken,
        invitationSentAt: new Date(),
        invitationExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.id, id))
      .returning();
    return updated;
  }

  // Consultant Profile operations
  async getConsultantProfile(userId: string): Promise<ConsultantProfile | undefined> {
    const [profile] = await db
      .select()
      .from(consultantProfiles)
      .where(eq(consultantProfiles.userId, userId));
    return profile;
  }

  async createConsultantProfile(profile: InsertConsultantProfile): Promise<ConsultantProfile> {
    const [created] = await db
      .insert(consultantProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async updateConsultantProfile(
    userId: string,
    profileData: Partial<InsertConsultantProfile>
  ): Promise<ConsultantProfile> {
    const [updated] = await db
      .update(consultantProfiles)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(consultantProfiles.userId, userId))
      .returning();
    return updated;
  }

  // Consultant Category operations
  async getConsultantCategories(userId: string): Promise<ConsultantCategoryWithDetails[]> {
    // First get the consultant profile
    const profile = await this.getConsultantProfile(userId);
    if (!profile) {
      return [];
    }

    // Get categories with details
    const results = await db
      .select({
        id: consultantCategories.id,
        categoryId: consultantCategories.categoryId,
        isPrimary: consultantCategories.isPrimary,
        category: categories,
      })
      .from(consultantCategories)
      .innerJoin(categories, eq(consultantCategories.categoryId, categories.id))
      .where(eq(consultantCategories.consultantProfileId, profile.id));

    return results;
  }

  async setConsultantCategories(
    userId: string,
    categoryIds: string[],
    primaryCategoryId: string | null
  ): Promise<ConsultantCategoryWithDetails[]> {
    // Get or create consultant profile
    let profile = await this.getConsultantProfile(userId);
    if (!profile) {
      // Auto-create minimal consultant profile to preserve onboarding flow
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error("User not found");
      }
      
      profile = await this.createConsultantProfile({
        userId,
        fullName: user.email.split('@')[0], // Placeholder fullName from email
      });
    }

    // Validate that all categories exist and are active/visible (skip if empty array)
    if (categoryIds.length > 0) {
      const validCategories = await db
        .select()
        .from(categories)
        .where(
          and(
            inArray(categories.id, categoryIds),
            eq(categories.active, true),
            eq(categories.visible, true)
          )
        );

      if (validCategories.length !== categoryIds.length) {
        throw new Error("Some categories are invalid or inactive");
      }

      // Validate primary category is in the selection
      if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
        throw new Error("Primary category must be in selected categories");
      }
    }

    // Perform transactional update: delete all existing + insert new
    await db.transaction(async (tx) => {
      // Delete existing categories
      await tx
        .delete(consultantCategories)
        .where(eq(consultantCategories.consultantProfileId, profile.id));

      // Insert new categories if any
      if (categoryIds.length > 0) {
        await tx.insert(consultantCategories).values(
          categoryIds.map((categoryId) => ({
            id: nanoid(),
            consultantProfileId: profile.id,
            categoryId,
            isPrimary: categoryId === primaryCategoryId,
          }))
        );
      }
    });

    // Return updated categories with details (or empty array if no categories)
    return this.getConsultantCategories(userId);
  }

  // User update operations
  async updateUser(userId: string, data: Partial<InsertUser>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // Email verification operations
  async setEmailVerificationToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerificationToken: token,
        emailTokenExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserByEmailToken(token: string): Promise<User | undefined> {
    // Note: Don't filter by expiry here - let the route handle expiry logic
    // for better error messaging (expired vs invalid tokens)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token));
    return user;
  }

  async verifyUserEmail(userId: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async invalidateEmailVerificationToken(userId: string): Promise<void> {
    const [updated] = await db
      .update(users)
      .set({
        emailVerificationToken: null,
        emailTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updated) {
      throw new Error(`Failed to invalidate email verification token for user ${userId}`);
    }
  }

  // Password reset operations
  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetTokenExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return user;
  }

  async resetPassword(userId: string, newPasswordHash: string): Promise<void> {
    await db
      .update(users)
      .set({
        password: newPasswordHash,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async invalidatePasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Two-Factor Authentication operations
  async setup2FA(userId: string, secret: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async enable2FA(userId: string, backupCodes: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        twoFactorEnabled: true,
        backupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async disable2FA(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async verify2FAToken(userId: string, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.twoFactorSecret) {
      return false;
    }

    const speakeasy = await import('speakeasy');
    return speakeasy.default.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    const codeIndex = user.backupCodes.indexOf(code);
    if (codeIndex === -1) {
      return false;
    }

    const remainingCodes = user.backupCodes.filter((c) => c !== code);
    await db
      .update(users)
      .set({
        backupCodes: remainingCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return true;
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    const crypto = await import('crypto');
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    await db
      .update(users)
      .set({
        backupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return backupCodes;
  }

  // KYC Document operations
  async getKycDocument(userId: string, profileType: 'client' | 'consultant'): Promise<KycDocument | undefined> {
    const [doc] = await db
      .select()
      .from(kycDocuments)
      .where(
        and(
          eq(kycDocuments.userId, userId),
          eq(kycDocuments.profileType, profileType)
        )
      );
    return doc;
  }

  async saveKycDocument(document: InsertKycDocument): Promise<KycDocument> {
    // Check if document already exists
    const existing = await this.getKycDocument(document.userId, document.profileType as 'client' | 'consultant');
    
    if (existing) {
      // Update existing
      const [updated] = await db
        .update(kycDocuments)
        .set({ ...document, updatedAt: new Date() })
        .where(eq(kycDocuments.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db
        .insert(kycDocuments)
        .values(document)
        .returning();
      return created;
    }
  }

  async updateKycDocument(userId: string, profileType: string, data: Partial<InsertKycDocument>): Promise<KycDocument> {
    const existing = await this.getKycDocument(userId, profileType as 'client' | 'consultant');
    if (!existing) {
      throw new Error("KYC document not found");
    }

    const [updated] = await db
      .update(kycDocuments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(kycDocuments.id, existing.id))
      .returning();
    return updated;
  }

  // Education Record operations
  async getEducationRecords(consultantProfileId: string): Promise<EducationRecord[]> {
    return await db
      .select()
      .from(educationRecords)
      .where(eq(educationRecords.consultantProfileId, consultantProfileId))
      .orderBy(desc(educationRecords.startDate));
  }

  async createEducationRecord(record: InsertEducationRecord): Promise<EducationRecord> {
    const [created] = await db
      .insert(educationRecords)
      .values(record)
      .returning();
    return created;
  }

  async updateEducationRecord(id: string, data: Partial<InsertEducationRecord>): Promise<EducationRecord> {
    const [updated] = await db
      .update(educationRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(educationRecords.id, id))
      .returning();
    return updated;
  }

  async deleteEducationRecord(id: string): Promise<void> {
    await db
      .delete(educationRecords)
      .where(eq(educationRecords.id, id));
  }

  // Bank Information operations
  async getBankInformation(consultantProfileId: string): Promise<BankInformation | undefined> {
    const [info] = await db
      .select()
      .from(bankInformation)
      .where(eq(bankInformation.consultantProfileId, consultantProfileId));
    return info;
  }

  async saveBankInformation(info: InsertBankInformation): Promise<BankInformation> {
    // Check if bank information already exists
    const existing = await this.getBankInformation(info.consultantProfileId);
    
    if (existing) {
      // Update existing
      const [updated] = await db
        .update(bankInformation)
        .set({ ...info, updatedAt: new Date() })
        .where(eq(bankInformation.consultantProfileId, info.consultantProfileId))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db
        .insert(bankInformation)
        .values(info)
        .returning();
      return created;
    }
  }

  async updateBankInformation(consultantProfileId: string, data: Partial<InsertBankInformation>): Promise<BankInformation> {
    const [updated] = await db
      .update(bankInformation)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bankInformation.consultantProfileId, consultantProfileId))
      .returning();
    return updated;
  }

  // Pricing Template operations
  async getPricingTemplates(consultantProfileId: string): Promise<PricingTemplate[]> {
    return await db
      .select()
      .from(pricingTemplates)
      .where(eq(pricingTemplates.consultantProfileId, consultantProfileId))
      .orderBy(desc(pricingTemplates.createdAt));
  }

  async createPricingTemplate(template: InsertPricingTemplate): Promise<PricingTemplate> {
    const [created] = await db
      .insert(pricingTemplates)
      .values(template)
      .returning();
    return created;
  }

  async updatePricingTemplate(id: string, data: Partial<InsertPricingTemplate>): Promise<PricingTemplate> {
    const [updated] = await db
      .update(pricingTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pricingTemplates.id, id))
      .returning();
    return updated;
  }

  async deletePricingTemplate(id: string): Promise<void> {
    await db
      .delete(pricingTemplates)
      .where(eq(pricingTemplates.id, id));
  }

  // Review operations
  async getReviews(consultantId: string, options?: { limit?: number; offset?: number }): Promise<Review[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.revieweeId, consultantId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createReview(review: InsertReview): Promise<Review> {
    return await db.transaction(async (tx) => {
      // Calculate 48-hour edit window
      const now = new Date();
      const canEditUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Create the review with edit window
      const [created] = await tx
        .insert(reviews)
        .values({
          ...review,
          canEditUntil,
          updatedAt: now,
        })
        .returning();

      // Update consultant profile stats if reviewType is for consultant
      if (review.reviewType === 'for_consultant') {
        const consultant = await tx
          .select()
          .from(consultantProfiles)
          .where(eq(consultantProfiles.userId, review.revieweeId))
          .limit(1);

        if (consultant.length > 0) {
          const currentTotalReviews = consultant[0].totalReviews || 0;
          const currentRating = parseFloat(consultant[0].rating || '0');
          const newTotalReviews = currentTotalReviews + 1;
          const newRating = ((currentRating * currentTotalReviews) + review.rating) / newTotalReviews;

          await tx
            .update(consultantProfiles)
            .set({
              rating: newRating.toFixed(2),
              totalReviews: newTotalReviews,
              updatedAt: new Date()
            })
            .where(eq(consultantProfiles.userId, review.revieweeId));
        }
      }

      return created;
    });
  }

  async updateReview(id: string, userId: string, data: Partial<InsertReview>): Promise<Review> {
    // First check if user can edit this review
    const canEdit = await this.canEditReview(id, userId);
    if (!canEdit) {
      throw new Error('Cannot edit this review (48-hour window expired or not your review)');
    }
    
    const [updated] = await db
      .update(reviews)
      .set({
        ...data,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Review not found');
    }
    
    return updated;
  }

  async deleteReview(id: string): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  async getReviewById(id: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1);
    
    return review;
  }

  async getReviewsByProject(projectId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.projectId, projectId))
      .orderBy(desc(reviews.createdAt));
  }

  async getClientReviewsReceived(clientId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.revieweeId, clientId),
          eq(reviews.reviewType, 'for_client')
        )
      )
      .orderBy(desc(reviews.createdAt));
  }

  async getClientReviewsGiven(clientId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewerId, clientId))
      .orderBy(desc(reviews.createdAt));
  }

  async canEditReview(reviewId: string, userId: string): Promise<boolean> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);
    
    if (!review) return false;
    if (review.reviewerId !== userId) return false;
    if (!review.canEditUntil) return false;
    
    return new Date() < new Date(review.canEditUntil);
  }

  async markReviewHelpful(reviewId: string, userId: string): Promise<void> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);
    
    if (!review) throw new Error('Review not found');
    
    const helpfulBy = review.helpfulBy || [];
    if (helpfulBy.includes(userId)) {
      return; // Already marked helpful by this user
    }
    
    await db
      .update(reviews)
      .set({ 
        helpful: sql`${reviews.helpful} + 1`,
        helpfulBy: [...helpfulBy, userId]
      })
      .where(eq(reviews.id, reviewId));
  }

  async unmarkReviewHelpful(reviewId: string, userId: string): Promise<void> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);
    
    if (!review) throw new Error('Review not found');
    
    const helpfulBy = review.helpfulBy || [];
    if (!helpfulBy.includes(userId)) {
      return; // Not marked helpful by this user
    }
    
    await db
      .update(reviews)
      .set({ 
        helpful: sql`${reviews.helpful} - 1`,
        helpfulBy: helpfulBy.filter((id: string) => id !== userId)
      })
      .where(eq(reviews.id, reviewId));
  }

  // Review Response operations
  async createReviewResponse(response: InsertReviewResponse): Promise<ReviewResponse> {
    const [created] = await db
      .insert(reviewResponses)
      .values(response)
      .returning();
    
    return created;
  }

  async getReviewResponse(reviewId: string): Promise<ReviewResponse | undefined> {
    const [response] = await db
      .select()
      .from(reviewResponses)
      .where(eq(reviewResponses.reviewId, reviewId))
      .limit(1);
    
    return response;
  }

  async updateReviewResponse(id: string, responseText: string): Promise<ReviewResponse> {
    const [updated] = await db
      .update(reviewResponses)
      .set({ 
        responseText,
        updatedAt: new Date()
      })
      .where(eq(reviewResponses.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Review response not found');
    }
    
    return updated;
  }

  async deleteReviewResponse(id: string): Promise<void> {
    await db.delete(reviewResponses).where(eq(reviewResponses.id, id));
  }

  // Review Report operations
  async createReviewReport(report: InsertReviewReport): Promise<ReviewReport> {
    const [created] = await db
      .insert(reviewReports)
      .values(report)
      .returning();
    
    return created;
  }

  async getReviewReports(filters?: { status?: string; reviewId?: string }): Promise<ReviewReport[]> {
    let query = db.select().from(reviewReports);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(reviewReports.status, filters.status));
    }
    if (filters?.reviewId) {
      conditions.push(eq(reviewReports.reviewId, filters.reviewId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(reviewReports.createdAt));
  }

  async getReviewReportById(id: string): Promise<ReviewReport | undefined> {
    const [report] = await db
      .select()
      .from(reviewReports)
      .where(eq(reviewReports.id, id))
      .limit(1);
    
    return report;
  }

  async resolveReviewReport(
    id: string, 
    status: string, 
    reviewedBy: string, 
    adminNotes?: string
  ): Promise<ReviewReport> {
    const [updated] = await db
      .update(reviewReports)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
        adminNotes: adminNotes || null
      })
      .where(eq(reviewReports.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Review report not found');
    }
    
    return updated;
  }

  async getReviewStats(consultantId: string): Promise<{ averageRating: number; totalReviews: number; ratingBreakdown: Record<number, number> }> {
    const allReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.revieweeId, consultantId));

    const totalReviews = allReviews.length;
    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    if (totalReviews === 0) {
      return { averageRating: 0, totalReviews: 0, ratingBreakdown };
    }

    let totalRating = 0;
    allReviews.forEach(review => {
      totalRating += review.rating;
      ratingBreakdown[review.rating] = (ratingBreakdown[review.rating] || 0) + 1;
    });

    const averageRating = totalRating / totalReviews;

    return { averageRating, totalReviews, ratingBreakdown };
  }

  // Project operations
  async getClientProjects(clientId: string, options?: { limit?: number }): Promise<any[]> {
    const limit = options?.limit || 10;
    
    const clientProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.clientId, clientId))
      .orderBy(desc(projects.updatedAt))
      .limit(limit);
    
    return clientProjects;
  }

  async getConsultantMetrics(consultantId: string): Promise<{ completionRate: number; totalProjects: number; completedProjects: number }> {
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.consultantId, consultantId));
    
    const totalProjects = allProjects.length;
    const completedProjects = allProjects.filter(p => p.status === 'completed').length;
    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
    
    return {
      completionRate,
      totalProjects,
      completedProjects
    };
  }

  async getPerformanceScore(consultantId: string): Promise<{ score: number; breakdown: { ratingScore: number; completionScore: number; responseScore: number } }> {
    // Fetch all necessary data
    const reviewStats = await this.getReviewStats(consultantId);
    const metrics = await this.getConsultantMetrics(consultantId);
    const consultant = await db
      .select()
      .from(consultantProfiles)
      .where(eq(consultantProfiles.userId, consultantId))
      .limit(1);
    
    const responseTime = consultant.length > 0 ? consultant[0].responseTime : null;
    
    // Calculate rating component (40% weight)
    // Rating is 0-5, normalize to 0-40
    // Guard against undefined/null/NaN averageRating
    const averageRating = Number.isFinite(reviewStats.averageRating) ? reviewStats.averageRating : 0;
    const ratingScore = (averageRating / 5) * 40;
    
    // Calculate completion component (40% weight)
    // Completion rate is 0-100%, normalize to 0-40
    // Guard against undefined/null/NaN completionRate
    const completionRate = Number.isFinite(metrics.completionRate) ? metrics.completionRate : 0;
    const completionScore = (completionRate / 100) * 40;
    
    // Calculate response time component (20% weight)
    // Lower response time is better
    // <60 min = 20 points, 60-120 min = 15 points, 120-240 min = 10 points, 240-480 min = 5 points, >480 min or null = 0 points
    let responseScore = 0;
    if (responseTime !== null) {
      if (responseTime < 60) {
        responseScore = 20;
      } else if (responseTime < 120) {
        responseScore = 15;
      } else if (responseTime < 240) {
        responseScore = 10;
      } else if (responseTime < 480) {
        responseScore = 5;
      }
    }
    
    // Total score (0-100)
    const score = ratingScore + completionScore + responseScore;
    
    return {
      score,
      breakdown: {
        ratingScore,
        completionScore,
        responseScore
      }
    };
  }

  // Profile Approval operations
  async createApprovalEvent(event: InsertProfileApprovalEvent): Promise<ProfileApprovalEvent> {
    const [created] = await db
      .insert(profileApprovalEvents)
      .values(event)
      .returning();
    return created;
  }

  async getApprovalEvents(userId: string, profileType?: string): Promise<ProfileApprovalEvent[]> {
    if (profileType) {
      return await db
        .select()
        .from(profileApprovalEvents)
        .where(
          and(
            eq(profileApprovalEvents.userId, userId),
            eq(profileApprovalEvents.profileType, profileType)
          )
        )
        .orderBy(desc(profileApprovalEvents.createdAt));
    } else {
      return await db
        .select()
        .from(profileApprovalEvents)
        .where(eq(profileApprovalEvents.userId, userId))
        .orderBy(desc(profileApprovalEvents.createdAt));
    }
  }

  // Unique ID generation
  async generateUniqueId(prefix: 'CLT' | 'CNS'): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Get or create counter for this prefix and year
    const result = await db.transaction(async (tx) => {
      // Try to get existing counter
      const [existing] = await tx
        .select()
        .from(uniqueIdCounters)
        .where(
          and(
            eq(uniqueIdCounters.prefix, prefix),
            eq(uniqueIdCounters.year, currentYear)
          )
        );

      let counter: number;
      if (existing) {
        // Increment existing counter
        const [updated] = await tx
          .update(uniqueIdCounters)
          .set({
            counter: sql`${uniqueIdCounters.counter} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(uniqueIdCounters.id, existing.id))
          .returning();
        counter = updated.counter;
      } else {
        // Create new counter starting at 1
        const [created] = await tx
          .insert(uniqueIdCounters)
          .values({
            prefix,
            year: currentYear,
            counter: 1,
          })
          .returning();
        counter = created.counter;
      }

      return counter;
    });

    // Format as PREFIX-YYYY-XXXX (e.g., CLT-2024-0001)
    return `${prefix}-${currentYear}-${String(result).padStart(4, '0')}`;
  }

  // Dashboard operations
  async getClientDashboardStats(userId: string): Promise<DashboardStats> {
    // Count active jobs posted by client (defensive: match both camelCase and legacy snake_case)
    const [jobStats] = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.clientId, userId),
          sql`${jobs.status} IN ('open', 'inProgress', 'in_progress')`
        )
      );

    // Count total bids received on client's jobs
    const [bidStats] = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(bids)
      .innerJoin(jobs, eq(bids.jobId, jobs.id))
      .where(eq(jobs.clientId, userId));

    // Sum total spending from payments
    const [spendingStats] = await db
      .select({
        total: sql<string>`COALESCE(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(eq(payments.fromUserId, userId));

    return {
      activeJobs: jobStats?.count || 0,
      totalBids: bidStats?.count || 0,
      totalSpending: spendingStats?.total || "0",
      messagesCount: 0, // TODO: Implement when messages are added
    };
  }

  async getConsultantDashboardStats(userId: string): Promise<ConsultantDashboardStats> {
    // Count available open jobs (excluding consultant's own jobs if they're also a client)
    const [jobStats] = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'open'),
          sql`${jobs.clientId} != ${userId}` // Exclude own jobs
        )
      );

    // Count active bids by consultant
    const [bidStats] = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(bids)
      .where(
        and(
          eq(bids.consultantId, userId),
          sql`${bids.status} IN ('pending', 'shortlisted', 'accepted')`
        )
      );

    // Sum total earnings from payments
    const [earningsStats] = await db
      .select({
        total: sql<string>`COALESCE(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(eq(payments.toUserId, userId));

    // Get consultant rating
    const profile = await this.getConsultantProfile(userId);

    return {
      availableJobs: jobStats?.count || 0,
      activeBids: bidStats?.count || 0,
      totalEarnings: earningsStats?.total || "0",
      rating: profile?.rating || "0",
    };
  }

  async listClientJobs(userId: string, limit: number = 10): Promise<Job[]> {
    // Use listJobs with owner filter (returns enriched jobs with category paths)
    const jobsWithPaths = await this.listJobs({ ownerClientId: userId, limit });
    // Strip categoryPathLabel to match Job type
    return jobsWithPaths.map(({ categoryPathLabel, ...job }) => job);
  }

  async listClientBids(userId: string, limit: number = 10): Promise<Bid[]> {
    // Get bids on jobs posted by this client
    const results = await db
      .select({ bid: bids })
      .from(bids)
      .innerJoin(jobs, eq(bids.jobId, jobs.id))
      .where(eq(jobs.clientId, userId))
      .orderBy(desc(bids.createdAt))
      .limit(limit);
    
    return results.map(r => r.bid);
  }

  // Enhanced Bid operations
  async createBid(bid: InsertBid): Promise<Bid> {
    const [createdBid] = await db.insert(bids).values(bid).returning();
    
    // Increment job bid count
    await db
      .update(jobs)
      .set({ 
        bidCount: sql`${jobs.bidCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(jobs.id, bid.jobId));
    
    return createdBid;
  }

  async getBid(id: string): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid;
  }

  async getJobBids(jobId: string, options?: {
    status?: string;
    minBudget?: number;
    maxBudget?: number;
    sortBy?: 'budget' | 'rating' | 'date' | 'timeline';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ bids: any[]; total: number }> {
    const {
      status,
      minBudget,
      maxBudget,
      sortBy = 'date',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = options || {};

    // Build where conditions
    const conditions = [eq(bids.jobId, jobId)];
    if (status) conditions.push(eq(bids.status, status));
    if (minBudget !== undefined) conditions.push(sql`${bids.proposedBudget} >= ${minBudget}`);
    if (maxBudget !== undefined) conditions.push(sql`${bids.proposedBudget} <= ${maxBudget}`);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bids)
      .where(and(...conditions));

    // Determine sort column
    let orderColumn;
    switch (sortBy) {
      case 'budget': orderColumn = bids.proposedBudget; break;
      case 'date': orderColumn = bids.createdAt; break;
      case 'timeline': orderColumn = bids.proposedDuration; break;
      default: orderColumn = bids.createdAt;
    }

    // Get bids with consultant info
    const bidsList = await db
      .select({
        bid: bids,
        consultant: consultantProfiles,
        user: users,
      })
      .from(bids)
      .leftJoin(consultantProfiles, eq(bids.consultantId, consultantProfiles.userId))
      .leftJoin(users, eq(bids.consultantId, users.id))
      .where(and(...conditions))
      .orderBy(sortOrder === 'desc' ? desc(orderColumn) : orderColumn)
      .limit(limit)
      .offset(offset);

    return {
      bids: bidsList.map(row => ({
        ...row.bid,
        consultant: row.consultant,
        user: row.user,
      })),
      total: count || 0
    };
  }

  async getConsultantBids(consultantId: string, options?: { status?: string; limit?: number; offset?: number }): Promise<Bid[]> {
    const { status, limit = 20, offset = 0 } = options || {};
    
    const conditions = [eq(bids.consultantId, consultantId)];
    if (status) conditions.push(eq(bids.status, status));

    return await db
      .select()
      .from(bids)
      .where(and(...conditions))
      .orderBy(desc(bids.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async updateBid(id: string, consultantId: string, data: Partial<InsertBid>): Promise<Bid> {
    const [updated] = await db
      .update(bids)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(bids.id, id), eq(bids.consultantId, consultantId)))
      .returning();
    
    if (!updated) throw new Error('Bid not found or unauthorized');
    return updated;
  }

  async withdrawBid(id: string, consultantId: string): Promise<Bid> {
    const [updated] = await db
      .update(bids)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(and(eq(bids.id, id), eq(bids.consultantId, consultantId)))
      .returning();
    
    if (!updated) throw new Error('Bid not found or unauthorized');
    return updated;
  }

  async acceptBid(id: string, clientId: string): Promise<Bid> {
    // Get bid to verify job ownership
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    if (!bid) throw new Error('Bid not found');

    // Verify client owns the job
    const [job] = await db.select().from(jobs).where(eq(jobs.id, bid.jobId));
    if (!job || job.clientId !== clientId) throw new Error('Unauthorized');

    // Update bid status
    const [updated] = await db
      .update(bids)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(bids.id, id))
      .returning();
    
    return updated;
  }

  async declineBid(id: string, clientId: string, message?: string): Promise<Bid> {
    // Get bid to verify job ownership
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    if (!bid) throw new Error('Bid not found');

    // Verify client owns the job
    const [job] = await db.select().from(jobs).where(eq(jobs.id, bid.jobId));
    if (!job || job.clientId !== clientId) throw new Error('Unauthorized');

    // Update bid status (could store decline message in future)
    const [updated] = await db
      .update(bids)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(bids.id, id))
      .returning();
    
    return updated;
  }

  async getBidAnalytics(bidId: string): Promise<{
    viewCount: number;
    comparedCount: number;
    isShortlisted: boolean;
    clarificationCount: number;
  }> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, bidId));
    if (!bid) throw new Error('Bid not found');

    const [shortlistCheck] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bidShortlists)
      .where(eq(bidShortlists.bidId, bidId));

    const [clarifications] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bidClarifications)
      .where(eq(bidClarifications.bidId, bidId));

    return {
      viewCount: bid.viewCount || 0,
      comparedCount: bid.comparedCount || 0,
      isShortlisted: (shortlistCheck?.count || 0) > 0,
      clarificationCount: clarifications?.count || 0,
    };
  }

  async markBidExpired(bidId: string): Promise<Bid> {
    const [updated] = await db
      .update(bids)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(bids.id, bidId))
      .returning();
    
    if (!updated) throw new Error('Bid not found');
    return updated;
  }

  // Bid Shortlist operations
  async addToShortlist(data: InsertBidShortlist): Promise<BidShortlist> {
    const [shortlist] = await db.insert(bidShortlists).values(data).returning();
    
    // Update bid status to shortlisted
    await db
      .update(bids)
      .set({ status: 'shortlisted', updatedAt: new Date() })
      .where(eq(bids.id, data.bidId));
    
    return shortlist;
  }

  async removeFromShortlist(jobId: string, bidId: string, clientId: string): Promise<void> {
    await db
      .delete(bidShortlists)
      .where(
        and(
          eq(bidShortlists.jobId, jobId),
          eq(bidShortlists.bidId, bidId),
          eq(bidShortlists.clientId, clientId)
        )
      );
    
    // Revert bid status to pending if no other shortlists exist
    const [otherShortlists] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bidShortlists)
      .where(eq(bidShortlists.bidId, bidId));
    
    if ((otherShortlists?.count || 0) === 0) {
      await db
        .update(bids)
        .set({ status: 'pending', updatedAt: new Date() })
        .where(eq(bids.id, bidId));
    }
  }

  async getShortlistedBids(jobId: string, clientId: string): Promise<BidShortlist[]> {
    return await db
      .select()
      .from(bidShortlists)
      .where(and(eq(bidShortlists.jobId, jobId), eq(bidShortlists.clientId, clientId)));
  }

  async isShortlisted(jobId: string, bidId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bidShortlists)
      .where(and(eq(bidShortlists.jobId, jobId), eq(bidShortlists.bidId, bidId)));
    
    return (result?.count || 0) > 0;
  }

  // Bid Clarification operations
  async createClarification(data: InsertBidClarification): Promise<BidClarification> {
    const [clarification] = await db.insert(bidClarifications).values(data).returning();
    return clarification;
  }

  async getBidClarifications(bidId: string): Promise<BidClarification[]> {
    return await db
      .select()
      .from(bidClarifications)
      .where(eq(bidClarifications.bidId, bidId))
      .orderBy(bidClarifications.createdAt);
  }

  async answerClarification(id: string, answer: string): Promise<BidClarification> {
    const [updated] = await db
      .update(bidClarifications)
      .set({ answer, answeredAt: new Date(), updatedAt: new Date() })
      .where(eq(bidClarifications.id, id))
      .returning();
    
    if (!updated) throw new Error('Clarification not found');
    return updated;
  }

  // Bid View operations
  async trackBidView(data: InsertBidView): Promise<BidView> {
    const [view] = await db.insert(bidViews).values(data).returning();
    return view;
  }

  async getBidViews(bidId: string): Promise<BidView[]> {
    return await db
      .select()
      .from(bidViews)
      .where(eq(bidViews.bidId, bidId))
      .orderBy(desc(bidViews.createdAt));
  }

  async incrementBidViewCount(bidId: string): Promise<void> {
    await db
      .update(bids)
      .set({ 
        viewCount: sql`${bids.viewCount} + 1`,
        clientViewed: true,
        clientViewedAt: sql`COALESCE(${bids.clientViewedAt}, now())`,
        updatedAt: new Date()
      })
      .where(eq(bids.id, bidId));
  }

  async incrementBidComparedCount(bidIds: string[]): Promise<void> {
    if (bidIds.length === 0) return;
    
    await db
      .update(bids)
      .set({ 
        comparedCount: sql`${bids.comparedCount} + 1`,
        updatedAt: new Date()
      })
      .where(inArray(bids.id, bidIds));
  }

  // RFQ operations
  async createRFQInvitation(data: InsertRFQInvitation): Promise<RFQInvitation> {
    const [invitation] = await db.insert(rfqInvitations).values(data).returning();
    return invitation;
  }

  async getRFQInvitation(id: string): Promise<RFQInvitation | undefined> {
    const [invitation] = await db.select().from(rfqInvitations).where(eq(rfqInvitations.id, id));
    return invitation;
  }

  async getConsultantRFQInvitations(consultantId: string, status?: string): Promise<RFQInvitation[]> {
    const conditions = [eq(rfqInvitations.consultantId, consultantId)];
    if (status) conditions.push(eq(rfqInvitations.status, status));

    return await db
      .select()
      .from(rfqInvitations)
      .where(and(...conditions))
      .orderBy(desc(rfqInvitations.createdAt));
  }

  async getJobRFQInvitations(jobId: string): Promise<RFQInvitation[]> {
    return await db
      .select()
      .from(rfqInvitations)
      .where(eq(rfqInvitations.jobId, jobId))
      .orderBy(desc(rfqInvitations.createdAt));
  }

  async respondToRFQ(id: string, bidId: string, status: 'responded' | 'declined'): Promise<RFQInvitation> {
    const [updated] = await db
      .update(rfqInvitations)
      .set({ 
        bidId: status === 'responded' ? bidId : null,
        status,
        respondedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(rfqInvitations.id, id))
      .returning();
    
    if (!updated) throw new Error('RFQ invitation not found');
    return updated;
  }

  async markRFQExpired(id: string): Promise<RFQInvitation> {
    const [updated] = await db
      .update(rfqInvitations)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(rfqInvitations.id, id))
      .returning();
    
    if (!updated) throw new Error('RFQ invitation not found');
    return updated;
  }

  // Job operations
  async getJobById(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async createJob(job: InsertJob): Promise<Job> {
    // Validate that category exists
    if (job.categoryId) {
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, job.categoryId));
      
      if (!category) {
        throw new Error("Invalid category ID");
      }
    }

    const [createdJob] = await db.insert(jobs).values(job).returning();
    return createdJob;
  }

  async listJobs(options?: { ownerClientId?: string; categoryId?: string; excludeClientId?: string; limit?: number }): Promise<(Job & { categoryPathLabel: string })[]> {
    const { ownerClientId, categoryId, excludeClientId, limit = 50 } = options || {};
    
    // Fetch all categories upfront (used for both filtering and path computation)
    const allCategories = await db.select().from(categories);
    
    // Helper to get all descendant category IDs (including the category itself)
    const getDescendantCategoryIds = (categoryId: string): string[] => {
      // Build adjacency map once for O(1) lookups
      const childrenMap = new Map<string, string[]>();
      for (const cat of allCategories) {
        if (cat.parentId) {
          if (!childrenMap.has(cat.parentId)) {
            childrenMap.set(cat.parentId, []);
          }
          childrenMap.get(cat.parentId)!.push(cat.id);
        }
      }
      
      // Traverse tree using adjacency map
      const descendants: string[] = [categoryId];
      const addDescendants = (parentId: string) => {
        const children = childrenMap.get(parentId) || [];
        for (const childId of children) {
          descendants.push(childId);
          addDescendants(childId);
        }
      };
      
      addDescendants(categoryId);
      return descendants;
    };
    
    // Build where clause with AND conditions
    const conditions = [];
    if (ownerClientId) {
      conditions.push(eq(jobs.clientId, ownerClientId));
    }
    if (categoryId) {
      // Include all descendant categories for hierarchical filtering
      const categoryIds = getDescendantCategoryIds(categoryId);
      conditions.push(inArray(jobs.categoryId, categoryIds));
    }
    if (excludeClientId) {
      conditions.push(ne(jobs.clientId, excludeClientId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch jobs
    const jobList = await db
      .select()
      .from(jobs)
      .where(whereClause)
      .orderBy(desc(jobs.createdAt))
      .limit(limit);
    
    // Helper to build category path (handles any depth)
    const buildCategoryPath = (categoryId: string | null): string => {
      if (!categoryId) return "Uncategorized";
      
      const categoryMap = new Map(allCategories.map(c => [c.id, c]));
      const path: string[] = [];
      let current = categoryMap.get(categoryId);
      
      // Build path from current node up to root
      while (current) {
        path.unshift(current.name);
        current = current.parentId ? categoryMap.get(current.parentId) : undefined;
      }
      
      // Return path with whatever depth we have
      return path.length > 0 ? path.join(" / ") : "Uncategorized";
    };

    // Enrich jobs with category path
    return jobList.map(job => ({
      ...job,
      categoryPathLabel: buildCategoryPath(job.categoryId),
    }));
  }

  async searchJobs(options?: {
    search?: string;
    categoryId?: string;
    minBudget?: number;
    maxBudget?: number;
    skills?: string[];
    experienceLevel?: string;
    status?: string;
    budgetType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: (Job & { categoryPathLabel: string })[]; total: number }> {
    const {
      search,
      categoryId,
      minBudget,
      maxBudget,
      skills,
      experienceLevel,
      status,
      budgetType,
      limit = 50,
      offset = 0,
    } = options || {};

    // Fetch all categories upfront for hierarchical filtering and path computation
    const allCategories = await db.select().from(categories);

    // Helper to get all descendant category IDs
    const getDescendantCategoryIds = (categoryId: string): string[] => {
      const childrenMap = new Map<string, string[]>();
      for (const cat of allCategories) {
        if (cat.parentId) {
          if (!childrenMap.has(cat.parentId)) {
            childrenMap.set(cat.parentId, []);
          }
          childrenMap.get(cat.parentId)!.push(cat.id);
        }
      }
      
      const descendants: string[] = [categoryId];
      const addDescendants = (parentId: string) => {
        const children = childrenMap.get(parentId) || [];
        for (const childId of children) {
          descendants.push(childId);
          addDescendants(childId);
        }
      };
      
      addDescendants(categoryId);
      return descendants;
    };

    // Build where clause with AND conditions
    const conditions = [];

    // Text search in title and description (parameterized to prevent SQL injection)
    if (search && search.trim()) {
      const searchParam = sql.param(search, 'text');
      conditions.push(
        sql`(${jobs.title} ILIKE '%' || ${searchParam} || '%' OR ${jobs.description} ILIKE '%' || ${searchParam} || '%')`
      );
    }

    // Category filtering (hierarchical) - categoryId validated at API layer via Zod
    if (categoryId) {
      const categoryIds = getDescendantCategoryIds(categoryId);
      conditions.push(inArray(jobs.categoryId, categoryIds));
    }

    // Budget filtering
    if (minBudget !== undefined) {
      conditions.push(sql`CAST(${jobs.budget} AS NUMERIC) >= ${minBudget}`);
    }
    if (maxBudget !== undefined) {
      conditions.push(sql`CAST(${jobs.budget} AS NUMERIC) <= ${maxBudget}`);
    }

    // Budget type filtering
    if (budgetType) {
      conditions.push(eq(jobs.budgetType, budgetType));
    }

    // Skills filtering (array overlap with secure typed parameter binding)
    if (skills && skills.length > 0) {
      const searchSkills = sql.param(skills, 'text[]');
      conditions.push(sql`${jobs.skills} && ${searchSkills}`);
    }

    // Experience level filtering - validated at API layer via Zod enum
    if (experienceLevel) {
      conditions.push(eq(jobs.experienceLevel, experienceLevel));
    }

    // Status filtering (default to 'open' if not specified)
    if (status) {
      conditions.push(eq(jobs.status, status));
    } else {
      // By default, only show open jobs in search
      conditions.push(eq(jobs.status, 'open'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count with same filters (no limit/offset)
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(whereClause);

    // Fetch jobs with filters and pagination
    const jobList = await db
      .select()
      .from(jobs)
      .where(whereClause)
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    // Helper to build category path
    const buildCategoryPath = (categoryId: string | null): string => {
      if (!categoryId) return "Uncategorized";
      
      const categoryMap = new Map(allCategories.map(c => [c.id, c]));
      const path: string[] = [];
      let current = categoryMap.get(categoryId);
      
      while (current) {
        path.unshift(current.name);
        current = current.parentId ? categoryMap.get(current.parentId) : undefined;
      }
      
      return path.length > 0 ? path.join(" / ") : "Uncategorized";
    };

    // Enrich jobs with category path
    const jobsWithPaths = jobList.map(job => ({
      ...job,
      categoryPathLabel: buildCategoryPath(job.categoryId),
    }));

    return { jobs: jobsWithPaths, total: count };
  }

  async searchConsultants(options?: {
    search?: string;
    categoryId?: string;
    minRate?: number;
    maxRate?: number;
    skills?: string[];
    experience?: string;
    minRating?: number;
    operatingRegions?: string[];
    availability?: string;
    verified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ consultants: (ConsultantProfile & { categoryPathLabel: string; primaryCategoryId: string | null; verificationBadge: string | null })[]; total: number }> {
    const {
      search,
      categoryId,
      minRate,
      maxRate,
      skills,
      experience,
      minRating,
      operatingRegions,
      availability,
      verified,
      limit = 50,
      offset = 0,
    } = options || {};

    // Fetch all categories upfront for hierarchical filtering and path computation
    const allCategories = await db.select().from(categories);

    // Helper to get all descendant category IDs
    const getDescendantCategoryIds = (categoryId: string): string[] => {
      const childrenMap = new Map<string, string[]>();
      for (const cat of allCategories) {
        if (cat.parentId) {
          if (!childrenMap.has(cat.parentId)) {
            childrenMap.set(cat.parentId, []);
          }
          childrenMap.get(cat.parentId)!.push(cat.id);
        }
      }
      
      const descendants: string[] = [categoryId];
      const addDescendants = (parentId: string) => {
        const children = childrenMap.get(parentId) || [];
        for (const childId of children) {
          descendants.push(childId);
          addDescendants(childId);
        }
      };
      addDescendants(categoryId);
      return descendants;
    };

    // Build filter conditions
    const conditions: SQL<unknown>[] = [];

    // Text search on fullName, title, bio (parameterized to prevent SQL injection)
    if (search) {
      const searchParam = sql.param(search, 'text');
      conditions.push(sql`(
        ${consultantProfiles.fullName} ILIKE '%' || ${searchParam} || '%' OR
        ${consultantProfiles.title} ILIKE '%' || ${searchParam} || '%' OR
        ${consultantProfiles.bio} ILIKE '%' || ${searchParam} || '%'
      )`);
    }

    // Category filtering (hierarchical - includes all descendant categories) - categoryId validated at API layer via Zod
    if (categoryId) {
      const categoryIds = getDescendantCategoryIds(categoryId);
      // Use subquery with proper inArray for category filtering
      const consultantIdsInCategory = db
        .select({ id: consultantCategories.consultantProfileId })
        .from(consultantCategories)
        .where(inArray(consultantCategories.categoryId, categoryIds));
      
      conditions.push(inArray(consultantProfiles.id, consultantIdsInCategory));
    }

    // Hourly rate range filtering (only when filters provided, to include NULL rates when no filter)
    if (minRate !== undefined) {
      conditions.push(sql`${consultantProfiles.hourlyRate} IS NOT NULL AND ${consultantProfiles.hourlyRate} >= ${minRate.toString()}`);
    }
    if (maxRate !== undefined) {
      conditions.push(sql`${consultantProfiles.hourlyRate} IS NOT NULL AND ${consultantProfiles.hourlyRate} <= ${maxRate.toString()}`);
    }

    // Skills filtering (array overlap with secure typed parameter binding)
    if (skills && skills.length > 0) {
      const searchSkills = sql.param(skills, 'text[]');
      conditions.push(sql`${consultantProfiles.skills} && ${searchSkills}`);
    }

    // Experience level filtering - validated at API layer via Zod enum
    if (experience) {
      conditions.push(eq(consultantProfiles.experience, experience));
    }

    // Minimum rating filtering
    if (minRating !== undefined) {
      conditions.push(sql`${consultantProfiles.rating} >= ${minRating.toString()}`);
    }

    // Operating regions filtering (array overlap with secure typed parameter binding)
    if (operatingRegions && operatingRegions.length > 0) {
      const searchRegions = sql.param(operatingRegions, 'text[]');
      conditions.push(sql`${consultantProfiles.operatingRegions} && ${searchRegions}`);
    }

    // Availability filtering - validated at API layer via Zod enum
    if (availability) {
      conditions.push(eq(consultantProfiles.availability, availability));
    }

    // Verified filtering
    if (verified !== undefined) {
      conditions.push(eq(consultantProfiles.verified, verified));
    }

    // Default filters: only show approved and complete profiles
    conditions.push(eq(consultantProfiles.approvalStatus, 'approved'));
    conditions.push(eq(consultantProfiles.profileStatus, 'complete'));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count with same filters (no limit/offset)
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(consultantProfiles)
      .where(whereClause);

    // Fetch consultants with filters and pagination
    const consultantList = await db
      .select()
      .from(consultantProfiles)
      .where(whereClause)
      .orderBy(desc(consultantProfiles.rating), desc(consultantProfiles.totalReviews))
      .limit(limit)
      .offset(offset);

    // Helper to build category path
    const buildCategoryPath = (categoryId: string | null): string => {
      if (!categoryId) return "No Primary Service";
      
      const categoryMap = new Map(allCategories.map(c => [c.id, c]));
      const path: string[] = [];
      let current = categoryMap.get(categoryId);
      
      while (current) {
        path.unshift(current.name);
        current = current.parentId ? categoryMap.get(current.parentId) : undefined;
      }
      
      return path.length > 0 ? path.join(" / ") : "No Primary Service";
    };

    // Get primary category for each consultant
    const consultantIds = consultantList.map(c => c.id);
    const primaryCategories = consultantIds.length > 0
      ? await db
          .select()
          .from(consultantCategories)
          .where(and(
            inArray(consultantCategories.consultantProfileId, consultantIds),
            eq(consultantCategories.isPrimary, true)
          ))
      : [];

    const primaryCategoryMap = new Map(
      primaryCategories.map(cc => [cc.consultantProfileId, cc.categoryId])
    );

    // Get verification badges for each consultant (highest badge level across all approved categories)
    const verificationBadges = consultantIds.length > 0
      ? await db
          .select({
            vendorId: vendorCategoryRequests.vendorId,
            verificationBadge: vendorCategoryRequests.verificationBadge,
          })
          .from(vendorCategoryRequests)
          .where(and(
            inArray(vendorCategoryRequests.vendorId, consultantIds),
            eq(vendorCategoryRequests.status, 'approved'),
            sql`${vendorCategoryRequests.verificationBadge} IS NOT NULL`
          ))
      : [];

    // Helper to get highest badge level for each consultant
    const badgeHierarchy = { 'expert': 3, 'premium': 2, 'verified': 1 };
    const highestBadgeMap = new Map<string, string>();
    verificationBadges.forEach(({ vendorId, verificationBadge }) => {
      if (!verificationBadge) return;
      const current = highestBadgeMap.get(vendorId);
      if (!current || badgeHierarchy[verificationBadge as keyof typeof badgeHierarchy] > badgeHierarchy[current as keyof typeof badgeHierarchy]) {
        highestBadgeMap.set(vendorId, verificationBadge);
      }
    });

    // Enrich consultants with category path, primary category ID, and verification badge
    const consultantsWithPaths = consultantList.map(consultant => ({
      ...consultant,
      primaryCategoryId: primaryCategoryMap.get(consultant.id) || null,
      categoryPathLabel: buildCategoryPath(primaryCategoryMap.get(consultant.id) || null),
      verificationBadge: highestBadgeMap.get(consultant.id) || null,
    }));

    return { consultants: consultantsWithPaths, total: count };
  }
  
  // Quote Request operations
  async createQuoteRequest(quoteRequest: InsertQuoteRequest): Promise<QuoteRequest> {
    const [created] = await db.insert(quoteRequests).values(quoteRequest).returning();
    return created;
  }
  
  async getQuoteRequests(userId: string, role: 'client' | 'consultant'): Promise<QuoteRequest[]> {
    const column = role === 'client' ? quoteRequests.clientId : quoteRequests.consultantId;
    const requests = await db
      .select()
      .from(quoteRequests)
      .where(eq(column, userId))
      .orderBy(desc(quoteRequests.createdAt));
    return requests;
  }
  
  async updateQuoteRequest(id: string, data: Partial<InsertQuoteRequest>): Promise<QuoteRequest> {
    const [updated] = await db
      .update(quoteRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(quoteRequests.id, id))
      .returning();
    return updated;
  }
  
  // User Subscription operations
  async createUserSubscription(userId: string, planId: string): Promise<UserSubscription> {
    const [subscription] = await db.insert(userSubscriptions).values({
      userId,
      planId,
      status: 'active',
      startDate: new Date(),
    }).returning();
    return subscription;
  }
  
  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active')
      ))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    return subscription;
  }
  
  async updateSubscriptionStatus(subscriptionId: string, status: string): Promise<UserSubscription> {
    const [updated] = await db
      .update(userSubscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, subscriptionId))
      .returning();
    return updated;
  }
  
  // Payment Session operations
  async createPaymentSession(userId: string, planId: string, sessionId: string, planPrice: string, planName: string): Promise<PaymentSession> {
    const [session] = await db.insert(paymentSessions).values({
      userId,
      planId,
      sessionId,
      planPrice,
      planName,
      status: 'pending',
    }).returning();
    return session;
  }

  async getPaymentSessionBySessionId(sessionId: string): Promise<PaymentSession | undefined> {
    const [session] = await db.select().from(paymentSessions)
      .where(eq(paymentSessions.sessionId, sessionId));
    return session;
  }

  async updatePaymentSessionStatus(sessionId: string, status: string): Promise<void> {
    await db.update(paymentSessions)
      .set({ 
        status,
        completedAt: status === 'completed' ? new Date() : undefined
      })
      .where(eq(paymentSessions.sessionId, sessionId));
  }
  
  // Subscription Plan operations
  async getSubscriptionPlanById(planId: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId));
    return plan;
  }

  async getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined> {
    // Capitalize first letter to match database format (Basic, Professional, Enterprise)
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const [plan] = await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, capitalizedName));
    return plan;
  }
  
  // =============================================================================
  // MESSAGING & COLLABORATION IMPLEMENTATIONS
  // =============================================================================
  
  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getUserConversations(userId: string, options?: { archived?: boolean; limit?: number }): Promise<Conversation[]> {
    const limit = options?.limit || 50;
    
    // OPTIMIZED: Single JOIN query instead of two separate queries
    // Uses indexed userId and lastMessageAt for efficient filtering and sorting
    const conditions = [eq(conversationParticipants.userId, userId)];
    if (options?.archived !== undefined) {
      conditions.push(eq(conversations.archived, options.archived));
    }
    
    return await db
      .select({
        id: conversations.id,
        title: conversations.title,
        type: conversations.type,
        relatedEntityType: conversations.relatedEntityType,
        relatedEntityId: conversations.relatedEntityId,
        archived: conversations.archived,
        archivedBy: conversations.archivedBy,
        archivedAt: conversations.archivedAt,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
      .where(and(...conditions))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit);
  }

  async updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db.update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async archiveConversation(id: string, userId: string): Promise<Conversation> {
    const [updated] = await db.update(conversations)
      .set({ 
        archived: true,
        archivedBy: userId,
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  // Conversation Participant operations
  async addParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    const [created] = await db.insert(conversationParticipants).values(participant).returning();
    return created;
  }

  async getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    return await db.select().from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
  }

  async isConversationParticipant(conversationId: string, userId: string): Promise<boolean> {
    const [participant] = await db.select().from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      ))
      .limit(1);
    return !!participant;
  }

  async updateParticipant(id: string, data: Partial<InsertConversationParticipant>): Promise<ConversationParticipant> {
    const [updated] = await db.update(conversationParticipants)
      .set(data)
      .where(eq(conversationParticipants.id, id))
      .returning();
    return updated;
  }

  async removeParticipant(conversationId: string, userId: string): Promise<void> {
    await db.delete(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      ));
  }

  async updateLastReadAt(conversationId: string, userId: string): Promise<void> {
    await db.update(conversationParticipants)
      .set({ lastReadAt: new Date(), unreadCount: 0 })
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      ));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    
    // Update conversation lastMessageAt
    await db.update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, created.conversationId));
    
    // Increment unread count for other participants
    await db.update(conversationParticipants)
      .set({ unreadCount: sql`${conversationParticipants.unreadCount} + 1` })
      .where(and(
        eq(conversationParticipants.conversationId, created.conversationId),
        ne(conversationParticipants.userId, created.senderId)
      ));
    
    return created;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getConversationMessages(conversationId: string, options?: { limit?: number; offset?: number; beforeMessageId?: string }): Promise<Message[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    const conditions = [
      eq(messages.conversationId, conversationId),
      eq(messages.deleted, false)
    ];

    if (options?.beforeMessageId) {
      const [beforeMessage] = await db.select().from(messages)
        .where(eq(messages.id, options.beforeMessageId));
      if (beforeMessage) {
        conditions.push(sql`${messages.createdAt} < ${beforeMessage.createdAt}`);
      }
    }

    return await db.select().from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message> {
    const [updated] = await db.update(messages)
      .set({ 
        ...data, 
        edited: true,
        editedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(messages.id, id))
      .returning();
    return updated;
  }

  async deleteMessage(id: string, userId: string): Promise<void> {
    await db.update(messages)
      .set({ 
        deleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(messages.id, id),
        eq(messages.senderId, userId)
      ));
  }

  async searchMessages(userId: string, query: string, options?: { conversationId?: string; limit?: number }): Promise<Message[]> {
    const limit = options?.limit || 50;
    
    // Get user's conversation IDs
    const userConversations = await db.select({ id: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    const conversationIds = userConversations.map(c => c.id);
    if (conversationIds.length === 0) {
      return [];
    }
    
    const conditions = [
      inArray(messages.conversationId, conversationIds),
      eq(messages.deleted, false),
      sql`to_tsvector('english', ${messages.content}) @@ plainto_tsquery('english', ${query})`
    ];

    if (options?.conversationId) {
      conditions.push(eq(messages.conversationId, options.conversationId));
    }

    return await db.select().from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  // Message Receipt operations
  async createMessageReceipt(receipt: InsertMessageReceipt): Promise<MessageReceipt> {
    const [created] = await db.insert(messageReceipts).values(receipt).returning();
    return created;
  }

  async markMessageDelivered(messageId: string, userId: string): Promise<void> {
    await db.update(messageReceipts)
      .set({ deliveredAt: new Date() })
      .where(and(
        eq(messageReceipts.messageId, messageId),
        eq(messageReceipts.userId, userId)
      ));
  }

  async markMessageRead(messageId: string, userId: string): Promise<void> {
    await db.update(messageReceipts)
      .set({ readAt: new Date() })
      .where(and(
        eq(messageReceipts.messageId, messageId),
        eq(messageReceipts.userId, userId)
      ));
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(messageReceipts)
      .innerJoin(messages, eq(messageReceipts.messageId, messages.id))
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messageReceipts.userId, userId),
        sql`${messageReceipts.readAt} IS NULL`
      ));
    
    return Number(result?.count || 0);
  }

  // Message Template operations
  async createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate> {
    const [created] = await db.insert(messageTemplates).values(template).returning();
    return created;
  }

  async getUserMessageTemplates(userId: string): Promise<MessageTemplate[]> {
    return await db.select().from(messageTemplates)
      .where(eq(messageTemplates.userId, userId))
      .orderBy(desc(messageTemplates.usageCount));
  }

  async updateMessageTemplate(id: string, data: Partial<InsertMessageTemplate>): Promise<MessageTemplate> {
    const [updated] = await db.update(messageTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteMessageTemplate(id: string): Promise<void> {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db.update(messageTemplates)
      .set({ usageCount: sql`${messageTemplates.usageCount} + 1` })
      .where(eq(messageTemplates.id, id));
  }

  // Message File operations
  async createMessageFile(file: InsertMessageFile): Promise<MessageFile> {
    const [created] = await db.insert(messageFiles).values(file).returning();
    return created;
  }

  async getMessageFiles(messageId: string): Promise<MessageFile[]> {
    return await db.select().from(messageFiles)
      .where(eq(messageFiles.messageId, messageId))
      .orderBy(desc(messageFiles.createdAt));
  }

  async getConversationFiles(conversationId: string, options?: { limit?: number }): Promise<MessageFile[]> {
    const limit = options?.limit || 50;
    
    // OPTIMIZED: Direct query using conversationId index (no N+1 query)
    // messageFiles table has conversationId column with index for efficient lookup
    return await db
      .select()
      .from(messageFiles)
      .where(eq(messageFiles.conversationId, conversationId))
      .orderBy(desc(messageFiles.createdAt))
      .limit(limit);
  }

  async updateMessageFile(id: string, data: Partial<InsertMessageFile>): Promise<MessageFile> {
    const [updated] = await db.update(messageFiles)
      .set(data)
      .where(eq(messageFiles.id, id))
      .returning();
    return updated;
  }

  // File Version operations
  async createFileVersion(version: InsertFileVersion): Promise<FileVersion> {
    // Validate that the original file exists
    const [originalFile] = await db.select().from(messageFiles)
      .where(eq(messageFiles.id, version.originalFileId));
    
    if (!originalFile) {
      throw new Error(`Original file ${version.originalFileId} not found`);
    }
    
    // Get the current highest version number for this file
    const existingVersions = await db.select().from(fileVersions)
      .where(eq(fileVersions.originalFileId, version.originalFileId))
      .orderBy(desc(fileVersions.versionNumber))
      .limit(1);
    
    // Calculate next version number
    const nextVersionNumber = existingVersions.length > 0 
      ? (existingVersions[0].versionNumber || 0) + 1 
      : 1;
    
    // Insert with correct version number
    const [created] = await db.insert(fileVersions)
      .values({ 
        ...version, 
        versionNumber: nextVersionNumber 
      })
      .returning();
    
    return created;
  }

  async getFileVersions(originalFileId: string): Promise<FileVersion[]> {
    return await db.select().from(fileVersions)
      .where(eq(fileVersions.originalFileId, originalFileId))
      .orderBy(desc(fileVersions.versionNumber));
  }

  // Meeting operations
  async createMeeting(meeting: InsertMeetingLink): Promise<MeetingLink> {
    const meetingData = {
      ...meeting,
      scheduledAt: typeof meeting.scheduledAt === 'string' ? new Date(meeting.scheduledAt) : meeting.scheduledAt,
    };
    const [created] = await db.insert(meetingLinks).values(meetingData).returning();
    return created;
  }

  async getMeeting(id: string): Promise<MeetingLink | undefined> {
    const [meeting] = await db.select().from(meetingLinks).where(eq(meetingLinks.id, id));
    return meeting;
  }

  async getConversationMeetings(conversationId: string, options?: { upcoming?: boolean }): Promise<MeetingLink[]> {
    const conditions = [eq(meetingLinks.conversationId, conversationId)];

    if (options?.upcoming) {
      conditions.push(sql`${meetingLinks.scheduledAt} > NOW()`);
      conditions.push(eq(meetingLinks.status, 'scheduled'));
    }

    return await db.select().from(meetingLinks)
      .where(and(...conditions))
      .orderBy(desc(meetingLinks.scheduledAt));
  }

  async updateMeeting(id: string, data: Partial<InsertMeetingLink>): Promise<MeetingLink> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.scheduledAt) {
      updateData.scheduledAt = typeof data.scheduledAt === 'string' 
        ? new Date(data.scheduledAt) 
        : data.scheduledAt;
    }
    const [updated] = await db.update(meetingLinks)
      .set(updateData)
      .where(eq(meetingLinks.id, id))
      .returning();
    return updated;
  }

  // Meeting Participant operations
  async addMeetingParticipant(participant: InsertMeetingParticipant): Promise<MeetingParticipant> {
    const [created] = await db.insert(meetingParticipants).values(participant).returning();
    return created;
  }

  async getMeetingParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    return await db.select().from(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, meetingId));
  }

  async updateMeetingParticipant(id: string, data: Partial<InsertMeetingParticipant>): Promise<MeetingParticipant> {
    const [updated] = await db.update(meetingParticipants)
      .set(data)
      .where(eq(meetingParticipants.id, id))
      .returning();
    return updated;
  }

  // Meeting Reminder operations
  async createMeetingReminder(reminder: InsertMeetingReminder): Promise<MeetingReminder> {
    const reminderData = {
      ...reminder,
      reminderTime: typeof reminder.reminderTime === 'string' ? new Date(reminder.reminderTime) : reminder.reminderTime,
    };
    const [created] = await db.insert(meetingReminders).values(reminderData).returning();
    return created;
  }

  async getPendingReminders(): Promise<MeetingReminder[]> {
    return await db.select().from(meetingReminders)
      .where(and(
        eq(meetingReminders.sent, false),
        sql`${meetingReminders.reminderTime} <= NOW()`
      ))
      .orderBy(meetingReminders.reminderTime);
  }

  async markReminderSent(id: string): Promise<void> {
    await db.update(meetingReminders)
      .set({ sent: true, sentAt: new Date() })
      .where(eq(meetingReminders.id, id));
  }

  // Conversation Label operations
  async addConversationLabel(label: InsertConversationLabel): Promise<ConversationLabel> {
    const [created] = await db.insert(conversationLabels).values(label).returning();
    return created;
  }

  async getConversationLabels(conversationId: string, userId: string): Promise<ConversationLabel[]> {
    return await db.select().from(conversationLabels)
      .where(and(
        eq(conversationLabels.conversationId, conversationId),
        eq(conversationLabels.userId, userId)
      ));
  }

  async removeConversationLabel(id: string): Promise<void> {
    await db.delete(conversationLabels).where(eq(conversationLabels.id, id));
  }

  // Message Moderation operations
  async createModerationAction(action: InsertMessageModeration): Promise<MessageModeration> {
    const [created] = await db.insert(messageModeration).values(action).returning();
    return created;
  }

  async getMessageModerationHistory(messageId: string): Promise<MessageModeration[]> {
    return await db.select().from(messageModeration)
      .where(eq(messageModeration.messageId, messageId))
      .orderBy(desc(messageModeration.createdAt));
  }

  // Conversation Preferences operations
  async getConversationPreferences(userId: string, conversationId: string): Promise<ConversationPreference | undefined> {
    const [prefs] = await db.select().from(conversationPreferences)
      .where(and(
        eq(conversationPreferences.userId, userId),
        eq(conversationPreferences.conversationId, conversationId)
      ));
    return prefs;
  }

  async upsertConversationPreferences(preferences: InsertConversationPreference): Promise<ConversationPreference> {
    const existing = await this.getConversationPreferences(preferences.userId, preferences.conversationId);
    
    if (existing) {
      const [updated] = await db.update(conversationPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq(conversationPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(conversationPreferences)
        .values(preferences)
        .returning();
      return created;
    }
  }

  // Conversation Pin operations
  async pinConversation(userId: string, conversationId: string, displayOrder?: number): Promise<ConversationPin> {
    const [created] = await db.insert(conversationPins)
      .values({
        userId,
        conversationId,
        displayOrder: displayOrder || 0,
      })
      .returning();
    return created;
  }

  async unpinConversation(userId: string, conversationId: string): Promise<void> {
    await db.delete(conversationPins)
      .where(and(
        eq(conversationPins.userId, userId),
        eq(conversationPins.conversationId, conversationId)
      ));
  }

  async getUserPinnedConversations(userId: string): Promise<ConversationPin[]> {
    return await db.select().from(conversationPins)
      .where(eq(conversationPins.userId, userId))
      .orderBy(conversationPins.displayOrder);
  }

  // Rate Limit operations
  async getRateLimit(userId: string, endpoint: string): Promise<RateLimit | undefined> {
    const [limit] = await db.select().from(rateLimits)
      .where(and(
        eq(rateLimits.userId, userId),
        eq(rateLimits.endpoint, endpoint)
      ))
      .limit(1);
    return limit;
  }

  async createRateLimit(limit: InsertRateLimit): Promise<RateLimit> {
    const [created] = await db.insert(rateLimits)
      .values(limit)
      .onConflictDoUpdate({
        target: [rateLimits.userId, rateLimits.endpoint],
        set: {
          requestCount: 1,
          windowStart: limit.windowStart,
          expiresAt: limit.expiresAt,
        },
      })
      .returning();
    return created;
  }

  async incrementRateLimit(userId: string, endpoint: string): Promise<void> {
    await db.update(rateLimits)
      .set({ requestCount: sql`${rateLimits.requestCount} + 1` })
      .where(and(
        eq(rateLimits.userId, userId),
        eq(rateLimits.endpoint, endpoint)
      ));
  }

  async cleanupExpiredRateLimits(): Promise<void> {
    await db.delete(rateLimits)
      .where(sql`${rateLimits.expiresAt} < NOW()`);
  }

  // Login History operations
  async createLoginHistory(loginHistory: InsertLoginHistory): Promise<LoginHistory> {
    const { loginHistory: loginHistoryTable } = await import("@shared/schema");
    const [created] = await db.insert(loginHistoryTable)
      .values(loginHistory)
      .returning();
    return created;
  }

  async getLoginHistory(userId: string, options?: { limit?: number; offset?: number }): Promise<LoginHistory[]> {
    const { loginHistory: loginHistoryTable } = await import("@shared/schema");
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    const history = await db.select()
      .from(loginHistoryTable)
      .where(eq(loginHistoryTable.userId, userId))
      .orderBy(desc(loginHistoryTable.timestamp))
      .limit(limit)
      .offset(offset);
    return history;
  }

  // Active Session operations
  async createActiveSession(session: InsertActiveSession): Promise<ActiveSession> {
    const { activeSessions } = await import("@shared/schema");
    const [created] = await db.insert(activeSessions)
      .values(session)
      .onConflictDoUpdate({
        target: activeSessions.id,
        set: {
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          deviceInfo: session.deviceInfo,
          location: session.location,
          lastActivity: new Date(),
        },
      })
      .returning();
    return created;
  }

  async getActiveSessions(userId: string): Promise<ActiveSession[]> {
    const { activeSessions } = await import("@shared/schema");
    const sessions = await db.select()
      .from(activeSessions)
      .where(eq(activeSessions.userId, userId))
      .orderBy(desc(activeSessions.lastActivity));
    return sessions;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const { activeSessions } = await import("@shared/schema");
    await db.update(activeSessions)
      .set({ lastActivity: new Date() })
      .where(eq(activeSessions.id, sessionId));
  }

  async terminateSession(sessionId: string): Promise<void> {
    const { activeSessions } = await import("@shared/schema");
    await db.delete(activeSessions)
      .where(eq(activeSessions.id, sessionId));
  }

  async cleanupInactiveSessions(maxInactiveMinutes: number = 60): Promise<void> {
    const { activeSessions } = await import("@shared/schema");
    const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    await db.delete(activeSessions)
      .where(sql`${activeSessions.lastActivity} < ${cutoffTime}`);
  }

  // User Activity Log operations
  async createActivityLog(activityLog: InsertUserActivityLog): Promise<UserActivityLog> {
    const { userActivityLog } = await import("@shared/schema");
    const [created] = await db.insert(userActivityLog)
      .values(activityLog)
      .returning();
    return created;
  }

  async getUserActivityLogs(userId: string, options?: {
    limit?: number;
    offset?: number;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserActivityLog[]> {
    const { userActivityLog } = await import("@shared/schema");
    // Enforce storage-layer limits to prevent resource exhaustion
    const limit = Math.min(options?.limit || 50, 100);
    const offset = Math.min(Math.max(0, options?.offset || 0), 5000); // Max offset, prevent negative
    
    let query = db.select()
      .from(userActivityLog)
      .where(eq(userActivityLog.userId, userId));
    
    const conditions = [eq(userActivityLog.userId, userId)];
    
    if (options?.action) {
      conditions.push(eq(userActivityLog.action, options.action));
    }
    if (options?.resource) {
      conditions.push(eq(userActivityLog.resource, options.resource));
    }
    if (options?.startDate) {
      conditions.push(sql`${userActivityLog.timestamp} >= ${options.startDate}`);
    }
    if (options?.endDate) {
      conditions.push(sql`${userActivityLog.timestamp} <= ${options.endDate}`);
    }
    
    const logs = await db.select()
      .from(userActivityLog)
      .where(and(...conditions))
      .orderBy(desc(userActivityLog.timestamp))
      .limit(limit)
      .offset(offset);
    
    return logs;
  }

  async getAllActivityLogs(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserActivityLog[]> {
    const { userActivityLog } = await import("@shared/schema");
    // Enforce storage-layer limits to prevent resource exhaustion
    const limit = Math.min(options?.limit || 100, 500);
    const offset = Math.min(Math.max(0, options?.offset || 0), 5000); // Max offset, prevent negative
    
    const conditions = [];
    
    if (options?.action) {
      conditions.push(eq(userActivityLog.action, options.action));
    }
    if (options?.resource) {
      conditions.push(eq(userActivityLog.resource, options.resource));
    }
    if (options?.startDate) {
      conditions.push(sql`${userActivityLog.timestamp} >= ${options.startDate}`);
    }
    if (options?.endDate) {
      conditions.push(sql`${userActivityLog.timestamp} <= ${options.endDate}`);
    }
    
    let query = db.select()
      .from(userActivityLog)
      .orderBy(desc(userActivityLog.timestamp))
      .limit(limit)
      .offset(offset);
    
    if (conditions.length > 0) {
      const logs = await db.select()
        .from(userActivityLog)
        .where(and(...conditions))
        .orderBy(desc(userActivityLog.timestamp))
        .limit(limit)
        .offset(offset);
      return logs;
    }
    
    return await query;
  }

  // Saved Searches operations
  async createSavedSearch(savedSearch: InsertSavedSearch): Promise<SavedSearch> {
    const [created] = await db.insert(savedSearches).values(savedSearch).returning();
    return created;
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    return await db.select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
  }

  async getSavedSearch(id: string): Promise<SavedSearch | undefined> {
    const [search] = await db.select()
      .from(savedSearches)
      .where(eq(savedSearches.id, id));
    return search;
  }

  async updateSavedSearch(id: string, data: {
    name?: string;
    filters?: any;
    notificationsEnabled?: boolean;
    lastNotifiedAt?: Date | null;
  }): Promise<SavedSearch> {
    // Only allow updating safe fields - userId and searchType are immutable
    const [updated] = await db.update(savedSearches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(savedSearches.id, id))
      .returning();
    return updated;
  }

  async deleteSavedSearch(id: string): Promise<void> {
    await db.delete(savedSearches)
      .where(eq(savedSearches.id, id));
  }

  // Notifications operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    
    // Send email notification if user has email notifications enabled
    try {
      const preferences = await this.getNotificationPreferences(notification.userId);
      if (preferences?.emailNotificationsEnabled) {
        // Get user's email
        const user = await this.getUser(notification.userId);
        if (user?.email) {
          await emailService.sendNotificationEmail(user.email, created);
        }
      }
    } catch (error) {
      // Log error but don't fail notification creation if email fails
      console.error('[Notification] Failed to send email notification:', error);
    }
    
    return created;
  }

  async getNotification(notificationId: string): Promise<Notification | undefined> {
    const [notification] = await db.select()
      .from(notifications)
      .where(eq(notifications.id, notificationId));
    return notification;
  }

  async getNotifications(userId: string, options?: { 
    limit?: number; 
    offset?: number; 
    read?: boolean;
  }): Promise<{ notifications: Notification[]; total: number }> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let query = db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId));

    // Filter by read status if specified
    if (options?.read !== undefined) {
      query = query.where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, options.read)
      ) as any);
    }

    const results = await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    let countQuery = db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    if (options?.read !== undefined) {
      countQuery = countQuery.where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, options.read)
      ) as any);
    }

    const [{ count }] = await countQuery;

    return { notifications: results, total: count };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
    return count;
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const [updated] = await db.update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await db.delete(notifications)
      .where(eq(notifications.id, notificationId));
  }

  // Notification Preferences operations
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const [prefs] = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return prefs;
  }

  async upsertNotificationPreferences(userId: string, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    // Try to update first
    const existing = await this.getNotificationPreferences(userId);
    
    if (existing) {
      const [updated] = await db.update(notificationPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new preferences with defaults
      const [created] = await db.insert(notificationPreferences)
        .values({
          userId,
          emailNotificationsEnabled: preferences.emailNotificationsEnabled ?? true,
          inAppNotificationsEnabled: preferences.inAppNotificationsEnabled ?? true,
          enabledTypes: preferences.enabledTypes ?? null,
        })
        .returning();
      return created;
    }
  }

  // Vendor Category Request operations
  async createCategoryRequest(request: InsertVendorCategoryRequest): Promise<VendorCategoryRequest> {
    const [created] = await db.insert(vendorCategoryRequests)
      .values(request)
      .returning();
    return created;
  }

  async getCategoryRequest(id: string): Promise<VendorCategoryRequest | undefined> {
    const [request] = await db.select()
      .from(vendorCategoryRequests)
      .where(eq(vendorCategoryRequests.id, id));
    return request;
  }

  async getVendorCategoryRequests(vendorId: string): Promise<VendorCategoryRequest[]> {
    const requests = await db.select()
      .from(vendorCategoryRequests)
      .where(eq(vendorCategoryRequests.vendorId, vendorId))
      .orderBy(desc(vendorCategoryRequests.createdAt));
    return requests;
  }

  async getCategoryRequestsByStatus(status: string): Promise<VendorCategoryRequest[]> {
    const requests = await db.select()
      .from(vendorCategoryRequests)
      .where(eq(vendorCategoryRequests.status, status))
      .orderBy(desc(vendorCategoryRequests.createdAt));
    return requests;
  }

  async updateCategoryRequest(id: string, data: Partial<InsertVendorCategoryRequest>): Promise<VendorCategoryRequest> {
    const [updated] = await db.update(vendorCategoryRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendorCategoryRequests.id, id))
      .returning();
    return updated;
  }

  async approveCategoryRequest(
    id: string,
    reviewedBy: string,
    adminNotes?: string,
    verificationBadge?: string,
    maxConcurrentJobs?: number
  ): Promise<VendorCategoryRequest> {
    const [updated] = await db.update(vendorCategoryRequests)
      .set({
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
        adminNotes,
        verificationBadge,
        maxConcurrentJobs,
        badgeIssuedAt: verificationBadge ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(vendorCategoryRequests.id, id))
      .returning();
    return updated;
  }

  async rejectCategoryRequest(
    id: string,
    reviewedBy: string,
    adminNotes?: string
  ): Promise<VendorCategoryRequest> {
    const [updated] = await db.update(vendorCategoryRequests)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        adminNotes,
        updatedAt: new Date(),
      })
      .where(eq(vendorCategoryRequests.id, id))
      .returning();
    return updated;
  }

  // Project/Contract Management
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    
    await this.logProjectActivity({
      projectId: newProject.id,
      userId: project.clientId,
      action: 'project_created',
      details: { title: project.title, budget: project.budget },
    });
    
    return newProject;
  }

  async getProjectById(projectId: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    return project;
  }

  async getConsultantProjects(
    consultantId: string,
    filters?: { status?: string; categoryId?: string; limit?: number; offset?: number }
  ): Promise<{ projects: Project[]; total: number }> {
    const conditions = [eq(projects.consultantId, consultantId)];
    
    if (filters?.status) {
      conditions.push(eq(projects.status, filters.status));
    }
    
    const projectsList = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0)
      .orderBy(desc(projects.createdAt));
    
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(and(...conditions));
    
    return { projects: projectsList, total: Number(count) };
  }

  async getClientProjects(
    clientId: string,
    filters?: { status?: string; categoryId?: string; limit?: number; offset?: number }
  ): Promise<{ projects: Project[]; total: number }> {
    const conditions = [eq(projects.clientId, clientId)];
    
    if (filters?.status) {
      conditions.push(eq(projects.status, filters.status));
    }
    
    const projectsList = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0)
      .orderBy(desc(projects.createdAt));
    
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(and(...conditions));
    
    return { projects: projectsList, total: Number(count) };
  }

  async updateProject(projectId: string, data: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db.update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    return updated;
  }

  async updateProjectStatus(projectId: string, status: string, userId: string): Promise<Project> {
    const [updated] = await db.update(projects)
      .set({ status, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    
    await this.logProjectActivity({
      projectId,
      userId,
      action: 'status_changed',
      details: { newStatus: status },
    });
    
    return updated;
  }

  async updateMilestoneStatus(
    projectId: string,
    milestoneIndex: number,
    status: string,
    progress?: number
  ): Promise<Project> {
    const project = await this.getProjectById(projectId);
    if (!project || !project.milestones) throw new Error('Project not found');
    
    const milestones = project.milestones as any[];
    if (milestoneIndex >= milestones.length) throw new Error('Invalid milestone index');
    
    milestones[milestoneIndex].status = status;
    if (progress !== undefined) {
      milestones[milestoneIndex].progress = progress;
    }
    
    const completedCount = milestones.filter(m => m.status === 'completed').length;
    const overallProgress = Math.floor((completedCount / milestones.length) * 100);
    
    const [updated] = await db.update(projects)
      .set({ milestones, overallProgress, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    
    return updated;
  }

  async extendProjectDeadline(
    projectId: string,
    newEndDate: Date,
    reason: string,
    userId: string
  ): Promise<Project> {
    const [updated] = await db.update(projects)
      .set({ endDate: newEndDate, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    
    await this.logProjectActivity({
      projectId,
      userId,
      action: 'deadline_extended',
      details: { newEndDate, reason },
    });
    
    return updated;
  }

  // Milestone Comments
  async addMilestoneComment(comment: InsertMilestoneComment): Promise<MilestoneComment> {
    const [newComment] = await db.insert(milestoneComments).values(comment).returning();
    
    await this.logProjectActivity({
      projectId: comment.projectId,
      userId: comment.userId,
      action: 'comment_added',
      details: { milestoneIndex: comment.milestoneIndex },
    });
    
    return newComment;
  }

  async getProjectComments(
    projectId: string,
    milestoneIndex?: number
  ): Promise<MilestoneComment[]> {
    const conditions = [eq(milestoneComments.projectId, projectId)];
    
    if (milestoneIndex !== undefined) {
      conditions.push(eq(milestoneComments.milestoneIndex, milestoneIndex));
    }
    
    return await db
      .select()
      .from(milestoneComments)
      .where(and(...conditions))
      .orderBy(desc(milestoneComments.createdAt));
  }

  async resolveComment(commentId: string, userId: string): Promise<MilestoneComment> {
    const [updated] = await db.update(milestoneComments)
      .set({ resolved: true, resolvedBy: userId, resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(milestoneComments.id, commentId))
      .returning();
    return updated;
  }

  async unresolveComment(commentId: string): Promise<MilestoneComment> {
    const [updated] = await db.update(milestoneComments)
      .set({ resolved: false, resolvedBy: null, resolvedAt: null, updatedAt: new Date() })
      .where(eq(milestoneComments.id, commentId))
      .returning();
    return updated;
  }

  // Project Deliverables
  async submitDeliverable(deliverable: InsertProjectDeliverable): Promise<ProjectDeliverable> {
    const [newDeliverable] = await db.insert(projectDeliverables).values(deliverable).returning();
    
    await this.logProjectActivity({
      projectId: deliverable.projectId,
      userId: deliverable.uploadedBy,
      action: 'deliverable_submitted',
      details: { 
        title: deliverable.title,
        milestoneIndex: deliverable.milestoneIndex,
      },
    });
    
    return newDeliverable;
  }

  async getProjectDeliverables(
    projectId: string,
    milestoneIndex?: number
  ): Promise<ProjectDeliverable[]> {
    const conditions = [eq(projectDeliverables.projectId, projectId)];
    
    if (milestoneIndex !== undefined) {
      conditions.push(eq(projectDeliverables.milestoneIndex, milestoneIndex));
    }
    
    return await db
      .select()
      .from(projectDeliverables)
      .where(and(...conditions))
      .orderBy(desc(projectDeliverables.submittedAt));
  }

  async approveDeliverable(deliverableId: string, reviewedBy: string): Promise<ProjectDeliverable> {
    const [updated] = await db.update(projectDeliverables)
      .set({
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projectDeliverables.id, deliverableId))
      .returning();
    
    await this.logProjectActivity({
      projectId: updated.projectId,
      userId: reviewedBy,
      action: 'deliverable_approved',
      details: { deliverableId, title: updated.title },
    });
    
    return updated;
  }

  async requestRevision(
    deliverableId: string,
    reviewNotes: string,
    reviewedBy: string
  ): Promise<ProjectDeliverable> {
    const [updated] = await db.update(projectDeliverables)
      .set({
        status: 'revision_requested',
        reviewNotes,
        reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projectDeliverables.id, deliverableId))
      .returning();
    
    await this.logProjectActivity({
      projectId: updated.projectId,
      userId: reviewedBy,
      action: 'revision_requested',
      details: { deliverableId, title: updated.title },
    });
    
    return updated;
  }

  // Project Team Members
  async addTeamMember(member: InsertProjectTeamMember): Promise<ProjectTeamMember> {
    const [newMember] = await db.insert(projectTeamMembers).values(member).returning();
    
    await this.logProjectActivity({
      projectId: member.projectId,
      userId: member.addedBy,
      action: 'team_member_added',
      details: { userId: member.userId, role: member.role },
    });
    
    return newMember;
  }

  async getProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
    return await db
      .select()
      .from(projectTeamMembers)
      .where(eq(projectTeamMembers.projectId, projectId));
  }

  async removeTeamMember(projectId: string, userId: string): Promise<void> {
    await db
      .delete(projectTeamMembers)
      .where(
        and(
          eq(projectTeamMembers.projectId, projectId),
          eq(projectTeamMembers.userId, userId)
        )
      );
    
    await this.logProjectActivity({
      projectId,
      userId,
      action: 'team_member_removed',
      details: { userId },
    });
  }

  async updateTeamMemberRole(
    projectId: string,
    userId: string,
    role: string,
    assignedMilestones?: number[]
  ): Promise<ProjectTeamMember> {
    const updateData: any = { role };
    if (assignedMilestones) {
      updateData.assignedMilestones = assignedMilestones;
    }
    
    const [updated] = await db.update(projectTeamMembers)
      .set(updateData)
      .where(
        and(
          eq(projectTeamMembers.projectId, projectId),
          eq(projectTeamMembers.userId, userId)
        )
      )
      .returning();
    
    return updated;
  }

  // Project Activity Log
  async logProjectActivity(activity: InsertProjectActivityLog): Promise<ProjectActivityLog> {
    const [log] = await db.insert(projectActivityLog).values(activity).returning();
    return log;
  }

  async getProjectActivityLog(
    projectId: string,
    filters?: { action?: string; limit?: number; offset?: number }
  ): Promise<{ activities: ProjectActivityLog[]; total: number }> {
    const conditions = [eq(projectActivityLog.projectId, projectId)];
    
    if (filters?.action) {
      conditions.push(eq(projectActivityLog.action, filters.action));
    }
    
    const activities = await db
      .select()
      .from(projectActivityLog)
      .where(and(...conditions))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0)
      .orderBy(desc(projectActivityLog.timestamp));
    
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectActivityLog)
      .where(and(...conditions));
    
    return { activities, total: Number(count) };
  }

  // ============================================================================
  // DELIVERY & FULFILLMENT SYSTEM IMPLEMENTATIONS
  // ============================================================================

  // 7.1 FOR SERVICES - FILE VERSIONING

  async uploadDeliverableVersion(version: InsertDeliverableVersion): Promise<DeliverableVersion> {
    // Mark all previous versions as not latest
    await db
      .update(deliverableVersions)
      .set({ isLatest: false })
      .where(eq(deliverableVersions.deliverableId, version.deliverableId));
    
    // Insert new version
    const [newVersion] = await db
      .insert(deliverableVersions)
      .values({ ...version, isLatest: true })
      .returning();
    
    return newVersion;
  }

  async getDeliverableVersions(deliverableId: string): Promise<DeliverableVersion[]> {
    return await db
      .select()
      .from(deliverableVersions)
      .where(eq(deliverableVersions.deliverableId, deliverableId))
      .orderBy(desc(deliverableVersions.versionNumber));
  }

  async getDeliverableVersion(versionId: string): Promise<DeliverableVersion | undefined> {
    const [version] = await db
      .select()
      .from(deliverableVersions)
      .where(eq(deliverableVersions.id, versionId));
    return version;
  }

  async getLatestVersion(deliverableId: string): Promise<DeliverableVersion | undefined> {
    const [version] = await db
      .select()
      .from(deliverableVersions)
      .where(
        and(
          eq(deliverableVersions.deliverableId, deliverableId),
          eq(deliverableVersions.isLatest, true)
        )
      );
    return version;
  }

  async deleteDeliverableVersion(versionId: string): Promise<void> {
    await db
      .delete(deliverableVersions)
      .where(eq(deliverableVersions.id, versionId));
  }

  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{ version1: DeliverableVersion; version2: DeliverableVersion }> {
    const version1 = await this.getDeliverableVersion(versionId1);
    const version2 = await this.getDeliverableVersion(versionId2);
    
    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }
    
    return { version1, version2 };
  }

  async setLatestVersion(deliverableId: string, versionId: string): Promise<void> {
    // Mark all versions as not latest
    await db
      .update(deliverableVersions)
      .set({ isLatest: false })
      .where(eq(deliverableVersions.deliverableId, deliverableId));
    
    // Mark specified version as latest
    await db
      .update(deliverableVersions)
      .set({ isLatest: true })
      .where(eq(deliverableVersions.id, versionId));
  }

  async trackDownload(download: InsertDeliverableDownload): Promise<DeliverableDownload> {
    const [record] = await db
      .insert(deliverableDownloads)
      .values(download)
      .returning();
    return record;
  }

  async getDownloadHistory(
    deliverableId: string,
    filters?: { versionId?: string; userId?: string }
  ): Promise<DeliverableDownload[]> {
    const conditions = [eq(deliverableDownloads.deliverableId, deliverableId)];
    
    if (filters?.versionId) {
      conditions.push(eq(deliverableDownloads.versionId, filters.versionId));
    }
    if (filters?.userId) {
      conditions.push(eq(deliverableDownloads.downloadedBy, filters.userId));
    }
    
    return await db
      .select()
      .from(deliverableDownloads)
      .where(and(...conditions))
      .orderBy(desc(deliverableDownloads.downloadedAt));
  }

  // 7.2 FOR HARDWARE - SHIPPING & QUALITY

  async createShipment(shipment: InsertHardwareShipment): Promise<HardwareShipment> {
    // Generate order number if not provided
    const orderNumber = shipment.orderNumber || `HW-ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Create initial status history
    const statusHistory = [{
      status: shipment.status || 'order_confirmed',
      timestamp: new Date().toISOString(),
      notes: 'Order created',
      location: ''
    }];
    
    const [newShipment] = await db
      .insert(hardwareShipments)
      .values({ ...shipment, orderNumber, statusHistory })
      .returning();
    
    return newShipment;
  }

  async getShipment(shipmentId: string): Promise<HardwareShipment | undefined> {
    const [shipment] = await db
      .select()
      .from(hardwareShipments)
      .where(eq(hardwareShipments.id, shipmentId));
    return shipment;
  }

  async getProjectShipments(projectId: string): Promise<HardwareShipment[]> {
    return await db
      .select()
      .from(hardwareShipments)
      .where(eq(hardwareShipments.projectId, projectId))
      .orderBy(desc(hardwareShipments.createdAt));
  }

  async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    notes?: string,
    location?: string
  ): Promise<HardwareShipment> {
    const shipment = await this.getShipment(shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }
    
    // Add to status history
    const statusEntry = {
      status,
      timestamp: new Date().toISOString(),
      notes: notes || '',
      location: location || ''
    };
    
    const updatedHistory = [...(shipment.statusHistory as any[] || []), statusEntry];
    
    const [updated] = await db
      .update(hardwareShipments)
      .set({
        status,
        statusHistory: updatedHistory,
        updatedAt: new Date()
      })
      .where(eq(hardwareShipments.id, shipmentId))
      .returning();
    
    return updated;
  }

  async getShipmentTimeline(shipmentId: string): Promise<any[]> {
    const shipment = await this.getShipment(shipmentId);
    return (shipment?.statusHistory as any[]) || [];
  }

  async confirmDelivery(
    shipmentId: string,
    receivedBy: string,
    signatureUrl?: string,
    notes?: string
  ): Promise<HardwareShipment> {
    const [updated] = await db
      .update(hardwareShipments)
      .set({
        status: 'delivered',
        deliveredAt: new Date(),
        receivedBy,
        signatureUrl,
        deliveryNotes: notes,
        actualDelivery: new Date(),
        updatedAt: new Date()
      })
      .where(eq(hardwareShipments.id, shipmentId))
      .returning();
    
    // Update status history
    await this.updateShipmentStatus(shipmentId, 'delivered', notes || 'Delivery confirmed', '');
    
    return updated;
  }

  async scheduleInstallation(shipmentId: string, scheduledAt: Date): Promise<HardwareShipment> {
    const [updated] = await db
      .update(hardwareShipments)
      .set({
        installationScheduledAt: scheduledAt,
        updatedAt: new Date()
      })
      .where(eq(hardwareShipments.id, shipmentId))
      .returning();
    
    return updated;
  }

  async completeInstallation(
    shipmentId: string,
    installedBy: string,
    notes?: string
  ): Promise<HardwareShipment> {
    const [updated] = await db
      .update(hardwareShipments)
      .set({
        status: 'installed',
        installedAt: new Date(),
        installedBy,
        installationNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(hardwareShipments.id, shipmentId))
      .returning();
    
    await this.updateShipmentStatus(shipmentId, 'installed', notes || 'Installation completed', '');
    
    return updated;
  }

  async createQualityInspection(inspection: InsertQualityInspection): Promise<QualityInspection> {
    const [newInspection] = await db
      .insert(qualityInspections)
      .values(inspection)
      .returning();
    return newInspection;
  }

  async getShipmentInspections(shipmentId: string): Promise<QualityInspection[]> {
    return await db
      .select()
      .from(qualityInspections)
      .where(eq(qualityInspections.shipmentId, shipmentId))
      .orderBy(desc(qualityInspections.inspectionDate));
  }

  async updateInspectionStatus(
    inspectionId: string,
    status: string,
    approvedBy?: string
  ): Promise<QualityInspection> {
    const [updated] = await db
      .update(qualityInspections)
      .set({
        overallStatus: status,
        approvedBy,
        approvedAt: approvedBy ? new Date() : undefined,
        updatedAt: new Date()
      })
      .where(eq(qualityInspections.id, inspectionId))
      .returning();
    
    return updated;
  }

  async getQualityInspection(inspectionId: string): Promise<QualityInspection | undefined> {
    const [inspection] = await db
      .select()
      .from(qualityInspections)
      .where(eq(qualityInspections.id, inspectionId));
    return inspection;
  }

  async createReturnRequest(returnRequest: InsertReturnReplacement): Promise<ReturnReplacement> {
    const [newReturn] = await db
      .insert(returnsReplacements)
      .values(returnRequest)
      .returning();
    return newReturn;
  }

  async getShipmentReturns(shipmentId: string): Promise<ReturnReplacement[]> {
    return await db
      .select()
      .from(returnsReplacements)
      .where(eq(returnsReplacements.shipmentId, shipmentId))
      .orderBy(desc(returnsReplacements.createdAt));
  }

  async updateReturnStatus(
    returnId: string,
    status: string,
    resolution?: string,
    notes?: string
  ): Promise<ReturnReplacement> {
    const [updated] = await db
      .update(returnsReplacements)
      .set({
        status,
        resolution,
        resolutionNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(returnsReplacements.id, returnId))
      .returning();
    
    return updated;
  }

  async approveReturn(returnId: string, approvedBy: string): Promise<ReturnReplacement> {
    const [updated] = await db
      .update(returnsReplacements)
      .set({
        status: 'approved',
        resolvedBy: approvedBy,
        resolvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(returnsReplacements.id, returnId))
      .returning();
    
    return updated;
  }

  async processRefund(
    returnId: string,
    amount: number,
    processedBy: string
  ): Promise<ReturnReplacement> {
    const [updated] = await db
      .update(returnsReplacements)
      .set({
        status: 'completed',
        resolution: 'refunded',
        refundAmount: amount.toString(),
        refundedAt: new Date(),
        resolvedBy: processedBy,
        resolvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(returnsReplacements.id, returnId))
      .returning();
    
    return updated;
  }

  async createWarrantyClaim(claim: InsertWarrantyClaim): Promise<WarrantyClaim> {
    // Generate claim number if not provided
    const claimNumber = claim.claimNumber || `WC-${new Date().getFullYear()}-${Date.now().toString().substr(-6)}`;
    
    const [newClaim] = await db
      .insert(warrantyClaims)
      .values({ ...claim, claimNumber })
      .returning();
    
    return newClaim;
  }

  async getShipmentWarrantyClaims(shipmentId: string): Promise<WarrantyClaim[]> {
    return await db
      .select()
      .from(warrantyClaims)
      .where(eq(warrantyClaims.shipmentId, shipmentId))
      .orderBy(desc(warrantyClaims.createdAt));
  }

  async getUserWarrantyClaims(userId: string): Promise<WarrantyClaim[]> {
    return await db
      .select()
      .from(warrantyClaims)
      .where(eq(warrantyClaims.claimantId, userId))
      .orderBy(desc(warrantyClaims.createdAt));
  }

  async updateWarrantyClaimStatus(
    claimId: string,
    status: string,
    reviewedBy?: string,
    notes?: string
  ): Promise<WarrantyClaim> {
    const [updated] = await db
      .update(warrantyClaims)
      .set({
        status,
        reviewedBy,
        reviewedAt: reviewedBy ? new Date() : undefined,
        reviewNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(warrantyClaims.id, claimId))
      .returning();
    
    return updated;
  }

  async resolveWarrantyClaim(
    claimId: string,
    resolutionType: string,
    details: string
  ): Promise<WarrantyClaim> {
    const [updated] = await db
      .update(warrantyClaims)
      .set({
        status: 'completed',
        resolutionType,
        resolutionDetails: details,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(warrantyClaims.id, claimId))
      .returning();
    
    return updated;
  }

  // 7.3 FOR SOFTWARE - LICENSE & SUBSCRIPTION

  async generateLicense(license: InsertSoftwareLicense): Promise<SoftwareLicense> {
    // Generate license key if not provided
    const licenseKey = license.licenseKey || 
      `${Math.random().toString(36).substr(2, 4).toUpperCase()}-` +
      `${Math.random().toString(36).substr(2, 4).toUpperCase()}-` +
      `${Math.random().toString(36).substr(2, 4).toUpperCase()}-` +
      `${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const [newLicense] = await db
      .insert(softwareLicenses)
      .values({ ...license, licenseKey })
      .returning();
    
    return newLicense;
  }

  async getLicense(licenseId: string): Promise<SoftwareLicense | undefined> {
    const [license] = await db
      .select()
      .from(softwareLicenses)
      .where(eq(softwareLicenses.id, licenseId));
    return license;
  }

  async getProjectLicenses(projectId: string): Promise<SoftwareLicense[]> {
    return await db
      .select()
      .from(softwareLicenses)
      .where(eq(softwareLicenses.projectId, projectId))
      .orderBy(desc(softwareLicenses.issuedAt));
  }

  async getUserLicenses(userId: string): Promise<SoftwareLicense[]> {
    return await db
      .select()
      .from(softwareLicenses)
      .where(eq(softwareLicenses.issuedTo, userId))
      .orderBy(desc(softwareLicenses.issuedAt));
  }

  async deactivateLicense(
    licenseId: string,
    deactivatedBy: string,
    reason?: string
  ): Promise<SoftwareLicense> {
    const [updated] = await db
      .update(softwareLicenses)
      .set({
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy,
        deactivationReason: reason,
        updatedAt: new Date()
      })
      .where(eq(softwareLicenses.id, licenseId))
      .returning();
    
    return updated;
  }

  async extendLicense(licenseId: string, newExpiryDate: Date): Promise<SoftwareLicense> {
    const [updated] = await db
      .update(softwareLicenses)
      .set({
        expiresAt: newExpiryDate,
        updatedAt: new Date()
      })
      .where(eq(softwareLicenses.id, licenseId))
      .returning();
    
    return updated;
  }

  async createSubscription(subscription: InsertSoftwareSubscription): Promise<SoftwareSubscription> {
    const [newSubscription] = await db
      .insert(softwareSubscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async getLicenseSubscription(licenseId: string): Promise<SoftwareSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(softwareSubscriptions)
      .where(eq(softwareSubscriptions.licenseId, licenseId));
    return subscription;
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: string
  ): Promise<SoftwareSubscription> {
    const [updated] = await db
      .update(softwareSubscriptions)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(softwareSubscriptions.id, subscriptionId))
      .returning();
    
    return updated;
  }

  async renewSubscription(subscriptionId: string): Promise<SoftwareSubscription> {
    const subscription = await db
      .select()
      .from(softwareSubscriptions)
      .where(eq(softwareSubscriptions.id, subscriptionId))
      .then(rows => rows[0]);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    
    // Calculate new period dates based on billing cycle
    const currentEnd = new Date(subscription.currentPeriodEnd);
    let newEnd: Date;
    
    switch (subscription.billingCycle) {
      case 'monthly':
        newEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + 1));
        break;
      case 'quarterly':
        newEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + 3));
        break;
      case 'annual':
        newEnd = new Date(currentEnd.setFullYear(currentEnd.getFullYear() + 1));
        break;
      default:
        newEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + 1));
    }
    
    const [updated] = await db
      .update(softwareSubscriptions)
      .set({
        currentPeriodStart: subscription.currentPeriodEnd,
        currentPeriodEnd: newEnd,
        nextBillingDate: newEnd,
        renewalCount: (subscription.renewalCount || 0) + 1,
        lastPaymentAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(softwareSubscriptions.id, subscriptionId))
      .returning();
    
    return updated;
  }

  async cancelSubscription(
    subscriptionId: string,
    reason?: string
  ): Promise<SoftwareSubscription> {
    const [updated] = await db
      .update(softwareSubscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
        autoRenew: false,
        updatedAt: new Date()
      })
      .where(eq(softwareSubscriptions.id, subscriptionId))
      .returning();
    
    return updated;
  }

  async activateLicense(activation: InsertSoftwareActivation): Promise<SoftwareActivation> {
    // Check activation limits
    const license = await this.getLicense(activation.licenseId);
    if (!license) {
      throw new Error('License not found');
    }
    
    if (license.maxActivations !== -1 && 
        (license.currentActivations || 0) >= (license.maxActivations || 0)) {
      throw new Error('Maximum activations reached');
    }
    
    const [newActivation] = await db
      .insert(softwareActivations)
      .values(activation)
      .returning();
    
    // Update license activation count
    await db
      .update(softwareLicenses)
      .set({
        currentActivations: (license.currentActivations || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(softwareLicenses.id, activation.licenseId));
    
    return newActivation;
  }

  async getLicenseActivations(licenseId: string): Promise<SoftwareActivation[]> {
    return await db
      .select()
      .from(softwareActivations)
      .where(eq(softwareActivations.licenseId, licenseId))
      .orderBy(desc(softwareActivations.activatedAt));
  }

  async deactivateDevice(
    activationId: string,
    deactivatedBy: string,
    reason?: string
  ): Promise<SoftwareActivation> {
    const activation = await db
      .select()
      .from(softwareActivations)
      .where(eq(softwareActivations.id, activationId))
      .then(rows => rows[0]);
    
    if (!activation) {
      throw new Error('Activation not found');
    }
    
    const [updated] = await db
      .update(softwareActivations)
      .set({
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy,
        deactivationReason: reason,
        updatedAt: new Date()
      })
      .where(eq(softwareActivations.id, activationId))
      .returning();
    
    // Decrement license activation count
    const license = await this.getLicense(activation.licenseId);
    if (license) {
      await db
        .update(softwareLicenses)
        .set({
          currentActivations: Math.max(0, (license.currentActivations || 0) - 1),
          updatedAt: new Date()
        })
        .where(eq(softwareLicenses.id, activation.licenseId));
    }
    
    return updated;
  }

  async updateActivationUsage(activationId: string): Promise<SoftwareActivation> {
    const [updated] = await db
      .update(softwareActivations)
      .set({
        lastUsedAt: new Date(),
        usageCount: sql`${softwareActivations.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(softwareActivations.id, activationId))
      .returning();
    
    return updated;
  }

  async getActiveDevices(licenseId: string): Promise<SoftwareActivation[]> {
    return await db
      .select()
      .from(softwareActivations)
      .where(
        and(
          eq(softwareActivations.licenseId, licenseId),
          eq(softwareActivations.isActive, true)
        )
      )
      .orderBy(desc(softwareActivations.lastUsedAt));
  }

  // ============================================================================
  // 8. PAYMENT & ESCROW SYSTEM IMPLEMENTATIONS
  // ============================================================================

  // 8.1 ESCROW MANAGEMENT OPERATIONS (12 methods)
  
  async createEscrowAccount(account: InsertEscrowAccount): Promise<EscrowAccount> {
    const [created] = await db.insert(escrowAccounts).values(account).returning();
    return created;
  }

  async getEscrowAccount(id: string): Promise<EscrowAccount | undefined> {
    const [account] = await db.select().from(escrowAccounts).where(eq(escrowAccounts.id, id));
    return account;
  }

  async getEscrowAccountByProject(projectId: string): Promise<EscrowAccount | undefined> {
    const [account] = await db.select().from(escrowAccounts).where(eq(escrowAccounts.projectId, projectId));
    return account;
  }

  async depositToEscrow(accountId: string, amount: string, createdBy: string, description?: string): Promise<EscrowAccount> {
    // Create transaction record
    await db.insert(escrowTransactions).values({
      escrowAccountId: accountId,
      type: 'deposit',
      amount,
      status: 'completed',
      description: description || 'Deposit to escrow',
      createdBy,
    });

    // Update escrow account balances
    const [updated] = await db
      .update(escrowAccounts)
      .set({
        totalAmount: sql`${escrowAccounts.totalAmount} + ${amount}::numeric`,
        availableBalance: sql`${escrowAccounts.availableBalance} + ${amount}::numeric`,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(escrowAccounts.id, accountId))
      .returning();

    return updated;
  }

  async releaseFromEscrow(accountId: string, amount: string, createdBy: string, description?: string): Promise<EscrowAccount> {
    return await this.withPaymentTransaction(async (tx) => {
      // Verify ownership - only client can release escrow funds
      await this.assertEscrowOwnership(createdBy, accountId, 'client', tx);

      // Validate balance before release
      const [account] = await tx.select().from(escrowAccounts).where(eq(escrowAccounts.id, accountId));
      if (!account) {
        throw new Error('Escrow account not found');
      }

      const requestedAmount = parseFloat(amount);
      const available = parseFloat(account.availableBalance);

      if (requestedAmount <= 0) {
        throw new Error('Release amount must be positive');
      }

      if (requestedAmount > available) {
        throw new Error(`Insufficient escrow balance. Available: ${available}, Requested: ${requestedAmount}`);
      }

      // Create transaction record
      await tx.insert(escrowTransactions).values({
        escrowAccountId: accountId,
        type: 'release',
        amount,
        status: 'completed',
        description: description || 'Release from escrow',
        createdBy,
      });

      // Update escrow account balances
      const [updated] = await tx
        .update(escrowAccounts)
        .set({
          availableBalance: sql`${escrowAccounts.availableBalance} - ${amount}::numeric`,
          releasedAmount: sql`${escrowAccounts.releasedAmount} + ${amount}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, accountId))
        .returning();

      return updated;
    });
  }

  async partialReleaseFromEscrow(accountId: string, amount: string, milestoneIndex: number | null, createdBy: string, description?: string): Promise<EscrowAccount> {
    return await this.withPaymentTransaction(async (tx) => {
      // Verify ownership - only client can release escrow funds
      await this.assertEscrowOwnership(createdBy, accountId, 'client', tx);

      // Validate balance before partial release
      const [account] = await tx.select().from(escrowAccounts).where(eq(escrowAccounts.id, accountId));
      if (!account) {
        throw new Error('Escrow account not found');
      }

      const requestedAmount = parseFloat(amount);
      const available = parseFloat(account.availableBalance);

      if (requestedAmount <= 0) {
        throw new Error('Release amount must be positive');
      }

      if (requestedAmount > available) {
        throw new Error(`Insufficient escrow balance. Available: ${available}, Requested: ${requestedAmount}`);
      }

      // Create transaction record with milestone link
      await tx.insert(escrowTransactions).values({
        escrowAccountId: accountId,
        type: 'partial_release',
        amount,
        status: 'completed',
        description: description || `Partial release for milestone ${milestoneIndex}`,
        createdBy,
        relatedMilestoneIndex: milestoneIndex,
      });

      // Update escrow account balances
      const [updated] = await tx
        .update(escrowAccounts)
        .set({
          availableBalance: sql`${escrowAccounts.availableBalance} - ${amount}::numeric`,
          releasedAmount: sql`${escrowAccounts.releasedAmount} + ${amount}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, accountId))
        .returning();

      return updated;
    });
  }

  async holdEscrowFunds(accountId: string, amount: string, createdBy: string, description?: string): Promise<EscrowAccount> {
    return await this.withPaymentTransaction(async (tx) => {
      // Verify ownership - both parties can initiate hold
      await this.assertEscrowOwnership(createdBy, accountId, 'both', tx);

      // Validate balance before hold
      const [account] = await tx.select().from(escrowAccounts).where(eq(escrowAccounts.id, accountId));
      if (!account) {
        throw new Error('Escrow account not found');
      }

      const requestedAmount = parseFloat(amount);
      const available = parseFloat(account.availableBalance);

      if (requestedAmount <= 0) {
        throw new Error('Hold amount must be positive');
      }

      if (requestedAmount > available) {
        throw new Error(`Insufficient escrow balance to hold. Available: ${available}, Requested: ${requestedAmount}`);
      }

      // Create transaction record
      await tx.insert(escrowTransactions).values({
        escrowAccountId: accountId,
        type: 'hold',
        amount,
        status: 'completed',
        description: description || 'Hold escrow funds',
        createdBy,
      });

      // Update escrow account balances
      const [updated] = await tx
        .update(escrowAccounts)
        .set({
          availableBalance: sql`${escrowAccounts.availableBalance} - ${amount}::numeric`,
          onHoldAmount: sql`${escrowAccounts.onHoldAmount} + ${amount}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, accountId))
        .returning();

      return updated;
    });
  }

  async refundFromEscrow(accountId: string, amount: string, createdBy: string, description?: string): Promise<EscrowAccount> {
    return await this.withPaymentTransaction(async (tx) => {
      // Verify ownership - typically client initiates refund, but admin/system can too
      await this.assertEscrowOwnership(createdBy, accountId, 'both', tx);

      // Validate balance before refund
      const [account] = await tx.select().from(escrowAccounts).where(eq(escrowAccounts.id, accountId));
      if (!account) {
        throw new Error('Escrow account not found');
      }

      const requestedAmount = parseFloat(amount);
      const available = parseFloat(account.availableBalance);

      if (requestedAmount <= 0) {
        throw new Error('Refund amount must be positive');
      }

      if (requestedAmount > available) {
        throw new Error(`Insufficient escrow balance for refund. Available: ${available}, Requested: ${requestedAmount}`);
      }

      // Create transaction record
      await tx.insert(escrowTransactions).values({
        escrowAccountId: accountId,
        type: 'refund',
        amount,
        status: 'completed',
        description: description || 'Refund from escrow',
        createdBy,
      });

      // Update escrow account balances
      const [updated] = await tx
        .update(escrowAccounts)
        .set({
          availableBalance: sql`${escrowAccounts.availableBalance} - ${amount}::numeric`,
          refundedAmount: sql`${escrowAccounts.refundedAmount} + ${amount}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, accountId))
        .returning();

      return updated;
    });
  }

  async getEscrowTransactions(accountId: string): Promise<EscrowTransaction[]> {
    return await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.escrowAccountId, accountId))
      .orderBy(desc(escrowTransactions.createdAt));
  }

  async getEscrowBalance(accountId: string): Promise<{ totalAmount: string; availableBalance: string; onHoldAmount: string; releasedAmount: string; refundedAmount: string }> {
    const [account] = await db.select().from(escrowAccounts).where(eq(escrowAccounts.id, accountId));
    if (!account) {
      return { totalAmount: '0.00', availableBalance: '0.00', onHoldAmount: '0.00', releasedAmount: '0.00', refundedAmount: '0.00' };
    }
    return {
      totalAmount: account.totalAmount,
      availableBalance: account.availableBalance,
      onHoldAmount: account.onHoldAmount,
      releasedAmount: account.releasedAmount,
      refundedAmount: account.refundedAmount,
    };
  }

  async updateEscrowStatus(accountId: string, status: string): Promise<EscrowAccount> {
    const [updated] = await db
      .update(escrowAccounts)
      .set({ status, updatedAt: new Date() })
      .where(eq(escrowAccounts.id, accountId))
      .returning();
    return updated;
  }

  async getEscrowAnalytics(): Promise<{ totalEscrow: string; activeProjects: number; pendingReleases: number }> {
    const accounts = await db.select().from(escrowAccounts).where(eq(escrowAccounts.status, 'active'));
    const totalEscrow = accounts.reduce((sum, acc) => {
      const balance = parseFloat(acc.availableBalance || '0');
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0).toFixed(2);
    const activeProjects = accounts.length;
    const pendingReleases = accounts.filter(acc => {
      const balance = parseFloat(acc.availableBalance || '0');
      return !isNaN(balance) && balance > 0;
    }).length;
    
    return { totalEscrow, activeProjects, pendingReleases };
  }

  // 8.2 PAYMENT MILESTONE OPERATIONS (8 methods)

  async createPaymentMilestone(milestone: InsertPaymentMilestone): Promise<PaymentMilestone> {
    const [created] = await db.insert(paymentMilestones).values(milestone).returning();
    return created;
  }

  async getPaymentMilestones(projectId: string): Promise<PaymentMilestone[]> {
    return await db
      .select()
      .from(paymentMilestones)
      .where(eq(paymentMilestones.projectId, projectId))
      .orderBy(paymentMilestones.createdAt);
  }

  async updateMilestonePaymentStatus(milestoneId: string, status: string, releasedBy?: string): Promise<PaymentMilestone> {
    const updateData: any = { status, updatedAt: new Date() };
    if (releasedBy) updateData.releasedBy = releasedBy;
    if (status === 'released') updateData.paidAt = new Date();

    const [updated] = await db
      .update(paymentMilestones)
      .set(updateData)
      .where(eq(paymentMilestones.id, milestoneId))
      .returning();
    return updated;
  }

  async releaseMilestonePayment(milestoneId: string, releasedBy: string): Promise<PaymentMilestone> {
    return await this.withPaymentTransaction(async (tx) => {
      // Get milestone details
      const [milestone] = await tx.select().from(paymentMilestones).where(eq(paymentMilestones.id, milestoneId));
      if (!milestone) {
        throw new Error('Payment milestone not found');
      }

      // Get escrow account for this project
      const [escrowAccount] = await tx.select().from(escrowAccounts).where(eq(escrowAccounts.projectId, milestone.projectId));
      if (!escrowAccount) {
        throw new Error('Escrow account not found for this project');
      }

      // Verify ownership - only client can release milestone payments
      await this.assertEscrowOwnership(releasedBy, escrowAccount.id, 'client', tx);

      // Validate escrow has sufficient balance
      const requestedAmount = parseFloat(milestone.amount);
      const available = parseFloat(escrowAccount.availableBalance);
      
      if (requestedAmount > available) {
        throw new Error(`Insufficient escrow balance for milestone release. Available: ${available}, Requested: ${requestedAmount}`);
      }

      // Create escrow transaction for this milestone release
      await tx.insert(escrowTransactions).values({
        escrowAccountId: escrowAccount.id,
        type: 'partial_release',
        amount: milestone.amount,
        status: 'completed',
        description: `Release payment for milestone ${milestone.milestoneIndex}`,
        createdBy: releasedBy,
        relatedMilestoneIndex: milestone.milestoneIndex,
      });

      // Update escrow account balances
      await tx
        .update(escrowAccounts)
        .set({
          availableBalance: sql`${escrowAccounts.availableBalance} - ${milestone.amount}::numeric`,
          releasedAmount: sql`${escrowAccounts.releasedAmount} + ${milestone.amount}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, escrowAccount.id));

      // Update milestone payment status
      const [updatedMilestone] = await tx
        .update(paymentMilestones)
        .set({
          status: 'released',
          releasedBy,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(paymentMilestones.id, milestoneId))
        .returning();

      return updatedMilestone;
    });
  }

  async linkMilestoneToPayment(projectId: string, milestoneIndex: number, amount: string): Promise<PaymentMilestone> {
    const [created] = await db
      .insert(paymentMilestones)
      .values({
        projectId,
        milestoneIndex,
        amount,
        status: 'pending_deposit',
      })
      .returning();
    return created;
  }

  async getPendingMilestonePayments(projectId: string): Promise<PaymentMilestone[]> {
    return await db
      .select()
      .from(paymentMilestones)
      .where(
        and(
          eq(paymentMilestones.projectId, projectId),
          eq(paymentMilestones.status, 'pending_deposit')
        )
      );
  }

  async getCompletedMilestonePayments(projectId: string): Promise<PaymentMilestone[]> {
    return await db
      .select()
      .from(paymentMilestones)
      .where(
        and(
          eq(paymentMilestones.projectId, projectId),
          eq(paymentMilestones.status, 'released')
        )
      );
  }

  async getMilestonePaymentHistory(projectId: string): Promise<PaymentMilestone[]> {
    return await this.getPaymentMilestones(projectId);
  }

  // 8.3 INVOICE MANAGEMENT OPERATIONS (10 methods)

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    // Auto-generate invoice number if not provided
    if (!invoice.invoiceNumber) {
      invoice.invoiceNumber = await this.generateInvoiceNumber();
    }
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getAllInvoices(filters?: { status?: string; projectId?: string; userId?: string }): Promise<Invoice[]> {
    let query = db.select().from(invoices);
    
    const conditions = [];
    if (filters?.status) conditions.push(eq(invoices.status, filters.status));
    if (filters?.projectId) conditions.push(eq(invoices.projectId, filters.projectId));
    if (filters?.userId) {
      conditions.push(or(eq(invoices.clientId, filters.userId), eq(invoices.consultantId, filters.userId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(invoices.createdAt));
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'paid') updateData.paidAt = new Date();

    const [updated] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    // Get the latest invoice for this year
    const latestInvoices = await db
      .select()
      .from(invoices)
      .where(sql`${invoices.invoiceNumber} LIKE ${prefix}%`)
      .orderBy(desc(invoices.invoiceNumber))
      .limit(1);

    let nextNumber = 1;
    if (latestInvoices.length > 0) {
      const lastNumber = parseInt(latestInvoices[0].invoiceNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  async getInvoicesByProject(projectId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.projectId, projectId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByUser(userId: string, role: 'client' | 'consultant'): Promise<Invoice[]> {
    const condition = role === 'client' 
      ? eq(invoices.clientId, userId)
      : eq(invoices.consultantId, userId);

    return await db
      .select()
      .from(invoices)
      .where(condition)
      .orderBy(desc(invoices.createdAt));
  }

  async markInvoiceAsPaid(id: string): Promise<Invoice> {
    return await this.updateInvoiceStatus(id, 'paid');
  }

  async cancelInvoice(id: string): Promise<Invoice> {
    return await this.updateInvoiceStatus(id, 'cancelled');
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const now = new Date();
    return await db
      .select()
      .from(invoices)
      .where(
        and(
          sql`${invoices.dueDate} < ${now}`,
          sql`${invoices.status} NOT IN ('paid', 'cancelled')`
        )
      )
      .orderBy(invoices.dueDate);
  }

  // 8.4 WALLET SYSTEM OPERATIONS (9 methods)

  async createWalletAccount(account: InsertWalletAccount): Promise<WalletAccount> {
    const [created] = await db.insert(walletAccounts).values(account).returning();
    return created;
  }

  async getWalletAccount(userId: string): Promise<WalletAccount | undefined> {
    const [wallet] = await db.select().from(walletAccounts).where(eq(walletAccounts.userId, userId));
    return wallet;
  }

  async addFundsToWallet(userId: string, amount: string, description?: string): Promise<WalletAccount> {
    // Get current wallet
    let wallet = await this.getWalletAccount(userId);
    if (!wallet) {
      wallet = await this.createWalletAccount({ userId, balance: '0.00' });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = (parseFloat(balanceBefore) + parseFloat(amount)).toFixed(2);

    // Create transaction record
    await db.insert(walletTransactions).values({
      walletAccountId: wallet.id,
      type: 'add_funds',
      amount,
      description: description || 'Add funds to wallet',
      balanceBefore,
      balanceAfter,
    });

    // Update wallet balance
    const [updated] = await db
      .update(walletAccounts)
      .set({
        balance: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(walletAccounts.id, wallet.id))
      .returning();

    return updated;
  }

  async deductFromWallet(userId: string, amount: string, projectId?: string, description?: string): Promise<WalletAccount> {
    return await this.withPaymentTransaction(async (tx) => {
      // Get wallet within transaction
      const [wallet] = await tx.select().from(walletAccounts).where(eq(walletAccounts.userId, userId));
      if (!wallet) throw new Error('Wallet not found');

      const requestedAmount = parseFloat(amount);
      const currentBalance = parseFloat(wallet.balance);

      if (requestedAmount <= 0) {
        throw new Error('Deduction amount must be positive');
      }

      if (requestedAmount > currentBalance) {
        throw new Error(`Insufficient wallet balance. Available: ${currentBalance}, Requested: ${requestedAmount}`);
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = (currentBalance - requestedAmount).toFixed(2);

      // Create transaction record
      await tx.insert(walletTransactions).values({
        walletAccountId: wallet.id,
        type: 'payment',
        amount,
        relatedProjectId: projectId,
        description: description || 'Payment from wallet',
        balanceBefore,
        balanceAfter,
      });

      // Update wallet balance
      const [updated] = await tx
        .update(walletAccounts)
        .set({
          balance: balanceAfter,
          updatedAt: new Date(),
        })
        .where(eq(walletAccounts.id, wallet.id))
        .returning();

      return updated;
    });
  }

  async getWalletBalance(userId: string): Promise<string> {
    const wallet = await this.getWalletAccount(userId);
    return wallet?.balance || '0.00';
  }

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    const wallet = await this.getWalletAccount(userId);
    if (!wallet) return [];

    return await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletAccountId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt));
  }

  async withdrawFromWallet(userId: string, amount: string, description?: string): Promise<WalletAccount> {
    return await this.withPaymentTransaction(async (tx) => {
      // Get wallet within transaction
      const [wallet] = await tx.select().from(walletAccounts).where(eq(walletAccounts.userId, userId));
      if (!wallet) throw new Error('Wallet not found');

      const requestedAmount = parseFloat(amount);
      const currentBalance = parseFloat(wallet.balance);

      if (requestedAmount <= 0) {
        throw new Error('Withdrawal amount must be positive');
      }

      if (requestedAmount > currentBalance) {
        throw new Error(`Insufficient wallet balance. Available: ${currentBalance}, Requested: ${requestedAmount}`);
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = (currentBalance - requestedAmount).toFixed(2);

      // Create transaction record
      await tx.insert(walletTransactions).values({
        walletAccountId: wallet.id,
        type: 'withdraw',
        amount,
        description: description || 'Withdraw from wallet',
        balanceBefore,
        balanceAfter,
      });

      // Update wallet balance
      const [updated] = await tx
        .update(walletAccounts)
        .set({
          balance: balanceAfter,
          updatedAt: new Date(),
        })
        .where(eq(walletAccounts.id, wallet.id))
        .returning();

      return updated;
    });
  }

  async getWalletHistory(userId: string, limit?: number): Promise<WalletTransaction[]> {
    const wallet = await this.getWalletAccount(userId);
    if (!wallet) return [];

    let query = db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletAccountId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    return await query;
  }

  async updateWalletPreferences(userId: string, preferences: Partial<InsertPaymentPreferences>): Promise<PaymentPreferences> {
    // Try to get existing preferences
    const [existing] = await db
      .select()
      .from(paymentPreferences)
      .where(eq(paymentPreferences.userId, userId));

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(paymentPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq(paymentPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db
        .insert(paymentPreferences)
        .values({ userId, ...preferences })
        .returning();
      return created;
    }
  }

  // 8.5 REFUND & TAX OPERATIONS (11 methods)

  async createRefundRequest(request: InsertRefundRequest): Promise<RefundRequest> {
    const [created] = await db.insert(refundRequests).values(request).returning();
    return created;
  }

  async getRefundRequest(id: string): Promise<RefundRequest | undefined> {
    const [request] = await db.select().from(refundRequests).where(eq(refundRequests.id, id));
    return request;
  }

  async getAllRefundRequests(filters?: { status?: string; userId?: string }): Promise<RefundRequest[]> {
    let query = db.select().from(refundRequests);

    const conditions = [];
    if (filters?.status) conditions.push(eq(refundRequests.status, filters.status));
    if (filters?.userId) conditions.push(eq(refundRequests.requestedBy, filters.userId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(refundRequests.requestedAt));
  }

  async updateRefundStatus(id: string, status: string, adminId?: string, adminNotes?: string): Promise<RefundRequest> {
    const updateData: any = { status, updatedAt: new Date() };
    if (adminId) {
      updateData.adminId = adminId;
      updateData.reviewedAt = new Date();
    }
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (status === 'processed') updateData.processedAt = new Date();

    const [updated] = await db
      .update(refundRequests)
      .set(updateData)
      .where(eq(refundRequests.id, id))
      .returning();
    return updated;
  }

  async approveRefundRequest(id: string, adminId: string, notes?: string): Promise<RefundRequest> {
    return await this.updateRefundStatus(id, 'approved', adminId, notes);
  }

  async rejectRefundRequest(id: string, adminId: string, notes: string): Promise<RefundRequest> {
    return await this.updateRefundStatus(id, 'rejected', adminId, notes);
  }

  async processRefund(id: string): Promise<RefundRequest> {
    return await this.updateRefundStatus(id, 'processed');
  }

  async createTaxProfile(profile: InsertTaxProfile): Promise<TaxProfile> {
    const [created] = await db.insert(taxProfiles).values(profile).returning();
    return created;
  }

  async getTaxProfile(userId: string): Promise<TaxProfile | undefined> {
    const [profile] = await db.select().from(taxProfiles).where(eq(taxProfiles.userId, userId));
    return profile;
  }

  async updateTaxProfile(userId: string, updates: Partial<InsertTaxProfile>): Promise<TaxProfile> {
    const [updated] = await db
      .update(taxProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(taxProfiles.userId, userId))
      .returning();
    return updated;
  }

  async calculateVAT(amount: number): Promise<{ vatAmount: number; total: number }> {
    const VAT_RATE = 0.15; // 15% for Saudi Arabia
    const vatAmount = parseFloat((amount * VAT_RATE).toFixed(2));
    const total = parseFloat((amount + vatAmount).toFixed(2));
    return { vatAmount, total };
  }

  // 8.6 ANALYTICS & TRANSACTION HISTORY OPERATIONS (9 methods)

  async getAllTransactions(userId?: string): Promise<any[]> {
    const escrowTxns = userId 
      ? await db.select().from(escrowTransactions).where(eq(escrowTransactions.createdBy, userId))
      : await db.select().from(escrowTransactions);
    
    const walletTxns = userId
      ? await db.select().from(walletTransactions)
          .innerJoin(walletAccounts, eq(walletTransactions.walletAccountId, walletAccounts.id))
          .where(eq(walletAccounts.userId, userId))
      : await db.select().from(walletTransactions);

    return [...escrowTxns, ...walletTxns].sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTransactionsByUser(userId: string, role: 'client' | 'consultant'): Promise<any[]> {
    return await this.getAllTransactions(userId);
  }

  async getTransactionsByProject(projectId: string): Promise<any[]> {
    const escrowAccount = await this.getEscrowAccountByProject(projectId);
    if (!escrowAccount) return [];

    const escrowTxns = await this.getEscrowTransactions(escrowAccount.id);
    const walletTxns = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.relatedProjectId, projectId));

    return [...escrowTxns, ...walletTxns].sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async exportTransactions(filters?: any): Promise<string> {
    const transactions = await this.getAllTransactions();
    
    // Generate CSV
    const headers = 'Date,Type,Amount,Description,Status\n';
    const rows = transactions.map((t: any) => {
      const date = new Date(t.createdAt).toISOString().split('T')[0];
      return `${date},${t.type || 'N/A'},${t.amount},${t.description || 'N/A'},${t.status || 'N/A'}`;
    }).join('\n');

    return headers + rows;
  }

  async getVendorEarnings(consultantId: string, period?: { start: Date; end: Date }): Promise<any> {
    // Get all projects for this consultant
    const consultantProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.consultantId, consultantId));

    let totalEarnings = 0;
    let pendingPayments = 0;
    let releasedAmount = 0;

    for (const project of consultantProjects) {
      const escrowAccount = await this.getEscrowAccountByProject(project.id);
      if (escrowAccount) {
        const total = parseFloat(escrowAccount.totalAmount || '0');
        const available = parseFloat(escrowAccount.availableBalance || '0');
        const released = parseFloat(escrowAccount.releasedAmount || '0');
        
        totalEarnings += isNaN(total) ? 0 : total;
        pendingPayments += isNaN(available) ? 0 : available;
        releasedAmount += isNaN(released) ? 0 : released;
      }
    }

    return {
      totalEarnings: totalEarnings.toFixed(2),
      pendingPayments: pendingPayments.toFixed(2),
      releasedAmount: releasedAmount.toFixed(2),
      projectCount: consultantProjects.length,
    };
  }

  async getClientSpending(clientId: string, period?: { start: Date; end: Date }): Promise<any> {
    // Get all projects for this client
    const clientProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.clientId, clientId));

    let totalSpent = 0;
    let inEscrow = 0;
    let releasedAmount = 0;

    for (const project of clientProjects) {
      const escrowAccount = await this.getEscrowAccountByProject(project.id);
      if (escrowAccount) {
        const total = parseFloat(escrowAccount.totalAmount || '0');
        const available = parseFloat(escrowAccount.availableBalance || '0');
        const released = parseFloat(escrowAccount.releasedAmount || '0');
        
        totalSpent += isNaN(total) ? 0 : total;
        inEscrow += isNaN(available) ? 0 : available;
        releasedAmount += isNaN(released) ? 0 : released;
      }
    }

    return {
      totalSpent: totalSpent.toFixed(2),
      inEscrow: inEscrow.toFixed(2),
      releasedAmount: releasedAmount.toFixed(2),
      projectCount: clientProjects.length,
    };
  }

  async getPaymentAnalytics(): Promise<any> {
    const allEscrowAccounts = await db.select().from(escrowAccounts);
    
    const totalPlatformEscrow = allEscrowAccounts.reduce(
      (sum, acc) => {
        const balance = parseFloat(acc.availableBalance || '0');
        return sum + (isNaN(balance) ? 0 : balance);
      },
      0
    ).toFixed(2);

    const totalReleased = allEscrowAccounts.reduce(
      (sum, acc) => {
        const released = parseFloat(acc.releasedAmount || '0');
        return sum + (isNaN(released) ? 0 : released);
      },
      0
    ).toFixed(2);

    const totalRefunded = allEscrowAccounts.reduce(
      (sum, acc) => {
        const refunded = parseFloat(acc.refundedAmount || '0');
        return sum + (isNaN(refunded) ? 0 : refunded);
      },
      0
    ).toFixed(2);

    const activeProjects = allEscrowAccounts.filter(acc => acc.status === 'active').length;

    return {
      totalPlatformEscrow,
      totalReleased,
      totalRefunded,
      activeProjects,
      totalProjects: allEscrowAccounts.length,
    };
  }

  async getEarningsChartData(consultantId: string, period: 'week' | 'month' | 'year'): Promise<any[]> {
    // Simplified implementation - returns mock data structure
    // In production, this would query actual transaction data grouped by time period
    return [];
  }

  async getSpendingChartData(clientId: string, period: 'week' | 'month' | 'year'): Promise<any[]> {
    // Simplified implementation - returns mock data structure
    // In production, this would query actual transaction data grouped by time period
    return [];
  }
}

export const storage = new DatabaseStorage();
