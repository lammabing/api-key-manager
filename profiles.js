const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'profiles.json');

function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, initialize with empty profiles
      return { profiles: [] };
    }
    throw err;
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function listProfiles() {
  const data = readData();
  return data.profiles;
}

function addProfile(profile) {
  const data = readData();
  if (data.profiles.find(p => p.name === profile.name)) {
    throw new Error(`Profile with name "${profile.name}" already exists`);
  }
  data.profiles.push(profile);
  writeData(data);
  return profile;
}

function updateProfile(name, updatedProfile) {
  const data = readData();
  const index = data.profiles.findIndex(p => p.name === name);
  if (index === -1) {
    throw new Error(`Profile with name "${name}" not found`);
  }
  data.profiles[index] = updatedProfile;
  writeData(data);
  return updatedProfile;
}

function deleteProfile(name) {
  const data = readData();
  const index = data.profiles.findIndex(p => p.name === name);
  if (index === -1) {
    throw new Error(`Profile with name "${name}" not found`);
  }
  const deleted = data.profiles[index];
  data.profiles.splice(index, 1);
  writeData(data);
  return deleted;
}

function getProfile(name) {
  const data = readData();
  const profile = data.profiles.find(p => p.name === name);
  if (!profile) {
    throw new Error(`Profile with name "${name}" not found`);
  }
  return profile;
}

async function testProfile(name, keyName = 'apiKey') {
  const profile = getProfile(name);
  try {
    if (!profile.baseUrl) {
      return {
        valid: false,
        error: 'Profile baseUrl is missing'
      };
    }

    // Use enhanced authentication system if profile has authConfig, otherwise use legacy method
    let headers = {};
    let url = profile.baseUrl;
    
    if (profile.authConfig) {
      // Build authentication based on profile configuration
      const authHeaders = buildAuthHeaders(profile, keyName);
      headers = { ...headers, ...authHeaders };
      
      // Add query parameters if authentication location is query
      if (profile.authConfig.location === 'query' && profile.authConfig.paramName) {
        const apiKey = profile.keys[keyName] || Object.values(profile.keys)[0];
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}${profile.authConfig.paramName}=${encodeURIComponent(apiKey)}`;
      }
    } else {
      // Legacy authentication method for backward compatibility
      const apiKey = profile.keys[keyName] || profile.keys.apiKey || Object.values(profile.keys)[0];
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // For LLM profiles, we do a two-step test:
    // 1. Fetch models from /models endpoint (may be publicly accessible)
    // 2. Make a minimal request to /chat/completions to actually validate the API key
    const isLLM = profile.apiType === 'llm' || (!profile.apiType && (!profile.testEndpoint || profile.testEndpoint === '/models'));
    
    if (isLLM) {
      let models = [];
      let modelsStatus = null;
      let modelsError = null;
      
      // Step 1: Try to fetch models list
      try {
        const modelsUrl = `${url}/models`;
        const modelsResponse = await fetch(modelsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        });
        modelsStatus = modelsResponse.status;
        
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          models = modelsData.data ? modelsData.data.map(model => model.id) : [];
        } else {
          modelsError = `Models endpoint returned status ${modelsResponse.status}`;
        }
      } catch (err) {
        modelsError = `Failed to fetch models: ${err.message}`;
      }
      
      // Step 2: Test the API key with a minimal chat completions request
      // Use the first available model or a common default
      const testModel = models.length > 0 ? models[0] : 'gpt-3.5-turbo';
      
      try {
        const chatUrl = `${url}/chat/completions`;
        const chatResponse = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1
          })
        });
        
        if (!chatResponse.ok) {
          const errorData = await chatResponse.json().catch(() => ({}));
          return {
            valid: false,
            status: chatResponse.status,
            error: `API key validation failed: ${errorData.error?.message || `Status ${chatResponse.status}`}`,
            models: models,
            modelsStatus: modelsStatus
          };
        }
        
        // API key is valid!
        return {
          valid: true,
          status: chatResponse.status,
          models: models,
          modelsStatus: modelsStatus,
          modelsError: modelsError,
          message: 'API key validated successfully via chat completions'
        };
      } catch (err) {
        return {
          valid: false,
          error: `Chat completions test failed: ${err.message}`,
          models: models,
          modelsStatus: modelsStatus,
          modelsError: modelsError
        };
      }
    }
    
    // For non-LLM profiles, use the configured test endpoint
    const testEndpoint = profile.testEndpoint || '/test';
    const testUrl = `${url}${testEndpoint}`;
    
    const response = await fetch(testUrl, {
      method: profile.testMethod || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    if (!response.ok) {
      return {
        valid: false,
        status: response.status,
        error: `API returned status ${response.status}`
      };
    }

    const data = await response.json();
    
    // Generic response format
    return {
      valid: true,
      status: response.status,
      response: data
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

function buildAuthHeaders(profile, keyName) {
  const apiKey = profile.keys[keyName] || Object.values(profile.keys)[0];
  const config = profile.authConfig || {};
  
  switch(profile.authMethod || 'bearer') {
    case 'bearer':
      return { 'Authorization': `Bearer ${apiKey}` };
    case 'apikey':
      const format = config.headerFormat || '{key}';
      return { [config.headerName || 'X-API-Key']: format.replace('{key}', apiKey) };
    case 'basic':
      // For basic auth, we might need both username and password
      const username = config.usernameField ? profile.keys[config.usernameField] : apiKey;
      const password = config.passwordField ? profile.keys[config.passwordField] : '';
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      return { 'Authorization': `Basic ${credentials}` };
    case 'custom':
      // Custom authentication logic
      return { [config.headerName]: config.headerFormat.replace('{key}', apiKey) };
    default:
      // Default to Bearer for backward compatibility
      return { 'Authorization': `Bearer ${apiKey}` };
  }
}

module.exports = {
  listProfiles,
  addProfile,
  updateProfile,
  deleteProfile,
  getProfile,
  testProfile,
  sendLLMMessageToModel,
  buildAuthHeaders
};

async function sendLLMMessageToModel(name, keyName, modelName, message) {
  const profile = getProfile(name);
  try {
    if (!profile.baseUrl) {
      throw new Error('Profile baseUrl is missing');
    }

    // Use enhanced authentication system if profile has authConfig, otherwise use legacy method
    let headers = {};
    
    if (profile.authConfig) {
      // Build authentication based on profile configuration
      const authHeaders = buildAuthHeaders(profile, keyName);
      headers = { ...headers, ...authHeaders };
    } else {
      // Legacy authentication method for backward compatibility
      const apiKey = profile.keys[keyName] || profile.keys.apiKey || Object.values(profile.keys)[0];
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${profile.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`LLM API returned status ${response.status}: ${errorData.error.message || JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return {
      success: true,
      response: data.choices[0].message.content
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}