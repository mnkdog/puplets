Feature: Security hardening
  As a security-conscious user
  I want the site to protect against XSS and have proper security headers
  So that my data and the site remain secure

  Background:
    Given I am on the about page

  Scenario: Required sanitization libraries are loaded locally
    Then the marked.js script should be loaded from local vendor
    And the DOMPurify script should be loaded from local vendor

  Scenario: Markdown content is sanitized against XSS
    Then DOMPurify should be loaded and available
    And markdown content should be sanitized before rendering

  Scenario: Security headers are configured
    When I request the about page
    Then the response should include a Content-Security-Policy header
    And the response should include X-Frame-Options header
    And the response should include X-Content-Type-Options header
    And the response should include Referrer-Policy header
    And the response should include Permissions-Policy header

  Scenario: CSP allows required resources
    Then the CSP should allow scripts from self
    And the CSP should allow scripts from cdn.jsdelivr.net
    And the CSP should allow scripts from checkout.stripe.com
    And the CSP should allow connects to api.stripe.com
