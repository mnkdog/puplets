Feature: Products Catalog
  As a customer
  I want to see all available products
  So that I can choose what to purchase

  Scenario: Viewing the products catalog
    Given I am on the products catalog page
    Then I should see a "Customizable Dog Collars" product card
    And I should see a "Individual Charms" product card
    And each product card should have an image
    And each product card should have a "View Product" link

  Scenario: Navigating to collar product from catalog
    Given I am on the products catalog page
    When I click "View Product" on the collars card
    Then I should be on the collar detail page

  Scenario: Navigating to charms product from catalog
    Given I am on the products catalog page
    When I click "View Product" on the charms card
    Then I should be on the charms detail page

  Scenario: Products catalog is accessible from navigation
    Given I am on the homepage
    When I click the "Products" link in navigation
    Then I should be on the products catalog page
