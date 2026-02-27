// Google Analytics utility functions
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

// Track page views
export const trackPageView = (path: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-9NMYMNBYFV', {
      page_path: path,
      page_title: title
    });
  }
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
};

// Track calculator usage
export const trackCalculatorUsage = (calculatorType: string) => {
  trackEvent('calculator_used', 'Financial Tools', calculatorType);
};

// Track market data interactions
export const trackMarketDataView = (dataType: string) => {
  trackEvent('market_data_viewed', 'Market Data', dataType);
};

// Track button clicks
export const trackButtonClick = (buttonName: string, section: string) => {
  trackEvent('button_click', section, buttonName);
};