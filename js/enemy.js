import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
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
            // Reset minimal enemy state - leave ID and position intact
            enemy.isAlive = false;
            
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
            
            if (enemy.mesh) {
                enemy.mesh.visible = false;
                
                // Ensure material color is reset to default before pooling
                if (enemy.mesh.material) {
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
            
            // Add to pool - preserve the enemy's identity and position
            this.pools[enemy.type].push(enemy);
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
        
        // Add power ring if enemy is powered up
        if (powerScaling > 1.0) {
            material.emissive = new THREE.Color(this.defaultColor);
            material.emissiveIntensity = Math.min((powerScaling - 1) * 0.5, 0.7); // Intensity based on scaling
            
            // Add outline glow ring to indicate power
            const ringGeometry = new THREE.TorusGeometry(0.7, 0.05, 8, 24);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.7
            });
            this.powerRing = new THREE.Mesh(ringGeometry, ringMaterial);
            this.powerRing.rotation.x = Math.PI / 2; // Align with ground
        }
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    reset(position, powerScaling = 1.0) {
        // Clean up any existing power ring
        if (this.powerRing) {
            if (this.mesh) {
                this.mesh.remove(this.powerRing);
            }
            this.scene.remove(this.powerRing);
            if (this.powerRing.geometry) this.powerRing.geometry.dispose();
            if (this.powerRing.material) this.powerRing.material.dispose();
            this.powerRing = null;
        }
        
        // Reset enemy state when pulled from pool
        this.isAlive = true;
        
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
                
                // Add emissive glow for powered up enemies
                if (powerScaling > 1.0) {
                    this.mesh.material.emissive = new THREE.Color(this.defaultColor);
                    this.mesh.material.emissiveIntensity = Math.min((powerScaling - 1) * 0.5, 0.7);
                    
                    // Create new power ring
                    let ringRadius = 0.7; // Default size
                    
                    // Adjust ring size based on enemy type
                    switch(this.type) {
                        case EnemyType.FAST:
                            ringRadius = 0.6;
                            break;
                        case EnemyType.TANKY:
                            ringRadius = 0.9;
                            break;
                        case EnemyType.RANGED:
                            ringRadius = 0.7;
                            break;
                        default: // BASIC
                            ringRadius = 0.7;
                    }
                    
                    // Create ring
                    const ringGeometry = new THREE.TorusGeometry(ringRadius, 0.05, 8, 24);
                    const ringMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffff00,
                        transparent: true,
                        opacity: 0.7
                    });
                    this.powerRing = new THREE.Mesh(ringGeometry, ringMaterial);
                    this.powerRing.rotation.x = Math.PI / 2; // Align with ground
                    
                    // Add to mesh with proper position
                    let ringYOffset = -0.65; // Default for BASIC
                    
                    // Adjust Y offset based on enemy type
                    switch(this.type) {
                        case EnemyType.FAST:
                            ringYOffset = -0.3;
                            break;
                        case EnemyType.TANKY:
                            ringYOffset = -0.8;
                            break;
                        case EnemyType.RANGED:
                            ringYOffset = -0.4;
                            break;
                        default: // BASIC
                            ringYOffset = -0.65;
                    }
                    
                    this.mesh.add(this.powerRing);
                    this.powerRing.position.set(0, ringYOffset, 0);
                }
            }
            
            // Only update position if specifically provided
            if (position) {
                this.mesh.position.copy(position);
                
                // Ensure the Y position is correct for this enemy type
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
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
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
        } 
        // Move away from player if too close (less than minimum distance)
        else if (distanceToPlayer < this.minimumDistance) {
            this.moveAwayFromPlayer(direction, distanceToPlayer, cappedDelta);
        }
        // Attack player if in attack range and cooldown has passed
        else {
            const currentTime = Date.now();
            if (currentTime - this.lastAttackTime > this.attackCooldown) {
                this.attackPlayer();
                this.lastAttackTime = currentTime;
            }
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
        
        // Move away faster the closer we are
        const urgencyMultiplier = Math.max(0.5, 2 - (distance / this.minimumDistance));
        
        // Calculate final movement speed (away from player)
        const finalMoveX = -direction.x * this.moveSpeed * urgencyMultiplier * deltaTime;
        const finalMoveZ = -direction.z * this.moveSpeed * urgencyMultiplier * deltaTime;
        
        // Log movement data
        // console.log(`Enemy ${this.type} backing off - Delta: ${deltaTime.toFixed(2)}, Distance: ${distance.toFixed(2)}, Movement: (${finalMoveX.toFixed(4)}, ${finalMoveZ.toFixed(4)})`);
        
        // Move away from player
        this.mesh.position.x += finalMoveX;
        this.mesh.position.z += finalMoveZ;
        
        // Still face the player while backing up
        this.faceDirection(direction);
    }
    
    faceDirection(direction) {
        // Default implementation for facing direction
        this.mesh.lookAt(new THREE.Vector3(
            this.mesh.position.x + direction.x,
            this.mesh.position.y,
            this.mesh.position.z + direction.z
        ));
        
        // Apply any rotation corrections based on mesh type
        this.correctRotation();
    }
    
    correctRotation() {
        // Override in subclasses if needed
        // Default is for cone shape
        this.mesh.rotation.x = Math.PI;
    }
    
    attackPlayer() {
        if (this.player) {
            this.player.takeDamage(this.damage);
            
            // Visual feedback for attack
            this.flashColor(0xff9900); // Flash orange when attacking
        }
    }
    
    flashColor(color, duration = 200) {
        if (this.mesh && this.mesh.material) {
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
        
        // Visual feedback
        this.flashColor(0xffffff, 100); // Flash white when hit
        
        if (this.health <= 0 && this.isAlive) {
            this.die();
        }
    }
    
    die() {
        this.isAlive = false;
        
        // Give experience to player
        if (this.player) {
            this.player.gainExperience(this.experienceValue);
        }
        
        // Death animation
        this.mesh.material.transparent = true;
        const fadeOut = setInterval(() => {
            if (this.mesh && this.mesh.material) {
                if (this.mesh.material.opacity > 0) {
                    this.mesh.material.opacity -= 0.05;
                } else {
                    clearInterval(fadeOut);
                    this.removeFromScene();
                }
            } else {
                clearInterval(fadeOut);
            }
        }, 50);
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
        // Basic enemy is a red cone
        const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
        
        // Add enhanced glow effect for powered up enemies
        if (powerScaling > 1.0) {
            material.emissive = new THREE.Color(this.defaultColor);
            material.emissiveIntensity = Math.min((powerScaling - 1) * 0.5, 0.7); // Intensity based on scaling
            
            // Add outline glow ring to indicate power
            const ringGeometry = new THREE.TorusGeometry(0.7, 0.05, 8, 24);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.7
            });
            this.powerRing = new THREE.Mesh(ringGeometry, ringMaterial);
            this.powerRing.rotation.x = Math.PI / 2; // Align with ground
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.75; // Half height off the ground
        
        // Rotation - cone pointing up
        this.mesh.rotation.x = Math.PI;
        
        // Add power ring if enemy is powered up
        if (this.powerRing) {
            // Only add to mesh, not to scene directly
            this.mesh.add(this.powerRing);
            // Position relative to mesh
            this.powerRing.position.set(0, -0.65, 0);
        }
        
        // Add to scene
        this.scene.add(this.mesh);
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
        // Fast enemy is a blue cube
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
        
        // Add enhanced glow effect for powered up enemies
        if (powerScaling > 1.0) {
            material.emissive = new THREE.Color(this.defaultColor);
            material.emissiveIntensity = Math.min((powerScaling - 1) * 0.5, 0.7); // Intensity based on scaling
            
            // Add outline glow ring to indicate power
            const ringGeometry = new THREE.TorusGeometry(0.6, 0.05, 8, 24);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.7
            });
            this.powerRing = new THREE.Mesh(ringGeometry, ringMaterial);
            this.powerRing.rotation.x = Math.PI / 2; // Align with ground
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.4; // Half height off the ground
        
        // Add power ring if enemy is powered up
        if (this.powerRing) {
            // Only add to mesh, not to scene directly
            this.mesh.add(this.powerRing);
            // Position relative to mesh
            this.powerRing.position.set(0, -0.3, 0);
        }
        
        // Add to scene
        this.scene.add(this.mesh);
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
        // Tanky enemy is a green cylinder
        const geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 16);
        const material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
        
        // Add enhanced glow effect for powered up enemies
        if (powerScaling > 1.0) {
            material.emissive = new THREE.Color(this.defaultColor);
            material.emissiveIntensity = Math.min((powerScaling - 1) * 0.5, 0.7); // Intensity based on scaling
            
            // Add outline glow ring to indicate power
            const ringGeometry = new THREE.TorusGeometry(0.9, 0.05, 8, 24);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.7
            });
            this.powerRing = new THREE.Mesh(ringGeometry, ringMaterial);
            this.powerRing.rotation.x = Math.PI / 2; // Align with ground
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.9; // Half height off the ground
        
        // Add power ring if enemy is powered up
        if (this.powerRing) {
            // Only add to mesh, not to scene directly
            this.mesh.add(this.powerRing);
            // Position relative to mesh
            this.powerRing.position.set(0, -0.8, 0);
        }
        
        // Add to scene
        this.scene.add(this.mesh);
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
        // Ranged enemy is a purple sphere
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
        
        // Add enhanced glow effect for powered up enemies
        if (powerScaling > 1.0) {
            material.emissive = new THREE.Color(this.defaultColor);
            material.emissiveIntensity = Math.min((powerScaling - 1) * 0.5, 0.7); // Intensity based on scaling
            
            // Add outline glow ring to indicate power
            const ringGeometry = new THREE.TorusGeometry(0.7, 0.05, 8, 24);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.7
            });
            this.powerRing = new THREE.Mesh(ringGeometry, ringMaterial);
            this.powerRing.rotation.x = Math.PI / 2; // Align with ground
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.5; // Half height off the ground
        
        // Add power ring if enemy is powered up
        if (this.powerRing) {
            // Only add to mesh, not to scene directly
            this.mesh.add(this.powerRing);
            // Position relative to mesh
            this.powerRing.position.set(0, -0.4, 0);
        }
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    correctRotation() {
        // No rotation correction needed for sphere
    }
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
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
        }
        // If too far, move closer
        else if (distanceToPlayer > this.attackRange) {
            direction.normalize();
            this.mesh.position.x += direction.x * this.moveSpeed * deltaTime;
            this.mesh.position.z += direction.z * this.moveSpeed * deltaTime;
            this.faceDirection(direction);
        }
        // If in good range, attack
        else {
            this.faceDirection(direction);
            
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
            // Visual feedback for attack
            this.flashColor(0xff9900); // Flash orange when attacking
            
            // Get direction to player
            const playerPosition = this.player.getPosition();
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, this.mesh.position);
            direction.y = 0; // Keep on xz plane
            direction.normalize();
            
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
        // Update existing projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Update projectile
            projectile.update(deltaTime);
            
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