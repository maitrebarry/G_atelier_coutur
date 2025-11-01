// global-menu.js - Gestion UNIQUEMENT du menu de navigation (col-3)
console.log('🌍 global-menu.js - Gestion du menu seulement');

class GlobalMenuManager {
    constructor() {
        this.currentUser = null;
        this.currentPage = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeMenu();
        });
    }

    initializeMenu() {
        console.log('🔄 Initialisation du menu navigation...');
        
        // Récupérer les données utilisateur
        this.currentUser = this.getUserData();
        this.currentPage = window.location.pathname.split('/').pop();
        
        console.log(`👤 Utilisateur: ${this.currentUser.role}, Page: ${this.currentPage}`);

        // Configuration du menu POUR TOUTES LES PAGES
        const menuItems = [
            {
                title: 'Atelier',
                icon: 'bx bx-home-alt me-2',
                href: 'parametres.html',
                permission: 'ATELIER_VIEW',
                roles: ['SUPERADMIN', 'PROPRIETAIRE']
            },
            {
                title: 'Utilisateur',
                icon: 'bx bx-user me-2', 
                href: 'signup.html',
                permission: 'USER_VIEW',
                roles: ['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE']
            },
            {
                title: 'Assigner Permission',
                icon: 'bx bx-user-pin me-2',
                href: 'permission.html',
                permission: 'PERMISSION_VIEW', 
                roles: ['SUPERADMIN', 'PROPRIETAIRE']
            },
            {
                title: 'Liste des Permissions',
                icon: 'bx bx-list-ul me-2',
                href: 'liste_permission.html',
                permission: 'SUPERADMIN_ONLY',
                roles: ['SUPERADMIN']
            }
        ];

        this.generateMenu(menuItems);
    }

    generateMenu(menuItems) {
        const menuContainer = document.querySelector('.fm-menu .list-group');
        if (!menuContainer) {
            console.error('❌ Conteneur menu non trouvé');
            return;
        }

        let html = '';
        let visibleItems = 0;

        menuItems.forEach(item => {
            if (this.canAccessMenuItem(item)) {
                const isActive = this.currentPage === item.href;
                html += `
                    <a href="${item.href}" class="list-group-item list-group-item-action py-2 ${isActive ? 'active' : ''}">
                        <i class="${item.icon}"></i>
                        <span>${item.title}</span>
                    </a>
                `;
                visibleItems++;
                console.log(`✅ ${item.title} - ${isActive ? 'ACTIF' : 'inactif'}`);
            } else {
                console.log(`❌ ${item.title} - NON AUTORISÉ pour ${this.currentUser.role}`);
            }
        });

        menuContainer.innerHTML = html;
        console.log(`✅ Menu généré: ${visibleItems} éléments`);
        
        this.applyMenuStyles();
    }

    canAccessMenuItem(item) {
        // Vérifier le rôle
        if (!item.roles.includes(this.currentUser.role)) {
            return false;
        }

        // Vérifications spécifiques par permission
        switch(item.permission) {
            case 'ATELIER_VIEW':
                return this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'PROPRIETAIRE';
                
            case 'USER_VIEW':
                return this.currentUser.role !== 'TAILLEUR';
                
            case 'PERMISSION_VIEW':
                return this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'PROPRIETAIRE';
                
            case 'SUPERADMIN_ONLY':
                return this.currentUser.role === 'SUPERADMIN';
                
            default:
                return true;
        }
    }

    getUserData() {
        // Utiliser votre système existant
        if (typeof Common !== 'undefined' && Common.getUserData) {
            return Common.getUserData();
        }
        
        if (typeof getUserData === 'function') {
            return getUserData();
        }
        
        // Fallback simple
        try {
            const userData = localStorage.getItem('userData');
            return userData ? JSON.parse(userData) : { role: 'UNKNOWN' };
        } catch (error) {
            return { role: 'UNKNOWN' };
        }
    }

    applyMenuStyles() {
        const styleId = 'global-menu-styles';
        if (document.getElementById(styleId)) return;

        const styles = `
            <style id="${styleId}">
            .fm-menu .list-group-item {
                transition: all 0.3s ease;
                border-radius: 8px;
                margin: 4px 0;
                border: 1px solid transparent;
                color: #495057;
                font-weight: 500;
            }
            .fm-menu .list-group-item:hover {
                background-color: #e7f1ff;
                border-color: #0d6efd;
                transform: translateX(5px);
                color: #0d6efd;
            }
            .fm-menu .list-group-item.active {
                background-color: #0d6efd !important;
                border-color: #0d6efd;
                color: white !important;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(13, 110, 253, 0.3);
            }
            .fm-menu .list-group-item i {
                transition: transform 0.3s ease;
            }
            .fm-menu .list-group-item:hover i {
                transform: scale(1.1);
            }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// Initialisation automatique
window.globalMenu = new GlobalMenuManager();