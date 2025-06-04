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

    // Look for the API key by the specified keyName, default to 'apiKey' or first key if not found
    let apiKey;
    if (keyName && profile.keys[keyName]) {
      apiKey = profile.keys[keyName];
    } else {
      // Fallback to 'apiKey' key if keyName is provided but not found, or use first key if not
      apiKey = profile.keys.apiKey || Object.values(profile.keys)[0];
    }

    if (!apiKey) {
      return {
        valid: false,
        error: 'No API key found for the specified key'
      };
    }

    const response = await fetch(`${profile.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
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
    return {
      valid: true,
      status: response.status,
      models: data.data ? data.data.map(model => model.id) : []
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

module.exports = {
  listProfiles,
  addProfile,
  updateProfile,
  deleteProfile,
  getProfile,
  testProfile
};