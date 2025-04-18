import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { BaseEnemy } from '../enemy.js';
import { Projectile } from '../projectile.js';

export class SorcererBoss extends BaseEnemy {
    constructor(scene, position, player, bossLevel = 1) {
        super(scene, position, player);
        
        // Boss specific properties
        this.type = 'sorcerer';
        this.bossLevel = bossLevel;
        
        // Scale health, damage and rewards with boss level
        this.maxHealth = 150 * bossLevel; // Lower health than Titan
        this.health = this.maxHealth;
        this.damage = 7.5 + (10 * bossLevel); // Reduced from 15 + (10 * bossLevel)
        this.experienceValue = 500 * bossLevel;
        
        // Movement properties - faster than Titan but keeps distance
        this.moveSpeed = 0.012;
        this.teleportCooldown = 8000; // ms between teleports
        this.lastTeleportTime = 0;
        this.attackCooldown = 1500; // ms between attacks (faster attacks)
        this.specialAttackCooldown = 6000; // ms between special attacks
        this.lastSpecialAttackTime = 0;
        this.attackRange = 12; // Long attack range
        this.preferredDistance = 10; // Tries to maintain this distance
        this.defaultColor = 0x9900ff; // Purple
        
        // Sorcerer appearance vars
        this.size = 1.2 + (bossLevel * 0.4); // Smaller than Titan
        this.spinSpeed = 0.02; // Fast spin
        
        // Attack patterns
        this.attackPatterns = [
            this.magicMissiles.bind(this),   // Multiple magic projectiles
            this.arcaneBlast.bind(this),     // Large AoE blast
            this.teleport.bind(this)         // Teleport to new location
        ];
        
        // Initialize boss phases
        this.phaseThresholds = [0.75, 0.5, 0.25]; // Percentage of health
        this.currentPhase = 0;
        
        // Projectile management
        this.projectiles = [];
        this.maxProjectiles = 30;
        
        // Create the boss mesh
        this.createEnemyMesh(position);
        
        // Add dramatic entrance effect
        this.playEntranceAnimation();
    }
    
    createEnemyMesh(position) {
        try {
            // Create a floating sorcerer mesh
            
            // Main body - robe shape
            const bodyGeometry = new THREE.ConeGeometry(this.size, this.size * 2, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: this.defaultColor,
                roughness: 0.7,
                metalness: 0.3
            });
            this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
            this.mesh.castShadow = true;
            
            // Position the mesh - float above ground
            this.mesh.position.copy(position);
            this.mesh.position.y = this.size + 0.5; // Float above ground
            
            // Create hood/head
            const hoodGeometry = new THREE.SphereGeometry(this.size * 0.6, 12, 12);
            const hoodMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x330066, // Darker purple
                roughness: 0.5,
                metalness: 0.2
            });
            
            this.hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
            this.hood.position.y = this.size * 0.9;
            this.mesh.add(this.hood);
            
            // Create glowing eye in shadow of hood
            const eyeGeometry = new THREE.SphereGeometry(this.size * 0.15, 8, 8);
            const eyeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00ccff, // Cyan
                emissive: 0x00ccff,
                emissiveIntensity: 0.9
            });
            
            this.eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            this.eye.position.set(0, 0, this.size * 0.3);
            this.hood.add(this.eye);
            
            // Create staff
            const staffGeometry = new THREE.CylinderGeometry(this.size * 0.05, this.size * 0.05, this.size * 2, 6);
            const staffMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x663300, // Brown
                roughness: 0.6,
                metalness: 0.2
            });
            
            this.staff = new THREE.Mesh(staffGeometry, staffMaterial);
            this.staff.position.set(this.size * 0.6, 0, 0);
            this.staff.rotation.z = Math.PI / 6; // Angle outward
            this.mesh.add(this.staff);
            
            // Create staff orb
            const orbGeometry = new THREE.SphereGeometry(this.size * 0.2, 12, 12);
            const orbMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00ccff, // Cyan
                emissive: 0x00ccff,
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.9
            });
            
            this.orb = new THREE.Mesh(orbGeometry, orbMaterial);
            this.orb.position.y = this.size;
            this.staff.add(this.orb);
            
            // Create glow around orb
            const glowLight = new THREE.PointLight(0x00ccff, 1, this.size * 8);
            this.orb.add(glowLight);
            
            // Floating particles around the sorcerer
            this.particles = [];
            const particleCount = 5;
            
            for (let i = 0; i < particleCount; i++) {
                const particleGeometry = new THREE.SphereGeometry(this.size * 0.1, 6, 6);
                const particleMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x00ccff,
                    transparent: true,
                    opacity: 0.7
                });
                
                const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                
                // Position in orbit around sorcerer
                const angle = (i / particleCount) * Math.PI * 2;
                const radius = this.size * 1.5;
                
                particle.position.set(
                    Math.cos(angle) * radius,
                    this.size * 0.5,
                    Math.sin(angle) * radius
                );
                
                // Store orbit data
                particle.userData = {
                    orbitAngle: angle,
                    orbitRadius: radius,
                    orbitSpeed: 0.001 + (Math.random() * 0.002),
                    verticalOffset: Math.random() * 0.5
                };
                
                this.mesh.add(particle);
                this.particles.push(particle);
            }
            
            // Add to scene
            this.scene.add(this.mesh);
            
            console.log("Sorcerer boss mesh created successfully");
        } catch (error) {
            console.error("Error creating Sorcerer boss mesh:", error);
        }
    }
    
    update(deltaTime) {
        try {
            if (!this.isAlive || !this.mesh) return;
            
            // Update phase based on health percentage
            const healthPercentage = this.health / this.maxHealth;
            for (let i = 0; i < this.phaseThresholds.length; i++) {
                if (healthPercentage <= this.phaseThresholds[i] && this.currentPhase <= i) {
                    this.currentPhase = i + 1;
                    this.enterNewPhase();
                }
            }
            
            // Update boss behavior
            const playerPosition = this.player.getPosition();
            
            // Calculate direction to player
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, this.mesh.position);
            direction.y = 0; // Keep movement on xz plane
            
            // Calculate distance to player
            const distanceToPlayer = direction.length();
            
            // Check if should teleport away when player gets too close
            const currentTime = Date.now();
            if (distanceToPlayer < this.preferredDistance * 0.5 && 
                currentTime - this.lastTeleportTime > this.teleportCooldown) {
                this.teleport();
                this.lastTeleportTime = currentTime;
            } else {
                // Move to maintain optimal range
                if (distanceToPlayer < this.preferredDistance * 0.8) {
                    // Too close, move away
                    this.moveAwayFromPlayer(direction, distanceToPlayer, deltaTime);
                } else if (distanceToPlayer > this.preferredDistance * 1.2) {
                    // Too far, move closer
                    this.moveTowardsPlayer(direction, distanceToPlayer, deltaTime);
                }
                
                // Always face the player
                this.faceDirection(direction);
                
                // Attack if in range
                if (distanceToPlayer <= this.attackRange) {
                    if (currentTime - this.lastAttackTime > this.attackCooldown) {
                        this.attackPlayer();
                        this.lastAttackTime = currentTime;
                    }
                }
                
                // Special attack on cooldown
                if (currentTime - this.lastSpecialAttackTime > this.specialAttackCooldown) {
                    this.performSpecialAttack();
                    this.lastSpecialAttackTime = currentTime;
                }
            }
            
            // Update visual elements
            this.updateVisuals(deltaTime);
            
            // Update projectiles
            this.updateProjectiles(deltaTime);
        } catch (error) {
            console.error("Error in Sorcerer boss update:", error);
        }
    }
    
    moveAwayFromPlayer(direction, distance, deltaTime) {
        // Move away from player
        const moveDir = direction.clone().normalize().negate();
        
        this.mesh.position.x += moveDir.x * this.moveSpeed * deltaTime;
        this.mesh.position.z += moveDir.z * this.moveSpeed * deltaTime;
    }
    
    updateVisuals(deltaTime) {
        try {
            if (!this.mesh) return;
            
            // Float up and down
            const floatSpeed = 0.001;
            const floatHeight = 0.2;
            const time = Date.now() * floatSpeed;
            
            this.mesh.position.y = this.size + 0.5 + (Math.sin(time) * floatHeight);
            
            // Rotate orb
            if (this.orb) {
                this.orb.rotation.y += 0.02 * deltaTime * 0.1;
            }
            
            // Update orbiting particles
            this.particles.forEach(particle => {
                const data = particle.userData;
                
                // Update orbit position
                data.orbitAngle += data.orbitSpeed * deltaTime;
                
                particle.position.x = Math.cos(data.orbitAngle) * data.orbitRadius;
                particle.position.z = Math.sin(data.orbitAngle) * data.orbitRadius;
                particle.position.y = this.size * 0.5 + Math.sin(time + data.verticalOffset) * 0.5;
                
                // Pulse opacity
                if (particle.material) {
                    particle.material.opacity = 0.5 + (Math.sin(time * 5 + data.orbitAngle) * 0.3);
                }
            });
            
            // Change orb and eye color based on phase
            if (this.orb && this.eye) {
                let energyColor;
                switch (this.currentPhase) {
                    case 0: energyColor = 0x00ccff; break; // Cyan
                    case 1: energyColor = 0x0099ff; break; // Blue
                    case 2: energyColor = 0x9900ff; break; // Purple
                    case 3: energyColor = 0xff00ff; break; // Magenta
                    default: energyColor = 0x00ccff;
                }
                
                this.orb.material.color.setHex(energyColor);
                this.orb.material.emissive.setHex(energyColor);
                this.eye.material.color.setHex(energyColor);
                this.eye.material.emissive.setHex(energyColor);
                
                // Update intensity
                const intensity = 0.8 + Math.sin(time * 5) * 0.2;
                this.orb.material.emissiveIntensity = intensity;
                this.eye.material.emissiveIntensity = intensity;
                
                // Update the point light color
                const light = this.orb.children[0];
                if (light && light.isPointLight) {
                    light.color.setHex(energyColor);
                }
            }
        } catch (error) {
            console.error("Error in Sorcerer visual update:", error);
        }
    }
    
    // Sorcerer's ranged attack
    attackPlayer() {
        try {
            // Basic magic missile attack
            if (!this.isAlive) return;
            
            console.log("Sorcerer casting magic missile");
            
            // Get direction to player
            const playerPosition = this.player.getPosition();
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, this.mesh.position);
            direction.y = 0; // Keep projectile flat
            direction.normalize();
            
            // Staff animation - point at player
            if (this.staff) {
                this.staff.lookAt(this.mesh.worldToLocal(playerPosition.clone()));
            }
            
            // Flash orb
            if (this.orb) {
                const originalIntensity = this.orb.material.emissiveIntensity;
                this.orb.material.emissiveIntensity = 1.5;
                setTimeout(() => {
                    if (this.orb) this.orb.material.emissiveIntensity = originalIntensity;
                }, 200);
            }
            
            // Fire projectile from staff orb position
            this.fireProjectile(direction);
        } catch (error) {
            console.error("Error in Sorcerer attackPlayer:", error);
        }
    }
    
    fireProjectile(direction) {
        try {
            // Get orb world position
            const staffPosition = new THREE.Vector3();
            this.orb.getWorldPosition(staffPosition);
            
            // Create projectile
            const projectile = new Projectile(
                this.scene,
                staffPosition,
                direction,
                0.2,                      // faster speed
                0.4,                      // medium size
                this.damage,              // damage
                0x00ccff,                 // cyan color
                false,                    // not from player
                null,                     // no target
                4000                      // lifetime
            );
            
            // Store reference for updating and cleanup
            this.projectiles.push(projectile);
            
            // Limit max projectiles for performance
            if (this.projectiles.length > this.maxProjectiles) {
                const oldestProjectile = this.projectiles.shift();
                if (oldestProjectile.isActive) {
                    oldestProjectile.deactivate();
                }
            }
        } catch (error) {
            console.error("Error firing Sorcerer projectile:", error);
        }
    }
    
    updateProjectiles(deltaTime) {
        try {
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                
                if (projectile.isActive) {
                    projectile.update(deltaTime);
                    
                    // Check collision with player
                    if (projectile.checkPlayerCollision) {
                        projectile.checkPlayerCollision(this.player);
                    } else {
                        // Manual collision check as fallback
                        const playerPos = this.player.getPosition();
                        const distance = projectile.mesh.position.distanceTo(playerPos);
                        
                        if (distance < (projectile.size + 0.5)) {
                            console.log(`Sorcerer projectile hit player for ${projectile.damage} damage`);
                            this.player.takeDamage(projectile.damage);
                            projectile.deactivate();
                        }
                    }
                } else {
                    // Remove inactive projectiles
                    this.projectiles.splice(i, 1);
                }
            }
        } catch (error) {
            console.error("Error updating Sorcerer projectiles:", error);
        }
    }
    
    // Special attack methods
    magicMissiles() {
        try {
            console.log("Sorcerer casting Magic Missiles");
            
            // Flash body
            this.flashColor(0x00ccff, 500);
            
            // Number of missiles based on phase
            const missileCount = 3 + this.currentPhase;
            
            // Staggered firing
            for (let i = 0; i < missileCount; i++) {
                setTimeout(() => {
                    if (!this.isAlive) return;
                    
                    const playerPosition = this.player.getPosition();
                    
                    // Add small random offset to player position
                    playerPosition.x += (Math.random() - 0.5) * 2;
                    playerPosition.z += (Math.random() - 0.5) * 2;
                    
                    const direction = new THREE.Vector3();
                    direction.subVectors(playerPosition, this.mesh.position);
                    direction.y = 0;
                    direction.normalize();
                    
                    // Fire projectile
                    this.fireProjectile(direction);
                }, i * 200);
            }
        } catch (error) {
            console.error("Error in Sorcerer magicMissiles:", error);
        }
    }
    
    arcaneBlast() {
        try {
            console.log("Sorcerer casting Arcane Blast");
            
            // Charge animation
            this.flashColor(0x9900ff, 1000);
            
            if (this.orb) {
                // Make orb grow and glow
                const originalScale = this.orb.scale.clone();
                const growDuration = 1000;
                const startTime = Date.now();
                
                const growAnimation = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / growDuration, 1.0);
                    
                    // Grow the orb
                    const scale = 1 + (progress * 2);
                    this.orb.scale.set(scale, scale, scale);
                    
                    // Increase glow
                    this.orb.material.emissiveIntensity = 0.8 + (progress * 1.2);
                    
                    if (progress < 1.0) {
                        requestAnimationFrame(growAnimation);
                    } else {
                        // Finished charging, release blast
                        this.releaseArcaneBlast();
                        
                        // Reset orb
                        setTimeout(() => {
                            if (this.orb) {
                                this.orb.scale.copy(originalScale);
                                this.orb.material.emissiveIntensity = 0.8;
                            }
                        }, 200);
                    }
                };
                
                growAnimation();
            } else {
                // No orb, just release after delay
                setTimeout(() => {
                    this.releaseArcaneBlast();
                }, 1000);
            }
        } catch (error) {
            console.error("Error in Sorcerer arcaneBlast:", error);
        }
    }
    
    releaseArcaneBlast() {
        try {
            // Get position for blast (centered on player if possible)
            const targetPosition = this.player.getPosition().clone();
            
            // Create blast effect
            const blastGeometry = new THREE.SphereGeometry(0.5, 32, 32);
            const blastMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ccff,
                transparent: true,
                opacity: 0.8
            });
            
            const blast = new THREE.Mesh(blastGeometry, blastMaterial);
            blast.position.copy(targetPosition);
            blast.position.y = 0.5;
            this.scene.add(blast);
            
            // Add light
            const light = new THREE.PointLight(0x00ccff, 2, 10);
            light.position.copy(targetPosition);
            light.position.y = 1;
            this.scene.add(light);
            
            // Animation
            const duration = 1000;
            const maxRadius = 5 + (this.currentPhase * 1.5); // Larger with higher phase
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Expand blast
                const size = maxRadius * progress;
                blast.scale.set(size, size, size);
                
                // Fade opacity
                blastMaterial.opacity = 0.8 * (1 - progress);
                
                // Update light intensity
                light.intensity = 2 * (1 - progress);
                
                // Deal damage to player if in blast radius (only once)
                if (progress > 0.1 && progress < 0.2) {
                    const playerPos = this.player.getPosition();
                    const distanceToPlayer = targetPosition.distanceTo(playerPos);
                    
                    if (distanceToPlayer < maxRadius * 0.2) {
                        // Direct hit
                        const damage = this.damage * 1.5;
                        console.log(`Arcane Blast direct hit on player: ${damage} damage`);
                        this.player.takeDamage(damage);
                    } else if (distanceToPlayer < maxRadius) {
                        // Partial hit, damage falls off with distance
                        const falloff = 1 - (distanceToPlayer / maxRadius);
                        const damage = this.damage * falloff;
                        console.log(`Arcane Blast partial hit on player: ${damage} damage`);
                        this.player.takeDamage(damage);
                    }
                }
                
                // Continue animation
                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    // Clean up
                    this.scene.remove(blast);
                    this.scene.remove(light);
                    blastMaterial.dispose();
                    blastGeometry.dispose();
                }
            };
            
            animate();
        } catch (error) {
            console.error("Error in Sorcerer releaseArcaneBlast:", error);
        }
    }
    
    teleport() {
        try {
            console.log("Sorcerer teleporting");
            
            // Save current position
            const oldPosition = this.mesh.position.clone();
            
            // Create disappear effect
            this.createTeleportEffect(oldPosition, 0x9900ff);
            
            // Calculate new position
            const playerPos = this.player.getPosition();
            const angle = Math.random() * Math.PI * 2;
            const distance = this.preferredDistance;
            
            const newPosition = new THREE.Vector3(
                playerPos.x + Math.cos(angle) * distance,
                this.mesh.position.y,
                playerPos.z + Math.sin(angle) * distance
            );
            
            // Ensure within arena bounds
            const arenaSize = 28;
            newPosition.x = Math.max(-arenaSize, Math.min(arenaSize, newPosition.x));
            newPosition.z = Math.max(-arenaSize, Math.min(arenaSize, newPosition.z));
            
            // Hide mesh during teleport
            this.mesh.visible = false;
            
            // Move after short delay
            setTimeout(() => {
                if (!this.isAlive) return;
                
                // Update position
                this.mesh.position.copy(newPosition);
                
                // Show mesh
                this.mesh.visible = true;
                
                // Create reappear effect
                this.createTeleportEffect(newPosition, 0x00ccff);
                
                // Face player
                const direction = new THREE.Vector3();
                direction.subVectors(playerPos, newPosition);
                this.faceDirection(direction);
            }, 500);
        } catch (error) {
            console.error("Error in Sorcerer teleport:", error);
        }
    }
    
    playEntranceAnimation() {
        try {
            console.log("Sorcerer boss dramatic entrance");
            
            // Make boss initially invisible
            if (this.mesh) this.mesh.visible = false;
            
            // Create initial arcane circle on the ground
            const position = this.mesh.position.clone();
            position.y = 0.05; // Just above ground
            
            // Create glowing circle on the ground
            const circleGeometry = new THREE.CircleGeometry(this.size * 2, 32);
            const circleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x9900ff,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            const circle = new THREE.Mesh(circleGeometry, circleMaterial);
            circle.position.copy(position);
            circle.rotation.x = -Math.PI / 2; // Lay flat
            this.scene.add(circle);
            
            // Create vertical beam of light
            const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, 10, 16);
            const beamMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ccff,
                transparent: true,
                opacity: 0.7
            });
            
            const beam = new THREE.Mesh(beamGeometry, beamMaterial);
            beam.position.copy(position);
            beam.position.y = 5; // Beam height
            this.scene.add(beam);
            
            // Animate circle and beam
            let startTime = Date.now();
            const duration = 1500;
            
            const animateEntrance = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Pulse circle
                const pulse = 0.8 + Math.sin(progress * Math.PI * 6) * 0.2;
                circle.scale.set(pulse, pulse, pulse);
                
                // Fade beam
                circleMaterial.opacity = 0.7 * (1 - progress * 0.5);
                
                // Rotate circle
                circle.rotation.z += 0.02;
                
                // Continue animation
                if (progress < 1.0) {
                    requestAnimationFrame(animateEntrance);
                } else {
                    // Show the boss with a flash
                    if (this.mesh) {
                        this.mesh.visible = true;
                        
                        // Make boss float down from above
                        const originalY = this.mesh.position.y;
                        this.mesh.position.y = originalY + 5;
                        
                        const floatDuration = 1000;
                        const floatStartTime = Date.now();
                        
                        const floatAnimation = () => {
                            const floatElapsed = Date.now() - floatStartTime;
                            const floatProgress = Math.min(floatElapsed / floatDuration, 1.0);
                            
                            this.mesh.position.y = originalY + 5 * (1 - floatProgress);
                            
                            if (floatProgress < 1.0) {
                                requestAnimationFrame(floatAnimation);
                            } else {
                                // End of animation
                                this.mesh.position.y = originalY;
                                
                                // Remove circle and beam
                                this.scene.remove(circle);
                                this.scene.remove(beam);
                                circleGeometry.dispose();
                                circleMaterial.dispose();
                                beamGeometry.dispose();
                                beamMaterial.dispose();
                                
                                // Flash orb
                                if (this.orb && this.orb.material) {
                                    const originalIntensity = this.orb.material.emissiveIntensity;
                                    this.orb.material.emissiveIntensity = 2;
                                    
                                    setTimeout(() => {
                                        if (this.orb && this.orb.material) {
                                            this.orb.material.emissiveIntensity = originalIntensity;
                                        }
                                    }, 500);
                                }
                                
                                // Flash eye
                                if (this.eye && this.eye.material) {
                                    const originalIntensity = this.eye.material.emissiveIntensity;
                                    this.eye.material.emissiveIntensity = 2;
                                    
                                    setTimeout(() => {
                                        if (this.eye && this.eye.material) {
                                            this.eye.material.emissiveIntensity = originalIntensity;
                                        }
                                    }, 500);
                                }
                            }
                        };
                        
                        floatAnimation();
                    }
                }
            };
            
            animateEntrance();
            
        } catch (error) {
            console.error("Error in Sorcerer entrance animation:", error);
            // Ensure boss is visible even if animation fails
            if (this.mesh) this.mesh.visible = true;
        }
    }
    
    createTeleportEffect(position, color) {
        try {
            // Create vertical beam
            const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, 6, 16);
            const beamMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.7
            });
            
            const beam = new THREE.Mesh(beamGeometry, beamMaterial);
            beam.position.copy(position);
            beam.position.y = 3; // Half height
            this.scene.add(beam);
            
            // Create circle on ground
            const circleGeometry = new THREE.CircleGeometry(1, 32);
            const circleMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            const circle = new THREE.Mesh(circleGeometry, circleMaterial);
            circle.position.copy(position);
            circle.position.y = 0.05;
            circle.rotation.x = -Math.PI / 2; // Lay flat
            this.scene.add(circle);
            
            // Create particles
            const particleCount = 30;
            const particleGeometry = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);
            const particleVelocities = new Float32Array(particleCount * 3);
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                // Start at position
                particlePositions[i3] = position.x;
                particlePositions[i3 + 1] = position.y + Math.random() * 3;
                particlePositions[i3 + 2] = position.z;
                
                // Random velocity
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.01 + Math.random() * 0.03;
                particleVelocities[i3] = Math.cos(angle) * speed;
                particleVelocities[i3 + 1] = (Math.random() * 0.02) - 0.01;
                particleVelocities[i3 + 2] = Math.sin(angle) * speed;
            }
            
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
            
            const particleMaterial = new THREE.PointsMaterial({
                color: color,
                size: 0.2,
                transparent: true,
                opacity: 0.8
            });
            
            const particles = new THREE.Points(particleGeometry, particleMaterial);
            this.scene.add(particles);
            
            // Animation
            const duration = 500;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Fade out
                beamMaterial.opacity = 0.7 * (1 - progress);
                circleMaterial.opacity = 0.7 * (1 - progress);
                particleMaterial.opacity = 0.8 * (1 - progress);
                
                // Expand circle
                circle.scale.setScalar(1 + progress);
                
                // Animate particles
                const positions = particleGeometry.attributes.position.array;
                
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    
                    // Update positions based on velocity
                    positions[i3] += particleVelocities[i3];
                    positions[i3 + 1] += particleVelocities[i3 + 1];
                    positions[i3 + 2] += particleVelocities[i3 + 2];
                }
                
                particleGeometry.attributes.position.needsUpdate = true;
                
                // Continue animation
                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    // Clean up
                    this.scene.remove(beam);
                    this.scene.remove(circle);
                    this.scene.remove(particles);
                    beamMaterial.dispose();
                    beamGeometry.dispose();
                    circleMaterial.dispose();
                    circleGeometry.dispose();
                    particleMaterial.dispose();
                    particleGeometry.dispose();
                }
            };
            
            animate();
        } catch (error) {
            console.error("Error creating teleport effect:", error);
        }
    }
    
    get collisionRadius() {
        return this.size * 1.0; // Use sorcerer size for collision radius
    }
    
    performSpecialAttack() {
        try {
            // Randomly select one of the attack patterns
            if (!this.isAlive) return;
            
            const randomIndex = Math.floor(Math.random() * this.attackPatterns.length);
            const attackPattern = this.attackPatterns[randomIndex];
            
            // Execute the selected attack pattern
            if (attackPattern) {
                console.log(`Sorcerer performing special attack: ${attackPattern.name}`);
                attackPattern();
            }
        } catch (error) {
            console.error("Error in Sorcerer performSpecialAttack:", error);
        }
    }
    
    enterNewPhase() {
        try {
            console.log(`Sorcerer entering phase ${this.currentPhase}`);
            
            // Create a phase transition effect
            this.createPhaseTransitionEffect();
            
            // Adjust stats based on the new phase
            switch(this.currentPhase) {
                case 1:
                    // Phase 1: Faster teleportation
                    this.teleportCooldown = 6000;
                    break;
                case 2:
                    // Phase 2: Faster attacks
                    this.attackCooldown = 1200;
                    this.teleportCooldown = 5000;
                    break;
                case 3:
                    // Phase 3: More aggressive
                    this.attackCooldown = 1000;
                    this.specialAttackCooldown = 4000;
                    this.teleportCooldown = 4000;
                    this.moveSpeed = 0.015;
                    break;
            }
        } catch (error) {
            console.error("Error in Sorcerer enterNewPhase:", error);
        }
    }
    
    createPhaseTransitionEffect() {
        try {
            // Flash the entire sorcerer body
            this.flashColor(0x00ffff, 1000);
            
            // Create additional visual effects
            const position = this.mesh.position.clone();
            
            // Create explosion of energy
            const particleCount = 50;
            const particleGeometry = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);
            const particleVelocities = [];
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                // Start at boss position
                particlePositions[i3] = position.x;
                particlePositions[i3 + 1] = position.y;
                particlePositions[i3 + 2] = position.z;
                
                // Random velocity in all directions
                const speed = 0.05 + Math.random() * 0.1;
                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = Math.random() * Math.PI * 2;
                
                particleVelocities.push({
                    x: Math.sin(angle1) * Math.cos(angle2) * speed,
                    y: Math.sin(angle1) * Math.sin(angle2) * speed,
                    z: Math.cos(angle1) * speed
                });
            }
            
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
            
            // Different color based on phase
            let phaseColor;
            switch(this.currentPhase) {
                case 1: phaseColor = 0x0099ff; break; // Blue
                case 2: phaseColor = 0x9900ff; break; // Purple
                case 3: phaseColor = 0xff00ff; break; // Magenta
                default: phaseColor = 0x00ccff; // Cyan
            }
            
            const particleMaterial = new THREE.PointsMaterial({
                color: phaseColor,
                size: 0.3,
                transparent: true,
                opacity: 0.8
            });
            
            const particles = new THREE.Points(particleGeometry, particleMaterial);
            this.scene.add(particles);
            
            // Create shockwave effect
            const shockwaveGeometry = new THREE.RingGeometry(0.1, 0.2, 32);
            const shockwaveMaterial = new THREE.MeshBasicMaterial({
                color: phaseColor,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
            shockwave.position.copy(position);
            shockwave.rotation.x = Math.PI / 2; // Make it horizontal
            this.scene.add(shockwave);
            
            // Animation
            const duration = 1500;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                
                // Animate particles
                const positions = particleGeometry.attributes.position.array;
                
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    
                    // Update positions based on velocity
                    positions[i3] += particleVelocities[i].x;
                    positions[i3 + 1] += particleVelocities[i].y;
                    positions[i3 + 2] += particleVelocities[i].z;
                }
                
                particleGeometry.attributes.position.needsUpdate = true;
                
                // Fade particles
                particleMaterial.opacity = 0.8 * (1 - progress);
                
                // Expand and fade shockwave
                const shockwaveSize = 0.2 + progress * 10;
                shockwave.scale.set(shockwaveSize, shockwaveSize, shockwaveSize);
                shockwaveMaterial.opacity = 0.7 * (1 - progress);
                
                // Continue animation
                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    // Clean up
                    this.scene.remove(particles);
                    this.scene.remove(shockwave);
                    particleGeometry.dispose();
                    particleMaterial.dispose();
                    shockwaveGeometry.dispose();
                    shockwaveMaterial.dispose();
                }
            };
            
            animate();
        } catch (error) {
            console.error("Error in Sorcerer phase transition effect:", error);
        }
    }
} 