
// ==================================================
// CONFIGURATION GLOBALE
// ==================================================
if (typeof window.APP_CONFIG === 'undefined') {
    window.APP_CONFIG = {
        API_BASE_URL: "http://localhost:8081",
        ROLES: {
            SUPERADMIN: 'SUPERADMIN',
            PROPRIETAIRE: 'PROPRIETAIRE',
            SECRETAIRE: 'SECRETAIRE',
            TAILLEUR: 'TAILLEUR'
        }
    };
}

// ==================================================
// FONCTIONS UTILITAIRES COMMUNES
// ==================================================

// Gestion du token et authentification
function getToken() {
    return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

function getUserData() {
    const userData = JSON.parse(
        localStorage.getItem("userData") ||
        sessionStorage.getItem("userData") ||
        "{}"
    );

    return {
        userId: userData.id || userData.userId,
        role: userData.role || "",
        atelierId: userData.atelierId || (userData.atelier ? userData.atelier.id : null),
        nom: userData.nom || "",
        prenom: userData.prenom || "",
        email: userData.email || "",
        photoPath: userData.photoPath || null,
        permissions: userData.permissions || []
    };
}

function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");
    window.location.href = "index.html";
}

// Gestion des messages (avec fallback)
function showSuccessMessage(message) {
    if (typeof Swal !== 'undefined') {
        return Swal.fire({
            icon: "success",
            title: "Succès",
            text: message,
            toast: true,
            position: "top-end",
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false,
        });
    } else {
        alert('✅ ' + message);
    }
}

function showErrorMessage(message) {
    if (typeof Swal !== 'undefined') {
        return Swal.fire({
            icon: "error",
            title: "Erreur",
            text: message,
            confirmButtonColor: "#d33",
        });
    } else {
        alert('❌ ' + message);
    }
}

function showInfoMessage(message) {
    if (typeof Swal !== 'undefined') {
        return Swal.fire({
            icon: "info",
            title: "Information",
            text: message,
            timer: 3000,
            showConfirmButton: false,
        });
    } else {
        alert('ℹ️ ' + message);
    }
}

// Vérification des permissions - VERSION CORRIGÉE
function hasPermission(permissionCode) {
    const userData = getUserData();
    const userRole = userData.role;

    console.log('🔐 Vérification permission:', permissionCode, 'User:', userData);

    // SUPERADMIN a toutes les permissions
    if (userRole === 'SUPERADMIN') {
        console.log('✅ SUPERADMIN - accès accordé');
        return true;
    }

    // Vérifier les permissions individuelles (tableau de strings)
    if (userData.permissions && Array.isArray(userData.permissions)) {
        const hasPerm = userData.permissions.includes(permissionCode);
        console.log('📋 Permission trouvée:', hasPerm, 'Permissions disponibles:', userData.permissions);
        return hasPerm;
    }

    console.warn('⚠️ Aucune permission individuelle trouvée - fallback par rôle');

    // Fallback par rôle (seulement si pas de permissions individuelles)
    const rolePermissions = {
        'PROPRIETAIRE': ['MENU_TABLEAU_BORD', 'MENU_CLIENTS', 'MENU_MODELES', 'MENU_AFFECTATIONS', 'MENU_RENDEZ_VOUS', 'MENU_PAIEMENTS', 'MENU_PARAMETRES'],
        'SECRETAIRE': ['MENU_TABLEAU_BORD', 'MENU_CLIENTS', 'MENU_MODELES', 'MENU_RENDEZ_VOUS', 'MENU_PAIEMENTS'],
        'TAILLEUR': ['MENU_TABLEAU_BORD', 'MENU_MODELES']
    };

    const hasRolePerm = rolePermissions[userRole] && rolePermissions[userRole].includes(permissionCode);
    console.log('🎭 Permission par rôle:', hasRolePerm);
    return hasRolePerm;
}
// Rafraîchissement des permissions
async function refreshPermissions() {
    try {
        console.log('🔄 Rafraîchissement des permissions...');
        const userInfo = await apiCall('/api/auth/me');
        
        // Mettre à jour les données utilisateur
        const currentUserData = getUserData();
        currentUserData.permissions = userInfo.permissions || [];
        
        // Sauvegarder
        const storage = localStorage.getItem("authToken") ? localStorage : sessionStorage;
        storage.setItem("userData", JSON.stringify(currentUserData));
        
        console.log('✅ Permissions mises à jour:', currentUserData.permissions);
        
        // Déclencher l'événement
        window.dispatchEvent(new CustomEvent('permissionsUpdated', { 
            detail: { permissions: currentUserData.permissions } 
        }));
        
        return currentUserData.permissions;
    } catch (error) {
        console.error('❌ Erreur rafraîchissement permissions:', error);
        throw error;
    }
}
// Vérification d'authentification
function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const exp = payload.exp * 1000;
        return Date.now() < exp;
    } catch (e) {
        console.error("Erreur de décodage du token:", e);
        return false;
    }
}

// ==================================================
// INDICATEUR DE CHARGEMENT GLOBAL
// ==================================================
function showLoading(message = "Chargement...") {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.position = 'fixed';
        loader.style.top = 0;
        loader.style.left = 0;
        loader.style.width = '100%';
        loader.style.height = '100%';
        loader.style.background = 'rgba(0,0,0,0.4)';
        loader.style.display = 'flex';
        loader.style.alignItems = 'center';
        loader.style.justifyContent = 'center';
        loader.style.zIndex = 9999;
        loader.innerHTML = `
            <div style="background: white; padding: 20px 40px; border-radius: 10px; text-align:center;">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 mb-0 fw-bold">${message}</p>
            </div>
        `;
        document.body.appendChild(loader);
    } else {
        loader.querySelector("p").textContent = message;
        loader.style.display = 'flex';
    }
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}

// ==================================================
// FONCTIONS API COMMUNES
// ==================================================

async function apiCall(endpoint, options = {}) {
    try {
        const token = getToken();
        
        // ✅ CORRECTION : Nettoyer l'endpoint pour éviter les doubles slash
        let cleanEndpoint = endpoint;
        if (cleanEndpoint.startsWith('/')) {
            cleanEndpoint = cleanEndpoint.substring(1);
        }
        
        const baseUrl = window.APP_CONFIG.API_BASE_URL;
        const url = `${baseUrl}/${cleanEndpoint}`;
        
        console.log('🌐 Appel API:', url, 'Token présent:', !!token);
        
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 403) {
            console.warn('⛔ Accès refusé (403) - Vérifiez les permissions backend');
            const errorText = await response.text();
            console.error('Détails erreur 403:', errorText);
            throw new Error('Accès refusé - Vous n\'avez pas les permissions nécessaires');
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ HTTP ${response.status}:`, errorText);
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ Erreur API ${endpoint}:`, error);
        throw error;
    }
}
// ==================================================
// GESTION DES PAGES ET REDIRECTIONS
// ==================================================

function checkPageAccess() {
    if (typeof sidebarManager !== 'undefined') {
        const currentPage = window.location.pathname.split('/').pop();
        if (!sidebarManager.canAccessPage(currentPage)) {
            console.warn('⛔ Accès non autorisé à la page:', currentPage);
            Common.showErrorMessage('Vous n\'avez pas les permissions nécessaires pour accéder à cette page');
            setTimeout(() => window.location.href = 'home.html', 2000);
            return false;
        }
    }
    return true;
}

function navigateTo(page) {
    if (typeof sidebarManager !== 'undefined') {
        if (sidebarManager.canAccessPage(page)) {
            window.location.href = page;
        } else {
            Common.showErrorMessage('Vous n\'avez pas accès à cette page');
        }
    } else {
        window.location.href = page;
    }
}

// Vérifier les permissions pour un élément UI
function checkUIPermission(permission, element) {
    if (!hasPermission(permission)) {
        if (element) {
            element.style.display = 'none';
        }
        return false;
    }
    return true;
}
// Fonction temporaire pour charger les permissions manuellement
async function loadUserPermissions() {
    try {
        console.log('🔄 Chargement manuel des permissions...');
        const userInfo = await apiCall('/api/auth/me');
        
        if (userInfo.permissions && userInfo.permissions.length > 0) {
            console.log('✅ Permissions chargées:', userInfo.permissions);
            
            // Mettre à jour le localStorage
            const currentUserData = getUserData();
            currentUserData.permissions = userInfo.permissions;
            
            const storage = localStorage.getItem("authToken") ? localStorage : sessionStorage;
            storage.setItem("userData", JSON.stringify(currentUserData));
            
            // Rafraîchir la sidebar
            window.dispatchEvent(new CustomEvent('permissionsUpdated'));
            
            return userInfo.permissions;
        } else {
            console.warn('⚠️ Aucune permission dans la réponse API');
            return [];
        }
    } catch (error) {
        console.error('❌ Erreur chargement permissions:', error);
        return [];
    }
}

// Exposer la fonction
window.loadUserPermissions = loadUserPermissions;

// Charger automatiquement au démarrage
document.addEventListener('DOMContentLoaded', function() {
    if (Common.isAuthenticated()) {
        setTimeout(() => {
            const userData = Common.getUserData();
            if (!userData.permissions || userData.permissions.length === 0) {
                console.log('🔄 Chargement automatique des permissions...');
                loadUserPermissions();
            }
        }, 1000);
    }
});
// ==================================================
// EXPOSITION GLOBALE
// ==================================================
// ==================================================
// EXPOSITION GLOBALE
// ==================================================
window.Common = {
    getToken,
    getUserData,
    logout,
    showSuccessMessage,
    showErrorMessage,
    showInfoMessage,
    hasPermission,
    isAuthenticated,
    showLoading,
    hideLoading,
    apiCall,
    refreshPermissions  // <-- AJOUTÉ
};