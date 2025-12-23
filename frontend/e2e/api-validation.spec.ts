import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:8001/api/v1';

test.describe('API Validation - Direct Backend Tests', () => {
  let authToken: string;
  let tenantId: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: 'test@onquota.com',
        password: 'Test123!'
      }
    });

    if (response.ok()) {
      const data = await response.json();
      authToken = data.access_token;
      tenantId = data.tenant_id;
      console.log('✅ Login successful, got auth token');
    } else {
      console.log('❌ Login failed:', response.status(), await response.text());
    }
  });

  test('should verify reports health endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/reports/health`);

    console.log('\n📊 Reports Health Check:');
    console.log(`  Status: ${response.status()}`);

    if (response.ok()) {
      const data = await response.json();
      console.log(`  Response:`, data);
      expect(response.status()).toBe(200);
    } else {
      console.log(`  Error: ${await response.text()}`);
      expect(response.status()).toBe(200);
    }
  });

  test('should load executive dashboard without 500 error', async ({ request }) => {
    if (!authToken) {
      test.skip();
    }

    console.log('\n📊 Testing Executive Dashboard:');

    const response = await request.get(`${API_BASE_URL}/reports/dashboard/executive?currency=USD`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
      }
    });

    console.log(`  Status: ${response.status()}`);

    if (!response.ok()) {
      const errorText = await response.text();
      console.log(`  ❌ Error Response:`, errorText.substring(0, 500));

      // Try to parse as JSON to get better error details
      try {
        const errorJson = JSON.parse(errorText);
        console.log(`  Error Detail:`, errorJson.detail);
      } catch (e) {
        // Not JSON
      }
    } else {
      const data = await response.json();
      console.log(`  ✅ Success! Dashboard loaded`);
      console.log(`  KPIs:`, Object.keys(data.kpis || {}));
    }

    expect(response.status()).not.toBe(500);
    expect(response.ok()).toBe(true);
  });

  test('should check SPA upload endpoint configuration', async ({ request }) => {
    if (!authToken) {
      test.skip();
    }

    console.log('\n📊 Testing SPA Upload Endpoint:');

    // Test OPTIONS request (CORS preflight)
    const optionsResponse = await request.fetch(`${API_BASE_URL}/spa/upload?auto_create_clients=false`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-tenant-id,authorization',
      }
    });

    console.log(`  OPTIONS Status: ${optionsResponse.status()}`);
    const corsHeaders = {
      'access-control-allow-origin': optionsResponse.headers()['access-control-allow-origin'],
      'access-control-allow-credentials': optionsResponse.headers()['access-control-allow-credentials'],
      'access-control-allow-methods': optionsResponse.headers()['access-control-allow-methods'],
    };
    console.log(`  CORS Headers:`, corsHeaders);

    // Test with a simple POST (without actual file)
    const postResponse = await request.post(`${API_BASE_URL}/spa/upload?auto_create_clients=false`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
      },
      multipart: {
        file: {
          name: 'test.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: Buffer.from('test'),
        }
      },
      failOnStatusCode: false
    });

    console.log(`  POST Status: ${postResponse.status()}`);

    if (!postResponse.ok()) {
      const errorText = await postResponse.text();
      console.log(`  Error:`, errorText.substring(0, 300));
    } else {
      console.log(`  ✅ Upload endpoint is accessible`);
    }

    // Check if it's a CORS error (status 0) or 500 error
    expect(postResponse.status()).not.toBe(0); // CORS blocking
    expect(postResponse.status()).not.toBe(500); // Server error
  });

  test('should verify CSRF exempt paths are working', async ({ request }) => {
    console.log('\n📊 Testing CSRF Exempt Paths:');

    // Test endpoints that should be exempt from CSRF
    const exemptEndpoints = [
      '/health',
      '/reports/health',
    ];

    for (const endpoint of exemptEndpoints) {
      const response = await request.get(`${API_BASE_URL}${endpoint}`);
      console.log(`  ${endpoint}: ${response.status()}`);
      expect(response.status()).not.toBe(403); // Should not be CSRF blocked
    }
  });
});
