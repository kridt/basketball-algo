# Quick Start: Vercel Blob Storage

**TL;DR:** How to upload your player files to Vercel Blob in 5 minutes.

---

## Step 1: Enable Blob Storage (1 minute)

1. Go to https://vercel.com/dashboard
2. Click your project (`basketball-algo`)
3. Go to **Storage** tab → Click **"Create Database"** → Select **"Blob"**
4. Name it `basketball-data` → Click **"Create"**

✅ **Done!** Vercel automatically adds `BLOB_READ_WRITE_TOKEN` to your environment variables.

---

## Step 2: Deploy Updated Code (2 minutes)

```bash
cd C:\Users\chrni\Desktop\projects\basketball-algorithm

git add .
git commit -m "Add Vercel Blob storage support"
git push
```

Wait 1-2 minutes for Vercel to deploy.

✅ **Test it works:**
```bash
curl https://basketball-algo.vercel.app/api/health
```

---

## Step 3: Upload Your Player Files (2 minutes)

### Option A: Upload Script (if you have local files)

1. **Get your Blob token:**
   - Vercel Dashboard → Storage → Blob → Click **"Copy Token"**

2. **Set the token locally:**
   ```powershell
   # Windows PowerShell
   $env:BLOB_READ_WRITE_TOKEN="paste_token_here"
   ```

3. **Run upload:**
   ```bash
   npm run upload-to-blob
   ```

**Expected output:**
```
✅ Uploaded: LeBron James (player_123.json)
✅ Uploaded: Stephen Curry (player_456.json)

🎉 Player data successfully uploaded to Vercel Blob!
```

### Option B: Collect Fresh Data (if starting from scratch)

```bash
curl -X POST https://basketball-algo.vercel.app/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "LeBron James",
    "teamName": "Lakers",
    "seasons": ["2023-2024", "2024-2025"]
  }'
```

Data automatically saved to Blob!

---

## Step 4: Verify (30 seconds)

```bash
curl https://basketball-algo.vercel.app/api/players
```

**Should return your players:**
```json
{
  "success": true,
  "players": [
    {
      "name": "LeBron James",
      "team": "Los Angeles Lakers",
      "totalGames": 82
    }
  ]
}
```

---

## ✅ Done!

Your data is now persistent and will survive deployments!

**What's different:**
- Before: Data lost on every deployment ❌
- After: Data persists forever ✅

---

## Troubleshooting

**"BLOB_READ_WRITE_TOKEN not found"**
→ Enable Blob storage in Vercel Dashboard first

**"No files uploaded"**
→ Make sure you have player files in `data/` folder

**"Token invalid"**
→ Get a fresh token from Vercel Dashboard → Storage → Blob → Copy Token

---

**For detailed instructions, see [BLOB_STORAGE_GUIDE.md](BLOB_STORAGE_GUIDE.md)**
