Feature: Shopping Cart
  As a customer
  I want to manage items in my shopping cart
  So that I can review and modify my order before checkout

  Background:
    Given I am on the products page
    And I have selected a colour, size, and free charm
    And I have added an item to the cart

  Scenario: Viewing cart with items
    When I navigate to the cart page
    Then I should see my cart item
    And I should see the item's colour
    And I should see the item's size
    And I should see the item's free charm
    And I should see the item's price

  Scenario: Cart shows free shipping
    When I navigate to the cart page
    Then I should see "FREE" shipping
    And the total should equal the subtotal

  Scenario: Cart displays extra charms
    Given I have selected 2 extra charms
    And I have added an item to the cart
    When I navigate to the cart page
    Then I should see the extra charms listed by name
    And I should see the extra charms price

  Scenario: Removing item from cart
    When I navigate to the cart page
    And I click the "Remove" button
    Then the cart should be empty
    And I should see "Your cart is empty"
    And I should see a "Continue Shopping" link

  Scenario: Continue shopping from empty cart
    When I navigate to the cart page
    And I remove all items
    And I click "Continue Shopping"
    Then I should be on the products page

  Scenario: Editing cart item
    When I navigate to the cart page
    And I click the "Edit" button
    Then I should be on the products page
    And the form should be pre-filled with my selections
    And the button should say "Update Basket"

  Scenario: Updating cart item
    When I navigate to the cart page
    And I edit an item
    And I change the size
    And I click "Update Basket"
    And I navigate to the cart page
    Then I should see the updated size
    And I should see the updated price

  Scenario: Cart count badge
    When I add an item to the cart
    Then the cart badge should show "1"
    When I navigate to the homepage
    Then the cart badge should show "1"
    When I navigate to the about page
    Then the cart badge should show "1"

  Scenario: Multiple items in cart
    When I add another item to the cart
    And I navigate to the cart page
    Then I should see 2 items
    And the subtotal should be the sum of both items
