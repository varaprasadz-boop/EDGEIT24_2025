# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace platform connecting businesses with IT service vendors. It enables project posting, competitive bidding, and comprehensive project lifecycle management, including payments, deliverables, and real-time messaging. The platform aims to streamline the acquisition and provision of IT services, enhancing efficiency and transparency in the B2B IT sector.

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
Both Client and Consultant Dashboards display relevant information (active jobs/earnings, bids, messages) and approval status banners with profile completion progress and unique IDs. Dual-role users can switch between views. Client profiles capture company details including contactEmail, contactPhone, and phoneCountryCode fields that are pre-filled from registration data and fully editable. Consultant profiles include comprehensive personal, professional, and financial information. Verification badges (email, phone, identity, business registration) provide trust indicators. A Quick Quote System allows clients to request quotes from consultant profiles, with security enforced by role validation. Language proficiency tracking and Pricing Templates are also supported for consultants.

#### Client Profile Pre-fill
On first visit to `/profile/client`, the profile form automatically enters edit mode and pre-fills company name, contact email, contact phone, and phone country code from the user's registration data. All fields remain editable, allowing users to update contact information separate from their authentication credentials. Contact fields use react-hook-form with proper FormField registration to ensure data persistence.

#### Settings Page
Users can change their password via `/settings` which uses a secure flow requiring current password verification before accepting a new password. The form implements react-hook-form, shadcn Form components, and Zod validation with bcrypt hashing on the backend.

### Security & State Machine
Profile update endpoints strip protected fields to prevent privilege escalation. Profile status follows an enforced state machine from registration to admin approval, with partial updates managed via `.partial()` schemas and payload sanitization.

### Job Posting & Category Integration
Job posting requires client authentication and features a cascading 3-level category selector. Job and consultant browsing support hierarchical category filtering, including all descendant categories.

### Messaging & Collaboration System
A comprehensive real-time messaging system with 14 database tables supporting one-on-one conversations, file attachments with version tracking, meeting scheduling, and admin moderation. The system uses WebSocket for real-time delivery and includes read receipts, message threading, and full-text search capabilities.

#### Schema Design (14 Tables)

**Core Messaging (11 tables):**
- **conversations**: Container for all conversations with archived status tracking
- **conversation_participants**: Manages participant membership and enforces RBAC with role/status fields
- **messages**: Individual messages with RESTRICT cascade for audit retention, supports threading via replyToId self-reference
- **message_receipts**: Tracks delivered/read status with composite index (message_id, user_id, read_at) for unread queries
- **message_templates**: Quick reply templates with usage tracking
- **message_files**: File attachments with version tracking
- **meeting_links**: Scheduled meetings within conversations
- **meeting_participants**: RSVP tracking for meetings
- **meeting_reminders**: Automated reminder system
- **conversation_labels**: Custom labels for organizing conversations
- **message_moderation**: Admin moderation actions with audit trail

**User Preferences & Organization (3 tables):**
- **conversation_preferences**: Per-user conversation settings (notificationsEnabled, soundEnabled, previewEnabled)
- **conversation_pins**: Dedicated pin tracking with custom displayOrder
- **file_versions**: Complete file version history ledger tracking originalFileId and versionFileId relationships

**Enhanced Integrations:**
- **notifications** (enhanced): Added relatedConversationId and relatedMessageId FK fields for messaging analytics

#### Audit & Security Features
- Messages use RESTRICT cascade on conversation deletion to preserve audit trail
- File version history preserved via SET NULL cascade
- Role-based access control via conversation_participants.role and status fields
- Soft delete support for messages (deleted/deletedAt fields)
- Admin moderation tracking with full audit trail
- Composite indexes for unread queries: (message_id, user_id, read_at)

#### Backend Implementation (REST API - COMPLETED)

**Storage Layer (IStorage Interface - 51 Methods):**
Complete storage abstraction with 51 methods covering all messaging operations including conversations, participants, messages, receipts, files, file versions, meetings, templates, labels, preferences, pins, moderation, and search. Two-step query pattern used to avoid Drizzle QueryResult type unions.

**Core Messaging Endpoints (14 endpoints):**
- POST /api/conversations - Create conversation
- GET /api/conversations - List user's conversations
- GET /api/conversations/:id - Get conversation details
- PATCH /api/conversations/:id - Update conversation
- DELETE /api/conversations/:id - Delete conversation
- POST /api/conversations/:id/participants - Add participant
- GET /api/conversations/:id/participants - List participants
- PATCH /api/conversation-participants/:id - Update participant role
- DELETE /api/conversation-participants/:id - Remove participant
- POST /api/conversations/:id/messages - Send message
- GET /api/conversations/:id/messages - Get messages
- POST /api/messages/:id/read - Mark message as read
- GET /api/conversations/:id/unread-count - Get unread count
- GET /api/receipts/:messageId - Get message receipts

**File & Meeting Endpoints (15 endpoints):**
- POST /api/conversations/:conversationId/files - Upload file (with membership verification)
- GET /api/conversations/:conversationId/files - List files
- GET /api/files/:fileId - Get file details (with access control)
- PATCH /api/files/:fileId - Update file (with access control)
- DELETE /api/files/:fileId - Delete file (with access control)
- POST /api/files/:fileId/versions - Create file version (with access control)
- GET /api/files/:fileId/versions - Get file versions
- POST /api/conversations/:conversationId/meetings - Schedule meeting
- GET /api/conversations/:conversationId/meetings - List meetings
- GET /api/meetings/:meetingId - Get meeting details
- PATCH /api/meetings/:meetingId - Update meeting
- DELETE /api/meetings/:meetingId - Cancel meeting
- POST /api/meetings/:meetingId/participants - Add participant
- PATCH /api/meeting-participants/:id - Update RSVP
- POST /api/meetings/:meetingId/reminders - Create reminder

**User Feature Endpoints (13 endpoints):**
- GET /api/messages/search - Full-text message search (scoped to user's conversations)
- POST /api/message-templates - Create template
- GET /api/message-templates - Get user's templates
- PATCH /api/message-templates/:id - Update template
- DELETE /api/message-templates/:id - Delete template
- POST /api/conversations/:conversationId/labels - Add label
- GET /api/conversations/:conversationId/labels - Get labels
- DELETE /api/conversation-labels/:labelId - Remove label
- GET /api/conversation-preferences/:conversationId - Get preferences
- PUT /api/conversation-preferences/:conversationId - Upsert preferences
- POST /api/conversations/:conversationId/pin - Pin conversation
- DELETE /api/conversations/:conversationId/pin - Unpin conversation
- GET /api/conversations/pinned - Get pinned conversations

**Admin Endpoints (5 endpoints):**
- GET /api/admin/messaging/conversations - List all conversations
- GET /api/admin/messaging/conversations/:id - View any conversation
- POST /api/admin/messaging/messages/:messageId/moderate - Moderate message
- GET /api/admin/messaging/messages/:messageId/moderation-history - Get moderation history
- GET /api/admin/messaging/stats - Get messaging statistics

**Security Implementation:**
- All endpoints require isAuthenticated middleware
- Admin endpoints additionally require isAdmin middleware
- Conversation membership verified before file/meeting operations
- User-scoped queries for search, templates, labels, preferences, pins
- Access control prevents unauthorized conversation access
- Protected fields stripped from update operations
- SQL injection prevention via Drizzle ORM parameterized queries

**Status:** Backend REST API layer complete and validated by architect review (Phases 1.1-1.5). Ready for frontend integration and WebSocket implementation.

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