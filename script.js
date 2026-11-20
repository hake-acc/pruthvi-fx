/**
 * Pacôme Pertant - Authentic Intro Motion & Entry Replication
 * Powered by Lottie (Bodymovin) vector animation extracted from pacomepertant.com
 */

// DOM Elements
const lottieContainer = document.getElementById('lottie-wrapper');
const entryContent = document.getElementById('entry-content');
const btnEnterSound = document.getElementById('btn-enter-sound');
const btnEnterNoSound = document.getElementById('btn-enter-no-sound');
const enteredScreen = document.getElementById('entered-screen');
const btnReplayAll = document.getElementById('btn-replay-all');

// UI Controls
const uiOverlay = document.getElementById('ui-overlay');
const uiToggleBtn = document.getElementById('ui-toggle-btn');
const sliderSpeed = document.getElementById('slider-speed');
const valSpeed = document.getElementById('val-speed');
const btnReplay = document.getElementById('btn-replay');

let currentSpeed = 1.0;
let isEntered = false;

// Audio Context for "Enter with Sound" interactive feedback
let audioCtx = null;

function playEnterChime() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    
    // Smooth dual harmonic chime
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.8);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.85);
    });
  } catch (e) {
    console.log('Audio feedback unavailable', e);
  }
}

// Initialize Bodymovin / Lottie Animation
let anim = null;

function initLottie() {
  if (!window.LOADER_DATA) {
    console.error('Loader data not found!');
    return;
  }

  anim = lottie.loadAnimation({
    container: lottieContainer,
    renderer: 'svg',
    loop: false,
    autoplay: true,
    animationData: window.LOADER_DATA
  });

  anim.setSpeed(currentSpeed);

  // When animation completes (Frame 67: 3D smiley resting state reached)
  anim.addEventListener('complete', () => {
    if (!isEntered) {
      entryContent.classList.add('visible');
      btnEnterNoSound.classList.add('visible');
    }
  });
}

function replayAnimation() {
  isEntered = false;
  
  // Hide entered screen
  enteredScreen.classList.remove('show');
  
  // Hide entry subtitle and buttons while replaying
  entryContent.classList.remove('visible');
  btnEnterNoSound.classList.remove('visible');
  
  // Restore lottie visibility
  lottieContainer.style.opacity = '1';
  lottieContainer.style.transform = 'scale(1)';
  lottieContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

  if (anim) {
    anim.goToAndPlay(0, true);
  }
}

function handleEnter(withSound) {
  isEntered = true;
  
  if (withSound) {
    playEnterChime();
  }

  // Fade out entry content and bottom link
  entryContent.classList.remove('visible');
  btnEnterNoSound.classList.remove('visible');
  
  // Smoothly morph lottie container into background
  lottieContainer.style.opacity = '0.15';
  lottieContainer.style.transform = 'scale(0.85)';
  
  // Show entered screen
  setTimeout(() => {
    enteredScreen.classList.add('show');
  }, 250);
}

// Event Listeners
btnEnterSound.addEventListener('click', () => handleEnter(true));
btnEnterNoSound.addEventListener('click', () => handleEnter(false));
btnReplayAll.addEventListener('click', replayAnimation);
btnReplay.addEventListener('click', replayAnimation);

// Playback Speed Slider
sliderSpeed.addEventListener('input', (e) => {
  currentSpeed = parseFloat(e.target.value);
  valSpeed.textContent = `${currentSpeed.toFixed(1)}x`;
  if (anim) {
    anim.setSpeed(currentSpeed);
  }
});

// UI Overlay Toggle
function toggleUI() {
  uiOverlay.classList.toggle('ui-collapsed');
}

uiToggleBtn.addEventListener('click', toggleUI);

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'c' || e.key === 'C') {
    toggleUI();
  } else if (e.key === 'r' || e.key === 'R') {
    replayAnimation();
  }
});

// Allow clicking on lottie face to replay once at rest
lottieContainer.style.cursor = 'pointer';
lottieContainer.addEventListener('click', () => {
  if (entryContent.classList.contains('visible')) {
    replayAnimation();
  }
});

// Initialize on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  initLottie();
});
