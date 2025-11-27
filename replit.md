# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace connecting businesses with IT service vendors. It facilitates project posting, competitive bidding, and comprehensive project lifecycle management, including payments, deliverable tracking, and real-time communication. The platform aims to enhance efficiency and transparency in the B2B IT sector, aspiring to be a leading solution for IT service procurement.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (Nov 27, 2025)
**UserLayout Unified Navigation System:**
- Implemented consistent role-based left navigation across 19 authenticated pages
- **Pages with UserLayout** (role-based nav with notifications, theme toggle, language switcher, user avatar):
  - Critical pages: Dashboard, PostJob, BrowseJobs, BrowseConsultants, ClientProfile
  - Consultant pages: FindProjectsPage, CreateInvoicePage, SavedRequirementsPage
  - Client pages: FindConsultantsPage, VendorListsPage, CompareConsultantsPage
  - Dispute pages: RaiseDispute, MyDisputes
  - Support pages: MySupportTickets, PlatformFeedback
  - Help pages: HelpCenter, FAQPage, KnowledgeBase, ContactSupport
- **Intentional Exceptions** (no UserLayout by design):
  - ProfileCompletion: Onboarding wizard with custom progress nav and "Skip for Now" button
  - Messages: Full-screen messaging interface with its own conversation sidebar (avoid double-sidebar confusion)
- **Code Quality Improvements:**
  - Fixed apiRequest usage across all modified pages (correct signature: method, url, data)
  - Added proper TypeScript typing to all useQuery hooks with default empty arrays
  - Fixed FormData upload in ContactSupport to use raw fetch instead of apiRequest
  - All LSP errors resolved (21 diagnostics fixed across 6 files)
- **Architecture:** UserLayout component provides consistent left navigation, replacing previous Header component pattern on many pages while preserving special-purpose layouts where appropriate

## Previous Changes (Nov 26, 2025)
**Subscription Plan Role-Based Filtering:**
- Fixed registration flow to show only role-appropriate subscription plans
- Backend: Updated `/api/subscription-plans` endpoint to use OR logic for audience filtering
- Now returns plans where `audience = {requested_role}` OR `audience = 'both'`
- Frontend: Updated Register.tsx to pass `audience` query parameter based on selected role
- Query key includes role for proper cache segmentation
- Clients now see only client plans + shared plans (audience='both')
- Consultants now see only consultant plans + shared plans (audience='both')
- End-to-end tested with both role signup flows

**Admin Portal Wouter Nested Routing Fix (Nov 25):**
- Fixed admin routing to properly use Wouter v3's `nest` prop for nested routes
- App.tsx: Changed `/admin/:rest*` wildcard route to `/admin` with `nest` prop and updated root redirect to use relative path
- AdminRouter: Changed all routes from absolute paths to relative paths + fixed root redirect to `/dashboard`
- AdminLayout: Updated all sidebar navigation URLs to relative paths + changed links from `<a href>` to `<Link to>`
- All admin pages: Updated setLocation calls to use relative paths
- Fixed duplicate `/admin/admin/...` path bug that was preventing proper navigation
- With nested routing, all paths are now relative to the `/admin` base and automatically resolve correctly

## Previous Changes (Nov 24, 2025)
**User Approval System Status Synchronization:**
- Fixed critical bug where users.accountStatus and profile.approvalStatus were not synchronized during admin approval/rejection actions
- All 5 user approval storage methods now use database transactions to ensure atomicity
- Methods now handle missing profiles by creating them during approval/rejection (edge case for test users)
- Fixed RBAC permission strings from `users.*` format to correct `user:*` format (user:approve, user:ban, user:view, user:edit)
- Added Approve/Reject actions to AdminUsers dropdown menu for pending users
- Fixed AdminUserDetail navigation from window.location.href to Wouter's setLocation() for SPA routing

## System Architecture

### UI/UX Decisions
The frontend utilizes React, Vite, shadcn/ui, and Radix UI components, adhering to Material Design 3 ("New York" theme). It supports both light/dark modes and features a brand-specific green and dark navy color palette.

### Technical Implementations
**Frontend:** React, Vite, Wouter for routing, TanStack React Query for state management, strict TypeScript, and TailwindCSS.
**Backend:** Express.js with TypeScript, using `tsx` for development and `esbuild` for production. It implements an `IStorage` interface with MemStorage and PostgreSQL via Drizzle ORM.
**Authentication & Security:** Custom Email/Password authentication (`passport-local`, `bcrypt`), including password reset, "Remember Me," login history, active session management, user activity logging, security dashboard, and TOTP-based 2FA.
**Database:** PostgreSQL (Neon serverless driver) with Drizzle ORM for type-safe SQL. Schema definitions are co-located with Zod validators, and `drizzle-kit` manages migrations.
**Role-Based Access Control (RBAC):** Comprehensive permission system with 40+ granular permissions across 8 domains (admin, categories, jobs, bids, payments, messaging, users, system). Features 6 predefined roles (super_admin, moderator, support, finance, analyst, category_manager) with customizable permission matrices. Permission-based middleware (`requirePermission`, `requireRole`, `requireAdmin`) enforces access control with automatic admin activity logging (IP/userAgent tracking). Admin role assignment API with type-safe storage methods. All admin actions logged to adminActivityLogs for audit compliance.
**Admin Portal & CMS:** Provides i18n support with RTL (English/Arabic) for managing profiles, categories, users, bids, payments, contracts, vendors, disputes, subscription plans, and email templates. A bilingual CMS supports rich text editing and XSS sanitization. Features three reusable builder components (FeatureListBuilder for multilingual plan features, DeliveryOptionsBuilder for shipping configuration, WarrantyConfigBuilder for warranty settings) to replace JSON textarea inputs with user-friendly UI. Subscription plan dialog uses max-w-5xl width for better visibility, switch layouts use 2-column grid with proper spacing.
**User Approval Queue System:** Complete admin workflow for reviewing and approving pending user accounts with auto-calculated risk scores (0-100 based on email domain, profile completeness, account age), bulk actions (approve/reject multiple users), individual actions (approve, reject, request additional info), comprehensive filtering/sorting, admin activity logging with IP/userAgent tracking, and full Zod request validation for security. **Notification System Integration:** All four profile lifecycle events (submission, approval, rejection, changes requested) trigger both email and in-app notifications via NotificationService, with user preference controls and real-time WebSocket delivery. Profile completion reminders appear on role-based dashboards with progress indicators and completion percentage for draft profiles.
**KYC Document Upload & Admin Review System:** Comprehensive identity verification system enabling users (clients/consultants) to upload verification documents (commercial registration, tax certificates, national ID, authorization letters, business licenses) with secure file storage (10MB limit, PDF/JPEG/PNG/DOCX filtering). Admin review workflow integrated into User Approval Queue with document viewing, approve/reject actions, review notes, and secure download streaming. Features non-guessable storage paths (kyc/{userId}/{randomId}_{filename}), ownership validation on delete, RBAC permission gates (users.view, users.manage), admin activity logging, and comprehensive Zod validation on all endpoints.
**Dynamic Category & Job Posting System:** A 3-level hierarchical category system with 8 predefined types and support for custom fields, dynamically rendering fields on the "Post Job" page.
**Consultant Workflow:** Includes a category access request workflow, verification badge management, comprehensive consultant profiles with a Quick Quote System, language proficiency, and Pricing Templates.
**Dashboards & Profile Management:** Role-based dashboards for clients and consultants with comprehensive metrics, actionable widgets, and backend endpoints for stats, activities, financial trends, and pending actions.
**Comprehensive Two-Way Review & Rating System:** Bidirectional review system with role-specific rating criteria, 48-hour edit window, one-time review responses, review reporting, helpful voting, public/private visibility, file attachments, and role-based review sections.
**Team Members Management:** Clients can manage team members with role-based access control.
**Advanced Search System:** Production-grade search with filtering and pagination for jobs and consultants.
**Notifications System:** Comprehensive notification platform covering 20 types (critical and important) with real-time WebSocket delivery for in-app notifications and email notifications with HTML templates and per-type preference controls. Profile-related notifications include PROFILE_SUBMITTED (confirmation when users submit profiles), ACCOUNT_APPROVED, ACCOUNT_REJECTED, and INFO_REQUESTED (admin requests changes).
**Analytics Dashboard:** Role-based analytics for consultants, clients, and admins.
**Document Management:** Centralized access to files from user conversations with version tracking.
**Consultant Portfolio:** Consultants can showcase completed projects.
**Messaging & Collaboration:** Real-time messaging via WebSockets with file attachments, meeting scheduling, read receipts, message threading, full-text search, and admin moderation.
**Enhanced Bidding & Proposal System:** Comprehensive bid CRUD, bid lifecycle management, shortlisting, clarifications, RFQ system, and analytics. Supports category-specific bid types.
**Contract & Project Execution System:** Full-featured system for contract creation, milestone management, deliverable tracking, team collaboration, payment processing (mocked), and activity logging.
**Delivery & Fulfillment System:** A three-workflow system (Service-Based, Hardware Delivery, Software Delivery) automatically tailored to project types, including database tables, storage methods, and secure API endpoints.
**Payment & Escrow System:** A SAR-only payment system with 15% VAT compliance, featuring secure escrow workflows, professional invoice generation, wallet management, flexible refund workflows, and payment analytics.
**Search & Discovery System:** Comprehensive search and discovery capabilities with advanced job/project search for consultants, advanced consultant search for clients, search history tracking, saved searches with email alerts, vendor list management, consultant invitation workflow, smart consultant matching, side-by-side comparison, and admin search analytics dashboard.
**Saved Requirements & User Privacy:** Job bookmarking system for consultants and privacy controls for all users, including a blocked users feature and profile visibility settings.
**Help & Support System:** Complete customer support and feedback platform with CMS-driven help content, support ticketing (with file attachments, priority system, and rating), and platform feedback collection (feature suggestions, voting, surveys, beta opt-ins).
**Dispute Resolution System (MVP - BACKEND COMPLETE):** Comprehensive conflict resolution system enabling users to raise and manage disputes with admin oversight, supporting 5 dispute types, evidence management, and threaded communication.

## External Dependencies

### Database
- Neon Serverless PostgreSQL
- @neondatabase/serverless

### UI Components
- Radix UI
- Lucide React
- shadcn/ui

### Internationalization (i18n)
- react-i18next
- i18next

### Form Handling & Validation
- React Hook Form
- @hookform/resolvers
- Zod

### Rich Text Editing
- React Quill
- Quill

### Utilities
- class-variance-authority
- clsx
- tailwind-merge
- cmdk
- date-fns
- nanoid
- DOMPurify
- speakeasy
- react-day-picker
- recharts

### Session Management
- connect-pg-simple
- express-session
- passport-local
- bcrypt

### WebSockets
- ws