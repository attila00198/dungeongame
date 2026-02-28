// ==================================================
//  Enemy AI — Chase Behavior
//  Függ: game.js (grid, entityLayer, gameState, TILE_TYPE, WALKABLE_TILES)
//        classes.js (Enemy, Player)
// ==================================================

// --------------------------------------------------
//  BFS útvonalkeresés
//  Visszaadja a következő lépés {row, col}-ját,
//  vagy null-t ha nincs út / már ott van.
// --------------------------------------------------
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

// --------------------------------------------------
//  AI állapotok
// --------------------------------------------------
const AI_STATE = {
    IDLE: "idle",    // Áll, vár
    CHASE: "chase",   // Üldözi a játékost
};

// --------------------------------------------------
//  Enemy AI tick — ezt hívjuk a game loop-ban
//  Minden enemy-re meghívódik, aki nem harcban van.
// --------------------------------------------------
const ENEMY_MOVE_INTERVAL = 400; // ms — ennyit vár két lépés között
let lastEnemyMoveTime = 0;

function tickEnemyAI(now) {
    if (!gameState.player || gameState.isInCombat || gameState.isPaused ||
        gameState.gameOver || gameState.playerWon) return;

    if (now - lastEnemyMoveTime < ENEMY_MOVE_INTERVAL) return;
    lastEnemyMoveTime = now;

    const player = gameState.player;

    for (const entity of entityLayer) {
        if (!(entity instanceof Enemy)) continue;
        if (!entity.isAlive()) continue;

        // Állapot frissítés
        const canSee = hasLineOfSight(entity, player);

        if (canSee) {
            entity.aiState = AI_STATE.CHASE;
            entity.lastKnownPlayerRow = player.row;
            entity.lastKnownPlayerCol = player.col;
        } else if (entity.aiState === AI_STATE.CHASE) {
            // Elvesztette a játékost — megy az utolsó ismert pozícióra
            const atLastKnown =
                entity.row === entity.lastKnownPlayerRow &&
                entity.col === entity.lastKnownPlayerCol;

            if (atLastKnown) {
                entity.aiState = AI_STATE.IDLE;
            }
            // egyébként folytatja az üldözést az utolsó ismert pozíció felé
        } else {
            entity.aiState = AI_STATE.IDLE;
        }

        // Mozgás
        if (entity.aiState === AI_STATE.CHASE) {
            const targetRow = entity.lastKnownPlayerRow ?? player.row;
            const targetCol = entity.lastKnownPlayerCol ?? player.col;

            // Szomszédos? -> harc
            const dr = Math.abs(entity.row - player.row);
            const dc = Math.abs(entity.col - player.col);
            if (dr + dc === 1) {
                // Harcot kezdeményez
                if (!gameState.isInCombat) {
                    gameState.isInCombat = true;
                    gameState.currentEnemy = entity;
                    gameState.combatTurn = "player";
                    gameState.combatLog = `${entity.name} támad! Nyomj SPACE-t!`;
                }
                continue;
            }

            // BFS lépés
            const next = bfsNextStep(entity.row, entity.col, targetRow, targetCol);
            if (next) {
                const blocker = getEntityAt(next.row, next.col, entityLayer);
                const canStep = !blocker
                    || blocker instanceof Player
                    || (blocker instanceof Door && blocker.isOpen);
                if (canStep) {
                    entity.row = next.row;
                    entity.col = next.col;
                }
            }
        }
        // IDLE: nem mozog
    }
}