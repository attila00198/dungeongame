# Osztályhierarchia Átstrukturálás - Változások

## Áttekintés

Az osztályhierarchia átstrukturálásra került inheritance alapú megközelítéssel:

```
GameObject (base)
├── Actor (mozog, él, harcol)
│   ├── Player
│   └── Enemy
├── Item (felvehető)
│   ├── Key
│   ├── Potion
│   └── Gold
├── Structure (statikus, blokkoló, MINDIG LÁTHATÓ)
│   └── Door
└── Chest (kincsesláda, rejtett ha nincs line of sight)
```

## Fő változtatások

### 1. **classes.js** - Új osztályok

#### GameObject (Base Class)
- Minden játékbeli objektum alaposztálya
- Tulajdonságok: `pos_row`, `pos_col`, `color`, `size`

#### Actor (GameObject leszármazott)
- Élő, harcoló entitások
- Tulajdonságok: `health`, `atk`, `def`, `flashFrames`
- Metódusok: `takeDamage()`, `isAlive()`

#### Player (Actor leszármazott)
- Tulajdonságok: `gold`, `inventory`
- Frissített `move()` metódus:
  - ✅ Door collision kezelés (nyitás kulccsal)
  - ✅ Item pickup (automatikus eltávolítás entityLayer-ből)
  - ✅ Chest interakció
  - ✅ Exit tile -> `gameState.playerWon = true`

#### Enemy (Actor leszármazott)
- Tulajdonságok: `name`

#### Item (GameObject leszármazott)
- Felvehető tárgyak alaposztálya
- Metódus: `onPickup(collector)`

#### Key (Item leszármazott)
- Kulcsok kezelése
- `onPickup()`: hozzáadja az inventory-hoz

#### Potion (Item leszármazott)
- Gyógyító itálok
- Tulajdonság: `healAmount`
- `onPickup()`: helyreállít HP-t (max 100)

#### Gold (Item leszármazott)
- Arany/pénz
- Tulajdonság: `amount`
- `onPickup()`: növeli a játékos gold-ját

#### Structure (GameObject leszármazott)
- Statikus objektumok alaposztálya

#### Door (Structure leszármazott)
- Zárható ajtók
- Tulajdonságok: `requiredKey`, `isOpen`
- Metódusok:
  - `canOpen(entity)`: ellenőrzi van-e kulcs
  - `open()`: kinyitja az ajtót, változtatja a színt

#### Chest (GameObject leszármazott)
- Kincsesládák
- Tulajdonságok: `contents`, `isOpen`
- Metódus: `open(player)`: átadja a tartalmat a játékosnak
- **FONTOS**: NEM Structure leszármazott, így line of sight-on kívül rejtve van!

### 2. **game.js** - Játéklogika frissítések

#### GameState módosítások
```javascript
let gameState = {
    player: null,
    inCombat: false,
    currentEnemy: null,
    gameOver: false,    // ✅ ÚJ
    playerWon: false    // ✅ ÚJ
}
```

#### Entity törlés (nem elrejtés!)
- **Enemy legyőzése**: `entityLayer.splice(index, 1)` - teljes törlés
- **Item felvétele**: `entityLayer.splice(index, 1)` - teljes törlés

#### Új függvények
- `drawVictoryScreen()`: Győzelmi képernyő
- `drawGameOverScreen()`: Vereség képernyő

#### GameLoop módosítások
- Game Over check az elején
- Victory check az elején
- Structure-ök mindig látszanak (ajtók, ládák)
- Többi entity csak line of sight-on belül

#### Inicializáció példák
```javascript
// Enemies
entityLayer.push(new Enemy("Goblin_1", 30, 10, 5, "red"));

// Items
entityLayer.push(new Key("gold_key", "magenta", 4, 9));
entityLayer.push(new Potion("Health Potion", 30, 6, 3));
entityLayer.push(new Gold(50, 2, 8));

// Structures
entityLayer.push(new Door(3, 6, "gold_key"));
entityLayer.push(new Chest(5, 10, [new Gold(100)]));
```

## Játékmenet változások

### Item Pickup
1. Játékos rálép az itemre
2. `Item.onPickup(player)` meghívódik
3. Item eltávolításra kerül az `entityLayer`-ből
4. Console log a felvételről

### Door Mechanics
1. Játékos megpróbál rálépni
2. Ellenőrzi van-e kulcs (`canOpen()`)
3. Ha igen: `open()` meghívódik, átjárható lesz
4. Ha nem: blokkol, mozgás sikertelen

### Chest Opening
1. Játékos rálép a ládára
2. `Chest.open(player)` meghívódik
3. Tartalom átkerül a játékoshoz
4. Láda színe változik
5. Játékos nem lép át rajta (blokkol)

### Victory & Game Over
- **Victory**: EXIT tile-ra lépéskor `gameState.playerWon = true`
- **Game Over**: HP <= 0 esetén `gameState.gameOver = true`
- Mindkét esetben megáll a játék, képernyő jelenik meg

## Debug információk

Console-ban látható:
- `[PICKUP]`: Item felvétel
- `[DOOR]`: Ajtó nyitás
- `[CHEST]`: Láda nyitás
- `[COMBAT]`: Enemy törlés harc után
- `[Debug]`: Entity számok spawn előtt

## Következő lépések (opcionális továbbfejlesztések)

- [ ] Restart gomb a Game Over/Victory képernyőn
- [ ] Több pálya (level system)
- [ ] Fegyver item (ATK növelés)
- [ ] Páncél item (DEF növelés)
- [ ] Enemy AI (mozgás, patrol)
- [ ] Hang effektek
- [ ] Sprite-ok a színes négyzetek helyett