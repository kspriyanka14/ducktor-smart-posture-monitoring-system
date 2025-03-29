const { app, BrowserWindow, Notification, ipcMain } = require('electron')
const path = require('path')

// Keep a global reference of the window object
let mainWindow

const NOTIFICATION_TITLE = 'Basic Notification'
const NOTIFICATION_BODY = 'Notification from the Main process'



app.whenReady().then(() => {

  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, "./assets/icon.png"))
  }

  new Notification({
    title: NOTIFICATION_TITLE,
    body: NOTIFICATION_BODY
  }).show()
  
  // Set up IPC listener for notifications
  ipcMain.on('send-notification', () => {
    try {
      const notification = new Notification({
        title: 'DUCKTOR',
        body: 'Please fix your posture',
        silent: true,
        icon: path.join(__dirname, "./assets/icon.png"),
      })
      
      notification.show()
      console.log('Posture notification sent from main process')
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  })
  
  createWindow()
})

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
  })

  // Open DevTools in development
  mainWindow.webContents.openDevTools()

  mainWindow.loadFile('index.html')
  
  // Send test notification via IPC after window loads
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      mainWindow.webContents.send('test-notification-trigger')
    }, 5000) // 5 seconds after window loads
  })
}

// Handle window behavior on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Direct test from main process
ipcMain.on('request-test-notification', () => {
  sendTestNotification()
})