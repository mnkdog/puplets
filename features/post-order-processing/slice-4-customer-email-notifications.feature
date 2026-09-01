Feature: Customer Confirmation Emails

  Scenario: Customer receives confirmation email after order creation
    Given order "PUP-a1b2c3d4" was created with:
      | Customer Email   | customer@example.com                  |
      | Customer Name    | Jane Smith                            |
      | Shipping Address | 123 Main St, London SW1A 1AA, UK      |
      | Items            | Blue Waterproof Collar - Medium (1)   |
      | Total            | £19.99                                |
    When webhook processes the order
    Then customer receives email at "customer@example.com" within 60 seconds
    And email subject is "Order Confirmation - Puplets Order PUP-a1b2c3d4"
    And email sender is "Puplets <hello@puplets.co.uk>"
    And email body contains "Order ID: PUP-a1b2c3d4"
    And email body contains itemized list:
      | Product                          | Quantity |
      | Blue Waterproof Collar - Medium | 1        |
    And email body contains "Total: £19.99"
    And email body contains "Shipping Address: 123 Main St, London SW1A 1AA, UK"
    And email body contains "Free delivery in 3-7 business days"

  Scenario: Email failure does not block order creation
    Given an order is being processed
    And Resend API returns error during email send
    When webhook attempts to send customer confirmation
    Then order is created successfully in Airtable
    And error is logged with order ID and "customer confirmation" label
    And webhook responds with status 200
