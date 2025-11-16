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
  phoneVerified: boolean("phone_verified").default(false),
  phoneVerificationToken: varchar("phone_verification_token"),
  phoneTokenExpiry: timestamp("phone_token_expiry"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  // Password reset fields
  passwordResetToken: varchar("password_reset_token"),
  passwordResetTokenExpiry: timestamp("password_reset_token_expiry"),
  // Terms of Service acceptance
  termsAccepted: boolean("terms_accepted").default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  authProvider: text("auth_provider").default('local'), // 'local', 'replit', 'google', 'github'
  replitSub: varchar("replit_sub").unique(), // OIDC subject ID for linking accounts
  // Engagement plan and payment tracking
  engagementPlan: text("engagement_plan").notNull().default('basic'), // 'basic', 'professional', 'enterprise'
  paymentStatus: text("payment_status").default('not_required'), // 'not_required', 'pending', 'succeeded', 'failed'
  paymentReference: varchar("payment_reference"), // Transaction ID for audit trail
  paymentCompletedAt: timestamp("payment_completed_at"),
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
  // Company contact information (pre-filled from registration, editable)
  contactEmail: text("contact_email"), // Company/business contact email
  contactPhone: text("contact_phone"), // Company/business contact phone
  phoneCountryCode: text("phone_country_code"), // +966, +971, etc.
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
  languages: jsonb("languages"), // Array of { language: string, proficiency: 'basic' | 'intermediate' | 'advanced' | 'native' }
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

// Pricing Templates - Reusable pricing structures for consultants
export const pricingTemplates = pgTable("pricing_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consultantProfileId: varchar("consultant_profile_id").notNull().references(() => consultantProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Basic Website Development", "Mobile App - Standard"
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default('SAR'),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  estimatedHours: integer("estimated_hours"),
  priceBreakdown: jsonb("price_breakdown"), // [{ item: 'Design', cost: 500 }, ...]
  volumeTiers: jsonb("volume_tiers"), // [{ minQty: 1, maxQty: 5, pricePerUnit: 100 }, ...]
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  consultantProfileIdIdx: index("pricing_templates_consultant_profile_id_idx").on(table.consultantProfileId),
}));

export const insertPricingTemplateSchema = createInsertSchema(pricingTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Template name is required"),
  basePrice: z.string().min(1, "Base price is required"),
});

export type InsertPricingTemplate = z.infer<typeof insertPricingTemplateSchema>;
export type PricingTemplate = typeof pricingTemplates.$inferSelect;

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

// Quote Requests - Client requests for quotes from consultants' service packages
export const quoteRequests = pgTable("quote_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consultantId: varchar("consultant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  packageName: text("package_name").notNull(), // Name of the service package
  projectDescription: text("project_description").notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'responded', 'declined'
  consultantResponse: text("consultant_response"), // Consultant's quote response
  quotedAmount: decimal("quoted_amount", { precision: 10, scale: 2 }), // Consultant's quoted price
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index("quote_requests_client_id_idx").on(table.clientId),
  consultantIdIdx: index("quote_requests_consultant_id_idx").on(table.consultantId),
  statusIdx: index("quote_requests_status_idx").on(table.status),
}));

export const quoteStatusEnum = z.enum(['pending', 'responded', 'declined']);
export const QUOTE_STATUSES = quoteStatusEnum.options;
export type QuoteStatus = z.infer<typeof quoteStatusEnum>;

export type QuoteRequest = typeof quoteRequests.$inferSelect;
export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;

// Language Proficiency
export const languageProficiencyEnum = z.enum(['basic', 'intermediate', 'advanced', 'native']);
export const LANGUAGE_PROFICIENCIES = languageProficiencyEnum.options;
export type LanguageProficiency = z.infer<typeof languageProficiencyEnum>;

export const languageSchema = z.object({
  language: z.string().min(1, "Language name is required"),
  proficiency: languageProficiencyEnum,
});

export type Language = z.infer<typeof languageSchema>;

// Engagement Plans and Registration Payment Status
export const engagementPlanEnum = z.enum(['basic', 'professional', 'enterprise']);
export const ENGAGEMENT_PLANS = engagementPlanEnum.options;
export type EngagementPlan = z.infer<typeof engagementPlanEnum>;

export const registrationPaymentStatusEnum = z.enum(['not_required', 'pending', 'succeeded', 'failed']);
export const REGISTRATION_PAYMENT_STATUSES = registrationPaymentStatusEnum.options;
export type RegistrationPaymentStatus = z.infer<typeof registrationPaymentStatusEnum>;

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
// Supports messaging notifications via type='new_message', 'message_reply', 'meeting_scheduled', etc.
// relatedConversationId and relatedMessageId provide direct FK links for messaging notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'bid_received', 'bid_accepted', 'new_message', 'message_reply', 'meeting_scheduled', 'payment', 'review', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // URL to navigate to
  metadata: jsonb("metadata"), // Additional context (e.g., { senderId, meetingId })
  relatedConversationId: varchar("related_conversation_id").references(() => conversations.id, { onDelete: "cascade" }), // FK for messaging notifications
  relatedMessageId: varchar("related_message_id").references(() => messages.id, { onDelete: "cascade" }), // FK for message-specific notifications
  read: boolean("read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  typeIdx: index("notifications_type_idx").on(table.type),
  readIdx: index("notifications_read_idx").on(table.read),
  userUnreadIdx: index("notifications_user_unread_idx").on(table.userId, table.read),
  conversationIdx: index("notifications_conversation_idx").on(table.relatedConversationId), // For messaging analytics
  messageIdx: index("notifications_message_idx").on(table.relatedMessageId), // For message-specific queries
}));

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

// Payment Sessions - Track checkout sessions for security
export const paymentSessions = pgTable("payment_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  sessionId: varchar("session_id").notNull().unique(),
  planPrice: text("plan_price").notNull(), // Store plan price at session creation to prevent price manipulation
  planName: text("plan_name").notNull(), // Store plan name for verification
  status: varchar("status").notNull().default('pending'), // pending, completed, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

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

// CMS - Content Pages (Terms, Privacy, About, etc.)
export const contentPages = pgTable("content_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(), // 'terms-client', 'terms-consultant', 'privacy-policy', 'about-us'
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  content: text("content").notNull(), // Rich text content (HTML)
  contentAr: text("content_ar"),
  pageType: text("page_type").notNull(), // 'legal', 'company', 'support'
  status: text("status").notNull().default('draft'), // 'draft', 'published', 'archived'
  metaTitle: text("meta_title"),
  metaTitleAr: text("meta_title_ar"),
  metaDescription: text("meta_description"),
  metaDescriptionAr: text("meta_description_ar"),
  displayOrder: integer("display_order").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("content_pages_slug_idx").on(table.slug),
  pageTypeIdx: index("content_pages_page_type_idx").on(table.pageType),
  statusIdx: index("content_pages_status_idx").on(table.status),
}));

// CMS - Footer Links
export const footerLinks = pgTable("footer_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  labelAr: text("label_ar"),
  url: text("url").notNull(),
  section: text("section").notNull(), // 'company', 'legal', 'support'
  displayOrder: integer("display_order").default(0),
  isExternal: boolean("is_external").default(false),
  openInNewTab: boolean("open_in_new_tab").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  sectionIdx: index("footer_links_section_idx").on(table.section),
  activeIdx: index("footer_links_active_idx").on(table.active),
  orderIdx: index("footer_links_order_idx").on(table.displayOrder),
}));

// CMS - Home Page Sections (Hero, Features, Testimonials, etc.)
export const homePageSections = pgTable("home_page_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionType: text("section_type").notNull(), // 'hero', 'features', 'testimonials', 'stats', 'cta'
  title: text("title"),
  titleAr: text("title_ar"),
  subtitle: text("subtitle"),
  subtitleAr: text("subtitle_ar"),
  content: text("content"), // Rich text or JSON content
  contentAr: text("content_ar"),
  imageUrl: text("image_url"),
  ctaText: text("cta_text"),
  ctaTextAr: text("cta_text_ar"),
  ctaLink: text("cta_link"),
  displayOrder: integer("display_order").default(0),
  active: boolean("active").default(true),
  settings: jsonb("settings"), // Additional settings as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("home_page_sections_type_idx").on(table.sectionType),
  activeIdx: index("home_page_sections_active_idx").on(table.active),
  orderIdx: index("home_page_sections_order_idx").on(table.displayOrder),
}));

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
// MESSAGING & COLLABORATION SYSTEM
// =============================================================================
// Comprehensive messaging system supporting:
// - One-on-one and group conversations
// - Real-time message delivery with WebSocket support
// - File attachments with version tracking
// - Message threading and replies
// - Read receipts and delivery tracking
// - Message templates for quick replies
// - Meeting scheduling and management
// - Conversation labels and organization
// - Admin moderation capabilities
//
// DESIGN DECISIONS:
// - conversation_preferences: Consolidated into conversation_participants (muted, pinned fields)
// - conversation_pins: Merged into conversation_participants.pinned field
// - file_versions: Implemented in message_files (parentFileId, versionNumber for version tracking)
// - notifications: Uses existing notifications table with enhanced metadata field for messaging context
// =============================================================================

// Conversations - Main conversation container between participants
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title"), // Optional conversation title
  type: text("type").notNull().default('direct'), // 'direct' for 1-on-1, 'group' for future expansion
  relatedEntityType: text("related_entity_type"), // 'job', 'bid', 'contract', 'quick_quote'
  relatedEntityId: varchar("related_entity_id"), // ID of the related entity
  archived: boolean("archived").default(false),
  archivedBy: varchar("archived_by").references(() => users.id),
  archivedAt: timestamp("archived_at"),
  lastMessageAt: timestamp("last_message_at"), // For sorting conversations
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  lastMessageIdx: index("conversations_last_message_idx").on(table.lastMessageAt),
  archivedIdx: index("conversations_archived_idx").on(table.archived),
  relatedEntityIdx: index("conversations_related_entity_idx").on(table.relatedEntityType, table.relatedEntityId),
}));

// Conversation Participants - Who is part of each conversation
// Consolidates conversation_preferences (muted, pinned) and access control (role)
export const conversationParticipants = pgTable("conversation_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default('participant'), // 'participant', 'admin' - REQUIRED for RBAC
  status: text("status").notNull().default('active'), // 'active', 'left', 'removed' - For access control
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadAt: timestamp("last_read_at"), // Track when user last read messages
  unreadCount: integer("unread_count").default(0).notNull(), // Cached unread count for performance
  muted: boolean("muted").default(false).notNull(), // Mute notifications for this conversation
  pinned: boolean("pinned").default(false).notNull(), // Pin conversation to top
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  conversationUserIdx: uniqueIndex("conversation_participants_conversation_user_idx").on(table.conversationId, table.userId),
  userIdIdx: index("conversation_participants_user_id_idx").on(table.userId),
  pinnedIdx: index("conversation_participants_pinned_idx").on(table.pinned),
  unreadIdx: index("conversation_participants_unread_idx").on(table.userId, table.unreadCount), // For inbox unread queries
  roleStatusIdx: index("conversation_participants_role_status_idx").on(table.role, table.status), // For RBAC queries
}));

// Messages - Individual messages within conversations
// NOTE: Uses RESTRICT on conversation deletion to preserve audit trail
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "restrict" }), // RESTRICT for audit retention
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // Message text content
  messageType: text("message_type").notNull().default('text'), // 'text', 'file', 'meeting', 'system'
  metadata: jsonb("metadata"), // For file info, meeting details, etc.
  replyToId: varchar("reply_to_id").references(() => messages.id), // For threaded messages
  edited: boolean("edited").default(false),
  editedAt: timestamp("edited_at"),
  deleted: boolean("deleted").default(false), // Soft delete
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  conversationCreatedIdx: index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
  senderIdx: index("messages_sender_idx").on(table.senderId),
  deletedIdx: index("messages_deleted_idx").on(table.deleted),
  replyToIdx: index("messages_reply_to_idx").on(table.replyToId), // Index for thread queries
  // Full-text search index for message content
  contentSearchIdx: index("messages_content_search_idx").using("gin", sql`to_tsvector('english', ${table.content})`),
}));

// Message Receipts - Track read/delivered status for each participant
export const messageReceipts = pgTable("message_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  messageUserIdx: uniqueIndex("message_receipts_message_user_idx").on(table.messageId, table.userId),
  userUnreadIdx: index("message_receipts_user_unread_idx").on(table.userId, table.readAt),
  unreadLookupsIdx: index("message_receipts_unread_lookups_idx").on(table.messageId, table.userId, table.readAt), // Composite for unread queries
}));

// Message Templates - Quick reply templates for users
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // Template name/title
  content: text("content").notNull(), // Template message content
  category: text("category"), // For organizing templates
  usageCount: integer("usage_count").default(0), // Track how often used
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("message_templates_user_id_idx").on(table.userId),
  categoryIdx: index("message_templates_category_idx").on(table.category),
}));

// Message Files - File attachments in messages with version tracking
// NOTE: parentFileId uses SET NULL to preserve version history when parent is deleted
export const messageFiles = pgTable("message_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "restrict" }), // RESTRICT for audit
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // In bytes
  mimeType: text("mime_type").notNull(),
  fileUrl: text("file_url").notNull(), // Storage URL
  thumbnailUrl: text("thumbnail_url"), // For image/document previews
  versionNumber: integer("version_number").default(1).notNull(),
  parentFileId: varchar("parent_file_id").references(() => messageFiles.id, { onDelete: "set null" }), // SET NULL to preserve history
  scanStatus: text("scan_status").default('pending'), // 'pending', 'clean', 'infected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  messageIdIdx: index("message_files_message_id_idx").on(table.messageId),
  conversationIdIdx: index("message_files_conversation_id_idx").on(table.conversationId),
  parentFileIdx: index("message_files_parent_file_idx").on(table.parentFileId),
  versionHistoryIdx: index("message_files_version_history_idx").on(table.parentFileId, table.versionNumber), // For version tracking
}));

// Meeting Links - Scheduled meetings within conversations
export const meetingLinks = pgTable("meeting_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  messageId: varchar("message_id").references(() => messages.id), // Associated message
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(), // Meeting date/time
  duration: integer("duration"), // In minutes
  meetingType: text("meeting_type").notNull(), // 'google_meet', 'zoom', 'teams', 'other'
  meetingUrl: text("meeting_url").notNull(), // The actual meeting link
  status: text("status").notNull().default('scheduled'), // 'scheduled', 'completed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("meeting_links_conversation_id_idx").on(table.conversationId),
  scheduledAtIdx: index("meeting_links_scheduled_at_idx").on(table.scheduledAt),
  statusIdx: index("meeting_links_status_idx").on(table.status),
}));

// Meeting Participants - Track who is invited to meetings
export const meetingParticipants = pgTable("meeting_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetingLinks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  responseStatus: text("response_status").default('pending'), // 'pending', 'accepted', 'declined', 'tentative'
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  meetingUserIdx: uniqueIndex("meeting_participants_meeting_user_idx").on(table.meetingId, table.userId),
  userIdIdx: index("meeting_participants_user_id_idx").on(table.userId),
}));

// Meeting Reminders - Track reminders sent for meetings
export const meetingReminders = pgTable("meeting_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetingLinks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reminderType: text("reminder_type").notNull(), // '1_hour', '15_min', '1_day', 'custom'
  reminderTime: timestamp("reminder_time").notNull(),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  meetingUserIdx: index("meeting_reminders_meeting_user_idx").on(table.meetingId, table.userId),
  reminderTimeIdx: index("meeting_reminders_reminder_time_idx").on(table.reminderTime),
  sentIdx: index("meeting_reminders_sent_idx").on(table.sent),
}));

// Conversation Labels - Custom labels for organizing conversations
export const conversationLabels = pgTable("conversation_labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // 'important', 'follow_up', 'urgent', custom labels
  color: varchar("color"), // Hex color for visual distinction
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  conversationLabelIdx: uniqueIndex("conversation_labels_conversation_label_idx").on(table.conversationId, table.userId, table.label),
  userIdIdx: index("conversation_labels_user_id_idx").on(table.userId),
}));

// Message Moderation - Admin actions on messages
export const messageModeration = pgTable("message_moderation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  moderatedBy: varchar("moderated_by").notNull().references(() => users.id), // Admin user
  action: text("action").notNull(), // 'flagged', 'hidden', 'redacted', 'warned', 'cleared'
  reason: text("reason"),
  notes: text("notes"), // Admin notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  messageIdIdx: index("message_moderation_message_id_idx").on(table.messageId),
  moderatedByIdx: index("message_moderation_moderated_by_idx").on(table.moderatedBy),
  actionIdx: index("message_moderation_action_idx").on(table.action),
}));

// =============================================================================
// ADDITIONAL MESSAGING TABLES (Per architectural requirements)
// =============================================================================

// Conversation Preferences - Dedicated per-user conversation preferences
export const conversationPreferences = pgTable("conversation_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  soundEnabled: boolean("sound_enabled").default(true).notNull(),
  previewEnabled: boolean("preview_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userConversationIdx: uniqueIndex("conversation_preferences_user_conversation_idx").on(table.userId, table.conversationId),
  userIdIdx: index("conversation_preferences_user_id_idx").on(table.userId),
}));

// Conversation Pins - Track pinned conversations per user
export const conversationPins = pgTable("conversation_pins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  pinnedAt: timestamp("pinned_at").defaultNow().notNull(),
  displayOrder: integer("display_order").default(0), // For custom pin ordering
}, (table) => ({
  userConversationIdx: uniqueIndex("conversation_pins_user_conversation_idx").on(table.userId, table.conversationId),
  userOrderIdx: index("conversation_pins_user_order_idx").on(table.userId, table.displayOrder),
}));

// File Versions - Dedicated file version history ledger
export const fileVersions = pgTable("file_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalFileId: varchar("original_file_id").notNull().references(() => messageFiles.id, { onDelete: "cascade" }),
  versionFileId: varchar("version_file_id").notNull().references(() => messageFiles.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  changeDescription: text("change_description"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  originalFileIdx: index("file_versions_original_file_idx").on(table.originalFileId),
  versionFileIdx: index("file_versions_version_file_idx").on(table.versionFileId),
  originalVersionIdx: index("file_versions_original_version_idx").on(table.originalFileId, table.versionNumber),
}));

// Rate Limits - Persistent rate limiting for API endpoints
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(), // API endpoint path
  requestCount: integer("request_count").default(0).notNull(),
  windowStart: timestamp("window_start").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  userEndpointUnique: uniqueIndex("rate_limits_user_endpoint_unique").on(table.userId, table.endpoint),
  expiresAtIdx: index("rate_limits_expires_at_idx").on(table.expiresAt),
}));

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
  engagementPlan: engagementPlanEnum, // Required during registration
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

// Payment Sessions
export const insertPaymentSessionSchema = createInsertSchema(paymentSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertPaymentSession = z.infer<typeof insertPaymentSessionSchema>;
export type PaymentSession = typeof paymentSessions.$inferSelect;

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

// Content Pages (CMS)
export const contentPageTypeEnum = z.enum(['legal', 'company', 'support']);
export const contentPageStatusEnum = z.enum(['draft', 'published', 'archived']);
export const CONTENT_PAGE_TYPES = contentPageTypeEnum.options;
export const CONTENT_PAGE_STATUSES = contentPageStatusEnum.options;

export const insertContentPageSchema = createInsertSchema(contentPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
}).extend({
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  pageType: contentPageTypeEnum,
  status: contentPageStatusEnum.default('draft'),
  displayOrder: z.coerce.number().int().optional(),
});

export type InsertContentPage = z.infer<typeof insertContentPageSchema>;
export type ContentPage = typeof contentPages.$inferSelect;

// Footer Links (CMS)
export const footerLinkSectionEnum = z.enum(['company', 'legal', 'support']);
export const FOOTER_LINK_SECTIONS = footerLinkSectionEnum.options;

export const insertFooterLinkSchema = createInsertSchema(footerLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  label: z.string().min(1, "Label is required"),
  url: z.string().min(1, "URL is required"),
  section: footerLinkSectionEnum,
  displayOrder: z.coerce.number().int().optional(),
});

export type InsertFooterLink = z.infer<typeof insertFooterLinkSchema>;
export type FooterLink = typeof footerLinks.$inferSelect;

// Home Page Sections (CMS)
export const homeSectionTypeEnum = z.enum(['hero', 'features', 'testimonials', 'stats', 'cta']);
export const HOME_SECTION_TYPES = homeSectionTypeEnum.options;

export const insertHomePageSectionSchema = createInsertSchema(homePageSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  sectionType: homeSectionTypeEnum,
  displayOrder: z.coerce.number().int().optional(),
});

export type InsertHomePageSection = z.infer<typeof insertHomePageSectionSchema>;
export type HomePageSection = typeof homePageSections.$inferSelect;

// =============================================================================
// MESSAGING & COLLABORATION SCHEMAS
// =============================================================================

// Conversations
export const conversationTypeEnum = z.enum(['direct', 'group']);
export const CONVERSATION_TYPES = conversationTypeEnum.options;

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastMessageAt: true,
}).extend({
  type: conversationTypeEnum.default('direct'),
  archived: z.boolean().optional(),
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Conversation Participants
export const participantRoleEnum = z.enum(['participant', 'admin']);

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({
  id: true,
  createdAt: true,
  joinedAt: true,
  lastReadAt: true,
  unreadCount: true,
}).extend({
  role: participantRoleEnum.optional(),
  muted: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;

// Messages
export const messageTypeEnum = z.enum(['text', 'file', 'meeting', 'system']);
export const MESSAGE_TYPES = messageTypeEnum.options;

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  edited: true,
  editedAt: true,
  deleted: true,
  deletedAt: true,
}).extend({
  content: z.string().min(1, "Message content is required"),
  messageType: messageTypeEnum.default('text'),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Message Receipts
export const insertMessageReceiptSchema = createInsertSchema(messageReceipts).omit({
  id: true,
  createdAt: true,
  deliveredAt: true,
  readAt: true,
});

export type InsertMessageReceipt = z.infer<typeof insertMessageReceiptSchema>;
export type MessageReceipt = typeof messageReceipts.$inferSelect;

// Message Templates
export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
}).extend({
  title: z.string().min(1, "Template title is required"),
  content: z.string().min(1, "Template content is required"),
});

export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;

// Message Files
export const fileScanStatusEnum = z.enum(['pending', 'clean', 'infected']);

export const insertMessageFileSchema = createInsertSchema(messageFiles).omit({
  id: true,
  createdAt: true,
  versionNumber: true,
  scanStatus: true,
}).extend({
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().int().positive("File size must be positive"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileUrl: z.string().url("Valid file URL is required"),
});

export type InsertMessageFile = z.infer<typeof insertMessageFileSchema>;
export type MessageFile = typeof messageFiles.$inferSelect;

// Meeting Links
export const meetingTypeEnum = z.enum(['google_meet', 'zoom', 'teams', 'other']);
export const meetingStatusEnum = z.enum(['scheduled', 'completed', 'cancelled']);
export const MEETING_TYPES = meetingTypeEnum.options;
export const MEETING_STATUSES = meetingStatusEnum.options;

export const insertMeetingLinkSchema = createInsertSchema(meetingLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Meeting title is required"),
  scheduledAt: z.date().or(z.string()),
  meetingType: meetingTypeEnum,
  meetingUrl: z.string().url("Valid meeting URL is required"),
  status: meetingStatusEnum.default('scheduled'),
});

export type InsertMeetingLink = z.infer<typeof insertMeetingLinkSchema>;
export type MeetingLink = typeof meetingLinks.$inferSelect;

// Meeting Participants
export const meetingResponseStatusEnum = z.enum(['pending', 'accepted', 'declined', 'tentative']);

export const insertMeetingParticipantSchema = createInsertSchema(meetingParticipants).omit({
  id: true,
  createdAt: true,
  joinedAt: true,
}).extend({
  responseStatus: meetingResponseStatusEnum.optional(),
});

export type InsertMeetingParticipant = z.infer<typeof insertMeetingParticipantSchema>;
export type MeetingParticipant = typeof meetingParticipants.$inferSelect;

// Meeting Reminders
export const reminderTypeEnum = z.enum(['1_hour', '15_min', '1_day', 'custom']);

export const insertMeetingReminderSchema = createInsertSchema(meetingReminders).omit({
  id: true,
  createdAt: true,
  sent: true,
  sentAt: true,
}).extend({
  reminderType: reminderTypeEnum,
  reminderTime: z.date().or(z.string()),
});

export type InsertMeetingReminder = z.infer<typeof insertMeetingReminderSchema>;
export type MeetingReminder = typeof meetingReminders.$inferSelect;

// Conversation Labels
export const insertConversationLabelSchema = createInsertSchema(conversationLabels).omit({
  id: true,
  createdAt: true,
}).extend({
  label: z.string().min(1, "Label is required"),
});

export type InsertConversationLabel = z.infer<typeof insertConversationLabelSchema>;
export type ConversationLabel = typeof conversationLabels.$inferSelect;

// Message Moderation
export const moderationActionEnum = z.enum(['flagged', 'hidden', 'redacted', 'warned', 'cleared']);
export const MODERATION_ACTIONS = moderationActionEnum.options;

export const insertMessageModerationSchema = createInsertSchema(messageModeration).omit({
  id: true,
  createdAt: true,
}).extend({
  action: moderationActionEnum,
  reason: z.string().optional(),
});

export type InsertMessageModeration = z.infer<typeof insertMessageModerationSchema>;
export type MessageModeration = typeof messageModeration.$inferSelect;

// Conversation Preferences
export const insertConversationPreferenceSchema = createInsertSchema(conversationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  notificationsEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  previewEnabled: z.boolean().optional(),
});

export type InsertConversationPreference = z.infer<typeof insertConversationPreferenceSchema>;
export type ConversationPreference = typeof conversationPreferences.$inferSelect;

// Conversation Pins
export const insertConversationPinSchema = createInsertSchema(conversationPins).omit({
  id: true,
  pinnedAt: true,
}).extend({
  displayOrder: z.number().int().optional(),
});

export type InsertConversationPin = z.infer<typeof insertConversationPinSchema>;
export type ConversationPin = typeof conversationPins.$inferSelect;

// File Versions
export const insertFileVersionSchema = createInsertSchema(fileVersions).omit({
  id: true,
  createdAt: true,
}).extend({
  versionNumber: z.number().int().positive("Version number must be positive"),
  changeDescription: z.string().optional(),
});

export type InsertFileVersion = z.infer<typeof insertFileVersionSchema>;
export type FileVersion = typeof fileVersions.$inferSelect;

// Rate Limits
export const insertRateLimitSchema = createInsertSchema(rateLimits).omit({
  id: true,
});

export type InsertRateLimit = z.infer<typeof insertRateLimitSchema>;
export type RateLimit = typeof rateLimits.$inferSelect;

// ============================================================================
// WebSocket Events & Real-time Communication
// ============================================================================

// WebSocket Event Types
export const wsEventTypeEnum = z.enum([
  // Client -> Server events
  'typing_start',
  'typing_stop',
  'mark_read',
  'join_conversation',
  'leave_conversation',
  
  // Server -> Client events
  'message_sent',
  'message_updated',
  'message_deleted',
  'user_typing',
  'user_stopped_typing',
  'user_online',
  'user_offline',
  'conversation_updated',
  'read_receipt',
  'meeting_created',
  'meeting_updated',
  'rsvp_updated',
  
  // Connection events
  'connected',
  'disconnected',
  'error',
]);

export type WsEventType = z.infer<typeof wsEventTypeEnum>;

// Base WebSocket message schema
export const wsMessageSchema = z.object({
  type: wsEventTypeEnum,
  payload: z.any(),
  timestamp: z.string().optional(),
});

export type WsMessage = z.infer<typeof wsMessageSchema>;

// Typing indicator payload
export const typingIndicatorSchema = z.object({
  conversationId: z.string(),
  userId: z.string(),
  userName: z.string(),
  isTyping: z.boolean(),
});

export type TypingIndicator = z.infer<typeof typingIndicatorSchema>;

// Message sent payload (server -> client)
export const messageSentPayloadSchema = z.object({
  conversationId: z.string(),
  message: z.object({
    id: z.string(),
    conversationId: z.string(),
    senderId: z.string(),
    content: z.string(),
    messageType: z.string().optional(),
    metadata: z.any().optional(),
    isEdited: z.boolean().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export type MessageSentPayload = z.infer<typeof messageSentPayloadSchema>;

// User presence payload
export const userPresenceSchema = z.object({
  userId: z.string(),
  status: z.enum(['online', 'offline', 'away']),
  lastSeen: z.string().optional(),
});

export type UserPresence = z.infer<typeof userPresenceSchema>;

// Read receipt payload
export const readReceiptSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  userId: z.string(),
  readAt: z.string(),
});

export type ReadReceipt = z.infer<typeof readReceiptSchema>;

// Join/Leave conversation payload
export const conversationActionSchema = z.object({
  conversationId: z.string(),
});

export type ConversationAction = z.infer<typeof conversationActionSchema>;

// =============================================================================
// SECURITY & SESSION MANAGEMENT TABLES
// =============================================================================

// Login History table - Track all login/logout events
export const loginHistory = pgTable("login_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // 'login' or 'logout'
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"), // Country, city if available
  deviceInfo: text("device_info"), // Browser, OS, device type
  success: boolean("success").default(true), // Track failed login attempts too
  failureReason: text("failure_reason"), // Reason for failure if success=false
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("login_history_user_id_idx").on(table.userId),
  timestampIdx: index("login_history_timestamp_idx").on(table.timestamp),
}));

export const insertLoginHistorySchema = createInsertSchema(loginHistory).omit({
  id: true,
  timestamp: true,
});
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type LoginHistory = typeof loginHistory.$inferSelect;

// Active Sessions table - Track all active user sessions
export const activeSessions = pgTable("active_sessions", {
  id: varchar("id").primaryKey(), // session ID from express-session
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  deviceInfo: text("device_info"), // Browser, OS, device type
  location: text("location"), // Country, city if available
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("active_sessions_user_id_idx").on(table.userId),
  lastActivityIdx: index("active_sessions_last_activity_idx").on(table.lastActivity),
}));

export const insertActiveSessionSchema = createInsertSchema(activeSessions).omit({
  createdAt: true,
});
export type InsertActiveSession = z.infer<typeof insertActiveSessionSchema>;
export type ActiveSession = typeof activeSessions.$inferSelect;

// User Activity Log table - Track user actions and behavior
export const userActivityLog = pgTable("user_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // 'page_view', 'api_call', 'create', 'update', 'delete', 'view', 'download', 'upload'
  resource: text("resource"), // e.g., 'job', 'bid', 'profile', 'message', 'file'
  resourceId: varchar("resource_id"), // ID of the resource being acted upon
  method: varchar("method"), // HTTP method for API calls: GET, POST, PUT, DELETE, PATCH
  endpoint: text("endpoint"), // API endpoint path
  statusCode: integer("status_code"), // HTTP status code
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"), // Additional context: { page, query, duration, etc. }
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_activity_log_user_id_idx").on(table.userId),
  actionIdx: index("user_activity_log_action_idx").on(table.action),
  resourceIdx: index("user_activity_log_resource_idx").on(table.resource),
  timestampIdx: index("user_activity_log_timestamp_idx").on(table.timestamp),
  compositeIdx: index("user_activity_log_composite_idx").on(table.userId, table.timestamp),
}));

export const insertUserActivityLogSchema = createInsertSchema(userActivityLog).omit({
  id: true,
  timestamp: true,
});
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLog.$inferSelect;
