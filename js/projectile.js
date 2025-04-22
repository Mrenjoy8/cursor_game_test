import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { ProjectileManager } from './projectileManager.js';

// Static manager instance to be shared across all projectiles
let globalProjectileManager = null;

export class Projectile {
    constructor(
        scene, 
        position, 
        direction, 
        speed = 0.3, 
        size = 0.2, 
        damage = 10, 
        color = 0x00aaff, 
        isFromPlayer = true, 
        target = null, 
        lifetime = 1500
    ) {
        // Initialize the projectile manager if it doesn't exist
        if (!globalProjectileManager) {
            globalProjectileManager = new ProjectileManager(scene);
        }
        
        // Store the scene reference
        this.scene = scene;
        
        // Determine projectile type based on color and source
        let type = "standard";
        if (color === 0x00ccff || color === 0x9900ff) {
            type = "magic";
        } else if (color === 0xccffcc) {
            type = "knife";
        } else if (color === 0xff3333 && !isFromPlayer) {
            type = "enemy";
        }
        
        // Get a projectile instance from the manager
        this.projectileInstance = globalProjectileManager.getProjectile(
            type,
            position,
            direction,
            speed,
            size,
            damage,
            color,
            isFromPlayer,
            target,
            lifetime
        );
        
        // Cache properties for direct access to maintain API compatibility
        this.direction = this.projectileInstance.direction;
        this.speed = this.projectileInstance.speed;
        this.damage = this.projectileInstance.damage;
        this.isActive = this.projectileInstance.isActive;
        this.lifetime = this.projectileInstance.lifetime;
        this.creationTime = this.projectileInstance.creationTime;
        this.isFromPlayer = this.projectileInstance.isFromPlayer;
        this.target = this.projectileInstance.target;
        this.size = this.projectileInstance.size;
        this.color = this.projectileInstance.color;
        
        // Create a position property that references the instance's position
        Object.defineProperty(this, 'position', {
            get: () => this.projectileInstance.position
        });
        
        // Create a mesh property that emulates the old API
        Object.defineProperty(this, 'mesh', {
            get: () => ({
                position: this.projectileInstance.position
            })
        });
    }
    
    // Update method delegates to the projectile manager
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Update cached properties to ensure they match
        this.isActive = this.projectileInstance.isActive;
        
        // The actual movement and boundary checking is handled by the ProjectileManager
        // in its update cycle. We don't need to duplicate that logic here.
    }
    
    // Check collision with an enemy (for player projectiles)
    checkCollision(enemy) {
        if (!this.isActive || !enemy || !enemy.isAlive) return false;
        if (!this.isFromPlayer) return false;
        
        return globalProjectileManager.checkCollision(this.projectileInstance, enemy);
    }
    
    // Check collision with player (for enemy projectiles)
    checkPlayerCollision(player) {
        if (!this.isActive || this.isFromPlayer || !player) return false;
        
        return globalProjectileManager.checkPlayerCollision(this.projectileInstance, player);
    }
    
    deactivate() {
        if (!this.isActive) return;
        
        // Make sure to explicitly clear the trail for this projectile
        if (globalProjectileManager) {
            globalProjectileManager.clearProjectileTrail(this.projectileInstance);
        }
        
        this.isActive = false;
        this.projectileInstance.deactivate();
    }
    
    // Static method to update all projectiles
    static updateAll(deltaTime) {
        if (globalProjectileManager) {
            globalProjectileManager.update(deltaTime);
        }
    }
    
    // Static method to clean up all projectile resources
    static disposeAll() {
        if (globalProjectileManager) {
            globalProjectileManager.dispose();
            globalProjectileManager = null;
        }
    }
}

// Helper function to check if vector components are valid numbers
function isValidVector(vector) {
    return vector && typeof vector.x === 'number' && typeof vector.y === 'number' 
        && typeof vector.z === 'number' && isFinite(vector.x) && isFinite(vector.y) 
        && isFinite(vector.z);
} 