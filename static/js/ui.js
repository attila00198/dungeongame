function gameContainer() {
    return canvas().setId("game")
}

function infoContainer() {
    return div(
        div(
            span("Posistion (0x0)").setId("pPos").setClass("infoLine"),
            span("Health: 0").setId("pHp").setClass("infoLine"),
            span("Gold: 0").setId("pGold").setClass("infoLine")
        ).setId("infoPanelLeft"),
        div(
            span("Inventory: []").setId("pInventory").setClass("infoLine")
        ).setId("infoPanelRight"),
    ).setId("infoContainer")
}

function tabContainer() {
    return div(
        btn("Game", "button")
            .setId("gameTabBtn")
            .setClass("tab-button active")
            .onClick(() => switchToGameTab()),
        btn("Editor", "button")
            .setId("editorTabBtn")
            .setClass("tab-button")
            .onClick(() => switchToEditorTab())
    ).setClass("tab-container")
}

function gameTab() {
    return div(
        gameContainer(),
        infoContainer()
    ).setId("gameTab").setClass("tab-content active")
}

function editorTab() {
    return div().setId("editorTab").setClass("tab-content")
}

function app() {
    return div(
        tabContainer(),
        gameTab(),
        editorTab()
    ).setId("app")
}

function switchToGameTab() {
    getById("gameTab").classList.add("active")
    getById("editorTab").classList.remove("active")
    getById("gameTabBtn").classList.add("active")
    getById("editorTabBtn").classList.remove("active")
    console.log("[UI] Switched to Game tab")
}

function switchToEditorTab() {
    getById("gameTab").classList.remove("active")
    getById("editorTab").classList.add("active")
    getById("gameTabBtn").classList.remove("active")
    getById("editorTabBtn").classList.add("active")
    console.log("[UI] Switched to Editor tab")
    
    // Initialize editor if not already done
    if (!editorState.grid) {
        initEditor()
    }
}

let appContainer = getById("appContainer")
appContainer.appendChild(app())

// Initialize editor UI after DOM is ready
window.addEventListener("DOMContentLoaded", () => {
    const editorTabElement = getById("editorTab")
    if (editorTabElement) {
        editorTabElement.appendChild(createEditorContainer())
    }
})
