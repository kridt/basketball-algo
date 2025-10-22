import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import apiService from './services/apiService.js';
import dataCollector from './services/dataCollector.js';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .option('-s, --season <season>', 'Season to collect', '2023-2024')
  .option('-t, --teams <teams>', 'Specific teams (comma-separated, e.g., "Lakers,Warriors")')
  .option('-l, --limit <number>', 'Limit number of players to collect', '0')
  .option('--skip <number>', 'Skip first N teams', '0')
  .option('--resume', 'Resume from where it left off')
  .parse();

const options = program.opts();

const progressFile = path.join(process.cwd(), 'data', 'collection-progress.json');

// Load or create progress tracking
function loadProgress() {
  if (options.resume && fs.existsSync(progressFile)) {
    return JSON.parse(fs.readFileSync(progressFile, 'utf8'));
  }
  return {
    completedPlayers: [],
    failedPlayers: [],
    currentTeamIndex: 0,
    totalCollected: 0,
    startTime: new Date().toISOString()
  };
}

function saveProgress(progress) {
  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
}

async function collectAllNBA() {
  const spinner = ora('Starting NBA data collection...').start();
  const progress = loadProgress();

  try {
    spinner.text = 'Fetching NBA teams...';
    const season = options.season;
    const allTeams = await apiService.getTeams(12, season); // 12 = NBA

    let teamsToCollect = allTeams;

    // Filter by specific teams if provided
    if (options.teams) {
      const teamNames = options.teams.split(',').map(t => t.trim().toLowerCase());
      teamsToCollect = allTeams.filter(team =>
        teamNames.some(name => team.name.toLowerCase().includes(name))
      );

      if (teamsToCollect.length === 0) {
        spinner.fail('No matching teams found');
        console.log(chalk.yellow('\nAvailable teams:'));
        allTeams.forEach(t => console.log(`  - ${t.name}`));
        return;
      }
    }

    // Apply skip
    const skipCount = parseInt(options.skip);
    if (skipCount > 0) {
      teamsToCollect = teamsToCollect.slice(skipCount);
      console.log(chalk.yellow(`\nSkipping first ${skipCount} teams`));
    }

    spinner.succeed(`Found ${teamsToCollect.length} teams to process`);

    console.log(chalk.cyan(`\n📋 Teams to collect: ${teamsToCollect.map(t => t.name).join(', ')}\n`));

    // Estimate API calls
    const estimatedGamesPerTeam = 90;
    const estimatedPlayersPerTeam = 15;
    const callsPerPlayer = estimatedGamesPerTeam + 2; // games + player search + team info
    const totalEstimatedCalls = teamsToCollect.length * estimatedPlayersPerTeam * callsPerPlayer;

    console.log(chalk.yellow(`⚠️  Estimated API calls: ~${totalEstimatedCalls.toLocaleString()}`));
    console.log(chalk.yellow(`⚠️  Your daily limit: 7,500 calls\n`));

    if (totalEstimatedCalls > 7000) {
      console.log(chalk.red('WARNING: This will likely exceed your daily API limit!'));
      console.log(chalk.yellow('Consider using --teams to collect specific teams or --limit to cap players\n'));
    }

    const limit = parseInt(options.limit);
    let totalPlayersCollected = 0;

    for (let i = 0; i < teamsToCollect.length; i++) {
      const team = teamsToCollect[i];

      if (limit > 0 && totalPlayersCollected >= limit) {
        console.log(chalk.yellow(`\n✓ Reached limit of ${limit} players`));
        break;
      }

      console.log(chalk.bold.cyan(`\n[${ i + 1}/${teamsToCollect.length}] ${team.name}`));
      console.log(chalk.gray('─'.repeat(60)));

      try {
        // Get games for this team to find active players
        spinner.text = `Fetching ${team.name} games...`;
        const teamGames = await apiService.getGames(team.id, season, 12);

        if (!teamGames || teamGames.length === 0) {
          console.log(chalk.yellow(`  ⚠️  No games found for ${team.name}`));
          continue;
        }

        console.log(`  Found ${teamGames.length} games`);

        // Get unique players from a few games
        const samplGames = teamGames.slice(0, 10); // Sample first 10 games
        const playerSet = new Set();

        spinner.text = 'Finding active players...';

        for (const game of samplGames) {
          try {
            const gameStats = await apiService.getGamePlayerStats(game.id);
            const teamPlayers = gameStats.filter(p => p.team.id === team.id);
            teamPlayers.forEach(p => playerSet.add(JSON.stringify({
              id: p.player.id,
              name: p.player.name
            })));
          } catch (err) {
            // Skip this game
          }
        }

        const players = Array.from(playerSet).map(p => JSON.parse(p));
        console.log(`  Found ${players.length} active players\n`);

        // Collect data for each player
        for (let j = 0; j < players.length; j++) {
          if (limit > 0 && totalPlayersCollected >= limit) {
            break;
          }

          const player = players[j];

          // Skip if already collected
          if (progress.completedPlayers.includes(player.id)) {
            console.log(chalk.gray(`  [${j + 1}/${players.length}] ${player.name} - Already collected`));
            continue;
          }

          // Check if already have data
          const existingData = dataCollector.loadPlayerData(player.id);
          if (existingData) {
            console.log(chalk.gray(`  [${j + 1}/${players.length}] ${player.name} - Already in database`));
            progress.completedPlayers.push(player.id);
            saveProgress(progress);
            continue;
          }

          try {
            console.log(chalk.white(`  [${j + 1}/${players.length}] Collecting ${player.name}...`));

            const playerStats = await apiService.getPlayerGameLogs(player.id, team.id, season, 12);

            if (playerStats && playerStats.length >= 5) { // Only save if they have 5+ games
              const playerData = {
                player: {
                  id: player.id,
                  name: player.name,
                  firstname: player.name.split(' ')[0] || '',
                  lastname: player.name.split(' ').slice(1).join(' ') || ''
                },
                seasons: [{
                  season,
                  team: team.name,
                  games: dataCollector.parsePlayerStats(playerStats)
                }],
                lastUpdated: new Date().toISOString()
              };

              dataCollector.savePlayerData(player.id, playerData);

              console.log(chalk.green(`    ✓ Saved ${playerStats.length} games`));

              progress.completedPlayers.push(player.id);
              progress.totalCollected++;
              totalPlayersCollected++;
              saveProgress(progress);

            } else {
              console.log(chalk.yellow(`    ⚠️  Only ${playerStats?.length || 0} games (skipped)`));
              progress.failedPlayers.push({ id: player.id, name: player.name, reason: 'insufficient games' });
              saveProgress(progress);
            }

          } catch (error) {
            console.log(chalk.red(`    ✗ Error: ${error.message}`));
            progress.failedPlayers.push({ id: player.id, name: player.name, reason: error.message });
            saveProgress(progress);
          }

          // Rate limiting - small delay between players
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.log(chalk.red(`  ✗ Error processing ${team.name}: ${error.message}`));
      }

      progress.currentTeamIndex = i + 1;
      saveProgress(progress);
    }

    spinner.succeed('Collection complete!');

    console.log(chalk.bold.cyan('\n' + '='.repeat(60)));
    console.log(chalk.bold.cyan('  COLLECTION SUMMARY'));
    console.log(chalk.bold.cyan('='.repeat(60)));
    console.log(chalk.green(`✓ Players collected: ${progress.totalCollected}`));
    console.log(chalk.red(`✗ Failed: ${progress.failedPlayers.length}`));
    console.log(chalk.gray(`Started: ${new Date(progress.startTime).toLocaleString()}`));
    console.log(chalk.gray(`Finished: ${new Date().toLocaleString()}`));

    if (progress.failedPlayers.length > 0) {
      console.log(chalk.yellow(`\nFailed players saved to: ${progressFile}`));
    }

    // Check API usage
    const status = await apiService.makeRequest('status', {}, false);
    if (status.response?.requests) {
      console.log(chalk.cyan(`\n📊 API Usage: ${status.response.requests.current}/${status.response.requests.limit_day}`));
    }

  } catch (error) {
    spinner.fail('Collection failed');
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    saveProgress(progress);
  }
}

collectAllNBA();
