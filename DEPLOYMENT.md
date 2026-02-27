# 🚀 AiTaxBot Deployment Guide

## 📋 Overview
This guide explains how to deploy AiTaxBot to GitHub while keeping all sensitive credentials secure.

## 🔒 Security First Approach
**NEVER commit sensitive information to GitHub!** This includes:
- API keys and secrets
- Database credentials
- Firebase service account files
- User uploaded documents
- Access tokens

---

## 🛠️ Pre-Deployment Checklist

### 1. ✅ Verify .gitignore
The `.gitignore` file is already configured to exclude:
- ✓ Environment variables (`.env` files)
- ✓ Uploaded documents (`uploads/`, `*.pdf`)
- ✓ Firebase credentials (`firebase-adminsdk-*.json`)
- ✓ Database files
- ✓ IDE and temporary files

**Action Required:** None - already configured!

### 2. ✅ Document Environment Variables
A `.env.example` file has been created documenting all required environment variables **without actual values**.

**Action Required:** Review `.env.example` to ensure all variables are documented.

---

## 📦 Deploy to GitHub

### Step 1: Initialize Git Repository (if not already done)
```bash
git init
git add .
git commit -m "Initial commit - AiTaxBot"
```

### Step 2: Create GitHub Repository
1. Go to https://github.com/new
2. Create a new **private repository** (recommended for security)
3. Do NOT initialize with README (we already have code)
4. Copy the repository URL

### Step 3: Connect and Push
```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push your code
git push -u origin main
```

**Note:** If prompted for credentials:
- Username: Your GitHub username
- Password: Use a [Personal Access Token](https://github.com/settings/tokens) (NOT your GitHub password)

### Step 4: Verify Security
After pushing, visit your GitHub repository and verify:
- ❌ NO `.env` files are visible
- ❌ NO API keys or secrets in code
- ❌ NO uploaded PDF documents
- ❌ NO Firebase credentials
- ✅ `.env.example` IS visible (this is safe)
- ✅ `.gitignore` IS visible

---

## 🔐 Managing Secrets on Replit

### Current Secrets (Set in Replit Secrets Tool)
Your application uses these environment variables stored in **Replit Secrets**:

#### Required Secrets:
1. **DATABASE_URL** - PostgreSQL connection string
2. **ZERODHA_API_KEY** - Zerodha Kite Connect API Key
3. **ZERODHA_API_SECRET** - Zerodha Kite Connect API Secret
4. **GOOGLE_API_KEY** - Google Gemini AI API Key

#### Optional Secrets (for enhanced features):
5. **ADOBE_CLIENT_ID** - Adobe PDF Services
6. **ADOBE_CLIENT_SECRET** - Adobe PDF Services
7. **ALPHA_VANTAGE_API_KEY** - Stock market data
8. **FINNHUB_API_KEY** - Stock market data
9. **NEWS_API_KEY** - News integration
10. **SERPAPI_API_KEY** - Google News search

### How to Add/Update Secrets in Replit:
1. Open your Replit workspace
2. Click on the **🔒 Secrets** icon in the left sidebar (Tools panel)
3. Click **"Add a new secret"**
4. Enter the **Key** (e.g., `ZERODHA_API_KEY`)
5. Enter the **Value** (your actual API key)
6. Click **"Add secret"**

**Important:** Secrets are encrypted and NOT stored in your code or GitHub repository!

---

## 🌐 Deploying to Production

### Option 1: Replit Deployments (Recommended)
1. Click the **"Deploy"** button in Replit
2. Configure your deployment settings
3. Replit will automatically use your Secrets
4. Your app will be published with a `.replit.app` domain

### Option 2: Deploy from GitHub to Other Platforms

#### Deploying to Vercel:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel Dashboard:
# Settings → Environment Variables
```

#### Deploying to Render:
1. Connect your GitHub repository
2. Set environment variables in Render Dashboard
3. Copy all variables from `.env.example`
4. Fill in actual values

#### Deploying to Railway:
1. Connect GitHub repository
2. Add environment variables in Railway Dashboard
3. Deploy automatically on git push

**Important:** For ANY platform, you must manually configure environment variables in their dashboard using the keys from `.env.example`.

---

## 🔄 Updating Your Deployment

### When You Make Code Changes:
```bash
# Commit your changes
git add .
git commit -m "Description of changes"
git push origin main
```

### When You Add New Environment Variables:
1. **Update `.env.example`** with the new variable (no actual value)
2. **Commit the change** to `.env.example`
3. **Add the actual secret** to Replit Secrets (or your deployment platform)
4. Restart your application

---

## ⚠️ Security Best Practices

### ✅ DO:
- Store all secrets in Replit Secrets or deployment platform's environment variables
- Use `.env.example` to document required variables
- Keep GitHub repository private for sensitive projects
- Regularly rotate API keys and secrets
- Use strong, unique credentials for each service
- Review `.gitignore` before every commit

### ❌ DON'T:
- Commit `.env` files to Git
- Hardcode API keys in source code
- Share secrets in chat/email/Slack
- Use production credentials in development
- Commit uploaded user documents
- Push Firebase service account JSON files

---

## 🧪 Testing After Deployment

### Verify Environment Variables are Loaded:
```bash
# In Replit Shell
echo $ZERODHA_API_KEY
# Should show your API key (means it's loaded)
```

### Test Critical Features:
1. ✅ Database connection works
2. ✅ Zerodha authentication flow works
3. ✅ PDF processing with Google AI works
4. ✅ Market data endpoints work

---

## 🆘 Troubleshooting

### "Environment variable not found" errors:
- **Cause:** Secret not configured in deployment platform
- **Fix:** Add the variable to Replit Secrets or platform's environment variables

### "The user is not enabled for the app" (Zerodha):
- **Cause:** Your Zerodha account isn't authorized for the Kite Connect app
- **Fix:** Enable your account in [Kite Connect Developer Portal](https://developers.kite.trade/)

### "Database connection failed":
- **Cause:** DATABASE_URL not set or incorrect
- **Fix:** Verify DATABASE_URL in Replit Secrets matches your database connection string

### Code is on GitHub but app doesn't work:
- **Cause:** Environment variables not configured on deployment platform
- **Fix:** Copy all variables from `.env.example` and set actual values in platform's dashboard

---

## 📚 Additional Resources

### API Key Registration:
- **Zerodha Kite Connect:** https://developers.kite.trade/
- **Google AI Studio:** https://aistudio.google.com/apikey
- **Adobe PDF Services:** https://developer.adobe.com/
- **Alpha Vantage:** https://www.alphavantage.co/support/#api-key
- **Finnhub:** https://finnhub.io/register
- **News API:** https://newsapi.org/register
- **SerpAPI:** https://serpapi.com/

### GitHub Resources:
- **Personal Access Tokens:** https://github.com/settings/tokens
- **Repository Security:** https://docs.github.com/en/code-security

---

## 🎯 Quick Deployment Command Reference

```bash
# First time setup
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main

# Regular updates
git add .
git commit -m "Your update message"
git push origin main

# Check what will be committed (before git add)
git status

# View what's ignored (should include .env)
git status --ignored
```

---

## ✅ Deployment Complete!

Your code is now safely on GitHub with all sensitive information protected. 🎉

**Remember:** 
- Secrets stay in Replit/deployment platform
- Code goes to GitHub
- Never mix the two!

---

*Last Updated: October 2025*
