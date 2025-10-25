# Vercel Blob Storage Setup Guide

Complete guide to set up persistent storage for your basketball algorithm on Vercel.

---

## Why Use Blob Storage?

Without Blob storage:
- ❌ Player data stored in `/tmp` (deleted when function restarts)
- ❌ Data lost after each deployment
- ❌ Must re-collect data every time

With Blob storage:
- ✅ Player data persists across deployments
- ✅ Data survives function restarts
- ✅ Collect data once, use forever
- ✅ Automatic backups

---

## Step 1: Enable Vercel Blob Storage

### 1.1 Go to Vercel Dashboard

1. Open https://vercel.com/dashboard
2. Click on your project (`basketball-algo` or your project name)
3. Go to the **Storage** tab

### 1.2 Create Blob Store

1. Click **"Create Database"**
2. Select **"Blob"**
3. Give it a name: `basketball-data`
4. Click **"Create"**

### 1.3 Get Your Token

Vercel will automatically add `BLOB_READ_WRITE_TOKEN` to your environment variables.

**To verify:**
1. Go to **Settings** → **Environment Variables**
2. Check that `BLOB_READ_WRITE_TOKEN` exists
3. It should be set for **Production**, **Preview**, and **Development**

---

## Step 2: Deploy Updated Code

The code is already set up to use Blob storage! Just deploy it.

### 2.1 Commit Changes

```bash
cd C:\Users\chrni\Desktop\projects\basketball-algorithm

git add .
git commit -m "Add Vercel Blob storage support"
git push
```

### 2.2 Wait for Deployment

Vercel will auto-deploy (1-2 minutes). Check the deployment status at:
- https://vercel.com/dashboard

### 2.3 Verify It Works

```bash
curl https://basketball-algo.vercel.app/api/health
```

**Expected:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "..."
}
```

---

## Step 3: Upload Existing Player Data

If you have player data files in your `data/` folder, upload them to Blob storage.

### Method 1: Using the Upload Script (Recommended)

#### 3.1 Get Your Blob Token

1. Go to Vercel Dashboard → Your Project → **Storage** → **Blob**
2. Click **"Copy Token"**

#### 3.2 Set Token Locally

**Windows (PowerShell):**
```powershell
$env:BLOB_READ_WRITE_TOKEN="your_token_here"
```

**Windows (Command Prompt):**
```cmd
set BLOB_READ_WRITE_TOKEN=your_token_here
```

**Mac/Linux:**
```bash
export BLOB_READ_WRITE_TOKEN="your_token_here"
```

#### 3.3 Run Upload Script

```bash
npm run upload-to-blob
```

**Expected output:**
```
🏀 Basketball Algorithm - Upload to Vercel Blob

Found 5 player file(s) to upload

✅ Uploaded: LeBron James (player_123.json)
   URL: https://blob.vercel-storage.com/...

✅ Uploaded: Stephen Curry (player_456.json)
   URL: https://blob.vercel-storage.com/...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
   ✅ Uploaded: 5
   ⏭️  Skipped:  0
   ❌ Errors:   0
   📁 Total:    5

🎉 Player data successfully uploaded to Vercel Blob!
```

### Method 2: Collect Data Directly on Vercel

Instead of uploading, collect fresh data via the API:

```bash
curl -X POST https://basketball-algo.vercel.app/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "LeBron James",
    "teamName": "Lakers",
    "seasons": ["2023-2024", "2024-2025"]
  }'
```

The data will automatically be saved to Blob storage!

---

## Step 4: Verify Data is in Blob

### 4.1 Check via API

```bash
curl https://basketball-algo.vercel.app/api/players
```

**Expected:**
```json
{
  "success": true,
  "players": [
    {
      "id": 123,
      "name": "LeBron James",
      "team": "Los Angeles Lakers",
      "seasons": ["2023-2024", "2024-2025"],
      "totalGames": 82,
      "lastUpdated": "2025-10-25T..."
    }
  ]
}
```

### 4.2 Check in Vercel Dashboard

1. Go to **Storage** → **Blob**
2. You should see files like `player_123.json`
3. Click on a file to view its contents

---

## How It Works

### Local Development

When running `npm start` locally:
- Uses local file system (`data/` folder)
- Files stored in `C:\Users\chrni\Desktop\projects\basketball-algorithm\data`
- Fast and easy to debug

### Production (Vercel)

When deployed to Vercel:
- Automatically detects `VERCEL` environment variable
- Uses Blob storage instead of file system
- Files stored at `https://blob.vercel-storage.com/...`
- Persistent across deployments

### The Code

**Storage Service** (`src/services/storageService.js`):
```javascript
if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
  // Use Vercel Blob
  await put('player_123.json', data, { access: 'public' });
} else {
  // Use local file system
  fs.writeFileSync('data/player_123.json', data);
}
```

---

## Testing

### Test 1: Collect New Player

```bash
curl -X POST https://basketball-algo.vercel.app/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "Giannis Antetokounmpo",
    "teamName": "Bucks",
    "seasons": ["2023-2024", "2024-2025"]
  }'
```

**Success response:**
```json
{
  "success": true,
  "player": "Giannis Antetokounmpo",
  "team": "Milwaukee Bucks",
  "seasons": ["2023-2024", "2024-2025"],
  "totalGames": 75
}
```

### Test 2: Retrieve Player

```bash
curl https://basketball-algo.vercel.app/api/player/Giannis
```

**Success response:**
```json
{
  "success": true,
  "player": {
    "id": 456,
    "name": "Giannis Antetokounmpo"
  },
  "seasons": [
    { "season": "2023-2024", "games": 40 },
    { "season": "2024-2025", "games": 35 }
  ],
  "totalGames": 75,
  "lastUpdated": "2025-10-25T..."
}
```

### Test 3: Make Prediction

```bash
curl -X POST https://basketball-algo.vercel.app/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "Giannis",
    "statType": "points",
    "line": 30.5
  }'
```

**Success response:**
```json
{
  "success": true,
  "player": "Giannis Antetokounmpo",
  "prop": "POINTS 30.5",
  "probability": {
    "over": "62.50%",
    "under": "37.50%",
    "method": "Hybrid (Statistical + ML)"
  },
  "recommendation": {
    "bet": "OVER",
    "strength": "MODERATE"
  }
}
```

---

## Costs

### Vercel Blob Pricing

**Free Tier (Hobby):**
- 500 MB storage
- 5 GB bandwidth/month
- ✅ Enough for 1000+ player files

**Pro Tier ($20/month):**
- 100 GB storage
- 1 TB bandwidth/month

### Estimate for Your Use Case

Average player file size: ~50 KB

- 10 players = 500 KB
- 100 players = 5 MB
- 1,000 players = 50 MB ✅ Well within free tier

---

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN not found"

**Cause:** Blob storage not enabled or token not set

**Fix:**
1. Go to Vercel Dashboard → Storage → Create Blob
2. Token is automatically added to environment variables
3. Redeploy your project

### Error: "Failed to upload to Blob"

**Cause:** Token expired or invalid

**Fix:**
1. Go to Vercel Dashboard → Storage → Blob
2. Click "Copy Token" to get a fresh token
3. Update environment variable
4. Try again

### Files Not Showing in `/api/players`

**Cause:** Files might not be uploaded yet

**Fix:**
1. Upload files using `npm run upload-to-blob`
2. OR collect data via `/api/collect` endpoint
3. Check Vercel Dashboard → Storage → Blob to verify files exist

### Local Development Uses Blob Instead of Files

**Cause:** `BLOB_READ_WRITE_TOKEN` set in local `.env`

**Fix:**
1. Remove `BLOB_READ_WRITE_TOKEN` from `.env`
2. Local development will use file system
3. Production will use Blob (token from Vercel)

---

## Advanced: Manual Blob Operations

### Upload a File

```javascript
import { put } from '@vercel/blob';

const blob = await put('player_123.json', JSON.stringify(data), {
  access: 'public',
  contentType: 'application/json',
});

console.log('Uploaded to:', blob.url);
```

### Read a File

```javascript
import { head } from '@vercel/blob';

const { url } = await head('player_123.json');
const response = await fetch(url);
const data = await response.json();
```

### List Files

```javascript
import { list } from '@vercel/blob';

const { blobs } = await list({ prefix: 'player_' });
blobs.forEach(blob => {
  console.log(blob.pathname, blob.size);
});
```

### Delete a File

```javascript
import { del } from '@vercel/blob';

await del('player_123.json');
console.log('Deleted!');
```

---

## Migration Checklist

- [ ] **Enable Blob storage** in Vercel Dashboard
- [ ] **Commit and push** updated code
- [ ] **Wait for deployment** to complete
- [ ] **Test `/api/health`** endpoint
- [ ] **Upload existing data** via script OR
- [ ] **Collect new data** via API
- [ ] **Verify data** via `/api/players`
- [ ] **Test predictions** with player data
- [ ] **Remove local workarounds** (if any)

---

## Summary

### Before Blob Storage:
```
User Request → Vercel Function → /tmp/data → ❌ Lost on restart
```

### After Blob Storage:
```
User Request → Vercel Function → Blob Storage → ✅ Persistent forever
```

### Benefits:
- ✅ Data survives deployments
- ✅ No re-collection needed
- ✅ Automatic backups
- ✅ Fast CDN delivery
- ✅ Free for most use cases

---

**Your data is now persistent and production-ready!** 🎉

For questions or issues, check the [Vercel Blob documentation](https://vercel.com/docs/storage/vercel-blob).
