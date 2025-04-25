import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { TitanBoss } from './bosses/titanBoss.js';
import { SorcererBoss } from './bosses/sorcererBoss.js';
import { HunterBoss } from './bosses/hunterBoss.js';

// Boss types enum
export const BossType = {
    TITAN: 'titan',      // Melee-focused, high HP, slow
    SORCERER: 'sorcerer', // Magic/ranged focused, AoE attacks
    HUNTER: 'hunter'     // Fast, agile, mix of melee and ranged
};

// Boss pool to allow reusing boss objects
class BossPool {
    constructor() {
        // Initialize empty pools for each boss type
        this.pools = {
            [BossType.TITAN]: [],
            [BossType.SORCERER]: [],
            [BossType.HUNTER]: []
        };
    }
    
    /**
     * Get a boss from the pool or create a new one
     * @param {string} type - The boss type to get
     * @param {THREE.Scene} scene - The scene to add the boss to
     * @param {THREE.Vector3} position - Where to position the boss
     * @param {object} player - The player object
     * @param {number} bossLevel - The level for the boss
     * @returns {object} The boss object
     */
    get(type, scene, position, player, bossLevel = 1) {
        // Check if a boss of this type is available in the pool
        if (this.pools[type] && this.pools[type].length > 0) {
            const boss = this.pools[type].pop();
            
            // Reset and reposition the boss
            boss.reset(position, bossLevel);
            
//            console.log(`Reusing ${type} boss from pool (level ${bossLevel})`);
            return boss;
        }
        
        // Create a new boss if none is available in the pool
//        console.log(`Creating new ${type} boss (level ${bossLevel})`);
        
        switch (type) {
            case BossType.TITAN:
                return new TitanBoss(scene, position, player, bossLevel);
            case BossType.SORCERER:
                return new SorcererBoss(scene, position, player, bossLevel);
            case BossType.HUNTER:
                return new HunterBoss(scene, position, player, bossLevel);
            default:
                console.error("Unknown boss type:", type);
                // Fallback to Titan boss
                return new TitanBoss(scene, position, player, bossLevel);
        }
    }
    
    /**
     * Return a boss to the pool for reuse
     * @param {object} boss - The boss to return to the pool
     */
    release(boss) {
        if (boss && boss.type && this.pools[boss.type]) {
            // Ensure boss is not visible
            if (boss.mesh) {
                boss.mesh.visible = false;
                
                // Place it far below the arena to avoid visibility
                boss.mesh.position.y = -1000;
            }
            
            // Hide health bar
            if (boss.healthBarBg) {
                boss.healthBarBg.visible = false;
            }
            
            // Reset boss state
            boss.isAlive = false;
            
            // Stop any active animations
            if (boss.mixer) {
                Object.values(boss.animationActions).forEach(action => {
                    if (action && action.isRunning()) {
                        action.stop();
                    }
                });
                boss.currentAnimation = null;
            }
            
            // Clean up any ongoing effects
            if (boss.cleanupActiveEffects && typeof boss.cleanupActiveEffects === 'function') {
                boss.cleanupActiveEffects();
            }
            
            // Add to the appropriate pool
            this.pools[boss.type].push(boss);
//            console.log(`${boss.type} boss returned to pool`);
        }
    }
}

// Singleton instance
export const bossPool = new BossPool();

// Boss factory class for generating different types of bosses
export class BossFactory {
    // Create a boss based on type, or random if not specified
    static createBoss(scene, position, player, bossLevel = 1, bossType = null) {
        // If no type specified, pick random boss type
        if (!bossType) {
            const types = Object.values(BossType);
            bossType = types[Math.floor(Math.random() * types.length)];
        }
        
        // Get boss from pool or create new
        return bossPool.get(bossType, scene, position, player, bossLevel);
    }
} 