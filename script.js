// Game state
const WHEEL_VALUES = [15, 80, 35, 60, 20, 40, 75, 55, 95, 50, 85, 30, 65, 10, 45, 70, 25, 90, 5, 100];
const SEGMENT_HEIGHT = 200; // Height of each wheel segment in pixels

let gameState = {
    phase: 'start', // 'start', 'power-gauge', 'spinning', 'choose-action', 'game-over'
    spinCount: 0,
    totalScore: 0,
    currentPosition: 0, // Current wheel position (0-19)
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

// Audio context for generating sounds
let audioContext;

// Initialize audio context
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Sound generation functions
function playBeep() {
    initAudio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playDing() {
    initAudio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function playTripleDing() {
    initAudio();
    [0, 0.2, 0.4].forEach(delay => {
        setTimeout(() => playDing(), delay * 1000);
    });
}

function playBuzzer() {
    initAudio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
}

function playBoo() {
    initAudio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 1);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
}

// Initialize wheel position
function initWheel() {
    // Center the wheel on position 0 (value 15)
    const offset = -gameState.currentPosition * SEGMENT_HEIGHT + (window.innerHeight / 2 - SEGMENT_HEIGHT / 2);
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
    
    // Calculate spin distance based on power (minimum 1 full rotation)
    const minRotations = 1.5; // Minimum rotations to be valid
    const maxRotations = 3.5;
    const rotations = minRotations + (power * (maxRotations - minRotations));
    const segmentsToSpin = Math.floor(rotations * WHEEL_VALUES.length);
    
    // Add some randomness to final position
    const randomOffset = Math.floor(Math.random() * 5) - 2;
    const finalSegments = segmentsToSpin + randomOffset;
    
    // Calculate final position
    const newPosition = (gameState.currentPosition + finalSegments) % WHEEL_VALUES.length;
    
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
        
        // Update wheel position
        const offset = -currentSegment * SEGMENT_HEIGHT + (window.innerHeight / 2 - SEGMENT_HEIGHT / 2);
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
    const landedValue = WHEEL_VALUES[gameState.currentPosition];
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
function handleGameClick() {
    initAudio(); // Initialize audio on first interaction
    
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
        currentPosition: 0,
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

// Initialize on load
initWheel();
