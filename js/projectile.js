import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';

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
        this.scene = scene;
        this.direction = direction.clone().normalize();
        this.speed = speed;
        this.damage = damage;
        this.isActive = true;
        this.lifetime = lifetime;
        this.creationTime = Date.now();
        this.isFromPlayer = isFromPlayer;
        this.target = target;
        this.size = size;
        this.color = color;
        
        // Create projectile mesh
        this.createProjectileMesh(position);
    }
    
    createProjectileMesh(position) {
        // Create a projectile with custom size and color
        const geometry = new THREE.SphereGeometry(this.size, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: this.color,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        // Add stronger glowing effect
        const glow = new THREE.PointLight(this.color, 1.5, this.size * 20);
        this.mesh.add(glow);
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Add trail effect with longer trail
        this.trail = [];
        this.maxTrailLength = 8; // Increase trail length
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Check lifetime
        if (Date.now() - this.creationTime > this.lifetime) {
            this.deactivate();
            return;
        }
        
        // Move projectile
        const moveDist = this.speed * deltaTime;
        this.mesh.position.x += this.direction.x * moveDist;
        this.mesh.position.y += this.direction.y * moveDist;
        this.mesh.position.z += this.direction.z * moveDist;
        
        // Update trail
        this.updateTrail();
        
        // Check boundaries (60x60 arena)
        const arenaSize = 30;
        if (
            this.mesh.position.x < -arenaSize || 
            this.mesh.position.x > arenaSize || 
            this.mesh.position.z < -arenaSize || 
            this.mesh.position.z > arenaSize
        ) {
            this.deactivate();
        }
    }
    
    updateTrail() {
        // Create new trail segment
        const geometry = new THREE.SphereGeometry(this.size * 0.7, 6, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: this.color,
            transparent: true,
            opacity: 0.7
        });
        
        const trailSegment = new THREE.Mesh(geometry, material);
        trailSegment.position.copy(this.mesh.position);
        this.scene.add(trailSegment);
        
        // Add to trail array
        this.trail.push({
            mesh: trailSegment,
            creationTime: Date.now()
        });
        
        // Remove old trail segments
        if (this.trail.length > this.maxTrailLength) {
            const oldestSegment = this.trail.shift();
            this.scene.remove(oldestSegment.mesh);
            oldestSegment.mesh.geometry.dispose();
            oldestSegment.mesh.material.dispose();
        }
        
        // Fade trail segments with better visual effect
        this.trail.forEach((segment, index) => {
            const age = Date.now() - segment.creationTime;
            const opacity = 0.7 * (1 - (index / this.maxTrailLength));
            segment.mesh.material.opacity = opacity;
            
            // Scale down as they age
            const scale = 1 - (index / this.maxTrailLength) * 0.7;
            segment.mesh.scale.set(scale, scale, scale);
        });
    }
    
    // Check collision with an enemy (for player projectiles)
    checkCollision(enemy) {
        try {
            if (!this.isActive || !enemy || !enemy.isAlive) return false;
            if (!this.isFromPlayer) return false;
            
            // Safety check to ensure both objects have valid positions
            if (!this.mesh || !this.mesh.position) return false;
            
            const enemyPosition = enemy.getPosition();
            if (!enemyPosition || !isFinite(enemyPosition.x) || !isFinite(enemyPosition.y) || !isFinite(enemyPosition.z)) {
                console.warn("Enemy has invalid position:", enemy.type);
                return false;
            }
            
            // Get collision radius, handling boss enemies specially
            let enemyRadius = 0.5; // Default radius for standard enemies
            
            // Check if enemy has a collisionRadius getter or is a boss
            if (typeof enemy.collisionRadius !== 'undefined') {
                enemyRadius = enemy.collisionRadius;
            } else if (enemy.type === 'boss') {
                enemyRadius = enemy.size || 1.5; // Use boss size or default to 1.5
            }
            
            // Simple sphere collision
            const distance = this.mesh.position.distanceTo(enemyPosition);
            const collisionRadius = this.size + enemyRadius;
            
            if (distance < collisionRadius) {
                // Debug log
                console.log(`Projectile hit ${enemy.type} for ${this.damage} damage`);
                
                // Hit enemy
                enemy.takeDamage(this.damage);
                this.deactivate();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error("Error in projectile collision check:", error);
            return false;
        }
    }
    
    // Check collision with player (for enemy projectiles)
    checkPlayerCollision(player) {
        if (!this.isActive || this.isFromPlayer) return false;
        
        // Simple sphere collision
        const distance = this.mesh.position.distanceTo(player.getPosition());
        const collisionRadius = this.size + 0.5; // Projectile size + player radius
        if (distance < collisionRadius) {
            // Hit player
            player.takeDamage(this.damage);
            this.deactivate();
            return true;
        }
        
        return false;
    }
    
    deactivate() {
        this.isActive = false;
        
        // Create hit effect
        this.createHitEffect();
        
        // Remove from scene
        this.removeFromScene();
    }
    
    createHitEffect() {
        // Create a more dramatic expanding and fading sphere at the current position
        const geometry = new THREE.SphereGeometry(this.size * 1.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: this.color,
            transparent: true,
            opacity: 0.9
        });
        
        const hitEffect = new THREE.Mesh(geometry, material);
        hitEffect.position.copy(this.mesh.position);
        this.scene.add(hitEffect);
        
        // Add a flash of light at impact
        const light = new THREE.PointLight(this.color, 1, this.size * 10);
        light.position.copy(this.mesh.position);
        this.scene.add(light);
        
        // Animate and remove
        let scale = 1;
        const expandInterval = setInterval(() => {
            scale += 0.3;
            hitEffect.scale.set(scale, scale, scale);
            material.opacity -= 0.1;
            
            if (material.opacity <= 0) {
                clearInterval(expandInterval);
                this.scene.remove(hitEffect);
                this.scene.remove(light);
                geometry.dispose();
                material.dispose();
            }
        }, 50);
    }
    
    removeFromScene() {
        // Remove trail
        this.trail.forEach(segment => {
            this.scene.remove(segment.mesh);
            segment.mesh.geometry.dispose();
            segment.mesh.material.dispose();
        });
        this.trail = [];
        
        // Remove projectile
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
    }
} 