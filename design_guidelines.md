# EDGEIT24 Design Guidelines

## Design Approach

**Selected Framework:** Material Design 3 with Professional Dashboard Patterns

**Rationale:** EDGEIT24 is a complex B2B marketplace requiring clarity, trust, and efficiency. Material Design 3 provides robust patterns for data-heavy interfaces while maintaining modern aesthetics. We'll draw additional inspiration from Linear's typography precision and Stripe's professional restraint.

**Core Design Principles:**
- **Trust & Professionalism:** Clean, corporate aesthetic suitable for enterprise vendors and clients
- **Information Density:** Efficient use of space for dashboards, tables, and data displays
- **Clear Hierarchy:** Multi-level navigation and content organization
- **Scannable Content:** Easy comparison of bids, vendor profiles, and project details
- **Action-Oriented:** Clear CTAs for posting requirements, submitting bids, releasing payments

---

## Color Palette (Extracted from edgeit24.com)

**Brand Colors:**
- **Primary Green:** `#00D9A3` (HSL: 166 100% 43%) - Main brand color, CTAs, highlights, active states
- **Dark Navy:** `#0A0E27` (HSL: 232 57% 10%) - Headers, footers, dark backgrounds
- **Deep Blue Background:** `#0D1421` (HSL: 218 44% 9%) - Alternative dark section backgrounds

**Text Colors:**
- **Primary Text (on dark):** `#FFFFFF` (white) - Headlines, primary content
- **Secondary Text (on dark):** `#A0AEC0` (HSL: 210 22% 69%) - Supporting text, descriptions
- **Tertiary Text (on dark):** `#718096` (HSL: 210 14% 53%) - Meta information, timestamps

**Accent & UI:**
- **Success/Active:** `#00D9A3` (same as primary green)
- **Hover Accent:** `#00FFB8` (lighter green for hover states)
- **Card Background (light mode):** `#FFFFFF` with subtle shadow
- **Card Background (dark mode):** `#1A202C` (HSL: 210 24% 16%)
- **Border/Divider:** `#2D3748` (HSL: 210 29% 24%)

**Usage Guidelines:**
- Use dark navy (#0A0E27) for header and footer
- Use primary green (#00D9A3) sparingly for CTAs and important highlights
- Maintain high contrast between text and backgrounds
- Use gradient overlays on hero images for text readability

---

## Typography System

**Font Families:**
- Primary: Inter (via Google Fonts) - UI, body text, data
- Secondary: Manrope (via Google Fonts) - Headings, emphasis

**Type Scale:**
- Hero/Display: 3xl to 4xl, font-bold (Manrope)
- Page Titles: 2xl, font-bold (Manrope)
- Section Headers: xl, font-semibold (Manrope)
- Card Titles: lg, font-semibold (Inter)
- Body Text: base, font-normal (Inter)
- Metadata/Labels: sm, font-medium (Inter)
- Captions/Helper: xs, font-normal (Inter)

**Line Heights:** Use tight for headings (leading-tight), normal for body (leading-normal), relaxed for descriptions (leading-relaxed)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16, 20** for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-20
- Card gaps: gap-4 to gap-6
- Dashboard margins: mx-8, my-6

**Grid System:**
- Container max-width: max-w-7xl for dashboards
- Sidebar layouts: 250px fixed sidebar + flex main content
- Card grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Table layouts: Full-width with horizontal scroll on mobile

**Responsive Breakpoints:**
- Mobile: base (single column, stacked cards)
- Tablet: md (2-column grids, condensed sidebar)
- Desktop: lg and xl (full multi-column layouts, expanded sidebar)

---

## Component Library

### Navigation Components

**Top Header Bar:**
- Fixed top navigation with shadow
- Logo left, main navigation center, user menu/notifications right
- Height: h-16
- Icons: Heroicons outline for primary nav

**Sidebar Navigation:**
- Collapsible sidebar for dashboards (w-64 expanded, w-16 collapsed)
- Icon + label for menu items
- Active state with background highlight
- Grouped sections with dividers

**Breadcrumbs:**
- Show hierarchy for deep navigation
- Text sm with chevron separators
- Last item non-clickable

### Data Display Components

**Cards:**
- Rounded corners (rounded-lg)
- Subtle shadow (shadow-sm, hover:shadow-md)
- Padding: p-6
- White background with border
- For: Job listings, vendor profiles, bid cards, project summaries

**Tables:**
- Striped rows for readability
- Sticky header on scroll
- Sortable columns with arrow indicators
- Row actions (view, edit, delete) on right
- Pagination at bottom
- Responsive: Stack on mobile or horizontal scroll

**Stats/Metrics Cards:**
- Large number display (text-3xl, font-bold)
- Label below (text-sm)
- Trend indicator (up/down arrow with percentage)
- Icon representation (optional)
- Grid layout: 2x2 or 4x1

**Badges/Tags:**
- Rounded-full for status (In Progress, Completed, Pending)
- Skill tags: rounded-md, small padding
- Category badges: distinct visual treatment

### Form Components

**Input Fields:**
- Labels above inputs (text-sm, font-medium)
- Input height: h-10 to h-12
- Border with focus ring
- Helper text below (text-xs)
- Error states with red border and message

**Select Dropdowns:**
- Native select styling enhanced
- Multi-select with tag display
- Search within select for long lists

**Rich Text Editor:**
- For job descriptions, proposals, reviews
- Toolbar with formatting options
- Preview mode toggle

**File Upload:**
- Drag-and-drop zone
- File type restrictions displayed
- Upload progress indicator
- Preview thumbnails for images

**Search Bars:**
- Prominent placement with icon
- Auto-suggest dropdown
- Filter pills below for active filters
- Advanced filters toggle

### Action Components

**Primary Buttons:**
- Solid fill, rounded-md
- Height: h-10 to h-12
- Padding: px-6
- Font: font-medium
- States: hover with slight brightness, active with scale

**Secondary Buttons:**
- Outline style
- Same sizing as primary

**Icon Buttons:**
- Square or circular
- For actions in tight spaces (delete, edit, favorite)

### Communication Components

**Message Thread:**
- Two-column: Contact list (w-80) + conversation (flex-1)
- Messages alternate left/right based on sender
- Timestamps between message groups
- Input area fixed at bottom with attachment button

**Notification Dropdown:**
- Icon with badge counter in header
- Dropdown panel (w-96)
- Notification items with icon, text, time
- "Mark all read" action
- Link to full notifications page

### Modal/Overlay Components

**Modals:**
- Centered overlay with backdrop blur
- Max width based on content (max-w-lg to max-w-4xl)
- Header with title and close button
- Scrollable content area
- Footer with actions

**Tooltips:**
- Small, concise
- Appear on hover
- Dark background, white text

**Confirmation Dialogs:**
- Small modals for destructive actions
- Clear warning messaging

### Review & Rating Components

**Star Rating Display:**
- Large stars for overall rating
- Smaller stars in lists
- Half-star support
- Number beside stars (4.8/5)

**Review Cards:**
- Reviewer info (photo, name, date)
- Star rating
- Review text
- Project reference
- Helpful/Report actions

---

## Page-Specific Guidance

### Landing Page
- Hero section with large heading, subheading, dual CTA (For Clients / For Vendors)
- Category showcase grid (6-8 main categories with icons)
- "How It Works" process (3-step for clients, 3-step for vendors)
- Stats banner (total projects, vendors, success rate)
- Featured vendor profiles carousel
- Testimonials section
- FAQ accordion
- Footer with links, social, contact

### Dashboards (Vendor & Client)
- Top metrics row (4 stat cards)
- Quick actions panel
- Activity feed/timeline
- Charts for earnings/spending (line or bar)
- Data tables for active projects/bids
- Right sidebar for notifications and quick tips

### Job/Requirement Posting Page
- Multi-step form or long scrolling form
- Progress indicator if multi-step
- Field grouping with section headers
- Preview pane showing how it will appear

### Browse Jobs/Requirements Page
- Filter sidebar (left, collapsible on mobile)
- Sort controls (top right)
- Job cards in grid
- Infinite scroll or pagination
- "No results" state with suggestions

### Vendor Profile (Public View)
- Header with photo, name, title, rating
- About section
- Portfolio grid (3 columns)
- Skills list with badges
- Reviews section
- CTA: "Invite to Bid" or "Message"

### Bid/Proposal Submission
- Requirement summary at top (sticky)
- Form for cover letter, pricing, timeline
- Attachment area
- Terms acceptance
- Submit button (prominent)

### Messaging Page
- Full-height layout
- Contact list filterable/searchable
- Rich message composer
- File sharing within threads

### Admin Dashboard
- Deep data tables
- Charts and analytics
- User management tables with actions
- Category management CRUD
- System settings forms
- Audit logs table

---

## Images

**Hero Image:** Yes - use a professional workspace scene showing diverse team collaboration on technology projects. Wide, high-quality photo spanning full viewport width, with gradient overlay for text readability.

**Category Icons:** Custom illustrated icons representing each service category (not photos)

**Vendor Profile Photos:** Circular headshots, 120px to 200px diameter depending on context

**Portfolio Images:** Rectangular, maintain aspect ratio, display in responsive grid

**Placeholder Images:** Use professional stock photos from Unsplash for vendor portfolios and project examples during development

---

This design system balances professional trustworthiness with modern aesthetics, ensuring EDGEIT24 serves both enterprise clients and diverse vendors effectively across all marketplace functionalities.