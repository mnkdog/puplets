@skip
Feature: Puplets Maintenance Page (Old - Not Used)
  As a visitor
  I want to see a maintenance page
  When the site is being updated

  Scenario: Homepage displays company name
    Given I am on the homepage
    Then I should see the text "Puplets"

  Scenario: Homepage has link to Etsy store
    Given I am on the homepage
    Then I should see a link to "https://www.etsy.com/shop/puplets/"
    And the link text should contain "shop" or "store"
