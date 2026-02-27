import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, TrendingUp, Building2 } from "lucide-react";
import mutualFundAPI from "@/lib/mutual-fund-api";
import { trackMarketDataView } from "@/lib/analytics";

interface MutualFundsProps {
  onClose: () => void;
}

interface MutualFund {
  scheme_code: string;
  scheme_name: string;
  nav?: string;
  date?: string;
  scheme_type?: string;
  fund_house?: string;
  change?: string;
  change_percent?: string;
  aum?: string;
  expense_ratio?: string;
}

export default function MutualFunds({ onClose }: MutualFundsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");

  // Track component usage
  useEffect(() => {
    trackMarketDataView('Mutual Funds');
  }, []);

  const { data: mutualFunds, isLoading, error } = useQuery<MutualFund[]>({
    queryKey: ["mutual-funds", searchTerm],
    queryFn: async () => {
      return searchTerm ? await mutualFundAPI.searchMutualFunds(searchTerm) : await mutualFundAPI.getAllMutualFunds();
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const filteredFunds = mutualFunds?.filter(fund => {
    const matchesCategory = !category || category === "all" || 
      fund.scheme_type?.toLowerCase().includes(category.toLowerCase());
    return matchesCategory;
  }).slice(0, 50); // Show more results with real data

  const handleSearch = () => {
    // Search is already reactive through filtering
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Mutual Funds Tracker" size="6xl">

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search mutual funds..."
            data-testid="input-fund-search"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48" data-testid="select-fund-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="equity">Equity</SelectItem>
            <SelectItem value="debt">Debt</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="elss">ELSS</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          onClick={handleSearch} 
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-search-funds"
        >
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
      
      {/* Mutual Funds List */}
      <div className="space-y-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {isLoading && (
          <div className="text-center py-8">
            <img 
              src="/attached_assets/logo_1753757110252.png" 
              alt="AiTaxBot Logo" 
              className="h-8 w-auto mx-auto mb-4 opacity-50"
            />
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading mutual funds data...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8">
            <p className="text-red-600">Error loading mutual funds data</p>
          </div>
        )}
        
        {filteredFunds?.map((fund, index) => (
          <Card key={fund.scheme_code || index} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900" data-testid={`text-fund-name-${index}`}>
                  {fund.scheme_name}
                </h3>
                <p className="text-sm text-gray-600">
                  <Building2 className="inline w-4 h-4 mr-1" />
                  {fund.fund_house || 'N/A'} • {fund.scheme_code}
                </p>
                {fund.scheme_type && (
                  <p className="text-xs text-blue-600 mt-1">{fund.scheme_type}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900" data-testid={`text-fund-nav-${index}`}>
                  {fund.nav ? `₹${fund.nav}` : 'Loading...'}
                </div>
                <div className="text-sm text-gray-500">
                  {fund.date || 'Latest NAV'}
                </div>
              </div>
            </div>
            {/* Enhanced fund data display */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {fund.change && (
                <div>
                  <span className="text-gray-600">Change:</span>
                  <span className={`font-semibold ml-1 ${parseFloat(fund.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{fund.change}
                  </span>
                </div>
              )}
              {fund.change_percent && (
                <div>
                  <span className="text-gray-600">Change %:</span>
                  <span className={`font-semibold ml-1 ${parseFloat(fund.change_percent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {`${fund.change_percent}%`}
                  </span>
                </div>
              )}
              {fund.aum && (
                <div>
                  <span className="text-gray-600">AUM:</span>
                  <span className="font-semibold text-blue-600 ml-1">{fund.aum}</span>
                </div>
              )}
              {fund.expense_ratio && (
                <div>
                  <span className="text-gray-600">Expense:</span>
                  <span className="font-semibold text-purple-600 ml-1">{fund.expense_ratio}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
        
        {filteredFunds && filteredFunds.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <img 
              src="/attached_assets/logo_1753757110252.png" 
              alt="AiTaxBot Logo" 
              className="h-8 w-auto mx-auto mb-4 opacity-30"
            />
            <p className="text-gray-600">No mutual funds found matching your criteria</p>
          </div>
        )}
      </div>
      
      {/* API Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-sm text-blue-800">
            📊 Data powered by Indian Mutual Fund API (mfapi.in) - Real-time NAV updates
          </span>
        </div>
      </div>
    </Modal>
  );
}
