import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');

console.log('Checking collected player data...\n');

// Get all player files
const files = fs.readdirSync(dataDir).filter(f => f.startsWith('player_') && f.endsWith('.json'));

console.log(`📊 Total players collected: ${files.length}\n`);

// Get details about each player
const players = files.map(file => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    const latestSeason = data.seasons && data.seasons.length > 0 ? data.seasons[data.seasons.length - 1] : null;
    return {
      id: data.player.id,
      name: data.player.name,
      team: latestSeason ? latestSeason.team : 'Unknown',
      games: latestSeason && latestSeason.games ? latestSeason.games.length : 0,
      file: file
    };
  } catch (error) {
    return null;
  }
}).filter(p => p !== null);

// Sort by team then name
players.sort((a, b) => {
  if (a.team !== b.team) return a.team.localeCompare(b.team);
  return a.name.localeCompare(b.name);
});

// Group by team
const byTeam = {};
players.forEach(player => {
  if (!byTeam[player.team]) {
    byTeam[player.team] = [];
  }
  byTeam[player.team].push(player);
});

console.log('Players by team:');
console.log('='.repeat(80));

Object.keys(byTeam).sort().forEach(team => {
  console.log(`\n${team} (${byTeam[team].length} players):`);
  byTeam[team].forEach(player => {
    console.log(`  - ${player.name} (${player.games} games)`);
  });
});

console.log('\n' + '='.repeat(80));
console.log(`\n✅ Total: ${players.length} players across ${Object.keys(byTeam).length} teams`);

// Check for players with no game data
const noGames = players.filter(p => p.games === 0);
if (noGames.length > 0) {
  console.log(`\n⚠️  Warning: ${noGames.length} players have no game data:`);
  noGames.forEach(p => console.log(`  - ${p.name} (${p.team})`));
}

// Calculate average games per player
const avgGames = players.reduce((sum, p) => sum + p.games, 0) / players.length;
console.log(`\n📈 Average games per player: ${avgGames.toFixed(1)}`);
