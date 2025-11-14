import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, decimal, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  })
);

// Users table - Core authentication and role management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"), // For local auth, nullable for OIDC users
  role: text("role").notNull().default('client'), // 'client', 'consultant', 'both', 'admin'
  status: text("status").notNull().default('active'), // 'active', 'inactive', 'suspended'
  emailVerified: boolean("email_verified").default(false),
  authProvider: text("auth_provider").default('local'), // 'local', 'replit', 'google', 'github'
  replitSub: varchar("replit_sub").unique(), // OIDC subject ID for linking accounts
  // Replit Auth fields
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client Profiles - Business information for clients
export const clientProfiles = pgTable("client_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name"),
  industry: text("industry"),
  companySize: text("company_size"), // 'small', 'medium', 'large', 'enterprise'
  website: text("website"),
  description: text("description"),
  location: text("location"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Consultant Profiles - Service provider information
export const consultantProfiles = pgTable("consultant_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  title: text("title"), // e.g., "Senior Full-Stack Developer"
  bio: text("bio"),
  skills: text("skills").array(), // Array of skill tags
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  experience: text("experience"), // 'junior', 'mid', 'senior', 'expert'
  portfolio: jsonb("portfolio"), // Array of portfolio items with title, description, url, images
  certifications: text("certifications").array(),
  languages: text("languages").array(),
  availability: text("availability").default('available'), // 'available', 'busy', 'unavailable'
  weeklySchedule: jsonb("weekly_schedule"), // Weekly availability: { "monday": ["morning", "afternoon", "evening"], ... }
  servicePackages: jsonb("service_packages"), // Array of service package offerings with name, description, price, deliveryTime
  location: text("location"),
  timezone: text("timezone"),
  avatar: text("avatar"),
  verified: boolean("verified").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('0'),
  totalReviews: integer("total_reviews").default(0),
  completedProjects: integer("completed_projects").default(0),
  responseTime: integer("response_time"), // in minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin Roles - For RBAC system
export const adminRoles = pgTable("admin_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // REQUIRED - no default to prevent privilege escalation. Values: 'super_admin', 'moderator', 'support', 'finance', 'analyst', 'category_manager'
  permissions: jsonb("permissions"), // JSON object with permission flags
  customPermissions: text("custom_permissions").array(), // Array of custom permission strings
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin Activity Logs - Track all admin actions
export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'user_suspended', 'category_created', 'payment_released', etc.
  targetType: text("target_type"), // 'user', 'category', 'payment', 'dispute', etc.
  targetId: varchar("target_id"),
  details: jsonb("details"), // Additional action context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  adminIdIdx: index("admin_activity_logs_admin_id_idx").on(table.adminId),
  actionIdx: index("admin_activity_logs_action_idx").on(table.action),
}));

// Categories - IT service categories with custom fields
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  nameAr: text("name_ar"), // Arabic translation
  slug: text("slug").notNull().unique(),
  description: text("description"),
  descriptionAr: text("description_ar"), // Arabic translation
  icon: text("icon"), // lucide-react icon name
  image: text("image"), // Category image URL
  parentId: varchar("parent_id").references((): any => categories.id, { onDelete: "set null" }), // Self-reference for subcategories
  customFields: jsonb("custom_fields"), // Array of field definitions for category forms
  requirementApprovalRequired: boolean("requirement_approval_required").default(false),
  bidLimit: integer("bid_limit"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }), // % commission in SAR
  minBudget: decimal("min_budget", { precision: 10, scale: 2 }), // Minimum budget in SAR
  maxBudget: decimal("max_budget", { precision: 10, scale: 2 }), // Maximum budget in SAR
  defaultDuration: text("default_duration"), // Default project duration
  autoCloseDays: integer("auto_close_days"), // Auto-close requirements after X days
  featured: boolean("featured").default(false),
  displayOrder: integer("display_order").default(0),
  active: boolean("active").default(true),
  visible: boolean("visible").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  parentIdIdx: index("categories_parent_id_idx").on(table.parentId),
  activeIdx: index("categories_active_idx").on(table.active),
}));

// Vendor Category Requests - Vendors requesting access to categories
export const vendorCategoryRequests = pgTable("vendor_category_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'rejected'
  credentials: jsonb("credentials"), // Uploaded documents, certifications, portfolio, etc.
  yearsOfExperience: integer("years_of_experience"),
  reasonForRequest: text("reason_for_request"),
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  expiresAt: timestamp("expires_at"), // Category access expiry for re-verification
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  vendorIdIdx: index("vendor_category_requests_vendor_id_idx").on(table.vendorId),
  categoryIdIdx: index("vendor_category_requests_category_id_idx").on(table.categoryId),
  statusIdx: index("vendor_category_requests_status_idx").on(table.status),
  // Prevent duplicate pending requests for same vendor+category
  uniquePendingRequest: uniqueIndex("unique_vendor_category_pending").on(table.vendorId, table.categoryId, table.status),
}));

// Jobs/Requirements - What clients post
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => categories.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"), // Detailed requirements
  skills: text("skills").array(),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  budgetType: text("budget_type"), // 'fixed', 'hourly', 'negotiable'
  duration: text("duration"), // 'short', 'medium', 'long'
  experienceLevel: text("experience_level"), // 'junior', 'mid', 'senior', 'expert'
  attachments: text("attachments").array(), // File URLs
  status: text("status").notNull().default('open'), // 'draft', 'open', 'in_progress', 'completed', 'cancelled'
  expiresAt: timestamp("expires_at"),
  viewCount: integer("view_count").default(0),
  bidCount: integer("bid_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index("jobs_client_id_idx").on(table.clientId),
  statusIdx: index("jobs_status_idx").on(table.status),
  categoryIdIdx: index("jobs_category_id_idx").on(table.categoryId),
}));

// Bids - Proposals from consultants
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  consultantId: varchar("consultant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coverLetter: text("cover_letter").notNull(),
  proposedBudget: decimal("proposed_budget", { precision: 10, scale: 2 }).notNull(),
  proposedDuration: text("proposed_duration"), // e.g., "2 weeks", "1 month"
  milestones: jsonb("milestones"), // Array of milestone objects
  attachments: text("attachments").array(),
  status: text("status").notNull().default('pending'), // 'pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn'
  clientViewed: boolean("client_viewed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  jobIdIdx: index("bids_job_id_idx").on(table.jobId),
  consultantIdIdx: index("bids_consultant_id_idx").on(table.consultantId),
  statusIdx: index("bids_status_idx").on(table.status),
}));

// Projects - Active work between client and consultant
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  bidId: varchar("bid_id").notNull().references(() => bids.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  consultantId: varchar("consultant_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('not_started'), // 'not_started', 'in_progress', 'paused', 'completed', 'cancelled', 'disputed'
  milestones: jsonb("milestones"), // Array with title, amount, status, dueDate
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index("projects_client_id_idx").on(table.clientId),
  consultantIdIdx: index("projects_consultant_id_idx").on(table.consultantId),
  statusIdx: index("projects_status_idx").on(table.status),
}));

// Messages - Chat between users
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id), // Optional, if message is project-related
  content: text("content").notNull(),
  attachments: text("attachments").array(),
  read: boolean("read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payments - Transaction records
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default('SAR'),
  type: text("type").notNull(), // 'deposit', 'release', 'refund', 'withdrawal'
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed', 'refunded'
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reviews - Feedback after project completion
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  categories: jsonb("categories"), // { communication: 5, quality: 4, timeliness: 5 }
  helpful: integer("helpful").default(0), // How many found this review helpful
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications - System and user notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'bid_received', 'bid_accepted', 'message', 'payment', 'review', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // URL to navigate to
  read: boolean("read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Saved Items - Bookmarks for jobs or consultants
export const savedItems = pgTable("saved_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // 'job', 'consultant'
  itemId: varchar("item_id").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Disputes - Conflict resolution
export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  raisedBy: varchar("raised_by").notNull().references(() => users.id),
  against: varchar("against").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence").array(), // File URLs
  status: text("status").notNull().default('open'), // 'open', 'under_review', 'resolved', 'closed'
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// ZOD SCHEMAS & TYPES
// =============================================================================

// Users
// For local registration - strict validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  authProvider: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['client', 'consultant', 'both', 'admin']),
});

// For Replit Auth upsert - flexible validation
export const upsertUserSchema = createInsertSchema(users).partial().extend({
  id: z.string(),
  email: z.string().email().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

// Client Profiles
export const insertClientProfileSchema = createInsertSchema(clientProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientProfile = z.infer<typeof insertClientProfileSchema>;
export type ClientProfile = typeof clientProfiles.$inferSelect;

// Consultant Profiles
export const insertConsultantProfileSchema = createInsertSchema(consultantProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fullName: z.string().min(1, "Full name is required"),
  hourlyRate: z.string().optional(),
});

export type InsertConsultantProfile = z.infer<typeof insertConsultantProfileSchema>;
export type ConsultantProfile = typeof consultantProfiles.$inferSelect;

// Categories
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Jobs
export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  viewCount: true,
  bidCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// Bids
export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  clientViewed: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  coverLetter: z.string().min(100, "Cover letter must be at least 100 characters"),
  proposedBudget: z.string().min(1, "Budget is required"),
});

export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;

// Projects
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Messages
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  read: true,
  readAt: true,
  createdAt: true,
}).extend({
  content: z.string().min(1, "Message cannot be empty"),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Payments
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Reviews
export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  helpful: true,
  createdAt: true,
}).extend({
  rating: z.number().min(1).max(5, "Rating must be between 1 and 5"),
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Notifications
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  readAt: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Saved Items
export const insertSavedItemSchema = createInsertSchema(savedItems).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;
export type SavedItem = typeof savedItems.$inferSelect;

// Disputes
export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

// Admin Roles
export const insertAdminRoleSchema = createInsertSchema(adminRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(['super_admin', 'moderator', 'support', 'finance', 'analyst', 'category_manager']),
});

export type InsertAdminRole = z.infer<typeof insertAdminRoleSchema>;
export type AdminRole = typeof adminRoles.$inferSelect;

// Admin Activity Logs
export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;
export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;

// Vendor Category Requests
export const insertVendorCategoryRequestSchema = createInsertSchema(vendorCategoryRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export type InsertVendorCategoryRequest = z.infer<typeof insertVendorCategoryRequestSchema>;
export type VendorCategoryRequest = typeof vendorCategoryRequests.$inferSelect;
