// ==================================================
//  AssetManager
//  Előtölti és cache-eli a sprite képeket.
//  Használat:
//    await AssetManager.preload();
//    const img = AssetManager.get("static/assets/textures/floor.png");
// ==================================================

const AssetManager = (function () {

    // Belső cache: path → HTMLImageElement
    const _cache = {};

    // Az összes regisztrált sprite path (tile + entitás)
    const _registry = [];

    // ---- Publikus API ----

    function register(path) {
        if (!path) return;
        if (_registry.indexOf(path) === -1) {
            _registry.push(path);
        }
    }

    function get(path) {
        return _cache[path] || null;
    }

    function preload() {
        const promises = _registry.map(function (path) {
            return new Promise(function (resolve) {
                if (_cache[path]) {
                    resolve();
                    return;
                }
                const img = new Image();
                img.onload = function () {
                    _cache[path] = img;
                    resolve();
                };
                img.onerror = function () {
                    console.warn("[AssetManager] Nem sikerült betölteni: " + path);
                    resolve();
                };
                img.src = path;
            });
        });
        return Promise.all(promises);
    }

    function getLoadedCount() {
        return Object.keys(_cache).length;
    }

    function getTotalCount() {
        return _registry.length;
    }

    return {
        register: register,
        get: get,
        preload: preload,
        getLoadedCount: getLoadedCount,
        getTotalCount: getTotalCount,
    };

}());