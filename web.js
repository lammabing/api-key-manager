const express = require('express');
const bodyParser = require('body-parser');
const profiles = require('./profiles');
const path = require('path'); // Import path module

const app = express();
const port = 3025;

app.use(bodyParser.json());

// List all profiles
app.get('/profiles', (req, res) => {
  try {
    const allProfiles = profiles.listProfiles();
    res.json(allProfiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a profile by name
app.get('/profiles/:name', (req, res) => {
  try {
    const profile = profiles.getProfile(req.params.name);
    res.json(profile);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Get keys for a profile by name
app.get('/profiles/:name/keys', (req, res) => {
  try {
    const profile = profiles.getProfile(req.params.name);
    res.json(profile.keys);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Add a new profile
app.post('/profiles', (req, res) => {
  try {
    const profile = req.body;
    if (!profile.name) {
      return res.status(400).json({ error: 'Profile name is required' });
    }
    const newProfile = profiles.addProfile(profile);
    res.status(201).json(newProfile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a profile
app.put('/profiles/:name', (req, res) => {
  try {
    const name = req.params.name;
    const updatedProfile = req.body;
    if (name !== updatedProfile.name) {
      return res.status(400).json({ error: 'Profile name mismatch' });
    }
    const result = profiles.updateProfile(name, updatedProfile);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a profile
app.delete('/profiles/:name', (req, res) => {
  try {
    const deleted = profiles.deleteProfile(req.params.name);
    res.json({ message: `Profile "${deleted.name}" deleted` });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Send LLM message
app.post('/send-llm-message', async (req, res) => {
  try {
    const { name, keyName, modelName, message } = req.body;
    if (!name || !modelName || !message) {
      return res.status(400).json({ error: 'Profile name, model name, and message are required' });
    }
    const result = await profiles.sendLLMMessageToModel(name, keyName, modelName, message);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Test profile connection
app.post('/test-profile', async (req, res) => {
  try {
    const { name, keyName } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Profile name is required' });
    }
    const result = await profiles.testProfile(name, keyName);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Serve static files (including index.html) - Moved after API routes
app.use(express.static(__dirname));

// Serve index.html for the root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Web server running at http://localhost:${port}`);
});