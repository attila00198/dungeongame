// Animated ember/particle background
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
});

// ===== GRID PATTERN =====
function drawStoneGrid() {
    const tileSize = 40;
    ctx.strokeStyle = "rgba(255,255,255,0.018)";
    ctx.lineWidth = 1;

    for (let x = 0; x < W; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 0; y < H; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
}

// ===== EMBERS =====
class Ember {
    constructor() { this.reset(true); }

    reset(initial = false) {
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : H + 10;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = Math.random() * 0.6 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.life = 0;
        this.maxLife = Math.random() * 300 + 200;
        this.hue = Math.random() * 30 + 10; // orange-red range
    }

    update() {
        this.x += this.speedX + Math.sin(this.life * 0.02) * 0.3;
        this.y -= this.speedY;
        this.life++;
        if (this.y < -10 || this.life > this.maxLife) this.reset();
    }

    draw() {
        const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * 0.7;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 90%, 60%, ${alpha})`;
        ctx.fill();
    }
}

// ===== TORCH GLOW =====
let torchFlicker = 0;

function drawTorchGlow() {
    torchFlicker += 0.03;
    const intensity = 0.12 + Math.sin(torchFlicker) * 0.03 + Math.sin(torchFlicker * 2.7) * 0.015;

    const grad = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.35);
    grad.addColorStop(0, `rgba(200, 80, 10, ${intensity})`);
    grad.addColorStop(1, "transparent");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}

// ===== INIT =====
const EMBER_COUNT = 60;
const embers = Array.from({ length: EMBER_COUNT }, () => new Ember());

function loop() {
    ctx.clearRect(0, 0, W, H);

    drawStoneGrid();
    drawTorchGlow();

    for (const e of embers) {
        e.update();
        e.draw();
    }

    requestAnimationFrame(loop);
}

loop();