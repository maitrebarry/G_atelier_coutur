const apiAteliers = "http://localhost:8080/api/ateliers";
const apiUtilisateurs = "http://localhost:8080/api/utilisateurs";

// Charger dynamiquement la liste des ateliers
async function loadAteliers(selectId = "inputAtelier", selectedValue = "") {
  const res = await fetch(apiAteliers);
  const ateliers = await res.json();
  const select = document.getElementById(selectId);
  select.innerHTML = `<option value="">Sélectionner un atelier</option>`;
  ateliers.forEach((a) => {
    select.innerHTML += `<option value="${a.id}" ${
      a.id === selectedValue ? "selected" : ""
    }>${a.nom}</option>`;
  });
}

// ✅ SweetAlert succès + scroll auto
function successMessage(message) {
  Swal.fire({
    icon: "success",
    title: "Succès",
    text: message,
    showConfirmButton: false,
    timer: 1200, // disparaît après 1.2s
  });
  setTimeout(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, 300);
}

// ✅ Erreur avec SweetAlert
function errorMessage(message) {
  Swal.fire({
    icon: "error",
    title: "Erreur",
    text: message,
    confirmButtonColor: "#d33",
  });
}

// ➡️ Soumission formulaire CREATE
document
  .getElementById("userForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const utilisateur = {
      nom: document.getElementById("inputNom").value.trim(),
      prenom: document.getElementById("inputPrenom").value.trim(),
      email: document.getElementById("inputEmail").value.trim(),
      motdepasse: document.getElementById("inputMotDePasse").value.trim(),
      atelierId: document.getElementById("inputAtelier").value,
      role: document.getElementById("inputRole").value,
    };

    const res = await fetch(apiUtilisateurs, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(utilisateur),
    });

    if (res.ok) {
      successMessage("Utilisateur enregistré avec succès !");
      document.getElementById("userForm").reset();
      loadUtilisateurs();
    } else {
      const error = await res.json();
      if (error.error) {
        errorMessage(error.error);
      } else {
        let messages = Object.values(error).join("\n");
        errorMessage(messages);
      }
    }
  });

// ➡️ Charger les utilisateurs
async function loadUtilisateurs() {
  const res = await fetch(apiUtilisateurs);
  const users = await res.json();

  const tbody = document.getElementById("ateliersBody");
  let rows = "";

  users.forEach((u, index) => {
    rows += `
      <tr>
        <td>${index + 1}</td>
        <td>${u.prenom}</td>
        <td>${u.nom}</td>
        <td>${u.email}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editUser('${
            u.id
          }')">Modifier</button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${
            u.id
          }')">Supprimer</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML =
    rows ||
    `<tr><td colspan="5" class="text-center">Aucun utilisateur trouvé</td></tr>`;
}

// ➡️ Supprimer utilisateur avec SweetAlert
async function deleteUser(id) {
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
      const res = await fetch(`${apiUtilisateurs}/${id}`, { method: "DELETE" });
      if (res.ok) {
        successMessage("Utilisateur supprimé avec succès !");
        loadUtilisateurs();
      } else {
        errorMessage("Impossible de supprimer l'utilisateur.");
      }
    }
  });
}

// ➡️ Pré-remplir et ouvrir le modal d’édition
async function editUser(id) {
  const res = await fetch(`${apiUtilisateurs}/${id}`);
  const user = await res.json();

  document.getElementById("editId").value = user.id;
  document.getElementById("editNom").value = user.nom;
  document.getElementById("editPrenom").value = user.prenom;
  document.getElementById("editEmail").value = user.email;
  document.getElementById("editRole").value = user.role;
  loadAteliers("editAtelier", user.atelier?.id || "");

  new bootstrap.Modal(document.getElementById("editUtilisateurModal")).show();
}

// ➡️ Soumission du formulaire UPDATE
document
  .getElementById("editUserForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = document.getElementById("editId").value;
    const utilisateur = {
      nom: document.getElementById("editNom").value.trim(),
      prenom: document.getElementById("editPrenom").value.trim(),
      email: document.getElementById("editEmail").value.trim(),
      motdepasse: document.getElementById("editMotDePasse").value.trim(),
      atelierId: document.getElementById("editAtelier").value,
      role: document.getElementById("editRole").value,
    };

    const res = await fetch(`${apiUtilisateurs}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(utilisateur),
    });

    if (res.ok) {
      successMessage("Utilisateur modifié avec succès !");
      loadUtilisateurs();
      bootstrap.Modal.getInstance(
        document.getElementById("editUtilisateurModal")
      ).hide();
    } else {
      const error = await res.json();
      if (error.error) {
        errorMessage(error.error);
      } else {
        let messages = Object.values(error).join("\n");
        errorMessage(messages);
      }
    }
  });

// Initialisation
loadAteliers();
loadUtilisateurs();
