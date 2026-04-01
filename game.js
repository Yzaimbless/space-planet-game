/**
 * Space Planet Defender - Logique du jeu
 * Un jeu spatial où le joueur défend une planète contre des astéroïdes
 */

'use strict';

// ===========================
// Configuration du jeu
// ===========================
const CONFIG = {
    // Planète
    PLANET_RADIUS: 60,
    PLANET_ORBIT_RADIUS: 110,

    // Vaisseau
    SHIP_SIZE: 18,
    SHIP_SPEED: 0.03,         // Vitesse de rotation orbitale (radians/frame)
    SHIP_ORBIT_RADIUS: 110,   // Rayon d'orbite du vaisseau

    // Projectiles
    BULLET_SPEED: 8,
    BULLET_COOLDOWN: 250,     // ms entre deux tirs
    BULLET_RADIUS: 4,
    BULLET_LIFETIME: 120,     // frames

    // Astéroïdes
    ASTEROID_SMALL_RADIUS: 15,
    ASTEROID_LARGE_RADIUS: 28,
    ASTEROID_SMALL_SPEED: 1.5,
    ASTEROID_LARGE_SPEED: 0.8,
    ASTEROID_SMALL_HEALTH: 1,
    ASTEROID_LARGE_HEALTH: 3,
    ASTEROID_SMALL_POINTS: 10,
    ASTEROID_LARGE_POINTS: 25,

    // Vagues
    WAVE_BONUS: 100,
    INITIAL_WAVE_INTERVAL: 4000,   // ms entre l'apparition des astéroïdes
    WAVE_SPAWN_COUNT_BASE: 3,      // Astéroïdes par vague au départ

    // Particules
    PARTICLE_COUNT_SMALL: 8,
    PARTICLE_COUNT_LARGE: 15,
    PARTICLE_LIFETIME: 40,

    // Étoiles
    STAR_COUNT: 200,
    NEBULA_COUNT: 4,
};

// ===========================
// État du jeu
// ===========================
const state = {
    score: 0,
    highScore: 0,
    lives: 3,
    wave: 1,
    gameRunning: false,
    gamePaused: false,
    gameOver: false,
    lastBulletTime: 0,
    lastAsteroidTime: 0,
    asteroidInterval: CONFIG.INITIAL_WAVE_INTERVAL,
    asteroidsInWave: CONFIG.WAVE_SPAWN_COUNT_BASE,
    asteroidsDestroyedInWave: 0,
    asteroidsSpawnedInWave: 0,
    waveComplete: false,
    waveCompleteTimer: 0,
    planetDamageFlash: 0,     // Durée du flash rouge sur la planète
    planetRotation: 0,        // Rotation lente de la planète
};

// ===========================
// Références DOM
// ===========================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const titleScreen = document.getElementById('titleScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const hud = document.getElementById('hud');

const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const highScoreDisplayGO = document.getElementById('highScoreGO');
const waveDisplay = document.getElementById('wave');
const livesDisplay = document.getElementById('lives');
const finalScoreDisplay = document.getElementById('finalScore');
const newRecordEl = document.getElementById('newRecord');
const motivatingMsgEl = document.getElementById('motivatingMsg');

// ===========================
// Objets du jeu
// ===========================
let ship = {};
let bullets = [];
let asteroids = [];
let particles = [];
let floatingTexts = [];
let stars = [];
let nebulae = [];

// ===========================
// Redimensionnement du canvas
// ===========================
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Recalcul des paramètres en fonction de la taille
    const minDim = Math.min(canvas.width, canvas.height);
    CONFIG.PLANET_RADIUS = minDim * 0.08;
    CONFIG.SHIP_ORBIT_RADIUS = CONFIG.PLANET_RADIUS + minDim * 0.065;
    CONFIG.PLANET_ORBIT_RADIUS = CONFIG.SHIP_ORBIT_RADIUS;

    // Régénération des étoiles si nécessaire
    if (stars.length === 0) {
        generateStars();
    }
}

// ===========================
// Génération du fond étoilé
// ===========================
function generateStars() {
    stars = [];
    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.8 + 0.2,
            brightness: Math.random(),
            twinkleSpeed: Math.random() * 0.03 + 0.01,
            twinkleOffset: Math.random() * Math.PI * 2,
            // Parallaxe : les étoiles plus petites bougent moins vite
            parallaxFactor: Math.random() * 0.3 + 0.7,
        });
    }

    nebulae = [];
    const nebulaColors = [
        'rgba(136, 0, 255, 0.08)',
        'rgba(0, 100, 255, 0.06)',
        'rgba(255, 50, 150, 0.06)',
        'rgba(0, 255, 200, 0.05)',
    ];
    for (let i = 0; i < CONFIG.NEBULA_COUNT; i++) {
        nebulae.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 200 + 100,
            color: nebulaColors[i % nebulaColors.length],
        });
    }
}

// ===========================
// Initialisation du vaisseau
// ===========================
function initShip() {
    ship = {
        angle: -Math.PI / 2,  // Démarre en haut
        orbitRadius: CONFIG.SHIP_ORBIT_RADIUS,
        size: CONFIG.SHIP_SIZE,
        rotationSpeed: 0,
        rotationDir: 0,       // -1 gauche, 0 rien, 1 droite
        thrustIntensity: 0,   // Pour l'animation de la flamme
    };
}

// ===========================
// Création d'un astéroïde
// ===========================
function createAsteroid() {
    const isLarge = Math.random() < 0.35;
    const radius = isLarge ? CONFIG.ASTEROID_LARGE_RADIUS : CONFIG.ASTEROID_SMALL_RADIUS;
    const speed = isLarge ? CONFIG.ASTEROID_LARGE_SPEED : CONFIG.ASTEROID_SMALL_SPEED;

    // Accélération progressive selon la vague
    const waveMultiplier = 1 + (state.wave - 1) * 0.15;

    // Position de départ : bords aléatoires de l'écran
    const spawnSide = Math.floor(Math.random() * 4);
    let x, y;
    const margin = radius + 10;

    switch (spawnSide) {
        case 0: x = Math.random() * canvas.width; y = -margin; break;
        case 1: x = canvas.width + margin; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + margin; break;
        case 3: x = -margin; y = Math.random() * canvas.height; break;
    }

    // Direction vers le centre (avec légère déviation)
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const deviation = (Math.random() - 0.5) * 0.4;
    const angle = Math.atan2(cy - y, cx - x) + deviation;

    // Génération de la forme irrégulière
    const vertices = [];
    const numVertices = Math.floor(Math.random() * 4) + 6;
    for (let i = 0; i < numVertices; i++) {
        const a = (i / numVertices) * Math.PI * 2;
        const r = radius * (0.7 + Math.random() * 0.5);
        vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }

    // Couleur aléatoire (gris/brun/rouge)
    const colors = ['#8B7355', '#A0937D', '#8B4513', '#696969', '#808080', '#6B4226'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    return {
        x,
        y,
        radius,
        speed: speed * waveMultiplier,
        angle,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        vertices,
        isLarge,
        health: isLarge ? CONFIG.ASTEROID_LARGE_HEALTH : CONFIG.ASTEROID_SMALL_HEALTH,
        maxHealth: isLarge ? CONFIG.ASTEROID_LARGE_HEALTH : CONFIG.ASTEROID_SMALL_HEALTH,
        color,
        hitFlash: 0,
    };
}

// ===========================
// Création d'une explosion de particules
// ===========================
function createExplosion(x, y, isLarge, color) {
    const count = isLarge ? CONFIG.PARTICLE_COUNT_LARGE : CONFIG.PARTICLE_COUNT_SMALL;
    for (let i = 0; i < count; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = Math.random() * 4 + 1;
        const size = Math.random() * 4 + 1;
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: CONFIG.PARTICLE_LIFETIME,
            maxLife: CONFIG.PARTICLE_LIFETIME,
            size,
            color: color || '#ff6600',
            type: 'explosion',
        });
    }

    // Étincelles supplémentaires (cyan)
    for (let i = 0; i < count / 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: CONFIG.PARTICLE_LIFETIME * 0.6,
            maxLife: CONFIG.PARTICLE_LIFETIME * 0.6,
            size: Math.random() * 2 + 0.5,
            color: '#00ffff',
            type: 'spark',
        });
    }
}

// ===========================
// Texte flottant (+10, +25, etc.)
// ===========================
function createFloatingText(x, y, text, color) {
    floatingTexts.push({
        x,
        y,
        text,
        color: color || '#00ffff',
        life: 60,
        maxLife: 60,
        vy: -1.5,
    });
}

// ===========================
// Tirer un projectile
// ===========================
function fireBullet() {
    const now = Date.now();
    if (now - state.lastBulletTime < CONFIG.BULLET_COOLDOWN) return;
    state.lastBulletTime = now;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Position de départ : bout du vaisseau
    const shipX = cx + Math.cos(ship.angle) * ship.orbitRadius;
    const shipY = cy + Math.sin(ship.angle) * ship.orbitRadius;

    // Direction : vers l'extérieur (depuis le centre)
    const bulletAngle = ship.angle;
    const bulletColor = Math.random() > 0.5 ? '#00ffff' : '#ffff00';

    bullets.push({
        x: shipX,
        y: shipY,
        vx: Math.cos(bulletAngle) * CONFIG.BULLET_SPEED,
        vy: Math.sin(bulletAngle) * CONFIG.BULLET_SPEED,
        radius: CONFIG.BULLET_RADIUS,
        life: CONFIG.BULLET_LIFETIME,
        color: bulletColor,
        trail: [],  // Traîne lumineuse
    });

    // Petite flamme de recul
    ship.thrustIntensity = 1.5;
}

// ===========================
// Détection de collision circulaire
// ===========================
function circleCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < a.radius + b.radius;
}

// ===========================
// Mise à jour des contrôles
// ===========================
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // Pause
    if (e.code === 'KeyP' && state.gameRunning) {
        togglePause();
    }
    // Tir avec espace
    if (e.code === 'Space' && state.gameRunning && !state.gamePaused) {
        e.preventDefault();
        fireBullet();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Tir avec clic souris / tactile
canvas.addEventListener('mousedown', (e) => {
    if (state.gameRunning && !state.gamePaused) {
        fireBullet();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (state.gameRunning && !state.gamePaused) {
        fireBullet();
    }
}, { passive: false });

// ===========================
// Mise à jour du vaisseau
// ===========================
function updateShip(dt) {
    // Détermination de la direction
    let rotating = false;
    if (keys['ArrowLeft'] || keys['KeyA']) {
        ship.angle -= CONFIG.SHIP_SPEED * dt;
        ship.rotationDir = -1;
        rotating = true;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        ship.angle += CONFIG.SHIP_SPEED * dt;
        ship.rotationDir = 1;
        rotating = true;
    }

    if (!rotating) {
        ship.rotationDir *= 0.85; // Amortissement
    }

    // Animation de la flamme
    if (ship.thrustIntensity > 0) {
        ship.thrustIntensity -= 0.1;
    }

    // Flamme continue si on bouge
    if (rotating) {
        ship.thrustIntensity = Math.max(ship.thrustIntensity, 0.6 + Math.random() * 0.4);
    }
}

// ===========================
// Mise à jour des projectiles
// ===========================
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];

        // Sauvegarde de la traîne
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 8) b.trail.shift();

        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        // Suppression si hors écran ou durée de vie écoulée
        if (b.life <= 0 ||
            b.x < -50 || b.x > canvas.width + 50 ||
            b.y < -50 || b.y > canvas.height + 50) {
            bullets.splice(i, 1);
        }
    }
}

// ===========================
// Mise à jour des astéroïdes
// ===========================
function updateAsteroids() {
    const now = Date.now();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Apparition de nouveaux astéroïdes
    const interval = CONFIG.INITIAL_WAVE_INTERVAL / (1 + (state.wave - 1) * 0.2);
    if (now - state.lastAsteroidTime > interval &&
        state.asteroidsSpawnedInWave < state.asteroidsInWave) {
        asteroids.push(createAsteroid());
        state.lastAsteroidTime = now;
        state.asteroidsSpawnedInWave++;
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];

        // Mouvement
        a.x += Math.cos(a.angle) * a.speed;
        a.y += Math.sin(a.angle) * a.speed;
        a.rotation += a.rotationSpeed;

        // Diminution du flash de hit
        if (a.hitFlash > 0) a.hitFlash--;

        // Vérification collision avec la planète
        const distToPlanet = Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2);
        if (distToPlanet < CONFIG.PLANET_RADIUS + a.radius * 0.5) {
            // L'astéroïde touche la planète
            createExplosion(a.x, a.y, a.isLarge, '#ff4400');
            asteroids.splice(i, 1);
            state.lives--;
            state.planetDamageFlash = 30;
            updateLivesDisplay();

            if (state.lives <= 0) {
                triggerGameOver();
            }
            continue;
        }

        // Vérification collision avec les projectiles
        for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j];
            if (circleCollision(a, b)) {
                a.health--;
                a.hitFlash = 8;
                bullets.splice(j, 1);

                if (a.health <= 0) {
                    // Astéroïde détruit
                    const points = a.isLarge ? CONFIG.ASTEROID_LARGE_POINTS : CONFIG.ASTEROID_SMALL_POINTS;
                    state.score += points;
                    updateScoreDisplay();
                    createExplosion(a.x, a.y, a.isLarge, a.color);
                    createFloatingText(a.x, a.y, `+${points}`, a.isLarge ? '#ff6600' : '#00ffff');
                    asteroids.splice(i, 1);
                    state.asteroidsDestroyedInWave++;

                    // Vérification si la vague est terminée
                    if (state.asteroidsDestroyedInWave >= state.asteroidsSpawnedInWave &&
                        state.asteroidsSpawnedInWave >= state.asteroidsInWave) {
                        completeWave();
                    }
                    break;
                }
            }
        }
    }
}

// ===========================
// Vague complétée
// ===========================
function completeWave() {
    if (state.waveComplete) return;
    state.waveComplete = true;
    state.waveCompleteTimer = 180; // 3 secondes

    // Bonus de vague
    state.score += CONFIG.WAVE_BONUS;
    updateScoreDisplay();

    // Texte de bonus au centre
    createFloatingText(
        canvas.width / 2,
        canvas.height / 2 - 50,
        `VAGUE ${state.wave} TERMINÉE ! +${CONFIG.WAVE_BONUS}`,
        '#ffff00'
    );

    // Prochaine vague après un délai
    setTimeout(() => {
        if (!state.gameOver) {
            state.wave++;
            state.asteroidsInWave = CONFIG.WAVE_SPAWN_COUNT_BASE + Math.floor(state.wave * 1.5);
            state.asteroidsDestroyedInWave = 0;
            state.asteroidsSpawnedInWave = 0;
            state.waveComplete = false;
            state.lastAsteroidTime = Date.now();
            waveDisplay.textContent = state.wave;
        }
    }, 3000);
}

// ===========================
// Mise à jour des particules
// ===========================
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life--;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// ===========================
// Mise à jour des textes flottants
// ===========================
function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const t = floatingTexts[i];
        t.y += t.vy;
        t.life--;

        if (t.life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

// ===========================
// Dessin du fond étoilé
// ===========================
function drawBackground(frame) {
    // Fond noir profond
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Nébuleuses
    nebulae.forEach(n => {
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
        gradient.addColorStop(0, n.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Étoiles scintillantes
    stars.forEach((star, i) => {
        const twinkle = 0.5 + 0.5 * Math.sin(frame * star.twinkleSpeed + star.twinkleOffset);
        const alpha = 0.3 + twinkle * 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();

        // Reflet cruciforme pour les étoiles plus grandes
        if (star.radius > 1.2) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(star.x - star.radius * 2, star.y);
            ctx.lineTo(star.x + star.radius * 2, star.y);
            ctx.moveTo(star.x, star.y - star.radius * 2);
            ctx.lineTo(star.x, star.y + star.radius * 2);
            ctx.stroke();
        }
    });
}

// ===========================
// Dessin de la planète
// ===========================
function drawPlanet() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = CONFIG.PLANET_RADIUS;

    // Couleur selon les dégâts
    let planetColor1, planetColor2, planetColor3;
    if (state.lives === 3) {
        planetColor1 = '#1a8a2e';
        planetColor2 = '#2ecc71';
        planetColor3 = '#0d6e23';
    } else if (state.lives === 2) {
        planetColor1 = '#cc7700';
        planetColor2 = '#ff9922';
        planetColor3 = '#995500';
    } else {
        planetColor1 = '#cc2200';
        planetColor2 = '#ff4422';
        planetColor3 = '#991100';
    }

    // Flash rouge si dégâts
    if (state.planetDamageFlash > 0) {
        planetColor1 = '#ff0000';
        planetColor2 = '#ff4444';
        planetColor3 = '#cc0000';
        state.planetDamageFlash--;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.planetRotation);

    // Ombre portée
    ctx.shadowColor = state.planetDamageFlash > 0 ? '#ff0000' : planetColor2;
    ctx.shadowBlur = 25;

    // Corps de la planète
    const planetGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    planetGrad.addColorStop(0, planetColor2);
    planetGrad.addColorStop(0.6, planetColor1);
    planetGrad.addColorStop(1, planetColor3);
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Détails de surface (continents/nuages stylisés)
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    // Continent 1
    ctx.beginPath();
    ctx.ellipse(r * 0.2, -r * 0.3, r * 0.3, r * 0.15, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Continent 2
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, r * 0.2, r * 0.2, r * 0.1, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Reflet de lumière
    const reflectGrad = ctx.createRadialGradient(-r * 0.4, -r * 0.4, 0, -r * 0.4, -r * 0.4, r * 0.6);
    reflectGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    reflectGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = reflectGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    // Anneaux (style Saturne)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.3);

    const ringColors = [
        `rgba(${state.lives === 1 ? '200,100,50' : '100,180,255'}, 0.15)`,
        `rgba(${state.lives === 1 ? '220,120,60' : '120,200,255'}, 0.25)`,
        `rgba(${state.lives === 1 ? '180,80,30' : '80,160,220'}, 0.1)`,
    ];
    const ringRadii = [r * 1.4, r * 1.7, r * 2.0];
    const ringWidths = [r * 0.18, r * 0.12, r * 0.1];

    ringRadii.forEach((rr, idx) => {
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = ringColors[idx];
        ctx.lineWidth = ringWidths[idx];
        ctx.stroke();
    });
    ctx.restore();
}

// ===========================
// Dessin du vaisseau
// ===========================
function drawShip() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const x = cx + Math.cos(ship.angle) * ship.orbitRadius;
    const y = cy + Math.sin(ship.angle) * ship.orbitRadius;
    const size = ship.size;

    // Rotation du vaisseau (pointe vers l'extérieur + inclinaison)
    const rotation = ship.angle + Math.PI / 2 + ship.rotationDir * 0.15;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Flamme de propulsion
    if (ship.thrustIntensity > 0) {
        const flameHeight = size * 1.2 * ship.thrustIntensity;
        const flameGrad = ctx.createLinearGradient(0, 0, 0, flameHeight);
        flameGrad.addColorStop(0, `rgba(255, 150, 0, ${ship.thrustIntensity})`);
        flameGrad.addColorStop(0.5, `rgba(255, 80, 0, ${ship.thrustIntensity * 0.7})`);
        flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(-size * 0.3, 0);
        ctx.lineTo(0, flameHeight * (0.8 + Math.random() * 0.4));
        ctx.lineTo(size * 0.3, 0);
        ctx.fillStyle = flameGrad;
        ctx.fill();
    }

    // Ombre/lueur du vaisseau
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 12;

    // Corps principal (triangle)
    ctx.beginPath();
    ctx.moveTo(0, -size);           // Pointe avant
    ctx.lineTo(-size * 0.6, size * 0.5);  // Coin gauche
    ctx.lineTo(size * 0.6, size * 0.5);   // Coin droit
    ctx.closePath();
    ctx.fillStyle = '#00aaff';
    ctx.fill();
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cabine (petit cercle)
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.fill();

    // Ailes
    ctx.beginPath();
    ctx.moveTo(-size * 0.6, size * 0.5);
    ctx.lineTo(-size * 1.0, size * 0.8);
    ctx.lineTo(-size * 0.2, size * 0.3);
    ctx.fillStyle = '#0066cc';
    ctx.fill();
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size * 0.6, size * 0.5);
    ctx.lineTo(size * 1.0, size * 0.8);
    ctx.lineTo(size * 0.2, size * 0.3);
    ctx.fillStyle = '#0066cc';
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
}

// ===========================
// Dessin des projectiles
// ===========================
function drawBullets() {
    bullets.forEach(b => {
        ctx.save();

        // Traîne lumineuse
        if (b.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(b.trail[0].x, b.trail[0].y);
            for (let i = 1; i < b.trail.length; i++) {
                ctx.lineTo(b.trail[i].x, b.trail[i].y);
            }
            ctx.strokeStyle = b.color.replace(')', ', 0.3)').replace('rgb', 'rgba');
            ctx.lineWidth = b.radius * 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Corps du projectile
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        // Cœur brillant
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
    });
}

// ===========================
// Dessin des astéroïdes
// ===========================
function drawAsteroids() {
    asteroids.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rotation);

        // Flash de hit
        const hitAlpha = a.hitFlash > 0 ? 0.7 : 0;

        // Corps de l'astéroïde
        ctx.beginPath();
        ctx.moveTo(a.vertices[0].x, a.vertices[0].y);
        for (let i = 1; i < a.vertices.length; i++) {
            ctx.lineTo(a.vertices[i].x, a.vertices[i].y);
        }
        ctx.closePath();

        // Couleur selon les dégâts
        const healthRatio = a.health / a.maxHealth;
        const r = parseInt(a.color.slice(1, 3), 16);
        const g = parseInt(a.color.slice(3, 5), 16);
        const blue = parseInt(a.color.slice(5, 7), 16);

        if (hitAlpha > 0) {
            ctx.fillStyle = `rgba(255, ${Math.floor(g * 0.7)}, ${Math.floor(blue * 0.5)}, 1)`;
        } else {
            ctx.fillStyle = a.color;
        }
        ctx.fill();
        ctx.strokeStyle = healthRatio < 0.5 ? '#ff4400' : '#666666';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Reflet
        const refGrad = ctx.createRadialGradient(-a.radius * 0.3, -a.radius * 0.3, 0, 0, 0, a.radius);
        refGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        refGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = refGrad;
        ctx.beginPath();
        ctx.moveTo(a.vertices[0].x, a.vertices[0].y);
        for (let i = 1; i < a.vertices.length; i++) {
            ctx.lineTo(a.vertices[i].x, a.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Barre de vie pour les gros astéroïdes
        if (a.isLarge && a.health < a.maxHealth) {
            const barWidth = a.radius * 1.5;
            const barHeight = 4;
            const barX = -barWidth / 2;
            const barY = a.radius + 5;
            const fillWidth = barWidth * (a.health / a.maxHealth);

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#ff4400';
            ctx.fillRect(barX, barY, fillWidth, barHeight);
        }

        ctx.restore();
    });
}

// ===========================
// Dessin des particules
// ===========================
function drawParticles() {
    particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
    });
}

// ===========================
// Dessin des textes flottants
// ===========================
function drawFloatingTexts() {
    floatingTexts.forEach(t => {
        const alpha = t.life / t.maxLife;
        const scale = 1 + (1 - alpha) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = t.color;
        ctx.font = `bold ${Math.floor(18 * scale)}px Orbitron, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 10;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
    });
}

// ===========================
// Mise à jour des displays HTML
// ===========================
function updateScoreDisplay() {
    scoreDisplay.textContent = state.score;
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('spaceDefenderHighScore', state.highScore);
        highScoreDisplay.textContent = state.highScore;
    }
}

function updateLivesDisplay() {
    const hearts = '❤️'.repeat(Math.max(0, state.lives));
    const emptyHearts = '🖤'.repeat(Math.max(0, 3 - state.lives));
    livesDisplay.textContent = hearts + emptyHearts;
}

// ===========================
// Pause
// ===========================
function togglePause() {
    state.gamePaused = !state.gamePaused;
    if (state.gamePaused) {
        pauseScreen.classList.add('active');
    } else {
        pauseScreen.classList.remove('active');
    }
}

// ===========================
// Game Over
// ===========================
function triggerGameOver() {
    state.gameOver = true;
    state.gameRunning = false;

    // Sauvegarde du high score
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('spaceDefenderHighScore', state.highScore);
    }

    // Mise à jour de l'écran Game Over
    finalScoreDisplay.textContent = state.score;
    highScoreDisplayGO.textContent = state.highScore;

    // Nouveau record ?
    if (state.score >= state.highScore && state.score > 0) {
        newRecordEl.classList.add('visible');
    } else {
        newRecordEl.classList.remove('visible');
    }

    // Message motivant
    const messages = [
        'La planète a besoin de toi ! Réessaie !',
        'Les astéroïdes ont eu raison de toi... cette fois !',
        'La galaxie compte sur toi, soldat !',
        'Défaillance temporaire. Système de relance disponible.',
        'Ta planète se souviendra de ton sacrifice !',
    ];
    motivatingMsgEl.textContent = messages[Math.floor(Math.random() * messages.length)];

    // Afficher l'écran
    setTimeout(() => {
        hud.classList.remove('active');
        gameOverScreen.classList.add('active');
    }, 500);
}

// ===========================
// Démarrage du jeu
// ===========================
function startGame() {
    // Réinitialisation de l'état
    state.score = 0;
    state.lives = 3;
    state.wave = 1;
    state.gameRunning = true;
    state.gamePaused = false;
    state.gameOver = false;
    state.lastBulletTime = 0;
    state.lastAsteroidTime = Date.now();
    state.asteroidsInWave = CONFIG.WAVE_SPAWN_COUNT_BASE;
    state.asteroidsDestroyedInWave = 0;
    state.asteroidsSpawnedInWave = 0;
    state.waveComplete = false;
    state.planetDamageFlash = 0;

    // Réinitialisation des objets
    bullets = [];
    asteroids = [];
    particles = [];
    floatingTexts = [];

    // Initialisation du vaisseau
    initShip();

    // Mise à jour des affichages
    scoreDisplay.textContent = '0';
    highScoreDisplay.textContent = state.highScore;
    waveDisplay.textContent = '1';
    updateLivesDisplay();

    // Changement d'écran
    titleScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    pauseScreen.classList.remove('active');
    hud.classList.add('active');
}

// ===========================
// Boucle de jeu principale
// ===========================
let lastTime = 0;
let frame = 0;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / (1000 / 60), 3); // Delta time normalisé à 60 FPS
    lastTime = timestamp;
    frame++;

    // Rotation lente de la planète
    state.planetRotation += 0.002;

    // Dessin du fond
    drawBackground(frame);
    drawPlanet();

    if (state.gameRunning && !state.gamePaused) {
        // Mise à jour
        updateShip(dt);
        updateBullets();
        updateAsteroids();
        updateParticles();
        updateFloatingTexts();
    }

    // Dessin
    drawAsteroids();
    drawBullets();
    drawShip();
    drawParticles();
    drawFloatingTexts();

    requestAnimationFrame(gameLoop);
}

// ===========================
// Événements des boutons
// ===========================
document.getElementById('playBtn').addEventListener('click', () => {
    startGame();
});

document.getElementById('resumeBtn').addEventListener('click', () => {
    togglePause();
});

document.getElementById('replayBtn').addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    startGame();
});

document.getElementById('menuBtn').addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    hud.classList.remove('active');
    titleScreen.classList.add('active');
    // Mise à jour du high score sur l'écran titre
    document.getElementById('titleHighScore').textContent = state.highScore;
});

// ===========================
// Initialisation
// ===========================
function init() {
    // Chargement du high score
    state.highScore = parseInt(localStorage.getItem('spaceDefenderHighScore')) || 0;
    document.getElementById('titleHighScore').textContent = state.highScore;
    highScoreDisplay.textContent = state.highScore;

    // Redimensionnement initial
    resizeCanvas();
    generateStars();

    // Afficher l'écran titre
    titleScreen.classList.add('active');

    // Lancer la boucle de jeu (pour le fond animé sur l'écran titre)
    requestAnimationFrame(gameLoop);
}

// Redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    resizeCanvas();
});

// Démarrage
init();
