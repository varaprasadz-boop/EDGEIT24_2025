# EDGEIT24 - B2B IT Marketplace

## Overview
EDGEIT24 is a B2B marketplace platform connecting businesses with IT service vendors. It facilitates project posting, competitive bidding, and comprehensive project lifecycle management, including payments and deliverables. The platform aims to streamline the process of acquiring and providing IT services, enhancing efficiency and transparency in the B2B IT sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with **React** and **Vite** for a fast development experience and optimized builds. It uses **Wouter** for client-side routing and **TanStack React Query** for server state management with explicit refetching. The UI is constructed using **shadcn/ui** and **Radix UI**, adhering to Material Design 3 principles with a "New York" style variant. It features CSS variables-based theming supporting light/dark modes with a primary brand green (`#00D9A3`) and dark navy (`#0A0E27`) scheme. Typography uses Inter and Manrope from Google Fonts. The build process leverages **TypeScript** in strict mode with path aliases, and **TailwindCSS** for styling.

### Backend
The backend utilizes **Express.js** with **TypeScript** for a minimal, unopinionated HTTP server framework, using ESM modules. It employs `tsx` for development and `esbuild` for production bundling. An `IStorage` interface is defined for CRUD operations, currently implemented with `MemStorage` (in-memory) but designed for future migration to PostgreSQL via **Drizzle ORM**. API routes are centrally organized under the `/api` prefix, with custom logging and consistent error handling.

### Authentication
The platform uses a custom Email/Password authentication system built with `passport-local` and `bcrypt` for password hashing (10 salt rounds). Sessions are stored in PostgreSQL using `express-session` and `connect-pg-simple`.
- **API Routes**:
    - `POST /api/auth/signup`
    - `POST /api/auth/login`
    - `POST /api/auth/logout`
    - `GET /api/auth/user`
- **Frontend Pages**: `/register` (two-step form), `/login`.
- **Integration**: `AuthProvider`/`AuthContext` manages global user state and provides authentication functionalities like login, logout, and active role detection, influencing routing and UI components.

### Database
**Drizzle ORM** is used for type-safe SQL query building with **PostgreSQL** (via Neon serverless driver). Schema definitions are shared and co-located with **Zod** validators for type safety and validation. `drizzle-kit` manages schema migrations.

### Admin Portal
The Admin Portal features a comprehensive i18n system with RTL support, using `i18next` and `react-i18next` for translations (English and Arabic). It includes an `AdminLayout` with a `shadcn` Sidebar for navigation across various modules (Overview, Operations, Finance, System).

**DataTable Component** (`client/src/components/admin/DataTable.tsx`):
- Production-ready foundation for all admin screens, architect-approved
- **Manual Pagination Mode**: Server-driven pagination with `manualPagination: true`
  - Fully decoupled from TanStack client-side operations (no sorting/pagination models)
  - Uses controlled pagination state via `pagination` and `onPaginationChange` props
  - Backend provides `pageCount` metadata for total pages
  - Sorting UI automatically disabled in manual mode (can add server sorting hooks later)
  - Pagination controls bypass TanStack helpers, call `onPaginationChange` directly
- **Client-Side Mode**: Auto pagination for in-memory datasets
  - Uses TanStack's built-in sorting and pagination models
  - Ideal for small datasets that don't require server pagination
- **Clamping Logic**: Prevents users getting stuck on invalid pages when filters reduce results
- **Empty State Handling**: Shows "No data" message while keeping pagination controls visible in manual mode

**FilterBar Component** (`client/src/components/admin/FilterBar.tsx`):
- Reusable search input, filter dropdowns, and active filter pills
- Triggers pagination reset on search/filter changes
- Fully bilingual with i18n support

**Completed Screens**:
- Categories Management (`/admin/categories`): Server-side pagination, bilingual name display, Featured/Active filters, search across name/nameAr/slug fields
- Bids Management (`/admin/bids`): Server-side pagination, status filtering (pending, shortlisted, accepted, rejected, withdrawn), job filtering, search across consultant name/email/job title/cover letter, displays bid details with consultant info, client info, proposed budget (SAR), duration, submission date, and viewed status. Uses proper table aliasing (`consultantUser`, `clientUser`) via `drizzle-orm/pg-core` for multi-table joins
- Payments Management (`/admin/payments`): Server-side pagination, status filtering (pending, processing, completed, failed, refunded), type filtering (deposit, release, refund, withdrawal), search across transaction ID/project title/payer-payee names & emails/description, displays payment details with transaction ID, project title, payer info, payee info, amount (SAR with 2 decimals), type, status, payment method, and transaction date. Uses proper table aliasing (`payerUser`, `payeeUser`) via `drizzle-orm/pg-core` for multi-table joins. Requires `finance:view` permission
- Contracts Management (`/admin/contracts`): Server-side pagination, status filtering (not_started, in_progress, paused, completed, cancelled, disputed), client/consultant ID filtering, date-range filtering, search across project title/description/job title/client-consultant names & emails, displays contract details with project title, job title, client info, consultant info, budget (SAR), bid amount (SAR), status, milestone progress, payment totals (SAR with transaction count), dispute count, and creation date. Uses proper table aliasing (`clientUser`, `consultantUser`) and joins with jobs, bids, payments, and disputes tables. Includes aggregated payment totals and dispute counts via subqueries. Requires `finance:view` permission

### Dashboard & Profile Management
- **Client Dashboard**: Displays active jobs, bids, spending, and messages.
- **Consultant Dashboard**: Shows available jobs, active bids, earnings, and ratings.
- **Client Profile (`/profile/client`)**: Allows viewing and editing of company information, industry, size, website, location, and description.
- **Consultant Profile (`/profile/consultant`)**: Enables creation, viewing, and editing of profiles including full name, title, bio, skills, hourly rate, experience, availability, portfolio showcases, and service packages. Features include a skills tag manager, CRUD for portfolio items, service packages, and a weekly availability calendar.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: For database hosting.
- **@neondatabase/serverless**: PostgreSQL driver with WebSocket support.

### UI Components
- **Radix UI**: Unstyled, accessible component primitives (Accordion, Alert Dialog, Avatar, Checkbox, Dialog, Dropdown Menu, Form controls, Navigation Menu, Popover, Select, Tabs, Toast notifications, Tooltip).
- **Lucide React**: Icon library.

### Development Tools
- **Replit Plugins**: Development banner and cartographer.
- **Runtime Error Overlay**: Vite plugin for development error reporting.

### Form Handling & Validation
- **React Hook Form**: Form state management.
- **@hookform/resolvers**: Validation integration for React Hook Form.
- **Zod**: Schema validation library.

### Utilities
- **class-variance-authority**: Type-safe variant styling.
- **clsx + tailwind-merge**: Conditional className composition.
- **cmdk**: Command palette/search interface.
- **date-fns**: Date manipulation and formatting.
- **nanoid**: Unique ID generation.

### Session Management
- **connect-pg-simple**: PostgreSQL-backed session store.

### Planned Integrations
- Payment processing system.
- File upload/storage service.
- Email/OTP service for 2FA.
- Video conferencing integration (Google Meet/Zoom).