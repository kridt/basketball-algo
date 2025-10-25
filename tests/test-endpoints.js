import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function testEndpoints() {
  try {
    console.log('Testing available endpoints...\n');

    // Test 1: Get a recent NBA game
    console.log('1. Getting recent NBA games...');
    const gamesResponse = await axios.get(`${baseUrl}/games`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        league: 12,
        season: '2023-2024',
        h2h: '1-2'  // Get a specific matchup to limit results
      }
    });

    console.log(`Found ${gamesResponse.data.results} games`);

    if (gamesResponse.data.results > 0) {
      const game = gamesResponse.data.response[0];
      console.log(`Sample game ID: ${game.id}`);
      console.log(`  ${game.teams?.home?.name} vs ${game.teams?.away?.name}`);
      console.log(`  Date: ${game.date}\n`);

      // Test 2: Try to get game statistics (which should include player stats)
      console.log(`2. Trying to get statistics for game ${game.id}...`);
      try {
        const gameStatsResponse = await axios.get(`${baseUrl}/games/statistics`, {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v1.basketball.api-sports.io'
          },
          params: {
            id: game.id
          }
        });

        console.log(`Results: ${gameStatsResponse.data.results}`);
        if (gameStatsResponse.data.results > 0) {
          console.log('\n✓ games/statistics endpoint works!');
          console.log('\nSample data structure:');
          console.log(JSON.stringify(gameStatsResponse.data.response[0], null, 2).substring(0, 2000));
        }
      } catch (err) {
        console.log('Error:', err.response?.data?.errors || err.message);
      }

      // Test 3: Try statistics/players endpoint
      console.log('\n3. Trying statistics/players endpoint...');
      try {
        const statsPlayersResponse = await axios.get(`${baseUrl}/statistics/players`, {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v1.basketball.api-sports.io'
          },
          params: {
            game: game.id
          }
        });

        console.log(`Results: ${statsPlayersResponse.data.results}`);
        if (statsPlayersResponse.data.results > 0) {
          console.log('\n✓ statistics/players endpoint works!');
          console.log('\nSample player stats:');
          console.log(JSON.stringify(statsPlayersResponse.data.response[0], null, 2).substring(0, 1500));
        }
      } catch (err) {
        console.log('Error:', err.response?.data?.errors || err.message);
      }
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testEndpoints();
