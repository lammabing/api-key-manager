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
  .action(async (name) => {
    try {
      const result = await profiles.testProfile(name);
      if (result.valid) {
        console.log(`✅ Profile "${name}" is valid.`);
        console.log(`Endpoint: ${profiles.getProfile(name).endpoint}`);
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