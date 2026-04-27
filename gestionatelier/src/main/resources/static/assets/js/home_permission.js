

    // Fonction pour appliquer les permissions aux sections de données
    function applyDataSectionsPermissions() {
        console.log("📊 Application des permissions aux sections de données...");

        // Cacher toutes les sections de données d'abord
        document.querySelectorAll('.data-section').forEach(section => {
            section.style.display = 'none';
        });

        // Afficher seulement les sections avec les permissions appropriées
        document.querySelectorAll('.data-section').forEach(section => {
            const requiredPermission = section.getAttribute('data-permission');

            if (requiredPermission && Common.hasPermission(requiredPermission)) {
                section.style.display = '';
                console.log("✅ Afficher section avec permission:", requiredPermission);
            } else {
                console.log("❌ Cacher section - Permission manquante:", requiredPermission);
            }
        });
    }
  async function loadCurrentUserPermissions() {
    try {
        const userData = Common.getUserData();
        console.log('🔍 Chargement permissions utilisateur:', userData);

        if (!userData || !userData.userId) {
            console.error('❌ Données utilisateur non disponibles');
            return getDefaultPermissionsByRole(userData?.role || 'VISITEUR');
        }

        const token = Common.getToken();
        if (!token) {
            console.error('❌ Token non disponible');
            return getDefaultPermissionsByRole(userData.role || 'VISITEUR');
        }

        const response = await fetch(Common.buildApiUrl(`admin/utilisateurs/${userData.userId}/permissions`), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        let permissions = [];
        
        if (response.ok) {
            permissions = await response.json();
            console.log('✅ Permissions chargées:', permissions.length, permissions);
        } else {
            console.error('❌ Erreur API permissions, utilisation fallback');
            permissions = getDefaultPermissionsByRole(userData.role || 'VISITEUR');
        }

        // 🔥 DÉCLENCHER L'ÉVÉNEMENT DE PERMISSIONS CHARGÉES
        const event = new CustomEvent('permissionsUpdated', { 
            detail: { permissions, userData } 
        });
        document.dispatchEvent(event);

        return permissions;
    } catch (error) {
        console.error('❌ Erreur chargement permissions:', error);
        const userData = Common.getUserData();
        const permissions = getDefaultPermissionsByRole(userData?.role || 'VISITEUR');
        
        // Déclencher l'événement même en cas d'erreur
        const event = new CustomEvent('permissionsUpdated', { 
            detail: { permissions, userData } 
        });
        document.dispatchEvent(event);
        
        return permissions;
    }
}

    // MODIFIER l'appel dans l'initialisation
    async function initializeApp() {
        console.log('🚀 Initialisation de l\'application...');

        try {
            // Attendre que les données utilisateur soient chargées
            const userData = Common.getUserData();
            console.log('👤 Données utilisateur initiales:', userData);

            if (!userData || !userData.id) {
                console.warn('⚠️ Données utilisateur non chargées, attente...');
                setTimeout(initializeApp, 500);
                return;
            }

            // ✅ APPELER LA BONNE FONCTION
            const permissions = await loadCurrentUserPermissions();
            console.log('🔐 Permissions disponibles:', permissions);

            // Continuer avec le reste de l'initialisation...
            applyRoleBasedElements(userData.role);
            applyPermissionBasedElements(permissions);
            loadDashboardData();

        } catch (error) {
            console.error('❌ Erreur initialisation app:', error);
        }
    }

    // Simplifier loadDashboardData - maintenant les sections sont gérées par applyDataSectionsPermissions
    async function loadDashboardData() {
        try {
            const token = Common.getToken();
            if (!token) return;

            console.log("📊 Chargement des données dashboard...");

            // Commandes en cours - Permission: MODELE_VIEW
            if (Common.hasPermission('MODELE_VIEW')) {
                const commandesEnCours = document.getElementById('commandesEnCours');
                if (commandesEnCours) commandesEnCours.textContent = '12';
                console.log("✅ Données modèles chargées");
            }

            // Revenus - Permission: PAIEMENT_VIEW
            if (Common.hasPermission('PAIEMENT_VIEW')) {
                const revenusMois = document.getElementById('revenusMois');
                if (revenusMois) revenusMois.textContent = '285,000 FCFA';
                console.log("✅ Données paiements chargées");
            }

            // Clients - Permission: CLIENT_VIEW
            if (Common.hasPermission('CLIENT_VIEW')) {
                const clientsActifs = document.getElementById('clientsActifs');
                if (clientsActifs) clientsActifs.textContent = '45';
                console.log("✅ Données clients chargées");
            }

            // Tailleurs - Permission: TAILLEUR_VIEW
            if (Common.hasPermission('TAILLEUR_VIEW')) {
                const tailleursActifs = document.getElementById('tailleursActifs');
                if (tailleursActifs) tailleursActifs.textContent = '3';
                console.log("✅ Données tailleurs chargées");
            }

            // Modèles terminés - Permission: MODELE_VIEW
            if (Common.hasPermission('MODELE_VIEW')) {
                const modelesTermines = document.getElementById('modelesTermines');
                if (modelesTermines) modelesTermines.textContent = '8';
            }

            // Rendez-vous - Permission: RENDEZVOUS_VIEW
            if (Common.hasPermission('RENDEZVOUS_VIEW')) {
                const rdvAujourdhui = document.getElementById('rdvAujourdhui');
                if (rdvAujourdhui) rdvAujourdhui.textContent = '4';
            }

            // Paiements en attente - Permission: PAIEMENT_VIEW
            if (Common.hasPermission('PAIEMENT_VIEW')) {
                const paiementsAttente = document.getElementById('paiementsAttente');
                if (paiementsAttente) paiementsAttente.textContent = '2';
            }

            // Satisfaction clients - Permission: CLIENT_VIEW
            if (Common.hasPermission('CLIENT_VIEW')) {
                const satisfactionClients = document.getElementById('satisfactionClients');
                if (satisfactionClients) satisfactionClients.textContent = '92%';
            }

            // Commandes récentes - Permission: MODELE_VIEW
            if (Common.hasPermission('MODELE_VIEW')) {
                const commandesRecentes = document.getElementById('commandesRecentes');
                if (commandesRecentes) {
                    commandesRecentes.innerHTML = `
                        <tr><td>Mariam Diallo</td><td>Boubou</td><td>15/10/2024</td><td><span class="badge bg-warning">En cours</span></td></tr>
                        <tr><td>Oumar Traoré</td><td>Costume</td><td>18/10/2024</td><td><span class="badge bg-primary">Planifié</span></td></tr>
                        <tr><td>Fatou Bamba</td><td>Robe</td><td>12/10/2024</td><td><span class="badge bg-success">Terminé</span></td></tr>
                    `;
                }
            }

            // Tâches tailleur - Permission: MODELE_VIEW + rôle TAILLEUR
            const userData = Common.getUserData();
            if (Common.hasPermission('MODELE_VIEW') && userData.role === 'TAILLEUR') {
                const tachesTailleur = document.getElementById('tachesTailleur');
                if (tachesTailleur) {
                    tachesTailleur.innerHTML = `
                        <div class="alert alert-info">Boubou - Client: Mariam Diallo</div>
                        <div class="alert alert-warning">Costume - Client: Oumar Traoré</div>
                        <div class="alert alert-success">Robe - Client: Fatou Bamba (Terminé)</div>
                    `;
                }
            }

        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
        }
    }


    // Corriger les erreurs ApexCharts
    document.addEventListener('DOMContentLoaded', function () {
        // Vérifier que les éléments existent avant d'initialiser les graphiques
        const chartSelectors = ['#chart1', '#chart2', '#chart3', '#chart4'];
        chartSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (!element) {
                console.warn(`⚠️ Élément graphique non trouvé: ${selector}`);
            }
        });
    });
    // home_permission.js - Ajoutez cette fonction
    function applyRoleBasedElements() {
        const userData = Common.getUserData();
        const userRole = userData.role;

        console.log("🎭 Application des éléments basés sur le rôle:", userRole);

        // Gérer les éléments superadmin-only
        document.querySelectorAll('.superadmin-only').forEach(element => {
            if (userRole === 'SUPERADMIN') {
                element.style.display = '';
                console.log("✅ Afficher élément superadmin-only");
            } else {
                element.style.display = 'none';
                console.log("❌ Cacher élément superadmin-only");
            }
        });

        // Gérer les éléments admin-only (SUPERADMIN + PROPRIETAIRE)
        document.querySelectorAll('.admin-only').forEach(element => {
            if (userRole === 'SUPERADMIN' || userRole === 'PROPRIETAIRE') {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
    }

    // Modifiez applyPermissions pour inclure cette fonction
    function applyPermissions() {
        const userData = Common.getUserData();
        const userRole = userData.role;

        console.log("🔐 Application des permissions pour:", userRole);

        // 1. Appliquer les éléments basés sur le rôle
        applyRoleBasedElements();

        // 2. Cacher tous les éléments avec permissions du menu
        document.querySelectorAll('.permission-required').forEach(element => {
            element.style.display = 'none';
        });

        // 3. Afficher seulement les éléments du menu avec les permissions appropriées
        document.querySelectorAll('.permission-required').forEach(element => {
            const requiredPermission = element.getAttribute('data-permissions');
            if (requiredPermission && Common.hasPermission(requiredPermission)) {
                element.style.display = '';
                console.log("✅ Afficher élément menu avec permission:", requiredPermission);
            } else {
                console.log("❌ Cacher élément menu - Permission manquante:", requiredPermission);
            }
        });

        // 4. Tableau de bord toujours visible
        const tableauBord = document.querySelector('a[href="home.html"]')?.closest('li');
        if (tableauBord) {
            tableauBord.style.display = '';
        }

        // 5. Appliquer les permissions aux sections de données
        applyDataSectionsPermissions();

        // 6. Charger les données du tableau de bord selon les permissions
        loadDashboardData();
    }

    // Exposer les fonctions globalement si nécessaire
    window.applyPermissions = applyPermissions;
    window.loadDashboardData = loadDashboardData;