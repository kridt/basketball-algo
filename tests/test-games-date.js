import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function testGamesByDate() {
  try {
    console.log('Testing games by date...\n');

    // Try a date from the 2023-2024 season
    const testDate = '2024-03-15';

    console.log(`Getting NBA games from ${testDate}...`);
    const gamesResponse = await axios.get(`${baseUrl}/games`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        league: 12,
        date: testDate
      }
    });

    console.log(`Found ${gamesResponse.data.results} games\n`);

    if (gamesResponse.data.results > 0) {
      // Show first few games
      gamesResponse.data.response.slice(0, 3).forEach((game, idx) => {
        console.log(`Game ${idx + 1} (ID: ${game.id}):`);
        console.log(`  ${game.teams?.home?.name} vs ${game.teams?.away?.name}`);
        console.log(`  Status: ${game.status?.long}\n`);
      });

      // Try to get statistics for first game
      const firstGame = gamesResponse.data.response[0];
      console.log(`\nTrying to get statistics for game ${firstGame.id}...`);

      try {
        const statsResponse = await axios.get(`${baseUrl}/games/statistics`, {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v1.basketball.api-sports.io'
          },
          params: {
            id: firstGame.id
          }
        });

        console.log(`Statistics results: ${statsResponse.data.results}`);
        if (statsResponse.data.results > 0) {
          console.log('\n✓ Successfully got game statistics!');
          console.log('\nData structure:');
          const stats = statsResponse.data.response[0];
          console.log(JSON.stringify(stats, null, 2).substring(0, 3000));
        } else {
          console.log('\nNo statistics available');
          console.log('Response:', statsResponse.data);
        }
      } catch (err) {
        console.log('Error getting statistics:', err.response?.data || err.message);
      }
    } else {
      console.log('No games found. Trying without league parameter...');

      const gamesResponse2 = await axios.get(`${baseUrl}/games`, {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'v1.basketball.api-sports.io'
        },
        params: {
          date: testDate
        }
      });

      console.log(`Found ${gamesResponse2.data.results} games total on ${testDate}`);

      if (gamesResponse2.data.results > 0) {
        gamesResponse2.data.response.slice(0, 5).forEach((game, idx) => {
          console.log(`  ${idx + 1}. ${game.league?.name}: ${game.teams?.home?.name} vs ${game.teams?.away?.name}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testGamesByDate();
