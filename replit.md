# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace platform designed to connect businesses with IT service vendors. It facilitates project posting, competitive bidding, and comprehensive project lifecycle management, including payment processing, deliverable tracking, and real-time communication. The platform aims to enhance efficiency and transparency in the B2B IT sector by streamlining the acquisition and provision of IT services.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React with Vite, Wouter for routing, and TanStack React Query for server state management. UI components are built using shadcn/ui and Radix UI, adhering to Material Design 3 with a "New York" style variant. It supports light/dark modes with a primary brand green and dark navy scheme, utilizing CSS variables and TailwindCSS. TypeScript is strictly enforced.

### Backend
The backend is built with Express.js and TypeScript, using tsx for development and esbuild for production. It features an IStorage interface, with current MemStorage and planned PostgreSQL via Drizzle ORM. API routes are under `/api` and include custom logging and consistent error handling.

### Authentication
A custom Email/Password authentication system leverages passport-local and bcrypt. Sessions are stored in PostgreSQL using express-session and connect-pg-simple. An AuthProvider/AuthContext manages global user state.

### Engagement Model Registration & Payment System
Users select an engagement plan (Basic/Professional/Enterprise) during registration, determining feature access and payment requirements. The system incorporates robust security for payment processing, session integrity, and multi-layer validation to prevent price manipulation. A mock payment gateway is used for development.

### Database
Drizzle ORM is used for type-safe SQL query building with PostgreSQL (Neon serverless driver). Schema definitions are co-located with Zod validators, and drizzle-kit manages migrations.

### Admin Portal
The Admin Portal includes an i18n system with RTL support for English/Arabic. It features an AdminLayout with a shadcn Sidebar and a DataTable component for pagination and filtering. Key management areas include Profile Approvals, Categories, Users, Bids, Payments, Contracts, Vendors, Disputes, Subscription Plans, Email Templates, and Settings.

### Content Management System (CMS)
A bilingual CMS allows administrators to manage legal pages, footer links, and home page sections with rich text editing. Content supports English/Arabic with automatic rendering and RTL support. Frontend components dynamically render content with DOMPurify XSS sanitization.

### 3-Level Hierarchical Category System
The platform employs a 3-level category hierarchy (Primary, Subcategories, Super-subcategories) with bilingual content. This system is integral for job postings, consultant services, and marketplace navigation, enforced by server-side validation.

### Dashboard & Profile Management
Both Client and Consultant Dashboards display relevant information and approval status. Dual-role users can switch views. Client profiles capture and allow editing of company details. Consultant profiles include comprehensive personal, professional, and financial information, with verification badges for trust. A Quick Quote System is available. Language proficiency tracking and Pricing Templates are supported for consultants. Client profile forms pre-fill contact information from registration and are fully editable. A secure password change functionality is available through a dedicated settings page.

### Security & State Machine
Profile update endpoints strip protected fields to prevent privilege escalation. Profile status follows an enforced state machine from registration to admin approval, with partial updates managed via `.partial()` schemas and payload sanitization.

### Job Posting & Category Integration
Job posting requires client authentication and features a cascading 3-level category selector. Job and consultant browsing support hierarchical category filtering.

### Messaging & Collaboration System
A comprehensive real-time messaging system supports one-on-one conversations, file attachments with version tracking, meeting scheduling, and admin moderation. The system uses WebSockets for real-time delivery and includes read receipts, message threading, and full-text search capabilities. It comprises 14 database tables covering core messaging, user preferences, and organization. Security features include RBAC, soft deletes, audit trails, and SQL injection prevention. The backend REST API layer for messaging is complete, offering 51 storage abstraction methods and 47 distinct endpoints across core messaging, file/meeting management, user features, and administration. The frontend React UI for messaging is also complete, providing a full-featured, real-time interface with TanStack Query for server state management and robust error handling.

## External Dependencies

### Database
- Neon Serverless PostgreSQL
- @neondatabase/serverless

### UI Components
- Radix UI
- Lucide React

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

### Session Management
- connect-pg-simple