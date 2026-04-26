# AiTaxBot - Financial Tools & Analytics Platform

## Overview
AiTaxBot is India's premier Income Tax filing platform, offering AI-powered ITR filing, automated data extraction from tax documents (Form 16, AIS, 26AS), and specialized crypto tax compliance (Sections 115BBH and 194S). The platform provides a comprehensive suite of financial tools, including tax and investment calculators, real-time market news, and commodity prices, primarily serving salaried professionals, freelancers, and crypto investors in India.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18 with TypeScript, Tailwind CSS (custom Persian Blue palette), Radix UI primitives, shadcn/ui.
- **State Management & Routing**: TanStack Query for state, Wouter for routing.
- **Build Tool**: Vite.
- **UI/UX**: Mobile-first, minimalistic design with enhanced typography, breadcrumb navigation, and consistent components. Includes responsive layouts and touch-friendly controls.

### Backend
- **Framework**: Express.js with TypeScript, running on Node.js (ES modules).
- **Database**: Firebase Firestore (NoSQL).
- **Authentication**: Firebase Authentication (Google Sign-In, Email/Password), with Firebase Admin SDK for token verification.
- **API Design**: RESTful endpoints with proxy routes.
- **Core Functionality**:
    - **Tax & Investment Calculators**: Income Tax (AY 2025-26, 2026-27, 2027-28 with Income Tax Act, 2025 support), HRA (Section 10(13A)), SIP, SWP, PF (EPF/VPF/PPF). Each calculator is a dedicated, SEO-optimized page.
    - **PF Calculator**: Provident Fund calculator with EPF/PPF modes, monthly interest accrual (credited annually), employer contribution split (3.67% EPF + 8.33% EPS capped at ₹1,250/month), VPF support, year-wise growth table, stacked bar chart, and comprehensive early withdrawal guide (5-year rule, partial withdrawal rules, tax implications). Route: /calculators/pf.
    - **Income Tax Act, 2025 Support**: Calculator updated for the new Income Tax Act, 2025 (replacing 1961 Act), effective from April 1, 2026 (FY 2026-27 / AY 2027-28). Same tax slabs under new regime (Section 202), ₹75,000 standard deduction, ₹12 lakh rebate limit under Section 200.
    - **Tax Calculation History**: Logged-in users can save up to 10 income tax calculations. Features include:
      - Automatic 30-day expiry with cleanup on fetch
      - PDF download for saved calculations
      - Dashboard view with calculation details (FY, AY, recommended regime, savings)
      - Delete functionality with confirmation
      - Stored in Firestore `taxCalculationHistory` collection with Firebase token-based authentication
      - API endpoints: GET/POST/DELETE /api/tax-calculations with Bearer token auth
    - **Tax Computation PDF Generation**: Professional ITR-style computation sheets using PDFKit:
      - Server-side PDF generation via POST /api/tax-computation/generate-pdf
      - Authenticated storage to Replit Object Storage via POST /api/tax-computation/save-pdf
      - Includes personal info, salary breakdown, other income schedules, deductions (old regime), tax computation with cess
      - PDFs formatted similar to income tax department computation sheets
    - **Document Management**: Secure, session-based handling of uploaded tax documents.
    - **AI-Enhanced PDF Processing**: Google's LangExtract with Gemini AI for data extraction from tax documents, with regex fallback.
    - **Contact Form**: Fully functional contact form with dual-layer submission:
      - Saves submissions to Firebase Firestore collection `contactInquiries` (category: "Inquiry")
      - Sends instant email notifications to info@aitaxbot.in via Brevo (free tier: 300 emails/day)
      - Email includes: sender details, subject, message, inquiry ID, and timestamp (IST)
      - Graceful degradation: if email fails, form submission still succeeds (data saved to Firestore)
    - **Monetization**: Multi-network ad revenue strategy (Google AdSense, Media.net, PropellerAds, Ezoic).
    - **Accounting & Invoicing**: Multi-firm support, client management, GST/Non-GST invoice generation with HSN/SAC lookup (Gemini AI), and auto-generated sales register.
    - **Blog System**: SEO-optimized blog with educational content on finance and taxes, including structured data and Open Graph tags.
- **Security & Compliance**: Inactivity timeouts, multi-tab activity sync, comprehensive error sanitization to prevent sensitive data exposure, GDPR-compliant cookie consent, and AdSense compliance.

### Project Structure
- Monorepo setup with `/client`, `/server`, and `/shared` directories.

### SEO Implementation
- Comprehensive meta tags (title, description, keywords, canonical URLs, Open Graph tags) using `react-helmet-async` for all public pages.
- **Structured Data (JSON-LD)**: Schema.org markup on all calculator pages (SoftwareApplication, BreadcrumbList, Organization with stable @id: https://aitaxbot.in/#organization) for enhanced search engine understanding.
- **Meta Optimization**: All meta descriptions optimized to ~155 characters for better SERP display. Page titles shortened to 50-60 characters for improved CTR.
- **Custom 404 Page**: User-friendly error page with accessible navigation to Home, Calculators, Blog, Contact using properly structured anchor elements.
- **Performance Optimizations**:
  - GZIP compression enabled on Express server (level 6) for faster page loads
  - Deferred non-critical JavaScript: Replit dev banner script with `defer` attribute, analytics scripts use `async`
  - Non-blocking CSS loading: Font Awesome and Google Fonts with `media="print" onload="this.media='all'"` pattern
  - Image lazy loading: All below-the-fold images (footer logos, news thumbnails, blog hero images) use `loading="lazy"`
  - Expected mobile LCP improvement: 0.5-0.8s reduction, pushing mobile score toward 85+
- **Accessibility Improvements**:
  - Mobile menu button has `aria-label` and `aria-expanded` attributes
  - AdBanner components have `role="complementary"`, `aria-label`, and `title` attributes for screen readers
  - Social media links in footer have proper `aria-label` attributes
  - All icon buttons have descriptive `aria-label` for accessibility compliance
- `sitemap.xml`, `robots.txt`, and `ads.txt` for search engine directives and AdSense verification.
- Content optimized for Google's YMYL (Your Money Your Life) standards.
- SEO Score: 77/100 (above 75% average), with ongoing improvements for canonicalization, structured data, and meta optimization.

## External Dependencies

### External Services
- **Database**: Firebase Firestore.
- **Analytics**: Google Analytics (G-9NMYMNBYFV), Microsoft Clarity, integrated via Google Tag Manager and respecting cookie consent.
- **Cloud Storage**: Firebase Storage for user documents, Replit Object Storage for tax computation PDFs.
- **Email Service**: Brevo (formerly Sendinblue) for transactional email notifications. Free tier allows 300 emails/day.
- **Ad Networks**: Google AdSense (pub-6497933645628124), Media.net, PropellerAds, Ezoic.

### External APIs
- **Indian Mutual Fund Data**: api.mfapi.in.
- **Stock Market Data**: Yahoo Finance, Upstox API, Finnhub, Alpha Vantage, `jugaad-data`, `nselib`, `maanavshah/stock-market-india` libraries.
- **News Data**: NewsData.io API for Indian business/finance and tax news, with server-side caching and rate-limit handling.
- **Precious Metal Prices**: GoldAPI.io for live gold (24K, 22K) and silver prices in INR. Implements 8-hour server-side caching (3 API calls/day max) to stay within 100/month free tier quota. Shared cache across all users ensures no per-user API calls. Fallback data (updated Nov 2025) auto-cached on API failures. API endpoint: `/api/metal-prices`.