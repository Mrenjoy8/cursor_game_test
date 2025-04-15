import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';

export class Enemy {
    constructor(scene, position, player) {
        this.scene = scene;
        this.player = player;
        this.health = 30;
        this.damage = 10;
        this.moveSpeed = 0.015;
        this.experienceValue = 20;
        this.isAlive = true;
        this.lastAttackTime = 0;
        this.attackCooldown = 1000; // 1 second cooldown between attacks
        
        // Create enemy mesh
        this.createEnemyMesh(position);
    }
    
    createEnemyMesh(position) {
        // Create a simple enemy (a red cone)
        const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Position the mesh
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.75; // Half height off the ground
        
        // Rotate to point up
        this.mesh.rotation.x = Math.PI;
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
        // Get player position
        const playerPosition = this.player.getPosition();
        
        // Calculate direction to player
        const direction = new THREE.Vector3();
        direction.subVectors(playerPosition, this.mesh.position);
        direction.y = 0; // Keep movement on xz plane
        
        // Move towards player if not too close
        const distanceToPlayer = direction.length();
        
        if (distanceToPlayer > 1.5) { // Stay a bit away from player
            direction.normalize();
            
            // Move towards player
            this.mesh.position.x += direction.x * this.moveSpeed * deltaTime;
            this.mesh.position.z += direction.z * this.moveSpeed * deltaTime;
            
            // Face the direction of movement
            this.mesh.lookAt(new THREE.Vector3(
                this.mesh.position.x + direction.x,
                this.mesh.position.y,
                this.mesh.position.z + direction.z
            ));
            // Correct the rotation since our model is a cone pointing up
            this.mesh.rotation.x = Math.PI;
        } else {
            // Attack player if close enough and cooldown has passed
            const currentTime = Date.now();
            if (currentTime - this.lastAttackTime > this.attackCooldown) {
                this.attackPlayer();
                this.lastAttackTime = currentTime;
            }
        }
    }
    
    attackPlayer() {
        if (this.player) {
            this.player.takeDamage(this.damage);
            
            // Visual feedback for attack
            this.mesh.material.color.set(0xff9900); // Flash orange when attacking
            setTimeout(() => {
                if (this.mesh && this.mesh.material) {
                    this.mesh.material.color.set(0xff0000); // Back to red
                }
            }, 200);
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        
        // Visual feedback
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.set(0xffffff); // Flash white when hit
            setTimeout(() => {
                if (this.mesh && this.mesh.material && this.isAlive) {
                    this.mesh.material.color.set(0xff0000); // Back to red if still alive
                }
            }, 100);
        }
        
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
        const fadeOut = setInterval(() => {
            if (this.mesh && this.mesh.material) {
                if (this.mesh.material.opacity > 0) {
                    this.mesh.material.transparent = true;
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
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
    }
    
    getPosition() {
        return this.mesh ? this.mesh.position : null;
    }
} 