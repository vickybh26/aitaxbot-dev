// One source for the browser FAQ and initial-HTML FAQ. Rates are not applied
// by the corpus calculator: it models cash flows, not a taxpayer's capital gains.
export const SWP_FAQS = [
  {
    question: "What is a Systematic Withdrawal Plan?",
    answer: "An SWP redeems mutual-fund units periodically to provide cash. A withdrawal may include both invested capital and a gain or loss; it is not the same as interest income. Remaining units stay invested, but their value can fall. A fixed withdrawal instruction does not guarantee investment returns or that the corpus will last throughout retirement.",
  },
  {
    question: "How are equity-fund SWP gains taxed?",
    answer: "For qualifying equity-oriented fund redemptions on or after 23 July 2024, gains on units held for more than 12 months are taxed at 12.5% above the aggregate annual ₹1,25,000 threshold, subject to the statutory conditions including STT. The threshold is shared across qualifying gains, not renewed for each withdrawal or fund. Applicable surcharge and cess are additional. Section 112A of the 1961 Act governs earlier tax years; check the corresponding provisions under the 2025 Act for tax years beginning on or after 1 April 2026.",
  },
  {
    question: "Do all debt funds receive indexation?",
    answer: "No. Fund classification, purchase date and redemption date matter. Gains on specified mutual-fund units acquired on or after 1 April 2023 can be treated as short-term regardless of holding period and taxed at applicable rates. Do not assume that holding any debt fund for three years gives indexation. Obtain the fund's capital-gains statement and check the rules for that particular tax year before calculating tax.",
  },
  {
    question: "How does SWP compare with an FD?",
    answer: "Compare like-for-like cash flows and risks. For illustration, ₹1 crore at an assumed 7% FD rate produces ₹7,00,000 annual interest; at an assumed 30% tax rate that leaves ₹4,90,000 before cess and surcharge. An SWP withdrawal can include a return of principal, so the same cash received is not the same investment income. Its tax depends on the actual gains and holding period, not the assumed return on the whole corpus.",
  },
  {
    question: "Is a 4% withdrawal rate guaranteed to be safe?",
    answer: "No withdrawal rate is guaranteed. Four per cent of ₹1 crore is ₹4,00,000 a year, or about ₹33,333 a month. ₹40,000 a month is a 4.8% annual withdrawal rate. Inflation, market losses, fees, tax and the order of returns affect sustainability. Stress-test lower returns and higher withdrawals; a constant-return projection is a scenario, not a forecast.",
  },
  {
    question: "What does this calculator actually calculate?",
    answer: "The calculator applies your chosen annual return divided by 12 each month, then subtracts the monthly withdrawal. With inflation adjustment enabled, withdrawals increase once every 12 months. The simulation is capped at 600 months. It does not model actual NAV movements, capital-gains tax, exit loads or fees. A positive balance at the end of the simulation is not a lifetime guarantee. Use the results to compare assumptions, not as a personalised investment recommendation.",
  },
];

export const SWP_SOURCES = [
  { href: "https://www.incometaxindia.gov.in/en/sale-of-shares", label: "Income Tax Department: qualifying equity capital gains" },
  { href: "https://www.amfiindia.com/investor/knowledge-center-info?zoneName=TaxRegimeForMutualFunds", label: "AMFI: mutual-fund taxation and purchase-date conditions" },
];
