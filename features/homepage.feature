Feature: Puplets Homepage
  As a visitor
  I want to see the Puplets business card website
  So that I can learn about Puplets and visit their online store

  Scenario: Homepage displays company name
    Given I am on the homepage
    Then I should see the text "Puplets"

  Scenario: Homepage has link to online store
    Given I am on the homepage
    Then I should see a link to the online store
