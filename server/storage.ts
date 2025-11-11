import {
  users,
  clientProfiles,
  consultantProfiles,
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
  type Bid,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";

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
  
  // Dashboard operations
  getClientDashboardStats(userId: string): Promise<DashboardStats>;
  getConsultantDashboardStats(userId: string): Promise<ConsultantDashboardStats>;
  listClientJobs(userId: string, limit?: number): Promise<Job[]>;
  listClientBids(userId: string, limit?: number): Promise<Bid[]>;
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

  // Dashboard operations
  async getClientDashboardStats(userId: string): Promise<DashboardStats> {
    // Count active jobs posted by client
    const [jobStats] = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.clientId, userId),
          sql`${jobs.status} IN ('open', 'in_progress')`
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
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.clientId, userId))
      .orderBy(desc(jobs.createdAt))
      .limit(limit);
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
}

export const storage = new DatabaseStorage();
