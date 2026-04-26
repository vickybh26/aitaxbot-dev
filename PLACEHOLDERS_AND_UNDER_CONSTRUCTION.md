# AiTaxBot - Placeholders & Under Construction Components

## 📋 Summary
This document lists all placeholder data, mock content, and under-construction features found in the AiTaxBot platform.

---

## ⚠️ CRITICAL PLACEHOLDERS (Requires User Action)

### 1. **Google AdSense Ad Slot IDs**
**Location:** `client/src/components/AdBanner.tsx`

**Current Placeholders:**
- LeaderboardAd: `slot="1234567890"` (Line 56)
- RectangleAd: `slot="2345678901"` (Line 67)
- ResponsiveAd: `slot="3456789012"` (Line 78)

**Action Required:**
Replace with actual ad slot IDs from your Google AdSense account.

---

### 2. **Media.net Site ID**
**Location:** `client/src/components/AdNetworks.tsx`

**Current Placeholder:**
- Site ID: `8CU2W7CG1` (Line 49)
- Client ID in script: `8CU2W7CG1` (Line 26)

**Action Required:**
Replace with your actual Media.net publisher ID after approval.

---

### 3. **PropellerAds Zone ID**
**Location:** `client/src/components/AdNetworks.tsx`

**Current Placeholder:**
- Zone ID: `5461894` (Line 69)

**Action Required:**
Replace with your actual PropellerAds zone ID after approval.

---

## 🔧 TECHNICAL PLACEHOLDERS (Can Be Auto-Replaced)

### 4. **Market News Data**
**Location:** `client/src/components/market/MarketNews.tsx`

**Current Status:** Uses mock/demo news data (Lines 34-57)

**Mock Data Includes:**
- 2 sample news items with generic headlines
- Dummy URLs (`url: "#"`)
- Fake timestamps

**Solution:** Already prepared to integrate with Finnhub API (noted in component footer)

---

### 5. **Indian Market Data Fallbacks**
**Location:** `server/stockMarketIndia.js`

**Current Status:** Contains fallback methods with mock data:
- `getFallbackIndices()` - Mock NSE/BSE indices (Line 133)
- `getFallbackStockData()` - Mock stock prices (Line 162)
- `getFallbackGainers()` - Mock top gainers
- `getFallbackLosers()` - Mock top losers
- `getFallbackBSEIndices()` - Mock BSE data

**Purpose:** These fallbacks activate when real NSE/BSE APIs fail, ensuring the app doesn't crash.

**Note:** This is **intentional** - fallbacks are a best practice for API reliability.

---

### 6. **Python Market Data Mock**
**Location:** `server/workingMarketData.py`

**Current Status:** Contains `get_mock_indian_market_data()` function (Line 12)

**Mock Data:**
- Nifty 50: 25013.15
- Sensex: 83104.25  
- Bank Nifty: 51847.30
- Top 5 stocks: RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK

**Note:** Comment says "This should be replaced with real API calls when connectivity is restored" (Line 15)

---

### 7. **Native Content Ads (Placeholder UI)**
**Location:** `client/src/components/AdNetworks.tsx`

**Current Status:** Shows mock sponsored content cards (Lines 94-115)

**Mock Content:**
- 3 generic "Smart Investment Tips" cards
- Placeholder gradients instead of real images
- No actual ad network integration

**Action Required:** 
- Integrate Taboola/Outbrain or similar native ad network
- Or remove component if not using native ads

---

## ✅ FULLY FUNCTIONAL (No Placeholders)

### 8. **Accounting & Invoicing Module**
- ✅ Multi-firm management with GST/Non-GST support
- ✅ Client management with Firebase
- ✅ Invoice generation with real calculations
- ✅ Sales register and reports
- ✅ Complete authentication flow

### 9. **Tax Calculators**
- ✅ Income Tax Calculator (Old vs New Regime)
- ✅ HRA Calculator (Section 10(13A))
- ✅ SIP Calculator
- ✅ SWP Calculator

### 10. **Algo Trading Integration**
- ✅ Zerodha KiteConnect API integration
- ✅ Real-time holdings and positions
- ✅ OAuth authentication flow
- ✅ Quote search functionality

### 11. **Blog System**
- ✅ SEO-optimized blog posts
- ✅ JSON-LD structured data
- ✅ Open Graph tags
- ✅ Multiple educational articles

### 12. **User Dashboard**
- ✅ Real-time statistics from Firebase
- ✅ Activity tracking
- ✅ Quick access to all features

---

## 🎯 RECOMMENDED ACTIONS

### Immediate (Required for Ad Revenue):
1. ✅ **Get Google AdSense approval** and replace slot IDs in `AdBanner.tsx`
2. ✅ **Apply for Media.net** and update site ID in `AdNetworks.tsx`
3. ✅ **Join PropellerAds** and update zone ID in `AdNetworks.tsx`

### Optional (For Better UX):
4. Replace mock market news with real Finnhub API integration
5. Remove or replace Native Content Ads component
6. Consider keeping market data fallbacks for reliability

### Not Recommended:
- ❌ Don't remove market data fallbacks - they ensure app stability
- ❌ Don't worry about placeholder form inputs - these are just UX hints

---

## 📊 BREAKDOWN BY PRIORITY

| Priority | Component | Status | User Action Required |
|----------|-----------|--------|---------------------|
| 🔴 HIGH | AdSense Slot IDs | Placeholder | Yes - Get real IDs |
| 🔴 HIGH | Media.net Site ID | Placeholder | Yes - Get approval |
| 🟡 MEDIUM | PropellerAds Zone | Placeholder | Yes - Sign up |
| 🟡 MEDIUM | Market News | Mock Data | Optional - API key |
| 🟢 LOW | Native Ads | Mock UI | Optional - Remove/Replace |
| ✅ INFO | Market Fallbacks | Intentional | No - Keep for stability |

---

## 📝 NOTES

1. **Form Placeholders** (like "Enter email", "Enter name") are **NOT** placeholders to replace - they're user interface hints (placeholder attributes in HTML inputs).

2. **Mock Data in Development** is sometimes intentional for testing. The market data fallbacks ensure the app works even when external APIs are down.

3. **Ad Network Integration** is the only critical blocker for revenue generation. All other features are production-ready.

---

*Last Updated: October 23, 2025*
