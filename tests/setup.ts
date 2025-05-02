/* eslint-disable import/no-extraneous-dependencies */
// tests/setup.ts
import { request } from '@playwright/test';

async function globalSetup() {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  console.log(`Using base URL: ${baseURL}`);

  const requestContext = await request.newContext({
    baseURL,
  });

  try {
    await requestContext.post('/api/test-setup', {
      data: {
        users: [
          {
            email: 'john@foo.com',
            password: 'changeme',
            verified: true,
          },
        ],
      },
    });
    console.log('Test data seeded successfully');
  } catch (error) {
    console.error('Test data seeding failed:', error);
    throw error;
  } finally {
    await requestContext.dispose();
  }
}

export default globalSetup;
