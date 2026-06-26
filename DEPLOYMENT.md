# AiTaxBot — Deployment Guide

**Stack:** React + TypeScript (Vite) · Node.js/Express · Firebase Auth + Firestore · Railway · Gemini AI · Qdrant

---

## Architecture

```
Browser → Railway (Node/Express) → Firebase Auth / Firestore
                                 → Gemini AI (REST v1beta)
                                 → Qdrant Cloud (vector search)
                                 → Brevo (transactional email)
```

All environment variables are set in the **Railway Dashboard** (not committed to git).

---

## Prerequisites

| Service | Purpose | Sign-up |
|---------|---------|---------|
| Railway | Hosting | https://railway.app |
| Firebase | Auth + Firestore + App Check | https://console.firebase.google.com |
| Google AI Studio | Gemini API (embedding + generation) | https://aistudio.google.com/apikey |
| Qdrant Cloud | RAG vector database | https://cloud.qdrant.io |
| Brevo | Transactional email | https://app.brevo.com |

---

## Deploying to Railway

### First-time setup

```bash
# 1. Push code to GitHub (Railway auto-deploys on push)
git push origin main

# 2. In Railway Dashboard:
#    New Project → Deploy from GitHub Repo → select your repo
#    Railway detects Node.js automatically

# 3. Add all environment variables (see section below)
# 4. Railway builds: npm run build  →  starts: npm run start
```

### Subsequent deploys

```bash
git add .
git commit -m "your message"
git push origin main
# Railway auto-redeploys on every push to main
```

### Railway settings (already configured in package.json)
- **Build command:** `npm run build`
- **Start command:** `npm run start`
- **Port:** Railway injects `PORT` automatically

---

## Environment Variables

Set all of these in **Railway Dashboard → Your Service → Variables**.

### Required — Core

```env
NODE_ENV=production
PORT=5000                          # Railway overrides this automatically
```

### Required — Firebase

```env
# Server-side Admin SDK
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Paste the entire JSON as a single minified line
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"aitaxbot-e5c0e",...}

# Client-side (Vite exposes VITE_ prefix to browser)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=aitaxbot-e5c0e
VITE_FIREBASE_APP_ID=1:275518195519:web:00bbefb3e9f4c21470358a
VITE_FIREBASE_MESSAGING_SENDER_ID=275518195519
VITE_FIREBASE_DATABASE_URL=https://aitaxbot-e5c0e-default-rtdb.firebaseio.com
VITE_FIREBASE_MEASUREMENT_ID=G-WYGS15GW5J
```

### Required — Gemini AI

```env
# https://aistudio.google.com/apikey
# Used for: RAG embedding (gemini-embedding-001), RAG generation (gemini-3.5-flash),
#           PDF extraction (Form 16, AIS, 26AS), client-side tax advice
GOOGLE_API_KEY=
```

### Required — Qdrant (RAG vector database)

```env
# https://cloud.qdrant.io → create cluster → get URL + API key
# Collection must exist: "aitaxbot-knowledge", vector size 3072
QDRANT_URL=https://your-cluster-id.us-east4-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=
QDRANT_COLLECTION=aitaxbot-knowledge
```

### Required — Brevo (email)

```env
# https://app.brevo.com → SMTP & API → API Keys
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@aitaxbot.co.in
BREVO_SENDER_NAME=AiTaxBot
BREVO_ADMIN_EMAIL=vickybh26@gmail.com
```

### Required — Security

```env
# Set to "true" in production — enforces Firebase App Check on public endpoints.
# In warn-only mode (false/unset), abuse of /api/leads/capture and rent receipt
# endpoints is not blocked.
APP_CHECK_ENFORCE=true
```

### Optional — Market Data (news, gold prices, stock data)

```env
ALPHA_VANTAGE_API_KEY=    # https://www.alphavantage.co/support/#api-key
FINNHUB_API_KEY=          # https://finnhub.io/register
NEWS_API_KEY=             # https://newsapi.org/register
NEWSDATA_API_KEY=         # https://newsdata.io
GOLDAPI_KEY=              # https://goldapi.io
```

### Optional — Adobe PDF Services

```env
# https://developer.adobe.com/ — advanced PDF processing
ADOBE_CLIENT_ID=
ADOBE_CLIENT_SECRET=
```

### Optional — WhatsApp Bot (Meta Cloud API)

```env
WHATSAPP_PHONE_NUMBER_ID=       # Meta App Dashboard → WhatsApp → API Setup
WHATSAPP_ACCESS_TOKEN=          # Permanent token from System User (Meta Business Suite)
WHATSAPP_VERIFY_TOKEN=aitaxbot_wh_verify_2026
WHATSAPP_APP_SECRET=            # Meta App → Settings → Basic → App Secret
WHATSAPP_ENABLED=false          # Set to "true" to activate
ADMIN_KEY=                      # Secret for /api/whatsapp/leads admin endpoint
VITE_WHATSAPP_NUMBER=           # e.g. 919876543210 (no + or spaces)
```

---

## Firebase Setup

### Firestore Rules
All client-side direct access is blocked. The backend uses Admin SDK.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Admin Panel Access
To give a user admin access, create this Firestore document manually:

```
Collection: admin
Document ID: <Firebase UID of the user>
Fields:
  level: 1        (1 = read-only admin, 2 = editor, 3 = super)
  name: "Vikrant Bhargav"
  email: "vickybh26@gmail.com"
```

---

## Qdrant Collection Setup

Before the RAG pipeline works, the collection must exist:

```bash
# Create collection (3072 dims = gemini-embedding-001 output size)
curl -X PUT "https://your-cluster.qdrant.io/collections/aitaxbot-knowledge" \
  -H "api-key: YOUR_QDRANT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 3072,
      "distance": "Cosine"
    }
  }'
```

Embed and upload ICAI PDFs using the ingest scripts in `server/scripts/`.

---

## Security Checklist (Before Every Deploy)

```
[ ] .env not committed — confirm with: git status | grep -i env
[ ] FIREBASE_SERVICE_ACCOUNT set in Railway (never in code)
[ ] APP_CHECK_ENFORCE=true in Railway variables
[ ] No API keys hardcoded — run: grep -rn "AIza\|sk-\|xoxb" server/ client/
[ ] All admin routes verified protected (requireAdmin middleware)
[ ] Firestore rules deny direct client access
```

---

## Verifying the Deploy

```powershell
# 1. Health check — RAG pipeline
Invoke-RestMethod -Uri "https://www.aitaxbot.co.in/api/ai/health"
# Expected: { qdrant: true, collection_exists: true, vector_count: 3023, gemini: true }

# 2. Test RAG query
Invoke-RestMethod -Uri "https://www.aitaxbot.co.in/api/ai/query" `
  -Method POST -ContentType "application/json" `
  -Body '{"question": "What is the 80C deduction limit?"}'

# 3. Confirm AdSense + GA4 tags fire on homepage
# Open DevTools → Network → filter "google" → verify G-9NMYMNBYFV and ca-pub-6497933645628124
```

---

## Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main
# Railway redeploys automatically
```

---

## Key URLs

| Resource | URL |
|----------|-----|
| Live site | https://www.aitaxbot.co.in |
| Railway dashboard | https://railway.app/dashboard |
| Firebase console | https://console.firebase.google.com/project/aitaxbot-e5c0e |
| Google AI Studio | https://aistudio.google.com |
| Qdrant Cloud | https://cloud.qdrant.io |
| Google Search Console | https://search.google.com/search-console |
| Google Ads | https://ads.google.com (account 479-711-4593) |
| Google Analytics | https://analytics.google.com (property G-9NMYMNBYFV) |
| AdSense | https://www.google.com/adsense (pub-6497933645628124) |

---

*Last updated: June 2026*
