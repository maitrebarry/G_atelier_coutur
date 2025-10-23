// document.addEventListener("DOMContentLoaded", () => {
//   const tableBody = document.querySelector("#clientsTable tbody");
//   const detailModal = new bootstrap.Modal(
//     document.getElementById("detailModal")
//   );
//   const mesuresContainer = document.getElementById("mesuresContainer");
//   const photoClient = document.getElementById("photoClient");

//   // async function fetchClients() {
//   //   try {
//   //     const response = await fetch("http://localhost:8080/api/clients");
//   //     if (!response.ok) throw new Error("Erreur HTTP " + response.status);
//   //     const clients = await response.json();
//   //     remplirTableau(clients);
//   //   } catch (error) {
//   //     console.error("Erreur lors de la récupération des clients:", error);
//   //   }
//   // }
// async function fetchClients() {
//   try {
//     const token =
//       localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

//     const response = await fetch("http://localhost:8081/api/clients", {
//       headers: {
//         Accept: "application/json",
//         Authorization: `Bearer ${token}`, // 🔑 indispensable
//       },
//     });

//     if (!response.ok) throw new Error("Erreur HTTP " + response.status);
//     const clients = await response.json();
//     remplirTableau(clients);
//   } catch (error) {
//     console.error("Erreur lors de la récupération des clients:", error);
//   }
// }

//   function remplirTableau(clients) {
//     tableBody.innerHTML = "";

//     clients.forEach((client) => {
//       // Récupérer sexe depuis la 1ère mesure (s’il y en a)
//       let sexe = "";
//       if (client.mesures && client.mesures.length > 0) {
//         sexe = client.mesures[0].sexe || "";
//       }

//       const tr = document.createElement("tr");
//       tr.innerHTML = `
//         <td>${client.prenom || ""}</td>
//         <td>${client.nom || ""}</td>
//         <td>${client.contact || ""}</td>
//         <td>${client.adresse || ""}</td>
//         <td>${sexe}</td>
//         <td>
//           <button class="btn btn-sm btn-info me-1 btn-detail" title="Détail" data-id="${
//             client.id
//           }">
//             <i class="bi bi-eye"></i>
//           </button>
//           <button class="btn btn-sm btn-warning me-1 btn-modifier" title="Modifier" data-id="${
//             client.id
//           }">
//             <i class="bi bi-pencil"></i>
//           </button>
//           <button class="btn btn-sm btn-danger btn-supprimer" title="Supprimer" data-id="${
//             client.id
//           }">
//             <i class="bi bi-trash"></i>
//           </button>
//         </td>
//       `;

//       tableBody.appendChild(tr);
//     });

//     // Event listeners pour détails
//     document.querySelectorAll(".btn-detail").forEach((btn) => {
//       btn.addEventListener("click", (e) => {
//         const clientId = e.currentTarget.getAttribute("data-id");
//         afficherDetailClient(clientId);
//       });
//     });
//     // Dans la fonction remplirTableau(), ajoutez ceci :
//     document.querySelectorAll(".btn-modifier").forEach((btn) => {
//       btn.addEventListener("click", (e) => {
//         const clientId = e.currentTarget.getAttribute("data-id");
//         openEditModal(clientId); 
//       });
//     });
//    document.querySelectorAll(".btn-supprimer").forEach((btn) => {
//      btn.addEventListener("click", function () {
//        const clientId = this.dataset.id; // récupère data-id
//        confirmAndDelete(clientId); // appelle ta fonction existante
//      });
//    });

//     // TODO: Ajouter listeners pour modifier et supprimer si besoin
//   }
//     async function afficherDetailClient(clientId) {
//       try {
//         // const response = await fetch(
//         //   `http://localhost:8080/api/clients/${clientId}`
//         // );
//         const token =
//           localStorage.getItem("authToken") ||
//           sessionStorage.getItem("authToken");

//         const response = await fetch(
//           `http://localhost:8081/api/clients/${clientId}`,
//           {
//             headers: {
//               Accept: "application/json",
//               Authorization: `Bearer ${token}`,
//             },
//           }
//         );

//         if (!response.ok) throw new Error("Erreur HTTP " + response.status);
//         const client = await response.json();

//         // Gestion de la photo
//         let photoPath = "default_femme.png";
//         if (client.mesures && client.mesures.length > 0) {
//           const mesure = client.mesures[0];

//           // Photo par défaut selon le sexe
//           if (mesure.sexe && mesure.sexe.toLowerCase() === "homme") {
//             photoPath = "default_homme.png";
//           }

//           // Si photo existe, l'utiliser
//           if (mesure.photoPath) {
//             let cleanPath = mesure.photoPath
//               .replace(/^\/+/, "")
//               .replace("model_photo/", "");
//             photoPath = `http://localhost:8081/model_photo/${cleanPath}`;
//           }
//         }
//         photoClient.src = photoPath;

//         // Affichage des mesures
//         mesuresContainer.innerHTML = "";

//         if (client.mesures && client.mesures.length > 0) {
//           const m = client.mesures[0];
//           const ul = document.createElement("ul");
//           ul.classList.add("list-group");
//           // Afficher le type de vêtement
//           if (m.sexe && m.sexe.toLowerCase() === "femme" && m.typeVetement) {
//             const typeLi = document.createElement("li");
//             typeLi.classList.add("list-group-item", "fw-bold", "bg-light");
//             typeLi.textContent = `Type: ${m.typeVetement.toUpperCase()}`;
//             ul.appendChild(typeLi);
//           } else if (m.sexe && m.sexe.toLowerCase() === "homme") {
//             const typeLi = document.createElement("li");
//             typeLi.classList.add("list-group-item", "fw-bold", "bg-light");
//             typeLi.textContent = "Type: Modèle homme";
//             ul.appendChild(typeLi);
//           }
//           // 2. Afficher les mesures spécifiques
//           const specificMeasures = [];
//           if (m.typeVetement === "jupe") {
//             if (m.longueurJupe !== null)
//               specificMeasures.push(`Longueur jupe: ${m.longueurJupe}`);
//             if (m.ceinture !== null)
//               specificMeasures.push(`Ceinture: ${m.ceinture}`);
//           } else if (m.sexe && m.sexe.toLowerCase() === "homme") {
//             if (m.longueurPantalon !== null)
//               specificMeasures.push(`Longueur pantalon: ${m.longueurPantalon}`);
//             if (m.cuisse !== null) specificMeasures.push(`Cuisse: ${m.cuisse}`);
//             if (m.corps !== null) specificMeasures.push(`Corps: ${m.corps}`);
//           }
//           // Ajouter les mesures spécifiques en premier
//           specificMeasures.forEach((text) => {
//             const li = document.createElement("li");
//             li.classList.add("list-group-item");
//             li.textContent = text;
//             ul.appendChild(li);
//           });
//           // 3. Ajouter un séparateur si nécessaire
//           if (specificMeasures.length > 0) {
//             const separator = document.createElement("hr");
//             ul.appendChild(separator);
//           }
//           // 4. Mesures communes
//           const commonMeasures = [
//             { key: "epaule", label: "Épaule" },
//             { key: "manche", label: "Manche" },
//             { key: "poitrine", label: "Poitrine" },
//             { key: "taille", label: "Taille" },
//             { key: "longueur", label: "Longueur" },
//             { key: "fesse", label: "Fesse" },
//             { key: "tourManche", label: "Tour de manche" },
//             { key: "longueurPoitrine", label: "Long. poitrine" },
//             { key: "longueurTaille", label: "Long. taille" },
//             { key: "longueurFesse", label: "Long. fesse" },
//           ];
//           commonMeasures.forEach((item) => {
//             if (m[item.key] !== null) {
//               const li = document.createElement("li");
//               li.classList.add("list-group-item");
//               li.textContent = `${item.label}: ${m[item.key]}`;
//               ul.appendChild(li);
//             }
//           });
//           mesuresContainer.appendChild(ul);
//         } else {
//           mesuresContainer.textContent = "Aucune mesure disponible";
//         }

//         detailModal.show();
//       } catch (error) {
//         console.error(
//           "Erreur lors de la récupération du détail client:",
//           error
//         );
//         alert("Impossible de charger les détails du client");
//       }
//     }
//   fetchClients();
// });
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#clientsTable tbody");
  const detailModal = new bootstrap.Modal(document.getElementById("detailModal"));
  const mesuresContainer = document.getElementById("mesuresContainer");
  const photoClient = document.getElementById("photoClient");

  // Fonction pour récupérer le token
  function getToken() {
    return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  }

  // Fonction pour afficher les messages d'erreur
  function showError(message) {
    console.error(message);
    Swal.fire({
      icon: "error",
      title: "Erreur",
      text: message,
    });
  }

  // Fonction pour afficher un message de chargement
  function showLoading() {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Chargement...</span>
          </div>
        </td>
      </tr>
    `;
  }

  // Fonction principale pour récupérer les clients
  async function fetchClients() {
    showLoading();
    
    try {
      const token = getToken();
      
      if (!token) {
        showError("Token non disponible. Veuillez vous reconnecter.");
        return;
      }

      const response = await fetch("http://localhost:8081/api/clients", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          showError("Session expirée. Veuillez vous reconnecter.");
          window.location.href = "index.html";
          return;
        }
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const clients = await response.json();
      console.log("Clients reçus:", clients.length);
      remplirTableau(clients);
      
    } catch (error) {
      console.error("Erreur lors de la récupération des clients:", error);
      showError("Erreur lors du chargement des clients: " + error.message);
      
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger">
            Erreur de chargement: ${error.message}
          </td>
        </tr>
      `;
    }
  }

  // Fonction pour remplir le tableau des clients
  function remplirTableau(clients) {
    tableBody.innerHTML = "";

    if (clients.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            Aucun client trouvé
          </td>
        </tr>
      `;
      return;
    }

    clients.forEach((client) => {
      // Récupérer sexe depuis la 1ère mesure (s'il y en a)
      let sexe = "";
      let typeVetement = "";
      
      if (client.mesures && client.mesures.length > 0) {
        sexe = client.mesures[0].sexe || "";
        typeVetement = client.mesures[0].typeVetement || "";
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${client.prenom || ""}</td>
        <td>${client.nom || ""}</td>
        <td>${client.contact || ""}</td>
        <td>${client.adresse || ""}</td>
        <td>
          ${sexe}
          ${typeVetement ? `<br><small class="text-muted">${typeVetement}</small>` : ''}
        </td>
        <td>
          <button class="btn btn-sm btn-info me-1 btn-detail" title="Détail" data-id="${client.id}">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-warning me-1 btn-modifier" title="Modifier" data-id="${client.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-supprimer" title="Supprimer" data-id="${client.id}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;

      tableBody.appendChild(tr);
    });

    // Event listeners pour détails
    document.querySelectorAll(".btn-detail").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const clientId = e.currentTarget.getAttribute("data-id");
        afficherDetailClient(clientId);
      });
    });

    // Event listeners pour modification
    document.querySelectorAll(".btn-modifier").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const clientId = e.currentTarget.getAttribute("data-id");
        openEditModal(clientId); 
      });
    });

    // ✅ CORRECTION : Event listeners pour suppression
    document.querySelectorAll(".btn-supprimer").forEach((btn) => {
      btn.addEventListener("click", function () {
        const clientId = this.getAttribute("data-id");
        confirmAndDelete(clientId);
      });
    });
  }

  // ✅ FONCTION DE SUPPRESSION COMPLÈTE
  async function confirmAndDelete(clientId) {
    try {
      const result = await Swal.fire({
        title: 'Êtes-vous sûr?',
        text: "Cette action est irréversible!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, supprimer!',
        cancelButtonText: 'Annuler'
      });

      if (result.isConfirmed) {
        await deleteClient(clientId);
      }
    } catch (error) {
      console.error("Erreur lors de la confirmation de suppression:", error);
      showError("Erreur lors de la suppression");
    }
  }

  async function deleteClient(clientId) {
    try {
      const token = getToken();
      
      if (!token) {
        showError("Token non disponible. Veuillez vous reconnecter.");
        return;
      }

      // Afficher un indicateur de chargement
      Swal.fire({
        title: 'Suppression en cours...',
        text: 'Veuillez patienter',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(`http://localhost:8081/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // Fermer l'indicateur de chargement
      Swal.close();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }

      const result = await response.json();

      // Afficher le message de succès
      await Swal.fire({
        icon: 'success',
        title: 'Supprimé!',
        text: result.message || 'Client supprimé avec succès',
        timer: 2000,
        showConfirmButton: false
      });

      // Recharger la liste des clients
      fetchClients();

    } catch (error) {
      console.error("Erreur lors de la suppression du client:", error);
      
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error.message || 'Échec de la suppression du client',
      });
    }
  }

  // Fonction pour afficher les détails d'un client
 async function afficherDetailClient(clientId) {
    try {
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

        const response = await fetch(
            `http://localhost:8081/api/clients/${clientId}`,
            {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) throw new Error("Erreur HTTP " + response.status);
        const client = await response.json();

        console.log("Données client reçues:", client);

        // Gestion de la photo
        let photoPath = "default_femme.png";
        if (client.mesures && client.mesures.length > 0) {
            const mesure = client.mesures[0];

            // Photo par défaut selon le sexe
            if (mesure.sexe && mesure.sexe.toLowerCase() === "homme") {
                photoPath = "default_homme.png";
            }

            // Si photo existe, l'utiliser
            if (mesure.photoPath) {
                let cleanPath = mesure.photoPath
                    .replace(/^\/+/, "")
                    .replace("model_photo/", "");
                photoPath = `http://localhost:8081/model_photo/${cleanPath}`;
            }
        }
        photoClient.src = photoPath;

        // Affichage des mesures
        mesuresContainer.innerHTML = "";

        if (client.mesures && client.mesures.length > 0) {
            const m = client.mesures[0];
            const ul = document.createElement("ul");
            ul.classList.add("list-group");

            // Afficher les informations de base
            const infoLi = document.createElement("li");
            infoLi.classList.add("list-group-item", "fw-bold", "bg-light");
            infoLi.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>Client: ${client.prenom} ${client.nom}</span>
                    <span>Sexe: ${m.sexe || "Non spécifié"}</span>
                </div>
            `;
            ul.appendChild(infoLi);
           // ✅ NOUVEAU : Afficher le prix
            if (m.prix) {
                const prixLi = document.createElement("li");
                prixLi.classList.add("list-group-item", "fw-bold", "bg-success", "text-white");
                prixLi.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span>Prix du modèle:</span>
                        <span class="badge bg-light text-dark fs-6">${m.prix} FCFA</span>
                    </div>
                `;
                ul.appendChild(prixLi);
            }
            // Afficher le type de vêtement
            if (m.typeVetement) {
                const typeLi = document.createElement("li");
                typeLi.classList.add("list-group-item", "fw-bold", "bg-info", "text-white");
                typeLi.textContent = `Type: ${m.typeVetement.toUpperCase()}`;
                ul.appendChild(typeLi);
            }

            // Afficher les mesures selon le type de vêtement
            if (m.typeVetement === "robe") {
                // === MESURES ROBE ===
                const mesuresRobe = [
                    { key: "epaule", label: "Épaule" },
                    { key: "manche", label: "Manche" },
                    { key: "poitrine", label: "Poitrine" },
                    { key: "taille", label: "Taille" },
                    { key: "longueur", label: "Longueur" },
                    { key: "fesse", label: "Fesse" },
                    { key: "tourManche", label: "Tour de manche" },
                    { key: "longueurPoitrine", label: "Longueur poitrine" },
                    { key: "longueurTaille", label: "Longueur taille" },
                    { key: "longueurFesse", label: "Longueur fesse" },
                    { key: "longueurPoitrineRobe", label: "Longueur poitrine (robe)" },
                    { key: "longueurTailleRobe", label: "Longueur taille (robe)" },
                    { key: "longueurFesseRobe", label: "Longueur fesse (robe)" }
                ];

                const sectionRobe = document.createElement("li");
                sectionRobe.classList.add("list-group-item", "fw-bold", "bg-warning");
                sectionRobe.textContent = "MESURES ROBE";
                ul.appendChild(sectionRobe);

                mesuresRobe.forEach((item) => {
                    if (m[item.key] !== null && m[item.key] !== undefined) {
                        const li = document.createElement("li");
                        li.classList.add("list-group-item", "d-flex", "justify-content-between");
                        li.innerHTML = `
                            <span>${item.label}:</span>
                            <span class="fw-bold">${m[item.key]} cm</span>
                        `;
                        ul.appendChild(li);
                    }
                });

            } else if (m.typeVetement === "jupe") {
                // === MESURES JUPE ===
                const mesuresJupe = [
                    { key: "epaule", label: "Épaule" },
                    { key: "manche", label: "Manche" },
                    { key: "poitrine", label: "Poitrine" },
                    { key: "taille", label: "Taille" },
                    { key: "longueur", label: "Longueur" },
                    { key: "fesse", label: "Fesse" },
                    { key: "tourManche", label: "Tour de manche" },
                    { key: "longueurPoitrine", label: "Longueur poitrine" },
                    { key: "longueurTaille", label: "Longueur taille" },
                    { key: "longueurFesse", label: "Longueur fesse" },
                    { key: "longueurJupe", label: "Longueur jupe" },
                    { key: "ceinture", label: "Ceinture" }
                ];

                const sectionJupe = document.createElement("li");
                sectionJupe.classList.add("list-group-item", "fw-bold", "bg-warning");
                sectionJupe.textContent = "MESURES JUPE";
                ul.appendChild(sectionJupe);

                mesuresJupe.forEach((item) => {
                    if (m[item.key] !== null && m[item.key] !== undefined) {
                        const li = document.createElement("li");
                        li.classList.add("list-group-item", "d-flex", "justify-content-between");
                        li.innerHTML = `
                            <span>${item.label}:</span>
                            <span class="fw-bold">${m[item.key]} cm</span>
                        `;
                        ul.appendChild(li);
                    }
                });

            } else if (m.sexe && m.sexe.toLowerCase() === "homme") {
                // === MESURES HOMME ===
                const mesuresHomme = [
                    { key: "epaule", label: "Épaule" },
                    { key: "manche", label: "Manche" },
                    { key: "longueur", label: "Longueur" },
                    { key: "poitrine", label: "Poitrine" },
                    { key: "taille", label: "Taille" },
                    { key: "ceinture", label: "Ceinture" },
                    { key: "tourManche", label: "Tour de manche" },
                    { key: "longueurPantalon", label: "Longueur pantalon" },
                    { key: "cuisse", label: "Cuisse" },
                    { key: "corps", label: "Corps" }
                ];

                const sectionHomme = document.createElement("li");
                sectionHomme.classList.add("list-group-item", "fw-bold", "bg-warning");
                sectionHomme.textContent = "MESURES HOMME";
                ul.appendChild(sectionHomme);

                mesuresHomme.forEach((item) => {
                    if (m[item.key] !== null && m[item.key] !== undefined) {
                        const li = document.createElement("li");
                        li.classList.add("list-group-item", "d-flex", "justify-content-between");
                        li.innerHTML = `
                            <span>${item.label}:</span>
                            <span class="fw-bold">${m[item.key]} cm</span>
                        `;
                        ul.appendChild(li);
                    }
                });
            } else {
                // === MESURES GÉNÉRIQUES (si type non spécifié) ===
                const mesuresGeneriques = [
                    { key: "epaule", label: "Épaule" },
                    { key: "manche", label: "Manche" },
                    { key: "poitrine", label: "Poitrine" },
                    { key: "taille", label: "Taille" },
                    { key: "longueur", label: "Longueur" },
                    { key: "fesse", label: "Fesse" },
                    { key: "tourManche", label: "Tour de manche" },
                    { key: "longueurPoitrine", label: "Longueur poitrine" },
                    { key: "longueurTaille", label: "Longueur taille" },
                    { key: "longueurFesse", label: "Longueur fesse" }
                ];

                const sectionGenerique = document.createElement("li");
                sectionGenerique.classList.add("list-group-item", "fw-bold", "bg-warning");
                sectionGenerique.textContent = "MESURES";
                ul.appendChild(sectionGenerique);

                mesuresGeneriques.forEach((item) => {
                    if (m[item.key] !== null && m[item.key] !== undefined) {
                        const li = document.createElement("li");
                        li.classList.add("list-group-item", "d-flex", "justify-content-between");
                        li.innerHTML = `
                            <span>${item.label}:</span>
                            <span class="fw-bold">${m[item.key]} cm</span>
                        `;
                        ul.appendChild(li);
                    }
                });
            }

            // Afficher la date de mesure si disponible
            if (m.dateMesure) {
                const dateLi = document.createElement("li");
                dateLi.classList.add("list-group-item", "text-muted", "small");
                dateLi.textContent = `Mesure prise le: ${new Date(m.dateMesure).toLocaleDateString('fr-FR')}`;
                ul.appendChild(dateLi);
            }

            mesuresContainer.appendChild(ul);
        } else {
            mesuresContainer.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="bi bi-info-circle"></i> Aucune mesure disponible pour ce client
                </div>
            `;
        }

        detailModal.show();
    } catch (error) {
        console.error("Erreur lors de la récupération du détail client:", error);
        Swal.fire({
            icon: "error",
            title: "Erreur",
            text: "Impossible de charger les détails du client: " + error.message,
        });
    }
}

  // Initialisation
  fetchClients();

  // Export des fonctions pour usage externe
  window.openEditModal = window.openEditModal || function(clientId) {
    console.log("openEditModal appelé pour:", clientId);
    // Cette fonction sera remplacée par celle du fichier edit-modal.js
  };
});