# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace designed to connect businesses with IT service vendors. It facilitates project posting, competitive bidding, and comprehensive project lifecycle management, encompassing payments, deliverable tracking, and real-time communication. The platform aims to significantly enhance efficiency and transparency within the B2B IT sector, with the ambition to become a leading solution for IT service procurement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React, Vite, shadcn/ui, and Radix UI components, styled according to Material Design 3 ("New York" theme). It supports both light and dark modes and features a brand-specific green and dark navy color palette.

### Technical Implementations
**Frontend:** React, Vite, Wouter for routing, TanStack React Query for state management, strict TypeScript, and TailwindCSS.
**Backend:** Express.js with TypeScript, using `tsx` for development and `esbuild` for production. It implements an `IStorage` interface with MemStorage and PostgreSQL via Drizzle ORM.
**Authentication & Security:** Custom Email/Password authentication (`passport-local`, `bcrypt`), including password reset, "Remember Me," login history, active session management, user activity logging, security dashboard, and TOTP-based 2FA.
**Database:** PostgreSQL (Neon serverless driver) with Drizzle ORM for type-safe SQL. Schema definitions are co-located with Zod validators, and `drizzle-kit` manages migrations.
**Admin Portal & CMS:** Provides i18n support with RTL (English/Arabic) for managing profiles, categories, users, bids, payments, contracts, vendors, disputes, subscription plans, and email templates. A bilingual CMS supports rich text editing and XSS sanitization.
**Dynamic Category & Job Posting System:** A 3-level hierarchical category system with 8 predefined types and support for custom fields. The "Post Job" page dynamically renders fields based on category selection.
**Consultant Workflow:** Includes a category access request workflow requiring admin approval, verification badge management, and comprehensive consultant profiles with a Quick Quote System, language proficiency, and Pricing Templates.
**Dashboards & Profile Management (ENHANCED):** Role-based dashboards with comprehensive metrics and actionable widgets.
  - **Client Dashboard**: 6 stat cards (Active Jobs, Proposals Received, Active Projects, Total Spending, Completed Projects, Avg Response Time) + 5 widgets (Quick Actions, Pending Actions, Recent Activities, Spending Trends, Active Projects Summary)
  - **Consultant Dashboard**: 5 stat cards (Available Jobs, Active Bids, Total Earnings, Rating, Completed Projects) + 5 widgets (Quick Actions, Pending Actions, Recent Activities, Earnings Trends, Active Projects Summary, Performance Score, Quote Requests)
  - Backend endpoints for stats, activities, financial trends, pending actions, and active projects with proper authorization
  - Material Design 3 UI with proper data-testid attributes for testing
**Comprehensive Two-Way Review & Rating System (COMPLETED):** Fully implemented bidirectional review system with role-specific rating criteria (vendor: quality/communication/deadline/professionalism/value; client: communication clarity/requirements clarity/payment promptness/professionalism). Features include:
  - 48-hour edit window enforced via canEditUntil timestamp with countdown timer UI
  - One-time review responses with ReviewResponseDialog
  - Review reporting workflow with ReportReviewDialog and AdminReviewReportsPage moderation
  - Helpful voting system with vote tracking
  - Public/private visibility controls, verified badges (admin-managed)
  - File attachments support, wouldWorkAgain recommendations
  - Role-based review sections (ConsultantReviewsSection, ClientReviewsSection) with filtering/sorting
  - Complete authorization enforcement (storage layer enforces edit window, reviewer identity)
  - 3 database tables (reviews, reviewResponses, reviewReports), 17 storage methods, 14 API endpoints
  - Production-ready with aligned frontend-backend contracts, schema defaults, and end-to-end authorization
**Team Members Management:** Clients can manage team members with role-based access control.
**Advanced Search System:** Production-grade search with filtering and pagination for jobs and consultants.
**Notifications System (COMPLETED):** Comprehensive notification platform covering 19 notification types across critical business events and value-add features. System includes:
  - Real-time WebSocket delivery with instant in-app notifications via NotificationBell component in UserLayout header
  - Email notifications with HTML templates and per-type preference controls
  - 19 notification types: 13 Critical (bid_received, bid_status_update, bid_awarded, bid_rejected, payment_deposited, payment_released, project_status_change, milestone_completed, deliverable_submitted, invoice_generated, vendor_invited, verification_status, category_approval) + 6 Important (new_message, review_received, review_response, deadline_reminder, refund_processed, team_member_activity)
  - Per-notification-type preferences with individual Email and In-App toggles in Settings page
  - Database tables: notifications, notification_preferences with email_enabled_types and in_app_enabled_types columns
  - NotificationBell component: unread counter badge, dropdown preview, mark-as-read, real-time updates via WebSocket
  - Complete integration across all backend routes (bids, payments, projects, deliverables, invoices, messages, reviews, team)
  - Development-only test endpoint gated behind NODE_ENV check for security
  - Production-ready with architect approval, comprehensive error handling, and end-to-end testing
**Analytics Dashboard:** Role-based analytics for consultants, clients, and admins.
**Document Management:** Centralized access to files from user conversations with version tracking.
**Consultant Portfolio:** Consultants can showcase completed projects.
**Messaging & Collaboration:** Real-time messaging via WebSockets with features like file attachments, meeting scheduling, read receipts, message threading, full-text search, and admin moderation.
**Enhanced Bidding & Proposal System:** Comprehensive bid CRUD, bid lifecycle management, shortlisting, clarifications, RFQ system, and analytics. Supports category-specific bid types.
**Contract & Project Execution System:** Full-featured system for contract creation, milestone management, deliverable tracking, team collaboration, payment processing (mocked), and activity logging.
**Delivery & Fulfillment System:** A three-workflow system (Service-Based with file versioning, Hardware Delivery with shipping/quality management, and Software Delivery with license/subscription management) automatically tailored to project types. It includes multiple database tables, storage methods, and secure API endpoints.
**Payment & Escrow System:** A SAR-only payment system with 15% VAT compliance, featuring secure escrow workflows, professional invoice generation (with PDF and email delivery), wallet management with transaction history, flexible refund workflows, and payment analytics. The system includes 5 database tables, numerous API endpoints, and a comprehensive frontend UI for all payment-related interactions.
**Search & Discovery System (COMPLETED):** Comprehensive search and discovery capabilities with 4 database tables (searchHistory, savedSearches, vendorLists, vendorListItems), 17 storage methods, and 14 API endpoints. Features include:
  - Advanced job/project search for consultants with filters (category, budget, location, skills, status, deadline) and autocomplete suggestions
  - Advanced consultant search for clients with filters (skills, rating, location, pricing, availability, certifications, experience)
  - Search history tracking with automatic cleanup of old entries
  - Saved searches with custom names and optional email alerts for new matching results
  - Vendor list management for clients to organize preferred consultants with notes
  - Consultant invitation workflow for inviting specific consultants to bid on projects
  - Smart consultant matching based on project requirements (category, skills, budget, location, success rate)
  - Side-by-side consultant comparison (up to 10 consultants) with detailed metrics
  - Admin search analytics dashboard showing popular searches, zero-result queries, trending categories, and search metrics
  - Full frontend implementation with GlobalSearchBar, SearchFilters, search result cards, dialogs, and dedicated search pages for both consultants and clients
  - All components follow Material Design 3 guidelines with proper data-testid attributes for testing
  - Complete authorization enforcement ensuring users can only access their own search data and lists
**Saved Requirements & User Privacy (COMPLETED):** Job bookmarking system for consultants with privacy controls for all users:
  - Saved Requirements: Database table (savedRequirements) with consultantId, jobId, notes, and unique constraint preventing duplicates
  - 5 storage methods with strict ownership validation: save (verifies job is open/in_progress), unsave, get saved jobs, update notes, check if saved
  - 5 API endpoints with session-based authorization: POST /api/saved-requirements, GET /api/saved-requirements, DELETE /api/saved-requirements/:id, PATCH /api/saved-requirements/:id/notes, GET /api/saved-requirements/check/:jobId
  - SavedRequirementsPage: Card grid UI showing saved jobs with notes editing, unsave functionality, job details (budget, deadline, client), and Material Design 3 styling
  - Blocked Users: Database table (blockedUsers) for user privacy with blockerId, blockedId, reason, and unique constraint
  - 4 storage methods with ownership enforcement: block user, unblock user, get blocked users list, check if user is blocked
  - 4 API endpoints: POST /api/blocked-users, GET /api/blocked-users, DELETE /api/blocked-users/:blockedId, GET /api/blocked-users/check/:userId
  - Profile Visibility: Added profileVisibility field to users table supporting 'public', 'clients_only', 'private' settings
  - Security: All mutations validate ownership via session-derived userId, preventing privilege escalation; job saves restricted to publicly accessible (open/in_progress) jobs
  - UI Integration: Route at /consultant/saved-requirements, proper data-testid attributes for testing
**Dispute Resolution System (MVP - BACKEND COMPLETE):** Comprehensive conflict resolution system enabling users to raise and manage disputes with admin oversight:
  - 3 database tables: disputes (main dispute records), disputeEvidence (supporting file uploads), disputeMessages (communication thread)
  - 5 dispute types: payment_dispute, quality_dispute, delivery_dispute, refund_request, contract_violation
  - 4 statuses: pending, under_review, resolved, closed
  - 11 storage methods: createDispute, getDispute, getUserDisputes, getProjectDisputes, getAllDisputes, updateDisputeStatus, addDisputeEvidence, getDisputeEvidence, deleteDisputeEvidence, addDisputeMessage, getDisputeMessages
  - 10 API endpoints: 7 user endpoints (create dispute, get disputes, get dispute detail, add/get evidence, add/get messages) + 2 admin endpoints (get all disputes with filters, update dispute status)
  - Security: Session-based authorization ensuring users can only access disputes for projects they're involved in; admins have full access
  - Evidence management: Support for 7 file types (document, screenshot, photo, video, contract, invoice, message_log)
  - Communication: Threaded messaging between users and admins with admin message flagging
  - Project integration: Disputes linked to project records with automatic access validation
  - Frontend pages (IN PROGRESS): RaiseDispute form, MyDisputes list, DisputeDetail view, AdminDisputes dashboard, AdminDisputeDetail management page

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