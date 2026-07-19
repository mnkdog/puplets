Feature: Product Page with Customization
  As a customer visiting the website
  I want to easily select my collar's colour, size, and free charm on a single page
  So that I can customise and purchase the perfect collar for my dog quickly and securely

  Background:
    Given I am on a product page

  Scenario: Viewing core product selection options
    When I view the purchasing options
    Then I should see a colour selection with 3 options
    And I should see a size selection with XS, S, and M options
    And I should see size measurements in cm and inches
    And I should see a free charm selector

  Scenario: Add to Basket button is disabled until all options selected
    When I have not selected all required options
    Then the "Add to Basket" button should be disabled
    When I select a colour
    And I select a size
    And I select a free charm
    Then the "Add to Basket" button should be enabled

  Scenario: Dynamic pricing based on size
    Given I have selected a colour and free charm
    When I change the size selection
    Then the displayed price should update accordingly

  Scenario: Adding items to cart
    Given I have selected a colour, size, and free charm
    When I click the "Add to Basket" button
    Then the item should be added to my cart
    And the cart count should increase

  Scenario: Viewing optional extra charms section
    When I scroll below the primary selection area
    Then I should see an "Add Extra Charms" section
    And I should be able to select additional charms

  @skip
  Scenario: Out of stock handling
    Given a specific colour and size combination is out of stock
    When I select that combination
    Then the variant selector should show "Out of Stock"
    And the "Add to Basket" button should show "Out of Stock"
    And the "Add to Basket" button should be disabled

  Scenario: Mobile responsive product page
    Given I am viewing the product page on a mobile device
    Then all selectors should be stacked vertically
    And all elements should be finger-tap friendly
    And there should be no horizontal scrolling required
