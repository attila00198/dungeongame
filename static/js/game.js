// ==================================================
//  Constants
// ==================================================
const TILE_SIZE = 32;
const SCALE = 1;

const GRID_WIDTH = 48;
const GRID_HEIGHT = 27;

const TILE_T = {
    EMPTY: { id: 0, color: "#060606", sprite: "static/assets/textures/dirt.png", isWalkable: false, hasEffect: false },
    FLOOR: { id: 1, color: "#4e170d", sprite: "static/assets/textures/floor.png", isWalkable: true, hasEffect: false },
    WALL: { id: 2, color: "#101010", sprite: "static/assets/textures/wall.png", isWalkable: false, hasEffect: false },
    WATER: { id: 3, color: "#1a3a6a", sprite: "static/assets/textures/water.png", isWalkable: true, hasEffect: true },
    FIRE: { id: 4, color: "#ff6600", sprite: "static/assets/textures/lava.png", isWalkable: true, hasEffect: true },
    START: { id: 5, color: "#8a7200", sprite: "", isWalkable: true, hasEffect: false },
    EXIT: { id: 6, color: "#006a6a", sprite: "", isWalkable: true, hasEffect: false },
};

const TILE_BY_ID = Object.fromEntries(
    Object.values(TILE_T).map(function (t) { return [t.id, t]; })
);

Object.values(TILE_T).forEach(function (tile) {
    AssetManager.register(tile.sprite);
});

const HUD_HEIGHT = 50;
const VIEW_DISTANCE = 8;

// ==================================================
//  Global Map & Entity Data
// ==================================================
let grid = [];
let entityLayer = [];

// ==================================================
//  Transition Hooks
// ==================================================
function initTransitions() {
    gameState.onTransition("COMBAT→PLAYING", function () {
        combatData.currentEnemy = null;
        combatData.log = "";
        combatData.turn = "";
    });

    gameState.onTransition("COMBAT→GAME_OVER", function () {
        combatData.currentEnemy = null;
        combatData.log = "";
        combatData.turn = "";
    });

    gameState.onTransition("INVENTORY→PLAYING", function () {
        inventoryData.selectedIndex = 0;
    });
}

// ==================================================
//  Utility Functions
// ==================================================
function log(level, message) {
    const levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    console.log("[" + levels[level] + "]: " + message);
}

function showInfoMessage(message, duration) {
    duration = duration || 2000;
    infoData.message = message;
    if (infoData.timeout) clearTimeout(infoData.timeout);
    infoData.timeout = setTimeout(function () {
        infoData.message = "";
    }, duration);
}

function isValidPosition(row, col) {
    if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return false;
    const tile = TILE_BY_ID[grid[row][col]];
    return tile ? tile.isWalkable : false;
}

function isValidRange(entity, player) {
    var dx = entity.col - player.col;
    var dy = entity.row - player.row;
    return Math.abs(dx) + Math.abs(dy) <= VIEW_DISTANCE;
}

function hasLineOfSight(entity, player) {
    if (!isValidRange(entity, player)) return false;
    if (!player) return false;

    var x1 = player.col, y1 = player.row;
    var x2 = entity.col, y2 = entity.row;
    var dx = x2 - x1, dy = y2 - y1;
    var steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
    if (steps === 0) return true;

    for (var i = 1; i <= steps; i++) {
        var t = i / steps;
        var exactCol = x1 + dx * t;
        var exactRow = y1 + dy * t;

        var cellsToCheck = [
            { r: Math.floor(exactRow), c: Math.floor(exactCol) },
            { r: Math.ceil(exactRow), c: Math.ceil(exactCol) },
        ];

        for (var j = 0; j < cellsToCheck.length; j++) {
            var r2 = cellsToCheck[j].r;
            var c2 = cellsToCheck[j].c;
            if (r2 === y2 && c2 === x2) return true;
            if (!grid[r2] || grid[r2][c2] === undefined) continue;
            var tile = TILE_BY_ID[grid[r2][c2]];
            if (tile === TILE_T.WALL) return false;
            var blocker = getEntityAt(r2, c2, entityLayer);
            if (blocker instanceof Door && !blocker.isOpen) return false;
        }
    }

    return true;
}

function getEntityAt(row, col, entityList) {
    return entityList.find(function (e) { return e.row === row && e.col === col; }) || null;
}

function getTileTypeAt(row, col) {
    return grid[row][col];
}

function bfsNextStep(fromRow, fromCol, toRow, toCol) {
    if (fromRow === toRow && fromCol === toCol) return null;

    var queue = [{ row: fromRow, col: fromCol, path: [] }];
    var visited = new Set();
    visited.add(fromRow + "," + fromCol);

    var dirs = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
    ];

    while (queue.length > 0) {
        var current = queue.shift();
        var row = current.row;
        var col = current.col;
        var path = current.path;

        for (var i = 0; i < dirs.length; i++) {
            var nr = row + dirs[i].dr;
            var nc = col + dirs[i].dc;
            var key = nr + "," + nc;

            if (visited.has(key)) continue;
            visited.add(key);

            if (nr === toRow && nc === toCol) {
                var fullPath = path.concat([{ row: nr, col: nc }]);
                return fullPath[0];
            }

            if (!grid[nr]) continue;
            var tile = TILE_BY_ID[grid[nr][nc]];
            if (!tile || !tile.isWalkable) continue;

            var occupant = getEntityAt(nr, nc, entityLayer);
            if (occupant instanceof Door && !occupant.isOpen) continue;

            queue.push({ row: nr, col: nc, path: path.concat([{ row: nr, col: nc }]) });
        }
    }

    return null;
}

// ==================================================
//  Movement
// ==================================================
function move(entity, direction, state) {
    var newRow = entity.row;
    var newCol = entity.col;

    switch (direction) {
        case "up": newRow--; break;
        case "down": newRow++; break;
        case "left": newCol--; break;
        case "right": newCol++; break;
        default:
            return { moved: false, reason: "invalid_direction" };
    }

    if (!isValidPosition(newRow, newCol)) {
        return { moved: false, reason: "blocked_tile" };
    }

    var target = getEntityAt(newRow, newCol, entityLayer);
    if (target) {
        var allowMove = handleCollision(entity, target, state);
        if (!allowMove) return { moved: false, reason: "collision", entity: target };
    }

    entity.row = newRow;
    entity.col = newCol;

    var tile = TILE_BY_ID[getTileTypeAt(newRow, newCol)];
    if (tile === TILE_T.EXIT) gameState.transition(GAME_STATE.VICTORY);

    return { moved: true };
}

// ==================================================
//  Collision
// ==================================================
function startCombat(enemy) {
    if (!gameState.transition(GAME_STATE.COMBAT)) return;
    combatData.currentEnemy = enemy;
    combatData.turn = "player";
    combatData.log = "Engaged " + enemy.name + "! Press SPACE!";
    log(1, "[COMBAT] Started with " + enemy.name);
}

function handlePlayerCollision(player, target) {
    if (target instanceof Enemy) {
        startCombat(target);
        return false;
    }
    if (target instanceof Door) {
        if (target.canOpen(player)) {
            target.open();
            showInfoMessage(target.requiredKey
                ? "Door opened with " + target.requiredKey
                : "Door opened"
            );
            return true;
        } else {
            showInfoMessage("Locked! Need: " + target.requiredKey);
            return false;
        }
    }
    if (target instanceof Item) {
        target.onPickup(player);
        var index = entityLayer.indexOf(target);
        if (index > -1) entityLayer.splice(index, 1);
        return true;
    }
    if (target instanceof Chest) {
        target.open(player);
        return false;
    }
    return false;
}

function handleEnemyCollision(enemy, target) {
    if (target instanceof Player) {
        startCombat(enemy);
        return false;
    }
    if (target instanceof Door) {
        return target.isOpen;
    }
    return false;
}

function handleCollision(entity, target, state) {
    if (entity instanceof Player) {
        return handlePlayerCollision(entity, target);
    } else if (entity instanceof Enemy) {
        return handleEnemyCollision(entity, target);
    }
    return false;
}

// ==================================================
//  Rendering
// ==================================================
function drawEntityLayer(entityList) {
    var i, e;
    for (i = 0; i < entityList.length; i++) {
        e = entityList[i];
        if (e instanceof Player) continue;
        if (e instanceof Structure) drawEntity(e);
    }
    for (i = 0; i < entityList.length; i++) {
        e = entityList[i];
        if (e instanceof Player) continue;
        if (e instanceof Structure) continue;
        if (gameState.player !== null && hasLineOfSight(e, gameState.player)) {
            drawEntity(e);
        } else if (gameState.player !== null && gameState.inDebugMode) {
            drawEntity(e);
        }
    }
}

function drawEntity(entity) {
    if (!entity) return;
    if (entity.row < 0) return;

    var cx = entity.col * TILE_SIZE + (TILE_SIZE - entity.size) / 2;
    var cy = entity.row * TILE_SIZE + (TILE_SIZE - entity.size) / 2;

    if (entity.sprite) {
        var img = AssetManager.get(entity.sprite);
        if (img) {
            r.drawImage(img, Math.floor(cx), Math.floor(cy), entity.size, entity.size);
        } else {
            r.drawRect(Math.floor(cx), Math.floor(cy), entity.size, entity.size, entity.color);
        }
    } else {
        r.drawRect(Math.floor(cx), Math.floor(cy), entity.size, entity.size, entity.color);
    }

    if (gameState.inDebugMode) {
        r.drawText(entity.row + ":" + entity.col, cx + entity.size / 2, cy + entity.size / 2, "16px", "white", "center");
    }
}

function renderHUD() {
    var hud = getById("hud");
    if (!hud || !gameState.player) return;

    var enemiesLeft = entityLayer.filter(function (e) {
        return e instanceof Enemy;
    }).length;

    var keyCount = gameState.player.inventory.filter(function (item) {
        return item.name && item.name.toLowerCase().indexOf("key") !== -1;
    }).length;

    hud.innerHTML =
        "<span>❤ " + gameState.player.health + "/100</span>" +
        "<span>⚔ " + gameState.player.atk + "</span>" +
        "<span>🛡 " + gameState.player.def + "</span>" +
        "<span>👾 Enemies: " + enemiesLeft + "</span>" +
        "<span>🗝 Keys: " + keyCount + "</span>" +
        "<span>💰 " + gameState.player.gold + " gold</span>";
}

function drawCombatScreen(player, enemy) {
    var swScaled = canvasWidth * 0.7;
    var shScaled = canvasHeight * 0.7;
    var cx = (canvasWidth - swScaled) / 2;
    var cy = (canvasHeight - shScaled) / 2;

    r.drawRect(cx, cy, swScaled, shScaled, "#1a1a1a");
    r.drawFrame(cx, cy, swScaled, shScaled, 20, "orange", 3);
    r.drawText("COMBAT", cx + swScaled / 2, cy + 50, "bold 24px");

    var entitySize = 100;
    var pX = cx + 100;
    var pY = cy + shScaled / 2;

    var pColor = player.flashFrames > 0 ? "white" : player.color;
    if (player.flashFrames > 0) player.flashFrames--;
    r.drawRect(pX, pY, entitySize, entitySize, pColor);

    if (combatData.turn === "player") r.drawText("▼", pX + entitySize / 2, pY - 75, "20px", "gold");
    r.drawText("HP: " + player.health, pX, pY - 45, "14px", "white", "left", "Consolas");
    r.drawText("ATK: " + player.atk, pX, pY - 30, "14px", "white", "left", "Consolas");
    r.drawText("DEF: " + player.def, pX, pY - 15, "14px", "white", "left", "Consolas");
    r.drawText("Player", pX + entitySize / 2, pY - 60, "16px", "green", "center");

    var eX = cx + swScaled - 100 - entitySize;
    var eY = cy + shScaled / 2;

    var eColor = enemy.flashFrames > 0 ? "white" : enemy.color;
    if (enemy.flashFrames > 0) enemy.flashFrames--;
    r.drawRect(eX, eY, entitySize, entitySize, eColor);

    if (combatData.turn === "enemy") r.drawText("▼", eX + entitySize / 2, eY - 75, "20px", "gold");
    r.drawText("HP: " + enemy.health, eX + entitySize, eY - 45, "14px", "white", "right", "Consolas");
    r.drawText("ATK: " + enemy.atk, eX + entitySize, eY - 30, "14px", "white", "right", "Consolas");
    r.drawText("DEF: " + enemy.def, eX + entitySize, eY - 15, "14px", "white", "right", "Consolas");
    r.drawText(enemy.name, eX + entitySize / 2, eY - 60, "16px", "red", "center");
    r.drawText(combatData.log, cx + swScaled / 2, cy + shScaled - 40, "italic 16px", "gold");
}

function drawInventory() {
    var cw = r.canvas.width;
    var ch = r.canvas.height;
    var w = cw * 0.4;
    var h = ch * 0.6;
    var cx = (cw - w) / 2;
    var cy = (ch - h) / 2;
    var pad = 30;
    var inv = gameState.player.inventory;
    var sel = inventoryData.selectedIndex;

    r.drawRect(cx, cy, w, h, "#1a1a1a");
    r.drawFrame(cx, cy, w, h, 15, "gold", 3);
    r.drawText("INVENTORY", cx + w / 2, cy + 42, "bold 22px", "gold", "center", "Courier New");
    r.drawLine(cx + pad, cy + 55, cx + w - pad, cy + 55, "#444", 2);

    r.drawCircle(cx + pad + 8, cy + 82, 8, "gold");
    r.drawText(gameState.player.gold + " gold", cx + pad + 24, cy + 87, "15px", "#ffd700", "left", "Courier New");
    r.drawLine(cx + pad, cy + 100, cx + w - pad, cy + 100, "#333", 1);

    if (inv.length === 0) {
        r.drawText("(empty)", cx + w / 2, cy + 140, "13px", "#555", "center", "Courier New");
    } else {
        var itemStartY = cy + 118;
        var rowH = 34;

        inv.forEach(function (item, i) {
            var rowY = itemStartY + i * rowH;
            var isSelected = i === sel;

            if (isSelected) {
                r.drawRect(cx + pad - 6, rowY - 2, w - pad * 2 + 12, rowH - 4, "rgba(255,200,50,0.1)");
                r.drawFrame(cx + pad - 6, rowY - 2, w - pad * 2 + 12, rowH - 4, 0, "rgba(255,200,50,0.5)", 1);
            }

            var iconX = cx + pad + 8;
            var iconY = rowY + rowH / 2 - 6;
            if (item instanceof Potion) {
                r.drawCircle(iconX, iconY + 6, 7, isSelected ? "#cc66ff" : "#7a3a99");
            } else if (item instanceof Key) {
                r.drawRect(iconX - 6, iconY, 12, 12, item.color || "gold");
            } else {
                r.drawRect(iconX - 6, iconY, 12, 12, "#888");
            }

            var labelX = cx + pad + 22;
            var labelY = rowY + rowH / 2 + 2;
            var itemLabel = item instanceof Potion
                ? item.name + "  (+" + item.healAmount + " HP)"
                : (item.name || String(item));

            r.drawText(itemLabel, labelX, labelY, "13px",
                isSelected ? "gold" : "#ccc", "left", "Courier New");

            if (isSelected) {
                r.drawText("[E]", cx + w - pad, labelY, "11px", "#888", "right", "Courier New");
            }
        });
    }

    r.drawLine(cx + pad, cy + h - 40, cx + w - pad, cy + h - 40, "#333", 1);
    r.drawText("W/S  Navigate     E  Use     I  Close",
        cx + w / 2, cy + h - 18, "11px", "#555", "center", "Courier New");
}

function drawPauseScreen() {
    var w = 400, h = 200;
    var cx = canvasWidth / 2 - w / 2;
    var cy = canvasHeight / 2 - h / 2;
    r.drawRect(cx, cy, w, h, "#101010");
    r.drawFrame(cx, cy, w, h, 10, "yellow", 2);
    r.drawText("PAUSED", canvasWidth / 2, canvasHeight / 2, "bold 32px", "yellow");
}

function drawVictoryScreen() {
    var w = canvasWidth * 0.6, h = canvasHeight * 0.4;
    var cx = (canvasWidth - w) / 2;
    var cy = (canvasHeight - h) / 2;
    r.drawRect(cx, cy, w, h, "#1a4d1a");
    r.drawFrame(cx, cy, w, h, 20, "gold", 4);
    r.drawText("VICTORY!", cx + w / 2, cy + h / 2 - 20, "bold 32px", "gold");
    r.drawText("You escaped the dungeon!", cx + w / 2, cy + h / 2 + 20, "18px", "white");
}

function drawGameOverScreen() {
    var w = canvasWidth * 0.6, h = canvasHeight * 0.4;
    var cx = (canvasWidth - w) / 2;
    var cy = (canvasHeight - h) / 2;
    r.drawRect(cx, cy, w, h, "#4d1a1a");
    r.drawFrame(cx, cy, w, h, 20, "darkred", 4);
    r.drawText("GAME OVER", cx + w / 2, cy + h / 2 - 20, "bold 32px", "red");
    r.drawText("You have been defeated...", cx + w / 2, cy + h / 2 + 20, "18px", "white");
}

function drawInfoScreen() {
    var w = canvasWidth * 0.6, h = canvasHeight * 0.15;
    var cx = (canvasWidth - w) / 2;
    var cy = canvasHeight - h - 40;
    r.drawRect(cx, cy, w, h, "#1a1a4d");
    r.drawFrame(cx, cy, w, h, 10, "cyan", 3);
    r.drawText(infoData.message, cx + w / 2, cy + h / 2 + 5, "16px", "white");
}

function drawErrorScreen(message) {
    r.drawRect(0, 0, canvasWidth, canvasHeight, "#0d0d0f");
    r.drawFrame(canvasWidth / 2 - 300, canvasHeight / 2 - 80, 600, 160, 15, "#e05252", 2);
    r.drawText("FAILED TO LOAD MAP", canvasWidth / 2, canvasHeight / 2 - 20, "bold 22px", "#e05252");
    r.drawText(message, canvasWidth / 2, canvasHeight / 2 + 20, "14px", "#888888");
}

function drawMap() {
    for (var row = 0; row < grid.length; row++) {
        for (var col = 0; col < grid[row].length; col++) {
            var tile = TILE_BY_ID[grid[row][col]];
            var x = Math.floor(col * TILE_SIZE);
            var y = Math.floor(row * TILE_SIZE);
            var img = AssetManager.get(tile.sprite);
            if (img) {
                r.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
            } else {
                r.drawRect(x, y, TILE_SIZE, TILE_SIZE, tile.color);
            }
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
    if (!gameState.is(GAME_STATE.COMBAT) || combatData.turn !== "player") return;

    var damageDone = combatData.currentEnemy.takeDamage(gameState.player.atk);
    combatData.log = "You hit " + combatData.currentEnemy.name + " for " + damageDone + " damage!";
    combatData.turn = "enemy";

    setTimeout(function () {
        if (!combatData.currentEnemy.isAlive()) {
            combatData.log = combatData.currentEnemy.name + " defeated!";
            setTimeout(function () {
                var index = entityLayer.indexOf(combatData.currentEnemy);
                if (index > -1) {
                    entityLayer.splice(index, 1);
                    log(1, "[COMBAT] Removed " + combatData.currentEnemy.name);
                }
                gameState.transition(GAME_STATE.PLAYING);
            }, 1500);
            return;
        }

        var enemyDamage = gameState.player.takeDamage(combatData.currentEnemy.atk);
        combatData.log = combatData.currentEnemy.name + " hits you for " + enemyDamage + " damage!";

        setTimeout(function () {
            if (gameState.player.isAlive()) {
                combatData.turn = "player";
                combatData.log = "Your turn! Press SPACE!";
            } else {
                combatData.log = "You have been defeated...";
                gameState.transition(GAME_STATE.GAME_OVER);
            }
        }, 1500);
    }, 1500);
}

function toggleInventory() {
    if (gameState.is(GAME_STATE.PLAYING)) {
        gameState.transition(GAME_STATE.INVENTORY);
    } else if (gameState.is(GAME_STATE.INVENTORY)) {
        gameState.transition(GAME_STATE.PLAYING);
    }
}

function togglePause() {
    if (gameState.is(GAME_STATE.PLAYING)) {
        gameState.transition(GAME_STATE.PAUSED);
    } else if (gameState.is(GAME_STATE.PAUSED)) {
        gameState.transition(GAME_STATE.PLAYING);
    }
}

// ==================================================
//  Game Logic
// ==================================================
function spawnPlayer(player) {
    for (var row = 0; row < grid.length; row++) {
        for (var col = 0; col < grid[row].length; col++) {
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

function instantiateEntity(data) {
    switch (data.type) {
        case "Enemy":
            return new Enemy(data.row, data.col, data.name, data.health, data.atk, data.def, "red");
        case "Key":
            return new Key(data.row, data.col, data.name, data.color || "gold");
        case "Potion":
            return new Potion(data.row, data.col, data.name, data.healAmount);
        case "Gold":
            return new Gold(data.row, data.col, data.amount);
        case "Door":
            return new Door(data.row, data.col, data.requiredKey || null);
        case "Chest": {
            var contents = (data.contents || []).map(instantiateEntity);
            return new Chest(data.row, data.col, contents);
        }
        default:
            console.warn("[LOAD] Unknown entity type: " + data.type);
            return null;
    }
}

// ==================================================
//  Game Loop
// ==================================================
async function loadMap(filename) {
    try {
        var res = await fetch(filename);
        if (!res.ok) throw new Error("HTTP " + res.status);

        var data = await res.json();
        if (!data.grid || !data.entities)
            throw new Error("Invalid map format");

        grid = data.grid;
        entityLayer = [];

        for (var i = 0; i < data.entities.length; i++) {
            var entity = instantiateEntity(data.entities[i]);
            if (entity) entityLayer.push(entity);
        }

        log(1, "Map loaded: " + filename);
        log(1, "Grid: " + grid[0].length + "x" + grid.length + ", Entities: " + entityLayer.length);
    } catch (err) {
        log(3, "Failed to load map: " + err.message);
        drawErrorScreen("Could not load map.json\n" + err.message);
        throw err;
    }
}

async function startGame() {
    gameState.player = new Player("green");
    initTransitions();
    await AssetManager.preload();
    await loadMap("/maps/map.json");
    if (!spawnPlayer(gameState.player)) {
        log(3, "No spawn point found in map!");
        drawErrorScreen("No START tile found in map.");
        return;
    }
    entityLayer.push(gameState.player);
    log(1, "Player spawned at (" + gameState.player.row + ", " + gameState.player.col + ")");
    gameState.transition(GAME_STATE.PLAYING);
    requestAnimationFrame(gameLoop);
}

function gameLoop(now) {
    r.clear();
    drawMap();
    if (gameState.inDebugMode) r.drawGrid("#404040");
    drawEntityLayer(entityLayer);
    if (gameState.player) drawEntity(gameState.player);
    renderHUD();

    if (gameState.is(GAME_STATE.GAME_OVER)) {
        drawGameOverScreen();
        return;
    }

    if (gameState.is(GAME_STATE.VICTORY)) {
        drawVictoryScreen();
        return;
    }

    if (gameState.is(GAME_STATE.INVENTORY)) {
        drawInventory();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameState.is(GAME_STATE.PAUSED)) {
        drawPauseScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameState.is(GAME_STATE.COMBAT) && combatData.currentEnemy) {
        drawCombatScreen(gameState.player, combatData.currentEnemy);
    }

    if (gameState.is(GAME_STATE.PLAYING)) {
        Enemy.tick(now, gameState.player);
        if (infoData.message) drawInfoScreen();
    }

    requestAnimationFrame(gameLoop);
}

// ==================================================
//  Event Handlers
// ==================================================
window.addEventListener("keydown", function (event) {
    if (event.repeat) return;

    if (event.key === "i" || event.key === "I") {
        if (gameState.is(GAME_STATE.COMBAT)) return;
        toggleInventory();
        return;
    }

    if (gameState.is(GAME_STATE.INVENTORY)) {
        var inv = gameState.player.inventory;
        if (event.key === "w" || event.key === "ArrowUp") {
            inventoryData.selectedIndex = (inventoryData.selectedIndex - 1 + inv.length) % inv.length;
        }
        if (event.key === "s" || event.key === "ArrowDown") {
            inventoryData.selectedIndex = (inventoryData.selectedIndex + 1) % inv.length;
        }
        if (event.key === "Enter" || event.key === "e") {
            var selected = inv[inventoryData.selectedIndex];
            if (selected && typeof selected.onUse === "function") {
                var used = selected.onUse(gameState.player);
                if (used) {
                    inv.splice(inventoryData.selectedIndex, 1);
                    inventoryData.selectedIndex = Math.min(inventoryData.selectedIndex, inv.length - 1);
                }
            }
        }
        return;
    }

    if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        togglePause();
        return;
    }

    if (gameState.is(GAME_STATE.PAUSED)) return;

    if (event.key === "~") {
        gameState.inDebugMode = !gameState.inDebugMode;
        return;
    }

    if (gameState.is(GAME_STATE.COMBAT)) {
        if (event.key === " ") handleCombatAction();
        return;
    }

    if (gameState.is(GAME_STATE.GAME_OVER) || gameState.is(GAME_STATE.VICTORY)) return;

    var direction = null;
    if (event.key === "w") direction = "up";
    if (event.key === "s") direction = "down";
    if (event.key === "a") direction = "left";
    if (event.key === "d") direction = "right";

    if (direction) {
        move(gameState.player, direction, gameState);
    }
});

// ==================================================
//  Initialization
// ==================================================
var appContainer = getById("root");
appContainer.appendChild(app());

const canvasWidth = GRID_WIDTH * TILE_SIZE * SCALE;
const canvasHeight = GRID_HEIGHT * TILE_SIZE * SCALE;

var gameCanvas = getById("game");
var r = new Renderer(gameCanvas, canvasWidth, canvasHeight);

window.onload = function () {
    startGame();
};