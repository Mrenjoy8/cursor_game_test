import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';

// Class to manage and optimize projectiles using object pooling and instanced meshes
export class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        
        // Pools for different types of projectiles
        this.pools = {
            standard: [],
            magic: [],
            knife: []
        };
        
        // Pool for hit effects
        this.hitEffectPool = [];
        
        // Shared geometries and materials
        this.geometries = {};
        this.materials = {};
        
        // Trail particle systems
        this.trailSystems = {};
        
        // Instanced meshes for different projectile types
        this.instancedMeshes = {};
        
        // Active projectiles tracker
        this.activeProjectiles = [];
        
        // Initialize all resources
        this.initSharedResources();
        this.initInstancedMeshes();
        this.initHitEffectPool();
    }
    
    // Initialize shared geometries and materials
    initSharedResources() {
        // Geometries
        this.geometries = {
            standard: new THREE.SphereGeometry(0.2, 8, 8),
            magic: new THREE.SphereGeometry(0.3, 12, 12),
            knife: new THREE.ConeGeometry(0.15, 0.4, 8)
        };
        
        // Base materials (will be cloned and modified for specific instances)
        this.materials = {
            standard: new THREE.MeshBasicMaterial({ 
                transparent: true, 
                opacity: 0.9 
            }),
            magic: new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0.85
            }),
            knife: new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 1.0
            }),
            trail: new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0.7
            }),
            hitEffect: new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0.8,
                wireframe: true
            })
        };
        
        // Initialize trail particle systems for each projectile type
        this.initTrailSystems();
    }
    
    // Initialize instanced meshes for each projectile type
    initInstancedMeshes() {
        // Maximum number of instances per type
        const maxInstances = {
            standard: 100,
            magic: 50,
            knife: 50
        };
        
        // Create instanced meshes
        for (const type in this.geometries) {
            this.instancedMeshes[type] = new THREE.InstancedMesh(
                this.geometries[type],
                this.materials[type].clone(),
                maxInstances[type]
            );
            
            // Set initial visibility to false for all instances
            this.instancedMeshes[type].count = 0;
            this.instancedMeshes[type].instanceMatrix.needsUpdate = true;
            
            // Add to scene
            this.scene.add(this.instancedMeshes[type]);
        }
    }
    
    // Initialize trail particle systems
    initTrailSystems() {
        const createTrailSystem = (particleCount, size, color) => {
            // Create particle geometry
            const particles = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            const opacities = new Float32Array(particleCount);
            const timeOffset = new Float32Array(particleCount);
            
            // Initialize arrays
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = 0;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = 0;
                sizes[i] = 0;
                opacities[i] = 0;
                timeOffset[i] = Math.random();
            }
            
            // Set attributes
            particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            particles.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
            particles.setAttribute('timeOffset', new THREE.BufferAttribute(timeOffset, 1));
            
            // Create shader material for particles
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    color: { value: new THREE.Color(color) },
                    time: { value: 0 }
                },
                vertexShader: `
                    attribute float size;
                    attribute float opacity;
                    attribute float timeOffset;
                    varying float vOpacity;
                    uniform float time;
                    
                    void main() {
                        vOpacity = opacity;
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    uniform vec3 color;
                    varying float vOpacity;
                    
                    void main() {
                        if (vOpacity <= 0.0) discard;
                        
                        // Create circular point
                        vec2 center = gl_PointCoord - vec2(0.5);
                        if (length(center) > 0.5) discard;
                        
                        // Soften the edges
                        float edge = 0.1;
                        float edgeDistance = 0.5 - length(center);
                        float edgeFactor = smoothstep(0.0, edge, edgeDistance);
                        
                        gl_FragColor = vec4(color, vOpacity * edgeFactor);
                    }
                `,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                transparent: true
            });
            
            // Create points system
            const system = new THREE.Points(particles, material);
            this.scene.add(system);
            
            return {
                system: system,
                positions: positions,
                sizes: sizes,
                opacities: opacities,
                timeOffset: timeOffset,
                lastUsedIndex: 0,
                particleCount: particleCount,
                update: function(deltaTime) {
                    this.system.material.uniforms.time.value += deltaTime * 0.001;
                    this.system.geometry.attributes.position.needsUpdate = true;
                    this.system.geometry.attributes.size.needsUpdate = true;
                    this.system.geometry.attributes.opacity.needsUpdate = true;
                }
            };
        };
        
        // Create trail systems for each projectile type with appropriate colors
        this.trailSystems = {
            standard: createTrailSystem(500, 0.2, 0x00aaff),  // Player (blue)
            magic: createTrailSystem(300, 0.3, 0x00ccff),     // Magic (cyan)
            knife: createTrailSystem(200, 0.15, 0xccffcc)     // Knife (light green)
        };
    }
    
    // Initialize pool of hit effect objects
    initHitEffectPool() {
        const poolSize = 20;
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        
        for (let i = 0; i < poolSize; i++) {
            const material = this.materials.hitEffect.clone();
            const mesh = new THREE.Mesh(geometry, material);
            mesh.visible = false;
            this.scene.add(mesh);
            
            // Add light for hit effect
            const light = new THREE.PointLight(0xffffff, 0, 5);
            mesh.add(light);
            
            this.hitEffectPool.push({
                mesh: mesh,
                light: light,
                inUse: false,
                reset: function() {
                    this.mesh.visible = false;
                    this.light.intensity = 0;
                    this.inUse = false;
                }
            });
        }
    }
    
    // Get a projectile from the pool or create a new one if needed
    getProjectile(
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
    ) {
        // Determine appropriate pool based on type and color
        let poolType = 'standard';
        if (color === 0x00ccff || color === 0x9900ff) {
            poolType = 'magic';
        } else if (color === 0xccffcc) {
            poolType = 'knife';
        }
        
        let projectile;
        
        // Try to get from pool
        for (let i = 0; i < this.pools[poolType].length; i++) {
            if (!this.pools[poolType][i].isActive) {
                projectile = this.pools[poolType][i];
                break;
            }
        }
        
        // Create new if none available in pool
        if (!projectile) {
            projectile = this.createNewProjectile(poolType);
            this.pools[poolType].push(projectile);
        }
        
        // Reset/Initialize projectile properties
        this.resetProjectile(
            projectile, 
            poolType,
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
        
        // Add to active projectiles for updating
        this.activeProjectiles.push(projectile);
        
        return projectile;
    }
    
    // Create a new projectile object
    createNewProjectile(type) {
        return {
            type: type,
            position: new THREE.Vector3(),
            direction: new THREE.Vector3(),
            speed: 0,
            size: 0,
            damage: 0,
            color: 0xffffff,
            isFromPlayer: true,
            target: null,
            lifetime: 0,
            creationTime: 0,
            isActive: false,
            instanceId: -1,
            trailParticles: [],
            matrixAutoUpdate: false,
            matrix: new THREE.Matrix4(),
            
            // Methods
            deactivate: function() {
                this.isActive = false;
                
                // Will be removed from activeProjectiles in next update cycle
                // and instance will be hidden in updateInstancedMeshes
            }
        };
    }
    
    // Reset projectile properties for reuse
    resetProjectile(
        projectile, 
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
    ) {
        projectile.type = type;
        projectile.position.copy(position);
        projectile.direction.copy(direction).normalize();
        projectile.speed = speed;
        projectile.size = size;
        projectile.damage = damage;
        projectile.color = color;
        projectile.isFromPlayer = isFromPlayer;
        projectile.target = target;
        projectile.lifetime = lifetime;
        projectile.creationTime = Date.now();
        projectile.isActive = true;
        projectile.trailParticles = [];
        
        // If projectile hasn't been assigned an instance ID yet, assign one
        if (projectile.instanceId === -1) {
            projectile.instanceId = this.instancedMeshes[type].count;
            this.instancedMeshes[type].count++;
        }
        
        // Update instanced mesh appearance
        this.updateProjectileInstance(projectile);
    }
    
    // Update all active projectiles
    update(deltaTime) {
        // Update all trail systems
        for (const type in this.trailSystems) {
            this.trailSystems[type].update(deltaTime);
        }
        
        // Update active projectiles
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.activeProjectiles[i];
            
            // Skip inactive projectiles
            if (!projectile.isActive) {
                // Clear all trail particles belonging to this projectile
                this.clearProjectileTrail(projectile);
                this.activeProjectiles.splice(i, 1);
                continue;
            }
            
            // Check lifetime
            if (Date.now() - projectile.creationTime > projectile.lifetime) {
                // Clear all trail particles belonging to this projectile
                this.clearProjectileTrail(projectile);
                projectile.deactivate();
                this.activeProjectiles.splice(i, 1);
                continue;
            }
            
            // Move projectile
            const moveDist = projectile.speed * deltaTime;
            projectile.position.x += projectile.direction.x * moveDist;
            projectile.position.y += projectile.direction.y * moveDist;
            projectile.position.z += projectile.direction.z * moveDist;
            
            // Check boundaries (60x60 arena)
            const arenaSize = 30;
            if (
                projectile.position.x < -arenaSize || 
                projectile.position.x > arenaSize || 
                projectile.position.z < -arenaSize || 
                projectile.position.z > arenaSize
            ) {
                // Clear all trail particles belonging to this projectile
                this.clearProjectileTrail(projectile);
                projectile.deactivate();
                this.activeProjectiles.splice(i, 1);
                continue;
            }
            
            // Update trail
            this.updateProjectileTrail(projectile);
            
            // Update instance transform
            this.updateProjectileInstance(projectile);
        }
    }
    
    // Clear all trail particles for a specific projectile
    clearProjectileTrail(projectile) {
        const trailSystem = this.trailSystems[projectile.type];
        if (!trailSystem) return;
        
        // Set opacity to 0 for all particles in this projectile's trail
        for (const particle of projectile.trailParticles) {
            trailSystem.opacities[particle.index] = 0;
        }
        
        // Mark trail attributes as needing update
        trailSystem.system.geometry.attributes.opacity.needsUpdate = true;
        
        // Clear the array
        projectile.trailParticles = [];
    }
    
    // Update the appearance of a projectile instance
    updateProjectileInstance(projectile) {
        // If the projectile is inactive, hide it by moving it far away
        if (!projectile.isActive) {
            const matrix = new THREE.Matrix4();
            matrix.setPosition(new THREE.Vector3(0, -1000, 0)); // Move far below the scene
            this.instancedMeshes[projectile.type].setMatrixAt(projectile.instanceId, matrix);
            this.instancedMeshes[projectile.type].instanceMatrix.needsUpdate = true;
            return;
        }
        
        // Set color for the instance
        this.instancedMeshes[projectile.type].setColorAt(
            projectile.instanceId, 
            new THREE.Color(projectile.color)
        );
        
        // Set transform matrix for the instance
        const matrix = new THREE.Matrix4();
        
        // Set position
        matrix.setPosition(projectile.position);
        
        // Set rotation for knife projectiles to point in direction of travel
        if (projectile.type === 'knife') {
            const quaternion = new THREE.Quaternion();
            const upVector = new THREE.Vector3(0, 1, 0);
            quaternion.setFromUnitVectors(upVector, projectile.direction);
            const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
            matrix.multiply(rotationMatrix);
        }
        
        // Set scale based on size
        const scale = projectile.size / 0.2; // Normalize to base size
        matrix.scale(new THREE.Vector3(scale, scale, scale));
        
        // Update instance matrix
        this.instancedMeshes[projectile.type].setMatrixAt(projectile.instanceId, matrix);
        this.instancedMeshes[projectile.type].instanceMatrix.needsUpdate = true;
        
        // Update material colors if needed
        if (this.instancedMeshes[projectile.type].instanceColor) {
            this.instancedMeshes[projectile.type].instanceColor.needsUpdate = true;
        }
    }
    
    // Update projectile trail using particle system
    updateProjectileTrail(projectile) {
        const trailSystem = this.trailSystems[projectile.type];
        if (!trailSystem) return;
        
        // Create new trail particle
        const index = trailSystem.lastUsedIndex;
        trailSystem.lastUsedIndex = (trailSystem.lastUsedIndex + 1) % trailSystem.particleCount;
        
        // Set particle position
        const posIndex = index * 3;
        trailSystem.positions[posIndex] = projectile.position.x;
        trailSystem.positions[posIndex + 1] = projectile.position.y;
        trailSystem.positions[posIndex + 2] = projectile.position.z;
        
        // Set particle size and opacity based on projectile size
        trailSystem.sizes[index] = projectile.size * 1.5;
        trailSystem.opacities[index] = 0.7;
        
        // Add to projectile's trail particles list to fade out over time
        projectile.trailParticles.push({
            index: index,
            creationTime: Date.now()
        });
        
        // Fade out older trail particles
        const currentTime = Date.now();
        const trailDuration = 500; // ms
        
        for (let i = projectile.trailParticles.length - 1; i >= 0; i--) {
            const particle = projectile.trailParticles[i];
            const age = currentTime - particle.creationTime;
            
            if (age > trailDuration) {
                // Remove old particle from tracking
                trailSystem.opacities[particle.index] = 0;
                projectile.trailParticles.splice(i, 1);
            } else {
                // Fade out based on age
                const fadeProgress = age / trailDuration;
                trailSystem.opacities[particle.index] = 0.7 * (1 - fadeProgress);
                trailSystem.sizes[particle.index] = projectile.size * (1.5 - fadeProgress);
            }
        }
    }
    
    // Create hit effect at specified position
    createHitEffect(position, color, size = 1.0) {
        // Find available hit effect from pool
        let hitEffect = null;
        for (let i = 0; i < this.hitEffectPool.length; i++) {
            if (!this.hitEffectPool[i].inUse) {
                hitEffect = this.hitEffectPool[i];
                break;
            }
        }
        
        // If all are in use, just use the first one (recycling)
        if (!hitEffect) {
            hitEffect = this.hitEffectPool[0];
        }
        
        // Reset and configure hit effect
        hitEffect.mesh.position.copy(position);
        hitEffect.mesh.scale.set(size, size, size);
        hitEffect.mesh.material.color.set(color);
        hitEffect.mesh.visible = true;
        hitEffect.light.color.set(color);
        hitEffect.light.intensity = 1.5;
        hitEffect.inUse = true;
        
        // Animate hit effect
        const duration = 400;
        const startScale = size;
        const startTime = Date.now();
        
        const animate = () => {
            if (!hitEffect.inUse) return;
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            // Expand and fade
            const scale = startScale * (1 + progress * 2);
            hitEffect.mesh.scale.set(scale, scale, scale);
            hitEffect.mesh.material.opacity = 0.8 * (1 - progress);
            hitEffect.light.intensity = 1.5 * (1 - progress);
            
            // Continue animation or reset
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                hitEffect.reset();
            }
        };
        
        // Start animation
        animate();
        
        return hitEffect;
    }
    
    // Check collision between projectile and enemy
    checkCollision(projectile, enemy) {
        if (!projectile.isActive || !enemy || !enemy.isAlive) return false;
        if (!projectile.isFromPlayer) return false;
        
        // Get enemy position
        const enemyPosition = enemy.getPosition();
        
        // Get collision radius based on enemy type
        let enemyRadius = 0.5; // Default
        
        if (typeof enemy.collisionRadius !== 'undefined') {
            enemyRadius = enemy.collisionRadius;
        } else if (enemy.type === 'boss' || enemy.type === 'titan' || 
                  enemy.type === 'sorcerer' || enemy.type === 'hunter') {
            enemyRadius = enemy.size || 1.5;
        }
        
        // Simple sphere collision
        const distance = projectile.position.distanceTo(enemyPosition);
        const collisionRadius = projectile.size + enemyRadius;
        
        if (distance < collisionRadius) {
            // Hit enemy
            enemy.takeDamage(projectile.damage);
            
            // Create hit effect
            this.createHitEffect(
                projectile.position.clone(), 
                projectile.color,
                projectile.size * 1.5
            );
            
            // Deactivate projectile
            projectile.deactivate();
            return true;
        }
        
        return false;
    }
    
    // Check collision between projectile and player
    checkPlayerCollision(projectile, player) {
        if (!projectile.isActive || projectile.isFromPlayer || !player) return false;
        
        // Get player position
        const playerPosition = player.getPosition();
        
        // Simple sphere collision
        const distance = projectile.position.distanceTo(playerPosition);
        const collisionRadius = projectile.size + 0.5; // Player radius
        
        if (distance < collisionRadius) {
            // Hit player
            player.takeDamage(projectile.damage);
            
            // Create hit effect
            this.createHitEffect(
                projectile.position.clone(), 
                projectile.color,
                projectile.size * 1.5
            );
            
            // Deactivate projectile
            projectile.deactivate();
            return true;
        }
        
        return false;
    }
    
    // Clean up all resources when no longer needed
    dispose() {
        // Clear all active projectiles and their trails
        for (const projectile of this.activeProjectiles) {
            this.clearProjectileTrail(projectile);
            projectile.isActive = false;
        }
        this.activeProjectiles = [];
        
        // Reset all trail systems
        for (const type in this.trailSystems) {
            const trailSystem = this.trailSystems[type];
            // Clear all particles
            for (let i = 0; i < trailSystem.particleCount; i++) {
                trailSystem.opacities[i] = 0;
            }
            trailSystem.system.geometry.attributes.opacity.needsUpdate = true;
        }
        
        // Remove instanced meshes
        for (const type in this.instancedMeshes) {
            this.scene.remove(this.instancedMeshes[type]);
            this.instancedMeshes[type].dispose();
        }
        
        // Dispose geometries
        for (const type in this.geometries) {
            this.geometries[type].dispose();
        }
        
        // Dispose materials
        for (const type in this.materials) {
            this.materials[type].dispose();
        }
        
        // Remove trail systems
        for (const type in this.trailSystems) {
            this.scene.remove(this.trailSystems[type].system);
            this.trailSystems[type].system.geometry.dispose();
            this.trailSystems[type].system.material.dispose();
        }
        
        // Remove hit effects
        for (const effect of this.hitEffectPool) {
            effect.light.dispose();
            this.scene.remove(effect.mesh);
            if (effect.mesh.material) effect.mesh.material.dispose();
        }
        
        // Clear arrays
        this.pools.standard = [];
        this.pools.magic = [];
        this.pools.knife = [];
        this.hitEffectPool = [];
    }
} 