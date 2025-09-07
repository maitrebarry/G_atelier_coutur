const apiAteliers = "http://localhost:8080/api/ateliers";
const apiUtilisateurs = "http://localhost:8080/api/utilisateurs";

// Fonction pour récupérer le token
function getToken() {
  return (
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
  );
}

// Fonction pour récupérer les données utilisateur
function getUserData() {
  return JSON.parse(
    localStorage.getItem("userData") ||
      sessionStorage.getItem("userData") ||
      "{}"
  );
}

// Fonction pour vérifier les permissions
function checkUserRole() {
  const userData = getUserData();
  return userData.role || "";
}

// Masquer/montrer les éléments selon le rôle
function toggleUIByRole() {
  const role = checkUserRole();
  const isSuperAdmin = role === "SUPERADMIN";
  const isProprietaire = role === "PROPRIETAIRE";

  // Cacher les éléments si l'utilisateur n'a pas les permissions
  document.querySelectorAll(".superadmin-only").forEach((el) => {
    el.style.display = isSuperAdmin ? "" : "none";
  });

  document.querySelectorAll(".proprietaire-only").forEach((el) => {
    el.style.display = isProprietaire ? "" : "none";
  });

  // Adapter le formulaire selon le rôle
  const roleSelect = document.getElementById("inputRole");
  const editRoleSelect = document.getElementById("editRole");

  if (roleSelect && isProprietaire) {
    // Propriétaire ne peut créer que SECRETAIRE et TAILLEUR
    Array.from(roleSelect.options).forEach((option) => {
      if (["PROPRIETAIRE", "SUPERADMIN"].includes(option.value)) {
        option.style.display = "none";
      }
    });
  }

  if (editRoleSelect && isProprietaire) {
    // Propriétaire ne peut pas modifier les rôles élevés
    Array.from(editRoleSelect.options).forEach((option) => {
      if (["PROPRIETAIRE", "SUPERADMIN"].includes(option.value)) {
        option.disabled = true;
      }
    });
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

// Charger dynamiquement la liste des ateliers
async function loadAteliers(selectId = "inputAtelier", selectedValue = "") {
  const token = getToken();
  if (!token) {
    errorMessage("Token non disponible. Veuillez vous reconnecter.");
    return;
  }

  try {
    const res = await fetch(apiAteliers, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (await handleApiError(res, "chargement ateliers")) return;
      throw new Error(`Erreur HTTP: ${res.status}`);
    }

    const ateliers = await res.json();
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = `<option value="">Sélectionner un atelier</option>`;
    ateliers.forEach((a) => {
      select.innerHTML += `<option value="${a.id}" ${
        a.id === selectedValue ? "selected" : ""
      }>${a.nom}</option>`;
    });
  } catch (error) {
    console.error("Erreur chargement ateliers:", error);
    errorMessage("Erreur lors du chargement des ateliers");
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
// ➡️ Charger les utilisateurs (version corrigée)
async function loadUtilisateurs() {
  const token = getToken();
  if (!token) {
    errorMessage("Token non disponible. Veuillez vous reconnecter.");
    return;
  }

  try {
    const res = await fetch(apiUtilisateurs, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (await handleApiError(res, "chargement utilisateurs")) return;
      throw new Error(`Erreur HTTP: ${res.status}`);
    }

    const users = await res.json();
    const tbody = document.getElementById("ateliersBody");
    if (!tbody) return;

    const currentUser = getUserData();
    const currentUserId = currentUser.userId;
    const currentUserRole = currentUser.role;

    let rows = "";

    users.forEach((u, index) => {
      // CORRECTION: actif=true (1) -> Utilisateur activé, actif=false (0) -> Utilisateur désactivé
      const isActive = u.actif === true || u.actif === 1;
      const statusClass = isActive ? 'success' : 'danger';
      const statusText = isActive ? 'Actif' : 'Inactif';
      
      // Déterminer si l'utilisateur courant peut voir les boutons d'action
      const isCurrentUser = u.id === currentUserId;
      const canToggleActivation = currentUserRole === 'SUPERADMIN' && !isCurrentUser;
      const canDelete = currentUserRole === 'SUPERADMIN' && !isCurrentUser;
      const canEdit = currentUserRole === 'SUPERADMIN' || (currentUserRole === 'PROPRIETAIRE' && !isCurrentUser);
      
      rows += `
        <tr>
          <td>${index + 1}</td>
          <td>${u.prenom || "N/A"}</td>
          <td>${u.nom || "N/A"}</td>
          <td>${u.email || "N/A"}</td>
          <td>${u.role || "N/A"}</td>
          <td>
            <span class="badge bg-${statusClass}">${statusText}</span>
          </td>
          <td>
            ${canEdit ? `
              <button class="btn btn-sm btn-warning me-1 btn-modifier" title="Modifier" data-id="${u.id}">
                <i class="bi bi-pencil"></i>
              </button>
            ` : ''}
            
            ${canDelete ? `
              <button class="btn btn-sm btn-danger btn-supprimer" title="Supprimer" data-id="${u.id}">
                <i class="bi bi-trash"></i>
              </button>
            ` : ''}
            
            ${canToggleActivation ? (
              // AFFICHAGE CORRECT:
              // Si actif=1 -> Bouton "Désactiver" (rouge)
              // Si actif=0 -> Bouton "Activer" (vert)
              isActive ? 
                `<button class="btn btn-sm btn-danger btn-desactiver" title="Désactiver" data-id="${u.id}">
                  <i class="bi bi-person-x"></i> Désactiver
                </button>` :
                `<button class="btn btn-sm btn-success btn-activer" title="Activer" data-id="${u.id}">
                  <i class="bi bi-person-check"></i> Activer
                </button>`
            ) : ''}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rows || `<tr><td colspan="7" class="text-center">Aucun utilisateur trouvé</td></tr>`;

    // Attacher événements après injection
    document.querySelectorAll(".btn-modifier").forEach((btn) => {
      btn.addEventListener("click", () => editUser(btn.dataset.id));
    });

    document.querySelectorAll(".btn-supprimer").forEach((btn) => {
      btn.addEventListener("click", () => deleteUser(btn.dataset.id));
    });

    document.querySelectorAll(".btn-activer").forEach((btn) => {
      btn.addEventListener("click", () => activerUser(btn.dataset.id));
    });

    document.querySelectorAll(".btn-desactiver").forEach((btn) => {
      btn.addEventListener("click", () => desactiverUser(btn.dataset.id));
    });

  } catch (error) {
    console.error("Erreur chargement utilisateurs:", error);
    errorMessage("Erreur lors du chargement des utilisateurs");
  }
}

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
    document.getElementById("editId").value = user.id;
    document.getElementById("editNom").value = user.nom;
    document.getElementById("editPrenom").value = user.prenom;
    document.getElementById("editEmail").value = user.email;
    document.getElementById("editRole").value = user.role;
    loadAteliers("editAtelier", user.atelier?.id || "");

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
    const utilisateur = {
      nom: document.getElementById("editNom").value.trim(),
      prenom: document.getElementById("editPrenom").value.trim(),
      email: document.getElementById("editEmail").value.trim(),
      motdepasse: document.getElementById("editMotDePasse").value.trim(),
      atelierId: document.getElementById("editAtelier").value,
      role: document.getElementById("editRole").value,
    };

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

// Initialisation
document.addEventListener("DOMContentLoaded", function () {
  // Vérifier l'authentification avant de charger
  if (typeof isAuthenticated === "function" && isAuthenticated()) {
    toggleUIByRole(); // Adapter l'UI selon le rôle
    loadAteliers();
    loadUtilisateurs();
    adaptUsersUIByRole();
  } else {
    window.location.href = "index.html";
  }
});
