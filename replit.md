# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace platform connecting businesses with IT service vendors. It enables project posting, competitive bidding, and comprehensive project lifecycle management, including payment processing, deliverable tracking, and real-time communication. The platform aims to enhance efficiency and transparency in the B2B IT sector by streamlining the acquisition and provision of IT services. The business vision is to become the leading platform for B2B IT service procurement, offering significant market potential by optimizing service acquisition and delivery.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React, Vite, Wouter for routing, and TanStack React Query for server state management. UI components leverage shadcn/ui and Radix UI, adhering to Material Design 3 with a "New York" style. It supports light/dark modes with a primary brand green and dark navy scheme, using CSS variables and TailwindCSS. TypeScript is strictly enforced.

### Backend
The backend utilizes Express.js and TypeScript, with `tsx` for development and `esbuild` for production. It implements an `IStorage` interface, supporting MemStorage and PostgreSQL via Drizzle ORM. API routes are under `/api`, featuring custom logging and consistent error handling.

### Authentication & Security
A custom Email/Password authentication system uses passport-local and bcrypt. Sessions are stored in PostgreSQL via express-session and connect-pg-simple. An AuthProvider/AuthContext manages global user state. Enhanced features include a secure password reset flow, Terms of Service acceptance tracking, "Remember Me" functionality, comprehensive login history tracking, active session management, and detailed user activity logging. A security dashboard UI is available for users to manage their security settings. Two-Factor Authentication (2FA) via TOTP is implemented with a secure setup flow, backup codes, and session invalidation on activation. Admin users have access to an Admin Security Dashboard for comprehensive security analytics and activity log monitoring with export functionality.

### Engagement Model Registration & Payment System
Users select an engagement plan during registration, determining feature access and payment requirements. The system ensures robust security for payment processing, session integrity, and multi-layer validation against price manipulation. A mock payment gateway is used for development.

### Database
Drizzle ORM is used for type-safe SQL query building with PostgreSQL (Neon serverless driver). Schema definitions are co-located with Zod validators, and `drizzle-kit` manages migrations.

### Admin Portal
The Admin Portal includes an i18n system with RTL support (English/Arabic). It features an AdminLayout with a shadcn Sidebar and DataTable for pagination and filtering. Key management areas include Profile Approvals, Categories, Users, Bids, Payments, Contracts, Vendors, Disputes, Subscription Plans, Email Templates, and Settings.

### Content Management System (CMS)
A bilingual CMS enables administrators to manage legal pages, footer links, and home page sections with rich text editing, supporting English/Arabic and RTL. Frontend components render content dynamically with DOMPurify XSS sanitization.

### 3-Level Hierarchical Category System
A 3-level category hierarchy (Primary, Subcategories, Super-subcategories) with bilingual content is implemented for job postings, consultant services, and marketplace navigation, enforced by server-side validation.

### Dashboard & Profile Management
Client and Consultant Dashboards display relevant information and approval status. Dual-role users can switch views. Profiles capture and allow editing of company/personal details, professional information, and financial data. Consultant profiles include verification badges, a Quick Quote System, language proficiency tracking, and Pricing Templates. Client profile forms pre-fill contact information. A secure password change functionality is available. Profile update endpoints strip protected fields, and profile status follows an enforced state machine with partial updates managed via `.partial()` schemas and payload sanitization.

#### Enhanced Profile Fields (Phase 1 - Completed)
**Client Profiles** now include:
- Business Type dropdown (Individual, Company, Enterprise)
- Industry selection (15 industries: Technology, Finance, Healthcare, etc.)
- Region selection (13 Saudi regions: Riyadh, Jeddah, Makkah, etc.)
- Enhanced Company Size options (1-10, 11-50, 51-200, 201-500, 501+)

**Consultant Profiles** now include Business Information section with:
- Year Established (with validation)
- Employee Count (1-10, 11-50, 51-200, 201+ employees)
- Business Registration Number (for CR numbers)
- Operating Regions (comma-separated, displayed as badges)

**Service Packages** enhanced with:
- Add-ons (comma-separated list, displayed as badges)
- Revisions Included (number)
- Support Duration (e.g., "30 days", "90 days")

All fields are functional in both edit and view modes with proper data-testid attributes for testing.

#### Review System (Phase 2.1-2.2 - Completed)
A comprehensive review submission system enables clients to rate consultants after project completion:
- **ReviewForm Component**: Reusable form with 1-5 star ratings, optional text comments, and category ratings (communication, quality, timeliness)
- **Dashboard Integration**: "Leave Review" button appears on completed projects with consultants, opens dialog with pre-filled form
- **Dynamic Project Selection**: Component accepts projects prop for standalone use or pre-filled projectId for dashboard integration
- **Backend Integration**: Connects to existing `/api/reviews` POST endpoint with proper authentication and validation
- Full data-testid coverage for automated testing

#### Team Members Management (Phase 2.4 - Completed)
A comprehensive team collaboration system enables clients to invite and manage team members with role-based access control:
- **Database Schema**: teamMembers table with fullName, email, roles (owner, admin, member, viewer), granular permissions (canViewProjects, canEditProjects, canManageTeam, canManageBilling), invitation tokens with expiry, and status tracking (pending, accepted, declined, revoked)
- **Storage Methods**: Full CRUD operations including invite, get, update, revoke, accept, decline, resend, and token-based retrieval
- **API Routes**: Complete REST endpoints (GET/POST/PUT/DELETE) with authentication, authorization, and validation
  - POST /api/team-members - Invite new team member
  - GET /api/team-members - List all team members
  - PUT /api/team-members/:id - Update member role/permissions
  - DELETE /api/team-members/:id - Revoke member access
  - POST /api/team-members/:id/resend - Resend invitation with new token
  - POST /api/team-members/accept/:token - Accept invitation (public)
  - POST /api/team-members/decline/:token - Decline invitation (public)
- **Client Profile UI**: Rich interface in ClientProfile.tsx with invite dialog, member list with avatars, role/permission badges, actions dropdown (edit, resend, revoke), and proper React Query integration
- **Security**: Role-based permissions, invitation token expiry (7 days), ownership verification, and complete audit trail
- Full data-testid coverage for automated testing

#### Advanced Search System (Phase 3.1-3.3 - Completed)
A production-grade search system with comprehensive filtering, pagination, and security hardening:

**Phase 3.1: Saved Searches Schema**
- **savedSearches table**: Stores user search criteria with userId, searchType (job/consultant), filters (JSONB), name, createdAt
- **Security**: Ownership verification, immutable userId/createdAt fields, API-layer validation via Zod

**Phase 3.2: Job Search API** (`GET /api/jobs/search`)
- **9 Filters**: search (text), categoryId (UUID, hierarchical), minBudget, maxBudget, skills (comma-separated), experienceLevel (enum), status, budgetType (enum), limit (1-100), offset
- **Features**: Full-text search (title/description), hierarchical category filtering (includes descendant categories), array overlap for skills, pagination
- **Security Architecture**:
  - Strict Zod validation with `strictOptionalString` preprocessor (returns `z.NEVER` for non-strings, prevents filter bypass and DoS via malicious `toString()`/`Symbol.toPrimitive`)
  - UUID validation: `strictOptionalString.pipe(z.string().uuid()).optional()`
  - Enum validation: `z.enum([...]).optional()`
  - SQL injection prevention: All parameters bound via `sql.param(value, 'type')`, array overlap uses `sql.param(array, 'text[]')`, category filtering uses `inArray()` with validated UUIDs
  - Single source of truth: ALL validation at API layer (routes), storage layer assumes trusted inputs
- **Response**: `{ results: Job[], total: number }`

**Phase 3.3: Consultant Search API** (`GET /api/consultants/search`)
- **10 Filters**: search (text), categoryId (UUID, hierarchical), minRate, maxRate, skills (comma-separated), experience (enum), minRating (0-5), operatingRegions (comma-separated), availability (enum), verified (boolean)
- **Features**: Full-text search (name/bio/company), hierarchical category filtering via junction table, skills/regions array overlap, rating filtering
- **Security**: Identical security architecture to job search (strict Zod preprocessing, SQL parameterization, enum validation, filter bypass prevention)
- **Response**: `{ results: ConsultantProfile[], total: number }`

**Security Validations Enforced:**
- ✅ SQL Injection: BLOCKED via `sql.param()` for all text/arrays, `inArray()` for UUIDs
- ✅ DoS via toString/Symbol.toPrimitive: BLOCKED via `strictOptionalString` preprocessor with `z.NEVER`
- ✅ Filter bypass: BLOCKED (non-strings rejected, not converted to undefined)
- ✅ UUID injection: BLOCKED via `.uuid()` validation
- ✅ Enum injection: BLOCKED via `z.enum()` validation
- ✅ Type coercion attacks: BLOCKED via strict preprocessing BEFORE any Zod coercion

All search APIs architect-approved as production-ready with zero security vulnerabilities.

### Job Posting & Category Integration
Job posting requires client authentication and features a cascading 3-level category selector. Job and consultant browsing support hierarchical category filtering.

### Messaging & Collaboration System
A comprehensive real-time messaging system supports one-on-one conversations, file attachments with version tracking, meeting scheduling, and admin moderation. It uses WebSockets for real-time delivery, includes read receipts, message threading, and full-text search. The system is secured with RBAC, soft deletes, audit trails, and SQL injection prevention. The backend provides a REST API layer and a WebSocket server for real-time communication. The frontend features a full-featured React UI with `useWebSocket` hook for real-time updates, typing indicators, and online presence tracking.
Key features include:
-   **File Attachments**: Drag-and-drop file uploads with validation, version tracking, and security features like virus scanning.
-   **Meeting Scheduling**: Dialog-based UI for scheduling meetings with various platform options (Google Meet, Zoom, etc.), RSVP functionality, and real-time updates.
-   **Admin Moderation**: An AdminMessages page provides analytics, conversation listing with filtering, and read-only viewing for moderation. Admin actions like flag, hide, redact, warn, and clear messages are supported with audit trails.
-   **Performance Optimizations**: Includes cursor-based infinite scroll for messages, optimized database queries (e.g., single-query patterns, composite indexes), WebSocket participant caching, and database-backed rate limiting for various actions.

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