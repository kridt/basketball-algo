# Vercel Deployment Guide

## Complete Step-by-Step Guide to Deploy Basketball Algorithm to Vercel

---

## Prerequisites

1. **GitHub Account** (sign up at [github.com](https://github.com))
2. **Vercel Account** (sign up at [vercel.com](https://vercel.com))
3. **API Keys**:
   - Sports API key from [api-sports.io](https://api-sports.io/documentation/basketball/v1)
   - Odds API key from [api.odds-api.io](https://api.odds-api.io) or [the-odds-api.com](https://the-odds-api.com)

---

## Step 1: Prepare Your Repository

### 1.1 Initialize Git (if not already done)

```bash
cd C:\Users\chrni\Desktop\projects\basketball-algorithm
git init
```

### 1.2 Commit All Changes

```bash
# Stage all changes
git add .

# Commit with a message
git commit -m "Refactored project structure for Vercel deployment"
```

### 1.3 Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `basketball-algorithm` (or your preferred name)
3. Make it **Private** (recommended since it contains proprietary logic)
4. **DO NOT** initialize with README (you already have one)
5. Click **Create repository**

### 1.4 Push to GitHub

GitHub will show you commands. Copy and run them:

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/basketball-algorithm.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME`** with your actual GitHub username.

---

## Step 2: Deploy to Vercel

### 2.1 Sign Up / Log In to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. **Choose "Continue with GitHub"** (easiest method)
4. Authorize Vercel to access your GitHub account

### 2.2 Import Your Project

1. Click **"Add New..."** → **"Project"**
2. You'll see a list of your GitHub repositories
3. Find **`basketball-algorithm`** and click **"Import"**

### 2.3 Configure Project Settings

Vercel will auto-detect the settings. Verify these:

**Framework Preset:**
- Should detect: **"Other"** or **"Node.js"** ✅

**Root Directory:**
- Leave as: **`.`** (root) ✅

**Build Command:**
- Leave **EMPTY** or set to: `npm install` ✅

**Output Directory:**
- Leave **EMPTY** ✅

**Install Command:**
- Should be: `npm install` ✅

### 2.4 Add Environment Variables

**CRITICAL:** Add your API keys before deploying.

Click **"Environment Variables"** section and add these:

| Name | Value | Notes |
|------|-------|-------|
| `API_SPORTS_KEY` | `your_actual_api_key` | Required |
| `ODDS_API_KEY` | `your_actual_odds_key` | Required |
| `NODE_ENV` | `production` | Auto-set by Vercel |
| `CACHE_EXPIRY_HOURS` | `24` | Optional (default: 24) |
| `ENABLE_CACHING` | `true` | Optional (default: true) |
| `ENABLE_LOGGING` | `true` | Optional (default: true) |

**To add each variable:**
1. Enter the **Name** (exactly as shown above)
2. Enter the **Value**
3. Select **"Production"**, **"Preview"**, and **"Development"** (all three)
4. Click **"Add"**

### 2.5 Deploy

1. Click **"Deploy"**
2. Wait 1-3 minutes for deployment to complete
3. You'll see a success screen with confetti 🎉

---

## Step 3: Verify Deployment

### 3.1 Get Your Deployment URL

Vercel will give you a URL like:
```
https://basketball-algorithm-YOUR_USERNAME.vercel.app
```

### 3.2 Test the API

**Health Check:**
```bash
curl https://your-app-name.vercel.app/api/health
```

**Expected response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-10-25T22:30:00.000Z"
}
```

**Test Get Players:**
```bash
curl https://your-app-name.vercel.app/api/players
```

**Expected response:**
```json
{
  "success": true,
  "players": []
}
```

---

## Step 4: Upload Player Data (Important!)

Your `data/` folder is gitignored, so player statistics won't be deployed automatically.

### Option A: Collect Data via API (Recommended)

**After deployment**, collect player data using the API:

```bash
# Replace with your actual Vercel URL
curl -X POST https://your-app-name.vercel.app/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "LeBron James",
    "teamName": "Lakers",
    "seasons": ["2023-2024", "2024-2025"]
  }'
```

Repeat for each player you want to track.

### Option B: Use Vercel Blob Storage (For Large Data)

If you have many players:

1. Install Vercel Blob:
```bash
npm install @vercel/blob
```

2. Go to Vercel Dashboard → Your Project → **Storage** → **Create Database** → **Blob**

3. Update `src/services/dataCollector.js` to use Vercel Blob instead of local files

**OR**

### Option C: Manual Upload via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Upload data folder (not recommended for large data)
# This is manual and needs redoing after each deploy
```

---

## Step 5: Custom Domain (Optional)

### 5.1 Add Your Domain

1. Go to **Project Settings** → **Domains**
2. Enter your domain: `api.yourdomain.com`
3. Follow DNS configuration instructions

### 5.2 Configure DNS

Add these records to your domain provider:

**CNAME Record:**
```
Name: api
Value: cname.vercel-dns.com
```

Wait 5-60 minutes for DNS to propagate.

---

## Step 6: Configure Production Settings

### 6.1 Function Regions

By default, Vercel deploys to `iad1` (Washington DC).

**To optimize latency:**
1. Go to **Project Settings** → **Functions**
2. Set region to nearest your users (e.g., `sfo1` for West Coast)

### 6.2 Serverless Function Timeout

Default: 10 seconds (Hobby plan) / 60 seconds (Pro)

**If you need longer timeouts:**
1. Upgrade to Vercel Pro
2. Go to **Project Settings** → **Functions**
3. Set **Maximal Duration** to 60s

### 6.3 Environment Variables Best Practices

**Never commit `.env` to Git!** (Already in `.gitignore` ✅)

**To update environment variables:**
1. Go to **Project Settings** → **Environment Variables**
2. Edit the variable
3. **Redeploy** for changes to take effect

---

## Step 7: Continuous Deployment

Every time you push to GitHub, Vercel will **automatically redeploy**.

### 7.1 Make a Change

```bash
# Edit a file
code src/server.js

# Commit
git add .
git commit -m "Update server configuration"

# Push
git push
```

### 7.2 Vercel Auto-Deploys

1. Vercel detects the push
2. Automatically builds and deploys
3. You get a notification when done

### 7.3 Preview Deployments

Every branch and PR gets a **preview URL**:
- `main` branch → production
- Other branches → `https://basketball-algorithm-git-BRANCH.vercel.app`

---

## Troubleshooting

### Error: "Module not found"

**Cause:** Dependency missing from `package.json`

**Fix:**
```bash
npm install missing-package --save
git add package.json package-lock.json
git commit -m "Add missing dependency"
git push
```

### Error: "Environment variable not found"

**Cause:** Missing API keys

**Fix:**
1. Go to **Project Settings** → **Environment Variables**
2. Add the missing variable
3. Click **Redeploy** (don't need to git push)

### Error: "Function execution timeout"

**Cause:** Operation takes > 10 seconds

**Fix:**
- Optimize slow queries
- Use caching
- Upgrade to Vercel Pro for 60s timeout

### Error: "ENOENT: no such file or directory, open data/player_*.json"

**Cause:** Data files not deployed (they're gitignored)

**Fix:**
- Use API to collect data (Option A above)
- OR implement Vercel Blob Storage (Option B)

### Cold Starts

**Symptom:** First request after inactivity is slow (3-5 seconds)

**Cause:** Serverless functions "sleep" after 5 minutes

**Fix:**
- This is normal for serverless
- Upgrade to Vercel Pro for faster cold starts
- Implement keep-alive pings (not recommended, wastes resources)

---

## Monitoring & Logs

### View Logs

1. Go to **Vercel Dashboard**
2. Click your project
3. Go to **Deployments** → Select deployment → **Logs**

### Real-Time Logs

```bash
vercel logs --follow
```

### Analytics (Pro only)

1. Go to **Analytics** tab
2. View request counts, response times, errors

---

## Costs

### Free (Hobby) Tier Limits:
- ✅ 100 GB bandwidth/month
- ✅ Serverless function execution: 100 GB-hours
- ✅ Unlimited projects
- ⚠️ 10s function timeout
- ⚠️ No custom team features

### Pro Tier ($20/month):
- ✅ 1 TB bandwidth
- ✅ 1000 GB-hours execution
- ✅ 60s function timeout
- ✅ Advanced analytics
- ✅ Team collaboration

**Recommended:** Start with Free tier, upgrade if needed.

---

## Security Best Practices

### 1. Use Environment Variables
✅ Never hardcode API keys
✅ Already configured in `src/config/env.js`

### 2. Add Rate Limiting
```bash
npm install express-rate-limit
```

See REFACTORING_SUMMARY.md → Priority 5

### 3. Enable CORS (if needed)
```bash
npm install cors
```

Add to `src/server.js`:
```javascript
import cors from 'cors';
app.use(cors({ origin: 'https://your-frontend.com' }));
```

### 4. API Key Authentication
Add middleware to protect endpoints:
```javascript
// src/middleware/auth.js
export const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.CLIENT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

---

## Testing Your Deployment

### Test Suite

Create `test-deployment.sh`:

```bash
#!/bin/bash
BASE_URL="https://your-app-name.vercel.app"

echo "Testing health endpoint..."
curl -s $BASE_URL/api/health | jq

echo "Testing players endpoint..."
curl -s $BASE_URL/api/players | jq

echo "Testing predict endpoint..."
curl -s -X POST $BASE_URL/api/predict \
  -H "Content-Type: application/json" \
  -d '{"playerName":"LeBron","statType":"points","line":25.5}' | jq
```

Run:
```bash
bash test-deployment.sh
```

---

## Next Steps After Deployment

1. ✅ **Test all endpoints** with real data
2. ✅ **Set up monitoring** (Sentry, LogRocket)
3. ✅ **Implement rate limiting** (see recommendations)
4. ✅ **Add API documentation** (Swagger)
5. ✅ **Collect player data** via API
6. ✅ **Set up custom domain** (optional)
7. ✅ **Configure alerts** for errors

---

## Useful Commands

```bash
# View deployment info
vercel

# Deploy manually (if auto-deploy disabled)
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Set environment variable via CLI
vercel env add API_SPORTS_KEY production

# Remove deployment
vercel rm deployment-url
```

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Discord:** https://vercel.com/discord
- **Vercel Support:** support@vercel.com (Pro plan only)
- **Your Project Dashboard:** https://vercel.com/dashboard

---

## Summary Checklist

- [ ] GitHub repository created and pushed
- [ ] Vercel project created
- [ ] Environment variables added (API_SPORTS_KEY, ODDS_API_KEY)
- [ ] Deployment successful (green checkmark)
- [ ] Health endpoint tested: `/api/health`
- [ ] Player data collected or uploaded
- [ ] All API endpoints tested
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up (optional)

---

**Congratulations! Your NBA Value Bets algorithm is now live on Vercel! 🎉🏀**

Your API is accessible at: `https://your-app-name.vercel.app/api`

---

## Quick Reference

**Production URL Format:**
```
https://[project-name]-[your-username].vercel.app
```

**API Endpoints:**
- GET `/api/health` - Health check
- GET `/api/players` - List all players
- GET `/api/player/:name` - Get player data
- POST `/api/collect` - Collect player data
- POST `/api/predict` - Calculate probability
- POST `/api/predict-with-odds` - Predict with bookmaker odds
- POST `/api/edge` - Calculate betting edge
- GET `/api/next-match/:team` - Get next match
- GET `/api/value-bets?minEV=0.05` - Scan for value bets

---

**Need help?** Check the troubleshooting section or open an issue on GitHub.
