# Three.js Roguelite Game

A web-based 3D third-person roguelite where players survive waves of enemies in a confined arena.

## Project Overview

This game is a roguelite with the following features:
- Third-person 3D action gameplay
- Survive waves of enemies
- Auto-attack nearby enemies
- Level up and select new skills
- No permanent progression between runs

## How to Run

Since this project uses ES Modules, it needs to be served from a web server. You can:

1. Use a local server:
   - For VSCode: Install the "Live Server" extension and click "Go Live"
   - Use Python: `python -m http.server`
   - Use Node.js: Install `serve` globally (`npm install -g serve`) and run `serve`

2. Or simply open the project in VSCode with the Live Server extension installed, right-click on the index.html file, and select "Open with Live Server"

## Controls

- WASD: Move the player
- Mouse (right-click and drag): Rotate camera
- Spacebar: Start the game

## Gameplay

1. Use WASD to move around the arena
2. Your character will automatically attack the nearest enemy in range
3. Defeat enemies to gain experience and level up
4. When you level up, choose one of three random skills to enhance your character
5. Survive as many waves as possible!

## Development Plan

This project is being developed in phases:
1. Project Setup & Basic Environment ✓
2. Player Character ✓
3. Combat System - Basics ✓
4. Wave System ✓
5. Progression & Skills ✓
6. Enemy Variety
7. Game Loop & UI ✓
8. Audio & Visual Polish
9. Optimization & Testing
10. Additional Features

## Technologies

- Three.js - 3D rendering
- JavaScript (ES6+) 