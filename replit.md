# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace platform designed to connect businesses with IT service vendors. It streamlines the process of posting projects, managing competitive bidding, and overseeing the entire project lifecycle, including payment processing, deliverable tracking, and real-time communication. The platform's core purpose is to enhance efficiency and transparency within the B2B IT sector, aiming to become a leading solution for IT service procurement with significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React with Vite, employing shadcn/ui and Radix UI components that adhere to Material Design 3 ("New York" style). It supports both light and dark modes, featuring a primary brand green and dark navy color scheme.

### Technical Implementations
**Frontend:** Built with React, Vite, Wouter for routing, and TanStack React Query for state management. It enforces strict TypeScript and uses TailwindCSS for styling.
**Backend:** Developed with Express.js and TypeScript, using `tsx` for development and `esbuild` for production. It features an `IStorage` interface with MemStorage and PostgreSQL via Drizzle ORM.
**Authentication & Security:** Custom Email/Password authentication using `passport-local` and `bcrypt`, with PostgreSQL for session storage. Includes secure password reset, "Remember Me" functionality, login history, active session management, user activity logging, a security dashboard, and TOTP-based Two-Factor Authentication (2FA).
**Database:** PostgreSQL with Neon serverless driver, accessed via Drizzle ORM for type-safe SQL. Schema definitions are co-located with Zod validators, and `drizzle-kit` manages migrations.
**Engagement Model & Payment System:** Supports various engagement plans. A mock payment gateway is used for development, with robust security measures for payment processing and session integrity.
**Admin Portal & CMS:** Supports i18n with RTL (English/Arabic). Provides management interfaces for profile approvals, categories, users, bids, payments, contracts, vendors, disputes, subscription plans, email templates, and settings. A bilingual CMS allows for managing legal and home page content with rich text editing and XSS sanitization.

### Feature Specifications
**Dynamic Category System:** A 3-level hierarchical category system with unlimited IT-focused categories and 8 predefined types (human_services, software_services, hardware_supply, digital_marketing, infrastructure, cloud_services, cybersecurity, data_services). Each category type can define custom fields with validation.
**Dynamic Job Posting:** The "Post Job" page dynamically renders custom fields based on the selected category, storing data in `jobs.customFieldData` (JSONB).
**Category Access Request Workflow:** Consultants can request access to specialized categories, which are then subject to admin approval. This includes status tracking, credential storage, verification badge management (verified, premium, expert), and capacity enforcement (`maxConcurrentJobs`).
**Dashboards & Profile Management:** Role-based dashboards for clients and consultants. Profiles capture comprehensive company/personal details, professional information, and financial data. Consultant profiles include verification badges, a Quick Quote System, language proficiency, and Pricing Templates.
**Review System:** Clients can submit 1-5 star ratings, comments, and category-specific ratings after project completion.
**Team Members Management:** Clients can invite and manage team members with role-based access control and granular permissions.
**Advanced Search System:** Production-grade search for jobs and consultants with extensive filtering, pagination, and robust security.
**Notifications System:** Comprehensive platform-wide notification system with user preferences (email, push, in-app), REST API, and UI components.
**Analytics Dashboard:** Role-based analytics for consultants, clients, and platform-wide metrics for admins.
**Document Management:** Centralized access to files from user conversations with version tracking.
**Consultant Portfolio:** Allows consultants to showcase completed projects with details, ratings, and reviews.
**Messaging & Collaboration:** Real-time messaging with WebSockets, supporting one-on-one conversations, file attachments, meeting scheduling, read receipts, message threading, full-text search, and admin moderation. Includes RBAC, soft deletes, and audit trails.

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
## Category Access Request Workflow

### Implementation Status: ✅ COMPLETE (Phases 4.1-4.7 + Phase 5)

**Completed Components:**
1. **Backend API** (Phase 4.1):
   - POST /api/category-requests - Submit request (consultant role)
   - GET /api/category-requests - List requests (role-based filtering)
   - PATCH /api/category-requests/:id/approve - Admin approval
   - PATCH /api/category-requests/:id/reject - Admin rejection
   - Full security: role checks, ownership validation, duplicate prevention

2. **Consultant UI** (Phases 4.2-4.4):
   - CategoryAccessRequestDialog component for request submission
   - CategoryRequestsList component showing request status with badges
   - Integrated into consultant Dashboard.tsx
   - Real-time status tracking with formatDistanceToNow

3. **Admin Portal** (Phase 4.5):
   - AdminCategoryRequests page with tabs (pending/approved/rejected)
   - Approve with verification badge and capacity allocation
   - Reject with required admin notes
   - Integrated into admin navigation (/admin/category-requests)

4. **Verification Badge Display** (Phase 4.6):
   - VerificationBadge component with proper styling and icons (Shield, Crown, Star)
   - BrowseConsultants shows badges on consultant search results
   - Backend searchConsultants returns highest badge level (expert > premium > verified)
   - Type-safe implementation with proper null handling

5. **Request Access Integration** (Phase 4.7):
   - "Request Access" button in BrowseJobs when consultant views category requiring approval
   - Button appears only when consultant lacks access to selected category
   - Fetches consultant categories and validates eligibility client-side
   - CategoryAccessRequestDialog integrated for seamless request submission

6. **Delivery/Warranty/Compliance Configuration** (Phase 5):
   - Admin UI in CategoryFormDialog with dedicated tabs
   - Delivery Options: JSON textarea for shipping methods, delivery times, fee structure
   - Warranty Config: JSON textarea for duration, terms, support options
   - Compliance Requirements: Full tag-based UI with add/remove functionality (already complete)
   - All configs persist as JSONB/array in categories table

### Consultant Flow
1. **Access Request Submission** (requires approved consultant profile):
   - Navigate to consultant dashboard
   - View "My Category Access Requests" card
   - Submit new request via CategoryAccessRequestDialog
   - Provide years of experience and detailed reason
   - API: POST /api/category-requests (consultant role required)

2. **Request Status Tracking**:
   - View all submitted requests in dashboard card
   - Status badges: Pending (Clock icon), Approved (CheckCircle), Rejected (XCircle)
   - Monitor admin review notes and feedback
   - See verification badge and max concurrent jobs (if approved)
   - API: GET /api/category-requests (returns consultant's own requests only)

3. **Upon Approval**:
   - Receive verification badge (verified/premium/expert)
   - Gain capacity allocation (maxConcurrentJobs limit)
   - Category appears in consultant's available categories
   - Can now bid on jobs in approved category

### Admin Flow
1. **Review Pending Requests**:
   - Navigate to Admin Portal → Category Requests
   - View tabs: Pending, Approved, Rejected
   - Review consultant details (name, email, experience, reason)
   - Check consultant's profile and history
   - API: GET /api/category-requests?status=all (admin role required)

2. **Approval Process**:
   - Click "Approve" button on pending request
   - Select verification badge level (verified/premium/expert)
   - Set concurrent job capacity limit (1-100)
   - Add optional review notes
   - API: PATCH /api/category-requests/:id/approve (admin role required)
   - Validations: consultant has approved profile, no duplicate approval, valid capacity

3. **Rejection Process**:
   - Click "Reject" button on pending request
   - Document reason in admin notes (required)
   - API: PATCH /api/category-requests/:id/reject (admin role required)

## Known Limitations & Deferred Tasks

### Current Limitations
1. **Category Switching in PostJob**: Changing category mid-form clears all custom field data. This is an intentional UX tradeoff to ensure data consistency when different categories have incompatible custom fields. Future enhancement: preserve compatible fields across category switches.

### Deferred Features (Phase 6+)
- **Phase 6**: Enhanced browse with advanced filters for jobs/consultants, analytics integration
- Category access expiry and re-verification workflow
- Capacity enforcement in active job tracking (maxConcurrentJobs currently approved but not actively enforced)
- JSON schema validation for delivery/warranty configurations (currently uses free-form JSON textarea)

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
- **Category Access Request**: `client/src/components/`
  - CategoryAccessRequestDialog.tsx: Request submission dialog (integrated in Dashboard & BrowseJobs)
  - CategoryRequestsList.tsx: Dashboard widget showing request status
  - VerificationBadge.tsx: Badge display component with icon variants (Shield/Crown/Star)
- **Admin Portal**: `client/src/pages/AdminCategoryRequests.tsx`
  - Tabs for pending/approved/rejected requests
  - Approval dialog with badge and capacity settings
- **Browse Pages**: 
  - BrowseConsultants.tsx: Displays verification badges on search results
  - BrowseJobs.tsx: Shows "Request Access" button for categories requiring approval
- **Admin Category Management**: `client/src/components/admin/`
  - CustomFieldsBuilder.tsx: Visual builder for custom field definitions
  - CategoryFormDialog.tsx: Category creation/editing with tabs for basic info, custom fields, delivery, warranty, compliance
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
