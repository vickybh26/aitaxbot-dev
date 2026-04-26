#!/usr/bin/env python3
"""
Simple Indian Stock Market Data Fetcher using yfinance
Based on the Medium article but focusing on reliable yfinance library
"""

import yfinance as yf
import json
import sys
import datetime
from typing import Dict, Any, List

class SimpleIndianMarketFetcher:
    def __init__(self):
        # Top Indian stocks with their Yahoo Finance symbols
        self.indian_stocks = {
            'RELIANCE': 'RELIANCE.NS',
            'TCS': 'TCS.NS',
            'HDFCBANK': 'HDFCBANK.NS',
            'INFY': 'INFY.NS',
            'HINDUNILVR': 'HINDUNILVR.NS',
            'ICICIBANK': 'ICICIBANK.NS',
            'KOTAKBANK': 'KOTAKBANK.NS',
            'BHARTIARTL': 'BHARTIARTL.NS',
            'ITC': 'ITC.NS',
            'LT': 'LT.NS'
        }
        
        # Indian indices
        self.indian_indices = {
            'NIFTY': '^NSEI',
            'SENSEX': '^BSESN',
            'BANKNIFTY': '^NSEBANK'
        }
    
    def get_stock_price(self, symbol: str) -> Dict[str, Any]:
        """Get current stock price using yfinance"""
        try:
            # Convert to Yahoo Finance format
            yf_symbol = self.indian_stocks.get(symbol.upper(), f"{symbol.upper()}.NS")
            
            ticker = yf.Ticker(yf_symbol)
            info = ticker.info
            hist = ticker.history(period='1d')
            
            if hist.empty:
                return {"error": f"No data found for {symbol}"}
            
            current_price = hist['Close'].iloc[-1]
            open_price = hist['Open'].iloc[-1]
            change = current_price - open_price
            change_percent = (change / open_price) * 100 if open_price != 0 else 0
            
            return {
                "symbol": symbol.upper(),
                "company_name": info.get('longName', symbol),
                "current_price": round(float(current_price), 2),
                "open_price": round(float(open_price), 2),
                "change": round(float(change), 2),
                "change_percent": round(float(change_percent), 2),
                "volume": int(hist['Volume'].iloc[-1]) if not hist['Volume'].empty else 0,
                "market_cap": info.get('marketCap'),
                "pe_ratio": info.get('trailingPE'),
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_index_data(self, index: str = 'NIFTY') -> Dict[str, Any]:
        """Get index data using yfinance"""
        try:
            yf_symbol = self.indian_indices.get(index.upper(), '^NSEI')
            
            ticker = yf.Ticker(yf_symbol)
            hist = ticker.history(period='2d')  # Get 2 days to calculate change
            
            if hist.empty:
                return {"error": f"No data found for {index}"}
            
            current_price = hist['Close'].iloc[-1]
            prev_price = hist['Close'].iloc[-2] if len(hist) > 1 else hist['Close'].iloc[-1]
            change = current_price - prev_price
            change_percent = (change / prev_price) * 100 if prev_price != 0 else 0
            
            return {
                "symbol": index.upper(),
                "name": f"{index.upper()} Index",
                "current_value": round(float(current_price), 2),
                "previous_close": round(float(prev_price), 2),
                "change": round(float(change), 2),
                "change_percent": round(float(change_percent), 2),
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_top_stocks(self) -> Dict[str, Any]:
        """Get data for top Indian stocks"""
        stocks_data = []
        
        for symbol in list(self.indian_stocks.keys())[:5]:  # Top 5 for performance
            stock_data = self.get_stock_price(symbol)
            if "error" not in stock_data:
                stocks_data.append(stock_data)
        
        return {"stocks": stocks_data}
    
    def get_historical_data(self, symbol: str, period: str = '1mo') -> Dict[str, Any]:
        """Get historical data for a stock"""
        try:
            yf_symbol = self.indian_stocks.get(symbol.upper(), f"{symbol.upper()}.NS")
            
            ticker = yf.Ticker(yf_symbol)
            hist = ticker.history(period=period)
            
            if hist.empty:
                return {"error": f"No historical data found for {symbol}"}
            
            # Convert to records for JSON serialization
            hist.reset_index(inplace=True)
            hist['Date'] = hist['Date'].dt.strftime('%Y-%m-%d')
            
            # Round numerical values
            for col in ['Open', 'High', 'Low', 'Close']:
                if col in hist.columns:
                    hist[col] = hist[col].round(2)
            
            return {
                "symbol": symbol.upper(),
                "period": period,
                "data": hist.to_dict('records')
            }
        except Exception as e:
            return {"error": str(e)}

def main():
    """CLI interface"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Command required: stock, index, top_stocks, or historical"}))
        return
    
    fetcher = SimpleIndianMarketFetcher()
    command = sys.argv[1]
    
    try:
        if command == "stock":
            symbol = sys.argv[2] if len(sys.argv) > 2 else "RELIANCE"
            result = fetcher.get_stock_price(symbol)
            
        elif command == "index":
            index = sys.argv[2] if len(sys.argv) > 2 else "NIFTY"
            result = fetcher.get_index_data(index)
            
        elif command == "top_stocks":
            result = fetcher.get_top_stocks()
            
        elif command == "historical":
            symbol = sys.argv[2] if len(sys.argv) > 2 else "RELIANCE"
            period = sys.argv[3] if len(sys.argv) > 3 else "1mo"
            result = fetcher.get_historical_data(symbol, period)
            
        else:
            result = {"error": f"Unknown command: {command}"}
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()