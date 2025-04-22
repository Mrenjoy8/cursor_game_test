import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { BaseEnemy } from './enemy.js';
import { Projectile } from './projectile.js';

export class BossEnemy extends BaseEnemy {
    constructor(scene, position, player, bossLevel = 1) {
        super(scene, position, player);
        
        // Store references properly
        this.scene = scene;
        this.player = player;
        
        // Log references for debugging
        console.log(`BossEnemy constructor called:
            - Scene exists: ${!!scene}
            - Player exists: ${!!player}
            - Position: ${JSON.stringify(position)}
            - Boss level: ${bossLevel}`);
        
        // Boss specific properties
        this.type = 'boss';
        this.bossLevel = bossLevel;
        
        // Scale health, damage and rewards with boss level
        this.maxHealth = 150 * bossLevel;
        this.health = this.maxHealth;
        this.damage = 20 + (10 * bossLevel);
        this.experienceValue = 500 * bossLevel;
        
        // Movement properties - bosses are slower but have special movement patterns
        this.moveSpeed = 0.01; // Base movement speed
        this.chargeSpeed = 0.05; // Speed during charge attack
        this.isCharging = false;
        this.chargeTarget = null;
        this.attackCooldown = 2000; // ms between attacks
        this.specialAttackCooldown = 8000; // ms between special attacks
        this.lastSpecialAttackTime = 0;
        this.attackRange = 3; // Longer attack range
        this.defaultColor = 0x990000; // Dark red
        
        // Boss appearance vars
        this.size = 1.5 + (bossLevel * 0.5); // Size increases with level
        this.spinSpeed = 0.01;
        
        // Attack patterns
        this.attackPatterns = [
            this.meleeAttack.bind(this),
            this.rangedAttack.bind(this),
            this.chargeAttack.bind(this),
            this.aoeAttack.bind(this)
        ];
        
        // Initialize boss phases (gets more aggressive at lower health)
        this.phaseThresholds = [0.75, 0.5, 0.25]; // Percentage of health
        this.currentPhase = 0;
        
        // Projectile management
        this.projectiles = [];
        this.maxProjectiles = 20; // Limit for performance
        
        // Create the boss mesh - first verify we have the scene
        if (!this.scene) {
            console.error("Scene is missing in BossEnemy constructor");
        } else {
            console.log("Creating boss mesh...");
            this.createEnemyMesh(position);
            
            // Add dramatic entrance effect
            this.playEntranceAnimation();
        }
    }
    
    createEnemyMesh(position) {
        try {
            // Create a more complex boss mesh
            
            // Main body - larger geometry for the boss
            const bodyGeometry = new THREE.SphereGeometry(this.size, 16, 16);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.7,
                metalness: 0.3
            });
            this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
            this.mesh.castShadow = true;
            
            // Position the mesh
            this.mesh.position.copy(position);
            this.mesh.position.y = this.size; // Lift based on size
            
            // Create armor plates or spikes on the body
            const spikeCount = 8;
            this.spikes = [];
            
            for (let i = 0; i < spikeCount; i++) {
                // Create a spike
                const spikeGeometry = new THREE.ConeGeometry(this.size * 0.2, this.size, 4);
                const spikeMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x660000,
                    roughness: 0.5,
                    metalness: 0.5
                });
                
                const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
                
                // Position around the body
                const angle = (i / spikeCount) * Math.PI * 2;
                spike.position.set(
                    Math.cos(angle) * this.size * 0.8,
                    0,
                    Math.sin(angle) * this.size * 0.8
                );
                
                // Rotate to point outward
                spike.rotation.x = Math.PI / 2;
                spike.rotation.z = angle + Math.PI;
                
                this.mesh.add(spike);
                this.spikes.push(spike);
            }
            
            // Create a crown/head piece for the boss
            const crownGeometry = new THREE.CylinderGeometry(this.size * 0.7, this.size * 0.5, this.size * 0.3, 5);
            const crownMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xaa0000,
                roughness: 0.3,
                metalness: 0.7
            });
            
            this.crown = new THREE.Mesh(crownGeometry, crownMaterial);
            this.crown.position.y = this.size * 0.8;
            this.mesh.add(this.crown);
            
            // Create eye(s)
            const eyeSize = this.size * 0.2;
            const eyeGeometry = new THREE.SphereGeometry(eyeSize, 8, 8);
            const eyeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffcc00,
                emissive: 0xffcc00,
                emissiveIntensity: 0.5
            });
            
            this.eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            this.eye.position.set(0, this.size * 0.4, this.size * 0.8);
            this.mesh.add(this.eye);
            
            // Add to scene
            this.scene.add(this.mesh);
            
            // Log for debugging
            console.log("Boss mesh created successfully");
        } catch (error) {
            console.error("Error creating boss mesh:", error);
        }
    }
    
    playEntranceAnimation() {
        // Safety check to ensure mesh exists
        if (!this.mesh) {
            console.error("Boss mesh doesn't exist during entrance animation");
            return;
        }
        
        // Save original position
        const originalPosition = this.mesh.position.clone();
        
        // Start from below ground
        this.mesh.position.y = -this.size * 2;
        this.mesh.scale.set(0.1, 0.1, 0.1);
        
        // Animation parameters
        const duration = 2000; // 2 seconds
        const startTime = Date.now();
        
        // Animation function
        const animate = () => {
            if (!this.isAlive || !this.mesh) return; // Safety check
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Use easing function for smoother animation
            const easedProgress = this.easeOutBack(progress);
            
            // Animate position and scale
            this.mesh.position.y = -this.size * 2 + (originalPosition.y + this.size * 2) * easedProgress;
            this.mesh.scale.set(easedProgress, easedProgress, easedProgress);
            
            // Rotate during entrance
            this.mesh.rotation.y = progress * Math.PI * 4;
            
            // Continue animation if not complete
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Reset to original position and proper scale
                this.mesh.position.copy(originalPosition);
                this.mesh.scale.set(1, 1, 1);
                this.mesh.rotation.y = 0;
                
                // Create ground impact effect
                this.createImpactEffect();
                
                // Log completion for debugging
                console.log("Boss entrance animation completed");
            }
        };
        
        // Start animation
        animate();
    }
    
    // Easing function for smoother animation
    easeOutBack(x) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    
    createImpactEffect() {
        // Create ground impact rings
        const position = this.mesh.position.clone();
        position.y = 0.05; // Just above ground
        
        // Create expanding ring
        const ringGeometry = new THREE.RingGeometry(0, this.size, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3300, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2; // Lay flat
        this.scene.add(ring);
        
        // Animation
        const duration = 1000; // 1 second
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Expand ring
            ring.scale.setScalar(1 + progress * 3);
            ringMaterial.opacity = 0.7 * (1 - progress);
            
            // Continue animation
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(ring);
                ringMaterial.dispose();
                ringGeometry.dispose();
            }
        };
        
        animate();
    }
    
    update(deltaTime) {
        try {
            if (!this.isAlive || !this.mesh) return;
            
            // Update phase based on health percentage
            const healthPercentage = this.health / this.maxHealth;
            for (let i = 0; i < this.phaseThresholds.length; i++) {
                if (healthPercentage <= this.phaseThresholds[i] && this.currentPhase <= i) {
                    this.currentPhase = i + 1;
                    this.enterNewPhase();
                }
            }
            
            // Update boss movement and attacks
            if (this.isCharging) {
                this.updateChargeAttack(deltaTime);
            } else {
                // Normal behavior - similar to base enemy but with special attacks
                // Get player position
                const playerPosition = this.player.getPosition();
                
                // Calculate direction to player
                const direction = new THREE.Vector3();
                direction.subVectors(playerPosition, this.mesh.position);
                direction.y = 0; // Keep movement on xz plane
                
                // Calculate distance to player
                const distanceToPlayer = direction.length();
                
                // Move towards player if not in attack range
                if (distanceToPlayer > this.attackRange) {
                    this.moveTowardsPlayer(direction, distanceToPlayer, deltaTime);
                } else {
                    // Attack player if close enough and cooldown has passed
                    const currentTime = Date.now();
                    if (currentTime - this.lastAttackTime > this.attackCooldown) {
                        this.attackPlayer();
                        this.lastAttackTime = currentTime;
                    }
                }
                
                // Check if we should perform a special attack
                const currentTime = Date.now();
                if (currentTime - this.lastSpecialAttackTime > this.specialAttackCooldown) {
                    this.performSpecialAttack();
                    this.lastSpecialAttackTime = currentTime;
                }
            }
            
            // Always update visual elements
            this.updateVisuals(deltaTime);
            
            // Update projectiles
            this.updateProjectiles(deltaTime);
        } catch (error) {
            console.error("Error in boss update:", error);
        }
    }
    
    moveTowardsPlayer(direction, distance, deltaTime) {
        // Boss has more complex movement patterns based on phase
        // Higher phases have more erratic movement
        
        let moveDir = direction.clone().normalize();
        
        // Add some randomness in movement for higher phases
        if (this.currentPhase > 0) {
            const randomFactor = 0.3 * this.currentPhase;
            moveDir.x += (Math.random() * 2 - 1) * randomFactor;
            moveDir.z += (Math.random() * 2 - 1) * randomFactor;
            moveDir.normalize();
        }
        
        // Move towards player with phase-based speed adjustments
        const speedMultiplier = 1 + (this.currentPhase * 0.2);
        this.mesh.position.x += moveDir.x * this.moveSpeed * speedMultiplier * deltaTime;
        this.mesh.position.z += moveDir.z * this.moveSpeed * speedMultiplier * deltaTime;
        
        // Face the direction of movement
        this.faceDirection(moveDir);
    }
    
    updateChargeAttack(deltaTime) {
        if (!this.chargeTarget) return;
        
        // Move quickly toward charge target
        const direction = new THREE.Vector3();
        direction.subVectors(this.chargeTarget, this.mesh.position);
        direction.y = 0;
        
        const distance = direction.length();
        
        if (distance < 1) {
            // Reached target, end charge attack
            this.isCharging = false;
            this.createChargeImpactEffect();
        } else {
            // Continue charging
            direction.normalize();
            
            this.mesh.position.x += direction.x * this.chargeSpeed * deltaTime;
            this.mesh.position.z += direction.z * this.chargeSpeed * deltaTime;
            
            // Face direction of movement
            this.faceDirection(direction);
        }
    }
    
    createChargeImpactEffect() {
        // Create ground cracking effect where charge ended
        const position = this.mesh.position.clone();
        position.y = 0.05;
        
        // Create expanding shock
        const ringCount = 3;
        const rings = [];
        
        for (let i = 0; i < ringCount; i++) {
            const ringGeometry = new THREE.RingGeometry(0, this.size * (i + 1) * 0.5, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff5500, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.copy(position);
            ring.rotation.x = -Math.PI / 2;
            
            this.scene.add(ring);
            rings.push({ mesh: ring, material: ringMaterial, delay: i * 100 });
        }
        
        // Animation
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            
            rings.forEach(ring => {
                // Delay each ring's animation
                const adjustedElapsed = Math.max(0, elapsed - ring.delay);
                const progress = Math.min(adjustedElapsed / duration, 1.0);
                
                // Expand ring
                ring.mesh.scale.setScalar(1 + progress * 2);
                ring.material.opacity = 0.7 * (1 - progress);
            });
            
            // Continue animation
            if (elapsed < duration + rings[rings.length - 1].delay) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                rings.forEach(ring => {
                    this.scene.remove(ring.mesh);
                    ring.material.dispose();
                });
            }
        };
        
        animate();
        
        // Deal damage to player if in impact range
        const playerPosition = this.player.getPosition();
        const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, position).length();
        
        if (distanceToPlayer < this.size * 2) {
            this.player.takeDamage(this.damage * 1.5);
        }
    }
    
    updateVisuals(deltaTime) {
        try {
            if (!this.mesh || !this.eye || !this.spikes || this.spikes.length === 0) return;
            
            // Animate boss parts for more dynamic appearance
            
            // Rotate spikes
            this.spikes.forEach((spike, i) => {
                spike.rotation.z += this.spinSpeed * deltaTime * (i % 2 === 0 ? 1 : -1);
            });
            
            // Pulse eye based on phase
            const pulseSpeed = 0.002 * (1 + this.currentPhase);
            const time = Date.now() * pulseSpeed;
            
            // Change eye color and intensity based on phase
            let eyeColor;
            switch (this.currentPhase) {
                case 0: eyeColor = 0xffcc00; break; // Yellow
                case 1: eyeColor = 0xff9900; break; // Orange
                case 2: eyeColor = 0xff5500; break; // Red-orange
                case 3: eyeColor = 0xff0000; break; // Red
                default: eyeColor = 0xffcc00;
            }
            
            this.eye.material.color.setHex(eyeColor);
            this.eye.material.emissive.setHex(eyeColor);
            this.eye.material.emissiveIntensity = 0.5 + Math.sin(time) * 0.3;
        } catch (error) {
            console.error("Error in boss visual update:", error);
        }
    }
    
    enterNewPhase() {
        // Called when boss enters a new phase (health threshold)
        
        // Visual effect for phase change
        this.flashColor(0xffffff, 1000);
        
        // Increase stats for each phase
        this.moveSpeed *= 1.2;
        this.attackCooldown *= 0.8;
        this.specialAttackCooldown *= 0.7;
        
        // Create phase transition effect
        this.createPhaseTransitionEffect();
    }
    
    createPhaseTransitionEffect() {
        // Visual effects for phase transition
        const position = this.mesh.position.clone();
        
        // Create energy burst
        const burstGeometry = new THREE.SphereGeometry(this.size, 32, 32);
        const burstMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00,
            transparent: true,
            opacity: 0.7
        });
        
        const burst = new THREE.Mesh(burstGeometry, burstMaterial);
        burst.position.copy(position);
        this.scene.add(burst);
        
        // Animation
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Expand burst
            burst.scale.setScalar(1 + progress * 5);
            burstMaterial.opacity = 0.7 * (1 - progress);
            
            // Continue animation
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(burst);
                burstMaterial.dispose();
                burstGeometry.dispose();
            }
        };
        
        animate();
    }
    
    attackPlayer() {
        try {
            // Basic melee attack
            const playerPosition = this.player.getPosition();
            const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).length();
            
            if (distanceToPlayer <= this.attackRange) {
                // Deal damage to player - ensure the damage is being applied
                console.log(`Boss attacking player with ${this.damage} damage`);
                this.player.takeDamage(this.damage);
                
                // Visual effect
                this.createMeleeAttackEffect();
            }
        } catch (error) {
            console.error("Error in boss attackPlayer:", error);
        }
    }
    
    performSpecialAttack() {
        // Choose a special attack based on current phase
        const availableAttacks = Math.min(this.attackPatterns.length, this.currentPhase + 2);
        const attackIndex = Math.floor(Math.random() * availableAttacks);
        
        // Execute the chosen attack
        this.attackPatterns[attackIndex]();
    }
    
    meleeAttack() {
        // Basic melee attack
        const playerPosition = this.player.getPosition();
        const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).length();
        
        if (distanceToPlayer <= this.attackRange) {
            // Deal damage to player
            this.player.takeDamage(this.damage);
            
            // Visual effect
            this.createMeleeAttackEffect();
        }
    }
    
    rangedAttack() {
        // Fire projectiles at player
        const projectileCount = 1 + this.currentPhase;
        
        for (let i = 0; i < projectileCount; i++) {
            setTimeout(() => {
                if (!this.isAlive) return;
                
                const playerPosition = this.player.getPosition();
                const direction = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
                
                // Add some spread for multiple projectiles
                if (projectileCount > 1) {
                    const angle = (i / (projectileCount - 1) - 0.5) * Math.PI * 0.3;
                    const rotationMatrix = new THREE.Matrix4().makeRotationY(angle);
                    direction.applyMatrix4(rotationMatrix);
                }
                
                direction.normalize();
                
                // Fire projectile
                this.fireProjectile(direction);
            }, i * 200); // Stagger shots
        }
    }
    
    chargeAttack() {
        // Fast charge toward player's position
        const playerPosition = this.player.getPosition();
        
        // Visual telegraph for charge
        this.flashColor(0xff3300, 500);
        
        // Start charging after telegraph
        setTimeout(() => {
            if (!this.isAlive) return;
            
            this.isCharging = true;
            this.chargeTarget = playerPosition.clone();
        }, 500);
    }
    
    aoeAttack() {
        // Area of effect attack - waves of damage
        const waveCount = 3;
        const position = this.mesh.position.clone();
        
        // Telegraph effect
        this.flashColor(0x9900ff, 1000);
        
        // Start AOE waves after telegraph
        setTimeout(() => {
            if (!this.isAlive) return;
            
            // Create waves of expanding rings
            for (let i = 0; i < waveCount; i++) {
                setTimeout(() => {
                    if (!this.isAlive) return;
                    this.createAoeWave(position, i);
                }, i * 500);
            }
        }, 1000);
    }
    
    createAoeWave(position, waveIndex) {
        position = position.clone();
        position.y = 0.1;
        
        // Create expanding ring
        const ringGeometry = new THREE.RingGeometry(0, this.size, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x9900ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        
        // Animation
        const duration = 1000;
        const damageRadius = this.size * 5;
        const startTime = Date.now();
        let damageDealt = false;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Expand ring
            const currentRadius = damageRadius * progress;
            ring.scale.setScalar(currentRadius / this.size);
            ringMaterial.opacity = 0.7 * (1 - progress);
            
            // Deal damage to player if in wave radius (only once)
            if (!damageDealt && progress > 0.3 && progress < 0.6) {
                const playerPosition = this.player.getPosition();
                const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, position).length();
                
                const innerRadius = damageRadius * 0.3;
                const outerRadius = damageRadius * 0.6;
                
                if (distanceToPlayer >= innerRadius && distanceToPlayer <= outerRadius) {
                    this.player.takeDamage(this.damage * 0.7);
                    damageDealt = true;
                }
            }
            
            // Continue animation
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(ring);
                ringMaterial.dispose();
                ringGeometry.dispose();
            }
        };
        
        animate();
    }
    
    createMeleeAttackEffect() {
        // Visual effect for melee attack
        const position = this.mesh.position.clone();
        const direction = new THREE.Vector3().subVectors(this.player.getPosition(), position).normalize();
        
        // Position slightly in front of boss
        position.add(direction.multiplyScalar(this.size * 1.2));
        
        // Create slash effect
        const slashGeometry = new THREE.BufferGeometry();
        const slashVertices = [];
        
        // Create a crescent shape
        const segments = 10;
        const radius = this.size * 1.5;
        const angle = Math.PI * 0.7; // 126 degrees arc
        
        for (let i = 0; i <= segments; i++) {
            const theta = -angle/2 + (angle * i / segments);
            slashVertices.push(0, 0, 0);
            slashVertices.push(
                radius * Math.cos(theta),
                radius * Math.sin(theta),
                0
            );
        }
        
        slashGeometry.setAttribute('position', new THREE.Float32BufferAttribute(slashVertices, 3));
        
        const slashMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
            linewidth: 3
        });
        
        const slash = new THREE.LineSegments(slashGeometry, slashMaterial);
        
        // Orient slash toward player
        slash.position.copy(position);
        slash.lookAt(this.player.getPosition());
        
        this.scene.add(slash);
        
        // Animation
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Rotate slash
            slash.rotation.z = progress * Math.PI;
            
            // Fade out
            slashMaterial.opacity = 1 - progress;
            
            // Continue animation
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(slash);
                slashMaterial.dispose();
                slashGeometry.dispose();
            }
        };
        
        animate();
    }
    
    fireProjectile(direction) {
        try {
            // Create a projectile at the boss's position
            const position = this.mesh.position.clone();
            position.y = this.size;
            
            // Offset slightly in the firing direction
            const offset = direction.clone().multiplyScalar(this.size * 1.2);
            position.add(offset);
            
            // Create projectile with the correct parameter order
            const projectile = new Projectile(
                this.scene,
                position,
                direction,
                0.15,                // speed
                0.5,                 // size
                this.damage * 0.8,   // damage
                0xff3300,            // color
                false,               // isFromPlayer
                null,                // target
                5000                 // lifetime
            );
            
            // Store reference for updating and cleanup
            this.projectiles.push(projectile);
            
            // Limit max projectiles for performance
            if (this.projectiles.length > this.maxProjectiles) {
                const oldestProjectile = this.projectiles.shift();
                if (oldestProjectile.isActive) {
                    oldestProjectile.deactivate();
                }
            }
            
            console.log("Boss fired projectile at player");
        } catch (error) {
            console.error("Error firing boss projectile:", error);
        }
    }
    
    updateProjectiles(deltaTime) {
        try {
            // Only check for collisions with player
            // Movement and visual updates are handled by ProjectileManager
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                
                if (projectile.isActive) {
                    // Check collision with player using the projectile's own method
                    if (projectile.checkPlayerCollision && this.player) {
                        projectile.checkPlayerCollision(this.player);
                    } else {
                        // Manual collision check as fallback
                        const playerPos = this.player.getPosition();
                        const distance = projectile.mesh.position.distanceTo(playerPos);
                        
                        if (distance < (projectile.size + 0.5)) {
                            console.log(`Boss projectile hit player for ${projectile.damage} damage`);
                            this.player.takeDamage(projectile.damage);
                            projectile.deactivate();
                        }
                    }
                } else {
                    // Remove inactive projectiles
                    this.projectiles.splice(i, 1);
                }
            }
        } catch (error) {
            console.error("Error updating boss projectiles:", error);
        }
    }
    
    takeDamage(amount) {
        try {
            // Check if we're alive before taking damage
            if (!this.isAlive || !this.mesh) return;
            
            // Apply damage
            this.health -= amount;
            
            // Flash red when taking damage
            this.flashColor(0xff0000);
            
            // Debug log for damage
            console.log(`Boss took ${amount} damage. Health: ${this.health}/${this.maxHealth}`);
            
            // Check if dead
            if (this.health <= 0) {
                this.health = 0;
                this.die();
            }
            
            // Update UI
            if (this.scene.waveManager) {
                this.scene.waveManager.updateWaveDisplay();
            }
        } catch (error) {
            console.error("Error in boss takeDamage:", error);
        }
    }
    
    die() {
        console.log("Boss die() method called - cleaning up mesh");
        // Set alive status to false
        this.isAlive = false;
        
        // Clean up projectiles
        for (const projectile of this.projectiles) {
            if (projectile.isActive) {
                projectile.deactivate();
            }
        }
        this.projectiles = [];
        
        // IMPORTANT: Completely remove the boss mesh from the scene
        if (this.mesh) {
            console.log("Removing boss mesh from scene");
            
            // First, remove and dispose of all children components
            if (this.spikes && this.spikes.length) {
                this.spikes.forEach(spike => {
                    this.mesh.remove(spike);
                    if (spike.geometry) spike.geometry.dispose();
                    if (spike.material) spike.material.dispose();
                });
                this.spikes = [];
            }
            
            if (this.crown) {
                this.mesh.remove(this.crown);
                if (this.crown.geometry) this.crown.geometry.dispose();
                if (this.crown.material) this.crown.material.dispose();
                this.crown = null;
            }
            
            if (this.eye) {
                this.mesh.remove(this.eye);
                if (this.eye.geometry) this.eye.geometry.dispose();
                if (this.eye.material) this.eye.material.dispose();
                this.eye = null;
            }
            
            // Then remove any remaining children (just to be safe)
            while (this.mesh.children.length > 0) {
                const child = this.mesh.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
                this.mesh.remove(child);
            }
            
            // Remove the main mesh from the scene
            this.scene.remove(this.mesh);
            
            // Dispose of main mesh resources
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            
            // Clear the mesh reference
            this.mesh = null;
            console.log("Boss mesh cleanup complete");
        }
    }
    
    // Override removeFromScene to prevent boss from being added to enemy pool
    removeFromScene() {
        console.log("Boss removeFromScene called - ensuring complete cleanup");
        // For bosses, we need to make sure the mesh is completely removed and not pooled
        if (this.mesh) {
            // Remove from scene and dispose resources if not already done by die()
            if (this.mesh.parent) {
                this.scene.remove(this.mesh);
            }
            
            // Dispose of main mesh resources if not already done
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            
            // Clear the mesh reference
            this.mesh = null;
        }
        // Do NOT call enemyPool.release() here, as bosses should not be pooled
    }
    
    // Override the collisionRadius getter for better player collision detection
    get collisionRadius() {
        return this.size * 1.2; // Use boss size for collision radius
    }
} 