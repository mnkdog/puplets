Feature: Puplets New Homepage
  As a visitor
  I want to see the Puplets premium dog collar website
  So that I can learn about the products and shop

  Scenario: Homepage displays brand and tagline
    Given I am on the homepage
    Then I should see the text "Puplets"
    And I should see the text "Premium dog collars for your beloved companion"

  Scenario: Homepage has Shop Now button
    Given I am on the homepage
    Then I should see a "Shop Now" button

  Scenario: Homepage has navigation with Cart
    Given I am on the homepage
    Then I should see navigation with "Cart" link

  Scenario: Homepage displays in correct brand colors
    Given I am on the homepage
    Then the page should have a light cream background
    And I should see colored elements in red, blue, and green
