// auth.js - SPÉCIFIQUE à l'authentification

// Fonctions SPÉCIFIQUES à l'authentification
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const exp = payload.exp * 1000;
        return Date.now() >= exp;
    } catch (e) {
        console.error("Erreur de décodage du token:", e);
        return true;
    }
}

function fetchUserData() {
    // Utilise Common s'il existe, sinon fallback
    const token = (typeof Common !== 'undefined') ? Common.getToken() : getTokenFallback();

    if (!token || isTokenExpired(token)) {
        (typeof Common !== 'undefined') ? Common.logout() : logoutFallback();
        return;
    }

    $.ajax({
        url: `${window.APP_CONFIG.API_BASE_URL}/api/auth/me`,
        type: "GET",
        headers: {
            Authorization: "Bearer " + token,
        },
        success: function (userData) {
            console.log("Données utilisateur reçues:", userData);
            updateUserUI(userData);
        },
        error: function (xhr) {
            console.error("Erreur détaillée fetching user data:", xhr);
            if (xhr.status === 401) {
                (typeof Common !== 'undefined') ? Common.logout() : logoutFallback();
            } else {
                console.error("Erreur lors du chargement des données utilisateur:", xhr.responseText);
            }
        },
    });
}

// Fonctions de fallback
function getTokenFallback() {
    return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

function logoutFallback() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");
    window.location.href = "index.html";
}

function updateUserUI(userData) {
    console.log("Mise à jour de l'UI avec:", userData);
    
    $("#user-name").text(userData.prenom + " " + userData.nom);
    $("#user-role").text(userData.role);
    
    toggleRoleBasedElements(userData.role);
}

function toggleRoleBasedElements(role) {
    console.log("Rôle détecté pour éléments UI:", role);
    if (role === "SUPERADMIN" || role === "PROPRIETAIRE") {
        $(".admin-only").show();
        $(".user-only").show();
    } else {
        $(".admin-only").hide();
        $(".user-only").show();
    }
}

function isAuthenticated() {
    const token = (typeof Common !== 'undefined') ? Common.getToken() : getTokenFallback();
    if (!token) return false;
    return !isTokenExpired(token);
}

function setupAuthInterceptors() {
    $.ajaxSetup({
        beforeSend: function (xhr) {
            const token = (typeof Common !== 'undefined') ? Common.getToken() : getTokenFallback();
            if (token && !isTokenExpired(token)) {
                xhr.setRequestHeader("Authorization", "Bearer " + token);
            }
        },
    });

    $(document).ajaxError(function (event, xhr) {
        if (xhr.status === 401) {
            console.log("Token expiré ou invalide, déconnexion...");
            (typeof Common !== 'undefined') ? Common.logout() : logoutFallback();
        }
    });
}

function initLogoutHandler() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (e) {
            e.preventDefault();
            console.log("Déconnexion demandée");
            (typeof Common !== 'undefined') ? Common.logout() : logoutFallback();
        });
    }
}

function isLoginPage() {
    return window.location.pathname.endsWith('index.html') || 
           window.location.pathname === '/' ||
           window.location.pathname.endsWith('/');
}

function handleAuthentication() {
    const authenticated = isAuthenticated();
    const onLoginPage = isLoginPage();
    
    console.log("Authentifié:", authenticated, "Sur page login:", onLoginPage);
    
    if (authenticated && onLoginPage) {
        console.log("Déjà connecté, redirection vers home.html");
        setTimeout(() => window.location.href = "home.html", 100);
        return false;
    }
    
    if (!authenticated && !onLoginPage) {
        console.log("Non authentifié, redirection vers index.html");
        setTimeout(() => window.location.href = "index.html", 100);
        return false;
    }
    
    return true;
}


// ==================================================
// INITIALISATION UNIQUE
// ==================================================

document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM chargé - Initialisation de l'authentification");
    
    // Configurer les intercepteurs
    setupAuthInterceptors();
    
    // Initialiser le bouton de déconnexion
    initLogoutHandler();
    
    // Gérer l'authentification sans boucle
    if (!handleAuthentication()) {
        return; // Arrêter si redirection en cours
    }
    
    // Si authentifié et sur une page protégée, charger les données
    if (isAuthenticated() && !isLoginPage()) {
        console.log("Utilisateur authentifié, chargement des données...");
        fetchUserData();
    }
});