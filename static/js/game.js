// ==================================================
//  Constants
// ==================================================
const TILE_SIZE = 20;
const factor = 60;
const GRID_WIDTH = 16 * factor / TILE_SIZE;
const GRID_HEIGHT = 9 * factor / TILE_SIZE;

const TILE_T = {
    FLOOR: { id: 0, color: "#4e170d", isWalkable: true, hasEffect: false },
    WALL: { id: 1, color: "#101010", isWalkable: false, hasEffect: false },
    WATER: { id: 2, color: "#1a3a6a", isWalkable: true, hasEffect: true },
    FIRE: { id: 3, color: "#ff6600", isWalkable: true, hasEffect: true },
    START: { id: 4, color: "#8a7200", isWalkable: true, hasEffect: false },
    EXIT: { id: 5, color: "#006a6a", isWalkable: true, hasEffect: false },
};

const TILE_BY_ID = Object.fromEntries(
    Object.values(TILE_T).map(t => [t.id, t])
);

const VIEW_DISTANCE = 8;

// ==================================================
//  Global State
// ==================================================
let grid = [];
let entityLayer = [];

const gameState = {
    player: null,
    animationId: null,
    inDebugMode: false,
    isPaused: false,
    isInventoryOpen: false,
    isInCombat: false,
    currentEnemy: null,
    combatTurn: "",
    combatLog: "",
    gameOver: false,
    playerWon: false,
    showInfo: false,
    infoMessage: "",
    infoTimeout: null
};

// ==================================================
//  Utility Functions
// ==================================================
function log(level, message) {
    const levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    console.log(`[${levels[level]}]: ${message}`);
}

function showInfoMessage(message, duration = 2000) {
    gameState.showInfo = true;
    gameState.infoMessage = message;
    if (gameState.infoTimeout) clearTimeout(gameState.infoTimeout);
    gameState.infoTimeout = setTimeout(() => {
        gameState.showInfo = false;
        gameState.infoMessage = "";
    }, duration);
}

function isValidPosition(row, col) {
    if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return false;
    const tile = TILE_BY_ID[grid[row][col]];
    return tile?.isWalkable ?? false;
}

function isValidRange(entity, player) {
    let dx = entity.col - player.col;
    let dy = entity.row - player.row;
    return Math.abs(dx) + Math.abs(dy) <= VIEW_DISTANCE;
}

function hasLineOfSight(entity, player) {
    if (!isValidRange(entity, player)) return false;
    if (!player) return false;

    let x1 = player.col, y1 = player.row;
    let x2 = entity.col, y2 = entity.row;
    let dx = x2 - x1, dy = y2 - y1;
    let steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
    if (steps === 0) return true;

    for (let i = 1; i <= steps; i++) {
        let t = i / steps;
        let exactCol = x1 + dx * t;
        let exactRow = y1 + dy * t;

        // Mindkét szomszédos cellát ellenőrizzük átlós sugárnál
        const cellsToCheck = [
            { r: Math.floor(exactRow), c: Math.floor(exactCol) },
            { r: Math.ceil(exactRow), c: Math.ceil(exactCol) },
        ];

        for (const { r, c } of cellsToCheck) {
            if (r === y2 && c === x2) return true; // célnál vagyunk
            if (!grid[r] || grid[r][c] === undefined) continue;
            const tile = TILE_BY_ID[grid[r][c]];
            if (tile === TILE_T.WALL) return false;
            const blocker = getEntityAt(r, c, entityLayer);
            if (blocker instanceof Door && !blocker.isOpen) return false;
        }
    }

    return true;
}

function getRandomWalkablePos(minDistanceFrom, minDist = 3) {
    let attempts = 0;
    while (attempts < 1000) {
        let row = Math.floor(Math.random() * GRID_HEIGHT);
        let col = Math.floor(Math.random() * GRID_WIDTH);
        if (!isValidPosition(row, col)) { attempts++; continue; }
        if (getEntityAt(row, col, entityLayer) !== null) { attempts++; continue; }
        if (minDistanceFrom) {
            let distance = Math.abs(row - minDistanceFrom.row) + Math.abs(col - minDistanceFrom.col);
            if (distance < minDist) { attempts++; continue; }
        }
        return { row, col, success: true };
    }
    return { row: -1, col: -1, success: false };
}

function getEntityAt(row, col, entityList) {
    return entityList.find(e => e.row === row && e.col === col) || null;
}

function getTileTypeAt(row, col) {
    return grid[row][col];
}

function bfsNextStep(fromRow, fromCol, toRow, toCol) {
    if (fromRow === toRow && fromCol === toCol) return null;

    const queue = [{ row: fromRow, col: fromCol, path: [] }];
    const visited = new Set();
    visited.add(`${fromRow},${fromCol}`);

    const dirs = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
    ];

    while (queue.length > 0) {
        const { row, col, path } = queue.shift();

        for (const { dr, dc } of dirs) {
            const nr = row + dr;
            const nc = col + dc;
            const key = `${nr},${nc}`;
            let tile = TILE_BY_ID[grid[nr][nc]];


            if (visited.has(key)) continue;
            visited.add(key);

            // Cél elérve
            if (nr === toRow && nc === toCol) {
                const fullPath = [...path, { row: nr, col: nc }];
                return fullPath[0]; // következő lépés
            }

            // Csak járható tile-on mehet át (de a célnál nem ellenőrizzük — ott van az entitás)
            if (!grid[nr]) continue;
            tile = TILE_BY_ID[grid[nr][nc]];
            if (!tile?.isWalkable) continue;

            // Ne menjen olyan mezőre ahol másik enemy áll (kivéve a cél)
            if (!grid[nr]) continue;
            tile = TILE_BY_ID[grid[nr][nc]];
            if (!tile?.isWalkable) continue;
            const occupant = getEntityAt(nr, nc, entityLayer);
            if (occupant instanceof Door && !occupant.isOpen) continue;

            queue.push({ row: nr, col: nc, path: [...path, { row: nr, col: nc }] });
        }
    }

    return null; // nincs elérhető út
}

// ==================================================
//  Rendering Functions
// ==================================================
function drawEntityLayer(entityList) {
    // Pass 1: structures (Door, Chest, stb.) — mindig alul
    for (let e of entityList) {
        if (e instanceof Structure) drawEntity(e);
    }
    // Pass 2: mozgó entitások — felül
    for (let e of entityList) {
        if (e instanceof Structure) continue;
        if (gameState.player != null && hasLineOfSight(e, gameState.player)) {
            drawEntity(e);
        } else if (gameState.player != null && gameState.inDebugMode) {
            drawEntity(e);
        }
    }
}

function drawEntity(entity) {
    if (!entity) return;
    if (entity.row >= 0) {
        let cx = entity.col * TILE_SIZE + (TILE_SIZE - entity.size) / 2;
        let cy = entity.row * TILE_SIZE + (TILE_SIZE - entity.size) / 2;
        r.drawRect(cx, cy, entity.size, entity.size, entity.color);
        if (gameState.inDebugMode) {
            r.drawText(`${entity.row}:${entity.col}`, cx + entity.size / 2, cy + entity.size / 2, "16px", "white", "center");
        }
    }
}

function drawHUD() {
    const hudHeight = 50;
    const padding = 15;
    const iconSize = 32;
    const hudY = canvasHeight - hudHeight;

    r.drawRect(0, hudY, canvasWidth, hudHeight, "rgba(16, 16, 16, 0.85)");
    r.drawLine(0, hudY, canvasWidth, hudY, "#444444", 2);

    const textY = hudY + padding + 7;
    let currentX = padding;

    // HP
    r.drawRect(currentX, hudY + padding - 4, iconSize, iconSize - 16, "#ff4444");
    r.drawText(`${gameState.player.health}/100`, currentX + iconSize + 8, textY, "bold 14px", "white", "left", "Courier New");
    currentX += iconSize + 70;

    // ATK
    r.drawTriangle(
        currentX + iconSize / 2, hudY + padding - 4,
        currentX + iconSize - 4, hudY + hudHeight - padding,
        currentX + 4, hudY + hudHeight - padding,
        "#ff8844"
    );
    r.drawText(`${gameState.player.atk}`, currentX + iconSize + 8, textY, "14px", "white", "left", "Courier New");
    currentX += iconSize + 50;

    // DEF
    r.drawCircle(currentX + iconSize / 2, hudY + hudHeight / 2, iconSize / 2 - 4, "#4488ff");
    r.drawText(`${gameState.player.def}`, currentX + iconSize + 8, textY, "14px", "white", "left", "Courier New");
    currentX += iconSize + 70;

    // Divider
    r.drawLine(currentX, hudY + padding, currentX, hudY + hudHeight - padding, "#444444", 2);
    currentX += 20;

    // Enemies remaining
    const enemiesLeft = entityLayer.filter(e => e instanceof Enemy).length;
    r.drawRect(currentX, hudY + padding - 4, iconSize - 8, iconSize - 8, "#ff4444");
    r.drawText(`Enemies: ${enemiesLeft}`, currentX + iconSize + 8, textY, "14px", "white", "left", "Courier New");
    currentX += iconSize + 130;

    // Keys
    const keyCount = gameState.player.inventory.filter(item =>
        item.toLowerCase().includes("key")
    ).length;
    r.drawRect(currentX + 4, hudY + padding - 4, iconSize - 16, iconSize - 16, "#ffdd44");
    r.drawRect(currentX + iconSize - 12, hudY + padding + 2, 8, iconSize - 26, "#ffdd44");
    r.drawText(`Keys: ${keyCount}`, currentX + iconSize + 8, textY, "14px", "white", "left", "Courier New");
    currentX += iconSize + 100;

    // Gold
    r.drawCircle(currentX + 10, hudY + hudHeight / 2, 9, "gold");
    r.drawText(`${gameState.player.gold} gold`, currentX + 26, textY, "14px", "white", "left", "Courier New");
}

function drawCombatScreen(player, enemy) {
    let swScaled = canvasWidth * 0.7;
    let shScaled = canvasHeight * 0.7;
    let cx = (canvasWidth - swScaled) / 2;
    let cy = (canvasHeight - shScaled) / 2;

    r.drawRect(cx, cy, swScaled, shScaled, "#1a1a1a");
    r.drawFrame(cx, cy, swScaled, shScaled, 20, "orange", 3);
    r.drawText("COMBAT", cx + swScaled / 2, cy + 50, "bold 24px");

    const entitySize = 100;
    const pX = cx + 100;
    const pY = cy + shScaled / 2;

    const pColor = player.flashFrames > 0 ? "white" : player.color;
    if (player.flashFrames > 0) player.flashFrames--;
    r.drawRect(pX, pY, entitySize, entitySize, pColor);

    if (gameState.combatTurn === "player") r.drawText("▼", pX + entitySize / 2, pY - 75, "20px", "gold");
    r.drawText(`HP: ${player.health}`, pX, pY - 45, "14px", "white", "left", "Consolas");
    r.drawText(`ATK: ${player.atk}`, pX, pY - 30, "14px", "white", "left", "Consolas");
    r.drawText(`DEF: ${player.def}`, pX, pY - 15, "14px", "white", "left", "Consolas");
    r.drawText("Player", pX + entitySize / 2, pY - 60, "16px", "green", "center");

    const eX = cx + swScaled - 100 - entitySize;
    const eY = cy + shScaled / 2;

    const eColor = enemy.flashFrames > 0 ? "white" : enemy.color;
    if (enemy.flashFrames > 0) enemy.flashFrames--;
    r.drawRect(eX, eY, entitySize, entitySize, eColor);

    if (gameState.combatTurn === "enemy") r.drawText("▼", eX + entitySize / 2, eY - 75, "20px", "gold");
    r.drawText(`HP: ${enemy.health}`, eX + entitySize, eY - 45, "14px", "white", "right", "Consolas");
    r.drawText(`ATK: ${enemy.atk}`, eX + entitySize, eY - 30, "14px", "white", "right", "Consolas");
    r.drawText(`DEF: ${enemy.def}`, eX + entitySize, eY - 15, "14px", "white", "right", "Consolas");
    r.drawText(enemy.name, eX + entitySize / 2, eY - 60, "16px", "red", "center");
    r.drawText(gameState.combatLog, cx + swScaled / 2, cy + shScaled - 40, "italic 16px", "gold");
}

function drawInventory() {
    let swScaled = canvasWidth * 0.4;
    let shScaled = canvasHeight * 0.6;
    let cx = (canvasWidth - swScaled) / 2;
    let cy = (canvasHeight - shScaled) / 2;

    r.drawRect(cx, cy, swScaled, shScaled, "#1a1a1a");
    r.drawFrame(cx, cy, swScaled, shScaled, 15, "gold", 3);
    r.drawText("INVENTORY", cx + swScaled / 2, cy + 40, "bold 24px", "gold");
    r.drawLine(cx + 30, cy + 55, cx + swScaled - 30, cy + 55, "#444444", 2);

    let startY = cy + 85;
    r.drawText(`Gold: ${gameState.player.gold}`, cx + 30, startY, "18px", "#ffd700", "left");

    startY += 40;
    r.drawText("Keys:", cx + 30, startY, "bold 18px", "white", "left");

    if (gameState.player.inventory.length === 0) {
        r.drawText("(none)", cx + 50, startY + 30, "16px", "#888", "left");
    } else {
        let keyY = startY + 30;
        for (let item of gameState.player.inventory) {
            let iconColor = "magenta";
            if (item.includes("Gold")) iconColor = "gold";
            if (item.includes("Silver")) iconColor = "silver";
            if (item.includes("Red")) iconColor = "red";
            r.drawRect(cx + 50, keyY - 12, 16, 16, iconColor);
            r.drawText(item, cx + 75, keyY, "16px", "white", "left");
            keyY += 30;
        }
    }

    r.drawText("Press [I] to close", cx + swScaled / 2, cy + shScaled - 25, "14px", "#888");
}

function drawPauseScreen() {
    let w = 400, h = 200;
    let cx = canvasWidth / 2 - w / 2;
    let cy = canvasHeight / 2 - h / 2;
    r.drawRect(cx, cy, w, h, "#101010");
    r.drawFrame(cx, cy, w, h, 10, "yellow", 2);
    r.drawText("PAUSED", canvasWidth / 2, canvasHeight / 2, "bold 32px", "yellow");
}

function drawVictoryScreen() {
    let w = canvasWidth * 0.6, h = canvasHeight * 0.4;
    let cx = (canvasWidth - w) / 2;
    let cy = (canvasHeight - h) / 2;
    r.drawRect(cx, cy, w, h, "#1a4d1a");
    r.drawFrame(cx, cy, w, h, 20, "gold", 4);
    r.drawText("VICTORY!", cx + w / 2, cy + h / 2 - 20, "bold 32px", "gold");
    r.drawText("You escaped the dungeon!", cx + w / 2, cy + h / 2 + 20, "18px", "white");
}

function drawGameOverScreen() {
    let w = canvasWidth * 0.6, h = canvasHeight * 0.4;
    let cx = (canvasWidth - w) / 2;
    let cy = (canvasHeight - h) / 2;
    r.drawRect(cx, cy, w, h, "#4d1a1a");
    r.drawFrame(cx, cy, w, h, 20, "darkred", 4);
    r.drawText("GAME OVER", cx + w / 2, cy + h / 2 - 20, "bold 32px", "red");
    r.drawText("You have been defeated...", cx + w / 2, cy + h / 2 + 20, "18px", "white");
}

function drawInfoScreen() {
    let w = canvasWidth * 0.6, h = canvasHeight * 0.15;
    let cx = (canvasWidth - w) / 2;
    let cy = canvasHeight - h - 40;
    r.drawRect(cx, cy, w, h, "#1a1a4d");
    r.drawFrame(cx, cy, w, h, 10, "cyan", 3);
    r.drawText(gameState.infoMessage, cx + w / 2, cy + h / 2 + 5, "16px", "white");
}

function drawErrorScreen(message) {
    r.drawRect(0, 0, canvasWidth, canvasHeight, "#0d0d0f");
    r.drawFrame(canvasWidth / 2 - 300, canvasHeight / 2 - 80, 600, 160, 15, "#e05252", 2);
    r.drawText("FAILED TO LOAD MAP", canvasWidth / 2, canvasHeight / 2 - 20, "bold 22px", "#e05252");
    r.drawText(message, canvasWidth / 2, canvasHeight / 2 + 20, "14px", "#888888");
}

function drawMap() {
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const tile = TILE_BY_ID[grid[row][col]];
            r.drawRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE, tile.color)
        }
    }
}

// ==================================================
//  UI Builder
// ==================================================
function gameContainer() {
    return canvas().setId("game");
}

function app() {
    return div(gameContainer()).setId("appContainer").addClass("container");
}

// ==================================================
//  Combat Logic
// ==================================================
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
                    log(1, `[COMBAT] Removed ${gameState.currentEnemy.name}`);
                }
                gameState.isInCombat = false;
                gameState.currentEnemy = null;
            }, 1500);
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
        }, 1500);
    }, 1500);
}

function toggleInventory() {
    gameState.isInventoryOpen = !gameState.isInventoryOpen;
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
}

// ==================================================
//  Game Logic
// ==================================================
function spawnPlayer(player) {
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            if (grid[row][col] === TILE_T.START.id) {
                player.row = row;
                player.col = col;
                return true;
            }
        }
    }
    console.error("[ERROR] No spawn point found!");
    return false;
}

function spawnEntity(entity) {
    let { row, col } = entity;
    if (isValidPosition(row, col) && getEntityAt(row, col, entityLayer) === null) {
        console.log(`[SPAWN] Entity spawned at (${row}, ${col})`);
        return true;
    }
    console.error(`[ERROR] Cannot spawn at (${row}, ${col})`);
    return false;
}

function spawnEntityRandom(entity, minDistanceFrom) {
    let pos = getRandomWalkablePos(minDistanceFrom, 3);
    if (pos.success) {
        entity.row = pos.row;
        entity.col = pos.col;
        console.log(`[SPAWN] Entity spawned at (${pos.row}, ${pos.col})`);
        return true;
    }
    console.error("[ERROR] Could not find valid spawn position");
    return false;
}

function instantiateEntity(data) {
    switch (data.type) {
        case "Enemy":
            return new Enemy(data.row, data.col, data.name, data.health, data.atk, data.def, "red");
        case "Key":
            return new Key(data.row, data.col, data.name, data.color ?? "gold");
        case "Potion":
            return new Potion(data.row, data.col, data.name, data.healAmount);
        case "Gold":
            return new Gold(data.row, data.col, data.amount);
        case "Door":
            return new Door(data.row, data.col, data.requiredKey ?? null);
        case "Chest": {
            const contents = (data.contents ?? []).map(instantiateEntity);
            return new Chest(data.row, data.col, contents);
        }
        default:
            console.warn(`[LOAD] Unknown entity type: ${data.type}`);
            return null;
    }
}

// ==================================================
//  Game Loop
// ==================================================
function loadMap(filename) {
    fetch(filename)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (!data.grid || !data.entities) throw new Error("Invalid map format");

            grid = data.grid;
            entityLayer = [];

            for (const entityData of data.entities) {
                const entity = instantiateEntity(entityData);
                if (entity) entityLayer.push(entity);
            }

            log(1, `Map loaded: ${filename}`);
            log(1, `Grid: ${grid[0].length}x${grid.length}, Entities: ${entityLayer.length}`);

            if (!spawnPlayer(gameState.player)) {
                log(3, "No spawn point found in map!");
                drawErrorScreen("No START tile found in map.");
                return;
            }

            log(1, `Player spawned at (${gameState.player.row}, ${gameState.player.col})`);
            requestAnimationFrame(gameLoop);
        })
        .catch(err => {
            log(3, `Failed to load map: ${err.message}`);
            drawErrorScreen(`Could not load map.json\n${err.message}`);
        });
}

function startGame() {
    gameState.player = new Player("green");
    loadMap("../maps/map.json");
}

function gameLoop(now) {
    // 1. UPDATE
    if (!gameState.inDebugMode) Enemy.tick(now, gameState.player);

    // 2. RENDER
    r.clear();
    drawMap();
    if (gameState.inDebugMode) r.drawGrid("#404040");
    drawEntityLayer(entityLayer);
    if (gameState.player) drawEntity(gameState.player);
    drawHUD();

    // 3. OVERLAY SCREENS
    if (gameState.gameOver) { drawGameOverScreen(); return; }
    if (gameState.playerWon) { drawVictoryScreen(); return; }
    if (gameState.isInventoryOpen) { drawInventory(); requestAnimationFrame(gameLoop); return; }
    if (gameState.isPaused) { drawPauseScreen(); requestAnimationFrame(gameLoop); return; }
    if (gameState.isInCombat && gameState.currentEnemy) drawCombatScreen(gameState.player, gameState.currentEnemy);
    if (gameState.showInfo) drawInfoScreen();

    requestAnimationFrame(gameLoop);
}

// ==================================================
//  Event Handlers
// ==================================================
window.addEventListener("keydown", (event) => {
    if (event.repeat) return;

    if (event.key === "i" || event.key === "I") { toggleInventory(); return; }
    if (gameState.isInventoryOpen) return;

    if (event.key === "p" || event.key === "P" || event.key === "Escape") { togglePause(); return; }
    if (gameState.isPaused) return;

    if (event.key === "~") gameState.inDebugMode = !gameState.inDebugMode;

    if (gameState.isInCombat) {
        if (event.key === " ") handleCombatAction();
        return;
    }

    if (gameState.gameOver || gameState.playerWon) return;

    let direction = null;
    if (event.key === "w") direction = "up";
    if (event.key === "s") direction = "down";
    if (event.key === "a") direction = "left";
    if (event.key === "d") direction = "right";

    if (direction) {
        let result = gameState.player.move(direction, gameState);
        if (result.reason === "collision" && result.entity instanceof Enemy) {
            log(1, `Player collided with ${result.entity.name}`);
            gameState.isInCombat = true;
            gameState.currentEnemy = result.entity;
            gameState.combatTurn = "player";
            gameState.combatLog = `Engaged ${result.entity.name}! Press SPACE!`;
        }
    }
});

// ==================================================
//  Initialization
// ==================================================

// Start

// DOM & Canvas setup
const appContainer = getById("root");
appContainer.appendChild(app());

const canvasWidth = 16 * factor;
const canvasHeight = 9 * factor;

const gameCanvas = getById("game");
//const ctx = gameCanvas.get2d();
//gameCanvas.setSize(canvasWidth, canvasHeight);
const r = new Renderer(gameCanvas, canvasWidth, canvasHeight)
window.onload = () => {
    startGame();
}
