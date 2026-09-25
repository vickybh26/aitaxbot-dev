/**
 * shared/seoContent.ts
 *
 * Server-renderable static content per route, for the AdSense/Googlebot
 * crawler pass that never executes client JS. Every field here is sourced
 * from that route's own <Helmet> block or on-page FAQ copy (client/src/pages/*)
 * — title/description/canonical are copied verbatim so this can never disagree
 * with what a real browser shows once React mounts; intro paragraphs are new
 * prose grounded only in figures the calculators themselves already compute
 * (see shared/taxLiability.ts for the income-tax slab/rebate/surcharge figures).
 *
 * Consumed by server/vite.ts, which injects this into the HTML shell for any
 * request whose path matches SEO_CONTENT — see injectSeoContent() there. If a
 * page's real FAQ/intro copy changes, update the corresponding entry here too;
 * this file is a static snapshot for crawlers, not a live import of the React
 * component, so the two CAN drift if only one side is edited.
 *
 * Blog posts (SEO_CONTENT_BY_PATH's other ~36 entries) are the one exception
 * to "static snapshot" above: BLOG_SEO_CONTENT below is GENERATED from
 * client/src/data/blogPosts.ts at import time, every time, rather than
 * hand-duplicated here. Until 2026-08-30 blog posts had no entry in this file
 * at all — every one of them (900-2,458 words of real written content each)
 * served the identical generic client/index.html shell to any crawler that
 * doesn't execute JS, which is exactly the "Thin Content" pattern this whole
 * file exists to fix, just never extended past the 20 hand-written routes
 * below. Generating from blogPosts.ts (not copying) means a title/FAQ edit to
 * a blog post can never drift out of sync here the way a hand-copied entry
 * could — see the resultExport.ts-vs-generatePDF() duplication note elsewhere
 * in this codebase for why that specific failure mode is treated as a real
 * risk here, not a hypothetical one.
 */
import { blogPosts, type BlogPost } from "@/data/blogPosts";

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface SeoLink {
  href: string;
  label: string;
}

export interface SeoSection {
  heading?: string;
  body: string;
}

export interface SeoPageContent {
  path: string;
  title: string;
  description: string;
  canonical: string;
  h1: string;
  intro: string;
  faqs: SeoFaq[];
  /**
   * Crawlable links rendered as a real <ul><li><a> list after the intro.
   *
   * Only hub pages need this. It exists because /blog is the index for 36
   * articles and, to a crawler that does not run JS, listed exactly none of
   * them — the entire content library was unreachable by following links.
   */
  links?: SeoLink[];
  /**
   * The body of a long page, as headed sections.
   *
   * `intro` renders as a single <p>, which is fine for a calculator page whose
   * crawler copy is one paragraph. It is not fine for a 2,400-word article: the
   * blog generator below used to ship ONLY the "intro" section, so across the
   * 36 posts a crawler received 4,643 of 42,455 written words — 11%. The bodies
   * existed and rendered perfectly in a browser; they simply never reached
   * anything that does not run JavaScript. Measured 2026-09-25.
   *
   * Rendered by server/vite.ts as <h2> + <p> pairs, so the article keeps its
   * structure rather than arriving as one wall of text.
   */
  sections?: SeoSection[];
}

export const SEO_CONTENT: SeoPageContent[] = [
  {
    path: "/",
    title: "AiTaxBot - Income Tax Calculator India FY 2026-27 | AY 2027-28",
    description: "AI-powered tax calculator for India. Compare old vs new regime, ₹12L tax-free under Section 87A. Free SIP, SWP, HRA, PF calculators. CA-reviewed. FY 2026-27 & AY 2027-28 ready.",
    canonical: "https://www.aitaxbot.co.in/",
    h1: "AiTaxBot - Income Tax Calculator India FY 2026-27 | AY 2027-28",
    intro: "AiTaxBot is a free, Chartered-Accountant-reviewed Indian income tax calculator platform, built for salaried individuals, NRIs, and investors filing under the Income Tax Act, 2025. It computes tax in Indian Rupees under both the Old and New tax regimes for FY 2025-26 (AY 2026-27) and FY 2026-27 (AY 2027-28), including Section 156/87A rebate up to ₹12,00,000 of income, marginal relief, and surcharge. AiTaxBot is an independent tax-technology platform — it is not a cryptocurrency, token, or digital asset product, and has no connection to any coin or blockchain project of a similar name.",
    faqs: [
      { question: "Which regime — Old or New — is better for me?", answer: "It depends on your deductions. If your total 80C + HRA + home loan deductions exceed ₹3.75 lakh, the Old Regime usually saves more. Below that threshold, the New Regime is typically better. Use our calculator above to get your exact answer in seconds." },
      { question: "Is income up to ₹12 lakh really tax-free in FY 2026-27?", answer: "Yes — under the New Regime for FY 2026-27, the rebate under Section 87A has been enhanced so that taxpayers with net taxable income up to ₹12 lakh pay zero tax. The ₹75,000 standard deduction means a salaried person earning up to ₹12.75 lakh pays no tax." },
      { question: "What is the 87A rebate and am I eligible?", answer: "Section 87A gives a full rebate on tax if your net taxable income is within the specified limit (₹12 lakh under New Regime for FY 2026-27). Our calculator automatically applies this rebate and shows you whether you qualify." },
      { question: "Can I switch between Old and New Regime every year?", answer: "Salaried individuals with no business income can choose their regime every year at the time of filing. If you have business or professional income, you can switch only once. Our calculator shows you both options so you can decide each year." },
      { question: "Is the data I enter in the calculator saved anywhere?", answer: "It depends on whether you are signed in. As a guest, the calculation runs entirely in your browser and nothing is sent to us. Once you sign in, we save the result and the figures you entered to your account, so your dashboard can show your history — that is what makes saved calculations work. We never store the documents you upload to the reconciliation tool, and you can delete your account and everything in it at any time from your profile." },
      { question: "How is AY (Assessment Year) different from FY (Financial Year)?", answer: "Financial Year (FY) is when you earn the income — e.g., FY 2026-27 runs April 2026 to March 2027. Assessment Year (AY) is when you file and pay tax on that income — so AY 2027-28 corresponds to FY 2026-27." },
    ],
  },
  {
    path: "/calculators",
    title: "Free Tax & Financial Calculators India FY 2026-27 | AiTaxBot",
    description: "Free tax & financial calculators for India, updated for FY 2026-27 (AY 2027-28). Income Tax, HRA, SIP, SWP & PF calculators. Reviewed by Chartered Accountant.",
    canonical: "https://www.aitaxbot.co.in/calculators",
    h1: "Free Tax & Financial Calculators India FY 2026-27",
    intro: "AiTaxBot's calculator suite covers Indian Rupee-denominated income tax, HRA exemption, SIP and SWP mutual fund planning, PF (EPF/VPF/PPF) corpus projection, NPS pension planning, home and vehicle loan EMI, and capital-gains tax on equity and F&O trades — all updated for FY 2026-27 (AY 2027-28) under the Income Tax Act, 2025, and reviewed by a Chartered Accountant. Each calculator shows its workings, not only its answer, so the figure can be checked against the provision it comes from. The income tax calculator computes liability under both the old and the new regime for the year you select, applying the slab rates, the Section 87A rebate, marginal relief where income sits just above a rebate threshold, surcharge at the applicable rate, and the four per cent health and education cess. The HRA calculator applies the least-of-three test under Section 10(13A) and Rule 2A, using basic pay plus dearness allowance as the salary base and distinguishing metro from non-metro cities. The provident fund calculator splits the employer's twelve per cent between the pension scheme and the provident fund at the EPS wage ceiling of Rs. 15,000 a month, which is why the split stops tracking salary above that point. The trading tax calculator separates short-term from long-term capital gains on listed equity, treats futures and options as non-speculative business income, and applies the flat thirty per cent charge on virtual digital assets under Section 115BBH, where losses cannot be set off against anything. The SIP, SWP, NPS and loan calculators are financial-projection tools rather than tax computations: they assume a constant rate of return or interest, which real markets do not provide, and are useful for comparing options rather than for predicting an outcome. All of them are free, work on the Financial Year you choose, and are reviewed by a Chartered Accountant. None of them files anything or sends your figures to the Income Tax Department.",
    faqs: [
      { question: "Are the calculators updated for the latest tax rules?", answer: "Yes, all tax calculators cover FY 2026-27 (AY 2027-28) under Income Tax Act, 1961 and Tax Year 2026-27 under the new Income Tax Act, 2025. We update our tools immediately when tax laws or interest rates change." },
      { question: "Who reviews the calculator accuracy?", answer: "All calculators are prepared and reviewed by our team of Chartered Accountants (CAs) and tax professionals to ensure compliance with Indian tax laws and financial regulations." },
      { question: "Which calculator should I use first?", answer: "Start with the Income Tax Calculator to understand your overall tax liability. Then use the HRA Calculator if you're salaried and paying rent, and the PF Calculator to plan your retirement corpus. For investment planning, use the SIP and SWP calculators." },
    ],
    links: [
      { href: "/calculators/income-tax", label: "Income Tax Calculator — Old vs New Regime" },
      { href: "/calculators/hra", label: "HRA Exemption Calculator" },
      { href: "/calculators/trading-tax", label: "Trading Tax Calculator — STCG, LTCG, F&O, Crypto" },
      { href: "/calculators/sip", label: "SIP Calculator" },
      { href: "/calculators/swp", label: "SWP Calculator" },
      { href: "/calculators/pf", label: "Provident Fund (EPF) Calculator" },
      { href: "/calculators/nps", label: "NPS Calculator" },
      { href: "/calculators/home-loan", label: "Home Loan EMI Calculator" },
      { href: "/calculators/vehicle-loan", label: "Vehicle Loan EMI Calculator" },
      { href: "/tools/ais-26as-form16", label: "AIS / Form 26AS / Form 16 Reconciliation" },
      { href: "/tools/rent-receipt", label: "Rent Receipt Generator" },
    ],
  },
  {
    path: "/calculators/income-tax",
    title: "Income Tax Calculator India FY 2026-27 (AY 2027-28) — New vs Old Regime | AiTaxBot",
    description: "Free Income Tax Calculator for FY 2026-27 (AY 2027-28). Compare Old vs New regime, Section 87A rebate & marginal relief. Latest tax slabs & deductions.",
    canonical: "https://www.aitaxbot.co.in/calculators/income-tax",
    h1: "Income Tax Calculator India FY 2026-27 (AY 2027-28) — New vs Old Regime",
    intro: "This calculator computes Indian income tax liability under both the Old and New tax regimes for FY 2026-27 (AY 2027-28), per the slab structure notified under Section 202 of the Income Tax Act, 2025. Under the New Regime, income up to ₹12,00,000 attracts nil tax after the Section 156 rebate (₹60,000), with marginal relief applied so the additional tax payable never exceeds the income earned above that threshold. Surcharge applies above ₹50,00,000 of total income, at 10%/15%/25%/37% depending on the slab (capped at 25% under the New Regime), again with marginal relief at each threshold. All figures are computed in Indian Rupees against CBDT-notified slabs — this tool does not process or reference any cryptocurrency or digital token.",
    faqs: [
      { question: "Which tax regime should I choose - Old or New for FY 2026-27?", answer: "Use the AiTaxBot Income Tax Calculator to compare both regimes. Generally, the Old Regime is better if you have significant 80C investments (₹1.5L+) and HRA. The New Regime (Section 202 under Income Tax Act, 2025) is better if you have minimal deductions and prefer lower rates." },
      { question: "Can I switch between tax regimes every year?", answer: "Yes, salaried individuals can switch between Old and New regime every financial year. Business/professional taxpayers can switch only once." },
      { question: "If my income is ₹12.1 lakh, do I pay tax on the full ₹12.1 lakh?", answer: "No — this is a very common misconception. Thanks to marginal relief, you only pay tax on the excess income above ₹12 lakh. At ₹12.1 lakh taxable income, your tax liability is only ₹10,000 + 4% cess = ₹10,400 (not the ₹63,960 that would apply without marginal relief). The tax increase can never exceed the income increase over the ₹12 lakh threshold." },
      { question: "What is marginal relief in income tax and when does it apply?", answer: "Marginal relief is a safeguard that prevents your extra tax liability from exceeding your extra income when you cross a tax threshold. It applies at two key points: (1) The ₹12 lakh rebate limit in the new regime — if your taxable income is ₹12.1L, you pay tax of only ₹10,000 + cess, not ₹61,500. (2) Surcharge thresholds — at ₹50L, ₹1Cr, ₹2Cr, and ₹5Cr, the additional tax due to surcharge cannot exceed the income over the threshold. Our calculator automatically computes marginal relief for all these scenarios." },
      { question: "What is surcharge on income tax and when does it apply?", answer: "Surcharge is an additional tax levied on your income tax (not on income). It applies when your total income exceeds: ₹50 lakh (10% surcharge), ₹1 crore (15% surcharge), ₹2 crore (25% surcharge), ₹5 crore (37% surcharge under old regime; capped at 25% under new regime for most income types). Marginal relief is available at each surcharge threshold to prevent your net-of-tax income from falling below someone earning exactly at the threshold." },
      { question: "Is it worth planning my income to stay below ₹50 lakh to avoid surcharge?", answer: "Not necessarily — marginal relief protects you. If your income slightly exceeds ₹50 lakh, your extra tax cannot exceed the extra income. For example, at ₹50.1 lakh taxable income, the additional tax over the ₹50L case is just ₹10,000 + cess, not ₹1.15 lakh (what 10% surcharge would cost without relief). However, deliberately planning income to stay below thresholds may make sense if the excess is very small and there are legitimate deduction options available." },
    ],
  },
  {
    path: "/calculators/hra",
    title: "HRA Calculator India FY 2026-27 - House Rent Allowance Exemption | AiTaxBot",
    description: "Free HRA Calculator for FY 2026-27. Calculate House Rent Allowance exemption under Section 10(13A) for metro & non-metro cities. Compute 3-part formula: actual HRA, rent minus 10% basic, 50%/40% basic. CA verified.",
    canonical: "https://www.aitaxbot.co.in/calculators/hra",
    h1: "HRA Calculator India FY 2026-27 - House Rent Allowance Exemption",
    intro: "House Rent Allowance exemption is computed under Section 10(13A) read with Rule 2A of the Income Tax Rules, as the least of three figures: actual HRA received, rent paid minus 10% of salary (Basic + Dearness Allowance, not gross salary), and 50% of salary for the eight notified metro cities or 40% elsewhere. This calculator applies that exact three-part formula against your Basic + DA figure, in Indian Rupees, and is available only under the Old Tax Regime — HRA exemption is not available if you opt for the New Regime.",
    faqs: [
      { question: "What are the 4 metro cities for HRA calculation in India?", answer: "Under Section 10(13A) (Schedule II, Table Sl. No. 2 under ITA 2025), only four cities qualify as metro cities for HRA purposes: Mumbai, Delhi (NCT), Kolkata, and Chennai. Metro city employees can claim up to 50% of basic salary as HRA exemption cap. All other cities (including Bangalore, Hyderabad, Pune, Ahmedabad) are classified as non-metro with a 40% cap. This distinction is critical — claiming the wrong percentage is one of the most common HRA mistakes." },
      { question: "Can I claim HRA and home loan interest deduction together?", answer: "Yes — this is one of the biggest myths in Indian taxation. You can claim both HRA exemption (Section 10(13A) / Schedule II, Table Sl. No. 2 under ITA 2025) and home loan interest deduction (Section 24(b) / Section 22(2) under ITA 2025) simultaneously. This works when you are living in rented accommodation in your city of employment and own a property in a different city, or if you haven't yet moved into your purchased flat. Both claims must be genuine and supported by proper documentation (rent agreement, rent receipts, home loan documents)." },
      { question: "How is HRA exemption calculated — what is the three-part formula?", answer: "HRA exemption is the minimum of three amounts: (1) Actual HRA received from your employer, (2) Rent paid minus 10% of basic salary, and (3) 50% of basic salary for metro cities OR 40% of basic salary for non-metro cities. The lowest of these three is your HRA exemption. Most commonly, component 2 (Rent − 10% of basic) acts as the binding constraint." },
      { question: "Can I pay rent to my parents and claim HRA exemption?", answer: "Yes, paying rent to parents and claiming HRA exemption is legally valid, provided: (1) A genuine rent agreement exists between you and your parents, (2) Rent is paid via bank transfer (not cash), (3) You maintain stamped rent receipts, and (4) Your parents declare this rental income in their own ITR. Your parents' taxable income may be lower (especially if they are senior citizens with ₹3L basic exemption), making this a legitimate tax planning strategy that benefits both you and your parents." },
      { question: "Is PAN of landlord mandatory for claiming HRA?", answer: "PAN of your landlord is mandatory only if the annual rent paid exceeds ₹1,00,000 (i.e., more than ₹8,333 per month). Your employer requires the landlord's PAN to process HRA exemption for TDS purposes. If the landlord does not have a PAN, they must provide a self-declaration under Form 60 signed by them." },
      { question: "Can self-employed people claim HRA exemption?", answer: "No, HRA exemption under Section 10(13A) (Schedule II, Table Sl. No. 2 under ITA 2025) is available only to salaried employees who receive HRA as part of their salary structure. Self-employed individuals, professionals, and business owners cannot claim HRA exemption, even if they pay rent for their residence. However, they can claim rent paid as a business expense or use it under other provisions depending on their business structure." },
    ],
  },
  {
    path: "/calculators/sip",
    title: "SIP Calculator India FY 2026-27 - Mutual Fund Returns & Tax Planning | AiTaxBot",
    description: "Free SIP Calculator India FY 2026-27. Calculate Systematic Investment Plan mutual fund returns with LTCG tax planning. Rupee cost averaging, step-up SIP, and wealth creation calculator.",
    canonical: "https://www.aitaxbot.co.in/calculators/sip",
    h1: "SIP Calculator India FY 2026-27 - Mutual Fund Returns & Tax Planning",
    intro: "A Systematic Investment Plan (SIP) calculator projects the future value of periodic equity or debt mutual fund investments using compound growth. For equity mutual funds redeemed after holding beyond 12 months, Long-Term Capital Gains above ₹1,25,000 in a financial year are taxed at 12.5% under Section 112A (revised from 10% by the Finance Act, 2024, effective 23 July 2024). Short-term gains within 12 months are taxed at 20% under Section 111A. This tool models Indian Rupee SIP contributions and Indian capital-gains tax rules only.",
    faqs: [
      { question: "What is rupee cost averaging in SIP?", answer: "Rupee cost averaging is the strategy of investing a fixed amount regularly, regardless of market conditions. In SIP, you buy more mutual fund units when prices are low and fewer when prices are high, automatically averaging your purchase cost over time. This eliminates the need to time the market and reduces the impact of market volatility on your investment." },
      { question: "Do I have to pay LTCG tax on SIP mutual fund returns?", answer: "Yes, Long-Term Capital Gains (LTCG) tax applies to equity fund redemptions after 1 year. The tax is 12.5% on gains above ₹1.25 lakh per financial year (rate revised from 10% to 12.5% by Finance Act 2024, effective July 23, 2024). For debt funds, LTCG is taxed at your slab rate. Plan your SIP redemptions across multiple financial years to keep gains below ₹1.25L and minimize tax liability." },
      { question: "What is step-up SIP and how does it work?", answer: "Step-up SIP allows you to increase your monthly SIP amount periodically (usually annually) by a fixed percentage, typically matching your salary hike. For example, a ₹5,000/month SIP with 10% annual step-up becomes ₹5,500 in year 2, ₹6,050 in year 3, and so on. This helps your wealth accumulate faster as your income grows, maximizing the power of compounding." },
      { question: "Are equity funds or debt funds better for SIP?", answer: "Equity fund SIPs historically return 12-15% annually over 10+ years, making them superior for long-term wealth creation. Debt funds return 7-9% but are more stable with lower volatility. For SIP, equity funds are better if you have a 10+ year horizon, as rupee cost averaging reduces the impact of market volatility. Younger investors should prefer equity SIPs; those near retirement can mix both." },
      { question: "Can I stop or pause my SIP anytime without penalty?", answer: "Yes, SIPs are completely flexible with zero lock-in period. You can pause, stop, or restart your SIP anytime without any penalties or charges. However, stopping too early reduces compounding benefits. It's recommended to stay invested for at least 5-7 years for equity funds to ride out market cycles and benefit from the rupee cost averaging advantage." },
      { question: "Is SIP better than lump sum investing? Which should I choose?", answer: "SIP is better if you don't have a large sum available upfront, want to reduce timing risk, or prefer disciplined investing. Lump sum investing is better if you have capital available and the market is near a low point. For most salaried employees, SIP is ideal because it builds the habit of regular investing and protects against investing at market peaks. Data shows SIP beats lump sum in 80% of scenarios over 10+ years due to rupee cost averaging." },
    ],
  },
  {
    path: "/calculators/swp",
    title: "SWP Calculator India FY 2026-27 - Retirement Income Planning | AiTaxBot",
    description: "Free SWP Calculator India FY 2026-27. Calculate systematic withdrawals, corpus sustainability, and tax-efficient retirement income planning. See how long your corpus lasts with monthly SWP withdrawals.",
    canonical: "https://www.aitaxbot.co.in/calculators/swp",
    h1: "SWP Calculator India FY 2026-27 - Retirement Income Planning",
    intro: "A Systematic Withdrawal Plan (SWP) lets a retiree draw a fixed periodic amount from an existing mutual fund corpus. Only the capital-gains portion of each withdrawal is taxable — not the full withdrawal amount — making SWP more tax-efficient in Indian Rupee terms than fully-taxable interest income such as fixed deposits. Equity-fund SWP gains beyond 12 months' holding are taxed as long-term capital gains under Section 112A; the calculator models corpus longevity against your chosen withdrawal rate and expected return.",
    faqs: [
      { question: "What is SWP and how is it different from regular withdrawal?", answer: "Systematic Withdrawal Plan (SWP) allows you to withdraw a fixed amount from your mutual fund at regular intervals (monthly, quarterly, or annually). Unlike lump sum withdrawals, SWP keeps your remaining corpus invested and growing. This provides regular income while your money continues to earn returns, making it ideal for retirement. The key advantage: you get monthly cash flow plus ongoing capital appreciation — unlike lump sum where you withdraw everything upfront and lose growth potential." },
      { question: "Is SWP income taxable in India?", answer: "Only the capital gains portion of your SWP withdrawal is taxable — not the entire amount. For equity mutual funds held over 1 year, LTCG tax is 10% above ₹1 lakh exemption limit. For debt funds held over 3 years, LTCG applies with indexation benefit. This makes SWP far more tax-efficient than FD interest (which is fully taxable at your slab rate). For example: withdrawing ₹50,000 might be 70% capital (tax-free) + 30% gains (taxed at 10%), resulting in only ₹1,500 tax — versus FD interest of ₹50,000 taxed fully at 20-30%." },
      { question: "How long will my corpus last with SWP?", answer: "Your corpus longevity depends on: (1) Initial corpus size, (2) Monthly withdrawal amount, (3) Expected annual returns, and (4) Inflation assumptions. Generally, the 4% safe withdrawal rule works well: on a ₹1 crore corpus, ₹40,000/month (4.8% annually) can last 25+ years at 8-9% returns. Using our SWP Calculator, you can input your specific numbers and see exactly how long your corpus will last. Most retirees find that balanced funds returning 8-9% annually sustain withdrawals for 20-30+ years." },
      { question: "SWP vs FD interest — which gives better post-tax income?", answer: "SWP from equity funds is significantly more tax-efficient. Scenario: ₹1 crore corpus. FD at 7% gives ₹70,000/year interest — fully taxable at 30% slab = ₹49,000 net. SWP at 9% return gives ₹90,000/year, with 70% capital (₹63,000 tax-free) + 30% gains (₹27,000 at 10% LTCG tax) = ₹24,300 tax, leaving ₹65,700 net. SWP provides ₹16,700 more annual income after tax. Over 25 years, that's ₹4.2 lakh extra — just from tax efficiency." },
      { question: "What is the safe withdrawal rate for retirement?", answer: "The 4% rule is a golden standard: withdraw 4% of your initial corpus annually (approximately 0.33% monthly). On ₹1 crore, that's ₹40,000/month. This rule assumes 8-9% annual returns and inflation of 6-7%. However, India's higher inflation (6-7% vs US's 2-3%) means you should consider the 4-5% rule safer. Withdrawals above 8% annually risk depleting your corpus in 10-12 years, even with decent returns. Our calculator helps you test different withdrawal rates to find what works for your specific situation." },
      { question: "Can I increase my SWP amount over time for inflation?", answer: "Yes, absolutely. In fact, inflation-adjusting your SWP is essential for maintaining purchasing power. Most fund houses allow you to increase your SWP amount quarterly or annually. A common strategy: increase your SWP by 5-6% every year (matching inflation). Starting at ₹40,000/month, you'd increase to ₹42,400 next year, then ₹44,944, and so on. This ensures your withdrawals keep pace with rising living costs. Some retirees even implement a more aggressive review every 3 years rather than annually." },
    ],
  },
  {
    path: "/calculators/pf",
    title: "PF Calculator India FY 2026-27 - EPF VPF PPF Corpus | AiTaxBot",
    description: "Free PF Calculator India FY 2026-27. Calculate EPF, VPF and PPF corpus with employer split, 8.25% tax-free interest, withdrawal guide, and retirement planning. CA verified.",
    canonical: "https://www.aitaxbot.co.in/calculators/pf",
    h1: "PF Calculator India FY 2026-27 - EPF VPF PPF Corpus",
    intro: "This calculator projects Employees' Provident Fund (EPF), Voluntary Provident Fund (VPF), and Public Provident Fund (PPF) corpus growth. EPF/VPF currently earns 8.25% per annum, tax-free (EEE status) on withdrawal after five years of continuous service, though interest on employee contributions exceeding ₹2,50,000 per year has been taxable since FY 2021-22. PPF carries a ₹1,50,000 annual contribution ceiling within the overall Section 80C limit. All projections are in Indian Rupees against current EPFO-notified interest rates.",
    faqs: [
      { question: "What is the current EPF interest rate for FY 2026-27?", answer: "The EPF interest rate for FY 2026-27 is 8.25% per annum. However, interest on employee contributions exceeding ₹2.5 Lakh/year becomes taxable from FY 2021-22 onwards. This applies to both EPF and VPF contributions combined." },
      { question: "Is EPF maturity amount completely tax-free?", answer: "Yes, EPF withdrawal is completely tax-free (EEE status) after 5 years of continuous service. If you switch jobs and transfer your PF balance via UAN portal, the previous tenure counts towards the 5-year requirement. However, withdrawing early without transferring makes the amount taxable." },
      { question: "Can I withdraw EPF before retirement?", answer: "Yes, partial withdrawals are allowed via Form 31 after 12 months of service for specific purposes: housing, home loan repayment, medical treatment, marriage, education, and special circumstances. Complete withdrawal (Form 19) is allowed after unemployment for 2+ months or at age 54+ (90% withdrawal allowed). Withdrawal before 5 years of service may attract TDS." },
      { question: "What is VPF and is it better than PPF?", answer: "VPF (Voluntary PF) is additional contribution to EPF beyond the mandatory 12%. It gets the SAME 8.25% tax-free interest as EPF with NO maximum limit (unlike PPF's ₹1.5L/year within 80C). For salaried employees, VPF is superior to PPF because it offers higher returns (8.25% vs 7.1%), the same tax treatment (EEE), and employer can also contribute to VPF." },
      { question: "What happens to my EPF when I change jobs?", answer: "Your EPF is completely portable via your UAN (Unique Account Number). When you change jobs, you can transfer your entire EPF balance from the old employer to the new employer through the EPFO UAN portal — no withdrawal required. Your service continuity is preserved, so the previous tenure counts towards the 5-year tax-free withdrawal requirement." },
      { question: "How is EPS (Employee Pension Scheme) different from EPF?", answer: "EPS is part of your employer's 12% contribution (8.33% goes to EPS, capped at ₹1,250/month). EPF is the corpus that grows in your account. EPS gives a monthly pension post-retirement based on service and last drawn salary, while EPF is a lump sum corpus. If service is under 9.5 years, EPS can be withdrawn as lump sum via Form 10C, but if over 9.5 years, you must take monthly pension." },
    ],
  },
  {
    path: "/calculators/nps",
    title: "NPS Calculator India FY 2026-27 - Pension Corpus & Tax Saving | AiTaxBot",
    description: "Free NPS Calculator India. Calculate National Pension System corpus, monthly pension, lump sum and tax savings under 80CCD(1), 80CCD(1B) +₹50,000 extra deduction. CA verified.",
    canonical: "https://www.aitaxbot.co.in/calculators/nps",
    h1: "NPS Calculator India FY 2026-27 - Pension Corpus & Tax Saving",
    intro: "The National Pension System (NPS) calculator projects retirement corpus and post-60 pension income. Contributions qualify for deduction under Section 80CCD(1) within the overall ₹1,50,000 Section 80C ceiling, plus an additional ₹50,000 under Section 80CCD(1B) — a benefit available only under the Old Tax Regime. At age 60, up to 60% of the corpus can be withdrawn tax-free as a lump sum; the remaining 40% must purchase an annuity, and that pension income is then taxed at the recipient's slab rate.",
    faqs: [
      { question: "What is the NPS extra ₹50,000 deduction under Section 80CCD(1B)?", answer: "Section 80CCD(1B) allows an additional deduction of ₹50,000 per year for NPS contributions, over and above the ₹1.5 lakh 80C limit. This means a 30% taxpayer saves ₹15,000 extra in tax — purely from this clause. It's one of the best tax-saving tools available in India." },
      { question: "Is NPS corpus tax-free at maturity?", answer: "Partially. At age 60, you can withdraw up to 60% of the NPS corpus as a lump sum — this is completely tax-free. The remaining 40% must be used to purchase an annuity (monthly pension), and that pension income is taxable as per your slab at the time of withdrawal." },
      { question: "Can I withdraw from NPS before age 60?", answer: "Yes, but with restrictions. Partial withdrawal (up to 25% of your contributions) is allowed after 3 years for specific reasons: higher education, marriage of children, purchase/construction of house, or treatment of critical illness. Premature exit before 60 requires 80% of corpus to go into annuity, and only 20% can be withdrawn lump sum." },
      { question: "What is the difference between NPS Tier I and Tier II?", answer: "Tier I is the mandatory pension account with lock-in until age 60 and offers tax benefits under 80CCD. Tier II is a voluntary savings account with no lock-in and no withdrawal restrictions, but it offers NO tax deduction benefits (except for Central Government employees)." },
      { question: "Is NPS better than PPF for tax saving?", answer: "Both serve different purposes. PPF offers EEE status (exempt at all 3 stages) but has a ₹1.5L annual limit within 80C. NPS gives an extra ₹50,000 deduction under 80CCD(1B) on top of 80C, making it superior for high-income earners. However, the mandatory 40% annuity means part of your NPS corpus will be taxable as pension income." },
      { question: "What happens to NPS account if I change jobs?", answer: "NPS is completely portable. Your PRAN (Permanent Retirement Account Number) stays with you regardless of employer changes. Your new employer can start contributing to the same account. This makes NPS far more flexible than EPFO for job changers." },
    ],
  },
  {
    path: "/calculators/home-loan",
    title: "Home Loan Calculator India FY 2026-27 — Eligibility, EMI & Tax Benefit | AiTaxBot",
    description: "Free Home Loan Affordability Calculator India. Check how much loan you can get on your salary, calculate EMI, total interest and Section 24 + 80C tax savings. CA verified.",
    canonical: "https://www.aitaxbot.co.in/calculators/home-loan",
    h1: "Home Loan Calculator India FY 2026-27 — Eligibility, EMI & Tax Benefit",
    intro: "This calculator checks home loan eligibility (via the standard Fixed Obligation to Income Ratio banks use) and computes EMI, total interest, and the annual tax saving available under the Old Tax Regime: up to ₹2,00,000 on interest under Section 24(b) / Section 22(2) of the Income Tax Act, 2025, and principal repayment within the ₹1,50,000 Section 80C ceiling. Neither deduction is available under the New Tax Regime (Section 202), which is why home-loan holders often find the Old Regime more favourable — this calculator's regime-comparison mode shows the actual Indian Rupee difference.",
    faqs: [
      { question: "How much home loan can I get on my salary?", answer: "Banks typically allow up to 50% of your net monthly income towards all EMIs combined (this is called FOIR — Fixed Obligation to Income Ratio). So on a ₹1 lakh monthly salary with no existing loans, you can afford an EMI of up to ₹50,000, which translates to roughly ₹55–60 lakh home loan at 8.75% for 20 years. Subtract any existing car loan or personal loan EMIs from this limit." },
      { question: "What is the tax benefit on home loan in FY 2026-27?", answer: "Under the Old Tax Regime: Section 24 (Section 22(2) under ITA 2025) allows deduction of up to ₹2 lakh per year on home loan interest for self-occupied property. Section 80C (Section 123 under ITA 2025) allows deduction on principal repayment (within the ₹1.5L overall 80C limit). Together, a 30% taxpayer can save ₹1.09 lakh per year. Note: these deductions are NOT available under the New Tax Regime (Section 202 of ITA 2025)." },
      { question: "What is LTV ratio and why does it matter?", answer: "LTV (Loan-to-Value) ratio is the loan amount as a percentage of property value. RBI mandates: LTV up to 80% for loans above ₹30L, and up to 90% for loans up to ₹30L. Most banks offer 80% LTV, meaning you need at least 20% as down payment. Higher down payment = lower EMI, less interest paid, and easier loan approval." },
      { question: "Is it better to choose shorter or longer tenure?", answer: "Shorter tenure = higher EMI but far less total interest paid. Example: ₹50L loan at 8.75%: 20-year tenure = EMI ₹44,100, total interest ₹56L. 10-year tenure = EMI ₹62,900, total interest ₹25.5L — saving ₹30.5L in interest. If your income can support it, shorter tenure is always better financially. Use our calculator to compare both scenarios." },
      { question: "Can I claim home loan tax benefits under the New Tax Regime?", answer: "No. Home loan interest deduction (Section 24 / Section 22(2) under ITA 2025) and principal repayment under Section 80C (Section 123 under ITA 2025) are not available under the New Tax Regime. This is one of the key reasons high-income salaried individuals with home loans often benefit more from the Old Tax Regime. Use our Income Tax Calculator to compare both regimes with and without home loan deductions." },
      { question: "What documents are needed for a home loan application?", answer: "KYC documents (Aadhaar, PAN), 3 months' salary slips, 6 months' bank statements, Form 16, ITR for last 2 years, property documents (sale agreement, title deed, approved plan), employer verification letter. Self-employed need ITR for 3 years and P&L statements. Having all documents ready speeds up approval from 2–3 weeks to 5–7 days." },
    ],
  },
  {
    path: "/calculators/vehicle-loan",
    title: "Vehicle Loan EMI Calculator India 2026 — Two-Wheeler & Car Loan | AiTaxBot",
    description: "Free vehicle loan EMI calculator for India. Compare flat rate vs reducing balance interest — see the hidden cost difference. Calculate two-wheeler and car loan EMI, total interest and cost breakdown.",
    canonical: "https://www.aitaxbot.co.in/calculators/vehicle-loan",
    h1: "Vehicle Loan EMI Calculator India 2026 — Two-Wheeler & Car Loan",
    intro: "This calculator computes EMI and total interest for two-wheeler and car loans in India, and distinguishes flat-rate from reducing-balance interest quotes, since the two produce materially different total interest for the same headline rate. For personal vehicles, EMI and interest carry no income tax benefit; a vehicle used exclusively for business purposes, registered in the business's name, can claim the interest as a business expense under Section 37 of the Income Tax Act, 2025.",
    faqs: [
      { question: "What is the interest rate on two-wheeler loans in India in 2026?", answer: "Two-wheeler loan interest rates in India range from 10% to 16% p.a. in 2026. PSU banks like SBI and Bank of Baroda offer rates starting from 10.5%. Private banks and NBFCs like Bajaj Finance and HDFC Bank charge 12–16%. Your exact rate depends on CIBIL score (750+ gets best rates), loan tenure, and the bike's ex-showroom price. Always compare at least 3 lenders before finalizing." },
      { question: "What is the interest rate on car loans in India in 2026?", answer: "Car loan interest rates in India range from 8.35% to 12% p.a. in 2026. SBI offers from 8.65%, HDFC Bank from 9%, and Maruti Finance from 8.35% for Maruti vehicles. Rates are influenced by RBI's repo rate, your CIBIL score, car brand (some OEMs negotiate rates), and whether it's a new or used vehicle. Used car loans are typically 1.5–2% higher." },
      { question: "How much two-wheeler loan can I get?", answer: "Banks typically finance up to 85–90% of the on-road price for two-wheelers. So on a ₹1.2 lakh scooter, you could get ₹1,02,000–₹1,08,000 as a loan. The remaining 10–15% is your down payment. Minimum income eligibility is ₹10,000/month for salaried, ₹15,000/month for self-employed. No separate income proof is needed for many lenders for bikes under ₹1 lakh." },
      { question: "Should I choose a shorter or longer EMI tenure for a vehicle loan?", answer: "Shorter tenure = lower total interest but higher monthly EMI. Example: ₹5 lakh car loan at 9.25%: 3-year tenure = EMI ₹15,941, total interest ₹73,876. 7-year tenure = EMI ₹7,825, total interest ₹1,57,304. The 7-year option costs ₹83,000 extra in interest. Always choose the shortest tenure your income can comfortably support — vehicle loans don't have tax benefits so minimizing interest is the priority." },
      { question: "Is there any tax benefit on vehicle loan in India?", answer: "For personal vehicles (two-wheelers or four-wheelers for personal use), there is NO income tax benefit on EMI or interest. However, if you use the vehicle exclusively for business purposes and it's booked in the name of a business/firm, the interest paid can be claimed as a business expense under Section 37 of ITA 2025. Salaried employees get zero tax benefit on personal vehicle loans." },
      { question: "What documents are needed for a vehicle loan?", answer: "KYC (Aadhaar + PAN), 3 months' salary slips or 6 months' bank statements, Form 16 or ITR (for loans above ₹3 lakh), quotation or proforma invoice from the dealer, and passport-size photos. Self-employed need ITR for 2 years. Most banks now offer instant vehicle loans with digital verification in 2–4 hours for salaried applicants with 750+ CIBIL scores." },
      { question: "What is the difference between flat rate and reducing balance rate on a vehicle loan?", answer: "Flat rate (also called simple interest rate) charges interest on the original loan amount for the entire tenure, even as you repay each month. Reducing balance rate charges interest only on the outstanding principal — as you repay, interest reduces. At the same quoted rate, flat rate costs approximately 80–90% more total interest than reducing balance. For example, a ₹5 lakh loan at 9% for 5 years: reducing balance = ₹1.22 lakh total interest; flat rate = ₹2.25 lakh total interest. Always ask your lender: 'Is this a flat rate or reducing balance rate?' Most scheduled banks use reducing balance. Some dealer-finance schemes and NBFCs quote flat rates which look lower but cost significantly more." },
    ],
  },
  {
    path: "/calculators/trading-tax",
    title: "US Stock & F&O Trading Tax Calculator India FY 2025-26 | AiTaxBot",
    description: "Free trading tax calculator for Indian investors. Calculate capital gains tax on US stocks (INDmoney/Vested) with automatic USD/INR conversion, F&O business income tax, US dividend DTAA credit, and ITR form selector. CA verified.",
    canonical: "https://www.aitaxbot.co.in/calculators/trading-tax",
    h1: "US Stock & F&O Trading Tax Calculator India FY 2025-26",
    intro: "This calculator computes Indian tax liability on equity, F&O, and US stock trading. Listed-equity short-term gains (under 12 months) are taxed at 20% under Section 111A; long-term gains above ₹1,25,000/year at 12.5% under Section 112A. Futures & Options income is treated as non-speculative business income, taxed at slab rates, with tax-audit applicability determined by turnover. Gains on US stocks are converted to Indian Rupees at the applicable exchange rate and are eligible for Foreign Tax Credit under India's DTAA with the United States where US tax has already been withheld.",
    faqs: [
      { question: "Is profit from selling US stocks (via INDmoney or Vested) taxable in India?", answer: "Yes. As an Indian tax resident, you must declare and pay tax on all global income, including gains from US stocks traded on platforms like INDmoney, Vested, or Stockal. Short-term capital gains (held less than 24 months) are taxed at your applicable income tax slab rate. Long-term capital gains (held 24 months or more) are taxed at 12.5% without indexation under Section 112A / §128 of ITA 2025, introduced by the Finance Act 2024." },
      { question: "Which USD/INR exchange rate should I use for US stock capital gains calculation?", answer: "Use the RBI/FBIL reference rate on the date of purchase (buy) and the date of sale (sell). The cost in INR = quantity × buy price USD × RBI rate on buy date. The sale consideration in INR = quantity × sell price USD × RBI rate on sell date. Capital gain = INR sale proceeds minus INR cost of acquisition. This calculator auto-fetches historical rates from the ECB/Frankfurter API for convenience, but always cross-verify with official FBIL rates at fbil.org.in for final ITR filing." },
      { question: "What is the LTCG threshold for US stocks — 12 months or 24 months?", answer: "24 months. Unlike domestic listed equity shares (where LTCG applies after 12 months), US stocks are classified as foreign equity which are unlisted securities for Indian tax purposes. The long-term holding period for unlisted securities is 24 months (2 years). If you held US stocks for less than 24 months, the entire gain is Short-Term Capital Gain (STCG) taxable at your slab rate." },
      { question: "How is dividend from US stocks taxed in India?", answer: "US companies withhold 25% tax on dividends paid to Indian residents under the India-USA DTAA (Double Tax Avoidance Agreement). In India, this dividend is added to your total income and taxed at slab rates under 'Income from Other Sources'. However, you can claim a Foreign Tax Credit (FTC) for the 25% US withholding tax by filing Form 67 before submitting your ITR. This prevents double taxation — you pay the higher of the two tax rates, not both." },
      { question: "Is Indian F&O (Futures & Options) trading income treated as capital gains?", answer: "No. Indian F&O income is non-speculative business income under the proviso to Section 43(5) of the Income Tax Act, 1961. It is taxed at your applicable income tax slab rate. There is no flat rate; if your total income (including F&O profit) exceeds the basic exemption limit, you pay tax as per the applicable slab. Importantly, F&O losses can be set off against any business income (except salary) and carried forward for up to 8 years." },
      { question: "What is 'turnover' for F&O trading and when does the tax audit apply?", answer: "For F&O trading, turnover is the absolute sum of all profits and losses — not net P&L. Example: Trade 1 = +₹50,000, Trade 2 = −₹30,000, Trade 3 = +₹80,000. Turnover = ₹50,000 + ₹30,000 + ₹80,000 = ₹1,60,000 (not ₹1,00,000 net). A tax audit under Section 44AB is mandatory if your F&O turnover exceeds ₹10 crore (or ₹1 crore if profit is less than 6% of turnover). You need to maintain books of accounts and file ITR-3." },
      { question: "What is Schedule FA and do I need to disclose my US stocks there?", answer: "Schedule FA (Foreign Assets) must be disclosed in your ITR if you hold any foreign assets at any time during the year — even if you made no gains. You must report US stocks held on December 31 of the relevant tax year, including the cost of acquisition, peak value, and closing value. Non-disclosure of foreign assets is treated as a violation of the Black Money (Undisclosed Foreign Income and Assets) Act, 2015, with a penalty of ₹10 lakh per account. Always disclose, even if value is small." },
      { question: "Which ITR form should I use if I have US stock gains and Indian F&O income?", answer: "If you have US stock capital gains only, file ITR-2. If you have Indian F&O income (which is business income), file ITR-3 — this is mandatory even if F&O was your only income. If you have both US stocks AND F&O, file ITR-3. ITR-1 cannot be used if you have capital gains from foreign assets or business income. Also file Form 67 (for Foreign Tax Credit on US dividend withholding) before submitting the ITR." },
    ],
  },
  {
    path: "/nri",
    title: "NRI Tax Corner — DTAA, NRO/NRE Accounts, Repatriation | AiTaxBot",
    description: "Complete NRI tax resource: DTAA calculator, NRO vs NRE account comparison, NRI income tax calculator, and repatriation planner. Tax tools for Indians living abroad.",
    canonical: "https://www.aitaxbot.co.in/nri",
    h1: "NRI Tax Corner — DTAA, NRO/NRE Accounts, Repatriation",
    intro: "AiTaxBot's NRI Tax Corner covers Indian tax obligations for Non-Resident Indians: DTAA relief calculation, NRO vs NRE vs FCNR account taxation, NRI-specific income tax computation (including the fact that NRIs cannot claim the Section 87A/156 rebate available to residents), and a repatriation planner covering FEMA remittance limits. All figures are computed in Indian Rupees under the Income Tax Act, 2025 and current FEMA regulations, cross-checked against CBDT guidance where applicable. Residential status is decided by days of physical presence in India under the residence tests, not by citizenship, visa or where a salary is paid, and it is tested afresh every financial year. That single determination drives everything else: a resident is taxed in India on worldwide income, while a non-resident is taxed only on income that accrues in, arises in, or is received in India. Where the same income is taxable in two countries, relief comes from the Double Taxation Avoidance Agreement with the country concerned, either by exempting the income or by allowing credit for the foreign tax paid, and claiming it needs a Tax Residency Certificate plus Form 10F. The tools in this section work through those questions in order — status first, then the India tax charge, then treaty relief, then how much can actually be remitted abroad and under what documentation.",
    faqs: [
      { question: "Who is an NRI for Indian tax purposes?", answer: "An individual is an NRI (Non-Resident Indian) if they stay in India for less than 182 days in a financial year, or less than 60 days in the current year AND less than 365 days in the preceding 4 years. NRIs are taxed only on income earned or accrued in India." },
      { question: "Do NRIs need to file ITR in India?", answer: "NRIs must file ITR if their Indian income exceeds ₹2.5 lakh (basic exemption), or if they want to claim a refund of excess TDS, or to carry forward capital losses. Filing is also recommended for visa and loan applications." },
      { question: "Is NRE account interest taxable?", answer: "No. Interest earned on NRE savings and fixed deposit accounts is completely exempt from Indian income tax under Section 10(4) of the Income Tax Act. However, if you return to India and become a resident, NRE interest becomes taxable." },
      { question: "Can NRIs invest in Indian mutual funds?", answer: "Yes. NRIs can invest in Indian mutual funds through NRE or NRO accounts. NRE-funded investments have no TDS on redemption (profits are freely repatriable). NRO-funded investments are subject to TDS. US and Canada-based NRIs face restrictions with some fund houses due to FATCA." },
      { question: "What is the FEMA annual repatriation limit?", answer: "NRIs can repatriate up to USD 1 million per financial year from their NRO accounts (combining all sources including property sale, NRO FDs, rental income). NRE and FCNR account funds are freely repatriable with no annual limit." },
      { question: "When does an NRI become RNOR (Resident but Not Ordinarily Resident)?", answer: "When an NRI returns to India, they initially get RNOR status for 2-3 years. RNOR individuals are taxed like NRIs on foreign income — only Indian-source income is taxable. After RNOR period, they become full Residents and global income becomes taxable in India." },
    ],
    links: [
      { href: "/nri/income-tax-calculator", label: "NRI Income Tax Calculator" },
      { href: "/nri/dtaa-calculator", label: "DTAA Relief Calculator" },
      { href: "/nri/nro-nre-comparison", label: "NRO vs NRE Account Comparison" },
      { href: "/nri/repatriation-planner", label: "Repatriation Planner" },
      { href: "/calculators/trading-tax", label: "Trading Tax Calculator" },
      { href: "/blog/us-stock-trading-tax-india", label: "US Stock Trading Tax in India" },
    ],
  },
  {
    path: "/nri/dtaa-calculator",
    title: "DTAA Calculator — Avoid Double Taxation | NRI Tax Relief India | AiTaxBot",
    description: "Calculate your DTAA tax relief as an NRI. See how much tax you save under India's Double Taxation Avoidance Agreements with USA, UK, UAE, Canada and 90+ countries.",
    canonical: "https://www.aitaxbot.co.in/nri/dtaa-calculator",
    h1: "DTAA Calculator — Avoid Double Taxation | NRI Tax Relief India",
    intro: "This calculator estimates the tax relief available to NRIs under India's Double Taxation Avoidance Agreements (DTAA) with over 90 countries. DTAA relief is not automatic — it requires submitting Form 10F and a Tax Residency Certificate to the Indian payer to secure a reduced TDS rate, or claiming Foreign Tax Credit when filing your return in your country of residence. NRE account interest is separately exempt under Section 10(4) regardless of DTAA; NRO account interest is taxable and DTAA applies to it.",
    faqs: [
      { question: "What is Form 10F and why do I need it?", answer: "Form 10F is a Certificate for Lower/Nil Deduction of TDS. As an NRI, you need it to claim reduced DTAA rates of TDS instead of the default 30%. Submit it to Indian payers (banks, employers, etc.) along with your Tax Residency Certificate." },
      { question: "Can I get a refund if excess TDS was deducted in India?", answer: "Yes. If TDS deducted exceeds your tax liability, you can file Form 10F in advance to claim lower rates, or file an income tax return to claim refunds for excess TDS. Keep Form 16A/26AS as proof." },
      { question: "Does DTAA apply to NRE account interest?", answer: "NRE account interest is exempt under Section 10(4) of the Income Tax Act. No TDS is deducted and no DTAA relief is needed. However, NRO interest is taxable and DTAA applies." },
      { question: "What if my country doesn't have a DTAA with India?", answer: "If your country lacks a DTAA with India, you cannot claim foreign tax credit under a treaty. However, some countries allow unilateral credits under their domestic law. Consult a tax advisor in your country." },
      { question: "Is DTAA benefit automatic or do I need to apply?", answer: "DTAA benefits are NOT automatic. You must proactively submit Form 10F and Tax Residency Certificate to claim reduced TDS rates in India, and file your foreign tax return to claim Foreign Tax Credit." },
      { question: "Do I need to report Indian income in my foreign country?", answer: "Yes. Most countries tax their residents on worldwide income. You must report your Indian income in your country's tax return and claim Foreign Tax Credit for taxes paid in India to avoid double taxation." },
    ],
  },
  {
    path: "/nri/nro-nre-comparison",
    title: "NRO vs NRE vs FCNR Account — Complete Comparison | AiTaxBot",
    description: "Complete guide comparing NRO, NRE and FCNR accounts for NRIs. Understand tax treatment, repatriation rules, and which account saves the most tax.",
    canonical: "https://www.aitaxbot.co.in/nri/nro-nre-comparison",
    h1: "NRO vs NRE vs FCNR Account — Complete Comparison",
    intro: "NRO accounts hold Indian-source income (rent, dividends, pension) and interest earned on them is fully taxable in India, subject to TDS, though DTAA may reduce the rate. NRE accounts hold foreign earnings remitted to India, and interest on them is exempt from Indian tax under Section 10(4) with free repatriability. FCNR accounts hold foreign-currency deposits, shielding the principal from exchange-rate risk, also with exempt interest. This comparison tool helps NRIs choose the right account for their income type in Indian Rupee and foreign-currency terms.",
    faqs: [
      { question: "Can I have both NRO and NRE accounts simultaneously?", answer: "Yes, absolutely. In fact, most NRIs should have both. Use NRO for Indian-source income (rent, salary, pension) and NRE for foreign-source income and investments. You can hold both accounts at the same bank or different banks." },
      { question: "What happens to my existing savings account when I become an NRI?", answer: "Your resident rupee savings account automatically converts to an NRO account. You cannot maintain a regular resident savings account once you become an NRI. The conversion happens automatically, but you should inform your bank about your NRI status to avoid complications." },
      { question: "Can I invest in Indian mutual funds through NRE account?", answer: "Yes, you can invest in Indian mutual funds through NRE account and all returns are tax-free. However, if you're investing a lump sum that will mature and be repatriated, you may face higher forex compliance. SIPs (Systematic Investment Plans) from NRE accounts are excellent — no TDS on returns." },
      { question: "Is NRE interest really 100% tax-free?", answer: "Yes, completely. NRE account interest, dividend income, and capital gains are all 100% tax-free under Income Tax Act Section 115E. This applies only to non-residents. Interest is credited directly to your account — no TDS deduction." },
      { question: "What documents do I need to open an NRI account?", answer: "You'll need: (1) Valid passport, (2) Proof of overseas residence (rental agreement, utility bill, work contract), (3) PAN card, (4) Address proof in India (if you own property). Different banks may have slightly different requirements. NRI status needs to be established through your Income Tax records or self-declaration with supporting documents." },
      { question: "Can I use NRO/NRE accounts for UPI payments?", answer: "Most banks restrict UPI access from NRI accounts due to RBI regulations around resident vs non-resident fund flows. You can use net banking and international wire transfers. For domestic payments, you may need to convert NRE to NRO funds (which has tax implications). Always check with your bank before attempting UPI transactions." },
    ],
  },
  {
    path: "/nri/income-tax-calculator",
    title: "NRI Income Tax Calculator FY 2026-27 — No 87A Rebate | AiTaxBot",
    description: "Calculate your Indian income tax as an NRI for FY 2026-27. NRIs cannot claim Section 87A rebate. Includes NRO TDS, DTAA benefits, and capital gains calculation.",
    canonical: "https://www.aitaxbot.co.in/nri/income-tax-calculator",
    h1: "NRI Income Tax Calculator FY 2026-27 — No 87A Rebate",
    intro: "This calculator computes an NRI's Indian income tax liability for FY 2026-27, covering NRO interest, dividends, rental income, and capital gains taxed at Indian slab and special rates. Unlike resident taxpayers, NRIs cannot claim the Section 87A/156 rebate regardless of income level, so tax is payable on income above the basic exemption even at modest levels. Surcharge (10%–37% depending on income and regime) and marginal relief apply exactly as for residents, with the special 15% surcharge cap on Section 111A/112A gains applied separately from slab income.",
    faqs: [
      { question: "Which ITR form should NRIs file?", answer: "NRIs should file ITR-2 if they have income from house property, capital gains, or other income sources. File ITR-1 if you have only salary income." },
      { question: "Is NRE account interest taxable when I return to India?", answer: "No, NRE account interest remains exempt even after you become a resident. However, any repatriation of principal on a foreign trip becomes taxable if you return to India and this is interpreted as breaking your NRE status." },
      { question: "Can NRIs invest in PPF?", answer: "No, NRIs cannot invest in or open new PPF accounts. They can only continue existing PPF accounts opened when they were residents." },
      { question: "What is the last date for NRI ITR filing?", answer: "The ITR filing deadline is 31st July for the previous financial year. Filing before 31st December allows you to avoid certain penalties." },
      { question: "Do NRIs need to pay advance tax?", answer: "Yes, if the total tax liability exceeds ₹10,000, NRIs must pay advance tax in four quarterly installments." },
      { question: "Can NRI claim HRA deduction?", answer: "No, NRIs cannot claim HRA deduction. HRA is only applicable to resident individuals." },
    ],
  },
  {
    path: "/nri/repatriation-planner",
    title: "NRI Repatriation Planner — Transfer Money from India Abroad | AiTaxBot",
    description: "Step-by-step guide and calculator for NRI money repatriation. Understand FEMA limits, Form 15CA/15CB requirements, and how to transfer NRO account funds abroad legally.",
    canonical: "https://www.aitaxbot.co.in/nri/repatriation-planner",
    h1: "NRI Repatriation Planner — Transfer Money from India Abroad",
    intro: "This tool walks NRIs through the FEMA rules for repatriating funds from India abroad: the USD 1 million per financial year scheme for NRO account balances (subject to tax clearance), unrestricted repatriation of NRE account balances, and the Form 15CA/15CB certification a Chartered Accountant must issue before a bank will process an outward remittance above the prescribed threshold. All limits are stated in the currencies FEMA itself specifies (USD for the repatriation ceiling, Indian Rupees for the underlying account balances).",
    faqs: [
      { question: "What is the maximum amount an NRI can repatriate per year?", answer: "USD 1 million per financial year (April to March) from NRO accounts. NRE and FCNR accounts have no limit. The limit applies to both current account income (rent, pension, dividends) and capital account (property sale proceeds) combined." },
      { question: "Is Form 15CA required for all NRO remittances?", answer: "Form 15CA is required for all NRO remittances. However, Form 15CB (CA certificate) may not be required for remittances below approximately ₹5 lakh. Confirm with your Chartered Accountant based on the specific transaction." },
      { question: "Can I repatriate money if I have outstanding Indian taxes?", answer: "No. All Indian taxes on the source income must be paid and cleared before you can obtain Form 15CB from a CA. Outstanding tax liability will prevent the CA from certifying Form 15CB, blocking the entire remittance." },
      { question: "How long does NRO to foreign account transfer take?", answer: "After submitting Form 15CA and Form 15CB to your bank, the transfer typically takes 3–7 working days for the bank to verify documents and initiate a SWIFT transfer. The foreign bank receives the funds within the same window." },
      { question: "Can I repatriate money from sale of agricultural land?", answer: "Agricultural land located in India is not always freely repatriable. If you sold agricultural land as an NRI resident of another country, repatriation may require special FEMA approval. Consult a Chartered Accountant and your RBI-registered money changer for guidance." },
      { question: "What happens if I repatriate without Form 15CA?", answer: "The bank will refuse to process the remittance. If you somehow bypass the bank, the foreign recipient's bank may flag the transfer as non-compliant with Indian tax regulations, leading to financial penalties, account freezes, or legal scrutiny from Indian tax authorities." },
    ],
  },
  {
    path: "/tools/rent-receipt",
    title: "Free Rent Receipt Generator India — Download & Email PDF | AiTaxBot",
    description: "Generate professional rent receipts instantly. Download as PDF or email to yourself. Includes landlord PAN, revenue stamp reminder, and HRA exemption link. Free with a quick sign-in.",
    canonical: "https://www.aitaxbot.co.in/tools/rent-receipt",
    h1: "Free Rent Receipt Generator India — Download & Email PDF",
    intro: "Rent receipts are the primary documentary evidence an employer or the tax department accepts for an HRA exemption claim under Section 10(13A). Indian tax rules require the landlord's PAN once annual rent exceeds ₹1,00,000, and a revenue stamp on any single cash payment above ₹5,000. This generator produces compliant, dated rent receipts in Indian Rupees, formatted for either employer submission or your own HRA exemption records. House Rent Allowance is exempt under Section 10(13A) of the Income-tax Act, 1961 read with Rule 2A, to the extent of the least of three amounts: the actual HRA received, rent paid less 10 per cent of salary, and 50 per cent of salary in a metro city or 40 per cent elsewhere. Salary for this test means basic pay plus dearness allowance where the terms of employment provide for it, not gross pay — a distinction that changes the exemption for anyone receiving DA. Employers ask for rent receipts as the evidence behind that claim, and will usually also ask for the landlord's PAN once annual rent crosses Rs. 1,00,000. A receipt that will survive scrutiny names the tenant and the landlord, states the property address, the period covered and the amount paid, and is signed by the landlord. This generator lays out those fields in the order payroll teams expect and produces a PDF you can email or print. Generate receipts for the months you actually paid rent; a full year of identical receipts created on one day is exactly the pattern an assessing officer looks for.",
    faqs: [
      { question: "Do I need my landlord's PAN on the rent receipt?", answer: "PAN of the landlord is mandatory if the total rent paid in the financial year exceeds ₹1,00,000 (roughly ₹8,333/month). Below that, PAN is not compulsory, though including it strengthens your HRA claim during assessment." },
      { question: "Is a revenue stamp required on a rent receipt?", answer: "A revenue stamp is required when a single cash rent payment exceeds ₹5,000. If rent is paid by bank transfer, cheque, or UPI, a revenue stamp is not needed regardless of amount." },
      { question: "Do I need rent receipts if my HRA is small?", answer: "Most employers waive documentary proof for HRA claims up to ₹3,000 per month as an administrative concession, but the exemption itself under Section 10(13A) still requires that rent actually be paid — keep receipts regardless in case of scrutiny." },
      { question: "What details must a valid rent receipt include?", answer: "A valid rent receipt should show the tenant's and landlord's names and addresses, the rented property's address, the rent amount and period it covers, the mode of payment, the landlord's PAN (if applicable), and the landlord's signature." },
      { question: "Can I generate rent receipts for past months in one go?", answer: "Yes — our generator lets you create a full financial year's receipts (April to March, or any custom range) as a single PDF, each dated and numbered separately, ready to submit to your employer for HRA proof." },
    ],
  },
  {
    path: "/tools/ais-26as-form16",
    title: "AIS vs 26AS vs Form 16 Reconciliation — AiTaxBot",
    description: "Upload your AIS, Form 26AS, and Form 16 to instantly detect mismatches, get AI-powered explanations, and prepare for error-free ITR filing.",
    canonical: "https://www.aitaxbot.co.in/tools/ais-26as-form16",
    h1: "AIS vs 26AS vs Form 16 Reconciliation",
    intro: "This tool reconciles three CBDT-linked documents — your Annual Information Statement (AIS), Form 26AS, and Form 16 — to catch mismatches before you file. Discrepancies between what your employer reported in Form 16 and what appears in AIS/26AS are a common trigger for an automated intimation notice under Section 143(1)(a) once a return is processed. The tool flags each mismatch in Indian Rupee terms and explains, in plain language, what it means and how to correct it via the AIS feedback mechanism before filing. The three documents exist for different reasons and routinely disagree. The Annual Information Statement is the department's own record of what banks, brokers, mutual funds and registrars reported about you under Section 285BB. Form 26AS is the tax credit statement — the ledger of TDS and advance tax actually deposited against your PAN. Form 16 is what one employer certifies about salary paid and tax deducted. None of the three is complete on its own: Form 16 knows nothing about your savings interest, the AIS may miss income nobody reported, and Form 26AS shows the tax withheld without the gross amount it was withheld from. Most notices issued under Section 143(1) trace back to a gap between these. Typical cases: fixed deposit interest the bank reported and the taxpayer never declared, a share sale captured in the AIS but absent from the broker's tax P&L because the statement was downloaded before year end, TDS under Section 194C on contract receipts where the gross receipt was never shown as business income, or two employers in one year each issuing a Form 16 that applies the standard deduction and the exemption limit in full. This tool reads all three, matches them head by head, and lists every gap with the amount and the deductor so you can resolve it before filing rather than after a notice.",
    faqs: [
      { question: "What is the difference between AIS, Form 26AS and Form 16?", answer: "Form 26AS shows tax deducted at source (TDS) and tax collected at source (TCS) against your PAN. AIS (Annual Information Statement) is broader — it also includes interest, dividends, securities transactions, and other financial data reported to the tax department. Form 16 is issued only by your employer and covers salary and TDS on salary specifically. The three should agree; when they don't, that mismatch is exactly what triggers scrutiny." },
      { question: "Why does a mismatch between AIS and Form 16 matter?", answer: "The return-processing system under Section 143(1)(a) cross-checks the income and TDS you declare against AIS and Form 26AS. A mismatch — say, salary in Form 16 not matching the AIS entry, or TDS claimed that doesn't appear in 26AS — is a common trigger for an automated intimation notice asking you to explain the difference before your refund is released." },
      { question: "What should I do if my AIS shows incorrect information?", answer: "AIS has a built-in feedback mechanism on the income tax portal: for each mismatched entry, you can submit feedback such as 'income is not taxable', 'income relates to a different PAN', or 'information is duplicate'. The reporting entity (bank, employer, broker) can then revise what they filed. Correcting it before you file your return avoids a mismatch notice later." },
      { question: "Can I file my ITR before all TDS shows up in Form 26AS?", answer: "It's safer to wait — TDS credit is granted based on what's reflected in Form 26AS/AIS, not merely on your Form 16 or salary slips. If a deductor hasn't filed their TDS return yet, that credit won't show up, and claiming it anyway can cause a demand notice even though the tax was genuinely deducted from your income." },
    ],
  },
  {
    path: "/about",
    title: "About Us - AiTaxBot Free Tax Calculator & Financial Tools India",
    description: "Learn about AiTaxBot — India's free AI-powered tax platform. Income tax calculator, HRA, SIP, NPS, rent receipt generator, CA directory and more. Built for Indian taxpayers.",
    canonical: "https://www.aitaxbot.co.in/about",
    h1: "About Us - AiTaxBot Free Tax Calculator & Financial Tools India",
    intro:
      "AiTaxBot is an independent, India-focused tax-technology platform operated as a sole proprietorship from Bengaluru, Karnataka, India, and founded by a practising Chartered Accountant. Its calculators are designed and reviewed by a Chartered Accountant and updated for each Finance Act and CBDT notification affecting Indian income tax. Every figure the platform produces is traceable to a provision: the income tax calculators apply the slab rates, the Section 87A rebate, marginal relief and surcharge as enacted, the HRA calculator applies the statutory least-of-three test and the eight metro cities notified under Rule 279 of the Income-tax Rules, 2026, and the provident fund calculator applies the EPS wage ceiling of Rs. 15,000 per month. Where a calculator makes an assumption, it says so on the page rather than burying it. On which law applies: returns being filed now are governed by the Income-tax Act, 1961. The Income-tax Act, 2025 applies to income earned from 1 April 2026 onward, so the first return filed under it falls in 2027. AiTaxBot computes under both and labels which is which, because conflating the two is the most common error in current Indian tax content. AiTaxBot is an educational and computational tool, not a substitute for advice on your own facts. It has no affiliation with the Income Tax Department, the Central Board of Direct Taxes, or any government body, and it does not file returns on your behalf. It is also not a cryptocurrency, token, coin or blockchain project, and has no connection to any digital-asset venture of a similar name — all amounts on this site are Indian Rupees. Questions, corrections and grievances go to admin@aitaxbot.co.in and are answered by a person.",
    faqs: [
      { question: "Who builds and reviews AiTaxBot's tax calculations?", answer: "AiTaxBot's calculators are designed and reviewed by a Chartered Accountant, and the underlying tax logic is updated each time the Finance Act or CBDT notifications change a slab, rebate, or deduction limit — most recently for the Income Tax Act, 2025 and AY 2026-27." },
      { question: "Is AiTaxBot affiliated with the Income Tax Department or CBDT?", answer: "No. AiTaxBot is an independent, privately built platform and is not affiliated with the Income Tax Department, CBDT, or any government body. It provides calculation and planning tools; it is not a substitute for filing your return through the official portal or consulting a qualified professional for your specific situation." },
      { question: "What tools does AiTaxBot offer beyond the income tax calculator?", answer: "The platform covers HRA exemption, SIP and SWP planning, NPS corpus projection, PF (EPF/VPF/PPF) maturity, home loan and vehicle loan EMI, capital-gains tax on equity/F&O/US stocks, a rent-receipt generator, an AIS/26AS/Form 16 reconciliation tool, and a directory of verified Chartered Accountants across India." },
    ],
  },
  {
    path: "/contact",
    title: "Contact Us - AiTaxBot Support & Inquiries",
    description: "Get in touch with AiTaxBot for tax calculator support, questions, or feedback. Email: info@aitaxbot.in | Phone: +91 78998 69036 | Bengaluru, India",
    canonical: "https://www.aitaxbot.co.in/contact",
    h1: "Contact Us - AiTaxBot Support & Inquiries",
    intro: "AiTaxBot is based in Bengaluru, India, and can be reached by email or phone for questions about any calculator, tool accuracy, or general feedback. All calculators are free to use; tools that require sign-in (saved results, document upload) are covered separately under the Privacy Policy. AiTaxBot provides calculation tools and guidance only — for filing an actual return, consult a qualified Chartered Accountant or use the Income Tax Department's official e-filing portal.",
    faqs: [
      { question: "How quickly does AiTaxBot respond to queries?", answer: "We typically respond within 24 hours during business days. You can reach us by email or phone using the details on this page." },
      { question: "Are AiTaxBot's calculators really free?", answer: "Yes — all calculators and tools are completely free to use, with no hidden charges or subscriptions." },
      { question: "Is my financial data stored when I use a calculator?", answer: "No. Calculations are performed locally in your browser for the standalone calculators; we do not store your financial inputs. Tools that require sign-in (like saved results or document upload) are covered separately in our Privacy Policy." },
      { question: "Can AiTaxBot file my ITR for me?", answer: "AiTaxBot provides calculation tools and guidance, not filing services. For actual tax filing, please consult a qualified Chartered Accountant or file directly through the Income Tax Department's e-filing portal." },
    ],
  },
  {
    // Added 2026-08-30: AdSense explicitly checks Privacy Policy / Terms of
    // Service accessibility (see the adsense-ops persona notes), and this
    // page previously had zero entry in SEO_CONTENT_BY_PATH — a non-JS
    // crawler saw only the generic, stale client/index.html shell instead of
    // any of this page's real, DPDPA-specific content.
    path: "/privacy-policy",
    title: "Privacy Policy - AiTaxBot | How We Protect Your Data",
    description: "AiTaxBot Privacy Policy — learn how we collect, use, store, and protect your personal information in compliance with India's Digital Personal Data Protection Act 2023.",
    canonical: "https://www.aitaxbot.co.in/privacy-policy",
    h1: "Privacy Policy",
    intro: "AiTaxBot (\"we\", \"us\", \"our\") is committed to protecting your privacy. This policy explains what personal data we collect, why we collect it, how we use and store it, and your rights as a Data Principal under India's Digital Personal Data Protection Act, 2023 (DPDPA). It applies to both aitaxbot.co.in and www.aitaxbot.co.in.",
    faqs: [
      { question: "What law governs AiTaxBot's privacy practices?", answer: "AiTaxBot's data collection, use, and storage practices are governed by India's Digital Personal Data Protection Act, 2023 (DPDPA). The full policy on this page explains what is collected, why, and what rights you have as a Data Principal under that Act." },
      { question: "Can I delete my AiTaxBot account and data?", answer: "Yes — AiTaxBot provides a self-service \"Delete My Account\" option that removes your account data. See the full Privacy Policy for exactly what is deleted and any retention exceptions." },
    ],
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service & Disclaimer - AiTaxBot",
    description: "AiTaxBot Terms of Service and Disclaimer. Read our usage guidelines, financial disclaimer, CA directory terms, and legal agreement before using our free tax tools.",
    canonical: "https://www.aitaxbot.co.in/terms-of-service",
    h1: "Terms of Service & Disclaimer",
    intro: "AiTaxBot provides tax calculators, financial tools, and educational content for informational and educational purposes only. Results from these calculators do not constitute professional tax, legal, or financial advice, and AiTaxBot is not a registered tax consultant, investment adviser, or financial planner under any Indian regulation. These Terms of Service, governed by Indian law, set out the full usage guidelines, financial disclaimer, and CA directory terms that apply when you use the platform.",
    faqs: [
      { question: "Is AiTaxBot a registered tax consultant or financial adviser?", answer: "No. AiTaxBot is not a registered tax consultant, investment adviser, or financial planner under any Indian regulation. Its calculators and content are for informational and educational purposes only and do not constitute professional tax, legal, or financial advice." },
      { question: "What law governs AiTaxBot's Terms of Service?", answer: "AiTaxBot's Terms of Service and Disclaimer are governed by Indian law. The full terms cover usage guidelines, the financial disclaimer, and the terms that apply to CAs listed in AiTaxBot's directory." },
    ],
  },
];

/**
 * Strips the light markdown (bold, links) blogPosts.ts's content_md uses —
 * this content is going into a plain-text <p>/<h3> block, not a markdown
 * renderer, so literal "**"/"[]()" characters would otherwise show up as-is
 * in the raw HTML a crawler reads.
 */
function stripMarkdown(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold** -> bold
    .replace(/__(.+?)__/g, "$1") // __bold__ -> bold
    .trim();
}

/**
 * Builds a SeoPageContent from a blog post's own metaTitle/metaDescription
 * and bodySections — no new prose invented here, unlike the hand-written
 * entries above. Every paragraph of every "intro"-type section is joined
 * into one flowing paragraph (lowest-risk choice: injectSeoContent() renders
 * page.intro as a single <p>, and every hand-written entry above is already
 * single-paragraph, so this doesn't change that template's behaviour for the
 * 20 existing routes).
 *
 * A "faq" section is NOT one {question, answer} pair per section the way the
 * CLAUDE.md doc for this file's BlogPost interface describes it — every one
 * of the 36 posts, checked directly against this file rather than trusting
 * that doc, uses exactly one faq section per post holding an `items` array
 * of {q, a} pairs (confirmed live: this mismatch crashed the dev server on
 * first run with "Cannot read properties of undefined (reading 'replace')"
 * — trusting the doc over the actual data would have shipped that crash).
 */
function blogPostToSeoContent(post: BlogPost): SeoPageContent {
  const intro = post.bodySections
    .filter((s: { type: string }) => s.type === "intro")
    .map((s: { content_md: string }) => stripMarkdown(s.content_md).replace(/\n+/g, " "))
    .join(" ");

  // Everything that is actually the article: the headed body sections and the
  // closing paragraph. Excludes "cta" (a call to action is not content) and
  // "faq" (handled separately below, so it can also feed the FAQPage JSON-LD).
  const sections: SeoSection[] = post.bodySections
    .filter((s: { type: string; content_md?: string }) =>
      ["h2", "h3", "outro"].includes(s.type) && typeof s.content_md === "string")
    .map((s: { heading?: string; content_md: string }) => ({
      heading: s.heading,
      body: stripMarkdown(s.content_md).replace(/\n+/g, " "),
    }))
    .filter((s: SeoSection) => s.body.length > 0);

  const faqs: SeoFaq[] = post.bodySections
    .filter((s: { type: string; items?: unknown }) => s.type === "faq" && Array.isArray(s.items))
    .flatMap((s: { items: { q: string; a: string }[] }) =>
      s.items.map((item) => ({
        question: item.q,
        answer: stripMarkdown(item.a),
      }))
    );

  return {
    path: `/blog/${post.slug}`,
    title: post.metaTitle,
    description: post.metaDescription,
    canonical: `https://www.aitaxbot.co.in/blog/${post.slug}`,
    h1: post.metaTitle, // matches client/src/pages/BlogPost.tsx, which renders post.metaTitle as both <title> and <h1>
    intro,
    sections,
    faqs,
  };
}

export const BLOG_SEO_CONTENT: SeoPageContent[] = blogPosts
  .filter((p) => p.status === "published")
  .map(blogPostToSeoContent);

/**
 * /find-ca and /ca/register had no entry until 2026-09-25, so both served the
 * generic shell and the homepage's <title> while rendering 1,390 and 422 words
 * respectively in a browser. Titles below are copied verbatim from each page's
 * own <Helmet>, and the copy stays inside what the ICAI Code of Ethics permits
 * a directory to say: factual listing only, no recommendation, no ranking, no
 * advertising of professional services. Those constraints are stated on the
 * pages themselves and must not be softened here to read as marketing.
 */
const FIND_CA_SEO_CONTENT: SeoPageContent = {
  path: "/find-ca",
  title: "Find a CA Near You — AiTaxBot | Free CA Introduction Service",
  description:
    "Search a factual directory of Chartered Accountants in India by city and area of practice, and send an enquiry directly. No referral fee, no ranking, no endorsement.",
  canonical: "https://www.aitaxbot.co.in/find-ca",
  h1: "Find a Chartered Accountant",
  intro:
    "A factual directory of Chartered Accountants in practice in India, searchable by city and by the kind of work they take on — ITR filing, tax planning, salary and capital gains, GST, business and audit support. Every listing shows the member's name, firm, city, ICAI membership number, languages and years in practice, so a taxpayer can verify the member independently on the ICAI register before contacting anyone. " +
    "This is an introduction service and nothing more. AiTaxBot does not rank, rate, recommend or endorse any member, takes no fee or commission for an introduction, and has no arrangement under which any listing is promoted above another. Enquiries go to the member directly; what follows is between the taxpayer and that Chartered Accountant. " +
    "These limits are not editorial preference. The Chartered Accountants Act, 1949 and the ICAI Code of Ethics restrict how a member in practice may be listed or approached — Clause 5 of Part I of the First Schedule prohibits paying for professional business, Clause 6 permits only a response to an enquiry the taxpayer initiated, and Item K prohibits roving circulars and cold outreach. The directory is built to stay inside them.",
  faqs: [
    {
      question: "Does AiTaxBot charge for an introduction?",
      answer: "No. There is no fee, commission or referral payment in either direction. Paying for professional business is prohibited under Clause 5 of Part I of the First Schedule to the Chartered Accountants Act, 1949.",
    },
    {
      question: "Are these CAs recommended or ranked?",
      answer: "No. Listings are factual and are not ordered by any measure of quality. AiTaxBot does not rate, review, rank or endorse any member — doing so would breach the ICAI Code of Ethics. Verify any member's standing yourself on the ICAI register using the membership number shown.",
    },
    {
      question: "How do I know a listed CA is genuine?",
      answer: "Every listing carries an ICAI membership number, which you can check against the ICAI's own member search. Listings are also reviewed before they appear, but the ICAI register is the authority, not us.",
    },
    {
      question: "What happens after I send an enquiry?",
      answer: "Your enquiry goes to that Chartered Accountant directly. AiTaxBot is not a party to the engagement, sets no fees, and receives nothing from it.",
    },
  ],
};

const CA_REGISTER_SEO_CONTENT: SeoPageContent = {
  path: "/ca/register",
  title: "Register as a CA — AiTaxBot | List Your Practice for Free",
  description:
    "Chartered Accountants in practice can list their firm on the AiTaxBot directory free of charge. Factual listing only — no ranking, no advertising, no fee.",
  canonical: "https://www.aitaxbot.co.in/ca/register",
  h1: "Register as a Chartered Accountant",
  intro:
    "Chartered Accountants in practice in India can add their firm to the AiTaxBot directory free of charge. A listing carries your name, firm, city and state, ICAI membership number, areas of practice, languages and years in practice — the factual particulars a taxpayer needs to identify and verify you, and nothing beyond them. " +
    "Registrations are reviewed before they appear, and the membership number is checked against the ICAI register. A listing is not advertising: there is no ranking, no rating, no featured placement and no way to pay for position, because the ICAI Code of Ethics does not permit any of them. Taxpayers reach you only by sending an enquiry they initiated. " +
    "You can edit your own listing later from the CA profile page. Editing is verified by a one-time code sent to the email address on your registration, so only someone with access to that mailbox can change what the directory says about you.",
  faqs: [
    {
      question: "Is listing free?",
      answer: "Yes, and it stays free. There is no listing fee, no subscription and no commission on any work that follows.",
    },
    {
      question: "Can I pay to appear higher in results?",
      answer: "No. There is no paid placement of any kind. Ranking members by anything other than the taxpayer's own search terms would amount to recommendation, which the ICAI Code of Ethics prohibits.",
    },
    {
      question: "Who can register?",
      answer: "Any Chartered Accountant holding a valid ICAI membership and in practice in India. The membership number is verified against the ICAI register before a listing is published.",
    },
    {
      question: "How do I change my listing later?",
      answer: "From the CA profile page. You enter your ICAI membership number and registered email, we send a one-time code to that email address, and the code lets you edit. Changes go back to review before they appear.",
    },
  ],
};

/**
 * The /blog index. Title/description/canonical are copied verbatim from the
 * <Helmet> block in client/src/pages/Blog.tsx, same rule as every hand-written
 * entry above; the link list is GENERATED from blogPosts so a new post appears
 * here the moment it is published, with no second place to remember to edit.
 *
 * Measured 2026-09-19 before this existed: /blog served 50 static words and
 * zero links to any post. Every article on the site was a page a crawler could
 * only reach from the sitemap, never by following a link — and "ongoing
 * curation" is exactly what AdSense says it looks for.
 */
const BLOG_INDEX_SEO_CONTENT: SeoPageContent = {
  path: "/blog",
  title: "Tax & Finance Blog — Expert Guides for Indian Taxpayers | AiTaxBot",
  description:
    "In-depth guides on Indian taxation, ITR filing, tax saving, capital gains, GST, SIP, and the new Income Tax Act 2025. CA-verified articles updated for FY 2026-27 & Tax Year 2026-27.",
  canonical: "https://www.aitaxbot.co.in/blog",
  h1: "Tax & Finance Blog — Expert Guides for Indian Taxpayers",
  intro:
    "Long-form, Chartered-Accountant-reviewed guides to Indian income tax, written for salaried employees, investors and NRIs. Every article covers the Income Tax Act, 1961 as it applies to returns being filed now, and flags where the Income Tax Act, 2025 changes the position from FY 2026-27 onward. Topics span ITR filing and document checklists, old versus new regime comparisons, HRA and Section 80C deductions, capital gains on shares and mutual funds, GST for small businesses, and reading AIS, Form 26AS and Form 16 before you file.",
  faqs: [],
  links: blogPosts
    .filter((p) => p.status === "published")
    .map((p) => ({ href: `/blog/${p.slug}`, label: p.metaTitle })),
};

/**
 * The /tools hub. Same reason as /blog: it had no entry, so it served the
 * generic shell and linked to nothing.
 */
const TOOLS_INDEX_SEO_CONTENT: SeoPageContent = {
  path: "/tools",
  title: "Free Tax Tools — AIS Check, Rent Receipts & Calculators | AiTaxBot",
  description:
    "Free Indian tax tools: reconcile your AIS, Form 26AS and Form 16 before filing, generate HRA rent receipts, and use 9 tax and investment calculators.",
  canonical: "https://www.aitaxbot.co.in/tools",
  h1: "Free Tax Tools for Indian Taxpayers",
  intro:
    "Tools for the parts of filing a return that are mechanical, repetitive and easy to get wrong. The AIS, Form 26AS and Form 16 reconciliation tool reads all three documents together and reports where they disagree. That disagreement is where most notices under Section 143(1) originate: interest a bank reported to the department but the taxpayer never declared, TDS credited in Form 26AS but missing from the return, or a sale of shares captured in the Annual Information Statement and absent from the broker statement. Reading three documents against each other by hand is slow and unreliable; the tool does it in one pass and lists every gap with the amount and the deductor. The rent receipt generator produces receipts in the format employers accept as HRA proof, with the landlord details, the period and the monthly amount laid out as Rule 2A evidence requires. The calculators cover income tax under both the old and new regimes, HRA exemption, provident fund and NPS maturity, SIP and SWP returns, home and vehicle loan EMIs, and short- and long-term capital gains on equity, futures and options, and virtual digital assets. Each one shows the workings rather than only the answer, so the figure can be checked against the section it comes from. All of these are free. Nothing here files a return for you or transmits anything to the Income Tax Department — these are computation and preparation tools, and the filing itself stays with you or your Chartered Accountant.",
  faqs: [
    {
      question: "Are these tools really free?",
      answer: "Yes. Every calculator and tool on AiTaxBot is free to use with no charge, subscription or usage limit. You do need a free account to see a calculated result, which is how we keep your history available on your dashboard.",
    },
    {
      question: "Do you store the AIS, Form 26AS or Form 16 I upload?",
      answer: "No. Documents uploaded to the reconciliation tool are processed to produce your report and are not retained afterwards. You can delete your account and everything held against it at any time from your profile page.",
    },
    {
      question: "Can AiTaxBot file my income tax return for me?",
      answer: "Not currently. These are computation and preparation tools — they work out the figures and flag mismatches before you file, but the return itself is filed by you on the Income Tax Department portal, or by a Chartered Accountant. You can find one through our CA directory.",
    },
    {
      question: "Which financial year do the tools cover?",
      answer: "The calculators cover FY 2025-26 (AY 2026-27) and FY 2026-27 (AY 2027-28), and let you pick between them where the law differs. The reconciliation tool reads the financial year printed on the documents you upload rather than assuming one.",
    },
  ],
  links: [
    { href: "/tools/ais-26as-form16", label: "AIS, Form 26AS and Form 16 Reconciliation" },
    { href: "/tools/rent-receipt", label: "Rent Receipt Generator for HRA" },
    { href: "/calculators/income-tax", label: "Income Tax Calculator" },
    { href: "/calculators/hra", label: "HRA Exemption Calculator" },
    { href: "/calculators/trading-tax", label: "Trading Tax Calculator" },
    { href: "/calculators/sip", label: "SIP Calculator" },
    { href: "/calculators/swp", label: "SWP Calculator" },
    { href: "/calculators/pf", label: "Provident Fund Calculator" },
    { href: "/calculators/nps", label: "NPS Calculator" },
    { href: "/calculators/home-loan", label: "Home Loan EMI Calculator" },
    { href: "/calculators/vehicle-loan", label: "Vehicle Loan EMI Calculator" },
  ],
};

export const SEO_CONTENT_BY_PATH: Record<string, SeoPageContent> = Object.fromEntries(
  [
    ...SEO_CONTENT,
    FIND_CA_SEO_CONTENT,
    CA_REGISTER_SEO_CONTENT,
    BLOG_INDEX_SEO_CONTENT,
    TOOLS_INDEX_SEO_CONTENT,
    ...BLOG_SEO_CONTENT,
  ].map((p) => [p.path, p])
);

/**
 * Site navigation, rendered into every crawler-visible page by
 * server/vite.ts.
 *
 * Mirrors the real footer in client/src/components/Footer.tsx, which renders
 * its links through wouter's <Link> — a client-side component that produces no
 * <a href> until React mounts. Measured 2026-09-19: the static HTML of every
 * page on this site contained zero internal links. Each page was an island,
 * which is the "Navigation Dead-End" failure the AdSense brief in CLAUDE.md
 * calls an automatic rejection.
 *
 * Keep this in step with the footer. It is a deliberate duplicate rather than
 * an import because Footer.tsx is a React component full of icons and layout,
 * and the crawler block needs a plain list of hrefs.
 */
export const SITE_NAV: SeoLink[] = [
  { href: "/", label: "Home" },
  { href: "/calculators", label: "Tax Calculators" },
  { href: "/calculators/income-tax", label: "Income Tax Calculator" },
  { href: "/calculators/hra", label: "HRA Calculator" },
  { href: "/calculators/sip", label: "SIP Calculator" },
  { href: "/calculators/nps", label: "NPS Calculator" },
  { href: "/tools", label: "Tax Tools" },
  { href: "/tools/ais-26as-form16", label: "AIS / 26AS / Form 16 Reconciliation" },
  { href: "/tools/rent-receipt", label: "Rent Receipt Generator" },
  { href: "/blog", label: "Tax Blog" },
  { href: "/nri", label: "NRI Corner" },
  { href: "/find-ca", label: "Find a Chartered Accountant" },
  { href: "/about", label: "About AiTaxBot" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
];
