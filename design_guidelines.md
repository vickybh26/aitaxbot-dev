# AiTaxBot Design Guidelines

## Design Approach

**Selected Framework**: Fintech-Inspired Professional Design
Drawing from industry leaders like Stripe, Intuit QuickBooks, and India's ClearTax for clean, trustworthy financial interfaces with modern web sophistication.

**Core Principles**:
- Clarity over complexity: Financial data demands crystal-clear hierarchy
- Trust through restraint: Minimal decoration, maximum credibility
- Guided efficiency: Progressive disclosure of complex tax concepts

## Typography

**Font Selection**: Google Fonts via CDN
- Primary: Inter (headings, UI elements) - 500, 600, 700 weights
- Secondary: IBM Plex Sans (body text, data) - 400, 500 weights

**Type Scale**:
- Hero Headline: text-5xl lg:text-7xl, font-bold, leading-tight
- Section Headers: text-3xl lg:text-4xl, font-semibold
- Feature Titles: text-xl lg:text-2xl, font-semibold
- Body Text: text-base lg:text-lg, leading-relaxed
- Small Print/Legal: text-sm, leading-normal
- Data/Numbers: text-2xl lg:text-4xl, font-bold (tabular-nums for alignment)

## Layout System

**Spacing Primitives**: Tailwind units of 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 to p-8
- Section spacing: py-16 lg:py-24
- Card gaps: gap-6 lg:gap-8
- Form field spacing: space-y-4

**Container Strategy**:
- Full-width sections with max-w-7xl inner containers
- Content sections: max-w-6xl
- Forms: max-w-2xl
- Legal text: max-w-4xl

## Component Library

### Navigation
**Primary Header**: Fixed top navigation with blur backdrop
- Logo left, navigation center, CTA buttons right
- Links: Dashboard, Tax Tools, Resources, Pricing
- Primary CTA: "File Tax Return" (prominent button)
- Secondary CTA: "Login" (ghost button style)
- Mobile: Hamburger menu with slide-out drawer

### Hero Section (Homepage)
**Layout**: Two-column split (40% text, 60% image on desktop)
- Headline: "India's Smartest Income Tax Filing Platform"
- Subheadline: "File ITR in 7 minutes. Expert CA support. 100% accurate. Trusted by 2 lakh+ taxpayers."
- Trust indicators row: "Government Registered | ISO Certified | Secure Data Encryption"
- CTA group: Primary "Start Free Filing" + Secondary "Calculate Tax"
- Background: Subtle gradient overlay, buttons with backdrop-blur-md

### Features Section
**Grid Layout**: 3-column on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
**Feature Cards** (6-8 features):
- Icon container (w-12 h-12, rounded-lg with subtle background)
- Feature title
- 2-3 line description
- "Learn more" link with arrow

Features include: Smart ITR Selection, Auto Tax Calculation, Expert CA Review, Instant E-filing, Investment Optimization, Refund Tracking, Past Year Filing, Bulk Upload

### How It Works Section
**Timeline Layout**: Horizontal step indicator with 4 steps
- Numbered circles connected by progress line
- Step title and brief description below each
- Supporting illustration/icon above
Steps: Register → Upload Documents → Review & File → Track Refund

### Pricing Section
**3-Column Cards**: Free, Standard, Premium plans
- Plan name header with badge (e.g., "Most Popular")
- Large price display with "per year" qualifier
- Feature list with checkmark icons
- CTA button (different prominence per tier)
- Comparison table below cards for detailed features

### Trust Section
**Multi-element Composition**:
- Client logos row (6-8 partner brands/certifications)
- Statistics display (4-column grid): Users Served | Tax Saved | Average Rating | Returns Filed
- Testimonial cards (2-column grid with customer photos, quotes, names, roles)

### Footer
**Rich Multi-Column Layout** (4 columns):
- Column 1: Logo, tagline, social media icons
- Column 2: Product (Tax Filing, Investment Tools, Reports)
- Column 3: Resources (Help Center, Tax Calculator, Blog)
- Column 4: Legal & Contact
- Bottom bar: Copyright, Privacy Policy link, Terms of Service, Cookie Policy

### Privacy Policy Page
**Long-form Content Layout**:
- Page header with title and last updated date
- Sticky sidebar navigation (table of contents)
- Main content area (max-w-4xl) with clear section hierarchy
- Sections: Data Collection, Usage, Storage, Third Parties, User Rights, Contact
- Back to top button
- Clear section numbering and bold subheadings

### Cookie Consent Banner
**Bottom-fixed Position**:
- Container with backdrop blur
- Left: Icon + concise message "We use cookies for analytics and ads"
- Center: "Learn more" link to cookie policy
- Right: Button group - "Accept All" (primary) + "Manage Preferences" (secondary)
- Dismiss icon (X) top-right
- Slides up from bottom on page load with smooth transition

### Tax Calculator Widget
**Card-based Interactive Form**:
- Input fields in clean vertical stack
- Real-time calculation display (large, prominent)
- Breakdown accordion showing tax components
- Save/Download results CTA

### Dashboard Components (for logged-in users)
**Stat Cards**: 2x2 or 4-column grid showing key metrics
**Progress Tracker**: Visual progress bar for filing status
**Document Upload**: Drag-and-drop zone with file list
**Action Items**: Checklist style with completion indicators

## Icons
**Library**: Heroicons via CDN
Use outline style for navigation/UI, solid style for filled states and feature icons

## Images

**Hero Image**: Professional, modern illustration showing:
- Person confidently using laptop/tablet
- Abstract data visualization elements (charts, documents)
- Warm, optimistic color palette
- Clean, minimal style (not photorealistic)
- High-resolution, optimized format
Placement: Right side of hero section, extends slightly beyond container for visual impact

**Feature Section Background**: Subtle abstract geometric patterns (optional decorative element)

**How It Works Illustrations**: 4 custom spot illustrations representing each step, consistent art style, placed above step descriptions

**Testimonial Photos**: Professional headshots, circular crop, consistent sizing

**Trust Section**: Partner logos, certification badges (government registration, ISO, security certifications)

## Responsive Behavior

**Breakpoints**: Mobile-first approach
- Mobile: Single column, stacked content, full-width components
- Tablet (md): 2-column grids where applicable
- Desktop (lg): Full multi-column layouts, horizontal arrangements

**Critical Adaptations**:
- Hero: Stacks vertically on mobile, image below text
- Navigation: Hamburger menu below md breakpoint
- Pricing cards: Stack on mobile, 3-across on desktop
- Footer: 2x2 grid on tablet, 4 columns on desktop

## Accessibility
- All interactive elements have visible focus states (ring-2 ring-offset-2)
- Form inputs with associated labels, error states with icons and text
- Sufficient color contrast ratios for all text
- Semantic HTML structure throughout
- ARIA labels for icon-only buttons

This comprehensive design system ensures AiTaxBot presents a professional, trustworthy interface that guides users confidently through complex tax filing processes while maintaining visual sophistication and brand credibility.