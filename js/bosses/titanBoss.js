import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { BaseEnemy } from '../enemy.js';
import { Projectile } from '../projectile.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/loaders/GLTFLoader.js';

export class TitanBoss extends BaseEnemy {
    constructor(scene, position, player, bossLevel = 1) {
        super(scene, position, player);
        
        // Boss specific properties
        this.type = 'titan';
        this.bossLevel = bossLevel;
        
        // Scale health, damage and rewards with boss level
        this.maxHealth = 300 * bossLevel; // UPDATED: Changed from 100 to 300 per level
        this.health = this.maxHealth;
        this.damage = 25 + (12 * bossLevel); // High damage
        this.experienceValue = 500 * bossLevel;
        
        // Movement properties - very slow but powerful
        this.moveSpeed = 0.012; // UPDATED: Increased from 0.008
        this.chargeSpeed = 0.04; // Speed during charge attack
        this.isCharging = false;
        this.chargeTarget = null;
        this.attackCooldown = 1800; // ms between attacks (REDUCED from 2500ms)
        this.specialAttackCooldown = 4000; // UPDATED: Reduced from 5000ms to 4000ms
        this.lastSpecialAttackTime = 0;
        this.attackRange = 2.5; // Short attack range
        this.defaultColor = 0xff3300; // Red-orange
        
        // Titan appearance vars
        this.size = 2.0 + (bossLevel * 0.6); // Larger than other bosses
        this.spinSpeed = 0.005; // Slower spin
        
        // Animation properties
        this.mixer = null;
        this.animationActions = {};
        this.currentAnimation = null;
        this.model = null;
        
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
        
        // Track if player was hit by current charge attack
        this.chargeHitPlayer = false;
        
        // Create the boss mesh
        this.createEnemyMesh(position);
        
        // Add dramatic entrance effect
        this.playEntranceAnimation();
    }
    
    createEnemyMesh(position) {
        try {
            // Create a container group for the boss
            this.mesh = new THREE.Group();
            
            // Create a temporary placeholder while the model loads
            const placeholder = new THREE.Group();
            placeholder.name = "placeholder";
            
            // Main body - larger geometry for the boss
            const bodyGeometry = new THREE.BoxGeometry(this.size, this.size * 1.2, this.size);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.7,
                metalness: 0.3
            });
            const placeholderBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
            placeholderBody.castShadow = true;
            placeholder.add(placeholderBody);
            
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
            placeholder.add(shoulders);
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
            placeholder.add(this.leftArm);
            
            // Right arm
            this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
            this.rightArm.position.set(this.size * 0.65, 0, 0);
            this.rightArm.rotation.z = -Math.PI / 6; // Angle outward
            placeholder.add(this.rightArm);
            
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
            placeholder.add(this.head);
            
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
            
            // Add placeholder to mesh container
            this.mesh.add(placeholder);
            
            // Add to scene
            this.scene.add(this.mesh);
            
            // Create health bar
            this.createHealthBar();
            
            // Load the glTF model
            const loader = new GLTFLoader();
            const modelURL = '/models/titan.gltf';
            
            loader.load(
                modelURL,
                (gltf) => {
                    console.log('Titan boss model loaded successfully');
                    
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
                    const existingModel = this.mesh.getObjectByName("titan3DModel");
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
                    modelContainer.name = "titan3DModel";
                    
                    // Add the loaded model to our container
                    this.model = gltf.scene;
                    
                    // Apply scale adjustments based on boss level - titan is larger
                    const modelScale = 4.0 + (this.bossLevel * 0.7);
                    this.model.scale.set(modelScale, modelScale, modelScale);
                    
                    // Position the model properly - adjust Y position to ground level
                    this.model.position.y = -1.5; // Fine-tuned position for proper ground placement
                    
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
                        this.healthBarBg.position.y = 7.0 + (this.bossLevel * 0.5);
                    }
                    
                    // Set up animations if they exist
                    if (gltf.animations && gltf.animations.length) {
                        this.mixer = new THREE.AnimationMixer(this.model);
                        
                        // Store all animations
                        gltf.animations.forEach((clip) => {
                            this.animationActions[clip.name] = this.mixer.clipAction(clip);
                            console.log(`Loaded animation: ${clip.name}`);
                        });
                        
                        // Start the run animation by default
                        if (this.animationActions['Run']) {
                            this.playAnimation('Run');
                        }
                    }
                    
                    console.log("Titan boss 3D model setup complete");
                },
                (xhr) => {
                    console.log(`Loading titan boss model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                (error) => {
                    console.error('Error loading titan boss model:', error);
                    // Keep the placeholder visuals if model fails to load
                }
            );
            
            // Log for debugging
            console.log("Titan boss mesh creation initiated");
        } catch (error) {
            console.error("Error creating Titan boss mesh:", error);
        }
    }
    
    update(deltaTime) {
        try {
            if (!this.isAlive || !this.mesh) return;
            
            // Update animation mixer if it exists
            if (this.mixer) {
                this.mixer.update(deltaTime / 1000); // Convert deltaTime to seconds
            }
            
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
                
                // Face the player
                this.faceDirection(direction);
                
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
            
            // If using 3D model, animations are handled by the mixer
            // If using placeholder, animate manually
            if (!this.model) {
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
                
                // Reset hit flag when starting a new charge
                this.chargeHitPlayer = false;
                
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
            
            // Reset hit flag
            this.chargeHitPlayer = false;
            
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
            
            // Check if we hit the player during charge - only if we haven't hit them already
            if (!this.chargeHitPlayer) {
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
                    
                    // Mark that we've hit the player this charge
                    this.chargeHitPlayer = true;
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
                }
                
                // Visual effect
                this.createMeleeAttackEffect(useLeftArm || Math.random() > 0.5);
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
            
            // Safety check - if mesh doesn't exist, we can't do the animation
            if (!this.mesh) {
                console.warn("Cannot play entrance animation - mesh is null");
                return;
            }
            
            // Make boss initially invisible
            this.mesh.visible = false;
            
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
                        if (this.mesh) { // Extra safety check
                            this.mesh.position.y = -this.size + (targetY + this.size) * riseProgress;
                        
                            if (riseProgress < 1.0) {
                                requestAnimationFrame(riseAnimation);
                            } else {
                                // End rise animation
                                this.mesh.position.y = targetY;
                                
                                // Play "idle" or "run" animation if available
                                if (this.mixer && this.animationActions['Idle']) {
                                    this.playAnimation('Idle');
                                } else if (this.mixer && this.animationActions['Run']) {
                                    this.playAnimation('Run');
                                }
                                
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
                        } else {
                            // Mesh was disposed during animation, exit
                            console.warn("Mesh was disposed during rise animation");
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
    
    // Override removeFromScene to clean up properly
    removeFromScene() {
        console.log("Titan Boss removeFromScene called - ensuring complete cleanup");
        
        // Stop all animations
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.currentAnimation = null;
        }
        
        // If the model exists, fade it out
        if (this.model) {
            const fadeOut = () => {
                if (!this.model) return;
                
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
            };
            
            fadeOut();
        } else {
            this.cleanupResources();
        }
    }
    
    // Add a cleanupResources method to properly dispose of all resources
    cleanupResources() {
        try {
            // Clean up animations and mixer
            if (this.mixer) {
                this.mixer.stopAllAction();
                this.animationActions = {};
                this.currentAnimation = null;
                this.mixer = null;
            }
            
            // Clean up health bar if it exists
            if (this.healthBarBg) {
                if (this.healthBarBg.parent) {
                    this.healthBarBg.parent.remove(this.healthBarBg);
                }
                if (this.healthBarBg.geometry) this.healthBarBg.geometry.dispose();
                if (this.healthBarBg.material) this.healthBarBg.material.dispose();
                this.healthBarBg = null;
                this.healthBarFg = null;
            }
            
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
            
            // For bosses, we need to make sure the mesh is completely removed and not pooled
            if (this.mesh) {
                // Remove from scene
                if (this.mesh.parent) {
                    this.scene.remove(this.mesh);
                }
                
                // Dispose of main mesh resources if not already done
                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
                
                // Clear the mesh reference
                this.mesh = null;
            }
            
            console.log("Titan boss resources cleaned up completely");
        } catch (error) {
            console.error("Error cleaning up Titan boss resources:", error);
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
                console.warn(`Animation '${name}' not found in available animations`);
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
                this.currentAnimation.reset();
                this.currentAnimation.fadeIn(0.2);
                this.currentAnimation.play();
                
                console.log(`Playing titan animation: ${name}`);
            } catch (animError) {
                console.error(`Error playing animation '${name}':`, animError);
                this.currentAnimation = null;
            }
        } catch (error) {
            console.error(`Error in Titan playAnimation('${name}'):`, error);
            // Reset animation state on error
            this.currentAnimation = null;
        }
    }
    
    // Stop current animation
    stopAnimation() {
        try {
            // Stop current animation if one is playing
            if (this.currentAnimation && typeof this.currentAnimation.stop === 'function') {
                this.currentAnimation.stop();
                this.currentAnimation = null;
            }
        } catch (error) {
            console.error("Error in Titan stopAnimation:", error);
            this.currentAnimation = null;
        }
    }

    /**
     * Reset the boss for reuse from the pool
     * @param {THREE.Vector3} position - New position for the boss
     * @param {number} bossLevel - Level of the boss
     */
    reset(position, bossLevel = 1) {
        // Store the new boss level
        this.bossLevel = bossLevel;
        
        // Reset health and stats based on level
        this.maxHealth = 300 * bossLevel;
        this.health = this.maxHealth;
        this.damage = 25 + (12 * bossLevel);
        this.experienceValue = 500 * bossLevel;
        
        // Reset other properties
        this.isAlive = true;
        this.isCharging = false;
        this.chargeTarget = null;
        this.chargeHitPlayer = false;
        this.lastAttackTime = 0;
        this.lastSpecialAttackTime = 0;
        this.lastGroundSmashTime = 0;
        this.currentPhase = 0;
        
        // Reset size based on level
        this.size = 2.0 + (bossLevel * 0.6);
        
        // Check if mesh exists, if not create it
        if (!this.mesh) {
            console.log(`Mesh was null, creating enemy mesh for TitanBoss at position ${position.x}, ${position.y}, ${position.z}`);
            this.createEnemyMesh(position);
            
            // After creating mesh, make sure health bar is hidden during preloading
            if (this.healthBarBg) {
                // Move health bar to appropriate position
                this.healthBarBg.position.y = 7.0 + (bossLevel * 0.5);
                
                // Make sure it's not visible until the boss actually appears
                this.healthBarBg.visible = false;
            }
            
            // We don't call playEntranceAnimation here since createEnemyMesh is just for preloading
        } else {
            // Reset mesh position
            this.mesh.position.copy(position);
            this.mesh.position.y = this.size * 0.6; // Lift based on size
            this.mesh.visible = true;
            
            // Make model visible
            if (this.model) {
                this.model.visible = true;
                
                // Apply proper scale for current level
                const modelScale = 4.0 + (this.bossLevel * 0.7);
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
                this.healthBarBg.position.y = 7.0 + (bossLevel * 0.5);
                this.healthBarBg.visible = true; // Make sure it's visible for the actual boss
            }
            this.updateHealthBar();
            
            // Play entrance animation
            this.playEntranceAnimation();
        }
        
        console.log(`Reset Titan boss to level ${bossLevel} at position ${position.x}, ${position.y}, ${position.z}`);
    }
} 