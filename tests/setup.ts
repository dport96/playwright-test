/* eslint-disable import/no-extraneous-dependencies */
// tests/setup.ts
import { request } from '@playwright/test';

async function globalSetup() {
  const requestContext = await request.newContext();

  try {
    await requestContext.post(`${process.env.BASE_URL}/api/test-setup`, {
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
  } finally {
    await requestContext.dispose();
  }
}

export default globalSetup;
