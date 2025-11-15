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
  isPrimary: boolean;
  category: Category;
}

export interface IStorage {
  // User operations - Required for Replit Auth and local auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByReplitSub(replitSub: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
    // Get bids on jobs posted by this client - select all bid fields
    return await db
      .select(bids)
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
