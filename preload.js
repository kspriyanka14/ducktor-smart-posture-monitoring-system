/**
 * Ducktor - Preload Script
 * 
 * This script creates a secure bridge between the renderer process
 * and the main process via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Navigation API
 * Exposes methods for navigating between pages
 */
contextBridge.exposeInMainWorld('api', {
    /**
     * Open the camera page
     * Sends a message to the main process to switch to the camera page
     */
    openCamPage: () => {
        ipcRenderer.send('open-cam-page');
    },
    
    /**
     * Go back to the main page
     * Sends a message to the main process to return to the index page
     */
    goBack: () => {
        ipcRenderer.send('go-back');
    }
});

/**
 * Notifications API
 * Exposes methods for sending various types of notifications
 */
contextBridge.exposeInMainWorld('notifications', {
    /**
     * Send a posture notification
     * @returns {boolean} Success status
     */
    send: () => {
        try {
            console.log('Sending posture notification from preload');
            ipcRenderer.send('send-notification');
            return true;
        } catch (error) {
            console.error('Error in preload when sending notification:', error);
            return false;
        }
    },
    
    /**
     * Send a break reminder notification
     * @returns {boolean} Success status
     */
    sendStandUpReminder: () => {
        try {
            console.log('Sending break reminder notification from preload');
            ipcRenderer.send('send-break-notification');
            return true;
        } catch (error) {
            console.error('Error in preload when sending break reminder:', error);
            return false;
        }
    },

    /**
     * Send a custom break reminder notification with interval info
     * @param {number} intervalMinutes - The reminder interval in minutes
     * @returns {boolean} Success status
     */
    sendCustomStandUpReminder: (intervalMinutes) => {
        try {
            console.log(`Sending custom break reminder (${intervalMinutes} min) from preload`);
            ipcRenderer.send('send-custom-break-notification', intervalMinutes);
            return true;
        } catch (error) {
            console.error('Error in preload when sending custom break reminder:', error);
            return false;
        }
    }
});