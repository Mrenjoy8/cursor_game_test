export class UI {
    constructor(player) {
        this.player = player;
        
        // Create UI elements
        this.createUI();
        
        // Update UI regularly
        this.updateInterval = setInterval(() => this.updateUI(), 100);
    }
    
    createUI() {
        // Create UI container
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '20px';
        this.container.style.left = '20px';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.zIndex = '100';
        document.body.appendChild(this.container);
        
        // Health bar container
        this.healthBarContainer = document.createElement('div');
        this.healthBarContainer.style.width = '200px';
        this.healthBarContainer.style.height = '20px';
        this.healthBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.healthBarContainer.style.border = '2px solid #fff';
        this.healthBarContainer.style.borderRadius = '4px';
        this.healthBarContainer.style.position = 'relative';
        this.healthBarContainer.style.marginBottom = '10px';
        this.container.appendChild(this.healthBarContainer);
        
        // Health bar
        this.healthBar = document.createElement('div');
        this.healthBar.style.height = '100%';
        this.healthBar.style.backgroundColor = '#f00';
        this.healthBar.style.width = '100%';
        this.healthBar.style.position = 'absolute';
        this.healthBar.style.transition = 'width 0.3s';
        this.healthBarContainer.appendChild(this.healthBar);
        
        // Health text
        this.healthText = document.createElement('div');
        this.healthText.style.position = 'absolute';
        this.healthText.style.width = '100%';
        this.healthText.style.textAlign = 'center';
        this.healthText.style.fontWeight = 'bold';
        this.healthText.style.lineHeight = '20px';
        this.healthText.style.textShadow = '1px 1px 1px #000';
        this.healthBarContainer.appendChild(this.healthText);
        
        // Level container
        this.levelContainer = document.createElement('div');
        this.levelContainer.style.display = 'flex';
        this.levelContainer.style.alignItems = 'center';
        this.levelContainer.style.marginBottom = '10px';
        this.container.appendChild(this.levelContainer);
        
        // Level label
        this.levelLabel = document.createElement('div');
        this.levelLabel.style.marginRight = '10px';
        this.levelLabel.style.fontWeight = 'bold';
        this.levelLabel.textContent = 'Level:';
        this.levelContainer.appendChild(this.levelLabel);
        
        // Level value
        this.levelValue = document.createElement('div');
        this.levelValue.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.levelValue.style.padding = '5px 10px';
        this.levelValue.style.borderRadius = '4px';
        this.levelContainer.appendChild(this.levelValue);
        
        // Experience bar container
        this.expBarContainer = document.createElement('div');
        this.expBarContainer.style.width = '200px';
        this.expBarContainer.style.height = '10px';
        this.expBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.expBarContainer.style.border = '1px solid #fff';
        this.expBarContainer.style.borderRadius = '4px';
        this.expBarContainer.style.position = 'relative';
        this.container.appendChild(this.expBarContainer);
        
        // Experience bar
        this.expBar = document.createElement('div');
        this.expBar.style.height = '100%';
        this.expBar.style.backgroundColor = '#0f0';
        this.expBar.style.width = '0%';
        this.expBar.style.position = 'absolute';
        this.expBar.style.transition = 'width 0.3s';
        this.expBarContainer.appendChild(this.expBar);
        
        // Experience text
        this.expText = document.createElement('div');
        this.expText.style.position = 'absolute';
        this.expText.style.width = '100%';
        this.expText.style.textAlign = 'center';
        this.expText.style.fontSize = '8px';
        this.expText.style.fontWeight = 'bold';
        this.expText.style.lineHeight = '10px';
        this.expText.style.textShadow = '1px 1px 1px #000';
        this.expBarContainer.appendChild(this.expText);
    }
    
    updateUI() {
        if (!this.player) return;
        
        // Update health bar
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        this.healthBar.style.width = `${healthPercent}%`;
        this.healthText.textContent = `${this.player.health}/${this.player.maxHealth}`;
        
        // Update level display
        this.levelValue.textContent = this.player.level;
        
        // Update experience bar
        const expPercent = (this.player.experience / this.player.experienceToNextLevel) * 100;
        this.expBar.style.width = `${expPercent}%`;
        this.expText.textContent = `XP: ${this.player.experience}/${this.player.experienceToNextLevel}`;
    }
    
    destroy() {
        clearInterval(this.updateInterval);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 