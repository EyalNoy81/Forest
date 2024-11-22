class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.obstacleTypes = {
            images: ['tree', 'animal', 'animal2', 'animal3', 'animal4', 'animal5'],
            special: ['blackBall']
        };
        
        // הגדרת הגדלים לסיום שלב לפי רמת קושי
        this.levelUpSizes = {
            beginner: 50,
            advanced: 75,
            expert: 100
        };

        this.defaultSettings = {
            size: 20,
            level: 1,
            difficulty: 'beginner',
            score: 0
        };

        this.size = this.defaultSettings.size;
        this.level = this.defaultSettings.level;
        this.difficulty = this.defaultSettings.difficulty;
        this.isPaused = false;
        this.isGameActive = false;
        
        this.obstacleFrequency = 3000;
        this.lastObstacleSpeedIncrease = Date.now();
        this.obstacleSpeedIncreaseInterval = 20000;
        
        this.playerBall = {
            x: 0,
            y: 0,
            size: this.size,
            color: '#3498db',
            rotation: 0
        };
        
        this.stones = [];
        this.obstacles = [];
        this.particles = [];
        this.backgroundOffset = 0;
        
        this.keys = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false,
            Escape: false
        };

        this.mouseControl = false; // דגל לציון האם משתמשים בעכבר
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseActive = false;
        this.sounds = {};
        this.images = {};
        
          
    this.joystick = {
        active: false,
        baseX: 0,
        baseY: 0,
        stickX: 0,
        stickY: 0,
        maxDistance: 35
    };
    
    this.init();
}

    init() {
        this.setupCanvas();
        this.loadAssets();
        this.setupEventListeners();
        this.resetGame();
    }

    loadAssets() {
        // Load sounds
        this.sounds = {
            collect: new Audio('sounds/collect.wav'),
            hit: new Audio('sounds/hit.wav'),
            levelUp: new Audio('sounds/levelUp.wav'),
            background: new Audio('sounds/forest.wav')
        };
        
        this.sounds.background.loop = true;
        
        // Set volumes
        this.sounds.collect.volume = 0.6;
        this.sounds.hit.volume = 0.4;
        this.sounds.levelUp.volume = 0.7;
        this.sounds.background.volume = 0.5;
    
        // Load images - מערך דינמי של תמונות
        this.images = {};
        
        // טעינת תמונת הרקע
        this.images.background = new Image();
        this.images.background.src = 'images/forest-bg.png';
        
        // טעינת כל תמונות המכשולים
        this.obstacleTypes.images.forEach(imageName => {
            this.images[imageName] = new Image();
            this.images[imageName].src = `images/${imageName}.png`;
        });
    }

    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.playerBall.x = this.canvas.width / 2;
        this.playerBall.y = this.canvas.height * 0.8;
    }

    setupEventListeners() {
        // מאזיני מקלדת קיימים
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
                if (e.code === 'Escape') {
                    this.togglePause();
                }
            }
            this.mouseControl = false; // מעבר לשליטת מקלדת
        });
    
        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = false;
            }
        });
    
        // מאזיני עכבר
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.mouseControl = true;
        });
    
        this.canvas.addEventListener('mouseenter', () => {
            this.mouseActive = true;
        });
    
        this.canvas.addEventListener('mouseleave', () => {
            this.mouseActive = false;
        });
    
        // מאזיני מגע בסיסיים
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.mouseControl = true;
            this.mouseActive = true;
        });
    
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
        });
    
        this.canvas.addEventListener('touchend', () => {
            this.mouseActive = false;
        });
    
        // מאזיני ג'ויסטיק חדשים
        const stick = document.getElementById('joystick-stick');
        const base = document.getElementById('joystick-base');
    
        const handleStart = (e) => {
            this.joystick.active = true;
            const touch = e.type === 'mousedown' ? e : e.touches[0];
            const baseRect = base.getBoundingClientRect();
            this.joystick.baseX = baseRect.left + baseRect.width / 2;
            this.joystick.baseY = baseRect.top + baseRect.height / 2;
            this.updateJoystickPosition(touch);
        };
    
        const handleMove = (e) => {
            if (!this.joystick.active) return;
            e.preventDefault();
            const touch = e.type === 'mousemove' ? e : e.touches[0];
            this.updateJoystickPosition(touch);
        };
    
        const handleEnd = () => {
            this.joystick.active = false;
            stick.style.transform = 'translate(-50%, -50%)';
            this.joystick.stickX = 0;
            this.joystick.stickY = 0;
        };
    
        // הוספת מאזיני ג'ויסטיק למגע ועכבר
        stick.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
    
        stick.addEventListener('touchstart', handleStart);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleEnd);
    
        // מאזיני כפתורים קיימים
        document.getElementById('startGame').addEventListener('click', () => {
            this.startGame();
        });
    
        document.getElementById('restartGame').addEventListener('click', () => {
            this.resetGame();
            this.startGame();
        });
    
        document.getElementById('ballColor').addEventListener('change', (e) => {
            this.playerBall.color = e.target.value;
        });
    
        document.getElementById('exitGame').addEventListener('click', () => {
            this.exitGame();
        });
    
        document.querySelectorAll('.difficulty-select button').forEach(button => {
            button.addEventListener('click', (e) => {
                const newDifficulty = e.target.dataset.difficulty;
                this.setDifficulty(newDifficulty);
                
                document.querySelectorAll('.difficulty-select button').forEach(b => 
                    b.style.background = '#3498db');
                e.target.style.background = '#2ecc71';
            });
        });
    }
    setDifficulty(difficulty) {
        if (this.levelUpSizes[difficulty]) {
            this.difficulty = difficulty;
            console.log('Difficulty set to:', difficulty);
        } else {
            console.error('Invalid difficulty:', difficulty);
        }
    }

    exitGame() {
        if (confirm('האם אתה בטוח שברצונך לצאת מהמשחק?')) {
            window.close();
            window.location.href = 'about:blank';
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.showPauseMenu();
            this.sounds.background.pause();
        } else {
            this.hidePauseMenu();
            this.sounds.background.play();
            this.gameLoop();
        }
    }

    showPauseMenu() {
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pause-menu';
        pauseMenu.innerHTML = `
            <div class="pause-content">
                <h2>משחק מושהה</h2>
                <button id="resume">חזור למשחק</button>
                <button id="main-menu">חזור לתפריט ראשי</button>
            </div>
        `;
        document.body.appendChild(pauseMenu);

        document.getElementById('resume').onclick = () => this.togglePause();
        document.getElementById('main-menu').onclick = () => {
            this.isPaused = false;
            this.showScreen('menu');
            pauseMenu.remove();
            this.sounds.background.pause();
        };
    }

    hidePauseMenu() {
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.remove();
        }
    }

    startGame() {
        this.resetGame();
        this.showScreen('game');
        this.isGameActive = true;
        this.sounds.background.play();
        this.obstacleFrequency = 3000;
        this.lastObstacleSpeedIncrease = Date.now();
        this.gameLoop();
        this.spawnStones();
        this.spawnObstacles();
        this.showControls();
    }

    resetGame() {
        this.size = this.defaultSettings.size;
        this.level = this.defaultSettings.level;
        this.difficulty = this.defaultSettings.difficulty;
        
        this.playerBall.size = this.size;
        this.playerBall.x = this.canvas.width / 2;
        this.playerBall.y = this.canvas.height * 0.8;
        
        this.stones = [];
        this.obstacles = [];
        this.particles = [];
        
        this.backgroundOffset = 0;
        this.playerBall.rotation = 0;
        this.obstacleFrequency = 3000;
        this.lastObstacleSpeedIncrease = Date.now();
        
        this.updateScore();
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => 
            screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    updateScore() {
        try {
            if (!this.difficulty || !this.levelUpSizes) {
                console.error('Missing required properties:', {
                    difficulty: this.difficulty,
                    levelUpSizes: this.levelUpSizes
                });
                return;
            }

            const targetSize = this.levelUpSizes[this.difficulty];
            
            if (!targetSize) {
                console.error('Invalid target size for difficulty:', this.difficulty);
                return;
            }

            document.getElementById('size').textContent = 
                `${Math.round(this.size)}/${targetSize} | שלב ${this.level}`;
        } catch (error) {
            console.error('Error in updateScore:', error);
        }
    }

    spawnStones() {
        if (!this.isGameActive || this.isPaused) return;

        const stone = {
            x: Math.random() * this.canvas.width,
            y: -20,
            size: 10,
            color: Math.random() > 0.3 ? '#2ecc71' : '#e74c3c',
            speed: this.getDifficultySpeed(),
            rotation: 0
        };

        this.stones.push(stone);
        setTimeout(() => this.spawnStones(), this.getDifficultySpawnRate());
    }

    spawnObstacles() {
        if (!this.isGameActive || this.isPaused) return;
    
        const currentTime = Date.now();
        if (currentTime - this.lastObstacleSpeedIncrease >= this.obstacleSpeedIncreaseInterval) {
            this.obstacleFrequency = Math.max(1000, this.obstacleFrequency - 300);
            this.lastObstacleSpeedIncrease = currentTime;
        }
    
        const isImageObstacle = Math.random() > 0.3;
        
        let obstacleType;
        if (isImageObstacle) {
            obstacleType = this.obstacleTypes.images[
                Math.floor(Math.random() * this.obstacleTypes.images.length)
            ];
        } else {
            obstacleType = 'blackBall';
        }
    
        const obstacle = {
            x: Math.random() * this.canvas.width,
            y: -50,
            size: obstacleType === 'blackBall' ? 15 : 30,
            type: obstacleType,
            speed: this.getDifficultySpeed() * 0.5
            // הסרנו את מאפיין ה-rotation
        };
    
        this.obstacles.push(obstacle);
        setTimeout(() => this.spawnObstacles(), this.obstacleFrequency);
    }
    getDifficultySpeed() {
        const speeds = {
            beginner: 2,
            advanced: 4,
            expert: 6
        };
        return speeds[this.difficulty];
    }

    getDifficultySpawnRate() {
        const rates = {
            beginner: 1000,
            advanced: 750,
            expert: 500
        };
        return rates[this.difficulty];
    }

    checkCollisions() {
        this.stones = this.stones.filter(stone => {
            const dx = stone.x - this.playerBall.x;
            const dy = stone.y - this.playerBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
    
            if (distance < this.playerBall.size + stone.size) {
                if (stone.color === '#2ecc71') {
                    this.size = Math.max(1, this.size + 2);
                    this.sounds.collect.play();
                    this.createParticles(stone.x, stone.y, '#2ecc71');
                } else {
                    this.size = Math.max(1, this.size - 3);
                    this.sounds.hit.play();
                    this.createParticles(stone.x, stone.y, '#e74c3c');
                }
                
                this.playerBall.size = this.size;
                this.updateScore();
    
                if (this.size >= this.levelUpSizes[this.difficulty]) {
                    this.levelUp();
                    return false;
                } else if (this.size <= 1) {
                    this.gameOver();
                    return false;
                }
                return false;
            }
            return stone.y < this.canvas.height;
        });
    
        // Check obstacle collisions
        this.obstacles.forEach(obstacle => {
            const dx = obstacle.x - this.playerBall.x;
            const dy = obstacle.y - this.playerBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.playerBall.size + obstacle.size) {
                this.size = Math.max(1, this.size - 5);
                this.playerBall.size = this.size;
                this.sounds.hit.play();
                this.createParticles(obstacle.x, obstacle.y, '#e74c3c');
                this.updateScore();

                if (this.size <= 1) {
                    this.gameOver();
                }
            }
        });
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: Math.random() * 5,
                color: color,
                life: 1
            });
        }
    }

    levelUp() {
        this.level++;
        this.size = this.defaultSettings.size;
        this.playerBall.size = this.size;
        this.sounds.levelUp.play();
        this.createParticles(this.playerBall.x, this.playerBall.y, '#ffd700');
        this.updateScore();
    }

    gameOver() {
        this.isGameActive = false;
        this.sounds.background.pause();
        document.getElementById('finalSize').textContent = 
            `${Math.round(this.size)} | שלב ${this.level}`;
        this.showScreen('game-over');
    }

    // הפונקציות החדשות נכנסות כאן
    showLevelUpMessage() {
        this.isPaused = true;
        this.isGameActive = false;
        
        const levelUpMenu = document.createElement('div');
        levelUpMenu.id = 'level-up-menu';
        levelUpMenu.innerHTML = `
            <div class="level-up-content">
                <h2>כל הכבוד!</h2>
                <p>סיימת את שלב ${this.level}</p>
                <button id="nextLevel">המשך לשלב הבא</button>
            </div>
        `;
        
        levelUpMenu.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        levelUpMenu.querySelector('.level-up-content').style.cssText = `
            background: #2c3e50;
            padding: 2rem;
            border-radius: 10px;
            text-align: center;
            color: white;
            box-shadow: 0 0 20px rgba(46, 204, 113, 0.5);
        `;

        levelUpMenu.querySelector('#nextLevel').style.cssText = `
            background: #2ecc71;
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 5px;
            font-size: 1.2rem;
            cursor: pointer;
            margin-top: 1rem;
            transition: background 0.3s;
        `;

        document.body.appendChild(levelUpMenu);

        document.getElementById('nextLevel').onclick = () => {
            levelUpMenu.remove();
            this.startNextLevel();
        };
    }

    startNextLevel() {
        this.isPaused = false;
        this.isGameActive = true;
        
        this.playerBall.x = this.canvas.width / 2;
        this.playerBall.y = this.canvas.height * 0.8;
        
        this.stones = [];
        this.obstacles = [];
        this.particles = [];
        
        this.gameLoop();
        this.spawnStones();
        this.spawnObstacles();
    }

    levelUp() {
        this.level++;
        this.size = this.defaultSettings.size;
        this.playerBall.size = this.size;
        this.sounds.levelUp.play();
        this.createParticles(this.playerBall.x, this.playerBall.y, '#ffd700');
        this.updateScore();
        
        this.showLevelUpMessage();
    }

    showControls() {
        const controls = document.createElement('div');
        controls.id = 'controls-info';
        controls.innerHTML = `
            <div class="controls-content">
                <h3>אפשרויות שליטה:</h3>
                <p>מקלדת: חצים ←↑↓→</p>
                <p>עכבר: הזז את העכבר לכיוון הרצוי</p>
                <button id="closeControls">הבנתי</button>
            </div>
        `;
        
        controls.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            z-index: 1000;
        `;

        document.body.appendChild(controls);
        
        document.getElementById('closeControls').onclick = () => {
            controls.remove();
        };
    }




    updatePlayerPosition() {
        const speed = 7;
        
        if (this.joystick.active) {
            // שליטה בג'ויסטיק
            this.playerBall.x += this.joystick.stickX * speed;
            this.playerBall.y += this.joystick.stickY * speed;
        } else if (this.mouseControl && this.mouseActive) {
            // שליטה בעכבר
            const targetX = this.mouseX;
            const targetY = this.mouseY;
            
            const dx = targetX - this.playerBall.x;
            const dy = targetY - this.playerBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                const moveX = (dx / distance) * speed;
                const moveY = (dy / distance) * speed;
                
                this.playerBall.x += moveX;
                this.playerBall.y += moveY;
            }
        } else {
            // שליטה במקלדת
            if (this.keys.ArrowLeft) this.playerBall.x -= speed;
            if (this.keys.ArrowRight) this.playerBall.x += speed;
            if (this.keys.ArrowUp) this.playerBall.y -= speed;
            if (this.keys.ArrowDown) this.playerBall.y += speed;
        }
    
        // הגבלת תנועה בתוך המסך
        this.playerBall.x = Math.max(this.playerBall.size, 
            Math.min(this.canvas.width - this.playerBall.size, this.playerBall.x));
        this.playerBall.y = Math.max(this.playerBall.size, 
            Math.min(this.canvas.height - this.playerBall.size, this.playerBall.y));
    
        this.playerBall.rotation += 0.1;
    }
    
    updateJoystickPosition(touch) {
        const dx = touch.clientX - this.joystick.baseX;
        const dy = touch.clientY - this.joystick.baseY;
        const distance = Math.min(this.joystick.maxDistance, 
            Math.sqrt(dx * dx + dy * dy));
        const angle = Math.atan2(dy, dx);
    
        const stickX = Math.cos(angle) * distance;
        const stickY = Math.sin(angle) * distance;
    
        const stick = document.getElementById('joystick-stick');
        stick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
    
        // נרמול הערכים בין -1 ל-1
        this.joystick.stickX = stickX / this.joystick.maxDistance;
        this.joystick.stickY = stickY / this.joystick.maxDistance;
    }


    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.backgroundOffset = (this.backgroundOffset + 2) % this.canvas.height;
        this.ctx.drawImage(this.images.background, 0, this.backgroundOffset, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.images.background, 0, this.backgroundOffset - this.canvas.height, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Brighten background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game elements
        this.drawObstacles();
        this.drawStones();
        this.drawParticles();
        this.drawPlayer();
    }

    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            this.ctx.save();
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 10;
            
            if (obstacle.type !== 'blackBall') {
                const img = this.images[obstacle.type];
                if (img && img.complete) {
                    // ציור התמונה בצורה פשוטה בלי סיבוב
                    this.ctx.drawImage(img, 
                        obstacle.x - obstacle.size, // שינוי מיקום ה-X
                        obstacle.y - obstacle.size, // שינוי מיקום ה-Y
                        obstacle.size * 2, 
                        obstacle.size * 2
                    );
                }
            } else {
                this.ctx.beginPath();
                this.ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, Math.PI * 2);
                this.ctx.fillStyle = '#000';
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }

    drawStones() {
        this.stones.forEach(stone => {
            if (stone.size > 0) {
                this.ctx.save();
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 10;
                this.ctx.translate(stone.x, stone.y);
                this.ctx.rotate(stone.rotation);
                this.ctx.beginPath();
                this.ctx.arc(0, 0, stone.size, 0, Math.PI * 2);
                this.ctx.fillStyle = stone.color;
                this.ctx.fill();
                this.ctx.restore();
            }
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            if (particle.size > 0) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `${particle.color}${Math.floor(particle.life * 255).toString(16)}`;
                this.ctx.fill();
                this.ctx.restore();
            }
        });
    }

    drawPlayer() {
        if (this.playerBall.size > 0) {
            this.ctx.save();
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 15;
            this.ctx.translate(this.playerBall.x, this.playerBall.y);
            this.ctx.rotate(this.playerBall.rotation);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.playerBall.size, 0, Math.PI * 2);
            this.ctx.fillStyle = this.playerBall.color;
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    update() {
        if (this.isPaused) return;

        this.updatePlayerPosition();
        
        this.stones.forEach(stone => {
            stone.y += stone.speed;
            stone.x += Math.sin(stone.y / 30) * 2;
            stone.rotation += 0.1;
        });

        this.obstacles.forEach(obstacle => {
            obstacle.y += obstacle.speed;
            if (obstacle.y > this.canvas.height + obstacle.size) {
                obstacle.y = -obstacle.size;
                obstacle.x = Math.random() * this.canvas.width;
            }
        });

        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            return particle.life > 0;
        });

        this.checkCollisions();
    }

    gameLoop() {
        if (!this.isGameActive) return;

        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}


// Start the game when the page loads
window.onload = () => {
    new Game();
};
