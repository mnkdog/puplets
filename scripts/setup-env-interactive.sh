#!/bin/bash
# Interactive Puplets Environment Setup
# This script will prompt you for each API key and set it in Vercel

set -e

echo "🚀 Puplets Environment Setup"
echo "=============================="
echo ""
echo "This script will help you set up all required environment variables."
echo "You'll need to get API keys from the following services:"
echo ""
echo "1. Stripe (https://dashboard.stripe.com/test/apikeys)"
echo "2. Resend (https://resend.com/api-keys)"
echo "3. Airtable (https://airtable.com/create/tokens)"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not installed!"
    echo "Install with: npm i -g vercel"
    exit 1
fi

# Check authentication
if ! vercel whoami &>/dev/null; then
    echo "❌ Not logged into Vercel!"
    echo "Run: vercel login"
    exit 1
fi

echo ""
echo "✓ Vercel CLI authenticated"
echo ""

# Helper function to set env var
set_env() {
    local var_name=$1
    local description=$2
    local example=$3

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$description"
    echo "Example: $example"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check if already set
    if vercel env ls production 2>/dev/null | grep -q "^$var_name"; then
        echo "✓ $var_name is already set"
        read -p "Update it? (y/N): " update
        if [[ ! $update =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    read -p "Enter $var_name: " value

    if [ -z "$value" ]; then
        echo "⚠ Skipping (empty value)"
        return
    fi

    echo "$value" | vercel env add "$var_name" production
    echo "✓ $var_name set!"
}

# Stripe
echo ""
echo "📦 STRIPE CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Go to: https://dashboard.stripe.com/test/apikeys"
echo ""

set_env "STRIPE_PUBLISHABLE_KEY" "Stripe Test Publishable Key" "pk_test_51abc..."
set_env "STRIPE_SECRET_KEY" "Stripe Test Secret Key" "sk_test_51abc..."

echo ""
echo "For webhook secret:"
echo "1. Go to: https://dashboard.stripe.com/test/webhooks"
echo "2. Add endpoint: https://puplets.co.uk/api/webhook-stripe"
echo "3. Listen to: checkout.session.completed"
echo "4. Copy the signing secret (whsec_...)"
echo ""

set_env "STRIPE_WEBHOOK_SECRET" "Stripe Webhook Signing Secret" "whsec_..."

# Resend
echo ""
echo "📧 RESEND CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Go to: https://resend.com/api-keys"
echo ""

set_env "RESEND_API_KEY" "Resend API Key" "re_..."
set_env "SHOP_OWNER_EMAIL" "Shop Owner Email (for order notifications)" "you@example.com"

# Airtable
echo ""
echo "📊 AIRTABLE CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Go to: https://airtable.com/create/tokens"
echo "Create a token with Orders base access"
echo ""

set_env "AIRTABLE_API_KEY" "Airtable Personal Access Token" "pat..."

echo ""
echo "For base ID:"
echo "Go to your Airtable Orders base URL"
echo "Extract the ID from: https://airtable.com/app.../..."
echo "It starts with 'app'"
echo ""

set_env "AIRTABLE_BASE_ID" "Airtable Base ID" "app..."

# CORS & URLs
echo ""
echo "🔐 CORS & URL CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

set_env "ALLOWED_ORIGINS" "Allowed CORS origins (comma-separated)" "https://puplets.co.uk"
set_env "PUBLIC_BASE_URL" "Public base URL" "https://puplets.co.uk"

# Done!
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Redeploy your site: vercel --prod"
echo "2. Test checkout at: https://puplets.co.uk"
echo "3. Use test card: 4242 4242 4242 4242"
echo ""
