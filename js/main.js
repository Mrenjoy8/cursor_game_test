// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { Player } from './player.js';
import { CameraController } from './cameraController.js';
import { UI } from './ui.js';
import { WaveManager } from './waveManager.js';
import { SkillSystem } from './skillSystem.js';

// Game class to handle core functionality
class Game {
    constructor() {
        // Game state
        this.lastTime = 0;
        this.isGameOver = false;
        this.paused = false;
        
        // Set up the scene
        this.scene = new THREE.Scene();
        
        // Set up the camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight,
            0.1, 
            1000
        );
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Set up the renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Set up lighting
        this.setupLights();
        
        // Create the arena
        this.createArena();
        
        // Initialize player
        this.player = new Player(this.scene);
        
        // Set up camera controller
        this.cameraController = new CameraController(this.camera, this.player);
        
        // Set up wave manager
        this.waveManager = new WaveManager(this.scene, this.player);
        this.waveManager.initialize();
        
        // Set up UI
        this.ui = new UI(this.player);
        
        // Set up skill system
        this.skillSystem = new SkillSystem(this.player, this);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Handle window resizing
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // Start game loop
        this.animate(0);
    }
    
    setupEventListeners() {
        // Listen for player death
        document.addEventListener('playerDeath', () => {
            this.gameOver();
        });
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        
        // Set up shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 100;
        
        const d = 30;
        directionalLight.shadow.camera.left = -d;
        directionalLight.shadow.camera.right = d;
        directionalLight.shadow.camera.top = d;
        directionalLight.shadow.camera.bottom = -d;
        
        this.scene.add(directionalLight);
    }
    
    createArena() {
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(60, 60);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x555555,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Arena walls
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x777777,
            roughness: 0.7,
            transparent: true,
            opacity: 0.5
        });
        
        // North wall
        const northWall = new THREE.Mesh(
            new THREE.BoxGeometry(60, 3, 1),
            wallMaterial
        );
        northWall.position.set(0, 1.5, -30);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        this.scene.add(northWall);
        
        // South wall
        const southWall = new THREE.Mesh(
            new THREE.BoxGeometry(60, 3, 1),
            wallMaterial
        );
        southWall.position.set(0, 1.5, 30);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        this.scene.add(southWall);
        
        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.BoxGeometry(1, 3, 60),
            wallMaterial
        );
        eastWall.position.set(30, 1.5, 0);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        this.scene.add(eastWall);
        
        // West wall
        const westWall = new THREE.Mesh(
            new THREE.BoxGeometry(1, 3, 60),
            wallMaterial
        );
        westWall.position.set(-30, 1.5, 0);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        this.scene.add(westWall);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate(time) {
        requestAnimationFrame((time) => this.animate(time));
        
        if (this.isGameOver || this.paused) return;
        
        // Calculate delta time for frame-rate independent movement
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        
        // Update wave manager
        this.waveManager.update(deltaTime);
        
        // Update player - pass enemies for auto-targeting
        this.player.update(deltaTime, this.camera, this.waveManager.enemies);
        
        // Update camera
        this.cameraController.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    gameOver() {
        this.isGameOver = true;
        
        // Dispose of gameplay resources
        this.disposeGameResources();
        
        // Create game over UI
        const gameOverContainer = document.createElement('div');
        gameOverContainer.style.position = 'absolute';
        gameOverContainer.style.top = '50%';
        gameOverContainer.style.left = '50%';
        gameOverContainer.style.transform = 'translate(-50%, -50%)';
        gameOverContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        gameOverContainer.style.color = 'white';
        gameOverContainer.style.padding = '30px';
        gameOverContainer.style.borderRadius = '10px';
        gameOverContainer.style.textAlign = 'center';
        gameOverContainer.style.zIndex = '1000';
        document.body.appendChild(gameOverContainer);
        
        // Game over title
        const title = document.createElement('h1');
        title.textContent = 'GAME OVER';
        title.style.margin = '0 0 20px 0';
        title.style.fontSize = '48px';
        title.style.color = '#ff0000';
        gameOverContainer.appendChild(title);
        
        // Stats
        const stats = document.createElement('div');
        stats.style.marginBottom = '30px';
        stats.style.fontSize = '24px';
        gameOverContainer.appendChild(stats);
        
        const waveStat = document.createElement('p');
        waveStat.textContent = `Waves Survived: ${this.waveManager.currentWave}`;
        waveStat.style.margin = '10px 0';
        stats.appendChild(waveStat);
        
        const levelStat = document.createElement('p');
        levelStat.textContent = `Level Reached: ${this.player.level}`;
        levelStat.style.margin = '10px 0';
        stats.appendChild(levelStat);
        
        // Restart button
        const restartBtn = document.createElement('button');
        restartBtn.textContent = 'RESTART';
        restartBtn.style.backgroundColor = '#ff0000';
        restartBtn.style.color = 'white';
        restartBtn.style.border = 'none';
        restartBtn.style.padding = '15px 30px';
        restartBtn.style.fontSize = '24px';
        restartBtn.style.borderRadius = '5px';
        restartBtn.style.cursor = 'pointer';
        restartBtn.style.transition = 'background-color 0.3s';
        restartBtn.addEventListener('mouseover', () => {
            restartBtn.style.backgroundColor = '#cc0000';
        });
        restartBtn.addEventListener('mouseout', () => {
            restartBtn.style.backgroundColor = '#ff0000';
        });
        restartBtn.addEventListener('click', () => {
            location.reload();
        });
        gameOverContainer.appendChild(restartBtn);
    }
    
    disposeGameResources() {
        // Clean up any active intervals or timeouts
        if (this.player.healthRegenInterval) {
            clearInterval(this.player.healthRegenInterval);
        }
        
        // Clean up any projectiles
        for (const projectile of this.player.projectiles) {
            projectile.deactivate();
        }
        this.player.projectiles = [];
        
        // Clean up wave manager
        for (const enemy of this.waveManager.enemies) {
            // For ranged enemies, clean up their projectiles
            if (enemy.projectiles) {
                for (const projectile of enemy.projectiles) {
                    projectile.deactivate();
                }
                enemy.projectiles = [];
            }
        }
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    const game = new Game();
}); 