/**
 * Ducktor - Main Process
 * 
 * This module sets up the Electron application, manages windows,
 * and handles IPC communication for notifications.
 */

const { app, BrowserWindow, Notification, ipcMain } = require('electron');
const path = require('path');

// Main application window
let mainWindow;

// ========================================
// Duck messages for notifications
// ========================================

// Messages for posture notifications
const postureMessages = [
    "Quack! Straighten up! Slouching isn't stylish!",
    "Quack, quack! Good posture makes you look as elegant as a swan!",
    "If I had a spine, I'd keep it straight! Quack, you should too!",
    "Waddle you doing? Quack up that posture!",
    "Quack alert! Your posture needs a little lift!",
    "Ducks don't slouch—quack yourself into a better position!",
    "Quack, quack! Back straight, shoulders back—just like a fancy duck!",
    "No slouching, only quacking! Sit up tall!",
    "Your spine called… quack, it wants better posture!",
    "Quack correction! Fix that posture before I start flapping!"
];

// Messages for break reminders
const breakMessages = [
    "Quack! Time for a quick break—step away and relax!",
    "Quack quack! Your duck buddy says: Take a short break!",
    "Even ducks take breaks! Quack! Rest your eyes and stretch!",
    "Quack alert! Pause for a moment, breathe, and recharge!",
    "Ducks float, you should too! Quack! Take a break!",
    "Step away, stretch, and quack back later!",
    "Quack! A tiny break now means more energy later!",
    "Quack reminder: Rest your eyes, move around, and come back refreshed!",
    "Ducks love naps! Quack! A short break won't hurt!",
    "Time to quack out for a bit! Relax and refresh!"
];

// ========================================
// Application initialization
// ========================================

app.whenReady().then(() => {
    // Set macOS dock icon
    setupMacOSDock();
    
    // Set up IPC listeners for notifications
    setupNotificationListeners();
    
    // Create the initial window
    createWindow();
});

/**
 * Set up macOS dock icon if applicable
 */
function setupMacOSDock() {
    if (process.platform === 'darwin') {
        app.dock.setIcon(path.join(__dirname, "./assets/icon.png"));
    }
}

/**
 * Set up IPC listeners for notifications
 */
function setupNotificationListeners() {
    // Posture notification listener
    ipcMain.on('send-notification', () => {
        sendDuckNotification({
            messages: postureMessages,
            title: 'DUCKTOR - Posture Alert'
        });
    });

    // Break reminder notification listener
    ipcMain.on('send-break-notification', () => {
        sendDuckNotification({
            messages: breakMessages,
            title: 'DUCKTOR - Break Time'
        });
    });

    // Custom break reminder notification listener
    ipcMain.on('send-custom-break-notification', (_, intervalMinutes) => {
        sendDuckNotification({
            messages: breakMessages,
            title: `DUCKTOR - ${intervalMinutes}min Break`,
            silent: false
        });
        
        console.log(`Custom break reminder (${intervalMinutes} min) notification sent`);
    });
}

/**
 * Send a notification with a random duck message
 * @param {Object} options - Notification options
 * @param {Array} options.messages - Array of possible messages
 * @param {string} options.title - Notification title
 * @param {boolean} options.silent - Whether notification should be silent (default: true)
 */
function sendDuckNotification({ messages, title, silent = true }) {
    try {
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        const notification = new Notification({
            title: title,
            body: randomMessage,
            silent: silent,
            icon: path.join(__dirname, "./assets/icon.png")
        });

        notification.show();
        console.log(`Notification sent: ${title}`);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

/**
 * Create or recreate the application window
 * @param {string} page - The HTML page to load (default: 'index.html')
 */
function createWindow(page = 'index.html') { 
    // Close existing window if it exists
    if (mainWindow) {
        mainWindow.close();
    }

    // Create new window
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 850,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'assets/icon.png'),
    });

    // Uncomment to open DevTools in development
    // mainWindow.webContents.openDevTools();

    // Load requested page
    mainWindow.loadFile(page);
}

// ========================================
// Application event handlers
// ========================================

// Handle window behavior on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC listener for opening camPage
ipcMain.on('open-cam-page', () => {
    createWindow('camPage.html');
});

// IPC listener for going back to index
ipcMain.on('go-back', () => {
    createWindow('index.html');
});