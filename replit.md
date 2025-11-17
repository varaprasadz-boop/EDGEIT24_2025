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

**Payment & Escrow System:** A comprehensive SAR-only payment system with 15% VAT compliance, featuring secure escrow workflows for project payments, professional invoice generation with email delivery, wallet management with transaction history, flexible refund workflows, and payment analytics. The system includes:

- **Escrow Management:** Secure fund holding during project execution with milestone-based releases, automatic status tracking (pending → held → released → refunded), authorization verification, and detailed transaction logging.

- **Invoice System:** Professional invoice generation with auto-numbered invoices (INV-YYYY-NNNN format), line item support, automatic VAT calculation (15%), multi-status lifecycle (draft → sent → paid → overdue → cancelled), print-ready HTML with EDGEIT24 branding, and email delivery with PDF generation capability.

- **Wallet Management:** Digital wallet system for platform users with deposit/withdrawal support, transaction history with pagination and filtering, balance tracking with security validations, comprehensive transaction categorization (escrow_hold, escrow_release, invoice_payment, refund, withdrawal, deposit, platform_fee), and proper authorization checks.

- **Refund Workflows:** Multi-stage refund processing with reason tracking, admin approval requirements, automatic wallet crediting, escrow fund reversal, and detailed audit trails.

- **Payment Analytics:** Role-based analytics dashboards showing revenue metrics, transaction volumes, payment method distributions, wallet balances, escrow statistics, and invoice status breakdowns. Consultants see earnings data, clients see payment history, admins see platform-wide financial metrics.

- **Service Layer:** Email service for invoice delivery with professional HTML/text templates and environment-aware URL handling. Invoice PDF service generates print-ready HTML invoices with proper SAR currency formatting (2 decimal places), responsive design with print media queries, and status-based badge styling.

The system includes 5 database tables (escrow_transactions, invoices, wallet_transactions, wallet_balances, refund_requests) with 40 REST API endpoints covering escrow operations, invoice management, wallet transactions, refund processing, and payment analytics. All currency operations enforce SAR-only with 15% VAT. Invoice emails integrate with existing email infrastructure, ready for production email provider integration.

**Frontend Implementation:** Complete payment system UI with role-based interfaces:
- **Consultant Pages:** Invoice list (`/consultant/invoices`), invoice creation (`/consultant/invoices/create`), invoice detail with email sending (`/consultant/invoices/:id`)
- **Client Pages:** Invoice list with overdue tracking (`/client/invoices`), invoice detail with payment functionality (`/client/invoices/:id`)
- **Universal Wallet:** Balance display, deposit/withdrawal dialogs, transaction history with filtering and pagination (`/wallet`)
- **Admin Pages:** Refund request management with approval/rejection workflow (`/admin/refunds`), comprehensive payment analytics dashboard (`/admin/payment-analytics`)

All pages follow Material Design 3 guidelines with proper loading states, error handling, responsive layouts, and data-testid attributes for testing. Payment workflows integrated with existing authentication, toast notifications, and React Query for state management.

**Critical API Integration Fixes (Nov 17, 2025):**
- Invoice download: Fixed all download buttons to use correct `/api/invoices/:id/pdf` endpoint (was incorrectly using `/download`)
- Invoice email: Fixed send-email payload to include required `recipientEmail` field with proper client email lookup
- Wallet operations: Fixed deposit/withdraw to use correct endpoints (`/add-funds`, `/withdraw`) with string amounts formatted via `.toFixed(2)` matching backend regex validation `^\d+(\.\d{1,2})?$`
- Invoice payment: Added new POST `/api/invoices/:id/pay` endpoint with full payment workflow (client verification, status validation, balance check, wallet deduction via `withdrawFromWallet()`, invoice marking as paid via `markInvoiceAsPaid()`)

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