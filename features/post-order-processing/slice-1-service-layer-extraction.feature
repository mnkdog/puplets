Feature: Service Layer Abstractions

  Scenario: Airtable client creates order record
    Given Airtable client is initialized with base ID "appTest123"
    And Orders table schema is configured
    When createOrder is called with order data:
      | orderId      | PUP-abc123                  |
      | sessionId    | cs_test_xyz789              |
      | customerEmail| customer@example.com        |
      | total        | 19.99                       |
    Then client returns record with Airtable record ID
    And returned record contains Order ID "PUP-abc123"
    And returned record contains all provided fields
    And created order can be retrieved by session ID "cs_test_xyz789"

  Scenario: Airtable client finds order by session ID
    Given Orders table contains record with Stripe Session ID "cs_test_xyz789"
    When findOrderBySessionId is called with "cs_test_xyz789"
    Then client returns matching order record
    And record contains Order ID "PUP-abc123"

  Scenario: Email client sends customer confirmation
    Given Resend client is initialized with API key
    When sendCustomerConfirmation is called with:
      | to      | customer@example.com  |
      | subject | Order Confirmation... |
      | html    | <html>Order details   |
      | text    | Order details...      |
    Then client returns message ID
    And message ID is non-empty string
    And no error is thrown

  Scenario: Email template generates customer confirmation HTML
    Given order data:
      | orderId      | PUP-abc123                        |
      | items        | Blue Waterproof Collar - Medium (1)|
      | total        | £19.99                            |
      | address      | 123 Main St, London SW1A 1AA, UK |
    When generateCustomerConfirmation is called
    Then template returns object with subject, html, text fields
    And subject is "Order Confirmation - Puplets Order PUP-abc123"
    And html contains order ID, itemized products, total, address
    And html contains "Free delivery in 3-7 business days"
