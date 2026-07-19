Feature: Stripe Checkout Integration
  As a customer
  I want to pay securely with Stripe
  So that I can complete my purchase

  Background:
    Given I am on the products page
    And I have selected a colour, size, and free charm
    And I have added an item to the cart
    And I navigate to the cart page

  Scenario: Checkout button is visible
    Then I should see a "Checkout" button
    And the button should not be disabled

  Scenario: Clicking checkout initiates Stripe session
    When I click the "Checkout" button
    Then a Stripe checkout session should be created
    And I should be redirected to Stripe checkout

  Scenario: Successful payment redirects to success page
    Given I have completed checkout with Stripe
    When the payment is successful
    Then I should be redirected to the success page
    And I should see a "Thank you for your order" message
    And my cart should be empty

  Scenario: Cancelled payment redirects back
    Given I have started checkout with Stripe
    When I cancel the payment
    Then I should be redirected back to the cart page
    And my cart items should still be present
    And I should see a message about the cancelled payment

  Scenario: Checkout with multiple items
    Given I have 2 items in my cart
    When I click the "Checkout" button
    Then all cart items should be included in the Stripe session
    And the total amount should match the cart total

  Scenario: Checkout with collar and charms
    Given I have a collar in my cart
    And I have 3 individual charms in my cart
    When I click the "Checkout" button
    Then both product types should be in the Stripe session
    And the pricing should be correct for each item type
