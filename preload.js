const { contextBridge, ipcRenderer } = require('electron');

// Expose versions info to renderer
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
});

contextBridge.exposeInMainWorld('api', {
  openCamPage: () => {
    ipcRenderer.send('open-cam-page');
  }
});

// Expose notification API to renderer with proper error handling
contextBridge.exposeInMainWorld('notifications', {
  send: () => {
    try {
      ipcRenderer.send('send-notification');
      return true;
    } catch (error) {
      return false;
    }
  }
});