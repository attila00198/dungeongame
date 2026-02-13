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

function app() {
    return div(
        gameContainer(),
        infoContainer()
    ).setId("app").setClass("container")
}
let appContainer = getById("appContainer")
appContainer.appendChild(app())