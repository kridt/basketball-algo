import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function findEndpoints() {
  try {
    console.log('Testing different endpoint variations...\n');

    const endpoints = [
      'statistics',
      'statistics/players',
      'statistics/games',
      'players/statistics',
      'games/players'
    ];

    const testDate = '2024-03-15';

    // First get a game ID
    const gamesResponse = await axios.get(`${baseUrl}/games`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: { date: testDate }
    });

    const nbaGame = gamesResponse.data.response.find(g => g.league?.name === 'NBA' && g.id === 373145);
    console.log(`Using game ID: ${nbaGame.id} (${nbaGame.teams?.home?.name} vs ${nbaGame.teams?.away?.name})\n`);

    for (const endpoint of endpoints) {
      console.log(`Testing: ${endpoint}`);
      try {
        const response = await axios.get(`${baseUrl}/${endpoint}`, {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v1.basketball.api-sports.io'
          },
          params: {
            game: nbaGame.id
          }
        });

        if (response.data.errors && Object.keys(response.data.errors).length > 0) {
          console.log(`  ✗ Error: ${JSON.stringify(response.data.errors)}`);
        } else if (response.data.results > 0) {
          console.log(`  ✓ SUCCESS! Found ${response.data.results} results`);
          console.log(`  Sample data:`, JSON.stringify(response.data.response[0], null, 2).substring(0, 500));
          break;
        } else {
          console.log(`  - No results (but endpoint exists)`);
        }
      } catch (err) {
        console.log(`  ✗ Request failed: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findEndpoints();
