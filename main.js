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

// Quests and Dialogue
let questItems = [
    { x: 380, y: 320, collected: false },
    { x: 750, y: 800, collected: false },
    { x: 220, y: 780, collected: false }
];
let collectedQuests = 0;

let isDialogueActive = false;
let currentDialogue = null;
const dialogBox = document.getElementById('dialogBox');
const dialogName = document.getElementById('dialogName');
const dialogText = document.getElementById('dialogText');
const questTracker = document.getElementById('questTracker');
const questText = document.getElementById('questText');
modals.quest = document.getElementById('questModal');

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
    assetsToLoad: 50,
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

// Setup NPC Dialogues
const npcNames = ["Budi", "Siti", "Andi", "Tini", "Agus", "Dewi"];
const npcDialogues = [
    "Wah, tamannya indah sekali ya!",
    "Aku tidak sabar melihat mereka di pelaminan.",
    "Bunga-bunga di sini harum sekali.",
    "Semoga mereka bahagia selamanya.",
    "Eh, kamu sudah lihat foto pre-wedding mereka?",
    "Makanannya enak-enak lho!"
];

npcs.forEach((npc, index) => {
    npc.name = npcNames[index % npcNames.length];
    npc.dialogue = npcDialogues[index % npcDialogues.length];
});

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

const signsImg = new Image(); signsImg.onload = assetLoaded; signsImg.src = './assets/signs.png';

const npcImages = [];
for (let i = 0; i < 40; i++) {
    const img = new Image();
    img.onload = assetLoaded;
    const num = i.toString().padStart(3, '0');
    img.src = `./assets/Random NPC/${num}.png`;
    npcImages.push(img);
}

// --- NPC STATE ---
// Structure: { id: index, spriteId: 0-39, x: 0, y: 0, path: [{x,y}], pathIndex: 0, facing: 'down', walkFrame: 0, walkTimer: 0, isWalking: false, waitTimer: 0 }
let npcs = [
  {
    "id": 1788169544430,
    "spriteId": 27,
    "x": 324.3435512427303,
    "y": 335.4829906831398,
    "path": [
      {
        "x": 297,
        "y": 334
      },
      {
        "x": 327,
        "y": 335
      },
      {
        "x": 305,
        "y": 339
      }
    ],
    "pathIndex": 0,
    "facing": "down",
    "walkFrame": 0,
    "walkTimer": 0,
    "isWalking": false,
    "waitTimer": 0
  },
  {
    "id": 1788169568445,
    "spriteId": 33,
    "x": 101,
    "y": 494,
    "path": [
      {
        "x": 110,
        "y": 467
      },
      {
        "x": 101,
        "y": 494
      }
    ],
    "pathIndex": 0,
    "facing": "down",
    "walkFrame": 0,
    "walkTimer": 0,
    "isWalking": false,
    "waitTimer": 0
  },
  {
    "id": 1788169583733,
    "spriteId": 11,
    "x": 517.1884134637967,
    "y": 593.2510345121608,
    "path": [
      {
        "x": 520,
        "y": 593
      },
      {
        "x": 464,
        "y": 598
      }
    ],
    "pathIndex": 0,
    "facing": "down",
    "walkFrame": 0,
    "walkTimer": 0,
    "isWalking": false,
    "waitTimer": 0
  },
  {
    "id": 1788169592167,
    "spriteId": 17,
    "x": 151,
    "y": 837,
    "path": [
      {
        "x": 124,
        "y": 846
      },
      {
        "x": 151,
        "y": 837
      }
    ],
    "pathIndex": 0,
    "facing": "down",
    "walkFrame": 0,
    "walkTimer": 0,
    "isWalking": false,
    "waitTimer": 0
  },
  {
    "id": 1788169606478,
    "spriteId": 30,
    "x": 422.7486508047069,
    "y": 847.541091672508,
    "path": [
      {
        "x": 445,
        "y": 843
      },
      {
        "x": 402,
        "y": 818
      },
      {
        "x": 396,
        "y": 853
      }
    ],
    "pathIndex": 0,
    "facing": "down",
    "walkFrame": 0,
    "walkTimer": 0,
    "isWalking": false,
    "waitTimer": 0
  }
];

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

    if (e.key === ' ' || e.key.toLowerCase() === 'e') {
        handleAction();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key.toLowerCase() === 'w') keys.w = false;
    if (e.key.toLowerCase() === 'a') keys.a = false;
    if (e.key.toLowerCase() === 's') keys.s = false;
    if (e.key.toLowerCase() === 'd') keys.d = false;
});

// Menu Toggle Logic
const btnToggleMenu = document.getElementById('btnToggleMenu');
if (btnToggleMenu) {
    btnToggleMenu.addEventListener('click', () => {
        document.body.classList.toggle('menu-hidden');
    });
}

// Mobile Controls
const btnAction = document.getElementById('btnAction');

const joystickZone = document.getElementById('joystickZone');
const joystickStick = document.getElementById('joystickStick');
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let stickMaxRadius = 35; 

if (joystickZone && joystickStick) {
    joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        joystickZone.classList.add('active');
        const rect = joystickZone.getBoundingClientRect();
        joystickCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        handleJoystickMove(e.touches[0]);
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (joystickActive) {
            handleJoystickMove(e.touches[0]);
        }
    }, { passive: false });

    const stopJoystick = (e) => {
        if (e && e.cancelable) e.preventDefault();
        joystickActive = false;
        joystickZone.classList.remove('active');
        joystickStick.style.transform = `translate(-50%, -50%)`;
        keys.w = false;
        keys.a = false;
        keys.s = false;
        keys.d = false;
    };

    joystickZone.addEventListener('touchend', stopJoystick);
    joystickZone.addEventListener('touchcancel', stopJoystick);

    function handleJoystickMove(touch) {
        const dx = touch.clientX - joystickCenter.x;
        const dy = touch.clientY - joystickCenter.y;
        const distance = Math.min(Math.sqrt(dx*dx + dy*dy), stickMaxRadius);
        const angle = Math.atan2(dy, dx);
        
        const moveX = Math.cos(angle) * distance;
        const moveY = Math.sin(angle) * distance;
        joystickStick.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
        
        keys.w = false;
        keys.a = false;
        keys.s = false;
        keys.d = false;
        
        if (distance > 10) {
            const deg = angle * (180 / Math.PI);
            if (deg < -22.5 && deg > -157.5) keys.w = true;
            if (deg > 22.5 && deg < 157.5) keys.s = true;
            if (Math.abs(deg) > 112.5) keys.a = true;
            if (Math.abs(deg) < 67.5) keys.d = true;
        }
    }
}

function handleAction() {
    // If dialogue is active, advance or close it
    if (isDialogueActive) {
        dialogBox.classList.add('hidden');
        isDialogueActive = false;
        setTimeout(() => { currentDialogue = null; }, 300);
        return;
    }

    if (gameState.isModalOpen) return;

    // Check interaction zones
    let zone = isNearInteractionZone();
    if (zone) {
        openModal(zone.id);
        return;
    }

    // Check NPCs
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    
    for (const npc of npcs) {
        if (!npc.dialogue) continue;
        const nx = npc.x + 16;
        const ny = npc.y + 16;
        const dist = Math.hypot(px - nx, py - ny);
        if (dist < 50) {
            currentDialogue = npc;
            dialogName.innerText = npc.name;
            dialogText.innerText = npc.dialogue;
            dialogBox.classList.remove('hidden');
            isDialogueActive = true;
            
            // Turn NPC to face player
            const dx = px - nx;
            const dy = py - ny;
            if (Math.abs(dx) > Math.abs(dy)) {
                npc.facing = dx > 0 ? 'right' : 'left';
            } else {
                npc.facing = dy > 0 ? 'down' : 'up';
            }
            return;
        }
    }

    // Check Quest Items
    for (const item of questItems) {
        if (item.collected) continue;
        const dist = Math.hypot(px - item.x, py - item.y);
        if (dist < 40) {
            item.collected = true;
            collectedQuests++;
            questText.innerText = `Bunga Mawar: ${collectedQuests}/3`;
            questTracker.classList.add('pop');
            setTimeout(() => questTracker.classList.remove('pop'), 300);
            
            // Spawn some particles
            for(let i=0; i<10; i++) {
                splashes.push({
                    x: item.x,
                    y: item.y,
                    radius: Math.random() * 3 + 1,
                    opacity: 1,
                    speedY: -Math.random() * 2 - 1,
                    speedX: (Math.random() - 0.5) * 2
                });
            }

            if (collectedQuests >= 3) {
                setTimeout(() => openModal('quest'), 500);
            }
            return;
        }
    }
}

btnAction.addEventListener('touchstart', (e) => { e.preventDefault(); btnAction.classList.add('active'); handleAction(); });
btnAction.addEventListener('touchend', (e) => { e.preventDefault(); btnAction.classList.remove('active'); });
btnAction.addEventListener('mousedown', () => { btnAction.classList.add('active'); handleAction(); });
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
    { x: 138, y: 685, w: 6, h: 11 },
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

function updateNpcs() {
    for (const npc of npcs) {
        if (!npc.path || npc.path.length === 0) {
            npc.isWalking = false;
            npc.walkFrame = 0;
            continue;
        }
        if (npc.waitTimer > 0) {
            npc.waitTimer--;
            npc.isWalking = false;
            npc.walkFrame = 0;
            continue;
        }

        const target = npc.path[npc.pathIndex];
        const dx = target.x - npc.x;
        const dy = target.y - npc.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            npc.x = target.x;
            npc.y = target.y;
            npc.pathIndex = (npc.pathIndex + 1) % npc.path.length;
            npc.waitTimer = 30 + Math.random() * 30; // Wait a bit at waypoints
            npc.isWalking = false;
            npc.walkFrame = 0;
            continue;
        }

        const speed = 0.3; // Walking speed
        const moveX = (dx / dist) * speed;
        const moveY = (dy / dist) * speed;

        if (Math.abs(moveX) > Math.abs(moveY)) {
            npc.facing = moveX > 0 ? 'right' : 'left';
        } else {
            npc.facing = moveY > 0 ? 'down' : 'up';
        }

        npc.x += moveX;
        npc.y += moveY;

        npc.isWalking = true;
        npc.walkTimer++;
        if (npc.walkTimer > 12) {
            npc.walkTimer = 0;
            npc.walkFrame = (npc.walkFrame + 1) % 4; // 0, 1, 2, 3 mapped to walk sequence
        }
    }
}

function update() {
    if (gameState.isModalOpen || !gameState.assetsLoaded || isDialogueActive) return;
    
    updateNpcs();

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
    camera.x = Math.max(0, Math.min(player.x - canvas.width / 2, worldWidth - canvas.width)) | 0;
    camera.y = Math.max(0, Math.min(player.y - canvas.height / 2, worldHeight - canvas.height)) | 0;

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
    const spriteYOffset = 4;
    const drawX = (player.x - camera.x - (player.drawWidth - player.width)/2) | 0;
    const drawY = (player.y - camera.y - (player.drawHeight - player.height) + spriteYOffset) | 0;

    // Fast Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect((player.x - camera.x + player.width*0.1) | 0, (player.y - camera.y + player.height - 2) | 0, (player.width*0.8) | 0, 4);

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
}

const signSettings = 
{
  "galeri": {
    "w": 75,
    "ox": 27,
    "oy": 41
  },
  "kisah": {
    "w": 75,
    "ox": -13,
    "oy": 39
  },
  "alamat": {
    "w": 75,
    "ox": 53,
    "oy": -1
  },
  "donasi": {
    "w": 75,
    "ox": -13,
    "oy": 6
  }
};

let mouseX = 0, mouseY = 0;
function drawFloatingSigns() {
    const time = Date.now() * 0.003;
    const floatY = Math.sin(time) * 5;
    
    interactionZones.forEach(zone => {
        if (zone.id === 'invitation' || !signSettings[zone.id]) return; // Skip altar
        
        const conf = signSettings[zone.id];
        const signW = signsImg.width / 2;
        const signH = signsImg.height / 2;
        const drawW = conf.w;
        const drawH = drawW * (signH / signW);
        
        const x = (zone.x + zone.w / 2) + conf.ox - camera.x;
        const y = (zone.y) + conf.oy + floatY - camera.y;
        
        if (x > -100 && x < canvas.width + 100 && y > -100 && y < canvas.height + 100) {
            let sx = 0, sy = 0;
            
            if (zone.id === 'galeri') {
                sx = 0; sy = 0;
            } else if (zone.id === 'kisah') {
                sx = signW; sy = 0;
            } else if (zone.id === 'alamat') {
                sx = 0; sy = signH;
            } else if (zone.id === 'donasi') {
                sx = signW; sy = signH;
            }
            
            if (draggingSignId === zone.id) {
                ctx.globalAlpha = 0.5;
            }
            
            ctx.drawImage(
                signsImg,
                sx, sy, signW, signH,
                x - drawW/2, y - drawH/2, drawW, drawH
            );
            ctx.globalAlpha = 1.0;
        }
    });
}

function drawNpcs() {
    for (const npc of npcs) {
        const img = npcImages[npc.spriteId];
        if (!img) continue;

        const frameW = (img.width / 3) | 0;
        const frameH = (img.height / 4) | 0;
        
        let row = 0;
        if (npc.facing === 'down') row = 0;
        else if (npc.facing === 'left') row = 1;
        else if (npc.facing === 'right') row = 2;
        else if (npc.facing === 'up') row = 3;

        let col = 1; // Idle frame is usually the middle one
        if (npc.isWalking) {
            const walkSeq = [0, 1, 2, 1];
            col = walkSeq[npc.walkFrame % 4];
        }

        const drawX = (npc.x - camera.x) | 0;
        const drawY = (npc.y - camera.y) | 0;
        
        if (drawX > -frameW && drawX < canvas.width && drawY > -frameH && drawY < canvas.height) {
            // Fast Shadow (using alpha rect to save ellipse path processing)
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(drawX + frameW/3, drawY + frameH - 4, frameW/2.5, 4);

            // Draw NPC (Crop 1 pixel from width/height to prevent ghosting/bleeding from next frame)
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                img,
                (col * frameW) | 0, (row * frameH) | 0, frameW - 1, frameH - 1,
                drawX, drawY, frameW - 1, frameH - 1
            );
        }
    }
}

function render() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
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
        drawNpcs();
        
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
        
        drawFloatingSigns();

        // Draw Quest Items (Glowing Roses)
        const time = Date.now() * 0.003;
        const floatY = Math.sin(time * 2) * 3;
        for (const item of questItems) {
            if (item.collected) continue;
            const drawX = (item.x - camera.x) | 0;
            const drawY = (item.y - camera.y + floatY) | 0;
            if (drawX > -20 && drawX < canvas.width + 20 && drawY > -20 && drawY < canvas.height + 20) {
                // Glow
                const pulse = (Math.sin(time * 3) + 1) / 2; // 0 to 1
                ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + pulse * 0.3})`;
                ctx.beginPath();
                ctx.arc(drawX, drawY, 15 + pulse * 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Rose placeholder (Red circle)
                ctx.fillStyle = '#e84393';
                ctx.beginPath();
                ctx.arc(drawX, drawY, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Day/Night Cycle Overlay
        const hours = new Date().getHours();
        let darkness = 0;
        if (hours >= 18 || hours < 6) {
            // Night time
            darkness = 0.55; // 55% opacity dark blue
        } else if (hours === 17 || hours === 6) {
            // Twilight/Dawn
            darkness = 0.3;
        }

        if (darkness > 0) {
            // Dark overlay
            ctx.fillStyle = `rgba(10, 10, 40, ${darkness})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Fairy Lights overlay for night time
            // Draw a few random glowing dots that are static in the world
            ctx.fillStyle = 'rgba(255, 230, 150, 0.8)';
            const lightPositions = [
                {x: 200, y: 150}, {x: 250, y: 140}, {x: 300, y: 160},
                {x: 400, y: 350}, {x: 450, y: 330}, {x: 500, y: 360},
                {x: 700, y: 250}, {x: 750, y: 220}, {x: 800, y: 270},
                {x: 100, y: 600}, {x: 150, y: 620}, {x: 80, y: 650}
            ];
            
            for (let light of lightPositions) {
                const lx = (light.x - camera.x) | 0;
                const ly = (light.y - camera.y) | 0;
                if (lx > -10 && lx < canvas.width + 10 && ly > -10 && ly < canvas.height + 10) {
                    const twinkle = (Math.sin(time * 5 + light.x) + 1) / 2; // 0 to 1
                    
                    // Core
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + twinkle * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(lx, ly, 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Glow
                    ctx.fillStyle = `rgba(255, 200, 50, ${0.2 + twinkle * 0.2})`;
                    ctx.beginPath();
                    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
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
