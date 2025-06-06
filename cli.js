#!/usr/bin/env node
const { Command } = require('commander');
const profiles = require('./profiles');

const program = new Command();

program
  .name('api-key-manager')
  .description('CLI tool to manage API key profiles')
  .version('1.0.0');

program.command('list')
  .description('List all profiles')
  .action(() => {
    const allProfiles = profiles.listProfiles();
    console.log(JSON.stringify(allProfiles, null, 2));
  });

program.command('get <name>')
  .description('Get profile details by name')
  .action((name) => {
    try {
      const profile = profiles.getProfile(name);
      console.log(JSON.stringify(profile, null, 2));
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.command('add <name>')
  .description('Add a new profile')
  .option('-k, --keys <keys>', 'API keys as key=value pairs separated by commas')
  .option('-u, --url <url>', 'Base URL for the profile')
  .action((name, options) => {
    try {
      // Parse keys string into object
      const keys = {};
      if (options.keys) {
        options.keys.split(',').forEach(pair => {
          const [key, value] = pair.split('=');
          keys[key] = value;
        });
      }

      const profile = {
        name,
        baseUrl: options.url || '',
        keys
      };

      profiles.addProfile(profile);
      console.log(`Profile "${name}" added successfully.`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.command('update <name>')
  .description('Update an existing profile')
  .option('-k, --keys <keys>', 'API keys as key=value pairs separated by commas')
  .option('-u, --url <url>', 'Base URL for the profile')
  .action((name, options) => {
    try {
      const existingProfile = profiles.getProfile(name);
      const updatedProfile = { ...existingProfile };

      if (options.url) {
        updatedProfile.baseUrl = options.url;
      }

      if (options.keys) {
        updatedProfile.keys = {};
        options.keys.split(',').forEach(pair => {
          const [key, value] = pair.split('=');
          updatedProfile.keys[key] = value;
        });
      }

      profiles.updateProfile(name, updatedProfile);
      console.log(`Profile "${name}" updated successfully.`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.command('delete <name>')
  .description('Delete a profile by name')
  .action((name) => {
    try {
      profiles.deleteProfile(name);
      console.log(`Profile "${name}" deleted successfully.`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.command('test <name>')
  .description('Test the profile connection and API key validity')
  .option('-k, --key <keyName>', 'Specify the key to use for testing')
  .action(async (name, options) => {
    try {
      const profile = profiles.getProfile(name);
      const keys = Object.keys(profile.keys);
      let selectedKey = options.key;

      if (!selectedKey && keys.length > 1) {
        console.log(`Profile "${name}" has multiple keys:`);
        keys.forEach((key, index) => {
          console.log(`${index + 1}. ${key}`);
        });

        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        selectedKey = await new Promise(resolve => {
          readline.question('Please select a key by number or name: ', answer => {
            readline.close();
            const index = parseInt(answer) - 1;
            if (!isNaN(index) && index >= 0 && index < keys.length) {
              resolve(keys[index]);
            } else if (keys.includes(answer)) {
              resolve(answer);
            } else {
              console.error('Invalid selection. Using the first available key.');
              resolve(keys[0]);
            }
          });
        });
      } else if (!selectedKey && keys.length === 1) {
        selectedKey = keys[0];
      } else if (!selectedKey && keys.length === 0) {
        console.error(`❌ Profile "${name}" has no keys.`);
        process.exit(1);
      }

      const result = await profiles.testProfile(name, selectedKey);
      if (result.valid) {
        console.log(`✅ Profile "${name}" is valid.`);
        console.log(`Endpoint: ${profile.baseUrl}`);
        console.log(`Models: ${result.models.join(', ')}`);
      } else {
        console.error(`❌ Profile "${name}" is invalid.`);
        if (result.status) {
          console.error(`Status: ${result.status}`);
        }
        console.error(`Error: ${result.error}`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);