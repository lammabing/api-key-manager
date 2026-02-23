# Extending API Key Manager for Generic API Services

## Executive Summary

The current API Key Manager is specifically designed for managing API keys for LLM providers. This document explores approaches to extend the functionality to support API keys for any online service and application, maintaining backward compatibility while adding flexibility for various authentication methods and API types.

## Current Limitations

### Hardcoded Assumptions
- Authentication: Assumes Bearer token authentication
- Test Endpoint: Hardcoded `/models` endpoint for testing
- Response Format: Expects specific LLM model response format
- UI Elements: LLM-specific features like model selection and chat interface

### Supported API Types
Currently only supports LLM APIs with Bearer token authentication

## Required Enhancements

### 1. Enhanced Data Model
Extend the profile schema to support various API configurations:

```json
{
  "profiles": [
    {
      "name": "string",
      "baseUrl": "string",
      "apiType": "llm|rest|oauth|custom",
      "authMethod": "bearer|apikey|basic|digest|hmac|oauth2|custom",
      "authConfig": {
        "headerName": "Authorization",
        "headerFormat": "Bearer {key}",
        "paramName": "api_key",
        "location": "header|query|body",
        "usernameField": "username",
        "passwordField": "password"
      },
      "testEndpoint": "/models",
      "testMethod": "GET|POST|PUT|DELETE",
      "testBody": {},
      "testHeaders": {},
      "validationRules": {
        "statusCode": 200,
        "requiredFields": ["array"],
        "responseFormat": "json|text|xml"
      },
      "keys": {
        "keyName": "keyValue"
      },
      "metadata": {
        "serviceName": "OpenAI",
        "description": "string",
        "tags": ["ai", "ml"]
      }
    }
  ]
}
```

### 2. Flexible Authentication System

#### Authentication Builder Function
```javascript
function buildAuthHeaders(profile, keyName) {
  const apiKey = profile.keys[keyName] || Object.values(profile.keys)[0];
  const config = profile.authConfig || {};
  
  switch(profile.authMethod) {
    case 'bearer':
      return { 'Authorization': `Bearer ${apiKey}` };
    case 'apikey':
      const format = config.headerFormat || '{key}';
      return { [config.headerName || 'X-API-Key']: format.replace('{key}', apiKey) };
    case 'basic':
      const credentials = Buffer.from(`${config.username || apiKey}:${config.password || ''}`).toString('base64');
      return { 'Authorization': `Basic ${credentials}` };
    case 'query':
      return {}; // Query params handled separately
    case 'custom':
      // Custom authentication logic
      return { [config.headerName]: config.headerFormat.replace('{key}', apiKey) };
    default:
      return { 'Authorization': `Bearer ${apiKey}` }; // Default fallback
  }
}
```

### 3. Generic Testing Framework

#### Enhanced testProfile Function
```javascript
async function testProfile(name, keyName = 'apiKey') {
  const profile = getProfile(name);
  
  try {
    if (!profile.baseUrl) {
      return {
        valid: false,
        error: 'Profile baseUrl is missing'
      };
    }

    const authHeaders = buildAuthHeaders(profile, keyName);
    
    // Build URL with query parameters if needed
    let testUrl = `${profile.baseUrl}${profile.testEndpoint || '/test'}`;
    if (profile.authConfig?.location === 'query' && profile.authConfig?.paramName) {
      const apiKey = profile.keys[keyName] || Object.values(profile.keys)[0];
      const separator = testUrl.includes('?') ? '&' : '?';
      testUrl += `${separator}${profile.authConfig.paramName}=${encodeURIComponent(apiKey)}`;
    }
    
    const response = await fetch(testUrl, {
      method: profile.testMethod || 'GET',
      headers: { 
        'Content-Type': 'application/json',
        ...authHeaders,
        ...profile.testHeaders 
      },
      ...(profile.testMethod !== 'GET' && profile.testBody && { 
        body: JSON.stringify(profile.testBody) 
      })
    });

    // Apply validation rules
    const isValid = validateApiResponse(response, profile.validationRules);
    
    return {
      valid: isValid,
      status: response.status,
      response: await response.json().catch(() => ({})),
      message: isValid ? 'Connection successful' : 'Validation failed'
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

function validateApiResponse(response, validationRules) {
  if (!validationRules) return response.ok;
  
  // Check status code
  if (validationRules.statusCode && response.status !== validationRules.statusCode) {
    return false;
  }
  
  // Additional validation logic can be added here
  
  return response.ok;
}
```

### 4. UI/UX Improvements

#### Enhanced Profile Creation Form
- API type selection dropdown
- Authentication method configuration
- Custom endpoint configuration
- Advanced options for complex APIs

#### Dynamic UI Elements
- Conditionally display LLM-specific features
- Generic response display for any API type
- Service-specific UI elements based on API type

## Implementation Approaches

### Approach 1: Enhanced Data Model (Recommended)
**Complexity**: Moderate  
**Timeline**: 2-3 weeks  
**Risk**: Low  

Builds incrementally on the existing codebase with minimal disruption.

#### Approach 2: Plugin-Based Architecture
**Complexity**: High  
**Timeline**: 4-6 weeks  
**Risk**: Medium  

More extensible but requires significant architectural changes.

#### Approach 3: Template-Based Configuration
**Complexity**: Moderate  
**Timeline**: 2-3 weeks  
**Risk**: Low  

Uses predefined templates for common API types with customization options.

## Implementation Phases

### Phase 1: Core Enhancements (Week 1-2)
1. Update data model to support authentication configuration
2. Modify CRUD operations to handle new fields
3. Update CLI to support new configuration options
4. Implement flexible authentication builder

### Phase 2: Testing Framework (Week 2-3)
1. Enhance testProfile function with generic testing
2. Update web API endpoints to support new functionality
3. Implement validation rules system

### Phase 3: UI Updates (Week 3-4)
1. Update web interface to support configuration options
2. Implement dynamic UI elements
3. Add filtering and organization features

### Phase 4: Advanced Features (Week 4+)
1. Add OAuth support with token refresh
2. Implement API-specific UI elements
3. Add bulk operations and import/export features

## Backward Compatibility

The enhanced system will maintain full backward compatibility:
- Existing profiles will continue to work with default settings
- LLM-specific functionality remains intact
- Default authentication method remains Bearer token
- Default test endpoint remains `/models`

## Security Considerations

1. Continue to address plaintext storage issue (already on roadmap)
2. Ensure authentication configuration doesn't expose keys unnecessarily
3. Validate all user inputs for configuration parameters
4. Sanitize API responses before displaying in UI

## Conclusion

Extending the API Key Manager to support generic API services is highly feasible with the recommended approach of enhancing the data model. This approach maintains backward compatibility while providing the flexibility needed for various API types. The modular architecture of the current system facilitates this extension with manageable complexity.

The implementation can be phased to minimize risk and allow for iterative improvements based on user feedback.