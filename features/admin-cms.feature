Feature: Admin CMS
  As a content administrator
  I want to access and use the CMS interface
  So that I can manage site content

  Scenario: Admin CMS page loads successfully
    Given the admin CMS interface is available
    When I navigate to "/admin/"
    Then the page should load successfully
    And the page should include the Decap CMS script
    And the page should have CMS configuration

  Scenario: Admin CMS configuration is correct
    Given the admin CMS interface is available
    When I navigate to "/admin/"
    Then the CMS should be configured for GitHub backend
    And the CMS should point to mnkdog/puplets repository
    And the CMS should use the main branch

  @vercel-only
  Scenario: Admin CSP allows required CMS resources
    Given the site is deployed to Vercel
    When I request the admin page in production
    Then the admin CSP should allow scripts from cdn.jsdelivr.net
    And the CSP should allow unsafe-eval for CMS configuration
    And the CSP should allow connects to api.github.com
