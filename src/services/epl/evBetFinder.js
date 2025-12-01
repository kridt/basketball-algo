// EPL EV Bet Finder - Simplified ES module version
import axios from 'axios';

// Configuration
const ODDS_API_KEY = process.env.ODDS_API_KEY || process.env.VITE_ODDS_API_KEY;
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const ODDS_API_BASE = 'https://api.odds-api.io/v3';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

// User's bookmakers (Danish market)
const USER_BOOKMAKERS = [
  "LeoVegas DK", "Expekt DK", "NordicBet", "Campobet DK", "Betano",
  "Bet365", "Unibet DK", "Betinia DK", "Betsson", "Kambi"
];

// Supported leagues
const SUPPORTED_LEAGUES = [
  { code: 'PL', slug: 'england-premier-league', name: 'Premier League' }
];

// Market mapping
const MARKET_MAPPING = {
  'goals': 'Totals',
  'corners': 'Corners Totals',
  'yellow_cards': 'Bookings Totals'
};

const MIN_EV_THRESHOLD = 3.0;

// In-memory cache
let cachedValueBets = [];
let lastCacheUpdate = null;

// Calculate probability using Poisson distribution
function poissonProbability(lambda, k) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function calculateOverUnderProbability(expectedTotal, line) {
  let underProb = 0;
  for (let k = 0; k <= Math.floor(line); k++) {
    underProb += poissonProbability(expectedTotal, k);
  }
  // Handle half lines
  if (line % 1 !== 0) {
    return { over: 1 - underProb, under: underProb };
  }
  const exactProb = poissonProbability(expectedTotal, line);
  return { over: 1 - underProb, under: underProb - exactProb };
}

// Fetch upcoming matches from football-data.org
async function fetchUpcomingMatches(leagueCode) {
  try {
    const response = await axios.get(
      `${FOOTBALL_DATA_BASE}/competitions/${leagueCode}/matches`,
      {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
        params: { status: 'SCHEDULED', limit: 20 }
      }
    );
    return response.data.matches || [];
  } catch (error) {
    console.error(`[EPL] Error fetching matches: ${error.message}`);
    return [];
  }
}

// Fetch team stats from football-data.org
async function fetchTeamStats(teamId) {
  try {
    const response = await axios.get(
      `${FOOTBALL_DATA_BASE}/teams/${teamId}/matches`,
      {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
        params: { status: 'FINISHED', limit: 10 }
      }
    );
    return response.data.matches || [];
  } catch (error) {
    return [];
  }
}

// Calculate team averages from recent matches
function calculateTeamAverages(matches, teamId) {
  if (!matches.length) return { goals: 2.5, corners: 5, cards: 2 };

  let totalGoals = 0, totalCorners = 0, totalCards = 0;

  for (const match of matches) {
    const isHome = match.homeTeam.id === teamId;
    const score = isHome ? match.score.fullTime.home : match.score.fullTime.away;
    totalGoals += score || 0;
    // Estimate corners/cards if not available
    totalCorners += 5;
    totalCards += 2;
  }

  return {
    goals: totalGoals / matches.length,
    corners: totalCorners / matches.length,
    cards: totalCards / matches.length
  };
}

// Generate predictions for a match
async function generateMatchPredictions(match) {
  const predictions = [];

  // Get team stats (with rate limit delay)
  await new Promise(r => setTimeout(r, 1000));
  const homeMatches = await fetchTeamStats(match.homeTeam.id);
  await new Promise(r => setTimeout(r, 1000));
  const awayMatches = await fetchTeamStats(match.awayTeam.id);

  const homeAvg = calculateTeamAverages(homeMatches, match.homeTeam.id);
  const awayAvg = calculateTeamAverages(awayMatches, match.awayTeam.id);

  // Goals prediction
  const expectedGoals = (homeAvg.goals + awayAvg.goals) * 1.1; // Home advantage
  const goalsProbs = calculateOverUnderProbability(expectedGoals, 2.5);

  if (goalsProbs.over > 0.55 && goalsProbs.over < 0.75) {
    predictions.push({
      statKey: 'goals',
      market: 'Goals',
      side: 'over',
      line: 2.5,
      probability: goalsProbs.over * 100,
      fairOdds: 1 / goalsProbs.over,
      matchPrediction: expectedGoals,
      homeAvg: homeAvg.goals,
      awayAvg: awayAvg.goals,
      confidence: goalsProbs.over > 0.6 ? 'high' : 'medium'
    });
  }

  if (goalsProbs.under > 0.55 && goalsProbs.under < 0.75) {
    predictions.push({
      statKey: 'goals',
      market: 'Goals',
      side: 'under',
      line: 2.5,
      probability: goalsProbs.under * 100,
      fairOdds: 1 / goalsProbs.under,
      matchPrediction: expectedGoals,
      homeAvg: homeAvg.goals,
      awayAvg: awayAvg.goals,
      confidence: goalsProbs.under > 0.6 ? 'high' : 'medium'
    });
  }

  // Corners prediction
  const expectedCorners = homeAvg.corners + awayAvg.corners;
  const cornersProbs = calculateOverUnderProbability(expectedCorners, 9.5);

  if (cornersProbs.over > 0.55 && cornersProbs.over < 0.75) {
    predictions.push({
      statKey: 'corners',
      market: 'Corners',
      side: 'over',
      line: 9.5,
      probability: cornersProbs.over * 100,
      fairOdds: 1 / cornersProbs.over,
      matchPrediction: expectedCorners,
      homeAvg: homeAvg.corners,
      awayAvg: awayAvg.corners,
      confidence: cornersProbs.over > 0.6 ? 'high' : 'medium'
    });
  }

  return predictions;
}

// Fetch odds from Odds API
async function fetchLeagueOdds(leagueSlug) {
  try {
    const eventsUrl = `${ODDS_API_BASE}/events?apiKey=${ODDS_API_KEY}&sport=football&league=${leagueSlug}&status=pending&limit=30`;
    const eventsResponse = await axios.get(eventsUrl);
    const events = eventsResponse.data || [];

    const eventsWithOdds = [];
    for (const event of events.slice(0, 10)) {
      try {
        const oddsUrl = `${ODDS_API_BASE}/odds?apiKey=${ODDS_API_KEY}&eventId=${event.id}&bookmakers=${USER_BOOKMAKERS.join(',')}`;
        const oddsResponse = await axios.get(oddsUrl);
        if (oddsResponse.data?.bookmakers) {
          eventsWithOdds.push({ ...event, odds: oddsResponse.data });
        }
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {}
    }
    return eventsWithOdds;
  } catch (error) {
    console.error(`[EPL] Error fetching odds: ${error.message}`);
    return [];
  }
}

// Team name matching
function normalizeTeamName(name) {
  return name.toLowerCase()
    .replace(/fc|afc|sc|sv|vfb|vfl|rb|tsv|fsc|1\.|1899|1846|1910/gi, '')
    .replace(/[^\w\s]/g, '').trim().split(/\s+/).filter(w => w.length > 2).join(' ');
}

function findMatchingOddsEvent(match, oddsEvents) {
  const predHome = normalizeTeamName(match.homeTeam.name);
  const predAway = normalizeTeamName(match.awayTeam.name);

  for (const event of oddsEvents) {
    const eventHome = normalizeTeamName(event.home);
    const eventAway = normalizeTeamName(event.away);

    const homeMatch = predHome.includes(eventHome) || eventHome.includes(predHome) ||
                      predHome.split(' ').some(w => eventHome.includes(w));
    const awayMatch = predAway.includes(eventAway) || eventAway.includes(predAway) ||
                      predAway.split(' ').some(w => eventAway.includes(w));

    if (homeMatch && awayMatch) return event;
  }
  return null;
}

// Extract bookmaker odds
function extractBookmakerOdds(oddsData, marketName, selection, targetLine) {
  if (!oddsData?.bookmakers) return [];
  const bookmakerOdds = [];

  for (const [bookmaker, markets] of Object.entries(oddsData.bookmakers)) {
    const market = markets.find(m => m.name === marketName);
    if (!market?.odds) continue;

    for (const entry of market.odds) {
      if (targetLine !== undefined && entry.hdp !== undefined) {
        if (Math.abs(entry.hdp - targetLine) > 0.1) continue;
      }
      const oddsValue = parseFloat(entry[selection]);
      if (oddsValue > 1.01) {
        bookmakerOdds.push({
          bookmaker, odds: oddsValue, line: entry.hdp, url: oddsData.urls?.[bookmaker]
        });
        break;
      }
    }
  }
  return bookmakerOdds.sort((a, b) => b.odds - a.odds);
}

// Calculate EV
function calculateEV(probability, odds) {
  return ((probability / 100) * odds - 1) * 100;
}

// Main function - find all value bets
export async function findAllValueBets() {
  console.log(`[EPL] Starting EV bet finder...`);
  const allValueBets = [];

  for (const league of SUPPORTED_LEAGUES) {
    try {
      console.log(`[EPL] Processing ${league.name}...`);

      // Get matches and odds
      const matches = await fetchUpcomingMatches(league.code);
      const oddsEvents = await fetchLeagueOdds(league.slug);

      console.log(`[EPL] Found ${matches.length} matches, ${oddsEvents.length} odds events`);

      for (const match of matches.slice(0, 5)) {
        const oddsEvent = findMatchingOddsEvent(match, oddsEvents);
        if (!oddsEvent) continue;

        const predictions = await generateMatchPredictions(match);

        for (const pred of predictions) {
          const apiMarketName = MARKET_MAPPING[pred.statKey];
          if (!apiMarketName) continue;

          const bookmakerOdds = extractBookmakerOdds(oddsEvent.odds, apiMarketName, pred.side, pred.line);
          if (!bookmakerOdds.length) continue;

          const valueBooksWithEV = bookmakerOdds
            .map(b => ({ ...b, ev: calculateEV(pred.probability, b.odds) }))
            .filter(b => b.ev >= MIN_EV_THRESHOLD);

          if (!valueBooksWithEV.length) continue;

          const bestOdds = valueBooksWithEV[0];
          allValueBets.push({
            matchId: `${league.code}_${match.id}`,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            kickoff: match.utcDate,
            league: league.name,
            leagueCode: league.code,
            market: pred.market,
            statKey: pred.statKey,
            selection: pred.side,
            line: pred.line,
            probability: pred.probability,
            fairOdds: pred.fairOdds,
            predictedTotal: pred.matchPrediction,
            homeAvg: pred.homeAvg,
            awayAvg: pred.awayAvg,
            confidence: pred.confidence,
            bestBookmaker: bestOdds.bookmaker,
            bestOdds: bestOdds.odds,
            bestEV: bestOdds.ev,
            bestUrl: bestOdds.url || null,
            allBookmakers: valueBooksWithEV.map(b => ({
              bookmaker: b.bookmaker, odds: b.odds, line: b.line, url: b.url || null, ev: b.ev
            })),
            detectedAt: new Date().toISOString(),
            status: 'active'
          });
        }
      }
    } catch (error) {
      console.error(`[EPL] Error: ${error.message}`);
    }
  }

  console.log(`[EPL] Found ${allValueBets.length} value bets`);
  return allValueBets;
}

// Run EV finder and cache results
export async function runEvBetFinder() {
  try {
    const valueBets = await findAllValueBets();
    cachedValueBets = valueBets;
    lastCacheUpdate = new Date().toISOString();
    return { success: true, count: valueBets.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get cached value bets with filtering
export function getActiveValueBets(options = {}) {
  const { league, minEV = 0, maxOdds = 10, limit = 100 } = options;

  let bets = cachedValueBets
    .filter(bet => bet.bestEV >= minEV && bet.bestOdds <= maxOdds)
    .filter(bet => !league || bet.leagueCode === league)
    .sort((a, b) => b.bestEV - a.bestEV)
    .slice(0, limit);

  // Group by match
  const matchesMap = new Map();
  for (const bet of bets) {
    if (!matchesMap.has(bet.matchId)) {
      matchesMap.set(bet.matchId, {
        matchId: bet.matchId,
        homeTeam: bet.homeTeam,
        awayTeam: bet.awayTeam,
        kickoff: bet.kickoff,
        league: bet.league,
        leagueCode: bet.leagueCode,
        valueBets: [],
        bestEV: 0,
        totalEV: 0
      });
    }
    const match = matchesMap.get(bet.matchId);
    match.valueBets.push(bet);
    match.totalEV += bet.bestEV;
    match.bestEV = Math.max(match.bestEV, bet.bestEV);
  }

  return {
    success: true,
    matches: Array.from(matchesMap.values()).sort((a, b) => b.bestEV - a.bestEV),
    totalBets: bets.length,
    totalMatches: matchesMap.size,
    source: 'cache',
    cacheUpdatedAt: lastCacheUpdate,
    generatedAt: new Date().toISOString()
  };
}

export default { runEvBetFinder, getActiveValueBets, findAllValueBets };
