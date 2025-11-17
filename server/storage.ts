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
  projects,
  payments,
  reviews,
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
  type Category,
  type VendorCategoryRequest,
  type InsertVendorCategoryRequest,
  type Review,
  type InsertReview,
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
  getReviews(consultantId: string, options?: { limit?: number; offset?: number }): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  markReviewHelpful(reviewId: string): Promise<void>;
  getReviewStats(consultantId: string): Promise<{ averageRating: number; totalReviews: number; ratingBreakdown: Record<number, number> }>;
  
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
}

export class DatabaseStorage implements IStorage {
  // User operations
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
      // Create the review
      const [created] = await tx
        .insert(reviews)
        .values(review)
        .returning();

      // Update consultant profile stats
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

      return created;
    });
  }

  async markReviewHelpful(reviewId: string): Promise<void> {
    await db
      .update(reviews)
      .set({ helpful: sql`${reviews.helpful} + 1` })
      .where(eq(reviews.id, reviewId));
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
    // Get bids on jobs posted by this client - select all bid fields explicitly
    return await db
      .select({
        id: bids.id,
        createdAt: bids.createdAt,
        updatedAt: bids.updatedAt,
        status: bids.status,
        attachments: bids.attachments,
        jobId: bids.jobId,
        consultantId: bids.consultantId,
        coverLetter: bids.coverLetter,
        proposedBudget: bids.proposedBudget,
        proposedDuration: bids.proposedDuration,
        milestones: bids.milestones,
        clientViewed: bids.clientViewed,
      })
      .from(bids)
      .innerJoin(jobs, eq(bids.jobId, jobs.id))
      .where(eq(jobs.clientId, userId))
      .orderBy(desc(bids.createdAt))
      .limit(limit);
  }

  // Job operations
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
  }): Promise<{ consultants: (ConsultantProfile & { categoryPathLabel: string; primaryCategoryId: string | null })[]; total: number }> {
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
}

export const storage = new DatabaseStorage();
