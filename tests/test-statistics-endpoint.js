import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function testStatisticsEndpoint() {
  try {
    console.log('Testing /statistics endpoint with correct parameters...\n');

    // Get a team ID first
    const teamsResponse = await axios.get(`${baseUrl}/teams`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        league: 12,
        season: '2023-2024'
      }
    });

    if (teamsResponse.data.results > 0) {
      const lakersTeam = teamsResponse.data.response.find(t => t.name.includes('Lakers'));
      console.log(`Found team: ${lakersTeam.name} (ID: ${lakersTeam.id})\n`);

      // Try statistics endpoint
      console.log('Getting statistics...');
      const statsResponse = await axios.get(`${baseUrl}/statistics`, {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'v1.basketball.api-sports.io'
        },
        params: {
          league: 12,
          season: '2023-2024',
          team: lakersTeam.id
        }
      });

      console.log(`Results: ${statsResponse.data.results}`);

      if (statsResponse.data.results > 0) {
        console.log('\n✓ SUCCESS! Got statistics data\n');
        console.log('Data structure:');
        console.log(JSON.stringify(statsResponse.data.response[0], null, 2));
      } else {
        console.log('No results');
        console.log(statsResponse.data);
      }
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testStatisticsEndpoint();
