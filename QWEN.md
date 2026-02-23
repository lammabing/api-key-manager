# API Key Manager - Project Context

## Project Overview

The API Key Manager is a Node.js-based tool for managing and testing API keys for various services. It provides both a command-line interface (CLI) and a web dashboard to create, read, update, delete, and test API profiles. The project stores API profiles in a JSON file (`profiles.json`) and allows users to manage multiple API keys per profile with different base URLs for various API providers.

### Key Features
- **Profile Management**: Create, read, update, and delete API profiles
- **Multi-key Support**: Store multiple API keys per profile with named keys
- **Testing Capabilities**: Test API endpoint connectivity with selectable API keys
- **Dual Interface**: Both CLI and web-based interfaces
- **API Provider Support**: Designed to work with various API providers (OpenAI, Anthropic, etc.)

### Architecture
- **Backend**: Node.js with Express.js framework
- **Frontend**: Vanilla JavaScript with HTML/CSS
- **Data Storage**: Local JSON file (`profiles.json`)
- **CLI Framework**: Commander.js for command parsing

## Building and Running

### Prerequisites
- Node.js (v14 or higher recommended)
- npm (comes with Node.js)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the web server:
   ```bash
   node web.js
   ```
   The web dashboard will be accessible at: http://localhost:3025

### CLI Usage
```bash
# List profiles
node cli.js list

# Create profile
node cli.js add my-profile --keys "apiKey=sk-123" --url "https://api.example.com/v1"

# Test profile (interactive key selection if multiple keys exist)
node cli.js test my-profile

# Test profile with a specific key
node cli.js test my-profile --key mySpecificKey

# Get profile details
node cli.js get my-profile

# Update profile
node cli.js update my-profile --keys "apiKey=new-sk-123" --url "https://api.newexample.com/v1"

# Delete profile
node cli.js delete my-profile
```

### Web Interface
After starting the web server with `node web.js`, access the dashboard at http://localhost:3025 to manage profiles through the graphical interface.

## Development Conventions

### File Structure
- `cli.js`: Command-line interface implementation
- `web.js`: Express web server and API endpoints
- `profiles.js`: Core profile management logic and API testing functions
- `index.html`: Web dashboard frontend
- `profiles.json`: Data storage (created automatically)
- `documentation/`: Project documentation files
- `package.json`: Project dependencies and scripts

### Data Model
Profiles are stored in the following JSON format:
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

### API Endpoints
- `GET /profiles` - List all profiles
- `GET /profiles/:name` - Get profile by name
- `GET /profiles/:name/keys` - Get keys for a profile by name
- `POST /profiles` - Create new profile
- `PUT /profiles/:name` - Update profile
- `DELETE /profiles/:name` - Delete profile
- `POST /test-profile` - Test profile connection
- `POST /send-llm-message` - Send message to LLM model

### Security Notes
- Currently, API keys are stored in plaintext in the `profiles.json` file
- Future versions plan to implement encryption at rest
- The web interface allows copying keys to clipboard for easy access

### Testing Functionality
The project includes API testing capabilities that:
- Validate API endpoint connectivity
- Retrieve available models from the API provider
- Support user-selectable API keys for testing
- Provide feedback on connection status and errors

## Planned Enhancements
According to the project roadmap, future features include:
- API key encryption at rest
- Key rotation automation
- Usage monitoring
- Audit logging
- Browser extension for API key injection

## Important Considerations
- API keys are currently stored in plaintext - this is a known security limitation
- The application listens on localhost:3025 by default
- Profiles are persisted in the `profiles.json` file in the project root
- The web interface provides full CRUD functionality plus testing capabilities