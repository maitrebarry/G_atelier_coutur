const $ = id => document.getElementById(id);

let privPem = null;

async function loadSavedPriv(){
  try{
    const res = await window.electronAPI.getSavedPriv();
    if(res && res.content){
      privPem = res.content;
      $('privName').textContent = 'clé enregistrée: '+(res.path.split(/[\\/]/).pop());
      $('useSaved').disabled = false;
      $('savePriv').disabled = true;
    }else{
      $('privName').textContent = 'Aucun fichier';
      $('useSaved').disabled = false;
      $('savePriv').disabled = true;
    }
  }catch(err){ console.error(err); }
}

async function loadHistory(){
  try{
    const arr = await window.electronAPI.getLicenseHistory();
    if(arr && Array.isArray(arr) && arr.length){
      $('history').textContent = arr.map(h=>`${new Date(h.createdAt).toLocaleString()} - ${h.payload.deviceId} - expires:${h.payload.expires}`).join('\n');
    }else{
      $('history').textContent = 'Aucun historique trouvé';
    }
  }catch(err){ console.error(err); }
}

$('selectPriv').addEventListener('click', async ()=>{
  const res = await window.electronAPI.selectPriv();
  if(!res) return;
  privPem = res.content;
  $('privName').textContent = res.path.split(/[\\/]/).pop();
  $('savePriv').disabled = false;
});

$('savePriv').addEventListener('click', async ()=>{
  if(!privPem){ alert('Aucune clé chargée'); return; }
  const res = await window.electronAPI.savePriv(privPem);
  if(res && res.error){ alert('Erreur: '+res.error); return; }
  alert('Clé enregistrée: '+res.path);
  $('savePriv').disabled = true;
  loadSavedPriv();
});

$('useSaved').addEventListener('click', async ()=>{
  const res = await window.electronAPI.getSavedPriv();
  if(!res || !res.content){ alert('Aucune clé enregistrée'); return; }
  privPem = res.content;
  $('privName').textContent = 'clé enregistrée: '+(res.path.split(/[\\/]/).pop());
  $('savePriv').disabled = true;
});

$('clearSaved').addEventListener('click', async ()=>{
  const res = await window.electronAPI.clearSavedPriv();
  if(res && res.error) { alert('Erreur: '+res.error); return; }
  alert('Clé supprimée');
  privPem = null;
  $('privName').textContent = 'Aucun fichier';
  $('savePriv').disabled = true;
  loadHistory();
});

function parseExpires(val){
  if(!val) return null;
  if(/^[0-9]+$/.test(val)) return parseInt(val,10);
  const d = new Date(val);
  if(isNaN(d)) return null;
  return d.getTime();
}

function activationLink(license){
  return 'ateliko://activate?license=' + encodeURIComponent(JSON.stringify(license));
}

function renderQr(license){
  const qrBox = $('qrBox');
  const qrTarget = $('qrCode');
  if(!window.qrcode || !license){
    qrBox.classList.add('hidden');
    qrTarget.innerHTML = '';
    return;
  }
  const qr = window.qrcode(0, 'M');
  qr.addData(activationLink(license));
  qr.make();
  qrTarget.innerHTML = qr.createImgTag(5, 8, 'QR activation ATELIKO');
  qrBox.classList.remove('hidden');
}

$('licForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  $('generate').disabled = true;
  $('output').value = '';
  renderQr(null);

  const deviceId = $('deviceId').value.trim();
  const expiresRaw = $('expires').value.trim();
  const atelierName = $('atelierName').value.trim();
  const iss = $('issuedBy').value.trim();
  const expires = parseExpires(expiresRaw) || (Date.now() + 1000*60*60*24*365);

  if(!deviceId){ alert('DeviceId requis'); $('generate').disabled=false; return; }
  if(!privPem){ alert('Sélectionne priv.pem'); $('generate').disabled=false; return; }

  const payload = { deviceId, expires };
  if(atelierName) payload.atelierName = atelierName;
  if(iss) payload.issuedBy = iss;

  const res = await window.electronAPI.generateLicense(payload, privPem);
  if(res && res.error){ alert('Erreur: '+res.error); $('generate').disabled=false; return; }
  const license = { payload: res.payload, signature: res.signature };
  $('output').value = JSON.stringify(license,null,2);
  renderQr(license);
  $('save').disabled = false;
  // save history
  try{ await window.electronAPI.saveLicenseHistory(license); loadHistory(); }catch(e){ console.error(e); }
  window.currentLicense = license;
  $('generate').disabled = false;
});

$('save').addEventListener('click', async ()=>{
  if(!window.currentLicense) return;
  const res = await window.electronAPI.saveFile(window.currentLicense);
  if(res && !res.canceled) alert('Sauvegardé: '+res.path);
});

// init
loadSavedPriv();
loadHistory();
