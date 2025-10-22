import apiService from './services/apiService.js';

async function listTeams() {
  try {
    console.log('Fetching NBA teams from API...\n');
    const teams = await apiService.getTeams(12, '2023-2024'); // 12 = NBA

    console.log(`Found ${teams.length} teams:\n`);
    teams.forEach((team, i) => {
      console.log(`${i + 1}. ${team.name} (ID: ${team.id})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

listTeams();
