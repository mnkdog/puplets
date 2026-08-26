Feature: Legal and Customer Service Pages
  As a customer
  I want to access legal and customer service information
  So that I can understand my rights and get help

  Background:
    Given I am on the puplets website

  Scenario Outline: Legal pages are accessible
    When I navigate to "<page_url>"
    Then I should see the page title "<page_title>"
    And the page should have proper HTML structure
    And the page should have navigation
    And the page should have footer navigation

    Examples:
      | page_url                      | page_title                   |
      | /privacy-policy.html          | Privacy Policy - Puplets     |
      | /terms-and-conditions.html    | Terms & Conditions - Puplets |
      | /returns-policy.html          | Returns & Refunds - Puplets  |
      | /cookie-policy.html           | Cookie Policy - Puplets      |
      | /contact.html                 | Contact Us - Puplets         |
      | /size-guide.html              | Size Guide - Puplets         |
      | /faq.html                     | FAQ - Puplets                |

  Scenario: Footer navigation is present on all main pages
    When I visit the following pages:
      | page              |
      | /index.html       |
      | /collar.html      |
      | /charms.html      |
      | /about.html       |
      | /cart.html        |
      | /success.html     |
    Then each page should have a footer with sections:
      | section            |
      | Shop               |
      | Customer Service   |
      | Legal              |
      | About              |

  Scenario: Footer links are functional
    When I am on "/index.html"
    Then the footer should contain working links to:
      | link_text              | target_url                    |
      | Waterproof Collars     | /collar.html                  |
      | Charms                 | /charms.html                  |
      | Size Guide             | /size-guide.html              |
      | FAQ                    | /faq.html                     |
      | Contact Us             | /contact.html                 |
      | Returns                | /returns-policy.html          |
      | Privacy Policy         | /privacy-policy.html          |
      | Terms & Conditions     | /terms-and-conditions.html    |
      | Cookie Policy          | /cookie-policy.html           |
      | Our Story              | /about.html                   |

  Scenario: Legal pages contain required content
    When I am on "/privacy-policy.html"
    Then I should see content about "GDPR"
    And I should see content about "data collection"
    When I am on "/terms-and-conditions.html"
    Then I should see content about "Consumer Rights Act 2015"
    When I am on "/returns-policy.html"
    Then I should see content about "14 days"
    When I am on "/cookie-policy.html"
    Then I should see content about "cookies"
    When I am on "/contact.html"
    Then I should see contact information
    When I am on "/size-guide.html"
    Then I should see sizing information
    When I am on "/faq.html"
    Then I should see frequently asked questions

  Scenario: Legal pages are responsive
    When I am on "/privacy-policy.html"
    And I resize the viewport to mobile size
    Then the page should be properly formatted for mobile
    And the footer should stack vertically
