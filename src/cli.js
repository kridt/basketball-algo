import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import probabilityCalculator from './models/probabilityCalculator.js';
import dataCollector from './services/dataCollector.js';

const program = new Command();

program
  .name('basketball-predictor')
  .description('Basketball player prop probability calculator')
  .version('1.0.0');

program
  .command('predict')
  .description('Predict probability for a player prop')
  .requiredOption('-p, --player <name>', 'Player name')
  .requiredOption('-s, --stat <type>', 'Stat type (points, rebounds, assists, pra)')
  .requiredOption('-l, --line <number>', 'Over/Under line')
  .option('-h, --home', 'Playing at home')
  .option('-a, --away', 'Playing away')
  .option('-o, --opponent <name>', 'Opponent team name')
  .option('-m, --minutes <number>', 'Expected minutes played')
  .action(async (options) => {
    const spinner = ora('Calculating probability...').start();

    try {
      const result = await probabilityCalculator.calculateProbability(
        options.player,
        options.stat,
        parseFloat(options.line),
        {
          isHome: options.home || !options.away,
          opponent: options.opponent,
          expectedMinutes: options.minutes ? parseFloat(options.minutes) : undefined
        }
      );

      spinner.stop();

      if (result.error) {
        console.log(chalk.red(`\n❌ Error: ${result.message || result.error}`));
        return;
      }

      displayPrediction(result);

    } catch (error) {
      spinner.stop();
      console.log(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('collect')
  .description('Collect player data from API')
  .requiredOption('-p, --player <name>', 'Player name')
  .option('-s, --seasons <seasons>', 'Seasons to collect (comma-separated)', '2023,2024,2025')
  .action(async (options) => {
    const spinner = ora(`Collecting data for ${options.player}...`).start();

    try {
      const seasons = options.seasons.split(',');
      const data = await dataCollector.collectPlayerData(options.player, seasons);

      spinner.succeed(`Data collected successfully!`);

      console.log(chalk.cyan(`\n📊 Player: ${data.player.name}`));
      console.log(chalk.cyan(`📅 Seasons: ${data.seasons.map(s => s.season).join(', ')}`));
      console.log(chalk.cyan(`🏀 Total Games: ${dataCollector.getAllGames(data).length}`));

    } catch (error) {
      spinner.fail('Data collection failed');
      console.log(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('analyze')
  .description('Analyze multiple props for a player')
  .requiredOption('-p, --player <name>', 'Player name')
  .requiredOption('-pts, --points <line>', 'Points line')
  .option('-reb, --rebounds <line>', 'Rebounds line')
  .option('-ast, --assists <line>', 'Assists line')
  .option('-pra, --pra <line>', 'PRA (Points + Rebounds + Assists) line')
  .option('-h, --home', 'Playing at home')
  .option('-a, --away', 'Playing away')
  .option('-o, --opponent <name>', 'Opponent team name')
  .action(async (options) => {
    const spinner = ora('Analyzing props...').start();

    try {
      const lines = {};
      if (options.points) lines.points = parseFloat(options.points);
      if (options.rebounds) lines.rebounds = parseFloat(options.rebounds);
      if (options.assists) lines.assists = parseFloat(options.assists);
      if (options.pra) lines.pra = parseFloat(options.pra);

      const gameContext = {
        isHome: options.home || !options.away,
        opponent: options.opponent
      };

      const results = await probabilityCalculator.calculateAllProps(
        options.player,
        lines,
        gameContext
      );

      spinner.stop();

      console.log(chalk.bold.cyan(`\n${'='.repeat(80)}`));
      console.log(chalk.bold.cyan(`  PLAYER PROP ANALYSIS: ${options.player.toUpperCase()}`));
      console.log(chalk.bold.cyan(`${'='.repeat(80)}\n`));

      for (const [propType, result] of Object.entries(results)) {
        if (result.error) {
          console.log(chalk.red(`\n❌ ${propType.toUpperCase()}: ${result.error}`));
          continue;
        }

        displayCompactPrediction(result);
      }

    } catch (error) {
      spinner.stop();
      console.log(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

function displayPrediction(result) {
  console.log(chalk.bold.cyan(`\n${'='.repeat(80)}`));
  console.log(chalk.bold.cyan(`  PREDICTION REPORT: ${result.player} - ${result.prop}`));
  console.log(chalk.bold.cyan(`${'='.repeat(80)}\n`));

  // Recommendation
  console.log(chalk.bold.white('📊 RECOMMENDATION'));
  const rec = result.recommendation;
  const betColor = rec.bet === 'OVER' ? chalk.green :
                   rec.bet === 'UNDER' ? chalk.red :
                   chalk.yellow;

  console.log(`   Bet: ${betColor.bold(rec.bet)} (${rec.strength || 'N/A'})`);
  if (rec.reasoning.length > 0) {
    console.log(`   Reasoning:`);
    rec.reasoning.forEach(r => console.log(`     • ${r}`));
  }

  // Probabilities
  console.log(chalk.bold.white('\n🎯 PROBABILITIES'));
  console.log(`   Over: ${chalk.green(result.probability.over)} (Method: ${result.probability.method})`);
  console.log(`   Under: ${chalk.red(result.probability.under)}`);
  if (result.probability.weights) {
    console.log(`   Weights: Statistical ${result.probability.weights.statistical}, ML ${result.probability.weights.ml}`);
  }

  // Statistical Analysis
  console.log(chalk.bold.white('\n📈 STATISTICAL ANALYSIS'));
  const stats = result.analysis.statistical;
  console.log(`   Mean: ${stats.mean} | Median: ${stats.median} | Weighted Avg: ${stats.weightedAvg}`);
  console.log(`   Std Dev: ${stats.stdDev} | Range: ${stats.range}`);

  // Historical Performance
  console.log(chalk.bold.white('\n📚 HISTORICAL PERFORMANCE'));
  const hist = result.analysis.historical;
  console.log(`   Over: ${hist.overCount}/${hist.totalGames} (${hist.overRate})`);
  console.log(`   Under: ${hist.underCount}/${hist.totalGames}`);

  // Trend Analysis
  console.log(chalk.bold.white('\n📊 TREND ANALYSIS'));
  const trend = result.analysis.trend;
  const trendColor = trend.direction === 'increasing' ? chalk.green :
                     trend.direction === 'decreasing' ? chalk.red :
                     chalk.yellow;
  console.log(`   Direction: ${trendColor(trend.direction.toUpperCase())}`);
  console.log(`   Slope: ${trend.slope.toFixed(3)} | R²: ${trend.strength.toFixed(3)}`);

  // Home/Away Splits
  console.log(chalk.bold.white('\n🏠 HOME/AWAY SPLITS'));
  console.log(`   Home: ${result.analysis.splits.home} | Away: ${result.analysis.splits.away}`);

  // Machine Learning
  console.log(chalk.bold.white('\n🤖 MACHINE LEARNING'));
  const ml = result.analysis.machineLearning;
  console.log(`   Prediction: ${ml.prediction} | Confidence: ${ml.confidence}`);
  console.log(`   Model: ${ml.model}`);

  // Confidence
  console.log(chalk.bold.white('\n✅ CONFIDENCE'));
  console.log(`   Overall: ${result.confidence.overall} (${result.confidence.score})`);
  console.log(`   Consistency: ${result.confidence.consistency}`);
  console.log(`   Sample Size: ${result.confidence.sampleSize} games`);

  // Adjustments
  if (result.adjustments && result.adjustments.length > 0) {
    console.log(chalk.bold.white('\n⚙️  ADJUSTMENTS'));
    result.adjustments.forEach(adj => {
      console.log(`   ${adj.factor}: ${adj.impact}`);
    });
  }

  // Game Context
  console.log(chalk.bold.white('\n🎮 GAME CONTEXT'));
  console.log(`   Location: ${result.gameContext.isHome ? 'HOME' : 'AWAY'}`);
  if (result.gameContext.opponent) {
    console.log(`   Opponent: ${result.gameContext.opponent}`);
  }
  if (result.gameContext.expectedMinutes) {
    console.log(`   Expected Minutes: ${result.gameContext.expectedMinutes}`);
  }

  console.log(chalk.bold.cyan(`\n${'='.repeat(80)}\n`));
}

function displayCompactPrediction(result) {
  const rec = result.recommendation;
  const betColor = rec.bet === 'OVER' ? chalk.green :
                   rec.bet === 'UNDER' ? chalk.red :
                   chalk.yellow;

  console.log(chalk.bold(`\n${result.prop}`));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(`  Recommendation: ${betColor.bold(rec.bet)} (${rec.strength || 'N/A'})`);
  console.log(`  Probability: Over ${chalk.green(result.probability.over)} | Under ${chalk.red(result.probability.under)}`);
  console.log(`  Historical: ${result.analysis.historical.overCount}/${result.analysis.historical.totalGames} over (${result.analysis.historical.overRate})`);
  console.log(`  Mean: ${result.analysis.statistical.mean} | Weighted: ${result.analysis.statistical.weightedAvg}`);
  console.log(`  Trend: ${result.analysis.trend.direction} | Confidence: ${result.confidence.overall}`);
  console.log(`  ML Prediction: ${result.analysis.machineLearning.prediction}`);
}

program.parse();
