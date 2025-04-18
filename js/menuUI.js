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
        title.textContent = 'THREE.JS ROGUELITE';
        title.style.fontSize = '48px';
        title.style.marginBottom = '50px';
        title.style.color = '#ff3300';
        title.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
        menu.appendChild(title);
        
        // Menu buttons container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '20px';
        buttonContainer.style.minWidth = '300px';
        menu.appendChild(buttonContainer);
        
        // Start Game button
        const startBtn = this.createMenuButton('START GAME');
        startBtn.addEventListener('click', () => {
            this.startGameCallback();
        });
        buttonContainer.appendChild(startBtn);
        
        // How To Play button
        const howToPlayBtn = this.createMenuButton('HOW TO PLAY');
        howToPlayBtn.addEventListener('click', () => {
            this.showHowToPlay();
        });
        buttonContainer.appendChild(howToPlayBtn);
        
        // Enemy Wiki button
        const wikiBtn = this.createMenuButton('ENEMY WIKI');
        wikiBtn.addEventListener('click', () => {
            this.showEnemyWiki();
        });
        buttonContainer.appendChild(wikiBtn);
        
        // Add to page
        document.body.appendChild(menu);
        this.currentScreen = menu;
        this.screens.main = menu;
    }
    
    createMenuButton(text) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'menu-button';
        return button;
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
        howToPlay.style.padding = '50px';
        howToPlay.style.overflowY = 'auto';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'HOW TO PLAY';
        title.style.fontSize = '36px';
        title.style.marginBottom = '30px';
        title.style.color = '#ff3300';
        howToPlay.appendChild(title);
        
        // Controls section
        const controlsContainer = document.createElement('div');
        controlsContainer.style.backgroundColor = 'rgba(50, 50, 50, 0.6)';
        controlsContainer.style.padding = '20px';
        controlsContainer.style.borderRadius = '10px';
        controlsContainer.style.marginBottom = '20px';
        controlsContainer.style.width = '100%';
        controlsContainer.style.maxWidth = '800px';
        howToPlay.appendChild(controlsContainer);
        
        const controlsTitle = document.createElement('h3');
        controlsTitle.textContent = 'CONTROLS';
        controlsTitle.style.fontSize = '24px';
        controlsTitle.style.marginBottom = '15px';
        controlsContainer.appendChild(controlsTitle);
        
        const controlsList = document.createElement('ul');
        controlsList.style.listStyleType = 'none';
        controlsList.style.padding = '0';
        controlsList.style.fontSize = '18px';
        controlsList.style.lineHeight = '1.5';
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
            item.style.marginBottom = '10px';
            item.style.display = 'flex';
            
            const keySpan = document.createElement('span');
            keySpan.textContent = control.key;
            keySpan.style.backgroundColor = '#ff3300';
            keySpan.style.color = 'white';
            keySpan.style.padding = '5px 10px';
            keySpan.style.borderRadius = '5px';
            keySpan.style.minWidth = '120px';
            keySpan.style.display = 'inline-block';
            keySpan.style.marginRight = '20px';
            keySpan.style.textAlign = 'center';
            item.appendChild(keySpan);
            
            const descSpan = document.createElement('span');
            descSpan.textContent = control.desc;
            item.appendChild(descSpan);
            
            controlsList.appendChild(item);
        });
        
        // Gameplay section
        const gameplayContainer = document.createElement('div');
        gameplayContainer.style.backgroundColor = 'rgba(50, 50, 50, 0.6)';
        gameplayContainer.style.padding = '20px';
        gameplayContainer.style.borderRadius = '10px';
        gameplayContainer.style.marginBottom = '30px';
        gameplayContainer.style.width = '100%';
        gameplayContainer.style.maxWidth = '800px';
        howToPlay.appendChild(gameplayContainer);
        
        const gameplayTitle = document.createElement('h3');
        gameplayTitle.textContent = 'GAMEPLAY';
        gameplayTitle.style.fontSize = '24px';
        gameplayTitle.style.marginBottom = '15px';
        gameplayContainer.appendChild(gameplayTitle);
        
        const gameplayDesc = document.createElement('p');
        gameplayDesc.innerHTML = `
            Fight waves of enemies to survive as long as possible.<br><br>
            Defeat enemies to gain experience and level up.<br><br>
            Every 5 waves, you'll encounter a powerful boss enemy.<br><br>
            As waves progress, enemies become stronger and more numerous.
        `;
        gameplayDesc.style.lineHeight = '1.5';
        gameplayDesc.style.fontSize = '18px';
        gameplayContainer.appendChild(gameplayDesc);
        
        // Back button
        const backBtn = this.createMenuButton('BACK TO MENU');
        backBtn.style.maxWidth = '300px';
        backBtn.addEventListener('click', () => {
            this.createMainMenu();
        });
        howToPlay.appendChild(backBtn);
        
        // Add to page
        document.body.appendChild(howToPlay);
        this.currentScreen = howToPlay;
        this.screens.howToPlay = howToPlay;
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
        enemyWiki.style.padding = '50px';
        enemyWiki.style.overflowY = 'auto';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'ENEMY WIKI';
        title.style.fontSize = '36px';
        title.style.marginBottom = '30px';
        title.style.color = '#ff3300';
        enemyWiki.appendChild(title);
        
        // Regular enemies section
        const regularEnemiesTitle = document.createElement('h3');
        regularEnemiesTitle.textContent = 'REGULAR ENEMIES';
        regularEnemiesTitle.style.fontSize = '24px';
        regularEnemiesTitle.style.marginBottom = '20px';
        regularEnemiesTitle.style.alignSelf = 'flex-start';
        regularEnemiesTitle.style.marginLeft = '10%';
        enemyWiki.appendChild(regularEnemiesTitle);
        
        // Enemy cards container
        const enemyCardsContainer = document.createElement('div');
        enemyCardsContainer.style.display = 'flex';
        enemyCardsContainer.style.flexWrap = 'wrap';
        enemyCardsContainer.style.justifyContent = 'center';
        enemyCardsContainer.style.gap = '20px';
        enemyCardsContainer.style.marginBottom = '40px';
        enemyCardsContainer.style.width = '100%';
        enemyWiki.appendChild(enemyCardsContainer);
        
        // Add regular enemy cards
        const regularEnemies = [
            {
                name: 'Basic Enemy',
                color: '#ff0000',
                shape: 'Cone',
                description: 'Standard enemy with balanced stats. Approaches the player and attacks at close range.'
            },
            {
                name: 'Fast Enemy',
                color: '#3498db',
                shape: 'Cube',
                description: 'Quick but fragile. Moves twice as fast as basic enemies and attacks more frequently.'
            },
            {
                name: 'Tanky Enemy',
                color: '#2ecc71',
                shape: 'Cylinder',
                description: 'Slow but powerful. Has high health and damage, but moves at half the speed of basic enemies.'
            },
            {
                name: 'Ranged Enemy',
                color: '#9b59b6',
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
        bossEnemiesTitle.style.fontSize = '24px';
        bossEnemiesTitle.style.marginBottom = '20px';
        bossEnemiesTitle.style.alignSelf = 'flex-start';
        bossEnemiesTitle.style.marginLeft = '10%';
        enemyWiki.appendChild(bossEnemiesTitle);
        
        // Boss cards container
        const bossCardsContainer = document.createElement('div');
        bossCardsContainer.style.display = 'flex';
        bossCardsContainer.style.flexWrap = 'wrap';
        bossCardsContainer.style.justifyContent = 'center';
        bossCardsContainer.style.gap = '20px';
        bossCardsContainer.style.marginBottom = '40px';
        bossCardsContainer.style.width = '100%';
        enemyWiki.appendChild(bossCardsContainer);
        
        // Add boss enemy cards
        const bossEnemies = [
            {
                name: 'Titan',
                color: '#ff3300',
                shape: 'Large Humanoid',
                description: 'Powerful melee boss with high health and armor. Special attacks include Ground Smash, Charge Attack, and Multi-Smash.'
            },
            {
                name: 'Sorcerer',
                color: '#9b59b6',
                shape: 'Floating Entity',
                description: 'Magic-focused boss that attacks with devastating spells. Can teleport and create magical barriers.'
            },
            {
                name: 'Hunter',
                color: '#3498db',
                shape: 'Agile Creature',
                description: 'Fast-moving boss that combines melee and ranged attacks. Can perform quick dashes and fire volleys of projectiles.'
            }
        ];
        
        bossEnemies.forEach(enemy => {
            const card = this.createEnemyCard(enemy);
            bossCardsContainer.appendChild(card);
        });
        
        // Back button
        const backBtn = this.createMenuButton('BACK TO MENU');
        backBtn.style.maxWidth = '300px';
        backBtn.addEventListener('click', () => {
            this.createMainMenu();
        });
        enemyWiki.appendChild(backBtn);
        
        // Add to page
        document.body.appendChild(enemyWiki);
        this.currentScreen = enemyWiki;
        this.screens.enemyWiki = enemyWiki;
    }
    
    createEnemyCard(enemy) {
        const card = document.createElement('div');
        card.className = 'enemy-card';
        card.style.borderLeft = `5px solid ${enemy.color}`;
        
        const name = document.createElement('h4');
        name.textContent = enemy.name;
        name.style.fontSize = '20px';
        name.style.marginBottom = '10px';
        name.style.color = enemy.color;
        card.appendChild(name);
        
        const shape = document.createElement('p');
        shape.textContent = `Shape: ${enemy.shape}`;
        shape.style.fontSize = '16px';
        shape.style.marginBottom = '10px';
        card.appendChild(shape);
        
        const description = document.createElement('p');
        description.textContent = enemy.description;
        description.style.fontSize = '16px';
        description.style.lineHeight = '1.4';
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