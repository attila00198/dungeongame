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
    inDebugMode: true,
    player: null,
    inCombat: false,
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

    // Manhattan tÃ¡volsÃ¡g (egyszerÅ±bb, gyorsabb)
    let distance = Math.abs(dx) + Math.abs(dy)

    // VAGY Euclidean tÃ¡volsÃ¡g (pontosabb kÃ¶r alakÃº lÃ¡tÃ³tÃ¡v)
    // let distance = Math.sqrt(dx * dx + dy * dy)

    return distance <= VIEW_DISTANCE
}

function hasLineOfSight(entity, player) {
    if (!isInViewRange(entity, player)) return false;

    let x1 = player.pos_col;
    let y1 = player.pos_row;
    let x2 = entity.pos_col;
    let y2 = entity.pos_row;

    let dx = x2 - x1;
    let dy = y2 - y1;

    let steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;

    if (steps === 0) return true;

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
                console.log(`[SPAWN] Player spawned at (${col}, ${row})`)
                return true
            }
        }
    }
    console.error("[ERROR] No spawn point found!")
    return false
}

function spawnEntity(entity, row, col) {
    if (isValidPos(row, col) && getEntityAt(row, col, entityLayer) === null) {
        entity.pos_row = row
        entity.pos_col = col
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

function drawCombatScene(player, enemy) {
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
    // Entities renderelése típus szerint
    for (let e of entityLayer) {
        // Structures mindig látszanak (ajtók, ládák)
        if (e instanceof Structure) {
            drawEntity(e);
        }
        // Többi csak ha a játékos látja
        else if (gameState.player != null && hasLineOfSight(e, gameState.player)) {
            drawEntity(e);
        } else if (gameState.player != null && gameState.inDebugMode) {
            drawEntity(e)
        }
    }
}

// ============ UI & SYSTEM ============

function updateInfoPanel() {
    if (gameState.player != null) {
        getById("pPos").textContent = `Position: (${gameState.player.pos_row}x${gameState.player.pos_col})`
        getById("pHp").textContent = `Health: ${gameState.player.health}`
        getById("pGold").textContent = `Gold: ${gameState.player.gold}`
        getById("pInventory").textContent = `Inventory: ${gameState.player.inventory.join(", ")}`
    }
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

function drawInfoScreen() {
    let swScaled = width * 0.6;
    let shScaled = height * 0.15;
    let cx = (width - swScaled) / 2;
    let cy = height - shScaled - 40; // Lent-középen

    drawRect(cx, cy, swScaled, shScaled, "#1a1a4d");
    drawFrame(cx, cy, swScaled, shScaled, 10, "cyan", 3);
    drawText(gameState.infoMessage, cx + swScaled / 2, cy + shScaled / 2 + 5, "16px", "white");
}

// ============ EVENT HANDLING ============
function handleCombatAction() {
    if (!gameState.inCombat || gameState.combatTurn !== "player") return;

    let damageDone = gameState.currentEnemy.takeDamage(gameState.player.atk);
    gameState.combatLog = `You hit ${gameState.currentEnemy.name} for ${damageDone} damage!`;

    gameState.combatTurn = "enemy";

    setTimeout(() => {
        if (!gameState.currentEnemy.isAlive()) {
            gameState.combatLog = `${gameState.currentEnemy.name} defeated!`;
            setTimeout(() => {
                // Töröljük az ellenséget az entityLayer-ből
                let index = entityLayer.indexOf(gameState.currentEnemy);
                if (index > -1) {
                    entityLayer.splice(index, 1);
                    console.log(`[COMBAT] Removed ${gameState.currentEnemy.name} from entityLayer`);
                }
                gameState.inCombat = false;
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

// ============ INPUT HANDLING ============

window.addEventListener("keydown", (e) => {
    if (e.repeat) return;

    // HARC ALATTI IRÃNYÃTÃS
    if (gameState.inCombat) {
        if (e.key === " ") {
            handleCombatAction();
        }
        return; // Harc kÃ¶zben nem mozgunk a pÃ¡lyÃ¡n
    }

    // FELFEDEZÃ‰S ALATTI IRÃNYÃTÃS (MozgÃ¡s)
    let direction = null;
    if (e.key === "w") direction = "up";
    if (e.key === "s") direction = "down";
    if (e.key === "a") direction = "left";
    if (e.key === "d") direction = "right";

    if (e.key === "~") gameState.inDebugMode = !gameState.inDebugMode;

    if (direction) {
        let result = gameState.player.move(direction, gameState);
        if (result.reason === "collision" && result.entity instanceof Enemy) {
            gameState.inCombat = true;
            gameState.currentEnemy = result.entity;
            gameState.combatTurn = "player";
            gameState.combatLog = `Engaged ${result.entity.name}! Press SPACE!`;
        }
    }
});


// ============ INITIALIZATION ============
window.onload = () => {
    gameState.player = new Player("green");

    // Enemies
    for (let i = 0; i < 3; i++) {
        entityLayer.push(new Enemy(`Goblin_${i + 1}`, 30, 10, 5, "red"));
    }

    // BOSS
    entityLayer.push(new Enemy("BOSS", 60, 20, 10, "purple"))

    // Items
    entityLayer.push(new Key("gold_key", "gold", 1, 14));
    entityLayer.push(new Key("silver_key", "silver", 4, 9));
    entityLayer.push(new Potion("Health Potion", 30, 6, 4));
    entityLayer.push(new Gold(50, 2, 8));

    // Structures
    entityLayer.push(new Door(5, 12, "gold_key"));
    entityLayer.push(new Door(3, 12, "silver_key"));
    entityLayer.push(new Chest(3, 6, [new Gold(100), new Potion("Health Potion", 50, -1, -1)]));

    let enemyCount = 0;
    let itemCount = 0;
    let structureCount = 0;

    for (let e of entityLayer) {
        if (e instanceof Enemy) enemyCount++;
        if (e instanceof Item) itemCount++;
        if (e instanceof Structure) structureCount++;
    }

    console.log("[Debug]: Enemy count:", enemyCount);
    console.log("[Debug]: Item count:", itemCount);
    console.log("[Debug]: Structure count:", structureCount);

    // Spawn player
    if (gameState.player) spawnPlayer(gameState.player);

    // Spawn enemies randomly
    for (let e of entityLayer) {
        if (e instanceof Enemy) spawnEntityRandom(e, gameState.player);
    }

    // ============ GAME LOOP ============
    function gameLoop() {
        clearCanvas();

        // Game Over check
        if (gameState.gameOver) {
            drawGameOverScreen();
            return;
        }

        // Victory check
        if (gameState.playerWon) {
            drawVictoryScreen();
            return;
        }

        drawMap();

        if (gameState.inDebugMode) {
            drawGrid();
        }

        drawEntityLayer(entityLayer)

        // Játékos mindig felül
        if (gameState.player) {
            drawEntity(gameState.player);
        }

        if (gameState.inCombat) {
            drawCombatScene(gameState.player, gameState.currentEnemy);
        }

        if (gameState.showInfo) {
            drawInfoScreen();
        }

        updateInfoPanel();
        requestAnimationFrame(gameLoop);
    }
    gameLoop();
}