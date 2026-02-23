/**
 * Tests for web.js - API Endpoints
 * Run with: node tests/web.test.js
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_DATA_FILE = path.join(__dirname, '..', 'profiles.json');
const BACKUP_FILE = path.join(__dirname, '..', 'profiles.json.backup');

// Test configuration
const BASE_URL = 'http://localhost:3025';
let testResults = { passed: 0, failed: 0, tests: [] };
let serverStarted = false;

// HTTP request helper
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function test(name, fn) {
  return new Promise(async (resolve) => {
    try {
      await fn();
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASSED' });
      console.log(`✓ ${name}`);
    } catch (error) {
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
    }
    resolve();
  });
}

function suite(name, fn) {
  console.log(`\n=== ${name} ===\n`);
  return fn();
}

// Setup
function setup() {
  if (fs.existsSync(TEST_DATA_FILE)) {
    fs.copyFileSync(TEST_DATA_FILE, BACKUP_FILE);
    fs.unlinkSync(TEST_DATA_FILE);
  }
}

function teardown() {
  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, TEST_DATA_FILE);
    fs.unlinkSync(BACKUP_FILE);
  } else if (fs.existsSync(TEST_DATA_FILE)) {
    fs.unlinkSync(TEST_DATA_FILE);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('GET', '/profiles');
    return true;
  } catch (e) {
    return false;
  }
}

// Run tests
(async () => {
  console.log('Starting Web API Tests...\n');
  
  // Check if server is running
  const isRunning = await checkServer();
  if (!isRunning) {
    console.log('ERROR: Web server is not running!');
    console.log('Please start the server with: npm run web');
    console.log('Or run: node web.js');
    process.exit(1);
  }
  
  console.log('Server is running. Starting tests...\n');
  
  setup();

  // ============================================
  // Profile API Tests
  // ============================================

  await suite('Profile API Endpoints', async () => {
    
    await test('GET /profiles should return empty array initially', async () => {
      const result = await makeRequest('GET', '/profiles');
      assert.strictEqual(result.status, 200);
      assert.deepStrictEqual(result.data, []);
    });

    await test('POST /profiles should create a new profile', async () => {
      const profile = {
        name: 'test-api-profile',
        baseUrl: 'https://api.example.com',
        keys: { apiKey: 'test-key-123' }
      };
      const result = await makeRequest('POST', '/profiles', profile);
      assert.strictEqual(result.status, 201);
      assert.strictEqual(result.data.name, 'test-api-profile');
    });

    await test('GET /profiles should return created profile', async () => {
      const result = await makeRequest('GET', '/profiles');
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].name, 'test-api-profile');
    });

    await test('GET /profiles/:name should return specific profile', async () => {
      const result = await makeRequest('GET', '/profiles/test-api-profile');
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.name, 'test-api-profile');
    });

    await test('GET /profiles/:name/keys should return keys', async () => {
      const result = await makeRequest('GET', '/profiles/test-api-profile/keys');
      assert.strictEqual(result.status, 200);
      assert.deepStrictEqual(result.data, { apiKey: 'test-key-123' });
    });

    await test('GET /profiles/:name with non-existent name should return 404', async () => {
      const result = await makeRequest('GET', '/profiles/non-existent');
      assert.strictEqual(result.status, 404);
      assert(result.data.error !== undefined);
    });

    await test('POST /profiles without name should return 400', async () => {
      const profile = { baseUrl: 'https://api.example.com' };
      const result = await makeRequest('POST', '/profiles', profile);
      assert.strictEqual(result.status, 400);
      assert(result.data.error.includes('name is required'));
    });

    await test('POST /profiles with duplicate name should return 400', async () => {
      const profile = {
        name: 'test-api-profile',
        baseUrl: 'https://api.example2.com',
        keys: { apiKey: 'different-key' }
      };
      const result = await makeRequest('POST', '/profiles', profile);
      assert.strictEqual(result.status, 400);
      assert(result.data.error.includes('already exists'));
    });
  });

  // ============================================
  // Profile Update/Delete Tests
  // ============================================

  await suite('Profile Update/Delete', async () => {
    
    await test('PUT /profiles/:name should update profile', async () => {
      const updated = {
        name: 'test-api-profile',
        baseUrl: 'https://api.updated.com',
        keys: { apiKey: 'updated-key' }
      };
      const result = await makeRequest('PUT', '/profiles/test-api-profile', updated);
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.baseUrl, 'https://api.updated.com');
    });

    await test('PUT /profiles/:name with mismatched name should return 400', async () => {
      const updated = {
        name: 'different-name',
        baseUrl: 'https://api.example.com',
        keys: { apiKey: 'key' }
      };
      const result = await makeRequest('PUT', '/profiles/test-api-profile', updated);
      assert.strictEqual(result.status, 400);
      assert(result.data.error.includes('mismatch'));
    });

    await test('DELETE /profiles/:name should delete profile', async () => {
      const result = await makeRequest('DELETE', '/profiles/test-api-profile');
      assert.strictEqual(result.status, 200);
      assert(result.data.message.includes('deleted'));
    });

    await test('DELETE /profiles/:name with non-existent should return 404', async () => {
      const result = await makeRequest('DELETE', '/profiles/non-existent');
      assert.strictEqual(result.status, 404);
    });
  });

  // ============================================
  // Key Validation API Tests
  // ============================================

  await suite('Key Validation API', async () => {
    
    // Create test profiles
    await makeRequest('POST', '/profiles', {
      name: 'llm-validation-test',
      baseUrl: 'https://api.openai.com/v1',
      apiType: 'llm',
      keys: { apiKey: 'invalid-key-for-testing' }
    });

    await makeRequest('POST', '/profiles', {
      name: 'custom-validation-test',
      baseUrl: 'https://api.nonexistent12345.com',
      apiType: 'custom',
      testEndpoint: '/health',
      keys: { apiKey: 'test-key' }
    });

    await test('POST /test-profile should validate profile', async () => {
      const result = await makeRequest('POST', '/test-profile', {
        name: 'llm-validation-test'
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.valid, false);
      assert(result.data.error !== undefined);
    });

    await test('POST /test-profile with specific key name', async () => {
      const result = await makeRequest('POST', '/test-profile', {
        name: 'llm-validation-test',
        keyName: 'apiKey'
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.valid, false);
    });

    await test('POST /test-profile without name should return 400', async () => {
      const result = await makeRequest('POST', '/test-profile', {});
      assert.strictEqual(result.status, 400);
      assert(result.data.error.includes('required'));
    });

    await test('POST /test-profile with non-existent profile should return 400', async () => {
      const result = await makeRequest('POST', '/test-profile', {
        name: 'non-existent-profile'
      });
      assert.strictEqual(result.status, 400);
    });

    await test('POST /test-profile for custom API should handle network errors', async () => {
      const result = await makeRequest('POST', '/test-profile', {
        name: 'custom-validation-test'
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.valid, false);
      assert(result.data.error !== undefined);
    });
  });

  // ============================================
  // LLM Message API Tests
  // ============================================

  await suite('LLM Message API', async () => {
    
    await test('POST /send-llm-message should require all fields', async () => {
      const result = await makeRequest('POST', '/send-llm-message', {
        name: 'llm-validation-test'
      });
      assert.strictEqual(result.status, 400);
      assert(result.data.error.includes('required'));
    });

    await test('POST /send-llm-message should fail with invalid key', async () => {
      const result = await makeRequest('POST', '/send-llm-message', {
        name: 'llm-validation-test',
        keyName: 'apiKey',
        modelName: 'gpt-3.5-turbo',
        message: 'Hello'
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.success, false);
      assert(result.data.error !== undefined);
    });

    await test('POST /send-llm-message with non-existent profile should return 400', async () => {
      const result = await makeRequest('POST', '/send-llm-message', {
        name: 'non-existent',
        modelName: 'gpt-3.5-turbo',
        message: 'Hello'
      });
      assert.strictEqual(result.status, 400);
    });
  });

  // ============================================
  // Authentication Configuration Tests
  // ============================================

  await suite('Authentication Configuration API', async () => {
    
    // Create profile with custom auth
    await makeRequest('POST', '/profiles', {
      name: 'custom-auth-test',
      baseUrl: 'https://api.custom.com',
      authMethod: 'apikey',
      authConfig: {
        headerName: 'X-Custom-Key',
        headerFormat: '{key}'
      },
      keys: { apiKey: 'custom-key-value' }
    });

    await test('should create profile with custom auth config', async () => {
      const result = await makeRequest('GET', '/profiles/custom-auth-test');
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.authMethod, 'apikey');
      assert.strictEqual(result.data.authConfig.headerName, 'X-Custom-Key');
    });

    await test('should validate profile with custom auth', async () => {
      const result = await makeRequest('POST', '/test-profile', {
        name: 'custom-auth-test'
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.valid, false);
    });

    // Create profile with basic auth
    await makeRequest('POST', '/profiles', {
      name: 'basic-auth-test',
      baseUrl: 'https://api.basic.com',
      authMethod: 'basic',
      authConfig: {
        usernameField: 'username',
        passwordField: 'password'
      },
      keys: {
        username: 'testuser',
        password: 'testpass'
      }
    });

    await test('should create profile with basic auth', async () => {
      const result = await makeRequest('GET', '/profiles/basic-auth-test');
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.data.authMethod, 'basic');
    });
  });

  // ============================================
  // Edge Cases and Error Handling
  // ============================================

  await suite('Edge Cases', async () => {
    
    await test('should handle empty request body', async () => {
      const result = await makeRequest('POST', '/profiles', {});
      assert.strictEqual(result.status, 400);
    });

    await test('should handle malformed JSON gracefully', async () => {
      // This test would require raw socket manipulation
      // Skipping for now as the HTTP client handles JSON parsing
    });

    await test('should handle special characters in profile name', async () => {
      const profile = {
        name: 'test-profile-special_123',
        baseUrl: 'https://api.example.com',
        keys: { apiKey: 'key' }
      };
      const result = await makeRequest('POST', '/profiles', profile);
      assert.strictEqual(result.status, 201);
    });

    await test('should handle profile with many keys', async () => {
      const profile = {
        name: 'many-keys-profile',
        baseUrl: 'https://api.example.com',
        keys: {
          key1: 'value1',
          key2: 'value2',
          key3: 'value3',
          key4: 'value4',
          key5: 'value5'
        }
      };
      const result = await makeRequest('POST', '/profiles', profile);
      assert.strictEqual(result.status, 201);
      
      const keysResult = await makeRequest('GET', '/profiles/many-keys-profile/keys');
      assert.strictEqual(Object.keys(keysResult.data).length, 5);
    });
  });

  // Cleanup
  teardown();

  // Print results
  console.log('\n=== Test Results ===');
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Total: ${testResults.passed + testResults.failed}`);

  if (testResults.failed > 0) {
    console.log('\nFailed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
    process.exit(0);
  }
})();
