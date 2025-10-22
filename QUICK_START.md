# Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies (1 minute)
```bash
cd C:\Users\chrni\Desktop\projects\basketball-algorithm
npm install
```

### 2. Add Your API Key (30 seconds)
Create a `.env` file:
```bash
copy .env.example .env
```

Then edit `.env` and add your API-Sports key:
```
API_SPORTS_KEY=your_actual_api_key_here
```

### 3. Collect Player Data (2 minutes)
```bash
npm run predict collect -- --player "LeBron James"
```

### 4. Make Your First Prediction (1 minute)
```bash
npm run predict -- --player "LeBron James" --stat points --line 25.5 --home
```

## Web Interface Setup (Alternative)

### Start the Server
```bash
npm run web
```

### Open Browser
Navigate to: http://localhost:3000

### Use the Interface
1. Go to "Collect Data" tab
2. Enter "LeBron James"
3. Click "Collect Player Data"
4. Wait for data collection
5. Go to "Single Prop" tab
6. Fill in the form and click "Calculate Probability"

## Your First Complete Workflow

```bash
# Step 1: Install
npm install

# Step 2: Collect data for a player
npm run predict collect -- --player "Stephen Curry"

# Step 3: Analyze points prop
npm run predict -- --player "Stephen Curry" --stat points --line 28.5 --home

# Step 4: Analyze all props
npm run predict analyze -- --player "Stephen Curry" --points 28.5 --rebounds 5.5 --assists 6.5 --home
```

## Common Commands

```bash
# Collect player data
npm run predict collect -- --player "Player Name"

# Single prediction
npm run predict -- --player "Name" --stat points --line 25.5 --home

# Multiple props
npm run predict analyze -- --player "Name" --points 25.5 --rebounds 10.5 --assists 8.5 --home

# Start web interface
npm run web
```

## What You Get

✅ **Probability Calculations**: Over/Under probabilities using hybrid statistical + ML approach

✅ **Detailed Analysis**:
- Mean, median, weighted averages
- Historical hit rates
- Trend analysis (increasing/decreasing/stable)
- Home/away splits
- ML predictions
- Confidence scores

✅ **Smart Recommendations**:
- OVER/UNDER bet suggestions
- Strength indicators (STRONG/MODERATE/WEAK)
- Reasoning for recommendations
- Confidence levels

✅ **Multiple Interfaces**:
- CLI for quick checks
- Web UI for detailed analysis
- REST API for integration

## Troubleshooting

**"Player not found"**
- Check spelling exactly as it appears in API-Sports database
- Try variations: "LeBron James" vs "Lebron James"

**"Insufficient data"**
- Need at least 10 games with 15+ minutes played
- Collect more recent seasons

**API errors**
- Verify your API key in `.env` file
- Check your API-Sports subscription is active

**"Module not found"**
- Run `npm install` first
- Make sure you're in the correct directory

## Next Steps

1. ✅ Read full documentation: `README.md`
2. ✅ Check usage examples: `EXAMPLES.md`
3. ✅ Collect data for your favorite players
4. ✅ Start making predictions!
5. ✅ Track results and refine your strategy

## Support

- Documentation: See README.md
- Examples: See EXAMPLES.md
- API Docs: https://api-sports.io/documentation/basketball/v1

Happy predicting! 🏀📊
