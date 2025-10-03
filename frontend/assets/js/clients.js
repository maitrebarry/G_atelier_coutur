document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#clientsTable tbody");
  const detailModal = new bootstrap.Modal(
    document.getElementById("detailModal")
  );
  const mesuresContainer = document.getElementById("mesuresContainer");
  const photoClient = document.getElementById("photoClient");

  // async function fetchClients() {
  //   try {
  //     const response = await fetch("http://localhost:8080/api/clients");
  //     if (!response.ok) throw new Error("Erreur HTTP " + response.status);
  //     const clients = await response.json();
  //     remplirTableau(clients);
  //   } catch (error) {
  //     console.error("Erreur lors de la récupération des clients:", error);
  //   }
  // }
async function fetchClients() {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch("http://localhost:8081/api/clients", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`, // 🔑 indispensable
      },
    });

    if (!response.ok) throw new Error("Erreur HTTP " + response.status);
    const clients = await response.json();
    remplirTableau(clients);
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error);
  }
}

  function remplirTableau(clients) {
    tableBody.innerHTML = "";

    clients.forEach((client) => {
      // Récupérer sexe depuis la 1ère mesure (s’il y en a)
      let sexe = "";
      if (client.mesures && client.mesures.length > 0) {
        sexe = client.mesures[0].sexe || "";
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${client.prenom || ""}</td>
        <td>${client.nom || ""}</td>
        <td>${client.contact || ""}</td>
        <td>${client.adresse || ""}</td>
        <td>${sexe}</td>
        <td>
          <button class="btn btn-sm btn-info me-1 btn-detail" title="Détail" data-id="${
            client.id
          }">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-warning me-1 btn-modifier" title="Modifier" data-id="${
            client.id
          }">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-supprimer" title="Supprimer" data-id="${
            client.id
          }">
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
    // Dans la fonction remplirTableau(), ajoutez ceci :
    document.querySelectorAll(".btn-modifier").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const clientId = e.currentTarget.getAttribute("data-id");
        openEditModal(clientId); 
      });
    });
   document.querySelectorAll(".btn-supprimer").forEach((btn) => {
     btn.addEventListener("click", function () {
       const clientId = this.dataset.id; // récupère data-id
       confirmAndDelete(clientId); // appelle ta fonction existante
     });
   });

    // TODO: Ajouter listeners pour modifier et supprimer si besoin
  }
    async function afficherDetailClient(clientId) {
      try {
        // const response = await fetch(
        //   `http://localhost:8080/api/clients/${clientId}`
        // );
        const token =
          localStorage.getItem("authToken") ||
          sessionStorage.getItem("authToken");

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
          // Afficher le type de vêtement
          if (m.sexe && m.sexe.toLowerCase() === "femme" && m.typeVetement) {
            const typeLi = document.createElement("li");
            typeLi.classList.add("list-group-item", "fw-bold", "bg-light");
            typeLi.textContent = `Type: ${m.typeVetement.toUpperCase()}`;
            ul.appendChild(typeLi);
          } else if (m.sexe && m.sexe.toLowerCase() === "homme") {
            const typeLi = document.createElement("li");
            typeLi.classList.add("list-group-item", "fw-bold", "bg-light");
            typeLi.textContent = "Type: Modèle homme";
            ul.appendChild(typeLi);
          }
          // 2. Afficher les mesures spécifiques
          const specificMeasures = [];
          if (m.typeVetement === "jupe") {
            if (m.longueurJupe !== null)
              specificMeasures.push(`Longueur jupe: ${m.longueurJupe}`);
            if (m.ceinture !== null)
              specificMeasures.push(`Ceinture: ${m.ceinture}`);
          } else if (m.sexe && m.sexe.toLowerCase() === "homme") {
            if (m.longueurPantalon !== null)
              specificMeasures.push(`Longueur pantalon: ${m.longueurPantalon}`);
            if (m.cuisse !== null) specificMeasures.push(`Cuisse: ${m.cuisse}`);
            if (m.corps !== null) specificMeasures.push(`Corps: ${m.corps}`);
          }
          // Ajouter les mesures spécifiques en premier
          specificMeasures.forEach((text) => {
            const li = document.createElement("li");
            li.classList.add("list-group-item");
            li.textContent = text;
            ul.appendChild(li);
          });
          // 3. Ajouter un séparateur si nécessaire
          if (specificMeasures.length > 0) {
            const separator = document.createElement("hr");
            ul.appendChild(separator);
          }
          // 4. Mesures communes
          const commonMeasures = [
            { key: "epaule", label: "Épaule" },
            { key: "manche", label: "Manche" },
            { key: "poitrine", label: "Poitrine" },
            { key: "taille", label: "Taille" },
            { key: "longueur", label: "Longueur" },
            { key: "fesse", label: "Fesse" },
            { key: "tourManche", label: "Tour de manche" },
            { key: "longueurPoitrine", label: "Long. poitrine" },
            { key: "longueurTaille", label: "Long. taille" },
            { key: "longueurFesse", label: "Long. fesse" },
          ];
          commonMeasures.forEach((item) => {
            if (m[item.key] !== null) {
              const li = document.createElement("li");
              li.classList.add("list-group-item");
              li.textContent = `${item.label}: ${m[item.key]}`;
              ul.appendChild(li);
            }
          });
          mesuresContainer.appendChild(ul);
        } else {
          mesuresContainer.textContent = "Aucune mesure disponible";
        }

        detailModal.show();
      } catch (error) {
        console.error(
          "Erreur lors de la récupération du détail client:",
          error
        );
        alert("Impossible de charger les détails du client");
      }
    }
  fetchClients();
});
