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

// Recursively get all files from a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

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
    console.log('\nNo data files to upload.');
    process.exit(1);
  }

  // Get all JSON files recursively
  const allFiles = getAllFiles(dataDir);
  const files = allFiles.filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('⚠️  No data files found in data/ directory');
    console.log('\nCollect some data first using:');
    console.log('  npm run collect -- --player "LeBron James" --team "Lakers"\n');
    process.exit(0);
  }

  console.log(`Found ${files.length} file(s) to upload\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const filepath of files) {
    const content = fs.readFileSync(filepath, 'utf8');
    // Get relative path from data directory to preserve structure
    const relativePath = path.relative(dataDir, filepath).replace(/\\/g, '/');

    try {
      // Check if file already exists in Blob
      let exists = false;
      try {
        const { blobs } = await list({ prefix: relativePath.replace('.json', ''), limit: 1 });
        exists = blobs.length > 0;
      } catch (error) {
        // File doesn't exist
      }

      if (exists) {
        console.log(`⏭️  Skipped: ${relativePath} (already exists)`);
        skipped++;
        continue;
      }

      // Upload to Blob with relative path to maintain structure
      const blob = await put(relativePath, content, {
        access: 'public',
        contentType: 'application/json',
      });

      console.log(`✅ Uploaded: ${relativePath}`);
      console.log(`   URL: ${blob.url}\n`);
      uploaded++;
    } catch (error) {
      console.error(`❌ Error uploading ${relativePath}: ${error.message}\n`);
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
    console.log('🎉 Data successfully uploaded to Vercel Blob!');
    console.log('\nYour data is now persistent and will survive deployments.\n');
  }
}

// Run the upload
uploadPlayerFiles().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
