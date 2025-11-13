// Game constants
const GRID_SIZE = 8;
const CELL_SIZE = 60;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const ELEMENTS = ['water', 'fire', 'earth', 'air'];
const COLORS = {
    water: { main: '#3498db', light: '#85c1e9', dark: '#2874a6' },
    fire: { main: '#e74c3c', light: '#ec7063', dark: '#c0392b' },
    earth: { main: '#8b4513', light: '#a0522d', dark: '#654321' },
    air: { main: '#95a5a6', light: '#bdc3c7', dark: '#7f8c8d' }
};

// Game state
let grid = [];
let selectedCell = null;
let isAnimating = false;
let animationQueue = [];

// Monster battle state
let allyMonster = {
    element: null,
    health: 100,
    maxHealth: 100
};

let enemyMonster = {
    element: null,
    health: 100,
    maxHealth: 100
};

let streakCount = 0;
let lastMatchedElement = null;
let lastPlayerMatchElement = null; // Track last element matched by player move

// Chest and loot system
let chests = []; // Array of { row, col, opened: false }
let collectedLoot = []; // Array of collected loot items
let lootAnimations = []; // Array of { x, y, type, progress: 0-1 }
const CHEST_SPAWN_CHANCE = 0.15; // 15% chance per match
const LOOT_TYPES = ['gem', 'coin', 'star', 'crystal'];

// Animation state
let swapAnimation = null; // { cell1: {row, col}, cell2: {row, col}, progress: 0-1 }
let fallingAnimations = []; // Array of { fromRow, toRow, col, element, progress: 0-1 }
let newOrbAnimations = []; // Array of { row, col, element, progress: 0-1 }
let matchRemovalAnimations = []; // Array of { row, col, progress: 0-1 }
let animationStartTime = 0;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// Monster canvas setup
const allyCanvas = document.getElementById('allyMonsterCanvas');
const allyCtx = allyCanvas.getContext('2d');
const enemyCanvas = document.getElementById('enemyMonsterCanvas');
const enemyCtx = enemyCanvas.getContext('2d');

// Initialize monsters with random elements
function initMonsters() {
    // Assign random elements (ensure they're different)
    const elements = [...ELEMENTS];
    allyMonster.element = elements[Math.floor(Math.random() * elements.length)];
    elements.splice(elements.indexOf(allyMonster.element), 1);
    enemyMonster.element = elements[Math.floor(Math.random() * elements.length)];
    
    // Reset health
    allyMonster.health = 100;
    allyMonster.maxHealth = 100;
    enemyMonster.health = 100;
    enemyMonster.maxHealth = 100;
    
    // Reset streak
    streakCount = 0;
    lastMatchedElement = null;
    lastPlayerMatchElement = null;
    
    // Reset displays
    document.getElementById('streakDisplay').style.display = 'none';
    document.getElementById('lastMatchDisplay').style.display = 'none';
    
    // Reset chests and loot
    chests = [];
    collectedLoot = [];
    lootAnimations = [];
    updateLootDisplay();
    
    // Update UI
    updateMonsterDisplay();
    drawMonster(allyCtx, allyMonster.element, true);
    drawMonster(enemyCtx, enemyMonster.element, false);
    updateHealthBars();
}

// Update loot display
function updateLootDisplay() {
    const counts = {
        gem: 0,
        coin: 0,
        star: 0,
        crystal: 0
    };
    
    for (let loot of collectedLoot) {
        counts[loot.type] = (counts[loot.type] || 0) + 1;
    }
    
    document.getElementById('gemCount').textContent = counts.gem;
    document.getElementById('coinCount').textContent = counts.coin;
    document.getElementById('starCount').textContent = counts.star;
    document.getElementById('crystalCount').textContent = counts.crystal;
}

// Spawn a chest at a random empty position
function spawnChest() {
    if (Math.random() > CHEST_SPAWN_CHANCE) return;
    
    // Find empty positions
    const emptyPositions = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            // Check if position is empty and not already has a chest
            const hasChest = chests.some(c => c.row === row && c.col === col && !c.opened);
            if (!hasChest && grid[row][col]) {
                emptyPositions.push({ row, col });
            }
        }
    }
    
    if (emptyPositions.length > 0) {
        const pos = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
        chests.push({ row: pos.row, col: pos.col, opened: false });
    }
}

// Draw a chest
function drawChest(x, y, isOpened = false) {
    ctx.save();
    
    const size = CELL_SIZE * 0.7;
    const offsetX = x - size / 2;
    const offsetY = y - size / 2;
    
    // Chest body
    ctx.fillStyle = isOpened ? '#8b4513' : '#d2691e';
    ctx.fillRect(offsetX, offsetY + size * 0.3, size, size * 0.7);
    
    // Chest lid
    if (!isOpened) {
        ctx.fillStyle = '#cd853f';
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + size * 0.3);
        ctx.lineTo(offsetX + size / 2, offsetY);
        ctx.lineTo(offsetX + size, offsetY + size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Lock
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(offsetX + size / 2, offsetY + size * 0.2, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Open lid
        ctx.fillStyle = '#cd853f';
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + size * 0.3);
        ctx.lineTo(offsetX + size / 2, offsetY - size * 0.2);
        ctx.lineTo(offsetX + size, offsetY + size * 0.3);
        ctx.closePath();
        ctx.fill();
    }
    
    // Chest bands
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY + size * 0.3, size, size * 0.7);
    ctx.beginPath();
    ctx.moveTo(offsetX + size / 2, offsetY + size * 0.3);
    ctx.lineTo(offsetX + size / 2, offsetY + size);
    ctx.stroke();
    
    // Glow effect for unopened chests
    if (!isOpened) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX - 2, offsetY - 2, size + 4, size + 4);
        ctx.shadowBlur = 0; // Reset shadow
    }
    
    ctx.restore();
}

// Draw loot item
function drawLootItem(x, y, type, scale = 1, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    
    const size = CELL_SIZE * 0.4 * scale;
    
    switch(type) {
        case 'gem':
            // Draw gem
            ctx.fillStyle = '#ff1493';
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x - size * 0.6, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x + size * 0.6, y);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ff69b4';
            ctx.beginPath();
            ctx.moveTo(x, y - size * 0.7);
            ctx.lineTo(x - size * 0.4, y);
            ctx.lineTo(x, y + size * 0.7);
            ctx.lineTo(x + size * 0.4, y);
            ctx.closePath();
            ctx.fill();
            break;
        case 'coin':
            // Draw coin
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffed4e';
            ctx.beginPath();
            ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'star':
            // Draw star
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            const spikes = 5;
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (i * Math.PI) / spikes;
                const radius = i % 2 === 0 ? size * 0.5 : size * 0.25;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'crystal':
            // Draw crystal
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x - size * 0.4, y - size * 0.3);
            ctx.lineTo(x, y);
            ctx.lineTo(x + size * 0.4, y - size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - size * 0.4, y + size * 0.3);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x + size * 0.4, y + size * 0.3);
            ctx.closePath();
            ctx.fill();
            break;
    }
    
    ctx.restore();
}

// Open chest and spawn loot
function openChest(chest) {
    if (chest.opened) return;
    
    chest.opened = true;
    
    // Generate random loot (1-3 items)
    const lootCount = 1 + Math.floor(Math.random() * 3);
    const chestX = chest.col * CELL_SIZE + CELL_SIZE / 2;
    const chestY = chest.row * CELL_SIZE + CELL_SIZE / 2;
    
    for (let i = 0; i < lootCount; i++) {
        const lootType = LOOT_TYPES[Math.floor(Math.random() * LOOT_TYPES.length)];
        const angle = (i / lootCount) * Math.PI * 2;
        const distance = CELL_SIZE * 0.5;
        
        lootAnimations.push({
            startX: chestX,
            startY: chestY,
            endX: chestX + Math.cos(angle) * distance,
            endY: chestY + Math.sin(angle) * distance,
            finalX: chestX + Math.cos(angle) * distance * 2,
            finalY: chestY + Math.sin(angle) * distance * 2,
            type: lootType,
            progress: 0,
            collected: false
        });
    }
}

// Animate loot collection
function animateLoot() {
    if (lootAnimations.length === 0) return;
    
    const duration = 1500; // ms
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Update loot animations
        for (let i = lootAnimations.length - 1; i >= 0; i--) {
            const loot = lootAnimations[i];
            
            if (!loot.collected) {
                // First phase: pop out from chest (0-40%)
                if (progress < 0.4) {
                    const popProgress = progress / 0.4;
                    loot.progress = popProgress;
                    const eased = easeInOutCubic(popProgress);
                    loot.currentX = loot.startX + (loot.endX - loot.startX) * eased;
                    loot.currentY = loot.startY + (loot.endY - loot.startY) * eased;
                } else {
                    // Second phase: fly to top (40-100%)
                    const flyProgress = (progress - 0.4) / 0.6;
                    const targetY = -50; // Top of screen
                    loot.currentX = loot.endX + (loot.finalX - loot.endX) * flyProgress;
                    loot.currentY = loot.endY + (targetY - loot.endY) * flyProgress;
                    
                    if (flyProgress >= 1) {
                        // Collect loot
                        collectedLoot.push({ type: loot.type });
                        loot.collected = true;
                        updateLootDisplay();
                        lootAnimations.splice(i, 1);
                        continue;
                    }
                }
            }
        }
        
        render();
        
        if (lootAnimations.length > 0 && progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Draw a monster on canvas
function drawMonster(ctx, element, isAlly) {
    ctx.clearRect(0, 0, 120, 120);
    
    const centerX = 60;
    const centerY = 60;
    const radius = 40;
    
    const color = COLORS[element];
    
    // Draw monster body (simple circle with element color)
    const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3, centerY - radius * 0.3, 0,
        centerX, centerY, radius
    );
    gradient.addColorStop(0, color.light);
    gradient.addColorStop(1, color.main);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY - 10, 8, 0, Math.PI * 2);
    ctx.arc(centerX + 15, centerY - 10, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY - 10, 5, 0, Math.PI * 2);
    ctx.arc(centerX + 15, centerY - 10, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw mouth
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 10, 15, 0, Math.PI);
    ctx.stroke();
    
    // Draw border
    ctx.strokeStyle = isAlly ? '#4caf50' : '#f44336';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
}

// Update monster display
function updateMonsterDisplay() {
    const allyElementDisplay = document.getElementById('allyElement');
    const enemyElementDisplay = document.getElementById('enemyElement');
    
    const symbols = {
        water: '💧',
        fire: '🔥',
        earth: '🌍',
        air: '💨'
    };
    
    allyElementDisplay.textContent = symbols[allyMonster.element] || allyMonster.element;
    enemyElementDisplay.textContent = symbols[enemyMonster.element] || enemyMonster.element;
}

// Update health bars
function updateHealthBars() {
    const allyHealthBar = document.getElementById('allyHealthBar');
    const allyHealthText = document.getElementById('allyHealthText');
    const enemyHealthBar = document.getElementById('enemyHealthBar');
    const enemyHealthText = document.getElementById('enemyHealthText');
    
    const allyPercent = (allyMonster.health / allyMonster.maxHealth) * 100;
    const enemyPercent = (enemyMonster.health / enemyMonster.maxHealth) * 100;
    
    allyHealthBar.style.width = `${allyPercent}%`;
    enemyHealthBar.style.width = `${enemyPercent}%`;
    
    allyHealthText.textContent = `${Math.max(0, Math.ceil(allyMonster.health))}/${allyMonster.maxHealth}`;
    enemyHealthText.textContent = `${Math.max(0, Math.ceil(enemyMonster.health))}/${enemyMonster.maxHealth}`;
    
    // Change color based on health
    if (allyPercent < 30) {
        allyHealthBar.style.background = 'linear-gradient(90deg, #f44336 0%, #e91e63 100%)';
    } else if (allyPercent < 60) {
        allyHealthBar.style.background = 'linear-gradient(90deg, #ff9800 0%, #ff5722 100%)';
    } else {
        allyHealthBar.style.background = 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)';
    }
    
    if (enemyPercent < 30) {
        enemyHealthBar.style.background = 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)';
    } else if (enemyPercent < 60) {
        enemyHealthBar.style.background = 'linear-gradient(90deg, #ff9800 0%, #ff5722 100%)';
    } else {
        enemyHealthBar.style.background = 'linear-gradient(90deg, #f44336 0%, #e91e63 100%)';
    }
}

// Apply damage based on matched element
function applyDamage(matchedElement, isPlayerMove = false) {
    if (!matchedElement) return;
    
    const baseDamage = 10;
    let damage = baseDamage;
    
    // Only update streak for player moves
    if (isPlayerMove) {
        // Update last player match display
        lastPlayerMatchElement = matchedElement;
        const lastMatchDisplay = document.getElementById('lastMatchDisplay');
        const lastMatchElementEl = document.getElementById('lastMatchElement');
        const symbols = {
            water: '💧',
            fire: '🔥',
            earth: '🌍',
            air: '💨'
        };
        lastMatchElementEl.textContent = symbols[matchedElement] || matchedElement;
        lastMatchDisplay.style.display = 'block';
        
        // Check if this is a streak (only for player moves)
        if (matchedElement === lastMatchedElement) {
            streakCount++;
            damage = baseDamage * (1 + streakCount * 0.5); // 1x, 1.5x, 2x, 2.5x, etc.
            
            // Show streak display
            const streakDisplay = document.getElementById('streakDisplay');
            const streakCountEl = document.getElementById('streakCount');
            streakDisplay.style.display = 'block';
            streakCountEl.textContent = streakCount + 1;
        } else {
            streakCount = 0;
            lastMatchedElement = matchedElement;
            document.getElementById('streakDisplay').style.display = 'none';
        }
    }
    // For cascade matches, use current streak but don't update it
    else if (lastMatchedElement && matchedElement === lastMatchedElement) {
        // Use existing streak multiplier for cascade matches
        damage = baseDamage * (1 + streakCount * 0.5);
    }
    
    // Apply damage based on element match
    if (matchedElement === allyMonster.element) {
        // Ally attacks enemy
        enemyMonster.health = Math.max(0, enemyMonster.health - damage);
        updateHealthBars();
        
        // Visual feedback
        enemyCanvas.style.transform = 'scale(1.1)';
        setTimeout(() => {
            enemyCanvas.style.transform = 'scale(1)';
        }, 200);
    } else if (matchedElement === enemyMonster.element) {
        // Enemy attacks ally
        allyMonster.health = Math.max(0, allyMonster.health - damage);
        updateHealthBars();
        
        // Visual feedback
        allyCanvas.style.transform = 'scale(1.1)';
        setTimeout(() => {
            allyCanvas.style.transform = 'scale(1)';
        }, 200);
    }
    // If element doesn't match either, nothing happens
    
    // Check for game over
    if (allyMonster.health <= 0 || enemyMonster.health <= 0) {
        setTimeout(() => {
            if (allyMonster.health <= 0) {
                alert('Game Over! Enemy wins!');
            } else {
                alert('Victory! You win!');
            }
            initMonsters();
            initGame();
        }, 500);
    }
}

// Initialize game
function initGame() {
    grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        grid[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            grid[row][col] = getRandomElement();
        }
    }
    
    // Remove initial matches
    while (true) {
        const result = findMatches();
        if (result.matches.length === 0) break;
        for (let match of result.matches) {
            grid[match.row][match.col] = getRandomElement();
        }
    }
    
    render();
}

// Get random element that won't create immediate matches
function getRandomElement() {
    return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

// Get cell coordinates from mouse position
function getCellFromMouse(x, y) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = x - rect.left;
    const mouseY = y - rect.top;
    
    const col = Math.floor(mouseX / CELL_SIZE);
    const row = Math.floor(mouseY / CELL_SIZE);
    
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        return { row, col };
    }
    return null;
}

// Find all matches in the grid and return match groups with elements
function findMatches() {
    const matches = [];
    const matchGroups = []; // Track groups of matches with their element
    const checked = new Set();
    
    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
        let count = 1;
        let currentElement = grid[row][0];
        
        for (let col = 1; col < GRID_SIZE; col++) {
            if (grid[row][col] === currentElement) {
                count++;
            } else {
                if (count >= 3 && currentElement) {
                    const groupMatches = [];
                    for (let i = col - count; i < col; i++) {
                        const key = `${row}-${i}`;
                        if (!checked.has(key)) {
                            matches.push({ row, col: i });
                            groupMatches.push({ row, col: i });
                            checked.add(key);
                        }
                    }
                    if (groupMatches.length > 0) {
                        matchGroups.push({ element: currentElement, matches: groupMatches });
                    }
                }
                count = 1;
                currentElement = grid[row][col];
            }
        }
        
        if (count >= 3 && currentElement) {
            const groupMatches = [];
            for (let i = GRID_SIZE - count; i < GRID_SIZE; i++) {
                const key = `${row}-${i}`;
                if (!checked.has(key)) {
                    matches.push({ row, col: i });
                    groupMatches.push({ row, col: i });
                    checked.add(key);
                }
            }
            if (groupMatches.length > 0) {
                matchGroups.push({ element: currentElement, matches: groupMatches });
            }
        }
    }
    
    // Check vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
        let count = 1;
        let currentElement = grid[0][col];
        
        for (let row = 1; row < GRID_SIZE; row++) {
            if (grid[row][col] === currentElement) {
                count++;
            } else {
                if (count >= 3 && currentElement) {
                    const groupMatches = [];
                    for (let i = row - count; i < row; i++) {
                        const key = `${i}-${col}`;
                        if (!checked.has(key)) {
                            matches.push({ row: i, col });
                            groupMatches.push({ row: i, col });
                            checked.add(key);
                        }
                    }
                    if (groupMatches.length > 0) {
                        matchGroups.push({ element: currentElement, matches: groupMatches });
                    }
                }
                count = 1;
                currentElement = grid[row][col];
            }
        }
        
        if (count >= 3 && currentElement) {
            const groupMatches = [];
            for (let i = GRID_SIZE - count; i < GRID_SIZE; i++) {
                const key = `${i}-${col}`;
                if (!checked.has(key)) {
                    matches.push({ row: i, col });
                    groupMatches.push({ row: i, col });
                    checked.add(key);
                }
            }
            if (groupMatches.length > 0) {
                matchGroups.push({ element: currentElement, matches: groupMatches });
            }
        }
    }
    
    return { matches, matchGroups };
}

// Swap two cells
function swapCells(row1, col1, row2, col2) {
    const temp = grid[row1][col1];
    grid[row1][col1] = grid[row2][col2];
    grid[row2][col2] = temp;
}

// Check if a swap would create a match
function isValidSwap(row1, col1, row2, col2) {
    swapCells(row1, col1, row2, col2);
    const result = findMatches();
    swapCells(row1, col1, row2, col2); // Swap back
    
    return result.matches.length > 0;
}

// Animate match removal
function animateMatchRemoval(matches, matchGroups, isPlayerMove, callback) {
    matchRemovalAnimations = matches.map(m => ({ row: m.row, col: m.col, progress: 0 }));
    const duration = 400; // ms
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        for (let anim of matchRemovalAnimations) {
            anim.progress = progress;
        }
        
        render();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            matchRemovalAnimations = [];
            // Remove matched orbs from grid
            for (let match of matches) {
                grid[match.row][match.col] = null;
            }
            
            // Apply damage for each match group
            // Only the first match group counts as player move (if it is one)
            let firstGroup = true;
            for (let group of matchGroups) {
                applyDamage(group.element, isPlayerMove && firstGroup);
                
                // Check if matching ally element opens chests
                if (group.element === allyMonster.element) {
                    // Open all unopened chests
                    for (let chest of chests) {
                        if (!chest.opened) {
                            openChest(chest);
                        }
                    }
                    // Start loot animation if there are any
                    if (lootAnimations.length > 0) {
                        animateLoot();
                    }
                }
                
                firstGroup = false;
            }
            
            // Spawn chests after matches
            spawnChest();
            
            callback();
        }
    }
    
    animate();
}

// Animate falling orbs
function animateFalling(callback) {
    fallingAnimations = [];
    newOrbAnimations = [];
    
    // Calculate where each orb should fall
    const fallMap = new Map(); // Maps (row, col) to target row
    
    for (let col = 0; col < GRID_SIZE; col++) {
        let writeIndex = GRID_SIZE - 1;
        
        for (let row = GRID_SIZE - 1; row >= 0; row--) {
            if (grid[row][col] !== null) {
                if (writeIndex !== row) {
                    fallMap.set(`${row}-${col}`, writeIndex);
                    grid[writeIndex][col] = grid[row][col];
                    grid[row][col] = null;
                }
                writeIndex--;
            }
        }
        
        // Track new orbs
        for (let row = writeIndex; row >= 0; row--) {
            const element = getRandomElement();
            grid[row][col] = element;
            newOrbAnimations.push({ row, col, element, progress: 0 });
        }
    }
    
    // Create falling animations
    for (let [key, targetRow] of fallMap) {
        const [row, col] = key.split('-').map(Number);
        const element = grid[targetRow][col];
        fallingAnimations.push({ fromRow: row, toRow: targetRow, col, element, progress: 0 });
    }
    
    if (fallingAnimations.length === 0 && newOrbAnimations.length === 0) {
        callback();
        return;
    }
    
    const duration = 600; // ms
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        for (let anim of fallingAnimations) {
            anim.progress = progress;
        }
        
        for (let anim of newOrbAnimations) {
            anim.progress = progress;
        }
        
        render();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            fallingAnimations = [];
            newOrbAnimations = [];
            callback();
        }
    }
    
    animate();
}

// Remove matches and apply gravity
function processMatches(isPlayerMove = false) {
    const result = findMatches();
    const { matches, matchGroups } = result;
    
    if (matches.length === 0) {
        isAnimating = false;
        render();
        return;
    }
    
    // Animate match removal
    // Only the first call is a player move, cascades are not
    animateMatchRemoval(matches, matchGroups, isPlayerMove, () => {
        // After matches are removed, animate falling
        animateFalling(() => {
            // After falling, check for new matches (cascades are not player moves)
            setTimeout(() => {
                processMatches(false);
            }, 100);
        });
    });
}

// Easing function for smooth animations
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Get animation time for effects
function getAnimationTime() {
    return Date.now() / 1000;
}

// Draw fire orb
function drawFireOrb(x, y, radius, isSelected, alpha) {
    const time = getAnimationTime();
    const flicker = Math.sin(time * 8) * 0.1 + 1;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Outer glow
    const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.3);
    outerGradient.addColorStop(0, 'rgba(255, 200, 0, 0.4)');
    outerGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.2)');
    outerGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Main fire body with flicker
    const fireGradient = ctx.createRadialGradient(
        x - radius * 0.2, y - radius * 0.3, 0,
        x, y, radius * flicker
    );
    fireGradient.addColorStop(0, '#ffeb3b'); // Bright yellow center
    fireGradient.addColorStop(0.3, '#ff9800'); // Orange
    fireGradient.addColorStop(0.7, '#f44336'); // Red-orange
    fireGradient.addColorStop(1, '#c62828'); // Dark red
    ctx.fillStyle = fireGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * flicker, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner core
    const coreGradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.4, 0,
        x, y, radius * 0.4
    );
    coreGradient.addColorStop(0, '#fff9c4');
    coreGradient.addColorStop(1, '#ffeb3b');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Flame wisps
    for (let i = 0; i < 5; i++) {
        const angle = (time * 2 + i * Math.PI * 0.4) % (Math.PI * 2);
        const wispX = x + Math.cos(angle) * radius * 0.6;
        const wispY = y + Math.sin(angle) * radius * 0.6;
        const wispGradient = ctx.createRadialGradient(wispX, wispY, 0, wispX, wispY, radius * 0.3);
        wispGradient.addColorStop(0, 'rgba(255, 235, 59, 0.6)');
        wispGradient.addColorStop(1, 'rgba(255, 152, 0, 0)');
        ctx.fillStyle = wispGradient;
        ctx.beginPath();
        ctx.arc(wispX, wispY, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Border
    ctx.strokeStyle = isSelected ? '#fff' : '#8b0000';
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

// Draw water orb
function drawWaterOrb(x, y, radius, isSelected, alpha) {
    const time = getAnimationTime();
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Outer glow
    const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.2);
    outerGradient.addColorStop(0, 'rgba(100, 181, 246, 0.3)');
    outerGradient.addColorStop(1, 'rgba(33, 150, 243, 0)');
    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Main water body
    const waterGradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, 0,
        x, y, radius
    );
    waterGradient.addColorStop(0, '#81d4fa'); // Light blue
    waterGradient.addColorStop(0.4, '#4fc3f7'); // Medium blue
    waterGradient.addColorStop(0.8, '#29b6f6'); // Blue
    waterGradient.addColorStop(1, '#0277bd'); // Dark blue
    ctx.fillStyle = waterGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Wave patterns
    for (let i = 0; i < 3; i++) {
        const waveY = y - radius * 0.5 + (i * radius * 0.5) + Math.sin(time * 2 + i) * radius * 0.1;
        const waveGradient = ctx.createLinearGradient(x - radius, waveY, x + radius, waveY);
        waveGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        waveGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        waveGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = waveGradient;
        ctx.beginPath();
        ctx.ellipse(x, waveY, radius * 0.8, radius * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Highlight
    const highlightGradient = ctx.createRadialGradient(
        x - radius * 0.4, y - radius * 0.4, 0,
        x - radius * 0.4, y - radius * 0.4, radius * 0.5
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Bubbles
    for (let i = 0; i < 3; i++) {
        const bubbleX = x + (Math.sin(time * 1.5 + i * 2) * radius * 0.4);
        const bubbleY = y + (Math.cos(time * 1.5 + i * 2) * radius * 0.4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, radius * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Border
    ctx.strokeStyle = isSelected ? '#fff' : '#01579b';
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

// Draw earth orb
function drawEarthOrb(x, y, radius, isSelected, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Outer glow
    const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.2);
    outerGradient.addColorStop(0, 'rgba(139, 69, 19, 0.3)');
    outerGradient.addColorStop(1, 'rgba(101, 67, 33, 0)');
    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Main earth body
    const earthGradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, 0,
        x, y, radius
    );
    earthGradient.addColorStop(0, '#a1887f'); // Light brown
    earthGradient.addColorStop(0.3, '#8d6e63'); // Brown
    earthGradient.addColorStop(0.7, '#6d4c41'); // Dark brown
    earthGradient.addColorStop(1, '#3e2723'); // Very dark brown
    ctx.fillStyle = earthGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Texture patterns (rocky)
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const textureX = x + Math.cos(angle) * radius * 0.6;
        const textureY = y + Math.sin(angle) * radius * 0.6;
        ctx.fillStyle = 'rgba(62, 39, 35, 0.4)';
        ctx.beginPath();
        ctx.arc(textureX, textureY, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Green patches (grass/vegetation)
    for (let i = 0; i < 3; i++) {
        const patchX = x + (Math.sin(i * 2) * radius * 0.4);
        const patchY = y + (Math.cos(i * 2) * radius * 0.4);
        const patchGradient = ctx.createRadialGradient(patchX, patchY, 0, patchX, patchY, radius * 0.25);
        patchGradient.addColorStop(0, '#66bb6a');
        patchGradient.addColorStop(1, '#388e3c');
        ctx.fillStyle = patchGradient;
        ctx.beginPath();
        ctx.arc(patchX, patchY, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Highlight
    const highlightGradient = ctx.createRadialGradient(
        x - radius * 0.4, y - radius * 0.4, 0,
        x - radius * 0.4, y - radius * 0.4, radius * 0.4
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = isSelected ? '#fff' : '#1b0000';
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

// Draw air orb
function drawAirOrb(x, y, radius, isSelected, alpha) {
    const time = getAnimationTime();
    
    ctx.save();
    ctx.globalAlpha = alpha * 0.9; // Slightly transparent
    
    // Outer glow
    const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.3);
    outerGradient.addColorStop(0, 'rgba(189, 195, 199, 0.4)');
    outerGradient.addColorStop(0.5, 'rgba(149, 165, 166, 0.2)');
    outerGradient.addColorStop(1, 'rgba(127, 140, 141, 0)');
    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Main air body (wispy)
    const airGradient = ctx.createRadialGradient(
        x - radius * 0.2, y - radius * 0.2, 0,
        x, y, radius
    );
    airGradient.addColorStop(0, 'rgba(236, 240, 241, 0.8)');
    airGradient.addColorStop(0.5, 'rgba(189, 195, 199, 0.6)');
    airGradient.addColorStop(1, 'rgba(149, 165, 166, 0.4)');
    ctx.fillStyle = airGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Wind wisps
    for (let i = 0; i < 6; i++) {
        const angle = (time * 1.5 + i * Math.PI / 3) % (Math.PI * 2);
        const wispX = x + Math.cos(angle) * radius * 0.7;
        const wispY = y + Math.sin(angle) * radius * 0.7;
        const wispGradient = ctx.createRadialGradient(wispX, wispY, 0, wispX, wispY, radius * 0.4);
        wispGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        wispGradient.addColorStop(1, 'rgba(189, 195, 199, 0)');
        ctx.fillStyle = wispGradient;
        ctx.beginPath();
        ctx.arc(wispX, wispY, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Swirling center
    const swirlGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.5);
    swirlGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    swirlGradient.addColorStop(1, 'rgba(236, 240, 241, 0.3)');
    ctx.fillStyle = swirlGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Border (lighter for air)
    ctx.strokeStyle = isSelected ? '#fff' : 'rgba(127, 140, 141, 0.8)';
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

// Draw an orb at a specific position (for animations)
function drawOrbAt(x, y, element, isSelected = false, scale = 1, alpha = 1) {
    const radius = (CELL_SIZE / 2 - 5) * scale;
    
    ctx.save();
    
    // Draw element-specific orbs
    switch(element) {
        case 'fire':
            drawFireOrb(x, y, radius, isSelected, alpha);
            break;
        case 'water':
            drawWaterOrb(x, y, radius, isSelected, alpha);
            break;
        case 'earth':
            drawEarthOrb(x, y, radius, isSelected, alpha);
            break;
        case 'air':
            drawAirOrb(x, y, radius, isSelected, alpha);
            break;
        default:
            // Fallback to simple orb
            const color = COLORS[element] || COLORS.water;
            ctx.globalAlpha = alpha;
            const gradient = ctx.createRadialGradient(
                x - radius * 0.3, y - radius * 0.3, 0,
                x, y, radius
            );
            gradient.addColorStop(0, color.light);
            gradient.addColorStop(1, color.main);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = isSelected ? '#fff' : color.dark;
            ctx.lineWidth = isSelected ? 4 : 2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
    }
    
    ctx.restore();
}

// Draw an orb at grid position
function drawOrb(row, col, element, isSelected = false) {
    const x = col * CELL_SIZE + CELL_SIZE / 2;
    const y = row * CELL_SIZE + CELL_SIZE / 2;
    drawOrbAt(x, y, element, isSelected);
}

// Render the game
function render() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw grid background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw grid lines
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // Track which cells are being animated
    const animatedCells = new Set();
    
    // Draw falling orbs
    for (let anim of fallingAnimations) {
        const startY = anim.fromRow * CELL_SIZE + CELL_SIZE / 2;
        const endY = anim.toRow * CELL_SIZE + CELL_SIZE / 2;
        const currentY = startY + (endY - startY) * easeInOutCubic(anim.progress);
        const x = anim.col * CELL_SIZE + CELL_SIZE / 2;
        
        drawOrbAt(x, currentY, anim.element, false, 1, 1);
        animatedCells.add(`${anim.toRow}-${anim.col}`);
    }
    
    // Draw new orbs (falling from top)
    for (let anim of newOrbAnimations) {
        const startY = -CELL_SIZE / 2;
        const endY = anim.row * CELL_SIZE + CELL_SIZE / 2;
        const currentY = startY + (endY - startY) * easeInOutCubic(anim.progress);
        const x = anim.col * CELL_SIZE + CELL_SIZE / 2;
        
        drawOrbAt(x, currentY, anim.element, false, 1, 1);
        animatedCells.add(`${anim.row}-${anim.col}`);
    }
    
    // Draw swap animation
    if (swapAnimation) {
        const cell1StartX = swapAnimation.cell1.col * CELL_SIZE + CELL_SIZE / 2;
        const cell1StartY = swapAnimation.cell1.row * CELL_SIZE + CELL_SIZE / 2;
        const cell1EndX = swapAnimation.cell2.col * CELL_SIZE + CELL_SIZE / 2;
        const cell1EndY = swapAnimation.cell2.row * CELL_SIZE + CELL_SIZE / 2;
        
        const cell2StartX = swapAnimation.cell2.col * CELL_SIZE + CELL_SIZE / 2;
        const cell2StartY = swapAnimation.cell2.row * CELL_SIZE + CELL_SIZE / 2;
        const cell2EndX = swapAnimation.cell1.col * CELL_SIZE + CELL_SIZE / 2;
        const cell2EndY = swapAnimation.cell1.row * CELL_SIZE + CELL_SIZE / 2;
        
        const eased = easeInOutCubic(swapAnimation.progress);
        
        const cell1X = cell1StartX + (cell1EndX - cell1StartX) * eased;
        const cell1Y = cell1StartY + (cell1EndY - cell1StartY) * eased;
        const cell2X = cell2StartX + (cell2EndX - cell2StartX) * eased;
        const cell2Y = cell2StartY + (cell2EndY - cell2StartY) * eased;
        
        const element1 = grid[swapAnimation.cell1.row][swapAnimation.cell1.col];
        const element2 = grid[swapAnimation.cell2.row][swapAnimation.cell2.col];
        
        drawOrbAt(cell1X, cell1Y, element1, false);
        drawOrbAt(cell2X, cell2Y, element2, false);
        
        animatedCells.add(`${swapAnimation.cell1.row}-${swapAnimation.cell1.col}`);
        animatedCells.add(`${swapAnimation.cell2.row}-${swapAnimation.cell2.col}`);
    }
    
    // Draw match removal animations (fade out)
    for (let anim of matchRemovalAnimations) {
        const x = anim.col * CELL_SIZE + CELL_SIZE / 2;
        const y = anim.row * CELL_SIZE + CELL_SIZE / 2;
        const element = grid[anim.row] && grid[anim.row][anim.col];
        if (element) {
            const scale = 1 + (1 - anim.progress) * 0.3; // Scale up as it fades
            const alpha = 1 - anim.progress;
            drawOrbAt(x, y, element, false, scale, alpha);
        }
        animatedCells.add(`${anim.row}-${anim.col}`);
    }
    
    // Draw static orbs (not being animated)
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col] && !animatedCells.has(`${row}-${col}`)) {
                const isSelected = selectedCell && 
                    selectedCell.row === row && 
                    selectedCell.col === col;
                // Check if there's a chest here - if so, draw orb with reduced opacity
                const hasChest = chests.some(c => c.row === row && c.col === col && !c.opened);
                if (hasChest) {
                    drawOrbAt(col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2, 
                        grid[row][col], isSelected, 1, 0.5);
                } else {
                    drawOrb(row, col, grid[row][col], isSelected);
                }
            }
        }
    }
    
    // Draw chests (on top of orbs)
    for (let chest of chests) {
        const x = chest.col * CELL_SIZE + CELL_SIZE / 2;
        const y = chest.row * CELL_SIZE + CELL_SIZE / 2;
        drawChest(x, y, chest.opened);
    }
    
    // Draw loot animations (on top of everything)
    for (let loot of lootAnimations) {
        if (loot.currentX !== undefined && loot.currentY !== undefined && !loot.collected) {
            const scale = 1 + Math.sin((loot.progress || 0) * Math.PI) * 0.3; // Pop effect
            drawLootItem(loot.currentX, loot.currentY, loot.type, scale, 1);
        }
    }
}


// Mouse event handlers
let mouseDownCell = null;

canvas.addEventListener('mousedown', (e) => {
    if (isAnimating) return;
    
    const cell = getCellFromMouse(e.clientX, e.clientY);
    if (cell) {
        mouseDownCell = cell;
        selectedCell = cell;
        render();
    }
});

// Animate swap
function animateSwap(row1, col1, row2, col2, isValid, callback) {
    isAnimating = true;
    swapAnimation = {
        cell1: { row: row1, col: col1 },
        cell2: { row: row2, col: col2 },
        progress: 0
    };
    
    // Actually swap in grid
    swapCells(row1, col1, row2, col2);
    
    const duration = isValid ? 400 : 300; // Longer for valid swaps
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        swapAnimation.progress = Math.min(elapsed / duration, 1);
        
        render();
        
        if (swapAnimation.progress < 1) {
            requestAnimationFrame(animate);
        } else {
            swapAnimation = null;
            if (isValid) {
                callback();
            } else {
                // Swap back for invalid moves
                swapCells(row1, col1, row2, col2);
                render();
                isAnimating = false;
            }
        }
    }
    
    animate();
}

canvas.addEventListener('mouseup', (e) => {
    if (isAnimating || !mouseDownCell) return;
    
    const cell = getCellFromMouse(e.clientX, e.clientY);
    if (cell && mouseDownCell) {
        const row1 = mouseDownCell.row;
        const col1 = mouseDownCell.col;
        const row2 = cell.row;
        const col2 = cell.col;
        
        // Check if adjacent
        const isAdjacent = 
            (Math.abs(row1 - row2) === 1 && col1 === col2) ||
            (Math.abs(col1 - col2) === 1 && row1 === row2);
        
        if (isAdjacent) {
            const valid = isValidSwap(row1, col1, row2, col2);
            animateSwap(row1, col1, row2, col2, valid, () => {
                // After valid swap animation, process matches (this is a player move)
                setTimeout(() => {
                    processMatches(true);
                }, 100);
            });
        }
    }
    
    selectedCell = null;
    mouseDownCell = null;
    if (!isAnimating) {
        render();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isAnimating) return;
    
    const cell = getCellFromMouse(e.clientX, e.clientY);
    if (cell && mouseDownCell) {
        const row1 = mouseDownCell.row;
        const col1 = mouseDownCell.col;
        const row2 = cell.row;
        const col2 = cell.col;
        
        const isAdjacent = 
            (Math.abs(row1 - row2) === 1 && col1 === col2) ||
            (Math.abs(col1 - col2) === 1 && row1 === row2);
        
        if (isAdjacent) {
            selectedCell = cell;
        } else {
            selectedCell = mouseDownCell;
        }
        render();
    }
});

// Initialize the game
initMonsters();
initGame();

// Continuous animation loop for element effects (fire flickering, water bubbles, etc.)
function animateEffects() {
    // Always render to keep element effects animated (fire flickering, water bubbles, air wisps)
    // The render function handles all animations including swaps and falling
    render();
    requestAnimationFrame(animateEffects);
}

// Start the continuous animation loop
animateEffects();

