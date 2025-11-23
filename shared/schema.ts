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
  // Two-Factor Authentication fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret"), // Encrypted TOTP secret
  backupCodes: text("backup_codes").array(), // Array of backup recovery codes
  // Privacy settings
  profileVisibility: text("profile_visibility").default('public'), // 'public', 'clients_only', 'private'
  // Account approval workflow (Super Admin)
  accountStatus: text("account_status").notNull().default('pending_approval'), // 'pending_approval', 'active', 'rejected', 'pending_info', 'suspended', 'banned'
  approvalNotes: text("approval_notes"), // Admin notes during review
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  requestedInfoDetails: text("requested_info_details"), // What info admin requested
  // Suspension/Ban management
  suspendedUntil: timestamp("suspended_until"),
  suspendedReason: text("suspended_reason"),
  suspendedBy: varchar("suspended_by").references(() => users.id),
  bannedAt: timestamp("banned_at"),
  bannedReason: text("banned_reason"),
  bannedBy: varchar("banned_by").references(() => users.id),
  // Risk assessment (auto-calculated)
  riskScore: integer("risk_score").default(0), // 0-100, lower is better
  riskFactors: jsonb("risk_factors"), // { invalidDocs: false, suspiciousEmail: false, etc }
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

// Team Members - Manage team members for client organizations
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientProfileId: varchar("client_profile_id").notNull().references(() => clientProfiles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // null until invitation accepted
  email: text("email").notNull(), // Email for invitation
  fullName: text("full_name"), // Optional full name for display
  role: text("role").notNull().default('member'), // 'owner', 'admin', 'member', 'viewer'
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'declined', 'revoked'
  // Permissions
  canViewProjects: boolean("can_view_projects").default(true),
  canEditProjects: boolean("can_edit_projects").default(false),
  canManageTeam: boolean("can_manage_team").default(false),
  canManageBilling: boolean("can_manage_billing").default(false),
  // Invitation management
  invitationToken: varchar("invitation_token").unique(),
  invitationSentAt: timestamp("invitation_sent_at"),
  invitationExpiry: timestamp("invitation_expiry"),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by").references(() => users.id),
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
  customFieldData: jsonb("custom_field_data"), // Consultant's answers to category-specific custom fields
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
  // Document metadata
  documentType: text("document_type").notNull(), // 'commercial_registration', 'tax_certificate', 'national_id', 'authorization_letter', 'business_license', 'other'
  storageKey: text("storage_key").notNull(), // File path: kyc/<userId>/<uuid>_<sanitized_name>
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  // Legacy fields (keeping for backward compatibility)
  idType: text("id_type"), // 'passport', 'national_id', 'driving_license' (deprecated - use documentType)
  idNumber: varchar("id_number"),
  validityDate: timestamp("validity_date"),
  documentUrl: text("document_url"), // Deprecated - use storageKey
  // Document status and review
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'rejected'
  verified: boolean("verified").default(false), // Legacy field - maps to status='approved'
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("kyc_documents_user_id_idx").on(table.userId),
  statusIdx: index("kyc_documents_status_idx").on(table.status),
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
  ifscCode: varchar("ifsc_code"), // For Indian banks
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
  // Dynamic category system enhancements
  categoryType: text("category_type"), // 'human_services', 'software_services', 'hardware_supply', 'digital_marketing', 'infrastructure', 'cloud_services', 'cybersecurity', 'data_services'
  requiresApproval: boolean("requires_approval").default(false), // Requires vendor approval to offer services in this category
  deliveryOptions: jsonb("delivery_options"), // Delivery/shipping configuration for hardware categories
  warrantyConfig: jsonb("warranty_config"), // Warranty and support requirements
  complianceRequirements: text("compliance_requirements").array(), // Required certifications/compliance standards
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
  // Verification badge and capacity management
  verificationBadge: text("verification_badge"), // 'verified', 'premium', 'expert'
  badgeIssuedAt: timestamp("badge_issued_at"),
  maxConcurrentJobs: integer("max_concurrent_jobs"), // Maximum concurrent jobs allowed in this category
  currentActiveJobs: integer("current_active_jobs").default(0), // Current count of active jobs
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
  // Dynamic category custom fields
  customFieldData: jsonb("custom_field_data"), // Client's answers to category-specific custom fields
  deliveryOptions: jsonb("delivery_options"), // Selected delivery options for hardware/physical jobs
  complianceRequirements: text("compliance_requirements").array(), // Required certifications from consultant
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

// Bid type enum
export const bidTypeEnum = z.enum(['service', 'hardware', 'software']);
export const BID_TYPES = bidTypeEnum.options;
export type BidType = z.infer<typeof bidTypeEnum>;

// Bids - Proposals from consultants
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  consultantId: varchar("consultant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Basic bid info
  coverLetter: text("cover_letter").notNull(),
  proposedBudget: decimal("proposed_budget", { precision: 10, scale: 2 }).notNull(),
  proposedDuration: text("proposed_duration"), // e.g., "2 weeks", "1 month"
  milestones: jsonb("milestones"), // Array of milestone objects
  attachments: text("attachments").array(),
  status: text("status").notNull().default('pending'), // 'pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'expired'
  clientViewed: boolean("client_viewed").default(false),
  clientViewedAt: timestamp("client_viewed_at"),
  
  // Enhanced bid fields
  bidType: text("bid_type").notNull().default('service'), // 'service', 'hardware', 'software'
  proposalData: jsonb("proposal_data"), // Rich text proposal content
  pricingBreakdown: jsonb("pricing_breakdown"), // Detailed pricing structure
  teamComposition: jsonb("team_composition"), // Team members for service bids
  deliveryTimeline: jsonb("delivery_timeline"), // Timeline with milestones
  productDetails: jsonb("product_details"), // For hardware bids (specs, brand, warranty, certifications)
  softwareLicensing: jsonb("software_licensing"), // For software bids (licensing model, SLA, support)
  portfolioSamples: text("portfolio_samples").array(), // Portfolio item IDs
  similarProjects: jsonb("similar_projects"), // Past project references
  approachMethodology: text("approach_methodology"), // Technical approach description
  questionsForClient: text("questions_for_client"), // Clarification questions
  bidValidityDate: timestamp("bid_validity_date"), // Bid expiration date
  pricingTemplateId: varchar("pricing_template_id"), // Link to consultant's pricing template
  
  // RFQ tracking
  isRFQResponse: boolean("is_rfq_response").default(false), // Whether this is RFQ response
  rfqInvitationId: varchar("rfq_invitation_id"), // Reference to RFQ invitation
  
  // Analytics
  viewCount: integer("view_count").default(0),
  comparedCount: integer("compared_count").default(0), // How many times included in comparison
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  jobIdIdx: index("bids_job_id_idx").on(table.jobId),
  consultantIdIdx: index("bids_consultant_id_idx").on(table.consultantId),
  statusIdx: index("bids_status_idx").on(table.status),
  bidTypeIdx: index("bids_bid_type_idx").on(table.bidType),
  rfqInvitationIdIdx: index("bids_rfq_invitation_id_idx").on(table.rfqInvitationId),
}));

export const bidStatusEnum = z.enum(['pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'expired']);
export const BID_STATUSES = bidStatusEnum.options;
export type BidStatus = z.infer<typeof bidStatusEnum>;

// RFQ Invitations - Client invites consultants to submit quotes
export const rfqInvitations = pgTable("rfq_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consultantId: varchar("consultant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message"), // Personalized invitation message
  deadline: timestamp("deadline"), // Submission deadline
  templateData: jsonb("template_data"), // Pre-filled data/requirements
  status: text("status").notNull().default('pending'), // 'pending', 'responded', 'declined', 'expired'
  respondedAt: timestamp("responded_at"),
  bidId: varchar("bid_id").references(() => bids.id, { onDelete: "set null" }), // Link to submitted bid
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  jobIdIdx: index("rfq_invitations_job_id_idx").on(table.jobId),
  clientIdIdx: index("rfq_invitations_client_id_idx").on(table.clientId),
  consultantIdIdx: index("rfq_invitations_consultant_id_idx").on(table.consultantId),
  statusIdx: index("rfq_invitations_status_idx").on(table.status),
}));

export const rfqStatusEnum = z.enum(['pending', 'responded', 'declined', 'expired']);
export const RFQ_STATUSES = rfqStatusEnum.options;
export type RFQStatus = z.infer<typeof rfqStatusEnum>;

// Bid Shortlists - Client's shortlisted bids
export const bidShortlists = pgTable("bid_shortlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  bidId: varchar("bid_id").notNull().references(() => bids.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notes: text("notes"), // Private notes about this bid
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueShortlist: uniqueIndex("bid_shortlists_job_bid_unique").on(table.jobId, table.bidId),
  jobIdIdx: index("bid_shortlists_job_id_idx").on(table.jobId),
  bidIdIdx: index("bid_shortlists_bid_id_idx").on(table.bidId),
  clientIdIdx: index("bid_shortlists_client_id_idx").on(table.clientId),
}));

// Bid Clarifications - Q&A between client and consultant about a bid
export const bidClarifications = pgTable("bid_clarifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bidId: varchar("bid_id").notNull().references(() => bids.id, { onDelete: "cascade" }),
  askedBy: varchar("asked_by").notNull().references(() => users.id, { onDelete: "cascade" }), // Who asked (client or consultant)
  question: text("question").notNull(),
  answer: text("answer"), // Consultant's answer
  answeredAt: timestamp("answered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  bidIdIdx: index("bid_clarifications_bid_id_idx").on(table.bidId),
  askedByIdx: index("bid_clarifications_asked_by_idx").on(table.askedBy),
}));

// Bid Views - Track when clients view bids (for analytics)
export const bidViews = pgTable("bid_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bidId: varchar("bid_id").notNull().references(() => bids.id, { onDelete: "cascade" }),
  viewedBy: varchar("viewed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewDuration: integer("view_duration"), // Seconds spent viewing
  source: text("source"), // 'list', 'comparison', 'direct_link'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  bidIdIdx: index("bid_views_bid_id_idx").on(table.bidId),
  viewedByIdx: index("bid_views_viewed_by_idx").on(table.viewedBy),
}));

// Payment enums
export const paymentStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']);
export const PAYMENT_STATUSES = paymentStatusEnum.options;
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

export const paymentTypeEnum = z.enum(['deposit', 'release', 'refund', 'withdrawal']);
export const PAYMENT_TYPES = paymentTypeEnum.options;
export type PaymentType = z.infer<typeof paymentTypeEnum>;

// Project status enum - expanded for comprehensive project lifecycle management
export const projectStatusEnum = z.enum([
  'not_started', 
  'in_progress', 
  'awaiting_review', 
  'revision_requested', 
  'completed', 
  'cancelled', 
  'on_hold', 
  'delayed'
]);
export const PROJECT_STATUSES = projectStatusEnum.options;
export type ProjectStatus = z.infer<typeof projectStatusEnum>;

// Projects - Active work between client and consultant (Contracts)
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  bidId: varchar("bid_id").notNull().references(() => bids.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  consultantId: varchar("consultant_id").notNull().references(() => users.id),
  
  // Basic project info
  title: text("title").notNull(),
  description: text("description"),
  scope: text("scope"), // Detailed scope of work
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default('SAR'),
  
  // Status and timeline
  status: text("status").notNull().default('not_started'),
  milestones: jsonb("milestones"), // Array with title, amount, status, dueDate, progress
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completedAt: timestamp("completed_at"),
  
  // Contract terms
  paymentTerms: text("payment_terms"), // Payment schedule and conditions
  warrantyTerms: text("warranty_terms"), // Warranty and guarantees
  supportTerms: text("support_terms"), // Post-delivery support details
  cancellationPolicy: text("cancellation_policy"),
  ndaRequired: boolean("nda_required").default(false),
  ndaDocument: text("nda_document"), // Mock NDA document URL
  
  // Contract metadata
  contractVersion: integer("contract_version").default(1),
  digitalSignatureClient: text("digital_signature_client"), // Mock signature
  digitalSignatureConsultant: text("digital_signature_consultant"), // Mock signature
  signedAt: timestamp("signed_at"),
  
  // Progress tracking
  overallProgress: integer("overall_progress").default(0), // 0-100
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index("projects_client_id_idx").on(table.clientId),
  consultantIdIdx: index("projects_consultant_id_idx").on(table.consultantId),
  statusIdx: index("projects_status_idx").on(table.status),
}));

// Milestone Comments - Discussion threads for project milestones
export const milestoneComments = pgTable("milestone_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  milestoneIndex: integer("milestone_index").notNull(), // Index of milestone in the milestones array
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  attachments: text("attachments").array(), // Array of file URLs (mocked)
  mentions: text("mentions").array(), // Array of mentioned user IDs
  resolved: boolean("resolved").default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("milestone_comments_project_id_idx").on(table.projectId),
  userIdIdx: index("milestone_comments_user_id_idx").on(table.userId),
}));

// Project Deliverables - Consultant submissions for milestone completion
export const projectDeliverables = pgTable("project_deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  milestoneIndex: integer("milestone_index").notNull(), // Index of milestone in the milestones array
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"), // Mock file upload URL
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'revision_requested', 'rejected'
  reviewNotes: text("review_notes"), // Client's review feedback
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("project_deliverables_project_id_idx").on(table.projectId),
  uploadedByIdx: index("project_deliverables_uploaded_by_idx").on(table.uploadedBy),
  statusIdx: index("project_deliverables_status_idx").on(table.status),
}));

// Project Team Members - Collaborative team assignments
export const projectTeamMembers = pgTable("project_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'lead', 'developer', 'designer', 'qa', 'pm', 'client_stakeholder'
  assignedMilestones: integer("assigned_milestones").array(), // Array of milestone indices
  permissions: jsonb("permissions"), // { canComment: true, canUpload: true, canApprove: false }
  addedBy: varchar("added_by").notNull().references(() => users.id),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("project_team_members_project_id_idx").on(table.projectId),
  userIdIdx: index("project_team_members_user_id_idx").on(table.userId),
  uniqueProjectUser: uniqueIndex("unique_project_team_member").on(table.projectId, table.userId),
}));

// Project Activity Log - Comprehensive audit trail
export const projectActivityLog = pgTable("project_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id), // Nullable for system actions
  action: text("action").notNull(), // 'status_change', 'comment_added', 'deliverable_submitted', 'payment_released', etc.
  details: jsonb("details"), // Additional contextual information
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("project_activity_log_project_id_idx").on(table.projectId),
  actionIdx: index("project_activity_log_action_idx").on(table.action),
  timestampIdx: index("project_activity_log_timestamp_idx").on(table.timestamp),
}));

// ============================================================================
// DELIVERY & FULFILLMENT SYSTEM TABLES
// ============================================================================

// 7.1 FOR SERVICES - FILE VERSIONING SYSTEM

// Deliverable Versions - Track all versions of service deliverables
export const deliverableVersions = pgTable("deliverable_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliverableId: varchar("deliverable_id").notNull().references(() => projectDeliverables.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(), // 1, 2, 3, etc.
  fileUrl: text("file_url").notNull(), // File storage URL
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"), // in bytes
  fileType: varchar("file_type"), // MIME type
  versionNotes: text("version_notes"), // Change description
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isLatest: boolean("is_latest").default(true), // Flag for current version
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  deliverableIdIdx: index("deliverable_versions_deliverable_id_idx").on(table.deliverableId),
  versionIdx: index("deliverable_versions_version_idx").on(table.versionNumber),
  latestIdx: index("deliverable_versions_latest_idx").on(table.isLatest),
  uniqueDeliverableVersion: uniqueIndex("unique_deliverable_version").on(table.deliverableId, table.versionNumber),
}));

// Deliverable Downloads - Track who downloaded which version
export const deliverableDownloads = pgTable("deliverable_downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  versionId: varchar("version_id").notNull().references(() => deliverableVersions.id, { onDelete: "cascade" }),
  deliverableId: varchar("deliverable_id").notNull().references(() => projectDeliverables.id, { onDelete: "cascade" }),
  downloadedBy: varchar("downloaded_by").notNull().references(() => users.id),
  ipAddress: varchar("ip_address"), // For security audit
  userAgent: text("user_agent"), // Browser/device info
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
}, (table) => ({
  versionIdIdx: index("deliverable_downloads_version_id_idx").on(table.versionId),
  deliverableIdIdx: index("deliverable_downloads_deliverable_id_idx").on(table.deliverableId),
  downloadedByIdx: index("deliverable_downloads_downloaded_by_idx").on(table.downloadedBy),
  timestampIdx: index("deliverable_downloads_timestamp_idx").on(table.downloadedAt),
}));

// 7.2 FOR HARDWARE - SHIPPING & QUALITY CONTROL

// Hardware Shipments - Track physical product delivery
export const hardwareShipments = pgTable("hardware_shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  deliverableId: varchar("deliverable_id").references(() => projectDeliverables.id, { onDelete: "set null" }),
  orderNumber: varchar("order_number").unique(), // HW-ORDER-XXXXXX
  // Shipping details
  carrierName: varchar("carrier_name"), // DHL, Aramex, SMSA, etc.
  trackingNumber: varchar("tracking_number"),
  shippingMethod: varchar("shipping_method"), // 'standard', 'express', 'overnight'
  // Addresses
  shippingAddress: jsonb("shipping_address").notNull(), // { street, city, state, country, postalCode, phone, contactName }
  billingAddress: jsonb("billing_address"), // Same structure as shipping
  // Status tracking
  status: text("status").notNull().default('order_confirmed'), 
  // 'order_confirmed', 'preparing_shipment', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'installed', 'failed_delivery'
  statusHistory: jsonb("status_history").array(), // [{ status, timestamp, notes, location }]
  // Delivery confirmation
  deliveredAt: timestamp("delivered_at"),
  receivedBy: varchar("received_by"), // Name of person who received
  signatureUrl: text("signature_url"), // Mock signature image URL
  deliveryNotes: text("delivery_notes"),
  // Installation (if applicable)
  requiresInstallation: boolean("requires_installation").default(false),
  installationScheduledAt: timestamp("installation_scheduled_at"),
  installedAt: timestamp("installed_at"),
  installedBy: varchar("installed_by"), // Technician name/ID
  installationNotes: text("installation_notes"),
  // Product details
  productDetails: jsonb("product_details"), // { name, model, quantity, serialNumbers[], warranty }
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("hardware_shipments_project_id_idx").on(table.projectId),
  statusIdx: index("hardware_shipments_status_idx").on(table.status),
  trackingIdx: index("hardware_shipments_tracking_idx").on(table.trackingNumber),
}));

// Quality Inspections - Pre-delivery quality checks
export const qualityInspections = pgTable("quality_inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id").notNull().references(() => hardwareShipments.id, { onDelete: "cascade" }),
  inspectionType: varchar("inspection_type").notNull(), // 'pre_shipment', 'upon_delivery', 'installation'
  inspectedBy: varchar("inspected_by").notNull().references(() => users.id),
  inspectionDate: timestamp("inspection_date").defaultNow().notNull(),
  // Checklist items
  checklist: jsonb("checklist").notNull(), // [{ item: string, status: 'pass'|'fail', notes: string }]
  overallStatus: text("overall_status").notNull().default('pending'), // 'pending', 'pass', 'fail', 'conditional_pass'
  failureReasons: text("failure_reasons").array(), // List of failed items
  correctiveActions: text("corrective_actions"), // What needs to be fixed
  // Photos/documentation
  photoUrls: text("photo_urls").array(), // Inspection photos
  documentUrls: text("document_urls").array(), // Reports, certificates
  notes: text("notes"),
  // Approval
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  shipmentIdIdx: index("quality_inspections_shipment_id_idx").on(table.shipmentId),
  statusIdx: index("quality_inspections_status_idx").on(table.overallStatus),
  inspectionTypeIdx: index("quality_inspections_type_idx").on(table.inspectionType),
}));

// Returns and Replacements - Handle product returns
export const returnsReplacements = pgTable("returns_replacements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id").notNull().references(() => hardwareShipments.id, { onDelete: "cascade" }),
  requestType: varchar("request_type").notNull(), // 'return', 'replacement', 'repair'
  reason: text("reason").notNull(), // 'defective', 'damaged', 'wrong_item', 'not_as_described', 'other'
  description: text("description").notNull(),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'
  // Return shipping
  returnTrackingNumber: varchar("return_tracking_number"),
  returnCarrier: varchar("return_carrier"),
  returnShippedAt: timestamp("return_shipped_at"),
  returnReceivedAt: timestamp("return_received_at"),
  // Replacement details
  replacementShipmentId: varchar("replacement_shipment_id").references(() => hardwareShipments.id),
  replacementStatus: text("replacement_status"), // 'pending', 'shipped', 'delivered'
  // Resolution
  resolution: text("resolution"), // 'refunded', 'replaced', 'repaired', 'rejected'
  resolutionNotes: text("resolution_notes"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  // Documentation
  photoUrls: text("photo_urls").array(), // Photos of issue
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  shipmentIdIdx: index("returns_replacements_shipment_id_idx").on(table.shipmentId),
  statusIdx: index("returns_replacements_status_idx").on(table.status),
  requestTypeIdx: index("returns_replacements_type_idx").on(table.requestType),
}));

// Warranty Claims - Handle warranty requests
export const warrantyClaims = pgTable("warranty_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id").notNull().references(() => hardwareShipments.id, { onDelete: "cascade" }),
  claimNumber: varchar("claim_number").unique(), // WC-YYYY-XXXXXX
  productSerialNumber: varchar("product_serial_number"),
  issueDescription: text("issue_description").notNull(),
  issueType: varchar("issue_type").notNull(), // 'hardware_failure', 'software_issue', 'performance', 'other'
  claimantId: varchar("claimant_id").notNull().references(() => users.id),
  status: text("status").notNull().default('submitted'), 
  // 'submitted', 'under_review', 'approved', 'rejected', 'in_repair', 'completed', 'cancelled'
  // Warranty validation
  warrantyValidUntil: timestamp("warranty_valid_until"),
  warrantyType: varchar("warranty_type"), // 'manufacturer', 'extended', 'service_contract'
  isWarrantyValid: boolean("is_warranty_valid"),
  // Claim processing
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  // Resolution
  resolutionType: varchar("resolution_type"), // 'repair', 'replace', 'refund', 'rejected'
  resolutionDetails: text("resolution_details"),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  completedAt: timestamp("completed_at"),
  // Documentation
  photoUrls: text("photo_urls").array(),
  receiptUrl: text("receipt_url"), // Proof of purchase
  diagnosticReportUrl: text("diagnostic_report_url"),
  repairCost: decimal("repair_cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  shipmentIdIdx: index("warranty_claims_shipment_id_idx").on(table.shipmentId),
  statusIdx: index("warranty_claims_status_idx").on(table.status),
  claimantIdIdx: index("warranty_claims_claimant_id_idx").on(table.claimantId),
}));

// 7.3 FOR SOFTWARE - LICENSE & SUBSCRIPTION MANAGEMENT

// Software Licenses - License key management
export const softwareLicenses = pgTable("software_licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  deliverableId: varchar("deliverable_id").references(() => projectDeliverables.id, { onDelete: "set null" }),
  licenseKey: varchar("license_key").notNull().unique(), // Generated license key
  licenseType: varchar("license_type").notNull(), // 'perpetual', 'subscription', 'trial', 'node_locked', 'floating'
  productName: text("product_name").notNull(),
  productVersion: varchar("product_version"),
  // Activation limits
  maxActivations: integer("max_activations").default(1), // -1 for unlimited
  currentActivations: integer("current_activations").default(0),
  // Validity
  issuedTo: varchar("issued_to").notNull().references(() => users.id), // Client user
  issuedBy: varchar("issued_by").notNull().references(() => users.id), // Consultant
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // null for perpetual licenses
  isActive: boolean("is_active").default(true),
  // Trial management
  isTrial: boolean("is_trial").default(false),
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  convertedToFullAt: timestamp("converted_to_full_at"),
  // Access credentials (for cloud/SaaS)
  accessUrl: text("access_url"), // Login URL for cloud services
  username: varchar("username"),
  initialPassword: varchar("initial_password"), // Encrypted/hashed
  // Features and limits
  features: jsonb("features"), // { feature1: true, feature2: false, maxUsers: 10 }
  usageLimits: jsonb("usage_limits"), // { maxStorage: 100GB, maxApiCalls: 1000/day }
  // Maintenance and support
  maintenanceIncluded: boolean("maintenance_included").default(false),
  maintenanceExpiresAt: timestamp("maintenance_expires_at"),
  supportLevel: varchar("support_level"), // 'basic', 'standard', 'premium', 'enterprise'
  // Deactivation
  deactivatedAt: timestamp("deactivated_at"),
  deactivatedBy: varchar("deactivated_by").references(() => users.id),
  deactivationReason: text("deactivation_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("software_licenses_project_id_idx").on(table.projectId),
  issuedToIdx: index("software_licenses_issued_to_idx").on(table.issuedTo),
  licenseTypeIdx: index("software_licenses_type_idx").on(table.licenseType),
  activeIdx: index("software_licenses_active_idx").on(table.isActive),
  expiresIdx: index("software_licenses_expires_idx").on(table.expiresAt),
}));

// Software Subscriptions - Recurring subscription management
export const softwareSubscriptions = pgTable("software_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").notNull().references(() => softwareLicenses.id, { onDelete: "cascade" }),
  subscriptionPlan: varchar("subscription_plan").notNull(), // 'monthly', 'quarterly', 'annual', 'biennial'
  billingCycle: varchar("billing_cycle").notNull(), // 'monthly', 'yearly'
  pricePerCycle: decimal("price_per_cycle", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default('SAR'),
  // Subscription lifecycle
  status: text("status").notNull().default('active'), // 'active', 'cancelled', 'expired', 'suspended', 'grace_period'
  startedAt: timestamp("started_at").defaultNow().notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  nextBillingDate: timestamp("next_billing_date"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  // Auto-renewal
  autoRenew: boolean("auto_renew").default(true),
  renewalCount: integer("renewal_count").default(0),
  // Upgrade/downgrade
  previousPlan: varchar("previous_plan"),
  upgradedAt: timestamp("upgraded_at"),
  downgradedAt: timestamp("downgraded_at"),
  // Grace period (for failed payments)
  gracePeriodEndsAt: timestamp("grace_period_ends_at"),
  // Payment tracking (references to payment system)
  lastPaymentAt: timestamp("last_payment_at"),
  lastPaymentAmount: decimal("last_payment_amount", { precision: 10, scale: 2 }),
  nextPaymentAmount: decimal("next_payment_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  licenseIdIdx: index("software_subscriptions_license_id_idx").on(table.licenseId),
  statusIdx: index("software_subscriptions_status_idx").on(table.status),
  billingDateIdx: index("software_subscriptions_billing_date_idx").on(table.nextBillingDate),
}));

// Software Activations - Track device/instance activations
export const softwareActivations = pgTable("software_activations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").notNull().references(() => softwareLicenses.id, { onDelete: "cascade" }),
  // Device/instance identification
  deviceId: varchar("device_id").notNull(), // Unique device identifier (hardware ID, MAC, etc.)
  deviceName: varchar("device_name"), // User-friendly device name
  deviceType: varchar("device_type"), // 'desktop', 'laptop', 'server', 'mobile', 'vm'
  osInfo: jsonb("os_info"), // { platform: 'windows', version: '11', arch: 'x64' }
  // Activation details
  activatedBy: varchar("activated_by").notNull().references(() => users.id),
  activatedAt: timestamp("activated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  // Usage tracking
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),
  // Network info (for security)
  ipAddress: varchar("ip_address"),
  location: jsonb("location"), // { country, city, coordinates }
  // Deactivation
  deactivatedAt: timestamp("deactivated_at"),
  deactivatedBy: varchar("deactivated_by").references(() => users.id),
  deactivationReason: text("deactivation_reason"), // 'user_requested', 'device_replaced', 'license_expired', 'violation'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  licenseIdIdx: index("software_activations_license_id_idx").on(table.licenseId),
  deviceIdIdx: index("software_activations_device_id_idx").on(table.deviceId),
  activeIdx: index("software_activations_active_idx").on(table.isActive),
  uniqueLicenseDevice: uniqueIndex("unique_license_device").on(table.licenseId, table.deviceId),
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

// Reviews - Feedback after project completion (Two-way: Consultant ↔ Client)
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id),
  reviewType: text("review_type").notNull(), // 'for_consultant' | 'for_client'
  
  // Overall rating
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  
  // Detailed ratings for consultants (vendor)
  qualityRating: integer("quality_rating"), // 1-5 stars
  communicationRating: integer("communication_rating"), // 1-5 stars
  deadlineRating: integer("deadline_rating"), // 1-5 stars
  professionalismRating: integer("professionalism_rating"), // 1-5 stars
  valueRating: integer("value_rating"), // 1-5 stars
  
  // Detailed ratings for clients
  communicationClarityRating: integer("communication_clarity_rating"), // 1-5 stars
  requirementsClarityRating: integer("requirements_clarity_rating"), // 1-5 stars
  paymentPromptnessRating: integer("payment_promptness_rating"), // 1-5 stars
  clientProfessionalismRating: integer("client_professionalism_rating"), // 1-5 stars
  
  // Additional fields
  wouldWorkAgain: boolean("would_work_again").default(true), // Would work with this person again?
  isPublic: boolean("is_public").default(true).notNull(), // Public or private review
  isVerified: boolean("is_verified").default(false).notNull(), // Verified project completion (admin sets to true)
  attachments: jsonb("attachments"), // Array of file URLs/metadata
  
  // Legacy field for backward compatibility
  categories: jsonb("categories"), // { communication: 5, quality: 4, timeliness: 5 }
  
  // Engagement metrics
  helpful: integer("helpful").default(0), // How many found this review helpful
  helpfulBy: text("helpful_by").array().default(sql`ARRAY[]::text[]`), // User IDs who marked helpful
  
  // Edit tracking
  editedAt: timestamp("edited_at"),
  canEditUntil: timestamp("can_edit_until"), // 48 hours after creation
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("reviews_project_id_idx").on(table.projectId),
  reviewerIdIdx: index("reviews_reviewer_id_idx").on(table.reviewerId),
  revieweeIdIdx: index("reviews_reviewee_id_idx").on(table.revieweeId),
  reviewTypeIdx: index("reviews_review_type_idx").on(table.reviewType),
  isPublicIdx: index("reviews_is_public_idx").on(table.isPublic),
  ratingIdx: index("reviews_rating_idx").on(table.rating),
}));

// Review Responses - One response per review from reviewee
export const reviewResponses = pgTable("review_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().unique().references(() => reviews.id, { onDelete: "cascade" }),
  responderId: varchar("responder_id").notNull().references(() => users.id),
  responseText: text("response_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  reviewIdIdx: index("review_responses_review_id_idx").on(table.reviewId),
  responderIdIdx: index("review_responses_responder_id_idx").on(table.responderId),
}));

// Review Reports - Flagged inappropriate reviews
export const reviewReports = pgTable("review_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reason: text("reason").notNull(), // 'spam', 'inappropriate', 'fake', 'offensive', 'other'
  description: text("description"),
  status: text("status").notNull().default('pending'), // 'pending', 'reviewed', 'dismissed', 'resolved'
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  reviewIdIdx: index("review_reports_review_id_idx").on(table.reviewId),
  reporterIdIdx: index("review_reports_reporter_id_idx").on(table.reporterId),
  statusIdx: index("review_reports_status_idx").on(table.status),
}));

// Notification Type Constants
export const NOTIFICATION_TYPES = {
  // CRITICAL - Business operations
  BID_RECEIVED: 'bid_received',
  BID_STATUS_UPDATE: 'bid_status_update',
  BID_AWARDED: 'bid_awarded',
  BID_REJECTED: 'bid_rejected',
  PAYMENT_DEPOSITED: 'payment_deposited',
  PAYMENT_RELEASED: 'payment_released',
  PROJECT_STATUS_CHANGE: 'project_status_change',
  MILESTONE_COMPLETED: 'milestone_completed',
  DELIVERABLE_SUBMITTED: 'deliverable_submitted',
  INVOICE_GENERATED: 'invoice_generated',
  VENDOR_INVITED: 'vendor_invited',
  VERIFICATION_STATUS: 'verification_status',
  CATEGORY_APPROVAL: 'category_approval',
  PROFILE_SUBMITTED: 'profile_submitted',
  ACCOUNT_APPROVED: 'account_approved',
  ACCOUNT_REJECTED: 'account_rejected',
  INFO_REQUESTED: 'info_requested',
  
  // IMPORTANT - Value-add features
  NEW_MESSAGE: 'new_message',
  REVIEW_RECEIVED: 'review_received',
  REVIEW_RESPONSE: 'review_response',
  DEADLINE_REMINDER: 'deadline_reminder',
  REFUND_PROCESSED: 'refund_processed',
  TEAM_MEMBER_ACTIVITY: 'team_member_activity',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Notifications - System and user notifications
// Supports messaging notifications via type='new_message', 'message_reply', 'meeting_scheduled', etc.
// relatedConversationId and relatedMessageId provide direct FK links for messaging notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // See NOTIFICATION_TYPES constant
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // URL to navigate to
  metadata: jsonb("metadata"), // Additional context (e.g., { senderId, meetingId, bidId, projectId })
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

// Notification Preferences - Granular per-type notification settings per user
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  
  // Global toggles
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true).notNull(),
  inAppNotificationsEnabled: boolean("in_app_notifications_enabled").default(true).notNull(),
  
  // Per-type controls for email (null = all enabled, empty array = all disabled, or specific types)
  emailEnabledTypes: text("email_enabled_types").array(), // null means all types enabled for email
  
  // Per-type controls for in-app (null = all enabled, empty array = all disabled, or specific types)
  inAppEnabledTypes: text("in_app_enabled_types").array(), // null means all types enabled for in-app
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notification_preferences_user_id_idx").on(table.userId),
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

// Disputes - Conflict resolution between clients and consultants
export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  raisedBy: varchar("raised_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  disputeType: text("dispute_type").notNull(), // 'payment_dispute', 'quality_dispute', 'delivery_dispute', 'refund_request', 'contract_violation'
  title: text("title").notNull(), // Brief summary
  description: text("description").notNull(),
  desiredResolution: text("desired_resolution"), // What the user wants
  status: text("status").notNull().default('pending'), // 'pending', 'under_review', 'resolved', 'closed'
  resolution: text("resolution"), // Admin's decision
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("disputes_project_id_idx").on(table.projectId),
  raisedByIdx: index("disputes_raised_by_idx").on(table.raisedBy),
  statusIdx: index("disputes_status_idx").on(table.status),
  disputeTypeIdx: index("disputes_type_idx").on(table.disputeType),
}));

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  resolvedBy: true,
  resolution: true,
}).extend({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  desiredResolution: z.string().max(2000).optional(),
  disputeType: z.enum(['payment_dispute', 'quality_dispute', 'delivery_dispute', 'refund_request', 'contract_violation']),
});
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

// Dispute Evidence - Supporting files for disputes
export const disputeEvidence = pgTable("dispute_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // 'document', 'screenshot', 'photo', 'video', 'contract', 'invoice', 'message_log'
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (table) => ({
  disputeIdIdx: index("dispute_evidence_dispute_id_idx").on(table.disputeId),
  uploadedByIdx: index("dispute_evidence_uploaded_by_idx").on(table.uploadedBy),
}));

export const insertDisputeEvidenceSchema = createInsertSchema(disputeEvidence).omit({
  id: true,
  uploadedAt: true,
}).extend({
  fileName: z.string().max(255),
  fileType: z.enum(['document', 'screenshot', 'photo', 'video', 'contract', 'invoice', 'message_log']),
});
export type InsertDisputeEvidence = z.infer<typeof insertDisputeEvidenceSchema>;
export type DisputeEvidence = typeof disputeEvidence.$inferSelect;

// Dispute Messages - Communication thread
export const disputeMessages = pgTable("dispute_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isAdminMessage: boolean("is_admin_message").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  disputeIdIdx: index("dispute_messages_dispute_id_idx").on(table.disputeId),
  senderIdIdx: index("dispute_messages_sender_id_idx").on(table.senderId),
  createdAtIdx: index("dispute_messages_created_at_idx").on(table.createdAt),
}));

export const insertDisputeMessageSchema = createInsertSchema(disputeMessages).omit({
  id: true,
  createdAt: true,
}).extend({
  message: z.string().min(1).max(5000),
});
export type InsertDisputeMessage = z.infer<typeof insertDisputeMessageSchema>;
export type DisputeMessage = typeof disputeMessages.$inferSelect;

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
export const messages: any = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "restrict" }), // RESTRICT for audit retention
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // Message text content
  messageType: text("message_type").notNull().default('text'), // 'text', 'file', 'meeting', 'system'
  metadata: jsonb("metadata"), // For file info, meeting details, etc.
  replyToId: varchar("reply_to_id").references((): any => messages.id), // For threaded messages
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
export const messageFiles: any = pgTable("message_files", {
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
  parentFileId: varchar("parent_file_id").references((): any => messageFiles.id, { onDelete: "set null" }), // SET NULL to preserve history
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

// Team Members
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  invitationToken: true,
  invitationSentAt: true,
  invitationExpiry: true,
  acceptedAt: true,
  revokedAt: true,
  revokedBy: true,
  userId: true,
}).extend({
  email: z.string().email("Invalid email address"),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
  status: z.enum(['pending', 'accepted', 'declined', 'revoked']).default('pending'),
});

export const updateTeamMemberSchema = insertTeamMemberSchema.partial().extend({
  id: z.string(),
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type UpdateTeamMember = z.infer<typeof updateTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

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
// Category type enum
export const categoryTypeEnum = z.enum([
  'human_services',
  'software_services', 
  'hardware_supply',
  'digital_marketing',
  'infrastructure',
  'cloud_services',
  'cybersecurity',
  'data_services'
]);
export const CATEGORY_TYPES = categoryTypeEnum.options;
export type CategoryType = z.infer<typeof categoryTypeEnum>;

// Verification badge enum
export const verificationBadgeEnum = z.enum(['verified', 'premium', 'expert']);
export const VERIFICATION_BADGES = verificationBadgeEnum.options;
export type VerificationBadge = z.infer<typeof verificationBadgeEnum>;

// Custom fields schema for dynamic category configuration with conditional validation
const baseCustomFieldSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  nameAr: z.string().optional(),
  type: z.enum(['text', 'number', 'select', 'multiselect', 'date', 'boolean', 'textarea', 'file']),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  placeholderAr: z.string().optional(),
  helpText: z.string().optional(),
  helpTextAr: z.string().optional(),
  displayOrder: z.number().optional(),
});

export const customFieldSchema = z.discriminatedUnion("type", [
  // Select/Multiselect - requires options
  baseCustomFieldSchema.extend({
    type: z.literal('select'),
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
      labelAr: z.string().optional(),
    })).min(1, "Select field must have at least one option"),
    validation: z.object({
      message: z.string().optional(),
    }).optional(),
  }),
  baseCustomFieldSchema.extend({
    type: z.literal('multiselect'),
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
      labelAr: z.string().optional(),
    })).min(1, "Multiselect field must have at least one option"),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      message: z.string().optional(),
    }).optional(),
  }),
  // Text/Textarea - allows pattern validation
  baseCustomFieldSchema.extend({
    type: z.literal('text'),
    options: z.undefined(),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      message: z.string().optional(),
    }).optional(),
  }),
  baseCustomFieldSchema.extend({
    type: z.literal('textarea'),
    options: z.undefined(),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      message: z.string().optional(),
    }).optional(),
  }),
  // Number - allows min/max validation
  baseCustomFieldSchema.extend({
    type: z.literal('number'),
    options: z.undefined(),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      message: z.string().optional(),
    }).optional(),
  }),
  // Date - allows min/max date validation
  baseCustomFieldSchema.extend({
    type: z.literal('date'),
    options: z.undefined(),
    validation: z.object({
      min: z.string().optional(), // ISO date string
      max: z.string().optional(), // ISO date string
      message: z.string().optional(),
    }).optional(),
  }),
  // Boolean - no special validation
  baseCustomFieldSchema.extend({
    type: z.literal('boolean'),
    options: z.undefined(),
    validation: z.object({
      message: z.string().optional(),
    }).optional(),
  }),
  // File - allows file type and size validation
  baseCustomFieldSchema.extend({
    type: z.literal('file'),
    options: z.undefined(),
    validation: z.object({
      maxSize: z.number().optional(), // in bytes
      allowedTypes: z.array(z.string()).optional(), // MIME types
      message: z.string().optional(),
    }).optional(),
  }),
]);

export const deliveryOptionsSchema = z.object({
  methods: z.array(z.string()).optional(),
  estimatedDays: z.record(z.string()).optional(),
  shippingFee: z.number().optional(),
  freeShippingThreshold: z.number().optional(),
});

export const warrantyConfigSchema = z.object({
  required: z.boolean().optional(),
  defaultDuration: z.string().optional(),
  options: z.array(z.string()).optional(),
  terms: z.string().optional(),
  termsAr: z.string().optional(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  level: z.number().min(0).max(2).default(0), // Enforce 3-level hierarchy (0, 1, 2)
  categoryType: categoryTypeEnum.optional(),
  requiresApproval: z.boolean().optional(),
  customFields: z.array(customFieldSchema).optional(),
  deliveryOptions: deliveryOptionsSchema.optional(),
  warrantyConfig: warrantyConfigSchema.optional(),
  complianceRequirements: z.array(z.string().min(1, "Compliance requirement cannot be empty")).optional(),
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type CustomField = z.infer<typeof customFieldSchema>;
export type DeliveryOptions = z.infer<typeof deliveryOptionsSchema>;
export type WarrantyConfig = z.infer<typeof warrantyConfigSchema>;

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

// Bids - with strict defensive validation for arrays and numeric fields
const bidPricingItemSchema = z.object({
  item: z.string().min(1, "Item description required"),
  quantity: z.coerce.number().positive("Quantity must be positive").finite("Quantity must be a valid number"),
  unitPrice: z.coerce.number().positive("Unit price must be positive").finite("Unit price must be a valid number"),
  total: z.coerce.number().positive("Total must be positive").finite("Total must be a valid number"),
}).strict().superRefine((data, ctx) => {
  if (!Number.isFinite(data.quantity) || !Number.isFinite(data.unitPrice) || !Number.isFinite(data.total)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "All numeric fields must be valid finite numbers (not NaN or Infinity)",
    });
  }
  if (data.quantity <= 0 || data.unitPrice <= 0 || data.total <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "All numeric fields must be positive",
    });
  }
});

const bidMilestoneSchema = z.object({
  description: z.string().min(1, "Milestone description required"),
  dueDate: z.string().min(1, "Due date required"),
  payment: z.coerce.number().positive("Payment must be positive").finite("Payment must be a valid number"),
}).strict().superRefine((data, ctx) => {
  if (!Number.isFinite(data.payment)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment must be a valid finite number (not NaN or Infinity)",
    });
  }
  if (data.payment <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment must be positive",
    });
  }
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  clientViewed: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  coverLetter: z.string().min(100, "Cover letter must be at least 100 characters"),
  proposedBudget: z.coerce.number().positive("Budget must be positive").finite("Budget must be a valid number"),
  pricingBreakdown: z.array(bidPricingItemSchema).optional(),
  milestones: z.array(bidMilestoneSchema).optional(),
});

export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;

// RFQ Invitations
export const insertRFQInvitationSchema = createInsertSchema(rfqInvitations).omit({
  id: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRFQInvitation = z.infer<typeof insertRFQInvitationSchema>;
export type RFQInvitation = typeof rfqInvitations.$inferSelect;

// Bid Shortlists
export const insertBidShortlistSchema = createInsertSchema(bidShortlists).omit({
  id: true,
  createdAt: true,
});

export type InsertBidShortlist = z.infer<typeof insertBidShortlistSchema>;
export type BidShortlist = typeof bidShortlists.$inferSelect;

// Bid Clarifications
export const insertBidClarificationSchema = createInsertSchema(bidClarifications).omit({
  id: true,
  answer: true,
  answeredAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  question: z.string().min(10, "Question must be at least 10 characters"),
});

export type InsertBidClarification = z.infer<typeof insertBidClarificationSchema>;
export type BidClarification = typeof bidClarifications.$inferSelect;

// Bid Views
export const insertBidViewSchema = createInsertSchema(bidViews).omit({
  id: true,
  createdAt: true,
});

export type InsertBidView = z.infer<typeof insertBidViewSchema>;
export type BidView = typeof bidViews.$inferSelect;

// Projects
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Milestone Comments
export const insertMilestoneCommentSchema = createInsertSchema(milestoneComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMilestoneComment = z.infer<typeof insertMilestoneCommentSchema>;
export type MilestoneComment = typeof milestoneComments.$inferSelect;

// Project Deliverables
export const deliverableStatusEnum = z.enum(['pending', 'approved', 'revision_requested', 'rejected']);
export const DELIVERABLE_STATUSES = deliverableStatusEnum.options;
export type DeliverableStatus = z.infer<typeof deliverableStatusEnum>;

export const insertProjectDeliverableSchema = createInsertSchema(projectDeliverables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
});

export type InsertProjectDeliverable = z.infer<typeof insertProjectDeliverableSchema>;
export type ProjectDeliverable = typeof projectDeliverables.$inferSelect;

// Project Team Members
export const insertProjectTeamMemberSchema = createInsertSchema(projectTeamMembers).omit({
  id: true,
  createdAt: true,
  addedAt: true,
});

export type InsertProjectTeamMember = z.infer<typeof insertProjectTeamMemberSchema>;
export type ProjectTeamMember = typeof projectTeamMembers.$inferSelect;

// Project Activity Log
export const insertProjectActivityLogSchema = createInsertSchema(projectActivityLog).omit({
  id: true,
  timestamp: true,
});

export type InsertProjectActivityLog = z.infer<typeof insertProjectActivityLogSchema>;
export type ProjectActivityLog = typeof projectActivityLog.$inferSelect;

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
  helpfulBy: true,
  editedAt: true,
  canEditUntil: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rating: z.number().min(1).max(5, "Rating must be between 1 and 5"),
  reviewType: z.enum(['for_consultant', 'for_client']),
  qualityRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  deadlineRating: z.number().min(1).max(5).optional(),
  professionalismRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  communicationClarityRating: z.number().min(1).max(5).optional(),
  requirementsClarityRating: z.number().min(1).max(5).optional(),
  paymentPromptnessRating: z.number().min(1).max(5).optional(),
  clientProfessionalismRating: z.number().min(1).max(5).optional(),
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Review Responses
export const insertReviewResponseSchema = createInsertSchema(reviewResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReviewResponse = z.infer<typeof insertReviewResponseSchema>;
export type ReviewResponse = typeof reviewResponses.$inferSelect;

// Review Reports
export const insertReviewReportSchema = createInsertSchema(reviewReports).omit({
  id: true,
  reviewedBy: true,
  reviewedAt: true,
  adminNotes: true,
  createdAt: true,
}).extend({
  reason: z.enum(['spam', 'inappropriate', 'fake', 'offensive', 'other']),
});

export type InsertReviewReport = z.infer<typeof insertReviewReportSchema>;
export type ReviewReport = typeof reviewReports.$inferSelect;

// Notifications
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  readAt: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Notification Preferences
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

// Saved Items
export const insertSavedItemSchema = createInsertSchema(savedItems).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;
export type SavedItem = typeof savedItems.$inferSelect;

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
  currentActiveJobs: true, // Auto-managed by system
}).extend({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  verificationBadge: verificationBadgeEnum.optional(),
  maxConcurrentJobs: z.number().min(1).max(100).optional(),
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
  'notification',
  
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

// Saved Searches table - Allow clients to save search criteria and get alerts
export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // User-given name for the saved search
  searchType: text("search_type").notNull(), // 'jobs' or 'consultants'
  // Search filters stored as JSONB for flexibility
  filters: jsonb("filters").notNull(), // { category, budget, skills, experience, location, rating, etc. }
  notificationsEnabled: boolean("notifications_enabled").default(false), // Alert user when new matches appear
  lastNotifiedAt: timestamp("last_notified_at"), // Track when we last sent a notification
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("saved_searches_user_id_idx").on(table.userId),
  searchTypeIdx: index("saved_searches_search_type_idx").on(table.searchType),
}));

export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;

// ============================================================================
// DELIVERY & FULFILLMENT SYSTEM - ZOD VALIDATORS AND TYPES
// ============================================================================

// 7.1 FOR SERVICES - FILE VERSIONING

// Deliverable Versions
export const insertDeliverableVersionSchema = createInsertSchema(deliverableVersions).omit({
  id: true,
  createdAt: true,
  uploadedAt: true,
}).extend({
  fileUrl: z.string().min(1, "File URL is required"),
  fileName: z.string().min(1, "File name is required"),
  versionNumber: z.number().int().positive("Version number must be positive"),
  versionNotes: z.string().optional(),
});
export type InsertDeliverableVersion = z.infer<typeof insertDeliverableVersionSchema>;
export type DeliverableVersion = typeof deliverableVersions.$inferSelect;

// Deliverable Downloads
export const insertDeliverableDownloadSchema = createInsertSchema(deliverableDownloads).omit({
  id: true,
  downloadedAt: true,
});
export type InsertDeliverableDownload = z.infer<typeof insertDeliverableDownloadSchema>;
export type DeliverableDownload = typeof deliverableDownloads.$inferSelect;

// 7.2 FOR HARDWARE - SHIPPING & QUALITY

// Hardware Shipments
export const shipmentStatusEnum = z.enum([
  'order_confirmed',
  'preparing_shipment',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'installed',
  'failed_delivery'
]);
export const SHIPMENT_STATUSES = shipmentStatusEnum.options;
export type ShipmentStatus = z.infer<typeof shipmentStatusEnum>;

export const shippingAddressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  phone: z.string().min(1, "Contact phone is required"),
  contactName: z.string().min(1, "Contact name is required"),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const insertHardwareShipmentSchema = createInsertSchema(hardwareShipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shippingAddress: shippingAddressSchema,
  status: shipmentStatusEnum.default('order_confirmed'),
});
export type InsertHardwareShipment = z.infer<typeof insertHardwareShipmentSchema>;
export type HardwareShipment = typeof hardwareShipments.$inferSelect;

// Quality Inspections
export const inspectionStatusEnum = z.enum(['pending', 'pass', 'fail', 'conditional_pass']);
export const inspectionTypeEnum = z.enum(['pre_shipment', 'upon_delivery', 'installation']);
export const INSPECTION_STATUSES = inspectionStatusEnum.options;
export const INSPECTION_TYPES = inspectionTypeEnum.options;

export const checklistItemSchema = z.object({
  item: z.string().min(1, "Checklist item is required"),
  status: z.enum(['pass', 'fail']),
  notes: z.string().optional(),
});

export const insertQualityInspectionSchema = createInsertSchema(qualityInspections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  inspectionDate: true,
}).extend({
  checklist: z.array(checklistItemSchema).min(1, "At least one checklist item required"),
  overallStatus: inspectionStatusEnum.default('pending'),
  inspectionType: inspectionTypeEnum,
});
export type InsertQualityInspection = z.infer<typeof insertQualityInspectionSchema>;
export type QualityInspection = typeof qualityInspections.$inferSelect;

// Returns and Replacements
export const returnRequestTypeEnum = z.enum(['return', 'replacement', 'repair']);
export const returnReasonEnum = z.enum(['defective', 'damaged', 'wrong_item', 'not_as_described', 'other']);
export const returnStatusEnum = z.enum(['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled']);
export const RETURN_REQUEST_TYPES = returnRequestTypeEnum.options;
export const RETURN_REASONS = returnReasonEnum.options;
export const RETURN_STATUSES = returnStatusEnum.options;

export const insertReturnReplacementSchema = createInsertSchema(returnsReplacements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  requestType: returnRequestTypeEnum,
  reason: returnReasonEnum,
  description: z.string().min(10, "Please provide a detailed description"),
  status: returnStatusEnum.default('pending'),
});
export type InsertReturnReplacement = z.infer<typeof insertReturnReplacementSchema>;
export type ReturnReplacement = typeof returnsReplacements.$inferSelect;

// Warranty Claims
export const warrantyClaimStatusEnum = z.enum([
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'in_repair',
  'completed',
  'cancelled'
]);
export const warrantyIssueTypeEnum = z.enum(['hardware_failure', 'software_issue', 'performance', 'other']);
export const WARRANTY_CLAIM_STATUSES = warrantyClaimStatusEnum.options;
export const WARRANTY_ISSUE_TYPES = warrantyIssueTypeEnum.options;

export const insertWarrantyClaimSchema = createInsertSchema(warrantyClaims).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  issueDescription: z.string().min(20, "Please provide a detailed issue description"),
  issueType: warrantyIssueTypeEnum,
  status: warrantyClaimStatusEnum.default('submitted'),
});
export type InsertWarrantyClaim = z.infer<typeof insertWarrantyClaimSchema>;
export type WarrantyClaim = typeof warrantyClaims.$inferSelect;

// 7.3 FOR SOFTWARE - LICENSE & SUBSCRIPTION

// Software Licenses
export const licenseTypeEnum = z.enum(['perpetual', 'subscription', 'trial', 'node_locked', 'floating']);
export const supportLevelEnum = z.enum(['basic', 'standard', 'premium', 'enterprise']);
export const LICENSE_TYPES = licenseTypeEnum.options;
export const SUPPORT_LEVELS = supportLevelEnum.options;

export const insertSoftwareLicenseSchema = createInsertSchema(softwareLicenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  issuedAt: true,
}).extend({
  licenseKey: z.string().min(1, "License key is required").optional(), // Auto-generated if not provided
  licenseType: licenseTypeEnum,
  productName: z.string().min(1, "Product name is required"),
  maxActivations: z.number().int().min(-1, "Max activations must be -1 (unlimited) or positive"),
});
export type InsertSoftwareLicense = z.infer<typeof insertSoftwareLicenseSchema>;
export type SoftwareLicense = typeof softwareLicenses.$inferSelect;

// Software Subscriptions
export const subscriptionStatusEnum = z.enum(['active', 'cancelled', 'expired', 'suspended', 'grace_period']);
export const billingCycleEnum = z.enum(['monthly', 'quarterly', 'annual', 'biennial']);
export const SUBSCRIPTION_STATUSES = subscriptionStatusEnum.options;
export const BILLING_CYCLES = billingCycleEnum.options;

export const insertSoftwareSubscriptionSchema = createInsertSchema(softwareSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  subscriptionPlan: z.string().min(1, "Subscription plan is required"),
  billingCycle: billingCycleEnum,
  pricePerCycle: z.number().positive("Price must be positive"),
  status: subscriptionStatusEnum.default('active'),
});
export type InsertSoftwareSubscription = z.infer<typeof insertSoftwareSubscriptionSchema>;
export type SoftwareSubscription = typeof softwareSubscriptions.$inferSelect;

// Software Activations
export const deviceTypeEnum = z.enum(['desktop', 'laptop', 'server', 'mobile', 'vm']);
export const DEVICE_TYPES = deviceTypeEnum.options;

export const insertSoftwareActivationSchema = createInsertSchema(softwareActivations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  activatedAt: true,
}).extend({
  deviceId: z.string().min(1, "Device ID is required"),
  deviceType: deviceTypeEnum.optional(),
});
export type InsertSoftwareActivation = z.infer<typeof insertSoftwareActivationSchema>;
export type SoftwareActivation = typeof softwareActivations.$inferSelect;

// ============================================================================
// PAYMENT & ESCROW SYSTEM
// ============================================================================

// 8.1 ESCROW ACCOUNTS - Master escrow tracking per project
export const escrowAccounts = pgTable("escrow_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default('0.00'), // Total project value
  availableBalance: decimal("available_balance", { precision: 12, scale: 2 }).notNull().default('0.00'), // Available to release
  onHoldAmount: decimal("on_hold_amount", { precision: 12, scale: 2 }).notNull().default('0.00'), // Temporarily held
  releasedAmount: decimal("released_amount", { precision: 12, scale: 2 }).notNull().default('0.00'), // Already paid to consultant
  refundedAmount: decimal("refunded_amount", { precision: 12, scale: 2 }).notNull().default('0.00'), // Refunded to client
  currency: text("currency").notNull().default('SAR'), // Always SAR (Saudi Riyal)
  status: text("status").notNull().default('pending'), // pending, active, completed, refunded
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const escrowStatusEnum = z.enum(['pending', 'active', 'completed', 'refunded', 'cancelled']);
export const ESCROW_STATUSES = escrowStatusEnum.options;

export const insertEscrowAccountSchema = createInsertSchema(escrowAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  status: escrowStatusEnum.default('pending'),
});
export type InsertEscrowAccount = z.infer<typeof insertEscrowAccountSchema>;
export type EscrowAccount = typeof escrowAccounts.$inferSelect;

// 8.2 ESCROW TRANSACTIONS - All escrow movements
export const escrowTransactions = pgTable("escrow_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  escrowAccountId: varchar("escrow_account_id").notNull().references(() => escrowAccounts.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // deposit, release, partial_release, hold, unhold, refund
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default('completed'), // pending, completed, failed, cancelled
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  relatedMilestoneIndex: integer("related_milestone_index"), // Optional link to milestone in project's milestones array
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const escrowTransactionTypeEnum = z.enum([
  'deposit',
  'release',
  'partial_release',
  'hold',
  'unhold',
  'refund'
]);
export const escrowTransactionStatusEnum = z.enum(['pending', 'completed', 'failed', 'cancelled']);
export const ESCROW_TRANSACTION_TYPES = escrowTransactionTypeEnum.options;
export const ESCROW_TRANSACTION_STATUSES = escrowTransactionStatusEnum.options;

export const insertEscrowTransactionSchema = createInsertSchema(escrowTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  type: escrowTransactionTypeEnum,
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  status: escrowTransactionStatusEnum.default('completed'),
});
export type InsertEscrowTransaction = z.infer<typeof insertEscrowTransactionSchema>;
export type EscrowTransaction = typeof escrowTransactions.$inferSelect;

// 8.3 PAYMENT MILESTONES - Link project milestones to payments
export const paymentMilestones = pgTable("payment_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  milestoneIndex: integer("milestone_index"), // Index of milestone in project's milestones array
  milestoneTitle: text("milestone_title"), // Title for display purposes
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default('pending'), // pending_deposit, in_escrow, released, refunded
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  releasedBy: varchar("released_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentMilestoneStatusEnum = z.enum([
  'pending_deposit',
  'in_escrow',
  'released',
  'refunded',
  'cancelled'
]);
export const PAYMENT_MILESTONE_STATUSES = paymentMilestoneStatusEnum.options;

export const insertPaymentMilestoneSchema = createInsertSchema(paymentMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  paidAt: true,
}).extend({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  status: paymentMilestoneStatusEnum.default('pending_deposit'),
});
export type InsertPaymentMilestone = z.infer<typeof insertPaymentMilestoneSchema>;
export type PaymentMilestone = typeof paymentMilestones.$inferSelect;

// 8.4 INVOICES - Invoice generation and tracking
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number").notNull().unique(), // Auto-generated: INV-2025-001
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  clientId: varchar("client_id").notNull().references(() => users.id),
  consultantId: varchar("consultant_id").notNull().references(() => users.id),
  items: jsonb("items").notNull(), // Array of {description, quantity, unitPrice, total}
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull().default('15.00'), // 15% VAT for Saudi Arabia
  vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default('SAR'),
  status: text("status").notNull().default('draft'), // draft, sent, paid, overdue, cancelled
  notes: text("notes"),
  paymentTerms: text("payment_terms"), // e.g., "Net 30 days"
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceStatusEnum = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']);
export const INVOICE_STATUSES = invoiceStatusEnum.options;

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
  total: z.number().nonnegative("Total cannot be negative"),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  paidAt: true,
  issueDate: true,
}).extend({
  invoiceNumber: z.string().optional(), // Auto-generated if not provided
  items: z.array(invoiceItemSchema).min(1, "At least one item required"),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  vatAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  status: invoiceStatusEnum.default('draft'),
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// 8.5 WALLET ACCOUNTS - User wallet balances
export const walletAccounts = pgTable("wallet_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default('0.00'),
  currency: text("currency").notNull().default('SAR'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWalletAccountSchema = createInsertSchema(walletAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWalletAccount = z.infer<typeof insertWalletAccountSchema>;
export type WalletAccount = typeof walletAccounts.$inferSelect;

// 8.6 WALLET TRANSACTIONS - Wallet activity log
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAccountId: varchar("wallet_account_id").notNull().references(() => walletAccounts.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // add_funds, withdraw, payment, refund, release
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  relatedProjectId: varchar("related_project_id").references(() => projects.id),
  description: text("description"),
  balanceBefore: decimal("balance_before", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const walletTransactionTypeEnum = z.enum([
  'add_funds',
  'withdraw',
  'payment',
  'refund',
  'release'
]);
export const WALLET_TRANSACTION_TYPES = walletTransactionTypeEnum.options;

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  type: walletTransactionTypeEnum,
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  balanceBefore: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  balanceAfter: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
});
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

// 8.7 REFUND REQUESTS - Refund workflow tracking
export const refundRequests = pgTable("refund_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default('pending'), // pending, approved, rejected, processed
  adminId: varchar("admin_id").references(() => users.id), // Admin who reviewed
  adminNotes: text("admin_notes"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const refundStatusEnum = z.enum(['pending', 'approved', 'rejected', 'processed', 'cancelled']);
export const REFUND_STATUSES = refundStatusEnum.options;

export const insertRefundRequestSchema = createInsertSchema(refundRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  requestedAt: true,
  reviewedAt: true,
  processedAt: true,
}).extend({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  reason: z.string().min(10, "Please provide a detailed reason for the refund"),
  status: refundStatusEnum.default('pending'),
});
export type InsertRefundRequest = z.infer<typeof insertRefundRequestSchema>;
export type RefundRequest = typeof refundRequests.$inferSelect;

// 8.8 TAX PROFILES - User VAT configuration (Saudi Arabia)
export const taxProfiles = pgTable("tax_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  vatNumber: varchar("vat_number"), // Saudi VAT format: 15 digits
  businessName: text("business_name"),
  billingAddress: text("billing_address"),
  isVatExempt: boolean("is_vat_exempt").default(false),
  exemptionReason: text("exemption_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaxProfileSchema = createInsertSchema(taxProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  vatNumber: z.string().regex(/^\d{15}$/, "Saudi VAT number must be 15 digits").optional(),
});
export type InsertTaxProfile = z.infer<typeof insertTaxProfileSchema>;
export type TaxProfile = typeof taxProfiles.$inferSelect;

// 8.9 PAYMENT PREFERENCES - User payment settings
export const paymentPreferences = pgTable("payment_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  preferredMethod: text("preferred_method").default('wallet'), // wallet, bank_transfer (mock)
  autoWithdrawal: boolean("auto_withdrawal").default(false), // Auto-withdraw earnings to bank
  minimumBalance: decimal("minimum_balance", { precision: 12, scale: 2 }).default('0.00'), // Min balance before auto-withdrawal
  notificationsEnabled: boolean("notifications_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentPreferencesSchema = createInsertSchema(paymentPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentPreferences = z.infer<typeof insertPaymentPreferencesSchema>;
export type PaymentPreferences = typeof paymentPreferences.$inferSelect;

// ============================================================================
// 11. SEARCH & DISCOVERY SYSTEM - Additional Tables
// ============================================================================

// 11.1 SEARCH HISTORY - Track user search queries for recent searches
export const searchHistory = pgTable("search_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  searchType: text("search_type").notNull(), // 'requirements' | 'consultants'
  query: varchar("query", { length: 500 }), // Search keywords
  filters: jsonb("filters"), // Applied filters
  resultsCount: integer("results_count").default(0).notNull(), // Number of results found
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("search_history_user_id_idx").on(table.userId),
  createdAtIdx: index("search_history_created_at_idx").on(table.createdAt),
}));

export const searchTypeEnum = z.enum(['requirements', 'consultants']);
export const SEARCH_TYPES = searchTypeEnum.options;

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  createdAt: true,
}).extend({
  searchType: searchTypeEnum,
  query: z.string().max(500).optional(),
  filters: z.record(z.any()).optional(),
  resultsCount: z.number().int().min(0).default(0),
});
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;

// 11.2 VENDOR LISTS - Client-created lists to organize consultants
export const vendorLists = pgTable("vendor_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Client only
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("vendor_lists_user_id_idx").on(table.userId),
}));

export const insertVendorListSchema = createInsertSchema(vendorLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "List name is required").max(255),
  description: z.string().max(1000).optional(),
});
export type InsertVendorList = z.infer<typeof insertVendorListSchema>;
export type VendorList = typeof vendorLists.$inferSelect;

// 11.3 VENDOR LIST ITEMS - Consultants saved to specific lists
export const vendorListItems = pgTable("vendor_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").notNull().references(() => vendorLists.id, { onDelete: "cascade" }),
  consultantId: varchar("consultant_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Must be a consultant
  notes: text("notes"), // Client notes about this consultant
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => ({
  listIdIdx: index("vendor_list_items_list_id_idx").on(table.listId),
  consultantIdIdx: index("vendor_list_items_consultant_id_idx").on(table.consultantId),
  uniqueListConsultant: uniqueIndex("vendor_list_items_list_consultant_unique").on(table.listId, table.consultantId),
}));

export const insertVendorListItemSchema = createInsertSchema(vendorListItems).omit({
  id: true,
  addedAt: true,
}).extend({
  notes: z.string().max(2000).optional(),
});
export type InsertVendorListItem = z.infer<typeof insertVendorListItemSchema>;
export type VendorListItem = typeof vendorListItems.$inferSelect;

// 11.4 SAVED REQUIREMENTS - Consultants' saved/bookmarked jobs
export const savedRequirements = pgTable("saved_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consultantId: varchar("consultant_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Must be a consultant
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  notes: text("notes"), // Consultant's private notes about this job
  folderId: varchar("folder_id"), // For future folder organization
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  consultantIdIdx: index("saved_requirements_consultant_id_idx").on(table.consultantId),
  jobIdIdx: index("saved_requirements_job_id_idx").on(table.jobId),
  uniqueConsultantJob: uniqueIndex("saved_requirements_consultant_job_unique").on(table.consultantId, table.jobId),
}));

export const insertSavedRequirementSchema = createInsertSchema(savedRequirements).omit({
  id: true,
  createdAt: true,
}).extend({
  notes: z.string().max(2000).optional(),
});
export type InsertSavedRequirement = z.infer<typeof insertSavedRequirementSchema>;
export type SavedRequirement = typeof savedRequirements.$inferSelect;

// 11.5 BLOCKED USERS - User blocking for privacy and safety
export const blockedUsers = pgTable("blocked_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who blocks
  blockedId: varchar("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User being blocked
  reason: text("reason"), // Optional reason for blocking
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  blockerIdIdx: index("blocked_users_blocker_id_idx").on(table.blockerId),
  blockedIdIdx: index("blocked_users_blocked_id_idx").on(table.blockedId),
  uniqueBlockerBlocked: uniqueIndex("blocked_users_blocker_blocked_unique").on(table.blockerId, table.blockedId),
}));

export const insertBlockedUserSchema = createInsertSchema(blockedUsers).omit({
  id: true,
  createdAt: true,
}).extend({
  reason: z.string().max(500).optional(),
});
export type InsertBlockedUser = z.infer<typeof insertBlockedUserSchema>;
export type BlockedUser = typeof blockedUsers.$inferSelect;

// ============================================================================
// 15. ANALYTICS & REPORTING SYSTEM
// ============================================================================

// Note: Analytics tables are NOT used for storage. All analytics are calculated
// in real-time from existing data (payments, projects, bids, jobs).
// These table definitions are kept for future caching optimization if needed.

// 15.1 VENDOR ANALYTICS SUMMARY - Pre-calculated consultant analytics (future optimization)
export const vendorAnalyticsSummary = pgTable("vendor_analytics_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodType: text("period_type").notNull(), // 'daily', 'weekly', 'monthly'
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalEarnings: varchar("total_earnings").notNull().default('0.00'), // SAR amount
  projectsCompleted: integer("projects_completed").default(0).notNull(),
  bidWinRate: decimal("bid_win_rate", { precision: 5, scale: 2 }).default('0.00'), // 0.00 to 1.00
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }).default('0.00'), // 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("vendor_analytics_user_id_idx").on(table.userId),
  periodIdx: index("vendor_analytics_period_idx").on(table.periodType, table.periodStart),
}));

export const insertVendorAnalyticsSummarySchema = createInsertSchema(vendorAnalyticsSummary).omit({
  id: true,
  createdAt: true,
});
export type InsertVendorAnalyticsSummary = z.infer<typeof insertVendorAnalyticsSummarySchema>;
export type VendorAnalyticsSummary = typeof vendorAnalyticsSummary.$inferSelect;

// 15.2 CLIENT ANALYTICS SUMMARY - Pre-calculated client analytics (future optimization)
export const clientAnalyticsSummary = pgTable("client_analytics_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodType: text("period_type").notNull(), // 'daily', 'weekly', 'monthly'
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalSpending: varchar("total_spending").notNull().default('0.00'), // SAR amount
  projectsPosted: integer("projects_posted").default(0).notNull(),
  projectsCompleted: integer("projects_completed").default(0).notNull(),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).default('0.00'), // 0.00 to 1.00
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("client_analytics_user_id_idx").on(table.userId),
  periodIdx: index("client_analytics_period_idx").on(table.periodType, table.periodStart),
}));

export const insertClientAnalyticsSummarySchema = createInsertSchema(clientAnalyticsSummary).omit({
  id: true,
  createdAt: true,
});
export type InsertClientAnalyticsSummary = z.infer<typeof insertClientAnalyticsSummarySchema>;
export type ClientAnalyticsSummary = typeof clientAnalyticsSummary.$inferSelect;

// 15.3 PLATFORM ANALYTICS SUMMARY - Platform-wide analytics (admin only, future optimization)
export const platformAnalyticsSummary = pgTable("platform_analytics_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  periodType: text("period_type").notNull(), // 'daily', 'weekly', 'monthly'
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalUsers: integer("total_users").default(0).notNull(),
  totalClients: integer("total_clients").default(0).notNull(),
  totalConsultants: integer("total_consultants").default(0).notNull(),
  newRegistrations: integer("new_registrations").default(0).notNull(),
  activeProjects: integer("active_projects").default(0).notNull(),
  totalGMV: varchar("total_gmv").notNull().default('0.00'), // Gross Merchandise Value
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  periodIdx: index("platform_analytics_period_idx").on(table.periodType, table.periodStart),
}));

export const insertPlatformAnalyticsSummarySchema = createInsertSchema(platformAnalyticsSummary).omit({
  id: true,
  createdAt: true,
});
export type InsertPlatformAnalyticsSummary = z.infer<typeof insertPlatformAnalyticsSummarySchema>;
export type PlatformAnalyticsSummary = typeof platformAnalyticsSummary.$inferSelect;

// ============================================================================
// 16. SUPPORT TICKETS SYSTEM
// ============================================================================

// Support Tickets - General platform support (different from project disputes)
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // 'technical', 'payment', 'account', 'feature_request', 'bug_report', 'general'
  priority: text("priority").notNull().default('medium'), // 'low', 'medium', 'high', 'urgent'
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default('open'), // 'open', 'in_progress', 'waiting_user', 'resolved', 'closed'
  assignedTo: varchar("assigned_to").references(() => users.id), // Admin user assigned to handle ticket
  assignedAt: timestamp("assigned_at"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  // User satisfaction
  satisfactionRating: integer("satisfaction_rating"), // 1-5 stars
  satisfactionComment: text("satisfaction_comment"),
  ratedAt: timestamp("rated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("support_tickets_user_id_idx").on(table.userId),
  statusIdx: index("support_tickets_status_idx").on(table.status),
  categoryIdx: index("support_tickets_category_idx").on(table.category),
  priorityIdx: index("support_tickets_priority_idx").on(table.priority),
  assignedToIdx: index("support_tickets_assigned_to_idx").on(table.assignedTo),
  createdAtIdx: index("support_tickets_created_at_idx").on(table.createdAt),
}));

export const ticketCategoryEnum = z.enum(['technical', 'payment', 'account', 'feature_request', 'bug_report', 'general']);
export const ticketPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export const ticketStatusEnum = z.enum(['open', 'in_progress', 'waiting_user', 'resolved', 'closed']);

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true,
  resolvedAt: true,
  closedAt: true,
  ratedAt: true,
}).extend({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(10000),
  category: ticketCategoryEnum,
  priority: ticketPriorityEnum.default('medium'),
});
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Support Ticket Messages - Communication thread for tickets
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isStaffReply: boolean("is_staff_reply").default(false), // True if sent by admin/support staff
  isInternal: boolean("is_internal").default(false), // Internal note visible only to staff
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ticketIdIdx: index("ticket_messages_ticket_id_idx").on(table.ticketId),
  senderIdIdx: index("ticket_messages_sender_id_idx").on(table.senderId),
  createdAtIdx: index("ticket_messages_created_at_idx").on(table.createdAt),
}));

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
}).extend({
  message: z.string().min(1).max(10000),
});
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;

// Support Ticket Attachments - File uploads for tickets
export const ticketAttachments = pgTable("ticket_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  messageId: varchar("message_id").references(() => ticketMessages.id, { onDelete: "cascade" }), // null if attached to ticket creation
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // 'document', 'image', 'video', 'screenshot', 'log'
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (table) => ({
  ticketIdIdx: index("ticket_attachments_ticket_id_idx").on(table.ticketId),
  messageIdIdx: index("ticket_attachments_message_id_idx").on(table.messageId),
  uploadedByIdx: index("ticket_attachments_uploaded_by_idx").on(table.uploadedBy),
}));

export const insertTicketAttachmentSchema = createInsertSchema(ticketAttachments).omit({
  id: true,
  uploadedAt: true,
}).extend({
  fileName: z.string().max(255),
  fileType: z.enum(['document', 'image', 'video', 'screenshot', 'log']),
});
export type InsertTicketAttachment = z.infer<typeof insertTicketAttachmentSchema>;
export type TicketAttachment = typeof ticketAttachments.$inferSelect;

// ============================================================================
// 17. PLATFORM FEEDBACK SYSTEM
// ============================================================================

// Platform Feedback - General user feedback about platform experience
export const platformFeedback = pgTable("platform_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Null for anonymous feedback
  feedbackType: text("feedback_type").notNull(), // 'general', 'bug_report', 'feature_request', 'improvement'
  category: text("category"), // 'ui_ux', 'performance', 'functionality', 'content', 'other'
  rating: integer("rating"), // 1-5 stars for overall platform experience
  subject: text("subject"),
  message: text("message").notNull(),
  url: text("url"), // Page where feedback was submitted
  browser: text("browser"),
  device: text("device"),
  status: text("status").notNull().default('new'), // 'new', 'reviewed', 'planned', 'in_progress', 'completed', 'rejected'
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("platform_feedback_user_id_idx").on(table.userId),
  feedbackTypeIdx: index("platform_feedback_type_idx").on(table.feedbackType),
  statusIdx: index("platform_feedback_status_idx").on(table.status),
  createdAtIdx: index("platform_feedback_created_at_idx").on(table.createdAt),
}));

export const feedbackTypeEnum = z.enum(['general', 'bug_report', 'feature_request', 'improvement']);
export const feedbackCategoryEnum = z.enum(['ui_ux', 'performance', 'functionality', 'content', 'other']);
export const feedbackStatusEnum = z.enum(['new', 'reviewed', 'planned', 'in_progress', 'completed', 'rejected']);

export const insertPlatformFeedbackSchema = createInsertSchema(platformFeedback).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
}).extend({
  message: z.string().min(10, "Feedback must be at least 10 characters").max(5000),
  feedbackType: feedbackTypeEnum,
  category: feedbackCategoryEnum.optional(),
  rating: z.number().int().min(1).max(5).optional(),
  status: feedbackStatusEnum.default('new'),
});
export type InsertPlatformFeedback = z.infer<typeof insertPlatformFeedbackSchema>;
export type PlatformFeedback = typeof platformFeedback.$inferSelect;

// Feature Suggestions - Specific feature requests with voting
export const featureSuggestions = pgTable("feature_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category"), // 'client_features', 'consultant_features', 'admin_features', 'general'
  priority: text("priority").default('medium'), // 'low', 'medium', 'high'
  status: text("status").notNull().default('submitted'), // 'submitted', 'under_review', 'planned', 'in_progress', 'completed', 'rejected'
  voteCount: integer("vote_count").default(0).notNull(),
  implementedIn: text("implemented_in"), // Version/release where it was implemented
  adminResponse: text("admin_response"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("feature_suggestions_user_id_idx").on(table.userId),
  statusIdx: index("feature_suggestions_status_idx").on(table.status),
  voteCountIdx: index("feature_suggestions_vote_count_idx").on(table.voteCount),
  createdAtIdx: index("feature_suggestions_created_at_idx").on(table.createdAt),
}));

export const insertFeatureSuggestionSchema = createInsertSchema(featureSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  voteCount: true,
}).extend({
  title: z.string().min(10, "Title must be at least 10 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
});
export type InsertFeatureSuggestion = z.infer<typeof insertFeatureSuggestionSchema>;
export type FeatureSuggestion = typeof featureSuggestions.$inferSelect;

// Feature Votes - Track who voted for which features
export const featureVotes = pgTable("feature_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  featureId: varchar("feature_id").notNull().references(() => featureSuggestions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  featureIdIdx: index("feature_votes_feature_id_idx").on(table.featureId),
  userIdIdx: index("feature_votes_user_id_idx").on(table.userId),
  uniqueVote: uniqueIndex("feature_votes_unique_vote").on(table.featureId, table.userId),
}));

export const insertFeatureVoteSchema = createInsertSchema(featureVotes).omit({
  id: true,
  createdAt: true,
});
export type InsertFeatureVote = z.infer<typeof insertFeatureVoteSchema>;
export type FeatureVote = typeof featureVotes.$inferSelect;

// User Surveys - Platform-wide surveys created by admins
export const userSurveys = pgTable("user_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(), // Array of question objects with type, options, etc.
  targetAudience: text("target_audience").notNull().default('all'), // 'all', 'clients', 'consultants', 'specific_segment'
  status: text("status").notNull().default('draft'), // 'draft', 'active', 'closed', 'archived'
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  responseCount: integer("response_count").default(0).notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("user_surveys_status_idx").on(table.status),
  targetAudienceIdx: index("user_surveys_target_audience_idx").on(table.targetAudience),
  createdAtIdx: index("user_surveys_created_at_idx").on(table.createdAt),
}));

export const insertUserSurveySchema = createInsertSchema(userSurveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  responseCount: true,
}).extend({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  questions: z.any(), // Complex validation for question structure
});
export type InsertUserSurvey = z.infer<typeof insertUserSurveySchema>;
export type UserSurvey = typeof userSurveys.$inferSelect;

// Survey Responses - User responses to surveys
export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => userSurveys.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Null for anonymous responses
  answers: jsonb("answers").notNull(), // Array of answer objects matching questions
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => ({
  surveyIdIdx: index("survey_responses_survey_id_idx").on(table.surveyId),
  userIdIdx: index("survey_responses_user_id_idx").on(table.userId),
  uniqueResponse: uniqueIndex("survey_responses_unique_response").on(table.surveyId, table.userId),
}));

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  completedAt: true,
}).extend({
  answers: z.any(), // Complex validation for answers structure
});
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

// Beta Features Opt-in - Users who want to test beta features
export const betaOptIns = pgTable("beta_opt_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  featureName: text("feature_name").notNull(), // Name of beta feature
  optedInAt: timestamp("opted_in_at").defaultNow().notNull(),
  optedOutAt: timestamp("opted_out_at"),
  feedbackProvided: boolean("feedback_provided").default(false),
}, (table) => ({
  userIdIdx: index("beta_opt_ins_user_id_idx").on(table.userId),
  featureNameIdx: index("beta_opt_ins_feature_name_idx").on(table.featureName),
  uniqueOptIn: uniqueIndex("beta_opt_ins_unique_opt_in").on(table.userId, table.featureName),
}));

export const insertBetaOptInSchema = createInsertSchema(betaOptIns).omit({
  id: true,
  optedInAt: true,
}).extend({
  featureName: z.string().min(1).max(100),
});
export type InsertBetaOptIn = z.infer<typeof insertBetaOptInSchema>;
export type BetaOptIn = typeof betaOptIns.$inferSelect;

// ============================================================================
// CONTENT MODERATION & FLAGGING SYSTEM
// ============================================================================

// Flagged Requirements - User-reported or auto-flagged job postings
export const flaggedRequirements = pgTable("flagged_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requirementId: varchar("requirement_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  reportedBy: varchar("reported_by").references(() => users.id, { onDelete: "set null" }), // Null if auto-flagged
  reportType: text("report_type").notNull(), // 'user_report', 'auto_flag', 'admin_review'
  reason: text("reason").notNull(), // 'inappropriate', 'spam', 'misleading', 'duplicate', 'offensive', 'fraud', etc.
  description: text("description"), // Additional details from reporter
  status: text("status").default('pending'), // 'pending', 'under_review', 'resolved', 'dismissed'
  severity: text("severity").default('medium'), // 'low', 'medium', 'high', 'critical'
  autoFlagScore: integer("auto_flag_score"), // 0-100 confidence score if auto-flagged
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  resolution: text("resolution"), // Admin's decision/notes
  actionTaken: text("action_taken"), // 'removed', 'edited', 'warning_sent', 'dismissed', 'no_action'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  requirementIdIdx: index("flagged_requirements_requirement_id_idx").on(table.requirementId),
  statusIdx: index("flagged_requirements_status_idx").on(table.status),
  severityIdx: index("flagged_requirements_severity_idx").on(table.severity),
}));

export const insertFlaggedRequirementSchema = createInsertSchema(flaggedRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFlaggedRequirement = z.infer<typeof insertFlaggedRequirementSchema>;
export type FlaggedRequirement = typeof flaggedRequirements.$inferSelect;

// Flagged Bids - User-reported or auto-flagged bid submissions
export const flaggedBids = pgTable("flagged_bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bidId: varchar("bid_id").notNull().references(() => bids.id, { onDelete: "cascade" }),
  reportedBy: varchar("reported_by").references(() => users.id, { onDelete: "set null" }),
  reportType: text("report_type").notNull(), // 'user_report', 'auto_flag', 'price_anomaly', 'suspicious_pattern'
  reason: text("reason").notNull(), // 'lowball_bid', 'price_manipulation', 'spam', 'inappropriate', 'fraud'
  description: text("description"),
  status: text("status").default('pending'),
  severity: text("severity").default('medium'),
  autoFlagScore: integer("auto_flag_score"),
  priceDeviation: decimal("price_deviation", { precision: 10, scale: 2 }), // % deviation from average
  suspiciousPatterns: jsonb("suspicious_patterns"), // {rapidBidding: true, unusualPricing: true}
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  resolution: text("resolution"),
  actionTaken: text("action_taken"), // 'removed', 'warning_sent', 'vendor_suspended', 'dismissed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  bidIdIdx: index("flagged_bids_bid_id_idx").on(table.bidId),
  statusIdx: index("flagged_bids_status_idx").on(table.status),
  severityIdx: index("flagged_bids_severity_idx").on(table.severity),
}));

export const insertFlaggedBidSchema = createInsertSchema(flaggedBids).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFlaggedBid = z.infer<typeof insertFlaggedBidSchema>;
export type FlaggedBid = typeof flaggedBids.$inferSelect;

// Flagged Messages - Inappropriate or policy-violating messages
export const flaggedMessages = pgTable("flagged_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  reportedBy: varchar("reported_by").references(() => users.id, { onDelete: "set null" }),
  reportType: text("report_type").notNull(), // 'user_report', 'auto_flag', 'profanity_detected', 'spam_detected'
  reason: text("reason").notNull(), // 'harassment', 'profanity', 'spam', 'inappropriate', 'scam', 'personal_info'
  description: text("description"),
  status: text("status").default('pending'),
  severity: text("severity").default('medium'),
  autoFlagScore: integer("auto_flag_score"),
  detectedPatterns: jsonb("detected_patterns"), // {profanity: true, spam: true, personalInfo: true}
  messageContent: text("message_content"), // Snapshot of message for review (in case original is edited)
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  resolution: text("resolution"),
  actionTaken: text("action_taken"), // 'message_removed', 'user_warned', 'user_suspended', 'dismissed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  messageIdIdx: index("flagged_messages_message_id_idx").on(table.messageId),
  conversationIdIdx: index("flagged_messages_conversation_id_idx").on(table.conversationId),
  statusIdx: index("flagged_messages_status_idx").on(table.status),
  severityIdx: index("flagged_messages_severity_idx").on(table.severity),
}));

export const insertFlaggedMessageSchema = createInsertSchema(flaggedMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFlaggedMessage = z.infer<typeof insertFlaggedMessageSchema>;
export type FlaggedMessage = typeof flaggedMessages.$inferSelect;

// Content Filter Rules - Admin-defined rules for auto-flagging
export const contentFilterRules = pgTable("content_filter_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Rule name (e.g., "Profanity Filter", "Price Manipulation")
  contentType: text("content_type").notNull(), // 'requirement', 'bid', 'message'
  filterType: text("filter_type").notNull(), // 'keyword', 'regex', 'price_threshold', 'pattern'
  pattern: text("pattern").notNull(), // Keyword, regex pattern, or JSON config
  action: text("action").notNull(), // 'flag', 'auto_remove', 'require_review', 'notify_admin'
  severity: text("severity").default('medium'), // Auto-assigned severity
  enabled: boolean("enabled").default(true),
  caseSensitive: boolean("case_sensitive").default(false),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  contentTypeIdx: index("content_filter_rules_content_type_idx").on(table.contentType),
  enabledIdx: index("content_filter_rules_enabled_idx").on(table.enabled),
}));

export const insertContentFilterRuleSchema = createInsertSchema(contentFilterRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertContentFilterRule = z.infer<typeof insertContentFilterRuleSchema>;
export type ContentFilterRule = typeof contentFilterRules.$inferSelect;
