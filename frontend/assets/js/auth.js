// ==================================================
// GESTIONNAIRE D'AUTHENTIFICATION
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
    url: "http://localhost:8080/api/auth/me", // CHANGÉ: utilisez /api/auth/me
    type: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
    success: function (userData) {
      console.log("Données utilisateur:", userData);
      updateUserUI(userData);
    },
    error: function (xhr) {
      if (xhr.status === 401) {
        logout();
      } else {
        console.error("Erreur fetching user data:", xhr);
      }
    },
  });
}

/**
 * Met à jour l'interface avec les données utilisateur
 */
function updateUserUI(userData) {
  $("#userName").text(userData.prenom + " " + userData.nom);
  $("#userEmail").text(userData.email);
  $("#userRole").text(userData.role);

  if (userData.atelierId) {
    $("#atelierInfo").text("Atelier: " + userData.atelierId);
  }
  toggleRoleBasedElements(userData.role);
}

/**
 * Affiche/masque les éléments selon le rôle
 */
function toggleRoleBasedElements(role) {
  if (role === "PROPRIETAIRE" || role === "ADMIN") {
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
      url: "http://localhost:8080/api/auth/logout",
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
  return token && !isTokenExpired(token);
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
    // Déjà connecté sur la page de login → rediriger vers home
    console.log("Déjà connecté, redirection vers home.html");
    setTimeout(() => window.location.href = "home.html", 100);
    return false;
  }
  
  if (!authenticated && !onLoginPage) {
    // Non connecté sur une page protégée → rediriger vers login
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
    console.log("Chargement des données utilisateur");
    fetchUserData();
  }
  
  // Si sur la page de login et non authentifié, initialiser le formulaire
  if (isLoginPage() && !isAuthenticated()) {
    console.log("Initialisation de la page de login");
    // Ici vous pouvez initialiser le formulaire de login
  }
});