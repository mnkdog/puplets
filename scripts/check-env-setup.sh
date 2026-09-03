#!/bin/bash
# Environment Setup Checker for Puplets
# This script checks which environment variables are configured

echo "🔍 Checking Puplets environment setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MISSING=0

check_env() {
  local var_name=$1
  local description=$2
  local is_secret=$3

  if vercel env ls production 2>/dev/null | grep -q "^$var_name"; then
    echo -e "${GREEN}✓${NC} $var_name - $description"
  else
    echo -e "${RED}✗${NC} $var_name - $description"
    MISSING=$((MISSING + 1))

    if [ "$is_secret" = "true" ]; then
      echo "  └─ Set with: vercel env add $var_name production"
    else
      echo "  └─ Set with: vercel env add $var_name production"
    fi
  fi
}

# Check if vercel CLI is authenticated
if ! vercel whoami &>/dev/null; then
  echo -e "${RED}Vercel CLI not authenticated!${NC}"
  echo "Run: vercel login"
  exit 1
fi

echo "Checking required environment variables:"
echo ""

# Stripe
echo "📦 Stripe (Payment Processing)"
check_env "STRIPE_PUBLISHABLE_KEY" "Stripe test publishable key" false
check_env "STRIPE_SECRET_KEY" "Stripe test secret key" true
check_env "STRIPE_WEBHOOK_SECRET" "Stripe webhook signing secret" true
echo ""

# Email
echo "📧 Resend (Email Delivery)"
check_env "RESEND_API_KEY" "Resend API key" true
check_env "SHOP_OWNER_EMAIL" "Shop owner notification email" false
echo ""

# Airtable
echo "📊 Airtable (Order Database)"
check_env "AIRTABLE_API_KEY" "Airtable personal access token" true
check_env "AIRTABLE_BASE_ID" "Airtable base ID" false
echo ""

# CORS & URLs
echo "🔐 CORS & URLs"
check_env "ALLOWED_ORIGINS" "Allowed CORS origins" false
check_env "PUBLIC_BASE_URL" "Public base URL for redirects" false
echo ""

# Summary
if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✓ All environment variables configured!${NC}"
  echo ""
  echo "Ready to test checkout flow!"
else
  echo -e "${YELLOW}⚠ $MISSING environment variable(s) missing${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Get API keys from the services (see setup guide below)"
  echo "2. Run the commands shown above to set them"
  echo ""
fi

exit $MISSING
