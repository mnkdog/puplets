Feature: Shop Owner Notifications

  Scenario: Shop owner receives notification for each new order
    Given order "PUP-xyz123" was created in Airtable with:
      | Customer Email   | customer@example.com                  |
      | Customer Name    | Jane Smith                            |
      | Shipping Address | 123 Main St, London SW1A 1AA, UK      |
      | Items            | [{"description":"Blue Waterproof Collar - Medium","quantity":1,"price":1999}] |
      | Total            | 19.99                                 |
    And order has Airtable record ID "recABC123"
    And SHOP_OWNER_EMAIL is "stephenmbrown@gmail.com"
    When webhook processes the order
    Then shop owner receives email at "stephenmbrown@gmail.com" within 60 seconds
    And email subject is "New Order - PUP-xyz123"
    And email body contains "Customer Email: customer@example.com"
    And email body contains "Customer Name: Jane Smith"
    And email body contains "Shipping Address: 123 Main St, London SW1A 1AA, UK"
    And email body contains "Blue Waterproof Collar - Medium (1)"
    And email body contains "Total: £19.99"
    And email body contains clickable Airtable link "https://airtable.com/.../recABC123"
