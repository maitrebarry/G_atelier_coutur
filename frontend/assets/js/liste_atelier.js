// Fonction pour charger les ateliers
async function loadAteliers() {
  try {
    const token = getToken(); // ← AJOUTER CETTE LIGNE

    if (!token) {
      throw new Error("Token non disponible. Veuillez vous reconnecter.");
    }

    const response = await fetch("http://localhost:8080/api/ateliers", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ← Utiliser la variable token
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout(); // Déconnecter si token invalide
        return;
      }
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const ateliers = await response.json();
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

// Fonction pour afficher les ateliers dans le tableau
function displayAteliers(ateliers) {
  const tbody = document.getElementById("ateliersBody");

  if (ateliers.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Aucun atelier enregistré
                </td>
            </tr>`;
    return;
  }

  tbody.innerHTML = ateliers
    .map(
      (atelier, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(atelier.nom)}</td>
            <td>${escapeHtml(atelier.adresse)}</td>
            <td>${escapeHtml(atelier.telephone)}</td>
            <td>${formatDate(atelier.dateCreation)}</td>
            <td>
                 <button class="btn btn-sm btn-info me-1 btn-modifier" title="Modifier" data-id="${
                   atelier.id
                 }">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-supprimer" title="Supprimer" data-id="${
                  atelier.id
                }">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `
    )
    .join("");

  // Ajouter les écouteurs d'événements
  addEventListeners();
}

// Fonction pour formater la date
function formatDate(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fonction pour échapper le HTML (sécurité)
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Ajouter cette fonction pour gérer les clics
function addEventListeners() {
  // Édition
  document.querySelectorAll(".btn-modifier").forEach((btn) => {
    btn.addEventListener("click", function () {
      const atelierId = this.getAttribute("data-id");
      editAtelier(atelierId);
    });
  });

  // Suppression
  document.querySelectorAll(".btn-supprimer").forEach((btn) => {
    btn.addEventListener("click", function () {
      const atelierId = this.getAttribute("data-id");
      deleteAtelier(atelierId);
    });
  });
}

// Fonction pour éditer un atelier
async function editAtelier(id) {
  try {
    const token = getToken(); // ← AJOUTER

    const response = await fetch(`http://localhost:8080/api/ateliers/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`, // ← AJOUTER
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const atelier = await response.json();

    // Remplir le formulaire
    document.getElementById("editAtelierId").value = atelier.id;
    document.getElementById("editNomAtelier").value = atelier.nom || "";
    document.getElementById("editAdresseAtelier").value = atelier.adresse || "";
    document.getElementById("editTelephoneAtelier").value =
      atelier.telephone || "";

    // Formater la date pour l'input datetime-local
    if (atelier.dateCreation) {
      const date = new Date(atelier.dateCreation);
      const formattedDate = date.toISOString().slice(0, 16);
      document.getElementById("editDateCreationAtelier").value = formattedDate;
    }

    // Ouvrir le modal
    const editModal = new bootstrap.Modal(
      document.getElementById("editAtelierModal")
    );
    editModal.show();
  } catch (error) {
    console.error("Erreur:", error);
    Swal.fire({
      icon: "error",
      title: "Erreur",
      text: "Impossible de charger les données de l'atelier",
      confirmButtonText: "OK",
    });
  }
}

// Soumission du formulaire de modification
document
  .getElementById("editAtelierForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const token = getToken(); // ← AJOUTER
    const formData = {
      id: document.getElementById("editAtelierId").value,
      nom: document.getElementById("editNomAtelier").value.trim(),
      adresse: document.getElementById("editAdresseAtelier").value.trim(),
      telephone: document.getElementById("editTelephoneAtelier").value.trim(),
      dateCreation:
        document.getElementById("editDateCreationAtelier").value || null,
    };

    try {
      const response = await fetch(
        `http://localhost:8080/api/ateliers/${formData.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`, // ← AJOUTER
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();

      Swal.fire({
        icon: "success",
        title: "Succès!",
        text: "Atelier modifié avec succès!",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "OK",
      }).then(() => {
        // Fermer le modal
        const editModal = bootstrap.Modal.getInstance(
          document.getElementById("editAtelierModal")
        );
        editModal.hide();

        // Recharger la liste
        loadAteliers();
      });
    } catch (error) {
      console.error("Erreur:", error);
      Swal.fire({
        icon: "error",
        title: "Erreur!",
        text: error.message || "Erreur lors de la modification",
        confirmButtonColor: "#d33",
        confirmButtonText: "OK",
      });
    }
  });

// Fonction pour supprimer un atelier
async function deleteAtelier(id) {
  const result = await Swal.fire({
    title: "Êtes-vous sûr?",
    text: "Vous ne pourrez pas annuler cette action!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Oui, supprimer!",
    cancelButtonText: "Annuler",
  });

  if (result.isConfirmed) {
    try {
      const token = getToken(); // ← AJOUTER

      const response = await fetch(`http://localhost:8080/api/ateliers/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`, // ← AJOUTER
        },
      });

      if (response.ok) {
        Swal.fire("Supprimé!", "L'atelier a été supprimé.", "success");
        loadAteliers(); // Recharger la liste
      } else {
        throw new Error("Erreur lors de la suppression");
      }
    } catch (error) {
      Swal.fire("Erreur", "Impossible de supprimer l'atelier", "error");
    }
  }
}

// Charger les ateliers au démarrage
document.addEventListener("DOMContentLoaded", function () {
  // Vérifier l'authentification avant de charger
  if (isAuthenticated()) {
    loadAteliers();
  } else {
    window.location.href = "index.html";
  }
});

// Réinitialiser le formulaire à la fermeture du modal
document
  .getElementById("editAtelierModal")
  .addEventListener("hidden.bs.modal", function () {
    document.getElementById("editAtelierForm").reset();
  });
