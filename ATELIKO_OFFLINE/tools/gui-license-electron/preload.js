const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectPriv: () => ipcRenderer.invoke('select-priv'),
  generateLicense: (payload, privPem) => ipcRenderer.invoke('generate-license', payload, privPem),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  savePriv: (content) => ipcRenderer.invoke('save-priv', content),
  getSavedPriv: () => ipcRenderer.invoke('get-saved-priv'),
  clearSavedPriv: () => ipcRenderer.invoke('clear-saved-priv'),
  saveLicenseHistory: (license) => ipcRenderer.invoke('save-license-history', license),
  getLicenseHistory: () => ipcRenderer.invoke('get-license-history')
});
