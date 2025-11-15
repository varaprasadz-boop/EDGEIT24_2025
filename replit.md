# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace platform connecting businesses with IT service vendors. It enables project posting, competitive bidding, and comprehensive project lifecycle management, including payments and deliverables. The platform aims to streamline the acquisition and provision of IT services, enhancing efficiency and transparency in the B2B IT sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React, Vite, Wouter for routing, and TanStack React Query for server state management. UI components are built with shadcn/ui and Radix UI, adhering to Material Design 3 with a "New York" style variant. It supports light/dark modes with a primary brand green and dark navy scheme, utilizing CSS variables and TailwindCSS. TypeScript is used in strict mode.

### Backend
The backend is built with Express.js and TypeScript, using tsx for development and esbuild for production. It features an IStorage interface, with current MemStorage and planned PostgreSQL via Drizzle ORM. API routes are under `/api` with custom logging and consistent error handling.

### Authentication
A custom Email/Password authentication system uses passport-local and bcrypt. Sessions are stored in PostgreSQL using express-session and connect-pg-simple. An AuthProvider/AuthContext manages global user state and authentication functionalities.

### Engagement Model Registration & Payment System
All new users must select an engagement plan (Basic/Professional/Enterprise) during registration, which determines feature access and payment requirements. The system includes a robust security architecture for payment processing, session integrity, and multi-layer validation, preventing price manipulation and ensuring data consistency. User flows are defined for both free and paid plans, with a mock payment gateway for development.

### Database
Drizzle ORM provides type-safe SQL query building with PostgreSQL (Neon serverless driver). Schema definitions are co-located with Zod validators, and drizzle-kit manages migrations.

### Admin Portal
The Admin Portal features an i18n system with RTL support for English/Arabic. It includes an AdminLayout with a shadcn Sidebar and a DataTable component for manual/client-side pagination and filtering. Key management screens include Profile Approvals, Categories, Users, Bids, Payments, Contracts, Vendors, Disputes, Subscription Plans, Email Templates, and Settings.

### Content Management System (CMS)
A full bilingual CMS allows admins to manage legal pages, footer links, and home page sections with rich text editing. Content supports English/Arabic with automatic language-based rendering and RTL support. Frontend components dynamically render legal pages and home sections with DOMPurify XSS sanitization. Admin screens enable CRUD operations for content.

### 3-Level Hierarchical Category System
The platform utilizes a 3-level category hierarchy (Primary, Subcategories, Super-subcategories) with bilingual content. This system is crucial for job postings, consultant services, and marketplace navigation, enforced by server-side validation.

### Dashboard & Profile Management
Both Client and Consultant Dashboards display relevant information (active jobs/earnings, bids, messages) and approval status banners with profile completion progress and unique IDs. Dual-role users can switch between views. Client profiles capture company details, while Consultant profiles include comprehensive personal, professional, and financial information. Verification badges (email, phone, identity, business registration) provide trust indicators. A Quick Quote System allows clients to request quotes from consultant profiles, with security enforced by role validation. Language proficiency tracking and Pricing Templates are also supported for consultants.

### Security & State Machine
Profile update endpoints strip protected fields to prevent privilege escalation. Profile status follows an enforced state machine from registration to admin approval, with partial updates managed via `.partial()` schemas and payload sanitization.

### Job Posting & Category Integration
Job posting requires client authentication and features a cascading 3-level category selector. Job and consultant browsing support hierarchical category filtering, including all descendant categories.

## External Dependencies

### Database
- Neon Serverless PostgreSQL
- @neondatabase/serverless

### UI Components
- Radix UI
- Lucide React

### Internationalization (i18n)
- react-i18next
- i18next (English and Arabic)

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

### Planned Integrations
- Payment processing system
- File upload/storage service
- Email/OTP service for 2FA
- Video conferencing integration