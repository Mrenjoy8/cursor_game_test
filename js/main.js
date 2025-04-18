// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { setupGlobalStyles } from './styles.js';
import { Player } from './player.js';
import { CameraController } from './cameraController.js';
import { UI } from './ui.js';
import { WaveManager } from './waveManager.js';
import { SkillSystem } from './skillSystem.js';
import { MenuUI } from './menuUI.js';

// Game class to handle core functionality
class Game {
    constructor() {
        // Game state
        this.lastTime = 0;
        this.isGameOver = false;
        this.paused = false;
        this.isGameStarted = false;
        
        // Create the renderer first so we can see the menu
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
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
        
        // Store reference to waveManager in scene for components to access
        this.scene.waveManager = this.waveManager;
        
        // Set up UI
        this.ui = new UI(this.player);
        
        // Set up skill system
        this.skillSystem = new SkillSystem(this.player, this);
        
        // Add debugging hooks for boss waves
        this.setupBossWaveDebugging();
        
        // Set up event listeners
        this.setupEventListeners();
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
                this.togglePause();
            }
        });
    }
    
    togglePause() {
        this.paused = !this.paused;
        console.log(`Game ${this.paused ? 'paused' : 'resumed'}`);
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
        
        if (this.isGameStarted) {
            // Game is active
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
        restartBtn.textContent = 'RESTART';
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
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    const game = new Game();
}); 