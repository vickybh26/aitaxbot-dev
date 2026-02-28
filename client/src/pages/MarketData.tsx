import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Activity, Search, RefreshCw, Newspaper, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoImage from '@assets/AiTaxBot (160 x 100 px)_20250829_084838_0000_1756437526751.png';
import { ResponsiveAd, LeaderboardAd } from "@/components/AdBanner";
import { trackPageView } from "@/lib/analytics";

interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

interface Stock {
  symbol: string;
  companyName: string;
  currentPrice?: number;
  lastPrice?: number;
  change: number;
  changePercent?: number;
  pChange?: number;
  volume?: number;
  timestamp?: string;
}

interface StockDetailData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  timestamp: string;
}

interface NewsItem {
  title: string;
  link: string;
  source: string;
  date: string;
  snippet?: string;
  thumbnail?: string;
}

// Raw API response type (flat structure from /api/metal-prices)
interface MetalPricesResponse {
  gold24k: number;
  gold22k: number;
  silver: number;
  currency: string;
  lastUpdated: string;
  source: string;
}

interface CommodityData {
  gold: {
    "24K": {
      perGram: number;
      per10Gram: number;
      change: number;
      changePercent: number;
    };
    "22K": {
      perGram: number;
      per10Gram: number;
      change: number;
      changePercent: number;
    };
    "18K": {
      perGram: number;
      per10Gram: number;
      change: number;
      changePercent: number;
    };
  };
  silver: {
    perGram: number;
    perKg: number;
    change: number;
    changePercent: number;
  };
  platinum?: {
    perGram: number;
    per10Gram: number;
    change: number;
    changePercent: number;
  } | null;
  lastUpdated: string;
  source: string;
}

// Transform flat API response to nested CommodityData structure
function transformMetalPrices(data: MetalPricesResponse): CommodityData {
  const gold24kPerGram = data.gold24k || 7850;
  const gold22kPerGram = data.gold22k || 7200;
  const gold18kPerGram = Math.round(gold24kPerGram * 0.75); // 18K is 75% of 24K
  const silverPerGram = data.silver || 95;
  
  return {
    gold: {
      "24K": {
        perGram: gold24kPerGram,
        per10Gram: gold24kPerGram * 10,
        change: 0,
        changePercent: 0,
      },
      "22K": {
        perGram: gold22kPerGram,
        per10Gram: gold22kPerGram * 10,
        change: 0,
        changePercent: 0,
      },
      "18K": {
        perGram: gold18kPerGram,
        per10Gram: gold18kPerGram * 10,
        change: 0,
        changePercent: 0,
      },
    },
    silver: {
      perGram: silverPerGram,
      perKg: silverPerGram * 1000,
      change: 0,
      changePercent: 0,
    },
    lastUpdated: data.lastUpdated || new Date().toISOString(),
    source: data.source || "GoldAPI.io",
  };
}

export default function MarketData() {
  const [searchSymbol, setSearchSymbol] = useState('');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  useEffect(() => {
    trackPageView('/market-data', 'Market Data - AiTaxBot');
  }, []);

  // Market Indices Query
  const { 
    data: indices, 
    isLoading: indicesLoading, 
    refetch: refetchIndices 
  } = useQuery<MarketIndex[]>({
    queryKey: ['/api/market-indices'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Top Gainers Query
  const { 
    data: gainersData, 
    isLoading: gainersLoading 
  } = useQuery<{ gainers: Stock[] }>({
    queryKey: ['/api/nse/gainers'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Top Losers Query
  const { 
    data: losersData, 
    isLoading: losersLoading 
  } = useQuery<{ losers: Stock[] }>({
    queryKey: ['/api/nse/losers'],
    refetchInterval: 60000,
  });

  // Top Stocks Query
  const { 
    data: topStocksData, 
    isLoading: topStocksLoading 
  } = useQuery<{ stocks: Stock[] }>({
    queryKey: ['/api/top-indian-stocks'],
    refetchInterval: 60000,
  });

  // Market Status Query
  const { 
    data: marketStatus, 
    isLoading: statusLoading 
  } = useQuery<boolean>({
    queryKey: ['/api/market-status'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Individual Stock Query
  const { 
    data: stockDetail, 
    isLoading: stockDetailLoading,
    refetch: refetchStockDetail 
  } = useQuery<StockDetailData>({
    queryKey: ['/api/indian-stocks', selectedStock],
    enabled: !!selectedStock,
  });

  // Market News Query - with visibility-based refetch
  const { 
    data: marketNewsData, 
    isLoading: newsLoading,
    refetch: refetchNews 
  } = useQuery<{ news: NewsItem[] }>({
    queryKey: ['/api/market-news'],
    refetchInterval: (query) => {
      // Only refetch every 2 hours when tab is visible
      return document.visibilityState === 'visible' ? 7200000 : false;
    },
    refetchOnWindowFocus: false, // Prevent refetch on every focus to save API quota
  });

  // Tax News Query - with visibility-based refetch
  const { 
    data: taxNewsData, 
    isLoading: taxNewsLoading 
  } = useQuery<{ news: NewsItem[] }>({
    queryKey: ['/api/tax-news'],
    refetchInterval: (query) => {
      // Only refetch every 4 hours when tab is visible
      return document.visibilityState === 'visible' ? 14400000 : false;
    },
    refetchOnWindowFocus: false, // Prevent refetch on every focus to save API quota
  });

  // Commodities Query (Gold, Silver) - with visibility-based refetch
  const { 
    data: commoditiesData, 
    isLoading: commoditiesLoading,
    refetch: refetchCommodities 
  } = useQuery<MetalPricesResponse, Error, CommodityData>({
    queryKey: ['/api/metal-prices'],
    refetchInterval: () => {
      // Only refetch every 8 hours when tab is visible
      return document.visibilityState === 'visible' ? 28800000 : false;
    },
    refetchOnWindowFocus: false, // Prevent refetch on every focus to save API quota
    select: transformMetalPrices,
  });

  const handleStockSearch = () => {
    if (searchSymbol.trim()) {
      setSelectedStock(searchSymbol.toUpperCase());
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Stock Market Data India - Live NSE, BSE, Nifty Prices</title>
        <meta name="description" content="Real-time Indian stock data, NSE BSE indices, Nifty 50, top gainers/losers, gold/silver rates, market news. Track stocks & commodities." />
        <meta name="keywords" content="stock market India, NSE live, BSE prices, Nifty 50, Sensex, market data, gold rates, silver prices, top gainers, stock analysis" />
        <link rel="canonical" href="https://aitaxbot.co.in/market-data" />
        
        <meta property="og:title" content="Live Indian Stock Market Data - NSE, BSE, Nifty" />
        <meta property="og:description" content="Track real-time stock prices, market indices, commodities, and get the latest financial news for Indian markets." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitaxbot.co.in/market-data" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <img 
              src={logoImage} 
              alt="AiTaxBot Logo" 
              className="h-12 w-auto"
              data-testid="logo-market-data"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Indian Stock Market Data & Real-Time NSE BSE Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Real-time NSE & BSE market data and analysis
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              refetchIndices();
              refetchNews();
              refetchCommodities();
              if (selectedStock) refetchStockDetail();
            }}
            variant="outline"
            size="sm"
            data-testid="button-refresh-data"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Comprehensive Indian Stock Market Analytics Platform</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Access real-time stock market data from India's premier exchanges - National Stock Exchange (NSE) and Bombay Stock Exchange (BSE). 
            Our market data platform provides instant updates on major indices including Nifty 50, Sensex, Bank Nifty, and Nifty IT, helping you 
            stay informed about market trends and movements throughout the trading session.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Track top gainers and losers across Indian equity markets with detailed price movements, percentage changes, and trading volumes. 
            The platform aggregates data from multiple sources to provide accurate, up-to-date information on stock performance, enabling informed 
            investment decisions. Search for individual stocks to view comprehensive details including current price, day high/low, market capitalization, 
            and historical performance metrics.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Stay updated with the latest financial news and tax updates affecting Indian markets. Our integrated news feed curates relevant market 
            developments, regulatory changes, and tax law updates that impact investors and traders. Whether you're tracking blue-chip stocks, 
            mid-cap opportunities, or monitoring sectoral indices, our platform provides the data and insights needed for successful market participation 
            and tax-efficient investing strategies.
          </p>
        </div>

        {/* Market Status */}
        {marketStatus && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Market Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" data-testid="badge-market-status">
                  Markets Open
                </Badge>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="indices" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-6">
            <TabsTrigger value="indices" data-testid="tab-indices" className="flex-shrink-0">Market Indices</TabsTrigger>
            <TabsTrigger value="commodities" data-testid="tab-commodities" className="flex-shrink-0">Commodities</TabsTrigger>
            <TabsTrigger value="gainers" data-testid="tab-gainers" className="flex-shrink-0">Top Gainers</TabsTrigger>
            <TabsTrigger value="losers" data-testid="tab-losers" className="flex-shrink-0">Top Losers</TabsTrigger>
            <TabsTrigger value="news" data-testid="tab-news" className="flex-shrink-0">Market News</TabsTrigger>
            <TabsTrigger value="search" data-testid="tab-search" className="flex-shrink-0">Stock Search</TabsTrigger>
          </TabsList>
        </div>

        {/* Market Indices Tab */}
        <TabsContent value="indices">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {indicesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              indices?.map((index) => (
                <Card key={index.symbol} data-testid={`card-index-${index.symbol}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{index.name}</CardTitle>
                    <CardDescription>{index.symbol}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold" data-testid={`text-value-${index.symbol}`}>
                        {formatNumber(index.value)}
                      </div>
                      <div className={cn("flex items-center gap-1 text-sm", getChangeColor(index.change))}>
                        {getChangeIcon(index.change)}
                        <span data-testid={`text-change-${index.symbol}`}>
                          {index.change > 0 ? '+' : ''}{formatNumber(index.change)}{' '}
                          {`(${index.changePercent > 0 ? '+' : ''}${index.changePercent.toFixed(2)}%)`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Ad after Indices */}
          <div className="mt-8 flex justify-center">
            <ResponsiveAd />
          </div>
        </TabsContent>

        {/* Commodities Tab */}
        <TabsContent value="commodities">
          <div className="space-y-6">
            {/* Gold Rates Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  Gold Rates (India)
                </CardTitle>
                <CardDescription>Live gold prices from MCX/IBJA</CardDescription>
              </CardHeader>
              <CardContent>
                {commoditiesLoading ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* 24K Gold */}
                    <div className="p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-800" data-testid="card-gold-24k">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">24K Gold</div>
                      <div className="text-2xl font-bold mb-1" data-testid="text-gold-24k-price">
                        ₹{formatNumber(commoditiesData?.gold?.["24K"]?.per10Gram ?? 0)} / 10g
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ₹{commoditiesData?.gold?.["24K"]?.perGram?.toFixed(2) ?? "0.00"} / gram
                      </div>
                      {(commoditiesData?.gold?.["24K"]?.changePercent ?? 0) !== 0 && (
                        <div className={cn("flex items-center gap-1 text-sm mt-2", getChangeColor(commoditiesData?.gold?.["24K"]?.change ?? 0))}>
                          {getChangeIcon(commoditiesData?.gold?.["24K"]?.change ?? 0)}
                          <span>
                            {`${(commoditiesData?.gold?.["24K"]?.changePercent ?? 0) > 0 ? '+' : ''}${(commoditiesData?.gold?.["24K"]?.changePercent ?? 0).toFixed(2)}%`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 22K Gold */}
                    <div className="p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-800" data-testid="card-gold-22k">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">22K Gold</div>
                      <div className="text-2xl font-bold mb-1" data-testid="text-gold-22k-price">
                        ₹{formatNumber(commoditiesData?.gold?.["22K"]?.per10Gram ?? 0)} / 10g
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ₹{commoditiesData?.gold?.["22K"]?.perGram?.toFixed(2) ?? "0.00"} / gram
                      </div>
                      {(commoditiesData?.gold?.["22K"]?.changePercent ?? 0) !== 0 && (
                        <div className={cn("flex items-center gap-1 text-sm mt-2", getChangeColor(commoditiesData?.gold?.["22K"]?.change ?? 0))}>
                          {getChangeIcon(commoditiesData?.gold?.["22K"]?.change ?? 0)}
                          <span>
                            {`${(commoditiesData?.gold?.["22K"]?.changePercent ?? 0) > 0 ? '+' : ''}${(commoditiesData?.gold?.["22K"]?.changePercent ?? 0).toFixed(2)}%`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 18K Gold */}
                    <div className="p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-800" data-testid="card-gold-18k">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">18K Gold</div>
                      <div className="text-2xl font-bold mb-1" data-testid="text-gold-18k-price">
                        ₹{formatNumber(commoditiesData?.gold?.["18K"]?.per10Gram ?? 0)} / 10g
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ₹{commoditiesData?.gold?.["18K"]?.perGram?.toFixed(2) ?? "0.00"} / gram
                      </div>
                      {(commoditiesData?.gold?.["18K"]?.changePercent ?? 0) !== 0 && (
                        <div className={cn("flex items-center gap-1 text-sm mt-2", getChangeColor(commoditiesData?.gold?.["18K"]?.change ?? 0))}>
                          {getChangeIcon(commoditiesData?.gold?.["18K"]?.change ?? 0)}
                          <span>
                            {`${(commoditiesData?.gold?.["18K"]?.changePercent ?? 0) > 0 ? '+' : ''}${(commoditiesData?.gold?.["18K"]?.changePercent ?? 0).toFixed(2)}%`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Silver & Platinum Rates Section */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Silver */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    Silver Rates (India)
                  </CardTitle>
                  <CardDescription>Live silver prices from MCX</CardDescription>
                </CardHeader>
                <CardContent>
                  {commoditiesLoading ? (
                    <div className="space-y-3">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="space-y-3" data-testid="card-silver">
                      <div>
                        <div className="text-2xl font-bold" data-testid="text-silver-kg-price">
                          ₹{formatNumber(commoditiesData?.silver?.perKg ?? 0)} / kg
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          ₹{commoditiesData?.silver?.perGram?.toFixed(2) ?? "0.00"} / gram
                        </div>
                      </div>
                      {(commoditiesData?.silver?.changePercent ?? 0) !== 0 && (
                        <div className={cn("flex items-center gap-1 text-sm", getChangeColor(commoditiesData?.silver?.change ?? 0))}>
                          {getChangeIcon(commoditiesData?.silver?.change ?? 0)}
                          <span>
                            {`${(commoditiesData?.silver?.changePercent ?? 0) > 0 ? '+' : ''}${(commoditiesData?.silver?.changePercent ?? 0).toFixed(2)}%`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Platinum */}
              {commoditiesData?.platinum && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-gray-600" />
                      Platinum Rates (India)
                    </CardTitle>
                    <CardDescription>Live platinum prices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {commoditiesLoading ? (
                      <div className="space-y-3">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="space-y-3" data-testid="card-platinum">
                        <div>
                          <div className="text-2xl font-bold" data-testid="text-platinum-price">
                            ₹{formatNumber(commoditiesData?.platinum?.per10Gram || 0)} / 10g
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            ₹{commoditiesData?.platinum?.perGram?.toFixed(2) ?? "0.00"} / gram
                          </div>
                        </div>
                        {(commoditiesData?.platinum?.changePercent ?? 0) !== 0 && (
                          <div className={cn("flex items-center gap-1 text-sm", getChangeColor(commoditiesData?.platinum?.change ?? 0))}>
                            {getChangeIcon(commoditiesData?.platinum?.change ?? 0)}
                            <span>
                              {`${(commoditiesData?.platinum?.changePercent ?? 0) > 0 ? '+' : ''}${(commoditiesData?.platinum?.changePercent ?? 0).toFixed(2)}%`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Data Source Info */}
            {commoditiesData && (
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                <Clock className="inline h-4 w-4 mr-1" />
                Last updated: {new Date(commoditiesData.lastUpdated).toLocaleString()} | Source: {commoditiesData.source}
              </div>
            )}
          </div>

          {/* Ad after Commodities */}
          <div className="mt-8 flex justify-center">
            <ResponsiveAd />
          </div>
        </TabsContent>

        {/* Top Gainers Tab */}
        <TabsContent value="gainers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top Gainers
              </CardTitle>
              <CardDescription>Stocks with highest gains today</CardDescription>
            </CardHeader>
            <CardContent>
              {gainersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded animate-pulse">
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {gainersData?.gainers?.slice(0, 10).map((stock, index) => (
                    <div key={stock.symbol} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-gainer-${index}`}>
                      <div>
                        <div className="font-medium" data-testid={`text-symbol-${stock.symbol}`}>{stock.symbol}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {stock.companyName || `${stock.symbol} Limited`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium" data-testid={`text-price-${stock.symbol}`}>
                          {formatCurrency(stock.currentPrice || stock.lastPrice || 0)}
                        </div>
                        <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {`+${(stock.changePercent || stock.pChange || 0).toFixed(2)}%`}
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No gainers data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Losers Tab */}
        <TabsContent value="losers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Top Losers
              </CardTitle>
              <CardDescription>Stocks with highest losses today</CardDescription>
            </CardHeader>
            <CardContent>
              {losersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded animate-pulse">
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {losersData?.losers?.slice(0, 10).map((stock, index) => (
                    <div key={stock.symbol} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-loser-${index}`}>
                      <div>
                        <div className="font-medium" data-testid={`text-symbol-${stock.symbol}`}>{stock.symbol}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {stock.companyName || `${stock.symbol} Limited`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium" data-testid={`text-price-${stock.symbol}`}>
                          {formatCurrency(stock.currentPrice || stock.lastPrice || 0)}
                        </div>
                        <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {`${(stock.changePercent || stock.pChange || 0).toFixed(2)}%`}
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No losers data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market News Tab */}
        <TabsContent value="news">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {/* Market News Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-blue-600" />
                  Market News & Updates
                </CardTitle>
                <CardDescription>Latest financial and market news</CardDescription>
              </CardHeader>
              <CardContent>
                {newsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse border-b pb-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {marketNewsData?.news?.slice(0, 5).map((item, index) => (
                      <div key={index} className="border-b pb-4 last:border-b-0" data-testid={`news-item-${index}`}>
                        <h4 className="font-medium text-sm mb-1 leading-tight">
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-start gap-1"
                            data-testid={`news-link-${index}`}
                          >
                            <span className="line-clamp-2">{item.title}</span>
                            <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          </a>
                        </h4>
                        {item.snippet && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {item.snippet}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                          <span className="font-medium">{item.source}</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{item.date}</span>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No market news available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tax News Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Tax News & Updates
                </CardTitle>
                <CardDescription>Latest tax law changes and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {taxNewsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse border-b pb-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {taxNewsData?.news?.slice(0, 5).map((item, index) => (
                      <div key={index} className="border-b pb-4 last:border-b-0" data-testid={`tax-news-item-${index}`}>
                        <h4 className="font-medium text-sm mb-1 leading-tight">
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 flex items-start gap-1"
                            data-testid={`tax-news-link-${index}`}
                          >
                            <span className="line-clamp-2">{item.title}</span>
                            <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          </a>
                        </h4>
                        {item.snippet && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {item.snippet}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                          <span className="font-medium">{item.source}</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{item.date}</span>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No tax news available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Search Tab */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Stock Search
              </CardTitle>
              <CardDescription>
                Search for individual stock information (e.g., RELIANCE, TCS, INFY)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter stock symbol (e.g., RELIANCE)"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleStockSearch()}
                  data-testid="input-stock-search"
                />
                <Button onClick={handleStockSearch} data-testid="button-search-stock">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {stockDetailLoading && (
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {stockDetail && !stockDetailLoading && (
                <Card data-testid="card-stock-detail">
                  <CardHeader>
                    <CardTitle>{stockDetail.companyName}</CardTitle>
                    <CardDescription>{stockDetail.symbol}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Price</label>
                          <div className="text-2xl font-bold" data-testid="text-current-price">
                            {formatCurrency(stockDetail.currentPrice)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Change</label>
                          <div className={cn("text-lg font-medium flex items-center gap-1", getChangeColor(stockDetail.change))}>
                            {getChangeIcon(stockDetail.change)}
                            <span data-testid="text-stock-change">
                              {stockDetail.change > 0 ? '+' : ''}{formatCurrency(stockDetail.change)}{' '}
                              {`(${stockDetail.changePercent > 0 ? '+' : ''}${stockDetail.changePercent.toFixed(2)}%)`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="text-gray-600 dark:text-gray-400">Day High</label>
                            <div className="font-medium" data-testid="text-day-high">{formatCurrency(stockDetail.dayHigh)}</div>
                          </div>
                          <div>
                            <label className="text-gray-600 dark:text-gray-400">Day Low</label>
                            <div className="font-medium" data-testid="text-day-low">{formatCurrency(stockDetail.dayLow)}</div>
                          </div>
                          <div>
                            <label className="text-gray-600 dark:text-gray-400">Volume</label>
                            <div className="font-medium" data-testid="text-volume">{formatNumber(stockDetail.volume)}</div>
                          </div>
                          <div>
                            <label className="text-gray-600 dark:text-gray-400">Market Cap</label>
                            <div className="font-medium" data-testid="text-market-cap">
                              ₹{(stockDetail.marketCap / 10000000).toFixed(0)}Cr
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ad at Bottom of Page */}
      <div className="mt-8 flex justify-center">
        <LeaderboardAd />
      </div>
    </div>
    </>
  );
}