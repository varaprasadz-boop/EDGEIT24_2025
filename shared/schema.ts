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
  emailVerificationToken: varchar("email_verification_token"),
  emailTokenExpiry: timestamp("email_token_expiry"),
  emailVerifiedAt: timestamp("email_verified_at"),
  authProvider: text("auth_provider").default('local'), // 'local', 'replit', 'google', 'github'
  replitSub: varchar("replit_sub").unique(), // OIDC subject ID for linking accounts
  // Basic registration fields
  fullName: text("full_name"),
  country: varchar("country"), // ISO country code (SA, AE, etc.)
  phoneCountryCode: varchar("phone_country_code"), // +966, +971, etc.
  phone: varchar("phone"),
  companyName: text("company_name"),
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
  companySize: text("company_size"), // '1-10', '11-50', '51-200', '201-500', '500+'
  region: text("region"),
  businessType: text("business_type"), // 'individual', 'company', 'enterprise'
  website: text("website"),
  description: text("description"),
  location: text("location"),
  avatar: text("avatar"),
  logo: text("logo"), // Company logo URL
  socialLinks: jsonb("social_links"), // { linkedin, twitter, facebook, etc. }
  // Profile approval fields
  profileStatus: text("profile_status").default('draft'), // 'draft', 'submitted', 'under_review', 'complete'
  approvalStatus: text("approval_status").default('pending'), // 'pending', 'approved', 'rejected', 'changes_requested'
  uniqueClientId: varchar("unique_client_id").unique(), // CLT-YYYY-XXXX
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
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
  certifications: text("certifications").array(), // Array of certification names
  languages: text("languages").array(), // Array of languages (enhanced proficiency tracking is future enhancement)
  operatingRegions: text("operating_regions").array(), // Countries/regions where consultant operates
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
  // Additional business fields
  yearEstablished: integer("year_established"),
  employeeCount: text("employee_count"), // '1-10', '11-50', '51-200', '201+'
  website: text("website"),
  socialLinks: jsonb("social_links"), // { linkedin, twitter, github, etc. }
  businessRegistrationNumber: varchar("business_registration_number"),
  // KYC, Education, and Banking information
  kycDocuments: jsonb("kyc_documents"), // { idType, idNumber, validity, documentUrl }
  education: jsonb("education"), // [{ degree, institution, field, startDate, endDate }]
  bankInfo: jsonb("bank_info"), // { bankName, accountHolder, iban, swift, currency }
  // Profile approval fields
  profileStatus: text("profile_status").default('draft'), // 'draft', 'submitted', 'under_review', 'complete'
  approvalStatus: text("approval_status").default('pending'), // 'pending', 'approved', 'rejected', 'changes_requested'
  uniqueConsultantId: varchar("unique_consultant_id").unique(), // CNS-YYYY-XXXX
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Consultant Categories - Junction table for consultant service offerings
// NOTE: One primary service per consultant is enforced at application level via transactional validation
export const consultantCategories = pgTable("consultant_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consultantProfileId: varchar("consultant_profile_id").notNull().references(() => consultantProfiles.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").default(false), // One primary service per consultant (enforced in API)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  consultantIdIdx: index("consultant_categories_consultant_id_idx").on(table.consultantProfileId),
  categoryIdIdx: index("consultant_categories_category_id_idx").on(table.categoryId),
  // Prevent duplicate category selections
  uniqueConsultantCategory: uniqueIndex("unique_consultant_category").on(table.consultantProfileId, table.categoryId),
}));

// KYC Documents - Store identity verification documents for users
export const kycDocuments = pgTable("kyc_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileType: text("profile_type").notNull(), // 'client' or 'consultant'
  idType: text("id_type"), // 'passport', 'national_id', 'driving_license'
  idNumber: varchar("id_number"),
  validityDate: timestamp("validity_date"),
  documentUrl: text("document_url"), // Mock upload URL placeholder
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("kyc_documents_user_id_idx").on(table.userId),
}));

// Education Records - Track educational background for consultants
export const educationRecords = pgTable("education_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consultantProfileId: varchar("consultant_profile_id").notNull().references(() => consultantProfiles.id, { onDelete: "cascade" }),
  degree: text("degree").notNull(), // Bachelor's, Master's, PhD, Certification
  institution: text("institution").notNull(),
  fieldOfStudy: text("field_of_study"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  stillStudying: boolean("still_studying").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  consultantProfileIdIdx: index("education_records_consultant_profile_id_idx").on(table.consultantProfileId),
}));

// Bank Information - Payment details for consultants to receive payments
export const bankInformation = pgTable("bank_information", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consultantProfileId: varchar("consultant_profile_id").notNull().unique().references(() => consultantProfiles.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountHolderName: text("account_holder_name").notNull(),
  accountNumber: varchar("account_number").notNull(), // Can store IBAN
  swiftCode: varchar("swift_code"),
  bankCountry: varchar("bank_country"),
  currency: varchar("currency").default('SAR'), // SAR, USD, EUR, etc.
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Profile Approval Events - Audit trail for all profile approval actions
export const profileApprovalEvents = pgTable("profile_approval_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileType: text("profile_type").notNull(), // 'client' or 'consultant'
  action: text("action").notNull(), // 'submitted', 'approved', 'rejected', 'changes_requested'
  performedBy: varchar("performed_by").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("profile_approval_events_user_id_idx").on(table.userId),
  actionIdx: index("profile_approval_events_action_idx").on(table.action),
}));

// Unique ID Counters - Track auto-incrementing counters for CLT and CNS IDs
export const uniqueIdCounters = pgTable("unique_id_counters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prefix: varchar("prefix").notNull().unique(), // 'CLT' or 'CNS'
  year: integer("year").notNull(),
  counter: integer("counter").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  prefixYearIdx: uniqueIndex("unique_id_counters_prefix_year").on(table.prefix, table.year),
}));

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
  heroTitle: text("hero_title"), // Landing page hero title
  heroTitleAr: text("hero_title_ar"), // Arabic hero title
  heroDescription: text("hero_description"), // Landing page hero description
  heroDescriptionAr: text("hero_description_ar"), // Arabic hero description
  icon: text("icon"), // lucide-react icon name
  image: text("image"), // Category image URL
  parentId: varchar("parent_id").references((): any => categories.id, { onDelete: "set null" }), // Self-reference for subcategories
  level: integer("level").notNull().default(0), // 0 = root, 1 = subcategory, 2 = super-subcategory (max depth = 2)
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
  levelIdx: index("categories_level_idx").on(table.level),
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
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"), // Detailed requirements
  skills: text("skills").array(),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  budgetType: text("budget_type"), // 'fixed', 'hourly', 'negotiable'
  duration: text("duration"), // 'short', 'medium', 'long'
  experienceLevel: text("experience_level"), // 'junior', 'mid', 'senior', 'expert'
  attachments: text("attachments").array(), // File URLs
  status: text("status").notNull().default('open'), // 'draft', 'open', 'inProgress', 'completed', 'cancelled'
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

export const jobStatusEnum = z.enum(['draft', 'open', 'inProgress', 'completed', 'cancelled']);
export const JOB_STATUSES = jobStatusEnum.options;
export type JobStatus = z.infer<typeof jobStatusEnum>;

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

export const bidStatusEnum = z.enum(['pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn']);
export const BID_STATUSES = bidStatusEnum.options;
export type BidStatus = z.infer<typeof bidStatusEnum>;

// Payment enums
export const paymentStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']);
export const PAYMENT_STATUSES = paymentStatusEnum.options;
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

export const paymentTypeEnum = z.enum(['deposit', 'release', 'refund', 'withdrawal']);
export const PAYMENT_TYPES = paymentTypeEnum.options;
export type PaymentType = z.infer<typeof paymentTypeEnum>;

// Project status enum
export const projectStatusEnum = z.enum(['not_started', 'in_progress', 'paused', 'completed', 'cancelled', 'disputed']);
export const PROJECT_STATUSES = projectStatusEnum.options;
export type ProjectStatus = z.infer<typeof projectStatusEnum>;

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

// Subscription Plans - Engagement models for clients and consultants
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Basic", "Advanced", "Pro"
  nameAr: text("name_ar"), // Arabic translation
  audience: text("audience").notNull(), // 'client', 'consultant', 'both'
  description: text("description"),
  descriptionAr: text("description_ar"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Monthly price in SAR
  currency: text("currency").default('SAR'),
  billingCycle: text("billing_cycle").default('monthly'), // 'monthly', 'quarterly', 'yearly'
  features: jsonb("features"), // JSON object: { projectsPerMonth: 3, bidsPerProject: 10, vendorProfile: 'basic', support: 'email', analytics: false, milestones: false }
  limits: jsonb("limits"), // JSON object with plan-specific limits
  supportLevel: text("support_level"), // 'email', 'priority', '24/7'
  analyticsAccess: boolean("analytics_access").default(false),
  apiAccess: boolean("api_access").default(false),
  whiteLabel: boolean("white_label").default(false),
  customIntegrations: boolean("custom_integrations").default(false),
  dedicatedAccountManager: boolean("dedicated_account_manager").default(false),
  slaGuarantee: boolean("sla_guarantee").default(false),
  status: text("status").default('active'), // 'active', 'inactive', 'archived'
  featured: boolean("featured").default(false),
  popular: boolean("popular").default(false), // Mark as "Most Popular"
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  audienceIdx: index("subscription_plans_audience_idx").on(table.audience),
  statusIdx: index("subscription_plans_status_idx").on(table.status),
}));

// User Subscriptions - Track active subscriptions for users
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  status: text("status").default('active'), // 'active', 'cancelled', 'expired', 'suspended'
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  renewalDate: timestamp("renewal_date"),
  autoRenew: boolean("auto_renew").default(true),
  paymentMethod: text("payment_method"), // 'card', 'bank_transfer', 'invoice'
  lastPaymentId: varchar("last_payment_id"), // Reference to last payment transaction
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_subscriptions_user_id_idx").on(table.userId),
  planIdIdx: index("user_subscriptions_plan_id_idx").on(table.planId),
  statusIdx: index("user_subscriptions_status_idx").on(table.status),
}));

// Platform Settings - Global configuration
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // 'platform_fee_percentage', 'brand_name', 'support_email', etc.
  value: text("value"),
  dataType: text("data_type").default('string'), // 'string', 'number', 'boolean', 'json'
  category: text("category"), // 'general', 'finance', 'branding', 'smtp', 'features'
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Email Templates - Predefined email templates for various triggers
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trigger: text("trigger").notNull().unique(), // 'registration', 'email_verification', 'password_reset', 'bid_received', 'payment_completed', etc.
  audience: text("audience").notNull(), // 'client', 'consultant', 'both', 'admin'
  subject: text("subject").notNull(),
  subjectAr: text("subject_ar"), // Arabic subject
  body: text("body").notNull(), // HTML body with variables like {{userName}}, {{projectTitle}}, etc.
  bodyAr: text("body_ar"), // Arabic body
  variables: text("variables").array(), // List of available variables
  active: boolean("active").default(true),
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
  firstName: true,
  lastName: true,
  profileImageUrl: true,
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['client', 'consultant', 'both', 'admin']),
  status: z.string().optional(),
  emailVerified: z.boolean().optional(),
  authProvider: z.enum(['local', 'replit', 'google', 'github']).optional(),
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
}).extend({
  profileStatus: z.string().optional(),
  approvalStatus: z.string().optional(),
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
  verified: z.boolean().optional(),
  profileStatus: z.string().optional(),
  approvalStatus: z.string().optional(),
  availability: z.string().optional(),
  rating: z.string().optional(),
  totalReviews: z.number().optional(),
  completedProjects: z.number().optional(),
});

export type InsertConsultantProfile = z.infer<typeof insertConsultantProfileSchema>;
export type ConsultantProfile = typeof consultantProfiles.$inferSelect;

// Consultant Categories
export const insertConsultantCategorySchema = createInsertSchema(consultantCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertConsultantCategory = z.infer<typeof insertConsultantCategorySchema>;
export type ConsultantCategory = typeof consultantCategories.$inferSelect;

// Categories
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
}).extend({
  level: z.number().min(0).max(2).default(0), // Enforce 3-level hierarchy (0, 1, 2)
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

// Subscription Plans
export const subscriptionPlanAudienceEnum = z.enum(['client', 'consultant', 'both']);
export const SUBSCRIPTION_PLAN_AUDIENCES = subscriptionPlanAudienceEnum.options;
export type SubscriptionPlanAudience = z.infer<typeof subscriptionPlanAudienceEnum>;

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Plan name is required"),
  audience: subscriptionPlanAudienceEnum,
  price: z.string().min(0, "Price must be positive"),
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// User Subscriptions
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

// Platform Settings
export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  key: z.string().min(1, "Setting key is required"),
});

export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;

// Email Templates
export const emailTemplateAudienceEnum = z.enum(['client', 'consultant', 'both', 'admin']);
export const EMAIL_TEMPLATE_AUDIENCES = emailTemplateAudienceEnum.options;
export type EmailTemplateAudience = z.infer<typeof emailTemplateAudienceEnum>;

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  trigger: z.string().min(1, "Trigger is required"),
  audience: emailTemplateAudienceEnum,
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// KYC Documents
export const insertKycDocumentSchema = createInsertSchema(kycDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKycDocument = z.infer<typeof insertKycDocumentSchema>;
export type KycDocument = typeof kycDocuments.$inferSelect;

// Education Records
export const insertEducationRecordSchema = createInsertSchema(educationRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEducationRecord = z.infer<typeof insertEducationRecordSchema>;
export type EducationRecord = typeof educationRecords.$inferSelect;

// Bank Information
export const insertBankInformationSchema = createInsertSchema(bankInformation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBankInformation = z.infer<typeof insertBankInformationSchema>;
export type BankInformation = typeof bankInformation.$inferSelect;

// Profile Approval Events
export const insertProfileApprovalEventSchema = createInsertSchema(profileApprovalEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertProfileApprovalEvent = z.infer<typeof insertProfileApprovalEventSchema>;
export type ProfileApprovalEvent = typeof profileApprovalEvents.$inferSelect;

// Unique ID Counters
export const insertUniqueIdCounterSchema = createInsertSchema(uniqueIdCounters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUniqueIdCounter = z.infer<typeof insertUniqueIdCounterSchema>;
export type UniqueIdCounter = typeof uniqueIdCounters.$inferSelect;
