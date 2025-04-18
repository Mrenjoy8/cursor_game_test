export function setupGlobalStyles() {
    // Create a style element
    const style = document.createElement('style');
    
    // CSS styles as a template string
    style.textContent = `
        /* Base styles */
        body {
            margin: 0;
            overflow: hidden;
            background-color: #000;
            font-family: 'Arial', sans-serif;
        }
        
        canvas {
            display: block;
        }
        
        /* Menu screen styles */
        .menu-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            z-index: 1000;
        }
        
        /* Menu buttons with hover effect */
        .menu-button {
            background-color: #ff3300;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 24px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
            width: 100%;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 8px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        
        .menu-button:hover {
            background-color: #ff6600;
            transform: scale(1.05);
            box-shadow: 0 6px 10px rgba(0, 0, 0, 0.4);
        }
        
        /* Enemy card styling */
        .enemy-card {
            background-color: rgba(50, 50, 50, 0.8);
            border-radius: 10px;
            padding: 20px;
            width: 300px;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .enemy-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
        }
        
        /* Game HUD elements */
        .health-bar, .exp-bar {
            border-radius: 4px;
            overflow: hidden;
            position: relative;
            transition: width 0.3s;
        }
        
        /* Game over screen */
        .game-over {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            z-index: 1100;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
            border: 2px solid #ff0000;
        }
    `;
    
    // Add the style element to the head
    document.head.appendChild(style);
}

// Automatically apply the styles when this module is imported
setupGlobalStyles(); 