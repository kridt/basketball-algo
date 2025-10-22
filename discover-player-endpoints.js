import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function discoverPlayerEndpoints() {
  try {
    console.log('Systematically testing player-related endpoints...\n');

    // First, get LeBron's player ID
    const playerSearch = await axios.get(`${baseUrl}/players`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: { search: 'LeBron' }
    });

    const lebron = playerSearch.data.response[0];
    console.log(`Found: ${lebron.name} (ID: ${lebron.id})\n`);

    // Get Lakers team ID
    const teamsResponse = await axios.get(`${baseUrl}/teams`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: { league: 12, season: '2023-2024' }
    });

    const lakers = teamsResponse.data.response.find(t => t.name.includes('Lakers'));
    console.log(`Found team: ${lakers.name} (ID: ${lakers.id})\n`);

    // Test different endpoint variations
    const tests = [
      // Format: [endpoint, params, description]
      ['players', { id: lebron.id, league: 12, season: '2023-2024' }, 'Players with league+season'],
      ['players', { id: lebron.id, team: lakers.id }, 'Players with team'],
      ['players', { id: lebron.id, league: 12 }, 'Players with league only'],
      ['statistics', { player: lebron.id, league: 12, season: '2023-2024' }, 'Statistics with player param'],
      ['statistics', { league: 12, season: '2023-2024', player: lebron.id, team: lakers.id }, 'Statistics with all params'],
      ['games', { player: lebron.id, league: 12, season: '2023-2024' }, 'Games with player param'],
      ['games', { team: lakers.id, league: 12, season: '2023-2024' }, 'Games by team'],
      ['statistics/players', { league: 12, season: '2023-2024', team: lakers.id }, 'Statistics/players endpoint'],
      ['statistics/players', { game: 373145 }, 'Statistics/players by game'],
    ];

    for (const [endpoint, params, description] of tests) {
      console.log(`\n--- Testing: ${endpoint} (${description}) ---`);
      console.log(`Params: ${JSON.stringify(params)}`);

      try {
        const response = await axios.get(`${baseUrl}/${endpoint}`, {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v1.basketball.api-sports.io'
          },
          params
        });

        if (response.data.errors && Object.keys(response.data.errors).length > 0) {
          console.log(`❌ Errors: ${JSON.stringify(response.data.errors)}`);
        } else if (response.data.results > 0) {
          console.log(`✅ SUCCESS! Found ${response.data.results} results`);

          // Show structure
          const firstResult = response.data.response[0];
          if (firstResult) {
            console.log('Keys in first result:', Object.keys(firstResult).join(', '));

            // If this looks like player stats, show more detail
            if (firstResult.points !== undefined || firstResult.player !== undefined) {
              console.log('\n🎯 FOUND PLAYER STATS!');
              console.log(JSON.stringify(firstResult, null, 2).substring(0, 1000));
            }
          }
        } else {
          console.log(`⚠️  No results (endpoint exists but returned empty)`);
        }
      } catch (err) {
        console.log(`❌ Request failed: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

discoverPlayerEndpoints();
