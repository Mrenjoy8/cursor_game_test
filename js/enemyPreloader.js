import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { EnemyType, enemyPool } from './enemy.js';

/**
 * EnemyPreloader - Handles preloading enemies into the pool before gameplay starts
 * This reduces frame drops when enemies first appear in the game
 */
export class EnemyPreloader {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.dummyPosition = new THREE.Vector3(0, -100, 0); // Position far below the arena
        
        // Configuration for preloading
        this.preloadCounts = {
            [EnemyType.BASIC]: 20,  // Preload 20 basic enemies (most common in early waves)
            [EnemyType.FAST]: 10,   // Preload 10 fast enemies
            [EnemyType.TANKY]: 8,   // Preload 8 tanky enemies
            [EnemyType.RANGED]: 8   // Preload 8 ranged enemies
        };
        
        this.totalEnemies = Object.values(this.preloadCounts).reduce((a, b) => a + b, 0);
        this.preloadedCount = 0;
        
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
        this.loadingText.textContent = 'PREPARING BATTLE...';
        this.loadingText.style.color = 'var(--white)';
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
        this.progressBar.style.backgroundColor = 'var(--light-brown)';
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
        
        // Don't add to document yet - we'll add it when preloading starts
    }
    
    /**
     * Updates the loading progress display
     * @param {number} count - Current number of preloaded enemies
     * @param {number} total - Total number of enemies to preload
     */
    updateLoadingProgress(count, total) {
        const percent = Math.floor((count / total) * 100);
        this.progressBar.style.width = `${percent}%`;
        this.progressText.textContent = `${percent}%`;
    }
    
    /**
     * Begins the preloading process
     * @returns {Promise} A promise that resolves when preloading is complete
     */
    preloadEnemies() {
        return new Promise((resolve) => {
            // Show loading indicator
            document.body.appendChild(this.loadingContainer);
            
            // Start preloading with a slight delay for UI to render
            setTimeout(() => {
                this.startPreloading(resolve);
            }, 100);
        });
    }
    
    /**
     * Starts the actual preloading process
     * @param {function} resolveCallback - Function to call when preloading is complete
     */
    startPreloading(resolveCallback) {
        console.log("Starting enemy preloader...");
        console.time("Enemy Preloading");
        
        // Update the loading text to be more informative
        this.loadingText.textContent = 'PREPARING BATTLE...';
        this.progressText.textContent = 'Loading enemy models (0%)';
        
        // Start with a batch of basic enemies - these will be visible in the first wave
        this.preloadBatch(EnemyType.BASIC, 5, () => {
            // Add a confirmation message that first batch is ready
            console.log("Initial batch of basic enemies loaded successfully!");
            
            // Update loading text to show progress
            this.loadingText.textContent = 'PREPARING ADDITIONAL ENEMIES...';
            
            // Then preload the rest in smaller batches to avoid freezing the UI
            this.preloadAllTypes(resolveCallback);
        });
    }
    
    /**
     * Preloads all enemy types in smaller batches
     * @param {function} resolveCallback - Function to call when complete
     */
    preloadAllTypes(resolveCallback) {
        const enemyTypes = Object.keys(this.preloadCounts);
        let currentTypeIndex = 0;
        let preloadedForCurrentType = 0;
        
        // For BASIC type, we've already loaded 5, so start from there
        if (enemyTypes[currentTypeIndex] === EnemyType.BASIC) {
            preloadedForCurrentType = 5;
        }
        
        const batchSize = 3; // Process 3 enemies per batch
        
        const processNextBatch = () => {
            // Check if we've finished all types
            if (currentTypeIndex >= enemyTypes.length) {
                // All done!
                console.timeEnd("Enemy Preloading");
                console.log(`Successfully preloaded ${this.preloadedCount} enemies`);
                
                // Remove loading indicator
                document.body.removeChild(this.loadingContainer);
                
                // Resolve the promise
                resolveCallback();
                return;
            }
            
            const currentType = enemyTypes[currentTypeIndex];
            const targetCount = this.preloadCounts[currentType];
            
            // If we've completed the current type, move to the next one
            if (preloadedForCurrentType >= targetCount) {
                currentTypeIndex++;
                preloadedForCurrentType = 0;
                
                // Process the next batch with a small delay
                setTimeout(processNextBatch, 50);
                return;
            }
            
            // Calculate how many to preload in this batch
            const batchPreloadCount = Math.min(batchSize, targetCount - preloadedForCurrentType);
            
            console.log(`Processing batch of ${batchPreloadCount} ${currentType} enemies (${preloadedForCurrentType+1}-${preloadedForCurrentType+batchPreloadCount} of ${targetCount})`);
            
            // Preload a batch of the current type and wait for completion
            this.preloadBatch(currentType, batchPreloadCount, () => {
                // Update counter for current type
                preloadedForCurrentType += batchPreloadCount;
                
                // Process the next batch with a small delay to prevent UI freezing
                setTimeout(processNextBatch, 50);
            });
        };
        
        // Start the batch process
        processNextBatch();
    }
    
    /**
     * Preloads a batch of enemies of a specific type
     * @param {string} type - The enemy type to preload
     * @param {number} count - How many to preload
     * @param {function} callback - Function to call when batch is complete
     */
    preloadBatch(type, count, callback) {
        console.log(`Preloading ${count} ${type} enemies...`);
        
        // Keep track of pending enemy loads
        let pendingLoads = count;
        
        const onEnemyLoaded = () => {
            pendingLoads--;
            this.preloadedCount++;
            
            // Update progress
            this.updateLoadingProgress(this.preloadedCount, this.totalEnemies);
            
            // When all loads in the batch are complete, call the callback
            if (pendingLoads === 0) {
                console.log(`Batch of ${count} ${type} enemies successfully preloaded`);
                setTimeout(callback, 50); // Add a delay to allow UI updates
            }
        };
        
        // For each enemy to preload in this batch
        for (let i = 0; i < count; i++) {
            this.preloadSingleEnemy(type, onEnemyLoaded);
        }
    }
    
    /**
     * Preloads a single enemy and returns it to the pool
     * @param {string} type - The enemy type to preload
     * @param {function} onComplete - Callback when this enemy is fully loaded and pooled
     */
    preloadSingleEnemy(type, onComplete) {
        // Get enemy from pool (will create a new one since pool is empty)
        const enemy = enemyPool.get(type, this.scene, this.dummyPosition, this.player, 1.0);
        
        // Generate a unique ID for this preload operation
        const preloadId = Math.random().toString(36).substring(2, 8);
        
        // Check if this enemy type uses a 3D model
        const usesModel = true; // All enemy types in our game use models
        
        if (usesModel) {
            console.log(`[Preload ${preloadId}] Waiting for ${type} enemy model to load...`);
            
            // We need to ensure the model is fully loaded before returning to pool
            // Create a one-time listener for the model load completion
            let attempts = 0;
            const maxAttempts = 50; // Maximum 5 seconds (50 * 100ms)
            
            const checkModelLoaded = () => {
                attempts++;
                
                if (enemy.model) {
                    console.log(`[Preload ${preloadId}] ${type} enemy model loaded after ${attempts} attempts`);
                    
                    // Model is loaded, now return to pool
                    // Make sure model is visible to force texture loading
                    enemy.model.visible = true;
                    
                    // Store original materials after model is loaded
                    enemy.storeOriginalMaterials();
                    
                    // If there's an animation mixer, play a test animation to ensure it's loaded
                    if (enemy.mixer && Object.keys(enemy.animationActions).length > 0) {
                        const firstAnimation = Object.keys(enemy.animationActions)[0];
                        enemy.playAnimation(firstAnimation);
                        // Update the mixer to force animation system to initialize
                        enemy.mixer.update(0.016);
                        enemy.stopAnimation();
                    }
                    
                    // Make sure placeholder is removed
                    if (enemy.placeholder) {
                        enemy.mesh.remove(enemy.placeholder);
                        enemy.placeholder = null;
                    }
                    
                    // Return enemy to pool for later use
                    enemy.removeFromScene();
                    
                    // Add some feedback to browser console about pool status
                    if (type === EnemyType.BASIC && this.preloadedCount % 5 === 0) {
                        console.log(`Preloaded ${this.preloadedCount}/${this.totalEnemies} enemies (Current: ${type})`);
                    }
                    
                    // Call the completion callback
                    if (onComplete) onComplete();
                } else {
                    // If we've exceeded max attempts, force continue
                    if (attempts >= maxAttempts) {
                        console.warn(`[Preload ${preloadId}] Timeout waiting for ${type} model to load after ${attempts} attempts. Continuing anyway.`);
                        enemy.removeFromScene();
                        if (onComplete) onComplete();
                        return;
                    }
                    
                    // Model not loaded yet, check again after a delay
                    setTimeout(checkModelLoaded, 100);
                }
            };
            
            // Start checking if model is loaded
            checkModelLoaded();
        } else {
            // For enemies without models, we can return to pool immediately
            enemy.removeFromScene();
            
            // Add some feedback to browser console about pool status
            if (type === EnemyType.BASIC && this.preloadedCount % 5 === 0) {
                console.log(`Preloaded ${this.preloadedCount}/${this.totalEnemies} enemies (Current: ${type})`);
            }
            
            // Call the completion callback
            if (onComplete) onComplete();
        }
    }
} 