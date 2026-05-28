const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function createWindow(){
  const win = new BrowserWindow({
    width: 900,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname,'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname,'index.html'));
}

app.whenReady().then(()=>{
  createWindow();
  app.on('activate', ()=>{ if(BrowserWindow.getAllWindows().length===0) createWindow(); });
});

app.on('window-all-closed', ()=>{ if(process.platform!=='darwin') app.quit(); });

ipcMain.handle('select-priv', async (evt)=>{
  const res = await dialog.showOpenDialog({ properties:['openFile'], filters:[{ name: 'PEM', extensions:['pem','key'] }] });
  if(res.canceled || !res.filePaths.length) return null;
  const filePath = res.filePaths[0];
  const content = fs.readFileSync(filePath,'utf8');
  return { path: filePath, content };
});

ipcMain.handle('save-priv', async (evt, privPemContent)=>{
  try{
    const dir = app.getPath('userData');
    const target = path.join(dir, 'priv.pem');
    fs.writeFileSync(target, privPemContent, { mode: 0o600 });
    return { path: target };
  }catch(err){
    return { error: String(err) };
  }
});

ipcMain.handle('get-saved-priv', async (evt)=>{
  try{
    const dir = app.getPath('userData');
    const target = path.join(dir, 'priv.pem');
    if(!fs.existsSync(target)) return null;
    const content = fs.readFileSync(target,'utf8');
    return { path: target, content };
  }catch(err){
    return { error: String(err) };
  }
});

ipcMain.handle('clear-saved-priv', async (evt)=>{
  try{
    const dir = app.getPath('userData');
    const target = path.join(dir, 'priv.pem');
    if(fs.existsSync(target)) fs.unlinkSync(target);
    return { ok:true };
  }catch(err){
    return { error: String(err) };
  }
});

ipcMain.handle('generate-license', async (evt, payload, privPem)=>{
  try{
    const payloadStr = JSON.stringify(payload);
    const sig = crypto.sign('sha256', Buffer.from(payloadStr,'utf8'), { key: privPem, padding: crypto.constants.RSA_PKCS1_PADDING });
    const signature = sig.toString('base64');
    return { payload, signature };
  }catch(err){
    return { error: err.message || String(err) };
  }
});

ipcMain.handle('save-license-history', async (evt, license)=>{
  try{
    const dir = app.getPath('userData');
    const file = path.join(dir, 'licenses.json');
    let arr = [];
    if(fs.existsSync(file)){
      arr = JSON.parse(fs.readFileSync(file,'utf8') || '[]');
    }
    arr.push(Object.assign({ createdAt: Date.now() }, license));
    fs.writeFileSync(file, JSON.stringify(arr,null,2),'utf8');
    return { ok:true, path: file };
  }catch(err){
    return { error: String(err) };
  }
});

ipcMain.handle('get-license-history', async (evt)=>{
  try{
    const dir = app.getPath('userData');
    const file = path.join(dir, 'licenses.json');
    if(!fs.existsSync(file)) return [];
    const arr = JSON.parse(fs.readFileSync(file,'utf8') || '[]');
    return arr;
  }catch(err){
    return { error: String(err) };
  }
});

ipcMain.handle('save-file', async (evt, data)=>{
  const res = await dialog.showSaveDialog({ defaultPath: 'license.json', filters:[{ name: 'JSON', extensions:['json'] }] });
  if(res.canceled) return { canceled:true };
  fs.writeFileSync(res.filePath, JSON.stringify(data,null,2), 'utf8');
  return { canceled:false, path: res.filePath };
});
