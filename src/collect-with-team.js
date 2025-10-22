import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import apiService from './services/apiService.js';
import dataCollector from './services/dataCollector.js';

const program = new Command();

program
  .requiredOption('-p, --player <name>', 'Player name (e.g., "LeBron")')
  .requiredOption('-t, --team <name>', 'Team name (e.g., "Lakers")')
  .option('-s, --seasons <seasons>', 'Seasons (comma-separated)', '2023-2024')
  .parse();

const options = program.opts();

async function collectWithTeam() {
  const spinner = ora('Collecting player data...').start();

  try {
    // Search for player
    const playerResults = await apiService.searchPlayer(options.player);
    if (!playerResults || playerResults.length === 0) {
      spinner.fail('Player not found');
      console.log(chalk.red(`\nNo results for "${options.player}"`));
      process.exit(1);
    }

    const player = playerResults[0];
    console.log(`\nFound player: ${player.name} (ID: ${player.id})`);

    // Search for team
    const seasons = options.seasons.split(',');
    const season = seasons[0].trim();

    const teams = await apiService.getTeams(12, season);  // 12 = NBA
    const team = teams.find(t => t.name.toLowerCase().includes(options.team.toLowerCase()));

    if (!team) {
      spinner.fail('Team not found');
      console.log(chalk.red(`\nNo team found matching "${options.team}"`));
      console.log(chalk.yellow(`\nAvailable teams:`));
      teams.slice(0, 10).forEach(t => console.log(`  - ${t.name}`));
      process.exit(1);
    }

    console.log(`Found team: ${team.name} (ID: ${team.id})\n`);

    // Collect data for all seasons
    const seasonData = [];

    for (const seasonStr of seasons) {
      const trimmedSeason = seasonStr.trim();
      spinner.text = `Fetching ${trimmedSeason} season...`;

      try {
        const playerStats = await apiService.getPlayerGameLogs(player.id, team.id, trimmedSeason, 12);

        if (playerStats && playerStats.length > 0) {
          seasonData.push({
            season: trimmedSeason,
            team: team.name,
            games: dataCollector.parsePlayerStats(playerStats)
          });
          console.log(`✓ ${trimmedSeason}: Found ${playerStats.length} games`);
        } else {
          console.log(`✗ ${trimmedSeason}: No data`);
        }
      } catch (error) {
        console.log(`✗ ${trimmedSeason}: Error - ${error.message}`);
      }
    }

    if (seasonData.length === 0) {
      spinner.fail('No data collected');
      console.log(chalk.red('\nNo game data found for this player/team combination'));
      process.exit(1);
    }

    // Save data
    const playerData = {
      player: {
        id: player.id,
        name: player.name,
        firstname: player.name.split(' ')[0] || '',
        lastname: player.name.split(' ').slice(1).join(' ') || ''
      },
      seasons: seasonData,
      lastUpdated: new Date().toISOString()
    };

    dataCollector.savePlayerData(player.id, playerData);

    spinner.succeed('Data collected successfully!');

    console.log(chalk.cyan(`\n📊 Player: ${playerData.player.name}`));
    console.log(chalk.cyan(`🏀 Team: ${team.name}`));
    console.log(chalk.cyan(`📅 Seasons: ${seasonData.map(s => s.season).join(', ')}`));
    console.log(chalk.cyan(`🎯 Total Games: ${dataCollector.getAllGames(playerData).length}`));

  } catch (error) {
    spinner.fail('Collection failed');
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

collectWithTeam();
