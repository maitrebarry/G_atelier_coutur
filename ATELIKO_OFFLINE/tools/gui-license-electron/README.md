Ateliko Licence Generator — Desktop (Electron)

Usage

1. Ensure you have Node.js installed.
2. From this folder, install dev dependencies:

```bash
cd tools/gui-license-electron
npm install
```

3. Start the Electron app:

```bash
npm start
```

Workflow
- Click `Sélectionner priv.pem` to choose your RSA private key.
- Fill `Device ID` and `Expires` (timestamp ms or ISO datetime).
- Click `Générer` to produce the signed licence JSON.
- Click `Sauvegarder license.json` to export for use on the device.

Remember key option
- You can click `Enregistrer la clé` after selecting `priv.pem` to store it securely in the app data folder. After that, simply use `Utiliser clé enregistrée` on future runs — you won't need to re-upload the file each time.
- To remove the stored key, click `Supprimer clé enregistrée`.

Security
- Keep your `priv.pem` secret. The private key is only used locally in this app; it is not sent anywhere.
