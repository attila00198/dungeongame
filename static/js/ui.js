function gameContainer() {
    return canvas().setId("game")
}

function app() {
    return div(
        gameContainer()
    ).setId("gameTab").setClass("container")
}

let appContainer = getById("appContainer")
appContainer.appendChild(app())
