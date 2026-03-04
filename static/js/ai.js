const ENEMY_MOVE_INTERVAL = 400;
let lastEnemyMoveTime = 0;

function tickEnemyAI(now) {
    if (!gameState.player) return;
    if (now - lastEnemyMoveTime < ENEMY_MOVE_INTERVAL) return;
    lastEnemyMoveTime = now;

    for (const entity of entityLayer) {
        if (!(entity instanceof Enemy)) continue;
        if (!entity.isAlive()) continue;
        entity.update(gameState.player);
    }
}