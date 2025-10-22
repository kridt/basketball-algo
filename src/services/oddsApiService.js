class OddsApiService {
  constructor() {
    this.apiKey = '811e5fb0efa75d2b92e800cb55b60b30f62af8c21da06c4b2952eb516bee0a2e';
    this.baseUrl = 'https://api.odds-api.io/v3';
  }

  /**
   * Search for upcoming matches for a team
   */
  async searchTeamMatches(teamName) {
    try {
      const encodedTeam = encodeURIComponent(teamName);
      const url = `${this.baseUrl}/events/search?apiKey=${this.apiKey}&query=${encodedTeam}`;

      console.log(`Fetching matches for: ${teamName}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
      }

      const matches = await response.json();

      // Filter only pending matches (upcoming games) and sort by date
      const upcomingMatches = matches
        .filter(match =>
          match.status === 'pending' &&
          match.league?.slug === 'usa-nba' &&
          new Date(match.date) > new Date()
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      return upcomingMatches;
    } catch (error) {
      console.error('Error fetching team matches:', error.message);
      return [];
    }
  }

  /**
   * Get the next match for a team
   */
  async getNextMatch(teamName) {
    const matches = await this.searchTeamMatches(teamName);

    if (!matches || matches.length === 0) {
      return null;
    }

    const nextMatch = matches[0];

    // Determine opponent
    const isHome = nextMatch.home.toLowerCase().includes(teamName.toLowerCase());
    const opponent = isHome ? nextMatch.away : nextMatch.home;

    return {
      id: nextMatch.id,
      opponent,
      isHome,
      date: nextMatch.date,
      homeTeam: nextMatch.home,
      awayTeam: nextMatch.away
    };
  }

  /**
   * Format match date to readable string
   */
  formatMatchDate(dateString) {
    const date = new Date(dateString);
    const options = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York'
    };
    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Get odds for a specific event from Bet365 and Kambi
   */
  async getEventOdds(eventId) {
    try {
      const url = `${this.baseUrl}/odds?apiKey=${this.apiKey}&eventId=${eventId}&bookmakers=Bet365,Kambi`;

      console.log(`Fetching odds for event: ${eventId} from Bet365 and Kambi`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
      }

      const oddsData = await response.json();
      console.log(`[Odds] Received data with bookmakers:`, Object.keys(oddsData.bookmakers || {}));
      return oddsData;
    } catch (error) {
      console.error('Error fetching event odds:', error.message);
      return null;
    }
  }

  /**
   * Find player props for a specific player and stat type from a specific bookmaker
   */
  findPlayerPropFromBookmaker(oddsData, playerName, statType, bookmakerName) {
    if (!oddsData || !oddsData.bookmakers || !oddsData.bookmakers[bookmakerName]) {
      console.log(`[Odds] ${bookmakerName} not available in odds data`);
      return null;
    }

    const bookmakerOdds = oddsData.bookmakers[bookmakerName];

    // Map stat types to market names
    const marketMap = {
      'points': 'Points O/U',
      'rebounds': 'Rebounds O/U',
      'assists': 'Assists O/U',
      'pra': 'Points, Assists & Rebounds O/U',
      'points_assists': 'Points & Assists O/U',
      'points_rebounds': 'Points & Rebounds O/U',
      'rebounds_assists': 'Assists & Rebounds O/U'
    };

    const marketName = marketMap[statType];
    if (!marketName) return null;

    // Find the market
    const market = bookmakerOdds.find(m => m.name === marketName);
    if (!market || !market.odds) {
      console.log(`[Odds] ${bookmakerName}: Market "${marketName}" not found`);
      return null;
    }

    // Find the player in the odds
    // Split player name into parts and check if all parts are in the label
    const nameParts = playerName.toLowerCase().split(' ').filter(part => part.length > 0);

    console.log(`[Odds] ${bookmakerName}: Searching for player "${playerName}" (parts: ${nameParts.join(', ')})`);

    const playerOdds = market.odds.find(odd => {
      if (!odd.label) return false;
      const label = odd.label.toLowerCase();

      // Extract player name from label (e.g., "Stephen Curry (1) (26.5)")
      const nameMatch = label.match(/^([^(]+)/);
      if (!nameMatch) return false;

      const extractedName = nameMatch[1].trim().toLowerCase();

      // Check if all name parts are present in the label
      const allPartsMatch = nameParts.every(part => extractedName.includes(part));

      if (allPartsMatch) {
        console.log(`[Odds] ${bookmakerName}: ✓ Match found: "${odd.label}" matches "${playerName}"`);
      }

      return allPartsMatch;
    });

    if (!playerOdds) {
      console.log(`[Odds] ${bookmakerName}: ✗ No match found for "${playerName}" in ${marketName}`);
      console.log(`[Odds] ${bookmakerName}: Available players:`, market.odds.map(o => o.label).join(', '));
      return null;
    }

    return {
      bookmaker: bookmakerName,
      line: playerOdds.hdp,
      overOdds: parseFloat(playerOdds.over),
      underOdds: parseFloat(playerOdds.under),
      marketName: market.name,
      updatedAt: market.updatedAt
    };
  }

  /**
   * Find player props for a specific player and stat type (Bet365 - for backward compatibility)
   */
  findPlayerProp(oddsData, playerName, statType) {
    return this.findPlayerPropFromBookmaker(oddsData, playerName, statType, 'Bet365');
  }

  /**
   * Find player props from all available bookmakers
   */
  findPlayerPropsAllBookmakers(oddsData, playerName, statType) {
    const bookmakers = ['Bet365', 'Kambi'];
    const results = {};

    for (const bookmaker of bookmakers) {
      const prop = this.findPlayerPropFromBookmaker(oddsData, playerName, statType, bookmaker);
      if (prop) {
        results[bookmaker] = prop;
      }
    }

    return Object.keys(results).length > 0 ? results : null;
  }

  /**
   * Calculate implied probability from decimal odds
   */
  calculateImpliedProbability(decimalOdds) {
    return 1 / decimalOdds;
  }

  /**
   * Calculate Expected Value (EV)
   * EV = (Our probability × (Decimal odds - 1)) - ((1 - Our probability) × 1)
   */
  calculateEV(ourProbability, decimalOdds) {
    const ev = (ourProbability * (decimalOdds - 1)) - ((1 - ourProbability) * 1);
    return ev;
  }
}

export default new OddsApiService();
