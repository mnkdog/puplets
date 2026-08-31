Feature: Stripe Webhook Order Capture

  Background:
    Given Airtable base is configured with Orders table
    And webhook endpoint is "https://puplets.vercel.app/api/webhook-stripe"

  Scenario: Successful order capture from Stripe webhook
    Given a Stripe checkout session completed with ID "cs_test_a1b2c3d4e5f6g7h8"
    And session contains customer email "customer@example.com"
    And session contains customer name "Jane Smith"
    And session contains shipping address "123 Main St, London SW1A 1AA, UK"
    And session contains line items:
      | description                        | quantity | price |
      | Blue Waterproof Collar - Medium   | 1        | 1999  |
    And session amount_total is 1999
    When Stripe sends "checkout.session.completed" webhook with valid signature
    Then webhook responds with status 200
    And Airtable Orders table contains record with Order ID "PUP-e5f6g7h8"
    And that record has Stripe Session ID "cs_test_a1b2c3d4e5f6g7h8"
    And that record has Customer Email "customer@example.com"
    And that record has Customer Name "Jane Smith"
    And that record has Shipping Address "123 Main St, London SW1A 1AA, UK"
    And that record has Items '[{"description":"Blue Waterproof Collar - Medium","quantity":1,"price":1999}]'
    And that record has Total 19.99
    And that record has Status "pending"
    And that record has Created timestamp within last 10 seconds

  Scenario: Webhook signature validation rejects invalid signature
    Given a Stripe webhook payload with session ID "cs_test_invalid123"
    When webhook receives request with invalid signature
    Then webhook responds with status 401
    And no record is created in Airtable Orders table

  Scenario: Idempotency prevents duplicate order creation
    Given Stripe session "cs_test_a1b2c3d4e5f6g7h8" already processed
    And Airtable Orders table contains record with Order ID "PUP-e5f6g7h8"
    When Stripe sends duplicate "checkout.session.completed" webhook for same session
    Then webhook responds with status 200
    And Airtable Orders table still contains exactly 1 record with Order ID "PUP-e5f6g7h8"
    And that record's Created timestamp has not changed

  Scenario: Airtable API failure triggers Stripe retry
    Given a Stripe checkout session completed with ID "cs_test_xyz789"
    And Airtable API returns 500 error
    When Stripe sends "checkout.session.completed" webhook
    Then webhook responds with status 500
    And error is logged with Stripe session ID "cs_test_xyz789"
