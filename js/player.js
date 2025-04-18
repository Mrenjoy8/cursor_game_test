import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { Projectile } from './projectile.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.moveSpeed = 0.15;
        this.health = 100;
        this.maxHealth = 100;
        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.movementKeys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };
        
        // Attack properties
        this.attackRange = 15;
        this.attackSpeed = 1000; // ms between attacks
        this.lastAttackTime = 0;
        this.attackDamage = 10;
        this.projectiles = [];
        this.attackTarget = null;
        this.multiShotCount = 1;
        this.projectileSpeed = 0.3;
        
        // Create player mesh
        this.createPlayerMesh();
        
        // Set up input handlers
        this.setupInputHandlers();
    }
    
    createPlayerMesh() {
        // Create a simple player character (a cylinder with a sphere on top)
        // Body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3498db });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 0.75;
        this.body.castShadow = true;
        
        // Head (sphere)
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xecf0f1 });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 1.7;
        this.head.castShadow = true;
        
        // Player container
        this.mesh = new THREE.Group();
        this.mesh.add(this.body);
        this.mesh.add(this.head);
        
        // Set initial position
        this.mesh.position.set(0, 0, 0);
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    setupInputHandlers() {
        // Keyboard event listeners
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
    }
    
    handleKeyDown(event) {
        switch(event.code) {
            case 'KeyW':
                this.movementKeys.forward = true;
                break;
            case 'KeyS':
                this.movementKeys.backward = true;
                break;
            case 'KeyA':
                this.movementKeys.right = true;
                break;
            case 'KeyD':
                this.movementKeys.left = true;
                break;
        }
    }
    
    handleKeyUp(event) {
        switch(event.code) {
            case 'KeyW':
                this.movementKeys.forward = false;
                break;
            case 'KeyS':
                this.movementKeys.backward = false;
                break;
            case 'KeyA':
                this.movementKeys.right = false;
                break;
            case 'KeyD':
                this.movementKeys.left = false;
                break;
        }
    }
    
    update(deltaTime, camera, enemies = []) {
        // Validate position to prevent geometry errors
        this.validatePosition();
        
        // Handle movement
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        // Calculate movement direction based on camera orientation
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();
        
        // Calculate right vector from camera
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(camera.up, cameraDirection).normalize();
        
        // Apply movement inputs
        if (this.movementKeys.forward) {
            this.velocity.add(cameraDirection.clone().multiplyScalar(this.moveSpeed));
        }
        if (this.movementKeys.backward) {
            this.velocity.add(cameraDirection.clone().multiplyScalar(-this.moveSpeed));
        }
        if (this.movementKeys.left) {
            this.velocity.add(rightVector.clone().multiplyScalar(-this.moveSpeed));
        }
        if (this.movementKeys.right) {
            this.velocity.add(rightVector.clone().multiplyScalar(this.moveSpeed));
        }
        
        // Move player
        if (this.velocity.length() > 0) {
            // Normalize velocity if moving diagonally to prevent faster diagonal movement
            if (this.velocity.length() > this.moveSpeed) {
                this.velocity.normalize().multiplyScalar(this.moveSpeed);
            }
            
            // Update position
            this.mesh.position.add(this.velocity);
            
            // Ensure the player faces the direction of movement
            if (this.velocity.length() > 0.01) {
                this.direction.copy(this.velocity).normalize();
                this.mesh.lookAt(
                    this.mesh.position.x + this.direction.x,
                    this.mesh.position.y,
                    this.mesh.position.z + this.direction.z
                );
            }
        }
        
        // Arena boundary collision (assuming 60x60 arena with walls at ±30)
        const arenaSize = 30;
        const playerRadius = 0.5;
        
        if (this.mesh.position.x < -arenaSize + playerRadius) {
            this.mesh.position.x = -arenaSize + playerRadius;
        }
        if (this.mesh.position.x > arenaSize - playerRadius) {
            this.mesh.position.x = arenaSize - playerRadius;
        }
        if (this.mesh.position.z < -arenaSize + playerRadius) {
            this.mesh.position.z = -arenaSize + playerRadius;
        }
        if (this.mesh.position.z > arenaSize - playerRadius) {
            this.mesh.position.z = arenaSize - playerRadius;
        }
        
        // Update projectiles
        this.updateProjectiles(deltaTime, enemies);
        
        // Auto attack if enemies in range
        this.autoAttack(enemies);
    }
    
    updateProjectiles(deltaTime, enemies) {
        // Update existing projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Update projectile
            projectile.update(deltaTime);
            
            // Check for collisions with enemies
            for (const enemy of enemies) {
                projectile.checkCollision(enemy);
            }
            
            // Remove inactive projectiles
            if (!projectile.isActive) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    autoAttack(enemies) {
        if (enemies.length === 0) return;
        
        // Find the closest enemy
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            
            const distance = this.mesh.position.distanceTo(enemy.getPosition());
            if (distance < closestDistance && distance <= this.attackRange) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }
        
        // Attack the closest enemy
        if (closestEnemy && Date.now() - this.lastAttackTime > this.attackSpeed) {
            this.attackTarget = closestEnemy;
            this.fireProjectile(closestEnemy);
            this.lastAttackTime = Date.now();
        }
    }
    
    fireProjectile(target) {
        // Calculate direction to target
        const targetPos = target.getPosition();
        const direction = new THREE.Vector3();
        direction.subVectors(targetPos, this.mesh.position);
        direction.y = 0; // Keep projectile flat
        direction.normalize();
        
        // Look at target when firing
        this.mesh.lookAt(
            targetPos.x,
            this.mesh.position.y,
            targetPos.z
        );
        
        // Fire primary projectile
        this.createAndAddProjectile(direction);
        
        // Fire additional projectiles if multishot is active
        if (this.multiShotCount > 1) {
            // Calculate spread angle (in radians)
            const spreadAngle = Math.PI / 12; // 15 degrees
            
            for (let i = 1; i < this.multiShotCount; i++) {
                // Alternate sides
                const angle = spreadAngle * (i % 2 === 0 ? i / 2 : -(i + 1) / 2);
                
                // Calculate new direction with rotation
                const newDirection = direction.clone();
                newDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                
                // Fire projectile
                this.createAndAddProjectile(newDirection);
            }
        }
    }
    
    createAndAddProjectile(direction) {
        // Create projectile at player position
        const position = this.mesh.position.clone();
        position.y = 1.0; // Shoot from player's "hands"
        
        const projectile = new Projectile(
            this.scene,
            position,
            direction,
            this.projectileSpeed * 0.7,  // Reduce speed by 30%
            0.35,                        // Increase size from 0.2 to 0.35
            this.attackDamage,           // damage
            0x00aaff,                    // color (blue)
            true,                        // isFromPlayer
            null,                        // target
            3600                         // doubled lifetime for doubled arena size
        );
        
        // Add to projectiles array
        this.projectiles.push(projectile);
    }
    
    takeDamage(amount) {
        try {
            // Validate the damage amount
            if (!amount || isNaN(amount) || amount <= 0) {
                console.warn("Invalid damage amount:", amount);
                return;
            }
            
            console.log(`Player taking ${amount} damage. Health before: ${this.health}`);
            
            this.health -= amount;
            
            // Visual feedback - flash body red
            if (this.body && this.body.material) {
                const originalColor = this.body.material.color.clone();
                this.body.material.color.set(0xff0000);
                
                setTimeout(() => {
                    if (this.body && this.body.material) {
                        this.body.material.color.copy(originalColor);
                    }
                }, 200);
            }
            
            // Log health after taking damage
            console.log(`Player health after damage: ${this.health}/${this.maxHealth}`);
            
            if (this.health <= 0) {
                this.health = 0;
                console.log("Player died!");
                // Call game over function
                const event = new CustomEvent('playerDeath');
                document.dispatchEvent(event);
            }
        } catch (error) {
            console.error("Error in player takeDamage:", error);
        }
    }
    
    heal(amount) {
        this.health += amount;
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }
    
    gainExperience(amount) {
        this.experience += amount;
        if (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.experience -= this.experienceToNextLevel;
        this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.2);
        this.maxHealth += 10;
        this.health = this.maxHealth;
        
        // Increase attack damage with each level
        this.attackDamage += 2;
        
        // Trigger level up event
        const event = new CustomEvent('playerLevelUp', {
            detail: { level: this.level }
        });
        document.dispatchEvent(event);
    }
    
    getPosition() {
        return this.mesh.position;
    }
    
    // Add this method to validate the player's position
    validatePosition() {
        if (this.body && this.body.position) {
            // Check for NaN or infinite values in position
            if (!isFinite(this.body.position.x) || !isFinite(this.body.position.y) || !isFinite(this.body.position.z)) {
                console.warn(`Invalid player position detected. Resetting position.`);
                // Reset to a safe position to prevent geometry calculation errors
                this.body.position.set(0, 0.5, 0);
                
                // Also reset velocity if available
                if (this.velocity) {
                    this.velocity.set(0, 0, 0);
                }
                return false;
            }
        }
        return true;
    }
} 