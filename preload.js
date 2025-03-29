const { contextBridge, ipcRenderer } = require('electron')

// Expose versions info to renderer
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
})

// Expose notification API to renderer with proper error handling
contextBridge.exposeInMainWorld('notifications', {
  send: () => {
    try {
      console.log('Sending notification from preload')
      ipcRenderer.send('send-notification')
      return true
    } catch (error) {
      console.error('Error in preload when sending notification:', error)
      return false
    }
  }
})