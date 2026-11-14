# AiTaxBot — Custom Dockerfile
# Reason: nixpacks auto-generates `npm install && npm run build` in the build phase.
# With NODE_ENV=production, npm 9.x skips devDependencies (including vite), causing
# `vite: not found`. This Dockerfile installs all deps first, then builds cleanly.

# Pin a supported runtime containing the October 2026 TLS/trust-store fixes.
FROM node:24.22.2-bookworm-slim

WORKDIR /app

# Local PDF reading/OCR: source documents must never go to an AI provider.
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-eng && rm -rf /var/lib/apt/lists/*

# ── Build-time args for Vite (baked into client bundle at build time) ──────────
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_DATABASE_URL
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_RECAPTCHA_SITE_KEY

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_DATABASE_URL=$VITE_FIREBASE_DATABASE_URL
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY

# ── Install ALL dependencies (including devDeps like vite, esbuild) ────────────
COPY package.json package-lock.json ./
# Explicitly unset production mode so devDependencies are installed
RUN NODE_ENV=development npm ci

# ── Copy source and build ─────────────────────────────────────────────────────
COPY . .
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/index.js"]
