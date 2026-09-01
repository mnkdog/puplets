Feature: Inventory Updates

  Background:
    Given Airtable Inventory table contains:
      | Product                          | SKU       | Quantity |
      | Blue Waterproof Collar - Medium | COL-BLU-M | 10       |
      | Red Waterproof Collar - Small   | COL-RED-S | 5        |

  Scenario: Inventory decrements when order contains matching product
    Given an order contains item "Blue Waterproof Collar - Medium" with quantity 2
    When webhook processes the order
    Then Inventory record with Product "Blue Waterproof Collar - Medium" has Quantity 8
    And that record's Last Updated timestamp is within last 10 seconds

  Scenario: Multiple items update multiple inventory records
    Given an order contains items:
      | description                        | quantity |
      | Blue Waterproof Collar - Medium   | 1        |
      | Red Waterproof Collar - Small     | 2        |
    When webhook processes the order
    Then Inventory record "Blue Waterproof Collar - Medium" has Quantity 9
    And Inventory record "Red Waterproof Collar - Small" has Quantity 3

  Scenario: Missing inventory product does not block order creation
    Given an order contains item "Green Waterproof Collar - Large" with quantity 1
    And Inventory table has no record for "Green Waterproof Collar - Large"
    When webhook processes the order
    Then order is created successfully in Orders table
    And error is logged stating product "Green Waterproof Collar - Large" not found in inventory
    And webhook responds with status 200
