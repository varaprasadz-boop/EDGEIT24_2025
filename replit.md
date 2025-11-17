# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace connecting businesses with IT service vendors. It facilitates project posting, competitive bidding, and comprehensive project lifecycle management, including payments, deliverable tracking, and real-time communication. The platform aims to enhance efficiency and transparency in the B2B IT sector, aspiring to be a leading solution for IT service procurement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React with Vite, shadcn/ui, and Radix UI components, styled with Material Design 3 ("New York" theme). It supports light/dark modes and features a brand-specific green and dark navy color scheme.

### Technical Implementations
**Frontend:** React, Vite, Wouter for routing, TanStack React Query for state management, strict TypeScript, and TailwindCSS.
**Backend:** Express.js with TypeScript, using `tsx` for development and `esbuild` for production. Features an `IStorage` interface with MemStorage and PostgreSQL via Drizzle ORM.
**Authentication & Security:** Custom Email/Password authentication using `passport-local` and `bcrypt`, including secure password reset, "Remember Me," login history, active session management, user activity logging, security dashboard, and TOTP-based 2FA.
**Database:** PostgreSQL (Neon serverless driver) with Drizzle ORM for type-safe SQL. Schema definitions are co-located with Zod validators, and `drizzle-kit` manages migrations.
**Admin Portal & CMS:** i18n support with RTL (English/Arabic). Provides management for profiles, categories, users, bids, payments, contracts, vendors, disputes, subscription plans, email templates, and settings. A bilingual CMS supports rich text editing and XSS sanitization for legal and home page content.
**Dynamic Category System:** A 3-level hierarchical system with unlimited IT categories, including 8 predefined types (human_services, software_services, hardware_supply, digital_marketing, infrastructure, cloud_services, cybersecurity, data_services), each allowing custom fields with validation.
**Dynamic Job Posting:** The "Post Job" page dynamically renders custom fields based on the selected category.
**Category Access Request Workflow:** Consultants request access to specialized categories, requiring admin approval, with status tracking and verification badge management.
**Dashboards & Profile Management:** Role-based dashboards. Profiles capture comprehensive details; consultant profiles include verification badges, a Quick Quote System, language proficiency, and Pricing Templates.
**Review System:** Clients submit 1-5 star ratings and comments post-project.
**Team Members Management:** Clients manage team members with role-based access control.
**Advanced Search System:** Production-grade search for jobs and consultants with filtering, pagination, and security.
**Notifications System:** Comprehensive platform-wide notifications (email, push, in-app) with user preferences.
**Analytics Dashboard:** Role-based analytics for consultants, clients, and platform-wide metrics for admins.
**Document Management:** Centralized access to files from user conversations with version tracking.
**Consultant Portfolio:** Consultants can showcase completed projects.
**Messaging & Collaboration:** Real-time messaging with WebSockets, supporting one-on-one conversations, file attachments, meeting scheduling, read receipts, message threading, full-text search, and admin moderation. Includes RBAC, soft deletes, and audit trails.
**Enhanced Bidding & Proposal System:** Features comprehensive bid CRUD, bid lifecycle management, shortlisting, clarifications, view/comparison tracking, an RFQ system, and analytics. Supports category-specific bid types (service/hardware/software) with dynamic fields.
**Contract & Project Execution System:** A full-featured system for contract creation, milestone management, deliverable tracking, team collaboration, payment processing (mocked), and activity logging. Includes multi-layer authorization and security patterns like project ownership verification and role-based access.

**Delivery & Fulfillment System:** A comprehensive three-workflow system that automatically detects project types and provides appropriate delivery management tools:

- **Service-Based Delivery (File Versioning):** Complete version control for digital deliverables with automatic version numbering, change notes tracking, download history, version comparison, and rollback capabilities. Consultants upload new versions while clients track all file iterations.

- **Hardware Delivery (Shipping & Quality):** Full shipment lifecycle management including order creation, carrier tracking, status timeline with location updates, delivery confirmation with e-signatures, installation scheduling and completion tracking, quality inspection checklists with photo documentation, return/replacement workflows with automated approval processes, and warranty claim management with resolution tracking.

- **Software Delivery (License & Subscription):** Enterprise-grade license management with automatic license key generation, device activation limits and tracking, subscription billing cycles (monthly/quarterly/annual), trial period management, automatic renewal handling, subscription cancellation with reason tracking, multi-device activation management, and license expiration monitoring.

The system includes 9 database tables (deliverable_versions, deliverable_downloads, hardware_shipments, quality_inspections, returns_replacements, warranty_claims, software_licenses, software_subscriptions, software_activations) with 47 dedicated storage methods and 29 secure API endpoints. Projects automatically display the appropriate delivery workflow based on the job's category type (hardware_supply → Hardware, software_services → Software, all others → Service). The delivery tab is integrated into both consultant and client project detail pages with role-based permissions controlling workflow actions.

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