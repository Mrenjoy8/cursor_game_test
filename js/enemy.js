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
    
    get(type, scene, position, player) {
        // Check if we have an available enemy in the pool
        if (this.pools[type] && this.pools[type].length > 0) {
            const enemy = this.pools[type].pop();
            enemy.reset(position);
            return enemy;
        }
        
        // Create a new enemy if none available
        switch (type) {
            case EnemyType.FAST:
                return new FastEnemy(scene, position, player);
            case EnemyType.TANKY:
                return new TankyEnemy(scene, position, player);
            case EnemyType.RANGED:
                return new RangedEnemy(scene, position, player);
            default:
                return new BasicEnemy(scene, position, player);
        }
    }
    
    release(enemy) {
        if (enemy && enemy.type && this.pools[enemy.type]) {
            // Reset minimal enemy state - leave ID and position intact
            enemy.isAlive = false;
            
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
    constructor(scene, position, player) {
        this.scene = scene;
        this.player = player;
        
        // Generate a unique ID for this enemy instance
        this.id = Math.random().toString(36).substr(2, 9);
        
        // Default enemy values
        this.isAlive = true;
        this.health = 30;
        this.maxHealth = 30;
        this.damage = 10;
        this.moveSpeed = 0.015;
        this.attackRange = 2;
        this.attackCooldown = 1000; // ms
        this.lastAttackTime = 0;
        this.experienceValue = 20;
        this.defaultColor = 0xff0000; // Red
        this.minimumDistance = 1.5; // Minimum distance to maintain from player
        this.maxSpeedMultiplier = 1.0; // Cap on speed multiplier to prevent excessive speed
        
        // Create mesh if position is provided
        if (position) {
            this.createEnemyMesh(position);
        }
    }
    
    createEnemyMesh(position) {
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
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    reset(position) {
        // Reset enemy state when pulled from pool
        this.isAlive = true;
        this.health = this.maxHealth || 30;
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
            this.createEnemyMesh(position);
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
        console.log(`Enemy ${this.type} - Delta: ${deltaTime.toFixed(2)}, Speed: ${finalMoveSpeed.toFixed(4)}, Movement: (${finalMoveX.toFixed(4)}, ${finalMoveZ.toFixed(4)})`);
        
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
        console.log(`Enemy ${this.type} backing off - Delta: ${deltaTime.toFixed(2)}, Distance: ${distance.toFixed(2)}, Movement: (${finalMoveX.toFixed(4)}, ${finalMoveZ.toFixed(4)})`);
        
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
    constructor(scene, position, player) {
        super(scene, position, player);
        
        // Basic enemy stats
        this.health = 30;
        this.maxHealth = 30;
        this.damage = 10;
        this.moveSpeed = 0.015;
        this.experienceValue = 20;
        this.type = EnemyType.BASIC;
        this.defaultColor = 0xff0000; // Red
        this.minimumDistance = 1.8; // Greater minimum distance for cone enemies
        this.maxSpeedMultiplier = 0.9; // Limit max speed a bit more than base
        
        // Create mesh if not created by base class
        if (!this.mesh && position) {
            this.createEnemyMesh(position);
        }
    }
    
    createEnemyMesh(position) {
        // Basic enemy is a red cone
        const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.75; // Half height off the ground
        
        // Rotation - cone pointing up
        this.mesh.rotation.x = Math.PI;
        
        // Add to scene
        this.scene.add(this.mesh);
    }
}

// Fast Enemy - Fast but weak (blue cube)
export class FastEnemy extends BaseEnemy {
    constructor(scene, position, player) {
        super(scene, position, player);
        
        // Fast enemy stats - high speed, low health and damage
        this.health = 15;
        this.maxHealth = 15;
        this.damage = 5;
        this.moveSpeed = 0.022; // Reduced from 0.03 to be more manageable
        this.experienceValue = 15;
        this.attackCooldown = 800; // Attacks more frequently
        this.type = EnemyType.FAST;
        this.defaultColor = 0x3498db; // Blue
        this.minimumDistance = 2.0; // Greater minimum distance for fast enemies
        this.maxSpeedMultiplier = 0.85; // More limitation on max speed
        
        // Create mesh if not created by base class
        if (!this.mesh && position) {
            this.createEnemyMesh(position);
        }
    }
    
    createEnemyMesh(position) {
        // Fast enemy is a blue cube
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.4; // Half height off the ground
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    correctRotation() {
        // No rotation correction needed for cube
    }
}

// Tanky Enemy - Slow but strong (green cylinder)
export class TankyEnemy extends BaseEnemy {
    constructor(scene, position, player) {
        super(scene, position, player);
        
        // Tanky enemy stats - high health and damage, low speed
        this.health = 75;
        this.maxHealth = 75;
        this.damage = 20;
        this.moveSpeed = 0.008; // Half as fast
        this.experienceValue = 30;
        this.attackCooldown = 1500; // Slower attacks
        this.attackRange = 2; // Slightly longer attack range
        this.type = EnemyType.TANKY;
        this.defaultColor = 0x2ecc71; // Green
        
        // Create mesh if not created by base class
        if (!this.mesh && position) {
            this.createEnemyMesh(position);
        }
    }
    
    createEnemyMesh(position) {
        // Tanky enemy is a green cylinder
        const geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 16);
        const material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.9; // Half height off the ground
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    correctRotation() {
        // No rotation correction needed for cylinder
    }
}

// Ranged Enemy - Attacks from distance (purple sphere)
export class RangedEnemy extends BaseEnemy {
    constructor(scene, position, player) {
        super(scene, position, player);
        
        // Ranged enemy stats
        this.health = 25;
        this.maxHealth = 25;
        this.damage = 8;
        this.moveSpeed = 0.012;
        this.experienceValue = 25;
        this.attackCooldown = 2000; // Slower attacks
        this.attackRange = 16; // Doubled attack range for larger arena
        this.preferredDistance = 12; // Doubled preferred distance for larger arena
        this.type = EnemyType.RANGED;
        this.defaultColor = 0x9b59b6; // Purple
        this.projectiles = [];
        
        // Create mesh if not created by base class
        if (!this.mesh && position) {
            this.createEnemyMesh(position);
        }
    }
    
    createEnemyMesh(position) {
        // Ranged enemy is a purple sphere
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: this.defaultColor });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.5; // Half height off the ground
        
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
            0.18,          // Slower projectile speed
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