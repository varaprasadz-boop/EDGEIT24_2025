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

**Authentication System** (Updated: November 14, 2025)
- **Method**: Custom Email/Password Authentication using passport-local
- **Session Storage**: PostgreSQL-backed sessions via express-session and connect-pg-simple
- **Password Security**: bcrypt hashing with 10 salt rounds
- **Session Configuration**:
  - Development: `secure: false`, `sameSite: 'lax'` (HTTP compatible)
  - Production: `secure: true`, `sameSite: 'strict'` (HTTPS only)
  - Auto-creates sessions table if missing
- **API Routes**:
  - `POST /api/auth/signup` - Creates user account with email, password, role
  - `POST /api/auth/login` - Authenticates via passport-local
  - `POST /api/auth/logout` - Destroys session
  - `GET /api/auth/user` - Returns current user + profiles (or null if unauthenticated)
- **Frontend Pages**:
  - `/register` - Two-step form: role selection → email/password entry
  - `/login` - Email/password login form
- **Frontend Integration**:
  - AuthProvider/AuthContext manages user state globally
  - useAuth hook handles both authenticated and unauthenticated states
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
- **connect-pg-simple**: PostgreSQL-backed session store for Replit Auth sessions

## Recent Changes

### Authentication Migration to Custom Email/Password (November 14, 2025)
- **Migration Completed**: Switched from Replit Auth (OIDC) to custom email/password authentication
- **Reason**: User requested custom-branded login forms instead of external authentication page
- **New Backend Implementation**:
  - Created `server/auth.ts` with passport-local strategy
  - bcrypt password hashing (10 salt rounds)
  - Session-based authentication with PostgreSQL storage
  - Conditional cookie settings (secure/strict for production, relaxed for development)
  - Auto-creates sessions table if missing
- **New API Routes**:
  - `POST /api/auth/signup` - User registration with email, password, and role
  - `POST /api/auth/login` - Authentication via passport-local
  - `POST /api/auth/logout` - Session destruction
  - `GET /api/auth/user` - Returns `{ user: null }` when unauthenticated (frontend-compatible)
- **Updated Frontend**:
  - `/register` page - Two-step registration form (role selection → credentials)
  - `/login` page - Custom login form with email/password
  - Updated `useAuth` hook to handle new response format
  - Updated `AuthContext` logout to call POST endpoint
  - Updated Header component to link to `/login` instead of `/api/login`
- **Onboarding Flow**: Now works correctly - signup includes role and redirects to appropriate onboarding page
- **Security Features**:
  - Passwords never sent to client
  - bcrypt hashing for secure storage
  - Session-based authentication with PostgreSQL persistence
  - Environment-aware cookie settings

### Dashboard Implementation (November 11, 2025)

### Dashboard Implementation
- **Client Dashboard**: Displays active jobs, total bids received, spending stats, and message count using real database queries
- **Consultant Dashboard**: Shows available jobs (excluding own posts), active bids, earnings, and rating
- **API Endpoints**:
  - `/api/dashboard/client/stats` - Aggregates client dashboard metrics
  - `/api/dashboard/consultant/stats` - Aggregates consultant dashboard metrics
  - `/api/jobs?limit=N` - Lists client's jobs with pagination
  - `/api/bids?limit=N` - Lists bids on client's jobs with pagination
- **Features**: Loading states, error handling with retry buttons, React Query integration

### Client Profile Management
- **Page**: `/profile/client` - View and edit client profile information
- **API Endpoints**:
  - GET `/api/profile/client` - Fetches authenticated user's client profile
  - PUT `/api/profile/client` - Updates client profile with Zod validation
- **Fields**: Company name, industry, company size, website, location, description
- **Features**:
  - View mode displaying profile in organized cards (Company Info, Contact Details, About)
  - Edit mode with validated form (react-hook-form + Zod)
  - Proper handling of nullable database fields
  - Loading and error states with retry functionality
  - Success toast notifications on update
- **Navigation**: Accessible from Dashboard Quick Actions

### Consultant Profile Management
- **Page**: `/profile/consultant` - Create, view, and edit consultant profile
- **API Endpoints**:
  - GET `/api/profile/consultant` - Fetches profile (returns 404 if not exists)
  - PUT `/api/profile/consultant` - Upsert profile (create or update)
- **Core Fields**: Full name (required), title, bio, skills[], hourly rate, experience level, location, availability status
- **Advanced Features**:
  - **Skills Tag Manager**: Add/remove skills with comma-separated input
  - **Portfolio Showcase**: CRUD for portfolio items (title, description, URL)
  - **Service Packages**: CRUD for service offerings (name, description, price in SAR, delivery time)
  - **Weekly Availability Calendar**: Grid-based time slot selection (morning/afternoon/evening per weekday)
- **Data Structures**:
  - portfolio: JSONB array `[{title, description, url}]`
  - servicePackages: JSONB array `[{name, description, price, deliveryTime}]`
  - weeklySchedule: JSONB object `{monday: ["morning"], wednesday: ["afternoon"]}`
- **Create Profile Flow**:
  1. New consultant navigates to `/profile/consultant`
  2. Query enabled when user authenticated (enabled: !!user)
  3. GET returns 404 → query returns null (not error)
  4. Shows "Create Profile" button when `!profile && !isEditing`
  5. Click "Create Profile" → setIsEditing(true) → form renders
  6. User fills form, clicks Save → PUT creates profile (201 status)
  7. Query invalidates/refetches → profile displays in view mode
- **State Management**: useEffect initializes portfolio/servicePackages/weeklySchedule from profile data
- **Validation**: react-hook-form + Zod with fullName required

### Critical Authentication Bug Fix (November 11, 2025)
- **Issue**: All authenticated endpoints were attempting to access `req.user.id` which doesn't exist
  - `req.user` only contains OIDC claims (`.claims.sub`, `.claims.email`)
  - Resulted in null userId being passed to database operations
  - Database rejected inserts with "NOT NULL constraint violation" errors
- **Root Cause**: Confusion between session user object (has claims) and database user object (has id)
- **Solution**: Created `getUserIdFromRequest()` helper function in routes.ts
  - Looks up user from database using OIDC claims (replitSub, email, legacy sub)
  - Returns userId or null
  - Applied consistently to all authenticated endpoints:
    - `/api/dashboard/client/stats`
    - `/api/dashboard/consultant/stats`
    - `/api/jobs`
    - `/api/bids`
    - `/api/profile/client` (GET and PUT)
    - `/api/profile/consultant` (GET and PUT)
- **Pattern**: All endpoints now include:
  ```typescript
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ message: "User not found" });
  }
  ```

**Planned Integrations** (based on design documents)
- Payment processing system
- File upload/storage service
- Email/OTP service for 2FA
- Video conferencing integration (Google Meet/Zoom)