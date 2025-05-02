import { test as setup } from '@playwright/test';

setup('seed test data', async ({ request }) => {
  await request.post('/api/test-setup', {
    data: {
      users: [
        {
          email: 'john@foo.com',
          password: 'changeme',
          verified: true
        }
      ]
    }
  });
});
