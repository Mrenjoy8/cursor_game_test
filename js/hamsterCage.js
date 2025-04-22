import * as THREE from 'three';
import { mergeBufferGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/utils/BufferGeometryUtils.js';

export class HamsterCage {
    constructor(scene) {
        this.scene = scene;
        
        // Materials
        this.materials = {
            // Cage frame material
            bars: new THREE.MeshBasicMaterial({ color: 0xCDCDCD }), // Light metallic color
            // Bedding material
            bedding: new THREE.MeshBasicMaterial({ 
                color: 0xDAC292,
                map: this.createBeddingTexture()
            }),
            // Water bottle material
            bottle: new THREE.MeshBasicMaterial({ 
                color: 0xADD8E6, // Light blue
                transparent: true,
                opacity: 0.7
            }),
            // Food bowl material
            bowl: new THREE.MeshBasicMaterial({ color: 0xE67E22 }), // Orange ceramic color
            // Exercise wheel material
            wheel: new THREE.MeshBasicMaterial({ color: 0x95A5A6 }), // Gray plastic
            // House/tunnel material
            house: new THREE.MeshBasicMaterial({ color: 0x8E44AD }) // Purple plastic
        };
        
        // Create the cage components
        this.createCage();
    }
    
    createBeddingTexture() {
        // Create a simple, low-res texture for the bedding
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Fill background
        ctx.fillStyle = '#DAC292'; // Base tan color
        ctx.fillRect(0, 0, 64, 64);
        
        // Add some random darker spots to simulate wood shavings
        for (let i = 0; i < 100; i++) {
            const x = Math.floor(Math.random() * 64);
            const y = Math.floor(Math.random() * 64);
            const size = 1 + Math.floor(Math.random() * 3);
            
            // Vary the colors slightly for natural look
            const darkenAmount = Math.random() * 0.2;
            ctx.fillStyle = `rgba(180, 160, 120, ${0.5 + darkenAmount})`;
            ctx.fillRect(x, y, size, size);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5, 5); // Repeat the texture
        
        return texture;
    }
    
    createCage() {
        // Group to hold all cage elements
        this.cageGroup = new THREE.Group();
        this.scene.add(this.cageGroup);
        
        // Create components
        this.createBase();
        this.createFrame();
        this.createWaterBottle();
        this.createFoodBowl();
        this.createExerciseWheel();
        this.createHouse();
        this.createTunnel();
        this.createFoodPellets();
        
        // Position cage in scene - lower it to match floor level
        this.cageGroup.position.set(0, -1, 0);
    }
    
    createBase() {
        // Create the bedding base - larger to match previous arena size
        const baseGeometry = new THREE.BoxGeometry(58, 1, 58);
        const baseMesh = new THREE.Mesh(baseGeometry, this.materials.bedding);
        baseMesh.position.set(0, 0.5, 0);
        this.cageGroup.add(baseMesh);
    }
    
    createFrame() {
        // Create the rectangular cage frame
        const barWidth = 0.3;
        const barGeometries = [];
        
        // Cage dimensions - match previous arena size
        const width = 60;
        const height = 30;
        const depth = 60;
        
        // Create bottom frame (thicker)
        const bottomBarGeometry = new THREE.BoxGeometry(width, barWidth * 1.5, barWidth * 1.5);
        const sideBottomBarGeometry = new THREE.BoxGeometry(barWidth * 1.5, barWidth * 1.5, depth);
        
        // Position bars for bottom frame
        this.addFrameComponent(barGeometries, bottomBarGeometry, 0, 1, depth/2 - barWidth);
        this.addFrameComponent(barGeometries, bottomBarGeometry, 0, 1, -depth/2 + barWidth);
        this.addFrameComponent(barGeometries, sideBottomBarGeometry, width/2 - barWidth, 1, 0);
        this.addFrameComponent(barGeometries, sideBottomBarGeometry, -width/2 + barWidth, 1, 0);
        
        // Create top frame
        const topBarGeometry = new THREE.BoxGeometry(width, barWidth, barWidth);
        const sideTopBarGeometry = new THREE.BoxGeometry(barWidth, barWidth, depth);
        
        // Position bars for top frame
        this.addFrameComponent(barGeometries, topBarGeometry, 0, height, depth/2 - barWidth);
        this.addFrameComponent(barGeometries, topBarGeometry, 0, height, -depth/2 + barWidth);
        this.addFrameComponent(barGeometries, sideTopBarGeometry, width/2 - barWidth, height, 0);
        this.addFrameComponent(barGeometries, sideTopBarGeometry, -width/2 + barWidth, height, 0);
        
        // Create vertical supports
        const verticalBarGeometry = new THREE.BoxGeometry(barWidth, height, barWidth);
        
        // Four corner supports
        this.addFrameComponent(barGeometries, verticalBarGeometry, width/2 - barWidth, height/2 + 1, depth/2 - barWidth);
        this.addFrameComponent(barGeometries, verticalBarGeometry, width/2 - barWidth, height/2 + 1, -depth/2 + barWidth);
        this.addFrameComponent(barGeometries, verticalBarGeometry, -width/2 + barWidth, height/2 + 1, depth/2 - barWidth);
        this.addFrameComponent(barGeometries, verticalBarGeometry, -width/2 + barWidth, height/2 + 1, -depth/2 + barWidth);
        
        // Add some bars for the sides (not too many for performance)
        // Front and back bars - increased spacing for larger cage
        const spacing = 10;
        for (let x = -width/2 + spacing; x <= width/2 - spacing; x += spacing) {
            this.addFrameComponent(barGeometries, verticalBarGeometry, x, height/2 + 1, depth/2 - barWidth);
            this.addFrameComponent(barGeometries, verticalBarGeometry, x, height/2 + 1, -depth/2 + barWidth);
        }
        
        // Left and right bars
        for (let z = -depth/2 + spacing; z <= depth/2 - spacing; z += spacing) {
            this.addFrameComponent(barGeometries, verticalBarGeometry, width/2 - barWidth, height/2 + 1, z);
            this.addFrameComponent(barGeometries, verticalBarGeometry, -width/2 + barWidth, height/2 + 1, z);
        }
        
        // Merge all geometries for better performance
        const mergedBarGeometry = mergeBufferGeometries(barGeometries);
        const frameMesh = new THREE.Mesh(mergedBarGeometry, this.materials.bars);
        this.cageGroup.add(frameMesh);
    }
    
    addFrameComponent(geometryArray, geometry, x, y, z) {
        const tempGeometry = geometry.clone();
        tempGeometry.translate(x, y, z);
        geometryArray.push(tempGeometry);
    }
    
    createWaterBottle() {
        // Create water bottle group
        const bottleGroup = new THREE.Group();
        
        // Bottle cylinder - scaled up for larger cage
        const cylinderGeometry = new THREE.CylinderGeometry(2, 2, 8, 8);
        const cylinder = new THREE.Mesh(cylinderGeometry, this.materials.bottle);
        cylinder.rotation.x = Math.PI / 3; // Tilt the bottle
        cylinder.position.y = 4;
        bottleGroup.add(cylinder);
        
        // Bottle cap
        const capGeometry = new THREE.CylinderGeometry(2.2, 2.2, 1, 8);
        const cap = new THREE.Mesh(capGeometry, new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
        cap.position.set(0, 4, 0);
        cap.rotation.x = Math.PI / 3;
        cap.position.y = 8;
        bottleGroup.add(cap);
        
        // Spout/tip
        const spoutGeometry = new THREE.CylinderGeometry(0.4, 0.4, 3, 6);
        const spout = new THREE.Mesh(spoutGeometry, new THREE.MeshBasicMaterial({ color: 0xC0C0C0 }));
        spout.rotation.x = -Math.PI / 6; // Point downward
        spout.position.set(0, 0, 3);
        bottleGroup.add(spout);
        
        // Position the bottle group at the side of the cage
        bottleGroup.position.set(-25, 20, 0);
        bottleGroup.rotation.y = Math.PI / 2;
        
        this.cageGroup.add(bottleGroup);
    }
    
    createFoodBowl() {
        // Create a simple food bowl (low-poly) - scaled up
        const bowlGroup = new THREE.Group();
        
        // Bowl base
        const baseGeometry = new THREE.CylinderGeometry(4, 5, 2, 8);
        const base = new THREE.Mesh(baseGeometry, this.materials.bowl);
        bowlGroup.add(base);
        
        // Bowl interior (hole) - slight offset to prevent z-fighting
        const interiorGeometry = new THREE.CylinderGeometry(3.6, 4.6, 2, 8);
        const interior = new THREE.Mesh(
            interiorGeometry, 
            new THREE.MeshBasicMaterial({ color: 0xBF6516 })
        );
        interior.position.y = 0.1;
        bowlGroup.add(interior);
        
        // Position the bowl in the cage
        bowlGroup.position.set(20, 1, 20);
        
        this.cageGroup.add(bowlGroup);
    }
    
    createExerciseWheel() {
        // Create exercise wheel group - scaled up
        const wheelGroup = new THREE.Group();
        
        // Wheel rim (torus)
        const rimGeometry = new THREE.TorusGeometry(6, 0.6, 8, 16);
        const rim = new THREE.Mesh(rimGeometry, this.materials.wheel);
        wheelGroup.add(rim);
        
        // Wheel spokes (low-poly)
        const spokeCount = 6;
        for (let i = 0; i < spokeCount; i++) {
            const angle = (i / spokeCount) * Math.PI * 2;
            const spokeGeometry = new THREE.BoxGeometry(0.4, 0.4, 11.8);
            const spoke = new THREE.Mesh(spokeGeometry, this.materials.wheel);
            spoke.rotation.x = angle;
            wheelGroup.add(spoke);
        }
        
        // Wheel stand/support
        const standGeometry = new THREE.BoxGeometry(2, 14, 2);
        const stand = new THREE.Mesh(standGeometry, this.materials.wheel);
        stand.position.set(0, -7, 0);
        wheelGroup.add(stand);
        
        // Crossbar support
        const crossbarGeometry = new THREE.BoxGeometry(8, 1, 1);
        const crossbar = new THREE.Mesh(crossbarGeometry, this.materials.wheel);
        crossbar.position.set(0, -2, 0);
        wheelGroup.add(crossbar);
        
        // Position the wheel in the cage
        wheelGroup.position.set(20, 8, -20);
        wheelGroup.rotation.y = Math.PI / 4;
        
        this.cageGroup.add(wheelGroup);
    }
    
    createHouse() {
        // Create a simple hamster house/tunnel - scaled up
        const houseGroup = new THREE.Group();
        
        // Main house (half-cylinder)
        const houseGeometry = new THREE.CylinderGeometry(
            6, 6, 10, 8, 1, false, 0, Math.PI
        );
        const house = new THREE.Mesh(houseGeometry, this.materials.house);
        house.rotation.z = Math.PI / 2;
        house.rotation.y = Math.PI;
        houseGroup.add(house);
        
        // Floor of the house
        const floorGeometry = new THREE.PlaneGeometry(10, 12);
        const floor = new THREE.Mesh(floorGeometry, this.materials.house);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -6;
        houseGroup.add(floor);
        
        // Entrance hole
        const entranceGeometry = new THREE.CircleGeometry(3, 8);
        const entrance = new THREE.Mesh(
            entranceGeometry, 
            new THREE.MeshBasicMaterial({ 
                color: 0x000000,
                side: THREE.DoubleSide 
            })
        );
        entrance.position.set(0, 0, -6);
        entrance.rotation.y = Math.PI;
        houseGroup.add(entrance);
        
        // Position the house in the cage
        houseGroup.position.set(-20, 6, -20);
        
        this.cageGroup.add(houseGroup);
    }
    
    createTunnel() {
        // Create a tunnel toy for the hamster
        const tunnelGroup = new THREE.Group();
        
        // Main tunnel tube (open-ended cylinder)
        const tunnelGeometry = new THREE.CylinderGeometry(3, 3, 15, 16, 1, true);
        const tunnel = new THREE.Mesh(
            tunnelGeometry,
            new THREE.MeshBasicMaterial({
                color: 0x2ECC71, // Green
                side: THREE.DoubleSide
            })
        );
        
        // Rotate to lay horizontally
        tunnel.rotation.z = Math.PI / 2;
        tunnelGroup.add(tunnel);
        
        // Add decorative rings at the ends of the tunnel
        const ringGeometry = new THREE.TorusGeometry(3, 0.4, 8, 16);
        
        // First ring
        const ring1 = new THREE.Mesh(
            ringGeometry,
            new THREE.MeshBasicMaterial({ color: 0x27AE60 })
        );
        ring1.position.set(7.5, 0, 0);
        ring1.rotation.y = Math.PI / 2;
        tunnelGroup.add(ring1);
        
        // Second ring
        const ring2 = new THREE.Mesh(
            ringGeometry,
            new THREE.MeshBasicMaterial({ color: 0x27AE60 })
        );
        ring2.position.set(-7.5, 0, 0);
        ring2.rotation.y = Math.PI / 2;
        tunnelGroup.add(ring2);
        
        // Position the tunnel in the cage
        tunnelGroup.position.set(20, 3, 0);
        tunnelGroup.rotation.y = Math.PI / 4; // Angle it slightly
        
        this.cageGroup.add(tunnelGroup);
    }
    
    createFoodPellets() {
        // Create scattered food pellets on the bedding
        const pelletGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 6);
        const pelletMaterial = new THREE.MeshBasicMaterial({ color: 0xA0522D }); // Brown color
        
        // Create and position random pellets
        const pelletCount = 40;
        const arenaWidth = 55; // Slightly smaller than cage to keep inside
        const arenaDepth = 55;
        
        // Group to hold all pellets for better scene organization
        const pelletsGroup = new THREE.Group();
        
        for (let i = 0; i < pelletCount; i++) {
            const pellet = new THREE.Mesh(pelletGeometry, pelletMaterial);
            
            // Random position within arena
            const x = (Math.random() - 0.5) * arenaWidth;
            const z = (Math.random() - 0.5) * arenaDepth;
            
            // Avoid placement near accessories
            const avoidAreas = [
                { x: 20, z: 20, radius: 8 },    // Food bowl
                { x: 20, z: -20, radius: 8 },   // Exercise wheel
                { x: -20, z: -20, radius: 8 },  // House
                { x: 20, z: 0, radius: 8 }      // Tunnel
            ];
            
            let validPosition = true;
            for (const area of avoidAreas) {
                const distance = Math.sqrt(Math.pow(x - area.x, 2) + Math.pow(z - area.z, 2));
                if (distance < area.radius) {
                    validPosition = false;
                    break;
                }
            }
            
            if (!validPosition) {
                // Try again with this pellet
                i--;
                continue;
            }
            
            // Position just above the bedding
            pellet.position.set(x, 1.1, z);
            
            // Random rotation for natural look
            pellet.rotation.x = Math.PI / 2; // Make it lie flat
            pellet.rotation.z = Math.random() * Math.PI * 2;
            
            pelletsGroup.add(pellet);
        }
        
        this.cageGroup.add(pelletsGroup);
    }
} 