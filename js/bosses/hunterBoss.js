import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { BaseEnemy } from '../enemy.js';
import { Projectile } from '../projectile.js';

export class HunterBoss extends BaseEnemy {
    constructor(scene, position, player, bossLevel = 1) {
        super(scene, position, player);
        
        // Boss specific properties
        this.type = 'hunter';
        this.bossLevel = bossLevel;
        
        // Scale health, damage and rewards with boss level
        this.maxHealth = 120 * bossLevel; // Lower health but faster and more agile
        this.health = this.maxHealth;
        this.damage = 15 + (8 * bossLevel); // Medium damage
        this.experienceValue = 500 * bossLevel;
        
        // Movement properties - fastest of all bosses
        this.moveSpeed = 0.025; // Much faster than other bosses
        this.dashSpeed = 0.06; // Speed during dash attack
        this.dashCooldown = 4000; // ms between dashes
        this.lastDashTime = 0;
        this.isDashing = false;
        this.dashTarget = null;
        
        this.attackCooldown = 1000; // ms between attacks (fast attacks)
        this.specialAttackCooldown = 5000; // ms between special attacks
        this.lastSpecialAttackTime = 0;
        this.attackRange = 2; // Short attack range for melee
        this.rangedAttackRange = 15; // Long range for ranged attacks
        this.preferredDistance = 8; // Tries to maintain this distance
        this.defaultColor = 0x00ff99; // Green-cyan
        
        // Hunter appearance vars
        this.size = 1.0 + (bossLevel * 0.3); // Smaller but faster
        
        // Attack patterns
        this.attackPatterns = [
            this.dashAttack.bind(this),      // Quick dash toward player
            this.throwingKnives.bind(this),  // Multiple projectiles
            this.smokeBomb.bind(this)        // Defensive smoke bomb
        ];
        
        // Initialize boss phases
        this.phaseThresholds = [0.75, 0.5, 0.25]; // Percentage of health
        this.currentPhase = 0;
        
        // Projectile management
        this.projectiles = [];
        this.maxProjectiles = 20;
        
        // Create the boss mesh
        this.createEnemyMesh(position);
        
        // Add dramatic entrance effect
        this.playEntranceAnimation();
    }
    
    createEnemyMesh(position) {
        try {
            // Create a sleek, agile hunter mesh
            
            // Main body
            const bodyGeometry = new THREE.CylinderGeometry(this.size * 0.3, this.size * 0.5, this.size * 1.5, 6);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.6,
                metalness: 0.4
            });
            this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
            this.mesh.castShadow = true;
            
            // Position the mesh
            this.mesh.position.copy(position);
            this.mesh.position.y = this.size * 0.75; // Half height
            
            // Create head
            const headGeometry = new THREE.SphereGeometry(this.size * 0.3, 12, 12);
            const headMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00cc77, // Slightly darker green
                roughness: 0.5,
                metalness: 0.3
            });
            
            this.head = new THREE.Mesh(headGeometry, headMaterial);
            this.head.position.y = this.size * 0.9;
            this.mesh.add(this.head);
            
            // Create eyes (two glowing eyes)
            const eyeGeometry = new THREE.SphereGeometry(this.size * 0.07, 8, 8);
            const eyeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffcc00, // Yellow
                emissive: 0xffcc00,
                emissiveIntensity: 0.7
            });
            
            // Left eye
            this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            this.leftEye.position.set(-this.size * 0.12, this.size * 0.05, this.size * 0.25);
            this.head.add(this.leftEye);
            
            // Right eye
            this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            this.rightEye.position.set(this.size * 0.12, this.size * 0.05, this.size * 0.25);
            this.head.add(this.rightEye);
            
            // Create shoulders/armor
            const shoulderGeometry = new THREE.BoxGeometry(this.size * 0.8, this.size * 0.2, this.size * 0.4);
            const armorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x006644, // Darker green
                roughness: 0.4,
                metalness: 0.6
            });
            
            this.shoulders = new THREE.Mesh(shoulderGeometry, armorMaterial);
            this.shoulders.position.y = this.size * 0.6;
            this.mesh.add(this.shoulders);
            
            // Create arms
            const armGeometry = new THREE.CylinderGeometry(this.size * 0.1, this.size * 0.1, this.size * 0.6, 8);
            const armMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.6,
                metalness: 0.3
            });
            
            // Left arm
            this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
            this.leftArm.position.set(-this.size * 0.4, this.size * 0.3, 0);
            this.leftArm.rotation.z = Math.PI / 3; // Angle outward
            this.mesh.add(this.leftArm);
            
            // Right arm
            this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
            this.rightArm.position.set(this.size * 0.4, this.size * 0.3, 0);
            this.rightArm.rotation.z = -Math.PI / 3; // Angle outward
            this.mesh.add(this.rightArm);
            
            // Create blades (weapons)
            const bladeGeometry = new THREE.BoxGeometry(this.size * 0.05, this.size * 0.4, this.size * 0.1);
            const bladeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xcccccc, // Silver
                roughness: 0.2,
                metalness: 0.9
            });
            
            // Left blade
            this.leftBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            this.leftBlade.position.set(0, -this.size * 0.3, this.size * 0.1);
            this.leftArm.add(this.leftBlade);
            
            // Right blade
            this.rightBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            this.rightBlade.position.set(0, -this.size * 0.3, this.size * 0.1);
            this.rightArm.add(this.rightBlade);
            
            // Add to scene
            this.scene.add(this.mesh);
            
            console.log("Hunter boss mesh created successfully");
        } catch (error) {
            console.error("Error creating Hunter boss mesh:", error);
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
            
            // Update boss behavior
            if (this.isDashing) {
                this.updateDashAttack(deltaTime);
            } else {
                // Normal behavior - dynamic combat style
                const playerPosition = this.player.getPosition();
                
                // Calculate direction to player
                const direction = new THREE.Vector3();
                direction.subVectors(playerPosition, this.mesh.position);
                direction.y = 0; // Keep movement on xz plane
                
                // Calculate distance to player
                const distanceToPlayer = direction.length();
                
                // Decide whether to use melee or ranged based on distance and phase
                const useRanged = this.decideAttackType(distanceToPlayer);
                
                if (useRanged) {
                    // Ranged combat - maintain distance
                    this.handleRangedCombat(direction, distanceToPlayer, deltaTime);
                } else {
                    // Melee combat - get close
                    this.handleMeleeCombat(direction, distanceToPlayer, deltaTime);
                }
                
                // Check if should perform a special attack
                const currentTime = Date.now();
                if (currentTime - this.lastSpecialAttackTime > this.specialAttackCooldown) {
                    this.performSpecialAttack();
                    this.lastSpecialAttackTime = currentTime;
                }
                
                // Consider dash attack if not on cooldown
                if (currentTime - this.lastDashTime > this.dashCooldown && 
                    distanceToPlayer > this.attackRange * 2 && 
                    distanceToPlayer < this.rangedAttackRange &&
                    Math.random() < 0.05) {
                    this.dashAttack();
                }
            }
            
            // Update visual elements
            this.updateVisuals(deltaTime);
            
            // Update projectiles
            this.updateProjectiles(deltaTime);
        } catch (error) {
            console.error("Error in Hunter boss update:", error);
        }
    }
    
    decideAttackType(distanceToPlayer) {
        // Decision logic for picking ranged vs melee attacks
        // Hunter prefers to mix between styles - more aggressive in later phases
        
        if (distanceToPlayer < this.attackRange * 1.2) {
            // Always use melee if very close
            return false;
        } else if (distanceToPlayer > this.rangedAttackRange * 0.8) {
            // Always use ranged if very far
            return true;
        } else {
            // Dynamic choice based on phase and random factor
            // Higher phases make hunter more aggressive (prefer melee)
            const meleeChance = 0.3 + (this.currentPhase * 0.1);
            return Math.random() > meleeChance;
        }
    }
    
    handleMeleeCombat(direction, distanceToPlayer, deltaTime) {
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
    }
    
    handleRangedCombat(direction, distanceToPlayer, deltaTime) {
        // Try to maintain optimal distance
        if (distanceToPlayer < this.preferredDistance - 1) {
            // Too close, move away
            this.moveAwayFromPlayer(direction, distanceToPlayer, deltaTime);
        } else if (distanceToPlayer > this.preferredDistance + 1) {
            // Too far, move closer
            this.moveTowardsPlayer(direction, distanceToPlayer, deltaTime);
        }
        
        // Always face player
        this.faceDirection(direction);
        
        // Attack if in range and cooldown has passed
        if (distanceToPlayer <= this.rangedAttackRange) {
            const currentTime = Date.now();
            if (currentTime - this.lastAttackTime > this.attackCooldown * 1.5) { // Slightly longer cooldown for ranged
                this.throwSingleKnife();
                this.lastAttackTime = currentTime;
            }
        }
    }
    
    moveAwayFromPlayer(direction, distance, deltaTime) {
        // Move away from player
        const moveDir = direction.clone().normalize().negate();
        
        this.mesh.position.x += moveDir.x * this.moveSpeed * deltaTime;
        this.mesh.position.z += moveDir.z * this.moveSpeed * deltaTime;
        
        // Face the direction we're moving
        this.faceDirection(moveDir.negate());
    }
    
    // Override moveTowardsPlayer to use hunter's speed
    moveTowardsPlayer(direction, distance, deltaTime) {
        const moveDir = direction.clone().normalize();
        
        this.mesh.position.x += moveDir.x * this.moveSpeed * deltaTime;
        this.mesh.position.z += moveDir.z * this.moveSpeed * deltaTime;
        
        // Face the direction we're moving
        this.faceDirection(moveDir);
    }
    
    updateVisuals(deltaTime) {
        try {
            if (!this.mesh) return;
            
            // Animate arms based on running/combat state
            const armSwingSpeed = 0.002 * (1 + this.currentPhase * 0.3);
            const time = Date.now() * armSwingSpeed;
            
            // Swing arms
            if (this.leftArm && this.rightArm) {
                this.leftArm.rotation.x = Math.sin(time) * 0.3;
                this.rightArm.rotation.x = Math.sin(time + Math.PI) * 0.3;
            }
            
            // Update eye intensity based on phase
            if (this.leftEye && this.rightEye) {
                let eyeColor;
                switch (this.currentPhase) {
                    case 0: eyeColor = 0xffcc00; break; // Yellow
                    case 1: eyeColor = 0xffbb00; break; // Orange-yellow
                    case 2: eyeColor = 0xff9900; break; // Orange
                    case 3: eyeColor = 0xff6600; break; // Red-orange
                    default: eyeColor = 0xffcc00;
                }
                
                this.leftEye.material.color.setHex(eyeColor);
                this.leftEye.material.emissive.setHex(eyeColor);
                this.rightEye.material.color.setHex(eyeColor);
                this.rightEye.material.emissive.setHex(eyeColor);
                
                const intensity = 0.7 + Math.sin(time * 5) * 0.2;
                this.leftEye.material.emissiveIntensity = intensity;
                this.rightEye.material.emissiveIntensity = intensity;
            }
        } catch (error) {
            console.error("Error in Hunter visual update:", error);
        }
    }
    
    // Basic melee attack
    attackPlayer() {
        try {
            console.log("Hunter boss performing melee attack");
            
            // Get direction to player
            const playerPosition = this.player.getPosition();
            const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).length();
            
            if (distanceToPlayer <= this.attackRange) {
                // Deal damage to player
                this.player.takeDamage(this.damage);
                
                // Perform blade attack animation
                this.meleeAttackAnimation();
                
                // Visual effect
                this.createMeleeAttackEffect();
            }
        } catch (error) {
            console.error("Error in Hunter melee attack:", error);
        }
    }
    
    meleeAttackAnimation() {
        // Quick blade slashing animation
        const useLeftArm = Math.random() > 0.5;
        
        if (useLeftArm && this.leftArm) {
            // Left arm slash
            const originalRotation = this.leftArm.rotation.clone();
            this.leftArm.rotation.x = -Math.PI / 4;
            this.leftArm.rotation.y = Math.PI / 3;
            
            setTimeout(() => {
                if (this.leftArm) {
                    this.leftArm.rotation.copy(originalRotation);
                }
            }, 200);
        } else if (this.rightArm) {
            // Right arm slash
            const originalRotation = this.rightArm.rotation.clone();
            this.rightArm.rotation.x = -Math.PI / 4;
            this.rightArm.rotation.y = -Math.PI / 3;
            
            setTimeout(() => {
                if (this.rightArm) {
                    this.rightArm.rotation.copy(originalRotation);
                }
            }, 200);
        }
    }
    
    createMeleeAttackEffect() {
        // Visual effect for melee attack - blade trail
        const position = this.mesh.position.clone();
        const direction = new THREE.Vector3().subVectors(this.player.getPosition(), position).normalize();
        
        // Position in front of boss
        position.add(direction.multiplyScalar(this.size * 0.8));
        position.y = this.size * 0.8; // Blade height
        
        // Create slash effect
        const slashGeometry = new THREE.PlaneGeometry(this.size * 1.5, this.size * 0.4);
        const slashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffaa,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const slash = new THREE.Mesh(slashGeometry, slashMaterial);
        slash.position.copy(position);
        slash.lookAt(this.mesh.position); // Face toward boss
        slash.rotateY(Math.PI / 2); // Rotate 90 degrees to face properly
        
        this.scene.add(slash);
        
        // Animation
        const duration = 200; // Very quick
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Rotate and fade
            slash.rotation.z += 0.2;
            slashMaterial.opacity = 0.7 * (1 - progress);
            
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
    
    throwSingleKnife() {
        try {
            console.log("Hunter throwing knife");
            
            // Get direction to player with slight inaccuracy
            const playerPosition = this.player.getPosition();
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, this.mesh.position);
            
            // Add small random deviation
            direction.x += (Math.random() - 0.5) * 1.5;
            direction.z += (Math.random() - 0.5) * 1.5;
            direction.y = 0; // Keep projectile flat
            direction.normalize();
            
            // Animate arm throw
            const useLeftArm = Math.random() > 0.5;
            if (useLeftArm && this.leftArm) {
                const originalRotation = this.leftArm.rotation.clone();
                this.leftArm.rotation.x = -Math.PI / 2;
                
                setTimeout(() => {
                    if (this.leftArm) {
                        this.leftArm.rotation.copy(originalRotation);
                    }
                }, 200);
            } else if (this.rightArm) {
                const originalRotation = this.rightArm.rotation.clone();
                this.rightArm.rotation.x = -Math.PI / 2;
                
                setTimeout(() => {
                    if (this.rightArm) {
                        this.rightArm.rotation.copy(originalRotation);
                    }
                }, 200);
            }
            
            // Fire projectile from arm position
            setTimeout(() => {
                const armPosition = new THREE.Vector3();
                if (useLeftArm && this.leftArm) {
                    this.leftBlade.getWorldPosition(armPosition);
                } else if (this.rightArm) {
                    this.rightBlade.getWorldPosition(armPosition);
                } else {
                    armPosition.copy(this.mesh.position);
                    armPosition.y += this.size * 0.5;
                }
                
                // Create projectile
                const projectile = new Projectile(
                    this.scene,
                    armPosition,
                    direction,
                    0.3,                    // Fast speed
                    0.2,                    // Small size
                    this.damage * 0.7,      // Lower damage for ranged
                    0xccffcc,               // Light green color
                    false,                  // Not from player
                    null,                   // No target
                    2000                    // Shorter lifetime
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
            }, 100); // Slight delay for animation
        } catch (error) {
            console.error("Error in Hunter throwSingleKnife:", error);
        }
    }
    
    updateProjectiles(deltaTime) {
        try {
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                
                if (projectile.isActive) {
                    projectile.update(deltaTime);
                    
                    // Check collision with player
                    projectile.checkPlayerCollision(this.player);
                } else {
                    // Remove inactive projectiles
                    this.projectiles.splice(i, 1);
                }
            }
        } catch (error) {
            console.error("Error updating Hunter projectiles:", error);
        }
    }
    
    // Handle boss transitioning to a new phase
    enterNewPhase() {
        try {
            // Visual effect for phase change
            this.flashColor(0xffffff, 1000);
            
            // Increase stats with each phase
            this.moveSpeed *= 1.2;
            this.attackCooldown *= 0.8;
            this.specialAttackCooldown *= 0.7;
            
            console.log(`Hunter boss entering phase ${this.currentPhase}. New speed: ${this.moveSpeed}`);
            
            // Special effect for phase transition
            this.createPhaseTransitionEffect();
        } catch (error) {
            console.error("Error in Hunter enterNewPhase:", error);
        }
    }
    
    // Method for initializing special attacks
    performSpecialAttack() {
        try {
            // Pick a random special attack
            const attackIndex = Math.floor(Math.random() * this.attackPatterns.length);
            const attack = this.attackPatterns[attackIndex];
            
            if (typeof attack === 'function') {
                attack();
            }
        } catch (error) {
            console.error("Error in Hunter performSpecialAttack:", error);
        }
    }
    
    playEntranceAnimation() {
        try {
            console.log("Hunter boss dramatic entrance");
            
            // Make boss initially invisible
            if (this.mesh) this.mesh.visible = false;
            
            // Create smoke cloud at spawn location
            const position = this.mesh.position.clone();
            this.createSmokeEffect();
            
            // Wait for smoke to appear then show boss
            setTimeout(() => {
                if (!this.isAlive) return;
                
                // Show boss
                if (this.mesh) this.mesh.visible = true;
                
                // Add visual flash
                this.flashColor(0x00ffaa, 500);
                
                // Leap upward animation
                const jumpHeight = 3;
                const jumpDuration = 500;
                const startY = this.mesh.position.y;
                const startTime = Date.now();
                
                const jumpAnimation = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / jumpDuration, 1.0);
                    
                    // Parabolic jump animation (up and down)
                    const heightFactor = Math.sin(progress * Math.PI);
                    
                    if (this.mesh) {
                        this.mesh.position.y = startY + (jumpHeight * heightFactor);
                    }
                    
                    if (progress < 1.0) {
                        requestAnimationFrame(jumpAnimation);
                    } else {
                        // End of animation
                        if (this.mesh) this.mesh.position.y = startY;
                        
                        // Immediately perform a special attack to announce presence
                        setTimeout(() => {
                            if (this.isAlive) this.throwingKnives();
                        }, 500);
                    }
                };
                
                jumpAnimation();
            }, 500);
        } catch (error) {
            console.error("Error in Hunter entrance animation:", error);
        }
    }
    
    createPhaseTransitionEffect() {
        try {
            console.log(`Hunter boss entering phase ${this.currentPhase}`);
            
            // Make eyes flash brighter
            if (this.leftEye && this.rightEye) {
                let newColor;
                switch (this.currentPhase) {
                    case 1: newColor = 0xffbb00; break; // Orange-yellow
                    case 2: newColor = 0xff9900; break; // Orange
                    case 3: newColor = 0xff6600; break; // Red-orange
                    default: newColor = 0xffcc00;
                }
                
                const originalIntensity = this.leftEye.material.emissiveIntensity;
                this.leftEye.material.emissiveIntensity = 2;
                this.leftEye.material.color.setHex(newColor);
                this.leftEye.material.emissive.setHex(newColor);
                this.rightEye.material.emissiveIntensity = 2;
                this.rightEye.material.color.setHex(newColor);
                this.rightEye.material.emissive.setHex(newColor);
                
                setTimeout(() => {
                    if (this.leftEye) this.leftEye.material.emissiveIntensity = originalIntensity;
                    if (this.rightEye) this.rightEye.material.emissiveIntensity = originalIntensity;
                }, 1000);
            }
            
            // Add energy burst effect
            const burstGeometry = new THREE.SphereGeometry(this.size * 1.2, 16, 16);
            const burstMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffaa,
                transparent: true,
                opacity: 0.7,
                wireframe: true
            });
            
            const burst = new THREE.Mesh(burstGeometry, burstMaterial);
            burst.position.copy(this.mesh.position);
            this.scene.add(burst);
            
            // Animation
            const duration = 600;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Expand and fade
                const scale = 1 + progress * 4;
                burst.scale.set(scale, scale, scale);
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
            
            // Create speed lines to indicate increased speed
            this.createSpeedLines();
            
            // Perform a special attack to demonstrate new power
            setTimeout(() => {
                if (this.isAlive) {
                    const attackChoice = Math.random();
                    if (attackChoice < 0.4) {
                        this.dashAttack();
                    } else if (attackChoice < 0.7) {
                        this.throwingKnives();
                    } else {
                        this.smokeBomb();
                    }
                }
            }, 1000);
        } catch (error) {
            console.error("Error in Hunter phase transition effect:", error);
        }
    }
    
    createSpeedLines() {
        // Create speed lines that radiate outward to indicate increased speed
        const lineCount = 12;
        const lineLength = this.size * 3;
        
        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI * 2;
            
            // Start position (near boss)
            const startPos = new THREE.Vector3(
                this.mesh.position.x + Math.cos(angle) * this.size * 0.6,
                this.mesh.position.y + this.size * 0.5, // Middle height
                this.mesh.position.z + Math.sin(angle) * this.size * 0.6
            );
            
            // End position
            const endPos = new THREE.Vector3(
                this.mesh.position.x + Math.cos(angle) * (this.size * 0.6 + lineLength),
                this.mesh.position.y + this.size * 0.5, // Same height
                this.mesh.position.z + Math.sin(angle) * (this.size * 0.6 + lineLength)
            );
            
            // Create line
            const geometry = new THREE.BufferGeometry();
            const points = [startPos, endPos];
            geometry.setFromPoints(points);
            
            const material = new THREE.LineBasicMaterial({ 
                color: 0x00ffaa,
                transparent: true,
                opacity: 0.7
            });
            
            const line = new THREE.Line(geometry, material);
            this.scene.add(line);
            
            // Animate line - extend outward then fade
            const duration = 500 + (i * 30); // Staggered timing
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Fade line
                material.opacity = 0.7 * (1 - progress);
                
                // Continue animation
                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    // Clean up
                    this.scene.remove(line);
                    material.dispose();
                    geometry.dispose();
                }
            };
            
            animate();
        }
    }
    
    // Special attack - Dash Attack
    dashAttack() {
        try {
            console.log("Hunter boss performing Dash Attack");
            
            // Save current position
            const startPosition = this.mesh.position.clone();
            
            // Visual telegraph for dash
            this.flashColor(0x00ff99, 400);
            
            // Predict player movement and target slightly ahead of them
            const playerPosition = this.player.getPosition();
            const playerDirection = this.player.getVelocity ? this.player.getVelocity() : new THREE.Vector3();
            const predictionFactor = 10; // How far ahead to predict
            
            const targetPosition = new THREE.Vector3().copy(playerPosition);
            if (playerDirection && playerDirection.length() > 0.01) {
                targetPosition.add(playerDirection.clone().multiplyScalar(predictionFactor));
            }
            
            // Start dashing after telegraph
            setTimeout(() => {
                if (!this.isAlive) return;
                
                this.isDashing = true;
                this.dashTarget = targetPosition.clone();
                
                // Create dash trail effect
                this.createDashTrail(startPosition);
                
                // End dash after set time if not already ended
                setTimeout(() => {
                    if (this.isDashing) {
                        this.isDashing = false;
                        this.dashTarget = null;
                        this.lastDashTime = Date.now();
                    }
                }, 800); // Maximum dash time
            }, 400);
        } catch (error) {
            console.error("Error in Hunter dash attack:", error);
        }
    }
    
    updateDashAttack(deltaTime) {
        if (!this.dashTarget || !this.isDashing) return;
        
        // Move quickly toward dash target
        const direction = new THREE.Vector3();
        direction.subVectors(this.dashTarget, this.mesh.position);
        direction.y = 0;
        
        const distance = direction.length();
        
        if (distance < 1) {
            // Reached target, end dash attack
            this.isDashing = false;
            this.dashTarget = null;
            this.lastDashTime = Date.now();
            
            // Check if we hit the player during dash
            this.checkDashHit();
        } else {
            // Continue dashing
            direction.normalize();
            
            this.mesh.position.x += direction.x * this.dashSpeed * deltaTime;
            this.mesh.position.z += direction.z * this.dashSpeed * deltaTime;
            
            // Face direction of movement
            this.faceDirection(direction);
            
            // Check player hit during movement
            this.checkDashHit();
        }
    }
    
    checkDashHit() {
        // Check if we hit the player during dash
        const playerPosition = this.player.getPosition();
        const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).length();
        
        if (distanceToPlayer < this.size + 0.5) {
            console.log(`Hunter dash hit player for ${this.damage * 1.5} damage`);
            this.player.takeDamage(this.damage * 1.5);
            
            // Create hit effect
            this.createDashHitEffect();
        }
    }
    
    createDashTrail(startPosition) {
        // Create trail of afterimages during dash
        const trailCount = 5;
        const trailDelay = 100; // ms between trail images
        
        for (let i = 0; i < trailCount; i++) {
            setTimeout(() => {
                if (!this.isDashing || !this.mesh) return;
                
                // Create an afterimage at current position
                // It will be a simplified, transparent version of the hunter
                const trailGeometry = new THREE.CylinderGeometry(this.size * 0.3, this.size * 0.5, this.size * 1.5, 6);
                const trailMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x00ff99,
                    transparent: true,
                    opacity: 0.4 - (i * 0.05)
                });
                
                const trail = new THREE.Mesh(trailGeometry, trailMaterial);
                trail.position.copy(this.mesh.position);
                trail.rotation.copy(this.mesh.rotation);
                trail.position.y = this.size * 0.75;
                this.scene.add(trail);
                
                // Fade and remove trail
                const duration = 300;
                const startTime = Date.now();
                
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1.0);
                    
                    // Fade out
                    trailMaterial.opacity = (0.4 - (i * 0.05)) * (1 - progress);
                    
                    // Continue animation
                    if (progress < 1.0) {
                        requestAnimationFrame(animate);
                    } else {
                        // Clean up
                        this.scene.remove(trail);
                        trailMaterial.dispose();
                        trailGeometry.dispose();
                    }
                };
                
                animate();
            }, i * trailDelay);
        }
    }
    
    createDashHitEffect() {
        // Create impact effect when dash hits player
        const position = this.player.getPosition().clone();
        position.y = this.size * 0.5;
        
        // Create burst effect
        const burstGeometry = new THREE.SphereGeometry(this.size * 0.8, 16, 16);
        const burstMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff99,
            transparent: true,
            opacity: 0.7,
            wireframe: true
        });
        
        const burst = new THREE.Mesh(burstGeometry, burstMaterial);
        burst.position.copy(position);
        this.scene.add(burst);
        
        // Animation
        const duration = 400;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Expand and fade
            const scale = 1 + progress * 2;
            burst.scale.set(scale, scale, scale);
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
    
    // Special attack - Throwing Knives
    throwingKnives() {
        try {
            console.log("Hunter boss unleashing Throwing Knives");
            
            // Visual telegraph
            this.flashColor(0xccffcc, 300);
            
            // Number of knives based on phase
            const knifeCount = 5 + (this.currentPhase * 2);
            const angleSpread = 0.6; // How wide the spread is
            
            // Get base direction to player
            const playerPosition = this.player.getPosition();
            const baseDirection = new THREE.Vector3();
            baseDirection.subVectors(playerPosition, this.mesh.position);
            baseDirection.y = 0; // Keep on xz plane
            baseDirection.normalize();
            
            // Animation for preparing to throw
            if (this.mesh) {
                // Stand still and raise both arms
                if (this.leftArm) this.leftArm.rotation.x = -Math.PI / 2;
                if (this.rightArm) this.rightArm.rotation.x = -Math.PI / 2;
                
                // Reset arms after delay
                setTimeout(() => {
                    if (this.leftArm) this.leftArm.rotation.x = 0;
                    if (this.rightArm) this.rightArm.rotation.x = 0;
                }, 500);
            }
            
            // Delay until knives are thrown
            setTimeout(() => {
                if (!this.isAlive) return;
                
                // Create and throw multiple knives in a spread pattern
                for (let i = 0; i < knifeCount; i++) {
                    // Staggered firing
                    setTimeout(() => {
                        if (!this.isAlive) return;
                        
                        // Calculate spread direction
                        const spreadFactor = (i / (knifeCount - 1)) * 2 - 1; // -1 to 1
                        const spreadAngle = spreadFactor * angleSpread;
                        
                        // Create new direction with spread
                        const direction = baseDirection.clone();
                        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
                        
                        // Get starting position (centered on body)
                        const position = this.mesh.position.clone();
                        position.y = this.size * 0.8;
                        
                        // Create projectile
                        const projectile = new Projectile(
                            this.scene,
                            position,
                            direction,
                            0.3,                    // Fast speed
                            0.2,                    // Small size
                            this.damage * 0.5,      // Lower damage for multiple projectiles
                            0xccffcc,               // Light green color
                            false,                  // Not from player
                            null,                   // No target
                            2000                    // Shorter lifetime
                        );
                        
                        this.projectiles.push(projectile);
                        
                        // Limit max projectiles
                        if (this.projectiles.length > this.maxProjectiles) {
                            const oldestProjectile = this.projectiles.shift();
                            if (oldestProjectile.isActive) {
                                oldestProjectile.deactivate();
                            }
                        }
                    }, i * 80); // Staggered timing
                }
            }, 500); // Delay after telegraph
        } catch (error) {
            console.error("Error in Hunter throwingKnives:", error);
        }
    }
    
    // Special attack - Smoke Bomb
    smokeBomb() {
        try {
            console.log("Hunter boss using Smoke Bomb");
            
            // Visual telegraph - hunter crouches
            if (this.mesh) {
                this.mesh.position.y -= this.size * 0.2;
                
                // Reset position after telegraph
                setTimeout(() => {
                    if (this.mesh) this.mesh.position.y += this.size * 0.2;
                }, 300);
            }
            
            setTimeout(() => {
                if (!this.isAlive) return;
                
                // Create smoke bomb effect at hunter's feet
                this.createSmokeEffect();
                
                // Teleport to a random position around the player
                setTimeout(() => {
                    if (!this.isAlive) return;
                    
                    this.mesh.visible = false; // Hide during teleport
                    
                    // Determine new position
                    const playerPos = this.player.getPosition();
                    const angle = Math.random() * Math.PI * 2;
                    const distance = this.preferredDistance * 0.8; // Slightly closer than preferred distance
                    
                    const newPosition = new THREE.Vector3(
                        playerPos.x + Math.cos(angle) * distance,
                        this.mesh.position.y,
                        playerPos.z + Math.sin(angle) * distance
                    );
                    
                    // Ensure within arena bounds
                    const arenaSize = 28;
                    newPosition.x = Math.max(-arenaSize, Math.min(arenaSize, newPosition.x));
                    newPosition.z = Math.max(-arenaSize, Math.min(arenaSize, newPosition.z));
                    
                    // Move to new position
                    this.mesh.position.copy(newPosition);
                    
                    // Show hunter again
                    setTimeout(() => {
                        if (this.mesh) this.mesh.visible = true;
                        
                        // Create another smoke effect at new position
                        this.createSmokeEffect();
                        
                        // Immediately attack after appearing
                        setTimeout(() => {
                            if (this.isAlive) {
                                // Get direction to player
                                const direction = new THREE.Vector3();
                                direction.subVectors(this.player.getPosition(), this.mesh.position);
                                this.faceDirection(direction);
                                
                                // Get distance to player
                                const distance = direction.length();
                                
                                // Choose appropriate attack based on distance
                                if (distance <= this.attackRange * 1.5) {
                                    this.attackPlayer(); // Melee if close
                                } else {
                                    this.throwingKnives(); // Ranged if far
                                }
                            }
                        }, 200);
                    }, 100);
                }, 1000); // Delay before teleport
            }, 300); // Delay after telegraph
        } catch (error) {
            console.error("Error in Hunter smokeBomb:", error);
        }
    }
    
    createSmokeEffect() {
        // Create smoke cloud effect
        const position = this.mesh.position.clone();
        position.y = 0.5; // Just above ground
        
        // Create smoke particles
        const particleCount = 50;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const size = 0.2 + Math.random() * 0.4;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xaaffee,
                transparent: true,
                opacity: 0.5 + Math.random() * 0.3
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Random position within circle
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.size * 2;
            particle.position.set(
                position.x + Math.cos(angle) * radius,
                position.y + Math.random() * this.size * 2,
                position.z + Math.sin(angle) * radius
            );
            
            // Random velocity for expansion
            const speed = 0.01 + Math.random() * 0.02;
            const velocity = {
                x: Math.cos(angle) * speed,
                y: 0.01 + Math.random() * 0.02,
                z: Math.sin(angle) * speed
            };
            
            this.scene.add(particle);
            particles.push({ mesh: particle, velocity: velocity });
        }
        
        // Animation
        const duration = 1500; // 1.5 seconds
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Animate each particle
            particles.forEach(particle => {
                // Move particle
                particle.mesh.position.x += particle.velocity.x;
                particle.mesh.position.y += particle.velocity.y;
                particle.mesh.position.z += particle.velocity.z;
                
                // Slow down velocity over time
                particle.velocity.x *= 0.98;
                particle.velocity.y *= 0.98;
                particle.velocity.z *= 0.98;
                
                // Fade out
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = (0.8 - (progress * 0.8));
                }
            });
            
            // Continue animation
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                particles.forEach(particle => {
                    this.scene.remove(particle.mesh);
                    particle.mesh.geometry.dispose();
                    particle.mesh.material.dispose();
                });
            }
        };
        
        animate();
    }
    
    // Override die method to clean up properly
    die() {
        super.die();
        
        // Clean up projectiles
        for (const projectile of this.projectiles) {
            if (projectile.isActive) {
                projectile.deactivate();
            }
        }
        this.projectiles = [];
    }
    
    get collisionRadius() {
        return this.size * 0.8; // Use hunter size for collision radius
    }
} 