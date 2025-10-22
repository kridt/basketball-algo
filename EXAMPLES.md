# Usage Examples

## Getting Started

### Step 1: Setup
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your API key to .env
# API_SPORTS_KEY=your_api_key_here
```

### Step 2: Collect Player Data
```bash
# Collect data for a single player
npm run predict collect -- --player "LeBron James"

# Collect for specific seasons
npm run predict collect -- --player "Stephen Curry" --seasons 2024,2025

# Collect for multiple players (run separately)
npm run predict collect -- --player "Kevin Durant"
npm run predict collect -- --player "Giannis Antetokounmpo"
npm run predict collect -- --player "Luka Doncic"
```

## CLI Examples

### Basic Predictions

```bash
# Points prediction
npm run predict -- \
  --player "LeBron James" \
  --stat points \
  --line 25.5 \
  --home

# Rebounds prediction
npm run predict -- \
  --player "Anthony Davis" \
  --stat rebounds \
  --line 11.5 \
  --away \
  --opponent "Celtics"

# Assists prediction
npm run predict -- \
  --player "Chris Paul" \
  --stat assists \
  --line 8.5 \
  --home \
  --minutes 32

# Combined PRA (Points + Rebounds + Assists)
npm run predict -- \
  --player "Luka Doncic" \
  --stat pra \
  --line 42.5 \
  --home
```

### Multiple Props Analysis

```bash
# Analyze all props for a player
npm run predict analyze -- \
  --player "Stephen Curry" \
  --points 28.5 \
  --rebounds 5.5 \
  --assists 6.5 \
  --pra 40.5 \
  --home \
  --opponent "Lakers"

# Analyze subset of props
npm run predict analyze -- \
  --player "Nikola Jokic" \
  --points 24.5 \
  --rebounds 12.5 \
  --assists 9.5 \
  --away
```

## Web Interface Examples

### Starting the Server
```bash
# Start web server (default port 3000)
npm run web

# Or specify custom port
PORT=8080 npm run web
```

### Single Prop Analysis (Web)
1. Navigate to http://localhost:3000
2. Select "Single Prop" tab
3. Fill in:
   - Player Name: LeBron James
   - Stat Type: Points
   - Over/Under Line: 25.5
   - Game Location: Home
   - Opponent: Lakers (optional)
   - Expected Minutes: 35 (optional)
4. Click "Calculate Probability"

### Multiple Props Analysis (Web)
1. Select "Multiple Props" tab
2. Fill in:
   - Player Name: Kevin Durant
   - Points Line: 27.5
   - Rebounds Line: 6.5
   - Assists Line: 5.5
   - PRA Line: 39.5
   - Game Location: Away
   - Opponent: Warriors
3. Click "Analyze All Props"

## API Examples

### Using cURL

#### Single Prediction
```bash
curl -X POST http://localhost:3000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "LeBron James",
    "statType": "points",
    "line": 25.5,
    "gameContext": {
      "isHome": true,
      "opponent": "Lakers",
      "expectedMinutes": 35
    }
  }'
```

#### Multiple Props
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "Stephen Curry",
    "lines": {
      "points": 28.5,
      "rebounds": 5.5,
      "assists": 6.5,
      "pra": 40.5
    },
    "gameContext": {
      "isHome": false,
      "opponent": "Celtics"
    }
  }'
```

#### Collect Data
```bash
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "Giannis Antetokounmpo",
    "seasons": ["2023", "2024", "2025"]
  }'
```

#### Calculate Edge vs Bookmaker
```bash
curl -X POST http://localhost:3000/api/edge \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "Luka Doncic",
    "statType": "points",
    "line": 32.5,
    "bookmakerOdds": -110,
    "gameContext": {
      "isHome": true
    }
  }'
```

### Using JavaScript/Node.js

```javascript
// prediction-example.js
import fetch from 'node-fetch';

async function getPrediction() {
  const response = await fetch('http://localhost:3000/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerName: 'LeBron James',
      statType: 'points',
      line: 25.5,
      gameContext: {
        isHome: true,
        opponent: 'Lakers',
        expectedMinutes: 35
      }
    })
  });

  const result = await response.json();
  console.log(result);
}

getPrediction();
```

### Using Python

```python
# prediction_example.py
import requests
import json

def get_prediction():
    url = 'http://localhost:3000/api/predict'
    data = {
        'playerName': 'LeBron James',
        'statType': 'points',
        'line': 25.5,
        'gameContext': {
            'isHome': True,
            'opponent': 'Lakers',
            'expectedMinutes': 35
        }
    }

    response = requests.post(url, json=data)
    result = response.json()
    print(json.dumps(result, indent=2))

get_prediction()
```

## Advanced Usage

### Custom Configuration

Create a custom configuration for specific analysis:

```javascript
// custom-analysis.js
import probabilityCalculator from './src/models/probabilityCalculator.js';
import dataCollector from './src/services/dataCollector.js';

async function customAnalysis() {
  // Load player data
  const playerData = dataCollector.loadPlayerDataByName('LeBron James');

  // Filter specific game conditions
  const homeGames = dataCollector.filterGames(
    dataCollector.getAllGames(playerData),
    { home: true, minMinutes: 30 }
  );

  console.log(`Analyzing ${homeGames.length} home games with 30+ minutes`);

  // Calculate custom probability
  const result = await probabilityCalculator.calculateProbability(
    'LeBron James',
    'points',
    25.5,
    { isHome: true, expectedMinutes: 35 }
  );

  console.log(result);
}

customAnalysis();
```

### Batch Analysis

Analyze multiple players at once:

```javascript
// batch-analysis.js
import probabilityCalculator from './src/models/probabilityCalculator.js';

async function batchAnalysis() {
  const players = [
    { name: 'LeBron James', stat: 'points', line: 25.5 },
    { name: 'Stephen Curry', stat: 'points', line: 28.5 },
    { name: 'Giannis Antetokounmpo', stat: 'points', line: 29.5 },
    { name: 'Luka Doncic', stat: 'assists', line: 8.5 }
  ];

  for (const player of players) {
    console.log(`\nAnalyzing ${player.name}...`);

    const result = await probabilityCalculator.calculateProbability(
      player.name,
      player.stat,
      player.line,
      { isHome: true }
    );

    console.log(`${player.name} ${player.stat} ${player.line}`);
    console.log(`Over: ${result.probability.over}, Recommendation: ${result.recommendation.bet}`);
  }
}

batchAnalysis();
```

### Compare Home vs Away

```javascript
// home-away-comparison.js
import probabilityCalculator from './src/models/probabilityCalculator.js';

async function compareHomeAway() {
  const player = 'LeBron James';
  const stat = 'points';
  const line = 25.5;

  console.log(`Comparing home vs away for ${player}...\n`);

  // Home prediction
  const homeResult = await probabilityCalculator.calculateProbability(
    player, stat, line, { isHome: true }
  );

  // Away prediction
  const awayResult = await probabilityCalculator.calculateProbability(
    player, stat, line, { isHome: false }
  );

  console.log(`HOME: Over ${homeResult.probability.over} | Rec: ${homeResult.recommendation.bet}`);
  console.log(`AWAY: Over ${awayResult.probability.over} | Rec: ${awayResult.recommendation.bet}`);
}

compareHomeAway();
```

## Real-World Scenario

### Daily Props Analysis Workflow

```bash
# 1. Update player data (run once per week)
npm run predict collect -- --player "LeBron James"
npm run predict collect -- --player "Stephen Curry"
npm run predict collect -- --player "Kevin Durant"

# 2. Check today's props (example for specific game day)
npm run predict -- --player "LeBron James" --stat points --line 26.5 --home
npm run predict -- --player "Stephen Curry" --stat points --line 29.5 --away --opponent "Lakers"
npm run predict -- --player "Kevin Durant" --stat pra --line 41.5 --home

# 3. Get detailed analysis for best bet
npm run predict analyze -- \
  --player "Luka Doncic" \
  --points 32.5 \
  --rebounds 8.5 \
  --assists 8.5 \
  --pra 49.5 \
  --home \
  --opponent "Warriors"
```

### Integration with Betting Strategy

```javascript
// betting-strategy.js
import probabilityCalculator from './src/models/probabilityCalculator.js';

async function findValueBets() {
  const props = [
    { player: 'LeBron James', stat: 'points', line: 25.5, bookmakerOdds: -110 },
    { player: 'Stephen Curry', stat: 'points', line: 28.5, bookmakerOdds: -105 },
    { player: 'Giannis Antetokounmpo', stat: 'rebounds', line: 11.5, bookmakerOdds: -115 }
  ];

  const valueBets = [];

  for (const prop of props) {
    const result = await probabilityCalculator.calculateProbability(
      prop.player,
      prop.stat,
      prop.line,
      { isHome: true }
    );

    const edge = probabilityCalculator.calculateEdge(
      result.probability.rawOver,
      prop.bookmakerOdds
    );

    if (edge.hasEdge && result.confidence.score > 0.65) {
      valueBets.push({
        player: prop.player,
        prop: result.prop,
        edge: edge.edge,
        confidence: result.confidence.level,
        recommendation: result.recommendation.bet
      });
    }
  }

  console.log('\nValue Bets Found:');
  valueBets.forEach(bet => {
    console.log(`${bet.player} - ${bet.prop}`);
    console.log(`  Edge: ${bet.edge} | Confidence: ${bet.confidence} | Bet: ${bet.recommendation}\n`);
  });
}

findValueBets();
```

## Troubleshooting Examples

### Check if Data Exists
```bash
# List all collected player data
ls data/player_*.json

# View specific player data
cat data/player_237.json | head -50
```

### Re-collect Data if Stale
```bash
# Delete old cache
rm -rf data/cache/*

# Re-collect
npm run predict collect -- --player "LeBron James" --seasons 2024,2025
```

### Test API Connection
```bash
curl http://localhost:3000/api/health
```

## Performance Tips

1. **Pre-collect data** for all players you track
2. **Use caching** - avoid re-collecting frequently
3. **Batch API calls** when analyzing multiple props
4. **Filter by minutes** to exclude low-usage games
5. **Update weekly** during active season

## Next Steps

After running these examples:
1. Track your predictions vs actual results
2. Adjust confidence thresholds based on your risk tolerance
3. Integrate with your own betting tracking system
4. Experiment with different line values to find optimal bets
