# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace platform designed to connect businesses with IT service vendors. It streamlines project posting, competitive bidding, and project lifecycle management, including payments, deliverable tracking, and real-time communication. The platform aims to enhance efficiency and transparency in the B2B IT sector, aspiring to be a leading solution for IT service procurement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with Vite, shadcn/ui, and Radix UI components based on Material Design 3 ("New York" style). It supports light/dark modes with a primary brand green and dark navy color scheme.

### Technical Implementations
**Frontend:** React, Vite, Wouter for routing, TanStack React Query for state management, strict TypeScript, and TailwindCSS.
**Backend:** Express.js with TypeScript, using `tsx` for development and `esbuild` for production. Features an `IStorage` interface with MemStorage and PostgreSQL via Drizzle ORM.
**Authentication & Security:** Custom Email/Password authentication using `passport-local` and `bcrypt`. Includes secure password reset, "Remember Me," login history, active session management, user activity logging, security dashboard, and TOTP-based 2FA.
**Database:** PostgreSQL with Neon serverless driver, Drizzle ORM for type-safe SQL. Schema definitions co-located with Zod validators; `drizzle-kit` manages migrations.
**Engagement Model & Payment System:** Supports various engagement plans; mock payment gateway for development with robust security.
**Admin Portal & CMS:** i18n with RTL (English/Arabic). Provides management interfaces for profile approvals, categories, users, bids, payments, contracts, vendors, disputes, subscription plans, email templates, and settings. A bilingual CMS manages legal and home page content with rich text editing and XSS sanitization.
**Dynamic Category System:** A 3-level hierarchical system with unlimited IT categories and 8 predefined types (human_services, software_services, hardware_supply, digital_marketing, infrastructure, cloud_services, cybersecurity, data_services). Each type can define custom fields with validation.
**Dynamic Job Posting:** "Post Job" page dynamically renders custom fields based on selected category.
**Category Access Request Workflow:** Consultants request access to specialized categories, subject to admin approval, with status tracking and verification badge management.
**Dashboards & Profile Management:** Role-based dashboards. Profiles capture comprehensive details; consultant profiles include verification badges, Quick Quote System, language proficiency, and Pricing Templates.
**Review System:** Clients submit 1-5 star ratings and comments post-project.
**Team Members Management:** Clients manage team members with role-based access control.
**Advanced Search System:** Production-grade search for jobs and consultants with filtering, pagination, and security.
**Notifications System:** Comprehensive platform-wide notifications (email, push, in-app) with user preferences.
**Analytics Dashboard:** Role-based analytics for consultants, clients, and platform-wide metrics for admins.
**Document Management:** Centralized access to files from user conversations with version tracking.
**Consultant Portfolio:** Consultants showcase completed projects.
**Messaging & Collaboration:** Real-time messaging with WebSockets, supporting one-on-one conversations, file attachments, meeting scheduling, read receipts, message threading, full-text search, and admin moderation. Includes RBAC, soft deletes, and audit trails.
**Enhanced Bidding & Proposal System:** Includes comprehensive bid CRUD, bid lifecycle management, shortlisting, clarifications, view/comparison tracking, RFQ system, and analytics. Supports category-specific bid types (service/hardware/software) with dynamic fields.

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

## Enhanced Bidding & Proposal System - Detailed Implementation

### Status: MVP COMPLETE (Phases 1-7)

**Database Schema (Phase 1):**
- Extended `bids` table with 15+ fields: `bidType`, `proposalData` (JSONB), `pricingBreakdown`, `teamComposition`, `productDetails`, `softwareLicensing`, engagement metrics
- Created 4 tables: `rfqInvitations`, `bidShortlists`, `bidClarifications`, `bidViews`
- Supports category-specific bid types: service/hardware/software with discriminated union validation

**Backend API (Phase 2):**
- Comprehensive CRUD: POST/GET/PATCH/DELETE endpoints for bids
- Lifecycle management: accept, decline, shortlist with job ownership verification
- RFQ system: invite consultants, respond to invitations
- Analytics: consultant and admin dashboards (mock data)
- Security: All routes enforce authentication, role-based access, job ownership verification on mutations

**Frontend Components (Phases 3-7):**
- `BidSubmissionDialog`: Tabbed interface for bid submission with category-specific forms
- `BidManagementView`: Client interface for managing bids (filter, sort, compare, shortlist)
- `ConsultantBidAnalytics`: Performance dashboard with metrics and insights
- `RFQInvitationDialog` & `ConsultantRFQList`: RFQ workflow
- `AdminBidAnalytics`: Platform-wide metrics

### Implementation Status: FUNCTIONAL WITH KNOWN VALIDATION LIMITATION

**What Works:**
- ✅ All 7 phases fully implemented (database, backend API, frontend UI, RFQ, analytics)
- ✅ Security hardened (consultantId enforcement, job ownership verification, null safety)
- ✅ Core bidding workflow functional (submit, accept, decline, shortlist, RFQ)
- ✅ Backend defensive validation added (z.coerce.number(), .finite(), .superRefine())
- ✅ Frontend numeric conversion (z.coerce in form schema + Number() in onSubmit)

**Critical Limitation Requiring Production Refactor:**
1. **Form Validation Architecture**: `BidSubmissionDialog` manages pricing/milestones/personnel/certifications arrays outside react-hook-form. While backend validation provides defense-in-depth (z.coerce.number() + .finite() + .superRefine()), the proper solution is to refactor the frontend to use react-hook-form's `useFieldArray` for all dynamic arrays. This ensures Zod validation runs on every array item before submission.

**Current Validation Layers:**
- Frontend: z.coerce.number() in form schema + manual Number() conversion in onSubmit
- Backend: insertBidSchema with z.coerce.number().positive().finite() + .superRefine() + .strict()
- Result: Multiple defense layers, but not production-grade due to frontend architecture

**Production Refactoring Needed:**
Replace local state arrays (pricingItems, milestones, personnel, certifications) with react-hook-form's useFieldArray pattern to ensure proper validation pipeline.

**Non-Critical - Can Defer:**
- Analytics endpoints return mock data (real aggregations deferred)
- Analytics persistence (engagement metrics tracked but not aggregated)
- UX guards (no client-side prevention for unapproved consultants - server validation exists)

### Security Measures Applied
- POST /api/bids forces consultantId from authenticated user (prevents impersonation)
- Accept/decline/shortlist routes verify job ownership before mutations
- Null checks on all bid/job fetches to prevent crashes
- Role-based access control enforced on all admin endpoints
- Defensive backend validation with Number.isFinite() checks to reject NaN/Infinity