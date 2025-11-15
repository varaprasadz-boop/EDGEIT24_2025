# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace platform connecting businesses with IT service vendors. It facilitates project posting, competitive bidding, and comprehensive project lifecycle management, including payments and deliverables. The platform aims to streamline the process of acquiring and providing IT services, enhancing efficiency and transparency in the B2B IT sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses **React**, **Vite**, **Wouter** for routing, and **TanStack React Query** for server state. UI is built with **shadcn/ui** and **Radix UI**, adhering to Material Design 3 with a "New York" style variant. It supports light/dark modes with a primary brand green and dark navy scheme, utilizing CSS variables and **TailwindCSS**. **TypeScript** is used in strict mode.

### Backend
The backend is built with **Express.js** and **TypeScript**, using `tsx` for development and `esbuild` for production. It defines an `IStorage` interface, currently implemented with `MemStorage` and planned for **PostgreSQL** via **Drizzle ORM**. API routes are under `/api` with custom logging and consistent error handling.

### Authentication
A custom Email/Password authentication system uses `passport-local` and `bcrypt` for hashing. Sessions are stored in PostgreSQL using `express-session` and `connect-pg-simple`. An `AuthProvider`/`AuthContext` manages global user state and authentication functionalities.

### Database
**Drizzle ORM** provides type-safe SQL query building with **PostgreSQL** (Neon serverless driver). Schema definitions are shared and co-located with **Zod** validators. `drizzle-kit` manages migrations.

### Admin Portal
The Admin Portal features an i18n system with RTL support using `i18next` and `react-i18next` (English/Arabic). It includes an `AdminLayout` with a `shadcn` Sidebar for navigation. A `DataTable` component supports both manual (server-side) and client-side pagination, along with a `FilterBar` component for search and filtering. Key management screens implemented include:
- **Profile Approvals** (`/admin/profile-approvals`): Review and approve pending client/consultant profiles with tabs for each role type. Admins can approve (generates unique ID), reject (with notes), or request changes (moves to draft). Shows profile details including company/consultant info, skills, and submission dates.
- Categories, Users, Bids, Payments, Contracts, Vendors, Disputes, Subscription Plans, Email Templates, and Settings.

### 3-Level Hierarchical Category System
The platform uses a 3-level category hierarchy (Level 0: Primary, Level 1: Subcategories, Level 2: Super-subcategories) with bilingual content (English/Arabic). This system is central to job postings, consultant services, and marketplace navigation. Server-side validation enforces hierarchy rules, slug uniqueness, and delete protection. Public and Admin API routes support fetching, managing, and reordering categories. The frontend displays root categories on the homepage and dynamic landing pages for all levels with breadcrumbs.

### Dashboard & Profile Management
**Client Dashboard**: Displays active jobs, bids, spending, and messages, with an approval status banner showing profile completion progress and unique client ID upon approval.
**Consultant Dashboard**: Shows available jobs, active bids, earnings, and ratings, with an approval status banner showing profile completion progress and unique consultant ID upon approval.
Both dashboards integrate with React Query for role-specific data and display approval states (Approved, Pending, Rejected, Draft) with profile completion percentages.
**Client Profile**: Allows editing company information, industry, size, website, location, and description.
**Consultant Profile**: Enables creation and editing of profiles including personal details, bio, skills, hourly rate, experience, portfolio, and service packages, with features like a skills tag manager and availability calendar.

### Security & State Machine
**Protected Field Stripping**: Profile update endpoints use explicit destructuring to strip protected fields (profileStatus, approvalStatus, uniqueId, reviewedBy, reviewedAt) from user payloads before storage persistence, preventing privilege escalation attacks.

**State Transitions**: Profile status follows an enforced state machine:
- Registration: profileStatus='incomplete', approvalStatus='pending'
- Profile Edits: Status fields preserved (no auto-promotion)
- User Submit: Explicit transition to profileStatus='submitted' via `/api/profiles/{role}/submit`
- Admin Approval: Sets approvalStatus='approved', assigns unique ID (CLT-YYYY-XXXX or CNS-YYYY-XXXX)
- Post-Approval: Status fields protected from user modification

**Partial Updates**: PUT endpoints use `.partial()` schemas to allow incremental profile updates while protecting admin-controlled fields via payload sanitization.

### Job Posting & Category Integration
**Job Posting**: Requires authentication and client role. Features a cascading 3-level category selector for assigning jobs to a specific category.
**Category Filtering**: Browsing jobs or consultants supports hierarchical category filtering, where selecting a parent category includes all descendant categories in the results. The backend `listJobs()` function handles descendant category inclusion and role-based filtering.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**
- **@neondatabase/serverless**

### UI Components
- **Radix UI**
- **Lucide React**

### Internationalization (i18n)
- **react-i18next**
- **i18next** (English and Arabic)

### Development Tools
- **Replit Plugins** (Development banner, Cartographer)
- **Vite** (Runtime error overlay)

### Form Handling & Validation
- **React Hook Form**
- **@hookform/resolvers**
- **Zod**

### Utilities
- **class-variance-authority**
- **clsx**
- **tailwind-merge**
- **cmdk**
- **date-fns**
- **nanoid**

### Session Management
- **connect-pg-simple**

### Planned Integrations
- Payment processing system
- File upload/storage service
- Email/OTP service for 2FA
- Video conferencing integration (Google Meet/Zoom)