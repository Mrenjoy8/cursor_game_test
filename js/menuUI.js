import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';

export class MenuUI {
    constructor(startGameCallback) {
        this.startGameCallback = startGameCallback;
        this.currentScreen = null;
        this.screens = {
            main: null,
            howToPlay: null,
            enemyWiki: null
        };
        
        // Create main menu UI
        this.createMainMenu();
    }
    
    createMainMenu() {
        // Remove any existing UI
        if (this.currentScreen) {
            document.body.removeChild(this.currentScreen);
        }
        
        // Create main menu container
        const menu = document.createElement('div');
        menu.className = 'menu-screen';
        
        // Game title
        const title = document.createElement('h1');
        title.textContent = 'GRIND or DIE';
        title.style.fontSize = '64px';
        title.style.marginBottom = '20px';
        title.style.color = 'var(--white)';
        title.style.textShadow = '0 0 20px rgba(76, 175, 80, 0.7)';
        title.style.fontWeight = '700';
        title.style.letterSpacing = '4px';
        menu.appendChild(title);
        
        // Subtitle
        /*const subtitle = document.createElement('p');
        subtitle.textContent = 'Get out before they catch you';
        subtitle.style.fontSize = '24px';
        subtitle.style.marginBottom = '60px';
        subtitle.style.color = 'var(--white)';
        subtitle.style.opacity = '0.9';
        menu.appendChild(subtitle);*/
        
        // Menu buttons container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '15px';
        buttonContainer.style.width = '300px';
        menu.appendChild(buttonContainer);
        
        // Start Game button
        const startBtn = this.createMenuButton('Start Game', 'play_arrow');
        startBtn.addEventListener('click', () => {
            this.startGameCallback();
        });
        buttonContainer.appendChild(startBtn);
        
        // How To Play button
        const howToPlayBtn = this.createMenuButton('How to Play', 'menu_book');
        howToPlayBtn.addEventListener('click', () => {
            this.showHowToPlay();
        });
        buttonContainer.appendChild(howToPlayBtn);
        
        // Enemy Wiki button
        const wikiBtn = this.createMenuButton('Enemies Wiki', 'security');
        wikiBtn.addEventListener('click', () => {
            this.showEnemyWiki();
        });
        buttonContainer.appendChild(wikiBtn);
        
        // Copyright text
        const copyright = document.createElement('p');
        copyright.textContent = '© 2025 BearishAF & GRIND. All rights reserved.';
        copyright.style.position = 'absolute';
        copyright.style.bottom = '20px';
        copyright.style.fontSize = '14px';
        copyright.style.color = 'var(--white)';
        copyright.style.opacity = '0.7';
        menu.appendChild(copyright);
        
        // Add to page
        document.body.appendChild(menu);
        this.currentScreen = menu;
        this.screens.main = menu;
    }
    
    createMenuButton(text, iconName = '') {
        const button = document.createElement('button');
        button.className = 'menu-button';
        
        if (iconName) {
            // Create an icon element
            const icon = document.createElement('span');
            icon.className = 'button-icon';
            icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                ${this.getIconPath(iconName)}
            </svg>`;
            icon.style.marginRight = '12px';
            button.appendChild(icon);
        }
        
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        button.appendChild(textSpan);
        
        return button;
    }
    
    getIconPath(iconName) {
        const icons = {
            'play_arrow': '<path d="M8 5v14l11-7z"></path>',
            'menu_book': '<path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"></path>',
            'security': '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"></path>'
        };
        
        return icons[iconName] || '';
    }
    
    showHowToPlay() {
        // Remove any existing UI
        if (this.currentScreen) {
            document.body.removeChild(this.currentScreen);
        }
        
        // Create how to play container
        const howToPlay = document.createElement('div');
        howToPlay.className = 'menu-screen';
        howToPlay.style.justifyContent = 'flex-start';
        howToPlay.style.padding = '40px 20px 100px'; // Added bottom padding for button
        howToPlay.style.overflowY = 'auto';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'HOW TO PLAY';
        title.style.fontSize = '42px';
        title.style.marginBottom = '40px';
        title.style.color = 'var(--white)';
        title.style.textAlign = 'center';
        title.style.textShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
        howToPlay.appendChild(title);
        
        // Main content wrapper for max-width constraint
        const contentWrapper = document.createElement('div');
        contentWrapper.style.width = '100%';
        contentWrapper.style.maxWidth = '800px';
        contentWrapper.style.margin = '0 auto';
        howToPlay.appendChild(contentWrapper);
        
        // Controls section
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'content-container';
        contentWrapper.appendChild(controlsContainer);
        
        const controlsTitle = document.createElement('h3');
        controlsTitle.textContent = 'CONTROLS';
        controlsTitle.style.fontSize = '28px';
        controlsTitle.style.marginBottom = '20px';
        controlsTitle.style.color = 'var(--light-brown)';
        controlsContainer.appendChild(controlsTitle);
        
        const controlsList = document.createElement('ul');
        controlsList.style.listStyleType = 'none';
        controlsList.style.padding = '0';
        controlsList.style.fontSize = '18px';
        controlsList.style.lineHeight = '1.5';
        controlsList.style.width = '100%';
        controlsContainer.appendChild(controlsList);
        
        // Add controls
        const controls = [
            { key: 'W, A, S, D', desc: 'Move character' },
            { key: 'AIM', desc: 'Auto attack the nearest enemy' },
            { key: 'RIGHT CLICK', desc: 'Hold to drag camera view' },
            { key: 'ESC', desc: 'Pause game' }
        ];
        
        controls.forEach(control => {
            const item = document.createElement('li');
            item.style.marginBottom = '15px';
            item.style.display = 'flex';
            item.style.flexWrap = 'wrap';
            item.style.alignItems = 'center';
            
            const keySpan = document.createElement('span');
            keySpan.textContent = control.key;
            keySpan.style.backgroundColor = 'var(--primary-green)';
            keySpan.style.color = 'var(--white)';
            keySpan.style.padding = '8px 12px';
            keySpan.style.borderRadius = '12px';
            keySpan.style.minWidth = '120px';
            keySpan.style.display = 'inline-block';
            keySpan.style.marginRight = '20px';
            keySpan.style.marginBottom = '5px';
            keySpan.style.textAlign = 'center';
            keySpan.style.fontWeight = 'bold';
            keySpan.style.boxShadow = 'var(--shadow)';
            item.appendChild(keySpan);
            
            const descSpan = document.createElement('span');
            descSpan.textContent = control.desc;
            descSpan.style.color = 'var(--white)';
            descSpan.style.flex = '1';
            item.appendChild(descSpan);
            
            controlsList.appendChild(item);
        });
        
        // Gameplay section
        const gameplayContainer = document.createElement('div');
        gameplayContainer.className = 'content-container';
        contentWrapper.appendChild(gameplayContainer);
        
        const gameplayTitle = document.createElement('h3');
        gameplayTitle.textContent = 'GAMEPLAY';
        gameplayTitle.style.fontSize = '28px';
        gameplayTitle.style.marginBottom = '20px';
        gameplayTitle.style.color = 'var(--light-brown)';
        gameplayContainer.appendChild(gameplayTitle);
        
        const gameplayDesc = document.createElement('div');
        gameplayDesc.style.lineHeight = '1.8';
        gameplayDesc.style.fontSize = '18px';
        gameplayDesc.style.color = 'var(--white)';
        gameplayContainer.appendChild(gameplayDesc);
        
        // Using gameplay points with icons
        const gameplayPoints = [
            { text: 'Fight waves of enemies to survive as long as possible', icon: 'swords' },
            { text: 'Defeat enemies to gain experience and level up', icon: 'level-up' },
            { text: 'Every 5 waves, you\'ll encounter a powerful boss enemy', icon: 'boss' },
            { text: 'As waves progress, enemies become stronger and more numerous', icon: 'difficulty' }
        ];
        
        gameplayPoints.forEach(point => {
            const pointContainer = document.createElement('div');
            pointContainer.style.display = 'flex';
            pointContainer.style.alignItems = 'center';
            pointContainer.style.marginBottom = '20px';
            
            const iconContainer = document.createElement('div');
            iconContainer.style.minWidth = '40px';
            iconContainer.style.height = '40px';
            iconContainer.style.backgroundColor = 'var(--pink)';
            iconContainer.style.borderRadius = '50%';
            iconContainer.style.display = 'flex';
            iconContainer.style.justifyContent = 'center';
            iconContainer.style.alignItems = 'center';
            iconContainer.style.marginRight = '15px';
            iconContainer.style.boxShadow = 'var(--shadow)';
            
            // Just using a placeholder circle for now
            iconContainer.innerHTML = `<div style="width:20px;height:20px;background:var(--white);border-radius:50%;"></div>`;
            
            pointContainer.appendChild(iconContainer);
            
            const pointText = document.createElement('span');
            pointText.textContent = point.text;
            pointContainer.appendChild(pointText);
            
            gameplayDesc.appendChild(pointContainer);
        });
        
        // Back button container (centered)
        const backBtnContainer = document.createElement('div');
        backBtnContainer.style.textAlign = 'center';
        backBtnContainer.style.margin = '40px auto 0';
        backBtnContainer.style.width = '100%';
        backBtnContainer.style.maxWidth = '300px';
        contentWrapper.appendChild(backBtnContainer);
        
        // Back button
        const backBtn = this.createMenuButton('Back to Menu');
        backBtn.addEventListener('click', () => {
            this.createMainMenu();
        });
        backBtnContainer.appendChild(backBtn);
        
        // Add to page
        document.body.appendChild(howToPlay);
        this.currentScreen = howToPlay;
        this.screens.howToPlay = howToPlay;
        
        // Scroll to top when screen is shown
        howToPlay.scrollTop = 0;
    }
    
    showEnemyWiki() {
        // Remove any existing UI
        if (this.currentScreen) {
            document.body.removeChild(this.currentScreen);
        }
        
        // Create enemy wiki container
        const enemyWiki = document.createElement('div');
        enemyWiki.className = 'menu-screen';
        enemyWiki.style.justifyContent = 'flex-start';
        enemyWiki.style.padding = '40px 20px 100px'; // Added bottom padding for button
        enemyWiki.style.overflowY = 'auto';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'ENEMIES WIKI';
        title.style.fontSize = '42px';
        title.style.marginBottom = '40px';
        title.style.color = 'var(--white)';
        title.style.textAlign = 'center';
        title.style.textShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
        enemyWiki.appendChild(title);
        
        // Main content wrapper for max-width constraint
        const contentWrapper = document.createElement('div');
        contentWrapper.style.width = '100%';
        contentWrapper.style.maxWidth = '1000px';
        contentWrapper.style.margin = '0 auto';
        enemyWiki.appendChild(contentWrapper);
        
        // Regular enemies section
        const regularEnemiesTitle = document.createElement('h3');
        regularEnemiesTitle.textContent = 'REGULAR ENEMIES';
        regularEnemiesTitle.style.fontSize = '28px';
        regularEnemiesTitle.style.marginBottom = '25px';
        regularEnemiesTitle.style.color = 'var(--light-brown)';
        regularEnemiesTitle.style.textAlign = 'center';
        contentWrapper.appendChild(regularEnemiesTitle);
        
        // Enemy cards container
        const enemyCardsContainer = document.createElement('div');
        enemyCardsContainer.style.display = 'flex';
        enemyCardsContainer.style.flexWrap = 'wrap';
        enemyCardsContainer.style.justifyContent = 'center';
        enemyCardsContainer.style.gap = '25px';
        enemyCardsContainer.style.marginBottom = '40px';
        enemyCardsContainer.style.width = '100%';
        contentWrapper.appendChild(enemyCardsContainer);
        
        // Add regular enemy cards
        const regularEnemies = [
            {
                name: 'Basic Enemy',
                color: 'var(--pink)',
                shape: 'Cone',
                description: 'Standard enemy with balanced stats. Approaches the player and attacks at close range.'
            },
            {
                name: 'Fast Enemy',
                color: 'var(--light-green)',
                shape: 'Cube',
                description: 'Quick but fragile. Moves twice as fast as basic enemies and attacks more frequently.'
            },
            {
                name: 'Tanky Enemy',
                color: 'var(--primary-green)',
                shape: 'Cylinder',
                description: 'Slow but powerful. Has high health and damage, but moves at half the speed of basic enemies.'
            },
            {
                name: 'Ranged Enemy',
                color: 'var(--light-brown)',
                shape: 'Sphere',
                description: 'Attacks from a distance. Fires projectiles at the player and tries to maintain optimal range.'
            }
        ];
        
        regularEnemies.forEach(enemy => {
            const card = this.createEnemyCard(enemy);
            enemyCardsContainer.appendChild(card);
        });
        
        // Boss enemies section
        const bossEnemiesTitle = document.createElement('h3');
        bossEnemiesTitle.textContent = 'BOSS ENEMIES';
        bossEnemiesTitle.style.fontSize = '28px';
        bossEnemiesTitle.style.marginBottom = '25px';
        bossEnemiesTitle.style.color = 'var(--light-brown)';
        bossEnemiesTitle.style.textAlign = 'center';
        contentWrapper.appendChild(bossEnemiesTitle);
        
        // Boss cards container
        const bossCardsContainer = document.createElement('div');
        bossCardsContainer.style.display = 'flex';
        bossCardsContainer.style.flexWrap = 'wrap';
        bossCardsContainer.style.justifyContent = 'center';
        bossCardsContainer.style.gap = '25px';
        bossCardsContainer.style.marginBottom = '40px';
        bossCardsContainer.style.width = '100%';
        contentWrapper.appendChild(bossCardsContainer);
        
        // Add boss enemy cards
        const bossEnemies = [
            {
                name: 'Titan',
                color: 'var(--primary-green)',
                shape: 'Large Humanoid',
                description: 'Powerful melee boss with high health and armor. Special attacks include Ground Smash, Charge Attack, and Multi-Smash.'
            },
            {
                name: 'Sorcerer',
                color: 'var(--pink)',
                shape: 'Floating Entity',
                description: 'Magic-focused boss that attacks with devastating spells. Can teleport and create magical barriers.'
            },
            {
                name: 'Hunter',
                color: 'var(--light-brown)',
                shape: 'Agile Creature',
                description: 'Fast-moving boss that combines melee and ranged attacks. Can perform quick dashes and fire volleys of projectiles.'
            }
        ];
        
        bossEnemies.forEach(enemy => {
            const card = this.createEnemyCard(enemy);
            bossCardsContainer.appendChild(card);
        });
        
        // Back button container (centered)
        const backBtnContainer = document.createElement('div');
        backBtnContainer.style.textAlign = 'center';
        backBtnContainer.style.margin = '40px auto 0';
        backBtnContainer.style.width = '100%';
        backBtnContainer.style.maxWidth = '300px';
        contentWrapper.appendChild(backBtnContainer);
        
        // Back button
        const backBtn = this.createMenuButton('Back to Menu');
        backBtn.addEventListener('click', () => {
            this.createMainMenu();
        });
        backBtnContainer.appendChild(backBtn);
        
        // Add to page
        document.body.appendChild(enemyWiki);
        this.currentScreen = enemyWiki;
        this.screens.enemyWiki = enemyWiki;
        
        // Scroll to top when screen is shown
        enemyWiki.scrollTop = 0;
    }
    
    createEnemyCard(enemy) {
        const card = document.createElement('div');
        card.className = 'enemy-card';
        card.style.flex = '1 0 280px';
        card.style.maxWidth = '300px';
        card.style.minWidth = '240px';
        
        // Enemy icon placeholder
        const iconContainer = document.createElement('div');
        iconContainer.style.width = '60px';
        iconContainer.style.height = '60px';
        iconContainer.style.backgroundColor = enemy.color;
        iconContainer.style.borderRadius = '50%';
        iconContainer.style.margin = '0 auto 15px';
        iconContainer.style.display = 'flex';
        iconContainer.style.justifyContent = 'center';
        iconContainer.style.alignItems = 'center';
        card.appendChild(iconContainer);
        
        const name = document.createElement('h4');
        name.textContent = enemy.name;
        name.style.fontSize = '22px';
        name.style.marginBottom = '10px';
        name.style.color = enemy.color;
        name.style.textAlign = 'center';
        card.appendChild(name);
        
        const shapeBadge = document.createElement('div');
        shapeBadge.textContent = enemy.shape;
        shapeBadge.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        shapeBadge.style.color = 'var(--white)';
        shapeBadge.style.padding = '4px 12px';
        shapeBadge.style.borderRadius = '20px';
        shapeBadge.style.fontSize = '14px';
        shapeBadge.style.display = 'inline-block';
        shapeBadge.style.margin = '0 auto 15px';
        shapeBadge.style.textAlign = 'center';
        shapeBadge.style.width = 'fit-content';
        card.appendChild(shapeBadge);
        
        const description = document.createElement('p');
        description.textContent = enemy.description;
        description.style.fontSize = '16px';
        description.style.lineHeight = '1.6';
        description.style.color = 'var(--white)';
        description.style.textAlign = 'center';
        card.appendChild(description);
        
        return card;
    }
    
    hide() {
        if (this.currentScreen) {
            document.body.removeChild(this.currentScreen);
            this.currentScreen = null;
        }
    }
} 