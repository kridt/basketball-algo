# NBA Value Bets - Basketball Probability Algorithm

Real-time Expected Value (EV) analysis for NBA player props across multiple bookmakers.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/basketball-algorithm)

## Features

- 🏀 Automated scanning of all players with upcoming games
- 📊 EV calculation comparing algorithm probabilities vs bookmaker odds
- 🎯 Support for Points, Rebounds, and Assists markets
- 💰 Real-time odds from multiple bookmakers
- 🎨 Clean, responsive web interface
- ⚡ Serverless deployment on Vercel

## Quick Start

### Local Development

1. **Clone and Install**
```bash
git clone https://github.com/YOUR_USERNAME/basketball-algorithm.git
cd basketball-algorithm
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env and add your API keys:
# - API_SPORTS_KEY (from api-sports.io)
# - ODDS_API_KEY (from the-odds-api.com)
```

3. **Start Server**
```bash
npm start
# Server runs at http://localhost:3000
```

4. **Collect Player Data** (optional)
```bash
npm run collect -- --teams "Lakers,Warriors,Celtics"
```

### Deploy to Vercel

See **[VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)** for complete deployment instructions.

**Quick Deploy:**
1. Push to GitHub
2. Import to Vercel
3. Add environment variables (API keys)
4. Deploy! 🚀

## Project Structure

```
basketball-algorithm/
├── api/                    # Vercel serverless functions
│   └── index.js           # Main serverless entry point
├── src/
│   ├── config/            # Configuration & constants
│   ├── controllers/       # Business logic layer
│   ├── routes/            # API route definitions
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utilities (logger, validators)
│   ├── services/          # API services & data collection
│   ├── models/            # Probability calculators
│   ├── analysis/          # Statistical & ML analysis
│   └── server.js          # Express app
├── public/                # Static frontend files
├── data/                  # Player statistics (gitignored)
├── tests/                 # Test files
└── package.json
```

## API Endpoints

### Health & Info
- `GET /api/health` - Health check

### Player Management
- `GET /api/players` - List all saved players
- `GET /api/player/:name` - Get cached player data
- `POST /api/collect` - Collect player data from API

### Predictions
- `POST /api/predict` - Calculate probability for a single prop
- `POST /api/analyze` - Analyze multiple props for a player
- `POST /api/predict-with-odds` - Calculate probability with EV based on bookmaker odds
- `POST /api/edge` - Calculate edge vs bookmaker odds

### Odds & Value Bets
- `GET /api/next-match/:team` - Get next match for a team
- `GET /api/value-bets?minEV=0.05` - Find all players with positive EV bets

## Example Usage

### Predict Player Prop
```bash
curl -X POST https://your-app.vercel.app/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "LeBron James",
    "statType": "points",
    "line": 25.5,
    "gameContext": {
      "isHome": true
    }
  }'
```

### Collect Player Data
```bash
curl -X POST https://your-app.vercel.app/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "LeBron James",
    "teamName": "Lakers",
    "seasons": ["2023-2024", "2024-2025"]
  }'
```

### Scan for Value Bets
```bash
curl https://your-app.vercel.app/api/value-bets?minEV=0.05
```

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript
- **APIs**:
  - [API-Sports.io](https://api-sports.io) - Basketball statistics
  - [The Odds API](https://the-odds-api.com) - Live betting odds
- **Deployment**: Vercel Serverless Functions
- **Analysis**: Statistical methods + Machine Learning

## Configuration

Environment variables (set in `.env` or Vercel dashboard):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_SPORTS_KEY` | ✅ Yes | - | Your API-Sports.io API key |
| `ODDS_API_KEY` | ✅ Yes | - | Your Odds API key |
| `PORT` | No | 3000 | Local server port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `CACHE_EXPIRY_HOURS` | No | 24 | Cache expiration in hours |
| `ENABLE_CACHING` | No | true | Enable/disable caching |
| `ENABLE_LOGGING` | No | true | Enable/disable logging |

## Development

### Available Scripts

```bash
npm start           # Start server
npm run dev         # Start with nodemon (auto-reload)
npm run predict     # CLI prediction tool
npm run collect     # Collect single player data
npm run collect-all # Collect multiple players
npm run web         # Start web server
```

### Adding New Features

See **[REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)** for architecture details.

**To add a new endpoint:**
1. Create controller method in `src/controllers/`
2. Add route in `src/routes/`
3. Add validation in `src/utils/validators.js` (if needed)

## Deployment

### Vercel (Recommended)

Complete guide: **[VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)**

**Quick steps:**
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

- **Railway**: Similar to Vercel, great for Node.js
- **Render**: Free tier available
- **AWS Lambda**: More configuration needed
- **DigitalOcean App Platform**: Good for traditional deployments

## Data Storage

Player statistics are stored in `data/` directory (gitignored).

**Options for production:**
1. **Collect via API**: Use `/api/collect` endpoint after deployment
2. **Vercel Blob Storage**: For persistent serverless storage
3. **Database**: PostgreSQL, MongoDB for scalability

## Security

- ✅ Environment variables for API keys
- ✅ Input validation on all endpoints
- ✅ Error handling with proper status codes
- ✅ Request logging
- ⚠️ Add rate limiting (see recommendations)
- ⚠️ Add API key authentication (optional)

## Monitoring

- **Logs**: View in Vercel Dashboard → Deployments → Logs
- **Analytics**: Available on Vercel Pro plan
- **Errors**: Consider adding [Sentry](https://sentry.io)

## Troubleshooting

### "Module not found" error
```bash
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### "Player data not found"
Data files are gitignored. Use `/api/collect` to gather player stats after deployment.

### Cold starts on Vercel
First request after inactivity may be slow (3-5s). This is normal for serverless.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

- 📖 **Documentation**: See `VERCEL_DEPLOYMENT_GUIDE.md` and `REFACTORING_SUMMARY.md`
- 🐛 **Issues**: Open an issue on GitHub
- 💬 **Discussions**: Use GitHub Discussions

## Roadmap

- [ ] Comprehensive test coverage
- [ ] API documentation (Swagger)
- [ ] Database integration
- [ ] Real-time WebSocket updates
- [ ] ML model improvements
- [ ] Mobile app
- [ ] More sports (NFL, MLB, NHL)

---

**Made with ❤️ for NBA betting enthusiasts**

*Disclaimer: This tool is for educational and entertainment purposes. Gamble responsibly.*
