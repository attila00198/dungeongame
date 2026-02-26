# Dungeon Game

An HTML/JavaScript-based interactive dungeon exploration project.  The game runs entirely in the browser using static files and is under active development.

## Current State

The project has a working frontend with separate editor and game pages.  Players can load a map from `maps/map.json`, move around the dungeon, and interact with simple objects.  A basic tile editor (`editor.html`) is included for designing levels.  Core game logic resides in `js/game.js` with utility classes in `js/classes.js` and DOM helpers in `js/domino.js`.

Styles are organized under `static/css`, with `game.css`, `editor.css`, and `menu.css` providing layout and visuals.  Assets such as textures and sound effects live in `static/assets`.

### Repository Structure

```text
dungeongame/
├── editor.html          # level editor interface
├── game.html            # main game page
├── index.html           # entry/menu page
├── maps/
│   └── map.json         # example map data
├── static/
│   ├── assets/          # images, sounds, etc.
│   │   ├── sounds/
│   │   └── textures/
│   ├── css/             # stylesheets
│   │   ├── editor.css
│   │   ├── game.css
│   │   ├── menu.css
│   │   └── normalize.css
│   └── js/              # JavaScript source files
│       ├── classes.js
│       ├── domino.js
│       ├── editor.js
│       ├── game.js
│       └── menu.js
└── README.md            # this file
```

## Running the Project

Because the game uses local file loading, it should be served over HTTP.  You can use any simple static file server; for example:

```sh
# using Python 3
python -m http.server 8000
```

Then open `http://localhost:8000/index.html` in your browser.  Use the menu to navigate to the editor or play a map.

## Features

- ✔ Browser-based dungeon engine
- ✔ Tile editor for map creation
- ✔ Player movement and basic interaction
- ✔ Modular CSS and JavaScript structure

## Roadmap

- [ ] Procedural dungeon generation
- [ ] Combat and inventory mechanics
- [ ] Save/load support
- [ ] Mobile/touch controls
- [ ] Additional assets and sound effects

## Contributing

Pull requests and issues are welcome.  Ensure code is formatted consistently and documented.  Add level maps to `maps/` and update `map.json` examples.

## License

Specify your license here (e.g. MIT).

## Contact

Open an issue or contact the maintainer via the repository.

---

*This README is kept up to date as development progresses.*