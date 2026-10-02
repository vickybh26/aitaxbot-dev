// Shared FAQ for React, FAQ schema and initial HTML. Deposit-interest relief
// does not exempt investments merely because their funding account is NRE.
export const NRI_ACCOUNT_FAQS = [
  { question: "Can I hold NRO and NRE accounts together?", answer: "Yes, subject to eligibility and bank requirements. NRO is commonly used for Indian-source receipts; NRE supports eligible remittances and repatriable funds. Ask the bank which credits are permitted for your transaction, rather than assuming that every receipt must use the same account." },
  { question: "What happens to my resident savings account when I move abroad?", answer: "Notify your bank when your FEMA residential status changes and arrange redesignation of the resident account as NRO. Do not assume that a bank will identify the change automatically. FEMA residence and income-tax residence are different tests." },
  { question: "Are mutual-fund returns tax-free if funded through NRE?", answer: "No. The source account does not exempt mutual-fund gains or dividends. Capital-gains rules, holding period, fund category and applicable treaty relief determine tax; withholding can apply on NRI redemptions. Repatriability and income-tax exemption are separate matters." },
  { question: "When is NRE deposit interest exempt?", answer: "Eligible NRE deposit interest is exempt if the account complies with FEMA and the individual is resident outside India under FEMA or has RBI permission to maintain it. Section 10(4)(ii) of the 1961 Act applies to earlier tax years; the exemption continues in Schedule IV of the 2025 Act for tax years beginning on or after 1 April 2026. This does not exempt dividends or capital gains. Section 115E provides special tax rates, not blanket exemption." },
  { question: "What changes when I return to India?", answer: "Tell the bank promptly. A change in FEMA residence can require NRE redesignation or an eligible RFC transfer. Do not assume that income-tax RNOR status alone preserves the NRE interest exemption. Review FCNR separately: its interest exemption has different conditions." },
  { question: "Can NRE and NRO holders use UPI?", answer: "UPI is supported for eligible NRE/NRO accounts, including international numbers through participating banks and apps. Availability depends on your bank, app and supported country code; check NPCI's current lists before relying on access." },
];

export const NRI_ACCOUNT_SOURCES = [
  { href: "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/non%20resident%20-faq", label: "Income Tax Department: NRE exemption and transition to the 2025 Act" },
  { href: "https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/Accountresidents16012025.pdf", label: "RBI: accounts in India by non-residents" },
  { href: "https://www.npci.org.in/product/upi-global-acceptance/upi-for-nris", label: "NPCI: UPI for NRE/NRO account holders" },
];
