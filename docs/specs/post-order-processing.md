---
id: post-order-processing
created: 2026-08-30
status: draft
---

# Post-Order Processing System

## Intent

**Problem**: Currently after Stripe checkout completes, the success page displays but no actual order processing occurs. Customers see promises of confirmation emails and tracking information, but these are not delivered. Shop owner has no visibility into orders. Inventory is not tracked or updated.

**Goal**: Implement a complete post-order processing system that:
- Captures order details in Airtable when Stripe checkout completes
- Sends confirmation email to customer with order details
- Sends notification email to shop owner for each new order
- Updates inventory levels in Airtable after each purchase
- Provides mechanism for shop owner to send shipping notifications to customers
- Enables non-technical user (daughter) to view and manage orders through Airtable's spreadsheet-like interface

**Constraints**:
- Must work on Vercel serverless (ephemeral filesystem - no persistent local file storage)
- Low volume expected initially (daughter's small business)
- Must be simple enough for non-technical user to manage
- Should support future multi-channel expansion (website, craft fairs, TikTok Shop) but manual inventory sync acceptable for now

**Success criteria**: 
- Customer receives detailed confirmation email within 1 minute of checkout
- Shop owner receives order notification email within 1 minute of checkout
- Order appears in Airtable Orders table immediately after checkout
- Inventory quantity in Airtable decrements by purchased amount immediately after checkout
- Shop owner can send shipping update to customer via simple API endpoint
- Each order processed exactly once (webhook idempotency)

## Architecture Specification

### System Components

**New Components**:
1. **api/webhook-stripe.js** - Vercel serverless function handling Stripe `checkout.session.completed` webhook
   - Verifies Stripe webhook signature for security
   - Creates order record in Airtable Orders table
   - Updates inventory quantities in Airtable Inventory table
   - Triggers confirmation email to customer via Resend
   - Triggers notification email to shop owner via Resend
   - Implements idempotency to prevent duplicate order processing
   
2. **api/send-shipping-update.js** - Vercel serverless function for manual shipping notifications
   - Accepts order ID and optional tracking URL
   - Fetches order details from Airtable
   - Sends shipping notification email to customer via Resend
   - Updates order status to "shipped" in Airtable

**External Services**:
- **Stripe**: Payment processing (already integrated), provides webhook events
- **Airtable**: Database for orders and inventory, provides built-in spreadsheet UI for management
- **Resend**: Email delivery service

**Modified Components**:
- None (success.html remains static, webhook handles all processing)

### Data Model

**Airtable Base Structure**:

**Orders Table**:
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| Order ID | Single line text | Format: `PUP-{last-8-chars-of-stripe-session-id}` | `PUP-a1b2c3d4` |
| Stripe Session ID | Single line text | Full Stripe checkout session ID | `cs_test_a1b2c3d4e5f6...` |
| Customer Email | Email | Customer's email address from Stripe | `customer@example.com` |
| Customer Name | Single line text | Customer's name from Stripe shipping | `Jane Smith` |
| Shipping Address | Long text | Full shipping address from Stripe | `123 Main St\nLondon SW1A 1AA\nUK` |
| Items | Long text | JSON array of purchased items | `[{"description":"Blue Waterproof Collar - Medium","quantity":1,"price":1999}]` |
| Total | Currency (GBP) | Order total in pounds | `£19.99` |
| Status | Single select | Order status | Options: `pending`, `shipped`, `delivered` |
| Created | Date and time | Order creation timestamp | `2026-08-30 14:23:00` |
| Tracking URL | URL | Shipping tracking link (optional) | `https://track.royalmail.com/...` |
| Notes | Long text | Internal notes (optional) | `Gift wrap requested` |

**Inventory Table**:
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| Product | Single line text | Product identifier matching Stripe | `Blue Waterproof Collar - Medium` |
| SKU | Single line text | Stock keeping unit | `COL-BLU-M` |
| Quantity | Number | Current stock level | `15` |
| Low Stock Alert | Number | Threshold for low stock warning | `5` |
| Last Updated | Date and time | Last inventory change timestamp | `2026-08-30 14:23:00` |

### Integration Points

**Stripe → Webhook Handler**:
- Event type: `checkout.session.completed`
- Webhook URL: `https://puplets.vercel.app/api/webhook-stripe`
- Security: Stripe signature verification using `STRIPE_WEBHOOK_SECRET`

**Webhook Handler → Airtable**:
- API: Airtable REST API via official Node.js SDK (`airtable` package)
- Authentication: API key in `AIRTABLE_API_KEY` environment variable
- Base ID: `AIRTABLE_BASE_ID` environment variable

**Webhook Handler → Resend**:
- API: Resend REST API via official Node.js SDK (`resend` package)
- Authentication: API key in `RESEND_API_KEY` environment variable
- Sender: From address must be verified domain or Resend sandbox

**Shipping Update Endpoint → Airtable + Resend**:
- Same authentication as webhook handler
- Triggered manually by shop owner when order ships

### Environment Variables

Required in Vercel project settings:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
AIRTABLE_API_KEY=key...
AIRTABLE_BASE_ID=app...
RESEND_API_KEY=re_...
SHOP_OWNER_EMAIL=stephenmbrown@gmail.com
```

### Error Handling Strategy

**Webhook Processing Failures**:
- Log full error details including Stripe session ID
- Return 500 status to Stripe (triggers automatic retry)
- Stripe retries failed webhooks for up to 3 days
- Shop owner receives error notification email for critical failures

**Email Delivery Failures**:
- Log error but don't block order creation
- Order still saved to Airtable even if email fails
- Shop owner can resend emails manually from Airtable

**Inventory Update Failures**:
- Log error with product details
- Order still created (inventory can be corrected manually)
- Future enhancement: Stock check before checkout

**Airtable API Rate Limits**:
- Free tier: 5 requests per second per base
- Expected load: Low volume, well within limits
- Future: Implement request queuing if volumes increase

## Acceptance Criteria

1. **Order Capture in Airtable**
   - WHEN a customer completes Stripe checkout
   - THEN a new record appears in Airtable Orders table within 10 seconds
   - AND the record contains Order ID in format `PUP-{last-8-chars}` (e.g. `PUP-a1b2c3d4`)
   - AND the record contains customer email from Stripe session
   - AND the record contains customer name from Stripe shipping details
   - AND the record contains full shipping address from Stripe
   - AND the record contains Items as JSON array with description, quantity, and price for each item
   - AND the record contains Total matching Stripe session amount_total converted to pounds
   - AND the record has Status set to `pending`
   - AND the record has Created timestamp of when webhook processed the order

2. **Customer Confirmation Email**
   - WHEN an order is created in Airtable
   - THEN customer receives email within 60 seconds
   - AND email subject line is "Order Confirmation - Puplets Order {Order ID}" (e.g. "Order Confirmation - Puplets Order PUP-a1b2c3d4")
   - AND email body contains Order ID in format `PUP-{last-8-chars}`
   - AND email body contains itemized list showing each product description and quantity
   - AND email body contains total amount in pounds with £ symbol (e.g. "£19.99")
   - AND email body contains full shipping address as entered at checkout
   - AND email body states "Free delivery in 3-7 business days"
   - AND email sender is "Puplets <hello@puplets.co.uk>" (or verified domain)

3. **Shop Owner Notification Email**
   - WHEN an order is created in Airtable
   - THEN shop owner receives email at stephenmbrown@gmail.com within 60 seconds
   - AND email subject line is "New Order - {Order ID}" (e.g. "New Order - PUP-a1b2c3d4")
   - AND email body contains customer email address
   - AND email body contains customer name
   - AND email body contains full shipping address
   - AND email body contains itemized list of products and quantities
   - AND email body contains total amount in pounds with £ symbol
   - AND email body contains direct link to order record in Airtable (e.g. "https://airtable.com/app.../tbl.../rec...")

4. **Inventory Updates**
   - WHEN an order contains item "Blue Waterproof Collar - Medium" with quantity 2
   - AND Inventory table has record with Product "Blue Waterproof Collar - Medium" and Quantity 10
   - THEN after order processing, that Inventory record Quantity is decremented to 8
   - AND Inventory record Last Updated timestamp is set to current time
   - AND if an order item has no matching Inventory record, order still completes but error is logged

5. **Shipping Update Mechanism**
   - WHEN shop owner calls `POST /api/send-shipping-update` with body `{"orderId": "PUP-a1b2c3d4", "trackingUrl": "https://track.royalmail.com/123"}`
   - AND Orders table contains record with Order ID "PUP-a1b2c3d4" and Status "pending"
   - THEN customer receives email within 60 seconds
   - AND email subject is "Your Puplets order has shipped - {Order ID}"
   - AND email body states "Your order {Order ID} has been dispatched"
   - AND email body contains clickable tracking URL "https://track.royalmail.com/123"
   - AND Orders table record Status updates to "shipped"
   - AND Orders table record Tracking URL updates to "https://track.royalmail.com/123"
   - AND endpoint returns 200 status with JSON `{"success": true, "message": "Shipping notification sent"}`

6. **Shipping Update Without Tracking**
   - WHEN shop owner calls `POST /api/send-shipping-update` with body `{"orderId": "PUP-a1b2c3d4"}`
   - THEN customer receives email stating "Your order has been dispatched" with no tracking URL
   - AND Orders table record Status updates to "shipped" with no Tracking URL

7. **Order Management via Airtable UI**
   - WHEN shop owner or daughter opens Airtable base in browser
   - THEN they see Orders table with all fields visible in spreadsheet view
   - AND they can filter orders by Status (pending, shipped, delivered)
   - AND they can edit Notes field to add internal comments
   - AND they can manually change Status from "shipped" to "delivered" when confirmed
   - AND they see Inventory table with current stock levels
   - AND they can manually adjust Quantity field if stock count corrected

8. **Webhook Idempotency**
   - WHEN Stripe sends same `checkout.session.completed` event twice (retry scenario)
   - AND first webhook already created order with Order ID "PUP-a1b2c3d4"
   - THEN second webhook does not create duplicate order
   - AND second webhook does not decrement inventory again
   - AND second webhook does not send duplicate emails
   - AND second webhook returns 200 status (acknowledging receipt)

9. **Error Handling - Email Failure**
   - WHEN Resend API returns error during email send
   - THEN order still saves to Airtable Orders table
   - AND inventory still updates correctly
   - AND error is logged with order ID and email type (customer/owner)
   - AND webhook returns 200 to Stripe (order processed despite email failure)

10. **Error Handling - Airtable Failure**
    - WHEN Airtable API returns error during order creation
    - THEN webhook logs full error including Stripe session ID
    - AND webhook returns 500 status to Stripe
    - AND Stripe automatically retries webhook delivery
    - AND shop owner receives error notification email with Stripe session ID for manual recovery

11. **Out of Scope for Initial Release**
    - Multi-channel inventory sync (craft fair SumUp sales, TikTok Shop) - manual adjustment acceptable
    - Stock level checks at checkout (out-of-stock products still purchasable)
    - Automatic low stock alerts when Quantity falls below Low Stock Alert threshold
    - Customer tracking page on website (customers use Royal Mail tracking directly)
    - Refund/cancellation workflow (handled manually via Stripe dashboard)

## Ambiguity Log

| # | Question | Decision | Rationale | Stakeholder Input? |
|---|----------|----------|-----------|-------------------|
| 1 | How to generate unique order IDs? | Use `PUP-{last-8-chars-of-stripe-session-id}` format | Stripe session IDs are globally unique, last 8 chars sufficient for human readability, ties order directly to payment, no state management required | ✅ Yes - user confirmed "simple is good" |
| 2 | What email service to use? | Resend | Simplest API, best free tier (3,000 emails/month), no credit card required for signup, Node.js SDK available | ✅ Yes - user had no preference, prioritized simplicity |
| 3 | How to store orders and inventory? | Airtable | Solves both storage AND UI needs, free tier sufficient (1,200 records, 5 req/sec), built-in spreadsheet interface for non-technical user, no custom admin panel needed | ✅ Yes - user confirmed "sounds like the way to go" |
| 4 | Should we prevent checkout if out of stock? | No - show as out of stock but don't block purchase | Simpler implementation, daughter can fulfill from supplier, avoid lost sales | ⚠️ Inference - low volume means manual fulfillment acceptable |
| 5 | How should multi-channel inventory sync work? | Manual adjustment in Airtable for now | Craft fair and TikTok Shop sales expected to be low volume initially, automated sync adds complexity not justified by current scale | ✅ Yes - user confirmed "manual for now" |
| 6 | Should shipping update endpoint require authentication? | Yes - simple bearer token in environment variable | Prevent spam/abuse of customer emails, balance security with simplicity (no OAuth needed for shop owner-only endpoint) | ⚠️ Inference - standard practice for API endpoints |
| 7 | What happens if customer changes order after checkout? | Not supported - customer must email shop owner | Adds significant complexity (payment adjustment, inventory reallocation), low volume makes manual handling acceptable | ⚠️ Inference - standard e-commerce practice |
| 8 | Should we send order confirmation to shop owner AND customer? | Yes - separate emails for each | Shop owner needs immediate notification to start fulfillment, customer needs confirmation for records, different information needs (shop owner gets Airtable link) | ✅ Yes - user explicitly requested both |
| 9 | What should happen if Airtable is down during checkout? | Return 500 to Stripe, let Stripe retry | Stripe retries webhooks for up to 3 days, better to retry than lose order, shop owner gets error notification for manual intervention if needed | ⚠️ Inference - standard webhook pattern |
| 10 | Should system support multiple shop owners? | No - single shop owner email from environment variable | Daughter's business has single owner, multi-user support adds unnecessary complexity | ⚠️ Inference - stated as "daughter's small business" |

## Test Strategy

### Unit Tests
- `api/webhook-stripe.js`:
  - Verify Stripe signature validation (valid signature → process, invalid → reject)
  - Test order creation payload transformation (Stripe session → Airtable record structure)
  - Test inventory lookup and update logic (quantity decrement, product matching)
  - Test idempotency (same session ID processed twice → single order)
- `api/send-shipping-update.js`:
  - Test order lookup (existing order → found, non-existent → 404)
  - Test status update (pending → shipped)
  - Test email payload generation (with and without tracking URL)

### Integration Tests
- Stripe webhook → Airtable → Resend end-to-end flow:
  - Mock Stripe webhook event with complete session data
  - Verify order appears in Airtable with all fields populated correctly
  - Verify customer email sent via Resend with correct content
  - Verify shop owner email sent via Resend with correct content and Airtable link
  - Verify inventory decremented in Airtable
- Shipping update endpoint → Airtable → Resend:
  - Call endpoint with valid order ID and tracking URL
  - Verify order status updated in Airtable
  - Verify customer receives shipping email with tracking link

### Manual Testing Checklist
- [ ] Complete real Stripe test checkout with valid product
- [ ] Verify order appears in Airtable within 10 seconds with correct Order ID format
- [ ] Verify customer receives confirmation email at address used in checkout
- [ ] Verify shop owner receives notification email at stephenmbrown@gmail.com
- [ ] Verify inventory quantity decremented by purchased amount
- [ ] Call shipping update endpoint with order ID and tracking URL
- [ ] Verify customer receives shipping notification email
- [ ] Verify order status changed to "shipped" in Airtable
- [ ] Verify Airtable UI accessible and editable by non-technical user
- [ ] Test webhook idempotency by resending same Stripe event (should not duplicate)

### Error Scenarios to Test
- [ ] Airtable API returns 500 → webhook returns 500 to Stripe, error logged
- [ ] Resend API returns error → order still saved, error logged, webhook returns 200
- [ ] Shipping update called for non-existent order → returns 404
- [ ] Inventory product not found → order still created, error logged
- [ ] Invalid Stripe signature → webhook rejects with 401

## Dependencies

**NPM Packages** (add to package.json):
```json
{
  "dependencies": {
    "stripe": "^14.0.0",
    "airtable": "^0.12.0",
    "resend": "^3.0.0"
  }
}
```

**External Service Accounts Required**:
- Stripe account (already exists)
- Airtable account (user has existing account from years ago)
- Resend account (needs creation)

**Vercel Configuration**:
- Environment variables must be set in Vercel project settings
- Webhook endpoint must be registered in Stripe dashboard
- Domain must be verified in Resend (or use sandbox for testing)

## Migration Notes

**No data migration required** - this is a greenfield feature. Existing success.html continues to work as-is. Orders before webhook deployment will have no Airtable records (acceptable for new business with no order history).

**Rollback plan**: If webhook causes issues, remove webhook from Stripe dashboard. Success page still works, just no order processing (same as current state).

## Out of Scope

Explicitly deferred to future iterations:
1. Airtable as CMS for website content (separate spec needed)
2. Multi-channel inventory sync automation (SumUp, TikTok Shop)
3. Automatic low stock alerts
4. Stock level validation at checkout
5. Customer self-service order tracking page
6. Automated refund/cancellation handling
7. Customer account system
8. Order history for returning customers

## Consistency Gate

**Cross-reference validation**:
1. ✅ All components in Architecture → mentioned in Acceptance Criteria
2. ✅ All external services (Stripe, Airtable, Resend) → documented in Integration Points
3. ✅ All environment variables → listed in Dependencies section
4. ✅ All Airtable fields in Data Model → referenced in Acceptance Criteria tests
5. ✅ All error scenarios in Error Handling Strategy → covered in Test Strategy
6. ✅ All Ambiguity Log decisions → traceable to requirements or user input

All checks passed.
