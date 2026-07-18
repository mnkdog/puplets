Feature: About Page
  As a visitor
  I want to learn about Puplets and the founder
  So I can understand the story and values behind the brand

  Scenario: About page is accessible from navigation
    Given I am on the homepage
    When I click the "About" link in navigation
    Then I should be on the about page

  Scenario: About page displays founder story
    Given I am on the about page
    Then I should see the heading "A Future Vet's Mission"
    And I should see text about veterinary school
    And I should see text about Colchester Zoo

  Scenario: About page has navigation
    Given I am on the about page
    Then I should see navigation with "Home" link
    And I should see navigation with "Products" link
    And I should see navigation with "Cart" link
