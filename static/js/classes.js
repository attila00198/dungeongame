// ============ BASE CLASS ============
class GameObject {
    constructor(row, col, color, size) {
        this.pos_row = row;
        this.pos_col = col;
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
        this.flashFrames = 30;
        return actualDamage;
    }

    isAlive() {
        return this.health > 0;
    }
}

class Player extends Actor {
    constructor(color) {
        super(-1, -1, color, 40, 100, 20, 5);
        this.gold = 0;
        this.inventory = [];
    }

    move(direction, gameState) {
        let newRow = this.pos_row;
        let newCol = this.pos_col;

        // Számold ki az új pozíciót
        switch (direction) {
            case "up": newRow--; break;
            case "down": newRow++; break;
            case "left": newCol--; break;
            case "right": newCol++; break;
            default:
                console.error("[ERROR]: Unknown direction.");
                return { moved: false, reason: "invalid_direction" };
        }

        // 1. TILE VALIDÁLÁS (fal, bounds)
        if (!isValidPos(newRow, newCol)) {
            return { moved: false, reason: "blocked_tile" };
        }

        // 2. ENTITY COLLISION
        let collision = getEntityAt(newRow, newCol, entityLayer);

        if (collision) {
            // Enemy collision -> harc
            if (collision instanceof Enemy) {
                return { moved: false, reason: "collision", entity: collision };
            }

            // Door collision -> nyitás vagy blokkolás
            if (collision instanceof Door) {
                if (collision.canOpen(this)) {
                    collision.open();
                    // Folytatja a mozgást
                } else {
                    return { moved: false, reason: "locked_door", entity: collision };
                }
            }

            // Item collision -> felvétel
            if (collision instanceof Item) {
                collision.onPickup(this);
                // Töröld az entityLayer-ből
                let index = entityLayer.indexOf(collision);
                if (index > -1) {
                    entityLayer.splice(index, 1);
                    console.log(`[PICKUP] Removed ${collision.name} from entityLayer`);
                }
            }

            // Chest collision
            if (collision instanceof Chest) {
                collision.open(this);
                return { moved: false, reason: "chest" };
            }

            // Structure collision (egyéb blokkoló)
            if (collision instanceof Structure && !(collision instanceof Door)) {
                return { moved: false, reason: "blocked_structure", entity: collision };
            }
        }

        // 3. Minden OK, mozoghat
        this.pos_row = newRow;
        this.pos_col = newCol;

        // 4. Exit check
        let tileIndex = getTileTypeAt(gameState.player.pos_row, gameState.player.pos_col);
        const TILE_NAME = Object.fromEntries(
            Object.entries(TILE_TYPE).map(([k, v]) => [v, k])
        );
        if (TILE_NAME[tileIndex] === "EXIT") {
            gameState.playerWon = true;
        }

        return { moved: true };
    }

    openInventory() {
        console.log(this.inventory);
    }
}

class Enemy extends Actor {
    constructor(name, health, atk, def, color) {
        super(-1, -1, color, 40, health, atk, def);
        this.name = name;
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
    constructor(name, color, row, col) {
        super(name, row, col, color, 20);
    }

    onPickup(player) {
        player.inventory.push(this.name);
        console.log(`[PICKUP] ${player.constructor.name} collected ${this.name}`);
    }
}

class Potion extends Item {
    constructor(name, healAmount, row, col) {
        super(name, row, col, "red", 20);
        this.healAmount = healAmount;
    }

    onPickup(player) {
        if (player.health === 100) return
        let oldHealth = player.health;
        player.health = Math.min(player.health + this.healAmount, 100);
        let actualHeal = player.health - oldHealth;
        console.log(`[PICKUP] Healed ${actualHeal} HP`);
    }
}

class Gold extends Item {
    constructor(amount, row, col) {
        super(`${amount} gold`, row, col, "gold", 15);
        this.amount = amount;
    }

    onPickup(player) {
        player.gold += this.amount;
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
    constructor(row, col, requiredKey, color = "brown") {
        super(row, col, color, 40);
        this.requiredKey = requiredKey;
        this.isOpen = false;
    }

    canOpen(entity) {
        if (this.isOpen) return true;
        return entity.inventory && entity.inventory.includes(this.requiredKey);
    }

    open() {
        this.isOpen = true;
        this.color = "#333333"; // Darker when open
        console.log(`[DOOR] Opened with ${this.requiredKey}`);
    }
}

class Chest extends GameObject {
    constructor(row, col, contents = []) {
        super(row, col, "orange", 35);
        this.contents = contents;
        this.isOpen = false;
    }

    open(player) {
        if (this.isOpen) {
            console.log("[CHEST] Already opened");
            return;
        }
        this.isOpen = true;
        this.color = "#664400";

        for (let item of this.contents) {
            if (item instanceof Gold) {
                player.gold += item.amount;
                console.log(`[CHEST] Found ${item.amount} gold`);
            } else if (item instanceof Key) {
                player.inventory.push(item.name);
                console.log(`[CHEST] Found ${item.name}`);
            }
        }
        console.log(`[CHEST] Opened!`);
    }
}