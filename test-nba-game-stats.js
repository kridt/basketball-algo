import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function testNBAGameStats() {
  try {
    console.log('Getting NBA game and player statistics...\n');

    const testDate = '2024-03-15';

    // Get games
    const gamesResponse = await axios.get(`${baseUrl}/games`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        date: testDate
      }
    });

    // Find an NBA game (not G-League)
    const nbaGame = gamesResponse.data.response.find(game =>
      game.league?.name === 'NBA' && !game.league?.name.includes('G League')
    );

    if (nbaGame) {
      console.log('Found NBA game:');
      console.log(`  Game ID: ${nbaGame.id}`);
      console.log(`  League ID: ${nbaGame.league?.id}`);
      console.log(`  League Name: ${nbaGame.league?.name}`);
      console.log(`  ${nbaGame.teams?.home?.name} vs ${nbaGame.teams?.away?.name}`);
      console.log(`  Status: ${nbaGame.status?.long}\n`);

      // Try to get game statistics (player stats)
      console.log('Getting game statistics...');
      try {
        const statsResponse = await axios.get(`${baseUrl}/games/statistics`, {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v1.basketball.api-sports.io'
          },
          params: {
            id: nbaGame.id
          }
        });

        console.log(`Statistics results: ${statsResponse.data.results}`);

        if (statsResponse.data.results > 0) {
          console.log('\n✓ Successfully got game statistics!\n');
          console.log('Full response structure:');
          console.log(JSON.stringify(statsResponse.data.response[0], null, 2));
        } else {
          console.log('\nNo statistics found');
          console.log('Response:', statsResponse.data);
        }
      } catch (err) {
        console.log('Error:', err.response?.data || err.message);
      }
    } else {
      console.log('No NBA game found on this date');
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testNBAGameStats();
