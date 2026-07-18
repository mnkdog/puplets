Feature: Mobile Navigation
  As a mobile user
  I want easy navigation on my phone
  So that I can browse the site comfortably

  Background:
    Given I am on a mobile device

  Scenario: Hamburger menu on homepage
    When I am on the homepage
    Then I should see a hamburger menu icon
    And I should see the cart button
    But I should not see the Products link
    And I should not see the About link

  Scenario: Opening mobile menu
    When I am on the homepage
    And I click the hamburger menu
    Then the mobile menu should open
    And I should see the Home link
    And I should see the Products link
    And I should see the About link

  Scenario: Closing mobile menu
    When I open the mobile menu
    And I click outside the menu
    Then the mobile menu should close

  Scenario: Navigating from mobile menu
    When I open the mobile menu
    And I click the "Products" link in the menu
    Then I should be on the products page
    And the mobile menu should close

  Scenario: Cart button visible on mobile
    When I am on any page
    Then the cart button should be visible
    And the cart count badge should be visible if items exist

  Scenario: Consistent navigation across pages
    When I am on the homepage
    Then the navigation layout should match
    When I am on the products page
    Then the navigation layout should match
    When I am on the about page
    Then the navigation layout should match
    When I am on the cart page
    Then the navigation layout should match
