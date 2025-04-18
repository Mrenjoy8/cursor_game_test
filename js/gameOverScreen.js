export class GameOverScreen {
    constructor(score, wave, playAgainCallback) {
        this.score = score;
        this.wave = wave;
        this.playAgainCallback = playAgainCallback;
        this.createGameOverScreen();
    }
    
    createGameOverScreen() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'game-over';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'GAME OVER';
        title.style.fontSize = '42px';
        title.style.marginBottom = '20px';
        title.style.color = 'var(--pink)';
        title.style.textShadow = '0 0 10px rgba(228, 147, 179, 0.5)';
        this.container.appendChild(title);
        
        // Divider
        const divider = document.createElement('div');
        divider.style.width = '80%';
        divider.style.height = '2px';
        divider.style.background = 'linear-gradient(90deg, transparent, var(--white), transparent)';
        divider.style.margin = '0 auto 30px';
        divider.style.opacity = '0.5';
        this.container.appendChild(divider);
        
        // Stats container
        const statsContainer = document.createElement('div');
        statsContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
        statsContainer.style.borderRadius = '15px';
        statsContainer.style.padding = '20px';
        statsContainer.style.marginBottom = '30px';
        statsContainer.style.boxShadow = 'var(--shadow)';
        this.container.appendChild(statsContainer);
        
        // Create stats display
        const stats = [
            { label: 'SCORE', value: this.score },
            { label: 'WAVE REACHED', value: this.wave }
        ];
        
        stats.forEach(stat => {
            const statRow = document.createElement('div');
            statRow.style.display = 'flex';
            statRow.style.justifyContent = 'space-between';
            statRow.style.alignItems = 'center';
            statRow.style.marginBottom = '15px';
            
            const label = document.createElement('div');
            label.textContent = stat.label;
            label.style.fontSize = '16px';
            label.style.color = 'var(--light-brown)';
            statRow.appendChild(label);
            
            const value = document.createElement('div');
            value.textContent = stat.value;
            value.style.fontSize = '24px';
            value.style.fontWeight = 'bold';
            value.style.color = 'var(--white)';
            statRow.appendChild(value);
            
            statsContainer.appendChild(statRow);
        });
        
        // Play again button
        const playAgainBtn = document.createElement('button');
        playAgainBtn.className = 'menu-button';
        playAgainBtn.style.marginBottom = '15px';
        
        // Add icon to button
        const iconSpan = document.createElement('span');
        iconSpan.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path>
        </svg>`;
        iconSpan.style.marginRight = '12px';
        playAgainBtn.appendChild(iconSpan);
        
        const btnText = document.createElement('span');
        btnText.textContent = 'Play Again';
        playAgainBtn.appendChild(btnText);
        
        playAgainBtn.addEventListener('click', () => {
            this.playAgainCallback();
            this.hide();
        });
        this.container.appendChild(playAgainBtn);
        
        // Back to menu button
        const menuBtn = document.createElement('button');
        menuBtn.className = 'menu-button';
        menuBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        
        // Add icon to button
        const menuIconSpan = document.createElement('span');
        menuIconSpan.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
        </svg>`;
        menuIconSpan.style.marginRight = '12px';
        menuBtn.appendChild(menuIconSpan);
        
        const menuBtnText = document.createElement('span');
        menuBtnText.textContent = 'Back to Menu';
        menuBtn.appendChild(menuBtnText);
        
        menuBtn.addEventListener('click', () => {
            // Reload the page to go back to menu
            window.location.reload();
        });
        this.container.appendChild(menuBtn);
        
        // Add to document
        document.body.appendChild(this.container);
    }
    
    hide() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 