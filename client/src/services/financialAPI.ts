import { apiRequest } from "@/lib/queryClient";

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
}

export interface NewsArticle {
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  category?: string;
  sentiment?: string;
  urlToImage?: string;
}

export class FinancialAPIService {
  // Market Indices
  static async getMarketIndices(): Promise<MarketIndex[]> {
    const response = await apiRequest("GET", "/api/market-indices");
    return response.json();
  }

  // Mutual Funds
  static async getMutualFunds(): Promise<MutualFund[]> {
    const response = await apiRequest("GET", "/api/external/mutual-funds");
    return response.json();
  }

  static async getMutualFund(code: string): Promise<any> {
    const response = await apiRequest("GET", `/api/external/mutual-funds/${code}`);
    return response.json();
  }

  // Alpha Vantage API
  static async getAlphaVantageData(func: string, symbol: string, interval?: string): Promise<any> {
    const params = new URLSearchParams({
      function: func,
      symbol,
      ...(interval && { interval })
    });
    
    const response = await apiRequest("GET", `/api/external/alpha-vantage?${params}`);
    return response.json();
  }


  // News API
  static async getMarketNews(category = "business", country = "in"): Promise<{ articles: NewsArticle[] }> {
    const params = new URLSearchParams({
      category,
      country
    });
    
    const response = await apiRequest("GET", `/api/external/news?${params}`);
    return response.json();
  }

  // Indian Stock Market (via Alpha Vantage)
  static async getIndianStockData(symbol: string): Promise<any> {
    // For Indian stocks, append .BSE or .NSE
    const indianSymbol = symbol.includes('.') ? symbol : `${symbol}.BSE`;
    return this.getAlphaVantageData('TIME_SERIES_DAILY', indianSymbol);
  }

  // US Market Data
  static async getUSStockData(symbol: string): Promise<any> {
    return this.getAlphaVantageData('TIME_SERIES_DAILY', symbol);
  }
}
