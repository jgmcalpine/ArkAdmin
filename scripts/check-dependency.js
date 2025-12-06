#!/usr/bin/env node

/**
 * Debug script to check if @second-tech/barkd-rest-client can be resolved
 * Usage: node scripts/check-dependency.js
 */

const path = require('path');

console.log('Checking dependency resolution for @second-tech/barkd-rest-client...\n');

try {
  // Try to resolve the main package
  const mainPath = require.resolve('@second-tech/barkd-rest-client');
  console.log('✓ Main package resolved:');
  console.log(`  ${mainPath}\n`);

  // Try to resolve from dist folder
  try {
    const distPath = require.resolve('@second-tech/barkd-rest-client/dist');
    console.log('✓ Dist folder resolved:');
    console.log(`  ${distPath}\n`);
  } catch (distError) {
    console.log('✗ Dist folder resolution failed:');
    console.log(`  ${distError.message}\n`);
  }

  // Check if the file actually exists
  const fs = require('fs');
  if (fs.existsSync(mainPath)) {
    console.log('✓ Resolved file exists on disk\n');
  } else {
    console.log('✗ Resolved file does NOT exist on disk\n');
  }

  // Try to require and check exports
  try {
    const pkg = require('@second-tech/barkd-rest-client');
    const exports = Object.keys(pkg);
    console.log('✓ Package can be required');
    console.log(`  Found ${exports.length} exports`);
    console.log(`  Key exports: ${exports.filter(e => ['Configuration', 'WalletApi', 'DefaultApi'].includes(e)).join(', ') || 'None of the expected exports found'}\n`);
  } catch (requireError) {
    console.log('✗ Package cannot be required:');
    console.log(`  ${requireError.message}\n`);
  }

  // Check symlink status
  try {
    const stats = fs.lstatSync(path.dirname(mainPath));
    if (stats.isSymbolicLink()) {
      const realPath = fs.realpathSync(path.dirname(mainPath));
      console.log('ℹ Package is a symlink:');
      console.log(`  Points to: ${realPath}\n`);
    }
  } catch (symlinkError) {
    // Not a symlink or error checking
  }

} catch (error) {
  console.log('✗ Failed to resolve package:');
  console.log(`  ${error.message}\n`);
  console.log('Troubleshooting steps:');
  console.log('  1. Run: npm install');
  console.log('  2. Verify the package exists in node_modules/@second-tech/barkd-rest-client');
  console.log('  3. Check if the SDK needs to be built (run npm install in the SDK directory)');
  process.exit(1);
}

