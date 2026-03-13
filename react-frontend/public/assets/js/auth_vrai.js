
// ==================================================
// GESTIONNAIRE D'AUTHENTIFICATION - VERSION CORRIGÉE
// ==================================================

/* global Common */

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

  const url = (typeof Common !== 'undefined' && Common.buildApiUrl)
    ? Common.buildApiUrl('auth/me')
    : '/api/auth/me';

  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(async (res) => {
      if (res.status === 401) {
        logout();
        return null;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Erreur fetchUserData: ${res.status} ${text}`);
      }
      return res.json();
    })
    .then((userData) => {
      if (!userData) return;
      console.log('Données utilisateur reçues:', userData);
      updateUserUI(userData);
    })
    .catch((err) => {
      console.error('Erreur lors du chargement des données utilisateur:', err);
    });
}

/**
 * Met à jour l'interface avec les données utilisateur - CORRIGÉ
 */
function updateUserUI(userData) {
  console.log("Mise à jour de l'UI avec:", userData);
  
  // CORRECTION : IDs avec traits d'union comme dans le HTML
  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  if (userNameEl) userNameEl.textContent = `${userData.prenom || ''} ${userData.nom || ''}`.trim();
  if (userRoleEl) userRoleEl.textContent = userData.role || '';
  
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
  const adminEls = document.querySelectorAll('.admin-only');
  const userEls = document.querySelectorAll('.user-only');

  const isAdmin = role === 'SUPERADMIN' || role === 'PROPRIETAIRE';
  adminEls.forEach((el) => {
    el.style.display = isAdmin ? '' : 'none';
  });
  userEls.forEach((el) => {
    el.style.display = '';
  });
}

/**
 * Déconnexion de l'utilisateur
 */
function logout() {
  const token = getToken();
  if (token) {
    const url = (typeof Common !== 'undefined' && Common.buildApiUrl)
      ? Common.buildApiUrl('auth/logout')
      : '/api/auth/logout';

    fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .catch(() => {})
      .finally(() => {
        clearUserData();
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
  // Ancienne implémentation jQuery supprimée.
  // Avec fetch(), chaque appel ajoute son header Authorization.
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

// Exposition optionnelle pour réutilisation dans d'autres scripts/pages
window.AuthVrai = Object.assign({}, window.AuthVrai, {
  isTokenExpired,
  fetchUserData,
  updateUserUI,
  toggleRoleBasedElements,
  logout,
  clearUserData,
  getToken,
  getUserData,
  isAuthenticated,
  setupAuthInterceptors,
  initLogoutHandler,
  isLoginPage,
  handleAuthentication
});