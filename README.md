# API Key Manager

A tool to manage and test API keys for various services.

## Features
- Create, read, update, delete API profiles
- Test API endpoint connectivity with selectable API keys
- CLI and web interfaces
- Secure key storage (future)

## Quick Start
1. Install dependencies:
```bash
npm install
```

2. Start the web server:
```bash
node web.js
```

3. Access the web dashboard at:
http://localhost:3025

## CLI Usage
```bash
# List profiles
node cli.js list

# Create profile
node cli.js add my-profile --keys "apiKey=sk-123" --url "https://api.example.com/v1"

# Test profile (interactive key selection if multiple keys exist)
node cli.js test my-profile

# Test profile with a specific key
node cli.js test my-profile --key mySpecificKey

# More commands: get, update, delete
```

## Documentation
See [documentation](documentation/) for detailed architecture and roadmap.

---
_Last updated: 2025-06-04, 8:08:15 PM (Asia/Shanghai) by Documentation Bot_