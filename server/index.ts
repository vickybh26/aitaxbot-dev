import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomBytes } from "crypto";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeFirebase } from "./firebase";
import { cleanStalePdfs } from "./pdfGenerator";

// Initialize Firebase on startup
try {
  initializeFirebase();
  log("✅ Firebase initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase:", error);
  console.error("⚠️  App will start without Firebase. Set FIREBASE_SERVICE_ACCOUNT env var to enable Firebase features.");
  // Don't exit - allow app to start for non-Firebase features
}

// ── Startup maintenance ───────────────────────────────────────────────────────
// Remove any temp PDFs left over from previous server runs (older than 5 min)
cleanStalePdfs();

// ── Security startup warnings ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production' && process.env.APP_CHECK_ENFORCE !== 'true') {
  console.warn(
    '⚠️  [Security] APP_CHECK_ENFORCE is not set to "true".\n' +
    '   Firebase App Check is running in warn-only mode — requests without\n' +
    '   a valid App Check token are being ALLOWED.\n' +
    '   Set APP_CHECK_ENFORCE=true in your production environment variables.'
  );
}

const app = express();

// Trust the first proxy hop (Railway / Cloud Run / Vercel).
// Required for correct req.ip under rate limiting.
app.set("trust proxy", 1);

// ─────────────────────────────────────────────────────────────────────
// Apex → www redirect. AdSense has the site registered as the bare apex
// domain (aitaxbot.co.in), but the canonical host is www.aitaxbot.co.in.
// Without this, requests that reach the app on the apex host (including
// aitaxbot.co.in/ads.txt) were falling through to an empty response
// instead of the real file, which is why AdSense's Sites dashboard
// showed "Ads.txt: Not found" and the site stayed stuck on "Getting
// ready". This 301s every apex request — including /ads.txt — to the
// same path on www before anything else runs.
// ─────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = req.headers.host || "";
  if (host === "aitaxbot.co.in") {
    return res.redirect(301, `https://www.aitaxbot.co.in${req.originalUrl}`);
  }
  next();
});

// ─────────────────────────────────────────────────────────────────────
// CSP nonce — generate a unique nonce for every request so inline
// scripts (GTM config, Clarity snippet) can be whitelisted without
// the broad 'unsafe-inline' directive.
// ─────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.cspNonce = randomBytes(16).toString("base64url");
  next();
});

// ─────────────────────────────────────────────────────────────────────
// Security headers (helmet) — CSP whitelists external analytics and
// ad origins, and uses per-request nonces for the two inline scripts
// in index.html (GTM config + Clarity) instead of 'unsafe-inline'.
// ─────────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        // Per-request nonce for the two inline scripts in index.html.
        // In dev mode, Vite's HMR also needs 'unsafe-inline' and 'unsafe-eval'
        (_req: any, res: any) => `'nonce-${res.locals.cspNonce}'`,
        ...(process.env.NODE_ENV === "development" ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://pagead2.googlesyndication.com",
        "https://adservice.google.com",
        "https://www.googleadservices.com",
        "https://www.clarity.ms",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://apis.google.com",
      ],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
      "connect-src": [
        "'self'",
        ...(process.env.NODE_ENV === "development" ? ["ws:", "wss:"] : []),
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "https://*.firebaseapp.com",
        "https://identitytoolkit.googleapis.com",
        "https://firestore.googleapis.com",
        "https://firebaseappcheck.googleapis.com",
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://region1.google-analytics.com",
        "https://www.clarity.ms",
        "https://b.clarity.ms",
        "wss://*.firebaseio.com",
      ],
      "frame-src": ["'self'", "https://*.firebaseapp.com", "https://www.google.com"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": [],
    },
  },
  crossOriginEmbedderPolicy: false, // AdSense/Clarity break under COEP
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Google OAuth popup needs this
  strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// Enable GZIP compression for all responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Compression level (0-9, 6 is default)
}));

// JSON body size limit reduces DOS surface — tax payloads are small.
// `verify` captures the raw request body for the WhatsApp webhook so we can
// validate Meta's X-Hub-Signature-256 HMAC before trusting any of it.
app.use(express.json({
  limit: '1mb',
  verify: (req: Request, _res, buf) => {
    if (req.url && req.url.startsWith('/api/webhook/whatsapp')) {
      (req as any).rawBody = Buffer.from(buf);
    }
  },
}));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ─────────────────────────────────────────────────────────────────────
// Rate limiting — applied globally to /api, with stricter caps on
// expensive endpoints (AI, email send, external proxies).
// ─────────────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down." },
});
app.use("/api", apiLimiter);

// Request logger — records method/path/status/duration only.
// Response bodies are NOT logged — they contain PII (email, PAN, salary, etc.)
// which would end up in Railway/host logs and breach data-minimisation.
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Error handler — logs internally, returns a minimal message externally.
  // Does NOT re-throw (previous code did `throw err` after res.json, which
  // would surface as an unhandledRejection and could crash the process in
  // Node 18+ strict mode).
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const exposeMessage = status >= 400 && status < 500 && typeof err?.message === "string";
    const message = exposeMessage ? err.message : "Internal Server Error";

    console.error("[Express error]", err);
    if (!res.headersSent) {
      res.status(status).json({ error: message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: process.platform !== "win32",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
