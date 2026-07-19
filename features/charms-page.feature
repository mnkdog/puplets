Feature: Charms Product Page
  As a customer
  I want to purchase individual charms
  So that I can add them to my existing collar

  Scenario: Viewing charm selection options
    Given I am on the charms page
    When I view the purchasing options
    Then I should see a charm selector with all 20 charms
    And I should see a quantity selector
    And I should see the price per charm

  Scenario: Selecting a charm updates the display
    Given I am on the charms page
    When I select a charm
    Then I should see the selected charm highlighted
    And the main image should show that charm

  Scenario: Quantity affects total price
    Given I am on the charms page
    When I select a charm
    And I select quantity "3"
    Then the total price should be "£11.97"

  Scenario: Adding charms to cart
    Given I am on the charms page
    When I select a charm
    And I select quantity "2"
    And I click the "Add to Basket" button
    Then the item should be added to my cart
    And the cart count should increase by 2

  Scenario: Charms page is mobile responsive
    Given I am viewing the charms page on a mobile device
    Then all selectors should be stacked vertically
    And all elements should be finger-tap friendly
    And there should be no horizontal scrolling required

  Scenario: Image gallery on charms page
    Given I am on the charms page
    Then I should see a main charm image
    And I should see thumbnail images of all charms
    When I click on a thumbnail image
    Then the main image should change to that charm
