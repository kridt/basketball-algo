# NBA Value Bets - Basketball Probability Algorithm

Real-time Expected Value (EV) analysis for NBA player props across multiple bookmakers (Bet365 & Kambi).

## Features

- Automated scanning of all players with upcoming games
- EV calculation comparing algorithm probabilities vs bookmaker odds
- Support for Points, Rebounds, and Assists markets
- Real-time odds from Bet365 and Kambi
- Clean, responsive web interface

## Deployment to Vercel

### Prerequisites

1. GitHub account
2. Vercel account (sign up at [vercel.com](https://vercel.com))
3. Odds API key from [api.odds-api.io](https://api.odds-api.io)
4. Sports API key from [api-sports.io](https://api-sports.io)

### Step 1: Prepare Your Repository

1. Initialize git (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a GitHub repository and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/basketball-algorithm.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure Project:
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
5. Add Environment Variables:
   - `ODDS_API_KEY`: Your Odds API key
   - `SPORTS_API_KEY`: Your Sports API key
6. Click "Deploy"

### Step 3: Upload Player Data

Since the `data/` folder is git ignored, you need to manually upload player JSON files:

1. Go to your Vercel project dashboard
2. Navigate to Storage → Browse
3. Upload your `data/` folder with player_*.json files

OR collect data after deployment using the API:
```bash
curl -X POST https://your-app.vercel.app/api/collect \
  -H "Content-Type: application/json" \
  -d '{"playerName":"LeBron","teamName":"Lakers","seasons":["2023-2024","2024-2025"]}'
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. Collect player data (optional):
   ```bash
   npm run collect-all -- --teams "Lakers,Warriors,Celtics"
   ```

4. Start the server:
   ```bash
   npm run web
   # Or with custom port:
   PORT=3001 npm run web
   ```

5. Open http://localhost:3000 (or your custom port)

## API Endpoints

- `GET /` - Landing page with auto-scanning value bets
- `GET /api/value-bets?minEV=0.05` - Get all value bets (min EV threshold)
- `GET /api/players` - List all saved players
- `POST /api/collect` - Collect player data
- `POST /api/predict-with-odds` - Calculate probability with bookmaker odds
- `GET /api/next-match/:team` - Get next match for a team

## Project Structure

```
basketball-algorithm/
├── src/
│   ├── server.js           # Express server & API endpoints
│   ├── models/             # Probability calculators
│   ├── services/           # API services (odds, data collection)
│   └── analysis/           # Statistical & ML analysis
├── public/
│   ├── index.html          # Landing page (value bets table)
│   └── app.js              # Player detail view
├── data/                   # Player statistics (gitignored)
├── vercel.json             # Vercel configuration
└── package.json
```

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript
- **APIs**: Odds API (odds-api.io), Sports API (api-sports.io)
- **Deployment**: Vercel Serverless

## Notes

- The app auto-scans for value bets on page load
- Minimum EV threshold is set to 5% by default
- Player data should be collected before deployment for best results
- Odds are fetched in real-time from Bet365 and Kambi

## License

MIT
