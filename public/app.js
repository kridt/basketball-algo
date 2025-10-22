// Global state
let allPlayers = [];
let filteredPlayers = [];
let currentPlayer = null;
let currentMatchId = null;

// Load players on page load
window.addEventListener('DOMContentLoaded', () => {
    loadAllPlayers();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('player-search');
    const teamFilter = document.getElementById('team-filter');

    searchInput.addEventListener('input', (e) => {
        filterPlayers(e.target.value, teamFilter.value);
    });

    teamFilter.addEventListener('change', (e) => {
        filterPlayers(searchInput.value, e.target.value);
    });
}

// Load all players
async function loadAllPlayers() {
    const container = document.getElementById('saved-players-container');
    const countElement = document.getElementById('player-count');

    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading players...</p></div>';

    try {
        const response = await fetch('/api/players');
        const data = await response.json();

        if (data.players && data.players.length > 0) {
            allPlayers = data.players;
            filteredPlayers = [...allPlayers];

            // Populate team filter
            populateTeamFilter();

            // Update statistics
            updateStatistics();

            // Display players
            displayPlayerList(filteredPlayers);
            countElement.textContent = `(${allPlayers.length} player${allPlayers.length !== 1 ? 's' : ''})`;
        } else {
            countElement.textContent = '(0 players)';
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <h3 style="color: #999; margin-bottom: 10px;">No Players Available</h3>
                    <p style="color: #666;">Collect player data to get started.</p>
                </div>
            `;
        }
    } catch (error) {
        countElement.textContent = '';
        container.innerHTML = `
            <div class="error">
                <strong>Error:</strong> Failed to load players. ${error.message}
            </div>
        `;
    }
}

// Update statistics display
function updateStatistics() {
    const totalPlayers = allPlayers.length;
    const teams = [...new Set(allPlayers.map(p => p.team).filter(t => t))];
    const totalTeams = teams.length;
    const totalGames = allPlayers.reduce((sum, p) => sum + (p.totalGames || 0), 0);
    const avgGames = totalPlayers > 0 ? (totalGames / totalPlayers).toFixed(1) : 0;

    // Animate numbers
    animateNumber('stat-total-players', totalPlayers);
    animateNumber('stat-total-teams', totalTeams);
    animateNumber('stat-total-games', totalGames);
    document.getElementById('stat-avg-games').textContent = avgGames;
}

// Animate number counting up
function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    const duration = 1000; // 1 second
    const steps = 30;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, duration / steps);
}

// Populate team filter dropdown
function populateTeamFilter() {
    const teamFilter = document.getElementById('team-filter');
    const teams = [...new Set(allPlayers.map(p => p.team).filter(t => t))].sort();

    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamFilter.appendChild(option);
    });
}

// Filter players based on search and team
function filterPlayers(searchTerm, teamFilter) {
    filteredPlayers = allPlayers.filter(player => {
        const matchesSearch = !searchTerm ||
            player.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTeam = !teamFilter || player.team === teamFilter;
        return matchesSearch && matchesTeam;
    });

    displayPlayerList(filteredPlayers);
}

// Display player list
function displayPlayerList(players) {
    const container = document.getElementById('saved-players-container');

    if (players.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3 style="color: #999; margin-bottom: 10px;">No Players Found</h3>
                <p style="color: #666;">Try adjusting your search or filter.</p>
            </div>
        `;
        return;
    }

    const html = `
        <div class="player-list">
            ${players.map(player => `
                <div class="player-card" onclick="viewPlayerDetail(${player.id})">
                    <div class="player-name">${player.name}</div>
                    <div class="player-info">${player.team || 'Unknown Team'}</div>
                    <div class="player-stats">
                        <div class="player-stat">
                            <div class="player-stat-value">${player.totalGames}</div>
                            <div class="player-stat-label">Games</div>
                        </div>
                        <div class="player-stat">
                            <div class="player-stat-value">${player.seasons.length}</div>
                            <div class="player-stat-label">Seasons</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
}

// View player detail
async function viewPlayerDetail(playerId) {
    // Hide player list, show detail view
    document.getElementById('player-list-view').style.display = 'none';
    document.getElementById('player-detail-view').style.display = 'block';

    const content = document.getElementById('player-detail-content');
    content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading player details...</p></div>';

    try {
        // Find player in our list
        const player = allPlayers.find(p => p.id === playerId);
        currentPlayer = player;

        // Create player header
        const headerHtml = `
            <div class="player-header">
                <div>
                    <div class="player-title">${player.name}</div>
                </div>
                <div class="player-meta">
                    <div class="player-team">${player.team || 'Unknown Team'}</div>
                    <div class="next-opponent" id="next-opponent">Next: Loading opponent...</div>
                </div>
            </div>
            <h3 style="color: #e0e0e0; margin-bottom: 20px;">Probability Analysis - All Markets</h3>
            <div class="predictions-grid" id="predictions-grid">
                <div class="loading"><div class="spinner"></div><p>Calculating probabilities...</p></div>
            </div>
        `;

        content.innerHTML = headerHtml;

        // Load next opponent
        loadNextOpponent(player.team);

        // Load predictions for all markets
        await loadAllPredictions(player);

    } catch (error) {
        content.innerHTML = `
            <div class="error">
                <strong>Error:</strong> Failed to load player details. ${error.message}
            </div>
        `;
    }
}

// Load predictions for all markets
async function loadAllPredictions(player) {
    const markets = [
        { type: 'points', label: 'Points', line: 20 },
        { type: 'rebounds', label: 'Rebounds', line: 8 },
        { type: 'assists', label: 'Assists', line: 5 },
        { type: 'pra', label: 'Points + Rebounds + Assists', line: 35 },
        { type: 'points_assists', label: 'Points + Assists', line: 25 },
        { type: 'points_rebounds', label: 'Points + Rebounds', line: 28 },
        { type: 'rebounds_assists', label: 'Rebounds + Assists', line: 13 }
    ];

    const predictionsGrid = document.getElementById('predictions-grid');
    predictionsGrid.innerHTML = '';

    for (const market of markets) {
        // Create placeholder card
        const cardId = `prediction-${market.type}`;
        const cardHtml = `
            <div class="prediction-card" id="${cardId}">
                <div class="prediction-header">
                    <span class="prediction-type">${market.label}</span>
                </div>
                <div class="loading"><div class="spinner"></div></div>
            </div>
        `;
        predictionsGrid.innerHTML += cardHtml;
    }

    // Load each prediction
    for (const market of markets) {
        try {
            const prediction = await fetchPrediction(player.name, market.type, market.line);
            displayPrediction(market, prediction);
        } catch (error) {
            displayPredictionError(market.type, market.label);
        }
    }
}

// Fetch prediction from API
async function fetchPrediction(playerName, statType, line) {
    const endpoint = currentMatchId ? '/api/predict-with-odds' : '/api/predict';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerName,
            statType,
            line,
            includeMetrics: true,
            eventId: currentMatchId
        })
    });

    if (!response.ok) {
        throw new Error('Failed to fetch prediction');
    }

    return await response.json();
}

// Display prediction in card
function displayPrediction(market, prediction) {
    const cardId = `prediction-${market.type}`;
    const card = document.getElementById(cardId);

    if (!card) return;

    // Console log odds data for debugging
    console.log(`[${market.label}] Prediction data:`, prediction);
    if (prediction.odds) {
        console.log(`[${market.label}] Odds available:`, prediction.odds.available);
        if (prediction.odds.available && prediction.odds.bookmakers) {
            console.log(`[${market.label}] Bookmakers:`, Object.keys(prediction.odds.bookmakers));
            console.log(`[${market.label}] Best Value:`, prediction.odds.bestValue);
            for (const [bookmaker, odds] of Object.entries(prediction.odds.bookmakers)) {
                console.log(`[${market.label}] ${bookmaker} - Over: ${odds.overOdds} (${odds.overEV}), Under: ${odds.underOdds} (${odds.underEV})`);
            }
        } else if (prediction.odds.available) {
            console.log(`[${market.label}] Over Odds: ${prediction.odds.overOdds}, EV: ${prediction.odds.overEV}`);
            console.log(`[${market.label}] Under Odds: ${prediction.odds.underOdds}, EV: ${prediction.odds.underEV}`);
        } else {
            console.log(`[${market.label}] Odds message:`, prediction.odds.message);
        }
    } else {
        console.log(`[${market.label}] No odds data returned`);
    }

    const overProb = parseFloat(prediction.probability.over);
    const underProb = parseFloat(prediction.probability.under);
    const recommended = overProb > underProb ? 'OVER' : 'UNDER';
    const mainProb = Math.max(overProb, underProb);
    const probClass = recommended === 'OVER' ? 'prob-over' : 'prob-under';

    // Determine confidence
    const confidence = mainProb >= 60 ? 'high' : mainProb >= 50 ? 'medium' : 'low';
    const confidenceClass = `confidence-${confidence}`;
    const confidenceLabel = confidence.charAt(0).toUpperCase() + confidence.slice(1);

    // Check if odds and EV are available
    let evSection = '';
    if (prediction.odds && prediction.odds.available && prediction.odds.bookmakers) {
        // NEW: Multiple bookmakers display
        const bestValue = prediction.odds.bestValue;
        const bestEV = bestValue.evRaw || 0;

        const evColor = bestEV > 0 ? '#4ade80' : '#f87171';
        const evLabel = bestEV > 0.05 ? '🔥 VALUE BET!' : bestEV > 0 ? 'Slight Edge' : 'No Value';
        const evBgColor = bestEV > 0.05 ? '#4ade8020' : bestEV > 0 ? '#4ade8010' : '#2a2a3e';

        // Build bookmaker sections
        let bookmakerSections = '';
        for (const [bookmakerName, odds] of Object.entries(prediction.odds.bookmakers)) {
            const overEV = parseFloat(odds.overEV);
            const underEV = parseFloat(odds.underEV);
            const isBestBookmaker = bookmakerName === bestValue.bookmaker;
            const borderColor = isBestBookmaker && bestEV > 0 ? '#4ade80' : '#2a2a3e';

            bookmakerSections += `
                <div style="margin-bottom: 10px; padding: 12px; background: #1a1a2e; border-radius: 8px; border: 2px solid ${borderColor};">
                    <div style="font-size: 0.75em; color: #667eea; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; text-align: center;">
                        📊 ${bookmakerName} ${isBestBookmaker && bestEV > 0 ? '⭐' : ''}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
                        <div style="text-align: center; padding: 8px; background: #0a0a1e; border-radius: 6px;">
                            <div style="color: #999; font-size: 0.85em; margin-bottom: 4px;">OVER</div>
                            <div style="color: #4ade80; font-weight: 700; font-size: 1.1em;">${odds.overOdds}</div>
                            <div style="color: ${overEV > 0 ? '#4ade80' : '#f87171'}; font-size: 0.9em; margin-top: 2px;">${odds.overEV}</div>
                        </div>
                        <div style="text-align: center; padding: 8px; background: #0a0a1e; border-radius: 6px;">
                            <div style="color: #999; font-size: 0.85em; margin-bottom: 4px;">UNDER</div>
                            <div style="color: #f87171; font-weight: 700; font-size: 1.1em;">${odds.underOdds}</div>
                            <div style="color: ${underEV > 0 ? '#4ade80' : '#f87171'}; font-size: 0.9em; margin-top: 2px;">${odds.underEV}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        evSection = `
            <div style="margin-top: 15px; padding: 15px; background: ${evBgColor}; border-radius: 8px; border: 2px solid ${bestEV > 0 ? '#4ade80' : '#2a2a3e'};">
                ${bestValue.bet ? `
                    <div style="text-align: center; margin-bottom: 15px;">
                        <div style="font-size: 1.4em; font-weight: 700; color: ${evColor}; margin-bottom: 5px;">
                            ${bestValue.bet} @ ${bestValue.bookmaker}
                        </div>
                        <div style="font-size: 1.1em; color: ${evColor}; font-weight: 600;">
                            Best EV: ${bestValue.ev}
                        </div>
                        <div style="font-size: 0.85em; color: ${evColor}; margin-top: 5px; font-weight: 600;">${evLabel}</div>
                    </div>
                ` : ''}
                ${bookmakerSections}
            </div>
        `;
    } else if (prediction.odds && !prediction.odds.available) {
        // Show message why odds aren't available
        evSection = `
            <div style="margin-top: 15px; padding: 12px; background: #2a2a3e; border-radius: 8px; text-align: center;">
                <div style="font-size: 0.85em; color: #999;">⚠️ ${prediction.odds.message}</div>
            </div>
        `;
    }

    const html = `
        <div class="prediction-header">
            <span class="prediction-type">${market.label}</span>
            <span class="confidence-badge ${confidenceClass}">${confidenceLabel}</span>
        </div>

        ${evSection}

        <div style="text-align: center; margin: 15px 0;">
            <div style="font-size: 0.9em; color: #999; margin-bottom: 5px;">Our Prediction - Line: ${market.line}</div>
            <div style="font-size: 1.5em; font-weight: 700; color: ${probClass === 'prob-over' ? '#4ade80' : '#f87171'};">
                ${recommended} ${mainProb.toFixed(1)}%
            </div>
        </div>

        <div class="prediction-details">
            <div class="detail-item">
                <div class="detail-label">Over</div>
                <div class="detail-value" style="color: #4ade80;">${overProb.toFixed(1)}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Under</div>
                <div class="detail-value" style="color: #f87171;">${underProb.toFixed(1)}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Projection</div>
                <div class="detail-value">${prediction.projection.toFixed(1)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Recent Avg</div>
                <div class="detail-value">${prediction.recentAverage.toFixed(1)}</div>
            </div>
        </div>
    `;

    card.innerHTML = html;
}

// Display prediction error
function displayPredictionError(type, label) {
    const cardId = `prediction-${type}`;
    const card = document.getElementById(cardId);

    if (!card) return;

    card.innerHTML = `
        <div class="prediction-header">
            <span class="prediction-type">${label}</span>
        </div>
        <div style="text-align: center; padding: 20px; color: #f87171;">
            <p>Unable to calculate</p>
        </div>
    `;
}

// Load next opponent for a team
async function loadNextOpponent(teamName) {
    const nextOpponentElement = document.getElementById('next-opponent');

    if (!teamName) {
        nextOpponentElement.textContent = 'Next: Unknown';
        currentMatchId = null;
        return;
    }

    try {
        const response = await fetch(`/api/next-match/${encodeURIComponent(teamName)}`);
        const data = await response.json();

        if (data.hasMatch) {
            currentMatchId = data.id; // Store for use in predictions
            const location = data.isHome ? 'vs' : '@';
            nextOpponentElement.innerHTML = `
                Next: ${location} ${data.opponent}
                <span style="font-size: 0.9em; color: #667eea; margin-left: 8px;">
                    (ID: ${data.id})
                </span>
            `;
        } else {
            currentMatchId = null;
            nextOpponentElement.textContent = 'Next: No upcoming games';
        }
    } catch (error) {
        console.error('Error loading next opponent:', error);
        currentMatchId = null;
        nextOpponentElement.textContent = 'Next: Unable to load';
    }
}

// Back to player list
function backToPlayerList() {
    document.getElementById('player-detail-view').style.display = 'none';
    document.getElementById('player-list-view').style.display = 'block';
    currentPlayer = null;
}

// Legacy functions (kept for compatibility)
function switchTab(tabName) {
    // Not used in new interface
}

function selectPlayer(playerName) {
    // Not used in new interface
}
