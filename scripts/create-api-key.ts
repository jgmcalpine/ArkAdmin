#!/usr/bin/env node

/**
 * Script to generate a new API key
 * Usage: npx tsx scripts/create-api-key.ts [label]
 * Example: npx tsx scripts/create-api-key.ts "Devin's App"
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';

// Safety check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing. Make sure .env exists.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function createApiKey(label?: string) {
  try {
    // Generate a key starting with "sk_live_" + random string
    // Using multiple random parts for better uniqueness
    const randomSuffix = Array.from({ length: 3 }, () => 
      Math.random().toString(36).substring(2, 15)
    ).join('');
    const key = `sk_live_${randomSuffix}`;

    // Save to database
    const apiKey = await prisma.apiKey.create({
      data: {
        key,
        label: label || null,
        isActive: true,
      },
    });

    console.log('\n✅ API Key created successfully!');
    console.log(`\nKey: ${apiKey.key}`);
    if (apiKey.label) {
      console.log(`Label: ${apiKey.label}`);
    }
    console.log(`ID: ${apiKey.id}`);
    console.log(`Created: ${apiKey.createdAt}\n`);

    return apiKey;
  } catch (error) {
    console.error('❌ Failed to create API key:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get label from command line arguments
const label = process.argv[2];

createApiKey(label)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

