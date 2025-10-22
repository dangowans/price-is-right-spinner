// Game state
const WHEEL_VALUES = [15, 80, 35, 60, 20, 40, 75, 55, 95, 50, 85, 30, 65, 10, 45, 70, 25, 90, 5, 100];
const SEGMENT_HEIGHT = 250; // Height of each wheel segment in pixels
const BUFFER_SEGMENTS = 5; // Number of duplicate segments at start and end for wrapping

let gameState = {
    phase: 'start', // 'start', 'power-gauge', 'spinning', 'choose-action', 'game-over'
    spinCount: 0,
    totalScore: 0,
    currentPosition: BUFFER_SEGMENTS, // Start at position 5 (first real segment after buffer)
    isSpinning: false,
    powerLevel: 0
};

// DOM elements
const wheel = document.getElementById('wheel');
const startMessage = document.getElementById('start-message');
const powerGauge = document.getElementById('power-gauge');
const powerBar = document.getElementById('power-bar');
const scoreBox = document.getElementById('score-box');
const scoreValue = document.getElementById('score-value');
const actionButtons = document.getElementById('action-buttons');
const stayBtn = document.getElementById('stay-btn');
const spinAgainBtn = document.getElementById('spin-again-btn');
const messageOverlay = document.getElementById('message-overlay');
const messageText = document.getElementById('message-text');
const playAgainBtn = document.getElementById('play-again-btn');
const gameContainer = document.getElementById('game-container');

// Audio elements for sound files
const beepSound = new Audio('sounds/beep.mp3');
const buzzerSound = new Audio('sounds/buzzer.mp3');
const dingDingDingSound = new Audio('sounds/ding-ding-ding.mp3');

// Wake Lock for keeping screen awake
let wakeLock = null;

// Initialize audio (preload sounds on first interaction)
function initAudio() {
    // Preload audio files
    beepSound.load();
    buzzerSound.load();
    dingDingDingSound.load();
}

// Request wake lock to keep screen awake
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active');
            
            // Re-request wake lock when visibility changes
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock was released');
            });
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

// Release wake lock
async function releaseWakeLock() {
    if (wakeLock !== null) {
        try {
            await wakeLock.release();
            wakeLock = null;
            console.log('Wake Lock released');
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }
}

// Sound playback functions
function playBeep() {
    // Clone the audio element to allow multiple simultaneous plays
    const sound = beepSound.cloneNode();
    sound.volume = 0.5;
    sound.play().catch(err => console.log('Beep play failed:', err));
}

function playDing() {
    // Use the ding-ding-ding sound for compatibility with existing code
    const sound = dingDingDingSound.cloneNode();
    sound.volume = 0.5;
    sound.play().catch(err => console.log('Ding play failed:', err));
}

function playTripleDing() {
    // Play the ding-ding-ding sound (it already contains three dings)
    const sound = dingDingDingSound.cloneNode();
    sound.volume = 0.5;
    sound.play().catch(err => console.log('Triple ding play failed:', err));
}

function playBuzzer() {
    const sound = buzzerSound.cloneNode();
    sound.volume = 0.5;
    sound.play().catch(err => console.log('Buzzer play failed:', err));
}

function playBoo() {
    // Keep using buzzer for the "boo" sound (slow spin)
    const sound = buzzerSound.cloneNode();
    sound.volume = 0.3;
    sound.play().catch(err => console.log('Boo play failed:', err));
}

// Initialize wheel position
function initWheel() {
    // Center the wheel on position BUFFER_SEGMENTS (first real segment - value 15)
    const segmentHeight = window.innerWidth <= 768 ? (window.innerWidth <= 480 ? 150 : 180) : 250;
    const offset = -gameState.currentPosition * segmentHeight + (window.innerHeight / 2 - segmentHeight / 2);
    wheel.style.top = `${offset}px`;
}

// Get power level from power bar animation
function getPowerLevel() {
    const barRect = powerBar.getBoundingClientRect();
    const gaugeRect = powerGauge.getBoundingClientRect();
    const position = barRect.left - gaugeRect.left;
    const maxPosition = gaugeRect.width - barRect.width;
    return position / maxPosition; // Returns 0-1
}

// Spin the wheel
function spinWheel(power) {
    gameState.isSpinning = true;
    
    // Get current segment height based on screen size
    const segmentHeight = window.innerWidth <= 768 ? (window.innerWidth <= 480 ? 150 : 180) : 250;
    
    // Calculate spin distance based on power (minimum 1 full rotation)
    const minRotations = 1.5; // Minimum rotations to be valid
    const maxRotations = 3.5;
    const rotations = minRotations + (power * (maxRotations - minRotations));
    const segmentsToSpin = Math.floor(rotations * WHEEL_VALUES.length);
    
    // Add some randomness to final position
    const randomOffset = Math.floor(Math.random() * 5) - 2;
    const finalSegments = segmentsToSpin + randomOffset;
    
    // Calculate final position (accounting for buffer segments)
    const totalSegments = WHEEL_VALUES.length + (BUFFER_SEGMENTS * 2);
    let newPosition = gameState.currentPosition + finalSegments;
    
    // Wrap position to stay within valid range
    while (newPosition >= BUFFER_SEGMENTS + WHEEL_VALUES.length) {
        newPosition -= WHEEL_VALUES.length;
    }
    while (newPosition < BUFFER_SEGMENTS) {
        newPosition += WHEEL_VALUES.length;
    }
    
    // Animation parameters
    const duration = 3000 + (power * 2000); // 3-5 seconds based on power
    const startTime = Date.now();
    const startPosition = gameState.currentPosition;
    
    // Track beeps
    let lastBeepSegment = startPosition;
    
    function animate() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        // Calculate current position
        const currentSegment = startPosition + (finalSegments * easeOut);
        const currentPos = Math.floor(currentSegment) % WHEEL_VALUES.length;
        
        // Play beep when passing a segment
        if (Math.floor(currentSegment) > lastBeepSegment) {
            playBeep();
            lastBeepSegment = Math.floor(currentSegment);
        }
        
        // Update wheel position with wrapping
        // Map the current segment to the actual DOM position to ensure wrapping
        const totalDOMSegments = WHEEL_VALUES.length + (BUFFER_SEGMENTS * 2);
        let visualPosition = currentSegment;
        
        // Aggressively wrap visual position to keep it well within the range of actual DOM segments
        // This ensures numbers are always visible even during long spins
        // Keep position within safe bounds (never reach the edges of buffer)
        while (visualPosition >= BUFFER_SEGMENTS + WHEEL_VALUES.length) {
            visualPosition -= WHEEL_VALUES.length;
        }
        while (visualPosition < BUFFER_SEGMENTS) {
            visualPosition += WHEEL_VALUES.length;
        }
        
        const offset = -visualPosition * segmentHeight + (window.innerHeight / 2 - segmentHeight / 2);
        wheel.style.top = `${offset}px`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Spin complete
            gameState.currentPosition = newPosition;
            gameState.isSpinning = false;
            
            // Check if spin was valid (at least 1 full rotation)
            if (rotations < 1.0) {
                handleSlowSpin();
            } else {
                handleSpinComplete();
            }
        }
    }
    
    animate();
}

// Handle slow spin (didn't make full rotation)
function handleSlowSpin() {
    playBoo();
    
    // Show message and allow spin again
    setTimeout(() => {
        showActionButtons(false, true); // Only show spin again
    }, 1000);
}

// Handle spin complete
function handleSpinComplete() {
    // Get the actual value index (subtract buffer)
    const valueIndex = (gameState.currentPosition - BUFFER_SEGMENTS) % WHEEL_VALUES.length;
    const landedValue = WHEEL_VALUES[valueIndex];
    gameState.totalScore += landedValue;
    gameState.spinCount++;
    
    // Update score display
    scoreValue.textContent = gameState.totalScore;
    scoreBox.classList.remove('hidden');
    
    // Check game conditions
    if (gameState.totalScore > 100) {
        // Busted!
        setTimeout(() => {
            playBuzzer();
            showMessage('You went over!');
        }, 500);
    } else if (gameState.totalScore === 100) {
        // Winner!
        setTimeout(() => {
            playTripleDing();
            showMessage('One dollar!');
        }, 500);
    } else if (gameState.spinCount === 2) {
        // Two spins used, game over
        setTimeout(() => {
            playDing();
            showMessage(`You got ${gameState.totalScore}`);
        }, 500);
    } else {
        // Can choose to stay or spin again
        setTimeout(() => {
            showActionButtons(true, true);
        }, 500);
    }
}

// Show action buttons
function showActionButtons(showStay, showSpinAgain) {
    if (showStay) {
        stayBtn.classList.remove('hidden');
    } else {
        stayBtn.classList.add('hidden');
    }
    
    if (showSpinAgain) {
        spinAgainBtn.classList.remove('hidden');
    } else {
        spinAgainBtn.classList.add('hidden');
    }
    
    actionButtons.classList.remove('hidden');
}

// Hide action buttons
function hideActionButtons() {
    actionButtons.classList.add('hidden');
}

// Show final message
function showMessage(message) {
    messageText.textContent = message;
    messageOverlay.classList.remove('hidden');
    gameState.phase = 'game-over';
}

// Handle stay button
function handleStay() {
    hideActionButtons();
    playDing();
    showMessage(`You got ${gameState.totalScore}`);
}

// Handle spin again button
function handleSpinAgain() {
    hideActionButtons();
    gameState.phase = 'power-gauge';
    powerGauge.classList.remove('hidden');
}

// Handle game container click
function handleGameClick(event) {
    // Don't handle clicks on buttons
    if (event.target.tagName === 'BUTTON') {
        return;
    }
    
    initAudio(); // Initialize audio on first interaction
    requestWakeLock(); // Request wake lock to keep screen awake
    
    if (gameState.phase === 'start') {
        // Hide start message, show power gauge
        startMessage.classList.add('hidden');
        gameState.phase = 'power-gauge';
        powerGauge.classList.remove('hidden');
    } else if (gameState.phase === 'power-gauge') {
        // Stop power gauge and spin
        const power = getPowerLevel();
        gameState.powerLevel = power;
        powerGauge.classList.add('hidden');
        gameState.phase = 'spinning';
        spinWheel(power);
    }
}

// Reset game
function resetGame() {
    gameState = {
        phase: 'start',
        spinCount: 0,
        totalScore: 0,
        currentPosition: BUFFER_SEGMENTS,
        isSpinning: false,
        powerLevel: 0
    };
    
    // Reset UI
    messageOverlay.classList.add('hidden');
    scoreBox.classList.add('hidden');
    actionButtons.classList.add('hidden');
    powerGauge.classList.add('hidden');
    startMessage.classList.remove('hidden');
    scoreValue.textContent = '0';
    
    // Reset wheel position
    initWheel();
}

// Event listeners
gameContainer.addEventListener('click', handleGameClick);
stayBtn.addEventListener('click', handleStay);
spinAgainBtn.addEventListener('click', handleSpinAgain);
playAgainBtn.addEventListener('click', resetGame);

// Re-request wake lock when page becomes visible
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && gameState.phase !== 'start') {
        requestWakeLock();
    }
});

// Initialize on load
initWheel();
