import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { BaseEnemy } from '../enemy.js';
import { Projectile } from '../projectile.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/loaders/GLTFLoader.js';

export class HunterBoss extends BaseEnemy {
    constructor(scene, position, player, bossLevel = 1) {
        super(scene, position, player);
        
        // Boss specific properties
        this.type = 'hunter';
        this.bossLevel = bossLevel;
        
        // Scale health, damage and rewards with boss level
        this.maxHealth = 120 * bossLevel; // Lower health but faster and more agile
        this.health = this.maxHealth;
        this.damage = 12 + (5 * bossLevel); // Medium damage (reduced from 15+5 to 12+5 per level)
        this.experienceValue = 500 * bossLevel;
        
        // Movement properties - fastest of all bosses
        this.moveSpeed = 0.025; // Much faster than other bosses
        this.dashSpeed = 0.06; // Speed during dash attack
        this.dashCooldown = 4000; // ms between dashes
        this.lastDashTime = 0;
        this.isDashing = false;
        this.dashTarget = null;
        this.dashHitPlayers = new Set(); // Track which players were hit during this dash
        
        this.attackCooldown = 500; // ms between attacks (reduced from 1000 to 500)
        this.specialAttackCooldown = 2500; // ms between special attacks (reduced from 5000 to 2500)
        this.lastSpecialAttackTime = 0;
        this.attackRange = 3; // Short attack range for melee (increased from 2 to 3)
        this.rangedAttackRange = 20; // Long range for ranged attacks (increased from 15 to 20)
        this.preferredDistance = 8; // Tries to maintain this distance
        this.defaultColor = 0x00ff99; // Green-cyan
        
        // Hunter appearance vars
        this.size = 1.0 + (bossLevel * 0.1); // Smaller but faster (reduced scale factor from 0.3 to 0.1)
        
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
        
        // Animation properties
        this.mixer = null;
        this.animationActions = {};
        this.currentAnimation = null;
        this.model = null;
        
        // Create the boss mesh
        this.createEnemyMesh(position);
        
        // Add dramatic entrance effect
        this.playEntranceAnimation();
    }
    
    // Remove any existing health bar
    removeHealthBar() {
        if (this.healthBarBg) {
            // Remove from parent
            if (this.healthBarBg.parent) {
                this.healthBarBg.parent.remove(this.healthBarBg);
            }
            
            // Dispose of geometries and materials
            this.healthBarBg.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            
            // Clear references
            this.healthBarBg = null;
            this.healthBarFg = null;
        }
    }
    
    createEnemyMesh(position) {
        try {
            // Remove any existing health bar before creating a new one
            this.removeHealthBar();
            
            // Create a sleek, agile hunter mesh - this will be a placeholder
            // until the 3D model loads
            
            // Container for the mesh
            this.mesh = new THREE.Group();
            
            // Main body placeholder
            const bodyGeometry = new THREE.CylinderGeometry(this.size * 0.3, this.size * 0.5, this.size * 1.5, 6);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.6,
                metalness: 0.4
            });
            const placeholder = new THREE.Mesh(bodyGeometry, bodyMaterial);
            placeholder.castShadow = true;
            
            // Position the mesh
            this.mesh.position.copy(position);
            this.mesh.position.y = 0; // Consistent with model position (-1.0 is applied to the model within the mesh)
            
            // Create head
            const headGeometry = new THREE.SphereGeometry(this.size * 0.3, 12, 12);
            const headMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00cc77, // Slightly darker green
                roughness: 0.5,
                metalness: 0.3
            });
            
            const placeholderHead = new THREE.Mesh(headGeometry, headMaterial);
            placeholderHead.position.y = this.size * 0.9;
            placeholder.add(placeholderHead);
            
            // Create eyes (two glowing eyes)
            const eyeGeometry = new THREE.SphereGeometry(this.size * 0.07, 8, 8);
            const eyeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffcc00, // Yellow
                emissive: 0xffcc00,
                emissiveIntensity: 0.7
            });
            
            // Left eye
            const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            leftEye.position.set(-this.size * 0.12, this.size * 0.05, this.size * 0.25);
            placeholderHead.add(leftEye);
            
            // Right eye
            const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            rightEye.position.set(this.size * 0.12, this.size * 0.05, this.size * 0.25);
            placeholderHead.add(rightEye);
            
            // Create shoulders/armor
            const shoulderGeometry = new THREE.BoxGeometry(this.size * 0.8, this.size * 0.2, this.size * 0.4);
            const armorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x006644, // Darker green
                roughness: 0.4,
                metalness: 0.6
            });
            
            const placeholderShoulders = new THREE.Mesh(shoulderGeometry, armorMaterial);
            placeholderShoulders.position.y = this.size * 0.6;
            placeholder.add(placeholderShoulders);
            
            // Create arms
            const armGeometry = new THREE.CylinderGeometry(this.size * 0.1, this.size * 0.1, this.size * 0.6, 8);
            const armMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.6,
                metalness: 0.3
            });
            
            // Left arm
            const placeholderLeftArm = new THREE.Mesh(armGeometry, armMaterial);
            placeholderLeftArm.position.set(-this.size * 0.4, this.size * 0.3, 0);
            placeholderLeftArm.rotation.z = Math.PI / 3; // Angle outward
            placeholder.add(placeholderLeftArm);
            
            // Right arm
            const placeholderRightArm = new THREE.Mesh(armGeometry, armMaterial);
            placeholderRightArm.position.set(this.size * 0.4, this.size * 0.3, 0);
            placeholderRightArm.rotation.z = -Math.PI / 3; // Angle outward
            placeholder.add(placeholderRightArm);
            
            // Create blades (weapons)
            const bladeGeometry = new THREE.BoxGeometry(this.size * 0.05, this.size * 0.4, this.size * 0.1);
            const bladeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xcccccc, // Silver
                roughness: 0.2,
                metalness: 0.9
            });
            
            // Left blade
            const placeholderLeftBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            placeholderLeftBlade.position.set(0, -this.size * 0.3, this.size * 0.1);
            placeholderLeftArm.add(placeholderLeftBlade);
            
            // Right blade
            const placeholderRightBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            placeholderRightBlade.position.set(0, -this.size * 0.3, this.size * 0.1);
            placeholderRightArm.add(placeholderRightBlade);
            
            // Give placeholder a unique name for easy reference later
            placeholder.name = "placeholder";
            
            // Add to mesh container
            this.mesh.add(placeholder);
            
            // Add to scene
            this.scene.add(this.mesh);
            
            // Create health bar
            this.createHealthBar();
            
            // Load the glTF model
            const loader = new GLTFLoader();
            const modelURL = '/models/hunter.gltf';
            
            loader.load(
                modelURL,
                (gltf) => {
//                    console.log('Hunter boss model loaded successfully');
                    
                    // Find and remove the placeholder by name
                    const placeholderObj = this.mesh.getObjectByName("placeholder");
                    if (placeholderObj) {
                        // Properly dispose of placeholder geometries and materials
                        placeholderObj.traverse((child) => {
                            if (child.isMesh) {
                                if (child.geometry) child.geometry.dispose();
                                if (child.material) child.material.dispose();
                            }
                        });
                        this.mesh.remove(placeholderObj);
                    }
                    
                    // Remove any existing model from the scene (in case there's one already)
                    const existingModel = this.mesh.getObjectByName("hunter3DModel");
                    if (existingModel) {
                        // Properly dispose of existing model resources
                        existingModel.traverse((child) => {
                            if (child.isMesh) {
                                if (child.geometry) child.geometry.dispose();
                                if (child.material) child.material.dispose();
                            }
                        });
                        this.mesh.remove(existingModel);
                    }
                    
                    // Create our own container for the model to control positioning
                    const modelContainer = new THREE.Group();
                    modelContainer.name = "hunter3DModel";
                    
                    // Add the loaded model to our container
                    this.model = gltf.scene;
                    
                    // Apply scale adjustments based on boss level
                    const modelScale = 3.0 + (this.bossLevel * 0.5);
                    this.model.scale.set(modelScale, modelScale, modelScale);
                    
                    // Position the model properly - adjust Y position to ground level
                    this.model.position.y = -0.5; // Set to -0.5 for better ground alignment
                    
                    // Make sure model casts shadows
                    this.model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                            
                            // Store original material colors for visual effects
                            if (!this._originalMaterials) {
                                this._originalMaterials = new Map();
                            }
                            this._originalMaterials.set(node, node.material.color.clone());
                        }
                    });
                    
                    // Add model to container, then add container to mesh
                    modelContainer.add(this.model);
                    this.mesh.add(modelContainer);
                    
                    // Adjust health bar position for model
                    if (this.healthBarBg) {
                        // Position health bar higher above the model
                        this.healthBarBg.position.y = 4.0 + (this.bossLevel * 0.5);
                    }
                    
                    // Set up animations if they exist
                    if (gltf.animations && gltf.animations.length) {
                        this.mixer = new THREE.AnimationMixer(this.model);
                        
                        // Store all animations
                        gltf.animations.forEach((clip) => {
                            this.animationActions[clip.name] = this.mixer.clipAction(clip);
//                            console.log(`Loaded animation: ${clip.name}`);
                        });
                        
                        // Start the run animation by default
                        if (this.animationActions['Run']) {
                            this.playAnimation('Run');
                        }
                    }
                    
//                    console.log("Hunter boss 3D model setup complete");
                },
                (xhr) => {
//                    console.log(`Loading hunter boss model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                (error) => {
                    console.error('Error loading hunter boss model:', error);
                    // Keep the placeholder visuals
                }
            );
            
//            console.log("Hunter boss mesh creation initiated");
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
            
            // Update animation mixer if it exists
            if (this.mixer) {
                this.mixer.update(deltaTime / 1000); // Convert deltaTime to seconds
            }
            
            // If using primitive shapes (placeholder) instead of 3D model
            if (!this.model) {
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
            }
        } catch (error) {
            console.error("Error in Hunter visual update:", error);
        }
    }
    
    // Play a specific animation if the mixer and animation exists
    playAnimation(name) {
        try {
            // Safety checks to prevent errors
            if (!this.mixer) {
                console.warn(`Cannot play animation '${name}': mixer is null`);
                return;
            }
            
            if (!this.model) {
                console.warn(`Cannot play animation '${name}': model is null`);
                return;
            }
            
            // Check if animation exists before attempting to play it
            if (!this.animationActions || !this.animationActions[name]) {
//                console.warn(`Animation '${name}' not found in available animations`);
                return;
            }
            
            // Make sure the animation action is valid
            const action = this.animationActions[name];
            if (!action || typeof action.reset !== 'function') {
                console.warn(`Invalid animation action for '${name}'`);
                return;
            }
            
            // Stop current animation with safety check
            if (this.currentAnimation && typeof this.currentAnimation.fadeOut === 'function') {
                this.currentAnimation.fadeOut(0.2);
            }
            
            // Start new animation with try-catch
            try {
                this.currentAnimation = action;
                this.currentAnimation.reset().fadeIn(0.2).play();
                
 //               console.log(`Playing hunter animation: ${name}`);
            } catch (animError) {
                console.error(`Error playing animation '${name}':`, animError);
                this.currentAnimation = null;
            }
        } catch (error) {
            console.error(`Error in Hunter playAnimation('${name}'):`, error);
            // Reset animation state on error
            this.currentAnimation = null;
        }
    }
    
    // Stop current animation
    stopAnimation() {
        try {
            // Stop current animation if one is playing
            if (this.currentAnimation && typeof this.currentAnimation.fadeOut === 'function') {
                this.currentAnimation.fadeOut(0.2);
                this.currentAnimation = null;
            }
        } catch (error) {
            console.error("Error in Hunter stopAnimation:", error);
            this.currentAnimation = null;
        }
    }
    
    // Basic melee attack
    attackPlayer() {
        try {
//            console.log("Hunter boss performing melee attack");
            
            // Get direction to player
            const playerPosition = this.player.getPosition();
            const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).length();
            
            if (distanceToPlayer <= this.attackRange) {
                // Deal damage to player
                this.player.takeDamage(this.damage);
                
                // Play attack animation if available, otherwise use the old animation
                if (this.mixer && this.animationActions['Attack']) {
                    this.playAnimation('Attack');
                    
                    // Return to run animation after attack completes
                    setTimeout(() => {
                        if (this.isAlive && this.mixer && this.animationActions['Run']) {
                            this.playAnimation('Run');
                        }
                    }, 1000);
                } else {
                    // Perform traditional blade attack animation
                    this.meleeAttackAnimation();
                }
                
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
            if (!this.isAlive) return;
            
//            console.log("Hunter boss throwing knife");
            
            // Play ranged attack animation if available
            if (this.mixer && (this.animationActions['Throw'] || this.animationActions['Attack'])) {
                const throwAnim = this.animationActions['Throw'] || this.animationActions['Attack'];
                this.playAnimation(throwAnim.name);
                
                // Return to run animation after attack completes
                setTimeout(() => {
                    if (this.isAlive && this.mixer && this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }, 1000);
            }
            
            // Get direction to player
            const playerPosition = this.player.getPosition();
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, this.mesh.position);
            direction.y = 0; // Keep projectile on xz plane
            direction.normalize();
            
            // Create the projectile
            const knifeSize = 0.2 + (this.bossLevel * 0.05);
            const knifeDamage = this.damage * 0.7; // 70% of regular damage
            
            // Start position - from center of hunter
            const startPosition = this.mesh.position.clone();
            startPosition.y += this.size * 0.5; // Align with center of hunter
            
            // Add slight randomization to direction
            direction.x += (Math.random() * 0.1) - 0.05;
            direction.z += (Math.random() * 0.1) - 0.05;
            direction.normalize();
            
//            console.log(`Creating knife projectile with damage: ${knifeDamage}`);
            
            // Create knife projectile with new API format - use knife color
            const projectile = new Projectile(
                this.scene,
                startPosition,
                direction,
                0.08, // speed
                knifeSize, // size
                knifeDamage, // damage
                0xccffcc, // Use knife color (light green) for proper pooling
                false, // not from player
                null, // no target
                2000 // lifetime
            );
            
            // Add to projectiles array for tracking and cleanup
            this.projectiles.push(projectile);
            
            // Remove oldest projectile if we have too many
            if (this.projectiles.length > this.maxProjectiles) {
                const oldProjectile = this.projectiles.shift();
                if (oldProjectile && oldProjectile.deactivate) {
                    oldProjectile.deactivate();
                }
            }
            
            // Note: We no longer customize the projectile mesh as it's handled by the ProjectileManager
            // The projectile.mesh is now just a getter that returns an object with a position property
        } catch (error) {
            console.error("Error in Hunter throwSingleKnife:", error);
        }
    }
    
    updateProjectiles(deltaTime) {
        try {
            // The Projectile class now delegates most of its functionality to the ProjectileManager
            // We just need to check for inactive projectiles and remove them from our array
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                
                if (!projectile || !projectile.isActive) {
                    // Remove inactive projectiles from our array
                    this.projectiles.splice(i, 1);
                    continue;
                }
                
                // Check collision with player using the ProjectileManager's method first
                let playerHit = false;
                if (projectile.checkPlayerCollision) {
                    playerHit = projectile.checkPlayerCollision(this.player);
                    if (playerHit) {
//                        console.log(`Hunter projectile hit player for ${projectile.damage} damage!`);
                    }
                } else {
                    // Manual collision check as fallback if the standard method is unavailable
                    const playerPos = this.player.getPosition();
                    
                    // Handle both position formats (direct position or mesh.position)
                    let projectilePos;
                    if (projectile.position) {
                        projectilePos = projectile.position;
                    } else if (projectile.mesh && projectile.mesh.position) {
                        projectilePos = projectile.mesh.position;
                    } else {
                        continue; // Skip if no position available
                    }
                    
                    const distance = projectilePos.distanceTo(playerPos);
                    
                    if (distance < (projectile.size + 0.5)) {
//                        console.log(`Hunter projectile hit player for ${projectile.damage} damage (fallback collision)!`);
                        this.player.takeDamage(projectile.damage);
                        projectile.deactivate();
                        playerHit = true;
                    }
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
            
//            console.log(`Hunter boss entering phase ${this.currentPhase}. New speed: ${this.moveSpeed}`);
            
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
//            console.log("Hunter boss dramatic entrance");
            
            // Safety check - if mesh doesn't exist, we can't do the animation
            if (!this.mesh) {
                console.warn("Cannot play entrance animation - mesh is null");
                return;
            }
            
            // Make boss initially invisible but keep health bar visible
            // Store reference to the health bar so it's not affected by mesh visibility
            const healthBar = this.healthBarBg;
            if (healthBar) {
                // Temporarily detach health bar from mesh to keep it visible
                if (healthBar.parent) {
                    healthBar.parent.remove(healthBar);
                }
                this.scene.add(healthBar);
            }
            
            // Make mesh invisible but preserve health bar
            this.mesh.visible = false;
            
            // Wait for smoke to appear then show boss
            setTimeout(() => {
                if (!this.isAlive || !this.mesh) return;
                
                // Show boss
                this.mesh.visible = true;
                
                // Re-attach health bar to mesh if it was detached
                if (healthBar) {
                    this.scene.remove(healthBar);
                    this.mesh.add(healthBar);
                }
                
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
            
            // Create smoke cloud at spawn location - make sure mesh exists first
            this.createSmokeEffect();
        } catch (error) {
            console.error("Error in Hunter entrance animation:", error);
        }
    }
    
    createSmokeEffect() {
        // Safety check - if mesh doesn't exist, we can't do the effect
        if (!this.mesh) {
//            console.warn("Cannot create smoke effect - mesh is null");
            return;
        }
        
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
    
    createPhaseTransitionEffect() {
        try {
//            console.log(`Hunter boss entering phase ${this.currentPhase}`);
            
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
            if (!this.isAlive || this.isDashing) return;
            
//            console.log("Hunter boss performing dash attack");
            
            const currentTime = Date.now();
            this.lastDashTime = currentTime;
            this.isDashing = true;
            
            // Clear the set of hit players for this new dash
            this.dashHitPlayers.clear();
            
            // Store starting position for trail effect
            const startPosition = this.mesh.position.clone();
            
            // Calculate dash target position (through player position)
            const playerPosition = this.player.getPosition();
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, this.mesh.position);
            direction.y = 0; // Keep on xz plane
            direction.normalize();
            
            // Set dash target to be past the player
            const dashDistance = direction.clone().multiplyScalar(this.rangedAttackRange * 0.6);
            this.dashTarget = new THREE.Vector3().addVectors(this.mesh.position, dashDistance);
            
            // Face the dash direction
            this.faceDirection(direction);
            
            // Play dash animation if available
            if (this.mixer && (this.animationActions['Dash'] || this.animationActions['Run'])) {
                const dashAnim = this.animationActions['Dash'] || this.animationActions['Run'];
                this.playAnimation(dashAnim.name);
                
                // Speed up the animation if it's the run animation
                if (dashAnim.name === 'Run') {
                    this.currentAnimation.timeScale = 2.0;
                }
            }
            
            // Create dash effect
            this.createDashTrail(startPosition);
            
            // Play dash sound effect
            // ... sound effect code ...
            
            // Stop dash after some time
            setTimeout(() => {
                if (this.isAlive) {
                    this.isDashing = false;
                    this.dashHitPlayers.clear(); // Clear hit tracking when dash ends
                    
                    // Return to normal animation
                    if (this.mixer && this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }
            }, 1000);
        } catch (error) {
            console.error("Error in Hunter dashAttack:", error);
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
            this.dashHitPlayers.clear(); // Clear hit tracking when dash ends
            
            // Return to normal animation
            if (this.mixer && this.animationActions['Run']) {
                this.playAnimation('Run');
            }
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
        
        // Get or generate a unique identifier for the player
        const playerId = this.player.id || 'player'; // Fallback to 'player' if no id exists
        
        // Hit detection for player (check if we haven't already hit this player during this dash)
        if (distanceToPlayer < this.size + 0.5 && !this.dashHitPlayers.has(playerId)) {
//            console.log(`Hunter dash hit player for ${this.damage * 2.0} damage`);
            this.player.takeDamage(this.damage * 2.0); // Reduced from 2.5x to 2.0x damage
            
            // Add player to the set of hit players
            this.dashHitPlayers.add(playerId);
            
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
//            console.log("Hunter boss unleashing Throwing Knives");
            
            // Visual telegraph
            this.flashColor(0xccffcc, 300);
            
            // Play special attack animation if available
            if (this.mixer && (this.animationActions['Special'] || this.animationActions['Throw'] || this.animationActions['Attack'])) {
                const throwAnim = this.animationActions['Special'] || this.animationActions['Throw'] || this.animationActions['Attack'];
                this.playAnimation(throwAnim.name);
                
                // Return to run animation after attack completes
                setTimeout(() => {
                    if (this.isAlive && this.mixer && this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }, 1500);
            }
            
            // Number of knives based on phase
            const knifeCount = 5 + (this.currentPhase * 2);
            const angleSpread = 0.6; // How wide the spread is
            
            // Get base direction to player
            const playerPosition = this.player.getPosition();
            const baseDirection = new THREE.Vector3();
            baseDirection.subVectors(playerPosition, this.mesh.position);
            baseDirection.y = 0; // Keep on xz plane
            baseDirection.normalize();
            
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
                        
                        const knifeSize = 0.2;
                        const knifeDamage = this.damage * 0.5; // 50% damage for multiple knives
                        
//                        console.log(`Creating special knife projectile with damage: ${knifeDamage}`);
                        
                        // Create projectile with Projectile class (using the correct constructor format)
                        const projectile = new Projectile(
                            this.scene,
                            position,
                            direction,
                            0.3,                    // Speed
                            knifeSize,              // Size
                            knifeDamage,            // Damage
                            0xccffcc,               // Light green color for knives
                            false,                  // Not from player
                            null,                   // No target
                            2000                    // Lifetime
                        );
                        
                        this.projectiles.push(projectile);
                        
                        // Limit max projectiles
                        if (this.projectiles.length > this.maxProjectiles) {
                            const oldestProjectile = this.projectiles.shift();
                            if (oldestProjectile && oldestProjectile.deactivate) {
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
            if (!this.isAlive) return;
            
//            console.log("Hunter boss using smoke bomb");
            
            // Play special attack animation if available
            if (this.mixer && (this.animationActions['Special'] || this.animationActions['Attack'])) {
                const specialAnim = this.animationActions['Special'] || this.animationActions['Attack'];
                this.playAnimation(specialAnim.name);
                
                // Return to run animation after attack completes
                setTimeout(() => {
                    if (this.isAlive && this.mixer && this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }, 1500);
            }
            
            // Create smoke effect at hunter's position
            this.createSmokeEffect();
            
            // Hunter becomes temporarily invisible
            const originalVisible = this.mesh.visible;
            setTimeout(() => {
                if (!this.isAlive) return;
                
                if (this.model) {
                    this.model.visible = false;
                } else {
                    this.mesh.visible = false;
                }
                
                // Move to a new position away from player
                const playerPosition = this.player.getPosition();
                const direction = new THREE.Vector3();
                direction.subVectors(this.mesh.position, playerPosition);
                direction.y = 0;
                direction.normalize();
                
                // Teleport to a position behind the player
                const angleOffset = (Math.random() - 0.5) * Math.PI * 0.5; // +/- 45 degrees
                direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
                
                // Calculate new position based on preferred distance
                const newPosition = new THREE.Vector3().addVectors(
                    playerPosition,
                    direction.multiplyScalar(this.preferredDistance)
                );
                
                // Set new position
                this.mesh.position.copy(newPosition);
                
                // Wait a moment then become visible again with a new smoke bomb
                setTimeout(() => {
                    if (!this.isAlive) return;
                    
                    // Create smoke at new position
                    this.createSmokeEffect();
                    
                    // Become visible
                    if (this.model) {
                        this.model.visible = true;
                    } else {
                        this.mesh.visible = true;
                    }
                    
                    // Immediately attack if in range
                    const distanceToPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).length();
                    if (distanceToPlayer <= this.attackRange) {
                        this.attackPlayer();
                    } else if (distanceToPlayer <= this.rangedAttackRange) {
                        this.throwSingleKnife();
                    }
                }, 500);
            }, 500);
        } catch (error) {
            console.error("Error in Hunter smokeBomb:", error);
        }
    }
    
    // Override die method to clean up properly
    die() {
        try {
            // Call base class die method
            super.die();
            
//            console.log("Hunter boss dying!");
            
            // Clean up projectiles
            if (this.projectiles && this.projectiles.length > 0) {
                // Create a copy of the array to avoid modification during iteration
                const projectilesToCleanup = [...this.projectiles];
                
                projectilesToCleanup.forEach(projectile => {
                    if (projectile && typeof projectile.deactivate === 'function') {
                        projectile.deactivate();
                    }
                });
                
                // Clear the array
                this.projectiles = [];
            }
            
            // Play death animation if available
            if (this.mixer && this.animationActions['Death']) {
                this.playAnimation('Death');
            } else {
                // Flash red when dying
                this.flashColor(0xff0000, 500);
            }
        } catch (error) {
            console.error("Error in Hunter boss die method:", error);
            // Still clear projectiles array even if there was an error
            this.projectiles = [];
        }
    }
    
    // Override removeFromScene to prevent boss from being added to enemy pool
    removeFromScene() {
        try {
            if (!this.mesh) return;
            
//            console.log("Hunter boss removeFromScene called");
            
            // Stop all animations
            if (this.mixer) {
                this.mixer.stopAllAction();
                this.currentAnimation = null;
            }
            
            // Clean up any remaining projectiles
            if (this.projectiles && this.projectiles.length > 0) {
                const projectilesToCleanup = [...this.projectiles];
                projectilesToCleanup.forEach(projectile => {
                    if (projectile && typeof projectile.deactivate === 'function') {
                        projectile.deactivate();
                    }
                });
                this.projectiles = [];
            }
            
            // Fade out the model if it exists
            if (this.model) {
                const fadeOut = () => {
                    try {
                        if (!this.model) return; // Check if model was removed during animation
                        
                        // Make all materials in the model transparent
                        this.model.traverse((node) => {
                            if (node.isMesh && node.material) {
                                node.material.transparent = true;
                                node.material.opacity -= 0.05;
                            }
                        });
                        
                        // Check opacity of materials to determine if fading is complete
                        let shouldContinue = false;
                        this.model.traverse((node) => {
                            if (node.isMesh && node.material && node.material.opacity > 0) {
                                shouldContinue = true;
                            }
                        });
                        
                        if (shouldContinue) {
                            requestAnimationFrame(fadeOut);
                        } else {
                            this.cleanupResources();
                        }
                    } catch (fadeError) {
                        console.error("Error in Hunter boss fade out:", fadeError);
                        this.cleanupResources(); // Try cleanup anyway
                    }
                };
                
                fadeOut();
            } else {
                this.cleanupResources();
            }
        } catch (error) {
            console.error("Error in Hunter removeFromScene:", error);
            this.cleanupResources(); // Try basic cleanup anyway
        }
    }
    
    cleanupResources() {
        try {
            // Clean up projectiles
            if (this.projectiles && this.projectiles.length > 0) {
                this.projectiles.forEach(projectile => {
                    if (projectile && projectile.deactivate) {
                        projectile.deactivate();
                    }
                });
                this.projectiles = [];
            }
            
            // Clean up animations and mixer
            if (this.mixer) {
                this.mixer.stopAllAction();
                this.animationActions = {};
                this.currentAnimation = null;
                this.mixer = null;
            }
            
            // Clean up health bar - use our dedicated method
            this.removeHealthBar();
            
            // Dispose of model resources
            if (this.model) {
                this.model.traverse((node) => {
                    if (node.isMesh) {
                        if (node.geometry) node.geometry.dispose();
                        if (node.material) {
                            if (Array.isArray(node.material)) {
                                node.material.forEach(mat => mat.dispose());
                            } else {
                                node.material.dispose();
                            }
                        }
                    }
                });
                this.model = null;
            }
            
            // Remove mesh from scene
            if (this.mesh) {
                if (this.scene) {
                    this.scene.remove(this.mesh);
                }
                
                // Clean up placeholder meshes if they exist
                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
                
                this.mesh = null;
            }
            
//            console.log("Hunter boss resources cleaned up");
        } catch (error) {
            console.error("Error cleaning up Hunter boss resources:", error);
        }
    }
    
    get collisionRadius() {
        return this.size * 0.8; // Use hunter size for collision radius
    }
    
    // Override reset method to handle boss reuse from pool
    reset(position, bossLevel = 1) {
        // Store the new boss level
        this.bossLevel = bossLevel;
        
        // Reset health and stats based on level
        this.maxHealth = 120 * bossLevel;
        this.health = this.maxHealth;
        this.damage = 12 + (5 * bossLevel);
        this.experienceValue = 500 * bossLevel;
        
        // Reset state flags
        this.isAlive = true;
        this.isDashing = false;
        this.dashTarget = null;
        this.dashHitPlayers.clear();
        this.lastAttackTime = 0;
        this.lastSpecialAttackTime = 0;
        this.lastDashTime = 0;
        this.currentPhase = 0;
        
        // Clear projectiles
        if (this.projectiles && this.projectiles.length > 0) {
            this.projectiles.forEach(projectile => {
                if (projectile && projectile.isActive) {
                    projectile.deactivate();
                }
            });
            this.projectiles = [];
        }
        
        // Reset size based on level
        this.size = 1.0 + (bossLevel * 0.1);
        
        // Check if mesh exists, if not create it
        if (!this.mesh) {
//            console.log(`Mesh was null, creating enemy mesh for HunterBoss at position ${position.x}, ${position.y}, ${position.z}`);
            this.createEnemyMesh(position);
            
            // After creating mesh, update health bar
            if (this.healthBarBg) {
                this.healthBarBg.position.y = 4.0 + (bossLevel * 0.5);
            }
            this.updateHealthBar();
            
            // Play entrance animation (will check for mesh existence internally)
            this.playEntranceAnimation();
        } else {
            // Reset mesh position and visibility
            this.mesh.position.copy(position);
            this.mesh.position.y = 0; // Hunter is at ground level
            this.mesh.visible = true;
            
            // Make model visible
            if (this.model) {
                this.model.visible = true;
                
                // Apply proper scale for current level
                const modelScale = 2.5 + (bossLevel * 0.3);
                this.model.scale.set(modelScale, modelScale, modelScale);
                
                // Ensure all mesh parts are visible
                this.model.traverse(child => {
                    if (child.isMesh) {
                        child.visible = true;
                        // Reset material color/opacity if needed
                        if (child.material) {
                            child.material.opacity = 1;
                            child.material.transparent = false;
                            
                            // Reset color if we have stored original colors
                            if (this._originalMaterials && this._originalMaterials.has(child)) {
                                child.material.color.copy(this._originalMaterials.get(child));
                            }
                        }
                    }
                });
            }
            
            // Reset health bar
            if (this.healthBarBg) {
                this.healthBarBg.position.y = 4.0 + (bossLevel * 0.5);
            }
            this.updateHealthBar();
            
            // Add dramatic entrance effect
            this.playEntranceAnimation();
        }
        
//        console.log(`Reset Hunter boss to level ${bossLevel} at position ${position.x}, ${position.y}, ${position.z}`);
    }
} 