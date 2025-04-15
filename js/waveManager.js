import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { Enemy, BaseEnemy, BasicEnemy, FastEnemy, TankyEnemy, RangedEnemy, EnemyType, enemyPool } from './enemy.js';

export class WaveManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        this.currentWave = 0;
        this.enemiesRemaining = 0;
        this.enemies = [];
        this.waveActive = false;
        this.timeBetweenWaves = 5000; // 5 seconds between waves
        this.waveTimeout = null;
        
        // Store percentages of enemy types by wave
        this.enemyDistribution = {
            basic: { min: 100, max: 30 },    // Starts at 100%, decreases to 30%
            fast: { min: 0, max: 30 },       // Starts at 0%, increases to 30%
            tanky: { min: 0, max: 20 },      // Starts at 0%, increases to 20%
            ranged: { min: 0, max: 20 }      // Starts at 0%, increases to 20%
        };
        
        // Maximum number of enemies to spawn (increases with wave)
        this.maxEnemies = 30;
        
        // Create wave display
        this.createWaveDisplay();
    }
    
    createWaveDisplay() {
        // Wave display container
        this.waveContainer = document.createElement('div');
        this.waveContainer.style.position = 'absolute';
        this.waveContainer.style.top = '20px';
        this.waveContainer.style.right = '20px';
        this.waveContainer.style.color = 'white';
        this.waveContainer.style.fontFamily = 'Arial, sans-serif';
        this.waveContainer.style.fontSize = '24px';
        this.waveContainer.style.fontWeight = 'bold';
        this.waveContainer.style.textAlign = 'center';
        this.waveContainer.style.padding = '10px 20px';
        this.waveContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.waveContainer.style.borderRadius = '5px';
        this.waveContainer.style.zIndex = '100';
        document.body.appendChild(this.waveContainer);
        
        // Update display
        this.updateWaveDisplay();
    }
    
    updateWaveDisplay() {
        if (this.waveActive) {
            this.waveContainer.textContent = `Wave ${this.currentWave} - Enemies: ${this.enemiesRemaining}`;
        } else if (this.currentWave === 0) {
            this.waveContainer.textContent = 'Press "Space" to Start';
        } else {
            this.waveContainer.textContent = `Wave ${this.currentWave} Complete! Next wave in ${Math.ceil(this.waveCountdown / 1000)}s`;
        }
    }
    
    startGame() {
        if (this.currentWave === 0) {
            this.startNextWave();
            
            // Listen for spacebar to start game
            document.removeEventListener('keydown', this.spacebarHandler);
        }
    }
    
    spacebarHandler = (event) => {
        if (event.code === 'Space' && this.currentWave === 0) {
            this.startGame();
        }
    }
    
    initialize() {
        // Listen for spacebar to start game
        document.addEventListener('keydown', this.spacebarHandler);
    }
    
    startNextWave() {
        this.currentWave++;
        this.waveActive = true;
        
        // Calculate enemies for this wave
        const numEnemies = Math.min(5 + (this.currentWave - 1) * 2, this.maxEnemies);
        this.enemiesRemaining = numEnemies;
        
        // Clear any existing countdown
        if (this.waveTimeout) {
            clearTimeout(this.waveTimeout);
            this.waveTimeout = null;
        }
        
        // Spawn enemies
        this.spawnEnemies(numEnemies);
        
        // Update display
        this.updateWaveDisplay();
        
        // Show wave notification
        this.showWaveNotification();
    }
    
    showWaveNotification() {
        // Create notification element
        const notification = document.createElement('div');
        notification.textContent = `Wave ${this.currentWave}`;
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.color = 'white';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '48px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
        notification.style.zIndex = '200';
        notification.style.opacity = '1';
        notification.style.transition = 'opacity 1s';
        document.body.appendChild(notification);
        
        // Fade out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 1000);
        }, 2000);
    }
    
    getEnemyTypeDistribution() {
        // Calculate the percentage of each enemy type for the current wave
        // The higher the wave, the more advanced enemy types appear
        const waveProgress = Math.min(this.currentWave / 10, 1); // Cap at wave 10 for max diversity
        
        // Calculate percentages of each enemy type based on wave progress
        const distribution = {};
        
        // For each enemy type, linearly interpolate from min to max percentage based on wave progress
        for (const [type, { min, max }] of Object.entries(this.enemyDistribution)) {
            distribution[type] = Math.round(min + (max - min) * waveProgress);
        }
        
        return distribution;
    }
    
    getRandomEnemyType() {
        // Get current distribution of enemy types
        const distribution = this.getEnemyTypeDistribution();
        
        // Convert percentages to ranges for random selection
        const ranges = [];
        let currentTotal = 0;
        
        for (const [type, percentage] of Object.entries(distribution)) {
            if (percentage > 0) {
                ranges.push({
                    type: type,
                    min: currentTotal,
                    max: currentTotal + percentage
                });
                currentTotal += percentage;
            }
        }
        
        // Get random number within the total range
        const random = Math.floor(Math.random() * 100);
        
        // Find which enemy type the random number falls into
        for (const range of ranges) {
            if (random >= range.min && random < range.max) {
                switch (range.type) {
                    case 'basic': return EnemyType.BASIC;
                    case 'fast': return EnemyType.FAST;
                    case 'tanky': return EnemyType.TANKY;
                    case 'ranged': return EnemyType.RANGED;
                    default: return EnemyType.BASIC;
                }
            }
        }
        
        // Default to basic enemy if something goes wrong
        return EnemyType.BASIC;
    }
    
    spawnEnemies(count) {
        const arenaSize = 28; // Slightly smaller than actual arena (30) to keep enemies away from walls
        
        for (let i = 0; i < count; i++) {
            // Delay spawning each enemy to prevent all appearing at once
            setTimeout(() => {
                // Generate random position around the edge of the arena
                let x, z;
                
                // Determine which edge to spawn on (0-3)
                const edge = Math.floor(Math.random() * 4);
                
                switch (edge) {
                    case 0: // North edge
                        x = Math.random() * 2 * arenaSize - arenaSize;
                        z = -arenaSize;
                        break;
                    case 1: // East edge
                        x = arenaSize;
                        z = Math.random() * 2 * arenaSize - arenaSize;
                        break;
                    case 2: // South edge
                        x = Math.random() * 2 * arenaSize - arenaSize;
                        z = arenaSize;
                        break;
                    case 3: // West edge
                        x = -arenaSize;
                        z = Math.random() * 2 * arenaSize - arenaSize;
                        break;
                }
                
                // Ensure y position is always at ground level (0)
                const position = new THREE.Vector3(x, 0, z);
                
                // Determine enemy type based on wave progress
                const enemyType = this.getRandomEnemyType();
                
                // Get enemy from pool (or create new if none available)
                const enemy = enemyPool.get(enemyType, this.scene, position, this.player);
                
                // Ensure enemy is properly positioned at ground level based on its mesh type
                switch(enemy.type) {
                    case EnemyType.BASIC:
                        enemy.mesh.position.y = 0.75; // Half height for cone
                        break;
                    case EnemyType.FAST:
                        enemy.mesh.position.y = 0.4; // Half height for cube
                        break;
                    case EnemyType.TANKY:
                        enemy.mesh.position.y = 0.9; // Half height for cylinder
                        break;
                    case EnemyType.RANGED:
                        enemy.mesh.position.y = 0.5; // Half height for sphere
                        break;
                    default:
                        enemy.mesh.position.y = 0.75;
                }
                
                this.enemies.push(enemy);
                
                // Create spawn effect
                this.createSpawnEffect(position, enemy.defaultColor);
                
            }, i * 500); // Spawn an enemy every half second
        }
    }
    
    createSpawnEffect(position, color = 0xff0000) {
        // Create a simple spawn effect (expanding ring)
        const geometry = new THREE.RingGeometry(0, 1, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(position);
        ring.position.y = 0.05; // Just above ground
        ring.rotation.x = -Math.PI / 2; // Lay flat
        
        this.scene.add(ring);
        
        // Animate and remove
        let scale = 0;
        const expandInterval = setInterval(() => {
            scale += 0.1;
            ring.scale.set(scale, scale, scale);
            material.opacity -= 0.05;
            
            if (scale >= 2) {
                clearInterval(expandInterval);
                this.scene.remove(ring);
                geometry.dispose();
                material.dispose();
            }
        }, 50);
    }
    
    update(deltaTime) {
        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (!enemy.isAlive) {
                // Remove dead enemies
                this.enemies.splice(i, 1);
                this.enemiesRemaining--;
                this.updateWaveDisplay();
            } else {
                // Update living enemies
                enemy.update(deltaTime);
            }
        }
        
        // Check if wave is complete
        if (this.waveActive && this.enemiesRemaining <= 0 && this.enemies.length === 0) {
            this.waveComplete();
        }
        
        // Update wave countdown if between waves
        if (!this.waveActive && this.currentWave > 0) {
            this.waveCountdown -= deltaTime;
            if (this.waveCountdown <= 0) {
                this.startNextWave();
            } else {
                // Update display every second
                if (Math.floor(this.waveCountdown / 1000) !== Math.floor((this.waveCountdown + deltaTime) / 1000)) {
                    this.updateWaveDisplay();
                }
            }
        }
    }
    
    waveComplete() {
        this.waveActive = false;
        this.waveCountdown = this.timeBetweenWaves;
        
        // Update display
        this.updateWaveDisplay();
        
        // Schedule next wave
        this.waveTimeout = setTimeout(() => {
            this.startNextWave();
        }, this.timeBetweenWaves);
    }
    
    reset() {
        // Clear all enemies
        for (const enemy of this.enemies) {
            enemy.removeFromScene();
        }
        
        this.enemies = [];
        this.currentWave = 0;
        this.enemiesRemaining = 0;
        this.waveActive = false;
        
        if (this.waveTimeout) {
            clearTimeout(this.waveTimeout);
            this.waveTimeout = null;
        }
        
        // Reset display
        this.updateWaveDisplay();
        
        // Listen for spacebar to start again
        document.addEventListener('keydown', this.spacebarHandler);
    }
} 