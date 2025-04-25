import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { BossType, BossFactory, bossPool } from './bossFactory.js';

/**
 * BossPreloader - Preloads all boss models during game initialization
 * to prevent frame drops when boss waves start
 */
export class BossPreloader {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // Position far below the arena where bosses won't be visible
        this.dummyPosition = new THREE.Vector3(0, -200, 0);
        
        // Define which boss types to preload 
        this.bossTypes = [
            BossType.TITAN,
            BossType.SORCERER,
            BossType.HUNTER
        ];
        
        // Tracking preloading progress
        this.preloadedCount = 0;
        this.totalBosses = this.bossTypes.length;
        
        // Create loading indicator
        this.createLoadingIndicator();
    }
    
    /**
     * Creates a loading indicator to show preloading progress
     */
    createLoadingIndicator() {
        this.loadingContainer = document.createElement('div');
        this.loadingContainer.style.position = 'absolute';
        this.loadingContainer.style.top = '50%';
        this.loadingContainer.style.left = '50%';
        this.loadingContainer.style.transform = 'translate(-50%, -50%)';
        this.loadingContainer.style.backgroundColor = 'var(--panel-bg)';
        this.loadingContainer.style.backdropFilter = 'blur(4px)';
        this.loadingContainer.style.borderRadius = '16px';
        this.loadingContainer.style.boxShadow = 'var(--shadow)';
        this.loadingContainer.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        this.loadingContainer.style.padding = '20px 30px';
        this.loadingContainer.style.zIndex = '1100';
        this.loadingContainer.style.display = 'flex';
        this.loadingContainer.style.flexDirection = 'column';
        this.loadingContainer.style.alignItems = 'center';
        
        // Loading text
        this.loadingText = document.createElement('div');
        this.loadingText.textContent = 'PREPARING BOSS ENCOUNTERS...';
        this.loadingText.style.color = 'var(--pink)';
        this.loadingText.style.fontFamily = '"Exo 2", sans-serif';
        this.loadingText.style.fontSize = '24px';
        this.loadingText.style.fontWeight = 'bold';
        this.loadingText.style.marginBottom = '15px';
        this.loadingContainer.appendChild(this.loadingText);
        
        // Progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.style.width = '300px';
        progressContainer.style.height = '20px';
        progressContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        progressContainer.style.borderRadius = '10px';
        progressContainer.style.overflow = 'hidden';
        this.loadingContainer.appendChild(progressContainer);
        
        // Progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.style.width = '0%';
        this.progressBar.style.height = '100%';
        this.progressBar.style.backgroundColor = 'var(--pink)';
        this.progressBar.style.transition = 'width 0.2s';
        progressContainer.appendChild(this.progressBar);
        
        // Progress text
        this.progressText = document.createElement('div');
        this.progressText.textContent = '0%';
        this.progressText.style.color = 'var(--white)';
        this.progressText.style.fontFamily = '"Exo 2", sans-serif';
        this.progressText.style.fontSize = '14px';
        this.progressText.style.marginTop = '8px';
        this.loadingContainer.appendChild(this.progressText);
    }
    
    /**
     * Updates the loading progress display
     * @param {number} count - Current number of preloaded bosses
     * @param {number} total - Total number of bosses to preload
     */
    updateLoadingProgress(count, total) {
        const percent = Math.floor((count / total) * 100);
        this.progressBar.style.width = `${percent}%`;
        this.progressText.textContent = `${percent}%`;
    }
    
    /**
     * Begins the boss preloading process
     * @returns {Promise} A promise that resolves when preloading is complete
     */
    preloadBosses() {
        return new Promise((resolve) => {
            // Show loading indicator
            document.body.appendChild(this.loadingContainer);
            
 //           console.log("Starting boss preloader...");
 //           console.time("Boss Preloading");
            
            // Load bosses sequentially
            this.loadNextBoss(0, resolve);
        });
    }
    
    /**
     * Loads bosses one by one to prevent memory spikes
     * @param {number} index - Current boss index to load
     * @param {function} resolveCallback - Function to call when all bosses are loaded
     */
    loadNextBoss(index, resolveCallback) {
        if (index >= this.bossTypes.length) {
            // All bosses loaded
//            console.timeEnd("Boss Preloading");
//            console.log(`Successfully preloaded ${this.preloadedCount} boss types`);
            
            // Log the current state of the boss pool
           console.log("Boss pool status:", {
                titan: bossPool.pools[BossType.TITAN].length,
                sorcerer: bossPool.pools[BossType.SORCERER].length,
                hunter: bossPool.pools[BossType.HUNTER].length
            });
            
            // Remove loading indicator
            document.body.removeChild(this.loadingContainer);
            
            // Resolve promise
            resolveCallback();
            return;
        }
        
        const bossType = this.bossTypes[index];
        this.loadingText.textContent = `PREPARING ${this.getBossTypeName(bossType)}...`;
        
//        console.log(`Loading boss model: ${bossType}`);
        
        // Create the boss at a hidden position
        const boss = BossFactory.createBoss(this.scene, this.dummyPosition, this.player, 1, bossType);
        
        // Wait for the model to load
        this.waitForBossModelToLoad(boss, () => {
//            console.log(`Boss ${bossType} loaded successfully`);
            
            // Store boss directly in the pool instead of a separate array
            // First remove from scene and reset visibility
            boss.mesh.visible = false;
            
            // Return to boss pool rather than storing in our own array
            bossPool.release(boss);
            
            this.preloadedCount++;
            
            // Update progress
            this.updateLoadingProgress(this.preloadedCount, this.totalBosses);
            
            // Load next boss
            setTimeout(() => {
                this.loadNextBoss(index + 1, resolveCallback);
            }, 100);
        });
    }
    
    /**
     * Returns a readable name for the boss type
     * @param {string} bossType - The type from BossType enum
     * @returns {string} Human readable boss name
     */
    getBossTypeName(bossType) {
        switch(bossType) {
            case BossType.TITAN: return "TITAN";
            case BossType.SORCERER: return "SORCERER";
            case BossType.HUNTER: return "HUNTER";
            default: return "BOSS";
        }
    }
    
    /**
     * Waits for a boss model to fully load
     * @param {Object} boss - The boss instance
     * @param {function} callback - Function to call when boss is loaded
     */
    waitForBossModelToLoad(boss, callback) {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds maximum wait time
        
        // Immediately set mesh to invisible and ensure it's positioned far below the scene
        if (boss.mesh) {
            boss.mesh.visible = false;
            boss.mesh.position.copy(this.dummyPosition);
            
            // Also make sure healthbar is not visible during preloading
            if (boss.healthBarBg) {
                boss.healthBarBg.visible = false;
            }
        }
        
        const checkModelLoaded = () => {
            attempts++;
            
            // Check if model has been loaded
            if (boss.model && boss.model.children.length > 0) {
                // Force initial animation setup if there's animation
                if (boss.mixer && Object.keys(boss.animationActions).length > 0) {
                    const firstAnimation = Object.keys(boss.animationActions)[0];
                    boss.playAnimation(firstAnimation);
                    boss.mixer.update(0.016);
                    boss.stopAnimation();
                }
                
                // Double check that the model is fully invisible during preloading
                boss.mesh.visible = false;
                
                // Ensure model and all child meshes are not visible
                if (boss.model) {
                    boss.model.traverse(child => {
                        if (child.isMesh) {
                            child.visible = false;
                        }
                    });
                }
                
                // Make sure healthbar is hidden during preloading
                if (boss.healthBarBg) {
                    boss.healthBarBg.visible = false;
                }
                
                // Call the callback
                callback();
            } else if (attempts >= maxAttempts) {
                // Timeout - proceed anyway
    //            console.warn(`Timeout waiting for boss ${boss.type} model to load after ${attempts} attempts`);
                boss.mesh.visible = false;
                
                // Make sure healthbar is hidden
                if (boss.healthBarBg) {
                    boss.healthBarBg.visible = false;
                }
                
                callback();
            } else {
                // Keep checking
                setTimeout(checkModelLoaded, 100);
            }
        };
        
        // Start checking
        checkModelLoaded();
    }
    
    /**
     * No need for a separate dispose method since bosses are now
     * managed directly through the boss pool
     */
    dispose() {
        console.log("Boss pool resource management is now handled automatically");
    }
} 