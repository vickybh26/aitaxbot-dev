/**
 * chartColors — the single source of hex values for charts.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Recharts and Chart.js want concrete colour strings, not Tailwind classes, so
 * chart colours had been written as hex literals inline at each call site. That
 * left 24 hardcoded hexes scattered through the codebase, several of them
 * off-palette entirely (#4f46e5 indigo in the admin charts, #4685d8 in the AIS
 * tool, #16a34a in the homepage hero) and none of them tracking the 2026-08
 * navy redesign. Change the brand colour and the charts would silently keep
 * the old one.
 *
 * These constants are the exact hex equivalents of the HSL tokens declared in
 * index.css. If you change a token there, change it here — the pairing is
 * noted against each value so the two can be checked against each other.
 *
 * Rule: charts use these; everything else uses Tailwind classes. Never write a
 * raw hex at a call site. The only legitimate exceptions are third-party brand
 * marks (WhatsApp green, the four Google sign-in colours), which must stay
 * exact and are intentionally not listed here.
 */

/** Brand navy — `--primary-blue: 214 52% 25%`. Primary series, structure. */
export const NAVY = "#1F3B61";

/** `--primary-blue-dark: 214 58% 17%`. */
export const NAVY_DARK = "#122844";

/** persian-blue-500 / 400 / 300 — supporting series on the navy ramp. */
export const NAVY_500 = "#305A91";
export const NAVY_400 = "#4678B9";
export const NAVY_300 = "#7BA0D1";

/** `--interactive-blue: 221 83% 53%`. Links, focus, secondary series. */
export const INTERACTIVE = "#2463EB";

/**
 * `--success-green: 161 94% 30%`.
 * Reserved for money gained — tax saved, refund due, the winning regime.
 * Do not use it to mean "this series is second".
 */
export const SUCCESS = "#059467";

/** `--warning-orange: 25 95% 53%`. Caution, deadlines. */
export const WARNING = "#F97415";

/** `--destructive: 0 74% 51%`. Errors, losses. */
export const DESTRUCTIVE = "#DF2626";

/** Slate ramp — axes, gridlines, tick labels, surfaces. Tailwind slate. */
export const SLATE_900 = "#0F172A";
export const SLATE_700 = "#334155";
export const SLATE_600 = "#475569";
export const SLATE_500 = "#64748B";
export const SLATE_200 = "#E2E8F0";
export const SLATE_100 = "#F1F5F9";
export const WHITE = "#FFFFFF";

/** Axis / gridline defaults, so every chart on the site reads the same. */
export const AXIS = {
  grid: SLATE_200,
  gridSubtle: SLATE_100,
  /** Tick labels. slate-500 on white is 4.76:1 — slate-400 (2.56:1) failed AA. */
  tick: SLATE_500,
  label: SLATE_600,
  emphasis: SLATE_700,
} as const;

/**
 * Ordered categorical palette for charts with an arbitrary number of series
 * (admin analytics, tool-usage breakdowns).
 *
 * Built on the navy ramp first so the common two- and three-series cases stay
 * on-brand, with the semantic colours only appearing once a chart genuinely has
 * that many categories. The previous list opened with indigo, teal, amber, red
 * and violet — five unrelated hues before any brand colour appeared.
 */
export const CATEGORICAL = [
  NAVY,
  INTERACTIVE,
  NAVY_400,
  SUCCESS,
  NAVY_300,
  WARNING,
  NAVY_500,
  DESTRUCTIVE,
  SLATE_500,
  NAVY_DARK,
] as const;
