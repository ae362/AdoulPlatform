#!/usr/bin/env node

/**
 * PASSWORD HASH GENERATOR
 * Generates a password hash using the project's internal hashing algorithm (scrypt)
 */

const crypto = require('crypto');
const util = require('util');
const readline = require('readline');

const scrypt = util.promisify(crypto.scrypt);

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const SEPARATOR = '.';

/**
 * Hashes a password using scrypt
 * Matches the logic in reset-user-password.js
 */
async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}${SEPARATOR}${derivedKey.toString('hex')}`;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🔐 PASSWORD HASH GENERATOR');
  console.log('='.repeat(30));

  try {
    const password = await question('\nEnter the password to hash: ');
    
    if (!password) {
      console.log('❌ Password cannot be empty.');
      process.exit(0);
    }

    console.log('\nGenerating hash...');
    const hash = await hashPassword(password);
    
    console.log('\n✅ Hash generated successfully:');
    console.log('-'.repeat(30));
    console.log(hash);
    console.log('-'.repeat(30));
    console.log('\nYou can use this hash in your SQL scripts or manual database updates.');
    
  } catch (error) {
    console.error(`\n❌ Error generating hash: ${error.message}`);
  } finally {
    rl.close();
  }
}

main();
