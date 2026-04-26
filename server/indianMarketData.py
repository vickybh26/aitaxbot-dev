#!/usr/bin/env python3
"""
Indian Stock Market Data Fetcher
Implements methods from the Medium article for fetching Indian stock market data
"""

import yfinance as yf
import pandas as pd
import datetime
from dateutil.relativedelta import relativedelta
import json
import sys
from typing import Dict, Any, Optional

try:
    import jugaad_data as jd
    from jugaad_data.nse import NSELive, stock_df, index_raw
    JUGAAD_AVAILABLE = True
except ImportError:
    JUGAAD_AVAILABLE = False

try:
    from nselib import capital_market
    NSELIB_AVAILABLE = True
except ImportError:
    NSELIB_AVAILABLE = False

class IndianMarketDataFetcher:
    def __init__(self):
        self.nse_live: Optional[NSELive] = NSELive() if JUGAAD_AVAILABLE else None
    
    def get_live_index_data(self, index_name: str = "NIFTY 50") -> Dict[str, Any]:
        """
        Fetch live index data using jugaad_data library
        """
        if not JUGAAD_AVAILABLE or self.nse_live is None:
            return {"error": "jugaad_data library not available"}
        
        try:
            data = self.nse_live.live_index(index_name)
            if not data or not isinstance(data, dict):
                return {"error": "No data received from NSE"}
            
            index_data = data.get('data', [])
            first_item = index_data[0] if index_data else {}
            
            return {
                "name": data.get('name'),
                "timestamp": data.get('timestamp'),
                "last_price": first_item.get('lastPrice'),
                "change": first_item.get('change'),
                "percent_change": first_item.get('pChange')
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_live_stock_price(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch live stock price using jugaad_data library
        NSE symbols like: INFY, TATAMOTORS, RELIANCE, etc.
        """
        if not JUGAAD_AVAILABLE or self.nse_live is None:
            return {"error": "jugaad_data library not available"}
        
        try:
            data = self.nse_live.stock_quote(symbol)
            if not data or not isinstance(data, dict):
                return {"error": f"No data received for symbol {symbol}"}
                
            price_info = data.get('priceInfo', {})
            return {
                "symbol": symbol,
                "last_price": price_info.get('lastPrice'),
                "change": price_info.get('change'),
                "percent_change": price_info.get('pChange'),
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_historical_stock_data_yfinance(self, symbol, start_date, end_date):
        """
        Fetch historical stock data using yfinance
        Symbol format: TATAMOTORS.NS, INFY.NS, RELIANCE.NS
        """
        try:
            # Add .NS suffix if not present
            if not symbol.endswith('.NS'):
                symbol += '.NS'
            
            stock_data = yf.download(symbol, start=start_date, end=end_date)
            
            if stock_data.empty:
                return {"error": f"No data found for symbol {symbol}"}
            
            # Convert to records for JSON serialization
            stock_data.reset_index(inplace=True)
            stock_data['Date'] = stock_data['Date'].dt.strftime('%Y-%m-%d')
            
            return {
                "symbol": symbol,
                "data": stock_data.to_dict('records')
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_historical_stock_data_jugaad(self, symbol, start_date, end_date):
        """
        Fetch historical stock data using jugaad_data
        NSE symbols like: INFY, TATAMOTORS, RELIANCE
        """
        if not JUGAAD_AVAILABLE:
            return {"error": "jugaad_data library not available"}
        
        try:
            # Convert string dates to date objects if needed
            if isinstance(start_date, str):
                start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
            if isinstance(end_date, str):
                end_date = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
            
            stock_data = stock_df(symbol=symbol, from_date=start_date, to_date=end_date, series="EQ")
            
            if stock_data.empty:
                return {"error": f"No data found for symbol {symbol}"}
            
            # Convert DATE column to string for JSON serialization
            if 'DATE' in stock_data.columns:
                stock_data['DATE'] = pd.to_datetime(stock_data['DATE']).dt.strftime('%Y-%m-%d')
            
            return {
                "symbol": symbol,
                "data": stock_data.to_dict(orient='records')
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_historical_index_data_nselib(self, index_name: str = "Nifty 50", from_date_str: str = "01-01-2024", to_date_str: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch historical index data using nselib
        Date format: DD-MM-YYYY
        """
        if not NSELIB_AVAILABLE:
            return {"error": "nselib library not available"}
        
        try:
            if not to_date_str:
                to_date_str = datetime.date.today().strftime('%d-%m-%Y')
            
            index_data = capital_market.index_data(
                index=index_name, 
                from_date=from_date_str, 
                to_date=to_date_str
            )
            
            if index_data.empty:
                return {"error": f"No data found for index {index_name}"}
            
            # Convert timestamp to proper format
            index_data['TIMESTAMP'] = pd.to_datetime(index_data['TIMESTAMP'], format='%d-%m-%Y')
            index_data = index_data.sort_values(by='TIMESTAMP').reset_index(drop=True)
            index_data['TIMESTAMP'] = index_data['TIMESTAMP'].dt.strftime('%Y-%m-%d')
            
            return {
                "index": index_name,
                "data": index_data.to_dict(orient='records')
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_stock_info_yfinance(self, symbol: str) -> Dict[str, Any]:
        """
        Get detailed stock information using yfinance
        """
        try:
            if not symbol.endswith('.NS'):
                symbol += '.NS'
            
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            if not info:
                return {"error": f"No information found for symbol {symbol}"}
            
            return {
                "symbol": symbol,
                "company_name": info.get('longName'),
                "current_price": info.get('currentPrice'),
                "market_cap": info.get('marketCap'),
                "shares_outstanding": info.get('sharesOutstanding'),
                "float_shares": info.get('floatShares'),
                "pe_ratio": info.get('trailingPE'),
                "pb_ratio": info.get('priceToBook'),
                "dividend_yield": info.get('dividendYield'),
                "sector": info.get('sector'),
                "industry": info.get('industry')
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_top_nifty_stocks(self):
        """
        Get live data for top Nifty 50 stocks
        """
        nifty_50_stocks = [
            "RELIANCE", "TCS", "HDFCBANK", "INFY", "HINDUNILVR",
            "HDFC", "ICICIBANK", "KOTAKBANK", "LT", "ITC",
            "AXISBANK", "BHARTIARTL", "ASIANPAINT", "MARUTI", "BAJFINANCE"
        ]
        
        stock_data = []
        for stock in nifty_50_stocks[:10]:  # Limit to top 10 for performance
            data = self.get_live_stock_price(stock)
            if "error" not in data:
                stock_data.append(data)
        
        return {"stocks": stock_data}

def main():
    """
    CLI interface for testing the market data fetcher
    """
    if len(sys.argv) < 2:
        print("Usage: python indianMarketData.py <command> [args]")
        print("Commands:")
        print("  live_index [index_name]")
        print("  live_stock <symbol>")
        print("  historical_stock <symbol> <start_date> <end_date>")
        print("  stock_info <symbol>")
        print("  top_nifty")
        return
    
    fetcher = IndianMarketDataFetcher()
    command = sys.argv[1]
    
    if command == "live_index":
        index_name = sys.argv[2] if len(sys.argv) > 2 else "NIFTY 50"
        result = fetcher.get_live_index_data(index_name)
        
    elif command == "live_stock":
        if len(sys.argv) < 3:
            print("Error: Symbol required")
            return
        symbol = sys.argv[2]
        result = fetcher.get_live_stock_price(symbol)
        
    elif command == "historical_stock":
        if len(sys.argv) < 5:
            print("Error: Symbol, start_date, and end_date required")
            return
        symbol, start_date, end_date = sys.argv[2], sys.argv[3], sys.argv[4]
        result = fetcher.get_historical_stock_data_yfinance(symbol, start_date, end_date)
        
    elif command == "stock_info":
        if len(sys.argv) < 3:
            print("Error: Symbol required")
            return
        symbol = sys.argv[2]
        result = fetcher.get_stock_info_yfinance(symbol)
        
    elif command == "top_nifty":
        result = fetcher.get_top_nifty_stocks()
        
    else:
        print(f"Unknown command: {command}")
        return
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()