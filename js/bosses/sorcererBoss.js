import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { BaseEnemy } from '../enemy.js';
import { Projectile } from '../projectile.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/loaders/GLTFLoader.js';

export class SorcererBoss extends BaseEnemy {
    constructor(scene, position, player, bossLevel = 1) {
        super(scene, position, player);
        
        // Boss specific properties
        this.type = 'sorcerer';
        this.bossLevel = bossLevel;
        
        // Scale health, damage and rewards with boss level
        this.maxHealth = 150 * bossLevel; // Lower health than Titan
        this.health = this.maxHealth;
        this.damage = 7.5 + (10 * bossLevel); // Reduced from 15 + (10 * bossLevel)
        this.experienceValue = 500 * bossLevel;
        
        // Movement properties - faster than Titan but keeps distance
        this.moveSpeed = 0.012;
        this.teleportCooldown = 5000; // Changed from 8000ms to 5000ms
        this.lastTeleportTime = 0;
        this.attackCooldown = 1500; // ms between attacks (faster attacks)
        this.specialAttackCooldown = 2000; // Changed from 6000ms to 2000ms
        this.lastSpecialAttackTime = 0;
        this.attackRange = 15; // Changed from 12 to 15
        this.preferredDistance = 12; // Changed from 10 to 12
        this.defaultColor = 0x9900ff; // Purple
        
        // Sorcerer appearance vars
        this.size = 1.2 + (bossLevel * 0.4); // Smaller than Titan
        this.spinSpeed = 0.02; // Fast spin
        
        // Animation properties
        this.mixer = null;
        this.animationActions = {};
        this.currentAnimation = null;
        this.model = null;
        
        // Attack patterns
        this.attackPatterns = [
            this.magicMissiles.bind(this),   // Multiple magic projectiles
            this.arcaneBlast.bind(this),     // Large AoE blast
            this.teleport.bind(this)         // Teleport to new location
        ];
        
        // Initialize boss phases
        this.phaseThresholds = [0.75, 0.5, 0.25]; // Percentage of health
        this.currentPhase = 0;
        
        // Projectile management
        this.projectiles = [];
        this.maxProjectiles = 30;
        
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
            
            // Main body - robe shape
            const bodyGeometry = new THREE.ConeGeometry(this.size, this.size * 2, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.7,
                metalness: 0.3,
                transparent: true,
                opacity: 0.6 // Make it semi-transparent
            });
            const placeholderBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
            placeholderBody.castShadow = true;
            placeholder.add(placeholderBody);
            
            // Create hood/head
            const hoodGeometry = new THREE.SphereGeometry(this.size * 0.6, 12, 12);
            const hoodMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x330066, // Darker purple
                roughness: 0.5,
                metalness: 0.2,
                transparent: true,
                opacity: 0.6
            });
            
            const placeholderHood = new THREE.Mesh(hoodGeometry, hoodMaterial);
            placeholderHood.position.y = this.size * 0.9;
            placeholder.add(placeholderHood);
            
            // Create glowing eye in shadow of hood
            const eyeGeometry = new THREE.SphereGeometry(this.size * 0.15, 8, 8);
            const eyeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00ccff, // Cyan
                emissive: 0x00ccff,
                emissiveIntensity: 0.9,
                transparent: true,
                opacity: 0.6
            });
            
            const placeholderEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            placeholderEye.position.set(0, 0, this.size * 0.3);
            placeholderHood.add(placeholderEye);
            
            // Position the mesh - float above ground
            this.mesh.position.copy(position);
            this.mesh.position.y = this.size + 0.5; // Float above ground
            
            // Give placeholder a unique name for easy reference later
            placeholder.name = "placeholder";
            
            // Add placeholder to the mesh container
            this.mesh.add(placeholder);
            
            // Initialize particles array to avoid undefined error
            this.particles = [];
            
            // Add to scene - ONLY ADD THE MAIN CONTAINER
            this.scene.add(this.mesh);
            
            // Create health bar
            this.createHealthBar();
            
            // Load the glTF model
            const loader = new GLTFLoader();
            const modelURL = '/models/sorcerer.gltf';
            
            loader.load(
                modelURL,
                (gltf) => {
                    console.log('Sorcerer boss model loaded successfully');
                    
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
                    const existingModel = this.mesh.getObjectByName("sorcerer3DModel");
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
                    modelContainer.name = "sorcerer3DModel";
                    
                    // Add the loaded model to our container
                    this.model = gltf.scene;
                    
                    // Apply scale adjustments based on boss level
                    const modelScale = 3.0 + (this.bossLevel * 0.5);
                    this.model.scale.set(modelScale, modelScale, modelScale);
                    
                    // Position the model properly - adjust Y position to ground level
                    this.model.position.y = -2.2; // Fine-tuned position for proper ground placement
                    
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
                            
                            // Add emissive glow for boss
                            // node.material.emissive = new THREE.Color(this.defaultColor);
                            // node.material.emissiveIntensity = 0.2 + (this.bossLevel * 0.1);
                        }
                    });
                    
                    // Add model to container, then add container to mesh
                    modelContainer.add(this.model);
                    this.mesh.add(modelContainer);
                    
                    // Adjust health bar position for model
                    if (this.healthBarBg) {
                        // Position health bar higher above the model
                        this.healthBarBg.position.y = 6.0 + (this.bossLevel * 0.5);
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
                    
                    // Create floating particles around the sorcerer model
                    this.createFloatingParticles();
                    
                    console.log("Sorcerer boss 3D model setup complete");
                },
                (xhr) => {
                    console.log(`Loading sorcerer boss model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                (error) => {
                    console.error('Error loading sorcerer boss model:', error);
                    // Create traditional visuals as fallback
                    this.createTraditionalVisuals();
                }
            );
            
            console.log("Sorcerer boss mesh creation initiated");
        } catch (error) {
            console.error("Error creating Sorcerer boss mesh:", error);
            // Attempt to create traditional visuals
            this.createTraditionalVisuals();
        }
    }
    
    createTraditionalVisuals() {
        // This function creates the original visual style if model loading fails
        console.log("Creating traditional sorcerer visuals as fallback");
        
        // Clear any existing children
        while(this.mesh.children.length > 0) {
            const child = this.mesh.children[0];
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
            this.mesh.remove(child);
        }
        
        // Create hood/head
        const hoodGeometry = new THREE.SphereGeometry(this.size * 0.6, 12, 12);
        const hoodMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x330066, // Darker purple
            roughness: 0.5,
            metalness: 0.2
        });
        
        this.hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        this.hood.position.y = this.size * 0.9;
        this.mesh.add(this.hood);
        
        // Create glowing eye in shadow of hood
        const eyeGeometry = new THREE.SphereGeometry(this.size * 0.15, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ccff, // Cyan
            emissive: 0x00ccff,
            emissiveIntensity: 0.9
        });
        
        this.eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.eye.position.set(0, 0, this.size * 0.3);
        this.hood.add(this.eye);
        
        // Create staff
        const staffGeometry = new THREE.CylinderGeometry(this.size * 0.05, this.size * 0.05, this.size * 2, 6);
        const staffMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x663300, // Brown
            roughness: 0.6,
            metalness: 0.2
        });
        
        this.staff = new THREE.Mesh(staffGeometry, staffMaterial);
        this.staff.position.set(this.size * 0.6, 0, 0);
        this.staff.rotation.z = Math.PI / 6; // Angle outward
        this.mesh.add(this.staff);
        
        // Create staff orb
        const orbGeometry = new THREE.SphereGeometry(this.size * 0.2, 12, 12);
        const orbMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ccff, // Cyan
            emissive: 0x00ccff,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });
        
        this.orb = new THREE.Mesh(orbGeometry, orbMaterial);
        this.orb.position.y = this.size;
        this.staff.add(this.orb);
        
        // Create glow around orb
        const glowLight = new THREE.PointLight(0x00ccff, 1, this.size * 8);
        this.orb.add(glowLight);
        
        // Create particles
        this.createFloatingParticles();
    }
    
    createFloatingParticles() {
        try {
            // Check if mesh exists before proceeding
            if (!this.mesh) {
                console.warn("Cannot create floating particles - mesh is null");
                return;
            }
            
            // Clean up any existing particles first
            if (this.particles && this.particles.length > 0) {
                for (const particle of this.particles) {
                    if (particle.geometry) particle.geometry.dispose();
                    if (particle.material) particle.material.dispose();
                    if (particle.parent) particle.parent.remove(particle);
                }
            }
            
            // Initialize or reset particles array
            this.particles = [];
            
            // Safety check for boss level
            const bossLevel = this.bossLevel || 1;
            const particleCount = 5 + bossLevel;
            
            // Safety check for size
            const size = this.size || 1.2;
            
            for (let i = 0; i < particleCount; i++) {
                try {
                    const particleGeometry = new THREE.SphereGeometry(size * 0.1, 6, 6);
                    const particleMaterial = new THREE.MeshBasicMaterial({ 
                        color: 0x00ccff,
                        transparent: true,
                        opacity: 0.7
                    });
                    
                    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                    
                    // Position in orbit around sorcerer
                    const angle = (i / particleCount) * Math.PI * 2;
                    const radius = size * 1.5;
                    
                    particle.position.set(
                        Math.cos(angle) * radius,
                        size * 0.5,
                        Math.sin(angle) * radius
                    );
                    
                    // Store orbit data
                    particle.userData = {
                        orbitAngle: angle,
                        orbitRadius: radius,
                        orbitSpeed: 0.001 + (Math.random() * 0.002),
                        verticalOffset: Math.random() * 0.5
                    };
                    
                    this.mesh.add(particle);
                    this.particles.push(particle);
                } catch (particleError) {
                    console.error("Error creating individual particle:", particleError);
                    // Continue with other particles
                }
            }
        } catch (error) {
            console.error("Error in SorcererBoss.createFloatingParticles:", error);
            // Initialize particles as empty array to prevent undefined errors
            this.particles = [];
        }
    }
    
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
                this.currentAnimation.reset().fadeIn(0.2).play();
            } catch (animError) {
                console.error(`Error playing animation '${name}':`, animError);
                this.currentAnimation = null;
            }
        } catch (error) {
            console.error(`Error in Sorcerer playAnimation('${name}'):`, error);
            // Reset animation state on error
            this.currentAnimation = null;
        }
    }
    
    stopAnimation() {
        try {
            // Stop current animation if one is playing
            if (this.currentAnimation && typeof this.currentAnimation.fadeOut === 'function') {
                this.currentAnimation.fadeOut(0.2);
                this.currentAnimation = null;
            }
        } catch (error) {
            console.error("Error in Sorcerer stopAnimation:", error);
            this.currentAnimation = null;
        }
    }
    
    update(deltaTime) {
        try {
            if (!this.isAlive || !this.mesh) return;
            
            // Update animation mixer if it exists
            if (this.mixer) {
                this.mixer.update(deltaTime / 1000); // Convert to seconds for THREE.js
            }
            
            // Update phase based on health percentage
            const healthPercentage = this.health / this.maxHealth;
            for (let i = 0; i < this.phaseThresholds.length; i++) {
                if (healthPercentage <= this.phaseThresholds[i] && this.currentPhase <= i) {
                    this.currentPhase = i + 1;
                    this.enterNewPhase();
                }
            }
            
            // Update boss behavior
            const playerPosition = this.player.getPosition();
            
            // Calculate direction to player
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, this.mesh.position);
            direction.y = 0; // Keep movement on xz plane
            
            // Calculate distance to player
            const distanceToPlayer = direction.length();
            
            // Check if should teleport away when player gets too close
            const currentTime = Date.now();
            if (distanceToPlayer < this.preferredDistance * 0.5 && 
                currentTime - this.lastTeleportTime > this.teleportCooldown) {
                this.teleport();
                this.lastTeleportTime = currentTime;
            } else {
                // Move to maintain optimal range
                if (distanceToPlayer < this.preferredDistance * 0.8) {
                    // Too close, move away
                    this.moveAwayFromPlayer(direction, distanceToPlayer, deltaTime);
                    
                    // Play run animation if available
                    if (this.mixer && this.animationActions['Run'] && 
                        (!this.currentAnimation || this.currentAnimation !== this.animationActions['Run'])) {
                        this.playAnimation('Run');
                    }
                } else if (distanceToPlayer > this.preferredDistance * 1.2) {
                    // Too far, move closer
                    this.moveTowardsPlayer(direction, distanceToPlayer, deltaTime);
                    
                    // Play run animation if available
                    if (this.mixer && this.animationActions['Run'] && 
                        (!this.currentAnimation || this.currentAnimation !== this.animationActions['Run'])) {
                        this.playAnimation('Run');
                    }
                } else {
                    // In optimal range, can stop moving animation
                    if (this.mixer && this.currentAnimation === this.animationActions['Run']) {
                        this.stopAnimation();
                    }
                }
                
                // Always face the player
                this.faceDirection(direction);
                
                // Attack if in range
                if (distanceToPlayer <= this.attackRange) {
                    if (currentTime - this.lastAttackTime > this.attackCooldown) {
                        this.attackPlayer();
                        this.lastAttackTime = currentTime;
                    }
                }
                
                // Special attack on cooldown
                if (currentTime - this.lastSpecialAttackTime > this.specialAttackCooldown) {
                    this.performSpecialAttack();
                    this.lastSpecialAttackTime = currentTime;
                }
            }
            
            // Update visual elements - floating particles, etc.
            this.updateVisuals(deltaTime);
            
            // Update projectiles
            this.updateProjectiles(deltaTime);
        } catch (error) {
            console.error("Error in Sorcerer boss update:", error);
        }
    }
    
    moveAwayFromPlayer(direction, distance, deltaTime) {
        // Move away from player
        const moveDir = direction.clone().normalize().negate();
        
        this.mesh.position.x += moveDir.x * this.moveSpeed * deltaTime;
        this.mesh.position.z += moveDir.z * this.moveSpeed * deltaTime;
    }
    
    updateVisuals(deltaTime) {
        try {
            if (!this.mesh) return;
            
            // Float up and down
            const floatSpeed = 0.001;
            const floatHeight = 0.2;
            const time = Date.now() * floatSpeed;
            
            this.mesh.position.y = this.size + 0.5 + (Math.sin(time) * floatHeight);
            
            // Rotate orb
            if (this.orb) {
                this.orb.rotation.y += 0.02 * deltaTime * 0.1;
            }
            
            // Update orbiting particles - add null check to prevent errors
            if (this.particles && this.particles.length > 0) {
                this.particles.forEach(particle => {
                    if (!particle || !particle.userData) return;
                    
                    const data = particle.userData;
                    
                    // Update orbit position
                    data.orbitAngle += data.orbitSpeed * deltaTime;
                    
                    particle.position.x = Math.cos(data.orbitAngle) * data.orbitRadius;
                    particle.position.z = Math.sin(data.orbitAngle) * data.orbitRadius;
                    particle.position.y = this.size * 0.5 + Math.sin(time + data.verticalOffset) * 0.5;
                    
                    // Pulse opacity
                    if (particle.material) {
                        particle.material.opacity = 0.5 + (Math.sin(time * 5 + data.orbitAngle) * 0.3);
                    }
                });
            }
            
            // Change orb and eye color based on phase
            if (this.orb && this.eye) {
                let energyColor;
                switch (this.currentPhase) {
                    case 0: energyColor = 0x00ccff; break; // Cyan
                    case 1: energyColor = 0x0099ff; break; // Blue
                    case 2: energyColor = 0x9900ff; break; // Purple
                    case 3: energyColor = 0xff00ff; break; // Magenta
                    default: energyColor = 0x00ccff;
                }
                
                this.orb.material.color.setHex(energyColor);
                this.orb.material.emissive.setHex(energyColor);
                this.eye.material.color.setHex(energyColor);
                this.eye.material.emissive.setHex(energyColor);
                
                // Update intensity
                const intensity = 0.8 + Math.sin(time * 5) * 0.2;
                this.orb.material.emissiveIntensity = intensity;
                this.eye.material.emissiveIntensity = intensity;
                
                // Update the point light color
                const light = this.orb.children[0];
                if (light && light.isPointLight) {
                    light.color.setHex(energyColor);
                }
            }
        } catch (error) {
            console.error("Error in Sorcerer visual update:", error);
        }
    }
    
    // Sorcerer's ranged attack
    attackPlayer() {
        // Choose a random attack pattern
        const attackIndex = Math.floor(Math.random() * this.attackPatterns.length);
        this.attackPatterns[attackIndex]();
        
        // Flash color for visual feedback
        this.flashColor(0xff9900); // Flash orange when attacking
    }
    
    flashColor(color, duration = 200) {
        // Store the original materials for 3D model
        if (!this._originalMaterials && this.model) {
            this._originalMaterials = new Map();
            this.model.traverse((node) => {
                if (node.isMesh && node.material) {
                    this._originalMaterials.set(node, node.material.color.clone());
                }
            });
        }
        
        if (this.model) {
            // Flash the 3D model
            this.model.traverse((node) => {
                if (node.isMesh && node.material) {
                    node.material.color.setHex(color);
                }
            });
            
            // Reset after duration
            setTimeout(() => {
                if (this.model && this.isAlive) {
                    this.model.traverse((node) => {
                        if (node.isMesh && node.material) {
                            const originalColor = this._originalMaterials.get(node);
                            if (originalColor) {
                                node.material.color.copy(originalColor);
                            } else {
                                // Fallback to default color if original not stored
                                node.material.color.setHex(this.defaultColor);
                            }
                        }
                    });
                }
            }, duration);
        } 
        // Fallback for traditional visuals
        else if (this.hood && this.staff) {
            // Store original colors
            const hoodColor = this.hood.material.color.getHex();
            const staffColor = this.staff.material.color.getHex();
            
            // Flash
            this.hood.material.color.setHex(color);
            this.staff.material.color.setHex(color);
            
            // Reset after duration
            setTimeout(() => {
                if (this.hood && this.staff && this.isAlive) {
                    this.hood.material.color.setHex(hoodColor);
                    this.staff.material.color.setHex(staffColor);
                }
            }, duration);
        }
    }
    
    fireProjectile(direction, position = null) {
        try {
            // Get position for projectile
            const projectilePosition = position || new THREE.Vector3().copy(this.mesh.position);
            
            // If no position provided, adjust height and add slight offset in direction
            if (!position) {
                projectilePosition.y = 1.5; // Adjust to match model or traditional visuals
                
                // Add slight offset in firing direction
                projectilePosition.add(direction.clone().multiplyScalar(1));
            }
            
            // Create projectile with boss styling
            const projectile = new Projectile(
                this.scene,
                projectilePosition,
                direction,
                0.025, // Speed
                0.3,   // Size - larger than normal enemies
                this.damage,
                0x00ccff, // Color (cyan)
                false,    // Not from player
                this.player, // Target
                5000      // Lifetime (ms)
            );
            
            // Add to projectiles array for tracking
            this.projectiles.push(projectile);
            
            // Limit total projectiles to prevent memory issues
            if (this.projectiles.length > this.maxProjectiles) {
                const oldProjectile = this.projectiles.shift();
                oldProjectile.deactivate();
            }
        } catch (error) {
            console.error("Error in Sorcerer fireProjectile:", error);
        }
    }
    
    updateProjectiles(deltaTime) {
        try {
            // Only check for collisions with player - movement and visuals handled by ProjectileManager
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                
                if (projectile.isActive) {
                    // Check collision with player
                    if (projectile.checkPlayerCollision) {
                        projectile.checkPlayerCollision(this.player);
                    } else {
                        // Manual collision check as fallback
                        const playerPos = this.player.getPosition();
                        const distance = projectile.mesh.position.distanceTo(playerPos);
                        
                        if (distance < (projectile.size + 0.5)) {
                            console.log(`Sorcerer projectile hit player for ${projectile.damage} damage`);
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
            console.error("Error updating Sorcerer projectiles:", error);
        }
    }
    
    // Special attack methods
    magicMissiles() {
        try {
            // Multiple magic missiles attack
            if (!this.isAlive) return;
            
            console.log("Sorcerer casting magic missiles");
            
            // Play attack animation if available
            if (this.mixer && this.animationActions['Attack']) {
                this.playAnimation('Attack');
                
                // Return to Run animation after attack completes
                setTimeout(() => {
                    if (this.isAlive && this.mixer && this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }, 1000);
            }
            
            // Get direction to player
            const playerPosition = this.player.getPosition();
            const baseDirection = new THREE.Vector3();
            baseDirection.subVectors(playerPosition, this.mesh.position);
            baseDirection.y = 0; // Keep projectile flat
            baseDirection.normalize();
            
            // Staff animation - point at player (for traditional visuals)
            if (this.staff) {
                this.staff.lookAt(this.mesh.worldToLocal(playerPosition.clone()));
                
                // Flash orb
                if (this.orb) {
                    const originalIntensity = this.orb.material.emissiveIntensity;
                    this.orb.material.emissiveIntensity = 1.5;
                    setTimeout(() => {
                        if (this.orb) this.orb.material.emissiveIntensity = originalIntensity;
                    }, 200);
                }
            }
            
            // Number of missiles based on current phase
            const missileCount = 2 + this.currentPhase;
            
            // Fire multiple missiles in spread pattern
            for (let i = 0; i < missileCount; i++) {
                setTimeout(() => {
                    if (!this.isAlive) return;
                    
                    // Create spread by adding angle variation
                    const spread = (i - (missileCount - 1) / 2) * 0.2; // Spread in radians
                    const direction = baseDirection.clone();
                    
                    // Rotate direction vector by spread angle
                    const rotationMatrix = new THREE.Matrix4().makeRotationY(spread);
                    direction.applyMatrix4(rotationMatrix);
                    
                    // Fire projectile with boss position offset slightly towards player
                    const spawnPos = this.mesh.position.clone().add(direction.clone().multiplyScalar(1));
                    spawnPos.y = 1.5; // Adjust height based on model
                    
                    this.fireProjectile(direction, spawnPos);
                }, i * 100); // Stagger the missiles
            }
        } catch (error) {
            console.error("Error in Sorcerer magicMissiles:", error);
        }
    }
    
    arcaneBlast() {
        try {
            // Large AoE blast attack
            if (!this.isAlive) return;
            
            console.log("Sorcerer charging arcane blast");
            
            // Play special attack animation if available
            if (this.mixer && this.animationActions['Special']) {
                this.playAnimation('Special');
                
                // Return to default animation after attack completes
                setTimeout(() => {
                    if (this.isAlive && this.mixer && this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }, 2000);
            }
            
            // Create charging effect - glowing sphere that grows
            const chargeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
            const chargeMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ccff,
                transparent: true,
                opacity: 0.7
            });
            
            const chargeEffect = new THREE.Mesh(chargeGeometry, chargeMaterial);
            
            // Position the charge effect
            if (this.model) {
                // Position for 3D model - center of the model, slightly elevated
                chargeEffect.position.set(0, 2, 0);
                this.mesh.add(chargeEffect);
            } else if (this.orb) {
                // Position for traditional visuals - at the orb
                this.orb.add(chargeEffect);
            } else {
                // Fallback position
                chargeEffect.position.set(0, 1, 0);
                this.mesh.add(chargeEffect);
            }
            
            // Add glow light
            const chargeLight = new THREE.PointLight(0x00ccff, 2, 10);
            chargeEffect.add(chargeLight);
            
            // Grow animation
            const growAnimation = () => {
                if (!this.isAlive) {
                    // Clean up if boss is defeated during animation
                    if (chargeEffect.parent) chargeEffect.parent.remove(chargeEffect);
                    if (chargeEffect.geometry) chargeEffect.geometry.dispose();
                    if (chargeEffect.material) chargeEffect.material.dispose();
                    return;
                }
                
                // Scale up to indicate charging
                chargeEffect.scale.x += 0.1;
                chargeEffect.scale.y += 0.1;
                chargeEffect.scale.z += 0.1;
                
                // Adjust opacity based on size (fade as it grows)
                chargeMaterial.opacity = Math.max(0.3, 0.7 - (chargeEffect.scale.x * 0.05));
                
                // Pulse light intensity
                chargeLight.intensity = 2 + Math.sin(Date.now() * 0.01) * 1.5;
                
                // Continue animation if still charging
                if (chargeEffect.scale.x < 8) {
                    requestAnimationFrame(growAnimation);
                } else {
                    // Release the blast when fully charged
                    this.releaseArcaneBlast(chargeEffect);
                }
            };
            
            // Start the growth animation
            growAnimation();
            
        } catch (error) {
            console.error("Error in Sorcerer arcaneBlast:", error);
        }
    }
    
    releaseArcaneBlast(chargeEffect) {
        try {
            // Get position for blast (centered on player if possible)
            console.log("Sorcerer releasing arcane blast");
            
            // Determine blast origin position (boss position by default)
            const blastPosition = this.mesh.position.clone();
            
            // Get player position for targeting
            const playerPosition = this.player.getPosition();
            const playerDistance = new THREE.Vector3().subVectors(playerPosition, blastPosition).length();
            
            // If player is far away, target them directly, otherwise create blast at player position
            const targetPosition = playerDistance > 15 ? playerPosition.clone() : playerPosition.clone();
            
            // Create blast effect
            const radius = 0.2; // Start small
            const maxRadius = 15; // Increase max radius for a bigger blast
            const growthRate = 0.4; // How fast it grows
            
            // Track whether this blast has already hit the player
            let hasHitPlayer = false;
            
            // Create blast mesh
            const blastGeometry = new THREE.SphereGeometry(radius, 32, 32);
            const blastMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ccff,
                transparent: true,
                opacity: 0.7
            });
            
            const blast = new THREE.Mesh(blastGeometry, blastMaterial);
            blast.position.copy(targetPosition);
            blast.position.y = 0.1; // Just above ground
            this.scene.add(blast);
            
            // Create blast light
            const blastLight = new THREE.PointLight(0x00ccff, 3, maxRadius * 1.5);
            blastLight.position.copy(targetPosition);
            blastLight.position.y = 1;
            this.scene.add(blastLight);
            
            // Clean up the charge effect
            if (chargeEffect) {
                if (chargeEffect.parent) chargeEffect.parent.remove(chargeEffect);
                if (chargeEffect.geometry) chargeEffect.geometry.dispose();
                if (chargeEffect.material) chargeEffect.material.dispose();
            }
            
            // Animate the blast
            const animate = () => {
                if (!this.isAlive) {
                    // Clean up if boss dies during animation
                    this.scene.remove(blast);
                    this.scene.remove(blastLight);
                    if (blast.geometry) blast.geometry.dispose();
                    if (blast.material) blast.material.dispose();
                    return;
                }
                
                // Grow the blast
                blast.scale.x += growthRate;
                blast.scale.y += growthRate;
                blast.scale.z += growthRate;
                
                // Adjust opacity based on size
                blastMaterial.opacity = Math.max(0.1, 0.7 - (blast.scale.x * 0.05));
                
                // Pulse light intensity and color
                const pulseIntensity = 1.5 + Math.sin(Date.now() * 0.01) * 0.5;
                blastLight.intensity = pulseIntensity;
                
                // Calculate current blast radius
                const currentRadius = radius * blast.scale.x;
                
                // Check for player hit - but only once per blast
                if (!hasHitPlayer && this.player) {
                    // Get distance from player to blast center
                    const distToPlayer = playerPosition.distanceTo(blast.position);
                    
                    // If player is within blast radius, apply damage
                    if (distToPlayer <= currentRadius) {
                        // Calculate damage reduction based on distance from center
                        // Closer to center = more damage (up to 150% base damage at center)
                        const distanceRatio = distToPlayer / currentRadius;
                        const damageMultiplier = 1.5 - (distanceRatio * 0.8); // 1.5 at center, 0.7 at edge
                        const damage = this.damage * damageMultiplier;
                        
                        // Apply damage to player
                        this.player.takeDamage(damage);
                        
                        // Log the hit
                        console.log(`Arcane blast hit player for ${damage.toFixed(1)} damage (${(damageMultiplier * 100).toFixed(0)}% power)`);
                        
                        // Mark as hit so we don't hit again with this blast
                        hasHitPlayer = true;
                        
                        // Visual feedback of hit (if player has a model)
                        if (this.player.body) {
                            // Try to flash the player's body
                            const originalColor = this.player.body.material.color.clone();
                            this.player.body.material.color.setHex(0x00ccff);
                            setTimeout(() => {
                                if (this.player.body && this.player.body.material) {
                                    this.player.body.material.color.copy(originalColor);
                                }
                            }, 150);
                        }
                    }
                }
                
                // Continue animation until max size is reached
                if (currentRadius < maxRadius) {
                    requestAnimationFrame(animate);
                } else {
                    // Clean up when animation completes
                    const fadeOut = () => {
                        blastMaterial.opacity -= 0.05;
                        blastLight.intensity -= 0.2;
                        
                        if (blastMaterial.opacity > 0 && blastLight.intensity > 0) {
                            requestAnimationFrame(fadeOut);
                        } else {
                            this.scene.remove(blast);
                            this.scene.remove(blastLight);
                            if (blast.geometry) blast.geometry.dispose();
                            if (blast.material) blast.material.dispose();
                        }
                    };
                    
                    fadeOut();
                }
            };
            
            animate();
        } catch (error) {
            console.error("Error in Sorcerer releaseArcaneBlast:", error);
        }
    }
    
    teleport() {
        // Store current position for effect
        const oldPosition = this.mesh.position.clone();
        
        // Determine new position (away from player)
        const playerPosition = this.player.getPosition();
        const direction = new THREE.Vector3();
        direction.subVectors(oldPosition, playerPosition);
        direction.y = 0;
        direction.normalize();
        
        // Move 2x preferred distance away
        const distance = this.preferredDistance * 2;
        const newPosition = new THREE.Vector3();
        newPosition.addVectors(playerPosition, direction.multiplyScalar(distance));
        
        // Add some randomness to position
        newPosition.x += (Math.random() * 10) - 5;
        newPosition.z += (Math.random() * 10) - 5;
        
        // Play teleport animation if available
        if (this.mixer && this.animationActions['Run']) {
            this.stopAnimation();
        }
        
        // Create disappear effect at old position
        this.createTeleportEffect(oldPosition, 0x9900ff);
        
        // Make boss temporarily invisible during teleport
        if (this.model) {
            this.model.visible = false;
        } else {
            this.mesh.visible = false;
        }
        
        // Actually teleport after a short delay
        setTimeout(() => {
            if (!this.isAlive) return;
            
            // Update position
            this.mesh.position.copy(newPosition);
            
            // Create appear effect at new position
            this.createTeleportEffect(newPosition, 0x00ccff);
            
            // Make visible again
            if (this.model) {
                this.model.visible = true;
            } else {
                this.mesh.visible = true;
            }
            
            // Resume animation
            if (this.mixer && this.animationActions['Run']) {
                this.playAnimation('Run');
            }
        }, 500);
    }
    
    playEntranceAnimation() {
        try {
            console.log("Sorcerer boss dramatic entrance");
            
            // Make boss initially invisible
            if (this.mesh) this.mesh.visible = false;
            
            // Create initial arcane circle on the ground
            const position = this.mesh.position.clone();
            position.y = 0.05; // Just above ground
            
            // Create glowing circle on the ground
            const circleGeometry = new THREE.CircleGeometry(this.size * 2, 32);
            const circleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x9900ff,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            const circle = new THREE.Mesh(circleGeometry, circleMaterial);
            circle.position.copy(position);
            circle.rotation.x = -Math.PI / 2; // Lay flat
            
            // Create a effects container for entrance elements
            const effectsContainer = new THREE.Group();
            effectsContainer.name = "entranceEffects";
            effectsContainer.add(circle);
            this.scene.add(effectsContainer);
            
            // Create vertical beam of light
            const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, 10, 16);
            const beamMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ccff,
                transparent: true,
                opacity: 0.7
            });
            
            const beam = new THREE.Mesh(beamGeometry, beamMaterial);
            beam.position.copy(position);
            beam.position.y = 5; // Beam height
            effectsContainer.add(beam);
            
            // Animate circle and beam
            let startTime = Date.now();
            const duration = 1500;
            
            const animateEntrance = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Pulse circle
                const pulse = 0.8 + Math.sin(progress * Math.PI * 6) * 0.2;
                circle.scale.set(pulse, pulse, pulse);
                
                // Fade beam
                circleMaterial.opacity = 0.7 * (1 - progress * 0.5);
                
                // Rotate circle
                circle.rotation.z += 0.02;
                
                // Continue animation
                if (progress < 1.0) {
                    requestAnimationFrame(animateEntrance);
                } else {
                    // Show the boss with a flash
                    if (this.mesh) {
                        this.mesh.visible = true;
                        
                        // Make boss float down from above
                        const originalY = this.mesh.position.y;
                        this.mesh.position.y = originalY + 5;
                        
                        const floatDuration = 1000;
                        const floatStartTime = Date.now();
                        
                        const floatAnimation = () => {
                            const floatElapsed = Date.now() - floatStartTime;
                            const floatProgress = Math.min(floatElapsed / floatDuration, 1.0);
                            
                            this.mesh.position.y = originalY + 5 * (1 - floatProgress);
                            
                            if (floatProgress < 1.0) {
                                requestAnimationFrame(floatAnimation);
                            } else {
                                // End of animation
                                this.mesh.position.y = originalY;
                                
                                // Remove entrance effects container
                                this.scene.remove(effectsContainer);
                                
                                // Clean up geometries and materials
                                circleGeometry.dispose();
                                circleMaterial.dispose();
                                beamGeometry.dispose();
                                beamMaterial.dispose();
                                
                                // Flash orb
                                if (this.orb && this.orb.material) {
                                    const originalIntensity = this.orb.material.emissiveIntensity;
                                    this.orb.material.emissiveIntensity = 2;
                                    
                                    setTimeout(() => {
                                        if (this.orb && this.orb.material) {
                                            this.orb.material.emissiveIntensity = originalIntensity;
                                        }
                                    }, 500);
                                }
                                
                                // Flash eye
                                if (this.eye && this.eye.material) {
                                    const originalIntensity = this.eye.material.emissiveIntensity;
                                    this.eye.material.emissiveIntensity = 2;
                                    
                                    setTimeout(() => {
                                        if (this.eye && this.eye.material) {
                                            this.eye.material.emissiveIntensity = originalIntensity;
                                        }
                                    }, 500);
                                }
                            }
                        };
                        
                        floatAnimation();
                    }
                }
            };
            
            animateEntrance();
            
        } catch (error) {
            console.error("Error in Sorcerer entrance animation:", error);
            // Ensure boss is visible even if animation fails
            if (this.mesh) this.mesh.visible = true;
        }
    }
    
    createTeleportEffect(position, color) {
        try {
            // Create a container for teleport effects
            const teleportEffects = new THREE.Group();
            teleportEffects.name = "teleportEffects";
            
            // Create vertical beam
            const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, 6, 16);
            const beamMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.7
            });
            
            const beam = new THREE.Mesh(beamGeometry, beamMaterial);
            beam.position.copy(position);
            beam.position.y = 3; // Half height
            teleportEffects.add(beam);
            
            // Create circle on ground
            const circleGeometry = new THREE.CircleGeometry(1, 32);
            const circleMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            const circle = new THREE.Mesh(circleGeometry, circleMaterial);
            circle.position.copy(position);
            circle.position.y = 0.05;
            circle.rotation.x = -Math.PI / 2; // Lay flat
            teleportEffects.add(circle);
            
            // Add all teleport effects to scene
            this.scene.add(teleportEffects);
            
            // Create particles
            const particleCount = 30;
            const particleGeometry = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);
            const particleVelocities = [];
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                // Start at position
                particlePositions[i3] = position.x;
                particlePositions[i3 + 1] = position.y + Math.random() * 3;
                particlePositions[i3 + 2] = position.z;
                
                // Random velocity
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.01 + Math.random() * 0.03;
                particleVelocities.push({
                    x: Math.cos(angle) * speed,
                    y: (Math.random() * 0.02) - 0.01,
                    z: Math.sin(angle) * speed
                });
            }
            
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
            
            const particleMaterial = new THREE.PointsMaterial({
                color: color,
                size: 0.2,
                transparent: true,
                opacity: 0.8
            });
            
            const particles = new THREE.Points(particleGeometry, particleMaterial);
            teleportEffects.add(particles);
            
            // Animation
            const duration = 500;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Fade out
                beamMaterial.opacity = 0.7 * (1 - progress);
                circleMaterial.opacity = 0.7 * (1 - progress);
                particleMaterial.opacity = 0.8 * (1 - progress);
                
                // Expand circle
                circle.scale.setScalar(1 + progress);
                
                // Animate particles
                const positions = particleGeometry.attributes.position.array;
                
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    
                    // Update positions based on velocity
                    positions[i3] += particleVelocities[i].x;
                    positions[i3 + 1] += particleVelocities[i].y;
                    positions[i3 + 2] += particleVelocities[i].z;
                }
                
                particleGeometry.attributes.position.needsUpdate = true;
                
                // Continue animation
                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    // Clean up - remove container which removes all child objects
                    this.scene.remove(teleportEffects);
                    
                    // Dispose of resources
                    beamMaterial.dispose();
                    beamGeometry.dispose();
                    circleMaterial.dispose();
                    circleGeometry.dispose();
                    particleMaterial.dispose();
                    particleGeometry.dispose();
                }
            };
            
            animate();
        } catch (error) {
            console.error("Error creating teleport effect:", error);
        }
    }
    
    createPhaseTransitionEffect() {
        try {
            // Flash the entire sorcerer body
            this.flashColor(0x00ffff, 1000);
            
            // Create additional visual effects
            const position = this.mesh.position.clone();
            
            // Create effect container
            const effectsContainer = new THREE.Group();
            effectsContainer.name = "phaseEffects";
            
            // Create explosion of energy
            const particleCount = 50;
            const particleGeometry = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);
            const particleVelocities = [];
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                // Start at boss position
                particlePositions[i3] = position.x;
                particlePositions[i3 + 1] = position.y;
                particlePositions[i3 + 2] = position.z;
                
                // Random velocity in all directions
                const speed = 0.05 + Math.random() * 0.1;
                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = Math.random() * Math.PI * 2;
                
                particleVelocities.push({
                    x: Math.sin(angle1) * Math.cos(angle2) * speed,
                    y: Math.sin(angle1) * Math.sin(angle2) * speed,
                    z: Math.cos(angle1) * speed
                });
            }
            
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
            
            // Different color based on phase
            let phaseColor;
            switch(this.currentPhase) {
                case 1: phaseColor = 0x0099ff; break; // Blue
                case 2: phaseColor = 0x9900ff; break; // Purple
                case 3: phaseColor = 0xff00ff; break; // Magenta
                default: phaseColor = 0x00ccff; // Cyan
            }
            
            const particleMaterial = new THREE.PointsMaterial({
                color: phaseColor,
                size: 0.3,
                transparent: true,
                opacity: 0.8
            });
            
            const particles = new THREE.Points(particleGeometry, particleMaterial);
            effectsContainer.add(particles);
            
            // Create shockwave effect
            const shockwaveGeometry = new THREE.RingGeometry(0.1, 0.2, 32);
            const shockwaveMaterial = new THREE.MeshBasicMaterial({
                color: phaseColor,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
            shockwave.position.copy(position);
            shockwave.rotation.x = Math.PI / 2; // Make it horizontal
            effectsContainer.add(shockwave);
            
            // Add all effects to scene
            this.scene.add(effectsContainer);
            
            // Animation
            const duration = 1500;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Animate particles
                const positions = particleGeometry.attributes.position.array;
                
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    
                    // Update positions based on velocity
                    positions[i3] += particleVelocities[i].x;
                    positions[i3 + 1] += particleVelocities[i].y;
                    positions[i3 + 2] += particleVelocities[i].z;
                }
                
                particleGeometry.attributes.position.needsUpdate = true;
                
                // Fade particles
                particleMaterial.opacity = 0.8 * (1 - progress);
                
                // Expand and fade shockwave
                const shockwaveSize = 0.2 + progress * 10;
                shockwave.scale.set(shockwaveSize, shockwaveSize, shockwaveSize);
                shockwaveMaterial.opacity = 0.7 * (1 - progress);
                
                // Continue animation
                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    // Clean up - remove container which removes all child objects
                    this.scene.remove(effectsContainer);
                    
                    // Dispose of resources
                    particleGeometry.dispose();
                    particleMaterial.dispose();
                    shockwaveGeometry.dispose();
                    shockwaveMaterial.dispose();
                }
            };
            
            animate();
        } catch (error) {
            console.error("Error in Sorcerer phase transition effect:", error);
        }
    }

    // Add removeFromScene method to override BaseEnemy implementation
    removeFromScene() {
        if (this.mesh) {
            // Stop all animations first
            if (this.mixer) {
                this.mixer.stopAllAction();
                this.currentAnimation = null;
            }
            
            // Fade out the model
            const fadeOut = () => {
                if (this.model) {
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
                } else {
                    // Traditional visuals fade
                    if (this.hood && this.hood.material) {
                        this.hood.material.transparent = true;
                        this.hood.material.opacity -= 0.05;
                    }
                    
                    if (this.staff && this.staff.material) {
                        this.staff.material.transparent = true;
                        this.staff.material.opacity -= 0.05;
                    }
                    
                    // Check if fade is complete
                    if ((this.hood && this.hood.material && this.hood.material.opacity > 0) ||
                        (this.staff && this.staff.material && this.staff.material.opacity > 0)) {
                        requestAnimationFrame(fadeOut);
                    } else {
                        this.cleanupResources();
                    }
                }
            };
            
            // Start fading out
            fadeOut();
        }
    }
    
    cleanupResources() {
        // Final cleanup of all resources
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.model);
        }
        
        // Remove from scene
        this.scene.remove(this.mesh);
        
        // Clean up model resources
        if (this.model) {
            this.model.traverse((node) => {
                if (node.isMesh) {
                    if (node.geometry) node.geometry.dispose();
                    if (node.material) {
                        if (Array.isArray(node.material)) {
                            node.material.forEach(material => material.dispose());
                        } else {
                            node.material.dispose();
                        }
                    }
                }
            });
        }
        
        // Clean up traditional visuals
        if (this.hood) {
            if (this.hood.geometry) this.hood.geometry.dispose();
            if (this.hood.material) this.hood.material.dispose();
        }
        
        if (this.staff) {
            if (this.staff.geometry) this.staff.geometry.dispose();
            if (this.staff.material) this.staff.material.dispose();
        }
        
        if (this.orb) {
            if (this.orb.geometry) this.orb.geometry.dispose();
            if (this.orb.material) this.orb.material.dispose();
        }
        
        // Clean up particles
        if (this.particles) {
            for (const particle of this.particles) {
                if (particle.geometry) particle.geometry.dispose();
                if (particle.material) particle.material.dispose();
            }
            this.particles = [];
        }
        
        // Clean up projectiles
        if (this.projectiles) {
            for (const projectile of this.projectiles) {
                if (projectile.deactivate) {
                    projectile.deactivate();
                }
            }
            this.projectiles = [];
        }
        
        // Clear references
        this.model = null;
        this.mesh = null;
        this.hood = null;
        this.staff = null;
        this.orb = null;
        this._originalMaterials = null;
    }
    
    get collisionRadius() {
        return this.size * 1.0; // Use sorcerer size for collision radius
    }
    
    performSpecialAttack() {
        try {
            // Choose attack based on distance to player
            if (!this.isAlive) return;
            
            // Get player position and calculate distance
            const playerPosition = this.player.getPosition();
            const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
            
            // Select attack based on distance
            let attackPattern;
            
            if (distanceToPlayer >= 10) {
                // Player is far away (10 or more distance) - use magic missiles
                attackPattern = this.magicMissiles.bind(this);
                console.log("Sorcerer using magic missiles based on distance");
            } else {
                // Player is close (less than 10 distance) - use arcane blast
                attackPattern = this.arcaneBlast.bind(this);
                console.log("Sorcerer using arcane blast based on distance");
            }
            
            // Execute the selected attack pattern
            if (attackPattern) {
                console.log(`Sorcerer performing special attack: ${attackPattern.name}`);
                attackPattern();
            }
        } catch (error) {
            console.error("Error in Sorcerer performSpecialAttack:", error);
        }
    }
    
    enterNewPhase() {
        try {
            console.log(`Sorcerer entering phase ${this.currentPhase}`);
            
            // Create a phase transition effect
            this.createPhaseTransitionEffect();
            
            // Adjust stats based on the new phase
            switch(this.currentPhase) {
                case 1:
                    // Phase 1: Faster teleportation
                    this.teleportCooldown = 6000;
                    break;
                case 2:
                    // Phase 2: Faster attacks
                    this.attackCooldown = 1200;
                    this.teleportCooldown = 5000;
                    break;
                case 3:
                    // Phase 3: More aggressive
                    this.attackCooldown = 1000;
                    this.specialAttackCooldown = 4000;
                    this.teleportCooldown = 4000;
                    this.moveSpeed = 0.015;
                    break;
            }
        } catch (error) {
            console.error("Error in Sorcerer enterNewPhase:", error);
        }
    }

    /**
     * Reset the boss for reuse from the pool
     * @param {THREE.Vector3} position - New position for the boss
     * @param {number} bossLevel - Level of the boss
     */
    reset(position, bossLevel = 1) {
        try {
            // Store the new boss level
            this.bossLevel = bossLevel;
            
            // Reset health and stats based on level
            this.maxHealth = 150 * bossLevel;
            this.health = this.maxHealth;
            this.damage = 7.5 + (10 * bossLevel);
            this.experienceValue = 500 * bossLevel;
            
            // Reset other properties
            this.isAlive = true;
            this.lastAttackTime = 0;
            this.lastSpecialAttackTime = 0;
            this.lastTeleportTime = 0;
            this.currentPhase = 0;
            
            // Clean up any existing projectiles
            if (this.projectiles && this.projectiles.length > 0) {
                for (const projectile of this.projectiles) {
                    if (projectile && projectile.isActive && projectile.deactivate) {
                        projectile.deactivate();
                    }
                }
                this.projectiles = [];
            }
            
            // Reset size based on level
            this.size = 1.2 + (bossLevel * 0.4);
            
            // Clean up particles first to avoid errors
            if (this.particles && this.particles.length > 0) {
                for (const particle of this.particles) {
                    if (particle.geometry) particle.geometry.dispose();
                    if (particle.material) particle.material.dispose();
                    if (particle.parent) particle.parent.remove(particle);
                }
                this.particles = [];
            }
            
            // Check if mesh exists, if not create it
            if (!this.mesh) {
                console.log("Mesh was null, creating enemy mesh for SorcererBoss");
                this.createEnemyMesh(position);
            } else {
                // Reset mesh position
                this.mesh.position.copy(position);
                this.mesh.position.y = this.size + 0.5; // Float above ground
                this.mesh.visible = true;
                
                // Make model visible
                if (this.model) {
                    this.model.visible = true;
                    
                    // Apply scale adjustments based on boss level
                    const modelScale = 3.0 + (this.bossLevel * 0.5);
                    this.model.scale.set(modelScale, modelScale, modelScale);
                    
                    // Make sure all meshes are visible
                    this.model.traverse(child => {
                        if (child.isMesh) {
                            child.visible = true;
                            // Reset material color if needed
                            if (this._originalMaterials && this._originalMaterials.has(child)) {
                                child.material.color.copy(this._originalMaterials.get(child));
                            }
                        }
                    });
                }
                
                // Reset health bar
                this.updateHealthBar();
                
                // Recreate particle effects - only when mesh exists
                this.createFloatingParticles();
            }
            
            // Play entrance animation
            this.playEntranceAnimation();
            
            console.log(`Reset Sorcerer boss to level ${bossLevel} at position ${position.x}, ${position.y}, ${position.z}`);
        } catch (error) {
            console.error("Error resetting SorcererBoss:", error);
            
            // Ensure particles array exists to prevent future errors
            this.particles = this.particles || [];
            this.projectiles = this.projectiles || [];
            
            // If there was an error, attempt to create a new mesh as fallback
            if (!this.mesh && position) {
                console.log("Attempting to create new mesh after reset error");
                this.createEnemyMesh(position);
            }
        }
    }
} 