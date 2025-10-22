import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

console.log('Testing API-Sports Basketball API...\n');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
console.log('Base URL:', baseUrl);

async function testAPI() {
  try {
    // Test 1: Check leagues
    console.log('\n--- Test 1: Fetching leagues ---');
    const leaguesResponse = await axios.get(`${baseUrl}/leagues`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      }
    });
    console.log('✓ Leagues endpoint works');
    console.log(`Found ${leaguesResponse.data.results} leagues`);

    // Test 2: Search for a player
    console.log('\n--- Test 2: Searching for Stephen Curry ---');
    const playerResponse = await axios.get(`${baseUrl}/players`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        search: 'Stephen Curry'
      }
    });

    console.log('Status:', playerResponse.status);
    console.log('Results:', playerResponse.data.results);

    if (playerResponse.data.results > 0) {
      console.log('✓ Player found!');
      console.log('\nPlayer details:');
      playerResponse.data.response.forEach((player, idx) => {
        console.log(`  ${idx + 1}. ${player.firstname} ${player.lastname} (ID: ${player.id})`);
      });
    } else {
      console.log('✗ No players found');
      console.log('Full response:', JSON.stringify(playerResponse.data, null, 2));
    }

    // Test 3: Try searching with just last name
    console.log('\n--- Test 3: Searching for "Curry" ---');
    const curryResponse = await axios.get(`${baseUrl}/players`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        search: 'Curry'
      }
    });

    console.log('Results:', curryResponse.data.results);
    if (curryResponse.data.results > 0) {
      curryResponse.data.response.forEach((player, idx) => {
        console.log(`  ${idx + 1}. ${player.firstname} ${player.lastname} (ID: ${player.id})`);
      });
    }

  } catch (error) {
    console.error('\n❌ API Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAPI();
