# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace platform connecting businesses with IT service vendors. It facilitates project posting, competitive bidding, and comprehensive project lifecycle management, including payment processing, deliverable tracking, and real-time communication. The platform aims to enhance efficiency and transparency in the B2B IT sector, positioning itself as a leading solution for IT service procurement with significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React, Vite, Wouter for routing, and TanStack React Query for state management. UI components are built with shadcn/ui and Radix UI, adhering to Material Design 3 ("New York" style) with light/dark modes (primary brand green and dark navy). It uses CSS variables, TailwindCSS, and strict TypeScript.

### Backend
The backend is built with Express.js and TypeScript, using `tsx` for development and `esbuild` for production. It features an `IStorage` interface supporting MemStorage and PostgreSQL via Drizzle ORM. API routes are under `/api` with custom logging and consistent error handling.

### Authentication & Security
A custom Email/Password authentication system uses `passport-local` and `bcrypt`. Sessions are stored in PostgreSQL. It includes secure password reset, "Remember Me", login history, active session management, user activity logging, and a security dashboard. Two-Factor Authentication (2FA) via TOTP is implemented, along with an Admin Security Dashboard for analytics and activity log monitoring.

### Engagement Model & Payment System
Users select an engagement plan during registration. The system ensures robust security for payment processing, session integrity, and multi-layer validation against price manipulation. A mock payment gateway is used for development.

### Database
Drizzle ORM is used for type-safe SQL with PostgreSQL (Neon serverless driver). Schema definitions are co-located with Zod validators, and `drizzle-kit` manages migrations.

**Dynamic Category System Schema Extensions:**
- **categories table**: Added `categoryType` enum and `customFields` JSONB for flexible field definitions
- **jobs table**: Added `customFieldData` JSONB to store category-specific job posting data
- **vendorCategoryRequests table**: Complete workflow for category access requests with:
  - Status tracking (pending, approved, rejected)
  - Credentials storage (JSONB for documents/certifications)
  - Verification badge management (verified, premium, expert)
  - Capacity enforcement (maxConcurrentJobs, currentActiveJobs)
  - Admin review notes and timestamps
  - Unique constraint on (vendorId, categoryId, status) to prevent duplicates

### Admin Portal & CMS
The Admin Portal supports i18n with RTL (English/Arabic) and features an AdminLayout with a shadcn Sidebar and DataTable. It manages Profile Approvals, Categories, Users, Bids, Payments, Contracts, Vendors, Disputes, Subscription Plans, Email Templates, and Settings. A bilingual CMS allows administrators to manage legal pages and home page content with rich text editing and DOMPurify XSS sanitization.

**Category Management Features:**
- **CustomFieldsBuilder Component**: Visual builder for defining category-specific custom fields
  - Field configuration: label, type, required, options (for select/multiselect)
  - Bilingual field labels (English/Arabic)
  - Real-time validation of field configurations
- **CategoryFormDialog**: Comprehensive category creation/editing with:
  - Parent category selection (enforces 3-level hierarchy)
  - Category type selection (8 predefined IT service types)
  - Custom fields builder integration
  - Bilingual name/description inputs
- **Category Access Request Management**: Admin approval workflow for consultant category access
  - View pending/approved/rejected requests
  - Issue verification badges and set capacity limits
  - Track review history and admin notes

### Core Features
- **Dynamic 3-Level Category System with Custom Fields**: Comprehensive category management system featuring:
  - **Unlimited IT-focused categories** with 3-level hierarchy (parent → child → grandchild)
  - **8 Predefined Category Types**: human_services, software_services, hardware_supply, digital_marketing, infrastructure, cloud_services, cybersecurity, data_services
  - **Category-Specific Custom Fields**: Each category type can define unique custom fields with full validation
    - Discriminated union validation enforces type-specific field configurations
    - Supported field types: text, textarea, number, select, multiselect, date, file
    - Admin-configured via CustomFieldsBuilder component
  - **Dynamic Job Posting**: PostJob page renders custom fields based on selected category
    - DynamicFormFieldRenderer handles all field types with proper validation
    - Custom field data stored in jobs.customFieldData (JSONB)
    - Form automatically resets when category changes
  - **Category Access Request Workflow**: Consultants request access to specialized categories
    - API routes: POST /api/category-requests (submit), GET (list), PATCH approve/reject (admin)
    - Role-based authorization (consultant profile required, admin approval required)
    - Verification badges (verified, premium, expert) issued upon approval
    - Capacity management (maxConcurrentJobs limits per category)
    - Database unique constraint prevents duplicate pending requests
  - Bilingual support (English/Arabic) for all category content
  - Server-side validation enforces hierarchy and type constraints
- **Dashboards & Profile Management**: Client and Consultant Dashboards display relevant information, supporting dual-role users. Profiles capture and allow editing of company/personal details, professional information, and financial data. Consultant profiles include verification badges, Quick Quote System, language proficiency, and Pricing Templates. Profile updates are managed via enforced state machines and partial updates with payload sanitization.
- **Enhanced Profile Fields**: Client profiles include Business Type, Industry, Region, and Company Size. Consultant profiles include Business Information (Year Established, Employee Count, Business Registration Number, Operating Regions) and enhanced Service Packages (Add-ons, Revisions, Support Duration).
- **Review System**: Clients can submit 1-5 star ratings, optional comments, and category ratings for consultants after project completion.
- **Team Members Management**: Clients can invite and manage team members with role-based access control (owner, admin, member, viewer) and granular permissions. Includes CRUD operations, invitation tokens, and a rich UI.
- **Advanced Search System**: Production-grade search for jobs and consultants with comprehensive filtering (text, category, budget/rate, skills, experience, status, etc.), pagination, and robust security architecture (Zod validation, SQL parameterization, UUID/enum injection prevention, DoS protection).
- **Notifications System**: Comprehensive platform-wide notification system with database schema, user preferences (email, push, in-app), REST API for managing notifications, UI components, and email integration.
- **Analytics Dashboard**: Role-based dashboards for consultants (earnings, projects, ratings, bid success), clients (spending, projects, bids received), and platform-wide metrics for admins.
- **Document Management**: Centralized access to files from user conversations via a dedicated API and UI, leveraging existing messaging infrastructure with version tracking.
- **Consultant Portfolio**: Showcase for consultants to display completed projects with titles, descriptions, client info, ratings, reviews, and completion dates.

### Messaging & Collaboration
A real-time messaging system supports one-on-one conversations, file attachments with version tracking, meeting scheduling, and admin moderation. It uses WebSockets for real-time delivery, includes read receipts, message threading, full-text search, and is secured with RBAC, soft deletes, and audit trails. Features include drag-and-drop file uploads, meeting scheduling with various platform options, and admin moderation capabilities (flag, hide, redact, warn). Performance optimizations include cursor-based infinite scroll, optimized database queries, WebSocket participant caching, and database-backed rate limiting.

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
- speakeasy (for 2FA)
- react-day-picker (for meeting scheduling)
- recharts (for admin analytics)

### Session Management
- connect-pg-simple
- express-session
- passport-local
- bcrypt

### WebSockets
- ws

## Category Access Request Workflow

### Consultant Flow
1. **Access Request Submission** (requires approved consultant profile):
   - Navigate to category management section
   - Select specialized category to request access
   - Provide credentials (documents, certifications, portfolio)
   - Submit years of experience and reason for request
   - API: POST /api/category-requests (consultant role required)

2. **Request Status Tracking**:
   - View all submitted requests with status (pending/approved/rejected)
   - Monitor admin review notes and feedback
   - API: GET /api/category-requests (returns consultant's own requests only)

3. **Upon Approval**:
   - Receive verification badge (verified/premium/expert)
   - Gain capacity allocation (maxConcurrentJobs limit)
   - Category appears in consultant's available categories
   - Can now bid on jobs in approved category

### Admin Flow
1. **Review Pending Requests**:
   - View all pending category access requests
   - Review submitted credentials and experience
   - Check consultant's profile and history
   - API: GET /api/category-requests?status=pending (admin role required)

2. **Approval Process**:
   - Issue verification badge level (verified/premium/expert)
   - Set concurrent job capacity limit (1-100)
   - Add review notes for record-keeping
   - API: PATCH /api/category-requests/:id/approve (admin role required)
   - Validations: consultant has approved profile, no duplicate approval, valid capacity

3. **Rejection Process**:
   - Document reason in admin notes
   - API: PATCH /api/category-requests/:id/reject (admin role required)

## Known Limitations & Deferred Tasks

### Current Limitations
1. **Category Switching in PostJob**: Changing category mid-form clears all custom field data. This is an intentional UX tradeoff to ensure data consistency when different categories have incompatible custom fields. Future enhancement: preserve compatible fields across category switches.

2. **Category Access Request UI (Phase 4.2-4.7 - Deferred)**:
   - Lock icons on restricted categories in browse/search
   - "Request Access" buttons on category cards
   - Admin approval page in Admin Portal
   - Verification badge displays on consultant profiles
   - Capacity enforcement in job bidding flow
   - Expiry date management for category access

### Deferred Features
- Phase 5: Delivery/Warranty/Compliance configuration UI
- Phase 6: Enhanced browse with filters, analytics integration
- Category access expiry and re-verification workflow
- Capacity enforcement in active job tracking

## Critical Source Files

### Backend Implementation
- **Schema**: `shared/schema.ts`
  - Category types enum (line ~400): 8 predefined IT service types
  - Custom fields discriminated union (line ~420): Type-specific field validation
  - vendorCategoryRequests table (line ~490): Complete access request workflow
- **Storage Layer**: `server/storage.ts`
  - IStorage interface (line ~204-211): Category request methods
  - DatabaseStorage implementation (line ~2919-2997): CRUD operations
- **API Routes**: `server/routes.ts`
  - Category Access Request routes (line ~3675-3852): POST/GET/PATCH endpoints

### Frontend Components
- **Admin Category Management**: `client/src/components/admin/`
  - CustomFieldsBuilder.tsx: Visual builder for custom field definitions
  - CategoryFormDialog.tsx: Category creation/editing with type selection
  - AdminCategories.tsx: Main category management interface
- **Dynamic Job Posting**: `client/src/pages/PostJob.tsx`
  - Integration with category selection and custom fields
  - Form reset logic on category change (line ~150)
- **Field Rendering**: `client/src/components/forms/`
  - DynamicFormFieldRenderer.tsx: Handles all 7 custom field types
  - CustomFieldDataDisplay.tsx: Read-only display of custom field values

### Security & Validation
- **Role-Based Auth**: All routes enforce consultant/admin roles
- **Consultant Approval Check**: Only approved consultants can submit requests
- **Duplicate Prevention**: Database unique constraint on (vendorId, categoryId, status)
- **Capacity Limits**: maxConcurrentJobs capped at 100 (enforced in Zod schema)