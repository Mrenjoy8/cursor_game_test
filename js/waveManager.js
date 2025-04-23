import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { Enemy, BaseEnemy, BasicEnemy, FastEnemy, TankyEnemy, RangedEnemy, EnemyType, enemyPool } from './enemy.js';
import { BossFactory, BossType, bossPool } from './bossFactory.js';

export class WaveManager {
    constructor(scene, player, game) {
        this.scene = scene;
        this.player = player;
        this.game = game;
        this.camera = game.camera; // Store reference to the camera
        
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
        
        // Enemy power scaling - increases after each boss wave
        this.enemyPowerScaling = 1.0;
        
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
        this.waveContainer.style.color = 'var(--white)';
        this.waveContainer.style.fontFamily = '"Exo 2", sans-serif';
        this.waveContainer.style.fontSize = '20px';
        this.waveContainer.style.fontWeight = 'bold';
        this.waveContainer.style.textAlign = 'center';
        this.waveContainer.style.padding = '10px 20px';
        this.waveContainer.style.backgroundColor = 'var(--panel-bg)';
        this.waveContainer.style.backdropFilter = 'blur(4px)';
        this.waveContainer.style.borderRadius = '16px';
        this.waveContainer.style.boxShadow = 'var(--shadow)';
        this.waveContainer.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        this.waveContainer.style.zIndex = '100';
        document.body.appendChild(this.waveContainer);
        
        // Wave timer display
        this.timerContainer = document.createElement('div');
        this.timerContainer.style.position = 'absolute';
        this.timerContainer.style.top = '80px';
        this.timerContainer.style.right = '20px';
        this.timerContainer.style.color = 'var(--white)';
        this.timerContainer.style.fontFamily = '"Exo 2", sans-serif';
        this.timerContainer.style.fontSize = '16px';
        this.timerContainer.style.textAlign = 'center';
        this.timerContainer.style.padding = '8px 16px';
        this.timerContainer.style.backgroundColor = 'var(--panel-bg)';
        this.timerContainer.style.backdropFilter = 'blur(4px)';
        this.timerContainer.style.borderRadius = '16px';
        this.timerContainer.style.boxShadow = 'var(--shadow)';
        this.timerContainer.style.border = '1px solid rgba(255, 255, 255, 0.18)';
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
                this.waveContainer.style.color = 'var(--pink)';
            } else {
                this.waveContainer.textContent = `WAVE ${this.currentWave} - Enemies: ${this.enemiesRemaining}`;
                this.waveContainer.style.color = 'var(--white)';
            }
            
            // Show timer if wave is active
            if (this.waveTimerActive) {
                this.timerContainer.style.display = 'block';
                const timeRemaining = Math.ceil(this.waveTimer / 1000);
                this.timerContainer.textContent = `TIME LEFT: ${timeRemaining}s`;
                
                // Change color to red when less than 10 seconds remain
                if (timeRemaining <= 10) {
                    this.timerContainer.style.color = 'var(--pink)';
                } else {
                    this.timerContainer.style.color = 'var(--white)';
                }
            } else {
                this.timerContainer.style.display = 'none';
            }
        } else if (this.currentWave === 0) {
            this.waveContainer.textContent = 'PRESS "SPACE" TO START';
            this.waveContainer.style.color = 'var(--light-brown)';
            this.timerContainer.style.display = 'none';
        } else {
            // For wave complete, don't mention countdown since it's immediate
            this.waveContainer.textContent = `WAVE ${this.currentWave} COMPLETE!`;
            this.waveContainer.style.color = 'var(--light-brown)';
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
        
        // Log the current power scaling factor for debugging
        console.log(`Starting Wave ${this.currentWave} with enemy power scaling: ${this.enemyPowerScaling.toFixed(2)}`);
        
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
        notification.textContent = `WAVE ${this.currentWave}`;
        notification.style.position = 'absolute';
        notification.style.top = '10%'; // Moved up from 40% to avoid overlap with wave complete at 30%
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.color = 'var(--white)';
        notification.style.fontFamily = '"Exo 2", sans-serif';
        notification.style.fontSize = '48px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = '0 0 20px rgba(76, 175, 80, 0.7)';
        notification.style.zIndex = '200';
        notification.style.opacity = '1';
        notification.style.transition = 'opacity 1s';
        notification.style.backgroundColor = 'var(--panel-bg)';
        notification.style.backdropFilter = 'blur(4px)';
        notification.style.borderRadius = '16px';
        notification.style.boxShadow = 'var(--shadow)';
        notification.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        notification.style.padding = '15px 40px';
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
                // Pass the current power scaling factor to apply buffs
                const enemy = enemyPool.get(enemyType, this.scene, position, this.player, this.enemyPowerScaling);
                
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
        
        // Determine boss type based on wave number or random
        let bossType = null;
        
        // Every 15 waves (after 3 boss waves), cycle through boss types
        if (this.currentWave % 15 === 0) {
            bossType = BossType.TITAN;  // Wave 15, 30, 45...
        } else if (this.currentWave % 15 === 5) {
            bossType = BossType.SORCERER; // Wave 5, 20, 35...
        } else if (this.currentWave % 15 === 10) {
            bossType = BossType.HUNTER;  // Wave 10, 25, 40...
        } else {
            // For any unexpected boss wave, choose random
            bossType = null;  // Will pick random in factory
        }
        
        // Create a spectacular spawn effect for the boss
        this.createBossSpawnEffect(position, bossType);
        
        // Delay the actual spawn to allow the effect to play
        setTimeout(() => {
            if (!this.waveActive) return; // Don't spawn if wave is no longer active
            
            // Get boss from pool or create new through factory
            // The boss factory will automatically use the pool if a boss is available
            this.currentBoss = BossFactory.createBoss(this.scene, position, this.player, bossLevel, bossType);
            
            // Ensure boss is properly visible and active
            this.currentBoss.isAlive = true;
            if (this.currentBoss.mesh) {
                this.currentBoss.mesh.visible = true;
            }
            
            // Add to enemies array
            this.enemies.push(this.currentBoss);
            
            // Log for debugging
            console.log(`Boss spawned: Type ${this.currentBoss.type}, Level ${bossLevel}, Health: ${this.currentBoss.health}`);
        }, 2000); // 2 second delay for dramatic effect
    }
    
    createBossSpawnEffect(position, bossType) {
        // Create a more impressive spawn effect for bosses
        
        // Set color based on boss type
        let effectColor = 0xff0000; // Default red
        let secondaryColor = 0xff9900; // Default orange
        
        if (bossType) {
            switch (bossType) {
                case BossType.TITAN:
                    effectColor = 0xff3300; // Red-orange
                    secondaryColor = 0xff9900; // Orange
                    break;
                case BossType.SORCERER:
                    effectColor = 0x9900ff; // Purple
                    secondaryColor = 0x00ccff; // Cyan
                    break;
                case BossType.HUNTER:
                    effectColor = 0x00ff99; // Green
                    secondaryColor = 0xffcc00; // Yellow
                    break;
            }
        }
        
        // Large expanding ring
        const ringGeometry = new THREE.RingGeometry(0, 5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: effectColor,
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
            color: secondaryColor,
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
            color: effectColor,
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
        // Get the boss type that will be spawned
        let bossTypeName = "BOSS";
        let bossColor = 'var(--pink)';
        let bossSubtitle = "Prepare for battle!";
        
        // Determine boss type based on wave number
        if (this.currentWave % 15 === 0) {
            bossTypeName = "TITAN BOSS";
            bossColor = 'var(--pink)';
            bossSubtitle = "A mighty foe approaches!";
        } else if (this.currentWave % 15 === 5) {
            bossTypeName = "SORCERER BOSS";
            bossColor = 'var(--pink)';
            bossSubtitle = "Arcane energies gather!";
        } else if (this.currentWave % 15 === 10) {
            bossTypeName = "HUNTER BOSS";
            bossColor = 'var(--pink)';
            bossSubtitle = "A deadly predator stalks you!";
        }
        
        // Create notification container
        const notificationContainer = document.createElement('div');
        notificationContainer.style.position = 'absolute';
        notificationContainer.style.top = '50%';
        notificationContainer.style.left = '50%';
        notificationContainer.style.transform = 'translate(-50%, -50%)';
        notificationContainer.style.display = 'flex';
        notificationContainer.style.flexDirection = 'column';
        notificationContainer.style.alignItems = 'center';
        notificationContainer.style.backgroundColor = 'var(--panel-bg)';
        notificationContainer.style.backdropFilter = 'blur(4px)';
        notificationContainer.style.borderRadius = '16px';
        notificationContainer.style.boxShadow = 'var(--shadow)';
        notificationContainer.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        notificationContainer.style.padding = '20px 40px';
        notificationContainer.style.zIndex = '200';
        notificationContainer.style.opacity = '1';
        notificationContainer.style.transition = 'opacity 1.5s';
        document.body.appendChild(notificationContainer);
        
        // Title
        const notification = document.createElement('div');
        notification.textContent = `${bossTypeName} ${Math.ceil(this.currentWave / this.bossWaveFrequency)}`;
        notification.style.color = bossColor;
        notification.style.fontFamily = '"Exo 2", sans-serif';
        notification.style.fontSize = '48px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = '0 0 10px rgba(228, 147, 179, 0.7)';
        notificationContainer.appendChild(notification);
        
        // Divider
        const divider = document.createElement('div');
        divider.style.width = '80%';
        divider.style.height = '2px';
        divider.style.background = 'linear-gradient(90deg, transparent, var(--white), transparent)';
        divider.style.margin = '10px auto';
        divider.style.opacity = '0.5';
        notificationContainer.appendChild(divider);
        
        // Subtitle
        const subtitle = document.createElement('div');
        subtitle.textContent = bossSubtitle;
        subtitle.style.color = 'var(--light-brown)';
        subtitle.style.fontFamily = '"Exo 2", sans-serif';
        subtitle.style.fontSize = '24px';
        subtitle.style.fontWeight = 'bold';
        subtitle.style.textShadow = '0 0 10px rgba(212, 188, 145, 0.5)';
        notificationContainer.appendChild(subtitle);
        
        // Fade out and remove
        setTimeout(() => {
            notificationContainer.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notificationContainer);
            }, 1500);
        }, 3000);
    }
    
    showTimerExpiredNotification() {
        // Create timer expired notification
        const notification = document.createElement('div');
        notification.textContent = "TIME'S UP! NEXT WAVE INCOMING...";
        notification.style.position = 'absolute';
        notification.style.top = '40%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.color = 'var(--pink)';
        notification.style.fontFamily = '"Exo 2", sans-serif';
        notification.style.fontSize = '32px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = '0 0 10px rgba(228, 147, 179, 0.7)';
        notification.style.zIndex = '200';
        notification.style.opacity = '1';
        notification.style.transition = 'opacity 1s';
        notification.style.backgroundColor = 'var(--panel-bg)';
        notification.style.backdropFilter = 'blur(4px)';
        notification.style.borderRadius = '16px';
        notification.style.boxShadow = 'var(--shadow)';
        notification.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        notification.style.padding = '15px 40px';
        document.body.appendChild(notification);
        
        // Fade out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 1000);
        }, 2000);
    }
    
    showBossVulnerableNotification() {
        // Display notification that boss is now vulnerable
        const notification = document.createElement('div');
        notification.textContent = `TIME'S UP! BOSS IS WEAKENED!`;
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.color = 'var(--pink)';
        notification.style.fontFamily = '"Exo 2", sans-serif';
        notification.style.fontSize = '36px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = '0 0 10px rgba(228, 147, 179, 0.7)';
        notification.style.zIndex = '200';
        notification.style.opacity = '1';
        notification.style.transition = 'opacity 1s';
        notification.style.backgroundColor = 'var(--panel-bg)';
        notification.style.backdropFilter = 'blur(4px)';
        notification.style.borderRadius = '16px';
        notification.style.boxShadow = 'var(--shadow)';
        notification.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        notification.style.padding = '15px 40px';
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
        
        // Give experience to player (using the correct method)
        this.player.gainExperience(experienceReward);
        
        // Increase enemy power scaling by 20% after each boss
        this.enemyPowerScaling *= 1.2;
        console.log(`Enemies powered up! New scaling factor: ${this.enemyPowerScaling.toFixed(2)}`);
        
        // Check if skill selection is visible
        const skillSelectionVisible = this.game && 
            this.game.skillSystem && 
            this.game.skillSystem.container && 
            this.game.skillSystem.container.style.display === 'block';
        
        // Create notification container
        const notificationContainer = document.createElement('div');
        notificationContainer.style.position = 'absolute';
        
        // Position notification above skill selection if it's visible
        if (skillSelectionVisible) {
            notificationContainer.style.top = '20%'; // Position above skill selection
        } else {
            notificationContainer.style.top = '50%'; // Default position
        }
        
        notificationContainer.style.left = '50%';
        notificationContainer.style.transform = 'translate(-50%, -50%)';
        notificationContainer.style.display = 'flex';
        notificationContainer.style.flexDirection = 'column';
        notificationContainer.style.alignItems = 'center';
        notificationContainer.style.backgroundColor = 'var(--panel-bg)';
        notificationContainer.style.backdropFilter = 'blur(4px)';
        notificationContainer.style.borderRadius = '16px';
        notificationContainer.style.boxShadow = 'var(--shadow)';
        notificationContainer.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        notificationContainer.style.padding = '20px 40px';
        notificationContainer.style.zIndex = '2000'; // Higher z-index to ensure it's above skill selection
        notificationContainer.style.opacity = '1';
        notificationContainer.style.transition = 'opacity 1s';
        document.body.appendChild(notificationContainer);
        
        // Title
        const notification = document.createElement('div');
        notification.textContent = `BOSS DEFEATED! +${experienceReward} XP`;
        notification.style.color = 'var(--light-brown)';
        notification.style.fontFamily = '"Exo 2", sans-serif';
        notification.style.fontSize = '36px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = '0 0 10px rgba(212, 188, 145, 0.7)';
        notificationContainer.appendChild(notification);
        
        // Divider
        const divider = document.createElement('div');
        divider.style.width = '80%';
        divider.style.height = '2px';
        divider.style.background = 'linear-gradient(90deg, transparent, var(--white), transparent)';
        divider.style.margin = '10px auto';
        divider.style.opacity = '0.5';
        notificationContainer.appendChild(divider);
        
        // Power up notification
        const powerUpNotification = document.createElement('div');
        powerUpNotification.textContent = `ENEMIES POWERED UP BY 20%!`;
        powerUpNotification.style.color = 'var(--pink)';
        powerUpNotification.style.fontFamily = '"Exo 2", sans-serif';
        powerUpNotification.style.fontSize = '24px';
        powerUpNotification.style.fontWeight = 'bold';
        powerUpNotification.style.textShadow = '0 0 10px rgba(228, 147, 179, 0.7)';
        notificationContainer.appendChild(powerUpNotification);
        
        // Fade out and remove
        setTimeout(() => {
            notificationContainer.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notificationContainer);
            }, 1000);
        }, 3000);
    }
    
    update(deltaTime) {
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (enemy.isAlive) {
                enemy.update(deltaTime, this.camera);
            } else {
                // Handle enemy death
                // Check if it was a boss
                if (this.isBossWave && enemy === this.currentBoss) {
                    console.log("Boss died, creating death effect");
                    
                    // IMPORTANT: First get the position before any cleanup occurs
                    // Get position even if the mesh is already gone
                    const bossPosition = enemy.getPosition().clone(); // This now returns a fallback position if null
                    console.log("Boss death position:", bossPosition);
                    
                    // If the boss mesh is still visible, call die() to handle animations
                    if (enemy.mesh && enemy.mesh.visible) {
                        console.log("Explicitly calling boss die() method");
                        enemy.die(); // This will clean up the mesh
                    } else {
                        console.log("Boss mesh already removed, skipping die() call");
                    }
                    
                    // Create death effect
                    this.createBossDeathEffect(bossPosition);
                    
                    // Return boss to pool instead of disposing completely
                    bossPool.release(enemy);
                    
                    // Clear boss reference and update state
                    this.currentBoss = null;
                    this.enemies.splice(i, 1);
                    this.enemiesRemaining--;
                } else {
                    // Regular enemy - use object pool system
                    // For regular enemies, this adds them back to the pool
                    // We don't need to call enemyPool.release explicitly as removeFromScene does this
                    enemy.removeFromScene(); 
                    this.enemies.splice(i, 1);
                    this.enemiesRemaining--;
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
    
    waveComplete() {
        this.waveActive = false;
        this.waveTimerActive = false;
        this.waveCountdown = this.timeBetweenWaves;
        
        // Update display
        this.updateWaveDisplay();
        
        // Show wave complete notification
        if (this.currentWave > 0) {
            // Create notification element
            const notification = document.createElement('div');
            notification.textContent = `WAVE ${this.currentWave} COMPLETE!`;
            notification.style.position = 'absolute';
            notification.style.top = '30%'; // Moved up from 40% to avoid overlap
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.color = 'var(--light-brown)';
            notification.style.fontFamily = '"Exo 2", sans-serif';
            notification.style.fontSize = '36px';
            notification.style.fontWeight = 'bold';
            notification.style.textShadow = '0 0 10px rgba(212, 188, 145, 0.7)';
            notification.style.zIndex = '200';
            notification.style.opacity = '1';
            notification.style.transition = 'opacity 1s';
            notification.style.backgroundColor = 'var(--panel-bg)';
            notification.style.backdropFilter = 'blur(4px)';
            notification.style.borderRadius = '16px';
            notification.style.boxShadow = 'var(--shadow)';
            notification.style.border = '1px solid rgba(255, 255, 255, 0.18)';
            notification.style.padding = '15px 40px';
            document.body.appendChild(notification);
            
            // Fade out and remove
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 1000);
            }, 1500);
        }
        
        // Schedule the next wave without pausing, but check if skill selection is active
        // If game is already paused (likely from level up screen), don't schedule the next wave yet
        if (this.game && this.game.paused && this.game.skillSystem && 
            this.game.skillSystem.container.style.display === 'block') {
            console.log("Wave complete during skill selection - waiting for skill choice before starting next wave");
            
            // Create a one-time event listener for when the game is unpaused (after skill selection)
            const startNextWaveAfterUnpause = () => {
                if (!this.game.paused) {
                    console.log("Game unpaused after skill selection - starting next wave");
                    this.startNextWave();
                    document.removeEventListener('skillSelected', startNextWaveAfterUnpause);
                }
            };
            
            // Listen for a custom event that will be dispatched after skill selection
            document.addEventListener('skillSelected', startNextWaveAfterUnpause);
        } else {
            // Simply schedule the next wave 
            this.waveTimeout = setTimeout(() => {
                this.startNextWave();
            }, this.timeBetweenWaves);
        }
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
        this.enemyPowerScaling = 1.0; // Reset enemy power scaling
        
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
        console.log("Creating boss death effect at position:", position);
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
                // Clean up ALL objects to prevent memory leaks
                console.log("Boss death animation complete - cleaning up all effect objects");
                
                // Remove objects from scene
                this.scene.remove(explosion);
                this.scene.remove(ring);
                this.scene.remove(particles);
                
                // Dispose geometries
                explosionGeometry.dispose();
                ringGeometry.dispose();
                particleGeometry.dispose();
                
                // Dispose materials
                explosionMaterial.dispose();
                ringMaterial.dispose();
                particleMaterial.dispose();
                
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
} 