 /**
 * Ducktor - Posture Monitor and Break Reminder
 * 
 * This script handles the webcam interface, posture detection,
 * and break reminders for the Ducktor application.
 */

// ==============================================
// Configuration settings
// ==============================================
const CONFIG = {
    // Performance settings
    FPS_LIMIT: 10,                       // Limit detection to 10 FPS for better performance
    DETECTION_CONFIDENCE: 0.6,           // Confidence threshold for keypoints
    
    // Posture thresholds (degrees)
    SHOULDER_ANGLE_THRESHOLD: 30,        // Shoulder tilt threshold
    HEAD_SIDE_TILT_THRESHOLD: 40,        // Head side tilt threshold
    HEAD_FORWARD_TILT_THRESHOLD: 40,     // Head forward tilt threshold
    
    // Timing intervals (milliseconds)
    POSTURE_CHECK_INTERVAL: 30000,       // Check posture every 30 seconds
    SOUND_COOLDOWN: 10000,               // Minimum time between notification sounds (10 seconds)
    
    // Break reminder settings
    STANDUP_REMINDER_INTERVAL: 60 * 60 * 1000, // Default: 1 hour
    STANDUP_SNOOZE_TIME: 5 * 60 * 1000,        // 5 minutes for snooze
    STANDUP_REMINDER_MIN: 5 * 60 * 1000,       // 5 minutes minimum
    STANDUP_REMINDER_MAX: 60 * 60 * 1000,      // 60 minutes maximum
    STANDUP_REMINDER_STEP: 5 * 60 * 1000       // 5 minute steps
};

// ==============================================
// State variables
// ==============================================
let poseModel = null;
let lastFrameTime = 0;
let lastPostureState = null;    // 'good' or 'bad'
let lastSoundTime = 0;          // Track when we last played the sound
let standupReminderEnabled = false;
let standupReminderTimer = null;
let quackSound = null;          // Audio element for quack sound

// Posture tracking - store timestamps and durations
const postureSamples = [];      // Will store {timestamp, state, duration} objects

// DOM elements
let video, overlay, ctx, statusEl;

// ==============================================
// Main initialization
// ==============================================
async function init() {
    // Initialize DOM elements
    initializeDomElements();
    
    try {
        // Set up webcam stream
        await setupWebcam();
        
        // Load pose detection model
        await loadPoseModel();
        
        // Start detection and tracking processes
        startProcesses();
        
        // Set up sound for notifications
        setupSound();

        // Initialize break reminder controls
        setupBreakReminder();
    } catch (error) {
        console.error("Error initializing:", error);
        statusEl.textContent = "Error: " + error.message;
        statusEl.className = "alert";
    }
}

/**
 * Initialize DOM element references
 */
function initializeDomElements() {
    video = document.getElementById('webcam');
    overlay = document.getElementById('overlay');
    ctx = overlay.getContext('2d');
    statusEl = document.getElementById('status');
}

/**
 * Set up the webcam stream
 */
async function setupWebcam() {
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
            width: 600, 
            height: 400,
            facingMode: 'user' 
        }
    });
    
    video.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise(resolve => {
        video.onloadedmetadata = resolve;
    });
    
    // Set canvas dimensions to match video
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
}

/**
 * Load the pose detection model
 */
async function loadPoseModel() {
    statusEl.textContent = "Loading pose detection model...";
    
    const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true
    };
    
    poseModel = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet, 
        detectorConfig
    );
    
    statusEl.textContent = "Models loaded. Detecting...";
    statusEl.className = "normal";
}

/**
 * Start detection and tracking processes
 */
function startProcesses() {
    // Start detection loop
    detectPose();
    
    // Start timer for tracking good posture time
    setInterval(updatePostureTime, 1000);
    
    // Start periodic posture checking
    setInterval(checkPostureAndSound, CONFIG.POSTURE_CHECK_INTERVAL);
}

/**
 * Set up audio for notifications
 */
function setupSound() {
    quackSound = new Audio('./assets/quack.mp3');
    quackSound.preload = 'auto';
}

// ==============================================
// Break reminder functionality
// ==============================================

/**
 * Set up the break reminder controls and event handlers
 */
function setupBreakReminder() {
    const standupToggle = document.getElementById('standup-toggle');
    const reminderStatusText = document.getElementById('reminder-status-text');
    const intervalSlider = document.getElementById('interval-slider');
    const intervalValue = document.getElementById('interval-value');
    
    // Initialize control states
    standupToggle.checked = false;
    reminderStatusText.textContent = 'Off';
    intervalSlider.value = 60; // Default 60 minutes
    intervalValue.textContent = intervalSlider.value;
    CONFIG.STANDUP_REMINDER_INTERVAL = parseInt(intervalSlider.value) * 60 * 1000;
    
    // Interval slider event handler
    intervalSlider.addEventListener('input', () => {
        const minutes = parseInt(intervalSlider.value);
        intervalValue.textContent = minutes;
        CONFIG.STANDUP_REMINDER_INTERVAL = minutes * 60 * 1000;
        
        // If reminder is already enabled, restart with new interval
        if (standupReminderEnabled) {
            startBreakReminderTimer();
        }
    });
    
    // Toggle switch event handler
    standupToggle.addEventListener('change', () => {
        standupReminderEnabled = standupToggle.checked;
        reminderStatusText.textContent = standupReminderEnabled ? 'On' : 'Off';
        
        if (standupReminderEnabled) {
            console.log(`Break reminder enabled with ${intervalSlider.value} minute interval`);
            startBreakReminderTimer();
        } else {
            console.log('Break reminder disabled');
            clearBreakReminderTimer();
        }
    });
    
    // Listen for snooze/acknowledge events (for future expansion)
    setupReminderEventListeners();
}

/**
 * Set up event listeners for reminder events
 */
function setupReminderEventListeners() {
    // Listener for snooze events
    window.addEventListener('reminder-snoozed', () => {
        console.log('Reminder snoozed for 5 minutes');
        startBreakReminderTimer(CONFIG.STANDUP_SNOOZE_TIME);
    });
    
    // Listener for acknowledge events
    window.addEventListener('reminder-acknowledged', () => {
        console.log('Reminder acknowledged, resetting timer');
        startBreakReminderTimer();
    });
    
    // Listener for close events
    window.addEventListener('reminder-closed', () => {
        console.log('Reminder closed, continuing timer');
    });
}

/**
 * Start or restart the break reminder timer
 * @param {number} interval - Custom interval in ms (optional)
 */
function startBreakReminderTimer(interval = CONFIG.STANDUP_REMINDER_INTERVAL) {
    clearBreakReminderTimer();
    
    if (standupReminderEnabled) {
        const minutes = interval / 60000;
        console.log(`Setting break reminder for ${minutes} minutes from now`);
        
        // Update the status text to show next reminder time
        updateNextReminderTime(interval);
        
        standupReminderTimer = setTimeout(() => {
            sendBreakReminder();
        }, interval);
    }
}

/**
 * Clear the current break reminder timer
 */
function clearBreakReminderTimer() {
    if (standupReminderTimer) {
        clearTimeout(standupReminderTimer);
        standupReminderTimer = null;
    }
}

/**
 * Update the display to show when the next reminder will occur
 * @param {number} interval - Time until next reminder in ms
 */
function updateNextReminderTime(interval) {
    const reminderStatusText = document.getElementById('reminder-status-text');
    const nextTime = new Date(Date.now() + interval);
    const timeString = nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    reminderStatusText.textContent = `Next at ${timeString}`;
}

/**
 * Send a break reminder notification and play sound
 */
function sendBreakReminder() {
    console.log('Sending break reminder');
    
    // Play sound for break reminder
    playQuackSound();
    
    // Calculate minutes from milliseconds
    const intervalMinutes = CONFIG.STANDUP_REMINDER_INTERVAL / 60000;
    
    // Send notification based on available API
    if (window.notifications && typeof window.notifications.sendCustomStandUpReminder === 'function') {
        const success = window.notifications.sendCustomStandUpReminder(intervalMinutes);
        console.log('Custom break reminder notification sent:', success);
    } 
    // Fall back to regular notification if custom one isn't available
    else if (window.notifications && typeof window.notifications.sendStandUpReminder === 'function') {
        const success = window.notifications.sendStandUpReminder();
        console.log('Break reminder notification sent:', success);
    } else {
        console.error('Break reminder notification API not available');
    }
    
    // Set up the next reminder
    startBreakReminderTimer();
}

// ==============================================
// Posture detection and analysis
// ==============================================

/**
 * Main detection loop with frame rate limiting
 */
async function detectPose() {
    if (!poseModel) return;
    
    const now = Date.now();
    const elapsed = now - lastFrameTime;
    
    // Limit frame rate to improve performance
    if (elapsed > (1000 / CONFIG.FPS_LIMIT)) {
        lastFrameTime = now;
        
        try {
            // Run pose detection
            const poses = await poseModel.estimatePoses(video);
            
            // Clear canvas
            ctx.clearRect(0, 0, overlay.width, overlay.height);
            
            if (poses && poses.length > 0) {
                const pose = poses[0];
                
                // Analyze posture and get angles
                const { shoulderAngle, headSideTilt, headForwardTilt, isGoodPosture, issues } = analyzePosture(pose);
                
                // Draw pose with posture indicators
                drawPose(pose, shoulderAngle, headSideTilt, headForwardTilt, isGoodPosture);
                
                // Update metrics display
                updateMetricsDisplay(isGoodPosture, issues);
                
                // Update posture state
                lastPostureState = isGoodPosture ? 'good' : 'bad';
            } else {
                statusEl.textContent = "No pose detected";
                lastPostureState = null;
            }
        } catch (error) {
            console.error("Error during detection:", error);
            statusEl.textContent = "Detection error";
            statusEl.className = "alert";
        }
    }
    
    // Continue loop
    requestAnimationFrame(detectPose);
}

/**
 * Update posture tracking data
 */
function updatePostureTime() {
    const now = Date.now();
    
    if (lastPostureState) {
        // Add new posture sample
        postureSamples.push({
            timestamp: now,
            state: lastPostureState,
            duration: 1 // 1 second
        });
        
        // Remove samples older than the check interval
        const cutoffTime = now - CONFIG.POSTURE_CHECK_INTERVAL;
        while (postureSamples.length > 0 && postureSamples[0].timestamp < cutoffTime) {
            postureSamples.shift();
        }
    }
}

/**
 * Check posture quality and trigger notifications if needed
 */
function checkPostureAndSound() {
    const now = Date.now();
    
    // Calculate cumulative times
    let goodPostureTime = 0;
    let badPostureTime = 0;
    
    postureSamples.forEach(sample => {
        if (sample.state === 'good') {
            goodPostureTime += sample.duration;
        } else if (sample.state === 'bad') {
            badPostureTime += sample.duration;
        }
    });
    
    console.log(`Last 30s: Good posture=${goodPostureTime}s, Bad posture=${badPostureTime}s`);
    
    // Check if we have enough samples and bad posture time exceeds good posture time
    if (postureSamples.length > 0 && badPostureTime > goodPostureTime) {
        // Check if we should play sound (avoid too frequent sounds)
        if (now - lastSoundTime > CONFIG.SOUND_COOLDOWN) {
            console.log("Bad posture detected - playing sound and sending notification");
            playQuackSound();
            
            // Send notification after a slight delay to avoid synchronization issues
            setTimeout(sendPostureNotification, 300);
            
            lastSoundTime = now;
        }
    }
}

/**
 * Play the quack sound for notifications
 */
function playQuackSound() {
    if (quackSound) {
        quackSound.currentTime = 0; // Reset to start
        quackSound.play().catch(err => {
            console.error('Error playing sound:', err);
        });
    }
}

/**
 * Send a posture notification
 */
function sendPostureNotification() {
    console.log('Sending posture notification...');
    
    if (window.notifications && typeof window.notifications.send === 'function') {
        const success = window.notifications.send();
        console.log('Notification request sent:', success);
    } else {
        console.error('Notifications API not available');
    }
}

/**
 * Analyze posture from detected pose keypoints
 * @param {Object} pose - The detected pose object
 * @returns {Object} Analysis results
 */
function analyzePosture(pose) {
    const keypoints = pose.keypoints;
    
    // Create a map of keypoints for easier access
    const keyPointMap = {};
    keypoints.forEach(keypoint => {
        if (keypoint.score >= CONFIG.DETECTION_CONFIDENCE) {
            keyPointMap[keypoint.name] = {
                x: keypoint.x,
                y: keypoint.y,
                score: keypoint.score
            };
        }
    });
    
    // Extract needed keypoints
    const leftShoulder = keyPointMap['left_shoulder'];
    const rightShoulder = keyPointMap['right_shoulder'];
    const leftEar = keyPointMap['left_ear'];
    const rightEar = keyPointMap['right_ear'];
    const nose = keyPointMap['nose'];
    
    // Calculate shoulder angle (horizontal alignment)
    let shoulderAngle = null;
    if (leftShoulder && rightShoulder) {
        const dx = rightShoulder.x - leftShoulder.x;
        const dy = rightShoulder.y - leftShoulder.y;
        shoulderAngle = 205 - (Math.abs(Math.atan2(dy, dx) * 180 / Math.PI));
    }
    
    // Calculate head side tilt
    let headSideTilt = null;
    if (leftEar && rightEar) {
        const dx = rightEar.x - leftEar.x;
        const dy = rightEar.y - leftEar.y;
        headSideTilt = 210 - (Math.abs(Math.atan2(dy, dx) * 180 / Math.PI));
    }
    
    // Calculate head forward tilt (neck angle)
    let headForwardTilt = null;
    if (nose && leftShoulder && rightShoulder) {
        const midShoulder = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };
        
        // Vertical line from shoulders
        const vertical = {
            x: midShoulder.x,
            y: midShoulder.y - 100 // arbitrary point above
        };
        
        headForwardTilt = calculateAngle(vertical, midShoulder, nose);
    }
    
    // Check for posture issues
    const issues = [];
    let isGoodPosture = true;
    
    if (shoulderAngle !== null && shoulderAngle > CONFIG.SHOULDER_ANGLE_THRESHOLD) {
        issues.push('Shoulders tilted - level your shoulders');
        isGoodPosture = false;
    }
    
    if (headSideTilt !== null && headSideTilt > CONFIG.HEAD_SIDE_TILT_THRESHOLD) {
        issues.push('Head tilted sideways - straighten your head');
        isGoodPosture = false;
    }
    
    if (headForwardTilt !== null && headForwardTilt > CONFIG.HEAD_FORWARD_TILT_THRESHOLD) {
        issues.push('Head tilted forward - pull your head back');
        isGoodPosture = false;
    }
    
    return {
        shoulderAngle,
        headSideTilt,
        headForwardTilt,
        isGoodPosture,
        issues
    };
}

/**
 * Calculate angle between three points
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point (vertex) {x, y}
 * @param {Object} p3 - Third point {x, y}
 * @returns {number|null} - Angle in degrees or null if invalid
 */
function calculateAngle(p1, p2, p3) {
    if (!p1 || !p2 || !p3) return null;
    
    const a = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
    const b = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
    const c = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    
    // Use law of cosines
    const angleRadians = Math.acos((a*a + c*c - b*b) / (2*a*c));
    return (angleRadians * 180) / Math.PI; // Convert to degrees
}

/**
 * Update the visual display of posture status
 * @param {boolean} isGoodPosture - Whether posture is good
 * @param {Array} issues - List of posture issues
 */
function updateMetricsDisplay(isGoodPosture, issues) {
    // Update status
    if (!isGoodPosture) {
        statusEl.textContent = "FIX POSTURE";
        statusEl.className = "alert";
        document.body.style.backgroundColor = '#301212'; // Subtle red for bad posture
    } else {
        statusEl.textContent = "GOOD POSTURE";
        statusEl.className = "normal";
        document.body.style.backgroundColor = '#121212'; // Normal background
    }
}

/**
 * Draw the detected pose on the canvas
 * @param {Object} pose - The detected pose
 * @param {number} shoulderAngle - Calculated shoulder angle
 * @param {number} headSideTilt - Calculated head side tilt
 * @param {number} headForwardTilt - Calculated head forward tilt
 * @param {boolean} isGoodPosture - Whether posture is good
 */
function drawPose(pose, shoulderAngle, headSideTilt, headForwardTilt, isGoodPosture) {
    const keypoints = pose.keypoints;
    const color = isGoodPosture ? '#4caf50' : '#ff5252';
    
    // Draw keypoints
    keypoints.forEach(keypoint => {
        if (keypoint.score >= CONFIG.DETECTION_CONFIDENCE) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
    
    // Draw connections between keypoints (skeleton)
    const connections = [
        ['left_ear', 'left_eye'],
        ['left_eye', 'nose'],
        ['nose', 'right_eye'],
        ['right_eye', 'right_ear'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'],
        ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip']
    ];
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    connections.forEach(([first, second]) => {
        const firstKeypoint = keypoints.find(kpt => kpt.name === first);
        const secondKeypoint = keypoints.find(kpt => kpt.name === second);
        
        if (firstKeypoint && secondKeypoint && 
            firstKeypoint.score >= CONFIG.DETECTION_CONFIDENCE && 
            secondKeypoint.score >= CONFIG.DETECTION_CONFIDENCE) {
            ctx.beginPath();
            ctx.moveTo(firstKeypoint.x, firstKeypoint.y);
            ctx.lineTo(secondKeypoint.x, secondKeypoint.y);
            ctx.stroke();
        }
    });
    
    // Draw posture status
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial Bold';
    ctx.fillText(isGoodPosture ? "GOOD POSTURE" : "FIX POSTURE", 20, 40);
}

// Initialize the application when the window loads
window.addEventListener('load', init);