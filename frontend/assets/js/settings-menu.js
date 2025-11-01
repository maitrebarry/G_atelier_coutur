// // settings-menu.js - Version avec gestion des permissions par rôle
// console.log('🚀 settings-menu.js chargé');

// document.addEventListener('DOMContentLoaded', function() {
//     console.log('📄 DOMContentLoaded - début initialisation menu paramètres');
//     initializeSettingsMenu();
// });

// function initializeSettingsMenu() {
//     console.log('🔄 Initialisation du menu paramètres...');
    
//     // 1. Trouver le conteneur
//     const menuContainer = document.querySelector('.fm-menu .list-group');
//     console.log('📦 Conteneur trouvé:', menuContainer);
    
//     if (!menuContainer) {
//         console.error('❌ Conteneur .fm-menu .list-group non trouvé');
//         return;
//     }

//     // 2. Configuration du menu avec permissions par rôle
//     const menuItems = [
//         {
//             title: 'Atelier',
//             icon: 'bx bx-home-alt me-2',
//             href: 'parametres.html',
//             permission: 'ATELIER_VIEW',
//             id: 'atelier',
//             // Le propriétaire peut voir son atelier même sans permission ATELIER_VIEW
//             allowProprietaire: true
//         },
//         {
//             title: 'Utilisateur',
//             icon: 'bx bx-user me-2',
//             href: 'signup.html',
//             permission: 'USER_VIEW',
//             id: 'utilisateur',
//             allowProprietaire: true
//         },
//         {
//             title: 'Assigner Permission',
//             icon: 'bx bx-user-pin me-2',
//             href: 'permission.html',
//             permission: 'PERMISSION_VIEW',
//             id: 'assigner-permission',
//             allowProprietaire: true
//         },
//         {
//             title: 'Liste des Permissions',
//             icon: 'bx bx-list-ul me-2',
//             href: 'liste_permission.html',
//             permission: 'SUPERADMIN',
//             id: 'liste-permissions',
//             superadminOnly: true // Uniquement SUPERADMIN
//         }
//     ];

//     // 3. Page actuelle
//     const currentPage = window.location.pathname.split('/').pop();
//     console.log('📍 Page actuelle:', currentPage);

//     // 4. Fonctions de vérification
//     function hasPermission(permission) {
//         if (!permission) return true;
//         if (typeof Common === 'undefined') {
//             console.warn('⚠️ Common non disponible - mode dégradé');
//             return true;
//         }
//         try {
//             return Common.hasPermission(permission);
//         } catch (error) {
//             console.error('❌ Erreur permission:', error);
//             return false;
//         }
//     }

//     function isSuperAdmin() {
//         if (typeof Common === 'undefined') return false;
//         try {
//             const userData = Common.getUserData();
//             return userData.role === 'SUPERADMIN';
//         } catch (error) {
//             console.error('❌ Erreur rôle:', error);
//             return false;
//         }
//     }

//     function isProprietaire() {
//         if (typeof Common === 'undefined') return false;
//         try {
//             const userData = Common.getUserData();
//             return userData.role === 'PROPRIETAIRE';
//         } catch (error) {
//             console.error('❌ Erreur rôle:', error);
//             return false;
//         }
//     }

//     function getUserRole() {
//         if (typeof Common === 'undefined') return 'UNKNOWN';
//         try {
//             const userData = Common.getUserData();
//             return userData.role || 'UNKNOWN';
//         } catch (error) {
//             return 'UNKNOWN';
//         }
//     }

//     function shouldShowMenuItem(item) {
//         console.log(`📋 Vérification: ${item.title}`);
        
//         // 1. Vérifier SUPERADMIN only
//         if (item.superadminOnly) {
//             const show = isSuperAdmin();
//             console.log(`🔐 ${item.title} - SUPERADMIN only: ${show}`);
//             return show;
//         }
        
//         // 2. Vérifier permission normale
//         const hasPerm = hasPermission(item.permission);
        
//         // 3. Si propriétaire et autorisé, montrer même sans permission
//         if (!hasPerm && item.allowProprietaire && isProprietaire()) {
//             console.log(`👤 ${item.title} - Propriétaire autorisé sans permission`);
//             return true;
//         }
        
//         console.log(`🔐 ${item.title} - Permission ${item.permission}: ${hasPerm}`);
//         return hasPerm;
//     }

//     // 5. Générer le HTML
//     let html = '';
//     let count = 0;

//     menuItems.forEach(item => {
//         if (shouldShowMenuItem(item)) {
//             const isActive = currentPage === item.href;
//             console.log(`✅ ${item.title} - actif: ${isActive}`);

//             html += `
//                 <a href="${item.href}" class="list-group-item list-group-item-action py-2 ${isActive ? 'active' : ''}" data-menu-id="${item.id}">
//                     <i class="${item.icon}"></i>
//                     <span>${item.title}</span>
//                 </a>
//             `;
//             count++;
//         } else {
//             console.log(`❌ ${item.title} - caché`);
//         }
//     });

//     // 6. Injecter le HTML
//     console.log('📝 Injection HTML');
//     menuContainer.innerHTML = html;
//     console.log(`✅ Menu paramètres généré avec ${count} éléments pour rôle: ${getUserRole()}`);

//     // 7. Ajouter le CSS
//     injectMenuCSS();
    
//     // 8. Si page atelier et propriétaire, cacher le bouton ajouter
//     if (currentPage === 'parametres.html' && isProprietaire()) {
//         setTimeout(hideAddButtonForProprietaire, 200);
//     }
// }

// function hideAddButtonForProprietaire() {
//     const addButton = document.querySelector('button[data-permissions="ATELIER_CREATE"]');
//     if (addButton) {
//         addButton.style.display = 'none';
//         console.log('🚫 Bouton "Ajouter un atelier" caché pour propriétaire');
//     }
// }

// function injectMenuCSS() {
//     const css = `
//         <style>
//         .fm-menu .list-group-item {
//             transition: all 0.3s ease;
//             border-radius: 6px;
//             margin: 2px 0;
//             border: none;
//         }
//         .fm-menu .list-group-item:hover {
//             background-color: rgba(0, 123, 255, 0.1);
//             transform: translateX(3px);
//         }
//         .fm-menu .list-group-item.active {
//             background-color: #0d6efd !important;
//             color: white !important;
//             font-weight: 500;
//         }
//         </style>
//     `;
    
//     if (!document.querySelector('#settings-menu-css')) {
//         document.head.insertAdjacentHTML('beforeend', css);
//     }
// }

// // Initialisation de secours
// setTimeout(initializeSettingsMenu, 1000);

// settings-menu.js - Gestion complète du menu et des permissions
console.log('🚀 settings-menu.js chargé');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOMContentLoaded - initialisation du menu');
    initializeSettingsMenu();
    initializePermissions();
});

function initializeSettingsMenu() {
    console.log('🔄 Initialisation du menu paramètres...');
    
    // 1. Trouver le conteneur du menu
    const menuContainer = document.querySelector('.fm-menu .list-group');
    console.log('📦 Conteneur menu trouvé:', menuContainer);
    
    if (!menuContainer) {
        console.error('❌ Conteneur menu non trouvé');
        return;
    }

    // 2. Configuration des éléments du menu avec permissions
    const menuItems = [
        {
            title: 'Atelier',
            icon: 'bx bx-home-alt me-2',
            href: 'parametres.html',
            permission: 'ATELIER_VIEW',
            id: 'atelier',
            roles: ['SUPERADMIN', 'PROPRIETAIRE'] // Rôles autorisés
        },
        {
            title: 'Utilisateur',
            icon: 'bx bx-user me-2',
            href: 'signup.html',
            permission: 'USER_VIEW',
            id: 'utilisateur',
            roles: ['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE']
        },
        {
            title: 'Assigner Permission',
            icon: 'bx bx-user-pin me-2',
            href: 'permission.html',
            permission: 'PERMISSION_VIEW',
            id: 'assigner-permission',
            roles: ['SUPERADMIN', 'PROPRIETAIRE']
        },
        {
            title: 'Liste des Permissions',
            icon: 'bx bx-list-ul me-2',
            href: 'liste_permission.html',
            permission: 'SUPERADMIN_ONLY',
            id: 'liste-permissions',
            roles: ['SUPERADMIN'] // Uniquement SUPERADMIN
        }
    ];

    // 3. Obtenir l'utilisateur courant
    const currentUser = getUserData();
    const currentUserRole = currentUser.role;
    const currentPage = window.location.pathname.split('/').pop();
    
    console.log(`👤 Utilisateur: ${currentUserRole}, Page: ${currentPage}`);

    // 4. Générer le HTML du menu
    let html = '';
    let visibleItems = 0;

    menuItems.forEach(item => {
        const isAuthorized = isAuthorizedForMenuItem(item, currentUserRole);
        
        if (isAuthorized) {
            const isActive = currentPage === item.href;
            console.log(`✅ ${item.title} - ${isActive ? 'ACTIF' : 'inactif'}`);

            html += `
                <a href="${item.href}" class="list-group-item list-group-item-action py-2 ${isActive ? 'active' : ''}" 
                   data-menu-id="${item.id}" data-permission="${item.permission}">
                    <i class="${item.icon}"></i>
                    <span>${item.title}</span>
                </a>
            `;
            visibleItems++;
        } else {
            console.log(`❌ ${item.title} - NON AUTORISÉ pour ${currentUserRole}`);
        }
    });

    // 5. Injecter le HTML dans le menu
    menuContainer.innerHTML = html;
    console.log(`✅ Menu généré: ${visibleItems} éléments visibles`);

    // 6. Appliquer le style CSS
    applyMenuStyles();
}

function initializePermissions() {
    console.log('🔐 Initialisation des permissions...');
    
    const currentUser = getUserData();
    const currentUserRole = currentUser.role;
    
    // Gestion spécifique du bouton "Ajouter un atelier"
    manageAddAtelierButton(currentUserRole);
    
    // Gestion des autres éléments avec permissions
    managePermissionElements();
    
    // Charger les ateliers si l'utilisateur a la permission
    if (shouldDisplayAteliers(currentUserRole)) {
        console.log('📋 Chargement des ateliers...');
        loadAteliers();
    } else {
        console.log('🚫 Masquage section ateliers');
        document.getElementById('ateliersSection').style.display = 'none';
    }
}

function manageAddAtelierButton(userRole) {
    const addButton = document.querySelector('button[data-permissions="ATELIER_CREATE"]');
    if (!addButton) {
        console.warn('⚠️ Bouton ATELIER_CREATE non trouvé');
        return;
    }

    // Seul SUPERADMIN peut ajouter des ateliers
    if (userRole !== 'SUPERADMIN') {
        addButton.style.display = 'none';
        console.log('🚫 Bouton "Ajouter un atelier" caché');
    } else {
        addButton.style.display = 'block';
        console.log('✅ Bouton "Ajouter un atelier" visible');
    }
}

function managePermissionElements() {
    const elements = document.querySelectorAll('[data-permissions]');
    console.log(`🔍 ${elements.length} éléments avec permissions à vérifier`);

    elements.forEach(element => {
        const requiredPermission = element.getAttribute('data-permissions');
        const currentUser = getUserData();
        const currentUserRole = currentUser.role;

        const shouldShow = hasPermissionForElement(requiredPermission, currentUserRole);
        
        if (!shouldShow && element.tagName === 'A') {
            // Pour les liens, on les cache complètement
            element.style.display = 'none';
            console.log(`🚫 Lien caché: ${requiredPermission}`);
        } else if (!shouldShow) {
            // Pour les autres éléments (boutons, etc.)
            element.style.display = 'none';
            console.log(`🚫 Élément caché: ${requiredPermission}`);
        } else {
            element.style.display = '';
            console.log(`✅ Élément visible: ${requiredPermission}`);
        }
    });
}

// Fonctions de vérification des permissions
function isAuthorizedForMenuItem(item, userRole) {
    // Vérifier si le rôle est autorisé
    if (!item.roles.includes(userRole)) {
        return false;
    }

    // Vérifications spécifiques par permission
    switch(item.permission) {
        case 'ATELIER_VIEW':
            return userRole === 'SUPERADMIN' || userRole === 'PROPRIETAIRE';
            
        case 'USER_VIEW':
            return userRole !== 'TAILLEUR'; // Tous sauf tailleur
            
        case 'PERMISSION_VIEW':
            return userRole === 'SUPERADMIN' || userRole === 'PROPRIETAIRE';
            
        case 'SUPERADMIN_ONLY':
            return userRole === 'SUPERADMIN';
            
        default:
            return true;
    }
}

function hasPermissionForElement(permission, userRole) {
    switch(permission) {
        case 'ATELIER_CREATE':
            return userRole === 'SUPERADMIN';
            
        case 'ATELIER_VIEW':
            return userRole === 'SUPERADMIN' || userRole === 'PROPRIETAIRE';
            
        case 'USER_VIEW':
            return userRole !== 'TAILLEUR';
            
        case 'PERMISSION_VIEW':
            return userRole === 'SUPERADMIN' || userRole === 'PROPRIETAIRE';
            
        default:
            return true;
    }
}

function shouldDisplayAteliers(userRole) {
    return userRole === 'SUPERADMIN' || userRole === 'PROPRIETAIRE';
}

// Fonctions utilitaires
function getUserData() {
    // Priorité à votre système existant
    if (typeof Common !== 'undefined' && Common.getUserData) {
        return Common.getUserData();
    }
    
    if (typeof getUserData === 'function') {
        return getUserData();
    }
    
    // Fallback vers localStorage
    try {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : { role: 'UNKNOWN', username: 'Inconnu' };
    } catch (error) {
        console.error('❌ Erreur getUserData:', error);
        return { role: 'UNKNOWN', username: 'Inconnu' };
    }
}

function getToken() {
    if (typeof Common !== 'undefined' && Common.getToken) {
        return Common.getToken();
    }
    
    if (typeof getToken === 'function') {
        return getToken();
    }
    
    return localStorage.getItem('token');
}

function isAuthenticated() {
    if (typeof Common !== 'undefined' && Common.isAuthenticated) {
        return Common.isAuthenticated();
    }
    
    if (typeof isAuthenticated === 'function') {
        return isAuthenticated();
    }
    
    return !!getToken();
}

// Application des styles
function applyMenuStyles() {
    const styleId = 'dynamic-menu-styles';
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

// Fonctions de rechargement pour usage externe
function refreshMenuAndPermissions() {
    console.log('🔄 Rechargement du menu et permissions');
    initializeSettingsMenu();
    initializePermissions();
}

// Exposer les fonctions globalement
window.SettingsMenu = {
    refresh: refreshMenuAndPermissions,
    initialize: initializeSettingsMenu
};

// Integration avec votre code existant pour le chargement des ateliers
function setupAtelierPage() {
    if (!isAuthenticated()) {
        window.location.href = "index.html";
        return;
    }

    const currentUser = getUserData();
    const currentUserRole = currentUser.role;

    console.log(`🏁 Configuration page atelier pour: ${currentUserRole}`);

    // Masquer les éléments superadmin-only
    document.querySelectorAll(".superadmin-only").forEach((el) => {
        el.style.display = currentUserRole === "SUPERADMIN" ? "" : "none";
    });

    // Initialiser le menu
    initializeSettingsMenu();
    
    // Gérer les permissions des boutons d'action
    managePermissionElements();
}

// S'assurer que la page est configurée au chargement
if (document.querySelector('#ateliersTable')) {
    document.addEventListener('DOMContentLoaded', setupAtelierPage);
}