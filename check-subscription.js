import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_SPORTS_KEY;

async function checkSubscription() {
  try {
    console.log('Checking API subscription status...\n');

    // Check status endpoint
    const statusResponse = await axios.get('https://v1.basketball.api-sports.io/status', {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      }
    });

    console.log('Subscription Details:');
    console.log(JSON.stringify(statusResponse.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkSubscription();
