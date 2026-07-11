import { useEffect } from 'react';

interface AdBannerProps {
  slot: string;
  format?: string;
  responsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdBanner({ 
  slot, 
  format = 'auto', 
  responsive = true, 
  style,
  className = ""
}: AdBannerProps) {
  const isPlaceholder = slot === "1234567890" || slot === "2345678901" || slot === "3456789012";

  useEffect(() => {
    if (isPlaceholder) return;
    // DPDP: the adsbygoogle.js script itself is only injected after the
    // user grants advertising consent (see CookieConsent.tsx) — it may not
    // exist yet when this component mounts. Queueing onto
    // window.adsbygoogle unconditionally is the standard, documented
    // AdSense pattern: it creates the array if needed, and whenever the
    // script does load (immediately, or later once consent is granted) it
    // drains whatever was queued. Gating this push on window.adsbygoogle
    // already being truthy would silently drop the ad for anyone who
    // consents after this component has already mounted.
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.log('AdSense error:', error);
    }
  }, [isPlaceholder]);

  if (isPlaceholder) return null;

  return (
    <div className={`ad-container ${className}`} role="complementary" aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ 
          display: 'block',
          textAlign: 'center',
          ...style 
        }}
        data-ad-client="ca-pub-6497933645628124"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive.toString()}
        title="Advertisement"
      />
    </div>
  );
}

// Predefined ad slots for common sizes
export function LeaderboardAd({ className }: { className?: string }) {
  return (
    <AdBanner
      slot="1234567890" // Replace with actual slot ID from AdSense
      format="leaderboard"
      style={{ width: '728px', height: '90px' }}
      className={className}
    />
  );
}

export function RectangleAd({ className }: { className?: string }) {
  return (
    <AdBanner
      slot="2345678901" // Replace with actual slot ID from AdSense
      format="rectangle"
      style={{ width: '300px', height: '250px' }}
      className={className}
    />
  );
}

export function ResponsiveAd({ className }: { className?: string }) {
  return (
    <AdBanner
      slot="3456789012" // Replace with actual slot ID from AdSense
      format="auto"
      responsive={true}
      style={{ width: '100%', minHeight: '90px' }}
      className={className}
    />
  );
}