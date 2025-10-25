import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function testLeaguesAndSeasons() {
  try {
    console.log('Finding NBA and checking available seasons...\n');

    // Get leagues
    const leaguesResponse = await axios.get(`${baseUrl}/leagues`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      }
    });

    // Find NBA
    const nba = leaguesResponse.data.response.find(league =>
      league.name === 'NBA' || league.name.includes('NBA')
    );

    if (nba) {
      console.log('Found NBA:');
      console.log(`  Name: ${nba.name}`);
      console.log(`  ID: ${nba.id}`);
      console.log(`  Country: ${nba.country?.name}`);
      console.log(`  Type: ${nba.type}`);
      console.log('\n  Available seasons:');
      if (nba.seasons) {
        nba.seasons.forEach(season => {
          console.log(`    - ${season.season} (${season.start} to ${season.end})`);
        });
      }
    }

    // Try searching for specific NBA player
    console.log('\n\nSearching for LeBron...');
    const lebronResponse = await axios.get(`${baseUrl}/players`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        search: 'LeBron'
      }
    });

    console.log(`Found ${lebronResponse.data.results} results`);
    if (lebronResponse.data.results > 0) {
      lebronResponse.data.response.slice(0, 5).forEach((player, idx) => {
        console.log(`  ${idx + 1}. ${player.name} (ID: ${player.id})`);
      });

      // Try to get stats for first LeBron
      const lebron = lebronResponse.data.response[0];
      console.log(`\n\nTrying to get stats for ${lebron.name} (ID: ${lebron.id})...`);

      // Try different season formats
      const seasonFormats = ['2024', '2023-2024', '2024-2025'];

      for (const season of seasonFormats) {
        console.log(`\n  Testing season format: ${season}`);
        try {
          const statsResponse = await axios.get(`${baseUrl}/players/statistics`, {
            headers: {
              'x-rapidapi-key': apiKey,
              'x-rapidapi-host': 'v1.basketball.api-sports.io'
            },
            params: {
              id: lebron.id,
              season: season
            }
          });
          console.log(`    Results: ${statsResponse.data.results} games found`);
          if (statsResponse.data.results > 0) {
            console.log(`    ✓ This format works!`);
            const firstGame = statsResponse.data.response[0];
            console.log(`    Sample game:`, JSON.stringify(firstGame, null, 2).substring(0, 500));
            break;
          }
        } catch (err) {
          console.log(`    Error:`, err.response?.data?.message || err.message);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testLeaguesAndSeasons();
