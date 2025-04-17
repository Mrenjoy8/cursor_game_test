import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { Enemy, BaseEnemy, BasicEnemy, FastEnemy, TankyEnemy, RangedEnemy, EnemyType, enemyPool } from './enemy.js';
import { BossEnemy } from './bossEnemy.js';

export class WaveManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // Add reference to this WaveManager in the scene for the boss to access
        this.scene.waveManager = this;
        
        this.currentWave = 0;
        this.enemiesRemaining = 0;
        this.enemies = [];
        this.waveActive = false;
        this.timeBetweenWaves = 0; // No pause between waves
        this.waveTimeout = null;
        
        // Wave timer properties
        this.waveTimerDuration = 60000; // 60 seconds per wave
        this.waveTimer = 0;
        this.waveTimerActive = false;
        
        // Boss wave properties
        this.bossWaveFrequency = 5; // Boss appears every 5 waves
        this.currentBoss = null;
        this.isBossWave = false;
        
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
        
        // Wave timer display
        this.timerContainer = document.createElement('div');
        this.timerContainer.style.position = 'absolute';
        this.timerContainer.style.top = '70px';
        this.timerContainer.style.right = '20px';
        this.timerContainer.style.color = 'white';
        this.timerContainer.style.fontFamily = 'Arial, sans-serif';
        this.timerContainer.style.fontSize = '18px';
        this.timerContainer.style.textAlign = 'center';
        this.timerContainer.style.padding = '5px 15px';
        this.timerContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.timerContainer.style.borderRadius = '5px';
        this.timerContainer.style.zIndex = '100';
        this.timerContainer.style.display = 'none'; // Hide initially
        document.body.appendChild(this.timerContainer);
        
        // Update display
        this.updateWaveDisplay();
    }
    
    updateWaveDisplay() {
        if (this.waveActive) {
            if (this.isBossWave && this.currentBoss) {
                // Show boss health and wave info
                this.waveContainer.textContent = `BOSS WAVE ${this.currentWave} - Health: ${this.currentBoss.health}`;
                this.waveContainer.style.color = '#ff5555';
            } else {
                this.waveContainer.textContent = `Wave ${this.currentWave} - Enemies: ${this.enemiesRemaining}`;
                this.waveContainer.style.color = 'white';
            }
            
            // Show timer if wave is active
            if (this.waveTimerActive) {
                this.timerContainer.style.display = 'block';
                const timeRemaining = Math.ceil(this.waveTimer / 1000);
                this.timerContainer.textContent = `Wave time left: ${timeRemaining}s`;
                
                // Change color to red when less than 10 seconds remain
                if (timeRemaining <= 10) {
                    this.timerContainer.style.color = '#ff5555';
                } else {
                    this.timerContainer.style.color = 'white';
                }
            } else {
                this.timerContainer.style.display = 'none';
            }
        } else if (this.currentWave === 0) {
            this.waveContainer.textContent = 'Press "Space" to Start';
            this.waveContainer.style.color = 'white';
            this.timerContainer.style.display = 'none';
        } else {
            // For wave complete, don't mention countdown since it's immediate
            this.waveContainer.textContent = `Wave ${this.currentWave} Complete!`;
            this.waveContainer.style.color = 'white';
            this.timerContainer.style.display = 'none';
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
        
        // Check if this is a boss wave (every 5th wave)
        this.isBossWave = this.currentWave % this.bossWaveFrequency === 0;
        
        if (this.isBossWave) {
            // Boss wave
            this.enemiesRemaining = 1; // Just the boss
            
            // Clear any existing countdown
            if (this.waveTimeout) {
                clearTimeout(this.waveTimeout);
                this.waveTimeout = null;
            }
            
            // Reset and start wave timer - give more time for boss fights
            this.waveTimer = this.waveTimerDuration * 1.5; // 90 seconds for boss fights
            this.waveTimerActive = true;
            
            // Spawn boss
            this.spawnBoss();
            
            // Update display
            this.updateWaveDisplay();
            
            // Show boss wave notification
            this.showBossWaveNotification();
        } else {
            // Regular wave
            // Calculate enemies for this wave
            const numEnemies = Math.min(5 + (this.currentWave - 1) * 2, this.maxEnemies);
            this.enemiesRemaining = numEnemies;
            
            // Clear any existing countdown
            if (this.waveTimeout) {
                clearTimeout(this.waveTimeout);
                this.waveTimeout = null;
            }
            
            // Reset and start wave timer
            this.waveTimer = this.waveTimerDuration;
            this.waveTimerActive = true;
            
            // Spawn enemies
            this.spawnEnemies(numEnemies);
            
            // Update display
            this.updateWaveDisplay();
            
            // Show wave notification
            this.showWaveNotification();
        }
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
    
    spawnBoss() {
        // Determine boss level (increases with wave number)
        const bossLevel = Math.ceil(this.currentWave / this.bossWaveFrequency);
        
        // Define spawn position (center of the arena)
        const position = new THREE.Vector3(0, 0, 0);
        
        // Create a spectacular spawn effect for the boss
        this.createBossSpawnEffect(position);
        
        // Delay the actual spawn to allow the effect to play
        setTimeout(() => {
            if (!this.waveActive) return; // Don't spawn if wave is no longer active
            
            // Create the boss
            this.currentBoss = new BossEnemy(this.scene, position, this.player, bossLevel);
            
            // Ensure boss is properly visible and active
            this.currentBoss.isAlive = true;
            if (this.currentBoss.mesh) {
                this.currentBoss.mesh.visible = true;
            }
            
            // Add to enemies array
            this.enemies.push(this.currentBoss);
            
            // Log for debugging
            console.log(`Boss spawned: Level ${bossLevel}, Health: ${this.currentBoss.health}`);
        }, 2000); // 2 second delay for dramatic effect
    }
    
    createBossSpawnEffect(position) {
        // Create a more impressive spawn effect for bosses
        
        // Large expanding ring
        const ringGeometry = new THREE.RingGeometry(0, 5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.position.y = 0.1; // Slightly above ground
        ring.rotation.x = -Math.PI / 2; // Lay flat on the ground
        this.scene.add(ring);
        
        // Lightning bolts (vertical beams)
        const beams = [];
        const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, 15, 8);
        const beamMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff9900,
            transparent: true,
            opacity: 0.8
        });
        
        for (let i = 0; i < 5; i++) {
            const beam = new THREE.Mesh(beamGeometry, beamMaterial);
            
            // Position around the spawn point
            const angle = (i / 5) * Math.PI * 2;
            const radius = 3;
            beam.position.set(
                position.x + Math.cos(angle) * radius,
                position.y + 7.5, // Half height up
                position.z + Math.sin(angle) * radius
            );
            
            this.scene.add(beam);
            beams.push(beam);
        }
        
        // Particles
        const particleCount = 200;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Random position in a sphere
            const radius = 5 * Math.random();
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            particlePositions[i3] = position.x + radius * Math.sin(phi) * Math.cos(theta);
            particlePositions[i3 + 1] = position.y + radius * Math.sin(phi) * Math.sin(theta);
            particlePositions[i3 + 2] = position.z + radius * Math.cos(phi);
            
            particleSizes[i] = 0.2 + Math.random() * 0.3;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xff5500,
            size: 0.5,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particles);
        
        // Animation timeline
        let startTime = Date.now();
        const duration = 2000; // 2 seconds
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Animate ring
            ring.scale.setScalar(1 + progress * 2);
            ringMaterial.opacity = 0.7 * (1 - progress);
            
            // Animate beams
            beams.forEach((beam, i) => {
                beam.scale.y = 1 - 0.5 * Math.sin((progress * 10) + i);
                beamMaterial.opacity = 0.8 * (1 - progress);
            });
            
            // Animate particles
            particleMaterial.opacity = 0.8 * (1 - progress);
            
            // Continue animation if not complete
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up when animation is complete
                this.scene.remove(ring);
                ringMaterial.dispose();
                ringGeometry.dispose();
                
                beams.forEach(beam => {
                    this.scene.remove(beam);
                });
                beamMaterial.dispose();
                beamGeometry.dispose();
                
                this.scene.remove(particles);
                particleMaterial.dispose();
                particleGeometry.dispose();
            }
        };
        
        // Start animation
        animate();
    }
    
    showBossWaveNotification() {
        // Create notification element with more dramatic styling
        const notification = document.createElement('div');
        notification.textContent = `BOSS WAVE ${this.currentWave / this.bossWaveFrequency}`;
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.color = '#ff3333';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '64px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = '0 0 10px #ff0000, 0 0 20px #ff0000';
        notification.style.zIndex = '200';
        notification.style.opacity = '1';
        notification.style.transition = 'opacity 1.5s';
        document.body.appendChild(notification);
        
        // Add a subtitle
        const subtitle = document.createElement('div');
        subtitle.textContent = `Prepare for battle!`;
        subtitle.style.position = 'absolute';
        subtitle.style.top = 'calc(50% + 70px)';
        subtitle.style.left = '50%';
        subtitle.style.transform = 'translateX(-50%)';
        subtitle.style.color = '#ffcc00';
        subtitle.style.fontFamily = 'Arial, sans-serif';
        subtitle.style.fontSize = '32px';
        subtitle.style.fontWeight = 'bold';
        subtitle.style.textShadow = '0 0 6px #ff9900, 0 0 12px #ff9900';
        subtitle.style.zIndex = '200';
        subtitle.style.opacity = '1';
        subtitle.style.transition = 'opacity 1.5s';
        document.body.appendChild(subtitle);
        
        // Fade out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            subtitle.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
                document.body.removeChild(subtitle);
            }, 1500);
        }, 2500);
    }
    
    update(deltaTime) {
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (enemy.isAlive) {
                enemy.update(deltaTime);
            } else {
                // Handle enemy death
                // Check if it was a boss
                if (this.isBossWave && enemy === this.currentBoss) {
                    this.currentBoss = null;
                    // Create spectacular death effect
                    this.createBossDeathEffect(enemy.getPosition());
                }
                
                // Remove from scene and array
                enemy.removeFromScene();
                this.enemies.splice(i, 1);
                this.enemiesRemaining--;
                
                // Release to pool if not a boss
                if (!this.isBossWave || enemy !== this.currentBoss) {
                    enemyPool.release(enemy);
                }
                
                // Check if wave is complete
                if (this.enemiesRemaining <= 0 && this.waveActive) {
                    this.waveComplete();
                }
            }
        }
        
        // Update wave timer
        if (this.waveTimerActive) {
            this.waveTimer -= deltaTime;
            
            if (this.waveTimer <= 0) {
                this.waveTimerActive = false;
                this.waveTimer = 0;
                
                // Handle wave timeout - different behavior for boss waves
                if (this.isBossWave && this.currentBoss) {
                    // If boss is still alive, make it vulnerable (half health and slower)
                    this.currentBoss.health = Math.max(this.currentBoss.health * 0.5, 1);
                    this.currentBoss.moveSpeed *= 0.7;
                    this.currentBoss.flashColor(0xff00ff, 1000); // Purple flash to indicate vulnerability
                    this.showBossVulnerableNotification();
                } else {
                    // For normal waves, just spawn the next wave
                    this.showTimerExpiredNotification();
                    this.waveComplete();
                }
            }
            
            // Update the wave display
            this.updateWaveDisplay();
        }
    }
    
    showTimerExpiredNotification() {
        // Create timer expired notification
        const notification = document.createElement('div');
        notification.textContent = "Time's up! Next wave incoming...";
        notification.style.position = 'absolute';
        notification.style.top = '40%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.color = '#ff5555';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '32px';
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
    
    waveComplete() {
        this.waveActive = false;
        this.waveTimerActive = false;
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
        this.waveTimerActive = false;
        
        if (this.waveTimeout) {
            clearTimeout(this.waveTimeout);
            this.waveTimeout = null;
        }
        
        // Reset display
        this.updateWaveDisplay();
        
        // Listen for spacebar to start again
        document.addEventListener('keydown', this.spacebarHandler);
    }
    
    createBossDeathEffect(position) {
        // Create spectacular death effect for boss
        // Similar to spawn effect but with different colors and behavior
        
        // Explosion
        const explosionGeometry = new THREE.SphereGeometry(1, 32, 32);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffdd00,
            transparent: true,
            opacity: 1
        });
        
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(position);
        this.scene.add(explosion);
        
        // Shockwave ring
        const ringGeometry = new THREE.RingGeometry(0, 2, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.position.y = 0.1; // Slightly above ground
        ring.rotation.x = -Math.PI / 2; // Lay flat on the ground
        this.scene.add(ring);
        
        // Particles
        const particleCount = 300;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleVelocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Start at boss position
            particlePositions[i3] = position.x;
            particlePositions[i3 + 1] = position.y;
            particlePositions[i3 + 2] = position.z;
            
            // Random velocity (exploding outward)
            const speed = 0.05 + Math.random() * 0.1;
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI - Math.PI/2;
            
            particleVelocities[i3] = Math.cos(angle) * Math.cos(elevation) * speed;
            particleVelocities[i3 + 1] = Math.sin(elevation) * speed;
            particleVelocities[i3 + 2] = Math.sin(angle) * Math.cos(elevation) * speed;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xffcc00,
            size: 0.4,
            transparent: true,
            opacity: 1,
            sizeAttenuation: true
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particles);
        
        // Play explosion sound
        this.playBossDeathSound();
        
        // Animation timeline
        let startTime = Date.now();
        const duration = 2000; // 2 seconds
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Animate explosion
            explosion.scale.setScalar(1 + progress * 6);
            explosionMaterial.opacity = 1 * (1 - progress);
            
            // Animate ring
            ring.scale.setScalar(1 + progress * 10);
            ringMaterial.opacity = 0.9 * (1 - progress);
            
            // Animate particles
            const positions = particleGeometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // Update positions based on velocity
                positions[i3] += particleVelocities[i3];
                positions[i3 + 1] += particleVelocities[i3 + 1];
                positions[i3 + 2] += particleVelocities[i3 + 2];
                
                // Add gravity effect
                particleVelocities[i3 + 1] -= 0.001;
            }
            
            particleGeometry.attributes.position.needsUpdate = true;
            particleMaterial.opacity = 1 * (1 - progress);
            
            // Continue animation if not complete
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up when animation is complete
                this.scene.remove(explosion);
                explosionMaterial.dispose();
                explosionGeometry.dispose();
                
                this.scene.remove(ring);
                ringMaterial.dispose();
                ringGeometry.dispose();
                
                this.scene.remove(particles);
                particleMaterial.dispose();
                particleGeometry.dispose();
                
                // Give player a reward
                this.givePlayerBossReward();
            }
        };
        
        // Start animation
        animate();
    }
    
    playBossDeathSound() {
        // Create a basic explosion sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a sound with decreasing frequency
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 1.5);
        
        // Add some distortion for explosion effect
        const distortion = audioContext.createWaveShaper();
        function makeDistortionCurve(amount) {
            const k = amount;
            const samples = 44100;
            const curve = new Float32Array(samples);
            for (let i = 0; i < samples; i++) {
                const x = i * 2 / samples - 1;
                curve[i] = (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x));
            }
            return curve;
        }
        distortion.curve = makeDistortionCurve(400);
        
        // Volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
        
        // Connect nodes
        oscillator.connect(distortion);
        distortion.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play sound
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1.5);
    }
    
    showBossVulnerableNotification() {
        // Display notification that boss is now vulnerable
        const notification = document.createElement('div');
        notification.textContent = `Time's up! Boss is weakened!`;
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.color = '#ff00ff';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '36px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = '0 0 8px #ff00ff, 0 0 16px #ff00ff';
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
    
    givePlayerBossReward() {
        // Calculate boss reward based on wave number
        const experienceReward = 500 * Math.ceil(this.currentWave / this.bossWaveFrequency);
        
        // Give experience to player
        this.player.addExperience(experienceReward);
        
        // Display reward notification
        const notification = document.createElement('div');
        notification.textContent = `Boss Defeated! +${experienceReward} XP`;
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.color = '#00ffff';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '36px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = '0 0 8px #00ffff, 0 0 16px #00ffff';
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
} 