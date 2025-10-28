// // common.js - Fonctions communes à toute l'application

// // ==================================================
// // CONFIGURATION GLOBALE
// // ==================================================
// if (typeof window.APP_CONFIG === 'undefined') {
//     window.APP_CONFIG = {
//         API_BASE_URL: "http://localhost:8081",
//         ROLES: {
//             SUPERADMIN: 'SUPERADMIN',
//             PROPRIETAIRE: 'PROPRIETAIRE',
//             SECRETAIRE: 'SECRETAIRE',
//             TAILLEUR: 'TAILLEUR'
//         }
//     };
// }

// // ==================================================
// // FONCTIONS UTILITAIRES COMMUNES
// // ==================================================

// // Gestion du token et authentification
// function getToken() {
//     return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
// }

// function getUserData() {
//     const userData = JSON.parse(
//         localStorage.getItem("userData") ||
//         sessionStorage.getItem("userData") ||
//         "{}"
//     );

//     return {
//         userId: userData.id || userData.userId,
//         role: userData.role || "",
//         atelierId: userData.atelierId || (userData.atelier ? userData.atelier.id : null),
//         nom: userData.nom || "",
//         prenom: userData.prenom || "",
//         email: userData.email || "",
//         photoPath: userData.photoPath || null,
//         permissions: userData.permissions || []
//     };
// }

// function logout() {
//     localStorage.removeItem("authToken");
//     localStorage.removeItem("userData");
//     sessionStorage.removeItem("authToken");
//     sessionStorage.removeItem("userData");
//     window.location.href = "index.html";
// }

// // Gestion des messages (avec fallback)
// function showSuccessMessage(message) {
//     if (typeof Swal !== 'undefined') {
//         return Swal.fire({
//             icon: "success",
//             title: "Succès",
//             text: message,
//             toast: true,
//             position: "top-end",
//             timer: 3000,
//             timerProgressBar: true,
//             showConfirmButton: false,
//         });
//     } else {
//         alert('✅ ' + message);
//     }
// }

// function showErrorMessage(message) {
//     if (typeof Swal !== 'undefined') {
//         return Swal.fire({
//             icon: "error",
//             title: "Erreur",
//             text: message,
//             confirmButtonColor: "#d33",
//         });
//     } else {
//         alert('❌ ' + message);
//     }
// }

// // Vérification des permissions
// function hasPermission(permissionCode) {
//     const userData = getUserData();
//     const userRole = userData.role;

//     // SUPERADMIN a toutes les permissions
//     if (userRole === 'SUPERADMIN') {
//         return true;
//     }

//     // Vérifier les permissions individuelles
//     if (userData.permissions && Array.isArray(userData.permissions)) {
//         return userData.permissions.some(perm => perm.code === permissionCode);
//     }

//     // Fallback par rôle (seulement si pas de permissions individuelles)
//     const rolePermissions = {
//         'PROPRIETAIRE': ['MODELE_VIEW', 'CLIENT_VIEW', 'TAILLEUR_VIEW', 'RENDEZVOUS_VIEW', 'PAIEMENT_VIEW', 'PARAMETRE_VIEW', 'AFFECTATION_VIEW'],
//         'SECRETAIRE': ['MODELE_VIEW', 'CLIENT_VIEW', 'TAILLEUR_VIEW', 'RENDEZVOUS_VIEW', 'PAIEMENT_VIEW'],
//         'TAILLEUR': ['MODELE_VIEW']
//     };

//     return rolePermissions[userRole] && rolePermissions[userRole].includes(permissionCode);
// }

// // ==================================================
// // INDICATEUR DE CHARGEMENT GLOBAL
// // ==================================================
// function showLoading(message = "Chargement...") {
//     let loader = document.getElementById('globalLoader');
//     if (!loader) {
//         loader = document.createElement('div');
//         loader.id = 'globalLoader';
//         loader.style.position = 'fixed';
//         loader.style.top = 0;
//         loader.style.left = 0;
//         loader.style.width = '100%';
//         loader.style.height = '100%';
//         loader.style.background = 'rgba(0,0,0,0.4)';
//         loader.style.display = 'flex';
//         loader.style.alignItems = 'center';
//         loader.style.justifyContent = 'center';
//         loader.style.zIndex = 9999;
//         loader.innerHTML = `
//             <div style="background: white; padding: 20px 40px; border-radius: 10px; text-align:center;">
//                 <div class="spinner-border text-primary" role="status"></div>
//                 <p class="mt-2 mb-0 fw-bold">${message}</p>
//             </div>
//         `;
//         document.body.appendChild(loader);
//     } else {
//         loader.querySelector("p").textContent = message;
//         loader.style.display = 'flex';
//     }
// }

// function hideLoading() {
//     const loader = document.getElementById('globalLoader');
//     if (loader) {
//         loader.style.display = 'none';
//     }
// }

// // };
// // Exposer les fonctions globalement
// window.Common = {
//     getToken,
//     getUserData,
//     logout,
//     showSuccessMessage,
//     showErrorMessage,
//     hasPermission,
//     showLoading,
//     hideLoading
// };
// common.js - Fonctions communes à toute l'application

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

// Vérification des permissions
function hasPermission(permissionCode) {
    const userData = getUserData();
    const userRole = userData.role;

    // SUPERADMIN a toutes les permissions
    if (userRole === 'SUPERADMIN') {
        return true;
    }

    // Vérifier les permissions individuelles
    if (userData.permissions && Array.isArray(userData.permissions)) {
        return userData.permissions.some(perm => perm.code === permissionCode);
    }

    // Fallback par rôle (seulement si pas de permissions individuelles)
    const rolePermissions = {
        'PROPRIETAIRE': ['MODELE_VIEW', 'CLIENT_VIEW', 'TAILLEUR_VIEW', 'RENDEZVOUS_VIEW', 'PAIEMENT_VIEW', 'PARAMETRE_VIEW', 'AFFECTATION_VIEW'],
        'SECRETAIRE': ['MODELE_VIEW', 'CLIENT_VIEW', 'TAILLEUR_VIEW', 'RENDEZVOUS_VIEW', 'PAIEMENT_VIEW'],
        'TAILLEUR': ['MODELE_VIEW']
    };

    return rolePermissions[userRole] && rolePermissions[userRole].includes(permissionCode);
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
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ Erreur API ${endpoint}:`, error);
        throw error;
    }
}

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
    apiCall
};