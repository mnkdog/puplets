# TDD/BDD Workflow for Puplets

## Overview
This project follows Test-Driven Development (TDD) and Behavior-Driven Development (BDD) practices with trunk-based development.

## Development Workflow

### 1. Define Behavior (BDD)
Write scenarios in Gherkin syntax in `features/*.feature` files:
```gherkin
Feature: Feature Name
  Scenario: Specific behavior
    Given some context
    When an action occurs
    Then verify the outcome
```

### 2. Write Tests First (TDD)
- **BDD Tests**: Create step definitions in `features/step_definitions/`
- **Unit Tests**: Create test files in `tests/` for JavaScript logic

### 3. Run Tests (Should FAIL)
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:bdd      # BDD scenarios only
```

### 4. Implement Code
Write minimal code in `src/` to make tests pass.

### 5. Run Tests Again (Should PASS)
```bash
npm test
```

### 6. Commit Small Changes
```bash
git add .
git commit -m "feat: implement X feature"
```

### 7. Push to Main
Only push when **all tests pass**:
```bash
git push origin main
```

## Available Commands

- `npm run serve` - Start local dev server (http://localhost:8080)
- `npm test` - Run all tests (unit + BDD)
- `npm run test:unit` - Run unit tests with Vitest
- `npm run test:unit:watch` - Run unit tests in watch mode
- `npm run test:bdd` - Run BDD scenarios with Cucumber
- `npm run test:e2e` - Run E2E tests with Playwright
- `npm run test:coverage` - Generate test coverage report

## Project Structure

```
puplets/
├── src/                    # Website source files (HTML, CSS, JS)
├── features/               # BDD scenarios (Gherkin)
│   ├── *.feature          # Feature files
│   ├── step_definitions/  # Cucumber step implementations
│   └── support/           # Test setup and helpers
├── tests/                  # Unit tests (Vitest)
├── .github/workflows/      # GitHub Actions (CI/CD)
└── package.json           # Dependencies and scripts
```

## Deployment

GitHub Actions automatically:
1. Runs all tests on every push to main
2. Deploys to GitHub Pages if tests pass
3. Fails the deployment if any test fails

## Trunk-Based Development Rules

- Feature branches: maximum 1 day lifespan
- Micro commits: commit frequently
- Main branch: always deployable
- No push to main with failing tests
