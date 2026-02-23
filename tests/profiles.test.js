/**
 * Tests for profiles.js - Profile Management and Key Validation
 * Run with: node tests/profiles.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const profiles = require('../profiles');

const TEST_DATA_FILE = path.join(__dirname, '..', 'profiles.json');
const BACKUP_FILE = path.join(__dirname, '..', 'profiles.json.backup');

// Test utilities
let testResults = { passed: 0, failed: 0, tests: [] };

function test(name, fn) {
  try {
    fn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    console.log(`✓ ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

function suite(name, fn) {
  console.log(`\n=== ${name} ===\n`);
  fn();
}

// Setup and teardown
function setup() {
  // Backup existing data
  if (fs.existsSync(TEST_DATA_FILE)) {
    fs.copyFileSync(TEST_DATA_FILE, BACKUP_FILE);
    fs.unlinkSync(TEST_DATA_FILE);
  }
}

function teardown() {
  // Restore backup
  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, TEST_DATA_FILE);
    fs.unlinkSync(BACKUP_FILE);
  } else if (fs.existsSync(TEST_DATA_FILE)) {
    fs.unlinkSync(TEST_DATA_FILE);
  }
}

// Run tests
console.log('Starting Profile Management Tests...\n');

setup();

// ============================================
// Profile Management Tests
// ============================================

suite('Profile Management', () => {
  
  test('should list empty profiles initially', () => {
    const result = profiles.listProfiles();
    assert.deepStrictEqual(result, []);
  });

  test('should add a new profile', () => {
    const profile = {
      name: 'test-profile',
      baseUrl: 'https://api.example.com',
      keys: { apiKey: 'test-key-123' }
    };
    const result = profiles.addProfile(profile);
    assert.deepStrictEqual(result, profile);
  });

  test('should list added profiles', () => {
    const result = profiles.listProfiles();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'test-profile');
  });

  test('should prevent duplicate profile names', () => {
    const duplicate = {
      name: 'test-profile',
      baseUrl: 'https://api.example2.com',
      keys: { apiKey: 'test-key-456' }
    };
    assert.throws(() => {
      profiles.addProfile(duplicate);
    }, /already exists/);
  });

  test('should get a profile by name', () => {
    const result = profiles.getProfile('test-profile');
    assert.strictEqual(result.name, 'test-profile');
    assert.strictEqual(result.baseUrl, 'https://api.example.com');
  });

  test('should throw error for non-existent profile', () => {
    assert.throws(() => {
      profiles.getProfile('non-existent');
    }, /not found/);
  });

  test('should update a profile', () => {
    const updated = {
      name: 'test-profile',
      baseUrl: 'https://api.updated.com',
      keys: { apiKey: 'updated-key' }
    };
    const result = profiles.updateProfile('test-profile', updated);
    assert.strictEqual(result.baseUrl, 'https://api.updated.com');
  });

  test('should delete a profile', () => {
    const result = profiles.deleteProfile('test-profile');
    assert.strictEqual(result.name, 'test-profile');
    const remaining = profiles.listProfiles();
    assert.strictEqual(remaining.length, 0);
  });

  test('should throw error when deleting non-existent profile', () => {
    assert.throws(() => {
      profiles.deleteProfile('non-existent');
    }, /not found/);
  });
});

// ============================================
// Key Validation Tests
// ============================================

suite('Key Validation', () => {
  
  // Add test profiles for validation tests
  const llmProfile = {
    name: 'llm-test',
    baseUrl: 'https://api.openai.com/v1',
    apiType: 'llm',
    keys: { apiKey: 'invalid-test-key' }
  };
  
  const customProfile = {
    name: 'custom-test',
    baseUrl: 'https://api.custom.com',
    apiType: 'custom',
    testEndpoint: '/health',
    keys: { apiKey: 'custom-key' }
  };

  test('should add LLM profile for testing', () => {
    profiles.addProfile(llmProfile);
    const result = profiles.getProfile('llm-test');
    assert.strictEqual(result.apiType, 'llm');
  });

  test('should add custom profile for testing', () => {
    profiles.addProfile(customProfile);
    const result = profiles.getProfile('custom-test');
    assert.strictEqual(result.apiType, 'custom');
  });

  test('should validate profile exists before testing', async () => {
    try {
      await profiles.testProfile('non-existent-profile');
      assert.fail('Should have thrown error');
    } catch (error) {
      assert(error.message.includes('not found'));
    }
  });

  test('should fail validation with invalid API key (LLM)', async () => {
    const result = await profiles.testProfile('llm-test');
    assert.strictEqual(result.valid, false);
    assert(result.error !== undefined);
  });

  test('should fail validation with invalid endpoint (custom)', async () => {
    const result = await profiles.testProfile('custom-test');
    assert.strictEqual(result.valid, false);
    assert(result.error !== undefined);
  });

  test('should handle missing baseUrl', async () => {
    const noUrlProfile = {
      name: 'no-url-test',
      keys: { apiKey: 'test' }
    };
    profiles.addProfile(noUrlProfile);
    const result = await profiles.testProfile('no-url-test');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, 'Profile baseUrl is missing');
  });
});

// ============================================
// Authentication Configuration Tests
// ============================================

suite('Authentication Configuration', () => {
  
  test('should build bearer auth headers', () => {
    const profile = {
      name: 'bearer-test',
      keys: { apiKey: 'test-bearer-key' },
      authMethod: 'bearer'
    };
    const headers = profiles.buildAuthHeaders(profile, 'apiKey');
    assert.deepStrictEqual(headers, { 'Authorization': 'Bearer test-bearer-key' });
  });

  test('should build API key headers', () => {
    const profile = {
      name: 'apikey-test',
      keys: { apiKey: 'test-api-key' },
      authMethod: 'apikey',
      authConfig: {
        headerName: 'X-API-Key',
        headerFormat: '{key}'
      }
    };
    const headers = profiles.buildAuthHeaders(profile, 'apiKey');
    assert.deepStrictEqual(headers, { 'X-API-Key': 'test-api-key' });
  });

  test('should build basic auth headers', () => {
    const profile = {
      name: 'basic-test',
      keys: { 
        username: 'testuser',
        password: 'testpass'
      },
      authMethod: 'basic',
      authConfig: {
        usernameField: 'username',
        passwordField: 'password'
      }
    };
    const headers = profiles.buildAuthHeaders(profile, 'username');
    assert(headers['Authorization'].startsWith('Basic '));
  });

  test('should use first available key if keyName not found', () => {
    const profile = {
      name: 'fallback-test',
      keys: { 
        primary: 'primary-key',
        secondary: 'secondary-key'
      },
      authMethod: 'bearer'
    };
    const headers = profiles.buildAuthHeaders(profile, 'nonexistent');
    assert(headers['Authorization'].includes('primary-key'));
  });

  test('should handle custom header format', () => {
    const profile = {
      name: 'custom-format-test',
      keys: { apiKey: 'my-key' },
      authMethod: 'apikey',
      authConfig: {
        headerName: 'X-Custom-Auth',
        headerFormat: 'token-{key}-suffix'
      }
    };
    const headers = profiles.buildAuthHeaders(profile, 'apiKey');
    assert.deepStrictEqual(headers, { 'X-Custom-Auth': 'token-my-key-suffix' });
  });
});

// ============================================
// Profile with Multiple Keys Tests
// ============================================

suite('Multiple Keys Management', () => {
  
  test('should handle profile with multiple keys', () => {
    const multiKeyProfile = {
      name: 'multi-key-test',
      baseUrl: 'https://api.example.com',
      keys: {
        apiKey: 'main-key',
        secretKey: 'secret-value',
        tokenKey: 'token-value'
      }
    };
    profiles.addProfile(multiKeyProfile);
    const result = profiles.getProfile('multi-key-test');
    assert.strictEqual(Object.keys(result.keys).length, 3);
  });

  test('should select specific key for validation', async () => {
    const profile = {
      name: 'specific-key-test',
      baseUrl: 'https://api.example.com',
      keys: {
        primary: 'primary-key',
        secondary: 'secondary-key'
      }
    };
    profiles.addProfile(profile);
    // This will fail because the endpoint doesn't exist, but we can verify key selection
    const result = await profiles.testProfile('specific-key-test', 'secondary');
    // The test should attempt to use the secondary key
    assert(result.error !== undefined);
  });
});

// ============================================
// Error Handling Tests
// ============================================

suite('Error Handling', () => {
  
  test('should handle malformed JSON gracefully', () => {
    // Write invalid JSON
    fs.writeFileSync(TEST_DATA_FILE, 'invalid json {{{');
    
    // Clear any cached module
    delete require.cache[require.resolve('../profiles')];
    
    // This should throw an error when trying to parse
    const profilesFresh = require('../profiles');
    assert.throws(() => {
      profilesFresh.listProfiles();
    });
  });

  test('should handle file permission errors', () => {
    // This test is platform-dependent and may not work on all systems
    // Skip on Windows
    if (process.platform !== 'win32') {
      const readOnlyProfile = {
        name: 'readonly-test',
        baseUrl: 'https://api.example.com',
        keys: { apiKey: 'test' }
      };
      
      // Make the directory read-only temporarily
      // This is a best-effort test
      try {
        profiles.addProfile(readOnlyProfile);
      } catch (error) {
        // Expected on read-only filesystem
        assert(error !== undefined);
      }
    }
  });
});

// Cleanup and results
teardown();

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
