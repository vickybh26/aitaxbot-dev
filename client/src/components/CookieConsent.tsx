import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always true, cannot be disabled
    analytics: true,
    advertising: true,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consentStatus = localStorage.getItem('cookieConsent');
    if (!consentStatus) {
      // Show banner after a short delay for better UX
      setTimeout(() => setIsVisible(true), 1000);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consentStatus);
        setPreferences(saved);
        // CRITICAL: Re-apply saved consent to Google Tag Manager on return visits
        enableTracking(saved);
      } catch (e) {
        console.error('Error loading cookie preferences:', e);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      advertising: true,
    };
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    setPreferences(allAccepted);
    setIsVisible(false);
    
    // Enable analytics and ads
    enableTracking(allAccepted);
  };

  const handleRejectNonEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      advertising: false,
    };
    localStorage.setItem('cookieConsent', JSON.stringify(essentialOnly));
    setPreferences(essentialOnly);
    setIsVisible(false);
    
    // Disable analytics and ads
    enableTracking(essentialOnly);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    setIsVisible(false);
    setShowPreferences(false);
    
    // Apply preferences
    enableTracking(preferences);
  };

  // adsbygoogle.js is intentionally NOT loaded in index.html anymore (DPDP:
  // consent before processing). Inject it only once the user actually
  // grants advertising consent, and only once per page load.
  const loadAdSenseScript = () => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('adsbygoogle-script')) return;
    const script = document.createElement('script');
    script.id = 'adsbygoogle-script';
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6497933645628124';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  };

  const enableTracking = (prefs: typeof preferences) => {
    // Store preferences for use by analytics scripts
    if (typeof window !== 'undefined') {
      (window as any).cookiePreferences = prefs;

      // Google Analytics / Ads — Consent Mode v2. index.html sets the
      // default to 'denied' before gtag/Clarity/AdSense ever load, so
      // nothing collects data until this update actually runs.
      if (window.gtag) {
        window.gtag('consent', 'update', {
          'analytics_storage': prefs.analytics ? 'granted' : 'denied',
        } as any);
        window.gtag('consent', 'update', {
          'ad_storage': prefs.advertising ? 'granted' : 'denied',
          'ad_user_data': prefs.advertising ? 'granted' : 'denied',
          'ad_personalization': prefs.advertising ? 'granted' : 'denied',
        } as any);
      }

      // Microsoft Clarity — separate consent API, not covered by gtag.
      if (typeof (window as any).clarity === 'function') {
        (window as any).clarity('consent', prefs.analytics);
      }

      // Google AdSense — only start requesting/serving ads once the user
      // has actually opted in to advertising cookies.
      if (prefs.advertising) {
        loadAdSenseScript();
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      /* z-[60] — top of the shared bottom-edge stack (tab bar z-40, WhatsApp
         FAB z-45). This banner is a blocking decision surface, so it should
         cover the others rather than merely win on paint order, which is what
         used to happen when all three sat at z-50. */
      className="fixed bottom-0 left-0 right-0 z-[60] animate-slide-up"
      data-testid="cookie-consent-banner"
      role="dialog"
      aria-label="Cookie Consent"
      aria-live="polite"
      data-nosnippet
    >
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {!showPreferences ? (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <Cookie className="w-8 h-8 text-persian-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    We Value Your Privacy
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    We use cookies to enhance your browsing experience, serve personalized ads or content, 
                    and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. 
                    You can manage your preferences or learn more in our{" "}
                    <a 
                      href="/privacy-policy" 
                      className="text-persian-blue-600 hover:text-persian-blue-700 underline font-medium"
                      data-testid="link-privacy-policy"
                    >
                      Privacy Policy
                    </a>.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 md:flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreferences(true)}
                  className="text-sm"
                  data-testid="button-manage-preferences"
                >
                  Manage Preferences
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectNonEssential}
                  className="text-sm"
                  data-testid="button-reject-all"
                >
                  Reject Non-Essential
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="bg-persian-blue-600 hover:bg-persian-blue-700 text-white text-sm"
                  data-testid="button-accept-all"
                >
                  Accept All
                </Button>
              </div>
              
              <button
                onClick={handleRejectNonEssential}
                className="absolute top-4 right-4 text-slate-500 hover:text-gray-600 transition-colors"
                aria-label="Close"
                data-testid="button-close-banner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Cookie className="w-8 h-8 text-persian-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Cookie Preferences
                    </h3>
                    <p className="text-sm text-gray-600">
                      Choose which types of cookies you want to allow
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="text-slate-500 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                  data-testid="button-close-preferences"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Essential Cookies */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={preferences.essential}
                    disabled
                    className="mt-1 w-4 h-4 rounded border-gray-300"
                    data-testid="checkbox-essential"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Essential Cookies (Required)
                    </h4>
                    <p className="text-sm text-gray-600">
                      These cookies are necessary for the website to function and cannot be disabled. 
                      They enable basic functions like page navigation and access to secure areas.
                    </p>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-persian-blue-600 focus:ring-persian-blue-500"
                    data-testid="checkbox-analytics"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Analytics Cookies
                    </h4>
                    <p className="text-sm text-gray-600">
                      These cookies help us understand how visitors interact with our website 
                      (e.g., Google Analytics, Microsoft Clarity). This helps us improve our services.
                    </p>
                  </div>
                </div>

                {/* Advertising Cookies */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={preferences.advertising}
                    onChange={(e) => setPreferences({ ...preferences, advertising: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-persian-blue-600 focus:ring-persian-blue-500"
                    data-testid="checkbox-advertising"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Advertising Cookies
                    </h4>
                    <p className="text-sm text-gray-600">
                      These cookies are used by Google AdSense and other advertising partners 
                      to display relevant ads based on your browsing history. You can opt out 
                      via{" "}
                      <a 
                        href="https://www.google.com/settings/ads" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-persian-blue-600 hover:underline"
                      >
                        Google Ads Settings
                      </a>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setShowPreferences(false)}
                  data-testid="button-cancel-preferences"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePreferences}
                  className="bg-persian-blue-600 hover:bg-persian-blue-700 text-white"
                  data-testid="button-save-preferences"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

