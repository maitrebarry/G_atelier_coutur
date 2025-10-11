// ==================================================
// GESTIONNAIRE D'AUTHENTIFICATION - VERSION CORRIGÉE
// ==================================================

/**
 * Vérifie si un token JWT est expiré
 */
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

/**
 * Récupère les données utilisateur depuis l'API
 */
function fetchUserData() {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    logout();
    return;
  }

  $.ajax({
    url: "http://localhost:8081/api/auth/me",
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
        logout();
      } else {
        console.error("Erreur lors du chargement des données utilisateur:", xhr.responseText);
      }
    },
  });
}

/**
 * Met à jour l'interface avec les données utilisateur - CORRIGÉ
 */
function updateUserUI(userData) {
  console.log("Mise à jour de l'UI avec:", userData);
  
  // CORRECTION : IDs avec traits d'union comme dans le HTML
  $("#user-name").text(userData.prenom + " " + userData.nom);
  $("#user-role").text(userData.role);
  
  console.log("Éléments mis à jour:");
  console.log("- Nom complet:", userData.prenom + " " + userData.nom);
  console.log("- Rôle:", userData.role);
  
  toggleRoleBasedElements(userData.role);
}

/**
 * Affiche/masque les éléments selon le rôle
 */
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

/**
 * Déconnexion de l'utilisateur
 */
function logout() {
  const token = getToken();
  if (token) {
    $.ajax({
      url: "http://localhost:8081/api/auth/logout",
      type: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },
      success: function () {
        clearUserData();
      },
      error: function () {
        clearUserData();
      },
    });
  } else {
    clearUserData();
  }
}

/**
 * Nettoie toutes les données d'authentification
 */
function clearUserData() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("userData");
  window.location.href = "index.html";
}

/**
 * Récupère le token depuis le storage
 */
function getToken() {
  return (
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
  );
}

/**
 * Récupère les données utilisateur depuis le storage
 */
function getUserData() {
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");
  return userData ? JSON.parse(userData) : null;
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  return !isTokenExpired(token);
}

/**
 * Configure les intercepteurs AJAX pour ajouter le token
 */
function setupAuthInterceptors() {
  $.ajaxSetup({
    beforeSend: function (xhr) {
      const token = getToken();
      if (token && !isTokenExpired(token)) {
        xhr.setRequestHeader("Authorization", "Bearer " + token);
      }
    },
  });

  $(document).ajaxError(function (event, xhr) {
    if (xhr.status === 401) {
      console.log("Token expiré ou invalide, déconnexion...");
      logout();
    }
  });
}

/**
 * Gestionnaire de déconnexion
 */
function initLogoutHandler() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Déconnexion demandée");
      logout();
    });
  }
}

/**
 * Vérifie si on est sur la page de login
 */
function isLoginPage() {
  return window.location.pathname.endsWith('index.html') || 
         window.location.pathname === '/' ||
         window.location.pathname.endsWith('/');
}

/**
 * Évite les boucles de redirection
 */
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
  
  // Si sur la page de login et non authentifié, initialiser le formulaire
  if (isLoginPage() && !isAuthenticated()) {
    console.log("Initialisation de la page de login");
    // Ici vous pouvez initialiser le formulaire de login
  }
});