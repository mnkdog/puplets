# Puplets Deployment Guide

## Deploying to Vercel with Stripe Integration

### Prerequisites
1. Vercel account ([signup here](https://vercel.com/signup))
2. Stripe account ([signup here](https://dashboard.stripe.com/register))
3. Git repository connected to Vercel

### Step 1: Get Stripe API Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click on "Developers" → "API keys"
3. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
4. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

**Important:** Use **test keys** for development/testing, and **live keys** only for production!

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? [Select your account]
# - Link to existing project? N
# - What's your project's name? puplets
# - In which directory is your code located? ./
```

#### Option B: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure project:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** (leave empty)
   - **Output Directory:** `src`

### Step 3: Add Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Production, Preview, Development |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Production, Preview, Development |

3. Click **Save**
4. Redeploy your application

### Step 4: Update Stripe Webhook URLs (Optional)

If you want to track order confirmations:

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Add endpoint: `https://your-app.vercel.app/api/webhook`
3. Select events: `checkout.session.completed`
4. Copy the webhook signing secret and add as `STRIPE_WEBHOOK_SECRET` env var

### Step 5: Test the Integration

1. Visit your deployed site: `https://your-app.vercel.app`
2. Add items to cart
3. Click "Checkout"
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
5. Complete checkout
6. Verify you're redirected to success page

### Test Card Numbers

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 9995 | Declined |
| 4000 0025 0000 3155 | Requires authentication |

### Going Live

1. Switch to **live mode** in Stripe Dashboard
2. Get your **live API keys** (`pk_live_...` and `sk_live_...`)
3. Update environment variables in Vercel with live keys
4. Enable your payment methods in Stripe
5. Update business settings (company info, bank account)

### Troubleshooting

**Error: "Failed to create checkout session"**
- Check that environment variables are set correctly
- Verify Stripe keys are valid
- Check Vercel function logs in dashboard

**Checkout button doesn't work**
- Open browser console to see errors
- Verify `/api/create-checkout-session` endpoint is accessible
- Check CORS settings if testing locally

**Payment succeeds but cart doesn't clear**
- Check that success.html is clearing localStorage
- Verify success URL is correct in API function

### Local Development with Vercel

```bash
# Install dependencies
npm install

# Install Vercel CLI
npm i -g vercel

# Link to your Vercel project
vercel link

# Pull environment variables
vercel env pull

# Start local development server
vercel dev

# Visit http://localhost:3000
```

### Support

- Vercel Docs: https://vercel.com/docs
- Stripe Docs: https://stripe.com/docs
- Stripe Test Mode: https://stripe.com/docs/testing
