// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/loaders/GLTFLoader.js';
import { setupGlobalStyles } from './styles.js';
import { Player } from './player.js';
import { CameraController } from './cameraController.js';
import { UI } from './ui.js';
import { WaveManager } from './waveManager.js';
import { SkillSystem } from './skillSystem.js';
import { MenuUI } from './menuUI.js';
import { Projectile } from './projectile.js';
import { HamsterCage } from './hamsterCage.js';
import { EnemyPreloader } from './enemyPreloader.js';
import { BossPreloader } from './bossPreloader.js';

// Game class to handle core functionality
class Game {
    constructor() {
        // Game state
        this.lastTime = 0;
        this.lastUnpauseTime = null;
        this.isGameOver = false;
        this.paused = false;
        this.isGameStarted = false;
        this.savedEnemyStates = null;
        
        // Create the renderer first so we can see the menu
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Disable shadow maps for better performance
        this.renderer.shadowMap.enabled = false;
        document.body.appendChild(this.renderer.domElement);
        
        // Create menu UI
        this.menuUI = new MenuUI(() => this.startGame());
        
        // Set up empty scene for background
        this.setupEmptyScene();
        
        // Start animation loop for menu
        this.animate(0);
        
        // Handle window resizing
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }
    
    setupEmptyScene() {
        // Empty scene for the menu background
        this.scene = new THREE.Scene();
        
        // Basic camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight,
            0.1, 
            1000
        );
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Add some ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Add a directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);
        
        // Create a simple floor
        const floorGeometry = new THREE.PlaneGeometry(60, 60);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x555555,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Add a few decorative elements
        this.createMenuSceneDecorations();
        
        // Add rotation animation to camera for menu scene
        this.menuCameraAngle = 0;
    }
    
    createMenuSceneDecorations() {
        // Create some placeholder enemy shapes for a cool background
        const shapes = [
            { geometry: new THREE.ConeGeometry(0.5, 1.5, 8), color: 0xff0000, y: 0.75 },
            { geometry: new THREE.BoxGeometry(0.8, 0.8, 0.8), color: 0x3498db, y: 0.4 },
            { geometry: new THREE.CylinderGeometry(0.7, 0.7, 1.8, 16), color: 0x2ecc71, y: 0.9 },
            { geometry: new THREE.SphereGeometry(0.5, 16, 16), color: 0x9b59b6, y: 0.5 },
        ];
        
        // Create 20 random enemy shapes positioned around the area
        for (let i = 0; i < 20; i++) {
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const material = new THREE.MeshStandardMaterial({ color: shape.color });
            const mesh = new THREE.Mesh(shape.geometry, material);
            
            // Position randomly in a circle around the center
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 20;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.z = Math.sin(angle) * radius;
            mesh.position.y = shape.y;
            
            // Random rotation
            mesh.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(mesh);
        }
        
        // Add a boss-like shape in the distance
        const bossGeometry = new THREE.SphereGeometry(2, 16, 16);
        const bossMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff3300,
            roughness: 0.7,
            metalness: 0.3
        });
        const boss = new THREE.Mesh(bossGeometry, bossMaterial);
        boss.position.set(0, 2, -15);
        this.scene.add(boss);
        
        // Add spikes to the boss
        const spikeCount = 8;
        for (let i = 0; i < spikeCount; i++) {
            const spikeGeometry = new THREE.ConeGeometry(0.4, 1, 4);
            const spikeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x660000,
                roughness: 0.5,
                metalness: 0.5
            });
            
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            
            // Position around the body
            const angle = (i / spikeCount) * Math.PI * 2;
            spike.position.set(
                Math.cos(angle) * 1.6,
                0,
                Math.sin(angle) * 1.6
            );
            
            // Rotate to point outward
            spike.rotation.x = Math.PI / 2;
            spike.rotation.z = angle + Math.PI;
            
            boss.add(spike);
        }
    }
    
    startGame() {
        // Remove menu UI
        this.menuUI.hide();
        
        // Dispose of menu scene elements
        while(this.scene.children.length > 0) { 
            const object = this.scene.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
            this.scene.remove(object); 
        }
        
        // Set up the gameplay scene
        this.setupGameScene();
        
        // Mark game as started
        this.isGameStarted = true;
    }
    
    setupGameScene() {
        // Set up scene with background image or fallback to black
        this.scene = new THREE.Scene();
        
        // Try to load the background texture
        const textureLoader = new THREE.TextureLoader();
        
        textureLoader.load(
            '/assets/bg_test1.png',
            (texture) => {
                // Success - set the background to the loaded texture
                console.log('Background image loaded successfully');
                this.scene.background = texture;
            },
            undefined, // onProgress callback not needed
            (error) => {
                // Error - fallback to black background
                console.warn('Failed to load background image:', error);
                this.scene.background = new THREE.Color(0x000000);
            }
        );
        
        // Set up lighting
        this.setupLights();
        
        // Create the arena
        this.createArena();
        
        // Initialize player
        this.player = new Player(this.scene);
        
        // Set up camera controller
        this.cameraController = new CameraController(this.camera, this.player);
        
        // Set up wave manager - pass this (the game instance) as third argument
        this.waveManager = new WaveManager(this.scene, this.player, this);
        
        // Set up UI
        this.ui = new UI(this.player);
        
        // Set up skill system
        this.skillSystem = new SkillSystem(this.player, this);
        
        // Use the enemy preloader before initializing the wave manager
        this.initializeGameWithPreloader();
        
        // Add debugging hooks for boss waves
        this.setupBossWaveDebugging();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    initializeGameWithPreloader() {
        console.log("Starting preloading process...");
        
        // Track overall preloading progress
        let preloadingComplete = false;
        
        // Create a function to show the ready message when all preloading is done
        const finishPreloading = () => {
            preloadingComplete = true;
            console.log("All preloading complete - initializing wave manager");
            
            // Now that everything is preloaded, initialize the wave manager
            this.waveManager.initialize();
            
            // Store reference to waveManager in scene for components to access
            this.scene.waveManager = this.waveManager;
            
            // Show a message to press space to start
            this.showStartGameMessage();
        };
        
        // First preload the enemies (most critical for first wave)
        console.log("Step 1: Preloading enemy models...");
        const enemyPreloader = new EnemyPreloader(this.scene, this.player);
        
        // Preload enemies, then when complete, preload bosses
        enemyPreloader.preloadEnemies().then(() => {
            console.log("Enemy preloading complete - starting boss preloading");
            
            // Now preload the boss models
            console.log("Step 2: Preloading boss models...");
            const bossPreloader = new BossPreloader(this.scene, this.player);
            
            // Start boss preloading process - no need to keep a reference anymore
            // since bosses are stored directly in the boss pool
            bossPreloader.preloadBosses().then(() => {
                // All preloading complete
                finishPreloading();
            });
        });
    }
    
    showStartGameMessage() {
        const message = document.createElement('div');
        message.textContent = "PRESS SPACE TO BEGIN";
        message.style.position = 'absolute';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.color = 'var(--light-brown)';
        message.style.fontFamily = '"Exo 2", sans-serif';
        message.style.fontSize = '36px';
        message.style.fontWeight = 'bold';
        message.style.textShadow = '0 0 10px rgba(212, 188, 145, 0.7)';
        message.style.backgroundColor = 'var(--panel-bg)';
        message.style.backdropFilter = 'blur(4px)';
        message.style.borderRadius = '16px';
        message.style.boxShadow = 'var(--shadow)';
        message.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        message.style.padding = '20px 40px';
        message.style.zIndex = '1000';
        message.style.opacity = '1';
        message.style.transition = 'opacity 1s';
        
        // Add pulsing animation
        message.animate(
            [
                { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
                { opacity: 0.8, transform: 'translate(-50%, -50%) scale(1.05)' },
                { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }
            ],
            {
                duration: 1500,
                iterations: Infinity
            }
        );
        
        document.body.appendChild(message);
        
        // Remove when game starts - uses the WaveManager's own start mechanism
        // so we don't need a separate spacebar handler
        const checkWaveActive = () => {
            if (this.waveManager.waveActive) {
                // Wave has started, remove the message
                message.style.opacity = '0';
                setTimeout(() => {
                    if (message.parentNode) {
                        document.body.removeChild(message);
                    }
                }, 1000);
                
                // Stop checking
                clearInterval(checkInterval);
            }
        };
        
        // Check periodically if wave has started
        const checkInterval = setInterval(checkWaveActive, 100);
    }
    
    setupBossWaveDebugging() {
        // For easy debugging in console
        window.game = this;
        
        // Debug log when a wave starts
        const originalStartNextWave = this.waveManager.startNextWave;
        this.waveManager.startNextWave = () => {
            originalStartNextWave.call(this.waveManager);
            
            const waveNum = this.waveManager.currentWave;
            console.log(`Wave ${waveNum} started`);
            
            if (waveNum % this.waveManager.bossWaveFrequency === 0) {
                console.log(`Boss wave detected: ${waveNum}`);
            }
        };
        
        // Debug log for boss spawn
        const originalSpawnBoss = this.waveManager.spawnBoss;
        this.waveManager.spawnBoss = () => {
            console.log("Boss spawn initiated");
            originalSpawnBoss.call(this.waveManager);
        };
    }
    
    setupEventListeners() {
        // Listen for player death
        document.addEventListener('playerDeath', () => {
            this.gameOver();
        });
        
        // Add pause functionality
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape' && this.isGameStarted) {
                // Only toggle with overlay if no skill selection is active
                const skillSelectionVisible = this.skillSystem && 
                    this.skillSystem.container && 
                    this.skillSystem.container.style.display === 'block';
                    
                if (!skillSelectionVisible) {
                    this.togglePause(true); // Show pause overlay
                }
            }
        });
    }
    
    togglePause(showOverlay = true) {
        // If we're about to pause, save enemy positions
        if (!this.paused && this.waveManager && this.waveManager.enemies) {
            // Save position data for all active enemies
            this.savedEnemyStates = this.waveManager.enemies.map(enemy => {
                if (enemy && enemy.mesh) {
                    // Save more comprehensive state
                    return {
                        id: enemy.id,
                        type: enemy.type,
                        position: {
                            x: enemy.mesh.position.x,
                            y: enemy.mesh.position.y,
                            z: enemy.mesh.position.z
                        },
                        rotation: {
                            x: enemy.mesh.rotation.x,
                            y: enemy.mesh.rotation.y,
                            z: enemy.mesh.rotation.z
                        },
                        health: enemy.health,
                        isAlive: enemy.isAlive
                    };
                }
                return null;
            }).filter(state => state !== null);
            
            console.log(`Paused game - saved positions for ${this.savedEnemyStates.length} enemies`);
        }
        
        // Toggle pause state
        this.paused = !this.paused;
        console.log(`Game ${this.paused ? 'paused' : 'resumed'}`);
        
        // Mark time when game is unpaused for smooth delta time calculation
        if (!this.paused) {
            this.lastUnpauseTime = Date.now();
        }
        
        // If we're resuming, restore enemy positions
        if (!this.paused && this.savedEnemyStates && this.waveManager && this.waveManager.enemies) {
            console.log(`Resuming game - restoring positions for ${this.savedEnemyStates.length} enemies`);
            
            // Restore positions for all active enemies
            for (let i = 0; i < this.waveManager.enemies.length; i++) {
                const enemy = this.waveManager.enemies[i];
                
                // Find the saved state for this enemy
                const savedState = this.savedEnemyStates.find(state => state.id === enemy.id);
                
                if (savedState && enemy.mesh) {
                    // Restore the exact position
                    enemy.mesh.position.set(
                        savedState.position.x,
                        savedState.position.y,
                        savedState.position.z
                    );
                    
                    // Restore the exact rotation
                    enemy.mesh.rotation.set(
                        savedState.rotation.x,
                        savedState.rotation.y,
                        savedState.rotation.z
                    );
                    
                    // Restore health if needed
                    if (enemy.health !== savedState.health) {
                        enemy.health = savedState.health;
                    }
                }
            }
            
            // Clear saved states
            this.savedEnemyStates = null;
        }
        
        // Create pause overlay if game is paused and showOverlay is true
        if (this.paused && showOverlay) {
            // Create pause overlay
            this.pauseOverlay = document.createElement('div');
            this.pauseOverlay.style.position = 'absolute';
            this.pauseOverlay.style.top = '0';
            this.pauseOverlay.style.left = '0';
            this.pauseOverlay.style.width = '100%';
            this.pauseOverlay.style.height = '100%';
            this.pauseOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.pauseOverlay.style.display = 'flex';
            this.pauseOverlay.style.justifyContent = 'center';
            this.pauseOverlay.style.alignItems = 'center';
            this.pauseOverlay.style.zIndex = '1000';
            
            // Pause text
            const pauseText = document.createElement('div');
            pauseText.textContent = 'PAUSED';
            pauseText.style.color = 'white';
            pauseText.style.fontSize = '48px';
            pauseText.style.fontFamily = 'Arial, sans-serif';
            pauseText.style.fontWeight = 'bold';
            this.pauseOverlay.appendChild(pauseText);
            
            document.body.appendChild(this.pauseOverlay);
        } else if (this.pauseOverlay) {
            // Remove pause overlay
            document.body.removeChild(this.pauseOverlay);
            this.pauseOverlay = null;
        }
    }
    
    setupLights() {
        // Simple ambient light - stronger since we're using MeshBasicMaterial
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);
        
        // Simple directional light - no shadows for better performance
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 7.5);
        // No shadow casting for better performance
        this.scene.add(directionalLight);
    }
    
    createArena() {
        // Create the hamster cage scene
        this.hamsterCage = new HamsterCage(this.scene);
        
        // Set arena constraints for player/enemies
        // We'll define invisible boundaries that restrict movement
        const arenaWidth = 60;
        const arenaDepth = 60;
        
        // North wall
        const northWall = new THREE.Mesh(
            new THREE.BoxGeometry(arenaWidth, 3, 1),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        northWall.position.set(0, 1.5, -arenaDepth/2);
        northWall.name = "arena-boundary";
        this.scene.add(northWall);
        
        // South wall
        const southWall = new THREE.Mesh(
            new THREE.BoxGeometry(arenaWidth, 3, 1),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        southWall.position.set(0, 1.5, arenaDepth/2);
        southWall.name = "arena-boundary";
        this.scene.add(southWall);
        
        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.BoxGeometry(1, 3, arenaDepth),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        eastWall.position.set(arenaWidth/2, 1.5, 0);
        eastWall.name = "arena-boundary";
        this.scene.add(eastWall);
        
        // West wall
        const westWall = new THREE.Mesh(
            new THREE.BoxGeometry(1, 3, arenaDepth),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        westWall.position.set(-arenaWidth/2, 1.5, 0);
        westWall.name = "arena-boundary";
        this.scene.add(westWall);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate(time) {
        requestAnimationFrame((time) => this.animate(time));
        
        if (this.isGameStarted) {
            // Game is active
            if (this.isGameOver) return;
            
            if (this.paused) {
                // Render the scene even when paused to show the UI
                this.renderer.render(this.scene, this.camera);
                return;
            }
            
            // If the game was just resumed, reset lastTime to prevent huge delta jumps
            if (this.lastUnpauseTime && time - this.lastUnpauseTime < 1000) {
                this.lastTime = time;
                this.lastUnpauseTime = null;
            }
            
            // Calculate delta time for frame-rate independent movement
            const deltaTime = time - this.lastTime;
            this.lastTime = time;
            
            // Cap deltaTime to prevent huge position jumps after long pauses
            const cappedDeltaTime = Math.min(deltaTime, 100);
            
            // Update wave manager
            this.waveManager.update(cappedDeltaTime);
            
            // Update player - pass enemies for auto-targeting
            this.player.update(cappedDeltaTime, this.camera, this.waveManager.enemies);
            
            // Update all projectiles centrally (optimization)
            Projectile.updateAll(cappedDeltaTime);
            
            // Update camera
            this.cameraController.update();
        } else {
            // Menu is active, rotate the camera around the scene
            this.menuCameraAngle += 0.001;
            const radius = 20;
            this.camera.position.x = Math.cos(this.menuCameraAngle) * radius;
            this.camera.position.z = Math.sin(this.menuCameraAngle) * radius;
            this.camera.position.y = 10 + Math.sin(this.menuCameraAngle * 0.5) * 2;
            this.camera.lookAt(0, 0, 0);
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    gameOver() {
        this.isGameOver = true;
        
        // Dispose of gameplay resources
        this.disposeGameResources();
        
        // Create game over UI
        const gameOverContainer = document.createElement('div');
        gameOverContainer.className = 'game-over';
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
        restartBtn.textContent = 'EXIT';
        restartBtn.className = 'menu-button';
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
        
        // Clean up all projectile resources
        Projectile.disposeAll();
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    const game = new Game();
}); 