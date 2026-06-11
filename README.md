# AiTaxBot — Free Tax Tools for India

> Making Indian tax compliance simple, free, and accessible — without needing to hire a CA for everyday questions.

**Live at [aitaxbot.co.in](https://www.aitaxbot.co.in)**

## What is AiTaxBot?

AiTaxBot is a free, open-source tax tools platform built for the Indian tax system. It helps salaried individuals, traders, freelancers, and NRIs handle income tax calculations, ITR-season planning, and tax paperwork — updated for the current filing season (FY 2025-26 / AY 2026-27) and the new Income Tax Act 2025.

Built entirely with **Claude Cowork** by a solo non-coder founder — a real-world example of what AI-assisted development can ship to production.

## The Problem

Millions of Indians struggle with tax compliance every year:

- Complex and constantly changing tax laws (the new Income Tax Act 2025 took effect April 1, 2026)
- CA fees that are out of reach for individuals and small businesses
- Few reliable, free tools built specifically for the Indian tax context

## What AiTaxBot Does Today

- **Tax calculators** — Income tax (old vs new regime), trading tax (STCG/LTCG, F&O, crypto), HRA exemption, SIP, SWP, NPS, PF, home loan, and vehicle loan
- **Rent Receipt Generator** — instant PDF receipts, delivered by email
- **NRI Corner** — DTAA calculator, NRO/NRE comparison, repatriation planner
- **Tax blog** — 34 in-depth guides covering ITR filing, the new tax regime, capital gains, and the Income Tax Act 2025 changes
- **CA Directory** — find verified Chartered Accountants by city and specialization; CAs can register and manage their own profiles
- **User accounts** — save calculations, view history on a personal dashboard
- **Admin panel** — user management, CA approvals, lead capture with duplicate detection, and analytics

## Roadmap

- **AI tax assistant** — agentic RAG over the Income Tax Act 2025 and ICAI materials (Qdrant + LLM), designed to answer like a CA: not just the question asked, but everything the facts trigger
- Automated blog publishing and support workflows (n8n)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (Vite), Tailwind CSS, shadcn/ui, wouter, TanStack Query |
| Backend | Node.js / Express (TypeScript), with Python helpers for PDF and market data |
| AI | Gemini-powered tax and accounting services; built with Claude (Anthropic) |
| Database & Auth | Firebase Firestore + Firebase Auth |
| PDF & Email | PDFKit, Brevo |
| Infrastructure | Docker, Railway, Nixpacks |

## Project Status

- Actively in production at [aitaxbot.co.in](https://www.aitaxbot.co.in)
- 126+ commits, 100+ production deployments
- Solo founder, non-coder — built entirely with Claude Cowork

## Why Open Source?

Tax knowledge should be free. Every Indian taxpayer deserves access to clear, accurate tax guidance — not just those who can afford professional help.

## Getting Started

```bash
# Clone the repo
git clone https://github.com/vickybh26/aitaxbot-dev.git
cd aitaxbot-dev

# Install dependencies
npm install

# Copy environment variables and fill in your keys
cp .env.example .env

# Start the development server
npm run dev
```

## Contributing

Contributions are welcome! Whether you're a developer, a tax professional who can review accuracy, or someone who wants to improve tax literacy in India — open an issue or submit a PR.

## Disclaimer

AiTaxBot provides general tax information and calculation tools. It is not a substitute for professional tax advice. For complex situations, consult a qualified Chartered Accountant.

## License

**Code:** MIT License — free to use, modify, and distribute.

**Content:** Blog articles, written guides, the AiTaxBot name, logo, and brand assets are **not** MIT-licensed. They are copyright © AiTaxBot, all rights reserved, and may not be republished without permission. See [LICENSE](LICENSE) for details.

---

*Built with Claude Cowork by a non-coder on a mission to democratize tax knowledge in India.*
