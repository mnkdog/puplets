# Set up E-commerce Environment Variables for Production

## Overview
The Puplets website has full e-commerce functionality (Stripe checkout, email notifications, order storage) but requires environment variables to be configured in Vercel for the production deployment.

**Current Status:** Checkout fails with "Server configuration error" because environment variables are not set.

**Time Estimate:** 10-15 minutes

## What Needs to Be Done

Configure 8 environment variables in Vercel to enable:
- ✅ Stripe payment processing
- ✅ Customer order confirmation emails
- ✅ Shop owner order notification emails  
- ✅ Order storage in Airtable

## Prerequisites

You'll need accounts/access to:
- [ ] Stripe (https://stripe.com) - Free test account
- [ ] Resend (https://resend.com) - Free tier: 3k emails/month
- [ ] Airtable (https://airtable.com) - Free tier
- [ ] Vercel (https://vercel.com) - Already have this

## Setup Instructions

### Option 1: Automated Setup (Recommended - 5 minutes)

**Run this script locally:**

```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Run the setup script from this repo
bash scripts/setup-env-interactive.sh
```

### Option 2: Manual Setup via Vercel Dashboard (10 minutes)

Go to: https://vercel.com/mnkdog/puplets/settings/environment-variables

Add each of these for **Production** environment:

#### 1. Stripe Keys

Get from: https://dashboard.stripe.com/test/apikeys

```
STRIPE_PUBLISHABLE_KEY = pk_test_...
STRIPE_SECRET_KEY = sk_test_...  (keep secret!)
```

#### 2. Stripe Webhook Secret

Get from: https://dashboard.stripe.com/test/webhooks

1. Click "Add endpoint"
2. URL: `https://puplets.co.uk/api/webhook-stripe`
3. Events: Select `checkout.session.completed`
4. Copy signing secret:

```
STRIPE_WEBHOOK_SECRET = whsec_...
```

#### 3. Resend Email API

Get from: https://resend.com/api-keys

1. Create new API key
2. Verify domain: `puplets.co.uk`

```
RESEND_API_KEY = re_...
SHOP_OWNER_EMAIL = your-email@example.com
```

#### 4. Airtable Database

Get from: https://airtable.com/create/tokens

1. Create personal access token with Orders base access
2. Get base ID from your Airtable URL (starts with `app`)

```
AIRTABLE_API_KEY = pat...
AIRTABLE_BASE_ID = app...
```

#### 5. CORS & URLs

```
ALLOWED_ORIGINS = https://puplets.co.uk
PUBLIC_BASE_URL = https://puplets.co.uk
```

### After Setup

**Redeploy the site:**

```bash
vercel --prod
```

**Test the checkout flow:**

1. Visit https://puplets.co.uk/collar.html
2. Add item to cart
3. Checkout with test card: `4242 4242 4242 4242`
4. Verify emails arrive (customer + shop owner)
5. Check order appears in Airtable

## Acceptance Criteria

- [ ] All 8 environment variables set in Vercel
- [ ] Site redeployed to production
- [ ] Test checkout completes successfully
- [ ] Customer confirmation email received
- [ ] Shop owner notification email received
- [ ] Order recorded in Airtable
- [ ] Stripe webhook logs show successful events

## Troubleshooting

**"Server configuration error"**
- Missing `ALLOWED_ORIGINS` or `STRIPE_SECRET_KEY`
- Check Vercel function logs: `vercel logs api/create-checkout-session`

**Emails not arriving**
- Verify domain in Resend dashboard
- Check spam folder
- View sent emails at: https://resend.com/emails

**Webhook not firing**
- Check endpoint URL is exactly: `https://puplets.co.uk/api/webhook-stripe`
- Verify event is `checkout.session.completed`
- Test with: `stripe trigger checkout.session.completed`

## Related Files

- Triage report: `.dev-team-reports/triage/checkout-fails-missing-env-vars.md`
- API files: `api/create-checkout-session.js`, `api/webhook-stripe.js`
- Email service: `services/email-client.js`
- Setup scripts: `scripts/setup-env-interactive.sh`, `scripts/check-env-setup.sh`

---

**Labels:** `enhancement`, `production`, `configuration`
**Priority:** Medium (site works but checkout is broken)
**Effort:** Small (~15 minutes)
