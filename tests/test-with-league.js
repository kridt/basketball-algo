import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function testWithLeague() {
  try {
    console.log('Testing player stats with league parameter...\n');

    // Search for LeBron
    const playerResponse = await axios.get(`${baseUrl}/players`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        search: 'LeBron'
      }
    });

    if (playerResponse.data.results > 0) {
      const lebron = playerResponse.data.response[0];
      console.log(`Found: ${lebron.name} (ID: ${lebron.id})\n`);

      // Try with league parameter
      console.log('Trying to get stats with league=12 (NBA) and season=2023-2024...');
      const statsResponse = await axios.get(`${baseUrl}/players/statistics`, {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'v1.basketball.api-sports.io'
        },
        params: {
          id: lebron.id,
          league: 12,  // NBA
          season: '2023-2024'
        }
      });

      console.log(`Results: ${statsResponse.data.results} games`);

      if (statsResponse.data.results > 0) {
        console.log('\n✓ Success! Found games with league parameter\n');
        console.log('First game sample:');
        const firstGame = statsResponse.data.response[0];
        console.log(JSON.stringify(firstGame, null, 2).substring(0, 1000));
      } else {
        console.log('\nStill no results. Checking subscription limits...');
        console.log('Response:', JSON.stringify(statsResponse.data, null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testWithLeague();
