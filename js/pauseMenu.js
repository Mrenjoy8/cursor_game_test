export class PauseMenu {
    constructor(resumeCallback, restartCallback, quitCallback) {
        this.resumeCallback = resumeCallback;
        this.restartCallback = restartCallback;
        this.quitCallback = quitCallback;
        this.isPaused = false;
        
        // Create container but don't add to DOM yet
        this.createPauseMenu();
        
        // Setup ESC key listener
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.togglePause();
        }
    }
    
    togglePause() {
        if (this.isPaused) {
            this.unpause();
        } else {
            this.pause();
        }
    }
    
    pause() {
        this.isPaused = true;
        document.body.appendChild(this.container);
        
        // Notify game to stop updates
        if (window.gameState) {
            window.gameState.isPaused = true;
        }
    }
    
    unpause() {
        this.isPaused = false;
        document.body.removeChild(this.container);
        
        // Notify game to resume updates
        if (window.gameState) {
            window.gameState.isPaused = false;
        }
        
        // Call resume callback
        if (this.resumeCallback) {
            this.resumeCallback();
        }
    }
    
    createPauseMenu() {
        // Create backdrop with blur
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        this.container.style.backdropFilter = 'blur(8px)';
        this.container.style.display = 'flex';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '1000';
        
        // Create pause menu panel
        const panel = document.createElement('div');
        panel.style.backgroundColor = 'var(--panel-bg)';
        panel.style.backdropFilter = 'blur(4px)';
        panel.style.borderRadius = '24px';
        panel.style.padding = '30px';
        panel.style.width = '400px';
        panel.style.boxShadow = 'var(--shadow)';
        panel.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.alignItems = 'center';
        this.container.appendChild(panel);
        
        // Pause title
        const title = document.createElement('h2');
        title.textContent = 'PAUSED';
        title.style.fontSize = '42px';
        title.style.marginBottom = '30px';
        title.style.color = 'var(--white)';
        title.style.textShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
        panel.appendChild(title);
        
        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = 'column';
        buttonsContainer.style.width = '100%';
        buttonsContainer.style.gap = '15px';
        panel.appendChild(buttonsContainer);
        
        // Resume button
        const resumeBtn = this.createButton('Resume Game', 'play_arrow', () => {
            this.unpause();
        });
        buttonsContainer.appendChild(resumeBtn);
        
        // Restart button
        const restartBtn = this.createButton('Restart Game', 'replay', () => {
            this.unpause();
            if (this.restartCallback) {
                this.restartCallback();
            }
        });
        buttonsContainer.appendChild(restartBtn);
        
        // Quit button
        const quitBtn = this.createButton('Quit to Menu', 'exit_to_app', () => {
            this.unpause();
            if (this.quitCallback) {
                this.quitCallback();
            }
        });
        quitBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        buttonsContainer.appendChild(quitBtn);
        
        // Control reminder
        const controlReminder = document.createElement('p');
        controlReminder.textContent = 'Press ESC to resume';
        controlReminder.style.color = 'var(--white)';
        controlReminder.style.opacity = '0.7';
        controlReminder.style.fontSize = '14px';
        controlReminder.style.marginTop = '20px';
        panel.appendChild(controlReminder);
    }
    
    createButton(text, iconName, callback) {
        const button = document.createElement('button');
        button.className = 'menu-button';
        
        if (iconName) {
            // Add icon
            const iconSpan = document.createElement('span');
            iconSpan.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                ${this.getIconPath(iconName)}
            </svg>`;
            iconSpan.style.marginRight = '12px';
            button.appendChild(iconSpan);
        }
        
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        button.appendChild(textSpan);
        
        button.addEventListener('click', callback);
        
        return button;
    }
    
    getIconPath(iconName) {
        const icons = {
            'play_arrow': '<path d="M8 5v14l11-7z"></path>',
            'replay': '<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"></path>',
            'exit_to_app': '<path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"></path>'
        };
        
        return icons[iconName] || '';
    }
    
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 