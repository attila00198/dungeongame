# Dungeon Game

An HTML/JavaScript-based interactive dungeon exploration project that runs entirely in the browser using only static files.
Designed to be lightweight and easy to modify, the codebase includes a simple tile editor, game engine, and asset management, making it a great starting point for hobbyist developers and learners.

## Current State

The project has a working frontend with separate editor and game pages. Players can load a map from `maps/map.json`, move around the dungeon, and interact with simple objects. A basic tile editor (`editor.html`) is included for designing levels. Core game logic resides in `js/game.js` with utility classes in `js/classes.js` and DOM helpers in `js/domino.js`.

Styles are organized under `static/css`, with `game.css`, `editor.css`, and `menu.css` providing layout and visuals. Assets such as textures and sound effects live in `static/assets`. Sprite loading and caching is handled by `js/assets.js` via the `AssetManager` singleton.

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
│   │   └── textures/    # tile and entity sprites (32x32 px)
│   ├── css/             # stylesheets
│   │   ├── editor.css
│   │   ├── game.css
│   │   ├── menu.css
│   │   └── normalize.css
│   └── js/              # JavaScript source files
│       ├── assets.js    # AssetManager — sprite preloading and cache
│       ├── classes.js
│       ├── domino.js
│       ├── editor.js
│       ├── game.js
│       └── menu.js
└── README.md            # this file
```

### Tile System

The map uses a numeric tile ID system. The current tile types are:

| ID | Name  | Walkable | Description                        |
|----|-------|----------|------------------------------------|
| 0  | EMPTY | No       | Void area outside the dungeon      |
| 1  | FLOOR | Yes      | Walkable dungeon floor             |
| 2  | WALL  | No       | Dungeon wall                       |
| 3  | WATER | Yes      | Water tile (has effect)            |
| 4  | FIRE  | Yes      | Fire tile (has effect)             |
| 5  | SPAWN | Yes      | Player spawn point                 |
| 6  | EXIT  | Yes      | Level exit                         |

Sprites are loaded once at startup via `AssetManager` and drawn from cache each frame, eliminating per-frame `Image` object creation and the flickering it caused.

## Running the Project

Because the game uses local file loading, it should be served over HTTP. You can use any simple static file server; for example:

- Using PHP
```sh
php -S localhost:8000
```

- Using Python 3
```sh
python -m http.server 8000
```

Then open `http://localhost:8000/index.html` in your browser. Use the menu to navigate to the editor or play a map.

## Features

- ✔ Browser-based dungeon engine
- ✔ Tile editor for map creation
- ✔ Player movement and basic interaction
- ✔ Basic combat
- ✔ Asset manager with sprite preloading and cache
- ✔ HTML-based HUD (health, attack, defense, enemies, keys, gold)
- ✔ Enemy AI with last-known-position search behaviour

## Roadmap

- [ ] Seamless tile textures
- [ ] Camera / viewport scrolling for larger maps
- [ ] Save/load support
- [ ] Additional assets and sound effects

## Contributing

Pull requests and issues are welcome. Ensure code is formatted consistently and documented. Add level maps to `maps/` and update `map.json` examples. When adding new tile types, update `TILE_T` in `game.js`, `TILE_TYPE` and `TILE_META` in `editor.js`, and register any new sprites with `AssetManager.register()`.

## License

This project is released under the [MIT License](LICENSE).

A copy of the license is included in the `LICENSE` file at the root of the repository. In short, you are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, provided the original copyright notice and this permission notice are included in all copies or substantial portions of the software.

## Contact

Open an issue or contact the maintainer via the repository.

---

*This README is kept up to date as development progresses.*