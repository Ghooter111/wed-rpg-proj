const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const interactionHint = document.getElementById('interactionHint');

// Modals
const modals = {
    invitation: document.getElementById('invitationModal'),
    alamat: document.getElementById('alamatModal'),
    galeri: document.getElementById('galeriModal'),
    kisah: document.getElementById('kisahModal'),
    donasi: document.getElementById('donasiModal')
};

let activeModalId = null;

// Attach close event to all close buttons
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', closeModal);
});
// Attach close event to clicking outside the modal content
Object.values(modals).forEach(modal => {
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
});

// Resize canvas to fill window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game State
const gameState = {
    isModalOpen: false,
    assetsLoaded: false,
    assetsToLoad: 9,
    assetsLoadedCount: 0
};

// --- ENTITIES ---
const player = {
    x: 0,
    y: 0,
    width: 14,  
    height: 12, 
    drawWidth: 20,  
    drawHeight: 40, 
    speed: 1.5,
    facing: 'up', 
    isWalking: false,
    walkFrame: 0,
    staggerFrames: 10 
};

const interactionZones = [
    { id: 'invitation', x: 160, y: 40, w: 250, h: 120, label: 'Undangan' }, // Altar Top
    { id: 'galeri', x: 140, y: 620, w: 90, h: 100, label: 'Galeri Pre-Wed' }, // Orange stall
    { id: 'kisah', x: 340, y: 620, w: 90, h: 100, label: 'Kisah Pertemuan' }, // Purple stall
    { id: 'alamat', x: 40, y: 700, w: 90, h: 100, label: 'Alamat Acara' }, // Green stall
    { id: 'donasi', x: 440, y: 700, w: 90, h: 100, label: 'Tanda Kasih / Donasi' } // Blue stall
];
let activeZone = null;

// --- BACKGROUND MUSIC (PLAYLIST & CONTROLS) ---
let audioCtx;
let audioBuffers = [];
let audioSource;
let gainNode;
let isMusicPlaying = false;
let isMusicMuted = false;
let currentSongIndex = 0;

async function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.gain.value = document.getElementById('volumeSlider').value;
        gainNode.connect(audioCtx.destination);
        
        const playlist = [
            './assets/music/Valley_Waking.mp3',
            './assets/music/Where_the_Wind_Bends.mp3'
        ];
        
        for (let url of playlist) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await audioCtx.decodeAudioData(arrayBuffer);
            audioBuffers.push(buffer);
        }
        
        playNextSong();
    } catch (e) {
        console.error("Audio init error:", e);
    }
}

function playNextSong() {
    if (!audioCtx || audioBuffers.length === 0) return;
    
    audioSource = audioCtx.createBufferSource();
    audioSource.buffer = audioBuffers[currentSongIndex];
    audioSource.loop = false; // Don't loop individual song, let it transition
    
    audioSource.onended = () => {
        currentSongIndex = (currentSongIndex + 1) % audioBuffers.length;
        playNextSong();
    };
    
    const targetVolume = isMusicMuted ? 0 : parseFloat(document.getElementById('volumeSlider').value);
    
    // Only fade in if it's the first time playing to avoid dipping volume between songs
    if (!isMusicPlaying) {
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 2);
    } else {
        gainNode.gain.setValueAtTime(targetVolume, audioCtx.currentTime);
    }
    
    audioSource.connect(gainNode);
    audioSource.start(0);
    isMusicPlaying = true;
}

// Play music on first interaction
function firstInteraction() {
    if (!audioCtx) initAudio();
    else if (audioCtx.state === 'suspended') audioCtx.resume();
    
    window.removeEventListener('keydown', firstInteraction);
    window.removeEventListener('click', firstInteraction);
}
window.addEventListener('keydown', firstInteraction);
window.addEventListener('click', firstInteraction);

// UI Controls
const btnToggleMusic = document.getElementById('btnToggleMusic');
const volumeSlider = document.getElementById('volumeSlider');

btnToggleMusic.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!audioCtx) {
        initAudio();
        return;
    }
    
    if (isMusicMuted) {
        gainNode.gain.value = volumeSlider.value;
        btnToggleMusic.innerText = '🎵';
        isMusicMuted = false;
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } else {
        gainNode.gain.value = 0;
        btnToggleMusic.innerText = '🔇';
        isMusicMuted = true;
    }
});

volumeSlider.addEventListener('input', (e) => {
    e.stopPropagation();
    if (gainNode && !isMusicMuted) {
        gainNode.gain.value = e.target.value;
    }
});
volumeSlider.addEventListener('click', (e) => e.stopPropagation());

function assetLoaded() {
    gameState.assetsLoadedCount++;
    if (gameState.assetsLoadedCount === gameState.assetsToLoad) {
        gameState.assetsLoaded = true;
        
        worldWidth = bgImage.width;
        worldHeight = bgImage.height;
        player.x = worldWidth / 2 - player.width / 2;
        player.y = worldHeight - 150; 
        

    }
}

// --- ASSETS ---
let worldWidth = window.innerWidth;
let worldHeight = window.innerHeight;

// --- PARTICLES ---
const leaves = [];
const splashes = [];

function spawnLeaf() {
    leaves.push({
        x: Math.random() * worldWidth,
        y: camera.y - 20,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 1 + 1,
        size: Math.random() * 4 + 3,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.1,
        color: Math.random() > 0.5 ? '#e67e22' : '#f1c40f'
    });
}

function spawnSplash() {
    splashes.push({
        x: worldWidth * 0.75 + Math.random() * (worldWidth * 0.2),
        y: worldHeight * 0.4 + Math.random() * (worldHeight * 0.2),
        radius: 0,
        maxRadius: Math.random() * 10 + 5,
        opacity: 0.8
    });
}

const bgImage = new Image(); bgImage.onload = assetLoaded; bgImage.src = './assets/background.jpg';

const charUp = new Image(); charUp.onload = assetLoaded; charUp.src = './assets/char_left.png'; // ATAS (Gambar 3)
const charDown = new Image(); charDown.onload = assetLoaded; charDown.src = './assets/char_down.png'; // BAWAH (Gambar 2)
const charLeft = new Image(); charLeft.onload = assetLoaded; charLeft.src = './assets/char_up.png'; // KIRI (Gambar 1)
const charRight = new Image(); charRight.onload = assetLoaded; charRight.src = './assets/char_right.png'; // KANAN (Gambar 4)

const walkUp = new Image(); walkUp.onload = assetLoaded; walkUp.src = './assets/walk_up.png'; // JALAN ATAS (Gambar 5)
const walkDown = new Image(); walkDown.onload = assetLoaded; walkDown.src = './assets/walk_down.png'; // JALAN BAWAH (Gambar 6)
const walkLeft = new Image(); walkLeft.onload = assetLoaded; walkLeft.src = './assets/walk_right.png'; // JALAN KIRI (Gambar 8)
const walkRight = new Image(); walkRight.onload = assetLoaded; walkRight.src = './assets/walk_left.png'; // JALAN KANAN (Gambar 7)


// --- CAMERA ---
const camera = { x: 0, y: 0 };




// --- INPUT HANDLING ---
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, a: false, s: false, d: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key.toLowerCase() === 'w') keys.w = true;
    if (e.key.toLowerCase() === 'a') keys.a = true;
    if (e.key.toLowerCase() === 's') keys.s = true;
    if (e.key.toLowerCase() === 'd') keys.d = true;

    if ((e.key === ' ' || e.key.toLowerCase() === 'e') && isNearInteractionZone() && !gameState.isModalOpen) {
        openModal();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key.toLowerCase() === 'w') keys.w = false;
    if (e.key.toLowerCase() === 'a') keys.a = false;
    if (e.key.toLowerCase() === 's') keys.s = false;
    if (e.key.toLowerCase() === 'd') keys.d = false;
});

// Mobile Controls
const btnUp = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnAction = document.getElementById('btnAction');

function setupMobileBtn(btn, keyAssigned) {
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyAssigned] = true; btn.classList.add('active'); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyAssigned] = false; btn.classList.remove('active'); });
    btn.addEventListener('mousedown', () => { keys[keyAssigned] = true; btn.classList.add('active'); });
    btn.addEventListener('mouseup', () => { keys[keyAssigned] = false; btn.classList.remove('active'); });
    btn.addEventListener('mouseleave', () => { keys[keyAssigned] = false; btn.classList.remove('active'); });
}

setupMobileBtn(btnUp, 'w');
setupMobileBtn(btnDown, 's');
setupMobileBtn(btnLeft, 'a');
setupMobileBtn(btnRight, 'd');

btnAction.addEventListener('touchstart', (e) => { e.preventDefault(); btnAction.classList.add('active'); let zone = isNearInteractionZone(); if (zone && !gameState.isModalOpen) openModal(zone.id); });
btnAction.addEventListener('touchend', (e) => { e.preventDefault(); btnAction.classList.remove('active'); });
btnAction.addEventListener('mousedown', () => { btnAction.classList.add('active'); let zone = isNearInteractionZone(); if (zone && !gameState.isModalOpen) openModal(zone.id); });
btnAction.addEventListener('mouseup', () => btnAction.classList.remove('active'));

// --- LOGIC ---
let gameFrame = 0;
let walkTimer = 0;
const walkSpeed = 10;

const collisions = [
    { x: 336, y: 679, w: 66, h: 45 },
    { x: 435, y: 723, w: 58, h: 50 },
    { x: 476, y: 794, w: 44, h: 72 },
    { x: 412, y: 886, w: 67, h: 48 },
    { x: 160, y: 885, w: 58, h: 40 },
    { x: 197, y: 772, w: 59, h: 42 },
    { x: 266, y: 815, w: 52, h: 38 },
    { x: 345, y: 824, w: 57, h: 42 },
    { x: 347, y: 765, w: 54, h: 39 },
    { x: 96, y: 788, w: 61, h: 49 },
    { x: 109, y: 721, w: 61, h: 41 },
    { x: 182, y: 695, w: 68, h: 29 },
    { x: 26, y: 964, w: 229, h: 28 },
    { x: 312, y: 966, w: 229, h: 24 },
    { x: 537, y: 686, w: 6, h: 292 },
    { x: 21, y: 687, w: 8, h: 269 },
    { x: 50, y: 929, w: 19, h: 17 },
    { x: 61, y: 803, w: 21, h: 23 },
    { x: 288, y: 784, w: 22, h: 17 },
    { x: 498, y: 938, w: 20, h: 18 },
    { x: 499, y: 739, w: 16, h: 15 },
    { x: 428, y: 707, w: 13, h: 17 },
    { x: 28, y: 686, w: 227, h: 6 },
    { x: 314, y: 679, w: 224, h: 8 },
    { x: 57, y: 722, w: 33, h: 26 },
    { x: 85, y: 935, w: 17, h: 13 },
    { x: 316, y: 945, w: 8, h: 18 },
    { x: 257, y: 493, w: 55, h: 38 },
    { x: 257, y: 557, w: 16, h: 79 },
    { x: 297, y: 557, w: 13, h: 85 },
    { x: 167, y: 573, w: 24, h: 25 },
    { x: 194, y: 600, w: 29, h: 21 },
    { x: 228, y: 620, w: 23, h: 17 },
    { x: 157, y: 545, w: 17, h: 23 },
    { x: 146, y: 513, w: 18, h: 24 },
    { x: 150, y: 476, w: 18, h: 46 },
    { x: 162, y: 448, w: 15, h: 21 },
    { x: 176, y: 420, w: 14, h: 23 },
    { x: 194, y: 412, w: 14, h: 27 },
    { x: 310, y: 620, w: 23, h: 13 },
    { x: 335, y: 616, w: 25, h: 11 },
    { x: 360, y: 599, w: 20, h: 18 },
    { x: 383, y: 576, w: 19, h: 13 },
    { x: 395, y: 550, w: 18, h: 13 },
    { x: 409, y: 519, w: 13, h: 23 },
    { x: 407, y: 479, w: 16, h: 21 },
    { x: 399, y: 445, w: 13, h: 17 },
    { x: 376, y: 414, w: 15, h: 22 },
    { x: 353, y: 399, w: 20, h: 22 },
    { x: 324, y: 389, w: 17, h: 11 },
    { x: 295, y: 382, w: 19, h: 18 },
    { x: 258, y: 385, w: 27, h: 13 },
    { x: 228, y: 392, w: 17, h: 11 },
    { x: 214, y: 398, w: 16, h: 15 },
    { x: 256, y: 447, w: 12, h: 13 },
    { x: 236, y: 457, w: 17, h: 11 },
    { x: 222, y: 472, w: 17, h: 10 },
    { x: 213, y: 484, w: 14, h: 11 },
    { x: 215, y: 516, w: 13, h: 18 },
    { x: 224, y: 533, w: 18, h: 16 },
    { x: 242, y: 551, w: 13, h: 13 },
    { x: 211, y: 499, w: 10, h: 15 },
    { x: 274, y: 447, w: 27, h: 16 },
    { x: 312, y: 451, w: 25, h: 22 },
    { x: 343, y: 478, w: 12, h: 16 },
    { x: 350, y: 503, w: 15, h: 17 },
    { x: 343, y: 524, w: 8, h: 14 },
    { x: 316, y: 555, w: 16, h: 6 },
    { x: 334, y: 540, w: 12, h: 13 },
    { x: 107, y: 640, w: 64, h: 40 },
    { x: 16, y: 462, w: 23, h: 216 },
    { x: 53, y: 352, w: 83, h: 76 },
    { x: 12, y: 418, w: 37, h: 33 },
    { x: 435, y: 445, w: 33, h: 108 },
    { x: 514, y: 437, w: 56, h: 155 },
    { x: 521, y: 416, w: 42, h: 18 },
    { x: 549, y: 603, w: 20, h: 81 },
    { x: 491, y: 626, w: 35, h: 36 },
    { x: 486, y: 664, w: 55, h: 13 },
    { x: 531, y: 637, w: 14, h: 19 },
    { x: 40, y: 661, w: 80, h: 15 },
    { x: 143, y: 150, w: 13, h: 153 },
    { x: 144, y: 301, w: 107, h: 7 },
    { x: 320, y: 294, w: 106, h: 12 },
    { x: 414, y: 150, w: 10, h: 142 },
    { x: 453, y: 334, w: 30, h: 22 },
    { x: 542, y: 339, w: 21, h: 52 },
    { x: 182, y: 226, w: 67, h: 51 },
    { x: 320, y: 229, w: 65, h: 49 },
    { x: 39, y: 77, w: 10, h: 294 },
    { x: 523, y: 75, w: 11, h: 245 },
    { x: 522, y: 316, w: 48, h: 7 },
    { x: 544, y: 318, w: 20, h: 16 },
    { x: 524, y: 322, w: 16, h: 18 },
    { x: 48, y: 77, w: 475, h: 8 },
    { x: 183, y: 123, w: 8, h: 62 },
    { x: 180, y: 186, w: 69, h: 13 },
    { x: 319, y: 188, w: 70, h: 13 },
    { x: 372, y: 125, w: 17, h: 62 },
    { x: 190, y: 121, w: 180, h: 8 },
    { x: 71, y: 105, w: 22, h: 151 },
    { x: 473, y: 251, w: 23, h: 17 },
    { x: 203, y: 993, w: 16, h: 24 },
    { x: 356, y: 992, w: 13, h: 23 },
    { x: 543, y: 392, w: 23, h: 18 },
    { x: 378, y: 85, w: 12, h: 41 },
    { x: 182, y: 80, w: 12, h: 39 },
    { x: 267, y: 131, w: 38, h: 44 },
];

function checkCollision(newX, newY, width, height) {
    for (const box of collisions) {
        if (newX < box.x + box.w &&
            newX + width > box.x &&
            newY < box.y + box.h &&
            newY + height > box.y) {
            return true;
        }
    }
    return false;
}

function isNearInteractionZone() {
    const pad = 15; // 15px padding for interaction
    for (let zone of interactionZones) {
        if (player.x < zone.x + zone.w + pad &&
            player.x + player.width > zone.x - pad &&
            player.y < zone.y + zone.h + pad &&
            player.y + player.height > zone.y - pad) {
            return zone;
        }
    }
    return null;
}

function update() {
    if (gameState.isModalOpen || !gameState.assetsLoaded) return;

    let dx = 0;
    let dy = 0;

    if (keys['w']) { dy -= player.speed; player.facing = 'up'; }
    if (keys['s']) { dy += player.speed; player.facing = 'down'; }
    if (keys['a']) { dx -= player.speed; player.facing = 'left'; }
    if (keys['d']) { dx += player.speed; player.facing = 'right'; }

    player.isWalking = (dx !== 0 || dy !== 0);

    if (player.isWalking) {
        walkTimer++;
        if (walkTimer >= walkSpeed) {
            walkTimer = 0;
            player.walkFrame = player.walkFrame === 1 ? 0 : 1;
        }
    } else {
        player.walkFrame = 0;
        walkTimer = 0;
    }

    let newX = player.x + dx;
    let newY = player.y + dy;

    // Keep inside world bounds
    newX = Math.max(0, Math.min(newX, worldWidth - player.width));
    newY = Math.max(0, Math.min(newY, worldHeight - player.height));

    // Collision Check with sliding
    if (!checkCollision(newX, newY, player.width, player.height)) {
        player.x = newX;
        player.y = newY;
    } else {
        if (!checkCollision(player.x, newY, player.width, player.height)) {
            player.y = newY;
        } else if (!checkCollision(newX, player.y, player.width, player.height)) {
            player.x = newX;
        }
    }

    // Update Camera (Math.floor to prevent subpixel rendering lag on mobile)
    camera.x = Math.floor(Math.max(0, Math.min(player.x - canvas.width / 2, worldWidth - canvas.width)));
    camera.y = Math.floor(Math.max(0, Math.min(player.y - canvas.height / 2, worldHeight - canvas.height)));

    activeZone = isNearInteractionZone();
    if (activeZone) {
        interactionHint.innerText = "Tekan 'E' untuk buka " + activeZone.label;
        interactionHint.classList.remove('hidden');
    } else {
        interactionHint.classList.add('hidden');
    }
    
    // --- PARTICLES UPDATE ---
    // Reduced spawn rate for better performance
    if (Math.random() < 0.02) spawnLeaf();
    if (Math.random() < 0.01) spawnSplash();

    for (let i = leaves.length - 1; i >= 0; i--) {
        const l = leaves[i];
        l.x += l.vx + Math.sin(gameFrame * 0.05 + l.angle) * 0.5;
        l.y += l.vy;
        l.angle += l.spinSpeed;
        if (l.y > camera.y + canvas.height + 20) leaves.splice(i, 1);
    }

    for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.radius += 0.2;
        s.opacity -= 0.02;
        if (s.opacity <= 0) splashes.splice(i, 1);
    }

    gameFrame++;
}

// --- DRAWING ---
function drawPlayer() {
    const spriteYOffset = 4; // Offset to account for transparent space at the bottom of the sprite image
    const drawX = Math.floor(player.x - camera.x - (player.drawWidth - player.width)/2);
    const drawY = Math.floor(player.y - camera.y - (player.drawHeight - player.height) + spriteYOffset);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(player.x - camera.x + player.width/2, player.y - camera.y + player.height, player.width/2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    let currentSprite;
    if (player.facing === 'up') currentSprite = (player.isWalking && player.walkFrame === 1) ? walkUp : charUp;
    else if (player.facing === 'down') currentSprite = (player.isWalking && player.walkFrame === 1) ? walkDown : charDown;
    else if (player.facing === 'left') currentSprite = (player.isWalking && player.walkFrame === 1) ? walkLeft : charLeft;
    else currentSprite = (player.isWalking && player.walkFrame === 1) ? walkRight : charRight;
    
    ctx.drawImage(
        currentSprite,
        0, 0, currentSprite.width, currentSprite.height,
        drawX, drawY, player.drawWidth, player.drawHeight
    );

    // Debug Collisions
    const forceDebug = true; // Selalu aktifkan box merah untuk sementara
    if (forceDebug || window.location.search.includes('debug') || window.location.search.includes('edit')) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        for (const box of collisions) {
            ctx.fillRect(box.x - camera.x, box.y - camera.y, box.w, box.h);
        }
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.fillRect(player.x - camera.x, player.y - camera.y, player.width, player.height);
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState.assetsLoaded) {
        ctx.drawImage(
            bgImage,
            camera.x, camera.y, canvas.width, canvas.height,
            0, 0, canvas.width, canvas.height
        );
        
        splashes.forEach(s => {
            const drawX = s.x - camera.x;
            const drawY = s.y - camera.y;
            if (drawX > -20 && drawX < canvas.width + 20 && drawY > -20 && drawY < canvas.height + 20) {
                ctx.beginPath();
                ctx.arc(drawX, drawY, s.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${s.opacity})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });

        drawPlayer();
        
        // Draw particles
        for (let l of leaves) {
            ctx.save();
            ctx.translate(l.x - camera.x, l.y - camera.y);
            ctx.rotate(l.angle);
            ctx.fillStyle = '#6ab04c';
            ctx.globalAlpha = 0.8;
            ctx.fillRect(-l.size/2, -l.size/2, l.size, l.size);
            ctx.restore();
        }
        
        for (let s of splashes) {
            ctx.fillStyle = `rgba(135, 206, 235, ${s.alpha})`;
            ctx.beginPath();
            ctx.arc(s.x - camera.x, s.y - camera.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        

        
    } else {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Memuat Aset...', canvas.width/2, canvas.height/2);
    }
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// --- MODAL LOGIC ---
function openModal(id) {
    if (!id) id = 'invitation'; // default
    if (!modals[id]) return;
    
    gameState.isModalOpen = true;
    activeModalId = id;
    modals[id].classList.remove('hidden');
    interactionHint.classList.add('hidden');
    for (let key in keys) { keys[key] = false; }
    
    // Update active state in bottom nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.getAttribute('data-target') === id) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function closeModal() {
    if (activeModalId && modals[activeModalId]) {
        modals[activeModalId].classList.add('hidden');
    }
    
    // Reset bottom nav to home active (or none)
    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.getAttribute('data-target') === 'home') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    setTimeout(() => { 
        gameState.isModalOpen = false; 
        activeModalId = null;
    }, 200);
}

// Cover Overlay Logic
const btnOpenInvitation = document.getElementById('btnOpenInvitation');
const coverOverlay = document.getElementById('coverOverlay');

if (btnOpenInvitation) {
    btnOpenInvitation.addEventListener('click', () => {
        coverOverlay.classList.add('hidden-cover');
        
        // Start audio after user clicks to open
        if (!audioCtx) initAudio();
        else if (audioCtx.state === 'suspended') audioCtx.resume();
        
        // Remove from DOM after fade out to save performance
        setTimeout(() => {
            if (coverOverlay.parentNode) {
                coverOverlay.parentNode.removeChild(coverOverlay);
            }
        }, 1500);
    });
}

// Bottom Nav Logic
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target === 'home') {
            closeModal();
        } else {
            if (activeModalId !== target) {
                if (activeModalId) closeModal(); // Close current if open
                setTimeout(() => openModal(target), activeModalId ? 250 : 0);
            }
        }
    });
});

gameLoop();

// Hide instructions after 2 seconds
setTimeout(() => {
    const instructions = document.getElementById('instructions');
    if (instructions) {
        instructions.classList.add('fade-out');
    }
}, 2000);

// --- COLLISION EDITOR ---
let isEditing = false;
let editBoxStart = null;
const forceEdit = true; // Selalu aktifkan editor untuk sementara

if (forceEdit || window.location.search.includes('edit')) {
    document.getElementById('editorOutput').style.display = 'block';
    
    canvas.addEventListener('mousedown', (e) => {
        isEditing = true;
        editBoxStart = { x: e.clientX + camera.x, y: e.clientY + camera.y };
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isEditing || !editBoxStart) return;
        const currentX = e.clientX + camera.x;
        const currentY = e.clientY + camera.y;
        
        // Draw temporary box
        render(); // redraw frame
        ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
        const x = Math.min(editBoxStart.x, currentX);
        const y = Math.min(editBoxStart.y, currentY);
        const w = Math.abs(currentX - editBoxStart.x);
        const h = Math.abs(currentY - editBoxStart.y);
        ctx.fillRect(x - camera.x, y - camera.y, w, h);
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!isEditing || !editBoxStart) return;
        isEditing = false;
        const currentX = e.clientX + camera.x;
        const currentY = e.clientY + camera.y;
        
        const x = Math.min(editBoxStart.x, currentX);
        const y = Math.min(editBoxStart.y, currentY);
        const w = Math.abs(currentX - editBoxStart.x);
        const h = Math.abs(currentY - editBoxStart.y);
        
        if (w > 5 && h > 5) {
            collisions.push({ x: Math.floor(x), y: Math.floor(y), w: Math.floor(w), h: Math.floor(h) });
            updateEditorOutput();
        }
        editBoxStart = null;
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'z') {
            collisions.pop();
            updateEditorOutput();
        }
    });

    function updateEditorOutput() {
        let str = "const collisions = [\n";
        collisions.forEach(b => {
            str += `    { x: ${b.x}, y: ${b.y}, w: ${b.w}, h: ${b.h} },\n`;
        });
        str += "];";
        const ta = document.getElementById('editorOutput');
        ta.value = str;
        ta.scrollTop = ta.scrollHeight;
    }
}
