// Simple license generator using jsrsasign in the browser.
(function(){
  const $ = id => document.getElementById(id);
  const form = $('licForm');
  const out = $('output');
  const genBtn = $('generate');
  const dlBtn = $('download');
  const privFile = $('privFile');

  function parseExpires(val){
    if(!val) return null;
    if(/^[0-9]+$/.test(val)) return parseInt(val,10);
    const d = new Date(val);
    if(isNaN(d)) return null;
    return d.getTime();
  }

  function downloadJSON(obj){
    const data = JSON.stringify(obj,null,2);
    const blob = new Blob([data],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    dlBtn.href = url;
    dlBtn.download = 'license.json';
    dlBtn.disabled = false;
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    genBtn.disabled = true;
    out.value = '';

    const deviceId = $('deviceId').value.trim();
    const expiresRaw = $('expires').value.trim();
    const iss = $('issuedBy').value.trim();
    const expires = parseExpires(expiresRaw) || (Date.now() + 1000*60*60*24*365);

    if(!deviceId){ alert('DeviceId requis'); genBtn.disabled=false; return; }
    const payload = { deviceId: deviceId, expires: expires };
    if(iss) payload.issuedBy = iss;

    const file = privFile.files[0];
    if(!file){ alert('Fournis priv.pem (clé privée)'); genBtn.disabled=false; return; }

    try{
      const text = await file.text();
      // get private key
      const pk = KEYUTIL.getKey(text);
      const payloadStr = JSON.stringify(payload);
      const sig = new KJUR.crypto.Signature({"alg":"SHA256withRSA"});
      sig.init(pk);
      sig.updateString(payloadStr);
      const sigHex = sig.sign();
      const sigB64 = hex2b64(sigHex);

      const license = { payload: payload, signature: sigB64 };
      out.value = JSON.stringify(license,null,2);
      downloadJSON(license);
    }catch(err){
      console.error(err);
      alert('Erreur lors de la génération: '+err.message);
    }finally{ genBtn.disabled=false; }
  });

  dlBtn.addEventListener('click', ()=>{
    // URL already set in downloadJSON
  });
})();
