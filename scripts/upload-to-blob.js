#!/usr/bin/env node

/**
 * Upload existing player data files to Vercel Blob storage
 *
 * Usage:
 *   node scripts/upload-to-blob.js
 *
 * Requirements:
 *   - BLOB_READ_WRITE_TOKEN environment variable must be set
 *   - Player data files must exist in data/ directory
 */

import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');

async function uploadPlayerFiles() {
  console.log('🏀 Basketball Algorithm - Upload to Vercel Blob\n');

  // Check for BLOB_READ_WRITE_TOKEN
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable not set');
    console.log('\nTo get your token:');
    console.log('1. Go to https://vercel.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to Storage → Blob → Copy Token\n');
    process.exit(1);
  }

  // Check if data directory exists
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Error: Data directory not found: ${dataDir}`);
    console.log('\nNo player data files to upload.');
    process.exit(1);
  }

  // Get all player JSON files
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('player_') && f.endsWith('.json'));

  if (files.length === 0) {
    console.log('⚠️  No player data files found in data/ directory');
    console.log('\nCollect some player data first using:');
    console.log('  npm run collect -- --player "LeBron James" --team "Lakers"\n');
    process.exit(0);
  }

  console.log(`Found ${files.length} player file(s) to upload\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filepath = path.join(dataDir, file);
    const content = fs.readFileSync(filepath, 'utf8');

    try {
      // Check if file already exists in Blob
      let exists = false;
      try {
        const { blobs } = await list({ prefix: file.replace('.json', ''), limit: 1 });
        exists = blobs.length > 0;
      } catch (error) {
        // File doesn't exist
      }

      if (exists) {
        console.log(`⏭️  Skipped: ${file} (already exists)`);
        skipped++;
        continue;
      }

      // Upload to Blob
      const blob = await put(file, content, {
        access: 'public',
        contentType: 'application/json',
      });

      // Parse to get player name
      const data = JSON.parse(content);
      const playerName = data.player?.name || 'Unknown';

      console.log(`✅ Uploaded: ${playerName} (${file})`);
      console.log(`   URL: ${blob.url}\n`);
      uploaded++;
    } catch (error) {
      console.error(`❌ Error uploading ${file}: ${error.message}\n`);
      errors++;
    }
  }

  console.log('━'.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Uploaded: ${uploaded}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Errors:   ${errors}`);
  console.log(`   📁 Total:    ${files.length}\n`);

  if (uploaded > 0) {
    console.log('🎉 Player data successfully uploaded to Vercel Blob!');
    console.log('\nYour data is now persistent and will survive deployments.\n');
  }
}

// Run the upload
uploadPlayerFiles().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
