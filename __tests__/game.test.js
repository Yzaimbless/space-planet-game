/**
 * Space Planet Defender - Tests
 * Vérifie que le jeu fonctionne sur PC (clavier/souris) et téléphone (tactile).
 *
 * @jest-environment jsdom
 */

/* global describe, test, expect, beforeEach, beforeAll, jest */

// ==============================
// Setup DOM before loading game
// ==============================
function setupDOM() {
    document.body.innerHTML = `
        <canvas id="gameCanvas" width="800" height="600"></canvas>
        <div id="hud">
            <div class="hud-value" id="score">0</div>
            <div class="hud-value" id="highScore">0</div>
            <div class="hud-value" id="wave">1</div>
            <div class="lives-display" id="lives">❤️❤️❤️</div>
        </div>
        <div id="titleScreen" class="screen active"></div>
        <div id="pauseScreen" class="screen screen-overlay"></div>
        <div id="gameOverScreen" class="screen screen-overlay">
            <div id="finalScore">0</div>
            <div id="newRecord"></div>
            <div id="highScoreGO">0</div>
            <p id="motivatingMsg"></p>
        </div>
        <button id="playBtn"></button>
        <button id="resumeBtn"></button>
        <button id="replayBtn"></button>
        <button id="menuBtn"></button>
        <span id="titleHighScore">0</span>
    `;
}

// Stub for HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = function () {
    return {
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        closePath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        arc: jest.fn(),
        ellipse: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        strokeText: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        scale: jest.fn(),
        createRadialGradient: jest.fn(() => ({
            addColorStop: jest.fn(),
        })),
        createLinearGradient: jest.fn(() => ({
            addColorStop: jest.fn(),
        })),
        measureText: jest.fn(() => ({ width: 0 })),
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({
            data: new Uint8ClampedArray(4),
        })),
        putImageData: jest.fn(),
        set fillStyle(_v) {},
        get fillStyle() { return '#000'; },
        set strokeStyle(_v) {},
        get strokeStyle() { return '#000'; },
        set lineWidth(_v) {},
        get lineWidth() { return 1; },
        set lineCap(_v) {},
        get lineCap() { return 'butt'; },
        set font(_v) {},
        get font() { return '10px sans-serif'; },
        set textAlign(_v) {},
        get textAlign() { return 'start'; },
        set textBaseline(_v) {},
        get textBaseline() { return 'alphabetic'; },
        set globalAlpha(_v) {},
        get globalAlpha() { return 1; },
        set shadowColor(_v) {},
        get shadowColor() { return 'rgba(0, 0, 0, 0)'; },
        set shadowBlur(_v) {},
        get shadowBlur() { return 0; },
    };
};

// Mock requestAnimationFrame
window.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));

// Polyfill Touch for jsdom (not natively supported)
if (typeof Touch === 'undefined') {
    class TouchPolyfill {
        constructor(opts) {
            this.identifier = opts.identifier || 0;
            this.target = opts.target || document.body;
            this.clientX = opts.clientX || 0;
            this.clientY = opts.clientY || 0;
            this.pageX = opts.pageX || opts.clientX || 0;
            this.pageY = opts.pageY || opts.clientY || 0;
            this.screenX = opts.screenX || opts.clientX || 0;
            this.screenY = opts.screenY || opts.clientY || 0;
        }
    }
    window.Touch = TouchPolyfill;
    global.Touch = TouchPolyfill;
}

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = String(value); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Set window dimensions
Object.defineProperty(window, 'innerWidth', { writable: true, value: 800 });
Object.defineProperty(window, 'innerHeight', { writable: true, value: 600 });

// Setup DOM and load game
setupDOM();
const game = require('../game');

// ============================================================
// TESTS
// ============================================================

describe('Configuration du jeu', () => {
    test('CONFIG contient les paramètres attendus', () => {
        expect(game.CONFIG).toBeDefined();
        expect(game.CONFIG.PLANET_RADIUS).toBeGreaterThan(0);
        expect(game.CONFIG.SHIP_SIZE).toBeGreaterThan(0);
        expect(game.CONFIG.BULLET_SPEED).toBeGreaterThan(0);
        expect(game.CONFIG.BULLET_COOLDOWN).toBeGreaterThan(0);
        expect(game.CONFIG.ASTEROID_SMALL_RADIUS).toBeGreaterThan(0);
        expect(game.CONFIG.ASTEROID_LARGE_RADIUS).toBeGreaterThan(0);
        expect(game.CONFIG.STAR_COUNT).toBeGreaterThan(0);
    });

    test('CONFIG vitesses astéroïdes cohérentes (petits plus rapides)', () => {
        expect(game.CONFIG.ASTEROID_SMALL_SPEED).toBeGreaterThan(game.CONFIG.ASTEROID_LARGE_SPEED);
    });

    test('CONFIG rayon planète ajusté au canvas', () => {
        // Après resizeCanvas, le rayon planète est basé sur la taille du canvas
        game.resizeCanvas();
        const minDim = Math.min(800, 600);
        expect(game.CONFIG.PLANET_RADIUS).toBeCloseTo(minDim * 0.08, 0);
    });
});

describe('État initial du jeu', () => {
    beforeEach(() => {
        game.startGame();
    });

    test('score est 0 au démarrage', () => {
        expect(game.state.score).toBe(0);
    });

    test('vies sont 3 au démarrage', () => {
        expect(game.state.lives).toBe(3);
    });

    test('vague est 1 au démarrage', () => {
        expect(game.state.wave).toBe(1);
    });

    test('le jeu est en cours après startGame', () => {
        expect(game.state.gameRunning).toBe(true);
        expect(game.state.gamePaused).toBe(false);
        expect(game.state.gameOver).toBe(false);
    });

    test('vaisseau est initialisé', () => {
        const ship = game.getShip();
        expect(ship).toBeDefined();
        expect(ship.angle).toBeDefined();
        expect(ship.orbitRadius).toBeGreaterThan(0);
        expect(ship.size).toBeGreaterThan(0);
    });

    test('les tableaux de jeu sont vides au démarrage', () => {
        expect(game.getBullets()).toEqual([]);
        expect(game.getAsteroids()).toEqual([]);
        expect(game.getParticles()).toEqual([]);
        expect(game.getFloatingTexts()).toEqual([]);
    });
});

describe('Détection de collision circulaire', () => {
    test('deux cercles qui se chevauchent → collision', () => {
        const a = { x: 0, y: 0, radius: 10 };
        const b = { x: 15, y: 0, radius: 10 };
        expect(game.circleCollision(a, b)).toBe(true);
    });

    test('deux cercles éloignés → pas de collision', () => {
        const a = { x: 0, y: 0, radius: 10 };
        const b = { x: 100, y: 100, radius: 10 };
        expect(game.circleCollision(a, b)).toBe(false);
    });

    test('deux cercles tangents → pas de collision (distance == somme rayons)', () => {
        const a = { x: 0, y: 0, radius: 10 };
        const b = { x: 20, y: 0, radius: 10 };
        // dist = 20, sum = 20 → dist < sum is false
        expect(game.circleCollision(a, b)).toBe(false);
    });

    test('cercles superposés au même point → collision', () => {
        const a = { x: 5, y: 5, radius: 5 };
        const b = { x: 5, y: 5, radius: 5 };
        expect(game.circleCollision(a, b)).toBe(true);
    });
});

describe('Création d\'astéroïdes', () => {
    test('createAsteroid renvoie un objet valide', () => {
        game.resizeCanvas();
        const asteroid = game.createAsteroid();
        expect(asteroid).toBeDefined();
        expect(asteroid.x).toBeDefined();
        expect(asteroid.y).toBeDefined();
        expect(asteroid.radius).toBeGreaterThan(0);
        expect(asteroid.speed).toBeGreaterThan(0);
        expect(asteroid.health).toBeGreaterThan(0);
        expect(asteroid.vertices).toBeDefined();
        expect(asteroid.vertices.length).toBeGreaterThanOrEqual(6);
    });

    test('les astéroïdes apparaissent aux bords de l\'écran', () => {
        game.resizeCanvas();
        // Tester 20 astéroïdes pour vérifier qu'ils apparaissent hors écran
        for (let i = 0; i < 20; i++) {
            const a = game.createAsteroid();
            const margin = a.radius + 10;
            const isOutside =
                a.x < margin || a.x > 800 - margin + margin ||
                a.y < margin || a.y > 600 - margin + margin;
            // L'astéroïde devrait apparaître aux bords (ou juste à l'extérieur)
            expect(isOutside || a.x <= 0 || a.x >= 800 || a.y <= 0 || a.y >= 600).toBe(true);
        }
    });

    test('les gros astéroïdes ont plus de vie que les petits', () => {
        expect(game.CONFIG.ASTEROID_LARGE_HEALTH).toBeGreaterThan(game.CONFIG.ASTEROID_SMALL_HEALTH);
    });
});

describe('Système de tir (projectiles)', () => {
    beforeEach(() => {
        game.startGame();
        game.setBullets([]);
        game.state.lastBulletTime = 0;
    });

    test('fireBullet crée un projectile', () => {
        game.fireBullet();
        expect(game.getBullets().length).toBe(1);
    });

    test('le projectile a une position et une vitesse valides', () => {
        game.fireBullet();
        const bullet = game.getBullets()[0];
        expect(bullet.x).toBeDefined();
        expect(bullet.y).toBeDefined();
        expect(bullet.vx).toBeDefined();
        expect(bullet.vy).toBeDefined();
        expect(bullet.radius).toBe(game.CONFIG.BULLET_RADIUS);
    });

    test('cooldown empêche le tir rapide', () => {
        game.fireBullet();
        game.fireBullet(); // Devrait être bloqué par le cooldown
        expect(game.getBullets().length).toBe(1);
    });

    test('tir possible après le cooldown', () => {
        game.fireBullet();
        // Simuler le passage du cooldown
        game.state.lastBulletTime = Date.now() - game.CONFIG.BULLET_COOLDOWN - 1;
        game.fireBullet();
        expect(game.getBullets().length).toBe(2);
    });

    test('updateBullets supprime les projectiles expirés', () => {
        game.fireBullet();
        const bullets = game.getBullets();
        bullets[0].life = 0;
        game.updateBullets();
        expect(game.getBullets().length).toBe(0);
    });

    test('updateBullets supprime les projectiles hors écran', () => {
        game.fireBullet();
        const bullets = game.getBullets();
        bullets[0].x = -100;
        bullets[0].y = -100;
        bullets[0].life = 1; // Pas encore expiré, mais hors écran
        game.updateBullets();
        // La vie a été décrémentée à 0, et en dehors de l'écran
        expect(game.getBullets().length).toBe(0);
    });
});

describe('Mouvement du vaisseau', () => {
    beforeEach(() => {
        game.startGame();
    });

    test('le vaisseau tourne à gauche avec ArrowLeft', () => {
        const ship = game.getShip();
        const initialAngle = ship.angle;
        game.keys['ArrowLeft'] = true;
        game.updateShip(1);
        game.keys['ArrowLeft'] = false;
        expect(ship.angle).toBeLessThan(initialAngle);
    });

    test('le vaisseau tourne à droite avec ArrowRight', () => {
        const ship = game.getShip();
        const initialAngle = ship.angle;
        game.keys['ArrowRight'] = true;
        game.updateShip(1);
        game.keys['ArrowRight'] = false;
        expect(ship.angle).toBeGreaterThan(initialAngle);
    });

    test('le vaisseau tourne à gauche avec KeyA', () => {
        const ship = game.getShip();
        const initialAngle = ship.angle;
        game.keys['KeyA'] = true;
        game.updateShip(1);
        game.keys['KeyA'] = false;
        expect(ship.angle).toBeLessThan(initialAngle);
    });

    test('le vaisseau tourne à droite avec KeyD', () => {
        const ship = game.getShip();
        const initialAngle = ship.angle;
        game.keys['KeyD'] = true;
        game.updateShip(1);
        game.keys['KeyD'] = false;
        expect(ship.angle).toBeGreaterThan(initialAngle);
    });

    test('le vaisseau ne bouge pas sans entrée', () => {
        const ship = game.getShip();
        ship.rotationDir = 0;
        const initialAngle = ship.angle;
        game.updateShip(1);
        expect(ship.angle).toBe(initialAngle);
    });
});

describe('Contrôles tactiles mobiles (téléphone)', () => {
    beforeEach(() => {
        game.startGame();
        game.setBullets([]);
        game.state.lastBulletTime = 0;
        // Reset touch keys
        game.keys['_touchLeft'] = false;
        game.keys['_touchRight'] = false;
    });

    test('le vaisseau tourne à gauche avec _touchLeft', () => {
        const ship = game.getShip();
        const initialAngle = ship.angle;
        game.keys['_touchLeft'] = true;
        game.updateShip(1);
        game.keys['_touchLeft'] = false;
        expect(ship.angle).toBeLessThan(initialAngle);
    });

    test('le vaisseau tourne à droite avec _touchRight', () => {
        const ship = game.getShip();
        const initialAngle = ship.angle;
        game.keys['_touchRight'] = true;
        game.updateShip(1);
        game.keys['_touchRight'] = false;
        expect(ship.angle).toBeGreaterThan(initialAngle);
    });

    test('touchstart zone gauche active _touchLeft', () => {
        const canvas = document.getElementById('gameCanvas');
        const touchEvent = new TouchEvent('touchstart', {
            touches: [new Touch({
                identifier: 0,
                target: canvas,
                clientX: 50,  // Tiers gauche (< 800/3 ≈ 267)
                clientY: 300,
            })],
            cancelable: true,
        });
        canvas.dispatchEvent(touchEvent);
        expect(game.keys['_touchLeft']).toBe(true);
        expect(game.keys['_touchRight']).toBe(false);
    });

    test('touchstart zone droite active _touchRight', () => {
        const canvas = document.getElementById('gameCanvas');
        const touchEvent = new TouchEvent('touchstart', {
            touches: [new Touch({
                identifier: 0,
                target: canvas,
                clientX: 700,  // Tiers droit (> 800*2/3 ≈ 533)
                clientY: 300,
            })],
            cancelable: true,
        });
        canvas.dispatchEvent(touchEvent);
        expect(game.keys['_touchRight']).toBe(true);
        expect(game.keys['_touchLeft']).toBe(false);
    });

    test('touchstart zone centre tire un projectile', () => {
        const canvas = document.getElementById('gameCanvas');
        const touchEvent = new TouchEvent('touchstart', {
            touches: [new Touch({
                identifier: 0,
                target: canvas,
                clientX: 400,  // Centre (entre 267 et 533)
                clientY: 300,
            })],
            cancelable: true,
        });
        canvas.dispatchEvent(touchEvent);
        expect(game.getBullets().length).toBe(1);
        expect(game.keys['_touchLeft']).toBe(false);
        expect(game.keys['_touchRight']).toBe(false);
    });

    test('touchend réinitialise les contrôles tactiles', () => {
        game.keys['_touchLeft'] = true;
        game.keys['_touchRight'] = true;
        const canvas = document.getElementById('gameCanvas');
        const touchEndEvent = new TouchEvent('touchend', {
            touches: [],
            cancelable: true,
        });
        canvas.dispatchEvent(touchEndEvent);
        expect(game.keys['_touchLeft']).toBe(false);
        expect(game.keys['_touchRight']).toBe(false);
    });

    test('touchcancel réinitialise les contrôles tactiles', () => {
        game.keys['_touchLeft'] = true;
        game.keys['_touchRight'] = true;
        const canvas = document.getElementById('gameCanvas');
        const touchCancelEvent = new TouchEvent('touchcancel', {
            touches: [],
            cancelable: true,
        });
        canvas.dispatchEvent(touchCancelEvent);
        expect(game.keys['_touchLeft']).toBe(false);
        expect(game.keys['_touchRight']).toBe(false);
    });

    test('touchmove vers la zone gauche change la direction', () => {
        const canvas = document.getElementById('gameCanvas');
        // D'abord un touchstart dans la zone droite
        game.touchState.active = true;
        const touchMoveEvent = new TouchEvent('touchmove', {
            touches: [new Touch({
                identifier: 0,
                target: canvas,
                clientX: 50,  // Zone gauche
                clientY: 300,
            })],
            cancelable: true,
        });
        canvas.dispatchEvent(touchMoveEvent);
        expect(game.keys['_touchLeft']).toBe(true);
        expect(game.keys['_touchRight']).toBe(false);
    });

    test('touchmove vers la zone droite change la direction', () => {
        const canvas = document.getElementById('gameCanvas');
        game.touchState.active = true;
        const touchMoveEvent = new TouchEvent('touchmove', {
            touches: [new Touch({
                identifier: 0,
                target: canvas,
                clientX: 700,  // Zone droite
                clientY: 300,
            })],
            cancelable: true,
        });
        canvas.dispatchEvent(touchMoveEvent);
        expect(game.keys['_touchRight']).toBe(true);
        expect(game.keys['_touchLeft']).toBe(false);
    });
});

describe('Contrôles PC - clavier', () => {
    beforeEach(() => {
        game.startGame();
    });

    test('keydown enregistre la touche dans keys', () => {
        const event = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
        window.dispatchEvent(event);
        expect(game.keys['ArrowLeft']).toBe(true);
    });

    test('keyup libère la touche dans keys', () => {
        const downEvent = new KeyboardEvent('keydown', { code: 'ArrowRight' });
        const upEvent = new KeyboardEvent('keyup', { code: 'ArrowRight' });
        window.dispatchEvent(downEvent);
        expect(game.keys['ArrowRight']).toBe(true);
        window.dispatchEvent(upEvent);
        expect(game.keys['ArrowRight']).toBe(false);
    });

    test('Space déclenche un tir pendant le jeu', () => {
        game.setBullets([]);
        game.state.lastBulletTime = 0;
        const event = new KeyboardEvent('keydown', {
            code: 'Space',
            cancelable: true,
        });
        window.dispatchEvent(event);
        expect(game.getBullets().length).toBe(1);
    });

    test('KeyP déclenche la pause', () => {
        expect(game.state.gamePaused).toBe(false);
        const event = new KeyboardEvent('keydown', { code: 'KeyP' });
        window.dispatchEvent(event);
        expect(game.state.gamePaused).toBe(true);
    });

    test('KeyP reprend le jeu après pause', () => {
        const pauseEvent = new KeyboardEvent('keydown', { code: 'KeyP' });
        window.dispatchEvent(pauseEvent);
        expect(game.state.gamePaused).toBe(true);
        window.dispatchEvent(pauseEvent);
        expect(game.state.gamePaused).toBe(false);
    });
});

describe('Contrôles PC - souris', () => {
    beforeEach(() => {
        game.startGame();
        game.setBullets([]);
        game.state.lastBulletTime = 0;
    });

    test('mousedown sur le canvas tire un projectile', () => {
        const canvas = document.getElementById('gameCanvas');
        const event = new MouseEvent('mousedown', { button: 0 });
        canvas.dispatchEvent(event);
        expect(game.getBullets().length).toBe(1);
    });
});

describe('Pause du jeu', () => {
    beforeEach(() => {
        game.startGame();
    });

    test('togglePause met le jeu en pause', () => {
        game.togglePause();
        expect(game.state.gamePaused).toBe(true);
    });

    test('togglePause reprend le jeu', () => {
        game.togglePause();
        game.togglePause();
        expect(game.state.gamePaused).toBe(false);
    });

    test('le tir est bloqué pendant la pause', () => {
        game.togglePause();
        game.setBullets([]);
        game.state.lastBulletTime = 0;

        // Essayer de tirer via Space pendant la pause
        const event = new KeyboardEvent('keydown', {
            code: 'Space',
            cancelable: true,
        });
        window.dispatchEvent(event);
        expect(game.getBullets().length).toBe(0);
    });
});

describe('Game Over', () => {
    beforeEach(() => {
        game.startGame();
    });

    test('triggerGameOver arrête le jeu', () => {
        game.triggerGameOver();
        expect(game.state.gameOver).toBe(true);
        expect(game.state.gameRunning).toBe(false);
    });

    test('triggerGameOver sauvegarde le high score', () => {
        game.state.score = 999;
        game.state.highScore = 0;
        game.triggerGameOver();
        expect(game.state.highScore).toBe(999);
    });

    test('game over quand les vies tombent à 0', () => {
        game.state.lives = 0;
        // Simulate: triggerGameOver est appelé quand state.lives <= 0
        game.triggerGameOver();
        expect(game.state.gameOver).toBe(true);
    });
});

describe('Système de vagues', () => {
    beforeEach(() => {
        game.startGame();
    });

    test('completeWave ajoute un bonus de score', () => {
        const scoreBefore = game.state.score;
        game.completeWave();
        expect(game.state.score).toBe(scoreBefore + game.CONFIG.WAVE_BONUS);
    });

    test('completeWave marque la vague comme terminée', () => {
        game.completeWave();
        expect(game.state.waveComplete).toBe(true);
    });

    test('completeWave ne s\'exécute qu\'une fois', () => {
        const scoreBefore = game.state.score;
        game.completeWave();
        game.completeWave(); // Deuxième appel ne devrait rien faire
        expect(game.state.score).toBe(scoreBefore + game.CONFIG.WAVE_BONUS);
    });
});

describe('Redimensionnement du canvas', () => {
    test('resizeCanvas ajuste les dimensions', () => {
        window.innerWidth = 1024;
        window.innerHeight = 768;
        game.resizeCanvas();
        const canvas = document.getElementById('gameCanvas');
        expect(canvas.width).toBe(1024);
        expect(canvas.height).toBe(768);
    });

    test('resizeCanvas recalcule les paramètres planète', () => {
        window.innerWidth = 500;
        window.innerHeight = 400;
        game.resizeCanvas();
        const minDim = Math.min(500, 400);
        expect(game.CONFIG.PLANET_RADIUS).toBeCloseTo(minDim * 0.08, 0);
    });

    test('resizeCanvas fonctionne avec des dimensions mobiles', () => {
        // iPhone SE dimensions
        window.innerWidth = 375;
        window.innerHeight = 667;
        game.resizeCanvas();
        const canvas = document.getElementById('gameCanvas');
        expect(canvas.width).toBe(375);
        expect(canvas.height).toBe(667);
        expect(game.CONFIG.PLANET_RADIUS).toBeGreaterThan(0);
    });

    test('resizeCanvas fonctionne en mode paysage mobile', () => {
        window.innerWidth = 667;
        window.innerHeight = 375;
        game.resizeCanvas();
        const canvas = document.getElementById('gameCanvas');
        expect(canvas.width).toBe(667);
        expect(canvas.height).toBe(375);
    });
});

describe('Fond étoilé', () => {
    test('generateStars crée le bon nombre d\'étoiles', () => {
        game.resizeCanvas();
        game.generateStars();
        expect(game.getStars().length).toBe(game.CONFIG.STAR_COUNT);
    });

    test('generateStars crée des nébuleuses', () => {
        game.resizeCanvas();
        game.generateStars();
        expect(game.getNebulae().length).toBe(game.CONFIG.NEBULA_COUNT);
    });

    test('les étoiles ont des propriétés de scintillement', () => {
        game.resizeCanvas();
        game.generateStars();
        const star = game.getStars()[0];
        expect(star.twinkleSpeed).toBeDefined();
        expect(star.twinkleOffset).toBeDefined();
        expect(star.brightness).toBeDefined();
    });
});

describe('Particules et effets', () => {
    beforeEach(() => {
        game.startGame();
    });

    test('createExplosion génère des particules', () => {
        game.setParticles([]);
        game.createExplosion(400, 300, false, '#ff6600');
        expect(game.getParticles().length).toBeGreaterThan(0);
    });

    test('createExplosion génère plus de particules pour gros astéroïdes', () => {
        game.setParticles([]);
        game.createExplosion(400, 300, false, '#ff6600');
        const smallCount = game.getParticles().length;

        game.setParticles([]);
        game.createExplosion(400, 300, true, '#ff6600');
        const largeCount = game.getParticles().length;

        expect(largeCount).toBeGreaterThan(smallCount);
    });

    test('createFloatingText crée un texte', () => {
        game.setFloatingTexts([]);
        game.createFloatingText(400, 300, '+10', '#00ffff');
        expect(game.getFloatingTexts().length).toBe(1);
        expect(game.getFloatingTexts()[0].text).toBe('+10');
    });

    test('updateParticles supprime les particules expirées', () => {
        game.setParticles([{
            x: 100, y: 100, vx: 1, vy: 1, life: 0, maxLife: 40, size: 2, color: '#fff',
        }]);
        game.updateParticles();
        expect(game.getParticles().length).toBe(0);
    });

    test('updateFloatingTexts supprime les textes expirés', () => {
        game.setFloatingTexts([{
            x: 100, y: 100, text: '+10', color: '#fff', life: 0, maxLife: 60, vy: -1.5,
        }]);
        game.updateFloatingTexts();
        expect(game.getFloatingTexts().length).toBe(0);
    });
});

describe('Affichage du score et des vies', () => {
    beforeEach(() => {
        game.startGame();
    });

    test('updateScoreDisplay met à jour le DOM', () => {
        game.state.score = 42;
        game.updateScoreDisplay();
        expect(document.getElementById('score').textContent).toBe('42');
    });

    test('updateScoreDisplay met à jour le high score si dépassé', () => {
        game.state.highScore = 10;
        game.state.score = 50;
        game.updateScoreDisplay();
        expect(game.state.highScore).toBe(50);
    });

    test('updateLivesDisplay affiche les cœurs', () => {
        game.state.lives = 2;
        game.updateLivesDisplay();
        const livesText = document.getElementById('lives').textContent;
        expect(livesText).toContain('❤️');
        expect(livesText).toContain('🖤');
    });

    test('updateLivesDisplay affiche 0 vies', () => {
        game.state.lives = 0;
        game.updateLivesDisplay();
        const livesText = document.getElementById('lives').textContent;
        expect(livesText).not.toContain('❤️');
    });
});

describe('Compatibilité multi-plateformes', () => {
    test('le viewport meta est configuré pour mobile', () => {
        // Vérifier que le HTML a le bon viewport meta
        // (Ceci est un test de configuration, vérifié via le fichier HTML)
        const fs = require('fs');
        const html = fs.readFileSync(
            require('path').join(__dirname, '..', 'index.html'),
            'utf8'
        );
        expect(html).toContain('width=device-width');
        expect(html).toContain('initial-scale=1.0');
        expect(html).toContain('user-scalable=no');
    });

    test('les boutons sont accessibles sur mobile (taille suffisante)', () => {
        const fs = require('fs');
        const css = fs.readFileSync(
            require('path').join(__dirname, '..', 'style.css'),
            'utf8'
        );
        // Vérifier que les boutons ont un padding suffisant
        expect(css).toContain('.btn');
        expect(css).toContain('padding');
    });

    test('le CSS responsive est présent', () => {
        const fs = require('fs');
        const css = fs.readFileSync(
            require('path').join(__dirname, '..', 'style.css'),
            'utf8'
        );
        expect(css).toContain('@media');
        expect(css).toContain('max-width: 600px');
    });

    test('les instructions mobiles sont présentes dans le HTML', () => {
        const fs = require('fs');
        const html = fs.readFileSync(
            require('path').join(__dirname, '..', 'index.html'),
            'utf8'
        );
        expect(html).toContain('mobile-controls-info');
        expect(html).toContain('📱');
    });

    test('le canvas occupe 100% de l\'écran', () => {
        const fs = require('fs');
        const css = fs.readFileSync(
            require('path').join(__dirname, '..', 'style.css'),
            'utf8'
        );
        expect(css).toContain('#gameCanvas');
        expect(css).toContain('width: 100%');
        expect(css).toContain('height: 100%');
    });

    test('overflow est caché (pas de défilement)', () => {
        const fs = require('fs');
        const css = fs.readFileSync(
            require('path').join(__dirname, '..', 'style.css'),
            'utf8'
        );
        expect(css).toContain('overflow: hidden');
    });

    test('le CSS utilise clamp pour les tailles de police', () => {
        const fs = require('fs');
        const css = fs.readFileSync(
            require('path').join(__dirname, '..', 'style.css'),
            'utf8'
        );
        expect(css).toContain('clamp(');
    });
});

describe('Boutons de l\'interface', () => {
    test('le bouton JOUER existe', () => {
        expect(document.getElementById('playBtn')).toBeTruthy();
    });

    test('le bouton REPRENDRE existe', () => {
        expect(document.getElementById('resumeBtn')).toBeTruthy();
    });

    test('le bouton REJOUER existe', () => {
        expect(document.getElementById('replayBtn')).toBeTruthy();
    });

    test('le bouton MENU existe', () => {
        expect(document.getElementById('menuBtn')).toBeTruthy();
    });
});

describe('Gestion du localStorage (persistance du high score)', () => {
    test('le high score est sauvegardé dans localStorage', () => {
        game.startGame();
        game.state.score = 500;
        game.state.highScore = 0;
        game.triggerGameOver();
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'spaceDefenderHighScore',
            500
        );
    });
});

describe('Intégration - Cycle de jeu complet', () => {
    test('démarrage → tir → pause → reprise → game over', () => {
        // Démarrage
        game.startGame();
        expect(game.state.gameRunning).toBe(true);

        // Tir
        game.setBullets([]);
        game.state.lastBulletTime = 0;
        game.fireBullet();
        expect(game.getBullets().length).toBe(1);

        // Pause
        game.togglePause();
        expect(game.state.gamePaused).toBe(true);

        // Reprise
        game.togglePause();
        expect(game.state.gamePaused).toBe(false);

        // Game Over
        game.state.lives = 0;
        game.triggerGameOver();
        expect(game.state.gameOver).toBe(true);
        expect(game.state.gameRunning).toBe(false);
    });

    test('redémarrage après game over réinitialise tout', () => {
        game.startGame();
        game.state.score = 100;
        game.state.lives = 1;
        game.state.wave = 5;
        game.triggerGameOver();

        // Redémarrage
        game.startGame();
        expect(game.state.score).toBe(0);
        expect(game.state.lives).toBe(3);
        expect(game.state.wave).toBe(1);
        expect(game.state.gameRunning).toBe(true);
    });
});
