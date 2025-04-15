export class SkillSystem {
    constructor(player, game) {
        this.player = player;
        this.game = game;
        this.skills = [];
        this.activeSkills = [];
        
        // Create skill selector UI (hidden by default)
        this.createSkillSelector();
        
        // Initialize available skills
        this.initializeSkills();
        
        // Set up level up listener
        document.addEventListener('playerLevelUp', (event) => {
            this.showSkillSelection();
        });
    }
    
    initializeSkills() {
        // Define available skills
        this.skills = [
            {
                id: 'increased_damage',
                name: 'Power Shot',
                description: 'Increase attack damage by 25%',
                maxLevel: 5,
                level: 0,
                icon: '💥',
                apply: () => {
                    this.player.attackDamage *= 1.25;
                }
            },
            {
                id: 'attack_speed',
                name: 'Quick Draw',
                description: 'Increase attack speed by 20%',
                maxLevel: 5,
                level: 0,
                icon: '⚡',
                apply: () => {
                    this.player.attackSpeed *= 0.8; // Lower time between attacks
                }
            },
            {
                id: 'multi_shot',
                name: 'Multi Shot',
                description: 'Fire additional projectiles',
                maxLevel: 3,
                level: 0,
                icon: '🔱',
                apply: () => {
                    this.player.multiShotCount = 2 + this.getSkillLevel('multi_shot');
                }
            },
            {
                id: 'health_boost',
                name: 'Vitality',
                description: 'Increase maximum health by 20%',
                maxLevel: 5,
                level: 0,
                icon: '❤️',
                apply: () => {
                    const prevMax = this.player.maxHealth;
                    this.player.maxHealth = Math.floor(this.player.maxHealth * 1.2);
                    this.player.health += (this.player.maxHealth - prevMax);
                }
            },
            {
                id: 'movement_speed',
                name: 'Swift Feet',
                description: 'Increase movement speed by 15%',
                maxLevel: 3,
                level: 0,
                icon: '👟',
                apply: () => {
                    this.player.moveSpeed *= 1.15;
                }
            },
            {
                id: 'attack_range',
                name: 'Eagle Eye',
                description: 'Increase attack range by 25%',
                maxLevel: 3,
                level: 0,
                icon: '🔭',
                apply: () => {
                    this.player.attackRange *= 1.25;
                }
            },
            {
                id: 'projectile_speed',
                name: 'Velocity',
                description: 'Increase projectile speed by 20%',
                maxLevel: 3,
                level: 0,
                icon: '🚀',
                apply: () => {
                    this.player.projectileSpeed *= 1.2;
                }
            },
            {
                id: 'health_regen',
                name: 'Regeneration',
                description: 'Regenerate 1% of max health every second',
                maxLevel: 3,
                level: 0,
                icon: '💗',
                apply: () => {
                    // This is applied in the player update method based on skill level
                    if (this.player.healthRegenInterval) {
                        clearInterval(this.player.healthRegenInterval);
                    }
                    
                    const regenAmount = this.player.maxHealth * 0.01 * this.getSkillLevel('health_regen');
                    this.player.healthRegenInterval = setInterval(() => {
                        if (this.player.health < this.player.maxHealth) {
                            this.player.heal(regenAmount);
                        }
                    }, 1000);
                }
            }
        ];
    }
    
    createSkillSelector() {
        // Main container
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '50%';
        this.container.style.left = '50%';
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.background = 'rgba(0, 0, 0, 0.8)';
        this.container.style.padding = '20px';
        this.container.style.borderRadius = '10px';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.zIndex = '1000';
        this.container.style.display = 'none';
        this.container.style.width = '80%';
        this.container.style.maxWidth = '800px';
        document.body.appendChild(this.container);
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'Level Up! Choose a Skill';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        title.style.marginBottom = '20px';
        title.style.color = '#ffcc00';
        this.container.appendChild(title);
        
        // Skill options container
        this.skillOptionsContainer = document.createElement('div');
        this.skillOptionsContainer.style.display = 'flex';
        this.skillOptionsContainer.style.flexWrap = 'wrap';
        this.skillOptionsContainer.style.justifyContent = 'center';
        this.skillOptionsContainer.style.gap = '20px';
        this.container.appendChild(this.skillOptionsContainer);
    }
    
    showSkillSelection() {
        // Pause game
        this.game.paused = true;
        
        // Clear previous skill options
        this.skillOptionsContainer.innerHTML = '';
        
        // Get random skills to offer (3 different ones)
        const availableSkills = this.skills.filter(skill => skill.level < skill.maxLevel);
        const shuffled = [...availableSkills].sort(() => 0.5 - Math.random());
        const skillsToOffer = shuffled.slice(0, 3);
        
        // Create skill option cards
        skillsToOffer.forEach(skill => {
            const card = this.createSkillCard(skill);
            this.skillOptionsContainer.appendChild(card);
        });
        
        // Show container
        this.container.style.display = 'block';
    }
    
    createSkillCard(skill) {
        const card = document.createElement('div');
        card.style.background = 'rgba(50, 50, 80, 0.8)';
        card.style.padding = '15px';
        card.style.borderRadius = '8px';
        card.style.cursor = 'pointer';
        card.style.transition = 'background 0.2s';
        card.style.width = 'calc(33% - 20px)';
        card.style.minWidth = '200px';
        card.style.boxSizing = 'border-box';
        
        // Hover effect
        card.addEventListener('mouseover', () => {
            card.style.background = 'rgba(70, 70, 120, 0.8)';
        });
        
        card.addEventListener('mouseout', () => {
            card.style.background = 'rgba(50, 50, 80, 0.8)';
        });
        
        // Icon and name container
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        card.appendChild(header);
        
        // Icon
        const icon = document.createElement('div');
        icon.textContent = skill.icon;
        icon.style.fontSize = '24px';
        icon.style.marginRight = '10px';
        header.appendChild(icon);
        
        // Name
        const name = document.createElement('h3');
        name.textContent = skill.name;
        name.style.margin = '0';
        name.style.color = '#ffcc00';
        header.appendChild(name);
        
        // Level
        const level = document.createElement('div');
        level.textContent = `Level ${skill.level + 1}/${skill.maxLevel}`;
        level.style.fontSize = '12px';
        level.style.marginBottom = '10px';
        card.appendChild(level);
        
        // Description
        const description = document.createElement('p');
        description.textContent = skill.description;
        description.style.margin = '0';
        description.style.fontSize = '14px';
        card.appendChild(description);
        
        // Click handler
        card.addEventListener('click', () => {
            this.selectSkill(skill);
        });
        
        return card;
    }
    
    selectSkill(skill) {
        // Increase skill level
        skill.level++;
        
        // Apply skill effect
        skill.apply();
        
        // Add to active skills if not already active
        if (!this.activeSkills.includes(skill.id)) {
            this.activeSkills.push(skill.id);
        }
        
        // Hide skill selector
        this.container.style.display = 'none';
        
        // Resume game
        this.game.paused = false;
    }
    
    getSkillLevel(skillId) {
        const skill = this.skills.find(s => s.id === skillId);
        return skill ? skill.level : 0;
    }
} 