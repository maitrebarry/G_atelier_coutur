# ATELIKO Offline

Application Android React Native CLI autonome. Les donnees sont stockees dans SQLite local et les photos sont copiees dans le dossier documents de l'application via `react-native-fs`.

## Installation

```bash
cd ATELIKO_OFFLINE
npm install
npm run android
```

## APK

Debug:

```bash
npm run apk:debug
```

Release installable:

```bash
npm run apk:release
```

Le fichier est genere dans `android/app/build/outputs/apk/release/app-release.apk`.

Pour signer avec une vraie cle, placer `release.keystore` dans `android/app` puis definir:

```bash
export ATELIKO_UPLOAD_STORE_FILE=release.keystore
export ATELIKO_UPLOAD_STORE_PASSWORD=...
export ATELIKO_UPLOAD_KEY_ALIAS=ateliko
export ATELIKO_UPLOAD_KEY_PASSWORD=...
```

## Garanties offline

- Aucun `fetch`.
- Aucun `axios`.
- Aucune API REST.
- Pas de permission internet dans `AndroidManifest.xml`.
- Tables locales: `client`, `mesure`, `modele_client`, `tailleur`, `affectation`, `paiement`, `rendezvous`.
- Paiements: `CLIENT` = entree atelier, `TAILLEUR` = sortie atelier.
