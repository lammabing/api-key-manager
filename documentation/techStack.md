# Technology Stack

## Core Components
- **Backend**: Node.js
- **Web Framework**: Express.js
- **Frontend**: Vanilla JavaScript
- **Data Storage**: JSON files

## Module Dependencies
- express: Web server framework
- body-parser: Request body parsing
- commander: CLI command handling

## Data Structures
```json
{
  "profiles": [
    {
      "name": "string",
      "baseUrl": "string",
      "keys": {
        "keyName": "keyValue"
      }
    }
  ]
}
```

## API Endpoints
- GET /profiles - List all profiles
- GET /profiles/:name - Get profile by name
- POST /profiles - Create new profile
- PUT /profiles/:name - Update profile
- DELETE /profiles/:name - Delete profile
- POST /test-profile - Test profile connection
- GET /profiles/:name/keys - Get keys for a profile by name

## Security
- API keys stored in plaintext (to be encrypted)

---
_Last updated: 2025-06-04, 8:07:00 PM (Asia/Shanghai) by Documentation Bot_