# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace designed to connect businesses with IT service vendors. It streamlines the process of posting projects, managing competitive bidding, and overseeing the entire project lifecycle, including payments, deliverable tracking, and real-time communication. The platform aims to improve efficiency and transparency within the B2B IT sector, aspiring to be a leading solution for IT service procurement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React, Vite, shadcn/ui, and Radix UI components, adhering to Material Design 3 ("New York" theme). It supports light/dark modes and features a brand-specific green and dark navy color palette.

### Technical Implementations
**Frontend:** React, Vite, Wouter for routing, TanStack React Query for state management, strict TypeScript, and TailwindCSS.
**Backend:** Express.js with TypeScript, using `tsx` for development and `esbuild` for production. It implements an `IStorage` interface with MemStorage and PostgreSQL via Drizzle ORM.
**Authentication & Security:** Custom Email/Password authentication (`passport-local`, `bcrypt`), including password reset, "Remember Me," login history, active session management, user activity logging, security dashboard, and TOTP-based 2FA.
**Database:** PostgreSQL (Neon serverless driver) with Drizzle ORM for type-safe SQL. Schema definitions are co-located with Zod validators, and `drizzle-kit` manages migrations.
**Role-Based Access Control (RBAC):** Comprehensive permission system with granular permissions across various domains. Features 6 predefined roles with customizable permission matrices. Permission-based middleware enforces access control with automatic admin activity logging (IP/userAgent tracking).
**Admin Portal & CMS:** Provides i18n support with RTL (English/Arabic) for managing various platform entities and content. Includes reusable builder components for complex configurations.
**User Approval Queue System:** Admin workflow for reviewing and approving pending user accounts with risk scoring, bulk/individual actions, filtering/sorting, and admin activity logging. Integrates with the Notification System.
**KYC Document Upload & Admin Review System:** Secure system for users to upload verification documents, with an admin review workflow, document viewing, approval/rejection, and secure download.
**Dynamic Category & Job Posting System:** A 3-level hierarchical category system with custom fields, dynamically rendering fields on the "Post Job" page.
**Consultant Workflow:** Includes category access requests, verification badge management, comprehensive consultant profiles with a Quick Quote System, language proficiency, and Pricing Templates.
**Dashboards & Profile Management:** Role-based dashboards for clients and consultants with metrics, widgets, and pending actions.
**Comprehensive Two-Way Review & Rating System:** Bidirectional review system with role-specific criteria, edit windows, responses, reporting, helpful voting, public/private visibility, file attachments, and role-based sections.
**Team Members Management:** Clients can manage team members with role-based access control.
**Advanced Search System:** Production-grade search with filtering and pagination for jobs and consultants.
**Notifications System:** Comprehensive notification platform covering 20 types with real-time WebSocket delivery and email notifications, including user preference controls.
**Analytics Dashboard:** Role-based analytics for consultants, clients, and admins.
**Document Management:** Centralized access to files from user conversations with version tracking.
**Consultant Portfolio:** Consultants can showcase completed projects.
**Messaging & Collaboration:** Real-time messaging via WebSockets with file attachments, meeting scheduling, read receipts, message threading, full-text search, and admin moderation.
**Enhanced Bidding & Proposal System:** Comprehensive bid CRUD, bid lifecycle management, shortlisting, clarifications, RFQ system, and analytics. Supports category-specific bid types.
**Contract & Project Execution System:** Full-featured system for contract creation, milestone management, deliverable tracking, team collaboration, payment processing (mocked), and activity logging.
**Delivery & Fulfillment System:** A three-workflow system (Service-Based, Hardware Delivery, Software Delivery) automatically tailored to project types.
**Payment & Escrow System:** A SAR-only payment system with 15% VAT compliance, featuring secure escrow workflows, professional invoice generation, wallet management, flexible refund workflows, and payment analytics.
**Search & Discovery System:** Comprehensive search and discovery capabilities with advanced job/project search, consultant search, search history, saved searches with email alerts, vendor list management, consultant invitation workflow, smart matching, side-by-side comparison, and admin search analytics.
**Saved Requirements & User Privacy:** Job bookmarking system for consultants and privacy controls for all users, including blocked users and profile visibility settings.
**Help & Support System:** Complete customer support and feedback platform with CMS-driven help content, support ticketing, and platform feedback collection.
**Dispute Resolution System:** Comprehensive conflict resolution system enabling users to raise and manage disputes with admin oversight, evidence management, and threaded communication.

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