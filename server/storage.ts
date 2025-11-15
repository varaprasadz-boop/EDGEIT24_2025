import {
  users,
  clientProfiles,
  consultantProfiles,
  consultantCategories,
  categories,
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
  type User,
  type InsertUser,
  type UpsertUser,
  type ClientProfile,
  type InsertClientProfile,
  type ConsultantProfile,
  type InsertConsultantProfile,
  type Job,
  type InsertJob,
  type Bid,
  type Category,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, sql, desc, inArray } from "drizzle-orm";
import { nanoid } from 'nanoid';

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
  
  // Email verification operations
  setEmailVerificationToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByEmailToken(token: string): Promise<User | undefined>;
  verifyUserEmail(userId: string): Promise<User>;
  invalidateEmailVerificationToken(userId: string): Promise<void>;
  
  // Client Profile operations
  getClientProfile(userId: string): Promise<ClientProfile | undefined>;
  createClientProfile(profile: InsertClientProfile): Promise<ClientProfile>;
  updateClientProfile(userId: string, profile: Partial<InsertClientProfile>): Promise<ClientProfile>;
  
  // Consultant Profile operations
  getConsultantProfile(userId: string): Promise<ConsultantProfile | undefined>;
  createConsultantProfile(profile: InsertConsultantProfile): Promise<ConsultantProfile>;
  updateConsultantProfile(userId: string, profile: Partial<InsertConsultantProfile>): Promise<ConsultantProfile>;
  
  // Consultant Category operations
  getConsultantCategories(userId: string): Promise<ConsultantCategoryWithDetails[]>;
  setConsultantCategories(userId: string, categoryIds: string[], primaryCategoryId: string | null): Promise<ConsultantCategoryWithDetails[]>;
  
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
}

export const storage = new DatabaseStorage();
