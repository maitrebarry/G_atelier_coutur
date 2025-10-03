const apiAteliers = "http://localhost:8081/api/ateliers";
const apiUtilisateurs = "http://localhost:8081/api/utilisateurs";

// Fonction pour récupérer le token
function getToken() {
  return (
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
  );
}
// Fonction pour récupérer les données utilisateur
function getUserData() {
  const userData = JSON.parse(
    localStorage.getItem("userData") ||
      sessionStorage.getItem("userData") ||
      "{}"
  );

  // Assurez-vous que votre API retourne atelierId dans les données utilisateur
  return {
    userId: userData.id || userData.userId,
    role: userData.role || "",
    atelierId:
      userData.atelierId || (userData.atelier ? userData.atelier.id : null),
  };
}

// Fonction pour vérifier les permissions
function checkUserRole() {
  const userData = getUserData();
  return userData.role || "";
}

// Masquer/montrer les éléments selon le rôle
function toggleUIByRole() {
  const role = checkUserRole();
  const isSuperAdmin = role === 'SUPERADMIN';
  const isProprietaire = role === 'PROPRIETAIRE';
  const isTailleur = role === 'TAILLEUR';
  const isSecretaire = role === 'SECRETAIRE';

  const ateliersSection = document.getElementById('ateliersSection');
  const accessDeniedMessage = document.getElementById('accessDeniedMessage');
  const addAtelierButton = document.getElementById('addAtelierButton');

  // Gestion de la visibilité de la section ateliers
  if (isSuperAdmin || isProprietaire) {
    // Afficher la section ateliers pour SUPERADMIN et PROPRIETAIRE
    if (ateliersSection) ateliersSection.style.display = '';
    
    // Afficher le bouton "Ajouter" seulement pour SUPERADMIN
    if (addAtelierButton) {
      addAtelierButton.style.display = isSuperAdmin ? '' : 'none';
    }
    
    // Cacher le message d'accès refusé
    if (accessDeniedMessage) accessDeniedMessage.style.display = 'none';
  } 
  else if (isTailleur || isSecretaire) {
    // Cacher la section ateliers pour TAILLEUR et SECRETAIRE
    if (ateliersSection) ateliersSection.style.display = 'none';
    if (addAtelierButton) addAtelierButton.style.display = 'none';
    
    // Afficher le message d'accès refusé
    if (accessDeniedMessage) accessDeniedMessage.style.display = '';
  }

  // Gestion des autres éléments UI
  document.querySelectorAll('.superadmin-only').forEach(el => {
    el.style.display = isSuperAdmin ? '' : 'none';
  });

  document.querySelectorAll('.proprietaire-only').forEach(el => {
    el.style.display = isProprietaire ? '' : 'none';
  });

  document.querySelectorAll('.tailleur-only').forEach(el => {
    el.style.display = isTailleur ? '' : 'none';
  });

  document.querySelectorAll('.secretaire-only').forEach(el => {
    el.style.display = isSecretaire ? '' : 'none';
  });

  // Adapter le formulaire selon le rôle
  if (isSuperAdmin || isProprietaire) {
    const roleSelect = document.getElementById('inputRole');
    const editRoleSelect = document.getElementById('editRole');

    if (roleSelect && isProprietaire) {
      Array.from(roleSelect.options).forEach(option => {
        if (['PROPRIETAIRE', 'SUPERADMIN'].includes(option.value)) {
          option.style.display = 'none';
        }
      });
    }

    if (editRoleSelect && isProprietaire) {
      Array.from(editRoleSelect.options).forEach(option => {
        if (['PROPRIETAIRE', 'SUPERADMIN'].includes(option.value)) {
          option.disabled = true;
        }
      });
    }
  }
}

// Gestion améliorée des erreurs HTTP
async function handleApiError(response, context) {
  if (response.status === 401) {
    logout();
    return true;
  }

  if (response.status === 403) {
    const userRole = checkUserRole();
    let errorMessage = "Accès refusé. ";

    if (userRole === "PROPRIETAIRE") {
      errorMessage +=
        "Vous n'avez pas les permissions pour cette action. Seul un SuperAdmin peut gérer tous les utilisateurs.";
    } else {
      errorMessage += "Permissions insuffisantes.";
    }

    Swal.fire({
      icon: "error",
      title: "Accès refusé",
      text: errorMessage,
      confirmButtonColor: "#d33",
    });
    return true;
  }

  if (response.status >= 500) {
    errorMessage("Erreur serveur. Veuillez réessayer plus tard.");
    return true;
  }

  return false;
}

// Fonction pour charger les ateliers
async function loadAteliers() {
  try {
    const token = getToken();
    const currentUser = getUserData();
    const currentUserRole = currentUser.role;
    const currentUserAtelierId = currentUser.atelierId;

    if (!token) {
      throw new Error("Token non disponible. Veuillez vous reconnecter.");
    }

    let apiUrl = "http://localhost:8081/api/ateliers";
    
    // Si c'est un propriétaire, charger seulement son atelier
    if (currentUserRole === "PROPRIETAIRE" && currentUserAtelierId) {
      apiUrl = `http://localhost:8081/api/ateliers/${currentUserAtelierId}`;
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      if (response.status === 403) {
        throw new Error("Accès refusé: vous n'avez pas la permission de voir les ateliers");
      }
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    let ateliers;
    if (currentUserRole === "PROPRIETAIRE" && currentUserAtelierId) {
      const atelier = await response.json();
      ateliers = [atelier];
    } else {
      ateliers = await response.json();
    }

    displayAteliers(ateliers);
  } catch (error) {
    console.error("Erreur:", error);
    document.getElementById("ateliersBody").innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">
          Erreur de chargement: ${error.message}
        </td>
      </tr>`;
  }
}

// ✅ SweetAlert succès + scroll auto
function successMessage(message) {
  Swal.fire({
    icon: "success",
    title: "Succès",
    text: message,
    toast: true,
    position: "top-end",
    timer: 2500,
    timerProgressBar: true,
    showConfirmButton: false,
  });
}

// ✅ Erreur avec SweetAlert
function errorMessage(message) {
  Swal.fire({
    icon: "error",
    title: "Erreur",
    text: message,
    confirmButtonColor: "#d33",
    showConfirmButton: true,
    position: "center",
  });
}

// ➡️ Soumission formulaire CREATE
document
  .getElementById("userForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      errorMessage("Token non disponible. Veuillez vous reconnecter.");
      return;
    }

    const utilisateur = {
      nom: document.getElementById("inputNom").value.trim(),
      prenom: document.getElementById("inputPrenom").value.trim(),
      email: document.getElementById("inputEmail").value.trim(),
      motdepasse: document.getElementById("inputMotDePasse").value.trim(),
      atelierId: document.getElementById("inputAtelier").value,
      role: document.getElementById("inputRole").value,
    };

    try {
      const res = await fetch(apiUtilisateurs, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(utilisateur),
      });

      if (res.ok) {
        successMessage("Utilisateur enregistré avec succès !");
        document.getElementById("userForm").reset();
        loadUtilisateurs();
        // Fermer le modal si présent
        const addModal = document.getElementById("ajouterUtilisateurModal");
        if (addModal) {
          bootstrap.Modal.getInstance(addModal).hide();
        }
      } else {
        if (await handleApiError(res, "création utilisateur")) return;

        const error = await res.json();
        if (error.error) {
          errorMessage(error.error);
        } else {
          let messages = Object.values(error).join("\n");
          errorMessage(messages);
        }
      }
    } catch (error) {
      console.error("Erreur création utilisateur:", error);
      errorMessage("Erreur lors de la création de l'utilisateur");
    }
  });

// ➡️ Charger les utilisateurs avec gestion des permissions
// async function loadUtilisateurs() {
//   const token = getToken();
//   if (!token) {
//     errorMessage("Token non disponible. Veuillez vous reconnecter.");
//     return;
//   }

//   try {
//     const res = await fetch(apiUtilisateurs, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     if (!res.ok) {
//       if (await handleApiError(res, "chargement utilisateurs")) return;
//       throw new Error(`Erreur HTTP: ${res.status}`);
//     }

//     const users = await res.json();
//     const tbody = document.getElementById("ateliersBody");
//     if (!tbody) return;

//     const currentUser = getUserData();
//     const currentUserId = currentUser.userId;
//     const currentUserRole = currentUser.role;
//     const currentUserAtelierId = currentUser.atelierId;

//     let rows = "";

//     users.forEach((u, index) => {
//       const isActive = u.actif === true || u.actif === 1;
//       const statusClass = isActive ? "success" : "danger";
//       const statusText = isActive ? "Actif" : "Inactif";

//       const isCurrentUser = u.id === currentUserId;
//       const isSameAtelier = u.atelier?.id === currentUserAtelierId;

//       // LOGIQUE DES PERMISSIONS
//       let canEdit = false;
//       let canDelete = false;
//       let canToggleActivation = false;

//       // SUPERADMIN peut tout faire sur tous les utilisateurs (sauf lui-même)
//       if (currentUserRole === "SUPERADMIN") {
//         canEdit = !isCurrentUser;
//         canDelete = !isCurrentUser;
//         canToggleActivation = !isCurrentUser;
//       }
//       // PROPRIETAIRE peut modifier son compte et gérer ses subordonnés
//       else if (currentUserRole === "PROPRIETAIRE") {
//         // Peut modifier son propre compte
//         canEdit = isCurrentUser;
//         // Peut gérer les subordonnés (SECRETAIRE, TAILLEUR) de son atelier
//         const isSubordinate =
//           (u.role === "SECRETAIRE" || u.role === "TAILLEUR") && isSameAtelier;
//         canEdit = canEdit || isSubordinate;
//         canToggleActivation = isSubordinate;
//         // Propriétaire ne peut jamais supprimer
//         canDelete = false;
//       }
//       // TAILLEUR peut seulement modifier son propre compte
//       else if (currentUserRole === "TAILLEUR") {
//         canEdit = isCurrentUser;
//         canDelete = false;
//         canToggleActivation = false;
//       }
//       // SECRETAIRE peut seulement modifier son propre compte
//       else if (currentUserRole === "SECRETAIRE") {
//         canEdit = isCurrentUser;
//         canDelete = false;
//         canToggleActivation = false;
//       }

//       rows += `
//         <tr>
//           <td>${index + 1}</td>
//           <td>${u.prenom || "N/A"}</td>
//           <td>${u.nom || "N/A"}</td>
//           <td>${u.email || "N/A"}</td>
//           <td>${u.role || "N/A"}</td>
//           <td>${u.atelier?.nom || "N/A"}</td>
//           <td>
//             <span class="badge bg-${statusClass}">${statusText}</span>
//           </td>
//           <td>
//             ${
//               canEdit
//                 ? `
//               <button class="btn btn-sm btn-warning me-1 btn-modifier" title="Modifier" data-id="${u.id}">
//                 <i class="bi bi-pencil"></i> 
//               </button>
//             `
//                 : ""
//             }
            
//             ${
//               canDelete
//                 ? `
//               <button class="btn btn-sm btn-danger me-1 btn-supprimer" title="Supprimer" data-id="${u.id}">
//                 <i class="bi bi-trash"></i> 
//               </button>
//             `
//                 : ""
//             }
            
//             ${
//               canToggleActivation
//                 ? isActive
//                   ? `<button class="btn btn-sm btn-danger btn-desactiver" title="Désactiver" data-id="${u.id}">
//                   <i class="bi bi-person-x"></i> 
//                 </button>`
//                   : `<button class="btn btn-sm btn-success btn-activer" title="Activer" data-id="${u.id}">
//                   <i class="bi bi-person-check"></i> 
//                 </button>`
//                 : ""
//             }
//           </td>
//         </tr>
//       `;
//     });

//     tbody.innerHTML =
//       rows ||
//       `<tr><td colspan="8" class="text-center">Aucun utilisateur trouvé</td></tr>`;

//     // Attacher événements après injection
//     document.querySelectorAll(".btn-modifier").forEach((btn) => {
//       btn.addEventListener("click", () => editUser(btn.dataset.id));
//     });

//     document.querySelectorAll(".btn-supprimer").forEach((btn) => {
//       btn.addEventListener("click", () => deleteUser(btn.dataset.id));
//     });

//     document.querySelectorAll(".btn-activer").forEach((btn) => {
//       btn.addEventListener("click", () => activerUser(btn.dataset.id));
//     });

//     document.querySelectorAll(".btn-desactiver").forEach((btn) => {
//       btn.addEventListener("click", () => desactiverUser(btn.dataset.id));
//     });
//   } catch (error) {
//     console.error("Erreur chargement utilisateurs:", error);
//     errorMessage("Erreur lors du chargement des utilisateurs");
//   }
// }
async function loadUtilisateurs() {
  console.log("🚀 DEBUT - loadUtilisateurs()");
  
  const token = getToken();
  if (!token) {
    console.error("❌ Token non disponible");
    errorMessage("Token non disponible. Veuillez vous reconnecter.");
    return;
  }

  try {
    console.log("📡 Tentative de fetch vers:", apiUtilisateurs);
    console.log("🔑 Token utilisé:", token.substring(0, 20) + "...");
    
    const res = await fetch(apiUtilisateurs, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("📊 Statut HTTP:", res.status, res.statusText);
    console.log("✅ Headers:", Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      console.error("❌ Erreur HTTP:", res.status, res.statusText);
      if (await handleApiError(res, "chargement utilisateurs")) return;
      throw new Error(`Erreur HTTP: ${res.status} - ${res.statusText}`);
    }

    // DEBUG: Lire d'abord la réponse en texte
    const responseText = await res.text();
    console.log("📦 Réponse brute:", responseText);
    console.log("📏 Longueur réponse:", responseText.length);

    // Vérifier si la réponse est vide
    if (!responseText.trim()) {
      console.warn("⚠️ Réponse vide du serveur");
      const tbody = document.getElementById("ateliersBody");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-warning">Aucune donnée reçue du serveur</td></tr>`;
      }
      return;
    }

    let users;
    try {
      users = JSON.parse(responseText);
      console.log("✅ JSON parsé avec succès:", users);
      console.log("📋 Type de données:", typeof users);
      console.log("🔢 Nombre d'utilisateurs:", Array.isArray(users) ? users.length : "N/A");
    } catch (parseError) {
      console.error("❌ ERREUR CRITIQUE - JSON invalide:", parseError);
      console.error("🔍 Réponse problématique:", responseText);
      
      // Essayer de trouver où est l'erreur
      const problematicIndex = responseText.indexOf(']}]}]}]}]}"');
      if (problematicIndex !== -1) {
        console.error("📍 Erreur détectée autour de l'index:", problematicIndex);
        console.error("📄 Contexte erreur:", responseText.substring(problematicIndex - 50, problematicIndex + 50));
      }
      
      errorMessage("Erreur dans les données du serveur. Contactez l'administrateur.");
      
      const tbody = document.getElementById("ateliersBody");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">
          <i class="bi bi-exclamation-triangle"></i> Erreur de données serveur
        </td></tr>`;
      }
      return;
    }

    // Vérifier que c'est un tableau
    if (!Array.isArray(users)) {
      console.warn("⚠️ Les données ne sont pas un tableau:", typeof users, users);
      const tbody = document.getElementById("ateliersBody");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-warning">
          Format de données inattendu: ${typeof users}
        </td></tr>`;
      }
      return;
    }

    const tbody = document.getElementById("ateliersBody");
    if (!tbody) {
      console.error("❌ Élément 'ateliersBody' non trouvé dans le DOM");
      return;
    }

    console.log("👥 Données utilisateurs à afficher:", users);
    
    const currentUser = getUserData();
    console.log("👤 Utilisateur connecté:", currentUser);
    
    const currentUserId = currentUser.userId;
    const currentUserRole = currentUser.role;
    const currentUserAtelierId = currentUser.atelierId;

    let rows = "";
    let userCount = 0;

    users.forEach((u, index) => {
      userCount++;
      console.log(`📝 Traitement utilisateur ${index + 1}:`, u);
      
      const isActive = u.actif === true || u.actif === 1;
      const statusClass = isActive ? "success" : "danger";
      const statusText = isActive ? "Actif" : "Inactif";

      const isCurrentUser = u.id === currentUserId;
      const isSameAtelier = u.atelier?.id === currentUserAtelierId;

      console.log(`   - Actif: ${isActive}, Même atelier: ${isSameAtelier}, Utilisateur courant: ${isCurrentUser}`);

      // LOGIQUE DES PERMISSIONS
      let canEdit = false;
      let canDelete = false;
      let canToggleActivation = false;

      // SUPERADMIN peut tout faire sur tous les utilisateurs (sauf lui-même)
      if (currentUserRole === "SUPERADMIN") {
        canEdit = !isCurrentUser;
        canDelete = !isCurrentUser;
        canToggleActivation = !isCurrentUser;
        console.log(`   - SUPERADMIN: Edit=${canEdit}, Delete=${canDelete}, Toggle=${canToggleActivation}`);
      }
      // PROPRIETAIRE peut modifier son compte et gérer ses subordonnés
      else if (currentUserRole === "PROPRIETAIRE") {
        // Peut modifier son propre compte
        canEdit = isCurrentUser;
        // Peut gérer les subordonnés (SECRETAIRE, TAILLEUR) de son atelier
        const isSubordinate = (u.role === "SECRETAIRE" || u.role === "TAILLEUR") && isSameAtelier;
        canEdit = canEdit || isSubordinate;
        canToggleActivation = isSubordinate;
        // Propriétaire ne peut jamais supprimer
        canDelete = false;
        console.log(`   - PROPRIETAIRE: Subordonné=${isSubordinate}, Edit=${canEdit}, Toggle=${canToggleActivation}`);
      }
      // TAILLEUR peut seulement modifier son propre compte
      else if (currentUserRole === "TAILLEUR") {
        canEdit = isCurrentUser;
        canDelete = false;
        canToggleActivation = false;
        console.log(`   - TAILLEUR: Edit=${canEdit}`);
      }
      // SECRETAIRE peut seulement modifier son propre compte
      else if (currentUserRole === "SECRETAIRE") {
        canEdit = isCurrentUser;
        canDelete = false;
        canToggleActivation = false;
        console.log(`   - SECRETAIRE: Edit=${canEdit}`);
      }

      // CORRECTION : Générer seulement 5 colonnes comme dans l'en-tête
      rows += `
        <tr>
          <td>${index + 1}</td>
          <td>${u.prenom || "N/A"}</td>
          <td>${u.nom || "N/A"}</td>
          <td>${u.email || "N/A"}</td>
          <td>
            ${
              canEdit
                ? `
              <button class="btn btn-sm btn-warning me-1 btn-modifier" title="Modifier" data-id="${u.id}">
                <i class="bi bi-pencil"></i> 
              </button>
            `
                : ""
            }
            
            ${
              canDelete
                ? `
              <button class="btn btn-sm btn-danger me-1 btn-supprimer" title="Supprimer" data-id="${u.id}">
                <i class="bi bi-trash"></i> 
              </button>
            `
                : ""
            }
            
            ${
              canToggleActivation
                ? isActive
                  ? `<button class="btn btn-sm btn-danger btn-desactiver" title="Désactiver" data-id="${u.id}">
                  <i class="bi bi-person-x"></i> 
                </button>`
                  : `<button class="btn btn-sm btn-success btn-activer" title="Activer" data-id="${u.id}">
                  <i class="bi bi-person-check"></i> 
                </button>`
                : ""
            }
          </td>
        </tr>
      `;
    });

    console.log(`✅ ${userCount} utilisateurs traités, ${rows.split('</tr>').length - 1} lignes générées`);

    // CORRECTION : colspan="5" au lieu de "8"
    tbody.innerHTML = rows || `<tr><td colspan="5" class="text-center">Aucun utilisateur trouvé</td></tr>`;

    console.log("🎯 Attachement des événements...");

    // Attacher événements après injection
    const editButtons = document.querySelectorAll(".btn-modifier");
    console.log(`🔘 Boutons modification: ${editButtons.length}`);
    editButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        console.log("✏️ Clic modification utilisateur:", btn.dataset.id);
        editUser(btn.dataset.id);
      });
    });

    const deleteButtons = document.querySelectorAll(".btn-supprimer");
    console.log(`🗑️ Boutons suppression: ${deleteButtons.length}`);
    deleteButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        console.log("❌ Clic suppression utilisateur:", btn.dataset.id);
        deleteUser(btn.dataset.id);
      });
    });

    const activateButtons = document.querySelectorAll(".btn-activer");
    console.log(`✅ Boutons activation: ${activateButtons.length}`);
    activateButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        console.log("🟢 Clic activation utilisateur:", btn.dataset.id);
        activerUser(btn.dataset.id);
      });
    });

    const deactivateButtons = document.querySelectorAll(".btn-desactiver");
    console.log(`❌ Boutons désactivation: ${deactivateButtons.length}`);
    deactivateButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        console.log("🔴 Clic désactivation utilisateur:", btn.dataset.id);
        desactiverUser(btn.dataset.id);
      });
    });

    console.log("🎉 FIN - loadUtilisateurs() - Succès");

  } catch (error) {
    console.error("💥 ERREUR GLOBALE - loadUtilisateurs():", error);
    console.error("Stack trace:", error.stack);
    
    const tbody = document.getElementById("ateliersBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger">
            <i class="bi bi-exclamation-triangle-fill"></i><br>
            Erreur de chargement<br>
            <small>${error.message}</small>
          </td>
        </tr>`;
    }
    
    errorMessage("Erreur lors du chargement des utilisateurs: " + error.message);
  }
}
// ➡️ Fonction pour charger les ateliers dans le select du modal
async function loadAteliersForSelect() {
  try {
    const token = getToken();
    const currentUser = getUserData();
    
    if (!token) return;

    let apiUrl = "http://localhost:8081/api/ateliers";
    
    // Si c'est un propriétaire, charger seulement son atelier
    if (currentUser.role === "PROPRIETAIRE" && currentUser.atelierId) {
      apiUrl = `http://localhost:8081/api/ateliers/${currentUser.atelierId}`;
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    let ateliers;
    if (currentUser.role === "PROPRIETAIRE" && currentUser.atelierId) {
      const atelier = await response.json();
      ateliers = [atelier];
    } else {
      ateliers = await response.json();
    }

    const select = document.getElementById("inputAtelier");
    if (!select) return;

    // Vider les options existantes (garder la première option "Sélectionner")
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Ajouter les ateliers
    ateliers.forEach(atelier => {
      const option = document.createElement("option");
      option.value = atelier.id;
      option.textContent = atelier.nom || "Atelier sans nom";
      select.appendChild(option);
    });

  } catch (error) {
    console.error("Erreur chargement ateliers:", error);
  }
}

// ➡️ Recharger les ateliers quand le modal s'ouvre
document.getElementById('ajouterUtilisateurModal')?.addEventListener('show.bs.modal', function() {
  const userRole = checkUserRole();
  if (userRole === 'SUPERADMIN' || userRole === 'PROPRIETAIRE') {
    loadAteliersForSelect();
  }
});
// ➡️ Supprimer utilisateur avec SweetAlert
async function deleteUser(id) {
  const token = getToken();
  if (!token) {
    errorMessage("Token non disponible. Veuillez vous reconnecter.");
    return;
  }

  Swal.fire({
    title: "Êtes-vous sûr ?",
    text: "Cette action est irréversible !",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Oui, supprimer !",
    cancelButtonText: "Annuler",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(`${apiUtilisateurs}/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          successMessage("Utilisateur supprimé avec succès !");
          loadUtilisateurs();
        } else {
          if (await handleApiError(res, "suppression utilisateur")) return;
          errorMessage("Impossible de supprimer l'utilisateur.");
        }
      } catch (error) {
        console.error("Erreur suppression utilisateur:", error);
        errorMessage("Erreur lors de la suppression");
      }
    }
  });
}

// ➡️ Pré-remplir et ouvrir le modal d'édition
async function editUser(id) {
  const token = getToken();
  if (!token) {
    errorMessage("Token non disponible. Veuillez vous reconnecter.");
    return;
  }

  try {
    const res = await fetch(`${apiUtilisateurs}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (await handleApiError(res, "édition utilisateur")) return;
      throw new Error(`Erreur HTTP: ${res.status}`);
    }

    const user = await res.json();
    const currentUser = getUserData();
    const currentUserRole = currentUser.role;
    const isCurrentUser = user.id === currentUser.userId;

    // Remplir les champs du formulaire
    document.getElementById("editId").value = user.id;
    document.getElementById("editUserRole").value = user.role;
    document.getElementById("editNom").value = user.nom;
    document.getElementById("editPrenom").value = user.prenom;
    document.getElementById("editEmail").value = user.email;
    document.getElementById("editRole").value = user.role;

    // Adapter le formulaire selon le rôle de l'utilisateur connecté
    if (
      currentUserRole === "SUPERADMIN" ||
      currentUserRole === "PROPRIETAIRE"
    ) {
      // SUPERADMIN et PROPRIETAIRE voient tous les champs
      loadAteliers("editAtelier", user.atelier?.id || "");

      // Activer tous les champs
      document.getElementById("editNom").disabled = false;
      document.getElementById("editPrenom").disabled = false;
      document.getElementById("editEmail").disabled = false;
      document.getElementById("editRole").disabled = false;
    } else if (
      currentUserRole === "TAILLEUR" ||
      currentUserRole === "SECRETAIRE"
    ) {
      // TAILLEUR et SECRETAIRE ne peuvent modifier que leur propre compte
      if (isCurrentUser) {
        // Ils ne peuvent modifier que nom, prénom et mot de passe
        document.getElementById("editEmail").disabled = true;
        document.getElementById("editRole").disabled = true;

        // Cacher les champs atelier et rôle
        document.getElementById("editAtelier").closest(".mb-3").style.display =
          "none";
        document.getElementById("editRole").closest(".mb-3").style.display =
          "none";
      } else {
        // Ils ne devraient pas pouvoir modifier d'autres utilisateurs
        errorMessage(
          "Vous n'avez pas la permission de modifier cet utilisateur"
        );
        return;
      }
    }

    // Ouvrir le modal
    new bootstrap.Modal(document.getElementById("editUtilisateurModal")).show();
  } catch (error) {
    console.error("Erreur édition utilisateur:", error);
    errorMessage("Erreur lors du chargement des données utilisateur");
  }
}

// ➡️ Soumission du formulaire UPDATE
document
  .getElementById("editUserForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      errorMessage("Token non disponible. Veuillez vous reconnecter.");
      return;
    }

    const id = document.getElementById("editId").value;
    const currentUser = getUserData();
    const currentUserRole = currentUser.role;
    const userRole = document.getElementById("editUserRole").value;
    const isCurrentUser = id === currentUser.userId;

    // Préparer les données à envoyer
    const utilisateur = {
      nom: document.getElementById("editNom").value.trim(),
      prenom: document.getElementById("editPrenom").value.trim(),
      email: document.getElementById("editEmail").value.trim(),
    };

    // Gestion du mot de passe (seulement si rempli)
    const motDePasse = document.getElementById("editMotDePasse").value.trim();
    if (motDePasse) {
      utilisateur.motdepasse = motDePasse;
    }

    // SUPERADMIN et PROPRIETAIRE peuvent modifier tous les champs
    if (
      currentUserRole === "SUPERADMIN" ||
      currentUserRole === "PROPRIETAIRE"
    ) {
      utilisateur.atelierId = document.getElementById("editAtelier").value;
      utilisateur.role = document.getElementById("editRole").value;
    }
    // TAILLEUR et SECRETAIRE ne peuvent modifier que leur propre compte (nom, prénom, mot de passe)
    else if (
      (currentUserRole === "TAILLEUR" || currentUserRole === "SECRETAIRE") &&
      !isCurrentUser
    ) {
      errorMessage("Vous n'avez pas la permission de modifier cet utilisateur");
      return;
    }

    try {
      const res = await fetch(`${apiUtilisateurs}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(utilisateur),
      });

      if (res.ok) {
        successMessage("Utilisateur modifié avec succès !");
        loadUtilisateurs();
        bootstrap.Modal.getInstance(
          document.getElementById("editUtilisateurModal")
        ).hide();
      } else {
        if (await handleApiError(res, "modification utilisateur")) return;

        const error = await res.json();
        if (error.error) {
          errorMessage(error.error);
        } else {
          let messages = Object.values(error).join("\n");
          errorMessage(messages);
        }
      }
    } catch (error) {
      console.error("Erreur modification utilisateur:", error);
      errorMessage("Erreur lors de la modification de l'utilisateur");
    }
  });
// Réinitialiser le modal quand il est fermé
document
  .getElementById("editUtilisateurModal")
  ?.addEventListener("hidden.bs.modal", function () {
    // Réactiver tous les champs
    document.getElementById("editNom").disabled = false;
    document.getElementById("editPrenom").disabled = false;
    document.getElementById("editEmail").disabled = false;
    document.getElementById("editRole").disabled = false;

    // Remontrer tous les champs
    document.getElementById("editAtelier").closest(".mb-3").style.display =
      "block";
    document.getElementById("editRole").closest(".mb-3").style.display =
      "block";

    // Réinitialiser le formulaire
    document.getElementById("editUserForm").reset();
  });
// Fonction de déconnexion
function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("userData");
  window.location.href = "index.html";
}

// ➡️ Activer un utilisateur
async function activerUser(id) {
  const token = getToken();
  if (!token) {
    errorMessage("Token non disponible. Veuillez vous reconnecter.");
    return;
  }

  Swal.fire({
    title: "Activer l'utilisateur",
    text: "Êtes-vous sûr de vouloir activer cet utilisateur ?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Oui, activer",
    cancelButtonText: "Annuler",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(`${apiUtilisateurs}/${id}/activate`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          successMessage("Utilisateur activé avec succès !");
          loadUtilisateurs();
        } else {
          if (await handleApiError(res, "activation utilisateur")) return;
          errorMessage("Impossible d'activer l'utilisateur.");
        }
      } catch (error) {
        console.error("Erreur activation utilisateur:", error);
        errorMessage("Erreur lors de l'activation");
      }
    }
  });
}

// ➡️ Désactiver un utilisateur
async function desactiverUser(id) {
  const token = getToken();
  if (!token) {
    errorMessage("Token non disponible. Veuillez vous reconnecter.");
    return;
  }

  Swal.fire({
    title: "Désactiver l'utilisateur",
    text: "Êtes-vous sûr de vouloir désactiver cet utilisateur ? Il n'aura plus accès à l'application.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Oui, désactiver",
    cancelButtonText: "Annuler",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(`${apiUtilisateurs}/${id}/deactivate`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          successMessage("Utilisateur désactivé avec succès !");
          loadUtilisateurs();
        } else {
          if (await handleApiError(res, "désactivation utilisateur")) return;
          errorMessage("Impossible de désactiver l'utilisateur.");
        }
      } catch (error) {
        console.error("Erreur désactivation utilisateur:", error);
        errorMessage("Erreur lors de la désactivation");
      }
    }
  });
}

// Fonction pour adapter l'UI des utilisateurs selon le rôle
function adaptUsersUIByRole() {
  const userData = getUserData();
  const userRole = userData.role;
  const userId = userData.userId;

  // Cacher le bouton "Ajouter utilisateur" pour non-SUPERADMIN
  document.querySelectorAll(".btn-ajouter-utilisateur").forEach((btn) => {
    btn.style.display = userRole === "SUPERADMIN" ? "" : "none";
  });
}
// ➡️ Fonction pour charger les ateliers dans le select
async function loadAteliersForSelect() {
  try {
    const token = getToken();
    const currentUser = getUserData();
    
    if (!token) return;

    let apiUrl = "http://localhost:8081/api/ateliers";
    
    // Si c'est un propriétaire, charger seulement son atelier
    if (currentUser.role === "PROPRIETAIRE" && currentUser.atelierId) {
      apiUrl = `http://localhost:8081/api/ateliers/${currentUser.atelierId}`;
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    let ateliers;
    if (currentUser.role === "PROPRIETAIRE" && currentUser.atelierId) {
      const atelier = await response.json();
      ateliers = [atelier];
    } else {
      ateliers = await response.json();
    }

    const select = document.getElementById("inputAtelier");
    if (!select) return;

    // Vider les options existantes (garder la première option)
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Ajouter les ateliers
    ateliers.forEach(atelier => {
      const option = document.createElement("option");
      option.value = atelier.id;
      option.textContent = atelier.nom || "Atelier sans nom";
      select.appendChild(option);
    });

  } catch (error) {
    console.error("Erreur chargement ateliers:", error);
  }
}
// Initialisation
document.addEventListener('DOMContentLoaded', function() {
  if (typeof isAuthenticated === 'function' && isAuthenticated()) {
    const userRole = checkUserRole();
    
    toggleUIByRole();
    loadUtilisateurs(); // Charger les utilisateurs
    
    // Charger les ateliers pour le modal
    if (userRole === 'SUPERADMIN' || userRole === 'PROPRIETAIRE') {
      loadAteliersForSelect();
    }
  } else {
    window.location.href = 'index.html';
  }
});