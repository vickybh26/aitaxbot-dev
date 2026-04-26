import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, TrendingDown, Wifi, WifiOff, Settings } from "lucide-react";
import Modal from "@/components/ui/modal";
import { trackMarketDataView } from "@/lib/analytics";

interface StockQuotesProps {
  onClose: () => void;
}

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

export default function StockQuotes({ onClose }: StockQuotesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL', 'AMZN']);
  const [selectedIndianStocks, setSelectedIndianStocks] = useState<string[]>(['NSE_EQ|RELIANCE', 'NSE_EQ|HDFCBANK', 'NSE_EQ|INFY', 'NSE_EQ|TCS']);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [indianQuotes, setIndianQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingIndian, setLoadingIndian] = useState(false);
  const [activeTab, setActiveTab] = useState("us");
  const [dataSource, setDataSource] = useState("Offline Data");
  const [showConfig, setShowConfig] = useState(false);

  // Track component usage
  useEffect(() => {
    trackMarketDataView('Stock Quotes');
  }, []);

  // Fetch US quotes for selected symbols
  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const quotePromises = selectedSymbols.map(async (symbol) => {
        const [quoteData, profileData] = await Promise.all([
          finnhubAPI.getQuote(symbol),
          finnhubAPI.getCompanyProfile(symbol)
        ]);

        return {
          symbol: symbol,
          name: profileData.name || `${symbol} Inc`,
          price: quoteData.c || 0,
          change: quoteData.d || 0,
          changePercent: quoteData.dp || 0,
          high: quoteData.h || 0,
          low: quoteData.l || 0,
          open: quoteData.o || 0,
          previousClose: quoteData.pc || 0
        };
      });

      const quotesData = await Promise.all(quotePromises);
      setQuotes(quotesData);
    } catch (error) {
      console.error('Error fetching US quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Indian stock quotes
  const fetchIndianQuotes = async () => {
    setLoadingIndian(true);
    try {
      // First try our new GitHub library-based API endpoints
      const quotesData = [];
      for (const stockSymbol of selectedIndianStocks) {
        try {
          const symbol = stockSymbol.split('|')[1] || stockSymbol;
          const response = await fetch(`/api/indian-stocks/${symbol}`);
          if (response.ok) {
            const data = await response.json();
            quotesData.push({
              symbol: stockSymbol,
              name: data.companyName,
              ltp: data.currentPrice,
              change: data.change,
              changePercent: data.changePercent,
              high: data.dayHigh,
              low: data.dayLow,
              volume: data.volume,
              marketCap: data.marketCap
            });
          }
        } catch (err) {
          console.error(`Error fetching ${stockSymbol}:`, err);
        }
      }
      
      if (quotesData.length > 0) {
        setIndianQuotes(quotesData);
        setDataSource('GitHub Library (Live)');
      } else {
        // Generate fallback data for demo
        console.log('Using fallback Indian stock data...');
        const fallbackData = selectedIndianStocks.map(stockSymbol => {
          const symbol = stockSymbol.split('|')[1] || stockSymbol;
          return {
            symbol: stockSymbol,
            name: `${symbol} Ltd`,
            ltp: Math.random() * 5000 + 100,
            change: (Math.random() - 0.5) * 100,
            change_percent: (Math.random() - 0.5) * 10,
            high: Math.random() * 5500 + 150,
            low: Math.random() * 4500 + 50,
            open: Math.random() * 5000 + 100,
            close: Math.random() * 5000 + 100,
            volume: Math.floor(Math.random() * 1000000)
          };
        });
        setIndianQuotes(fallbackData);
        setDataSource('Demo Data');
      }
    } catch (error) {
      console.error('Error fetching Indian quotes:', error);
      setDataSource('Offline Data');
    } finally {
      setLoadingIndian(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [selectedSymbols]);

  useEffect(() => {
    fetchIndianQuotes();
  }, [selectedIndianStocks]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      if (activeTab === "us") {
        // Simple search - just add the entered symbol
        const newSymbol = searchQuery.toUpperCase();
        if (!selectedSymbols.includes(newSymbol)) {
          setSelectedSymbols(prev => [...prev, newSymbol]);
        }
        setSearchQuery("");
      } else if (activeTab === "indian") {
        // First try our GitHub library API
        const symbol = searchQuery.toUpperCase();
        try {
          const response = await fetch(`/api/indian-stocks/${symbol}`);
          if (response.ok) {
            const newSymbol = `NSE_FO|${symbol}`;
            if (!selectedIndianStocks.includes(newSymbol)) {
              setSelectedIndianStocks(prev => [...prev, newSymbol]);
            }
            setSearchQuery("");
          } else {
            // Simple search - just add the entered symbol
            const newSymbol = `NSE_EQ|${searchQuery.toUpperCase()}`;
            if (!selectedIndianStocks.includes(newSymbol)) {
              setSelectedIndianStocks(prev => [...prev, newSymbol]);
            }
            setSearchQuery("");
          }
        } catch (error) {
          console.error('Error with API search, using simple add:', error);
          // Simple search - just add the entered symbol
          const newSymbol = `NSE_EQ|${searchQuery.toUpperCase()}`;
          if (!selectedIndianStocks.includes(newSymbol)) {
            setSelectedIndianStocks(prev => [...prev, newSymbol]);
          }
          setSearchQuery("");
        }
      }
    } catch (error) {
      console.error('Error searching symbols:', error);
    }
  };

  const removeSymbol = (symbolToRemove: string) => {
    if (activeTab === "us") {
      setSelectedSymbols(prev => prev.filter(symbol => symbol !== symbolToRemove));
    } else {
      setSelectedIndianStocks(prev => prev.filter(symbol => symbol !== symbolToRemove));
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change: number, changePercent: number, currency: string = 'USD') => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${formatPrice(change, currency)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Live Stock Quotes" size="6xl">
      {/* Data Source Indicator */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-readable-light">
          {dataSource.includes('Live') ? (
            <Wifi className="h-4 w-4 text-success" />
          ) : (
            <WifiOff className="h-4 w-4 text-warning" />
          )}
          <span>Data Source: {dataSource}</span>
        </div>
        <div className="flex items-center gap-2">
          {dataSource.includes('Offline') && (
            <div className="text-xs text-warning bg-warning/10 px-3 py-1 rounded-lg">
              Using fallback data - Configure APIs for live data
            </div>
          )}
          {dataSource.includes('GitHub Library') && (
            <div className="text-xs text-success bg-success/10 px-3 py-1 rounded-lg">
              ✓ Using enhanced GitHub library integration
            </div>
          )}
          <Button
            onClick={() => setShowConfig(!showConfig)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            {showConfig ? 'Hide' : 'Setup'} API
          </Button>
        </div>
      </div>

      {/* Upstox Configuration */}
      {showConfig && (
        <div className="mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">API Configuration</h3>
            <p className="text-sm text-gray-600">
              External API integrations have been removed. The application now uses demo data for stock quotes.
              For live data, please contact support for enterprise integration options.
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="us">US Stocks</TabsTrigger>
          <TabsTrigger value="indian">Indian Stocks</TabsTrigger>
        </TabsList>

        <TabsContent value="us" className="space-y-4">
          {/* US Search Bar */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search US stocks (e.g., AAPL, TSLA)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
              data-testid="input-stock-search"
            />
            <Button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-search-stock"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* US Stocks Display */}
          <div className="overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span>Loading US stock data...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quotes.map((quote) => (
                  <Card key={quote.symbol} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{quote.symbol}</h3>
                        <p className="text-sm text-gray-600 truncate">{quote.name}</p>
                      </div>
                      <Button
                        onClick={() => removeSymbol(quote.symbol)}
                        className="text-red-500 hover:bg-red-50 bg-transparent p-1 h-auto"
                        data-testid={`button-remove-${quote.symbol.toLowerCase()}`}
                      >
                        ✕
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(quote.price)}
                        </span>
                        <div className={`flex items-center gap-1 ${
                          quote.change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {quote.change >= 0 ? 
                            <TrendingUp className="w-4 h-4" /> : 
                            <TrendingDown className="w-4 h-4" />
                          }
                          <span className="font-semibold">
                            {formatChange(quote.change, quote.changePercent)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Open:</span>
                          <span className="font-medium text-gray-900">{formatPrice(quote.open)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Prev Close:</span>
                          <span className="font-medium text-gray-900">{formatPrice(quote.previousClose)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">High:</span>
                          <span className="font-medium text-gray-900">{formatPrice(quote.high)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Low:</span>
                          <span className="font-medium text-gray-900">{formatPrice(quote.low)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {quotes.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-gray-500">No US stock quotes available. Search for stocks to add them.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="indian" className="space-y-4">
          {/* Indian Search Bar */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search Indian stocks (e.g., RELIANCE, HDFC)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
              data-testid="input-indian-stock-search"
            />
            <Button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-search-indian-stock"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Indian Stocks Display */}
          <div className="overflow-y-auto max-h-[60vh]">
            {loadingIndian ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span>Loading Indian stock data...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {indianQuotes.map((quote, index) => (
                  <Card key={quote.symbol || index} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {quote.symbol?.split('|')[1] || quote.symbol}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">{quote.name}</p>
                      </div>
                      <Button
                        onClick={() => removeSymbol(quote.symbol)}
                        className="text-red-500 hover:bg-red-50 bg-transparent p-1 h-auto"
                        data-testid={`button-remove-${quote.symbol?.split('|')[1]?.toLowerCase()}`}
                      >
                        ✕
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(quote.ltp, 'INR')}
                        </span>
                        <div className={`flex items-center gap-1 ${
                          quote.change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {quote.change >= 0 ? 
                            <TrendingUp className="w-4 h-4" /> : 
                            <TrendingDown className="w-4 h-4" />
                          }
                          <span className="font-semibold">
                            {formatChange(quote.change, quote.change_percent, 'INR')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Open:</span>
                          <span className="font-medium text-gray-900">{formatPrice(quote.open, 'INR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Close:</span>
                          <span className="font-medium text-gray-900">{formatPrice(quote.close, 'INR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">High:</span>
                          <span className="font-medium text-gray-900">{formatPrice(quote.high, 'INR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Low:</span>
                          <span className="font-medium text-gray-900">{formatPrice(quote.low, 'INR')}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {indianQuotes.length === 0 && !loadingIndian && (
              <div className="text-center py-8">
                <p className="text-gray-500">No Indian stock quotes available. Search for stocks to add them.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Modal>
  );
}