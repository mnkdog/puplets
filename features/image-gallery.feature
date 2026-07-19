Feature: Product Image Gallery
  As a customer
  I want to view product images in detail
  So that I can see the product clearly before purchasing

  Background:
    Given I am on the products page

  Scenario: Viewing main product image
    Then I should see the main product image
    And I should see thumbnail images

  Scenario: Clicking thumbnail changes main image
    When I click on a thumbnail image
    Then the main image should change to that thumbnail
    And the clicked thumbnail should be highlighted

  Scenario: Navigation arrows cycle through images
    When I click the next arrow
    Then the main image should change to the next image
    When I click the previous arrow
    Then the main image should change to the previous image

  Scenario: Clicking main image opens lightbox
    When I click on the main image
    Then a lightbox should open
    And the lightbox should show the enlarged image

  Scenario: Closing lightbox
    When I open the lightbox
    And I click outside the image
    Then the lightbox should close
