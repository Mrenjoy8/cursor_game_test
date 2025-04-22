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
        this.container.className = 'hud-container';
        document.body.appendChild(this.container);
        
        // Player stats container
        this.statsContainer = document.createElement('div');
        this.statsContainer.style.backgroundColor = 'var(--panel-bg)';
        this.statsContainer.style.backdropFilter = 'blur(4px)';
        this.statsContainer.style.borderRadius = '16px';
        this.statsContainer.style.padding = '15px';
        this.statsContainer.style.marginBottom = '15px';
        this.statsContainer.style.boxShadow = 'var(--shadow)';
        this.statsContainer.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        this.container.appendChild(this.statsContainer);
        
        // Level and avatar container
        this.avatarContainer = document.createElement('div');
        this.avatarContainer.style.display = 'flex';
        this.avatarContainer.style.alignItems = 'center';
        this.avatarContainer.style.marginBottom = '15px';
        this.statsContainer.appendChild(this.avatarContainer);
        
        // Player avatar placeholder
        this.avatarCircle = document.createElement('div');
        this.avatarCircle.style.width = '40px';
        this.avatarCircle.style.height = '40px';
        this.avatarCircle.style.borderRadius = '50%';
        this.avatarCircle.style.backgroundColor = 'var(--light-brown)'; // Fallback background
        this.avatarCircle.style.marginRight = '15px';
        this.avatarCircle.style.display = 'flex';
        this.avatarCircle.style.justifyContent = 'center';
        this.avatarCircle.style.alignItems = 'center';
        this.avatarCircle.style.boxShadow = 'var(--shadow)';
        this.avatarCircle.style.border = '2px solid var(--white)';
        this.avatarCircle.style.backgroundSize = 'cover';
        this.avatarCircle.style.backgroundPosition = 'center';
        this.avatarCircle.style.overflow = 'hidden';
        
        // Try to load and display the Hat01.png image
        const avatarImage = new Image();
        avatarImage.src = '/assets/Hat01.png';
        avatarImage.onload = () => {
            this.avatarCircle.style.backgroundImage = `url('/assets/Hat01.png')`;
        };
        avatarImage.onerror = (err) => {
            console.warn('Failed to load avatar image, using fallback color', err);
            // Keep the fallback color that's already set
        };
        
        this.avatarContainer.appendChild(this.avatarCircle);
        
        // Level display
        this.levelContainer = document.createElement('div'); 
        this.levelContainer.style.display = 'flex';
        this.levelContainer.style.flexDirection = 'column';
        this.avatarContainer.appendChild(this.levelContainer);
        
        // Level label
        this.levelLabel = document.createElement('div');
        this.levelLabel.textContent = 'LEVEL';
        this.levelLabel.style.fontSize = '12px';
        this.levelLabel.style.color = 'var(--light-brown)';
        this.levelLabel.style.marginBottom = '2px';
        this.levelContainer.appendChild(this.levelLabel);
        
        // Level value
        this.levelValue = document.createElement('div');
        this.levelValue.style.fontSize = '20px';
        this.levelValue.style.fontWeight = 'bold';
        this.levelValue.style.color = 'var(--white)';
        this.levelContainer.appendChild(this.levelValue);
        
        // Bars container
        this.barsContainer = document.createElement('div');
        this.barsContainer.style.display = 'flex';
        this.barsContainer.style.flexDirection = 'column';
        this.barsContainer.style.gap = '10px';
        this.statsContainer.appendChild(this.barsContainer);
        
        // Health section
        this.healthSection = document.createElement('div');
        this.barsContainer.appendChild(this.healthSection);
        
        // Health label
        this.healthLabel = document.createElement('div');
        this.healthLabel.textContent = 'HEALTH';
        this.healthLabel.style.fontSize = '12px';
        this.healthLabel.style.color = 'var(--pink)';
        this.healthLabel.style.marginBottom = '5px';
        this.healthSection.appendChild(this.healthLabel);
        
        // Health bar container
        this.healthBarContainer = document.createElement('div');
        this.healthBarContainer.className = 'health-bar-container';
        this.healthSection.appendChild(this.healthBarContainer);
        
        // Health bar
        this.healthBar = document.createElement('div');
        this.healthBar.className = 'health-bar';
        this.healthBarContainer.appendChild(this.healthBar);
        
        // Health text
        this.healthText = document.createElement('div');
        this.healthText.style.position = 'absolute';
        this.healthText.style.width = '100%';
        this.healthText.style.textAlign = 'center';
        this.healthText.style.fontWeight = 'bold';
        this.healthText.style.lineHeight = '20px';
        this.healthText.style.fontSize = '12px';
        this.healthText.style.textShadow = '0 0 3px rgba(0, 0, 0, 0.5)';
        this.healthText.style.color = 'var(--white)';
        this.healthBarContainer.appendChild(this.healthText);
        
        // Experience section
        this.expSection = document.createElement('div');
        this.barsContainer.appendChild(this.expSection);
        
        // Experience label
        this.expLabel = document.createElement('div');
        this.expLabel.textContent = 'EXPERIENCE';
        this.expLabel.style.fontSize = '12px';
        this.expLabel.style.color = 'var(--light-brown)';
        this.expLabel.style.marginBottom = '5px';
        this.expSection.appendChild(this.expLabel);
        
        // Experience bar container
        this.expBarContainer = document.createElement('div');
        this.expBarContainer.className = 'exp-bar-container';
        this.expSection.appendChild(this.expBarContainer);
        
        // Experience bar
        this.expBar = document.createElement('div');
        this.expBar.className = 'exp-bar';
        this.expBarContainer.appendChild(this.expBar);
        
        // Experience text
        this.expText = document.createElement('div');
        this.expText.style.position = 'absolute';
        this.expText.style.width = '100%';
        this.expText.style.textAlign = 'center';
        this.expText.style.fontSize = '12px';
        this.expText.style.fontWeight = 'bold';
        this.expText.style.lineHeight = '20px';
        this.expText.style.textShadow = '0 0 3px rgba(0, 0, 0, 0.5)';
        this.expText.style.color = 'var(--white)';
        this.expBarContainer.appendChild(this.expText);
        
        // Wave indicator
        this.waveIndicator = document.createElement('div');
        this.waveIndicator.className = 'status-indicator';
        this.waveIndicator.textContent = 'WAVE 1';
        document.body.appendChild(this.waveIndicator);
    }
    
    updateUI() {
        if (!this.player) return;
        
        // Update health bar
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        this.healthBar.style.width = `${healthPercent}%`;
        this.healthText.textContent = `${Math.floor(this.player.health)}/${this.player.maxHealth}`;
        
        // Update level display
        this.levelValue.textContent = this.player.level;
        
        // Update experience bar
        const expPercent = (this.player.experience / this.player.experienceToNextLevel) * 100;
        this.expBar.style.width = `${expPercent}%`;
        this.expText.textContent = `${this.player.experience}/${this.player.experienceToNextLevel}`;
        
        // Update wave indicator if available
        if (window.gameState && window.gameState.waveManager) {
            this.waveIndicator.textContent = `WAVE ${window.gameState.waveManager.currentWave}`;
        }
    }
    
    destroy() {
        clearInterval(this.updateInterval);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this.waveIndicator && this.waveIndicator.parentNode) {
            this.waveIndicator.parentNode.removeChild(this.waveIndicator);
        }
    }
} 