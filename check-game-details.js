import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function checkGameDetails() {
  try {
    console.log('Getting Lakers games and checking for player stats...\n');

    // Get Lakers games
    const gamesResponse = await axios.get(`${baseUrl}/games`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        team: 145,  // Lakers
        league: 12,
        season: '2023-2024'
      }
    });

    console.log(`Found ${gamesResponse.data.results} games\n`);

    if (gamesResponse.data.results > 0) {
      const firstGame = gamesResponse.data.response[0];
      console.log('First game structure:');
      console.log(`Game ID: ${firstGame.id}`);
      console.log(`Date: ${firstGame.date}`);
      console.log(`${firstGame.teams.home.name} vs ${firstGame.teams.away.name}`);
      console.log(`\nAll keys in game object: ${Object.keys(firstGame).join(', ')}\n`);

      // Save full game object to file
      fs.writeFileSync('sample-game.json', JSON.stringify(firstGame, null, 2));
      console.log('✓ Saved full game object to sample-game.json\n');

      // Now try to get detailed statistics for this specific game using different endpoints
      console.log(`Trying to get detailed stats for game ${firstGame.id}...\n`);

      const endpointsToTry = [
        ['games/statistics', { id: firstGame.id }],
        ['games/statistics/players', { id: firstGame.id }],
        ['statistics', { game: firstGame.id }],
        ['games/h2h', { h2h: `${firstGame.teams.home.id}-${firstGame.teams.away.id}` }],
      ];

      for (const [endpoint, params] of endpointsToTry) {
        console.log(`Testing: /${endpoint} with params ${JSON.stringify(params)}`);
        try {
          const response = await axios.get(`${baseUrl}/${endpoint}`, {
            headers: {
              'x-rapidapi-key': apiKey,
              'x-rapidapi-host': 'v1.basketball.api-sports.io'
            },
            params
          });

          if (response.data.errors && Object.keys(response.data.errors).length > 0) {
            console.log(`  ❌ ${JSON.stringify(response.data.errors)}`);
          } else if (response.data.results > 0) {
            console.log(`  ✅ Found ${response.data.results} results!`);
            fs.writeFileSync(`${endpoint.replace(/\//g, '-')}-response.json`, JSON.stringify(response.data, null, 2));
            console.log(`  ✓ Saved to ${endpoint.replace(/\//g, '-')}-response.json`);
          } else {
            console.log(`  ⚠️  No results`);
          }
        } catch (err) {
          console.log(`  ❌ ${err.message}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkGameDetails();
