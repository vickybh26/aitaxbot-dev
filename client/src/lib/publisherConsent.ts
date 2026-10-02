import { PUBLISHER_ARTICLE_PATHS } from '@shared/publisherArticlePaths';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  advertising: boolean;
}

// Deliberately excludes calculators/results, uploads, account and admin screens.
export function isPublisherContentPath(path: string): boolean {
  const normalised = path.length > 1 ? path.replace(/\/$/, '') : path;
  return normalised === '/' || normalised === '/blog' || PUBLISHER_ARTICLE_PATHS.includes(normalised);
}

export function hasAnalyticsConsent(): boolean {
  try {
    return JSON.parse(localStorage.getItem('cookieConsent') || 'null')?.analytics === true;
  } catch {
    return false;
  }
}

const ADS_ENABLED = import.meta.env?.VITE_ADSENSE_ENABLED === 'true';

export function canRequestAds(path: string): boolean {
  try {
    return ADS_ENABLED && isPublisherContentPath(path)
      && JSON.parse(localStorage.getItem('cookieConsent') || 'null')?.advertising === true;
  } catch {
    return false;
  }
}

function appendScript(id: string, src: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

export function applyPublisherConsent(prefs: CookiePreferences, path: string): void {
  window.gtag?.('consent', 'update', {
    analytics_storage: prefs.analytics ? 'granted' : 'denied',
    // This custom banner is not a Google-certified TCF CMP. Do not treat it
    // as authorisation for personalised advertising.
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  if (prefs.analytics === true && isPublisherContentPath(path)) {
    if (!document.getElementById('analytics-script')) {
      window.gtag?.('js', new Date() as any);
      window.gtag?.('config', 'G-9NMYMNBYFV', { send_page_view: false });
      appendScript('analytics-script', 'https://www.googletagmanager.com/gtag/js?id=G-9NMYMNBYFV');
    }
    window.gtag?.('event', 'page_view', { page_path: path, page_title: document.title });
    const w = window as any;
    w.clarity = w.clarity || function (...args: unknown[]) { (w.clarity.q = w.clarity.q || []).push(args); };
    w.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    appendScript('clarity-script', 'https://www.clarity.ms/tag/rdz8mw3fw4');
  }
  if (canRequestAds(path)) {
    // Disabled by default pending account-level CMP and Auto ads verification.
    // Non-personalised ads are not a substitute for required regional consent.
    (window as any).adsbygoogle = (window as any).adsbygoogle || [];
    (window as any).adsbygoogle.requestNonPersonalizedAds = 1;
    appendScript('adsbygoogle-script', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6497933645628124');
  }
  window.dispatchEvent(new Event('publisher-consent-changed'));
}

export function publisherScriptsLoaded(): boolean {
  return ['analytics-script', 'clarity-script', 'adsbygoogle-script'].some(id => document.getElementById(id));
}
