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

### Admin Portal & CMS
The Admin Portal supports i18n with RTL (English/Arabic) and features an AdminLayout with a shadcn Sidebar and DataTable. It manages Profile Approvals, Categories, Users, Bids, Payments, Contracts, Vendors, Disputes, Subscription Plans, Email Templates, and Settings. A bilingual CMS allows administrators to manage legal pages and home page content with rich text editing and DOMPurify XSS sanitization.

### Core Features
- **3-Level Hierarchical Category System**: Bilingual categories for job postings and marketplace navigation, enforced by server-side validation.
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