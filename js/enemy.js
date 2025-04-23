import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/loaders/GLTFLoader.js';
import { Projectile } from './projectile.js';

// EnemyType enum for wave manager to use
export const EnemyType = {
    BASIC: 'basic',
    FAST: 'fast',
    TANKY: 'tanky',
    RANGED: 'ranged'
};

// Pool for enemy instances to reduce garbage collection
class EnemyPool {
    constructor() {
        this.pools = {
            [EnemyType.BASIC]: [],
            [EnemyType.FAST]: [],
            [EnemyType.TANKY]: [],
            [EnemyType.RANGED]: []
        };
    }
    
    get(type, scene, position, player, powerScaling = 1.0) {
        // Check if we have an available enemy in the pool
        if (this.pools[type] && this.pools[type].length > 0) {
            const enemy = this.pools[type].pop();
            
            // Check if the enemy was recently released - implement cooldown period
            const currentTime = Date.now();
            if (enemy._lastReleaseTime && (currentTime - enemy._lastReleaseTime < 1500)) {
                // If released less than 1.5 seconds ago, put it back and create a new enemy instead
                console.log(`Enemy ${enemy.id} was recently released (${currentTime - enemy._lastReleaseTime}ms ago), creating new one instead`);
                this.pools[type].push(enemy); // Put it back in the pool
                
                // Create a new instance
                const newEnemy = (() => {
                    switch (type) {
                        case EnemyType.FAST:
                            return new FastEnemy(scene, position, player, powerScaling);
                        case EnemyType.TANKY:
                            return new TankyEnemy(scene, position, player, powerScaling);
                        case EnemyType.RANGED:
                            return new RangedEnemy(scene, position, player, powerScaling);
                        default:
                            return new BasicEnemy(scene, position, player, powerScaling);
                    }
                })();
                
                // Log newly created enemy stats
                console.log(`Created new ${newEnemy.type} enemy: Health=${newEnemy.health.toFixed(1)}/${newEnemy.maxHealth.toFixed(1)}, Damage=${newEnemy.damage.toFixed(1)}, Speed=${newEnemy.moveSpeed.toFixed(4)}, PowerScaling=${newEnemy.powerScaling.toFixed(2)}`);
                
                return newEnemy;
            }
            
            enemy.reset(position, powerScaling);
            
            // Log enemy stats after being pulled from pool
            console.log(`Respawned ${enemy.type} enemy: Health=${enemy.health.toFixed(1)}/${enemy.maxHealth.toFixed(1)}, Damage=${enemy.damage.toFixed(1)}, Speed=${enemy.moveSpeed.toFixed(4)}, PowerScaling=${enemy.powerScaling.toFixed(2)}`);
            
            return enemy;
        }
        
        // Create a new enemy if none available
        const newEnemy = (() => {
            switch (type) {
                case EnemyType.FAST:
                    return new FastEnemy(scene, position, player, powerScaling);
                case EnemyType.TANKY:
                    return new TankyEnemy(scene, position, player, powerScaling);
                case EnemyType.RANGED:
                    return new RangedEnemy(scene, position, player, powerScaling);
                default:
                    return new BasicEnemy(scene, position, player, powerScaling);
            }
        })();
        
        // Log newly created enemy stats
        console.log(`Created new ${newEnemy.type} enemy: Health=${newEnemy.health.toFixed(1)}/${newEnemy.maxHealth.toFixed(1)}, Damage=${newEnemy.damage.toFixed(1)}, Speed=${newEnemy.moveSpeed.toFixed(4)}, PowerScaling=${newEnemy.powerScaling.toFixed(2)}`);
        
        return newEnemy;
    }
    
    release(enemy) {
        if (enemy && enemy.type && this.pools[enemy.type]) {
            // Record when this enemy was released to implement cooldown period
            enemy._lastReleaseTime = Date.now();
            
            // Reset minimal enemy state - leave ID and position intact
            enemy.isAlive = false;
            
            // Cancel any pending animations or timers
            if (enemy._fadeOutInterval) {
                clearInterval(enemy._fadeOutInterval);
                enemy._fadeOutInterval = null;
            }
            
            // Clean up power ring if it exists
            if (enemy.powerRing) {
                if (enemy.mesh) {
                    enemy.mesh.remove(enemy.powerRing);
                }
                enemy.scene.remove(enemy.powerRing);
                if (enemy.powerRing.geometry) enemy.powerRing.geometry.dispose();
                if (enemy.powerRing.material) enemy.powerRing.material.dispose();
                enemy.powerRing = null;
            }
            
            // Ensure placeholder is removed if it exists
            if (enemy.placeholder) {
                if (enemy.mesh) {
                    enemy.mesh.remove(enemy.placeholder);
                }
                // Find and remove any meshes in the placeholder
                if (enemy.placeholder.children && enemy.placeholder.children.length > 0) {
                    for (let i = enemy.placeholder.children.length - 1; i >= 0; i--) {
                        const child = enemy.placeholder.children[i];
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                        enemy.placeholder.remove(child);
                    }
                }
                enemy.placeholder = null;
            }
            
            if (enemy.mesh) {
                enemy.mesh.visible = false;
                
                // Handle model differently than basic mesh
                if (enemy.model) {
                    // Restore original materials before returning to pool
                    enemy.restoreOriginalMaterials();
                    
                    // Force model visibility to false
                    enemy.model.visible = false;
                    
                    // Ensure model position is properly reset for next use
                    if (enemy.type === EnemyType.BASIC) {
                        enemy.model.position.y = -0.75;
                        console.log(`Enemy ${enemy.id} returned to pool, model position reset to y=${enemy.model.position.y}`);
                    } else if (enemy.type === EnemyType.FAST) {
                        enemy.model.position.y = -0.4;
                        console.log(`Enemy ${enemy.id} returned to pool, model position reset to y=${enemy.model.position.y}`);
                    } else if (enemy.type === EnemyType.TANKY) {
                        enemy.model.position.y = -0.9;
                        console.log(`Enemy ${enemy.id} returned to pool, model position reset to y=${enemy.model.position.y}`);
                    } else if (enemy.type === EnemyType.RANGED) {
                        enemy.model.position.y = -0.5;
                        console.log(`Enemy ${enemy.id} returned to pool, model position reset to y=${enemy.model.position.y}`);
                    }
                }
                // Ensure material color is reset to default before pooling for basic mesh
                else if (enemy.mesh.material) {
                    enemy.mesh.material.color.setHex(enemy.defaultColor);
                    enemy.mesh.material.opacity = 1;
                    enemy.mesh.material.transparent = false;
                }
            }
            
            // Clean up projectiles for ranged enemies
            if (enemy.type === EnemyType.RANGED && enemy.projectiles) {
                for (const projectile of enemy.projectiles) {
                    if (projectile.isActive) {
                        projectile.deactivate();
                    }
                }
                enemy.projectiles = [];
            }
            
            // Stop any animations
            if (enemy.mixer) {
                // Stop all animations
                Object.values(enemy.animationActions).forEach(action => {
                    if (action && action.isRunning()) {
                        action.stop();
                    }
                });
                enemy.currentAnimation = null;
            }
            
            // Add to pool - preserve the enemy's identity and position
            // Limit pool size to prevent memory issues
            const MAX_POOL_SIZE = 30;
            if (this.pools[enemy.type].length < MAX_POOL_SIZE) {
                console.log(`Enemy ${enemy.id} of type ${enemy.type} returned to pool. Current pool size: ${this.pools[enemy.type].length}`);
                this.pools[enemy.type].push(enemy);
            } else {
                console.log(`Pool for ${enemy.type} is full (${MAX_POOL_SIZE}), discarding enemy ${enemy.id}`);
                // We don't need to do additional cleanup since we already did it above
            }
        }
    }
}

// Singleton instance of enemy pool
export const enemyPool = new EnemyPool();

// Base Enemy class
export class BaseEnemy {
    constructor(scene, position, player, powerScaling = 1.0) {
        this.scene = scene;
        this.player = player;
        
        // Generate a unique ID for this enemy instance
        this.id = Math.random().toString(36).substr(2, 9);
        
        // Default enemy values
        this.isAlive = true;
        this.baseHealth = 30; // Store base values
        this.baseDamage = 10;
        this.health = this.baseHealth * powerScaling;
        this.maxHealth = this.baseHealth * powerScaling;
        this.damage = this.baseDamage * powerScaling;
        this.moveSpeed = 0.015;
        this.attackRange = 2;
        this.attackCooldown = 1000; // ms
        this.lastAttackTime = 0;
        this.experienceValue = 20;
        this.defaultColor = 0xff0000; // Red
        this.minimumDistance = 1.5; // Minimum distance to maintain from player
        this.maxSpeedMultiplier = 1.0; // Cap on speed multiplier to prevent excessive speed
        
        // Store the power scaling factor
        this.powerScaling = powerScaling;
        
        // Animation properties
        this.mixer = null;
        this.animationActions = {};
        this.currentAnimation = null;
        this.model = null;
        
        // Track placeholder to ensure proper removal
        this.placeholder = null;
        
        // Store original materials for model
        this._originalMaterials = new Map();
        
        // Create mesh if position is provided
        if (position) {
            this.createEnemyMesh(position, powerScaling);
        }
    }
    
    createEnemyMesh(position, powerScaling) {
        // Base implementation - should be overridden by subclasses
        const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.75; // Half height off the ground
        
        // Rotation - defaults to cone pointing up
        this.mesh.rotation.x = Math.PI;
        
        // Create a health bar
        this.createHealthBar();
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    createHealthBar() {
        // Create health bar container
        const healthBarWidth = 1.5;   // Width of the health bar
        const healthBarHeight = 0.2;  // Height of the health bar
        const healthBarDepth = 0.1;   // Depth (thickness) of the health bar
        
        // Create a group to hold all health bar elements
        this.healthBarBg = new THREE.Group();
        
        // Background bar (black)
        const bgGeometry = new THREE.BoxGeometry(healthBarWidth, healthBarHeight, healthBarDepth);
        const bgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.8
        });
        const barBackground = new THREE.Mesh(bgGeometry, bgMaterial);
        this.healthBarBg.add(barBackground);
        
        // Foreground bar (green)
        const fgGeometry = new THREE.BoxGeometry(healthBarWidth, healthBarHeight, healthBarDepth / 2);
        const fgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00
        });
        this.healthBarFg = new THREE.Mesh(fgGeometry, fgMaterial);
        this.healthBarFg.position.z = healthBarDepth / 2; // Slightly in front of background
        this.healthBarBg.add(this.healthBarFg);
        
        // Add outline to the health bar (white border)
        const outlineWidth = healthBarWidth + 0.05;
        const outlineHeight = healthBarHeight + 0.05;
        const outlineDepth = healthBarDepth + 0.01;
        const outlineGeometry = new THREE.BoxGeometry(outlineWidth, outlineHeight, outlineDepth);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        this.healthBarBg.add(outline);
        
        // Position the health bar container
        this.healthBarBg.position.y = 2.0; // Above the enemy
        
        // Add health bar to mesh
        this.mesh.add(this.healthBarBg);
        
        // Update health bar to match initial health
        this.updateHealthBar();
    }
    
    updateHealthBar() {
        if (this.healthBarFg) {
            // Calculate health percentage
            const healthPercent = this.health / this.maxHealth;
            
            // Update scale to reflect current health
            this.healthBarFg.scale.x = Math.max(0, healthPercent);
            
            // Position on left side of bar to grow rightward
            this.healthBarFg.position.x = (healthPercent - 1) * 0.75;
        }
    }
    
    updateHealthBarFacingCamera(camera) {
        // Instead of making the health bar face the camera, keep it horizontal
        if (this.healthBarBg) {
            // Make it face forward with a slight tilt for better visibility
            this.healthBarBg.rotation.set(-0.2, 0, 0);
        }
    }
    
    playAnimation(name) {
        // Check if animation exists before attempting to play it
        if (!this.animationActions[name]) {
            return;
        }
        
        // Stop current animation
        if (this.currentAnimation) {
            this.currentAnimation.fadeOut(0.2);
        }
        
        // Start new animation
        this.currentAnimation = this.animationActions[name];
        this.currentAnimation.reset().fadeIn(0.2).play();
    }
    
    reset(position, powerScaling = 1.0) {
        // Reset enemy state when pulled from pool
        this.isAlive = true;
        this._isAlreadyDying = false;
        
        // Cancel any pending animations or timers from previous use
        if (this._fadeOutInterval) {
            clearInterval(this._fadeOutInterval);
            this._fadeOutInterval = null;
        }
        
        // Update power scaling
        this.powerScaling = powerScaling;
        
        // Apply power scaling to stats using base values if available
        if (this.baseHealth) {
            this.maxHealth = this.baseHealth * powerScaling;
            this.health = this.maxHealth;
        } else {
            // Fallback for enemies without base values
            this.maxHealth = 30 * powerScaling;
            this.health = this.maxHealth;
        }
        
        if (this.baseDamage) {
            this.damage = this.baseDamage * powerScaling;
        } else {
            this.damage = 10 * powerScaling;
        }
        
        this.lastAttackTime = 0;
        
        // Update health bar to show full health
        this.updateHealthBar();
        
        // Don't reset the ID - we want to keep the same ID for position tracking
        // this.id remains unchanged
        
        if (this.mesh) {
            // Make visible again
            this.mesh.visible = true;
            
            // Reset material color
            if (this.mesh.material) {
                // If material is not properly set, recreate it
                if (this.mesh.material.color.getHex() !== this.defaultColor) {
                    this.mesh.material.dispose(); // Dispose old material to prevent memory leaks
                    this.mesh.material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
                } else {
                    // Just reset existing material
                    this.mesh.material.color.setHex(this.defaultColor);
                }
                
                this.mesh.material.opacity = 1;
                this.mesh.material.transparent = false;
            }
            
            // Update position
            if (position) {
                this.mesh.position.copy(position);
                
                // Also reset y position based on enemy type
                switch(this.type) {
                    case EnemyType.BASIC:
                        this.mesh.position.y = 0.75; // Half height for cone
                        break;
                    case EnemyType.FAST:
                        this.mesh.position.y = 0.4; // Half height for cube
                        break;
                    case EnemyType.TANKY:
                        this.mesh.position.y = 0.9; // Half height for cylinder
                        break;
                    case EnemyType.RANGED:
                        this.mesh.position.y = 0.5; // Half height for sphere
                        break;
                    default:
                        this.mesh.position.y = 0.75;
                }
            }
            
            // If there's a model, ensure it's properly reset
            if (this.model) {
                // Force model to be visible
                this.model.visible = true;
                
                // Ensure model position is correctly set based on enemy type
                switch(this.type) {
                    case EnemyType.BASIC:
                        this.model.position.y = -0.75;
                        break;
                    case EnemyType.FAST:
                        this.model.position.y = -0.4;
                        break;
                    case EnemyType.TANKY:
                        this.model.position.y = -0.9;
                        break;
                    case EnemyType.RANGED:
                        this.model.position.y = -0.5;
                        break;
                }
                
                console.log(`Enemy ${this.id} reset with model position y=${this.model.position.y}, type=${this.type}`);
                
                // Reset all materials
                this.restoreOriginalMaterials();
                
                // Reset model opacity
                this.model.traverse((node) => {
                    if (node.isMesh && node.material) {
                        node.material.transparent = false;
                        node.material.opacity = 1;
                    }
                });
            }
        } else if (position) {
            // Create a new mesh if needed
            this.createEnemyMesh(position, powerScaling);
        }
    }
    
    validatePosition() {
        if (this.mesh && this.mesh.position) {
            // Check for NaN or infinite values in position
            if (!isFinite(this.mesh.position.x) || !isFinite(this.mesh.position.y) || !isFinite(this.mesh.position.z)) {
                console.warn(`Invalid position detected in ${this.type} enemy. Resetting position.`);
                // Reset to a safe position
                this.mesh.position.set(0, 0, 0);
                return false;
            }
        }
        return true;
    }
    
    update(deltaTime, camera) {
        if (!this.isAlive) return;
        
        // Update the health bar facing if we have a camera
        if (camera) {
            this.updateHealthBarFacingCamera(camera);
        }
        
        // Update animation mixer if it exists
        if (this.mixer) {
            this.mixer.update(deltaTime / 1000); // Convert to seconds for THREE.js
        }
        
        // Check model position - safety measure to prevent floating
        if (this.type === EnemyType.BASIC && this.model && this.model.position.y !== -0.75) {
            this.model.position.y = -0.75;
            console.log(`Fixed floating basic enemy, reset model y to -0.75`, this.id);
        } else if (this.type === EnemyType.FAST && this.model && this.model.position.y !== -0.4) {
            this.model.position.y = -0.4;
            console.log(`Fixed floating fast enemy, reset model y to -0.4`, this.id);
        } else if (this.type === EnemyType.TANKY && this.model && this.model.position.y !== -0.9) {
            this.model.position.y = -0.9;
            console.log(`Fixed floating tanky enemy, reset model y to -0.9`, this.id);
        } else if (this.type === EnemyType.RANGED && this.model && this.model.position.y !== -0.5) {
            this.model.position.y = -0.5;
            console.log(`Fixed floating ranged enemy, reset model y to -0.5`, this.id);
        }
        
        // Validate position to prevent geometry errors
        if (!this.validatePosition()) return;
        
        // Get player position
        const playerPosition = this.player.getPosition();
        
        // Calculate direction to player
        const direction = new THREE.Vector3();
        direction.subVectors(playerPosition, this.mesh.position);
        direction.y = 0; // Keep movement on xz plane
        
        // Calculate distance to player
        const distanceToPlayer = direction.length();
        
        // Cap deltaTime to prevent large jumps
        const cappedDelta = Math.min(deltaTime, 100);
        
        // Move towards player if beyond minimum distance 
        if (distanceToPlayer > this.attackRange) {
            this.moveTowardsPlayer(direction, distanceToPlayer, cappedDelta);
            
            // Play run animation if available and not already playing
            if (this.mixer && this.animationActions['Run'] && 
                (!this.currentAnimation || this.currentAnimation !== this.animationActions['Run'])) {
                this.playAnimation('Run');
            }
        } 
        // Move away from player if too close (less than minimum distance)
        else if (distanceToPlayer < this.minimumDistance) {
            this.moveAwayFromPlayer(direction, distanceToPlayer, cappedDelta);
            
            // Play run animation if available and not already playing
            if (this.mixer && this.animationActions['Run'] && 
                (!this.currentAnimation || this.currentAnimation !== this.animationActions['Run'])) {
                this.playAnimation('Run');
            }
        }
        // Attack player if in attack range and cooldown has passed
        else {
            // Stop run animation when in attack range and not moving
            if (this.mixer && this.currentAnimation === this.animationActions['Run']) {
                this.stopAnimation();
            }
            
            const currentTime = Date.now();
            if (currentTime - this.lastAttackTime > this.attackCooldown) {
                this.attackPlayer();
                this.lastAttackTime = currentTime;
            }
        }
    }
    
    stopAnimation() {
        // Stop current animation if one is playing
        if (this.currentAnimation) {
            this.currentAnimation.fadeOut(0.2);
            this.currentAnimation = null;
        }
    }
    
    moveTowardsPlayer(direction, distance, deltaTime) {
        direction.normalize();
        
        // Apply speed cap based on distance to player (get slower when closer)
        const speedMultiplier = Math.min(
            this.maxSpeedMultiplier,
            Math.max(0.5, distance / 20) // Adjust multiplier based on distance
        );
        
        // Calculate final movement speed
        const finalMoveSpeed = this.moveSpeed * speedMultiplier;
        const finalMoveX = direction.x * finalMoveSpeed * deltaTime;
        const finalMoveZ = direction.z * finalMoveSpeed * deltaTime;
        
        // Log movement data
        // console.log(`Enemy ${this.type} - Delta: ${deltaTime.toFixed(2)}, Speed: ${finalMoveSpeed.toFixed(4)}, Movement: (${finalMoveX.toFixed(4)}, ${finalMoveZ.toFixed(4)})`);
        
        // Move towards player
        this.mesh.position.x += finalMoveX;
        this.mesh.position.z += finalMoveZ;
        
        // Face the direction of movement
        this.faceDirection(direction);
    }
    
    moveAwayFromPlayer(direction, distance, deltaTime) {
        direction.normalize();
        
        // Move away from player
        this.mesh.position.x -= direction.x * this.moveSpeed * deltaTime;
        this.mesh.position.z -= direction.z * this.moveSpeed * deltaTime;
        
        // Face the player even when moving away (enemies always face the player)
        this.faceDirection(direction);
    }
    
    faceDirection(direction) {
        if (direction.length() === 0) return;
        
        // Calculate the angle to face
        const angle = Math.atan2(direction.x, direction.z);
        
        // For models, we need to rotate the container, not just the mesh
        if (this.model) {
            // Set the mesh rotation to the angle
            this.mesh.rotation.y = angle;
        } else {
            // For non-model enemies (original geometries)
            // Rotation behavior depends on the enemy type
            switch(this.type) {
                case EnemyType.BASIC:
                    // Cone doesn't need to be flipped anymore
                    this.mesh.rotation.y = angle;
                    break;
                default:
                    // Simple rotation for other types
                    this.mesh.rotation.y = angle;
                    break;
            }
        }
    }
    
    attackPlayer() {
        if (this.player) {
            // Apply damage to player
            this.player.takeDamage(this.damage);
            
            // Visual feedback for attack - flash orange when attacking
            this.flashColor(0xff9900);
            
            // Add a small "attack motion" effect - move slightly towards player
            if (this.mesh) {
                // Get direction to player
                const playerPosition = this.player.getPosition();
                const attackDirection = new THREE.Vector3();
                attackDirection.subVectors(playerPosition, this.mesh.position);
                attackDirection.y = 0; // Keep on xz plane
                attackDirection.normalize();
                
                // Store original position
                const originalPosition = this.mesh.position.clone();
                
                // Quick forward motion
                this.mesh.position.x += attackDirection.x * 0.2;
                this.mesh.position.z += attackDirection.z * 0.2;
                
                // Return to original position after short delay
                setTimeout(() => {
                    if (this.mesh && this.isAlive) {
                        this.mesh.position.copy(originalPosition);
                    }
                }, 100);
            }
        }
    }
    
    flashColor(color, duration = 200) {
        // Store the original materials for models
        if (!this._originalMaterials && this.model) {
            this._originalMaterials = new Map();
            this.model.traverse((node) => {
                if (node.isMesh && node.material) {
                    this._originalMaterials.set(node, node.material.color.clone());
                }
            });
        }
        
        if (this.model) {
            // Flash the model
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
        } else if (this.mesh && this.mesh.material) {
            // Original implementation for primitive meshes
            const originalColor = this.defaultColor;
            this.mesh.material.color.setHex(color);
            
            setTimeout(() => {
                if (this.mesh && this.mesh.material && this.isAlive) {
                    this.mesh.material.color.setHex(originalColor);
                }
            }, duration);
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        
        // Update health bar
        this.updateHealthBar();
        
        // Visual feedback
        this.flashColor(0xffffff, 100); // Flash white when hit
        
        if (this.health <= 0 && this.isAlive) {
            this.die();
        }
    }
    
    die() {
        // Prevent double-dying which can cause animation conflicts
        if (!this.isAlive || this._isAlreadyDying) return;
        this._isAlreadyDying = true;
        this.isAlive = false;
        
        // Give experience to player
        if (this.player) {
            this.player.gainExperience(this.experienceValue);
        }
        
        // Cancel any existing fade out interval
        if (this._fadeOutInterval) {
            clearInterval(this._fadeOutInterval);
            this._fadeOutInterval = null;
        }
        
        // Death animation depends on whether it's a model or a primitive geometry
        if (this.model) {
            // For model-based enemies, fade out the entire mesh
            const fadeOut = setInterval(() => {
                if (this.mesh) {
                    // Make all materials in the model transparent
                    this.model.traverse((node) => {
                        if (node.isMesh && node.material) {
                            node.material.transparent = true;
                            node.material.opacity -= 0.05;
                        }
                    });
                    
                    // Check opacity of first material to determine if fading is complete
                    let shouldClear = true;
                    this.model.traverse((node) => {
                        if (node.isMesh && node.material && node.material.opacity > 0) {
                            shouldClear = false;
                        }
                    });
                    
                    if (shouldClear) {
                        clearInterval(fadeOut);
                        this._fadeOutInterval = null;
                        this._isAlreadyDying = false; // Reset flag
                        this.removeFromScene();
                    }
                } else {
                    clearInterval(fadeOut);
                    this._fadeOutInterval = null;
                    this._isAlreadyDying = false; // Reset flag
                }
            }, 50);
            
            // Store the interval reference for possible cleanup
            this._fadeOutInterval = fadeOut;
        } else if (this.mesh && this.mesh.material) {
            // For primitive geometry enemies, use the original fade out method
            this.mesh.material.transparent = true;
            const fadeOut = setInterval(() => {
                if (this.mesh && this.mesh.material) {
                    if (this.mesh.material.opacity > 0) {
                        this.mesh.material.opacity -= 0.05;
                    } else {
                        clearInterval(fadeOut);
                        this._fadeOutInterval = null;
                        this._isAlreadyDying = false; // Reset flag
                        this.removeFromScene();
                    }
                } else {
                    clearInterval(fadeOut);
                    this._fadeOutInterval = null;
                    this._isAlreadyDying = false; // Reset flag
                }
            }, 50);
            
            // Store the interval reference for possible cleanup
            this._fadeOutInterval = fadeOut;
        } else {
            // If no valid mesh/material, just remove from scene directly
            this._isAlreadyDying = false; // Reset flag
            this.removeFromScene();
        }
    }
    
    removeFromScene() {
        if (this.mesh) {
            // Instead of removing, add to pool
            enemyPool.release(this);
        }
    }
    
    getPosition() {
        // Enhanced version that returns a default position if mesh doesn't exist
        if (!this.mesh || !this.mesh.position) {
            console.warn("Enemy mesh or position is null in getPosition call");
            // Return a new Vector3 with coordinates (0,0,0) as a fallback
            return new THREE.Vector3(0, 0, 0);
        }
        return this.mesh.position;
    }
    
    // Store original materials from the loaded model
    storeOriginalMaterials() {
        if (!this.model) return;
        
        // Clear previous materials map
        this._originalMaterials.clear();
        
        // Store original materials
        this.model.traverse((node) => {
            if (node.isMesh && node.material) {
                // Create a deep copy of the color
                this._originalMaterials.set(node, node.material.color.clone());
            }
        });
    }
    
    // Restore original materials to the model
    restoreOriginalMaterials() {
        if (!this.model) return;
        
        this.model.traverse((node) => {
            if (node.isMesh && node.material) {
                // Check if we have the original color stored
                if (this._originalMaterials.has(node)) {
                    // Restore the original color
                    node.material.color.copy(this._originalMaterials.get(node));
                    node.material.transparent = false;
                    node.material.opacity = 1.0;
                }
            }
        });
    }
}

// Basic Enemy - The original enemy type (red cone)
export class BasicEnemy extends BaseEnemy {
    constructor(scene, position, player, powerScaling = 1.0) {
        super(scene, position, player, powerScaling);
        
        // Store base stats
        this.baseHealth = 40;
        this.baseDamage = 8;
        this.baseMovespeed = 0.015;
        this.baseExperienceValue = 20;
        this.baseAttackCooldown = 1200;
        
        // Apply power scaling
        this.health = this.baseHealth * powerScaling;
        this.maxHealth = this.baseHealth * powerScaling;
        this.damage = this.baseDamage * powerScaling;
        this.moveSpeed = this.baseMovespeed; // Don't scale movement speed
        this.experienceValue = this.baseExperienceValue;
        this.attackCooldown = this.baseAttackCooldown; // Don't scale cooldown
        this.type = EnemyType.BASIC;
        this.defaultColor = 0xff0000; // Red
        this.minimumDistance = 1.8; // Greater minimum distance for cone enemies
        this.maxSpeedMultiplier = 0.9; // Limit max speed a bit more than base
        
        // Create mesh if not created by base class
        if (!this.mesh && position) {
            this.createEnemyMesh(position, powerScaling);
        }
    }
    
    createEnemyMesh(position, powerScaling) {
        // Create a container group for the enemy
        this.mesh = new THREE.Group();
        
        // Create a temporary placeholder while the model loads
        const placeholder = new THREE.Group();
        const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.defaultColor,
            transparent: true,
            opacity: 0.5 // Make it semi-transparent
        });
        
        const placeholderMesh = new THREE.Mesh(geometry, material);
        placeholderMesh.castShadow = true;
        // Don't flip the cone upside down
        placeholder.add(placeholderMesh);
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.75; // Half height off the ground
        
        // Add placeholder to the mesh container
        this.mesh.add(placeholder);
        // Save reference to the placeholder
        this.placeholder = placeholder;
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Create a health bar
        this.createHealthBar();
        
        // Load the glTF model
        const loader = new GLTFLoader();
        const modelURL = '/models/basicEnemy.gltf';
        
        loader.load(
            modelURL,
            (gltf) => {
                console.log('Basic enemy model loaded successfully');
                
                // Remove placeholder - ensure it's actually removed
                if (this.placeholder && this.mesh.children.includes(this.placeholder)) {
                    this.mesh.remove(this.placeholder);
                    this.placeholder = null;
                    
                    // Properly dispose of placeholder geometry and material
                    if (geometry) geometry.dispose();
                    if (material) material.dispose();
                }
                
                // Add the loaded model to our mesh container
                this.model = gltf.scene;
                
                // Apply scale adjustments - increase size to 2.5x
                this.model.scale.set(2.5, 2.5, 2.5);
                
                // Position the model below current level so feet touch the ground
                this.model.position.y = -0.75;
                console.log(`Basic enemy model position set to y=${this.model.position.y}`, this.id);
                
                // Make sure model casts shadows
                this.model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                
                // Store original materials before adding to scene
                this.storeOriginalMaterials();
                
                // Add model to enemy mesh
                this.mesh.add(this.model);
                
                // Adjust health bar position for model
                if (this.healthBarBg) {
                    // Position health bar higher above the model
                    this.healthBarBg.position.y = 5.0;
                }
                
                // Set up animations if they exist
                if (gltf.animations && gltf.animations.length) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                    
                    // Store all animations
                    gltf.animations.forEach((clip) => {
                        this.animationActions[clip.name] = this.mixer.clipAction(clip);
                    });
                    
                    // Start the run animation since enemies are always moving
                    if (this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }
            },
            (xhr) => {
                console.log(`Loading basic enemy model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.error('Error loading basic enemy model:', error);
                // Keep placeholder visible if model fails to load
            }
        );
    }
}

// Fast Enemy - Fast but weak (blue cube)
export class FastEnemy extends BaseEnemy {
    constructor(scene, position, player, powerScaling = 1.0) {
        super(scene, position, player, powerScaling);
        
        // Store base stats
        this.baseHealth = 15;
        this.baseDamage = 5;
        this.baseMovespeed = 0.022;
        this.baseExperienceValue = 15;
        this.baseAttackCooldown = 500;
        this.baseAttackRange = 3;
        
        // Apply power scaling
        this.health = this.baseHealth * powerScaling;
        this.maxHealth = this.baseHealth * powerScaling;
        this.damage = this.baseDamage * powerScaling;
        this.moveSpeed = this.baseMovespeed; // Don't scale movement speed
        this.experienceValue = this.baseExperienceValue;
        this.attackCooldown = this.baseAttackCooldown; // Don't scale cooldown
        this.attackRange = this.baseAttackRange;
        this.type = EnemyType.FAST;
        this.defaultColor = 0x3498db; // Blue
        this.minimumDistance = 2.0; // Greater minimum distance for fast enemies
        this.maxSpeedMultiplier = 0.85; // More limitation on max speed
        
        // Create mesh if not created by base class
        if (!this.mesh && position) {
            this.createEnemyMesh(position, powerScaling);
        }
    }
    
    createEnemyMesh(position, powerScaling) {
        // Create a container group for the enemy
        this.mesh = new THREE.Group();
        
        // Create a temporary placeholder while the model loads
        const placeholder = new THREE.Group();
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.defaultColor,
            transparent: true,
            opacity: 0.5 // Make it semi-transparent
        });
        
        const placeholderMesh = new THREE.Mesh(geometry, material);
        placeholderMesh.castShadow = true;
        placeholder.add(placeholderMesh);
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.4; // Half height off the ground
        
        // Add placeholder to the mesh container
        this.mesh.add(placeholder);
        // Save reference to the placeholder
        this.placeholder = placeholder;
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Create a health bar
        this.createHealthBar();
        
        // Load the glTF model
        const loader = new GLTFLoader();
        const modelURL = '/models/fastEnemy.gltf';
        
        loader.load(
            modelURL,
            (gltf) => {
                console.log('Fast enemy model loaded successfully');
                
                // Remove placeholder - ensure it's actually removed
                if (this.placeholder && this.mesh.children.includes(this.placeholder)) {
                    this.mesh.remove(this.placeholder);
                    this.placeholder = null;
                    
                    // Properly dispose of placeholder geometry and material
                    if (geometry) geometry.dispose();
                    if (material) material.dispose();
                }
                
                // Add the loaded model to our mesh container
                this.model = gltf.scene;
                
                // Apply scale adjustments - increase size to 2.0x (slightly smaller than basic enemy)
                this.model.scale.set(2.0, 2.0, 2.0);
                
                // Position the model below current level so feet touch the ground
                this.model.position.y = -0.4;
                console.log(`Fast enemy model position set to y=${this.model.position.y}`, this.id);
                
                // Make sure model casts shadows
                this.model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                
                // Store original materials before adding to scene
                this.storeOriginalMaterials();
                
                // Add model to enemy mesh
                this.mesh.add(this.model);
                
                // Adjust health bar position for model
                if (this.healthBarBg) {
                    // Position health bar higher above the model
                    this.healthBarBg.position.y = 4.0;
                }
                
                // Set up animations if they exist
                if (gltf.animations && gltf.animations.length) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                    
                    // Store all animations
                    gltf.animations.forEach((clip) => {
                        this.animationActions[clip.name] = this.mixer.clipAction(clip);
                    });
                    
                    // Start the run animation since enemies are always moving
                    if (this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }
            },
            (xhr) => {
                console.log(`Loading fast enemy model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.error('Error loading fast enemy model:', error);
                // Keep placeholder visible if model fails to load
            }
        );
    }
    
    correctRotation() {
        // No rotation correction needed for cube
    }
}

// Tanky Enemy - Slow but strong (green cylinder)
export class TankyEnemy extends BaseEnemy {
    constructor(scene, position, player, powerScaling = 1.0) {
        super(scene, position, player, powerScaling);
        
        // Store base stats
        this.baseHealth = 80;
        this.baseDamage = 25;
        this.baseMovespeed = 0.008;
        this.baseExperienceValue = 30;
        this.baseAttackCooldown = 1500;
        this.baseAttackRange = 2;
        
        // Apply power scaling
        this.health = this.baseHealth * powerScaling;
        this.maxHealth = this.baseHealth * powerScaling;
        this.damage = this.baseDamage * powerScaling;
        this.moveSpeed = this.baseMovespeed; // Don't scale movement speed
        this.experienceValue = this.baseExperienceValue;
        this.attackCooldown = this.baseAttackCooldown; // Don't scale cooldown
        this.attackRange = this.baseAttackRange;
        this.type = EnemyType.TANKY;
        this.defaultColor = 0x2ecc71; // Green
        
        // Create mesh if not created by base class
        if (!this.mesh && position) {
            this.createEnemyMesh(position, powerScaling);
        }
    }
    
    createEnemyMesh(position, powerScaling) {
        // Create a container group for the enemy
        this.mesh = new THREE.Group();
        
        // Create a temporary placeholder while the model loads
        const placeholder = new THREE.Group();
        const geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.defaultColor,
            transparent: true,
            opacity: 0.5 // Make it semi-transparent
        });
        
        const placeholderMesh = new THREE.Mesh(geometry, material);
        placeholderMesh.castShadow = true;
        placeholder.add(placeholderMesh);
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.9; // Half height off the ground
        
        // Add placeholder to the mesh container
        this.mesh.add(placeholder);
        // Save reference to the placeholder
        this.placeholder = placeholder;
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Create a health bar
        this.createHealthBar();
        
        // Load the glTF model
        const loader = new GLTFLoader();
        const modelURL = '/models/tanky.gltf';
        
        loader.load(
            modelURL,
            (gltf) => {
                console.log('Tanky enemy model loaded successfully');
                
                // Remove placeholder - ensure it's actually removed
                if (this.placeholder && this.mesh.children.includes(this.placeholder)) {
                    this.mesh.remove(this.placeholder);
                    this.placeholder = null;
                    
                    // Properly dispose of placeholder geometry and material
                    if (geometry) geometry.dispose();
                    if (material) material.dispose();
                }
                
                // Add the loaded model to our mesh container
                this.model = gltf.scene;
                
                // Apply scale adjustments - increase size to 2.8x (larger than other enemies)
                this.model.scale.set(2.8, 2.8, 2.8);
                
                // Position the model below current level so feet touch the ground
                this.model.position.y = -0.9;
                console.log(`Tanky enemy model position set to y=${this.model.position.y}`, this.id);
                
                // Make sure model casts shadows
                this.model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                
                // Store original materials before adding to scene
                this.storeOriginalMaterials();
                
                // Add model to enemy mesh
                this.mesh.add(this.model);
                
                // Adjust health bar position for model
                if (this.healthBarBg) {
                    // Position health bar higher above the model
                    this.healthBarBg.position.y = 5.5;
                }
                
                // Set up animations if they exist
                if (gltf.animations && gltf.animations.length) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                    
                    // Store all animations
                    gltf.animations.forEach((clip) => {
                        this.animationActions[clip.name] = this.mixer.clipAction(clip);
                    });
                    
                    // Start the run animation since enemies are always moving
                    if (this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }
            },
            (xhr) => {
                console.log(`Loading tanky enemy model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.error('Error loading tanky enemy model:', error);
                // Keep placeholder visible if model fails to load
            }
        );
    }
    
    correctRotation() {
        // No rotation correction needed for cylinder
    }
}

// Ranged Enemy - Attacks from distance (purple sphere)
export class RangedEnemy extends BaseEnemy {
    constructor(scene, position, player, powerScaling = 1.0) {
        super(scene, position, player, powerScaling);
        
        // Store base stats
        this.baseHealth = 25;
        this.baseDamage = 10;
        this.baseMovespeed = 0.012;
        this.baseExperienceValue = 25;
        this.baseAttackCooldown = 1000;
        this.baseAttackRange = 16;
        this.basePreferredDistance = 12;
        
        // Apply power scaling
        this.health = this.baseHealth * powerScaling;
        this.maxHealth = this.baseHealth * powerScaling;
        this.damage = this.baseDamage * powerScaling;
        this.moveSpeed = this.baseMovespeed; // Don't scale movement speed
        this.experienceValue = this.baseExperienceValue;
        this.attackCooldown = this.baseAttackCooldown; // Don't scale cooldown
        this.attackRange = this.baseAttackRange;
        this.preferredDistance = this.basePreferredDistance;
        this.type = EnemyType.RANGED;
        this.defaultColor = 0x9b59b6; // Purple
        this.projectiles = [];
        
        // Create mesh if not created by base class
        if (!this.mesh && position) {
            this.createEnemyMesh(position, powerScaling);
        }
    }
    
    createEnemyMesh(position, powerScaling) {
        // Create a container group for the enemy
        this.mesh = new THREE.Group();
        
        // Create a temporary placeholder while the model loads
        const placeholder = new THREE.Group();
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.defaultColor,
            transparent: true,
            opacity: 0.5 // Make it semi-transparent
        });
        
        const placeholderMesh = new THREE.Mesh(geometry, material);
        placeholderMesh.castShadow = true;
        placeholder.add(placeholderMesh);
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.5; // Half height off the ground
        
        // Add placeholder to the mesh container
        this.mesh.add(placeholder);
        // Save reference to the placeholder
        this.placeholder = placeholder;
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Create a health bar
        this.createHealthBar();
        
        // Load the glTF model
        const loader = new GLTFLoader();
        const modelURL = '/models/range.gltf';
        
        loader.load(
            modelURL,
            (gltf) => {
                console.log('Ranged enemy model loaded successfully');
                
                // Remove placeholder - ensure it's actually removed
                if (this.placeholder && this.mesh.children.includes(this.placeholder)) {
                    this.mesh.remove(this.placeholder);
                    this.placeholder = null;
                    
                    // Properly dispose of placeholder geometry and material
                    if (geometry) geometry.dispose();
                    if (material) material.dispose();
                }
                
                // Add the loaded model to our mesh container
                this.model = gltf.scene;
                
                // Apply scale adjustments - increase size to 2.2x
                this.model.scale.set(2.2, 2.2, 2.2);
                
                // Position the model below current level so feet touch the ground
                this.model.position.y = -0.5;
                console.log(`Ranged enemy model position set to y=${this.model.position.y}`, this.id);
                
                // Make sure model casts shadows
                this.model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                
                // Store original materials before adding to scene
                this.storeOriginalMaterials();
                
                // Add model to enemy mesh
                this.mesh.add(this.model);
                
                // Adjust health bar position for model
                if (this.healthBarBg) {
                    // Position health bar higher above the model
                    this.healthBarBg.position.y = 4.5;
                }
                
                // Set up animations if they exist
                if (gltf.animations && gltf.animations.length) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                    
                    // Store all animations
                    gltf.animations.forEach((clip) => {
                        this.animationActions[clip.name] = this.mixer.clipAction(clip);
                    });
                    
                    // Start the run animation since enemies are always moving
                    if (this.animationActions['Run']) {
                        this.playAnimation('Run');
                    }
                }
            },
            (xhr) => {
                console.log(`Loading ranged enemy model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.error('Error loading ranged enemy model:', error);
                // Keep placeholder visible if model fails to load
            }
        );
    }
    
    correctRotation() {
        // No rotation correction needed for sphere
    }
    
    update(deltaTime, camera) {
        if (!this.isAlive) return;
        
        // Update the health bar facing if we have a camera
        if (camera) {
            this.updateHealthBarFacingCamera(camera);
        }
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update animation mixer if it exists
        if (this.mixer) {
            this.mixer.update(deltaTime / 1000); // Convert to seconds for THREE.js
        }
        
        // Check model position - safety measure to prevent floating
        if (this.type === EnemyType.BASIC && this.model && this.model.position.y !== -0.75) {
            this.model.position.y = -0.75;
            console.log(`Fixed floating basic enemy, reset model y to -0.75`, this.id);
        } else if (this.type === EnemyType.FAST && this.model && this.model.position.y !== -0.4) {
            this.model.position.y = -0.4;
            console.log(`Fixed floating fast enemy, reset model y to -0.4`, this.id);
        } else if (this.type === EnemyType.TANKY && this.model && this.model.position.y !== -0.9) {
            this.model.position.y = -0.9;
            console.log(`Fixed floating tanky enemy, reset model y to -0.9`, this.id);
        } else if (this.type === EnemyType.RANGED && this.model && this.model.position.y !== -0.5) {
            this.model.position.y = -0.5;
            console.log(`Fixed floating ranged enemy, reset model y to -0.5`, this.id);
        }
        
        // Validate position to prevent geometry errors
        if (!this.validatePosition()) return;
        
        // Get player position
        const playerPosition = this.player.getPosition();
        
        // Calculate direction to player
        const direction = new THREE.Vector3();
        direction.subVectors(playerPosition, this.mesh.position);
        direction.y = 0; // Keep movement on xz plane
        
        // Calculate distance to player
        const distanceToPlayer = direction.length();
        
        // If too close, move away
        if (distanceToPlayer < this.preferredDistance) {
            direction.normalize();
            this.mesh.position.x -= direction.x * this.moveSpeed * deltaTime;
            this.mesh.position.z -= direction.z * this.moveSpeed * deltaTime;
            this.faceDirection(direction);
            
            // Play run animation if available and not already playing
            if (this.mixer && this.animationActions['Run'] && 
                (!this.currentAnimation || this.currentAnimation !== this.animationActions['Run'])) {
                this.playAnimation('Run');
            }
        }
        // If too far, move closer
        else if (distanceToPlayer > this.attackRange) {
            direction.normalize();
            this.mesh.position.x += direction.x * this.moveSpeed * deltaTime;
            this.mesh.position.z += direction.z * this.moveSpeed * deltaTime;
            this.faceDirection(direction);
            
            // Play run animation if available and not already playing
            if (this.mixer && this.animationActions['Run'] && 
                (!this.currentAnimation || this.currentAnimation !== this.animationActions['Run'])) {
                this.playAnimation('Run');
            }
        }
        // If in good range, attack
        else {
            this.faceDirection(direction);
            
            // Stop run animation when in attack range and not moving
            if (this.mixer && this.currentAnimation === this.animationActions['Run']) {
                this.stopAnimation();
            }
            
            // Attack player if cooldown has passed
            const currentTime = Date.now();
            if (currentTime - this.lastAttackTime > this.attackCooldown) {
                this.attackPlayer();
                this.lastAttackTime = currentTime;
            }
        }
    }
    
    attackPlayer() {
        if (this.player) {
            // Visual feedback for attack - flash orange when attacking
            this.flashColor(0xff9900);
            
            // Get direction to player
            const playerPosition = this.player.getPosition();
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, this.mesh.position);
            direction.y = 0; // Keep on xz plane
            direction.normalize();
            
            // Add a small "attack motion" effect for ranged enemies - slight backward recoil
            if (this.mesh) {
                // Store original position
                const originalPosition = this.mesh.position.clone();
                
                // Quick backward motion (recoil)
                this.mesh.position.x -= direction.x * 0.15;
                this.mesh.position.z -= direction.z * 0.15;
                
                // Return to original position after short delay
                setTimeout(() => {
                    if (this.mesh && this.isAlive) {
                        this.mesh.position.copy(originalPosition);
                    }
                }, 100);
            }
            
            // Create projectile
            this.fireProjectile(direction);
        }
    }
    
    fireProjectile(direction) {
        const position = new THREE.Vector3().copy(this.mesh.position);
        position.y = 0.5; // Adjust to shoot from center
        
        // Create projectile
        const projectile = new Projectile(
            this.scene,
            position,
            direction,
            0.25,          // Increased from 0.18 to 0.25
            0.35,          // Larger size
            this.damage,
            0xff3333,      // Bright red color for enemy projectiles
            false,         // Not from player
            this.player,   // Target (for collision)
            3000           // Increased lifetime for larger arena
        );
        
        this.projectiles.push(projectile);
    }
    
    updateProjectiles(deltaTime) {
        // Check if player exists and is valid
        if (!this.player) {
            return;
        }
        
        // Check existing projectiles for collisions with player only
        // The movement and visual effects are now handled by ProjectileManager
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Skip checking already inactive projectiles
            if (!projectile.isActive) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check for collisions with player
            if (this.player) {
                const hit = projectile.checkPlayerCollision(this.player);
                
                // Provide visual feedback on hit
                if (hit && this.player.health > 0) {
                    // Flash player red when hit
                    if (this.player.body && this.player.body.material) {
                        const originalColor = this.player.body.material.color.clone();
                        this.player.body.material.color.set(0xff0000);
                        
                        setTimeout(() => {
                            if (this.player.body && this.player.body.material) {
                                this.player.body.material.color.copy(originalColor);
                            }
                        }, 200);
                    }
                }
            }
            
            // Remove inactive projectiles
            if (!projectile.isActive) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    die() {
        super.die();
        
        // Clean up projectiles
        for (const projectile of this.projectiles) {
            projectile.deactivate();
        }
        this.projectiles = [];
    }
}

// For backwards compatibility - default to BasicEnemy
export class Enemy extends BasicEnemy {
    constructor(scene, position, player) {
        super(scene, position, player);
    }
} 