// ============ CONFIGURATION & CONSTANTS ============
const game = getById("game")
const ctx = game.get2d()

const factor = 60
let width = 16 * factor
let height = 9 * factor

game.setSize(width, height)

const VIEW_DISTANCE = 5

const BG_COLOR = "#101010"
const FG_COLOR = "#4e170d"
const EXIT_COLOR = "cyan"
const SPOWN_COLOR = "gold"
const WATER_COLOR = "blue"
const FIRE_COLOR = "orange"

const grid = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 5, 1, 0, 0, 1, 0, 1, 1, 1, 1],
    [1, 0, 4, 4, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

const TILE_TYPE = {
    EMPTY: 0,
    WALL: 1,
    SPAWN: 2,
    EXIT: 3,
    WATER: 4,
    FIRE: 5,
}

const WALKABLE_TILES = [TILE_TYPE.EMPTY, TILE_TYPE.EXIT, TILE_TYPE.SPAWN]
const GRID_WIDTH = grid[0].length
const GRID_HEIGHT = grid.length

let tileWidth = width / GRID_WIDTH
let tileHeight = height / GRID_HEIGHT
let tileSize = Math.min(tileWidth, tileHeight)

// ============ GAME STATE ============
let gameState = {
    player: null,
    animationId: null,
    inDebugMode: true,  // Default ON during development

    isPaused: false,
    isInventoryOpen: false,

    isInCombat: false,
    currentEnemy: null,
    gameOver: false,
    playerWon: false,

    showInfo: false,
    infoMessage: "",
    infoTimeout: null
}

let entityLayer = []

// ============ HELPER FUNCTIONS ============
function isValidPos(row, col) {
    if (row < 0 || row >= GRID_HEIGHT) return false
    if (col < 0 || col >= GRID_WIDTH) return false
    return WALKABLE_TILES.includes(grid[row][col])
}

function isInViewRange(entity, player) {
    let dx = entity.pos_col - player.pos_col
    let dy = entity.pos_row - player.pos_row
    let distance = Math.abs(dx) + Math.abs(dy)
    return distance <= VIEW_DISTANCE
}

function hasLineOfSight(entity, player) {
    if (!isInViewRange(entity, player)) return false

    let x1 = player.pos_col
    let y1 = player.pos_row
    let x2 = entity.pos_col
    let y2 = entity.pos_row

    let dx = x2 - x1
    let dy = y2 - y1

    let steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2

    if (steps === 0) return true

    for (let i = 1; i <= steps; i++) {
        let t = i / steps;

        let currX = x1 + dx * t;
        let currY = y1 + dy * t;

        let checkCol = Math.round(currX);
        let checkRow = Math.round(currY);

        if (checkCol === x2 && checkRow === y2) {
            return true;
        }

        if (grid[checkRow] && grid[checkRow][checkCol] === TILE_TYPE.WALL) {
            return false;
        }
    }
    return true;
}

function getTileTypeAt(row, col) {
    return grid[row][col]
}

function getEntityAt(row, col, entityList) {
    return entityList.find(e => e.pos_row === row && e.pos_col === col) || null
}

function scaleSize({ w, h }, scaler) {
    return { w: w * scaler, h: h * scaler }
}

function getRandomWalkablePos(minDistanceFrom = null, minDist = 3) {
    let attempts = 0
    let maxAttempts = 1000

    while (attempts < maxAttempts) {
        let row = Math.floor(Math.random() * GRID_HEIGHT)
        let col = Math.floor(Math.random() * GRID_WIDTH)

        if (!isValidPos(row, col)) {
            attempts++
            continue
        }

        if (getEntityAt(row, col, entityLayer) !== null) {
            attempts++
            continue
        }

        if (minDistanceFrom) {
            let distance = Math.abs(row - minDistanceFrom.pos_row) +
                Math.abs(col - minDistanceFrom.pos_col)

            if (distance < minDist) {
                attempts++
                continue
            }
        }

        return { row, col, success: true }
    }

    return { row: -1, col: -1, success: false }
}

function spawnPlayer(player) {
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            if (grid[row][col] === TILE_TYPE.SPAWN) {
                player.pos_row = row
                player.pos_col = col
                console.log(`[SPAWN] Player spawned at (${row}, ${col})`)
                return true
            }
        }
    }
    console.error("[ERROR] No spawn point found!")
    return false
}

function spawnEntity(entity) {
    row = entity.pos_row
    col = entity.pos_col
    if (isValidPos(row, col) && getEntityAt(row, col, entityLayer) === null) {
        console.log(`[SPAWN] Entity spawned at (${row}, ${col})`)
        return true
    }
    console.error(`[ERROR] Cannot spawn at (${row}, ${col})`)
    return false
}

function spawnEntityRandom(entity, minDistanceFrom = null) {
    let pos = getRandomWalkablePos(minDistanceFrom, 3)

    if (pos.success) {
        entity.pos_row = pos.row
        entity.pos_col = pos.col
        console.log(`[SPAWN] Entity spawned at (${pos.row}, ${pos.col})`)
        return true
    }

    console.error("[ERROR] Could not find valid spawn position")
    return false
}

function showInfoMessage(message, duration = 2000) {
    gameState.showInfo = true;
    gameState.infoMessage = message;

    if (gameState.infoTimeout) {
        clearTimeout(gameState.infoTimeout);
    }

    gameState.infoTimeout = setTimeout(() => {
        gameState.showInfo = false;
        gameState.infoMessage = "";
    }, duration);
}

// ============ DRAW FUNCTIONS ============
function clearCanvas() {
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, width, height)
}

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawText(text, x, y, size = "16px", color = "white", align = "center", font = "Arial") {
    ctx.fillStyle = color;
    ctx.font = size + " " + font;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
}

function drawFrame(x, y, w, h, offset, color = "orange", thickness = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;

    let innerX = x + offset;
    let innerY = y + offset;
    let innerW = w - (offset * 2);
    let innerH = h - (offset * 2);

    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(innerX + innerW, innerY);
    ctx.lineTo(innerX + innerW, innerY + innerH);
    ctx.lineTo(innerX, innerY + innerH);
    ctx.closePath();
    ctx.stroke();
}

function drawMap() {
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            if (grid[row][col] == TILE_TYPE.WALL) {
                ctx.fillStyle = FG_COLOR
            } else if (grid[row][col] == TILE_TYPE.EXIT) {
                ctx.fillStyle = EXIT_COLOR
            } else if (grid[row][col] == TILE_TYPE.SPAWN) {
                ctx.fillStyle = SPOWN_COLOR
            } else if (grid[row][col] == TILE_TYPE.WATER) {
                ctx.fillStyle = WATER_COLOR
            }
            else if (grid[row][col] == TILE_TYPE.FIRE) {
                ctx.fillStyle = FIRE_COLOR
            } else {
                ctx.fillStyle = BG_COLOR
            }
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize)
        }
    }
}

function drawGrid() {
    ctx.strokeStyle = "#404040"
    ctx.lineWidth = 1
    for (let col = 0; col <= GRID_WIDTH; col++) {
        ctx.beginPath()
        ctx.moveTo(col * tileSize, 0)
        ctx.lineTo(col * tileSize, height)
        ctx.stroke()
    }

    for (let row = 0; row <= GRID_HEIGHT; row++) {
        ctx.beginPath()
        ctx.moveTo(0, row * tileSize)
        ctx.lineTo(width, row * tileSize)
        ctx.stroke()
    }
}

function drawEntity(entity) {
    if (entity.pos_row >= 0) {
        let cx = entity.pos_col * tileSize + (tileSize - entity.size) / 2
        let cy = entity.pos_row * tileSize + (tileSize - entity.size) / 2
        drawRect(cx, cy, entity.size, entity.size, entity.color)
        if (gameState.inDebugMode) {
            drawText(`${entity.pos_row}:${entity.pos_col}`, cx + entity.size / 2, cy + entity.size / 2, "16px", "white", "center")
        }
    }
}

function drawEntityLayer(entityList) {
    for (let entity of entityList) {
        if (hasLineOfSight(entity, gameState.player)) {
            drawEntity(entity);
        }
    }
}

function drawCombatScreen(player, enemy) {
    let swScaled = width * 0.7;
    let shScaled = height * 0.7;
    let cx = (width - swScaled) / 2;
    let cy = (height - shScaled) / 2;

    drawRect(cx, cy, swScaled, shScaled, "#1a1a1a");
    drawFrame(cx, cy, swScaled, shScaled, 20, "orange", 3);
    drawText("COMBAT", cx + swScaled / 2, cy + 50, "bold 24px");

    let padding = 100;
    let entitySize = 100;

    let pX = cx + padding;
    let pY = cy + shScaled / 2;

    let pColor = player.flashFrames > 0 ? "white" : player.color;
    if (player.flashFrames > 0) player.flashFrames--;
    drawRect(pX, pY, entitySize, entitySize, pColor);

    if (gameState.combatTurn === "player") {
        drawText("▼", pX + entitySize / 2, pY - 60, "20px", "gold");
    }

    drawText(`HP: ${player.health}`, pX, pY - 45, "14px", "white", "left", "Consolas");
    drawText(`ATK: ${player.atk}`, pX, pY - 30, "14px", "white", "left", "Consolas");
    drawText(`DEF: ${player.def}`, pX, pY - 15, "14px", "white", "left", "Consolas");

    let eX = cx + swScaled - padding - entitySize;
    let eY = cy + shScaled / 2;

    let eColor = enemy.flashFrames > 0 ? "white" : enemy.color;
    if (enemy.flashFrames > 0) enemy.flashFrames--;
    drawRect(eX, eY, entitySize, entitySize, eColor);

    if (gameState.combatTurn === "enemy") {
        drawText("▼", eX + entitySize / 2, eY - 60, "20px", "gold");
    }

    drawText(`HP: ${enemy.health}`, eX + entitySize, eY - 45, "14px", "white", "right", "Consolas");
    drawText(`ATK: ${enemy.atk}`, eX + entitySize, eY - 30, "14px", "white", "right", "Consolas");
    drawText(`DEF: ${enemy.def}`, eX + entitySize, eY - 15, "14px", "white", "right", "Consolas");

    drawText(gameState.combatLog, cx + swScaled / 2, cy + shScaled - 40, "italic 16px", "gold");
}

function drawInventory() {
    let swScaled = width * 0.4;
    let shScaled = height * 0.6;
    let cx = (width - swScaled) / 2;
    let cy = (height - shScaled) / 2;

    // Háttér panel
    drawRect(cx, cy, swScaled, shScaled, "#1a1a1a");
    drawFrame(cx, cy, swScaled, shScaled, 15, "gold", 3);

    // Cím
    drawText("INVENTORY", cx + swScaled / 2, cy + 40, "bold 24px", "gold");

    // Vonal a cím alatt
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy + 55);
    ctx.lineTo(cx + swScaled - 30, cy + 55);
    ctx.stroke();

    // === ARANY ===
    let startY = cy + 85;
    drawText(`Gold: ${gameState.player.gold}`, cx + 30, startY, "18px", "#ffd700", "left");

    // === KULCSOK ===
    startY += 40;
    drawText("Keys:", cx + 30, startY, "bold 18px", "white", "left");

    if (gameState.player.inventory.length === 0) {
        drawText("(none)", cx + 50, startY + 30, "16px", "#888", "left");
    } else {
        let keyY = startY + 30;
        for (let item of gameState.player.inventory) {
            // Kulcs ikon (kis négyzet)
            let iconColor = "magenta"; // Default szín
            if (item.includes("Gold")) iconColor = "gold";
            if (item.includes("Silver")) iconColor = "silver";
            if (item.includes("Clue")) iconColor = "cyan";
            if (item.includes("Red")) iconColor = "red";

            drawRect(cx + 50, keyY - 12, 16, 16, iconColor);
            drawText(item, cx + 75, keyY, "16px", "white", "left");
            keyY += 30;
        }
    }

    // === BEZÁRÁS INFO ===
    drawText("Press [I] to close", cx + swScaled / 2, cy + shScaled - 25, "14px", "#888");
}

function drawPauseScreen() {
    let size = { w: 400, h: 200 }
    let cx = width / 2 - size.w / 2
    let cy = height / 2 - size.h / 2
    drawRect(cx, cy, size.w, size.h, "#101010")
    drawFrame(cx, cy, size.w, size.h, 10, "yellow", 2)
    drawText("PAUSED", width / 2, height / 2, "bold 32px", "yellow");
}

// ============ UI & SYSTEM ============
function drawHUD() {
    const hudHeight = 50
    const padding = 15
    const iconSize = 32
    const spacing = 20

    // HUD background
    ctx.fillStyle = "rgba(16, 16, 16, 0.85)"
    ctx.fillRect(0, 0, width, hudHeight)

    // Bottom border line
    ctx.strokeStyle = "#444"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, hudHeight)
    ctx.lineTo(width, hudHeight)
    ctx.stroke()

    let currentX = padding

    // === PLAYER STATS ===
    // HP
    ctx.fillStyle = "#ff4444"
    ctx.fillRect(currentX, padding + 8, iconSize, iconSize - 16)
    ctx.fillStyle = "white"
    ctx.font = "bold 14px Courier New"
    ctx.textAlign = "left"
    ctx.fillText(`${gameState.player.health}/100`, currentX + iconSize + 8, padding + 22)

    currentX += iconSize + 70

    // ATK
    ctx.fillStyle = "#ff8844"
    ctx.beginPath()
    ctx.moveTo(currentX + iconSize / 2, padding + 4)
    ctx.lineTo(currentX + iconSize - 4, padding + iconSize - 4)
    ctx.lineTo(currentX + 4, padding + iconSize - 4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = "white"
    ctx.fillText(`${gameState.player.atk}`, currentX + iconSize + 8, padding + 22)

    currentX += iconSize + 50

    // DEF
    ctx.fillStyle = "#4488ff"
    ctx.beginPath()
    ctx.arc(currentX + iconSize / 2, padding + iconSize / 2, iconSize / 2 - 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "white"
    ctx.fillText(`${gameState.player.def}`, currentX + iconSize + 8, padding + 22)

    // === DIVIDER ===
    currentX += iconSize + 70
    ctx.strokeStyle = "#444"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(currentX, padding)
    ctx.lineTo(currentX, hudHeight - padding)
    ctx.stroke()

    currentX += spacing

    // === ENEMIES REMAINING ===
    const enemiesLeft = entityLayer.filter(e => e instanceof Enemy).length
    ctx.fillStyle = "#ff4444"
    ctx.fillRect(currentX, padding + 4, iconSize - 8, iconSize - 8)
    ctx.fillStyle = "white"
    ctx.font = "14px Courier New"
    ctx.fillText(`Enemies: ${enemiesLeft}`, currentX + iconSize + 8, padding + 22)

    currentX += iconSize + 130

    // === KEYS ===
    const keyCount = gameState.player.inventory.filter(item =>
        item.includes("key") || item.includes("Key")
    ).length
    ctx.fillStyle = "#ffdd44"
    ctx.fillRect(currentX + 4, padding + 4, iconSize - 16, iconSize - 16)
    ctx.fillRect(currentX + iconSize - 12, padding + 10, 8, iconSize - 26)
    ctx.fillStyle = "white"
    ctx.fillText(`Keys: ${keyCount}`, currentX + iconSize + 8, padding + 22)
}

function drawVictoryScreen() {
    let swScaled = width * 0.6;
    let shScaled = height * 0.4;
    let cx = (width - swScaled) / 2;
    let cy = (height - shScaled) / 2;

    drawRect(cx, cy, swScaled, shScaled, "#1a4d1a");
    drawFrame(cx, cy, swScaled, shScaled, 20, "gold", 4);
    drawText("VICTORY!", cx + swScaled / 2, cy + shScaled / 2 - 20, "bold 32px", "gold");
    drawText("You escaped the dungeon!", cx + swScaled / 2, cy + shScaled / 2 + 20, "18px", "white");
}

function drawGameOverScreen() {
    let swScaled = width * 0.6;
    let shScaled = height * 0.4;
    let cx = (width - swScaled) / 2;
    let cy = (height - shScaled) / 2;

    drawRect(cx, cy, swScaled, shScaled, "#4d1a1a");
    drawFrame(cx, cy, swScaled, shScaled, 20, "darkred", 4);
    drawText("GAME OVER", cx + swScaled / 2, cy + shScaled / 2 - 20, "bold 32px", "red");
    drawText("You have been defeated...", cx + swScaled / 2, cy + shScaled / 2 + 20, "18px", "white");
}

function drawInfoScreen() {
    let swScaled = width * 0.6;
    let shScaled = height * 0.15;
    let cx = (width - swScaled) / 2;
    let cy = height - shScaled - 40;

    drawRect(cx, cy, swScaled, shScaled, "#1a1a4d");
    drawFrame(cx, cy, swScaled, shScaled, 10, "cyan", 3);
    drawText(gameState.infoMessage, cx + swScaled / 2, cy + shScaled / 2 + 5, "16px", "white");
}

// ============ EVENT HANDLING ============
function handleCombatAction() {
    if (!gameState.isInCombat || gameState.combatTurn !== "player") return;

    let damageDone = gameState.currentEnemy.takeDamage(gameState.player.atk);
    gameState.combatLog = `You hit ${gameState.currentEnemy.name} for ${damageDone} damage!`;

    gameState.combatTurn = "enemy";

    setTimeout(() => {
        if (!gameState.currentEnemy.isAlive()) {
            gameState.combatLog = `${gameState.currentEnemy.name} defeated!`;
            setTimeout(() => {
                let index = entityLayer.indexOf(gameState.currentEnemy);
                if (index > -1) {
                    entityLayer.splice(index, 1);
                    console.log(`[COMBAT] Removed ${gameState.currentEnemy.name} from entityLayer`);
                }
                gameState.isInCombat = false;
                gameState.currentEnemy = null;
            }, 2000);
            return;
        }

        let enemyDamage = gameState.player.takeDamage(gameState.currentEnemy.atk);
        gameState.combatLog = `${gameState.currentEnemy.name} hits you for ${enemyDamage} damage!`;

        setTimeout(() => {
            if (gameState.player.isAlive()) {
                gameState.combatTurn = "player";
                gameState.combatLog = "Your turn! Press SPACE!";
            } else {
                gameState.combatLog = "You have been defeated...";
                gameState.gameOver = true;
            }
        }, 2000);

    }, 2000);
}

function toggleInventory() {
    gameState.isInventoryOpen = !gameState.isInventoryOpen;
    console.log("Inventory:", gameState.isInventoryOpen);
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    console.log("Paused:", gameState.isPaused);
    if (!gameState.isPaused && gameState.animationId === null) {
        gameLoop();
    }
}

// ============ INPUT HANDLING ============
window.addEventListener("keydown", (e) => {
    if (e.repeat) return;

    // Allow toggling inventory and pause even when game is frozen
    if (e.key === "i") {
        toggleInventory();
        return;
    }
    if (gameState.isInventoryOpen) return

    if (e.key === "p" || e.key === "Escape") {
        togglePause();
        return;
    }
    if (gameState.isPaused) return

    if (gameState.isInCombat) {
        if (e.key === " ") {
            handleCombatAction();
        }
        return;
    }

    let direction = null;
    if (e.key === "w") direction = "up";
    if (e.key === "s") direction = "down";
    if (e.key === "a") direction = "left";
    if (e.key === "d") direction = "right";

    if (e.key === "~") gameState.inDebugMode = !gameState.inDebugMode;

    if (direction) {
        let result = gameState.player.move(direction, gameState);
        if (result.reason === "collision" && result.entity instanceof Enemy) {
            gameState.isInCombat = true;
            gameState.currentEnemy = result.entity;
            gameState.combatTurn = "player";
            gameState.combatLog = `Engaged ${result.entity.name}! Press SPACE!`;
        }
    }
});

// ============ INITIALIZATION ============
window.onload = () => {
    gameState.player = new Player("green");

    // 1. Spawn player FIRST
    if (!spawnPlayer(gameState.player)) {
        console.error("[FATAL] Could not spawn player!");
        return;
    }

    // 2. Define and spawn FIXED position entities
    const fixedEntities = [
        // Items
        new Key("Golden Key", "gold", 1, 14),
        new Key("Silver Key", "silver", 4, 9),
        new Potion("Health Potion", 30, 6, 4),
        new Gold(50, 2, 8),

        // Structures
        new Door(5, 12, "Golden Key"),      // Requires gold_key
        new Door(3, 12, "Silver Key"),    // Requires silver_key
        new Door(3, 8, null, "gray"),    // No key required (gray color)
        new Chest(3, 6, [new Gold(100), new Potion("Health Potion", 50, -1, -1)]),
    ]

    for (let entity of fixedEntities) {
        if (spawnEntity(entity)) {
            entityLayer.push(entity)
        } else {
            console.warn(`[SPAWN] Failed to spawn at (${entity.pos_row}, ${entity.pos_col})`);
        }
    }

    // 3. Define and spawn RANDOM position enemies
    const randomEnemies = [
        new Enemy("BOSS", 60, 20, 10, "purple")
    ];

    for (let i = 0; i < 3; ++i) {
        randomEnemies.push(new Enemy(`Goblin ${i + 1}`, 30, 10, 5, "red"))
    }

    for (let enemy of randomEnemies) {
        if (spawnEntityRandom(enemy, gameState.player)) {
            entityLayer.push(enemy);
        } else {
            console.warn(`[SPAWN] Failed to spawn ${enemy.name} randomly`);
        }
    }

    // 4. Stats logging
    if (gameState.inDebugMode) {
        let stats = { enemies: 0, items: 0, structures: 0 };
        for (let e of entityLayer) {
            if (e instanceof Enemy) stats.enemies++;
            else if (e instanceof Item) stats.items++;
            else if (e instanceof Structure) stats.structures++;
        }

        console.log(`[SPAWN] Loaded ${entityLayer.length} entities:`);
        console.log(`  - ${stats.enemies} enemies`);
        console.log(`  - ${stats.items} items`);
        console.log(`  - ${stats.structures} structures`);
    }

    // ============ GAME LOOP ============

    let lastTime = performance.now()
    let frameCount = 0
    let fps = 0
    function gameLoop(timeStamp) {
        frameCount++;
        const dt = timeStamp - lastTime;

        if (dt >= 1000) {
            fps = Math.round((frameCount / dt) * 1000);
            //console.log(`FPS: ${fps}`);
            frameCount = 0;
            lastTime = timeStamp;
        }

        clearCanvas();

        
        drawMap();
        
        if (gameState.inDebugMode) {
            drawGrid();
        }

        for (let e of entityLayer) {
            if (e instanceof Structure) {
                drawEntity(e);
            } else if (gameState.player != null && hasLineOfSight(e, gameState.player)) {
                drawEntity(e);
            } else if (gameState.player != null && gameState.inDebugMode) {
                drawEntity(e);
            }
        }

        if (gameState.player) {
            drawEntity(gameState.player);
        }

        drawHUD()

        if (gameState.gameOver) {
            drawGameOverScreen();
            if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
            gameState.animationId = null;
            return;
        } else if (gameState.playerWon) {
            drawVictoryScreen()
            if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
            gameState.animationId = null;
            return;
        }

        if (gameState.isInventoryOpen) {
            drawInventory()
            gameState.animationId = requestAnimationFrame(gameLoop);
            return
        }

        if (gameState.isPaused) {
            drawPauseScreen()
            gameState.animationId = requestAnimationFrame(gameLoop);
            return;
        }

        if (gameState.isInCombat) {
            drawCombatScreen(gameState.player, gameState.currentEnemy);
            gameState.animationId = requestAnimationFrame(gameLoop);
            return
        }

        if (gameState.gameOver) {
            drawGameOverScreen();
            if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
            gameState.animationId = null;
            return;
        } else if (gameState.playerWon) {
            drawVictoryScreen()
            if (gameState.animationId) cancelAnimationFrame(gameState.animationId);
            gameState.animationId = null;
            return;
        }

        if (gameState.showInfo) {
            drawInfoScreen();
        }

        gameState.animationId = requestAnimationFrame(gameLoop); // Tárold az ID-t
    }

    gameLoop();
}
