import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';

export class CameraController {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target; // The player or object to follow
        
        // Camera parameters
        this.distance = 10; // Distance from player
        this.height = 5; // Height above player
        this.rotationSpeed = 0.002;
        this.smoothFactor = 0.1; // Lower for smoother camera, higher for more responsive
        
        // Current camera values
        this.currentRotation = 0;
        this.targetPosition = new THREE.Vector3();
        this.cameraPosition = new THREE.Vector3();
        
        // Mouse state for camera rotation
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Set up mouse event listeners
        this.setupMouseHandlers();
    }
    
    setupMouseHandlers() {
        // Mouse down event
        document.addEventListener('mousedown', (event) => {
            if (event.button === 2) { // Right mouse button
                this.mouseDown = true;
                this.mouseX = event.clientX;
                this.mouseY = event.clientY;
            }
        });
        
        // Mouse up event
        document.addEventListener('mouseup', (event) => {
            if (event.button === 2) { // Right mouse button
                this.mouseDown = false;
            }
        });
        
        // Mouse move event
        document.addEventListener('mousemove', (event) => {
            if (this.mouseDown) {
                const deltaX = event.clientX - this.mouseX;
                this.mouseX = event.clientX;
                this.mouseY = event.clientY;
                
                // Rotate camera based on mouse movement
                this.currentRotation -= deltaX * this.rotationSpeed;
            }
        });
        
        // Prevent context menu on right-click
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    update() {
        if (!this.target) return;
        
        // Get the target's position
        const targetPosition = this.target.getPosition();
        
        // Calculate ideal camera position
        const idealOffset = new THREE.Vector3(
            Math.sin(this.currentRotation) * this.distance,
            this.height,
            Math.cos(this.currentRotation) * this.distance
        );
        
        // Add offset to target position
        this.targetPosition.copy(targetPosition);
        this.cameraPosition.copy(targetPosition).add(idealOffset);
        
        // Smoothly interpolate camera position
        this.camera.position.lerp(this.cameraPosition, this.smoothFactor);
        
        // Make camera look at target
        this.camera.lookAt(
            targetPosition.x,
            targetPosition.y + 1.5, // Look at head level
            targetPosition.z
        );
    }
} 