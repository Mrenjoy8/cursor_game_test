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
        this.container.style.background = 'var(--panel-bg)';
        this.container.style.backdropFilter = 'blur(4px)';
        this.container.style.padding = '40px';
        this.container.style.borderRadius = '16px';
        this.container.style.color = 'var(--white)';
        this.container.style.fontFamily = '"Exo 2", sans-serif';
        this.container.style.zIndex = '1000';
        this.container.style.display = 'none';
        this.container.style.width = '80%';
        this.container.style.maxWidth = '800px';
        this.container.style.boxShadow = 'var(--shadow)';
        this.container.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        document.body.appendChild(this.container);
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'Level Up! Choose a Skill';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        title.style.marginBottom = '20px';
        title.style.color = 'var(--light-brown)';
        title.style.textShadow = '0 0 10px rgba(212, 188, 145, 0.5)';
        title.style.fontSize = '42px';
        title.style.fontFamily = '"Exo 2", sans-serif';
        this.container.appendChild(title);
        
        // Divider
        const divider = document.createElement('div');
        divider.style.width = '80%';
        divider.style.height = '2px';
        divider.style.background = 'linear-gradient(90deg, transparent, var(--white), transparent)';
        divider.style.margin = '0 auto 30px';
        divider.style.opacity = '0.5';
        this.container.appendChild(divider);
        
        // Skill options container
        this.skillOptionsContainer = document.createElement('div');
        this.skillOptionsContainer.style.display = 'flex';
        this.skillOptionsContainer.style.flexWrap = 'wrap';
        this.skillOptionsContainer.style.justifyContent = 'center';
        this.skillOptionsContainer.style.gap = '20px';
        this.container.appendChild(this.skillOptionsContainer);
    }
    
    showSkillSelection() {
        // Pause game using game's togglePause with silent mode (no overlay)
        if (!this.game.paused) {
            this.game.togglePause(false);
        }
        
        // Clear previous skill options
        this.skillOptionsContainer.innerHTML = '';
        
        // Get random skills to offer (3 different ones)
        const availableSkills = this.skills.filter(skill => skill.level < skill.maxLevel);
        const shuffled = [...availableSkills].sort(() => 0.5 - Math.random());
        const skillsToOffer = shuffled.slice(0, 3);
        
        // Add level up notification above skill cards
        const levelUpNotice = document.createElement('div');
        levelUpNotice.textContent = `LEVEL UP! (${this.player.level})`;
        levelUpNotice.style.color = 'var(--light-brown)';
        levelUpNotice.style.fontSize = '32px';
        levelUpNotice.style.fontWeight = 'bold';
        levelUpNotice.style.marginBottom = '20px';
        levelUpNotice.style.textAlign = 'center';
        levelUpNotice.style.width = '100%';
        levelUpNotice.style.textShadow = '0 0 10px rgba(212, 188, 145, 0.7)';
        levelUpNotice.style.padding = '10px 0';
        levelUpNotice.style.fontFamily = '"Exo 2", sans-serif';
        this.skillOptionsContainer.insertBefore(levelUpNotice, this.skillOptionsContainer.firstChild);
        
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
        card.style.background = 'rgba(255, 255, 255, 0.08)';
        card.style.backdropFilter = 'blur(4px)';
        card.style.padding = '20px';
        card.style.borderRadius = '16px';
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.3s';
        card.style.width = 'calc(33% - 20px)';
        card.style.minWidth = '200px';
        card.style.boxSizing = 'border-box';
        card.style.boxShadow = 'var(--shadow)';
        card.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        card.style.fontFamily = '"Exo 2", sans-serif';
        
        // Hover effect
        card.addEventListener('mouseover', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.2)';
        });
        
        card.addEventListener('mouseout', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'var(--shadow)';
        });
        
        // Icon and name container
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.marginBottom = '15px';
        card.appendChild(header);
        
        // Icon
        const icon = document.createElement('div');
        icon.textContent = skill.icon;
        icon.style.fontSize = '28px';
        icon.style.marginRight = '15px';
        icon.style.width = '40px';
        icon.style.height = '40px';
        icon.style.borderRadius = '50%';
        icon.style.backgroundColor = 'var(--primary-green)';
        icon.style.display = 'flex';
        icon.style.justifyContent = 'center';
        icon.style.alignItems = 'center';
        icon.style.boxShadow = 'var(--shadow)';
        icon.style.border = '2px solid var(--white)';
        header.appendChild(icon);
        
        // Name
        const name = document.createElement('h3');
        name.textContent = skill.name;
        name.style.margin = '0';
        name.style.color = 'var(--pink)';
        name.style.fontSize = '20px';
        name.style.fontWeight = 'bold';
        name.style.fontFamily = '"Exo 2", sans-serif';
        header.appendChild(name);
        
        // Level
        const level = document.createElement('div');
        level.textContent = `Level ${skill.level + 1}/${skill.maxLevel}`;
        level.style.fontSize = '12px';
        level.style.marginBottom = '10px';
        level.style.color = 'var(--light-brown)';
        level.style.fontFamily = '"Exo 2", sans-serif';
        card.appendChild(level);
        
        // Description
        const description = document.createElement('p');
        description.textContent = skill.description;
        description.style.margin = '0';
        description.style.fontSize = '14px';
        description.style.color = 'var(--white)';
        description.style.fontFamily = '"Exo 2", sans-serif';
        card.appendChild(description);
        
        // Add a select button at the bottom that matches menu buttons
        const selectButton = document.createElement('button');
        selectButton.textContent = 'Select';
        selectButton.className = 'menu-button';
        selectButton.style.width = '100%';
        selectButton.style.marginTop = '15px';
        selectButton.style.padding = '10px 16px';
        selectButton.style.fontSize = '16px';
        selectButton.style.fontFamily = '"Exo 2", sans-serif';
        card.appendChild(selectButton);
        
        // Click handlers
        const handleSelect = () => {
            this.selectSkill(skill);
        };
        
        card.addEventListener('click', handleSelect);
        selectButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering card click
            handleSelect();
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
        
//        console.log(`Skill selected: ${skill.name} (Level ${skill.level})`);
        
        // Create custom event with some detail data about the skill
        const skillEvent = new CustomEvent('skillSelected', {
            detail: {
                skillId: skill.id,
                skillName: skill.name,
                skillLevel: skill.level
            },
            bubbles: true
        });
        
        // Dispatch custom event to notify other systems that a skill was selected
        document.dispatchEvent(skillEvent);
        
        // Resume game using game's togglePause to restore enemy states
        // Add a small delay to ensure UI is fully hidden first
        setTimeout(() => {
            if (this.game.paused) {
//                console.log("Resuming game after skill selection");
                this.game.togglePause(false); // Resume without showing/hiding overlay
            }
        }, 100);
    }
    
    getSkillLevel(skillId) {
        const skill = this.skills.find(s => s.id === skillId);
        return skill ? skill.level : 0;
    }
} 