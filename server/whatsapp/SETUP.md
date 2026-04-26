# WhatsApp Bot Setup Guide — AiTaxBot

Follow these steps once. After setup, the bot runs automatically forever.

---

## Step 1 — Create a Meta App

1. Go to **https://developers.facebook.com**
2. Click **My Apps → Create App**
3. Choose **Business** as the app type
4. Give it a name: `AiTaxBot`
5. Click **Create App**

---

## Step 2 — Add WhatsApp to the App

1. Inside your app dashboard, find **Add a Product**
2. Click **WhatsApp → Set Up**
3. You'll land on the WhatsApp API Setup page

---

## Step 3 — Register Your Phone Number

1. Under **From**, click **Add phone number**
2. Enter your AiTaxBot WhatsApp number (the feature phone number)
3. Choose **SMS** for OTP verification
4. Enter the OTP received on the feature phone
5. Your number is now registered ✅

> **Note:** Once registered with the API, this number can no longer use the regular WhatsApp app.
> It becomes exclusively the WhatsApp Business API line.

---

## Step 4 — Get Your Credentials

From the WhatsApp API Setup page, copy:

| Value | Where to find it |
|-------|-----------------|
| **Phone Number ID** | Shown under your registered number |
| **Temporary Access Token** | Shown on the same page (valid 24 hrs — get permanent one in Step 5) |

---

## Step 5 — Create a Permanent Access Token

The temporary token expires in 24 hours. Get a permanent one:

1. Go to **Meta Business Suite → Settings → Users → System Users**
   URL: https://business.facebook.com/settings/system-users
2. Click **Add** → name it `AiTaxBot Bot`
3. Set role: **Admin**
4. Click **Generate New Token**
5. Select your app (`AiTaxBot`)
6. Enable permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
7. Copy the generated token — **save it now**, it won't be shown again

---

## Step 6 — Set Environment Variables

Add these to your `.env` file on the server:

```
WHATSAPP_PHONE_NUMBER_ID=   # from Step 4
WHATSAPP_ACCESS_TOKEN=      # permanent token from Step 5
WHATSAPP_VERIFY_TOKEN=aitaxbot_wh_verify_2026
ADMIN_KEY=choose_any_secret_string
VITE_WHATSAPP_NUMBER=91XXXXXXXXXX   # your number in E.164 (no + or spaces)
```

---

## Step 7 — Register the Webhook

Your server must be live at `https://www.aitaxbot.co.in` before this step.

1. In Meta App Dashboard → WhatsApp → Configuration
2. Under **Webhook**, click **Edit**
3. Set **Callback URL**: `https://www.aitaxbot.co.in/api/webhook/whatsapp`
4. Set **Verify token**: `aitaxbot_wh_verify_2026` (must match your env var)
5. Click **Verify and Save**
6. Under **Webhook fields**, enable: `messages`
7. Click **Subscribe**

---

## Step 8 — Deploy and Test

1. Push to production: `git push origin main`
2. Send a WhatsApp message to your AiTaxBot number from any phone
3. The bot should reply within 2–3 seconds

**Test messages to try:**
- `Hi` → Welcome + name prompt
- `HRA` → HRA calculator link
- `80C limit` → FAQ answer
- `menu` → Full tool menu

---

## Step 9 — View CRM Leads

To see everyone who has messaged AiTaxBot on WhatsApp:

```
GET https://www.aitaxbot.co.in/api/whatsapp/leads?key=YOUR_ADMIN_KEY
```

Returns JSON with all leads sorted by most recent contact.

---

## File Structure

```
server/whatsapp/
├── botLogic.ts        — Bot brain: keyword engine, FAQ, state machine, Meta API calls
├── whatsappRoutes.ts  — Express webhook routes (GET verify + POST messages + GET leads)
├── leadsStore.ts      — JSON-file CRM: read/write leads.json
├── leads.json         — Auto-created on first message (do not delete)
└── SETUP.md           — This file
```

---

## Free Tier Limits (Meta WhatsApp Cloud API)

| Metric | Free Limit |
|--------|-----------|
| Conversations/month | 1,000 |
| Messages per conversation | Unlimited |
| API calls | Unlimited |
| Cost after free tier | ~₹0.40–0.60 per conversation |

At AiTaxBot's current scale, you will stay within the free tier for months.
