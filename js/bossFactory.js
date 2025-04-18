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

// Boss factory class for generating different types of bosses
export class BossFactory {
    // Create a boss based on type, or random if not specified
    static createBoss(scene, position, player, bossLevel = 1, bossType = null) {
        // If no type specified, pick random boss type
        if (!bossType) {
            const types = Object.values(BossType);
            bossType = types[Math.floor(Math.random() * types.length)];
        }
        
        console.log(`Creating boss of type: ${bossType}, level: ${bossLevel}`);
        
        // Create the appropriate boss based on type
        switch (bossType) {
            case BossType.TITAN:
                return new TitanBoss(scene, position, player, bossLevel);
            case BossType.SORCERER:
                return new SorcererBoss(scene, position, player, bossLevel);
            case BossType.HUNTER:
                return new HunterBoss(scene, position, player, bossLevel);
            default:
                console.error("Unknown boss type:", bossType);
                // Fallback to Titan boss
                return new TitanBoss(scene, position, player, bossLevel);
        }
    }
} 