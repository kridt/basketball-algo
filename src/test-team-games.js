import apiService from './services/apiService.js';

async function testTeamGames() {
  try {
    const teamId = 146; // Memphis Grizzlies
    const season = '2023-2024';
    const leagueId = 12; // NBA

    console.log(`Testing games for Memphis Grizzlies (ID: ${teamId})...`);
    console.log(`Season: ${season}`);
    console.log(`League: ${leagueId}\n`);

    const games = await apiService.getGames(teamId, season, leagueId);

    console.log(`Found ${games.length} games`);

    if (games.length > 0) {
      console.log('\nFirst game:');
      console.log(JSON.stringify(games[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

testTeamGames();
