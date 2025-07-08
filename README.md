# Playwright Test Application

[![ci-playwright-test](https://github.com/dport96/playwright-test/actions/workflows/ci.yml/badge.svg)](https://github.com/dport96/playwright-test/actions/workflows/ci.yml)
[![Playwright Tests](https://github.com/dport96/playwright-test/actions/workflows/playwright-tests.yml/badge.svg)](https://github.com/dport96/playwright-test/actions/workflows/playwright-tests.yml)

This is a Next.js application with Playwright end-to-end testing and PostgreSQL database.

## GitHub Actions CI/CD

The application includes two GitHub Actions workflows:

### CI Workflow (`ci.yml`)

- Lints the code with ESLint
- Builds the application
- Tests basic PostgreSQL connectivity

### Playwright Tests Workflow (`playwright-tests.yml`)

- Sets up a PostgreSQL database container
- Installs dependencies and builds the application
- Runs Prisma migrations and seeds the database
- Executes Playwright tests across multiple browsers
- Uploads test results and reports as artifacts

## Local Development

### Quick Start with Docker

1. Copy the environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Start database and run tests:

   ```bash
   npm run test:full
   ```

### Manual Setup

1. Copy the environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Start PostgreSQL database (using Docker):

   ```bash
   docker run --name postgres-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=playwright_test -p 5432:5432 -d postgres:15
   ```

   Or use Docker Compose:

   ```bash
   npm run db:up
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Run migrations and seed:

   ```bash
   npm run db:setup
   ```

5. Install Playwright browsers:

   ```bash
   npx playwright install
   ```

6. Run tests:

   ```bash
   npm run playwright-development
   ```

### Available Scripts

- `npm run db:up` - Start PostgreSQL container
- `npm run db:down` - Stop PostgreSQL container
- `npm run db:setup` - Run migrations and seed database
- `npm run test:setup` - Start DB and setup schema
- `npm run test:full` - Complete test setup and run tests
- `npm run test:fast` - Run tests with faster timeouts (fail faster)
- `npm run playwright-fast` - Run Playwright tests with CI timeouts locally

For details, please see [the documentation](http://ics-software-engineering.github.io/nextjs-application-template/).
