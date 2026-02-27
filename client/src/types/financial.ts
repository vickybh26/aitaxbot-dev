export interface TaxCalculation {
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  incomeTax: number;
  cess: number;
  totalTax: number;
  takeHome: number;
}

export interface SIPCalculation {
  totalInvestment: number;
  totalReturns: number;
  maturityValue: number;
  wealthGain: number;
}

export interface SWPCalculation {
  totalCorpus: number;
  monthlyWithdrawal: number;
  totalWithdrawals: number;
  remainingCorpus: number;
  years: number;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  lastUpdated: Date;
}

export interface MutualFund {
  schemeCode: string;
  schemeName: string;
  nav?: string;
  date?: string;
  category?: string;
}

export interface NewsArticle {
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  urlToImage?: string;
}

export interface IPOData {
  companyName: string;
  issuePrice: string;
  issueSize: string;
  listingDate: string;
  status: 'Open' | 'Upcoming' | 'Listed' | 'Closed';
  gmp?: number;
  subscriptionStatus?: string;
}

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: string;
  high52Week?: number;
  low52Week?: number;
}
