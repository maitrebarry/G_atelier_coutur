// sidebar.js - Version corrigée avec gestion du timing des permissions
/* global Common */
class SidebarManager {
    constructor() {
        this.menuItems = [
            {
                id: 'dashboard',
                title: 'Tableau de bord',
                icon: 'bx bx-home-circle',
                href: 'home.html',
                alwaysVisible: true
            },
            {
                id: 'mesures',
                title: 'Mesures clients',
                icon: 'bx bx-ruler',
                href: 'mesures.html',
                permission: 'CLIENT_VOIR'
            },
            {
                id: 'clients',
                title: 'Liste des clients',
                icon: 'bx bx-user',
                href: 'clients.html',
                permission: 'CLIENT_VOIR'
            },
            {
                id: 'modeles',
                title: 'Modèles',
                icon: 'bx bx-cut',
                href: 'modele.html',
                permission: 'MODELE_VOIR'
            },
            {
                id: 'affectations',
                title: 'Affectations',
                icon: 'bx bx-user-check',
                href: 'affectation.html',
                permission: 'AFFECTATION_VOIR'
            },
            {
                id: 'rendezvous',
                title: 'Rendez-vous',
                icon: 'bx bx-calendar',
                href: 'rendezvous.html',
                permission: 'RENDEZ_VOUS_VOIR'
            },
            {
                id: 'paiements',
                title: 'Paiements',
                icon: 'bx bx-wallet',
                href: 'paiements.html',
                permission: 'PAIEMENT_VOIR'
            },
            {
                id: 'parametres',
                title: 'Paramètres',
                icon: 'bx bx-cog',
                href: 'parametres.html',
                permission: 'MENU_PARAMETRES'
            }
        ];
        
        this.currentPage = this.getCurrentPage();
        this.isInitialized = false;
        this.init();
    }

    async init() {
        console.log('🔄 SidebarManager initialisation...');
        
        // Attendre que Common soit disponible
        await this.waitForCommon();
        
        // Attendre que les permissions soient disponibles
        await this.waitForPermissions();
        
        console.log('✅ Tout est prêt, rendu de la sidebar');
        this.injectLightCSS();
        
        // Attendre un peu plus pour les permissions, puis afficher
        setTimeout(() => {
            if (Common.getUserData().permissions && Common.getUserData().permissions.length > 0) {
                this.renderSidebar();
            } else {
                this.renderSidebarWithDefaultPermissions();
            }
        }, 500);
        
        this.setupEventListeners();
        
        setTimeout(() => this.highlightCurrentPage(), 100);
        this.isInitialized = true;
    }

    // Attendre que Common soit disponible
    async waitForCommon() {
        if (typeof Common !== 'undefined' && Common.isAuthenticated) {
            return true;
        }
        
        console.log('⏳ Attente de Common...');
        
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 secondes max
            
            const checkCommon = () => {
                attempts++;
                
                if (typeof Common !== 'undefined' && Common.isAuthenticated) {
                    console.log('✅ Common disponible');
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ Timeout attente Common');
                    resolve(false);
                    return;
                }
                
                setTimeout(checkCommon, 100);
            };
            
            checkCommon();
        });
    }

    // Attendre que les permissions soient chargées
    async waitForPermissions() {
        // Vérifier d'abord si l'utilisateur est authentifié
        if (!Common.isAuthenticated()) {
            console.warn('⚠️ Utilisateur non authentifié');
            return false;
        }
        
        const userData = Common.getUserData();
        
        // Si les permissions sont déjà là
        if (userData.permissions && userData.permissions.length > 0) {
            console.log('⚡ Permissions déjà chargées:', userData.permissions.length);
            return true;
        }
        
        // Sinon, attendre qu'elles soient chargées (timeout réduit)
        console.log('⏳ Attente des permissions...');
        
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 30; // 3 secondes max au lieu de 5
            
            const checkPermissions = () => {
                attempts++;
                const currentUserData = Common.getUserData();
                
                if (currentUserData.permissions && currentUserData.permissions.length > 0) {
                    console.log('✅ Permissions chargées après attente:', currentUserData.permissions.length);
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ Timeout attente permissions - affichage avec permissions par défaut');
                    // Afficher la sidebar avec des permissions par défaut pour les rôles de base
                    this.renderSidebarWithDefaultPermissions();
                    resolve(false);
                    return;
                }
                
                setTimeout(checkPermissions, 100);
            };
            
            checkPermissions();
        });
    }

    // Forcer le chargement des permissions si timeout
    async forceLoadPermissions() {
        try {
            console.log('🔄 Chargement forcé des permissions...');
            await Common.refreshPermissions();
            return true;
        } catch (error) {
            console.error('❌ Erreur chargement forcé permissions:', error);
            // En cas d'erreur, afficher avec permissions par défaut
            this.renderSidebarWithDefaultPermissions();
            return false;
        }
    }

    // Afficher la sidebar avec des permissions par défaut basées sur le rôle
    renderSidebarWithDefaultPermissions() {
        console.log('🔄 Affichage sidebar avec permissions par défaut...');
        
        const menuContainer = document.getElementById('menu');
        if (!menuContainer) {
            console.error('❌ #menu non trouvé');
            return;
        }

        // Permissions par défaut selon le rôle
        const userData = Common.getUserData();
        const role = userData.role || 'TAILLEUR';
        
        // Permissions de base pour tous les rôles authentifiés
        const defaultPermissions = ['CLIENT_VOIR', 'CLIENT_CREER', 'CLIENT_MODIFIER'];
        
        // Permissions supplémentaires selon le rôle
        if (role === 'SUPERADMIN' || role === 'PROPRIETAIRE') {
            defaultPermissions.push('MODELE_VOIR', 'MODELE_CREER', 'AFFECTATION_VOIR', 'RENDEZ_VOUS_VOIR', 'PAIEMENT_VOIR', 'MENU_PARAMETRES');
        } else if (role === 'SECRETAIRE') {
            defaultPermissions.push('MODELE_VOIR', 'AFFECTATION_VOIR', 'RENDEZ_VOUS_VOIR', 'PAIEMENT_VOIR');
        }

        let html = '';
        let visibleCount = 0;

        this.menuItems.forEach(item => {
            const hasAccess = item.alwaysVisible || 
                            (item.permission && defaultPermissions.includes(item.permission)) ||
                            !item.permission; // Éléments sans permission requise
            
            if (hasAccess) {
                const isActive = this.currentPage === item.href;
                const activeClass = isActive ? 'active' : '';
                
                html += `
                    <li class="menu-item ${activeClass}" data-menu="${item.id}">
                        <a href="${item.href}" class="menu-link">
                            <div class="parent-icon"><i class="${item.icon}"></i></div>
                            <div class="menu-title">${item.title}</div>
                        </a>
                    </li>
                `;
                visibleCount++;
            } else {
                console.log(`🚫 Menu caché (permissions par défaut): ${item.title} (permission: ${item.permission})`);
            }
        });

        menuContainer.innerHTML = html;
        console.log(`✅ ${visibleCount} éléments affichés avec permissions par défaut - Rôle: ${role}`);
        
        // Tenter de rafraîchir les permissions en arrière-plan
        setTimeout(() => {
            Common.refreshPermissions().then(() => {
                console.log('🔄 Permissions rechargées - rafraîchissement de la sidebar');
                this.renderSidebar();
            }).catch(error => {
                console.warn('⚠️ Impossible de recharger les permissions:', error);
            });
        }, 2000);
    }

    injectLightCSS() {
        const lightCSS = `
            <style id="sidebar-light-css">
            /* Sidebar styles optimized for light/default theme */
            .menu-item {
                border-radius: 8px;
                margin: 4px 8px;
                transition: background-color 0.15s ease, transform 0.15s ease;
            }

            .menu-item:hover {
                background-color: rgba(0, 0, 0, 0.04) !important;
                transform: translateY(-1px);
            }

            /* active item - ensure contrast on light background */
            .menu-item.active {
                background-color: rgba(13,110,253,0.08) !important; /* subtle blue */
            }

            /* menu link: larger, darker text for light theme */
            .menu-link {
                display: flex;
                align-items: center;
                padding: 12px 14px;
                color: rgba(0,0,0,0.85);
                text-decoration: none;
                transition: color 0.15s ease;
                border-radius: 6px;
                font-size: 0.98rem; /* slightly larger */
                font-weight: 500;
            }

            .menu-link:hover {
                color: rgba(0,0,0,0.95);
            }

            /* active link color for clear visibility */
            .menu-item.active .menu-link {
                color: #0d6efd !important; /* bootstrap primary */
                font-weight: 600;
            }

            .parent-icon {
                margin-right: 10px;
                font-size: 1.2em;
                width: 24px;
                text-align: center;
                color: rgba(0,0,0,0.65);
            }

            .menu-item.active .parent-icon {
                color: #0d6efd;
            }

            .menu-title {
                flex-grow: 1;
                font-size: 1rem;
            }

            /* ensure badges or extra labels remain visible */
            .menu-link .badge {
                background: rgba(13,110,253,0.12);
                color: #0d6efd;
                font-weight: 600;
                margin-left: 6px;
            }
            </style>
        `;
        
        if (!document.querySelector('#sidebar-light-css')) {
            document.head.insertAdjacentHTML('beforeend', lightCSS);
        }
    }

    getCurrentPage() {
        return window.location.pathname.split('/').pop() || 'home.html';
    }

    hasPermission(permission) {
        if (!permission) return true;
        
        if (typeof Common === 'undefined') {
            console.warn('⚠️ Common non disponible - mode dégradé activé');
            return true;
        }
        
        try {
            const hasPerm = Common.hasPermission(permission);
            console.log(`🔐 Permission "${permission}": ${hasPerm}`);
            return hasPerm;
        } catch (error) {
            console.error('❌ Erreur permission:', error);
            return true;
        }
    }

    renderSidebar() {
        const menuContainer = document.getElementById('menu');
        if (!menuContainer) {
            console.error('❌ #menu non trouvé');
            return;
        }

        let html = '';
        let visibleCount = 0;

        this.menuItems.forEach(item => {
            const hasAccess = item.alwaysVisible || this.hasPermission(item.permission);
            
            if (hasAccess) {
                const isActive = this.currentPage === item.href;
                const activeClass = isActive ? 'active' : '';
                
                html += `
                    <li class="menu-item ${activeClass}" data-menu="${item.id}">
                        <a href="${item.href}" class="menu-link">
                            <div class="parent-icon"><i class="${item.icon}"></i></div>
                            <div class="menu-title">${item.title}</div>
                        </a>
                    </li>
                `;
                visibleCount++;
            } else {
                console.log(`🚫 Menu caché: ${item.title} (permission: ${item.permission})`);
            }
        });

        menuContainer.innerHTML = html;
        console.log(`✅ ${visibleCount} éléments affichés sur ${this.menuItems.length} - Permissions disponibles:`, Common.getUserData().permissions?.length || 0);
    }

    setupEventListeners() {
        // Gestion des clics
        document.addEventListener('click', (e) => {
            if (e.target.closest('.menu-link')) {
                const link = e.target.closest('.menu-link');
                this.handleMenuClick(link);
            }
        });

        // Effets de survol
        document.addEventListener('mouseover', (e) => {
            const item = e.target.closest('.menu-item');
            if (item && !item.classList.contains('active')) {
                item.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
            }
        });

        document.addEventListener('mouseout', (e) => {
            const item = e.target.closest('.menu-item');
            if (item && !item.classList.contains('active')) {
                item.style.backgroundColor = '';
            }
        });

        // Réagir aux changements d'URL
        window.addEventListener('popstate', () => {
            this.currentPage = this.getCurrentPage();
            this.highlightCurrentPage();
        });

        // Écouter les mises à jour de permissions
        window.addEventListener('permissionsUpdated', (event) => {
            console.log('🔄 Permissions mises à jour, rafraîchissement de la sidebar');
            this.renderSidebar();
        });
    }

    handleMenuClick(clickedLink) {
        // Retirer active de tous les éléments
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Ajouter active à l'élément cliqué
        const parentItem = clickedLink.closest('.menu-item');
        if (parentItem) {
            parentItem.classList.add('active');
        }
        
        // Mettre à jour la page courante
        this.currentPage = clickedLink.getAttribute('href');
    }

    highlightCurrentPage() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        this.menuItems.forEach(item => {
            if (this.currentPage === item.href) {
                const menuItem = document.querySelector(`[data-menu="${item.id}"]`);
                if (menuItem) {
                    menuItem.classList.add('active');
                }
            }
        });
    }

    refresh() {
        console.log('🔄 Rafraîchissement de la sidebar');
        this.currentPage = this.getCurrentPage();
        this.renderSidebar();
        this.highlightCurrentPage();
    }
}

// ==================================================
// INITIALISATION ET GESTION DES ÉVÉNEMENTS - VERSION CORRIGÉE
// ==================================================

async function initializeSidebar() {
    // Vérifier que Common est disponible
    if (typeof Common === 'undefined') {
        console.warn('⏳ Common non disponible, report de l\'initialisation...');
        setTimeout(initializeSidebar, 100);
        return;
    }

    if (!Common.isAuthenticated()) {
        console.warn('⚠️ Utilisateur non authentifié - sidebar non initialisée');
        return;
    }

    try {
        const userData = Common.getUserData();
        console.log('🚀 Initialisation sidebar avec données:', {
            authenticated: Common.isAuthenticated(),
            permissionsCount: userData.permissions ? userData.permissions.length : 0
        });
        
        // Créer la sidebar (elle attendra les permissions automatiquement)
        window.sidebarManager = new SidebarManager();
        
    } catch (error) {
        console.error('❌ Erreur initialisation sidebar:', error);
        // Réessayer après un délai
        setTimeout(initializeSidebar, 1000);
    }
}

// Événement quand les permissions sont mises à jour
document.addEventListener('permissionsUpdated', function (event) {
    console.log('🔔 Événement permissionsUpdated reçu', event.detail);
    
    if (window.sidebarManager && window.sidebarManager.isInitialized) {
        console.log('🔄 Rafraîchissement de la sidebar existante');
        window.sidebarManager.refresh();
    } else {
        console.log('🚀 Création nouvelle sidebar après mise à jour permissions');
        initializeSidebar();
    }
});

// Initialisation au chargement - Version améliorée
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM chargé - démarrage initialisation sidebar...');
    
    // Attendre un peu que tout soit initialisé
    setTimeout(() => {
        initializeSidebar();
    }, 500);
});

// Fallback: initialisation si le DOM est déjà prêt
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('⚡ Initialisation rapide (DOM déjà prêt)');
    setTimeout(() => {
        initializeSidebar();
    }, 1000);
}

// Rafraîchissement automatique périodique
setInterval(() => {
    if (Common.isAuthenticated && Common.isAuthenticated()) {
        console.log('🕐 Rafraîchissement automatique des permissions...');
        Common.refreshPermissions().catch(error => {
            console.log('⚠️ Rafraîchissement automatique échoué:', error.message);
        });
    }
}, 300000); // 5 minutes

// Initialisation différée pour les pages qui chargent Common plus tard
setTimeout(() => {
    if (!window.sidebarManager && typeof Common !== 'undefined' && Common.isAuthenticated()) {
        console.log('🔄 Initialisation différée de la sidebar');
        initializeSidebar();
    }
}, 2000);

// Forcer l'initialisation si Common devient disponible plus tard
let commonCheckInterval = setInterval(() => {
    if (typeof Common !== 'undefined' && Common.isAuthenticated && !window.sidebarManager) {
        console.log('🔍 Common détecté tardivement - initialisation sidebar');
        initializeSidebar();
        clearInterval(commonCheckInterval);
    }
}, 500);

// Arrêter la vérification après 10 secondes
setTimeout(() => {
    clearInterval(commonCheckInterval);
}, 10000);