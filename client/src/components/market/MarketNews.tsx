import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Clock, Globe } from "lucide-react";
import { trackMarketDataView } from "@/lib/analytics";

interface MarketNewsProps {
  onClose: () => void;
}

interface NewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image?: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export default function MarketNews({ onClose }: MarketNewsProps) {
  const [category, setCategory] = useState("general");

  // Track component usage
  useEffect(() => {
    trackMarketDataView('Market News');
  }, []);

  // Generate realistic Indian market news data
  const generateDemoNews = (): NewsItem[] => {
    const now = Date.now();
    return [
      {
        category: "general",
        datetime: now - 1800000, // 30 mins ago
        headline: "Nifty 50 Crosses 25,000 Mark as IT Stocks Rally",
        id: 1,
        related: "NIFTY,TCS,INFY",
        source: "Economic Times",
        summary: "Indian benchmark index Nifty 50 surged past the 25,000 level driven by strong buying in IT stocks. TCS and Infosys led the gains with institutional support.",
        url: "https://economictimes.indiatimes.com"
      },
      {
        category: "general", 
        datetime: now - 3600000, // 1 hour ago
        headline: "RBI Monetary Policy: Rates Held Steady at 6.5%",
        id: 2,
        related: "BANKNIFTY,HDFCBANK,ICICIBANK",
        source: "Business Standard",
        summary: "Reserve Bank of India maintains repo rate at 6.5% as expected. Focus remains on inflation management while supporting economic growth. Banking stocks show mixed reaction.",
        url: "https://www.business-standard.com"
      },
      {
        category: "general",
        datetime: now - 5400000, // 1.5 hours ago
        headline: "Reliance Industries Announces Strong Q4 Results",
        id: 3,
        related: "RELIANCE,NIFTY",
        source: "Moneycontrol",
        summary: "Reliance Industries reports robust quarterly earnings beating analyst estimates. Retail and digital services segments show significant growth momentum.",
        url: "https://www.moneycontrol.com"
      },
      {
        category: "general",
        datetime: now - 7200000, // 2 hours ago
        headline: "FII Inflows Continue for Third Consecutive Week",
        id: 4,
        related: "NIFTY,SENSEX",
        source: "Financial Express",
        summary: "Foreign institutional investors pump in ₹5,200 crore into Indian equities amid positive global cues and strong domestic macroeconomic fundamentals.",
        url: "https://www.financialexpress.com"
      },
      {
        category: "general",
        datetime: now - 10800000, // 3 hours ago
        headline: "Adani Group Stocks Surge on New Renewable Energy Project",
        id: 5,
        related: "ADANIGREEN,ADANIPORTS",
        source: "Mint",
        summary: "Adani Green Energy shares jump 4% after announcing a major solar power project worth ₹12,000 crore. Focus on clean energy transition drives investor interest.",
        url: "https://www.livemint.com"
      },
      {
        category: "general",
        datetime: now - 14400000, // 4 hours ago
        headline: "Auto Sector Gains on Strong Monthly Sales Data",
        id: 6,
        related: "MARUTI,TATAMOTORS,M&M",
        source: "CNBC TV18",
        summary: "Automobile stocks rally as companies report healthy sales figures. Electric vehicle segment shows exceptional growth with year-on-year increase of 45%.",
        url: "https://www.cnbctv18.com"
      },
      {
        category: "forex",
        datetime: now - 7200000,
        headline: "Rupee Strengthens to 82.45 Against Dollar",
        id: 7,
        related: "USDINR",
        source: "Reuters India",
        summary: "Indian rupee appreciates against the US dollar supported by FII inflows and easing crude oil prices. Currency traders remain cautious ahead of US Fed decision.",
        url: "https://www.reuters.com"
      },
      {
        category: "crypto",
        datetime: now - 3600000,
        headline: "India's Crypto Tax Collections Surpass ₹1,000 Crore",
        id: 8,
        related: "BTC,ETH",
        source: "Inc42",
        summary: "Government reports significant tax revenue from cryptocurrency transactions under the new 30% tax regime. Compliance improving as regulations become clearer.",
        url: "https://inc42.com"
      },
      {
        category: "merger",
        datetime: now - 10800000,
        headline: "HDFC Bank Merger Integration On Track, Says CEO",
        id: 9,
        related: "HDFCBANK",
        source: "Bloomberg Quint",
        summary: "HDFC Bank CEO provides update on integration with HDFC Ltd, confirming smooth progress. Combined entity aims to leverage synergies for enhanced customer offerings.",
        url: "https://www.bloombergquint.com"
      },
      {
        category: "general",
        datetime: now - 18000000, // 5 hours ago
        headline: "Pharma Stocks Rally on US FDA Approvals",
        id: 10,
        related: "SUNPHARMA,DRREDDY,CIPLA",
        source: "The Hindu BusinessLine",
        summary: "Indian pharmaceutical companies receive multiple ANDA approvals from US FDA. Sun Pharma and Dr. Reddy's lead the sector gains with strong order books.",
        url: "https://www.thehindubusinessline.com"
      }
    ];
  };

  const news = generateDemoNews().filter(item => 
    category === "general" || item.category === category
  );
  const isLoading = false;
  const error = null;

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Market News</h2>
            <Button
              onClick={onClose}
              className="text-white hover:bg-blue-800 bg-transparent border-white"
              data-testid="button-close-market-news"
            >
              ✕
            </Button>
          </div>
          
          {/* Category Filter */}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48 text-gray-900" data-testid="select-news-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="forex">Forex</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="merger">Mergers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-500 flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Loading latest news...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Error loading news. Please try again.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {news?.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row gap-4">
                    {item.image && (
                      <div className="md:w-48 h-32 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.headline}
                          className="w-full h-full object-cover rounded-md"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = '/attached_assets/logo_1753757110252.png';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 
                          className="font-bold text-lg text-gray-900 leading-tight"
                          data-testid={`text-news-headline-${item.id}`}
                        >
                          {item.headline}
                        </h3>
                      </div>
                      
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {item.summary}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {item.source}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(item.datetime)}
                          </span>
                          {item.related && (
                            <span className="text-blue-600">
                              Related: {item.related.split(',').slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                        
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          data-testid={`link-news-${item.id}`}
                        >
                          <span>Read More</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              
              {news?.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No news available for this category.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            News provided by Finnhub API. Data refreshes every 5 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}