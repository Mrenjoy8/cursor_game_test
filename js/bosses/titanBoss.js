import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { BaseEnemy } from '../enemy.js';
import { Projectile } from '../projectile.js';

export class TitanBoss extends BaseEnemy {
    constructor(scene, position, player, bossLevel = 1) {
        super(scene, position, player);
        
        // Boss specific properties
        this.type = 'titan';
        this.bossLevel = bossLevel;
        
        // Scale health, damage and rewards with boss level
        this.maxHealth = 400 * bossLevel; // Higher health than other bosses - DOUBLED
        this.health = this.maxHealth;
        this.damage = 25 + (12 * bossLevel); // High damage
        this.experienceValue = 500 * bossLevel;
        
        // Movement properties - very slow but powerful
        this.moveSpeed = 0.008; // Slower than other bosses
        this.chargeSpeed = 0.04; // Speed during charge attack
        this.isCharging = false;
        this.chargeTarget = null;
        this.attackCooldown = 1800; // ms between attacks (REDUCED from 2500ms)
        this.specialAttackCooldown = 5000; // ms between special attacks (REDUCED from 10000ms)
        this.lastSpecialAttackTime = 0;
        this.attackRange = 2.5; // Short attack range
        this.defaultColor = 0xff3300; // Red-orange
        
        // Titan appearance vars
        this.size = 2.0 + (bossLevel * 0.6); // Larger than other bosses
        this.spinSpeed = 0.005; // Slower spin
        
        // Attack patterns
        this.attackPatterns = [
            this.groundSmash.bind(this),   // Smashes ground, damaging nearby
            this.chargeAttack.bind(this),  // Charge at player
            this.multiSmash.bind(this)     // Multiple smash attacks
        ];
        
        // Initialize boss phases (gets more aggressive at lower health)
        this.phaseThresholds = [0.75, 0.5, 0.25]; // Percentage of health
        this.currentPhase = 0;
        
        // Unique titan properties
        this.armorValue = 10 * bossLevel; // Damage reduction
        this.groundSmashCooldown = 3000; // REDUCED from 5000ms
        this.lastGroundSmashTime = 0;
        
        // Create the boss mesh
        this.createEnemyMesh(position);
        
        // Add dramatic entrance effect
        this.playEntranceAnimation();
    }
    
    createEnemyMesh(position) {
        try {
            // Create a more complex boss mesh
            
            // Main body - larger geometry for the boss
            const bodyGeometry = new THREE.BoxGeometry(this.size, this.size * 1.2, this.size);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.7,
                metalness: 0.3
            });
            this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
            this.mesh.castShadow = true;
            
            // Position the mesh
            this.mesh.position.copy(position);
            this.mesh.position.y = this.size * 0.6; // Lift based on size
            
            // Create armor plates
            const plateCount = 6;
            this.plates = [];
            
            // Top armor plate (shoulders)
            const shoulderGeometry = new THREE.BoxGeometry(this.size * 1.4, this.size * 0.2, this.size * 1.2);
            const armorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x990000, // Darker red
                roughness: 0.4,
                metalness: 0.8
            });
            
            const shoulders = new THREE.Mesh(shoulderGeometry, armorMaterial);
            shoulders.position.y = this.size * 0.4;
            this.mesh.add(shoulders);
            this.plates.push(shoulders);
            
            // Create arms
            const armGeometry = new THREE.CylinderGeometry(this.size * 0.25, this.size * 0.3, this.size * 0.8, 8);
            const armMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.6,
                metalness: 0.4
            });
            
            // Left arm
            this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
            this.leftArm.position.set(-this.size * 0.65, 0, 0);
            this.leftArm.rotation.z = Math.PI / 6; // Angle outward
            this.mesh.add(this.leftArm);
            
            // Right arm
            this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
            this.rightArm.position.set(this.size * 0.65, 0, 0);
            this.rightArm.rotation.z = -Math.PI / 6; // Angle outward
            this.mesh.add(this.rightArm);
            
            // Create fists
            const fistGeometry = new THREE.BoxGeometry(this.size * 0.4, this.size * 0.4, this.size * 0.4);
            const fistMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x990000,
                roughness: 0.5,
                metalness: 0.5
            });
            
            // Left fist
            this.leftFist = new THREE.Mesh(fistGeometry, fistMaterial);
            this.leftFist.position.set(-this.size * 0.2, -this.size * 0.4, 0);
            this.leftArm.add(this.leftFist);
            
            // Right fist
            this.rightFist = new THREE.Mesh(fistGeometry, fistMaterial);
            this.rightFist.position.set(this.size * 0.2, -this.size * 0.4, 0);
            this.rightArm.add(this.rightFist);
            
            // Create head
            const headGeometry = new THREE.BoxGeometry(this.size * 0.6, this.size * 0.5, this.size * 0.6);
            const headMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.7,
                metalness: 0.2
            });
            
            this.head = new THREE.Mesh(headGeometry, headMaterial);
            this.head.position.y = this.size * 0.7;
            this.mesh.add(this.head);
            
            // Create eyes (two red eyes)
            const eyeGeometry = new THREE.SphereGeometry(this.size * 0.08, 8, 8);
            const eyeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.5
            });
            
            // Left eye
            this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            this.leftEye.position.set(-this.size * 0.15, this.size * 0.1, this.size * 0.3);
            this.head.add(this.leftEye);
            
            // Right eye
            this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            this.rightEye.position.set(this.size * 0.15, this.size * 0.1, this.size * 0.3);
            this.head.add(this.rightEye);
            
            // Add to scene
            this.scene.add(this.mesh);
            
            // Log for debugging
            console.log("Titan boss mesh created successfully");
        } catch (error) {
            console.error("Error creating Titan boss mesh:", error);
        }
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
                // Normal behavior
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
                
                // Ground smash on cooldown
                if (currentTime - this.lastGroundSmashTime > this.groundSmashCooldown && 
                    distanceToPlayer <= this.attackRange * 2 && Math.random() < 0.1) {
                    this.groundSmash();
                    this.lastGroundSmashTime = currentTime;
                }
            }
            
            // Always update visual elements
            this.updateVisuals(deltaTime);
        } catch (error) {
            console.error("Error in Titan boss update:", error);
        }
    }
    
    // Override takeDamage to implement armor
    takeDamage(amount) {
        try {
            // Check if we're alive before taking damage
            if (!this.isAlive || !this.mesh) return;
            
            // Reduce damage by armor value
            const reducedDamage = Math.max(1, amount - this.armorValue);
            
            // Apply damage
            this.health -= reducedDamage;
            
            // Flash red when taking damage
            this.flashColor(0xff0000);
            
            // Debug log for damage
            console.log(`Titan boss took ${reducedDamage} damage (reduced from ${amount} by armor). Health: ${this.health}/${this.maxHealth}`);
            
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
            console.error("Error in Titan boss takeDamage:", error);
        }
    }
    
    updateVisuals(deltaTime) {
        try {
            if (!this.mesh) return;
            
            // Animate arms based on phase
            const armSwingSpeed = 0.001 * (1 + this.currentPhase * 0.5);
            const time = Date.now() * armSwingSpeed;
            
            // Swing arms
            if (this.leftArm && this.rightArm) {
                this.leftArm.rotation.x = Math.sin(time) * 0.2;
                this.rightArm.rotation.x = Math.sin(time + Math.PI) * 0.2;
            }
            
            // Change eye color and intensity based on phase
            if (this.leftEye && this.rightEye) {
                let eyeColor;
                switch (this.currentPhase) {
                    case 0: eyeColor = 0xff0000; break; // Red
                    case 1: eyeColor = 0xff3300; break; // Orange-red
                    case 2: eyeColor = 0xff6600; break; // Orange
                    case 3: eyeColor = 0xff9900; break; // Yellow-orange
                    default: eyeColor = 0xff0000;
                }
                
                this.leftEye.material.color.setHex(eyeColor);
                this.leftEye.material.emissive.setHex(eyeColor);
                this.rightEye.material.color.setHex(eyeColor);
                this.rightEye.material.emissive.setHex(eyeColor);
                
                const intensity = 0.5 + Math.sin(time * 5) * 0.3;
                this.leftEye.material.emissiveIntensity = intensity;
                this.rightEye.material.emissiveIntensity = intensity;
            }
        } catch (error) {
            console.error("Error in Titan boss visual update:", error);
        }
    }
    
    // Method to perform a special attack chosen from the attack patterns
    performSpecialAttack() {
        try {
            // Choose a random attack from the attack patterns
            const randomIndex = Math.floor(Math.random() * this.attackPatterns.length);
            const attackFunction = this.attackPatterns[randomIndex];
            
            // Log which special attack is being performed
            console.log(`Titan boss performing special attack: ${attackFunction.name || "Unknown"}`);
            
            // Execute the selected attack
            attackFunction();
            
            // Update last special attack time (this happens in the update method as well, but adding it here for safety)
            this.lastSpecialAttackTime = Date.now();
        } catch (error) {
            console.error("Error in Titan performSpecialAttack:", error);
        }
    }
    
    // Special attack methods
    groundSmash() {
        try {
            console.log("Titan boss performing Ground Smash attack");
            
            // Wind up animation
            this.flashColor(0xff6600, 500);
            
            setTimeout(() => {
                if (!this.isAlive) return;
                
                // Raise both arms
                if (this.leftArm && this.rightArm) {
                    this.leftArm.rotation.x = -Math.PI / 2;
                    this.rightArm.rotation.x = -Math.PI / 2;
                }
                
                // After windup, perform smash
                setTimeout(() => {
                    if (!this.isAlive) return;
                    
                    // Smash animation
                    if (this.leftArm && this.rightArm) {
                        this.leftArm.rotation.x = Math.PI / 3;
                        this.rightArm.rotation.x = Math.PI / 3;
                    }
                    
                    // Create ground smash effect
                    this.createGroundSmashEffect();
                    
                    // Deal damage to player if in range
                    const playerPosition = this.player.getPosition();
                    const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).length();
                    
                    if (distanceToPlayer < this.size * 3) {
                        // Damage decreases with distance
                        const damageMultiplier = 1 - (distanceToPlayer / (this.size * 3));
                        const damage = this.damage * 1.5 * damageMultiplier;
                        console.log(`Ground smash hitting player for ${damage} damage`);
                        this.player.takeDamage(damage);
                    }
                }, 500);
            }, 500);
        } catch (error) {
            console.error("Error in Titan ground smash attack:", error);
        }
    }
    
    createGroundSmashEffect() {
        // Create ground impact rings
        const position = this.mesh.position.clone();
        position.y = 0.05; // Just above ground
        
        // Create expanding ring
        const ringGeometry = new THREE.RingGeometry(0, this.size * 3, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3300, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2; // Lay flat
        this.scene.add(ring);
        
        // Create debris particles
        const particleCount = 30;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const size = (Math.random() * 0.3) + 0.1;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0x995500 
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Random position within circle
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.size * 2;
            particle.position.set(
                position.x + Math.cos(angle) * radius,
                position.y,
                position.z + Math.sin(angle) * radius
            );
            
            // Random velocity
            const speed = 0.05 + Math.random() * 0.1;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed * 0.5,
                speed * 2,
                Math.sin(angle) * speed * 0.5
            );
            
            this.scene.add(particle);
            particles.push({ mesh: particle, velocity: velocity });
        }
        
        // Animation
        const duration = 1000; // 1 second
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Expand ring
            ring.scale.setScalar(progress);
            ringMaterial.opacity = 0.8 * (1 - progress);
            
            // Animate particles
            particles.forEach(particle => {
                // Apply velocity
                particle.mesh.position.x += particle.velocity.x;
                particle.mesh.position.y += particle.velocity.y;
                particle.mesh.position.z += particle.velocity.z;
                
                // Apply gravity
                particle.velocity.y -= 0.003;
                
                // Rotate particle
                particle.mesh.rotation.x += 0.1;
                particle.mesh.rotation.z += 0.1;
                
                // Check if particle hit ground
                if (particle.mesh.position.y < 0) {
                    particle.mesh.position.y = 0;
                    particle.velocity.y = -particle.velocity.y * 0.4; // Bounce with reduced velocity
                }
            });
            
            // Continue animation
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(ring);
                ringMaterial.dispose();
                ringGeometry.dispose();
                
                particles.forEach(particle => {
                    this.scene.remove(particle.mesh);
                    particle.mesh.geometry.dispose();
                    particle.mesh.material.dispose();
                });
            }
        };
        
        animate();
    }
    
    multiSmash() {
        try {
            console.log("Titan boss performing Multi-Smash attack");
            
            // Visual telegraph for charge
            this.flashColor(0xff9900, 400);
            
            // Number of smashes based on phase
            const smashCount = 2 + this.currentPhase;
            
            for (let i = 0; i < smashCount; i++) {
                setTimeout(() => {
                    if (!this.isAlive) return;
                    this.groundSmash();
                }, i * 1000); // One smash per second
            }
        } catch (error) {
            console.error("Error in Titan multi-smash attack:", error);
        }
    }
    
    chargeAttack() {
        try {
            // Fast charge toward player's position
            const playerPosition = this.player.getPosition();
            
            // Visual telegraph for charge
            this.flashColor(0xff3300, 500);
            
            // Start charging after telegraph
            setTimeout(() => {
                if (!this.isAlive) return;
                
                console.log("Titan boss starting charge attack");
                
                this.isCharging = true;
                this.chargeTarget = playerPosition.clone();
                
                // Lean forward during charge
                if (this.mesh) {
                    this.mesh.rotation.x = Math.PI * 0.1;
                }
            }, 500);
        } catch (error) {
            console.error("Error in Titan charge attack:", error);
        }
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
            
            // Reset rotation
            if (this.mesh) {
                this.mesh.rotation.x = 0;
            }
        } else {
            // Continue charging
            direction.normalize();
            
            this.mesh.position.x += direction.x * this.chargeSpeed * deltaTime;
            this.mesh.position.z += direction.z * this.chargeSpeed * deltaTime;
            
            // Face direction of movement
            this.faceDirection(direction);
            
            // Check if we hit the player during charge
            const playerPosition = this.player.getPosition();
            const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).length();
            
            if (distanceToPlayer < this.size + 0.5) {
                console.log(`Titan charge hit player for ${this.damage * 2} damage`);
                this.player.takeDamage(this.damage * 2);
                
                // Knock the player back
                const knockbackDirection = direction.clone();
                knockbackDirection.y = 0.2; // Add slight upward component
                knockbackDirection.normalize().multiplyScalar(3);
                
                // Apply knockback (if player has a knockback method)
                if (typeof this.player.applyKnockback === 'function') {
                    this.player.applyKnockback(knockbackDirection);
                }
            }
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
            const ringGeometry = new THREE.RingGeometry(0, this.size * (i + 1) * 0.7, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff5500, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
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
                ring.material.opacity = 0.8 * (1 - progress);
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
        
        if (distanceToPlayer < this.size * 2.5) {
            console.log(`Charge impact hit player for ${this.damage * 1.5} damage`);
            this.player.takeDamage(this.damage * 1.5);
        }
    }
    
    // Override attack player for Titan's specific attack
    attackPlayer() {
        try {
            // Basic punch attack
            const playerPosition = this.player.getPosition();
            const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).length();
            
            if (distanceToPlayer <= this.attackRange) {
                // Deal damage to player
                console.log(`Titan melee attacking player for ${this.damage} damage`);
                this.player.takeDamage(this.damage);
                
                // Alternate between left and right arm
                const useLeftArm = Math.random() > 0.5;
                
                // Perform punch animation
                if (useLeftArm && this.leftArm) {
                    this.leftArm.rotation.x = -Math.PI / 4;
                    setTimeout(() => {
                        if (this.leftArm) this.leftArm.rotation.x = Math.PI / 6;
                    }, 200);
                } else if (this.rightArm) {
                    this.rightArm.rotation.x = -Math.PI / 4;
                    setTimeout(() => {
                        if (this.rightArm) this.rightArm.rotation.x = Math.PI / 6;
                    }, 200);
                }
                
                // Visual effect
                this.createMeleeAttackEffect(useLeftArm);
            }
        } catch (error) {
            console.error("Error in Titan attackPlayer:", error);
        }
    }
    
    createMeleeAttackEffect(useLeftArm) {
        // Visual effect for melee attack
        const position = this.mesh.position.clone();
        const direction = new THREE.Vector3().subVectors(this.player.getPosition(), position).normalize();
        
        // Position slightly in front of boss and to the side based on which arm
        const sideOffset = useLeftArm ? -1 : 1;
        const sideDir = new THREE.Vector3(direction.z * sideOffset, 0, -direction.x * sideOffset).normalize();
        position.add(direction.multiplyScalar(this.size * 1.2));
        position.add(sideDir.multiplyScalar(this.size * 0.5));
        position.y = this.size * 0.3; // Height of punch
        
        // Create smash effect
        const effectGeometry = new THREE.SphereGeometry(this.size * 0.4, 8, 8);
        const effectMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3300,
            transparent: true,
            opacity: 0.7
        });
        
        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.copy(position);
        this.scene.add(effect);
        
        // Animation
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Expand and fade
            effect.scale.setScalar(1 + progress);
            effectMaterial.opacity = 0.7 * (1 - progress);
            
            // Continue animation
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(effect);
                effectMaterial.dispose();
                effectGeometry.dispose();
            }
        };
        
        animate();
    }
    
    // Special behavior when changing phases
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
        
        // Titan gets more armor as it gets angrier
        this.armorValue += 5;
    }
    
    createPhaseTransitionEffect() {
        // Will be implemented if needed for animation effects
    }
    
    playEntranceAnimation() {
        try {
            console.log("Titan boss dramatic entrance");
            
            // Make boss initially invisible
            if (this.mesh) this.mesh.visible = false;
            
            // Create ground impact effect
            const position = this.mesh.position.clone();
            position.y = 0.05; // Just above ground
            
            // Create impact crater
            const craterGeometry = new THREE.CircleGeometry(this.size * 2, 32);
            const craterMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff3300,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            const crater = new THREE.Mesh(craterGeometry, craterMaterial);
            crater.position.copy(position);
            crater.rotation.x = -Math.PI / 2; // Lay flat
            this.scene.add(crater);
            
            // Create dust particles
            const particleCount = 50;
            const particles = [];
            
            for (let i = 0; i < particleCount; i++) {
                const size = 0.2 + Math.random() * 0.4;
                const geometry = new THREE.BoxGeometry(size, size, size);
                const material = new THREE.MeshBasicMaterial({ 
                    color: 0x995500, // Brown dust
                    transparent: true,
                    opacity: 0.7 + Math.random() * 0.3
                });
                
                const particle = new THREE.Mesh(geometry, material);
                
                // Random position in a circle around impact
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * this.size * 3;
                particle.position.set(
                    position.x + Math.cos(angle) * radius,
                    position.y + Math.random() * this.size * 2,
                    position.z + Math.sin(angle) * radius
                );
                
                // Random velocity for dust explosion
                const speed = 0.03 + Math.random() * 0.05;
                const velocity = {
                    x: Math.cos(angle) * speed,
                    y: 0.02 + Math.random() * 0.08,
                    z: Math.sin(angle) * speed
                };
                
                this.scene.add(particle);
                particles.push({ mesh: particle, velocity: velocity });
            }
            
            // Animate impact
            const duration = 2000; // 2 seconds
            const startTime = Date.now();
            
            const animateImpact = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Expand crater
                const scale = Math.min(1 + progress * 0.5, 1.2);
                crater.scale.set(scale, scale, scale);
                
                // Fade crater
                craterMaterial.opacity = 0.7 * (1 - progress);
                
                // Animate particles
                particles.forEach(particle => {
                    // Apply velocity
                    particle.mesh.position.x += particle.velocity.x;
                    particle.mesh.position.y += particle.velocity.y;
                    particle.mesh.position.z += particle.velocity.z;
                    
                    // Apply gravity to y velocity
                    particle.velocity.y -= 0.002;
                    
                    // Slow down x and z velocity
                    particle.velocity.x *= 0.98;
                    particle.velocity.z *= 0.98;
                    
                    // Fade out
                    if (particle.mesh.material) {
                        particle.mesh.material.opacity = Math.max(0, 0.9 * (1 - progress * 1.2));
                    }
                    
                    // Rotate particle
                    particle.mesh.rotation.x += 0.02;
                    particle.mesh.rotation.y += 0.02;
                });
                
                // Show boss at halfway point with slow rise
                if (progress > 0.5 && this.mesh && !this.mesh.visible) {
                    this.mesh.visible = true;
                    
                    // Start position below ground
                    this.mesh.position.y = -this.size;
                    
                    // Rise animation
                    const riseDuration = 1000; // 1 second
                    const riseStartTime = Date.now();
                    const targetY = this.size * 0.6; // Final position
                    
                    const riseAnimation = () => {
                        const riseElapsed = Date.now() - riseStartTime;
                        const riseProgress = Math.min(riseElapsed / riseDuration, 1.0);
                        
                        // Smoothly rise from ground
                        this.mesh.position.y = -this.size + (targetY + this.size) * riseProgress;
                        
                        if (riseProgress < 1.0) {
                            requestAnimationFrame(riseAnimation);
                        } else {
                            // End rise animation
                            this.mesh.position.y = targetY;
                            
                            // Flash eyes red
                            if (this.leftEye && this.rightEye) {
                                const originalIntensity = this.leftEye.material.emissiveIntensity;
                                this.leftEye.material.emissiveIntensity = 2;
                                this.rightEye.material.emissiveIntensity = 2;
                                
                                setTimeout(() => {
                                    if (this.leftEye && this.rightEye) {
                                        this.leftEye.material.emissiveIntensity = originalIntensity;
                                        this.rightEye.material.emissiveIntensity = originalIntensity;
                                    }
                                }, 500);
                            }
                            
                            // Raise arms in threatening pose
                            if (this.leftArm && this.rightArm) {
                                this.leftArm.rotation.x = -Math.PI / 3;
                                this.rightArm.rotation.x = -Math.PI / 3;
                                
                                setTimeout(() => {
                                    if (this.leftArm && this.rightArm) {
                                        this.leftArm.rotation.x = 0;
                                        this.rightArm.rotation.x = 0;
                                    }
                                }, 800);
                            }
                        }
                    };
                    
                    riseAnimation();
                }
                
                // Continue impact animation
                if (progress < 1.0) {
                    requestAnimationFrame(animateImpact);
                } else {
                    // Clean up
                    this.scene.remove(crater);
                    craterMaterial.dispose();
                    craterGeometry.dispose();
                    
                    particles.forEach(particle => {
                        this.scene.remove(particle.mesh);
                        particle.mesh.geometry.dispose();
                        particle.mesh.material.dispose();
                    });
                }
            };
            
            animateImpact();
            
        } catch (error) {
            console.error("Error in Titan entrance animation:", error);
            // Ensure boss is visible even if animation fails
            if (this.mesh) this.mesh.visible = true;
        }
    }
    
    get collisionRadius() {
        return this.size * 1.2; // Use titan size for collision radius
    }
    
    // Override removeFromScene to prevent boss from being added to enemy pool
    removeFromScene() {
        console.log("Titan Boss removeFromScene called - ensuring complete cleanup");
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
} 