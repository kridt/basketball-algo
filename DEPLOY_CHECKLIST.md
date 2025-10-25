# Vercel Deployment Checklist

Quick checklist for deploying to Vercel. See **VERCEL_DEPLOYMENT_GUIDE.md** for detailed instructions.

## Pre-Deployment

- [ ] **Environment variables ready**
  - [ ] API_SPORTS_KEY obtained from [api-sports.io](https://api-sports.io)
  - [ ] ODDS_API_KEY obtained from [the-odds-api.com](https://the-odds-api.com)

- [ ] **Local testing passed**
  - [ ] Server starts without errors: `npm start`
  - [ ] Health endpoint works: `curl http://localhost:3000/api/health`
  - [ ] API endpoints tested locally

- [ ] **Git repository ready**
  - [ ] All changes committed: `git status`
  - [ ] Sensitive files in .gitignore (.env, data/)
  - [ ] README.md updated with your info

## GitHub Setup

- [ ] **Create GitHub repository**
  - Repository name: `basketball-algorithm` (or your choice)
  - Visibility: Private (recommended)

- [ ] **Push to GitHub**
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/basketball-algorithm.git
  git branch -M main
  git push -u origin main
  ```

## Vercel Deployment

- [ ] **Create Vercel account**
  - Sign up at [vercel.com](https://vercel.com)
  - Connect with GitHub account

- [ ] **Import project**
  - Click "Add New..." → "Project"
  - Select your repository
  - Click "Import"

- [ ] **Configure settings**
  - Framework: Other/Node.js ✅
  - Build Command: (leave empty) ✅
  - Output Directory: (leave empty) ✅
  - Root Directory: `.` ✅

- [ ] **Add environment variables**
  - [ ] `API_SPORTS_KEY` = your_key (Production, Preview, Development)
  - [ ] `ODDS_API_KEY` = your_key (Production, Preview, Development)
  - [ ] `NODE_ENV` = production (auto-set, verify)

- [ ] **Deploy**
  - Click "Deploy" button
  - Wait 1-3 minutes
  - Note your deployment URL

## Post-Deployment Verification

- [ ] **Test deployed API**
  ```bash
  # Health check
  curl https://YOUR-APP.vercel.app/api/health

  # Should return: {"success":true,"status":"ok",...}
  ```

- [ ] **Verify endpoints**
  - [ ] GET /api/health ✅
  - [ ] GET /api/players (returns empty array initially)
  - [ ] POST /api/predict (may error without data - normal)

- [ ] **Collect player data**
  ```bash
  curl -X POST https://YOUR-APP.vercel.app/api/collect \
    -H "Content-Type: application/json" \
    -d '{"playerName":"LeBron","teamName":"Lakers","seasons":["2023-2024","2024-2025"]}'
  ```

## Optional Enhancements

- [ ] **Custom domain**
  - Add domain in Vercel dashboard
  - Configure DNS records

- [ ] **Enable analytics** (Pro plan only)
  - View in Vercel dashboard

- [ ] **Set up monitoring**
  - Add Sentry for error tracking
  - Set up uptime monitoring

## Troubleshooting

### Deployment fails with "Module not found"
```bash
npm install
git add package.json package-lock.json
git commit -m "Fix dependencies"
git push
```

### Environment variables not working
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Verify all keys are set for all environments
- Redeploy (don't need to push)

### API returns errors
- Check Vercel logs: Dashboard → Deployments → [Latest] → Logs
- Look for error messages

## Final Steps

- [ ] **Save deployment URL**
  - Production: `https://YOUR-APP.vercel.app`

- [ ] **Update README.md**
  - Replace `YOUR_USERNAME` with actual username
  - Add your deployment URL

- [ ] **Test from different device**
  - Verify public accessibility

## Success Criteria

✅ Deployment shows green checkmark in Vercel
✅ Health endpoint returns 200 OK
✅ No errors in Vercel logs
✅ API endpoints accessible publicly
✅ Player data collection works

---

**Deployment Time:** ~5-10 minutes total

**Need help?** See [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md) for detailed troubleshooting.
