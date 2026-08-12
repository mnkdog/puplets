Feature: Inventory Management
  As a shop owner
  I want to track stock levels for each product variant
  So that customers cannot buy out-of-stock items

  Background:
    Given the inventory system is initialized

  Scenario: Collar variant in stock allows purchase
    Given I am on the collar product page
    And the "ocean/S" collar variant has 10 in stock
    When I select color "ocean"
    And I select size "S"
    And I select charm "Bone"
    Then the add to basket button should be enabled

  Scenario: Collar variant out of stock blocks purchase
    Given I am on the collar product page
    And the "chilli/M" collar variant has 0 in stock
    When I select color "chilli"
    And I select size "M"
    And I select charm "Heart"
    Then the add to basket button should be disabled
    And I should see "Out of Stock" message

  Scenario: Charm out of stock blocks collar purchase
    Given I am on the collar product page
    And the "ocean/S" collar variant has 10 in stock
    And the "White paw" charm has 0 in stock
    When I select color "ocean"
    And I select size "S"
    And I select charm "White paw"
    Then the add to basket button should be disabled
    And I should see "charm is out of stock" message

  Scenario: Individual charm in stock allows purchase
    Given I am on the charms page
    And the "Bone" charm has 50 in stock
    When I select charm "Bone"
    And I select quantity "3"
    Then the add to basket button should be enabled

  Scenario: Individual charm out of stock blocks purchase
    Given I am on the charms page
    And the "Heart" charm has 0 in stock
    When I select charm "Heart"
    Then the add to basket button should be disabled
    And I should see "Out of Stock" message

  Scenario: Charm low stock shows warning
    Given I am on the charms page
    And the "Star" charm has 5 in stock
    When I select charm "Star"
    And I select quantity "10"
    Then I should see "Only 5 available" message
