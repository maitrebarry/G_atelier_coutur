# Gestionatelier Backend

Ce module Spring Boot expose l'API REST utilisée par les applications web et mobile.

## Fichiers de configuration

Trois profils sont définis afin de faciliter le développement local et le déploiement :

- `application.properties` contient des paramètres communs et quelques valeurs par défaut.
- `application-local.yml` est activé quand l'application démarre en profil `local` (valeur par défaut).
  Il configure une base de données locale (PostgreSQL recommandé) et des URLs de
  frontend qui fonctionnent en développement.
- `application-prod.yml` est utilisé lorsque le profil `prod` est activé (par exemple
  sur Render/Heroku). Il lit les URL de connexion à la base de données depuis les
  variables d'environnement (`SPRING_DATASOURCE_URL`, etc.) et désactive les logs SQL.

Spring choisit automatiquement le fichier correspondant au profil via
`spring.config.activate.on-profile`.

### Basculer entre MySQL et PostgreSQL

Le fichier `application.properties` inclut toujours une section commentée pour MySQL.
La configuration active dans `application-local.yml` utilise PostgreSQL ; vous pouvez
ajuster ces valeurs ou réactiver MySQL en modifiant les commentaires.

### Variables importantes

- `PORT` : port HTTP, fourni par Render/Heroku ou utilisé en local par défaut (8081).
- `JWT_SECRET` : secret pour signer les tokens JWT.
- `DATABASE_URL` / `SPRING_DATASOURCE_*` : connexion à la base de données en prod.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` : identifiants OAuth2.
- `APP_FRONTEND_BASE_URL` : URL du front (utilisé pour les redirections OAuth).
- `APP_UPLOAD_DIR` : répertoire des fichiers uploadés (photos, vidéos, preuves, etc.).

Avant de pousser en production, veillez à définir ces variables via l'interface
de votre hébergeur.

## Render : Disk (uploads persistants)

Sur Render, le filesystem du conteneur est éphémère. Pour conserver les photos/vidéos/preuves d'abonnement entre les déploiements, attachez un **Disk** au service backend.

- **Mount path recommandé** : `/app/uploads`
  - Le `Dockerfile` définit `WORKDIR /app`, donc la config par défaut `app.upload.dir=./uploads/` pointe naturellement vers `/app/uploads`.
- **Size** : commencez au plus bas puis augmentez si besoin.
- **Limites Render** (important) : un Disk désactive le zero-downtime deploy et empêche le scaling multi-instances.

Optionnel (si vous voulez être explicite) : définissez la variable d'environnement `APP_UPLOAD_DIR=/app/uploads/`.

Au démarrage, l'application crée automatiquement les sous-dossiers attendus (ex: `user_photo`, `model_photo`, `habit_photo`, `model_video`, `subscription_receipts`).

## Démarrage local

1. Créez (ou migrez) la base de données locale :
   - `docker run -d --name pg -e POSTGRES_DB=atelier_couture_local -e POSTGRES_USER=atelier_local -e POSTGRES_PASSWORD=local_pass -p 5432:5432 postgres:15`
   - adaptez les valeurs si besoin.
2. Assurez‑vous que le profile `local` est actif (c'est l'option par défaut).
3. Lancez l'application :
   ```bash
   cd gestionatelier
   ./mvnw spring-boot:run
   ```
4. L'API sera disponible sur `http://localhost:8081`.

Pour déployer sur Render/Heroku, placez vos fichiers dans le dépôt et configurez
les variables d'environnement décrites ci‑dessus. Spring chargera `application-prod.yml`
pendant le build et à l'exécution.
