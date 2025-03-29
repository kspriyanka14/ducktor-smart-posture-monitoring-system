// Configuration options
const CONFIG = {
    FPS_LIMIT: 15,                       // Limit detection to 15 FPS
    SHOULDER_ANGLE_THRESHOLD: 30,        // Shoulder tilt threshold (degrees)
    HEAD_SIDE_TILT_THRESHOLD: 40,        // Head side tilt threshold (degrees)
    HEAD_FORWARD_TILT_THRESHOLD: 40,     // Head forward tilt threshold (degrees)
    DETECTION_CONFIDENCE: 0.6            // Confidence threshold for keypoints
};

// State variables
let poseModel = null;
let lastFrameTime = 0;
let goodPostureTime = 0;
let badPostureTime = 0;
let goodPostureStartTime = null;
let badPostureStartTime = null;
let lastPostureState = null; // 'good' or 'bad'

// DOM elements
const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const statusEl = document.getElementById('status');
const shoulderAngleEl = document.getElementById('shoulder-angle');
const neckAngleEl = document.getElementById('neck-angle');
const headTiltEl = document.getElementById('head-tilt');

// Initialize the application
async function init() {
    try {
        // Set up webcam
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: 640, 
                height: 480,
                facingMode: 'user' 
            }
        });
        video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });
        
        // Set canvas dimensions to match video
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        
        // Load pose detection model
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
        
        // Start detection loop
        detectPose();
        
        // Start timer for tracking good posture time
        setInterval(updatePostureTime, 1000);
    } catch (error) {
        console.error("Error initializing:", error);
        statusEl.textContent = "Error: " + error.message;
        statusEl.className = "alert";
    }
}

// Update posture time counter
function updatePostureTime() {
    if (lastPostureState === 'good') {
        if (!goodPostureStartTime) {
            goodPostureStartTime = Date.now();
            badPostureStartTime = null;
        }
        goodPostureTime = Math.floor((Date.now() - goodPostureStartTime) / 1000);
    } else if (lastPostureState === 'bad') {
        if (!badPostureStartTime) {
            badPostureStartTime = Date.now();
            goodPostureStartTime = null;
        }
        badPostureTime = Math.floor((Date.now() - badPostureStartTime) / 1000);
    }
}

// Calculate angle between three points
function calculateAngle(p1, p2, p3) {
    if (!p1 || !p2 || !p3) return null;
    
    const a = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
    const b = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
    const c = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    
    // Use law of cosines
    const angleRadians = Math.acos((a*a + c*c - b*b) / (2*a*c));
    return (angleRadians * 180) / Math.PI; // Convert to degrees
}

// Main detection loop with frame rate limiting
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
                updateMetricsDisplay(shoulderAngle, headSideTilt, headForwardTilt, isGoodPosture, issues);
                
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

// Analyze posture from detected pose
function analyzePosture(pose) {
    const keypoints = pose.keypoints;
    
    // Extract relevant keypoints
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
    
    // Check if we have all the necessary keypoints
    const leftShoulder = keyPointMap['left_shoulder'];
    const rightShoulder = keyPointMap['right_shoulder'];
    const leftEar = keyPointMap['left_ear'];
    const rightEar = keyPointMap['right_ear'];
    const nose = keyPointMap['nose'];
    
    // Calculate shoulder angle (horizontal alignment)
    let shoulderAngle = null;
    if (leftShoulder && rightShoulder) {
        // Calculate angle from horizontal
        const dx = rightShoulder.x - leftShoulder.x;
        const dy = rightShoulder.y - leftShoulder.y;
        shoulderAngle = 205 - (Math.abs(Math.atan2(dy, dx) * 180 / Math.PI));
    }
    
    // Calculate head side tilt
    let headSideTilt = null;
    if (leftEar && rightEar) {
        // Calculate angle from horizontal
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

// Update metrics display
function updateMetricsDisplay(shoulderAngle, headSideTilt, headForwardTilt, isGoodPosture, issues) {
    // Update angle displays
    if (shoulderAngle !== null) {
        shoulderAngleEl.textContent = `${Math.round(shoulderAngle)}°`;
        shoulderAngleEl.style.color = shoulderAngle > CONFIG.SHOULDER_ANGLE_THRESHOLD ? '#ff5252' : '#4caf50';
    }
    
    if (headSideTilt !== null) {
        headTiltEl.textContent = `${Math.round(headSideTilt)}°`;
        headTiltEl.style.color = headSideTilt > CONFIG.HEAD_SIDE_TILT_THRESHOLD ? '#ff5252' : '#4caf50';
    }
    
    if (headForwardTilt !== null) {
        neckAngleEl.textContent = `${Math.round(headForwardTilt)}°`;
        neckAngleEl.style.color = headForwardTilt > CONFIG.HEAD_FORWARD_TILT_THRESHOLD ? '#ff5252' : '#4caf50';
    }
    
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

// Draw pose with posture indicators
function drawPose(pose, shoulderAngle, headSideTilt, headForwardTilt, isGoodPosture) {
    const keypoints = pose.keypoints;
    const color = isGoodPosture ? '#4caf50' : '#ff5252';
    
    // Draw keypoints
    keypoints.forEach(keypoint => {
        if (keypoint.score >= CONFIG.DETECTION_CONFIDENCE) {
            // Draw keypoint
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

// Start the application
window.addEventListener('load', init);