#!/bin/bash
# =============================================================
# ATELIKO - Script de démarrage LAMPP (à lancer avec sudo)
# Usage: sudo bash /home/maitre/G_atelier_coutur/setup_ateliko.sh
# =============================================================

set -e

PROJECT_DIR="/opt/lampp/htdocs/ATELIKO_laravel"
PUBLIC_LINK="/opt/lampp/htdocs/ateliko"
PHP="/usr/bin/php"
MYSQL="/opt/lampp/bin/mysql"

echo "======================================"
echo "  ATELIKO - Configuration LAMPP"
echo "======================================"

# 1. Démarrer LAMPP
echo ""
echo "[1/7] Démarrage de LAMPP (Apache + MySQL)..."
/opt/lampp/lampp start
sleep 3
echo "      ✓ LAMPP démarré"

# Point d'entrée web : expose uniquement le dossier public de Laravel.
echo ""
echo "[2/7] Configuration de l'accès http://localhost/ateliko..."
if [ -e "$PUBLIC_LINK" ] && [ ! -L "$PUBLIC_LINK" ]; then
    echo "      ✗ $PUBLIC_LINK existe déjà et n'est pas un lien symbolique"
    exit 1
fi
ln -sfn "$PROJECT_DIR/public" "$PUBLIC_LINK"
echo "      ✓ Point d'entrée web configuré"

# 2. Créer la base de données
echo ""
echo "[3/7] Création de la base de données ateliko_laravel..."
$MYSQL -u root -e "CREATE DATABASE IF NOT EXISTS ateliko_laravel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null && \
    echo "      ✓ Base de données prête" || echo "      ✓ Base de données déjà existante"

# 3. Permissions storage
echo ""
echo "[4/7] Correction des permissions..."
chmod -R 775 "$PROJECT_DIR/storage"
chmod -R 775 "$PROJECT_DIR/bootstrap/cache"
echo "      ✓ Permissions OK"

# 4. Storage link
echo ""
echo "[5/7] Création du lien symbolique storage..."
cd "$PROJECT_DIR"
$PHP artisan storage:link --force 2>/dev/null && echo "      ✓ Lien storage créé" || echo "      ✓ Lien storage déjà existant"

# 5. Migrations + Seed
echo ""
echo "[6/7] Migration et initialisation de la base de données..."
$PHP artisan migrate --seed --force
echo "      ✓ Migrations et seed terminés"

# 6. Vider les caches
echo ""
echo "[7/7] Optimisation Laravel..."
$PHP artisan config:clear
$PHP artisan cache:clear
$PHP artisan view:clear
$PHP artisan route:clear
echo "      ✓ Caches vidés"

echo ""
echo "======================================"
echo "  ATELIKO est prêt !"
echo "======================================"
echo ""
echo "  Accès web :  http://localhost/ateliko"
echo "  API mobile : http://localhost/ateliko/api/..."
echo ""
echo "  Comptes de démonstration :"
echo "  SUPERADMIN   : barrymoustpaha485@gmail.com / superadmin123"
echo "  PROPRIETAIRE : proprietaire@ateliko.com / password123"
echo "  SECRETAIRE   : secretaire@ateliko.com / password123"
echo "  TAILLEUR     : tailleur@ateliko.com / password123"
echo ""
echo "  Pour redémarrer LAMPP plus tard :"
echo "  sudo /opt/lampp/lampp start"
echo "======================================"
