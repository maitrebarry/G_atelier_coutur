Génération de licences pour Activation hors-ligne

Prérequis:
- Node.js installé
- Une clé privée RSA (2048 bits) `priv.pem` (garde-la secrète)

Générer une clé privée/public:

```bash
openssl genpkey -algorithm RSA -out priv.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in priv.pem -out pub.pem
```

Générer une licence signée (exemple):

```bash
node tools/generate-license.js --deviceId=ANDROID_ID --expires=1740000000000 --key=./priv.pem --outfile=license.json
```

Le fichier `license.json` produit ressemble à:

```json
{
  "payload": {"deviceId":"abc123","expires":1740000000000},
  "signature": "BASE64_SIGNATURE"
}
```

Colle le contenu JSON dans l'écran d'activation de l'app sur le téléphone pour activer.
