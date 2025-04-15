import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';

export class Projectile {
    constructor(scene, position, direction, damage = 10, speed = 0.3, lifetime = 1500) {
        this.scene = scene;
        this.direction = direction.clone().normalize();
        this.speed = speed;
        this.damage = damage;
        this.isActive = true;
        this.lifetime = lifetime;
        this.creationTime = Date.now();
        
        // Create projectile mesh
        this.createProjectileMesh(position);
    }
    
    createProjectileMesh(position) {
        // Create a simple projectile (blue sphere)
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00aaff,
            transparent: true,
            opacity: 0.8
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.position.y = 1.0; // Adjust height to shoot from player's "hands"
        
        // Add glowing effect
        const glow = new THREE.PointLight(0x00aaff, 1, 3);
        this.mesh.add(glow);
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Add trail effect
        this.trail = [];
        this.maxTrailLength = 5;
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
        
        // Check boundaries (30x30 arena)
        const arenaSize = 15;
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
        const geometry = new THREE.SphereGeometry(0.1, 6, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00aaff,
            transparent: true,
            opacity: 0.5
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
        
        // Fade trail segments
        this.trail.forEach((segment, index) => {
            const age = Date.now() - segment.creationTime;
            const opacity = 0.5 * (1 - (index / this.maxTrailLength));
            segment.mesh.material.opacity = opacity;
            
            // Scale down as they age
            const scale = 1 - (index / this.maxTrailLength) * 0.5;
            segment.mesh.scale.set(scale, scale, scale);
        });
    }
    
    checkCollision(enemy) {
        if (!this.isActive || !enemy.isAlive) return false;
        
        // Simple sphere collision
        const distance = this.mesh.position.distanceTo(enemy.getPosition());
        if (distance < 0.7) { // Projectile radius + enemy radius
            // Hit enemy
            enemy.takeDamage(this.damage);
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
        // Create a quick expanding and fading sphere at the current position
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00aaff,
            transparent: true,
            opacity: 0.8
        });
        
        const hitEffect = new THREE.Mesh(geometry, material);
        hitEffect.position.copy(this.mesh.position);
        this.scene.add(hitEffect);
        
        // Animate and remove
        let scale = 1;
        const expandInterval = setInterval(() => {
            scale += 0.3;
            hitEffect.scale.set(scale, scale, scale);
            material.opacity -= 0.1;
            
            if (material.opacity <= 0) {
                clearInterval(expandInterval);
                this.scene.remove(hitEffect);
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