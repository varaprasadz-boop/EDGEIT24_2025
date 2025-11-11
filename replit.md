# EDGEIT24 - B2B IT Marketplace

## Overview

EDGEIT24 is a B2B marketplace platform that connects businesses seeking IT services with qualified IT vendors. The platform enables clients to post project requirements, receive competitive bids from vendors, and manage the entire project lifecycle including payments and deliverables. The application follows a modern full-stack architecture with React frontend and Express backend, utilizing PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## Test Credentials

**IMPORTANT: Use these credentials consistently for all testing and development:**

- **Super Admin**: superadmin@edgeit24.com / 123456
- **Client**: Client@mailinator.com / 123456
- **Consultant**: consultant@mailinator.com / 123456

These accounts should be pre-seeded in the database and used for all automated tests, manual testing, and development workflows. All test credentials use the password `123456`.

## System Architecture

### Frontend Architecture

**Framework Choice: React with Vite**
- **Rationale**: Vite provides fast development server and optimized production builds. React enables component-based UI architecture suitable for complex dashboard interfaces.
- **Routing**: Uses Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management, with query client configured for explicit refetching to prevent unnecessary API calls
- **Alternatives Considered**: Next.js was considered but ruled out due to the simpler SSR requirements and preference for separate frontend/backend architecture

**UI Component System: shadcn/ui with Radix UI**
- **Rationale**: Provides accessible, customizable components built on Radix UI primitives. Follows "New York" style variant for professional appearance.
- **Design System**: Material Design 3 principles adapted for B2B marketplace with emphasis on trust, professionalism, and information density
- **Theming**: CSS variables-based theming supporting both light and dark modes with primary brand color (#00D9A3 green) and dark navy (#0A0E27) scheme
- **Typography**: Inter for UI/body text, Manrope for headings, sourced from Google Fonts

**Build Configuration**
- **TypeScript**: Strict mode enabled with path aliases for clean imports (@/, @shared/, @assets/)
- **Styling**: TailwindCSS with custom configuration extending base color palette and border radius values
- **Bundling**: Vite with React plugin, separate client and server build outputs

### Backend Architecture

**Framework: Express.js with TypeScript**
- **Rationale**: Express provides minimal, unopinionated HTTP server framework suitable for REST API development
- **Module System**: ESM modules for modern JavaScript compatibility
- **Development**: tsx for TypeScript execution in development, esbuild for production bundling
- **Request Handling**: JSON body parsing with raw body preservation for webhook verification

**Storage Layer**
- **Interface Pattern**: IStorage interface defining CRUD operations, allowing for multiple implementations
- **Current Implementation**: MemStorage (in-memory) for development/testing
- **Design Decision**: Abstract storage interface enables easy migration to database-backed storage without changing business logic
- **Planned Migration**: PostgreSQL via Drizzle ORM (configuration present, not yet implemented in routes)

**API Structure**
- **Route Organization**: Centralized route registration in routes.ts with /api prefix for all application endpoints
- **Logging**: Custom request/response logging middleware with duration tracking and response body capture (truncated at 80 chars)
- **Error Handling**: Consistent error response format through middleware chain

**Authentication System**
- **Method**: Replit Auth (OIDC) exclusively - supports Google, GitHub, X, Apple, and email/password
- **Session Storage**: PostgreSQL-backed sessions via express-session and connect-pg-simple
- **Identity Linking**: Multi-lookup strategy prevents duplicate accounts:
  1. Check for existing user by replitSub (OIDC identity)
  2. Fall back to email lookup for local→OIDC migration
  3. Create new user if neither exists
- **User Lookup**: Added replitSub column to users table for seamless OIDC linking
- **Routes**:
  - `/api/login` - Initiates OIDC flow, redirects to Replit Auth
  - `/api/callback` - Handles OIDC callback, creates/links user, establishes session
  - `/api/logout` - Destroys session, redirects to home
  - `/api/auth/user` - Returns current user + profiles (client/consultant)
- **Frontend Integration**:
  - AuthProvider/AuthContext manages user state globally
  - useAuthContext hook provides: user, isLoading, isAuthenticated, login(), logout(), getActiveRole()
  - Role detection: "client" | "consultant" | "both" | null based on profile data
  - Auth-aware routing: Home page redirects authenticated users to /dashboard
  - Loading states prevent flashing unauthenticated content
  - Header component adapts menu based on auth state (avatar dropdown vs sign-in buttons)

### Database Schema

**ORM: Drizzle ORM**
- **Rationale**: Type-safe SQL query builder with excellent TypeScript integration and zero runtime overhead
- **Dialect**: PostgreSQL via Neon serverless driver with WebSocket support
- **Schema Location**: Shared schema definitions in shared/schema.ts for use across frontend and backend
- **Validation**: Zod integration via drizzle-zod for runtime schema validation

**Current Schema**
- **Users Table**: Basic user authentication structure with id (UUID), username (unique), and password fields
- **Design Pattern**: Schema definitions co-located with Zod validators for type safety and validation consistency

**Migration Strategy**
- **Tool**: drizzle-kit for schema migrations
- **Output**: migrations/ directory for version-controlled schema changes
- **Execution**: db:push script for applying migrations

### External Dependencies

**Database**
- **Service**: Neon Serverless PostgreSQL
- **Driver**: @neondatabase/serverless with WebSocket constructor for serverless environments
- **Connection**: Pool-based connection management via environment variable DATABASE_URL

**UI Components**
- **Radix UI**: Comprehensive set of unstyled, accessible component primitives
  - Accordion, Alert Dialog, Avatar, Checkbox, Dialog, Dropdown Menu, Form controls, Navigation Menu, Popover, Select, Tabs, Toast notifications, Tooltip
- **Lucide React**: Icon library for consistent iconography

**Development Tools**
- **Replit Plugins**: Development banner and cartographer for Replit-specific features (development only)
- **Runtime Error Overlay**: Vite plugin for enhanced error reporting during development

**Form Handling**
- **React Hook Form**: Form state management with @hookform/resolvers for validation
- **Zod**: Schema validation library integrated with forms and database schemas

**Utilities**
- **class-variance-authority**: Type-safe variant styling for components
- **clsx + tailwind-merge**: Conditional className composition with Tailwind optimization
- **cmdk**: Command palette/search interface component
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation for client-side resources

**Session Management**
- **connect-pg-simple**: PostgreSQL-backed session store (configured but not yet integrated with authentication flow)

**Planned Integrations** (based on design documents)
- Payment processing system
- File upload/storage service
- Email/OTP service for 2FA
- Video conferencing integration (Google Meet/Zoom)