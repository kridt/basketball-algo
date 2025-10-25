import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;
const baseUrl = 'https://v1.basketball.api-sports.io';

async function testPlayerStructure() {
  try {
    console.log('Checking player object structure...\n');

    const response = await axios.get(`${baseUrl}/players`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      },
      params: {
        search: 'Curry'
      }
    });

    if (response.data.response && response.data.response.length > 0) {
      console.log('First player object structure:');
      console.log(JSON.stringify(response.data.response[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPlayerStructure();
