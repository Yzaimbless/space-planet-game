# 🚀 Space Planet Defender

> **Défends ta planète contre les astéroïdes dans cet intense jeu spatial !**

![Space Planet Defender](https://img.shields.io/badge/HTML5-Canvas-orange?style=for-the-badge&logo=html5)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-yellow?style=for-the-badge&logo=javascript)
![CSS3](https://img.shields.io/badge/CSS3-Animations-blue?style=for-the-badge&logo=css3)

---

## 🎮 Description

**Space Planet Defender** est un jeu de tir spatial jouable directement dans le navigateur, sans installation. Tu contrôles un vaisseau qui orbite autour d'une planète et tu dois la défendre contre des vagues d'astéroïdes qui arrivent de toutes parts.

```
 ☄️  ← astéroïdes venant de l'espace
   \  |  /
    \ | /
🚀---🌍---🚀  ← vaisseau en orbite
    / | \
   /  |  \
 ☄️       ☄️
```

---

## 🕹️ Contrôles

| Touche | Action |
|--------|--------|
| `←` / `A` | Orbiter à gauche |
| `→` / `D` | Orbiter à droite |
| `ESPACE` ou `Clic souris` | Tirer un projectile |
| `P` | Pause / Reprendre |

---

## 🎯 Comment jouer

1. **Lance le jeu** en ouvrant `index.html` dans ton navigateur
2. **Déplace ton vaisseau** autour de la planète avec les flèches ou A/D
3. **Tire** sur les astéroïdes avant qu'ils n'atteignent la planète
4. **Survie** le plus longtemps possible — les vagues s'accélèrent !
5. **Défends** les 3 points de vie de ta planète ❤️❤️❤️

---

## 🏆 Système de score

| Action | Points |
|--------|--------|
| Petit astéroïde détruit | +10 pts |
| Gros astéroïde détruit | +25 pts |
| Vague complétée | +100 pts |

Le meilleur score est sauvegardé automatiquement dans ton navigateur.

---

## 🎨 Caractéristiques

- 🌟 **200 étoiles scintillantes** avec effet de parallaxe
- 🌌 **Nébuleuses colorées** en arrière-plan
- 🪐 **Planète animée** avec anneaux style Saturne (change de couleur selon les dégâts)
- 🚀 **Vaisseau avec flamme de propulsion** animée
- ☄️ **Astéroïdes de formes irrégulières** en rotation (2 tailles)
- 💥 **Explosions en particules** à chaque destruction
- 📈 **Difficulté progressive** — les vagues deviennent de plus en plus intenses
- 📱 **Responsive** — fonctionne sur toutes tailles d'écran

---

## 💻 Jouer localement

### Méthode simple

1. Clone ou télécharge ce dépôt
2. Ouvre `index.html` dans ton navigateur préféré

```bash
git clone https://github.com/Yzaimbless/space-planet-game.git
cd space-planet-game
# Ouvre index.html dans ton navigateur
```

### Avec un serveur local (recommandé)

```bash
# Avec Python
python -m http.server 8000
# Puis ouvre http://localhost:8000

# Avec Node.js / npx
npx serve .
```

---

## 📁 Structure des fichiers

```
space-planet-game/
├── index.html    → Page principale du jeu (HTML + structure)
├── style.css     → Styles, animations et écrans CSS
├── game.js       → Logique complète du jeu (Canvas + Game Loop)
├── README.md     → Cette documentation
└── LICENSE       → Licence MIT
```

---

## 🛠️ Technologies utilisées

- **HTML5 Canvas** — Rendu graphique du jeu
- **JavaScript ES6+** — Logique du jeu (vanilla, aucune dépendance)
- **CSS3** — Interface, animations et écrans
- **Google Fonts** — Police "Orbitron" (thème spatial)
- **localStorage** — Sauvegarde du meilleur score

---

## 📜 Licence

MIT — Libre d'utilisation et de modification.
