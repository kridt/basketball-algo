import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function testStatisticsFull() {
  try {
    console.log('Getting full statistics response...\n');

    const statsResponse = await axios.get(`${baseUrl}/statistics`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        league: 12,
        season: '2023-2024',
        team: 145  // Lakers
      }
    });

    console.log(`Results: ${statsResponse.data.results}\n`);

    // Save to file for inspection
    fs.writeFileSync('stats-response.json', JSON.stringify(statsResponse.data, null, 2));
    console.log('✓ Full response saved to stats-response.json\n');

    // Print summary
    console.log('Response structure:');
    if (statsResponse.data.response) {
      if (Array.isArray(statsResponse.data.response)) {
        console.log(`  - Array with ${statsResponse.data.response.length} items`);
        console.log(`  - First item keys: ${Object.keys(statsResponse.data.response[0] || {}).join(', ')}`);
      } else {
        console.log(`  - Object with keys: ${Object.keys(statsResponse.data.response).join(', ')}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testStatisticsFull();
