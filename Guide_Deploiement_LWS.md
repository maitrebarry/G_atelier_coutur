# Guide de Déploiement Full Stack (Spring Boot + React) sur VPS LWS

Ce document détaille la procédure pour héberger votre application "Atelier Couture" (Backend Spring Boot + Frontend React) sur un serveur VPS LWS.

## Pré-requis
*   Une offre **VPS** chez LWS (Debian 11/12 ou Ubuntu 20.04/22.04). *L'hébergement mutualisé standard ne suffit pas pour Spring Boot.*
*   Un client FTP (FileZilla).
*   Un terminal pour l'accès SSH (Putty ou le terminal de VS Code).

---

## Étape 1 : Préparer vos fichiers (Sur votre PC local)

Avant d'envoyer quoi que ce soit, il faut transformer votre code en fichiers exécutables pour la production.

### 1. Le Frontend (React)
Dans votre dossier `react-frontend`, ouvrez un terminal et lancez :
```bash
npm run build
```
> **Résultat :** Cela crée un dossier `build`. Ce dossier contient des fichiers HTML, CSS et JS optimisés. C'est la seule chose à envoyer pour le frontend.

### 2. Le Backend (Spring Boot)
Dans votre dossier `gestionatelier`, ouvrez un terminal et lancez :
```bash
./mvnw clean package -DskipTests
```
> **Résultat :** Cela crée un fichier `.jar` dans le dossier `target` (exemple : `gestionatelier-0.0.1-SNAPSHOT.jar`).

---

## Étape 2 : Configurer le VPS (Sur le serveur)

Connectez-vous à votre VPS via SSH (les identifiants `root` vous sont envoyés par LWS).

### 1. Mettre à jour et installer les outils
```bash
sudo apt update
sudo apt install openjdk-17-jdk nginx mariadb-server -y
```
*(Note : Si vous avez utilisé Java 21 pour le développement, installez `openjdk-21-jdk` à la place).*

### 2. Configurer la Base de Données
Connectez-vous à MySQL et créez la base :
```bash
sudo mysql -u root
```
Une fois dans l'invite MySQL :
```sql
CREATE DATABASE atelier_db;
CREATE USER 'atelier_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe_secure';
GRANT ALL PRIVILEGES ON atelier_db.* TO 'atelier_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Étape 3 : Déployer le Backend (Spring Boot)

### 1. Envoyer le fichier JAR
Utilisez FileZilla (en mode SFTP, port 22) pour envoyer votre fichier `.jar` sur le serveur.
*   **Source :** `gestionatelier/target/gestionatelier-0.0.1-SNAPSHOT.jar`
*   **Destination (sur le serveur) :** `/var/www/atelier/backend/` (créez les dossiers si nécessaire).

### 2. Créer un service système (Systemd)
Pour que votre site tourne en permanence (même après un redémarrage du serveur), créez un service.

```bash
sudo nano /etc/systemd/system/atelier.service
```

Collez le contenu suivant (clic droit pour coller dans Nano) :

```ini
[Unit]
Description=Atelier Backend Spring Boot
After=syslog.target

[Service]
User=root
ExecStart=/usr/bin/java -jar /var/www/atelier/backend/gestionatelier-0.0.1-SNAPSHOT.jar --spring.datasource.password=votre_mot_de_passe_secure
SuccessExitStatus=143
Restart=always

[Install]
WantedBy=multi-user.target
```
*Remplacez `votre_mot_de_passe_secure` par le mot de passe défini à l'étape 2.*

Sauvegardez (`Ctrl+O`, `Entrée`) et quittez (`Ctrl+X`).

### 3. Démarrer le backend
```bash
sudo systemctl enable atelier.service
sudo systemctl start atelier.service
```
Vérifiez que tout va bien avec : `sudo systemctl status atelier.service`

---

## Étape 4 : Déployer le Frontend (React)

### 1. Envoyer les fichiers
Via FileZilla, envoyez le **contenu** du dossier `build` (créé à l'étape 1) vers le serveur.
*   **Source :** `react-frontend/build/*` (tous les fichiers à l'intérieur).
*   **Destination :** `/var/www/atelier/frontend/`

---

## Étape 5 : Configurer Nginx (Reverse Proxy)

Nginx va servir de "portier". Il va distribuer les demandes soit vers les fichiers React, soit vers le Backend Java.

### 1. Créer la configuration du site
```bash
sudo nano /etc/nginx/sites-available/atelier
```

Collez ceci :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com; # Remplacez par votre domaine ou l'IP du VPS

    # 1. Servir le Frontend React (Fichiers statiques)
    location / {
        root /var/www/atelier/frontend;
        index index.html;
        # Indispensable pour React Router : redirige tout vers index.html si le fichier n'existe pas
        try_files $uri $uri/ /index.html;
    }

    # 2. Rediriger les appels API vers Spring Boot (Backend)
    location /api {
        proxy_pass http://localhost:8081; # Le port défini dans votre application.properties
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. Activer le site
```bash
sudo ln -s /etc/nginx/sites-available/atelier /etc/nginx/sites-enabled/
sudo nginx -t  # Vérifier s'il y a des erreurs de syntaxe
sudo systemctl restart nginx
```

---

## Résumé de l'architecture

Une fois terminé, voici ce qui se passe quand un utilisateur visite votre site :

1.  L'utilisateur tape `votre-domaine.com`.
2.  **Nginx** reçoit la demande sur le port 80.
3.  Si l'utilisateur demande une page (ex: `/clients`), Nginx renvoie le fichier `index.html` de React (très rapide).
4.  Si l'utilisateur demande une donnée (ex: `/api/clients`), Nginx passe la demande à **Spring Boot** (port 8081).
5.  Spring Boot interroge **MySQL** et renvoie la réponse à Nginx, qui la renvoie à l'utilisateur.

Cette architecture est professionnelle, sécurisée et performante.
