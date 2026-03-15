// ==================================================
//  Classes
//=================================================
// ============ BASE CLASS ============
class GameObject {
    constructor(row, col, color, size) {
        this.row = row;
        this.col = col;
        this.color = color;
        this.size = size;
    }
}
// ============ ACTOR (mozog, él, harcol) ============
class Actor extends GameObject {
    constructor(row, col, color, size, health, atk, def) {
        super(row, col, color, size);
        this.health = health;
        this.atk = atk;
        this.def = def;
        this.flashFrames = 0;
    }
    takeDamage(rawDamage) {
        let actualDamage = Math.max(1, rawDamage - this.def);
        this.health -= actualDamage;
        if (this.health < 0) this.health = 0;
        this.flashFrames = 30;
        return actualDamage;
    }
    isAlive() {
        return this.health > 0;
    }
}
class Player extends Actor {
    constructor(color) {
        super(-1, -1, color, 20, 100, 20, 5);
        this.gold = 0;
        this.inventory = [];
    }
}
class Enemy extends Actor {
    static MOVE_INTERVAL = 400;
    static lastMoveTime = 0;

    static tick(now, player) {
        if (!player) return;
        if (now - Enemy.lastMoveTime < Enemy.MOVE_INTERVAL) return;
        Enemy.lastMoveTime = now;

        for (const entity of entityLayer) {
            if (!(entity instanceof Enemy)) continue;
            if (!entity.isAlive()) continue;
            entity.update(player);
        }
    }

    constructor(row, col, name, health, atk, def, color, state = "doIdle") {
        super(row, col, color, 20, health, atk, def);
        this.name = name;
        this.state = state;
        this.lastKnownPlayerRow = null;
        this.lastKnownPlayerCol = null;
        this.transitions = {
            doIdle: { seesPlayer: "doChase" },
            doChase: { losesPlayer: "doIdle", reachesLastKnown: "doIdle" },
            doSearchLastKnown: { seesPlayer: "doChase", reachesLastKnown: "doIdle" },
        };
    }

    doIdle() { }

    doChase(player) {
        const targetRow = this.lastKnownPlayerRow ?? player.row;
        const targetCol = this.lastKnownPlayerCol ?? player.col;
        const next = bfsNextStep(this.row, this.col, targetRow, targetCol);

        if (next) {
            const dr = next.row > this.row ? "down" : next.row < this.row ? "up" : null;
            const dc = next.col > this.col ? "right" : next.col < this.col ? "left" : null;
            move(this, dr ?? dc, gameState);
        }

        const atLastKnown =
            this.row === this.lastKnownPlayerRow &&
            this.col === this.lastKnownPlayerCol;
        if (atLastKnown) this.trigger("reachesLastKnown");
    }

    doSearchLastKnown(player) {
        if (this.lastKnownPlayerRow === null) {
            this.trigger("reachesLastKnown");
            return;
        }

        const next = bfsNextStep(
            this.row, this.col,
            this.lastKnownPlayerRow,
            this.lastKnownPlayerCol
        );

        if (next) {
            const dr = next.row > this.row ? "down" : next.row < this.row ? "up" : null;
            const dc = next.col > this.col ? "right" : next.col < this.col ? "left" : null;
            move(this, dr ?? dc, gameState);
        }

        const atLastKnown =
            this.row === this.lastKnownPlayerRow &&
            this.col === this.lastKnownPlayerCol;

        if (atLastKnown) {
            this.lastKnownPlayerRow = null;
            this.lastKnownPlayerCol = null;
            this.trigger("reachesLastKnown");
        }
    }

    trigger(event) {
        const current = this.transitions[this.state];
        if (current && current[event]) {
            this.state = current[event];
        }
    }

    update(player) {
        if (gameState.isInCombat || gameState.isPaused ||
            gameState.gameOver || gameState.playerWon) return;

        if (hasLineOfSight(this, player)) {
            this.lastKnownPlayerRow = player.row;
            this.lastKnownPlayerCol = player.col;
            this.trigger("seesPlayer");
        }
        this[this.state](player);
    }
}

// ============ ITEM (felvehető) ============
class Item extends GameObject {
    constructor(name, row, col, color, size = 20) {
        super(row, col, color, size);
        this.name = name;
    }
    onPickup(collector) {
        console.log(`${collector.constructor.name} picked up ${this.name}`);
    }
}
class Key extends Item {
    constructor(row, col, name, color) {
        super(name, row, col, color, 16);
    }
    onPickup(player) {
        player.inventory.push(this);
        showInfoMessage(`Picked up: ${this.name}`);
        console.log(`[PICKUP] ${player.constructor.name} collected ${this.name}`);
    }
}
class Potion extends Item {
    constructor(row, col, name, healAmount) {
        super(name, row, col, "purple", 16);
        this.healAmount = healAmount;
    }
    onPickup(player) {
        player.inventory.push(this);
        showInfoMessage(`You picked up: ${this.name}`);
        console.log(`[PICKUP] ${player.constructor.name} collected ${this.name}`);
    }

    onUse(player) {
        if (player.health >= 100) {
            showInfoMessage("You are already at max HP.", 15);
            return false;
        }
        const currentHealth = player.health;
        player.health = Math.min(player.health + this.healAmount, 100);
        showInfoMessage(`Used ${this.name}: +${player.health - currentHealth} HP`);
        return true;
    }
}
class Gold extends Item {
    constructor(row = -1, col = -1, amount) {
        super("Gold", row, col, "gold", 16);
        this.amount = amount;
    }
    onPickup(player) {
        player.gold += this.amount;
        showInfoMessage(`+${this.amount} gold`);
        console.log(`[PICKUP] +${this.amount} gold`);
    }
}
// ============ STRUCTURE (statikus, blokkoló) ============
class Structure extends GameObject {
    constructor(row, col, color, size) {
        super(row, col, color, size);
    }
}
class Door extends Structure {
    constructor(row, col, requiredKey = null, color = "brown") {
        super(row, col, color, 32);
        this.requiredKey = requiredKey;
        this.isOpen = false;
    }
    canOpen(player) {
        if (this.isOpen) return true;
        if (this.requiredKey === null) return true;
        return player.inventory.some(
            item => item instanceof Key && item.name === this.requiredKey
        );
    }
    open() {
        this.isOpen = true;
        this.color = "#333333";
        if (this.requiredKey) {
            console.log(`[DOOR] Opened with ${this.requiredKey}`);
        } else {
            console.log(`[DOOR] Opened (no key required)`);
        }
    }
}
class Chest extends GameObject {
    constructor(row, col, contents = []) {
        super(row, col, "orange", 20);
        this.contents = contents;
        this.isOpen = false;
    }
    open(player) {
        if (this.isOpen) {
            showInfoMessage("Chest already opened");
            console.log("[CHEST] Already opened");
            return;
        }
        this.isOpen = true;
        this.color = "#664400";
        let itemNames = [];
        for (let item of this.contents) {
            if (item instanceof Gold) {
                player.gold += item.amount;
                itemNames.push(`${item.amount} gold`);
                console.log(`[CHEST] Found ${item.amount} gold`);
            } else if (item instanceof Key) {
                player.inventory.push(item.name);
                itemNames.push(item.name);
                console.log(`[CHEST] Found ${item.name}`);
            } else if (item instanceof Potion) {
                item.onPickup(player);
                itemNames.push(item.name);
                console.log(`[CHEST] Found ${item.name}`);
            }
        }
        showInfoMessage(`Chest opened! Found: ${itemNames.join(", ")}`);
        console.log(`[CHEST] Opened!`);
    }
}

class Renderer {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.canvas.setSize(width, height);
        this.ctx = canvas.get2d();
        this.cellSize = 20;
    }

    clear(color = "black") {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawRect(x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    }

    drawTriangle(x1, y1, x2, y2, x3, y3, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineTo(x3, y3);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawCircle(cx, cy, radius, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawText(text, x, y, size = "16px", color = "white", align = "center", font = "Arial") {
        this.ctx.fillStyle = color;
        this.ctx.font = size + " " + font;
        this.ctx.textAlign = align;
        this.ctx.fillText(text, x, y);
    }

    drawLine(startX, startY, endX, endY, color = "white", thickness = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
    }

    drawFrame(x, y, w, h, offset, color = "orange", thickness = 2) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        let innerX = x + offset, innerY = y + offset;
        let innerW = w - offset * 2, innerH = h - offset * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(innerX, innerY);
        this.ctx.lineTo(innerX + innerW, innerY);
        this.ctx.lineTo(innerX + innerW, innerY + innerH);
        this.ctx.lineTo(innerX, innerY + innerH);
        this.ctx.closePath();
        this.ctx.stroke();
    }

    drawImage(img, x, y, w, h) {
        if (!img) return;
        this.ctx.drawImage(img, x, y, w, h);
    }

    drawGrid(color = "black", thickness = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        for (let col = 0; col <= GRID_WIDTH; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(col * TILE_SIZE, 0);
            this.ctx.lineTo(col * TILE_SIZE, canvasHeight);
            this.ctx.stroke();
        }
        for (let row = 0; row <= GRID_HEIGHT; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, row * TILE_SIZE);
            this.ctx.lineTo(canvasWidth, row * TILE_SIZE);
            this.ctx.stroke();
        }
    }
}
