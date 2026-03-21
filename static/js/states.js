// ==================================================
//  Game States
// ==================================================
const GAME_STATE = {
    LOADING  : "LOADING",
    PLAYING  : "PLAYING",
    PAUSED   : "PAUSED",
    COMBAT   : "COMBAT",
    INVENTORY: "INVENTORY",
    GAME_OVER: "GAME_OVER",
    VICTORY  : "VICTORY",
};

// ==================================================
//  Transient Data
//  These are not states — they are temporary data
//  associated with a particular phase of the game.
// ==================================================
const combatData = {
    currentEnemy: null,
    log         : "",
    turn        : "",
};

const infoData = {
    message: "",
    timeout: null,
};

const inventoryData = {
    selectedIndex: 0,
};

// ==================================================
//  Game State
// ==================================================
const gameState = {
    player     : null,
    animationId: null,
    inDebugMode: false,

    // FSM
    currentState: GAME_STATE.LOADING,

    transitions: {
        LOADING  : [GAME_STATE.PLAYING],
        PLAYING  : [GAME_STATE.PAUSED, GAME_STATE.COMBAT, GAME_STATE.INVENTORY, GAME_STATE.GAME_OVER, GAME_STATE.VICTORY],
        PAUSED   : [GAME_STATE.PLAYING],
        COMBAT   : [GAME_STATE.PLAYING, GAME_STATE.GAME_OVER],
        INVENTORY: [GAME_STATE.PLAYING],
        GAME_OVER: [],
        VICTORY  : [],
    },

    transitionListeners: {},

    is: function (state) {
        return this.currentState === state;
    },

    canTransition: function (to) {
        return this.transitions[this.currentState].indexOf(to) !== -1;
    },

    transition: function (to) {
        if (!this.canTransition(to)) {
            console.warn("[FSM] Invalid transition: " + this.currentState + " → " + to);
            return false;
        }
        var from = this.currentState;
        this.currentState = to;
        this._notify(from, to);
        return true;
    },

    _notify: function (from, to) {
        var key = from + "→" + to;
        if (this.transitionListeners[key]) {
            this.transitionListeners[key].forEach(function (fn) { fn(); });
        }
    },

    onTransition: function (fromTo, fn) {
        if (!this.transitionListeners[fromTo]) {
            this.transitionListeners[fromTo] = [];
        }
        this.transitionListeners[fromTo].push(fn);
        return this;
    },
};