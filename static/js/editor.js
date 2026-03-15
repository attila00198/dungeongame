// ============ CONSTANTS ============
const TILE_SIZE = 20;
const GRID_COLS = 48;
const GRID_ROWS = 27;
const CANVAS_W = GRID_COLS * TILE_SIZE;
const CANVAS_H = GRID_ROWS * TILE_SIZE;

const TILE_TYPE = { EMPTY: 0, FLOOR: 1, WALL: 2, WATER: 3, FIRE: 4, SPAWN: 5, EXIT: 6 };

const TILE_META = [
    { key: "EMPTY", label: "Empty", value: 0, color: "#060606" },
    { key: "FLOOR", label: "Floor", value: 1, color: "#3a1a14" },
    { key: "WALL", label: "Wall", value: 2, color: "#181818" },
    { key: "WATER", label: "Water", value: 3, color: "#1a3a6a" },
    { key: "FIRE", label: "Fire", value: 4, color: "#b84800" },
    { key: "SPAWN", label: "Spawn", value: 5, color: "#8a7200" },
    { key: "EXIT", label: "Exit", value: 6, color: "#006a6a" },
];

const ENTITY_META = [
    {
        type: "Enemy",
        color: "#cc3333",
        fields: [
            { key: "name", label: "Name", inputType: "text", default: "Goblin" },
            { key: "health", label: "HP", inputType: "number", default: 30 },
            { key: "atk", label: "ATK", inputType: "number", default: 10 },
            { key: "def", label: "DEF", inputType: "number", default: 5 },
            {
                key: "initialState", label: "Behavior", inputType: "select", default: "doIdle",
                options: ["doIdle"]
            },
        ]
    },
    {
        type: "Door",
        color: "#8B4513",
        fields: [
            { key: "requiredKey", label: "Required Key", inputType: "text", default: "" },
        ]
    },
    {
        type: "Chest",
        color: "#cc8800",
        fields: [
            { key: "contents", label: "Contents", inputType: "text", default: [] },
        ]
    },
    {
        type: "Key",
        color: "#ddaa00",
        fields: [
            { key: "name", label: "Name", inputType: "text", default: "Golden Key" },
            { key: "color", label: "Color", inputType: "text", default: "gold" },
        ]
    },
    {
        type: "Potion",
        color: "#3366cc",
        fields: [
            { key: "name", label: "Name", inputType: "text", default: "Health Potion" },
            { key: "healAmount", label: "Heal Amount", inputType: "number", default: 30 },
        ]
    },
    {
        type: "Gold",
        color: "#ffd700",
        fields: [
            { key: "amount", label: "Amount", inputType: "number", default: 50 },
        ]
    },
];

// ============ STATE ============
let grid = createEmptyGrid();
let entities = [];          // [{ type, row, col, ...fields }]
let selectedTile = null;    // TILE_META entry
let selectedEntityType = null; // ENTITY_META entry
let selectedEntityIndex = null; // index in entities[]
let mode = "none";          // "tile" | "entity" | "erase" | "select" | "move"
let isPainting = false;

// ============ CANVAS ============
const gameCanvas = canvas(CANVAS_W, CANVAS_H).setId("game");
const ctx = gameCanvas.get2d();

// ============ FUNCTIONS ============

function createEmptyGrid() {
    let g = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        let row = [];
        for (let c = 0; c < GRID_COLS; c++) {
            if (r < 3 || r >= GRID_ROWS - 2 || c < 3 || c >= GRID_COLS - 2) {
                // Külső void zóna
                row.push(TILE_TYPE.EMPTY);
            } else if (r === 3 || r === GRID_ROWS - 3 || c === 3 || c === GRID_COLS - 3) {
                // Belső kerítő fal
                row.push(TILE_TYPE.WALL);
            } else {
                row.push(TILE_TYPE.FLOOR);
            }
        }
        g.push(row);
    }
    return g;
}

function getTileColor(value) {
    const t = TILE_META.find(t => t.value === value);
    return t ? t.color : "#000";
}

function getEntityMeta(type) {
    return ENTITY_META.find(e => e.type === type);
}

function getEntityAt(row, col) {
    return entities.findIndex(e => e.row === row && e.col === col);
}

function getEntityColor(type) {
    const meta = getEntityMeta(type);
    return meta ? meta.color : "#fff";
}

function isWalkableTile(row, col) {
    const nonWalkable = [TILE_TYPE.EMPTY, TILE_TYPE.WALL];
    return !nonWalkable.includes(grid[row][col]);
}

function drawMap() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Tiles
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            ctx.fillStyle = getTileColor(grid[r][c]);
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= GRID_COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * TILE_SIZE, 0); ctx.lineTo(c * TILE_SIZE, CANVAS_H); ctx.stroke();
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * TILE_SIZE); ctx.lineTo(CANVAS_W, r * TILE_SIZE); ctx.stroke();
    }

    // Entities
    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        const color = getEntityColor(e.type);
        const x = e.col * TILE_SIZE;
        const y = e.row * TILE_SIZE;
        const s = TILE_SIZE;

        // Fill
        ctx.fillStyle = color + "88";
        ctx.fillRect(x + 1, y + 1, s - 2, s - 2);

        // Border
        if (i === selectedEntityIndex) {
            if (mode === "move") {
                ctx.strokeStyle = "#00e5ff";
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
            } else {
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1.5;
                ctx.setLineDash([]);
            }
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
        }
        ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
        ctx.setLineDash([]);

        // Type initial letter
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${TILE_SIZE * 0.55}px 'Share Tech Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(e.type[0], x + s / 2, y + s / 2);
    }
}

function placeEntity(row, col) {
    if (!selectedEntityType) return;

    // Don't place on top of existing entity
    const existing = getEntityAt(row, col);
    if (existing !== -1) {
        selectEntity(existing);
        return;
    }

    const meta = selectedEntityType;
    const entity = { type: meta.type, row, col };

    // Apply defaults
    for (const field of meta.fields) {
        entity[field.key] = field.default;
    }

    entities.push(entity);
    selectedEntityIndex = entities.length - 1;
    renderEntityEditor(entities[selectedEntityIndex]);
    drawMap();
}

function selectEntity(index) {
    selectedEntityIndex = index;
    renderEntityEditor(entities[index]);
    drawMap();
}

function eraseAt(row, col) {
    const idx = getEntityAt(row, col);
    if (idx !== -1) {
        if (selectedEntityIndex === idx) {
            selectedEntityIndex = null;
            renderEntityEditorEmpty();
        } else if (selectedEntityIndex > idx) {
            selectedEntityIndex--;
        }
        entities.splice(idx, 1);
        drawMap();
    } else {
        // Erase visszaállít FLOOR-ra, nem EMPTY-re
        grid[row][col] = TILE_TYPE.FLOOR;
        drawMap();
    }
}

function moveEntityTo(row, col) {
    if (selectedEntityIndex === null) return;

    const existing = getEntityAt(row, col);

    // Másik entity-re kattintott → megszakítás, azt választja ki
    if (existing !== -1 && existing !== selectedEntityIndex) {
        showToast("Move cancelled");
        setMode("select");
        selectEntity(existing);
        return;
    }

    // Nem walkable tile → figyelmeztetés, de odateszi
    if (!isWalkableTile(row, col)) {
        showToast("Warning: non-walkable tile", "error");
    }

    entities[selectedEntityIndex].row = row;
    entities[selectedEntityIndex].col = col;
    renderEntityEditor(entities[selectedEntityIndex]);
    setMode("select");
    drawMap();
    showToast("Entity moved");
}

function handleCanvasInteract(e) {
    const rect = gameCanvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const row = Math.floor((e.clientY - rect.top) / TILE_SIZE);

    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;

    if (mode === "tile" && selectedTile !== null) {
        grid[row][col] = selectedTile.value;
        drawMap();
    } else if (mode === "entity") {
        placeEntity(row, col);
    } else if (mode === "erase") {
        eraseAt(row, col);
    } else if (mode === "move") {
        moveEntityTo(row, col);
    } else {
        // select mode OR none: clicking a placed entity selects it
        const idx = getEntityAt(row, col);
        if (idx !== -1) {
            selectEntity(idx);
        } else {
            // Clicking empty space deselects
            selectedEntityIndex = null;
            renderEntityEditorEmpty();
            drawMap();
        }
    }
}

// ============ ENTITY EDITOR (right panel) ============

function renderEntityEditorEmpty() {
    const container = getById("entityEditor");
    replaceHTML(container,
        div(
            p("← Select entity type"),
            p("then click on the map"),
            p("or click a placed entity")
        ).addClass("editor-placeholder")
    );
}

function renderChestContents(entity) {
    const container = getById("chest-contents-list");
    if (!container) return;

    if (!entity.contents || !Array.isArray(entity.contents)) entity.contents = [];

    replaceHTML(container,
        ...entity.contents.map((item, i) => {
            const labelText = item.type === "Gold"
                ? `Gold — ${item.amount}`
                : `${item.name} (${item.type}) — heals ${item.healAmount}`;

            const removeBtn = btn("✕")
                .addClass("btn-remove-item")
                .onClick(() => {
                    entity.contents.splice(i, 1);
                    renderChestContents(entity);
                });

            return div(
                span(labelText).addClass("content-item-label"),
                removeBtn
            ).addClass("content-item");
        })
    );
}

function buildChestAdder(entity) {
    // Type selector
    const typeSelect = document.createElement("select");
    typeSelect.className = "chest-type-select";
    [
        { value: "Gold", label: "Gold" },
        { value: "Potion", label: "Potion" },
    ].forEach(opt => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        typeSelect.appendChild(o);
    });

    // Value input
    const valueInput = input("number").setValue(10).setPlaceholder("Amount / Heal");
    valueInput.style.width = "70px";

    // Name input (only for Potion)
    const nameInput = input("text").setValue("Health Potion").setPlaceholder("Name");
    nameInput.style.width = "100px";

    const nameGroup = div(nameInput).addClass("chest-name-group");

    function updateVisibility() {
        nameGroup.style.display = typeSelect.value === "Potion" ? "block" : "none";
    }
    updateVisibility();
    typeSelect.addEventListener("change", updateVisibility);

    const addBtn = btn("+ Add")
        .addClass("btn-secondary")
        .onClick(() => {
            if (!entity.contents) entity.contents = [];

            if (typeSelect.value === "Gold") {
                entity.contents.push({
                    type: "Gold",
                    amount: Number(valueInput.value) || 10,
                    row: -1, col: -1
                });
            } else if (typeSelect.value === "Potion") {
                entity.contents.push({
                    type: "Potion",
                    name: nameInput.value || "Health Potion",
                    healAmount: Number(valueInput.value) || 30,
                    row: -1, col: -1
                });
            }

            renderChestContents(entity);
        });

    return div(
        typeSelect,
        valueInput,
        nameGroup,
        addBtn
    ).addClass("chest-adder");
}

function renderEntityEditor(entity) {
    const container = getById("entityEditor");
    const meta = getEntityMeta(entity.type);

    const posInfo = div(
        `row: `, span(`${entity.row}`), `  col: `, span(`${entity.col}`)
    ).addClass("entity-pos-display");
    posInfo.querySelectorAll("span").forEach(s => s.style.color = "var(--accent)");

    const deleteBtn = btn("Delete Entity")
        .addClass("btn-danger")
        .onClick(() => {
            const idx = entities.indexOf(entity);
            if (idx !== -1) {
                entities.splice(idx, 1);
                selectedEntityIndex = null;
                renderEntityEditorEmpty();
                drawMap();
                showToast("Entity deleted");
            }
        });

    const moveBtn = btn("✥ Move")
        .addClass("btn-secondary")
        .setId("btn-panel-move")
        .onClick(() => {
            if (mode === "move") setMode("select");
            else setMode("move");
        });

    // Regular fields (skip "contents" for Chest — handled separately)
    const fields = meta.fields
        .filter(f => f.key !== "contents")
        .map(f => {
            const fieldId = `field-${f.key}`;

            const inp = f.inputType === "select"
                ? (() => {
                    const sel = select(
                        ...f.options.map(o => option(o, o, (entity[f.key] ?? f.default) === o))
                    ).setName(f.key);
                    sel.onInput(() => {
                        const idx = entities.indexOf(entity);
                        if (idx === -1) return;
                        entities[idx][f.key] = sel.value;
                    });
                    return sel;
                })()
                : input(f.inputType)
                    .setId(fieldId)
                    .setValue(entity[f.key] ?? f.default);

            if (f.inputType !== "select") {
                inp.onInput(() => {
                    const idx = entities.indexOf(entity);
                    if (idx === -1) return;
                    const val = f.inputType === "number" ? Number(inp.value) : inp.value;
                    entities[idx][f.key] = val;
                    drawMap();
                });
            }

            return div(
                label(f.label).setTarget(fieldId),
                inp
            ).addClass("field-group");
        });

    // Chest contents UI
    const chestSection = entity.type === "Chest"
        ? div(
            div("Contents").addClass("field-section-title"),
            div().setId("chest-contents-list").addClass("contents-list"),
            buildChestAdder(entity)
        ).addClass("chest-section")
        : null;

    const children = [
        div(`${entity.type}`).addClass("editor-title"),
        posInfo,
        ...fields,
        ...(chestSection ? [chestSection] : []),
        div(moveBtn, deleteBtn).addClass("editor-actions")
    ];

    replaceHTML(container, div(...children));

    // Render existing contents after DOM is ready
    if (entity.type === "Chest") {
        renderChestContents(entity);
    }
}

// ============ EXPORT / IMPORT ============

function exportMap() {
    const data = { grid, entities };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "map.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Map exported!", "success");
}

function importMap() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.grid || !data.entities) throw new Error("Invalid format");
                grid = data.grid;
                entities = data.entities;
                selectedEntityIndex = null;
                renderEntityEditorEmpty();
                drawMap();
                showToast("Map loaded!", "success");
            } catch (err) {
                showToast("Invalid JSON file", "error");
            }
        };
        reader.readAsText(file);
    });
    fileInput.click();
}

function clearMap() {
    if (!confirm("Clear entire map? This cannot be undone.")) return;
    grid = createEmptyGrid();
    entities = [];
    selectedEntityIndex = null;
    renderEntityEditorEmpty();
    drawMap();
    showToast("Map cleared");
}

// ============ TOAST ============

let toastTimeout = null;

function showToast(message, type = "") {
    const t = getById("toast");
    t.textContent = message;
    t.className = "show" + (type ? ` ${type}` : "");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { t.className = ""; }, 2200);
}

// ============ MODE HELPERS ============

const MODE_BUTTONS = {
    "select": "btn-mode-select",
    "erase": "btn-mode-erase",
    "move": "btn-mode-move",
};

function setMode(newMode) {
    mode = newMode;
    const indicator = getById("modeIndicator");

    // Reset all topbar mode buttons
    Object.values(MODE_BUTTONS).forEach(id => getById(id)?.removeClass("active"));

    // Activate the matching button
    if (MODE_BUTTONS[newMode]) getById(MODE_BUTTONS[newMode])?.addClass("active");

    // Update indicator
    indicator.className = "";
    const modeConfig = {
        "tile": { text: "MODE: TILE", cls: "mode-tile" },
        "entity": { text: "MODE: ENTITY", cls: "mode-entity" },
        "erase": { text: "MODE: ERASE", cls: "mode-erase" },
        "move": { text: "MODE: MOVE", cls: "mode-move" },
    };
    const cfg = modeConfig[newMode];
    if (cfg) {
        indicator.textContent = cfg.text;
        indicator.addClass(cfg.cls);
    } else {
        indicator.textContent = "MODE: SELECT";
        indicator.addClass("mode-select");
    }

    // Clear sidebar selection when leaving tile/entity modes
    if (!["tile", "entity"].includes(newMode)) {
        selectedTile = null;
        selectedEntityType = null;
        document.querySelectorAll("#tileList li, #entityList li")
            .forEach(li => li.classList.remove("selected"));
    }
}

function selectTileType(meta) {
    selectedTile = meta;
    selectedEntityType = null;
    setMode("tile");

    // Highlight selected in sidebar
    document.querySelectorAll("#tileList li").forEach(li => li.classList.remove("selected"));
    const el = getById(`tile-item-${meta.key}`);
    if (el) el.classList.add("selected");
    document.querySelectorAll("#entityList li").forEach(li => li.classList.remove("selected"));
}

function selectEntityType(meta) {
    selectedEntityType = meta;
    selectedTile = null;
    setMode("entity");

    document.querySelectorAll("#entityList li").forEach(li => li.classList.remove("selected"));
    const el = getById(`entity-item-${meta.type}`);
    if (el) el.classList.add("selected");
    document.querySelectorAll("#tileList li").forEach(li => li.classList.remove("selected"));
}

// ============ UI BUILDER ============

function buildTileList() {
    const items = TILE_META.map(t =>
        li(
            div().addClass("color-dot").setStyle(`background:${t.color}`),
            span(t.label)
        )
            .setId(`tile-item-${t.key}`)
            .onClick(() => selectTileType(t))
    );
    return ul(...items).setId("tileList").addClass("item-list");
}

function buildEntityList() {
    const items = ENTITY_META.map(e =>
        li(
            div().addClass("color-dot").setStyle(`background:${e.color}`),
            span(e.type)
        )
            .setId(`entity-item-${e.type}`)
            .onClick(() => selectEntityType(e))
    );
    return ul(...items).setId("entityList").addClass("item-list");
}

function buildSidebar() {
    return div(
        div("Tiles").addClass("sidebar-section-title"),
        div(buildTileList()).addClass("sidebar-section"),
        div("Entities").addClass("sidebar-section-title"),
        div(buildEntityList()).addClass("sidebar-section")
    ).setId("sidebar");
}

function buildTopbar() {
    const modeIndicator = span("MODE: SELECT").setId("modeIndicator").addClass("mode-select");

    const selectBtn = btn("↖ Select")
        .setClasses("btn-topbar active")
        .setId("btn-mode-select")
        .onClick(() => {
            if (mode === "select") setMode("none");
            else setMode("select");
        });

    const eraseBtn = btn("⌫ Erase")
        .addClass("btn-topbar")
        .setId("btn-mode-erase")
        .onClick(() => {
            if (mode === "erase") setMode("none");
            else setMode("erase");
        });

    const moveBtn = btn("✥ Move")
        .addClass("btn-topbar")
        .setId("btn-mode-move")
        .onClick(() => {
            if (mode === "move") setMode("select");
            else if (selectedEntityIndex === null) {
                showToast("No entity selected", "error");
            } else {
                setMode("move");
            }
        });

    const clearBtn = btn("Clear Map")
        .addClass("btn-topbar")
        .onClick(clearMap);

    const importBtn = btn("Import")
        .addClass("btn-topbar")
        .onClick(importMap);

    const exportBtn = btn("Export JSON")
        .addClass("btn-primary")
        .onClick(exportMap);

    const coordDisplay = span("").setId("coordDisplay");

    return div(
        span("DUNGEON EDITOR").addClass("logo"),
        div().addClass("sep"),
        selectBtn,
        eraseBtn,
        moveBtn,
        clearBtn,
        div().addClass("sep"),
        importBtn,
        exportBtn,
        div().addClass("sep"),
        modeIndicator,
        coordDisplay
    ).setId("topbar");
}

function buildApp() {
    const editorPanel = div(
        div("ENTITY EDITOR").addClass("sidebar-section-title"),
        div().setId("entityEditor")
    ).setId("rightPanel");

    const workspace = div(
        buildSidebar(),
        div(gameCanvas).setId("canvasArea"),
        editorPanel
    ).setId("workspace");

    return div(
        buildTopbar(),
        workspace,
        div().setId("toast")
    ).setId("root-inner");
}

// ============ INITIALIZATION ============

getById("root").appendChild(buildApp());

renderEntityEditorEmpty();
drawMap();

// ============ EVENT HANDLERS ============

gameCanvas.addEventListener("mousedown", (e) => {
    isPainting = true;
    handleCanvasInteract(e);
});

gameCanvas.addEventListener("mousemove", (e) => {
    const rect = gameCanvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const row = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    const coord = getById("coordDisplay");
    if (coord) coord.textContent = `${row} : ${col}`;

    if (isPainting && mode === "tile") {
        handleCanvasInteract(e);
    }
});

gameCanvas.addEventListener("mouseup", () => { isPainting = false; });
gameCanvas.addEventListener("mouseleave", () => { isPainting = false; });

document.addEventListener("keydown", (e) => {
    // Ne aktiválódjon ha egy input mezőbe gépelünk
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.key === "Escape") {
        setMode("none");
        selectedTile = null;
        selectedEntityType = null;
        document.querySelectorAll("#tileList li, #entityList li").forEach(li => li.classList.remove("selected"));
    }

    if (e.key === "s" || e.key === "S") {
        if (mode === "select") setMode("none");
        else setMode("select");
    }

    if (e.key === "e" || e.key === "E") {
        if (mode === "erase") setMode("none");
        else setMode("erase");
    }

    if (e.key === "m" || e.key === "M") {
        if (mode === "move") {
            setMode("select");
        } else if (selectedEntityIndex === null) {
            showToast("No entity selected", "error");
        } else {
            setMode("move");
        }
    }

    if (e.key === "Delete" && selectedEntityIndex !== null) {
        entities.splice(selectedEntityIndex, 1);
        selectedEntityIndex = null;
        renderEntityEditorEmpty();
        drawMap();
        showToast("Entity deleted");
    }
});