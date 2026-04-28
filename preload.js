// preload.js - Secure IPC bridge between renderer and main process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rambam', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Data
  getTodayStatus: () => ipcRenderer.invoke('get-today-status'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  getChapter: () => ipcRenderer.invoke('get-chapter'),

  // Overlay actions
  markRead: () => ipcRenderer.invoke('mark-read'),
  markSkipped: () => ipcRenderer.invoke('mark-skipped'),
  markPostpone: () => ipcRenderer.invoke('mark-postpone'),

  // Scheduler
  toggleScheduler: () => ipcRenderer.invoke('toggle-scheduler'),
  triggerNow: () => ipcRenderer.invoke('trigger-now'),

  // Events from main → renderer
  onChapterData: (callback) => ipcRenderer.on('chapter-data', (_, data) => callback(data)),
  onStatusUpdate: (callback) => ipcRenderer.on('status-update', (_, data) => callback(data)),
});
