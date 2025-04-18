export function setupGlobalStyles() {
    // Create a style element
    const style = document.createElement('style');
    
    // CSS styles as a template string
    style.textContent = `
        /* Color Palette */
        :root {
            --primary-green: #2c7a51;
            --light-green: #4CAF50;
            --white: #fff;
            --light-brown: #d4bc91;
            --pink: #e493b3;
            --bg-gradient: linear-gradient(135deg, #1c5c3c 0%, #2c7a51 100%);
            --panel-bg: rgba(255, 255, 255, 0.15);
            --shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
        }
        
        /* Base styles */
        body {
            margin: 0;
            overflow: hidden;
            background: var(--bg-gradient);
            font-family: 'Exo 2', sans-serif;
            color: var(--white);
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
            background: var(--bg-gradient), url('/js/assets/grind_main_bg_v1.png') center/cover no-repeat;
            background-blend-mode: overlay;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            color: var(--white);
            z-index: 1000;
            overflow-y: auto;
        }
        
        /* Menu buttons with hover effect */
        .menu-button {
            background-color: var(--primary-green);
            color: var(--white);
            border: none;
            padding: 16px 30px;
            font-size: 20px;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s;
            width: 100%;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 10px 0;
            box-shadow: var(--shadow);
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .menu-button:hover {
            background-color: var(--light-green);
            transform: translateY(-3px);
        }
        
        .menu-button:active {
            transform: translateY(0);
        }
        
        .menu-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transform: translateX(-100%);
            transition: 0.6s;
        }
        
        .menu-button:hover::before {
            transform: translateX(100%);
        }
        
        /* Section containers */
        .content-container {
            background: var(--panel-bg);
            backdrop-filter: blur(4px);
            border-radius: 24px;
            padding: 25px;
            margin-bottom: 20px;
            width: 100%;
            box-sizing: border-box;
            box-shadow: var(--shadow);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        /* Enemy card styling */
        .enemy-card {
            background: var(--panel-bg);
            backdrop-filter: blur(4px);
            border-radius: 20px;
            padding: 20px;
            transition: transform 0.3s, box-shadow 0.3s;
            box-shadow: var(--shadow);
            border: 1px solid rgba(255, 255, 255, 0.18);
            margin-bottom: 10px;
        }
        
        .enemy-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        
        /* Game HUD elements */
        .hud-container {
            position: absolute;
            bottom: 20px;
            left: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 100;
        }
        
        .health-bar-container, .exp-bar-container {
            width: 300px;
            height: 20px;
            background: var(--panel-bg);
            backdrop-filter: blur(4px);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: var(--shadow);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        .health-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--pink) 0%, #f06292 100%);
            border-radius: 10px;
            transition: width 0.3s;
        }
        
        .exp-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--light-brown) 0%, #e6cc9f 100%);
            border-radius: 10px;
            transition: width 0.3s;
        }
        
        .status-indicator {
            position: absolute;
            top: 20px;
            right: 20px;
            background: var(--panel-bg);
            backdrop-filter: blur(4px);
            border-radius: 20px;
            padding: 10px 20px;
            font-size: 18px;
            box-shadow: var(--shadow);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        /* Game over screen */
        .game-over {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--panel-bg);
            backdrop-filter: blur(8px);
            color: var(--white);
            padding: 40px;
            border-radius: 30px;
            text-align: center;
            z-index: 1100;
            box-shadow: var(--shadow);
            border: 1px solid rgba(255, 255, 255, 0.18);
            max-width: 90%;
            width: 400px;
        }
        
        /* Media queries for responsive design */
        @media (max-width: 768px) {
            .content-container {
                padding: 20px 15px;
                border-radius: 18px;
            }
            
            .health-bar-container, .exp-bar-container {
                width: 250px;
            }
            
            .game-over {
                padding: 30px 20px;
                width: 80%;
            }
            
            .menu-button {
                padding: 14px 20px;
                font-size: 18px;
            }
            
            .status-indicator {
                font-size: 16px;
                padding: 8px 15px;
            }
        }
        
        @media (max-width: 480px) {
            .menu-screen {
                padding: 20px 15px 80px;
            }
            
            h1 {
                font-size: 36px !important;
            }
            
            h2 {
                font-size: 32px !important;
            }
            
            h3 {
                font-size: 22px !important;
            }
            
            .health-bar-container, .exp-bar-container {
                width: 200px;
            }
            
            .game-over {
                padding: 25px 15px;
                width: 90%;
            }
            
            .menu-button {
                padding: 12px 16px;
                font-size: 16px;
            }
            
            .status-indicator {
                font-size: 14px;
                padding: 6px 12px;
                top: 10px;
                right: 10px;
            }
            
            .hud-container {
                bottom: 10px;
                left: 10px;
            }
        }
    `;
    
    // Add the style element to the head
    document.head.appendChild(style);
}

// Automatically apply the styles when this module is imported
setupGlobalStyles(); 