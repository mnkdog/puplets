Feature: Admin CMS
  As a content administrator
  I want to access and use the CMS interface
  So that I can manage site content

  Scenario: Admin CMS page loads without CSP errors
    When I navigate to "/admin/"
    Then the page should load successfully
    And there should be no Content-Security-Policy violations in the console
    And the Decap CMS should initialize

  Scenario: Admin CSP allows required CMS resources
    When I request the admin page
    Then the CSP should allow scripts from cdn.jsdelivr.net
    And the CSP should allow unsafe-eval for CMS configuration
    And the CSP should allow connects to api.github.com

  Scenario: Admin CMS connects to GitHub backend
    Given I am on the admin page
    When the CMS initializes
    Then it should be configured for GitHub backend
    And it should point to the correct repository
