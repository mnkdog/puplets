Feature: Shipping Notifications

  Background:
    Given Airtable Orders table contains order with:
      | Order ID         | PUP-a1b2c3d4           |
      | Customer Email   | customer@example.com   |
      | Customer Name    | Jane Smith             |
      | Status           | pending                |

  Scenario: Shop owner sends shipping update with tracking URL
    When shop owner calls "POST /api/send-shipping-update" with:
      | orderId     | PUP-a1b2c3d4                        |
      | trackingUrl | https://track.royalmail.com/123     |
    Then endpoint responds with status 200
    And response body is '{"success": true, "message": "Shipping notification sent"}'
    And customer receives email at "customer@example.com" within 60 seconds
    And email subject is "Your Puplets order has shipped - PUP-a1b2c3d4"
    And email body contains "Your order PUP-a1b2c3d4 has been dispatched"
    And email body contains clickable link "https://track.royalmail.com/123"
    And Orders table record "PUP-a1b2c3d4" has Status "shipped"
    And that record has Tracking URL "https://track.royalmail.com/123"

  Scenario: Shipping update without tracking URL
    When shop owner calls "POST /api/send-shipping-update" with:
      | orderId | PUP-a1b2c3d4 |
    Then endpoint responds with status 200
    And customer receives email stating "Your order has been dispatched"
    And email body does not contain tracking URL
    And Orders table record "PUP-a1b2c3d4" has Status "shipped"
    And that record has no Tracking URL

  Scenario: Non-existent order returns 404
    When shop owner calls "POST /api/send-shipping-update" with:
      | orderId | PUP-nonexistent |
    Then endpoint responds with status 404
    And response body contains error message "Order not found"
    And no email is sent

  Scenario: Request without bearer token returns 401
    When request is sent without Authorization header
    Then endpoint responds with status 401
    And response body contains error message "Unauthorized"
    And no order is updated

  Scenario: Request with invalid bearer token returns 401
    When request is sent with Authorization header "Bearer invalid-token"
    Then endpoint responds with status 401
    And response body contains error message "Unauthorized"
    And no order is updated

  Scenario: Request with missing orderId returns 400
    When shop owner calls "POST /api/send-shipping-update" with empty body
    Then endpoint responds with status 400
    And response body contains error message "Missing required field: orderId"
    And no order is updated

  Scenario: Request with invalid trackingUrl format returns 400
    When shop owner calls "POST /api/send-shipping-update" with:
      | orderId     | PUP-a1b2c3d4 |
      | trackingUrl | invalid-url  |
    Then endpoint responds with status 400
    And response body contains error message "Invalid URL format for trackingUrl"
    And no order is updated
