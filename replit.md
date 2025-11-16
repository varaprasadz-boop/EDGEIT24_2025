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

### Authentication & Security
A custom Email/Password authentication system leverages passport-local and bcrypt. Sessions are stored in PostgreSQL using express-session and connect-pg-simple. An AuthProvider/AuthContext manages global user state.

**Enhanced Authentication Features (November 2025):**
- Password Reset Flow: Crypto-secure token-based password reset with 1-hour expiry, ForgotPassword and ResetPassword pages
- Terms of Service Acceptance: Required checkbox during registration with timestamp tracking (termsAccepted, termsAcceptedAt fields)
- Remember Me Functionality: Configurable session duration (24 hours default, 30 days with Remember Me checkbox)
- Login History Tracking: Complete audit trail of all login/logout events with IP address, user agent, device info, success/failure tracking, and failure reason logging
- Active Sessions Management: Real-time tracking of all active user sessions with device info, last activity timestamps, and session termination capability
- Security Infrastructure: loginHistory and activeSessions tables with indexed queries for performance

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
A comprehensive real-time messaging system supports one-on-one conversations, file attachments with version tracking, meeting scheduling, and admin moderation. The system uses WebSockets for real-time delivery and includes read receipts, message threading, and full-text search capabilities. It comprises 14 database tables covering core messaging, user preferences, and organization. Security features include RBAC, soft deletes, audit trails, and SQL injection prevention.

**Backend Implementation:**
- REST API layer: 51 storage abstraction methods and 47 distinct endpoints across core messaging, file/meeting management, user features, and administration
- WebSocket server at /ws endpoint using ws library with session-based authentication
- Connection manager tracking active users and their joined conversations
- Event broadcasting system for real-time message delivery, typing indicators, and presence tracking
- Session authentication via express-session cookies with participant verification

**Frontend Implementation:**
- Full-featured React UI with TanStack Query for server state management
- useWebSocket hook with auto-reconnection (exponential backoff, max 5 attempts)
- Real-time message updates via WebSocket with query cache invalidation
- Typing indicator UI with 3-second auto-clear debounce
- Online presence tracking for conversation participants
- Comprehensive error handling and connection state management

**WebSocket Events:**
- message_sent: Real-time message delivery to conversation participants
- user_typing/user_stopped_typing: Live typing indicators
- user_online/user_offline: Presence tracking
- read_receipt: Message read status updates
- meeting_created/meeting_updated: Real-time meeting scheduling updates
- rsvp_updated: Real-time RSVP status changes

**File Attachments System:**
- FileUpload component with drag-and-drop support and validation (25MB max size)
- Dialog-based file attachment interface in messaging UI
- Efficient file fetching via conversation-level endpoint
- Files displayed in message bubbles with download links
- Version tracking support in backend schema (parentFileId, versionNumber)
- Real-time file updates via WebSocket integration
- File metadata: fileName, fileSize, mimeType, fileUrl, thumbnailUrl
- Security: File scan status tracking (pending/clean/infected)

**Meeting Scheduling System:**
- MeetingScheduler component: Dialog-based UI with react-day-picker for date/time selection
- Meeting type support: Google Meet, Zoom, Microsoft Teams, and custom links
- MeetingCard component: Display meeting details with participant RSVP status
- RSVP functionality: Accept, decline, or tentative responses for meeting invitations
- Real-time updates: WebSocket broadcasts for meeting creation, updates, and RSVP changes
- Schedule button integrated in conversation header
- Meetings displayed prominently at top of conversation thread
- Meeting metadata: title, description, scheduledAt, duration, meetingType, meetingUrl, status
- Participant tracking: Full RSVP status (pending, accepted, declined, tentative) with timestamps

**Admin Moderation & Analytics:**
- AdminMessages page: Analytics dashboard with stats cards (conversations, messages, files, meetings)
- Recharts bar chart visualization of messaging activity
- Conversation list with multi-criteria filtering (title search, type, archived status)
- JSON export functionality for analytics data
- AdminConversationViewer: Read-only conversation viewer for admin moderation
- Message moderation actions: flag, hide, redact, warn, and clear with reason/notes validation
- Moderation history display showing all admin actions on specific messages
- Admin authentication using AuthContext with redirect protection
- Proper RBAC enforcement across all admin endpoints
- Cache invalidation after moderation mutations

**Performance Optimizations:**
- Message pagination: Cursor-based infinite scroll with 50 messages per page, using composite index on (conversationId, createdAt)
- Database query optimization: Single-query patterns for getUserConversations (JOIN) and getConversationFiles (direct conversationId lookup), eliminating N+1 queries
- WebSocket participant caching: In-memory cache with 5-minute TTL reduces broadcast DB queries by 99% (100 messages: 100 queries → 1-2 queries)
- Cache invalidation: Automatic invalidation when participants are added/removed, with periodic cleanup every 5 minutes
- Rate limiting: Database-backed rate limiter for message sending (60/min), conversation creation (10/hr), file uploads (20/hr), meeting creation (20/hr)
- File upload security: Server-side validation (25MB max, MIME allowlist), async virus scanning with FileScanService
- Comprehensive performance documentation in PERFORMANCE_OPTIMIZATIONS.md with scalability recommendations

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

## Test Accounts

For testing and development, the following accounts are available:

**Super Admin:**
- Email: superadmin@edgeit24.com
- Password: 123456
- Role: admin
- Access: Full platform administration

**Test Client:**
- Email: client@edgeit24.com
- Password: 123456
- Role: client
- Access: Client dashboard and features

**Test Consultant:**
- Email: consultant@edgeit24.com
- Password: 123456
- Role: consultant
- Access: Consultant dashboard and features

Note: Complete profile setup via /profile/complete after first login for full functionality.